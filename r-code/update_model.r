# go through models:
library(rjson)
source('util.r')
dir <- '../models/model1'

result <- fromJSON(file = str_glue("{dir}/desc.json"))
securities <- result$securities
securitie_states <- list()
for (name in securities) {
  res <- data_prep(name, HHt=result$pars$HHt, GGt=result$pars$GGt, 
    predict=TRUE)

  last_data_date <- res[1]
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

outfile <- str_glue("{dir}/state.json")
out = file(outfile, 'w')
write(toJSON(output), out)
