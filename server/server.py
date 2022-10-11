import yliveticker
import json
import time
from timeloop import Timeloop
from datetime import timedelta

tl = Timeloop()

NYSE_HOLIDAYS = ['2022-11-24', '2022-12-26', '2023-01-02', '2023-01-16', 
'2023-02-20', '2023-04-07', '2023-05-29', '2023-06-19']

# this function is called on each ticker update

@tl.job(interval=timedelta(seconds=2))
def sample_job_every_2s():
    print("2s job current time : {}".format(time.ctime()))

sek_price = 0
def on_new_msg(ws, msg):
    global sek_price
    if msg['id'] == 'SEK=X':
        cur_price = msg['price']
        print(f'update sek price, last price: {sek_price}, cur price: {cur_price}')
        sek_price = msg['price']

def get_security_names():
    f = open('../models/model1/desc.json')
    desc = json.load(f)
    return desc['securities']

tl.start(block=False)
securities = get_security_names() + ['SEK=X']
print(securities)

yliveticker.YLiveTicker(on_ticker=on_new_msg, ticker_names=securities)