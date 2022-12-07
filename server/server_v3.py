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
from websockets import serve
import websockets
import pandas as pd
import numpy as np
import logging

security_state = []

logging.basicConfig(format='%(asctime)s %(message)s', filename='./server.log', encoding='utf-8', level=logging.INFO)
NYSE_HOLIDAYS = ['2022-11-24', '2022-12-26', '2023-01-02', '2023-01-16', 
'2023-02-20', '2023-04-07', '2023-05-29', '2023-06-19']

NYT = tz.gettz('America/New_York')


ticks=[]
client_websockets = []
df_state_last_update_time = datetime.datetime.now()
df_state_last_print_time = datetime.datetime.now()


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
  f = open(get_state_file_name())
  state = json.load(f)
  timestamp = datetime.datetime.now(NYT)
  last_b_date = get_last_workday_nyse(timestamp)
  today_date = get_today_nyse(timestamp)
  securities = state['securities']
  return [s for s in securities if validate_date(s['last_data_date'], last_b_date, today_date)]



async def send_msg_to_all(id, point, price, operation, stop_loss=None):
  global client_websockets
  websockets_to_remove = []
  if stop_loss:
    obj_to_send = {"id": id, "point": point, "price": price, "operation": operation, "stop_loss": stop_loss}
  else:
    obj_to_send = {"id": id, "point": point, "price": price, "operation": operation}

  str_to_send = json.dumps(obj_to_send)
  for websocket in client_websockets:
    try:
      #logging.info(f'send data to {websocket}')
      await websocket.send(str_to_send)
    except websockets.exceptions.ConnectionClosed:
      logging.info("Client disconnected.  Do cleanup")
      websockets_to_remove.append(websocket)
      continue
  for websocket in websockets_to_remove:
    client_websockets.remove(websocket)



def find_first_index(lst, condition):
  filtered = [i for i, elem in enumerate(lst) if condition(elem)]
  if len(filtered) == 0:
    return None
  else:
    return filtered[0]

def update_state(id, new_state, price):
  global security_state
  index = find_first_index(security_state, lambda e: e['id']==id)
  if index is None:
    logging.error(f'{id} not in security_list, please check')
    return None    
  cur_state = security_state[index]['state']
  if cur_state != new_state:
    logging.info(f'changed {id} from {cur_state} to {new_state} at {price}')
    security_state[index]['state'] = new_state

async def check_msg(data):
  global security_state
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
  id = data['id']
  index = find_first_index(security_state, lambda e: e['id']==id)

  if index is None:
    logging.info(f'{id} not in security_list, please check')
    return None    

  states = security_state[index]
  buy_point = states['buy_point']
  sell_point = states['sell_point']
  stop_loss = states['stop_loss']
  price = data['price']
  
  if price < buy_point:
    update_state(id, 'buy', price)
    await send_msg_to_all(id, buy_point, price, 'buy', stop_loss)
  elif price > sell_point:
    update_state(id, 'sell', price)
    await send_msg_to_all(id, sell_point, price, 'sell')
  else:
    update_state(id, 'normal', price)

async def send_request(name_list, ws):
  symbol_list = dict()
  symbol_list["subscribe"] = name_list
  send_str = json.dumps(symbol_list)
  await ws.send_str(send_str)
  logging.info(f'data sent: {name_list}')

def get_state_file_name():
  last_workday_nyse = get_last_workday_nyse()
  return f'../models/model3/state-{last_workday_nyse}.json'

def validate_model_date():
  return path.isfile(get_state_file_name())


async def echo(websocket):
  client_websockets.append(websocket)
  async for message in websocket:
    await websocket.send(message)

async def init_server():
  logging.info('initialize server')
  async with serve(echo, None, 8766) as target:
    await asyncio.Future()

async def init_client():
  # DELETE ME, TESTING
  #name_list = ['BTC-USD', 'ETH-USD', 'USDT-USD']
  id_list = [s['id'] for s in security_state]
  async with aiohttp.ClientSession() as session:
    #async with session.ws_connect("wss://streamer.finance.yahoo.com/") as ws:
    async with session.ws_connect("wss://streamer.finance.yahoo.com/") as ws:
      await send_request(id_list, ws)
      async for msg in ws:
        if msg.type == aiohttp.WSMsgType.TEXT:
          await check_msg(msg.data)
          if msg.data == 'close cmd':
            await ws.close()
            break
        elif msg.type == aiohttp.WSMsgType.ERROR:
          break


async def main():
  global security_state
  logging.info('validate model state')
  valid = validate_model_date()
  if not valid:
    logging.info('Validating file failed, exiting...')
    exit(1)
  security_state = get_valid_securities()
  if len(security_state) < 1:
    logging.info('no valid id found')
    exit(1)
  security_state = [{**s, 'state':'init'} for s in security_state]
  print(security_state)
  logging.info(security_state)
  asyncio.ensure_future(init_client())
  await init_server()

asyncio.run(main())