import asyncio
from email import message_from_string
import json
import json
from os import path
import time
from datetime import timedelta
from dateutil import tz
import datetime
from pandas.tseries.offsets import BDay
import aiohttp
from yticker_pb2 import yaticker
import base64
import random
from websockets import serve
import websockets
import pandas as pd
import numpy as np
import logging


logging.basicConfig(format='%(asctime)s %(message)s', filename='./server.log', encoding='utf-8', level=logging.DEBUG)
NYSE_HOLIDAYS = ['2022-11-24', '2022-12-26', '2023-01-02', '2023-01-16', 
'2023-02-20', '2023-04-07', '2023-05-29', '2023-06-19']

NYT = tz.gettz('America/New_York')
current_buy = None

ticks=[]
client_websockets = []
df_state_last_update_time = datetime.datetime.now()
df_state_last_print_time = datetime.datetime.now()

async def set_periodic_task(recur_time, callback):
  
  async def callback_wrapper():
    await asyncio.sleep(recur_time)
    await set_periodic_task(recur_time, callback)
    return callback()

  asyncio.ensure_future(callback_wrapper())

def get_last_workday_nyse(timestamp=None):
  if timestamp is None:
    timestamp = datetime.datetime.now(NYT)

  candidate = timestamp - BDay(1)
  if candidate.strftime("%Y-%m-%d") in NYSE_HOLIDAYS:
    return (timestamp - BDay(2)).strftime("%Y-%m-%d") 
  return candidate.strftime("%Y-%m-%d") 

def get_today_nyse(timestamp):
  if timestamp is None:
    timestamp = datetime.datetime.now(NYT)

  return timestamp.strftime("%Y-%m-%d")


def validate_date(last_data_date, last_b_date, today_date):
    # it could be today (i.e. at night)
    return last_b_date == last_data_date or today_date == last_data_date

def get_valid_securities():
  security_dict = {}
  f = open(get_state_file_name())
  state = json.load(f)
  timestamp = datetime.datetime.now(NYT)
  last_b_date = get_last_workday_nyse(timestamp)
  today_date = get_today_nyse(timestamp)
  security_states = state['security_states']
  for states in security_states:
    security_name = states['name']
    last_data_date = states['last_data_date']
    valid = validate_date(last_data_date, last_b_date, today_date)
    if valid:
      security_dict[security_name] = states
    else:
      logging.info(f'Validating {security_name} Failed: last_data_date:{last_data_date}, last_b_date: {last_b_date} today_date: {today_date}')
  return security_dict
  
def get_security_names():
    f = open('../models/model1/desc.json')
    desc = json.load(f)
    return desc['securities']

async def send_msg_to_all(id, point, operation):
  global client_websockets
  websockets_to_remove = []
  obj_to_send = {"id": id, "point": point, "operation": operation}
  str_to_send = json.dumps(obj_to_send)
  for websocket in client_websockets:
    try:
      logging.info(f'send data to {websocket}')
      await websocket.send(str_to_send)
    except websockets.exceptions.ConnectionClosed:
      logging.info("Client disconnected.  Do cleanup")
      websockets_to_remove.append(websocket)
      continue
  for websocket in websockets_to_remove:
    client_websockets.remove(websocket)

def update_df_state(df_state, id, new_state, price):
  global df_state_last_update_time
  global df_state_last_print_time
  now = datetime.datetime.now()
  pd_now = pd.Timestamp.now()
  if (now - df_state_last_update_time).seconds > 10:
    cond = (pd_now - df_state['update_time']).dt.total_seconds() > 300
    df_state.loc[cond, 'state'] = 'timeout'
    df_state.loc[cond, 'update_time'] = pd_now
    df_state.loc[cond, 'state_change_time'] = pd_now
    df_state_last_update_time = now

  if (now - df_state_last_print_time).seconds > 600:
    logging.info(df_state)
    df_state_last_print_time = now

  old_state = df_state.loc[id, 'state']
  if old_state != new_state:
    logging.info(f'Status changed: {id} from {old_state} to {new_state}, price: {price}')
    df_state.loc[id, 'state'] = new_state
    df_state.loc[id, 'state_change_time'] = pd_now

  df_state.loc[id, 'update_time'] = pd_now
  df_state.loc[id, 'price'] = price

  
  return df_state

def should_buy(df_state, id, prio):
  # to buy, we need to check
  # no higher prio security in init state or buy state
  prio = df_state.loc[id, 'prio']
  pd_now = pd.Timestamp.now()
  cond1 = (df_state['prio'] < prio) & (df_state['state'].isin(['init', 'buy']))
  if df_state[cond1].shape[0] > 0:
    return False

  cond2 = (pd_now - df_state.loc[id, 'state_change_time']).total_seconds() < df_state.loc[id, 'buy_delay']
  if cond2:
    return False
  return True


async def check_msg(data, df_state):
  my_yaticker = yaticker()
  message = base64.b64decode(data)
  my_yaticker.ParseFromString(message)
  data = {
      "id": my_yaticker.id,
      "exchange": my_yaticker.exchange,
      "quoteType": my_yaticker.quoteType,
      "price": my_yaticker.price,
      "timestamp": my_yaticker.time,
      "marketHours": my_yaticker.marketHours,
      "changePercent": my_yaticker.changePercent,
      "dayVolume": my_yaticker.dayVolume,
      "change": my_yaticker.change,
      "priceHint": my_yaticker.priceHint
  }

  #logging.info(data_str)
  id = data['id']
  if not id in df_state['name']:
    logging.info(f'{id} not in security_list, please check')
    return None

  row = df_state.loc[id]
  buy_point = row.buy_point
  sell_point = row.sell_point
  prio = row.prio
  price = data['price']


  if price < buy_point:
    global current_buy
    df_state = update_df_state(df_state, id, 'buy', price)
    # need to check if there is no buy request in higher prio
    if should_buy(df_state, id, prio):
      await send_msg_to_all(id, buy_point, 'buy')
      if current_buy != id:
        logging.info(f'Buy {id} at {price}, buy_point: {buy_point}')
        current_buy = id
  elif price > sell_point:
    df_state = update_df_state(df_state, id, 'sell', price)
    await send_msg_to_all(id, sell_point, 'sell')
    #logging.info(f'Sell {id} at {price}, sell_point: {sell_point}')
  else:
    df_state = update_df_state(df_state, id, 'normal', price)
    if current_buy == id:
      logging.info(f'Stop Buying {id} at {price}, buy_point: {buy_point}')
      current_buy = None

async def send_request(name_list, ws):
  symbol_list = dict()
  symbol_list["subscribe"] = name_list
  send_str = json.dumps(symbol_list)
  await ws.send_str(send_str)
  logging.info(f'data sent: {name_list}')

def get_state_file_name():
  last_workday_nyse = get_last_workday_nyse()
  return f'../models/model1/state-{last_workday_nyse}.json'

def validate_model_date():
  return path.isfile(get_state_file_name())


async def echo(websocket):
  client_websockets.append(websocket)
  async for message in websocket:
    logging.info(message)
    await websocket.send(message)

async def init_server():
  logging.info('initialize server')
  async with serve(echo, None, 8766) as target:
    await asyncio.Future()

async def init_client(df_state):

  # DELETE ME, TESTING
  #name_list = ['BTC-USD', 'ETH-USD', 'USDT-USD']
  name_list = df_state['name'].tolist()
  async with aiohttp.ClientSession() as session:
    #async with session.ws_connect("wss://streamer.finance.yahoo.com/") as ws:
    async with session.ws_connect("wss://streamer.finance.yahoo.com/") as ws:
      await send_request(name_list, ws)
      async for msg in ws:
        if msg.type == aiohttp.WSMsgType.TEXT:
          await check_msg(msg.data, df_state)
          if msg.data == 'close cmd':
            await ws.close()
            break
        elif msg.type == aiohttp.WSMsgType.ERROR:
          break

def create_df_state(security_dict):
  df_state = pd.DataFrame.from_dict(security_dict).transpose()
  df_state = df_state.set_index('name', drop=False)
  df_state['state'] = 'init'
  df_state['update_time'] = pd.Timestamp.now()
  df_state['prio'] = np.arange(len(df_state))
  df_state['price'] = 0
  df_state['buy_delay'] = np.arange(0, 14400, 450)
  df_state['state_change_time'] = pd.Timestamp.now()
  return df_state

async def main():



  logging.info('validate model state')
  valid = validate_model_date()
  if not valid:
    logging.info('Validating file failed, exiting...')
    exit(1)
  security_dict = get_valid_securities()
  if len(security_dict) < 1:
    logging.info('no valid stock id found')
    exit(1)

  df_state = create_df_state(security_dict)
  logging.info(df_state)
  logging.info(df_state.columns)
  asyncio.ensure_future(init_client(df_state))
  await init_server()

asyncio.run(main())