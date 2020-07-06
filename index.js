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

global.setClassStatus = function setClassStatus(stop) {
  let now = new Date()
  let next = trackClasses.find(clazz => new Date(clazz.end) > now)
  let following = trackClasses.find(clazz => new Date(clazz.end) > now && clazz !== next)
  let hasBreak = next.end !== following.start
  let start = new Date(next.start)

  if (start < now) {
    let subjectCode = next.classCode.replace(/\d[A-Z]?$/, '')
    let subjectName = config.SUBJECTS[subjectCode]
    let subjectFormat = config.SUBJECT_FORMAT[subjectCode] || config.SUBJECT_FORMAT.DEFAULT
    subjectFormat = subjectFormat.replace('{}', subjectName)

    bot.user.setPresence({
      status: 'online',
      activity: {
        name: subjectFormat,
        type: 'WATCHING'
      }
    })

    if (!stop) {
      let timeToEndClass = new Date(next.end) - now
      setTimeout(setClassStatus, timeToEndClass + 1000)
    }
  } else {
    bot.user.setPresence({
      status: 'online',
      activity: {
        name: config.SUBJECT_FORMAT.NO_CLASS,
        type: 'WATCHING'
      }
    })

    if (!stop) {
      let timeToNextClass = new Date(next.start) - now
      setTimeout(setClassStatus, timeToNextClass + 1000)
    }
  }
}

bot.on('ready', async () => {
  console.info(`Logged in as ${bot.user.tag}!`)

  let server = bot.guilds.cache.get(config.SERVER_ID)
  if (config.VOICE) {
    let voiceChannel = server.channels.cache.find(channel => channel.name === 'rit likes anime girls')
    let voiceConnection = await voiceChannel.join()
    voiceConnection.play(broadcast)

    let audioQueue = new AudioQueue(broadcast)
    let stationMonitor = new StationMonitor(config.STATION, audioQueue)
  }

  setClassStatus()

  let id = '700142033435754526'
  let log = server.channels.cache.find(channel => channel.name === 'shits-and-giggles')

  bot.on('channelUpdate', (oldChannel, newChannel) => {
    if (newChannel.id === id) {
      log.send(`name change ${new Date()}, ${newChannel.name}`)
    }
  })
})

bot.on('message', msg => {
  let {content} = msg
  let parts
  if (parts = content.match(/^!(\w+\??)(.+)?$/)) {
    let command = parts[1].toLowerCase()
    let args = (parts[2] || '').trim().split(/ +/)

    if (commands[command]) {
      msg.react('🏳️‍🌈')
      commands[command].exec(msg, args, bot)
    } else {
      msg.reply(`Could not find command ${command}`)
    }
  }
})

if (config.server) {
  setInterval(() => {
    require('child_process').exec('systemctl restart rice')
  }, 1000 * 60 * 60)
}
