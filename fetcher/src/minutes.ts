import { handleBatch, splitArrays } from "./util"
import { extractData, fetchMinuteData, saveMinuteData } from "./yahoo"
import fs from 'fs'




//const stocks = ['AAPL', 'MSFT', 'PFE', 'AMBK', 'TSLA', 'AMZN', 'T', 'MRK', 'DDAIF', 'AIR.F', 'GOOGL', 'INTC', 'NVDA', 'DIS', 'RHHBY', 'NSRGY', 'TSM']


function handleStockMinuteBatch(stockChunkIt: Iterator<any[]>): Promise<any>{  
  // const {value, done} = stockChunkIt.next()
  // if (done) {return Promise.resolve()}
  // console.log('Downloading Minute data for ', value)
  // return Promise.all(value.map(fetchMinuteData)).then(results => {
  //   return results.map(extractData)
  // }).then((results:any) => {
  //   console.log('Saving Minute Data')
  //   return saveAllMinuteData(results)
  // }).then(() => handleStockMinuteBatch(stockChunkIt))
  return handleBatch(stockChunkIt, fetchMinuteData, extractData, saveMinuteData)
}


async function handleStocksMinute(stocks: any[], maxConcurrentRequest:number) {
  const stockChunkIt = splitArrays(stocks, maxConcurrentRequest)
  return handleStockMinuteBatch(stockChunkIt)
}


(async () => {
  const text = await fs.readFileSync("./sp500_stocks.csv")
  const stocks = text.toString().split("\n").filter(x=>!!x)
  const indicators = ['CL=F','ZB=F', 'GC=F', '^DJI', '^OMX','SEK=X', 'EURSEK=X', 'EUR=X', 'SI=F', 'HG=F', 'LE=F', 'SB=F', 'ZS=F']
  //console.log(stocks)
  return await handleStocksMinute(stocks, 2).then(() => {
    handleStocksMinute(indicators, 2)
  })
})()