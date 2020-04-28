const Discord = require('discord.js')
const bot = new Discord.Client()

const config = require('./config.json')
const commands = require('./commands')

const AudioQueue = require('./AudioQueue')
const StationMonitor = require('./StationMonitor')

const classes = require('./classes.json')

const TOKEN = config.TOKEN

const broadcast = bot.voice.createBroadcast()

bot.login(TOKEN)

let trackClasses = classes.filter(clazz => clazz.students.includes(config.TRACK_CLASS)).sort((a, b) => new Date(a.start) - new Date(b.start))

function setClassStatus() {
  let now = new Date()
  let next = trackClasses.find(clazz => new Date(clazz.end) > now)
  let following = trackClasses.find(clazz => new Date(clazz.end) > now && clazz !== next)
  let hasBreak = next.end !== following.start
  let start = new Date(next.start)

  if (start < now) {
    let subjectCode = next.classCode.replace(/\d[A-Z]?$/, '')
    let subjectName = config.SUBJECTS[subjectCode]
    let subjectFormat = config.SUBJECT_FORMAT[subjectCode] || 'ed die in {}'
    subjectFormat = subjectFormat.replace('{}', subjectName)

    bot.user.setPresence({
      status: 'online',
      activity: {
        name: subjectFormat,
        type: 'WATCHING'
      }
    })

    let timeToEndClass = new Date(following.end) - now
    setTimeout(setClassStatus, timeToEndClass + 1000)
  } else {
    bot.user.setPresence({
      status: 'online',
      activity: {
        name: config.SUBJECT_FORMAT.NO_CLASS,
        type: 'WATCHING'
      }
    })

    let timeToNextClass = new Date(next.start) - now
    setTimeout(setClassStatus, timeToNextClass + 1000)
  }
}

bot.on('ready', async () => {
  console.info(`Logged in as ${bot.user.tag}!`)

  let server = bot.guilds.cache.get(config.SERVER_ID)
  if (config.VOICE) {
    let voiceChannel = server.channels.cache.find(channel => channel.name === 'General')
    let voiceConnection = await voiceChannel.join()
    voiceConnection.play(broadcast)

    let audioQueue = new AudioQueue(broadcast)
    let stationMonitor = new StationMonitor(config.STATION, audioQueue)
  }

  setClassStatus()
})

bot.on('message', msg => {
  let {content} = msg
  let parts
  if (parts = content.match(/^!(\w+\??)(.+)?$/)) {
    let command = parts[1].toLowerCase()
    let args = (parts[2] || '').trim().split(/ +/)

    if (commands[command]) {
      commands[command].exec(msg, args)
    } else {
      msg.reply(`Could not find command ${command}`)
    }
  }
})
