library(FKF)
library(dplyr)
library(quantmod)
library(data.table)
library(stringr)
library(TTR)

COURTAGE=0.00089

myEMA <- function (price,n, beta){
  ema <- c()
  ema[1:(n-1)] <- NA
  ema[n]<- mean(price[1:n])
  for (i in (n+1):length(price)){
    ema[i]<-beta * price[i] + 
      (1-beta) * ema[i-1]
  }
  ema <- reclass(ema,price)
  return(ema)
}

ema <- function(df, n, beta) {
  # calculate ema
  n <- ceiling(abs(n))
  if (n == 0) {
    n = 1
  }
  beta <- abs(beta)
  if (beta > 1) {
    beta = 1
  }
  df$mean <- (df$high + df$low)/2
  origin_mean <- exp(1)**df$mean
  myEma <- myEMA(origin_mean, n=n, beta=beta)
  
  myEma <- shift(myEma)
  myEma[1:n+1] <- origin_mean[1:n+1]
  myEma[1] <- origin_mean[1]
  df <- df %>% mutate(predict=log(myEma))
  return(df)
}

kalman <- function(df, HHt_val, GGt_val) {
  df$mean <- (df$high + df$low)/2
  # kalman filter should accept the original number instead of log.
  y <- as.numeric((exp(1)**df$mean))
  dt <- ct <- matrix(0)
  Tt <- matrix(1) # nolint
  a0 <- y[1] # Estimation of the first year flow
  P0 <- matrix(0.0003) # Variance of 'a0'
  Zt <- matrix(1)
  HHt_val <- abs(HHt_val)
  GGt_val <- abs(GGt_val)
  # HHt and GGt should change over time, as the stock price changes,
  
  HHt <- array(y * HHt_val, dim=c(1,1,length(y)))
  GGt <- array(y * GGt_val, dim=c(1,1,length(y)))
  res <- fkf(HHt = HHt, GGt = GGt, yt = rbind(y), Zt=Zt,a0 = a0, P0 = P0, dt = dt, ct = ct,
      Tt = Tt)

  len <- length(y)
  #df <- data.frame(y, res$at[1,1:len], resid[1:len], df$high, df$low, df$close, df$open, shift(df$close))
  df <- df %>% mutate(predict=log(res$at[1,1:len]))

  return(df)
}

get_daily_profit <- function(par, df, verbose=TRUE, plot=FALSE, 
  type='kalman',
  same_day_trade_allowed=TRUE, 
  courtage=COURTAGE) {
    log_buy_deviation <- par[1]
    log_sell_deviation <- par[2]
    if (type=='kalman') {
      HHt_val <- par[3]
      GGt_val <- par[4]
    } else {
      days <- par[3]
      beta <- par[4]
    }
    stop_loss <- par[5]
    if (stop_loss>=1 || stop_loss <=0 ) {
      if (verbose) print(str_glue("warning stop:loss {par[5]} is invalid"))
      return(NULL)
    }
    log_stop_loss <- log(stop_loss)  # always negative
    hold <- 0
    courtage_log <- log(1 - courtage)  #default -0.0015011
    buy_point <- 0

    daily_trade <- function(x) {
      INVALID <-  (c(0, -1, 0))
      predict <- x["predict"]
      close <- x["close"]
      open <- x["open"]
      low <- x["low"]
      high <- x["high"]
      last_close <- x["last_close"]
      if(is.na(last_close)) {
        print('last_close is na')
        last_close = open
      }

      row_id <- x["row_id"]

      profit <- 0
      trade_times <- 0
      low_buy_threshold <- predict + log_buy_deviation

      high_sell_threshold <- predict + log_sell_deviation
      low_stop_loss_threshold <- buy_point + log_stop_loss

      # check to prevent extreme value
      if (hold && low_stop_loss_threshold > high_sell_threshold) {
        if (verbose)
          print(str_glue("warning stop_loss {low_stop_loss_threshold} higher than high_sell {high_sell_threshold}"))
        return(INVALID)
      }
      up <- close > open
      
      buy_at <- function(price) {
        hold <<- 1
        buy_point <<- price
        trade_times <<- trade_times+1
        low_stop_loss_threshold <<- buy_point + log_stop_loss
        if (verbose) {
          print(str_glue("BUY: row_id {row_id} up:{up} low:{low} buy:{buy_point} trade_times:{trade_times}"))
        }
      }

      sell_at <- function(price) {
        hold <<- 0
        trade_times <<- trade_times+1
        if (verbose) {
          if (price == low_stop_loss_threshold) {
            print(str_glue("SELL(STOP): row_id {row_id} up:{up} profit:{price-buy_point} low:{low} stop_loss:{low_stop_loss_threshold} sell_price: {price} trade_times:{trade_times}"))
          } else {
            print(str_glue("SELL: row_id {row_id} up:{up} profit:{price-buy_point} high:{high} price:{price} sell_threshold:{high_sell_threshold} sell_price: {price} trade_times:{trade_times}"))
          }
        }
      }      

      if (hold) {
        # the max (low_buy_threshold, low_stop_loss_threshold) come first
        if (up) {
          if (low < low_stop_loss_threshold) {
            sell_price = min(low_stop_loss_threshold, open)
            sell_at(sell_price)
            profit <- sell_price - last_close + courtage_log
          } else if(high > high_sell_threshold) {
            sell_price = max(open, high_sell_threshold)
            sell_at(sell_price)
            profit <- sell_price - last_close + courtage_log
          } else {
            profit <- close - last_close
          }
        } else {
          if(high > high_sell_threshold) {
            sell_price = max(open, high_sell_threshold)
            sell_at(sell_price)
            profit <- sell_price - last_close + courtage_log
            if (low < low_buy_threshold) {
              buy_at(low_buy_threshold)
              profit <- profit + courtage_log
              if (low < low_stop_loss_threshold) {
                sell_at(low_stop_loss_threshold)
                profit <- profit + low_stop_loss_threshold - buy_point + courtage_log
              } else {
                profit <- profit + close - buy_point
              }
            }
          } else if (low < low_stop_loss_threshold) {
            sell_price = min(low_stop_loss_threshold, open)
            sell_at(sell_price)
            profit <- sell_price - last_close + courtage_log
          } else {
            profit <- close - last_close
          }
        }
      } else {
        if(up) {
          if (low < low_buy_threshold) {
            buy_price = min(open, low_buy_threshold)
            buy_at(buy_price)
            profit <- courtage_log
            if (low < low_stop_loss_threshold) {
              sell_at(low_stop_loss_threshold)
              profit <- profit + low_stop_loss_threshold - buy_point + courtage_log
            } else if(high > high_sell_threshold) {
              profit <-
                profit + high_sell_threshold - buy_point + courtage_log
            } else {
              profit <- profit + close - buy_point + courtage_log
            }
          }
        } else {
          if (low < low_buy_threshold) {
            buy_price = min(open, low_buy_threshold)
            buy_at(buy_price)
            profit <- courtage_log
            if (low < low_stop_loss_threshold) {
              sell_at(low_stop_loss_threshold)
              profit <-
                profit + low_stop_loss_threshold - buy_point + courtage_log
            } else {
              profit <- profit + close - buy_point + courtage_log
            }
          }
        }
      }
      if (trade_times > 0 && verbose) {
        print(str_glue(
          "DAY: row_id: {row_id} open:{open} close:{close} last_close:{last_close} profit: {profit} trade_times: {trade_times} hold: {hold}"))
      }
      return(c(hold, profit, trade_times))
    }

    if (type=='kalman') {
      df <- kalman(df, HHt_val, GGt_val)
    } else {
      df <- ema(df, days, beta)
    }
    
    if (is.null(df)) {
      return(df)
    }
      

    result <- apply(df %>% mutate(row_id=row_number()) , 1, function(x) daily_trade(x))
    df$hold=t(result)[,1]
    df$trade_profit=t(result)[,2]
    df$trade_times=t(result)[,3]
    return(df)
    #return(cbind(df, df_result))
}
                    
result_summary <- function(df, stop_loss, courtage=COURTAGE, verbose=FALSE, optimize=TRUE) {
  if (is.null(df)) {
    # invalid
    return(-1)
  }
  
  if (optimize == FALSE) {
    summary1 <- df %>% filter(trade_profit != 0 | hold == 1) %>% 
      summarise(sum=sum(trade_profit), times=sum(trade_times), n=n())
    avg_profit <- summary1$sum / summary1$n
    len <- dim(df)[1]
    avg_profit_no_model <- (df$mean[len] - df$mean[1])/len    
    sum_no_model <- df$mean[len] - df$mean[1]
    if (verbose) {
      print(summary1)
    }
  }

  summary2 <- df %>% mutate(id=row_number()) %>% mutate(range=cut(id, seq(0, max(id)+252, 252))) %>% 
    filter(trade_profit != 0 | hold == 1) %>% 
    group_by(range) %>% summarise(sum=sum(trade_profit), n=n())

  annual_mean <- mean(summary2$sum)
  annual_sd <- sd(summary2$sum)
  annual_daily_mean <- mean(summary2$sum / summary2$n, na.rm=TRUE)
  annual_daily_sd <- sd(summary2$sum / summary2$n, na.rm=TRUE)
  if (verbose) {
    print(summary2)
    print(str_glue("avg_profit:{avg_profit}, nomodel_profit:{avg_profit_no_model}, nomodel_sum: {sum_no_model} sum:{summary1$sum}, trade_times:{summary1$times} hold_days:{summary1$n}, courtage: {courtage}"))
    print(str_glue("annaul_mean:{annual_mean} annual_sd:{annual_sd}"))
    print(str_glue("annual_daily_mean:{annual_daily_mean} annual_daily_sd:{annual_daily_sd}"))
  }
  #pulish with low stop_loss and longer holding days.
  #return(annual_mean - 0.5 * annual_sd + 0.2 * log(stop_loss))
  if (optimize) {
    if (is.na(annual_daily_mean) || is.na(annual_daily_sd)) {
      # the model did nothing, punish.
      annual_daily_mean = -0.001
      annual_daily_sd = 0
    }
    return(annual_daily_mean - 0.5 * annual_daily_sd + 0.002 * log(stop_loss))
  } else {
    return(list(trade_times=summary1$times, hold_days=summary1$n, annual_daily_mean=annual_daily_mean, 
        annual_daily_sd=annual_daily_sd, sum_no_model=sum_no_model, sum=summary1$sum, avg_profit_no_model=avg_profit_no_model,
        avg_profit=avg_profit))
    
  }
  

  
}

merge_with_rowname <- function(x,y)
  transform(merge(x, y, all = TRUE, by = 0), 
    row.names = Row.names, Row.names = NULL)

set_colnames <- function(df, names) {
    colnames(df) <- names
    return(df)
}


left_merge_with_rowname <- function(x,y)
  transform(merge(x, y,all.x = TRUE, by = 0), row.names = Row.names, Row.names = NULL)

outer_merge_with_rowname <- function(x,y)
  transform(merge(x, y,all = TRUE, by = 0), row.names = Row.names, Row.names = NULL)

append_colname <- function(df, name) {
  colnames(df) <- paste0(colnames(df), paste0('.',name))
  return(df)
}

# the most important function! test carefully!
get_daily_profit <- function(open, close, high, low, last_close, predict, 
  stop_loss, last_buy_price, sell_deviation, 
  buy_deviation, hold, courtage_log) {
  
  profit <- 0
  up <- close > open
  log_stop_loss <- log(stop_loss)  # always negative
  low_stop_loss_threshold <- last_buy_price + log_stop_loss
  high_sell_threshold <- predict + sell_deviation
  low_buy_threshold <- predict + buy_deviation
  trade_times <- 0

  buy <- function(price) {
    trade_times <<- trade_times + 1
    last_buy_price <<- price
    low_stop_loss_threshold <<- last_buy_price + log_stop_loss
    hold <<- TRUE
  }

  sell <- function(price) {
    trade_times <<- trade_times + 1
    last_buy_price <<- 0
    hold <<- FALSE
  }

  if (hold) {
    # the max (low_buy_threshold, low_stop_loss_threshold) come first
    if (up) {
      if (low < low_stop_loss_threshold) {
        sell_price = min(low_stop_loss_threshold, open)
        sell(sell_price)
        profit <- sell_price - last_close
      } else if(high > high_sell_threshold) {
        sell_price = max(open, high_sell_threshold)
        sell(sell_point)
        profit <- sell_price - last_close
      } else {
        profit <- close - last_close
      }
    } else {
      if(high > high_sell_threshold) {
        sell_price = max(open, high_sell_threshold)
        sell(sell_price)
        profit <- sell_price - last_close
        if (low < low_buy_threshold) {
          buy(low_buy_threshold)
          if (low < low_stop_loss_threshold) {
            sell(low_stop_loss_threshold)
            profit <- profit + log_stop_loss
          } else {
            profit <- profit + close - last_buy_price
          }
        }
      } else if (low < low_stop_loss_threshold) {
        sell_price = min(low_stop_loss_threshold, open)
        sell(sell_price)
        profit <- sell_price - last_close
      } else {
        profit <- close - last_close
      }
    }
  } else {
    if(up) {
      if (low < low_buy_threshold) {
        buy_price = min(open, low_buy_threshold)
        buy(buy_price)
        if (low < low_stop_loss_threshold) {
          sell(low_stop_loss_threshold)
          profit <- log_stop_loss
        } else if(high > high_sell_threshold) {
          profit <- high_sell_threshold - last_buy_price
          sell(high_sell_threshold)
        } else {
          profit <- profit + close - last_buy_price
        }
      }
    } else {
      if (low < low_buy_threshold) {
        buy_price = min(open, low_buy_threshold)
        buy(buy_price)
        if (low < low_stop_loss_threshold) {
          sell(low_stop_loss_threshold)
          profit <-
            profit + low_stop_loss_threshold - last_buy_price
        } else {
          profit <- profit + close - last_buy_price
        }
      }
    }
  }

  profit <- profit + trade_times * courtage_log
  return(c(profit, trade_times, hold, last_buy_price))
}

get_sek_usd <- function() {
  sek_df <- data.frame(getSymbols('SEK=X',src='yahoo',auto.assign=FALSE))
  #rownames(sek_df) <- lapply(rownames(sek_df), function(x) str_replace_all(substring(x, 2), "\\.", '-'))

  sek_df$SEK.X.Mean <- (sek_df$SEK.X.High + sek_df$SEK.X.Close) / 2
  sek_df <- sek_df %>% select(SEK.X.Mean)
  return(sek_df)
}

data_filter <- function(df, start_date, end_date) {
  df %>% filter(rownames(df) > start_date) %>% filter(rownames(df) < end_date)
}
                       
g_sek_df = NULL
data_prep <- function(stock_name, sek_df=NULL, start_date='2007-01-01', end_date="2022-09-30") {
  if (is.null(sek_df)) {
    if (is.null(g_sek_df)) {
      g_sek_df <<- get_sek_usd() %>% data_filter(start_date, end_date)
      
    } 
    sek_df <- g_sek_df
  }
  df <- data.frame(getSymbols(stock_name,src='yahoo',auto.assign=FALSE))
  df <- df %>% data_filter(start_date, end_date)
  df <- left_merge_with_rowname(df, sek_df)
  df$SEK.X.Mean <- na.approx(df$SEK.X.Mean)
  df[,1:4] <- df[,1:4] * df$SEK.X.Mean
  df <- data.frame(log(df)) %>% select(-last_col())

  df <- df %>% set_colnames(c('open', 'high', 'low', 'close', 'volume', 'adjusted')) %>% 
    mutate(last_close=shift(close), no_model_profit=c(0, diff(close)))
  df$last_close[1] <- df$open[1]
  return(df)
}
