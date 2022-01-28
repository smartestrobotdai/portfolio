#!/usr/bin/env python
# coding: utf-8

# This script tries tp answer:
# Is choosing securities strategically better than choosing them randomly?
# 
# we pick US securities and apply our algorithm and see if it is statistically better than average.
# 
# we change our portofolio twice per day, open and close.

# In[1]:


YEARS=8
TRADING_DAYS=253
SECURITIES = ['']

def get_meta(filename):    
    f = open(filename)
    data = json.load(f)
    return data['currency'], data['regularMarketPrice'], data['regularMarketTime']

def get_change_rate(filename):    
    f = open(filename)
    data = json.load(f)
    return data['regularMarketPrice'], data['regularMarketTime']


# In[2]:


def get_exp(weights):
    weights = np.array(weights)
    annual_profits = table['annual'].to_numpy()
    res = np.matmul(weights, annual_profits)
    return np.matmul(weights, annual_profits)


# In[3]:


def get_std(weights):
    weights = np.array(weights)
    cov_m = np.array(error_matrix.cov())
    res = np.sqrt(np.matmul(np.matmul(weights, cov_m), np.transpose(weights)))
    return np.sqrt(np.matmul(np.matmul(weights, cov_m), np.transpose(weights)))


# In[4]:


def get_sharpe(weights):
    print(weights)
    res = -get_exp(weights)/get_std(weights)
    print(res)
    return res


# In[5]:


# check all directories under ../data
import os
import pandas as pd
import json
from sklearn.linear_model import LinearRegression
import numpy as np
from scipy.optimize import minimize
pd.options.mode.chained_assignment = None  # default='warn'
rootdir = '../data'

all_names = ''
PARSE_START_YEAR=8
PARSE_END_YEAR=3
profits_model=[]
profits_securities=[]
for num_day in range(30):
    print('**************************')
    print("day: ", num_day)
    data_src = []
    for subdir, dirs, files in os.walk(rootdir):
        for dir in dirs:
            obj =  {}
            name = dir
            # get currency.
            currency, cur_price, cur_time = get_meta(os.path.join(subdir, dir, 'meta'))
            if currency != 'USD':
                continue

            all_names += dir
            obj['name'] = dir
            obj['currency'] = currency
            all_df = pd.read_json(os.path.join(subdir, dir, 'data'))
            left = all_df[int(-TRADING_DAYS*PARSE_START_YEAR+num_day):int(-TRADING_DAYS*PARSE_END_YEAR+num_day)]
            left['time']=pd.to_datetime(left['timestamp'],unit='s')

            df = left

            df.dropna(subset = ['close'], inplace=True)
            df['close_log']=np.log(df['close'])
            X = df['time'].astype(np.int64).values.reshape(-1, 1)  # iloc[:, 1] is the column of X
            Y = df['close_log'].values.reshape(-1, 1)  # df.iloc[:, 4] is the column of Y
            linear_regressor = LinearRegression()
            linear_regressor.fit(X, Y)
            Y_pred = linear_regressor.predict(X)
            obj['scope'] = (Y_pred[-1]-Y_pred[0])/X.shape[0]
            df['close_log_linear']=Y_pred
            df['close_log_error']=df['close_log']-df['close_log_linear']
            obj['df']=df
            obj['all_df']=all_df
            data_src.append(obj)
    profits=[]
    for data in data_src:
        print(data['name'])
        df = data['all_df']

        start = df['close'].iloc[-int(TRADING_DAYS*PARSE_END_YEAR+num_day)]
        end = df['close'].iloc[-int(TRADING_DAYS*PARSE_END_YEAR+num_day)+1]
        profit = (end - start)/start
        profits.append(profit)
    profits_securities.append(sum(profits) / len(profits))
    
    table = []
    error_matrix = None
    for data in data_src:
        row = {}
        row['name']=data['name']
        row['scope']=data['scope'][0]
        row['std']=data['df']['close_log_error'].std()
        row['error']=data['df']['close_log_error'].values[-1]
        if error_matrix is None:
            error_matrix = data['df'][['time','close_log_error']].rename(columns={'close_log_error': data['name']})
        else:
            error_matrix = pd.merge_asof(error_matrix, data['df'][['time','close_log_error']].rename(columns={'close_log_error': data['name']}), on='time')
        table.append(row)
    table = pd.DataFrame(table)
    table['annual']=table['scope']*253-table['error']
    num_stocks=len(table)
    bnds = []
    init = []
    for i in range(num_stocks):
        bnds.append((0,1))
        init.append(1/num_stocks)

    bnds = tuple(bnds)
    init = tuple(init)
    cons = {'type': 'eq', 'fun': lambda x:  1-np.sum(x)}
    res = minimize(get_sharpe, init, method='SLSQP', bounds=bnds,
                   constraints=cons)
    
    profits_model.append(np.matmul(np.array(profits), np.transpose(res.x)))


print(profits_model)
print(profits_securities)