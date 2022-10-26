# go through models:
library(rjson)
source('util.r')
dir <- '../models/model1'

result <- fromJSON(file = str_glue("{dir}/desc.json"))
HHt <- result$pars$HHt
GGt <- result$pars$GGt
use_close <- as.numeric(result[['use-close']])
to_sek <- as.numeric(result[['to-sek']])
isNYSE <- result$market == 'NYSE'
print(use_close)
print(to_sek)
print(isNYSE)
securities <- result$securities
securitie_states <- list()

latest_last_data_date = '1900-01-01'
for (name in securities) {
  res <- data_prep(name, HHt=HHt, GGt=GGt, isNYSE=isNYSE,
    predict=TRUE, use_close=use_close, to_sek=to_sek)

  last_data_date <- res[1]
  if (last_data_date > latest_last_data_date) {
    latest_last_data_date = last_data_date
  }

  predict <- as.numeric(res[2])
  buy_point <- predict + result$pars$buy
  sell_point <- predict + result$pars$sell
  predict <- exp(1)**predict
  buy_point <- exp(1)**buy_point
  sell_point <- exp(1)**sell_point

  securitie_states <- append(securitie_states, list(list(name=name, 
    last_data_date=last_data_date, 
    predict=predict, buy_point=buy_point, sell_point=sell_point)))
}

cur_time <- Sys.time()
output <- list(last_update_time=as.character(cur_time), 
  security_states=securitie_states)

outfile <- str_glue("{dir}/state-{latest_last_data_date}.json")
out = file(outfile, 'w')
write(toJSON(output), out)
