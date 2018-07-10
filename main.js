'use strict'

/*

STEPS:

1. Need to go get that circular buffer to store all values
2. Extenralize configuration keys or different platforms
3. Flow for adding the event back in
*/
11
/* GLOBAL Parameters
 */
console.log(process.version)
// remove hard code
const COPY_BUFFER_COUNT = 10
const COPY_BUFFER_TIME = 1000 // this is in milliseconds
const COPY_MOUSE_BUFFER_SIZE = 10
const COPY_MOUSE_BUTTON_ACTIVATION_TIME = 3000
const SHORTCUT_SIZE_LIMIT = 10
const ioHook = require('iohook')
const {
  app,
  BrowserWindow,
  ipcMain,
  globalShortcut
} = require('electron')
const {
  clipboard,
  dialog
} = require('electron')

const configuration = require('./configuration')

var robot = require('robotjs')

// for mouse holding
var CircularBuffer = require('circular-buffer')
var keyMapper = require('./keyMapper')

// TODO: Need to decide how to refactor this... group into one object???
var textBufferTimer = new Array(COPY_BUFFER_COUNT)
var textBufferChecker = new Array(COPY_BUFFER_COUNT)
var textBufferFired = new Array(COPY_BUFFER_COUNT)
var textBufferContent = new Array(COPY_BUFFER_COUNT)

// MOUSE BUFFER GLOBAL VARIABLES
var mouseCircularBuffer = new CircularBuffer(COPY_BUFFER_COUNT)
var currentEvent = null
var mouseDown = false

var shortcutKeys = {}
var copyKeyConfig = 'quack'
// initialize all the global Arrays
function setAllTextArraysToDefault () {
  var n = COPY_BUFFER_COUNT
  for (var i = 0; i < n; ++i) {
    textBufferTimer[i] = new Date()
    textBufferChecker[i] = 0
    textBufferFired[i] = false
    textBufferContent[i] = ''
  }
  var n = SHORTCUT_SIZE_LIMIT
  for (i = 0; i < n; ++i) {
    shortcutKeys[i] = {}
  }
}

setAllTextArraysToDefault()

var readString = clipboard.readText()

// Or use `remote` from the renderer process.
// const {BrowserWindow} = require('electron').remote

var mainWindow = null
let bufferWindow = null
let circularBufferWindow = null
// Load a remote URL
app.on('ready', () => {
  // need to externalize window size
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600
  })
  mainWindow.on('closed', () => {
    mainWindow = null
    bufferWindow = null
    globalShortcut.unregisterAll()
  })
  mainWindow.loadURL('file://' + __dirname + '/app/index.html')
  setGlobalShortcuts()
  // REMOVE THIS LATER: mainWindow.hide()
  // let win = new BrowserWindow({transparent: true, frame: false})
  // win.show()
  ioHook.start()
})

app.on('before-quit', () => {
  ioHook.unload()
  ioHook.stop()
})

var content = clipboard.readText()
console.log('keyboard content' + content)

ipcMain.on('close-main-window', function () {
  app.quit()
})

/* This function shows the current window that is available
 */

function showBuffer () {
  // TODO: Parameterize width and height
  bufferWindow = new BrowserWindow({
    width: 400,
    height: 200,
    transparent: false
  })
  bufferWindow.loadURL(`file://${__dirname}/resources/app/index.html`)
  bufferWindow.webContents.on('did-finish-load', function () {
    bufferWindow.webContents.send('load-buffer', readString)
  })
}

ioHook.on('mouseup', event => {
  mouseDown = false
})

ioHook.on('mousedown', event => {
  console.log(event)
  currentEvent = event
  mouseDown = true
  waitBeforeCyclingBuffer()
  // remember to add mainwindow = null later.
})

function bufferKeyPressedWithModifier (event) {
  // TODO: REFACTOR WHEN CONFIGURATION Is SET
  /*
  var keycode = event.keycode
  if (keycode >= 2 && keycode <= 11 && event.ctrlKey === true) {
    return true
  }
  return false
  */
  for (var sKey in shortcutKeys) {
    console.log(sKey.keycode)
    var keyConfig = shortcutKeys[sKey]
    if (event.keycode == keyConfig.keycode) {
      var match = ensureModifierKeysMatch(event, keyConfig)
      return match
    }
  }
  return false
}

function ensureModifierKeysMatch (event, keyConfig) {
  for (var modifierKey in keyConfig) {
    var modifiersToCheck = []
    if (modifierKey != 'rawcode' && modifierKey != 'keycode') {
      if (keyConfig[modifierKey]) {
        modifiersToCheck.append(modifierKey)
      }
    }
    for (var modifiers in modifiersToCheck) {
      if (event[modifiers] === false) {
        return false
      }
    }
    return true
  }
  return false
}

/* The condition to hold down are relaxed here so that the user will have to hold
onto one button */
function bufferKeyReleased (event) {
  for (var sKey in shortcutKeys) {
    if (event.keycode == shortcutKeys[sKey].keycode) {
      return true
    }
  }
  return false
}
ioHook.on('keydown', event => {
  var number = keyMapper.getKeyFromCode(event.keycode)
  console.log(event)
  // keycode 46 is control c
  if (bufferKeyPressedWithModifier(event)) {
    if (textBufferFired[number] == false) {
      triggerBuffer(number)
      console.log('this is a numba fool')
      console.log(number)
      console.log(event)
      console.log(event.altKey)
    }
  }
  if (copyKeyTriggered(event)) {
    var text = clipboard.readText()
    mouseCircularBuffer.enqueue(text)
  }
})

function copyKeyTriggered (event) {
  for (var sKey in shortcutKeys) {
    console.log('k' + event.keycode)
    console.log('l' + copyKeyConfig.keycode)
    if (event.keycode == copyKeyConfig.keycode) {
      var keyConfig = shortcutKeys[sKey]
      if (event.keycode == keyConfig.keycode) {
        for (var modifierKey in keyConfig) {
          var modifiersToCheck = []
          if (modifierKey != 'rawcode' && modifierKey != 'keycode') {
            if (keyConfig[modifierKey]) {
              modifiersToCheck.append(modifierKey)
            }
          }
          for (var modifiers in modifiersToCheck) {
            if (event[modifiers] === false) {
              return false
            }

            return true
          }
          return false
        }
        return false
      }
    }
  }
}

ioHook.on('keyup', event => {
  if (bufferKeyReleased(event)) {
    console.log('event! whoo hoo!')
    var number = keyMapper.getKeyFromCode(event.keycode)
    if (textBufferFired[number] === true) {
      var curDate = new Date()
      var lastKeyDownDate = textBufferTimer[number]
      console.log('time diff')
      var diff = Math.abs(new Date() - lastKeyDownDate)
      console.log(lastKeyDownDate.toString())
      console.log(curDate.toString())
      console.log(diff)
      if (diff < COPY_BUFFER_TIME) {
        pasteBuffer(number)
      } else {
        saveBuffer(number)
      }
      textBufferFired[number] = false
    }
  }
})

// Register and start hook

function waitBeforeCyclingBuffer () {
  // this can cause a bug, may have to contniously monitor to see that mouse has been held. Single check may screw up.
  if (mouseDown) {
    console.log('hellooo')
    setTimeout(determineBufferCycling, COPY_MOUSE_BUTTON_ACTIVATION_TIME)
  }
}
function determineBufferCycling () {
  if (mouseDown) {
    cycleThroughBuffer()
  }
  return false
}

function cycleThroughBuffer () {
  for (var item in mouseCircularBuffer) {
    console.log(item)
  }
}

function saveBuffer (bufferNum) {
  var currentText = clipboard.readText()
  textBufferChecker[bufferNum] = 1
  textBufferTimer[bufferNum] = new Date()
  // this also needs to be externalized
  robot.keyTap('c', ['command'])
  textBufferContent[bufferNum] = clipboard.readText()
  clipboard.writeText(currentText)
  console.log('Content saved')
  console.log(readString)
}

function pasteBuffer (bufferNum) {
  // this is pretty much a classic swaparoo in CS
  if (textBufferChecker[bufferNum] === 1) {
    var currentText = clipboard.readText()
    console.log('buff num' + bufferNum)
    var textFromBuffer = textBufferContent[bufferNum]
    clipboard.writeText(textFromBuffer)
    robot.keyTap('v', ['command'])
    clipboard.writeText(currentText)
  }
}

function triggerBuffer (bufferNum) {
  textBufferTimer[bufferNum] = new Date()
  textBufferFired[bufferNum] = true
}

function setGlobalShortcuts () {
  globalShortcut.unregisterAll()
  const os = process.platform
  console.log(os)
  var shortcutConfig = configuration.readSettings(os)
  var i = 0
  for (var key in shortcutConfig) {
    console.log(shortcutConfig[key])
    if (key == 'copyKey') {
      copyKeyConfig = shortcutConfig[key]
      console.log(copyKeyConfig)
    } else {
      shortcutKeys[key] = shortcutConfig[key]
    }
  }
  // you need to loop afterwards
  /*
  console.log('shorty' + shortcutKeySetting1)
  console.log('shorty' + shortcutNum1)
  globalShortcut.register(shortcutKeySetting1, function () {
    mainWindow.webContents.send('global-shortcut', 0)
  })
  */
  // pop up paste buffer
  var nRegistered = globalShortcut.isRegistered('n')

  console.log('Is this registed??' + nRegistered)
  /*
  globalShortcut.register('n', function () {
    // showBuffer()
    for (var item in mouseCircularBuffer) {
      console.log(item)
    }
  })
  globalShortcut.register('m', function () {
    bufferWindow.webContents.send('inc-opq', readString)
  }) */
}
