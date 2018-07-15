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
var bufferDiv = document.querySelector('#buffer')
myConsole.log('checkyy')
myConsole.log(bufferDiv.innerHTML)
var opacity = 1
ipcRenderer.on('load-buffer', (event, message) => {
  bufferDiv.innerHTML = message
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
