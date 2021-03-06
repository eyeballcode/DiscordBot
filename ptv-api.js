const crypto = require('crypto')
const {PTVKEY, PTVDEVID} = require('./config.json')
const request = require('request')

function httpRequest(url) {
  let start = +new Date()

  return new Promise(resolve => {
    request(url, {
      timeout: 5000,
      gzip: true,
      forever: true
    }, (err, data, body) => {
      let end = +new Date()
      let diff = end - start
      console.log(`${diff}ms ${url}`)

      resolve(body)
    })
  })
}

function getURL(request) {
  request += (request.includes('?') ? '&' : '?') + 'devid=' + PTVDEVID
  let signature = crypto.createHmac('SHA1', PTVKEY).update(request).digest('hex').toString('hex')
  return 'https://timetableapi.ptv.vic.gov.au' + request + '&signature=' + signature
}

async function makeRequest(url) {
  let fullURL = getURL(url)
  let data = await httpRequest(fullURL)

  return JSON.parse(data)
}

module.exports = makeRequest
