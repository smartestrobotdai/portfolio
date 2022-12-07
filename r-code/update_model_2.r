# go through models:
library(rjson)
source('util.r')
dir <- '../models/model1'



result <- fromJSON(file = str_glue("{dir}/desc.json"))
securities <- result$securities
securitie_states <- list()
latest_last_data_date = '1900-01-01'

for (security in securities) {
  id <- security[['id']]
  HHt <- security[['HHt']]
  GGt <- security[['GGt']]
  sell <- security[['sell']]
  buy <- security[['buy']]
  stop <- security[['stop']]
  use_close <- as.numeric(security[['use-close']])
  to_sek <- as.numeric(security[['to-sek']])
  isNYSE <- as.numeric(security[['market']] == 'NYSE')
  res <- data_prep(id, HHt=HHt, GGt=GGt, isNYSE=isNYSE,
    predict=TRUE, use_close=use_close, to_sek=to_sek)

  last_data_date <- res[1]
  if (last_data_date > latest_last_data_date) {
    latest_last_data_date = last_data_date
  }

  predict <- as.numeric(res[2])
  buy_point <- predict + buy
  sell_point <- predict + sell
  predict <- exp(1)**predict
  buy_point <- exp(1)**buy_point
  sell_point <- exp(1)**sell_point
  stop_loss <- stop
  securitie_states <- append(securitie_states, list(list(id=id,
    last_data_date=last_data_date, 
    predict=predict, buy_point=buy_point, sell_point=sell_point, stop_loss=stop_loss)))
}

cur_time <- Sys.time()
output <- list(last_update_time=as.character(cur_time), 
  security_states=securitie_states)

outfile <- str_glue("{dir}/state-{latest_last_data_date}.json")
out = file(outfile, 'w')
print(output)
write(toJSON(output), out)
