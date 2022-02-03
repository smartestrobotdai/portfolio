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
        console.log(`statusCode: ${res.statusCode}`)
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
    if (!fs.existsSync(dir)){
      fs.mkdirSync(dir)
    }
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