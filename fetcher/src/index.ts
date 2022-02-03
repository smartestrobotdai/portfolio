
import { arrayBuffer } from 'stream/consumers'
import { fetchSwedenTick, saveSweedenTick, TickSweden } from './sweden'
import { fetch } from './util'
import { extractData, extractUpDownGrade, fetchData, fetchUpDownGrade, saveAllData, saveData, saveExchange, saveUpDownGrade } from './yahoo'


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

const stocks = ['AZN.ST', 'ESSITY-B.ST', 'AAPL', 'ERIC-B.ST', 'MSFT', 'PFE', 'AMBK', 'HEXA-B.ST', 'TSLA', 'AMZN', 'T', 'MRK', 'DDAIF', 'AIR.F', 'GOOGL', 'INTC', 'NVDA', 'DIS', 'RHHBY', 'NSRGY', 'TSM']
//const stocks = ['CL=F','ZB=F']
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

const swedenTicks:any[] = [
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
];


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

function *splitArrays(arr:any[], maxNumber:number) {
  for (let pos = 0; pos < arr.length; pos += maxNumber) {
    yield arr.slice(pos, pos + maxNumber)
  }
}

async function handleStocks(stocks: any[], maxConcurrentRequest:number) {
  const stockChunkIt = splitArrays(stocks, maxConcurrentRequest)

  // do {
  //   const {value, done} = stocksChunks.next()
  //   if (done) {
  //     break
  //   }

  //   console.log(value)
  // } while(1)
  
  // console.log(stocksChunks.next())
  handleStockBatch(stockChunkIt)
}


(async () => {
  await handleStocks(stocks, 3).then(() => {console.log('test')}).catch(err => console.log)
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
