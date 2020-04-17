const fs = require('fs')

module.exports = class AudioQueue {

  constructor(broadcast) {
    this.queue = []
    this.currentlyPlaying = null
    this.broadcast = broadcast
  }

  schedulePlay(file) {
    this.queue.push(file)
    this.checkPlay()
  }

  play(file) {
    return new Promise(resolve => {
      let newFile = file.slice(0, -4) + '-copy.wav'
      fs.copyFile(file, newFile, () => {
        let dispatcher = this.broadcast.play(newFile)
        dispatcher.on('finish', () => {
          fs.unlink(file, e => {})
          fs.unlink(newFile, e => {})
          setTimeout(() => {
            this.currentlyPlaying = false
            this.checkPlay()
          }, 500)
          resolve()
        })
      })
    })
  }

  checkPlay() {
    if (!this.currentlyPlaying && this.queue.length) {
      this.currentlyPlaying = true
      let next = this.queue.shift()
      this.play(next)
    }
  }

}
