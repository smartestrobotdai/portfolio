import https from 'https'
import fs from 'fs'
import path from 'path'

export const post = (path: string, hostname: string, reqBody: any): Promise<string> => {
    return new Promise((resolve, reject) => {
      const options = {
        hostname,
        port: 443,
        path,
        method: 'POST'
      }
      let body = ''
      const req = https.request(options, res => {
        console.log(`post statusCode: ${res.statusCode}`)
        res.on('data', d => {
          body += d.toString()
        })
  
        res.on('end', () => {
          resolve(body)
        })
      })
  
      req.on('error', error => {
        console.log('error', error)
        reject(error)
      })
  
      req.write(JSON.stringify(reqBody))
  
      req.end()
    })
  }

  export const fetch = (path: string, hostname: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const options = {
        hostname,
        port: 443,
        path,
        method: 'GET'
      }
      let body = ''
      const req = https.request(options, res => {
        res.on('data', d => {
          body += d.toString()
        })
  
        res.on('end', () => {
          resolve(body)
        })
      })
  
      req.on('error', error => {
        reject(error)
      })
  
      req.end()
    })
  }

  export function mkdir(dir:string) {
    dir.split('/').reduce(
      (directories, directory) => {
        directories += `${directory}/`;
    
        if (!fs.existsSync(directories)) {
          fs.mkdirSync(directories);
        }
    
        return directories;
      },
      '',
    );
  }
  
  export function deleteAllFiles(dir:string) {
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


export function *splitArrays(arr:any[], maxNumber:number) {
    for (let pos = 0; pos < arr.length; pos += maxNumber) {
      yield arr.slice(pos, pos + maxNumber)
    }
  }

export async function handleBatch(stockChunkIt: Iterator<any[]>, fetchFunc: any, extractFunc: any, saveFunc: any): Promise<any> {
    const {value, done} = stockChunkIt.next()
    if (done) {return Promise.resolve()}
    console.log('Downloading data for ', value)
    return Promise.all(value.map(fetchFunc)).then(results => {
      return results.map(extractFunc)
    }).then((results:any) => {
      console.log('Saving Data')
      results.map((result: any, idx: number) => saveFunc(value[idx], result))
      return Promise.resolve()
    }).catch(e => {console.log(e)}).then(() => handleBatch(stockChunkIt, fetchFunc, extractFunc, saveFunc))
  }
  