
import fs from 'fs'
import path from 'path'
import { fetchSwedenTick, saveSweedenTick, TickSweden } from './sweden'
import { fetch } from './util'


/* financial

https://query2.finance.yahoo.com/ws/fundamentals-timeseries/v1/finance/timeseries/AZN.ST?lang=en-US&region=US&symbol=AZN.ST&padTimeSeries=true&type=annualTaxEffectOfUnusualItems%2CtrailingTaxEffectOfUnusualItems%2CannualTaxRateForCalcs%2CtrailingTaxRateForCalcs%2CannualNormalizedEBITDA%2CtrailingNormalizedEBITDA%2CannualNormalizedDilutedEPS%2CtrailingNormalizedDilutedEPS%2CannualNormalizedBasicEPS%2CtrailingNormalizedBasicEPS%2CannualTotalUnusualItems%2CtrailingTotalUnusualItems%2CannualTotalUnusualItemsExcludingGoodwill%2CtrailingTotalUnusualItemsExcludingGoodwill%2CannualNetIncomeFromContinuingOperationNetMinorityInterest%2CtrailingNetIncomeFromContinuingOperationNetMinorityInterest%2CannualReconciledDepreciation%2CtrailingReconciledDepreciation%2CannualReconciledCostOfRevenue%2CtrailingReconciledCostOfRevenue%2CannualEBITDA%2CtrailingEBITDA%2CannualEBIT%2CtrailingEBIT%2CannualNetInterestIncome%2CtrailingNetInterestIncome%2CannualInterestExpense%2CtrailingInterestExpense%2CannualInterestIncome%2CtrailingInterestIncome%2CannualContinuingAndDiscontinuedDilutedEPS%2CtrailingContinuingAndDiscontinuedDilutedEPS%2CannualContinuingAndDiscontinuedBasicEPS%2CtrailingContinuingAndDiscontinuedBasicEPS%2CannualNormalizedIncome%2CtrailingNormalizedIncome%2CannualNetIncomeFromContinuingAndDiscontinuedOperation%2CtrailingNetIncomeFromContinuingAndDiscontinuedOperation%2CannualTotalExpenses%2CtrailingTotalExpenses%2CannualRentExpenseSupplemental%2CtrailingRentExpenseSupplemental%2CannualReportedNormalizedDilutedEPS%2CtrailingReportedNormalizedDilutedEPS%2CannualReportedNormalizedBasicEPS%2CtrailingReportedNormalizedBasicEPS%2CannualTotalOperatingIncomeAsReported%2CtrailingTotalOperatingIncomeAsReported%2CannualDividendPerShare%2CtrailingDividendPerShare%2CannualDilutedAverageShares%2CtrailingDilutedAverageShares%2CannualBasicAverageShares%2CtrailingBasicAverageShares%2CannualDilutedEPS%2CtrailingDilutedEPS%2CannualDilutedEPSOtherGainsLosses%2CtrailingDilutedEPSOtherGainsLosses%2CannualTaxLossCarryforwardDilutedEPS%2CtrailingTaxLossCarryforwardDilutedEPS%2CannualDilutedAccountingChange%2CtrailingDilutedAccountingChange%2CannualDilutedExtraordinary%2CtrailingDilutedExtraordinary%2CannualDilutedDiscontinuousOperations%2CtrailingDilutedDiscontinuousOperations%2CannualDilutedContinuousOperations%2CtrailingDilutedContinuousOperations%2CannualBasicEPS%2CtrailingBasicEPS%2CannualBasicEPSOtherGainsLosses%2CtrailingBasicEPSOtherGainsLosses%2CannualTaxLossCarryforwardBasicEPS%2CtrailingTaxLossCarryforwardBasicEPS%2CannualBasicAccountingChange%2CtrailingBasicAccountingChange%2CannualBasicExtraordinary%2CtrailingBasicExtraordinary%2CannualBasicDiscontinuousOperations%2CtrailingBasicDiscontinuousOperations%2CannualBasicContinuousOperations%2CtrailingBasicContinuousOperations%2CannualDilutedNIAvailtoComStockholders%2CtrailingDilutedNIAvailtoComStockholders%2CannualAverageDilutionEarnings%2CtrailingAverageDilutionEarnings%2CannualNetIncomeCommonStockholders%2CtrailingNetIncomeCommonStockholders%2CannualOtherunderPreferredStockDividend%2CtrailingOtherunderPreferredStockDividend%2CannualPreferredStockDividends%2CtrailingPreferredStockDividends%2CannualNetIncome%2CtrailingNetIncome%2CannualMinorityInterests%2CtrailingMinorityInterests%2CannualNetIncomeIncludingNoncontrollingInterests%2CtrailingNetIncomeIncludingNoncontrollingInterests%2CannualNetIncomeFromTaxLossCarryforward%2CtrailingNetIncomeFromTaxLossCarryforward%2CannualNetIncomeExtraordinary%2CtrailingNetIncomeExtraordinary%2CannualNetIncomeDiscontinuousOperations%2CtrailingNetIncomeDiscontinuousOperations%2CannualNetIncomeContinuousOperations%2CtrailingNetIncomeContinuousOperations%2CannualEarningsFromEquityInterestNetOfTax%2CtrailingEarningsFromEquityInterestNetOfTax%2CannualTaxProvision%2CtrailingTaxProvision%2CannualPretaxIncome%2CtrailingPretaxIncome%2CannualOtherIncomeExpense%2CtrailingOtherIncomeExpense%2CannualOtherNonOperatingIncomeExpenses%2CtrailingOtherNonOperatingIncomeExpenses%2CannualSpecialIncomeCharges%2CtrailingSpecialIncomeCharges%2CannualGainOnSaleOfPPE%2CtrailingGainOnSaleOfPPE%2CannualGainOnSaleOfBusiness%2CtrailingGainOnSaleOfBusiness%2CannualOtherSpecialCharges%2CtrailingOtherSpecialCharges%2CannualWriteOff%2CtrailingWriteOff%2CannualImpairmentOfCapitalAssets%2CtrailingImpairmentOfCapitalAssets%2CannualRestructuringAndMergernAcquisition%2CtrailingRestructuringAndMergernAcquisition%2CannualSecuritiesAmortization%2CtrailingSecuritiesAmortization%2CannualEarningsFromEquityInterest%2CtrailingEarningsFromEquityInterest%2CannualGainOnSaleOfSecurity%2CtrailingGainOnSaleOfSecurity%2CannualNetNonOperatingInterestIncomeExpense%2CtrailingNetNonOperatingInterestIncomeExpense%2CannualTotalOtherFinanceCost%2CtrailingTotalOtherFinanceCost%2CannualInterestExpenseNonOperating%2CtrailingInterestExpenseNonOperating%2CannualInterestIncomeNonOperating%2CtrailingInterestIncomeNonOperating%2CannualOperatingIncome%2CtrailingOperatingIncome%2CannualOperatingExpense%2CtrailingOperatingExpense%2CannualOtherOperatingExpenses%2CtrailingOtherOperatingExpenses%2CannualOtherTaxes%2CtrailingOtherTaxes%2CannualProvisionForDoubtfulAccounts%2CtrailingProvisionForDoubtfulAccounts%2CannualDepreciationAmortizationDepletionIncomeStatement%2CtrailingDepreciationAmortizationDepletionIncomeStatement%2CannualDepletionIncomeStatement%2CtrailingDepletionIncomeStatement%2CannualDepreciationAndAmortizationInIncomeStatement%2CtrailingDepreciationAndAmortizationInIncomeStatement%2CannualAmortization%2CtrailingAmortization%2CannualAmortizationOfIntangiblesIncomeStatement%2CtrailingAmortizationOfIntangiblesIncomeStatement%2CannualDepreciationIncomeStatement%2CtrailingDepreciationIncomeStatement%2CannualResearchAndDevelopment%2CtrailingResearchAndDevelopment%2CannualSellingGeneralAndAdministration%2CtrailingSellingGeneralAndAdministration%2CannualSellingAndMarketingExpense%2CtrailingSellingAndMarketingExpense%2CannualGeneralAndAdministrativeExpense%2CtrailingGeneralAndAdministrativeExpense%2CannualOtherGandA%2CtrailingOtherGandA%2CannualInsuranceAndClaims%2CtrailingInsuranceAndClaims%2CannualRentAndLandingFees%2CtrailingRentAndLandingFees%2CannualSalariesAndWages%2CtrailingSalariesAndWages%2CannualGrossProfit%2CtrailingGrossProfit%2CannualCostOfRevenue%2CtrailingCostOfRevenue%2CannualTotalRevenue%2CtrailingTotalRevenue%2CannualExciseTaxes%2CtrailingExciseTaxes%2CannualOperatingRevenue%2CtrailingOperatingRevenue&merge=false&period1=493590046&period2=1641773540&corsDomain=finance.yahoo.com

price
https://query1.finance.yahoo.com/v8/finance/chart/AZN.ST?region=US&lang=en-US&includePrePost=false&interval=2m&useYfid=true&range=1d&corsDomain=finance.yahoo.com&.tsrc=finance
https://query1.finance.yahoo.com/v8/finance/chart/AAPL?region=US&lang=en-US&includePrePost=false&interval=1d&useYfid=true&range=5y&corsDomain=finance.yahoo.com&.tsrc=finance


SEK-USD
https://query1.finance.yahoo.com/v8/finance/chart/SEK=X?region=US&lang=en-US&includePrePost=false&interval=1d&useYfid=true&range=5y&corsDomain=finance.yahoo.com&.tsrc=finance

upgrades:

https://finance.yahoo.com/quote/AAPL?p=AAPL
get 'root.App.main' =  {}
context.dispatcher.stores.PageStore.upgradeDowngradeHistory.history
*/

//const stocks = ['AZN.ST', 'ESSITY-B.ST', 'AAPL', 'ERIC-B.ST', 'MSFT', 'PFE', 'AMBK', 'HEXA-B.ST', 'TSLA', 'AMZN', 'T', 'MRK', 'DDAIF', 'AIR.F', 'GOOGL', 'INTC', 'NVDA', 'DIS', 'RHHBY', 'NSRGY', 'TSM']
//const stocks = ['CL=F','ZB=F']
const stocks:string[] = []

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

const ticks: TickSweden[] = [
  {
    name: 'm1',
    query: [{code:'Penningm', selection: {filter:'item', values:['5LLM1.1E.NEP.V.A']}}],
    path: '/FM/FM5001/FM5001A/FM5001SDDSPM'
  },
  {
    name: 'm3',
    query: [{code:'Penningm', selection: {filter:'item', values:['5LLM3a.1E.NEP.V.A']}}],
    path: '/FM/FM5001/FM5001A/FM5001SDDSPM'
  },
  {
    name: 'cpi',
    query: [],
    path: '/OV0104/v1/doris/en/ssd/PR/PR0101/PR0101A/KPItotM'
  }
]

const fetchData = (name: string) => {
  const path = `/v8/finance/chart/${name}?region=US&lang=en-US&includePrePost=false&interval=1d&useYfid=true&range=10y&corsDomain=finance.yahoo.com&.tsrc=finance`
  return fetch(path, 'query1.finance.yahoo.com')
}

function extractData(input:any) {
  console.log('extract')

  const result = JSON.parse(input as string)
  const timestamps = result.chart.result[0].timestamp
  const opens = result.chart.result[0].indicators.quote[0].open
  const highs = result.chart.result[0].indicators.quote[0].high
  const closes = result.chart.result[0].indicators.quote[0].close
  const lows = result.chart.result[0].indicators.quote[0].low
  const volumes = result.chart.result[0].indicators.quote[0].volume
  const meta = result.chart.result[0].meta

  if (!timestamps) {
    return undefined
  }

  console.log(timestamps.length, opens.length, highs.length, volumes.length)
  const data = timestamps.map((timestamp: string,idx: number) => {
    const open = opens[idx]
    const high = highs[idx]
    const close = closes[idx]
    const low = lows[idx]
    const volumn = volumes[idx]
    return {timestamp, open, high, low, close, volumn}
  })
  //console.log(data)
  return {meta, data}
}

function mkdir(dir:string) {
  if (!fs.existsSync(dir)){
    fs.mkdirSync(dir)
  }
}

function deleteAllFiles(dir:string) {
  return new Promise(resolve => {
    fs.readdir(dir, (err, files) => {
      if (err) throw err;
    
      for (const file of files) {
        fs.unlink(path.join(dir, file), err => {
          if (err) throw err;
        })
      }
    })
  })
}

async function saveUpDownGrade(result: any, name: string) {
  let dir = `../data/${name}`
  mkdir(dir)
  console.log(`Saving Updown grade data: ${name}`)
  fs.writeFileSync(`${dir}/updown`, JSON.stringify(result))
}

async function saveData(result:any) {
  const stockName = result.meta.symbol
  
  var dir = `../data/${stockName}`

  mkdir(dir)

  console.log(`Saving Security: ${stockName}`)
  fs.writeFileSync(`${dir}/data`, JSON.stringify(result.data))
  fs.writeFileSync(`${dir}/meta`, JSON.stringify(result.meta))
}

function saveExchange(result:any) {
  const id = result.meta.symbol
  const name = exchanges.find(e => e.id === id)!.name
  
  var dir = `../exchange/${name}`
  console.log(`Saving Exchange: ${name}`)
  mkdir(dir)

  fs.writeFileSync(`${dir}/data`, JSON.stringify(result.data))
  fs.writeFileSync(`${dir}/meta`, JSON.stringify(result.meta))
}

async function saveM1M3(result:any) {
  let dir = '../sweden/money'
  console.log('Saving Sweden money supply')
  mkdir(dir)
  fs.writeFileSync(`${dir}/m1`, JSON.stringify(result.m1))
  fs.writeFileSync(`${dir}/m3`, JSON.stringify(result.m3))
}

function fetchUpDownGrade(name: string) {
  const path = `/quote/${name}?p=${name}`
  const hostname = 'finance.yahoo.com'
  return fetch(path, hostname)
}

function extractUpDownGrade(result: string) {
  const index = result.indexOf('root.App.main')
  const endIndex = result.indexOf('\n', index+1)

  if (index === -1) return undefined
  const line = result.substring(index, endIndex)
  const re = /^root.App.main = (.*);$/

  const obj = JSON.parse(line.match(re)![1])

  return obj.context.dispatcher.stores.QuoteSummaryStore.upgradeDowngradeHistory?.history
}

// fetchUpDownGrade('AAPL').then(extractUpDownGrade).then(async result => {
//   console.log(result)
//   result && await saveUpDownGrade(result, 'AAPL')
//   console.log('Done.')
// })

(async () => {
  await Promise.all(stocks.map(fetchData)).then(results => {
    return results.map(extractData)
  }).then(results => {
    results.forEach(result => {
      if (result) {
        saveData(result)
      }
    })
    return
  }).then(async () => await Promise.all(
    stocks.map(fetchUpDownGrade)
  )).then((results: string[]) => {
    return results.map((result:string) => extractUpDownGrade(result))
  }).then(results => {
    results.forEach((result,idx) => {
      if (result) {
        saveUpDownGrade(result, stocks[idx])
      }
    })
    return
  }).then(async () => await Promise.all(
    exchanges.map(exchange => {
      const {id} = exchange
      return fetchData(id)
    })
  )).then(results => {
    return results.map(extractData)
  }).then(async results => {
    results.forEach(result => {
      saveExchange(result)
    })
  }).then(async () => await Promise.all(
    ticks.map(fetchSwedenTick)
  )).then(results => {
    results.forEach(result => {
      saveSweedenTick(result)
    })
  }).catch(err => console.log)
})()
