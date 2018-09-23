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
var bufferDiv = document.querySelector('#mouseholder')
myConsole.log('checkyy')
myConsole.log(bufferDiv.innerHTML)
bufferDiv.innerHTML = 'Mouse initialized was here'
ipcRenderer.on('load-buffer', (event, message) => {
  bufferDiv.innerHTML = message
})
ipcRenderer.on('cycle-buffer', (event, message) => {
  // TODO: this parameters - disappearing and transparency speed needs to be externalized.
  bufferDiv.innerHTML = message
})
ipcRenderer.on('get-buffer-message', (event, message) => {
  // TODO: this parameters - disappearing and transparency speed needs to be externalized.
  return bufferDiv.innerHTML
})

closeEl.addEventListener('click', function () {
  ipc.send('close-main-window')
})

myConsole.log('checkyy')
