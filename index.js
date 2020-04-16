require('dotenv').config()
const Discord = require('discord.js')
const bot = new Discord.Client()

const commands = require('./commands')

const TOKEN = process.env.TOKEN

const broadcast = bot.voice.createBroadcast()

bot.login(TOKEN)

async function play(broadcast, file) {
  let dispatcher = broadcast.play(file)
  return new Promise(resolve => {
    dispatcher.on('finish', () => {
      resolve()
    })
  })
}

bot.on('ready', async () => {
  console.info(`Logged in as ${bot.user.tag}!`)

  let server = bot.guilds.cache.find(guild => guild.id === process.env.SERVER_ID)
  let voiceChannel = server.channels.cache.find(channel => channel.name === 'General')
  let voiceConnection = await voiceChannel.join()
  voiceConnection.play(broadcast)

  while (true) {
    await play(broadcast, process.env.FILE)
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
