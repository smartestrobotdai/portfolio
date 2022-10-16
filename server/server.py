import yliveticker
import json
import time
from timeloop import Timeloop
from datetime import timedelta
from dateutil import tz
import datetime
from pandas.tseries.offsets import BDay

tl = Timeloop()

NYSE_HOLIDAYS = ['2022-11-24', '2022-12-26', '2023-01-02', '2023-01-16', 
'2023-02-20', '2023-04-07', '2023-05-29', '2023-06-19']

NYT = tz.gettz('America/New_York')

# this function is called on each ticker update
sek_price = 0

security_dict = {}
def on_new_msg(ws, msg):
    global sek_price
    security_id = msg['id']
    cur_price = msg['price']
    if msg['id'] == 'SEK=X':
        print(f'update sek price, last price: {sek_price}, cur price: {cur_price}')
        sek_price = msg['price']

    elif security_id in security_dict.keys() and sek_price > 0:
        print(f'checking security: {security_id}')
        buy_point = security_dict[security_id]['buy_point']
        sell_point = security_dict[security_id]['sell_point']
        price_in_sek = cur_price * sek_price
        if price_in_sek >= sell_point:
            print(f'SELL {security_id} at price : USD{cur_price}, SEK: {price_in_sek} sell_point: {sell_point}')
        elif price_in_sek <= buy_point:
            print(f'BUY {security_id} at price : USD{cur_price}, SEK: {price_in_sek} buy_point: {buy_point}')


def get_security_names():
    f = open('../models/model1/desc.json')
    desc = json.load(f)
    return desc['securities']

def get_last_workday_nyse(timestamp):
  candidate = timestamp - BDay(1)
  if candidate.strftime("%Y-%m-%d") in NYSE_HOLIDAYS:
    return (timestamp - BDay(2)).strftime("%Y-%m-%d") 
  return candidate.strftime("%Y-%m-%d") 

def validate_date(last_data_date):
    current_ny_time = datetime.datetime.now(NYT)
    return get_last_workday_nyse(current_ny_time) == last_data_date


@tl.job(interval=timedelta(seconds=20))
def sample_job_every_2s():
    global security_dict
    f = open('../models/model1/state.json')
    state = json.load(f)
    security_states = state['security_states']
    for states in security_states:
        security_name = states['name']
        last_data_date = states['last_data_date']
        valid = validate_date(last_data_date)
        if valid:
            security_dict[security_name] = states
            
            #print(f'Validating {security_name} Succeeded')
        else:
            print(f'Validating {security_name} Failed')


tl.start(block=False)


# validate the last_data_date to validate if they are from last bussiness day.




securities = get_security_names()
yliveticker.YLiveTicker(on_ticker=on_new_msg, ticker_names=securities + ['SEK=X'])