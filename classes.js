const ical = require('node-ical')
const request = require('request-promise')
const codeToNames = require('./code-to-names.json')
const moment = require('moment')
require('moment-timezone')

let cache = {}

function parseClass(event) {
  let classCode = event.summary
  let subjectCode = classCode.replace(/\d[A-Z]?$/, '')
  let subjectName = codeToNames[subjectCode]

  let start = moment.tz(event.start, 'Australia/Melbourne')
  let end = moment.tz(event.end, 'Australia/Melbourne')

  return {
    classCode,
    subjectName,
    location: event.location,
    teacher: event.description.slice(-4),
    start: start.format('HH:mm'),
    end: end.format('HH:mm'),
    endTime: end
  }
}

async function getEvents(url) {
  let data
  if (!(data = cache[url]))
    data = await request(url)

  let rawEvents = ical.sync.parseICS(data)
  let events = Object.values(rawEvents)
  let now = new Date()

  let upcoming = events.filter(event => event.start > now).sort((a, b) => a.start - b.start).map(parseClass)
  let next = upcoming[0]
  let following = upcoming[1]
  let third = upcoming[2]

  if (next.endTime < now) { // Class currently running
    return {
      current: next,
      next: following,
      following: third
    }
  } else {
    return {
      current: null,
      next: next,
      following: third
    }
  }
}

module.exports = getEvents
