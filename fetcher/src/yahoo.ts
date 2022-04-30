import { fetch, mkdir } from "./util"
import fs from 'fs'

export function saveAllData(results: any[]) {
  results.forEach((result:any) => {
    if (result) {
      saveData(result)
    }})
}

export function saveAllMinuteData(results: any[]) {
  results.forEach((result:any) => {
    if (result) {
      saveMinuteData(result)
    }})
}

export function saveMinuteData(result:any) {
  const stockName = result.meta.symbol
  const isIndicator = stockName[0] === '^' || stockName.includes('=')
  const type = isIndicator ? 'indicators' : 'stocks'
  let dir = `../data/${type}/${stockName}/raw-minute`
  mkdir(dir)
  console.log(`Saving Security Raw Minute Data: ${stockName}`)
  fs.writeFileSync(`${dir}/data-${getCurDate()}`, JSON.stringify(result.data))

}

export function saveData(result:any) {
  const stockName = result.meta.symbol
  const isIndicator = stockName[0] === '^' || stockName.includes('=')
  const type = isIndicator ? 'indicators' : 'stocks'
  let dir = `../data/${type}/${stockName}`
  mkdir(dir)
  console.log(`Saving Security: ${stockName}`)
  fs.writeFileSync(`${dir}/data`, JSON.stringify(result.data))
  fs.writeFileSync(`${dir}/meta`, JSON.stringify(result.meta))

  console.log(`Saving Security into Azure: ${stockName}`)
  const azureDir = dir.split('/').slice(1).join('/')
  return createAzureDir(azureDir).then(() => createAzureFile(azureDir, 'data', JSON.stringify(result.data)))
    .then(() => createAzureFile(azureDir, 'meta', JSON.stringify(result.data)))
}

function getCurDate() {
  let ts = Date.now();
  let date_ob = new Date(ts);
  let date = date_ob.getDate();
  let month = date_ob.getMonth() + 1;
  let year = date_ob.getFullYear();
  return `${year}${month}${date}`
}

export async function saveUpDownGrade(result: any, name: string) {
  let dir = `../data/${name}`
  mkdir(dir)
  console.log(`Saving Updown grade data: ${name}`)
  fs.writeFileSync(`${dir}/updown`, JSON.stringify(result))
}

export function saveExchange(name: string, result:any) {
  var dir = `../exchange/${name}`
  console.log(`Saving Exchange: ${name}`)
  mkdir(dir)

  fs.writeFileSync(`${dir}/data`, JSON.stringify(result.data))
  fs.writeFileSync(`${dir}/meta`, JSON.stringify(result.meta))
}

export function fetchUpDownGrade(name: string) {
  const path = `/quote/${name}?p=${name}`
  const hostname = 'finance.yahoo.com'
  return fetch(path, hostname)
}

export function extractUpDownGrade(result: string) {
  const index = result.indexOf('root.App.main')
  const endIndex = result.indexOf('\n', index+1)

  if (index === -1) return undefined
  const line = result.substring(index, endIndex)
  const re = /^root.App.main = (.*);$/

  const obj = JSON.parse(line.match(re)![1])

  return obj.context.dispatcher.stores.QuoteSummaryStore.upgradeDowngradeHistory?.history
}

export const fetchData = (name: string) => {
  const path = `/v8/finance/chart/${name}?region=US&lang=en-US&includePrePost=false&interval=1d&useYfid=true&range=10y&corsDomain=finance.yahoo.com&.tsrc=finance`
  return fetch(path, 'query1.finance.yahoo.com')
}

export const fetchMinuteData = (name: string) => {
  const path = `/v8/finance/chart/${name}?region=US&lang=en-US&includePrePost=false&interval=1m&useYfid=true&range=5d&corsDomain=finance.yahoo.com&.tsrc=finance`
  return fetch(path, 'query1.finance.yahoo.com')
}

export function extractData(input:any) {
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