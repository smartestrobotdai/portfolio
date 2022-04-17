import { fetch, mkdir, post } from './util'
import { extractData, fetchData, fetchMinuteData, saveAllData, saveAllMinuteData} from './yahoo'
import fs  from 'fs'

/* financial

https://query2.finance.yahoo.com/ws/fundamentals-timeseries/v1/finance/timeseries/AZN.ST?lang=en-US&region=US&symbol=AZN.ST&padTimeSeries=true&type=annualTaxEffectOfUnusualItems%2CtrailingTaxEffectOfUnusualItems%2CannualTaxRateForCalcs%2CtrailingTaxRateForCalcs%2CannualNormalizedEBITDA%2CtrailingNormalizedEBITDA%2CannualNormalizedDilutedEPS%2CtrailingNormalizedDilutedEPS%2CannualNormalizedBasicEPS%2CtrailingNormalizedBasicEPS%2CannualTotalUnusualItems%2CtrailingTotalUnusualItems%2CannualTotalUnusualItemsExcludingGoodwill%2CtrailingTotalUnusualItemsExcludingGoodwill%2CannualNetIncomeFromContinuingOperationNetMinorityInterest%2CtrailingNetIncomeFromContinuingOperationNetMinorityInterest%2CannualReconciledDepreciation%2CtrailingReconciledDepreciation%2CannualReconciledCostOfRevenue%2CtrailingReconciledCostOfRevenue%2CannualEBITDA%2CtrailingEBITDA%2CannualEBIT%2CtrailingEBIT%2CannualNetInterestIncome%2CtrailingNetInterestIncome%2CannualInterestExpense%2CtrailingInterestExpense%2CannualInterestIncome%2CtrailingInterestIncome%2CannualContinuingAndDiscontinuedDilutedEPS%2CtrailingContinuingAndDiscontinuedDilutedEPS%2CannualContinuingAndDiscontinuedBasicEPS%2CtrailingContinuingAndDiscontinuedBasicEPS%2CannualNormalizedIncome%2CtrailingNormalizedIncome%2CannualNetIncomeFromContinuingAndDiscontinuedOperation%2CtrailingNetIncomeFromContinuingAndDiscontinuedOperation%2CannualTotalExpenses%2CtrailingTotalExpenses%2CannualRentExpenseSupplemental%2CtrailingRentExpenseSupplemental%2CannualReportedNormalizedDilutedEPS%2CtrailingReportedNormalizedDilutedEPS%2CannualReportedNormalizedBasicEPS%2CtrailingReportedNormalizedBasicEPS%2CannualTotalOperatingIncomeAsReported%2CtrailingTotalOperatingIncomeAsReported%2CannualDividendPerShare%2CtrailingDividendPerShare%2CannualDilutedAverageShares%2CtrailingDilutedAverageShares%2CannualBasicAverageShares%2CtrailingBasicAverageShares%2CannualDilutedEPS%2CtrailingDilutedEPS%2CannualDilutedEPSOtherGainsLosses%2CtrailingDilutedEPSOtherGainsLosses%2CannualTaxLossCarryforwardDilutedEPS%2CtrailingTaxLossCarryforwardDilutedEPS%2CannualDilutedAccountingChange%2CtrailingDilutedAccountingChange%2CannualDilutedExtraordinary%2CtrailingDilutedExtraordinary%2CannualDilutedDiscontinuousOperations%2CtrailingDilutedDiscontinuousOperations%2CannualDilutedContinuousOperations%2CtrailingDilutedContinuousOperations%2CannualBasicEPS%2CtrailingBasicEPS%2CannualBasicEPSOtherGainsLosses%2CtrailingBasicEPSOtherGainsLosses%2CannualTaxLossCarryforwardBasicEPS%2CtrailingTaxLossCarryforwardBasicEPS%2CannualBasicAccountingChange%2CtrailingBasicAccountingChange%2CannualBasicExtraordinary%2CtrailingBasicExtraordinary%2CannualBasicDiscontinuousOperations%2CtrailingBasicDiscontinuousOperations%2CannualBasicContinuousOperations%2CtrailingBasicContinuousOperations%2CannualDilutedNIAvailtoComStockholders%2CtrailingDilutedNIAvailtoComStockholders%2CannualAverageDilutionEarnings%2CtrailingAverageDilutionEarnings%2CannualNetIncomeCommonStockholders%2CtrailingNetIncomeCommonStockholders%2CannualOtherunderPreferredStockDividend%2CtrailingOtherunderPreferredStockDividend%2CannualPreferredStockDividends%2CtrailingPreferredStockDividends%2CannualNetIncome%2CtrailingNetIncome%2CannualMinorityInterests%2CtrailingMinorityInterests%2CannualNetIncomeIncludingNoncontrollingInterests%2CtrailingNetIncomeIncludingNoncontrollingInterests%2CannualNetIncomeFromTaxLossCarryforward%2CtrailingNetIncomeFromTaxLossCarryforward%2CannualNetIncomeExtraordinary%2CtrailingNetIncomeExtraordinary%2CannualNetIncomeDiscontinuousOperations%2CtrailingNetIncomeDiscontinuousOperations%2CannualNetIncomeContinuousOperations%2CtrailingNetIncomeContinuousOperations%2CannualEarningsFromEquityInterestNetOfTax%2CtrailingEarningsFromEquityInterestNetOfTax%2CannualTaxProvision%2CtrailingTaxProvision%2CannualPretaxIncome%2CtrailingPretaxIncome%2CannualOtherIncomeExpense%2CtrailingOtherIncomeExpense%2CannualOtherNonOperatingIncomeExpenses%2CtrailingOtherNonOperatingIncomeExpenses%2CannualSpecialIncomeCharges%2CtrailingSpecialIncomeCharges%2CannualGainOnSaleOfPPE%2CtrailingGainOnSaleOfPPE%2CannualGainOnSaleOfBusiness%2CtrailingGainOnSaleOfBusiness%2CannualOtherSpecialCharges%2CtrailingOtherSpecialCharges%2CannualWriteOff%2CtrailingWriteOff%2CannualImpairmentOfCapitalAssets%2CtrailingImpairmentOfCapitalAssets%2CannualRestructuringAndMergernAcquisition%2CtrailingRestructuringAndMergernAcquisition%2CannualSecuritiesAmortization%2CtrailingSecuritiesAmortization%2CannualEarningsFromEquityInterest%2CtrailingEarningsFromEquityInterest%2CannualGainOnSaleOfSecurity%2CtrailingGainOnSaleOfSecurity%2CannualNetNonOperatingInterestIncomeExpense%2CtrailingNetNonOperatingInterestIncomeExpense%2CannualTotalOtherFinanceCost%2CtrailingTotalOtherFinanceCost%2CannualInterestExpenseNonOperating%2CtrailingInterestExpenseNonOperating%2CannualInterestIncomeNonOperating%2CtrailingInterestIncomeNonOperating%2CannualOperatingIncome%2CtrailingOperatingIncome%2CannualOperatingExpense%2CtrailingOperatingExpense%2CannualOtherOperatingExpenses%2CtrailingOtherOperatingExpenses%2CannualOtherTaxes%2CtrailingOtherTaxes%2CannualProvisionForDoubtfulAccounts%2CtrailingProvisionForDoubtfulAccounts%2CannualDepreciationAmortizationDepletionIncomeStatement%2CtrailingDepreciationAmortizationDepletionIncomeStatement%2CannualDepletionIncomeStatement%2CtrailingDepletionIncomeStatement%2CannualDepreciationAndAmortizationInIncomeStatement%2CtrailingDepreciationAndAmortizationInIncomeStatement%2CannualAmortization%2CtrailingAmortization%2CannualAmortizationOfIntangiblesIncomeStatement%2CtrailingAmortizationOfIntangiblesIncomeStatement%2CannualDepreciationIncomeStatement%2CtrailingDepreciationIncomeStatement%2CannualResearchAndDevelopment%2CtrailingResearchAndDevelopment%2CannualSellingGeneralAndAdministration%2CtrailingSellingGeneralAndAdministration%2CannualSellingAndMarketingExpense%2CtrailingSellingAndMarketingExpense%2CannualGeneralAndAdministrativeExpense%2CtrailingGeneralAndAdministrativeExpense%2CannualOtherGandA%2CtrailingOtherGandA%2CannualInsuranceAndClaims%2CtrailingInsuranceAndClaims%2CannualRentAndLandingFees%2CtrailingRentAndLandingFees%2CannualSalariesAndWages%2CtrailingSalariesAndWages%2CannualGrossProfit%2CtrailingGrossProfit%2CannualCostOfRevenue%2CtrailingCostOfRevenue%2CannualTotalRevenue%2CtrailingTotalRevenue%2CannualExciseTaxes%2CtrailingExciseTaxes%2CannualOperatingRevenue%2CtrailingOperatingRevenue&merge=false&period1=493590046&period2=1641773540&corsDomain=finance.yahoo.com

price
https://query1.finance.yahoo.com/v8/finance/chart/AZN.ST?region=US&lang=en-US&includePrePost=false&interval=2m&useYfid=true&range=1d&corsDomain=finance.yahoo.com&.tsrc=finance
https://query1.finance.yahoo.com/v8/finance/chart/AAPL?region=US&lang=en-US&includePrePost=false&interval=1d&useYfid=true&range=5y&corsDomain=finance.yahoo.com&.tsrc=finance

limit the time
period1=1603753200&period2=1626904800

SEK-USD
https://query1.finance.yahoo.com/v8/finance/chart/SEK=X?region=US&lang=en-US&includePrePost=false&interval=1d&useYfid=true&range=5y&corsDomain=finance.yahoo.com&.tsrc=finance

upgrades:

https://finance.yahoo.com/quote/AAPL?p=AAPL
get 'root.App.main' =  {}
context.dispatcher.stores.PageStore.upgradeDowngradeHistory.history
*/

const stocks = ['AZN.ST', 'ESSITY-B.ST', 'AAPL', 'ERIC-B.ST', 'MSFT', 'PFE', 'AMBK', 'HEXA-B.ST', 'TSLA', 'AMZN', 'T', 'MRK', 'DDAIF', 'AIR.F', 'GOOGL', 'INTC', 'NVDA', 'DIS', 'RHHBY', 'NSRGY', 'TSM']
const indicators = ['CL=F','ZB=F', 'GC=F', '^DJI', '^OMX','SEK=X', 'EURSEK=X', 'EUR=X']

interface FredTick {
  url: string
  name: string
}

const FRED_HOST = 'fred.stlouisfed.org'
const fredTicks: FredTick[] = [{
    url: '/graph/fredgraph.csv?bgcolor=%23e1e9f0&chart_type=line&drp=0&fo=open%20sans&graph_bgcolor=%23ffffff&height=450&mode=fred&recession_bars=on&txtcolor=%23444444&ts=12&tts=12&width=1168&nt=0&thu=0&trc=0&show_legend=yes&show_axis_titles=yes&show_tooltip=yes&id=M1SL&scale=left&cosd=2011-12-01&coed=2021-12-01&line_color=%234572a7&link_values=false&line_style=solid&mark_type=none&mw=3&lw=2&ost=-99999&oet=99999&mma=0&fml=a&fq=Monthly&fam=avg&fgst=lin&fgsnd=2020-02-01&line_index=1&transformation=lin&vintage_date=2022-01-31&revision_date=2022-01-31&nd=1959-01-01',
    name: 'M1SL'
  }, {
    url: '/graph/fredgraph.csv?bgcolor=%23e1e9f0&chart_type=line&drp=0&fo=open%20sans&graph_bgcolor=%23ffffff&height=450&mode=fred&recession_bars=on&txtcolor=%23444444&ts=12&tts=12&width=1168&nt=0&thu=0&trc=0&show_legend=yes&show_axis_titles=yes&show_tooltip=yes&id=UNRATE&scale=left&cosd=2011-12-01&coed=2021-12-01&line_color=%234572a7&link_values=false&line_style=solid&mark_type=none&mw=3&lw=2&ost=-99999&oet=99999&mma=0&fml=a&fq=Monthly&fam=avg&fgst=lin&fgsnd=2020-02-01&line_index=1&transformation=lin&vintage_date=2022-01-31&revision_date=2022-01-31&nd=1948-01-01',
    name: 'UNRATE'
  }, {
    url: '/graph/fredgraph.csv?bgcolor=%23e1e9f0&chart_type=line&drp=0&fo=open%20sans&graph_bgcolor=%23ffffff&height=450&mode=fred&recession_bars=on&txtcolor=%23444444&ts=12&tts=12&width=1168&nt=0&thu=0&trc=0&show_legend=yes&show_axis_titles=yes&show_tooltip=yes&id=GDP&scale=left&cosd=2011-10-01&coed=2021-10-01&line_color=%234572a7&link_values=false&line_style=solid&mark_type=none&mw=3&lw=2&ost=-99999&oet=99999&mma=0&fml=a&fq=Quarterly&fam=avg&fgst=lin&fgsnd=2020-02-01&line_index=1&transformation=lin&vintage_date=2022-01-31&revision_date=2022-01-31&nd=1947-01-01',
    name: 'GDP'
  }, {
    url: '/graph/fredgraph.csv?bgcolor=%23e1e9f0&chart_type=line&drp=0&fo=open%20sans&graph_bgcolor=%23ffffff&height=450&mode=fred&recession_bars=on&txtcolor=%23444444&ts=12&tts=12&width=1168&nt=0&thu=0&trc=0&show_legend=yes&show_axis_titles=yes&show_tooltip=yes&id=CPALTT01USM657N&scale=left&cosd=1960-01-01&coed=2021-12-01&line_color=%234572a7&link_values=false&line_style=solid&mark_type=none&mw=3&lw=2&ost=-99999&oet=99999&mma=0&fml=a&fq=Monthly&fam=avg&fgst=lin&fgsnd=2020-02-01&line_index=1&transformation=lin&vintage_date=2022-01-31&revision_date=2022-01-31&nd=1960-01-01',
    name: 'CPI'
  }, {
    url: '/graph/fredgraph.csv?bgcolor=%23e1e9f0&chart_type=line&drp=0&fo=open%20sans&graph_bgcolor=%23ffffff&height=450&mode=fred&recession_bars=on&txtcolor=%23444444&ts=12&tts=12&width=1168&nt=0&thu=0&trc=0&show_legend=yes&show_axis_titles=yes&show_tooltip=yes&id=WM2NS&scale=left&cosd=2012-01-03&coed=2022-01-03&line_color=%234572a7&link_values=false&line_style=solid&mark_type=none&mw=3&lw=2&ost=-99999&oet=99999&mma=0&fml=a&fq=Weekly%2C%20Ending%20Monday&fam=avg&fgst=lin&fgsnd=2020-02-01&line_index=1&transformation=lin&vintage_date=2022-01-31&revision_date=2022-01-31&nd=1980-11-03',
    name: 'M2'
  }
]

//const stocks:string[] = []

// const exchanges = [{
//   name: 'USD-SEK',
//   id: 'SEK=X'
// }, {
//   name: 'EUR-SEK',
//   id: 'EURSEK=X'
// }, {
//   name: 'USD-EUR',
//   id: 'EUR=X'
// }]

interface Exchange {
  name: string
  id: string
}
const exchanges: Exchange[] = []

interface SCBTick {
  name: string
  query: any[]
  path: string
}

const SCB_TICK_HOST = 'api.scb.se'
const scbTicks:SCBTick[] = [
  {
    name: 'm1',
    query: [{code:'Penningm', selection: {filter:'item', values:['5LLM1.1E.NEP.V.A']}}],
    path: '/OV0104/v1/doris/en/ssd/FM/FM5001/FM5001A/FM5001SDDSPM'
  },
  {
    name: 'm3',
    query: [{code:'Penningm', selection: {filter:'item', values:['5LLM3a.1E.NEP.V.A']}}],
    path: '/OV0104/v1/doris/en/ssd/FM/FM5001/FM5001A/FM5001SDDSPM'
  },
  {
    name: 'cpi',
    query: [],
    path: '/OV0104/v1/doris/en/ssd/PR/PR0101/PR0101A/KPItotM'
  }
]

async function handleStockBatch(stockChunkIt: Iterator<any[]>): Promise<any>{  
  const {value, done} = stockChunkIt.next()
  if (done) {return Promise.resolve()}
  console.log('Downloading data for ', value)
  return Promise.all(value.map(fetchData)).then(results => {
    return results.map(extractData)
  }).then((results:any) => {
    console.log('Saving Data')
    return saveAllData(results)
  }).then(() => handleStockBatch(stockChunkIt))
}

function handleStockMinuteBatch(stockChunkIt: Iterator<any[]>): Promise<any>{  
  const {value, done} = stockChunkIt.next()
  if (done) {return Promise.resolve()}
  console.log('Downloading Minute data for ', value)
  return Promise.all(value.map(fetchMinuteData)).then(results => {
    return results.map(extractData)
  }).then((results:any) => {
    console.log('Saving Minute Data')
    return saveAllMinuteData(results)
  }).then(() => handleStockMinuteBatch(stockChunkIt))
}

function *splitArrays(arr:any[], maxNumber:number) {
  for (let pos = 0; pos < arr.length; pos += maxNumber) {
    yield arr.slice(pos, pos + maxNumber)
  }
}

async function handleStocks(stocks: any[], maxConcurrentRequest:number) {
  const stockChunkIt = splitArrays(stocks, maxConcurrentRequest)
  return handleStockBatch(stockChunkIt)
}

async function handleStocksMinute(stocks: any[], maxConcurrentRequest:number) {
  const stockChunkIt = splitArrays(stocks, maxConcurrentRequest)
  return handleStockMinuteBatch(stockChunkIt)
}

function fetchFredData(fred: FredTick) {
  const url = fred.url
  return fetch(url, FRED_HOST)
}

function handleFredBatch(tickChunkIt: Iterator<any[]>): Promise<any> {
  const {value, done} = tickChunkIt.next()
  if (done) {return Promise.resolve()}
  console.log('Download Fred data for ', value.map((v: FredTick) => v.name))
  return Promise.all(value.map(fetchFredData)).then(results => {
    results.forEach((result,idx) => {
      if (result) {
        const {name} = value[idx]
        console.log(`Saving Data from FRED: ${name}`)
        fs.writeFileSync(`../data/fred/${name}`, result)
      }
    })
    return tickChunkIt
  }).then(handleFredBatch)
}

function handleFredData(fredTicks: any[], maxConcurrentRequest: number) {
  const tickChunkIt = splitArrays(fredTicks, maxConcurrentRequest)
  return handleFredBatch(tickChunkIt)
}

function fetchSCBData(scbTick: SCBTick) {
  const {path, query} = scbTick
  const response = {format: 'json'}
  return post(path, SCB_TICK_HOST, {query, response})
}

function handleSCBBatch(scbTicksIt: Iterator<any[]>): Promise<any> {
  const {value, done} = scbTicksIt.next()
  if (done) {return Promise.resolve()}
  console.log('Download SCB data for ', value.map((v: SCBTick) => v.name))
  return Promise.all(value.map(fetchSCBData)).then(results => {
    results.forEach((result,idx) => {
      if (result) {
        const {name} = value[idx]
        console.log(`Saving Data from SCB: ${name}`)
        mkdir('../data/scb/')
        fs.writeFileSync(`../data/scb/${name}`, result)
      }
    })
    return scbTicksIt
  }).then(handleSCBBatch)
}

function handleSCBData(scbTicks: SCBTick[], maxConcurrentRequest: number) {
  const tickChunkIt = splitArrays(scbTicks, maxConcurrentRequest)
  return handleSCBBatch(tickChunkIt)
}

(async () => {
  return await handleStocks(stocks.concat(indicators), 3)
  .then(() => handleStocksMinute(stocks.concat(indicators), 2))
    .then(() => handleFredData(fredTicks, 3))
    .then(() => handleSCBData(scbTicks, 3))
})()

// (async () => {
//   handleStocks(stocks).then(async () => await Promise.all(
//     stocks.map(fetchUpDownGrade)
//   )).then((results: string[]) => {
//     return results.map((result:string) => extractUpDownGrade(result))
//   }).then(results => {
//     results.forEach((result,idx) => {
//       if (result) {
//         saveUpDownGrade(result, stocks[idx])
//       }
//     })
//     return
//   }).then(async () => await Promise.all(
//     exchanges.map(exchange => {
//       const {id} = exchange
//       return fetchData(id)
//     })
//   )).then(results => {
//     return results.map(extractData)
//   }).then(async results => {
//     results.forEach((result, idx) => {
//       saveExchange(exchanges[idx].name, result)
//     })
//   }).then(async () => await Promise.all(
//     swedenTicks.map(fetchSwedenTick)
//   )).then(results => {
//     results.forEach((result:any) => {
//       saveSweedenTick(result)
//     })
//   }).catch(err => console.log)
// })()
