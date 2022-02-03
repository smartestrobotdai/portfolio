import { post } from "./util"

//curl -X POST -d "{'query':[], 'response':{'format':'json'}}" http://api.scb.se/OV0104/v1/doris/en/ssd/FM/FM5001/FM5001A/FM5001SDDSPM
export interface TickSweden {
    path: string
    query: any[]
    name: string
  }
  


  async function fetchSwedenM1M3() {
    // http://api.scb.se/OV0104/v1/doris/en/ssd/FM/FM5001/FM5001A/FM5001SDDSPM
    const host = 'api.scb.se'
    const path = '/OV0104/v1/doris/en/ssd/FM/FM5001/FM5001A/FM5001SDDSPM'
    const body = {query:[], response:{format:'json'}}
    console.log('fetch m1m3')
    return post(path, host, body).then(result => {
      const obj = JSON.parse(result)
      return obj.data.reduce((results:any, cur:any) => {
        const month = cur.key[1].split('M').join('')
        const value = cur.values[0]
        const column = cur.key[0]
        if (column === '5LLM1.1E.NEP.V.A') {
          results.m1.push({month, value})
        } else if (column === '5LLM3a.1E.NEP.V.A') {
          results.m3.push({month, value})
        }
        return results
      }, {m1: [], m3: []})
    })
  }

export async function fetchSwedenTick(tick: TickSweden) {

}

export async function saveSweedenTick(result: any) {

}