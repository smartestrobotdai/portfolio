library(stringr)
source('./util.r')




# randomely get k samples
# make k samples, each sample have n words from w. with the probablity prob.
make_samples <- function(w, r, k, prob) {
  results <- list()
  strings <- c()
  n <- length(w)
  k_upper_limit <- choose(n,r) * factorial(r)
  if (k > k_upper_limit) {
    print(str_glue("warning: make_samples: requested number of samples:{k}, max number of samples: {k_upper_limit}"))
    k <- k_upper_limit
  }
  
  while(length(results) < k) {
    candidate <- sample(w, size=r, replace=FALSE, prob=prob)
    candidate.str <- paste0(candidate, sep='', collapse='-')
    if (!candidate.str %in% strings) {
      strings <- append(strings, candidate.str)
      results <- append(results, list(candidate))
    }
  }
  return(results)
}

get_prob_weight <- function(name, HHt_val, GGt_val,
  stop_loss, sell_dev, buy_dev, courtage, isNYSE, use_close, to_sek) {
    df <- data_prep(name, HHt_val=HHt_val, GGt_val=GGt_val, isNYSE=isNYSE, use_close=use_close, to_sek=to_sek)
    df <- process_one(df, stop_loss, sell_dev, buy_dev, courtage)
    my_summary <- df %>% filter(trade_profit != 0 | hold != 0) %>% summarise(sum=sum(trade_profit), n=n(), daily=sum/n)
    my_summary$daily
}

filter_with_monthly_limit <- function(df, monthly_limit) {
  month = substr(rownames(df), 1,7)
  df$month = month
  df %>% group_by(month) %>% mutate(total_trade_times=cumsum(trade_times)) %>% 
    filter(total_trade_times <= monthly_limit) %>% ungroup()
}

get_sample_profit <- function(name_list, HHt_val, GGt_val,
  stop_loss, sell_dev, 
  buy_dev, courtage, isNYSE, use_close, to_sek=to_sek,
  monthly_limit=monthly_limit) {
    df <- data_prep_multiple(name_list, HHt_val=HHt_val, GGt_val=GGt_val, isNYSE=isNYSE, use_close=use_close, to_sek=to_sek)
    df <- process_multiple(df, stop_loss, sell_dev, buy_dev, courtage)
    name_list_str <- paste0(name_list, sep='', collapse='-')
    
    df <- df %>% mutate(id=row_number())
    write.csv(df, str_glue('csvs/{name_list_str}.csv'))
    if (monthly_limit > 0) {
      df <- filter_with_monthly_limit(df, monthly_limit)    
    }
    
    my_summary <- df %>% mutate(range=cut(id, seq(0, max(id)+252, 252))) %>% 
      group_by(range) %>% summarise(sum=sum(trade_profit))
    mean(my_summary$sum) - 0.5 * sd(my_summary$sum)
}




get_log_file_name <- function() {
  str_glue("opt_results_courtage_{courtage}_nyse_{isNYSE}_use_close_{use_close}_limit_{monthly_limit}")
}

highest <- -999

my_optim <- function(par, k, name_list, courtage, isNYSE, min_sample_length, 
max_sample_length, use_close, to_sek, monthly_limit) {
  log_file_name <- get_log_file_name()
  opt_results_file <- str_glue("{log_file_name}.rds")


  create_not_exist <- function(file_name) {
    if(!file.exists(opt_results_file)) {
      opt_list <- list()
      saveRDS(opt_list, file=opt_results_file)
    }
  }

  put_opt_result <- function(par_str, value) {
    create_not_exist()
    opt_list <- readRDS(file = opt_results_file)
    opt_list[par_str] <- value
    saveRDS(opt_list, file=opt_results_file)
  }

  get_opt_result <- function(par_str) {
    create_not_exist()
    opt_list <- readRDS(file = opt_results_file)
    return(opt_list[[par_str]])
  }

  par_str <- paste0(par, sep='', collapse='-')
  value <- get_opt_result(par_str)
  if (!is.null(value)) {
    return(value)
  }
  write_log(str_glue('Starting calculating weights: par:{par[1]}, {par[2]}, {par[3]}, {par[4]}, {par[5]}'))
  weight_list <- lapply(name_list, get_prob_weight, HHt_val=par[1], GGt_val=par[2],
    stop_loss=par[3], 
    sell_dev=par[4], 
    buy_dev=-par[5], 
    courtage=courtage,
    isNYSE=isNYSE,
    use_close=use_close,
    to_sek=to_sek)
  df_weight <- data.frame(name=unlist(name_list), weight=as.numeric(weight_list)) %>%
    filter(weight > 0) %>% arrange(desc(weight))
  print(df_weight)
  n_positive <- nrow(df_weight)
  if (n_positive < min_sample_length) {
    write_log(str_glue('warning: par: {par_str}: has {n_positive} positive weights, min: {min_sample_length}'))
    put_opt_result(par_str, 0)
    return(0)
  }
  
  n_sample_len <- min(n_positive, max_sample_length)
  perm_samples <- make_samples(df_weight$name, n_sample_len, k, df_weight$weight)
  profits <- c()
  write_log('Calculating weights completed')
  for (sample in perm_samples) {
    sample_str <- paste0(sample, sep='', collapse='-')
    profit <- get_sample_profit(sample, par[1], par[2], par[3], par[4],
      par[5], courtage=courtage, isNYSE=isNYSE, use_close=use_close, to_sek=to_sek,
      monthly_limit=monthly_limit)
    if (profit > highest) {
      highest <<- profit
      write_log(str_glue('Find new high: {profit} sample: {sample_str} par:{par_str}'))
    } else {
      # delete csv file
      file.remove(str_glue('csvs/{sample_str}.csv'))
    }
    profits <- append(profits, profit)
  }
  value <- mean(profits, na.rm=TRUE)
  put_opt_result(par_str, value)
  write_log(str_glue('par: {par_str}: finished, value={value}'))
  return(value)
}
args = commandArgs(trailingOnly=TRUE)
print(length(args))
print(args)
if (length(args) != 8) {
  print("Usage: Rscript search_model.r isNYSE courtage n_samples min_sample_length max_sample_length use_close to_sek monthly_limit")
  quit()
}

isNYSE <- as.logical(as.numeric(args[1]))
courtage <- as.numeric(args[2])
k <- as.numeric(args[3])
min_sample_length <- as.numeric(args[4])
max_sample_length <- as.numeric(args[5])
use_close = as.logical(as.numeric(args[6]))
to_sek = as.logical(as.numeric(args[7]))
monthly_limit = as.numeric((args[8]))

print(isNYSE)
print(courtage)
print(str_glue('use_close={use_close}'))

write_log <- function(text) {
  log_file_name <- get_log_file_name()
  log_file <- str_glue("{log_file_name}.txt")
  text <- paste(Sys.time(), text)
  write(text,file=log_file,append=TRUE)
}

data_dir <- if (isNYSE) 'data' else 'omx'
file_list <- list.files(str_glue('./{data_dir}'))
name_list <- str_replace_all(file_list, '\\.rds','')
fit <- optim(par=c(0.08, 0.08, 0.70, 0.05, -0.01), function(par)
   -my_optim(par, k, name_list=name_list, courtage=courtage, 
    isNYSE=isNYSE, min_sample_length=min_sample_length, max_sample_length=max_sample_length, 
    use_close=use_close, to_sek=to_sek, monthly_limit=monthly_limit),
   control=list(maxit=800, parscale=c(1, 1, 10, 1, 1)))
fit