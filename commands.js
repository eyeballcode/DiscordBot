const { MessageAttachment } = require('discord.js')
const request = require('request').defaults({ encoding: null })

module.exports = {
  hello: {
    exec: msg => {
      msg.reply('Hello!')
    }
  },
  is_ron_straight: {
    exec: msg => {
      msg.reply('No')
    }
  },
  'straight?': {
    exec: msg => {
      let user = msg.mentions.users.first()
      if (!user) {
        return msg.reply(`You're as straight as string`)
      }
      let {username} = user

      let straight = ['Xager_0', 'Incompetent']
      console.log(username, straight)
      if (straight.includes(username))
        msg.reply(`Yes, ${user} is straight`)
      else
        msg.reply(`No, ${user} is not straight`)
    }
  },
  kill: {
    exec: msg => {
      let user = msg.mentions.users.first()
      if (!user) return
      msg.reply(`Pew pew! ${user} died!`)
    }
  },
  motd: {
    exec: msg => {
      msg.reply('MOTD: STAY HOME OR I\'LL END YOU')
    }
  },
  avatar: {
    exec: msg => {
      let user = msg.mentions.users.first() || msg.author
      let avatarURL = user.displayAvatarURL() + '?size=2048'
      let attachment = new MessageAttachment(avatarURL)
      msg.channel.send(`${msg.author}, `, attachment)
    }
  },
  waifu: {
    exec: (msg, args) => {
      let MAX = 5
      let count = Math.max(Math.min(args[0] || 1, MAX), 1)

      for (let i = 0; i < count; i++) {
        let random = Math.round(Math.random() * 100000)
        let url = `https://www.thiswaifudoesnotexist.net/example-${random}.jpg`
        let attachment = new MessageAttachment(url)
        msg.channel.send(`${msg.author}, `, attachment)
      }
    }
  },
  pronouns: {
    exec: msg => msg.reply('I go by she/her')
  }
}
