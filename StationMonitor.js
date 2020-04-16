const ptvAPI = require('./ptv-api')
const config = require('./config')
const stationCodes = require('./station-codes')
const stopGTFSIDs = require('./stations')
const lines = require('./lines')
const async = require('async')
const fs = require('fs')
const moment = require('moment')
const path = require('path')
const wav = require('node-wav')
require('moment-timezone')

let northernGroup = [
  'Craigieburn',
  'Sunbury',
  'Upfield',
  'Werribee',
  'Williamstown',
  'Showgrounds/Flemington'
]

let crossCityGroup = [
  'Werribee',
  'Williamstown',
  'Frankston'
]

let gippslandLines = [
  'Bairnsdale',
  'Traralgon'
]

let cityLoopStations = ['Southern Cross', 'Parliament', 'Flagstaff', 'Melbourne Central']

module.exports = class StationMonitor {
  constructor(station, audioQueue) {
    this.station = station
    this.monitorTimeouts = []
    this.nextDepartures = []
    this.audioQueue = audioQueue

    this.runIDsSeen = []

    this.audioScheduler()
  }

  async audioScheduler() {
    let nextDepartures = await this.getFullNextDepartures()
    if (!nextDepartures.length) return setTimeout(audioScheduler, 1000 * 60 * 5)
    this.nextDepartures = nextDepartures

    for (let i in this.monitorTimeouts) clearTimeout(i)

    this.nextDepartures.forEach(nextDeparture => {
      let deviance = nextDeparture.estimatedDepartureTime - nextDeparture.scheduledDepartureTime
      let msToSchDeparture = nextDeparture.scheduledDepartureTime - this.moment()
      let twoMinToSchDeparture = msToSchDeparture - 1000 * 60 * 2

      let timeout

      if (deviance > 1000 * 60 * 5) {
        let timeToDeparture = nextDeparture.estimatedDepartureTime - this.moment()
        if (timeToDeparture < 1000 * 60) // delayed train arriving now, play regular announcement now
          timeout = setTimeout(this.checkDeparture.bind(this, false, null, nextDeparture), 0)
        else // delayed train, play delay announcement at scheduled
          timeout = setTimeout(this.checkDeparture.bind(this, true, timeToDeparture, nextDeparture), twoMinToSchDeparture)
      } else { // on time train arriving, play regular announcement at scheduled
        timeout = setTimeout(this.checkDeparture.bind(this, false, null, nextDeparture), twoMinToSchDeparture + deviance)
      }

      this.monitorTimeouts.push(timeout)

    })

    setTimeout(this.audioScheduler.bind(this), 1000 * 45)
  }

  async checkDeparture(playDelayed, msToDeparture, nextDeparture) {
    if (playDelayed) {
      let minutesToDeparture = msToDeparture / 1000 / 60
    } else {
      if (this.runIDsSeen.includes(nextDeparture.runID)) return
      this.runIDsSeen.push(nextDeparture.runID)
      this.audioQueue.schedulePlay(nextDeparture.outputFile)
    }

    this.runIDsSeen = this.runIDsSeen.slice(-5)
  }

  transformDeparture(departure) {
    if (departure.route_id === 13) { // stony point
      if (departure.stop_id === 1073) { // frankston
        departure.platform_number = '3'
      } else {
        departure.platform_number = '1'
      }
    }

    if (departure.flags.includes('RRB-RUN')) {
      departure.platform_number = 'RRB'
    }

    departure.actual_departure_utc = departure.estimated_departure_utc || departure.scheduled_departure_utc

    return departure
  }

  minutesDifference(time) {
    return (new Date(time) - new Date()) / 1000 / 60
  }

  async getStoppingPattern(runID, isUp, station) {
    let patternPayload = await ptvAPI(`/v3/pattern/run/${runID}/route_type/0?expand=stop`)
    let departures = patternPayload.departures
    let stops = patternPayload.stops

    departures = departures.sort((a, b) => new Date(a.scheduled_departure_utc) - new Date(b.scheduled_departure_utc))

    let stoppingPattern = departures.map(stop => stops[stop.stop_id].stop_name)

    if (stoppingPattern.includes('Jolimont-MCG')) {
      stoppingPattern[stoppingPattern.indexOf('Jolimont-MCG')] = 'Jolimont'
    }

    let fssIndex = stoppingPattern.indexOf('Flinders Street')
    if (fssIndex !== -1) {
      if (isUp) {
        stoppingPattern = stoppingPattern.slice(0, fssIndex + 1)
      } else {
        let stopIndex = stoppingPattern.indexOf(station)
        if (fssIndex < stopIndex) {
          stopIndex = fssIndex
        }
        stoppingPattern = stoppingPattern.slice(stopIndex)
      }
    }

    return stoppingPattern
  }

  getRouteStops(lineName) {
    if (['Pakenham', 'Traralgon', 'Bairnsdale'].includes(lineName)) return lines.Gippsland
    if (lineName === 'Cranbourne') return lines.Cranbourne
    if (lineName === 'Belgrave') return lines.Belgrave
    if (lineName === 'Lilydale') return lines.Lilydale
    if (lineName === 'Alamein') return lines.Alamein
    if (['Craigieburn', 'Seymour', 'Shepparton'].includes(lineName)) return lines.Shepparton
    if (lineName === 'Albury') return lines.Albury
    if (lineName === 'Maryborough') return lines.Maryborough
    if (['Ballarat', 'Ararat'].includes(lineName)) return lines.Ararat
    if (['Geelong', 'Warrnambool'].includes(lineName)) return lines.Warrnambool
    if (lineName === 'Werribee') return lines.Werribee
    if (lineName === 'Williamstown') return lines.Williamstown
    if (lineName === 'Sandringham') return lines.Sandringham
    if (lineName === 'Upfield') return lines.Upfield
    if (['Frankston', 'Stony Point'].includes(lineName)) return lines['Stony Point']
    if (['Sunbury', 'Bendigo', 'Echuca'].includes(lineName)) return lines.Echuca
    if (lineName === 'Swan Hill') return lines['Swan Hill']
    if (lineName === 'Glen Waverley') return lines['Glen Waverley']
    if (lineName === 'Mernda') return lines.Mernda
    if (lineName === 'Hurstbridge') return lines.Hurstbridge
  }

  getExpressParts(stoppingPattern, relevantStops) {
    let expressParts = []

    let lastMainMatch = 0
    let expressStops = 0

    for (let scheduledStop of stoppingPattern) {
      let matchIndex = -1

      for (let stop of relevantStops) {
        matchIndex++

        if (stop === scheduledStop) {

          if (matchIndex !== lastMainMatch) { // there has been a jump - exp section
            let expressPart = relevantStops.slice(lastMainMatch, matchIndex)
            expressParts.push(expressPart)
          }

          lastMainMatch = matchIndex + 1
          break
        }
      }
    }

    return expressParts
  }

  getRelevantRouteStops(routeName, stoppingPattern, isUp, station) {
    let routeStops = this.getRouteStops(routeName).slice(0)

    if (isUp) routeStops.reverse()

    let viaCityLoop = stoppingPattern.includes('Parliament') || stoppingPattern.includes('Flagstaff')

    if (viaCityLoop) {
      let cityLoopStops = stoppingPattern.filter(e => cityLoopStations.includes(e))
      routeStops = routeStops.filter(e => !cityLoopStations.includes(e))

      if (isUp) {
        routeStops = routeStops.slice(0, -1).concat(cityLoopStops)
        routeStops.push('Flinders Street')
      } else {
        routeStops = ['Flinders Street', ...cityLoopStops, ...routeStops.slice(1)]
      }
    } else {
      routeStops = routeStops.filter(stop => !cityLoopStations.includes(stop))
      if (northernGroup.includes(routeName)) {
        if (isUp) {
          routeStops = [...routeStops.slice(0, -1), 'Southern Cross', 'Flinders Street']
        } else {
          routeStops = ['Flinders Street', 'Southern Cross', ...routeStops.slice(1)]
        }
      }
    }

    let startIndex = stoppingPattern.indexOf(station)
    stoppingPattern = stoppingPattern.slice(startIndex)

    let stillViaCityLoop = stoppingPattern.includes('Parliament') || stoppingPattern.includes('Flagstaff')

    let routeStartIndex = routeStops.indexOf(station)
    let routeEndIndex = routeStops.indexOf(stoppingPattern.slice(-1)[0])

    let relevantStops = routeStops.slice(routeStartIndex, routeEndIndex + 1)

    return { stoppingPattern, relevantStops, viaCityLoop: stillViaCityLoop }
  }

  generateAudioPattern(expressParts, relevantStops, destination, viaCityLoop, station) {
    let pattern = []
    if (expressParts.length === 0) {
      pattern.push('item/item42')
      if (viaCityLoop) {
        pattern.push(`station/phr/${stationCodes[destination]}_phr`)
        pattern.push('item/item15')
      } else {
        pattern.push(`station/sen/${stationCodes[destination]}_sen`)
      }

      return pattern
    } else if (expressParts.length === 1 && expressParts[0].length === 1) {
      pattern.push('item/item42')
      if (viaCityLoop) {
        pattern.push(`station/phr/${stationCodes[destination]}_phr`)
        pattern.push(`station/exc/${stationCodes[expressParts[0][0]]}_exc`)
        pattern.push('item/item15')
      } else {
        pattern.push(`station/sen/${stationCodes[destination]}_sen`)
        pattern.push(`station/exc/${stationCodes[expressParts[0][0]]}_exc`)
      }

      return pattern
    }

    let lastStop

    for (let expressSector of expressParts) {
      let firstExpressStop = expressSector[0]
      let lastExpressStop = expressSector.slice(-1)[0]

      let previousStop = relevantStops[relevantStops.indexOf(firstExpressStop) - 1]
      let nextStop = relevantStops[relevantStops.indexOf(lastExpressStop) + 1]

      if (lastStop) {
        if (i === expressParts.length - 1 && nextStop === destination) {
          pattern.push('item/item48')
          pattern.push('item/item10')
          pattern.push(`station/flt/${stationCodes[previousStop]}_flt`)
          pattern.push(`station/phr/${stationCodes[nextStop]}_phr`)
        } if (lastStop === previousStop) {
          pattern.push(`station/flt/${stationCodes[previousStop]}_flt`)
          pattern.push(`station/phr/${stationCodes[nextStop]}_phr`)
        } else {
          pattern.push('item/item42')
          pattern.push(`station/phr/${stationCodes[previousStop]}_phr`)
          pattern.push('item/item10')
          pattern.push(`station/flt/${stationCodes[previousStop]}_flt`)
          pattern.push(`station/phr/${stationCodes[nextStop]}_phr`)
        }
      } else {
        if (station === previousStop) {
          pattern.push('item/item10')
          pattern.push(`station/flt/${stationCodes[previousStop]}_flt`)
          pattern.push(`station/phr/${stationCodes[nextStop]}_phr`)
        } else {
          pattern.push('item/item42')
          pattern.push(`station/phr/${stationCodes[previousStop]}_phr`)
          pattern.push('item/item10')
          pattern.push(`station/flt/${stationCodes[previousStop]}_flt`)
          pattern.push(`station/phr/${stationCodes[nextStop]}_phr`)
        }
      }

      lastStop = nextStop
    }

    if (relevantStops[relevantStops.indexOf(lastStop)] !== destination) {
      pattern.push('item/item48')
      pattern.push('item/item42')
      if (destination === 'Flinders Street') {
        if (viaCityLoop) {
          pattern.push('station/phr/fss_phr')
          pattern.push('item/item15')
        } else {
          pattern.push('station/sen/fss_sen')
        }
      } else {
        pattern.push(`station/sen/${stationCodes[destination]}_sen`)
      }
    }

    return pattern
  }

  getMinutesPastMidnight(time) {
    return time.get('hours') * 60 + time.get('minutes')
  }

  moment(utc) {
    if (utc)
      return moment.tz(utc, 'Australia/Melbourne')
    else
      return moment.tz('Australia/Melbourne')
  }

  readFile(file) {
    return new Promise(resolve => {
      fs.readFile(file, (err, data) => {
        resolve(data)
      })
    })
  }

  writeFile(file, data) {
    return new Promise(resolve => {
      fs.writeFile(file, data, err => {
        resolve()
      })
    })
  }

  getServiceNameFiles(scheduledDepartureTime, destination) {
    let scheduledMoment = this.moment(scheduledDepartureTime)

    let scheduledHour = scheduledMoment.get('hour')
    let scheduledHour12 = scheduledHour % 12
    let scheduledMinute = scheduledMoment.get('minute')

    let departureTime = []

    let minuteFile = `time/minutes/min_${scheduledMinute < 10 ? '0' + scheduledMinute : scheduledMinute}`
    let hourFile = `time/the_hour/the_${scheduledHour12 < 10 ? '0' + scheduledHour12 : scheduledHour12}`

    if (scheduledMinute === 0) {
      if (scheduledHour === 0) {
        departureTime = ['item/item40', 'time/on_hour/midnight']
      } else if (scheduledHour < 12) {
        minuteFile = 'time/on_hour/am'
      } else if (scheduledHour === 12) {
        departureTime = ['item/item40', 'time/on_hour/noon']
      } else {
        minuteFile = 'time/on_hour/pm'
      }
    }

    if (departureTime.length === 0) {
      if (scheduledHour === 0) hourFile = 'time/the_hour/the_12'
      departureTime = [hourFile, minuteFile]
    }

    return [
      ...departureTime,
      `station/dst/${stationCodes[destination]}_dst`
    ]
  }

  async generateAudio(platform, audioPattern, scheduledDepartureTime, destination, station) {
    let greeting
    let now = this.moment()
    let hourNow = now.get('hour')

    if (hourNow < 12)
      greeting = 'item/item01'
    else if (hourNow < 17)
      greeting = 'item/item02'
    else
      greeting = 'item/item03'

    let serviceName = this.getServiceNameFiles(scheduledDepartureTime, destination)

    let serviceData = [
      `platform/next/pn_${platform < 10 ? '0' + platform : platform}`,
      'tone/pause2',
      ...serviceName,
      ...audioPattern
    ]

    let intro = [
      'tone/chime', greeting, 'tone/pause3'
    ]

    let fullPattern = [
      ...intro, ...serviceData, 'tone/pause3',
      ...serviceData, 'tone/pause3', 'item/qitem14'
    ]

    let fileData = await async.map(fullPattern, async name => {
      let filePath = path.join(config.VOICE_PATH, name + '.wav')
      let fileData = await this.readFile(filePath)
      let result = wav.decode(fileData)
      return result.channelData
    })

    let left = []
    let right = []
    fileData.forEach(fileData => {
      left = [...left, ...fileData[0]]
      right = [...right, ...fileData[1]]
    })

    let buffer = wav.encode([left, right], {sampleRate: 44100, float: true, bitDepth: 32})

    let outputFile = path.join(__dirname, `output-${station}-${this.moment(scheduledDepartureTime).format('HHmm')}-${destination}.wav`)

    await this.writeFile(outputFile, buffer)

    return outputFile
  }

  async getNextDeparture() {
    let departurePayload = await ptvAPI(`/v3/departures/route_type/0/stop/${stopGTFSIDs[this.station]}?gtfs=true&max_results=5&expand=run&expand=route`)

    let departures = departurePayload.departures.map(this.transformDeparture)
    let runs = departurePayload.runs
    let routes = departurePayload.routes

    let nextDeparture = departures.sort((a, b) => new Date(a.actual_departure_utc) - new Date(b.actual_departure_utc))[0]
    if (this.minutesDifference(nextDeparture.actual_departure_utc) > 120) return null

    return {
      scheduledDepartureTime: this.moment(nextDeparture.scheduled_departure_utc),
      estimatedDepartureTime: this.moment(nextDeparture.estimated_departure_utc),
      runID: nextDeparture.run_id
    }
  }

  async getFullNextDepartures() {
    let departurePayload = await ptvAPI(`/v3/departures/route_type/0/stop/${stopGTFSIDs[this.station]}?gtfs=true&max_results=5&expand=run&expand=route`)

    let departures = departurePayload.departures.map(this.transformDeparture)
    let runs = departurePayload.runs
    let routes = departurePayload.routes

    let nextDepartures = departures.filter(e => e.platform_number !== 'RRB').sort((a, b) => new Date(a.actual_departure_utc) - new Date(b.actual_departure_utc)).slice(0, 3)
    return (await async.map(nextDepartures, async nextDeparture => {
      if (this.minutesDifference(nextDeparture.actual_departure_utc) > 120) return null

      let runID = nextDeparture.run_id
      let routeName = routes[nextDeparture.route_id].route_name

      let isUp = nextDeparture.direction_id === 1
      if (nextDeparture.route_id === '13') { // Stony point
        isUp = nextDeparture.direction_id === 5
      }

      let rawStoppingPattern = await this.getStoppingPattern(runID, isUp, this.station)
      let { stoppingPattern, relevantStops, viaCityLoop } = this.getRelevantRouteStops(routeName, rawStoppingPattern, isUp, this.station)
      let expressParts = this.getExpressParts(stoppingPattern, relevantStops)

      let destination = stoppingPattern.slice(-1)[0]

      let audioPattern = this.generateAudioPattern(expressParts, relevantStops, destination, viaCityLoop, this.station)

      let announcedDestination = (destination === 'Flinders Street' && viaCityLoop) ? 'City Loop' : destination

      let outputFile = await this.generateAudio(nextDeparture.platform_number, audioPattern, nextDeparture.scheduled_departure_utc, destination, this.station)

      return {
        scheduledDepartureTime: this.moment(nextDeparture.scheduled_departure_utc),
        estimatedDepartureTime: this.moment(nextDeparture.estimated_departure_utc),
        outputFile,
        runID: nextDeparture.run_id
      }
    })).filter(Boolean)
  }
}
