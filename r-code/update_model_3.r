library(pracma)
library(rjson)
library(purrr)
source('util.r')
dir <- '../models/model3'

n_days_back <- 30
n_candidates <- 1

#stock_names <- unlist(lapply(list.files('./data'), function(x) gsub(".rds", "", x)))
results <- readRDS(file="new_parameters_results_name.rds")
df <- data.frame(do.call(rbind,results))
stock_names <- df$name

print(str_glue('stock_names length: {length(stock_names)}'))

ewma <- function (x, alpha) {
  c(stats::filter(x * alpha, 1 - alpha, "recursive", init = x[1]))
}

ewmsd <- function(x, alpha) {
  sqerror <- na.omit((x - lag(ewma(x, alpha)))^2)
  ewmvar <- c(stats::filter(sqerror * alpha, 1 - alpha, "recursive", init = 0))
  c(NA, sqrt(ewmvar))
}

ewmsd2 <- function(x, alpha) {
    n <- length(x)
    sapply(
    1:n,
    function(i, x, alpha) {
        y <- x[1:i]
        m <- length(y)
        weights <- (1 - alpha)^((m - 1):0)
        ewma <- sum(weights * y) / sum(weights)
        bias <- sum(weights)^2 / (sum(weights)^2 - sum(weights^2))
        ewmsd <- sqrt(bias * sum(weights * (y - ewma)^2) / sum(weights))
    },
    x = x,
    alpha = alpha
    )
}


helper <- function(all, name) {
  #df <- data_prep(name, to_sek=FALSE) %>% select(no_model_profit)
  failed = FALSE
  error_func <- function(e) {
    print(e)
    failed <<- TRUE
    return(NA)
  }

  df <- tryCatch(data_prep(name, end_date=NULL, to_sek=FALSE, reload=TRUE), error=error_func)
  if (failed) {
    return(all)
  }
  
  df <- df %>% mutate(mean_diff=c(0, diff(mean))) %>% select(mean_diff, no_model_profit)
  n = 20
  alpha = 2/(n+1)
  df$movavg = ewma(exp(1)**df$mean_diff, alpha) - 1
  df$movsd = ewmsd2(exp(1)**df$mean_diff, alpha)
  df <- df %>% filter(!is.na(movavg)) %>% filter(!is.na(movsd)) %>% mutate(mov_mu_sd_ratio=movavg/movsd)
  df <- df %>% mutate(diff_mov_mu_sd_ratio=c(0, diff(mov_mu_sd_ratio)))
  colnames(df) <- paste(name, colnames(df), sep='.')
  merge_with_rowname(all, df)
}

get_profit_last_year <- function(name, par) {
    R_val <- abs(par[1])
    Q_val <- abs(par[2])
    courtage <- 0
    
    sell_dev <- par[3]
    buy_dev <- par[4]
    stop_loss_log <- log(0.5)
    df <- data_prep(name, end_date=NULL, reload=TRUE)
    df <- ekalman(r=R_val, q=Q_val, df)

    df <- process_one(df, stop_loss_log, sell_dev, buy_dev, log(1 - courtage))
    len_ <- dim(df)[1]
    return(sum(tail(df$trade_profit, n=272)))
}

get_no_model_profit_last_year <- function(name) {
    df <- data_prep(name, end_date=NULL, reload=TRUE)
    return(sum(tail(df$no_model_profit, n=272)))
}

get_ids_past_days <- function(n_days) {
  files <- list.files(path=dir, pattern="*.json", full.names=TRUE)
  details <- file.info(files)
  n_days_back0 <- min(nrow(details), n_days)

  df <- details[with(details, order(as.POSIXct(ctime), decreasing=TRUE))[1:n_days_back0], ]
  filenames <- unlist(rownames(df))
  print(filenames)
  get_ids <- function(filename) {
    result <- fromJSON(file=filename)
    sapply(result$securities, function(x) x$id)
  }

  ids <- unique(unname(unlist(sapply(filenames, get_ids))))
  print('000')
  print(ids)
  return(ids)
}

add_to_securities <- function(securities, parameters, allow_to_buy) {
  name <- parameters$name
  par <- parameters$par
  df <- data_prep(name, end_date=NULL, reload=TRUE)
  predict_res <- ekalman(r=par[1], q=par[2], df, predict=TRUE)
  last_data_date <- predict_res[1]
  predict <- as.numeric(predict_res[2])
  sell_point <- predict + par[3]
  buy_point <- predict + par[4]
  predict <- exp(1) ** predict
  sell_point <- exp(1) ** sell_point
  buy_point <- exp(1) ** buy_point
  value <- parameters$value
  append(securities, list(list(id=name, last_data_date=last_data_date, predict=predict, sell_point=sell_point, 
    buy_point=buy_point, stop_loss=0.5, allow_to_buy=allow_to_buy, value=value)))
}
                             
#high_weight <- c('AAPL', 'MSFT', 'AMZN', 'TSLA', 'UNH', 'GOOGL', 'XOM', 'JNJ', 'GOOG', 'JPM', 'NVDA', 'CVX', 'V', 'PG', 'HD', 'LLY', 'MA', 'PFE', 'ABBV', 'BAC', 'MRK', 'PEP', 'KO', 'COST', 'META', 'MCD', 'WMT', 'TMO', 'CSCO', 'DIS', 'AVGO', 'WFC', 'COP', 'ABT', 'BMY', 'ACN', 'DHR', 'VZ', 'NEE', 'LIN', 'CRM', 'TXN', 'AMGN', 'RTX', 'HON', 'PM', 'ADBE', 'CMCSA', 'T')
#stock_names <- high_weight
if (!file.exists('./cache')) {
  print('Creating folder: ./cache')
  dir.create('./cache')
}

cur_date <- as.Date(Sys.time())
cache_file <- str_glue('cache/update_model_3_cache-{cur_date}.csv')
if (!file.exists(cache_file)) {
  print('cache file does not exist, create new.')
  len_stock_names <- length(stock_names)
  print(str_glue('preparing whole table from {len_stock_names} stocks'))
  m <- Reduce(helper, stock_names, init=NULL)  
  write.csv(m, file=cache_file)
}

print('load from file.')
m <- read.csv(file=cache_file)


list_ <- unlist(tail(m %>% select(contains('.mov_mu_sd_ratio')), n=1))

candidates <- gsub('.mov_mu_sd_ratio', '', names(sort(list_)[1:n_candidates]))
print('first screen:')
print(candidates)

no_model_profit_list <- unlist(lapply(candidates, function(x) get_no_model_profit_last_year(x)))
print('no_model_profit_list')
print(no_model_profit_list)
mean_no_model <- mean(no_model_profit_list)
print(str_glue('mean no_model: {mean_no_model}'))


candidate_index <- match(candidates, stock_names)




values <- sapply(results[candidate_index], function(x) x$value)
print('second screen, the profit > 0, profits:')
print(values)
cond <- values < 0
candidates <- candidates[cond]
candidate_index <- candidate_index[cond]
print('candidates with profit > 0:')
print(candidates)
len <- length(candidates)
securities <- list()
if (len>0) {
  candidates <- candidates[1:n_candidates]
  candidate_index <- candidate_index[1:n_candidates]
  # stocks to buy
  for (i in seq_along(candidates)) {
    idx <- candidate_index[i]
    securities <- add_to_securities(securities, results[[idx]], TRUE)
  }
}


securities_to_sell <- get_ids_past_days(n_days_back)
securities_to_sell <- securities_to_sell[!securities_to_sell %in% candidates]
print("securities_to_sell:")
print(securities_to_sell)
securities_to_sell_index <- match(securities_to_sell, stock_names)
# stocks to sell
for (i in seq_along(securities_to_sell)) {
  idx <- securities_to_sell_index[i]
  securities <- add_to_securities(securities, results[[idx]], FALSE)
}

cur_time <- Sys.time()
output <- list(last_update_time=as.character(cur_time), securities=securities)
print(toJSON(output))

latest_last_data_date <- tail(m$X, n=1)
print(str_glue('latest_last_data_date: {latest_last_data_date}'))
outfile <- str_glue("{dir}/state-{latest_last_data_date}.json")
print(outfile)
out = file(outfile, 'w')
write(toJSON(output), out)

