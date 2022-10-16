import asyncio
from email import message_from_string
import json
import json
import time
from datetime import timedelta
from dateutil import tz
import datetime
from pandas.tseries.offsets import BDay
import aiohttp
from yticker_pb2 import yaticker
import base64

NYSE_HOLIDAYS = ['2022-11-24', '2022-12-26', '2023-01-02', '2023-01-16', 
'2023-02-20', '2023-04-07', '2023-05-29', '2023-06-19']

NYT = tz.gettz('America/New_York')
security_dict = {}

async def set_periodic_task(recur_time, callback):
  await asyncio.sleep(recur_time)
  asyncio.ensure_future(callback())
  asyncio.ensure_future(set_periodic_task(recur_time, callback))


securities = None

def get_last_workday_nyse(timestamp):
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

async def check_security_state():
  global security_dict
  start_time = time.time()
  
  f = open('../models/model1/state.json')
  state = json.load(f)
  timestamp = datetime.datetime.now(NYT)
  last_b_date = get_last_workday_nyse(timestamp)
  today_date = get_today_nyse(timestamp)
  print(f'{last_b_date, today_date}')
  print(f'time spent : {time.time() - start_time}')
  security_states = state['security_states']
  for states in security_states:
      security_name = states['name']
      last_data_date = states['last_data_date']
      valid = validate_date(last_data_date, last_b_date, today_date)
      if valid:
          security_dict[security_name] = states
      else:
          print(f'Validating {security_name} Failed: last_data_date:{last_data_date}, last_b_date: {last_b_date} today_date: {today_date}')

  print(f'time spent : {time.time() - start_time}')

def get_security_names():
    f = open('../models/model1/desc.json')
    desc = json.load(f)
    return desc['securities']

async def main():
  print('main')
  # initializing
  #await set_periodic_task(10, check_security_state)
  ticks = ['BTC-USD', 'ETH-USD']
  symbol_list = dict()
  symbol_list["subscribe"] = ticks
  my_yaticker = yaticker()
  async with aiohttp.ClientSession() as session:
    #async with session.ws_connect("wss://streamer.finance.yahoo.com/") as ws:
    async with session.ws_connect("wss://streamer.finance.yahoo.com/") as ws:
      print('connected')
      await ws.send_str(json.dumps(symbol_list))
      print('sent')
      async for msg in ws:
        print('test')
        print(msg.type)
        print(msg.data)
        if msg.type == aiohttp.WSMsgType.TEXT:
          message = base64.b64decode(msg.data)
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
          print(json.dumps(data))
          if msg.data == 'close cmd':
              await ws.close()
              break
        elif msg.type == aiohttp.WSMsgType.ERROR:
          break
  await asyncio.Future()

asyncio.run(main())