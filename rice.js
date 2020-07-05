const r = require('request-promise')
const config = require('./config')
let gameID
let category = "66f2a9aa-bac2-5919-997d-2d17825c1837"
let userID = config.USERID
let level = 1
let bearerToken = 'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpYXQiOjE1OTI5NDI2NTQsImV4cCI6MTU5NTUzNDY1NCwidXVpZCI6IjRlMGZmNTE5LTE2MGQtNGQ4OS1hYzhiLWUyM2FjN2JhNjFhZCJ9.j5s0VL0f3iOGpRGIBW_PySbY_13n9w3IIWX1xuIVeVs'
let userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_2) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.4 Safari/605.1.15'
let headers = { 'Content-Type': 'application/json', Authorization: bearerToken, 'User-Agent': userAgent }

async function getGame() {
  let body = await r.post('https://engine.freerice.com/games', {
    body: JSON.stringify({
      category,
      level: 1,
      user: userID
    }),
    headers
  })

  let data = JSON.parse(body)
  gameID = data.data.id
}

async function getRanking() {
  let body = await r.get(`https://engine.freerice.com/group-members?_format=json&group=9f93e4a5-eecc-4dbe-a512-dc4754dee2bc&current=1&limit=20`, {
    headers
  })

  let data = JSON.parse(body)

  return data
}

async function getQuestion() {
  for (let i = 0; i < 4; i++) {
    try {
      let body = await r.get(`https://engine.freerice.com/games/${gameID}`, {
        headers
      })

      let data = JSON.parse(body)
      if (!data.data.attributes) throw new Error('')
      return data
    } catch(e) {console.log(e)}
  }
}

async function answerQuestion(question, answer) {
  for (let i = 0; i < 4; i++) {
    try {
      let body = await r.patch(`https://engine.freerice.com/games/${gameID}/answer`, {
        body: JSON.stringify({
          answer,
          question,
          user: userID
        }),
        headers,
        simple: false
      })

      let data = JSON.parse(body)
      if (!data) console.log(body)
      if (!data.data.attributes) throw new Error('')
      return data
    } catch (e) {console.log(e)}
  }
}

async function levelUp() {
  for (let i = 0; i < 4; i++) {
    try {
      let body = await r.patch(`https://engine.freerice.com/games/${gameID}/category`, {
        body: JSON.stringify({
          category, level
        }),
        headers,
        simple: false
      })

      let data = JSON.parse(body)
      if (!data.data.attributes) throw new Error('')
      return data
    } catch (e) {console.log(e)}
  }
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
    }, 1200)
  })
}

async function main() {
  await getGame()
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
        if (!question.data) {
          console.log('No question again?')
          question = await levelUp()
        }
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
