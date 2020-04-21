const Discord = require('discord.js')
const bot = new Discord.Client()

const config = require('./config.json')
const commands = require('./commands')

const AudioQueue = require('./AudioQueue')
const StationMonitor = require('./StationMonitor')

const TOKEN = config.TOKEN

const broadcast = bot.voice.createBroadcast()

bot.login(TOKEN)

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
