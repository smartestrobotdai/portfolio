library(FKF)
library(dplyr)
library(quantmod)
library(data.table)
library(stringr)
library(TTR)
library(stringi)

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

kalman <- function(df, HHt_val, GGt_val, predict=FALSE, use_close=FALSE) {
  df$mean <- (df$high + df$low)/2
  # kalman filter should accept the original number instead of log.
  if (use_close) {
    y <- as.numeric(exp(1)**df$close)
  } else {
    y <- as.numeric(exp(1)**df$mean)
  }

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

  if (predict) {
    return(log(res$at))
  }

  len <- length(y)
  #df <- data.frame(y, res$at[1,1:len], resid[1:len], df$high, df$low, df$close, df$open, shift(df$close))
  df <- df %>% mutate(predict=log(res$at[1,1:len]))

  return(df)
}
                    
result_summary_old <- function(df, stop_loss, courtage=COURTAGE, verbose=FALSE, optimize=TRUE) {
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
  #print(str_glue('close: {close} open: {open}'))
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
            profit + log_stop_loss
        } else {
          profit <- profit + close - last_buy_price
        }
      }
    }
  }

  profit <- profit + trade_times * courtage_log
  return(c(profit, trade_times, hold, last_buy_price))
}

get_sek_usd <- function(predict=FALSE, mean_only=TRUE) {
  if (predict) {
    sek_df <- data.frame(getSymbols('SEK=X',src='yahoo',auto.assign=FALSE))
  } else {
    sek_df <- data.frame(readRDS(file='sek/SEK.X.rds'))
  }
  
  if(startsWith(rownames(sek_df)[[1]], 'X')) {
    rownames(sek_df) <- lapply(rownames(sek_df), function(x) str_replace_all(substring(x, 2), "\\.", '-'))
  }
  
  if (mean_only) {
    sek_df$SEK.X.Mean <- (sek_df$SEK.X.High + sek_df$SEK.X.Close) / 2
    sek_df$SEK.X.Mean <- na.approx(sek_df$SEK.X.Mean)
    sek_df <- sek_df %>% select(SEK.X.Mean)
  }

  return(sek_df)
}

data_filter <- function(df, start_date, end_date=NULL) {
  if (is.null(end_date)) {
    end_date <- '2030-12-30'
  }
  df %>% filter(rownames(df) > start_date & rownames(df) < end_date)
}


g_sek_df = NULL
data_prep <- function(stock_name, start_date='2007-01-01', 
  end_date="2022-09-30", HHt_val=NULL, GGt_val=NULL, predict=FALSE, isNYSE=TRUE, 
  use_close=FALSE, to_sek=TRUE) {
  data_dir <- if (isNYSE) 'data' else 'omx'
  if (predict) {
    df <- data.frame(getSymbols(stock_name, src='yahoo', auto.assign=FALSE))
    df <- df %>% data_filter(start_date, NULL)
  } else {
    df <- data.frame(readRDS(file=str_glue('{data_dir}/{stock_name}.rds')))
    df <- df %>% data_filter(start_date, end_date)
  }

  df <- df %>% set_colnames(c('open', 'high', 'low', 'close', 'volume', 'adjusted'))
  # remove NA
  df <- df %>% filter(!is.na(close))
  if (to_sek) {
    sek_df = get_sek_usd(predict=predict)
    df <- left_merge_with_rowname(df, sek_df)
    df$SEK.X.Mean <- na.approx(df$SEK.X.Mean)
    df[,1:4] <- df[,1:4] * df$SEK.X.Mean
    df <- df %>% select(-last_col())
  }

  df <- log(df)
  df <- df  %>% 
    mutate(last_close=shift(close), no_model_profit=c(0, diff(close)))
  df$last_close[1] <- df$open[1]
  if (predict) {
    at <- kalman(df, HHt_val, GGt_val, predict=TRUE, use_close=use_close)
    print(str_glue('dim(at): {dim(at)[1]}, nrow(df): {nrow(df)}'))
    stopifnot(length(at) == nrow(df) + 1)
    last_date <- rownames(tail(df, 1))
    last_predict <- tail(t(at),1)
    
    return(c(last_date, last_predict))
  }

  if (!is.null(HHt_val) && !is.null(GGt_val)) {
    df <- kalman(df, HHt_val, GGt_val, use_close=use_close)
  }
  return(df)
}

process_one <- function(df, 
  stop_loss, sell_dev, buy_dev, courtage) {
  test <- function(acc, row, stop_loss, sell_dev, 
      buy_dev, courtage_log) {
    open <- row$open
    high <- row$high
    low <- row$low
    close <- row$close
    last_close <- row$last_close
    predict <- row$predict
    hold <- acc[3]
    last_buy_price <- acc[4]
    results <- get_daily_profit(open, close, high, low, last_close, predict, 
      stop_loss, last_buy_price, sell_dev, 
      buy_dev, hold, courtage_log)
    return(c(results))
  }
  
  courtage_log <- log(1 - courtage)
  # init value: c(hold, last_buy_price)
  df_list <- split(df, seq(nrow(df)))
  appendix <- Reduce(function(acc, row) test(acc, row, stop_loss, 
                               sell_dev, 
                               buy_dev, 
                              courtage_log), df_list, init=c(0, 0, 0, 0), accumulate=TRUE)
  # discard the first row which is the init value
  appendix <- tail(appendix, -1)
  df$trade_profit <- as.numeric(lapply(appendix, '[[', 1))
  df$trade_times <- as.numeric(lapply(appendix, '[[', 2))
  df$hold <- as.numeric(lapply(appendix, '[[', 3))
  df$last_buy_price <- as.numeric(lapply(appendix, '[[', 4))
  return(df)
}

data_prep_multiple <- function(name_list, HHt_val, GGt_val, isNYSE, use_close=FALSE, to_sek=TRUE) {
  helper <- function(all, name) {
    df <- data_prep(name, HHt_val=HHt_val, GGt_val=GGt_val,
      isNYSE=isNYSE, use_close=use_close)
    
    colnames(df) <- paste(name, colnames(df), sep='.')
    merge_with_rowname(all, df)
  }
  Reduce(helper, name_list, init=NULL)
}

process_multiple <- function(df, stop_loss, sell_dev, buy_dev, courtage) {

  # from df get vector of names.
  # col name like 'aaa.st.open' to be 'aaa.st'
  remove_colname_suffix <- function(name) {
    paste(head(strsplit(name, split=".", fixed=T)[[1]], -1), collapse='.')
  }

  name_vec <- unique(lapply(colnames(df), remove_colname_suffix))
  get_colname <- function(colname, name) {
    str_glue('{name}.{colname}')
  }

  test <- function(acc, row, stop_loss, sell_deviation, 
    buy_deviation, courtage_log, name_vec) {
    trade_profit <- acc[1]
    trade_times <- acc[2]
    hold <- acc[3]
    last_buy_price <- acc[4]
    hold_name_index <- acc[5]
    get_daily_profit_by_name <- function(row, name, hold) {
      open <- row[[get_colname('open', name)]]
      high <- row[[get_colname('high', name)]]
      low <- row[[get_colname('low', name)]]
      close <- row[[get_colname('close', name)]]
      last_close <- row[[get_colname('last_close', name)]]
      predict <- row[[get_colname('predict', name)]]
      if (any(is.na(c(open, high, low, close, last_close, predict)))) {
        # NA found
        return(c(0,0,0,0))
      }
      
      results <- get_daily_profit(open, close, high, low, last_close, predict, 
        stop_loss, last_buy_price, sell_deviation, 
        buy_deviation, hold, courtage_log)
    }

    if (hold == 0) {
      #go through all names
      trade_profit <- trade_times <- hold <- last_buy_price <- hold_name_index <- 0
      for (i in seq_along(name_vec)) {
        name <- name_vec[[i]]
        results <- get_daily_profit_by_name(row, name, FALSE)
        
        if (results[3]) {
          # hold == TRUE
          trade_profit <- results[1]
          trade_times <- results[2]
          hold <- results[3]
          last_buy_price <- results[4]
          hold_name_index <- if(hold) i else 0
          break
        }
      }


    } else {
      name <- name_vec[[hold_name_index]]
      results <- get_daily_profit_by_name(row, name, TRUE)
      trade_profit <- results[1]
      trade_times <- results[2]
      hold <- results[3]
      last_buy_price <- results[4]
      hold_name_index <- if(hold) hold_name_index else 0
    }
    return(c(trade_profit, trade_times, hold, last_buy_price, hold_name_index))
  }
  
  courtage_log <- log(1 - courtage)
  # init value: c(hold, last_buy_price)
  df_list <- split(df, seq(nrow(df)))
  appendix <- Reduce(function(acc, row) test(acc, row, stop_loss, 
                               sell_dev, 
                               buy_dev, 
                              courtage_log, name_vec=name_vec), df_list, 
                              init=c(0, 0, 0, 0, 0), accumulate=TRUE)
  # discard the first row which is the init value
  appendix <- tail(appendix, -1)
  df$trade_profit <- as.numeric(lapply(appendix, '[[', 1))
  df$trade_times <- as.numeric(lapply(appendix, '[[', 2))
  df$hold <- as.numeric(lapply(appendix, '[[', 3))
  df$last_buy_price <- as.numeric(lapply(appendix, '[[', 4))
  df$hold_name_index <- as.numeric(lapply(appendix, '[[', 5))
  return(df)
}


