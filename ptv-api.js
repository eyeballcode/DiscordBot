const crypto = require('crypto')
const {PTVKEY, PTVDEVID} = require('./config.json')
const request = require('request-promise')

async function httpRequest(...options) {
  let start = +new Date()

  let body
  if (typeof options[0] === 'string')
    body = await request(options[0], {
      timeout: 5000,
      ...(options || {})
    })
  else
    body = await request({
      timeout: 5000,
      ...options
    })

  let url = typeof options[0] === 'string' ? options[0] : options[0].url

  let end = +new Date()
  let diff = end - start
  console.log(`${diff}ms ${url}`)

  return body
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
