'use strict'

/*

STEPS:

1. Need to go get that circular buffer to store all values
2. Extenralize configuration keys or different platforms
3. Flow for adding the event back in
*/
/* GLOBAL Parameters
 */
// console.log(process.version)
// remove hard code

const COPY_BUFFER_COUNT = 10
const COPY_BUFFER_TIME = 500 // this is in milliseconds
const COPY_MOUSE_BUFFER_SIZE = 10
const COPY_MOUSE_BUTTON_ACTIVATION_TIME = 1000
const COPY_MOUSE_BUTTON_ACTIVATION_CHECK_INTERVAL = 200
// ok technically this needs a mutex - that check...
const COPY_MOUSE_BUTTON_ACTIVATION_CHECK_INTERVAL_DIFF = 50
const COPY_MOUSE_CYCLE_INTERVAL = 1100
const COPY_MOUSE_ACTIVATION_CHECK_COUNT = 4
const OS = process.platform

const PASTE_DELAY = 50

// OK, all of this needs to be converted to OO
var pasteStarted = false
var copyMouseInterval = null
var copyMouseItemIdx = 0
var copyTimePassed = 0
var currentEvent = null
var bufferCycling = false
const SHORTCUT_KEY_LIMIT = 10
const ioHook = require('iohook')
const {
  app,
  BrowserWindow,
  ipcMain,
  globalShortcut,
  clipboard,
  dialog,
  Menu
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

// this is to thread multiple interval checkers in case of bouncy touchpads
// again, global variable path is a terrible idea. I'm never doin this shit again.
// I thought there would be no more than 5.
var intervalIDArray = new Array(COPY_MOUSE_ACTIVATION_CHECK_COUNT)
var timePassedArray = new Array(COPY_MOUSE_ACTIVATION_CHECK_COUNT)
var mouseDownBooleanArray = new Array(COPY_MOUSE_ACTIVATION_CHECK_COUNT)
for (var x = 0; x < COPY_MOUSE_ACTIVATION_CHECK_COUNT; x++) {
  intervalIDArray[x] = 0
  timePassedArray[x] = 0
  mouseDownBooleanArray[x] = false
}

var fs = require('fs')
var util = require('util')
var log_file = fs.createWriteStream('./logs/debug.log', {
  flags: 'w'
})
var log_stdout = process.stdout

console.log = function (d) { //
  log_file.write(util.format(d) + '\n')
  log_stdout.write(util.format(d) + '\n')
}
// redirect stdout / stderr
// constructor for mouse circular buffer

// MOUSE BUFFER GLOBAL VARIABLES
var mouseCircularBuffer = new CircularBuffer(COPY_BUFFER_COUNT)
mouseCircularBuffer.enq(clipboard.readText())
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
  var n = SHORTCUT_KEY_LIMIT
  for (i = 0; i < n; ++i) {
    shortcutKeys[i] = {}
  }
}

setAllTextArraysToDefault()

// Or use `remote` from the renderer process.
// const {BrowserWindow} = require('electron').remote

var mainWindow = null
let bufferWindow = null
let circularBufferWindow = null
// Load a remote URL

/* This function shows the current window that is available
 */

function showBuffer () {
  // TODO: Parameterize width and height
  bufferWindow = new BrowserWindow({
    width: 400,
    height: 200,
    transparent: false
  })
  bufferWindow.loadURL(`file://${__dirname}/resources/views/index.html`)
  bufferWindow.webContents.on('did-finish-load', function () {
    bufferWindow.webContents.send('load-buffer', readString)
  })
}

function startCircularBufferWindow () {
  if (circularBufferWindow == null) {
    circularBufferWindow = new BrowserWindow({
      width: 400,
      height: 200,
      transparent: false
    })
    circularBufferWindow.loadURL(`file://${__dirname}/resources/views/mousebuffer.html`)
    circularBufferWindow.show()
    copyTimePassed = 0
    circularBufferWindow.webContents.on('did-finish-load', function () {
      pasteStarted = true
      // this is to get that first buffer immediately
      cycleBufferWindow()
      copyMouseInterval = setInterval(function () {
        cycleBufferWindow()
      }, COPY_MOUSE_CYCLE_INTERVAL)
      // need to implement cycling logic there
    })
  } else {
    circularBufferWindow.show()
  }
  circularBufferWindow.on('minimize', function (event) {
    event.preventDefault()
    circularBufferWindow.hide()
  })
}

function cycleBufferWindow () {
  console.log('mousedownyyy')
  if (mouseDown) {
    copyTimePassed += COPY_MOUSE_CYCLE_INTERVAL
    console.log('cycling choo choo')
    copyMouseItemIdx++
    if (copyMouseItemIdx >= mouseCircularBuffer.size() || copyMouseItemIdx == -1) {
      copyMouseItemIdx = 0
    }
    circularBufferWindow.webContents.send('cycle-buffer', mouseCircularBuffer.get(copyMouseItemIdx))
    /* I'm adding a delay here because there is a change that the message doesn't reach the display fast enough
    then the code below will execute and cause massive confusion because there's a disrepency with the view */
  } else {
    setTimeout(function () {
      console.log('pasting')
      pasteMouseCycleAndReset()
    }, PASTE_DELAY)
  }
}

function pasteFromCircularBuffer (circularBufferIdx) {
  // this is pretty much a classic swaparoo in CS
  var currentText = (' ' + clipboard.readText()).slice(1)
  var textFromBuffer = mouseCircularBuffer.get(circularBufferIdx)
  // need to add zero error handling - nothing inside
  clipboard.writeText(textFromBuffer)
  setTimeout(function () {
    pasteCommand(currentText)
  }, PASTE_DELAY)
}

function pasteMouseCycleAndReset () {
  copyTimePassed = 0
  pasteStarted = false
  mouseDown = false

  console.log('os' + OS)
  if (OS == 'darwin') {
    // mainWindow.minimize()
    Menu.sendActionToFirstResponder('hide:')
    // circularBufferWindow.hide()
  }
  if (OS == 'win32') {
    circularBufferWindow.hide()
  }
  pasteFromCircularBuffer(copyMouseItemIdx)
  bufferCycling = false
}

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

function triggerBuffer (bufferNum) {
  textBufferTimer[bufferNum] = new Date()
  textBufferFired[bufferNum] = true
}

function copyKeyTriggered (event) {
  if (event.keycode == copyKeyConfig.keycode) {
    var match = ensureModifierKeysMatch(event, copyKeyConfig)
    return match
  }
}

// Register and start hook

function waitBeforeCyclingBuffer () {
  // this can cause a bug, may have to contniously monitor to see that mouse has been held. Single check may screw up.

  for (var x = 0; x < COPY_MOUSE_ACTIVATION_CHECK_COUNT; x++) {
    timePassedArray[x] = 0
    console.log('time pass init' + timePassedArray[x])
  }
  // since mouse clicks go up and down, the wait period might miss a few increments
  // solution: create four interval ids. If one of them is true(set it in a ored variable), then it's triggered.
  for (var y = 0; y < COPY_MOUSE_ACTIVATION_CHECK_COUNT; y++) {
    intervalIDArray[y] = setInterval(createMouseDownChecker(y), COPY_MOUSE_BUTTON_ACTIVATION_CHECK_INTERVAL + COPY_MOUSE_BUTTON_ACTIVATION_CHECK_INTERVAL_DIFF * y)
  }
}

function createMouseDownChecker (val) {
  return function () {
    mouseDownChecker(val)
  }
}

function mouseDownChecker (chkrIdx) {
  var activationTimeLimit = COPY_MOUSE_BUTTON_ACTIVATION_TIME
  mouseDownBooleanArray[chkrIdx] = mouseDown
  console.log(chkrIdx + 'mouse down' + mouseDownBooleanArray[chkrIdx])
  // if one of the instances have been pressed, then check for the time
  if (checkIfMouseStillPressed(mouseDownBooleanArray)) {
    console.log(chkrIdx)
    timePassedArray[chkrIdx] += COPY_MOUSE_BUTTON_ACTIVATION_CHECK_INTERVAL + COPY_MOUSE_BUTTON_ACTIVATION_CHECK_INTERVAL_DIFF * chkrIdx
    // console.log(chkrIdx)
    console.log('time pas' + timePassedArray[chkrIdx])
    // start the copy mouse

    if (timePassedArray[chkrIdx] > activationTimeLimit) {
      // this needs a mutex

      if (!bufferCycling) {
        bufferCycling = true
        console.log('cycle started at item' + chkrIdx)
        cycleThroughBuffer()
        clearInterval(intervalIDArray[chkrIdx])
      } else {
        clearInterval(intervalIDArray[chkrIdx])
      }
      clearInterval(intervalIDArray[chkrIdx])
      for (var x = 0; x < COPY_MOUSE_ACTIVATION_CHECK_COUNT; x++) {
        mouseDownBooleanArray[x] = false
      }
    }
    // if
    else {
      //  clearInterval(intervalIDArray[chkrIdx])
      // don't do anything, keep waiting...
    }
  } else {
    for (var x = 0; x < COPY_MOUSE_ACTIVATION_CHECK_COUNT; x++) {
      mouseDownBooleanArray[x] = false
    }
    clearInterval(intervalIDArray[chkrIdx])
  }
}
// effectively a delta to ensure that there isn't a single mousedown checkpoint of failure

function checkIfMouseStillPressed (mouseDownBooleanArray) {
  var mouseHeld = false
  for (var i = 0; i < mouseDownBooleanArray.length; i++) {
    mouseHeld = mouseHeld || mouseDownBooleanArray[i]
  }
  for (var x = 0; x < COPY_MOUSE_ACTIVATION_CHECK_COUNT; x++) {
    mouseDownBooleanArray[x] = false
  }
  return mouseHeld
}

function cycleThroughBuffer () {
  console.log('heyyoo')
  for (var x = 0; x < mouseCircularBuffer.size(); x++) {
    console.log('circ buffer contents' + mouseCircularBuffer.get(x))
  }
  startCircularBufferWindow()
}

function saveBuffer (bufferNum) {
  var currentText = (' ' + clipboard.readText()).slice(1)
  console.log('buff num:' + bufferNum + ' currentText:' + currentText)
  textBufferChecker[bufferNum] = 1
  textBufferTimer[bufferNum] = new Date()
  // this also needs to be externalized

  setTimeout(function () {
    robotCopyDelay(bufferNum)
  }, 100)
}

function robotCopyDelay (bufferNum) {
  robot.keyTap('c', ['command'])
  setTimeout(function () {
    anotherContext(bufferNum)
  }, 100)
}

function anotherContext (bufferNum) {
  textBufferContent[bufferNum] = (' ' + clipboard.readText()).slice(1)
  clipboard.writeText(textBufferContent[bufferNum])
}

function pasteBuffer (bufferNum) {
  // this is pretty much a classic swaparoo in CS
  if (textBufferChecker[bufferNum] === 1) {
    // WATCH OUT FOR THIS FUCKING LINE
    var currentText = (' ' + clipboard.readText()).slice(1)
    var textFromBuffer = textBufferContent[bufferNum]

    clipboard.writeText(textFromBuffer)
    setTimeout(function () {
      pasteCommand(currentText)
    }, PASTE_DELAY)
  }
}

function pasteCommand (currentText) {
  // all the stuff you want to happen after that pause
  robot.keyTap('v', ['command'])
  console.log('is this a reference to a pointer?' + clipboard.readText())
  setTimeout(function () {
    console.log('currenttext:' + currentText)
    clipboard.writeText(currentText)
    circularBufferWindow.hide()
  }, PASTE_DELAY)
}

function setGlobalShortcuts () {
  globalShortcut.unregisterAll()
  const os = process.platform
  var shortcutConfig = configuration.readSettings(os)
  var i = 0
  for (var key in shortcutConfig) {
    if (key == 'copyKey') {
      copyKeyConfig = shortcutConfig[key]
      console.log(copyKeyConfig)
    } else {
      shortcutKeys[key] = shortcutConfig[key]
    }
  }
  // you need to loop afterwards
  /*
      globalShortcut.register(shortcutKeySetting1, function () {
        mainWindow.webContents.send('global-shortcut', 0)
      })
      */
  // pop up paste buffer
  var nRegistered = globalShortcut.isRegistered('n')

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

// iohook setup

app.on('ready', () => {
  // need to externalize window size
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    focusable: false
  })
  mainWindow.on('closed', () => {
    mainWindow = null
    bufferWindow = null
    globalShortcut.unregisterAll()
  })
  mainWindow.on('minimize', function (event) {
    event.preventDefault()
    mainWindow.hide()
  })
  mainWindow.loadURL(`file://${__dirname}/resources/views/index.html`)
  console.log(__dirname)
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

ipcMain.on('close-main-window', function () {
  app.quit()
})

ioHook.on('mouseup', event => {
  if (pasteStarted) {
    // DO NOT REMOVE THIS LINE! IF YOU DO, YOU'LL HAVE CONCURRENCY ISSUES
    clearInterval(copyMouseInterval)
    pasteStarted = false
    pasteMouseCycleAndReset()
  }
  mouseDown = false
})
ioHook.on('keydown', event => {
  var number = keyMapper.getKeyFromCode(event.keycode)
  // keycode 46 is control c
  if (bufferKeyPressedWithModifier(event)) {
    console.log('dtected!')
    if (textBufferFired[number] == false) {
      triggerBuffer(number)
    }
  }
  if (copyKeyTriggered(event)) {
    // this is an arificial delay for robotjs and os to register cmd + x
    setTimeout(function () {
      var text = clipboard.readText()
      console.log('herro')
      console.log(text)
      mouseCircularBuffer.enq(text)
    }, 100)
  }
})

ioHook.on('keyup', event => {
  if (bufferKeyReleased(event)) {
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

ioHook.on('mousedown', event => {
  currentEvent = event
  mouseDown = true
  console.log(event)
  // this is prety much a mutex
  if (!pasteStarted) {
    waitBeforeCyclingBuffer()
  }
  // remember to add mainwindow = null later.
})
