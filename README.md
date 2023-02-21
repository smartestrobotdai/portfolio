# portfolio
messages:

server to client message types:
action: buy|sell, stock_name, price
hello

client to server message types:
hello - client_id, bank_name, model_id
action_order_sent
action_order_failed
action_order_succeed



Next:
Jacobian doesn't work well when the function contains functions.
below code doesn't work:

import autograd.numpy as np
import math
from autograd import grad, jacobian



def f1(x):
  return x[0]

def f2(x):
  return x[1]*math.exp(x[0])


def f(x):
  return np.array([f1(x), f2(x)])

x = np.array([0.001,3], dtype=float)
A = jacobian(f)(x)

TypeError: must be real number, not ArrayBox