const { MessageAttachment, MessageEmbed } = require('discord.js')
const request = require('request-promise')
const classes = require('./classes.json')
const codeToNames = require('./code-to-names.json')
const config = require('./config')
const moment = require('moment')
require('moment-timezone')
const activities = require('./activities')

module.exports = {
  help: {
    exec: msg => {
      msg.reply(`
!help: lists the commands
!hello: say hi
!is_ron_straight: is ron straight?
!straight?: is the person straight?
!kill: kill someone
!motd: message
!avatar: show a user's avatar
!waifu <count>: sends waifu
!pronouns: what pronouns does the bot use
!track: tracks a bus
!classes: what is my next class
`)
    }
  },
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
  },
  track: {
    exec: async (msg, args) => {
      let fleet = args[0]
      if (!fleet) return msg.reply('You need to specify a fleet #')

      let data = JSON.parse(await request(`https://vic.transportsg.me/tracker2/bus-bot?fleet=${fleet}`))
      let text = data.map(trip => {
        return `${trip.departureTime} ${trip.routeNumber}: ${trip.origin} - ${trip.destination}`
      }).join('\n')

      msg.reply(`Trips today: \n${text}`)
    }
  },
  classes: {
    exec: async (msg, args) => {
      let target = msg.mentions.users.first() || msg.author
      let user = `${target.username}#${target.discriminator}`

      let matchingClasses
      if (args[0] && args[0].length === 4) {
        matchingClasses = classes.filter(clazz => clazz.teacher === args[0])
      } else if (config.CLASSES[user]) {
        matchingClasses = classes.filter(clazz => clazz.students.includes(config.CLASSES[user]))
      }

      if (matchingClasses) {
        matchingClasses = matchingClasses.map(clazz => {
          let classCode = clazz.classCode
          let subjectCode = classCode.replace(/\d[A-Z]?$/, '')
          let subjectName = codeToNames[subjectCode]

          let start = moment.tz(clazz.start, 'Australia/Melbourne')
          let end = moment.tz(clazz.end, 'Australia/Melbourne')

          let activityID = activities[clazz.classCode]
          let startTimestamp = moment.utc(clazz.start).format('DDMMYYYYHHmm')

          let compassURL = `https://jmss-vic.compass.education/Organise/Activities/Activity.aspx#session/${activityID}${startTimestamp}`

          return {
            classCode,
            subjectName,
            location: clazz.location,
            teacher: clazz.teacher,
            start: start.format('HH:mm'),
            end: end.format('HH:mm'),
            startTime: start,
            endTime: end,
            compassURL
          }
        })

        let now = moment.tz('Australia/Melbourne')

        let upcoming = matchingClasses.filter(event => event.endTime > now).sort((a, b) => a.startTime - b.startTime)

        let current, next, following

        if (upcoming[0].startTime < now) {
          current = upcoming[0]
          next = upcoming[1]
          following = upcoming[2]
        } else {
          next = upcoming[0]
          following = upcoming[1]
        }

        let embeds = []

        function createEmbed(type, clazz) {
          embeds.push(new MessageEmbed()
            .setTitle(`${type}: ${clazz.subjectName}`)
            .setURL(clazz.compassURL)
            .addFields(
              { name: 'Location', value: clazz.location, inline: true },
              { name: 'Teacher', value: clazz.teacher, inline: true },
              { name: 'Start', value: clazz.start, inline: true }
            )
          )
        }

        if (current) {
          createEmbed('Current Class', current)
        }

        createEmbed('Next Class', next)
        createEmbed('Following Class', following)

        for (let embed of embeds) {
          msg.reply(embed)
        }
      } else {
        msg.reply('Sorry, I don\'t have your classes')
      }
    }
  }
}
