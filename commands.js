const { MessageAttachment, MessageEmbed } = require('discord.js')
const request = require('request-promise')
const classes = require('./classes.json')
const codeToNames = require('./code-to-names.json')
const config = require('./config')
const moment = require('moment')
require('moment-timezone')
const activities = require('./activities')
const rice = require('./rice0')
const TimedCache = require('./TimedCache')

let cache = new TimedCache(1000 * 60)

let messages = [
  "%s will no longer be a problem",
  "*shoots %s*. **HEADSHOT!**",
  "Unfortunately, %s killed me instead",
  "%s has been disposed of.",
  "%s has been crushed by a piano",
  "A pack of wild wolves ate %s",
  "%s? They were trampled to death at a football match",
  "Why did you kill %s? Who is going to clean it up?",
  "Too little MLP watching killed %s",
  "Using Internet Explorer killed %s",
  "%s stepped on a landmine",
  "%s has been given a lethal injection.",
  "%s? Their computer blew up",
  "%s didn't watch their step and fell off a cliff",
  "%s traveled back in time and killed themselves",
  "*Sending poisoned dinner to %s...*",
  "%s spontaneously combusted.",
  "%s? They went into the forest and never came back",
  "%s fell in front of a train",
  "%s was pushed off a bridge",
  "%s was involved in an airplane accident",
  "Ninjas surrounded %s one day... That is all.",
  "Poor %s. They fell into an endless pit",
  "Mutants killed %s",
  "%s died from licking something they shouldn't have licked"
]

let flipTable = {
  '\u0021' : '\u00A1',
  '\u0022' : '\u201E',
  '\u0026' : '\u214B',
  '\u0027' : '\u002C',
  '\u0028' : '\u0029',
  '\u002E' : '\u02D9',
  '\u0033' : '\u0190',
  '\u0034' : '\u152D',
  '\u0036' : '\u0039',
  '\u0037' : '\u2C62',
  '\u003B' : '\u061B',
  '\u003C' : '\u003E',
  '\u003F' : '\u00BF',
  '\u0041' : '\u2200',
  '\u0042' : '𐐒',
  '\u0043' : '\u2183',
  '\u0044' : '\u25D6',
  '\u0045' : '\u018E',
  '\u0046' : '\u2132',
  '\u0047' : '\u2141',
  '\u004A' : '\u017F',
  '\u004B' : '\u22CA',
  '\u004C' : '\u2142',
  '\u004D' : '\u0057',
  '\u004E' : '\u1D0E',
  '\u0050' : '\u0500',
  '\u0051' : '\u038C',
  '\u0052' : '\u1D1A',
  '\u0054' : '\u22A5',
  '\u0055' : '\u2229',
  '\u0056' : '\u1D27',
  '\u0059' : '\u2144',
  '\u005B' : '\u005D',
  '\u005F' : '\u203E',
  '\u0061' : '\u0250',
  '\u0062' : '\u0071',
  '\u0063' : '\u0254',
  '\u0064' : '\u0070',
  '\u0065' : '\u01DD',
  '\u0066' : '\u025F',
  '\u0067' : '\u0183',
  '\u0068' : '\u0265',
  '\u0069' : '\u0131',
  '\u006A' : '\u027E',
  '\u006B' : '\u029E',
  '\u006C' : '\u0283',
  '\u006D' : '\u026F',
  '\u006E' : '\u0075',
  '\u0072' : '\u0279',
  '\u0074' : '\u0287',
  '\u0076' : '\u028C',
  '\u0077' : '\u028D',
  '\u0079' : '\u028E',
  '\u007B' : '\u007D',
  '\u203F' : '\u2040',
  '\u2045' : '\u2046',
  '\u2234' : '\u2235'
}

for (let i in flipTable) {
  flipTable[flipTable[i]] = i
}

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

      let message = messages[Math.round(Math.random() * (messages.length - 1))]

      msg.reply(message.replace(/%s/g, user))
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
  'track_service': {
    exec: async (msg, args) => {
      let service = args[0]
      if (!service) return msg.reply('You need to specify a service #')

      let data = JSON.parse(await request(`https://vic.transportsg.me/tracker2/bus-bot?service=${service}`))
        let lines = data.map(trip => {
          return `${trip.fleetNumber}: ${trip.departureTime} ${trip.origin} - ${trip.destination}`
        })

        let chunks = []
        for (let i = 0; i < lines.length; i += 15) {
          chunks.push(lines.slice(i, i + 15))
        }

        chunks.forEach((chunk) => {
          msg.reply(chunk.join('\n'))
        })
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

            if (classCode.startsWith('STAFFDUTY')) subjectName = classCode

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
  },
  rice: {
    exec: async msg => {
      if (cache.get('r')) {
        msg.reply(cache.get('r'))
      } else {
        let data = await rice.getRanking()
        let user = data.data.find(u => u.attributes.user === config.USERID)
        let ranking = user.attributes
        let nextUser = data.data.find(u => u.attributes.rank === ranking.rank + 1)

        let difference = ranking.rice / nextUser.attributes.rice * 100

        let message = `Rank: ${ranking.rank}, Grains: ${ranking.rice}. You are ${difference.toFixed(1)}% of rank ${ranking.rank + 1}`
        cache.set('r', message)
        msg.reply(message)
      }
    }
  },
  set_status: {
    exec: (msg, args, bot) => {
      bot.user.setPresence({
        status: 'online',
        activity: {
          name: args.slice(1).join(' '),
          type: 'WATCHING'
        }
      })

      setTimeout(() => {
        setClassStatus(true)
      }, (args[0] * 1000 * 60) || 60000)
    }
  },
  flip: {
    exec: (msg, args) => {
      let input = args.join(' ')
      var last = input.length - 1
      var result = new Array(input.length)
      for (var i = last; i >= 0; --i) {
        var c = input.charAt(i)
        var r = flipTable[c]
        result[last - i] = r != undefined ? r : c
      }
      msg.reply(result.join(''))
    }
  }
}
