'use strict'

// use for debug purpose only =D
var closeEl = document.querySelector('.close')
var settingsEl = document.querySelector('.settings')
var nodeConsole = require('console')
var myConsole = new nodeConsole.Console(process.stdout, process.stderr)
myConsole.log('Hello World!')
const {
  ipcRenderer,
  remote
} = require('electron')
var saveState = document.querySelector('#saveState')
var timeTaken = document.querySelector('#timeTaken')
myConsole.log('checkyy')
var opacity = 1
ipcRenderer.on('load-state-time', (event, messageObj) => {
  saveState.innerHTML = messageObj.save
  timeTaken.innerHTML = messageObj.time
})
ipcRenderer.on('inc-opq', (event, message) => {
  // TODO: this parameters - disappearing and transparency speed needs to be externalized.
  var opaqueTimer = setInterval(function () {
    opacity -= 0.05
    bufferDiv.style.opacity = opacity
    if (opacity <= 0) {
      clearInterval(opaqueTimer)
      var curWindow = remote.getCurrentWindow()
      curWindow.close()
    }
  }, 100)
})

closeEl.addEventListener('click', function () {
  ipc.send('close-main-window')
})

myConsole.log('checkyy')
