import { fetch, mkdir } from "./util"
import fs from 'fs'


export async function saveData(result:any) {
  const stockName = result.meta.symbol
  
  var dir = `../data/${stockName}`

  mkdir(dir)

  console.log(`Saving Security: ${stockName}`)
  fs.writeFileSync(`${dir}/data`, JSON.stringify(result.data))
  fs.writeFileSync(`${dir}/meta`, JSON.stringify(result.meta))
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
