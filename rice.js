const r = require('request-promise')
const config = require('./config')
let gameID = config.GAMEID
let category = config.CATEGORY
let userID = config.USERID
let level = 2
let bearerToken = 'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpYXQiOjE1OTEwNjExMzgsImV4cCI6MTU5MzY1MzEzOCwidXVpZCI6ImM4ZTczZTgwLTc1MDAtNDc5YS04MzBjLWQwOGZlZTI5ZWU5YiJ9.CjLgvPtcT7LhmZ4r-XYhScU51zTbXk_XdYhiXFEVEBQ'
let userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_2) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.4 Safari/605.1.15'
let headers = { 'Content-Type': 'application/json', Authorization: bearerToken, 'User-Agent': userAgent }

async function getRanking() {
  let body = await r.get(`https://engine.freerice.com/group-members?_format=json&group=9f93e4a5-eecc-4dbe-a512-dc4754dee2bc&current=1&limit=20`, {
    headers
  })

  let data = JSON.parse(body)

  return data
}

async function getQuestion() {
  let body = await r.get(`https://engine.freerice.com/games/${gameID}`, {
    headers
  })

  return JSON.parse(body)
}

async function answerQuestion(question, answer) {
  let body = await r.patch(`https://engine.freerice.com/games/${gameID}/answer`, {
    body: JSON.stringify({
      answer,
      question,
      user: userID
    }),
    headers,
    simple: false
  })

  return JSON.parse(body)
}

async function levelUp() {
  let body = await r.patch(`https://engine.freerice.com/games/${gameID}/category`, {
    body: JSON.stringify({
      category, level
    }),
    headers,
    simple: false
  })

  return JSON.parse(body)
}

function solve(question) {
  let q = question.data.attributes.question

  let t = q.text
  let p = t.split(' x ')
  let answer = p[0] * p[1]
  console.log(t, answer)
  return answer
}

function sleep() {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve()
    }, 500)
  })
}

async function main() {
  let question = await levelUp()
  category = question.data.attributes.category
  level = question.data.attributes.level

  while (true) {
    let questionID = question.question_id
    let answer = solve(question)
    let answerID = 'a' + answer
    question = await answerQuestion(questionID, answerID)

    if (question.errors) {
      let title = question.errors[0].title
      if (title.startsWith('No Question is available for this game.')) {
        question = await levelUp()

        category = question.data.attributes.category
        level = question.data.attributes.level
        console.log('Level Up', level)
      } else if (title === 'No Question is set for this game') {
        question = await levelUp()

        category = question.data.attributes.category
        level = question.data.attributes.level

        console.log('Out of questions')
      }
    }
    await sleep()
  }
}

module.exports = {getRanking}

main()
