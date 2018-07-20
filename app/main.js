'use strict'

/*

STEPS:

1. Need to go get that circular buffer to store all values
2. Extenralize configuration keys or different platforms
3. Flow for adding the event back in
*/
/* GLOBAL Parameters
 */
// log.info(process.version)
// remove hard code

const COPY_BUFFER_COUNT = 10
const COPY_BUFFER_TIME = 500 // this is in milliseconds
const COPY_MOUSE_BUFFER_SIZE = 10
const COPY_MOUSE_BUTTON_ACTIVATION_TIME = 3000
const COPY_MOUSE_BUTTON_ACTIVATION_CHECK_INTERVAL = 200
// ok technically this needs a mutex - that check...

const COPY_MOUSE_CYCLE_INTERVAL = 1100
const COPY_MOUSE_ACTIVATION_CHECK_COUNT = 4
const MOUSE_HOLD_COUNT = 50
const OS = process.platform

const MOUSE_CHECK_TIME = 40
const MOUSE_ACCUM_CAP = 80 // at 40 seconds, must reach a cap of 80
const PASTE_DELAY = 50
const MOUSE_UP_COUNT = 5
var mouseDownAccum = 0 /// this is pretty much a accumilator or a counting queue
// OK, all of this needs to be converted to OO
var mouseUpAccum = MOUSE_UP_COUNT

var pasteStarted = false
var copyMouseIntervalStack = []
var copyMouseItemIdx = 0
var copyTimePassed = 0
var currentEvent = null
var bufferCycling = false
var saveWindowHiding = false
var showOrHideShowWindow = true
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
const stateSaver = require('./stateSaver')
const log = require('electron-log')
// log.transports.console.level = 'warn';
var robot = require('robotjs')
const path = require('path')

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
var mouseHoldCount = MOUSE_HOLD_COUNT

for (var x = 0; x < COPY_MOUSE_ACTIVATION_CHECK_COUNT; x++) {
  timePassedArray[x] = 0
  mouseDownBooleanArray[x] = false
  intervalIDArray[x] = []
}

var fs = require('fs')
// replace with logging library
/*
var util = require('util')
var log_file = fs.createWriteStream('./logs/debug.log', {
  flags: 'w'
})

var log_stdout = process.stdout

log.info = function (d) { //
  log_file.write(util.format(d) + '\n')
  log_stdout.write(util.format(d) + '\n')
}
*/
// redirect stdout / stderr
// constructor for mouse circular buffer

// MOUSE BUFFER GLOBAL VARIABLES
var mouseCircularBuffer = new CircularBuffer(COPY_BUFFER_COUNT)
mouseCircularBuffer.enq(clipboard.readText())
var mouseDown = false

var shortcutKeys = {}
var showKeyConfig = 'doodle'
var copyKeyConfig = 'quack'
// initialize all the global Arrays
function setAllTextArraysToDefault () {
  var n = COPY_BUFFER_COUNT
  for (var i = 0; i < n; ++i) {
    textBufferTimer[i] = new Date()
    textBufferChecker[i] = 0
    textBufferFired[i] = false
    textBufferContent[i] = '=('
  }
  var n = SHORTCUT_KEY_LIMIT
  for (i = 0; i < n; ++i) {
    shortcutKeys[i] = {}
  }
}

// Or use `remote` from the renderer process.
// const {BrowserWindow} = require('electron').remote

var mainWindow = null
let bufferWindow = null
let circularBufferWindow = null
let saveWindow = null
let showWindow = null
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
    var copyMouseInterval = setInterval(function () {
      cycleBufferWindow()
    }, COPY_MOUSE_CYCLE_INTERVAL)
    copyMouseIntervalStack.push(copyMouseInterval)
    // need to implement cycling logic there
  })
}

function cycleBufferWindow () {
  log.info('mousedownyyy')
  if (mouseDown) {
    copyTimePassed += COPY_MOUSE_CYCLE_INTERVAL
    log.info('cycling choo choo')
    copyMouseItemIdx++
    if (copyMouseItemIdx >= mouseCircularBuffer.size() || copyMouseItemIdx == -1) {
      copyMouseItemIdx = 0
    }
    circularBufferWindow.webContents.send('cycle-buffer', mouseCircularBuffer.get(copyMouseItemIdx))
    /* I'm adding a delay here because there is a change that the message doesn't reach the display fast enough
    then the code below wil execute and cause massive confusion because there's a disrepency with the view */
  } else {
    setTimeout(function () {
      log.info('pasting')
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

  log.info('os' + OS)
  if (OS == 'darwin') {
    Menu.sendActionToFirstResponder('hide:')
  }
  if (OS == 'win32') {
    if (circularBufferWindow != null) {
      circularBufferWindow.close()
    }
  }
  pasteFromCircularBuffer(copyMouseItemIdx)
  pasteStarted = false
  mouseDown = true
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
    */log.info(shortcutKeys)
  log.info('Event key code' + event.keycode)
  for (var sKey in shortcutKeys) {
    var keyConfig = shortcutKeys[sKey]
    log.info('shortcut key code' + keyConfig.keycode)
    log.info('shortcut key code' + keyConfig)
    if (event.keycode == keyConfig.keycode) {
      var match = ensureModifierKeysMatch(event, keyConfig)
      return match
    }
  }
  return false
}

function ensureModifierKeysMatch (event, keyConfig) {
  var modifiersToCheck = []
  log.info(event)
  for (var modifierKey in keyConfig) {
    log.info('modifiers check')
    log.info(modifierKey)

    if (modifierKey != 'rawcode' && modifierKey != 'keycode') {
      if (keyConfig[modifierKey]) {
        modifiersToCheck.push(modifierKey)
      }
    }
  }
  log.info('modifiers to check' + modifiersToCheck)
  for (var modIdx in modifiersToCheck) {
    var modifier = modifiersToCheck[modIdx]
    if (event[modifier] == false) {
      return false
    }
  }
  if (modifiersToCheck.length == 0) {
    return false
  }
  return true
}

function showKeysTriggered (event, keyConfig) {
  var modifiersToCheck = []
  log.info(event)
  for (var modifierKey in keyConfig) {
    log.info('modifiers check')
    log.info(modifierKey)

    if (modifierKey != 'rawcode' && modifierKey != 'keycode') {
      if (keyConfig[modifierKey]) {
        modifiersToCheck.push(modifierKey)
      }
    }
  }
  log.info('modifiers to check' + modifiersToCheck)
  for (var modIdx in modifiersToCheck) {
    var modifier = modifiersToCheck[modIdx]
    if (event[modifier] == false) {
      return false
    }
  }
  if (modifiersToCheck.length == 0) {
    return false
  }
  if (modifiersToCheck.length < 2) {
    return false
  }
  return true
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
    log.info('time pass init' + timePassedArray[x])
  }
  // since mouse clicks go up and down, the wait period might miss a few increments
  // solution: create four interval ids. If one of them is true(set it in a ored variable), then it's triggered.
  var interval = setInterval(function () {
    mouseDownAccum++
    console.log(mouseDownAccum)
    if (mouseDown) {
      if (mouseDownAccum > MOUSE_ACCUM_CAP) {
        mouseDownAccum = MOUSE_ACCUM_CAP
        if (!bufferCycling) {
          bufferCycling = true
          startCircularBufferWindow()
        }
      }
    } else {
      mouseDownAccum--
      mouseUpAccum--
    }
    if (mouseUpAccum <= 0) {
      clearInterval(interval)
      mouseUpAccum = MOUSE_UP_COUNT
      mouseDownAccum = 0
    }
  }, MOUSE_CHECK_TIME)
}

// effectively a delta to ensure that there isn't a single mousedown checkpoint of failure

function saveBuffer (bufferNum) {
  var currentText = (' ' + clipboard.readText()).slice(1)
  log.info('buff num:' + bufferNum + ' currentText:' + currentText)
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
    log.info('buffer checker is set')
    var currentText = (' ' + clipboard.readText()).slice(1)
    var textFromBuffer = textBufferContent[bufferNum]
    log.info(textBufferContent)
    clipboard.writeText(textFromBuffer)
    setTimeout(function () {
      pasteCommand(currentText)
    }, PASTE_DELAY)
  }
}

function pasteCommand (currentText) {
  // all the stuff you want to happen after that pause
  robot.keyTap('v', ['command'])
  log.info('is this a reference to a pointer?' + clipboard.readText())
  setTimeout(function () {
    log.info('currenttext:' + currentText)
    clipboard.writeText(currentText)
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
      log.info(copyKeyConfig)
    } else if (key == 'showKey') {
      showKeyConfig = shortcutConfig[key]
      log.info(showKeyConfig)
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
  // var nRegistered = globalShortcut.isRegistered('n')

  /*
      globalShortcut.register('n', function () {
        // showBuffer()
        for (var item in mouseCircularBuffer) {
          log.info(item)
        }
      })
      globalShortcut.register('m', function () {
        bufferWindow.webContents.send('inc-opq', readString)
      }) */
}

// iohook setup

function restoreSaveState () {

}

app.on('ready', () => {
  // need to externalize window size
  log.info(__dirname)
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    focusable: false,
    icon: path.join(__dirname, 'assets/quickclip.png')
  })
  mainWindow.on('closed', () => {
    mainWindow = null
    bufferWindow = null
    globalShortcut.unregisterAll()
    app.quit()
  })

  mainWindow.on('minimize', function (event) {
    event.preventDefault()
    mainWindow.hide()
  })
  mainWindow.on('defocus', function (event) {
    log.info('da focused')
    mainWindow.hide()
  })
  // I'm scared this will cause an infinite loop with above
  mainWindow.on('hide', function (event) {
    log.info('hidden')
    mainWindow.hide()
  })

  mainWindow.loadURL(`file://${__dirname}/resources/views/index.html`)
  log.info(__dirname)

  saveWindow = new BrowserWindow({
    width: 250,
    height: 200,
    focusable: false
  })
  saveWindow.on('minimize', function (event) {
    event.preventDefault()
    saveWindow.hide()
  })
  saveWindow.on('defocus', function (event) {
    log.info('da focused')
    saveWindow.hide()
  })
  // I'm scared this will cause an infinite loop with above
  saveWindow.on('hide', function (event) {
    log.info('hidden')
    saveWindow.hide()
  })

  saveWindow.loadURL(`file://${__dirname}/resources/views/savepop.html`)
  saveWindow.hide()
  // load circular buffer from save.json
  var circularBufferFromConfig = stateSaver.readValue('circularBuffer')
  log.info(circularBufferFromConfig)

  var text = mouseCircularBuffer.deq()
  for (var x = circularBufferFromConfig.length - 1; x >= 0; x--) {
    // if you save 1 2 3 , you need to load 3 2 1
    mouseCircularBuffer.enq(circularBufferFromConfig[x])
  }
  mouseCircularBuffer.enq(text)
  // load key values from save.json
  setAllTextArraysToDefault()
  var keyBufferFromConfig = stateSaver.readValue('keyBuffer')
  log.info(keyBufferFromConfig)
  for (var key in keyBufferFromConfig) {
    if (keyBufferFromConfig.hasOwnProperty(key)) {
      var bufferNumber = key
      textBufferContent[bufferNumber] = keyBufferFromConfig[bufferNumber]
      if (textBufferContent[bufferNumber] != '=(') { textBufferChecker[bufferNumber] = 1 }
      textBufferTimer[bufferNumber] = new Date()
      log.info(bufferNumber + ' -> ' + textBufferContent[bufferNumber])
    }
  }

  /*
  log.info(mouseCircularBuffer.size())
  for (var x = 0; x < mouseCircularBuffer.size(); x++) {
    // if you save 1 2 3 , you need to load 3 2 1
    log.info(mouseCircularBuffer.get(x))
  } */

  // REMOVE THIS LATER: mainWindow.hide()
  // let win = new BrowserWindow({transparent: true, frame: false})
  // win.show()

  // IMPORTANT NOTE: NCONFG IS SAVED
  setGlobalShortcuts()
  { ioHook.start() }
})

app.on('before-quit', () => {
  stateSaver.saveValue('circularBuffer', mouseCircularBuffer.toarray())
  var saveObj = {}
  for (var x = 0; x < textBufferContent.length; x++) {
    saveObj[x] = textBufferContent[x]
  }
  stateSaver.saveValue('keyBuffer', saveObj)
  ioHook.unload()
  ioHook.stop()
})

ipcMain.on('close-main-window', function () {
  app.quit()
})

ioHook.on('mouseup', event => {
  if (pasteStarted && mouseDown) {
    // DO NOT REMOVE THIS LINE! IF YOU DO, YOU'LL HAVE CONCURRENCY ISSUES
    while (copyMouseIntervalStack.length > 0) {
      var copyMouseInterval = copyMouseIntervalStack.pop()
      clearInterval(copyMouseInterval)
    }
    pasteStarted = false
    circularBufferWindow.close()
    pasteMouseCycleAndReset()
  }
  mouseDown = false
  pasteStarted = false
})
ioHook.on('keydown', event => {
  var number = keyMapper.getKeyFromCode(event.keycode)
  // keycode 46 is control c
  if (bufferKeyPressedWithModifier(event)) {
    log.info('detected!')
    if (textBufferFired[number] == false) {
      log.info('text buffer triggered!')
      triggerBuffer(number)
    }
    var lastKeyDownDate = textBufferTimer[number]
    log.info('goot time to save')
    var diff = Math.abs(new Date() - lastKeyDownDate)
    var saveTimeObj = {}
    if (!saveWindowHiding) {
      saveWindow.show()
      saveWindowHiding = false
    }
    if (diff > COPY_BUFFER_TIME) {
      saveTimeObj.save = 'Savable'
      saveTimeObj.time = String((diff / 1000).toPrecision(3)) + 'seconds'
      saveWindow.webContents.send('load-state-time', saveTimeObj)
      saveWindow.show()
    } else {
      saveTimeObj = {}
      saveTimeObj.save = 'Unsavable'
      saveTimeObj.time = String((diff / 1000).toPrecision(3)) + 'seconds'
      saveWindow.webContents.send('load-state-time', saveTimeObj)
      saveWindow.show()
    }
  }
  if (copyKeyTriggered(event)) {
    // this is an arificial delay for robotjs and os to register cmd + x
    setTimeout(function () {
      var text = clipboard.readText()
      log.info('herro')
      log.info(text)
      mouseCircularBuffer.enq(text)
    }, 100)
  }
  if (showKeysTriggered(event, showKeyConfig)) {
  // this is an arificial delay for robotjs and os to register cmd + x
    console.log('show me monies')
    if (showOrHideShowWindow) {
      if (showWindow == null) {
        loadShowWindow()
      } else {
        showWindow.show()
      }

      showOrHideShowWindow = !showOrHideShowWindow
      setTimeout(function () {
        var textObj = {}
        textObj.textBufferTimer = textBufferTimer
        textObj.textBufferChecker = textBufferChecker
        textObj.textBufferFired = textBufferFired
        textObj.textBufferContent = textBufferContent
        showWindow.webContents.send('load-buffer', textObj)
      }, 500)
    } else {
      if (showWindow != null) {
        showWindow.close()
        showOrHideShowWindow = !showOrHideShowWindow
      }
    }
  }
})
function loadShowWindow () {
  showWindow = new BrowserWindow({
    width: 400,
    height: 800,
    focusable: false
  })
  showWindow.on('minimize', function (event) {
    event.preventDefault()
    saveWindow.hide()
  })
  showWindow.on('defocus', function (event) {
    log.info('da focused')
    saveWindow.hide()
  })
  // I'm scared this will cause an infinite loop with above
  showWindow.on('hide', function (event) {
    log.info('hidden')
    saveWindow.hide()
  })

  showWindow.on('close', function (event) {
    log.info('hidden')
    saveWindow.hide()
    showWindow = null
  })
  showWindow.loadURL(`file://${__dirname}/resources/views/show.html`)
}

ioHook.on('keyup', event => {
  if (bufferKeyReleased(event)) {
    log.info('buffer key released')
    var number = keyMapper.getKeyFromCode(event.keycode)
    if (textBufferFired[number] === true) {
      var curDate = new Date()
      var lastKeyDownDate = textBufferTimer[number]
      log.info('time diff')
      var diff = Math.abs(new Date() - lastKeyDownDate)
      log.info(lastKeyDownDate.toString())
      log.info(curDate.toString())
      log.info(diff)
      log.info(textBufferContent)
      if (diff < COPY_BUFFER_TIME) {
        saveWindow.hide()
        Menu.sendActionToFirstResponder('hide:')
        pasteBuffer(number)
      } else {
        saveWindow.hide()
        Menu.sendActionToFirstResponder('hide:')
        // Menu.sendActionToFirstResponder('hide:')
        saveBuffer(number)
      }
      textBufferFired[number] = false
    }
  }
})

ioHook.on('mousedown', event => {
  currentEvent = event
  log.info(event)
  // this is prety much a mutex
  if (!pasteStarted && !mouseDown) {
    waitBeforeCyclingBuffer()
  }
  mouseDown = true

  // remember to add mainwindow = null later.
})
