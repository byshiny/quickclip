'use strict'

/*

STEPS:

1. Need to go get that circular buffer to store all values
2. Extenralize configuration keys or different platforms
3. Flow for adding the event back in
*/
/* GLOBAL Parameters
 */
// //log.info(process.version)
// remove hard code

const COPY_BUFFER_COUNT = 10
const COPY_BUFFER_TIME = 500 // this is in mif==0:illiseconds
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
const PASTE_DELAY = 300
const MOUSE_UP_COUNT = 5
var mouseDownAccum = 0 /// this is pretty much a accumilator or a counting queue
// OK, all of this needs to be converted to OO
var mouseUpAccum = MOUSE_UP_COUNT

var pasteStarted = false
var lastPressTime = new Date()

var copyMouseItemIdx = 0
var copyTimePassed = 0
var copyMouseInterval = null
var copyMouseIntervalStack = []
var currentEvent = null
var bufferCycling = false
var saveWindowHiding = false

//this is for keeping track of showing/hiding windows
var showOrHideShowWindow = true
var showOrHideCircularBufferWindow = true


var tray = 0
const SHORTCUT_KEY_LIMIT = 10
const ioHook = require('iohook')
const {
  app,
  BrowserWindow,
  ipcMain,
  globalShortcut,
  clipboard,
  dialog,
  nativeImage,
  Menu,
  Tray
} = require('electron')
var tray = null
const configuration = require('./configuration')
const stateSaver = require('./stateSaver')
const log = require('electron-log')
var robot = require('robotjs')
const path = require('path')

log.transports.console.level = 'debug';
// for mouse holding
var CircularBuffer = require('circular-buffer')
var keyMapper = require('./keyMapper')
// TODO: Need to decide how to refactor this... group into one object???
var textBufferTimer = new Object();
var textBufferChecker = new Object();
var textBufferFired = new Object();
var textBufferContent = new Object();

// this is to thread multiple interval checkers in case of bouncy touchpads
// again, global variable path is a terrible idea. I'm never doin this shit again.
// I thought there would be no more than 5.
var intervalIDArray = new Array(COPY_MOUSE_ACTIVATION_CHECK_COUNT)
var timePassedArray = new Array(COPY_MOUSE_ACTIVATION_CHECK_COUNT)
var mouseDownBooleanArray = new Array(COPY_MOUSE_ACTIVATION_CHECK_COUNT)
var mouseHoldCount = MOUSE_HOLD_COUNT
var trayIconNo = 0
for (var x = 0; x < COPY_MOUSE_ACTIVATION_CHECK_COUNT; x++) {
  timePassedArray[x] = 0
  mouseDownBooleanArray[x] = false
  intervalIDArray[x] = []
}

var fs = require('fs')
// replace with logging library
/*
var util = require('setAllTextArraysToDefault')
var log_file = fs.createWriteStream('./logs/debug.log', {
  flags: 'w'
})

var log_stdout = process.stdout

//log.info = function (d) { //
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

//these are configuration keys for show buffers 1 -n, circular buffer 
//queue show, and the key config that tracks how things are copied
var showKeyConfig = 'doodle'
var circBufferKeyConfig = 'woof'
var copyKeyConfig = 'quack'
var shortcutConfig = {}
// initialize all the global Arrays
function setAllTextMapsToDefault () {
  for (var key in shortcutConfig) {
    var strippedKey = key.replace('pasteBuffer','');
    textBufferTimer[strippedKey] = new Date()
    textBufferChecker[strippedKey] = 0
    textBufferFired[strippedKey] = false
    textBufferContent[strippedKey] = '=('
  }
  log.info("textbufferfired should be null")
  log.info(textBufferFired)
}

// Or use `remote` from the renderer process.
// const {BrowserWindow} = require('electron').remote

var mainWindow = null
let bufferWindow = null
let saveWindow = null
let showWindow = null
let circularBufferWindow = null
// Load a remote URL

/* This function shows the current window that is available
 */

//
// log.transports.file.level = 'warn'
// log.transports.file.format = '{h}:{i}:{s}:{ms} {text}'
//
// log.transports.console.level = false
// // Set approximate maximum log size in bytes. When it exceeds,
// // the archived log will be saved as the log.old.log file
// log.transports.file.maxSize = 5 * 1024 * 1024
//
// // Write to this file, must be set before first logging
// log.transports.file.file = path.join(__dirname, '/log.txt')

// fs.createWriteStream options, must be set before first logging
// you can find more information at
// https://nodejs.org/api/fs.html#fs_fs_createwritestream_path_options
log.transports.file.streamConfig = {
  flags: 'w'
}

// set existed file stream
// log.transports.file.stream = fs.createWriteStream('log.txt')

function showBuffer () {
  // TODO: Parameterize width and height
  bufferWindow = new BrowserWindow({
    width: 400,
    height: 200,
    transparent: false
  })
  bufferWindow.loadURL(`file://${__dirname}/resources/views/index.html`)
  bufferWindow.webContents.on('did-finish-load', function () {
    var readString = clipboard.readText()
    bufferWindow.webContents.send('load-buffer', readString)
  })
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
   log.info("???")
   log.info(shortcutKeys)
  for (var sKey in shortcutKeys) {
    
    var keyConfig = shortcutKeys[sKey]
    log.info('shortcut key codes' + keyConfig.keycode)
    log.info('shortcut key codes' + keyConfig)
    log.info(event.keycode)
    log.info(keyConfig.keycode)
    log.info(event.keycode == keyConfig.keycode)
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

//basically what this method does is it takes a set of attributes
//from json file, i.e. altKey = false, etc, and chooses a selection 
//of them to check over in ModiferKeysToCheck
function showKeysTriggered (event, keyConfig) {
  var modifiersToCheck = []
  log.info(event)
  for (var modifierKey in keyConfig) {
    log.info('modifiers check')
    log.info(modifierKey)

    //for show buffer, don't check rawcode or keycode
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

function triggerBuffer (bufferKey) {
  textBufferTimer[bufferKey] = new Date()
  textBufferFired[bufferKey] = true
}

function copyKeyTriggered (event) {
  if (event.keycode == copyKeyConfig.keycode) {
    var match = ensureModifierKeysMatch(event, copyKeyConfig)
    return match
  }
}

// Register and start hook


// effectively a delta to ensure that there isn't a single mousedown checkpoint of failure

function saveBuffer (keyValue) {
  var currentText = (' ' + clipboard.readText()).slice(1)
  log.info('buff num:' + keyValue + ' currentText:' + currentText)
  textBufferChecker[keyValue] = 1
  textBufferTimer[keyValue] = new Date()
  // this also needs to be externalized

  setTimeout(function () {
    robotCopyDelay(keyValue)
  }, 100)
}

function robotCopyDelay (keyValue) {
  robot.keyTap('c', ['command'])
  setTimeout(function () {
    anotherContext(keyValue)
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
  log.info('paste command pressed')
  setTimeout(function () {
    log.info('currenttext:' + currentText)
    clipboard.writeText(currentText)
  }, PASTE_DELAY)
}

function setGlobalShortcuts () {
  globalShortcut.unregisterAll()
  const os = process.platform
  shortcutConfig = configuration.readSettings(os)
  log.info("read ")
  log.info(shortcutConfig)
  var i = 0
  for (var key in shortcutConfig) {
    log.info("key")
    log.info(key)
    if (key == 'copyKey') {
      copyKeyConfig = shortcutConfig[key]
      log.info(copyKeyConfig)
    } else if (key == 'showKey') {
      showKeyConfig = shortcutConfig[key]
      // log.info(showKeyConfig)
    } else if (key == 'circBufferKey') {
      circBufferKeyConfig = shortcutConfig[key]
      // log.info(showKeyConfig)
    }  else {
      var strippedKey = key.replace('pasteBuffer','');
      shortcutKeys[strippedKey] = shortcutConfig[key]
    }
  }
  log.info("shortcutKeys")
  log.info(shortcutKeys)
}

// iohook setup

function resetTrayIconToZero () {
  trayIconNo = 0
  var trayStr = '' + trayIconNo + '.png'
  console.log(trayStr)
  const trayIcon = path.join(__dirname, 'resources/tray_numbers/' + trayStr)
  const nimage = nativeImage.createFromPath(trayIcon)
  tray.setImage(nimage)
}
app.on('ready', () => {
  // need to externalize window size
  // log.info(__dirname)
  const trayIcon = path.join(__dirname, 'resources/tray_numbers/0.png')
  const nimage = nativeImage.createFromPath(trayIcon)
  tray = new Tray(trayIcon)
  const contextMenu = Menu.buildFromTemplate([
    {label: 'Item1', type: 'radio'}
  ])
  tray.setToolTip('Quickclip!.')
  tray.setContextMenu(contextMenu)
  // tray.setHighlightMode('always')
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
  log.info("herro???")
  mainWindow.on('minimize', function (event) {
    event.preventDefault()
    mainWindow.hide()
  })
  mainWindow.on('defocus', function (event) {
    // log.info('da focused')
    mainWindow.hide()
  })
  // I'm scared this will cause an infinite loop with above
  mainWindow.on('hide', function (event) {
    // log.info('hidden')
    mainWindow.hide()
  })

  mainWindow.loadURL(`file://${__dirname}/resources/views/index.html`)
  // log.info(__dirname)

  saveWindow = new BrowserWindow({
    width: 250,
    height: 200,
    focusable: false
  })
  saveWindow.on('minimize', function (event) {
    event.preventDefault()
    saveWindow.hide() //not quite sure why I put this in here...
  })
  saveWindow.on('defocus', function (event) {
    // log.info('da focused')
    saveWindow.hide()
  })
  // I'm scared this will cause an infinite loop with above
  saveWindow.on('hide', function (event) {
    // log.info('hidden')
    saveWindow.hide()
  })

  saveWindow.loadURL(`file://${__dirname}/resources/views/savepop.html`)
  saveWindow.hide()



  // load circular buffer from save.json
  var circularBufferFromConfig = stateSaver.readValue('circularBuffer')
  // log.info(circularBufferFromConfig)

  var text = mouseCircularBuffer.deq()
  for (var x = circularBufferFromConfig.length - 1; x >= 0; x--) {
    // if you save 1 2 3 , you need to load 3 2 1
    mouseCircularBuffer.enq(circularBufferFromConfig[x])
  }
  mouseCircularBuffer.enq(text)
  // load key values from save.json
  setGlobalShortcuts()
  log.info("wtf")
  log.info(shortcutConfig)
  setAllTextMapsToDefault()
  var keyBufferFromConfig = stateSaver.readValue('keyBuffer')
  // log.info(keyBufferFromConfig)
  for (var key in keyBufferFromConfig) {
    if (keyBufferFromConfig.hasOwnProperty(key)) {
      var bufferNumber = key
      textBufferContent[bufferNumber] = keyBufferFromConfig[bufferNumber]
      if (textBufferContent[bufferNumber] != '=(') {
        textBufferChecker[bufferNumber] = 1
      }
      textBufferTimer[bufferNumber] = new Date()
      // log.info(bufferNumber + ' -> ' + textBufferContent[bufferNumber])
    }
  }

  // REMOVE THIS LATER: mainWindow.hide()
  // let win = new BrowserWindow({transparent: true, frame: false})
  // win.show()

  // IMPORTANT NOTE: NCONFG IS SAVED
  ioHook.start()

  // this is apparently caused by os 10.13 - need to fork the process and kill. Temporary solution found on github
})
app.on('before-quit', () => {
  stateSaver.saveValue('circularBuffer', mouseCircularBuffer.toarray())
  var saveObj = {}
  for (var key in textBufferContent){
    var strippedKey = key.replace('pasteBuffer','');
    saveObj[strippedKey] = textBufferContent[strippedKey]
  }
  stateSaver.saveValue('keyBuffer', saveObj)
  ioHook.unload()
  ioHook.stop()
})

ipcMain.on('close-main-window', function () {
  app.quit()
})
ipcMain.on('replace-copy-buffer', (event, textFromBuffer) => {
  log.info(textFromBuffer) // prints "ping"
  var currentText = clipboard.readText()
  clipboard.writeText(textFromBuffer)
  mouseCircularBuffer.enq(currentText)

})

ioHook.on('mouseup', event => {
  var pasteDateDiff = Math.abs(lastPressTime - new Date())

  if (pasteStarted && mouseDown && pasteDateDiff > 4000) {
    lastPressTime = new Date()
    // log.info('laste paste time' + lastPressTime)
    // DO NOT REMOVE THIS LINE! IF YOU DO, YOU'LL HAVE CONCURRENCY ISSUES
    pasteStarted = false
    log.info('possibly global variable clearning is an issue?')
    clearInterval(copyMouseInterval)
    // might need to add a delay here, because sometimes the update doesn't get
    // to the window fast enough
    pasteMouseCycleAndReset()
  }
  mouseDown = false
  pasteStarted = false
})
ioHook.on('keydown', event => {
  var keyValue = keyMapper.getKeyFromCode(event.keycode)
  // keycode 46 is control c
  if (bufferKeyPressedWithModifier(event)) {
    log.info('detected!')
    log.info("keyvalue")
    log.info(keyValue)
    log.info(textBufferFired)
    log.info(textBufferFired[keyValue] == false)
    if (textBufferFired[keyValue] == false) {
      log.info('text buffer triggered!')

      triggerBuffer(keyValue)
    }
    var lastKeyDownDate = textBufferTimer[keyValue]
    // log.info('goot time to save')
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
      // log.info('herro')
      // log.info(text)
      mouseCircularBuffer.enq(text)
    }, 100)
  }
  //show buffers 1 - n triggered
  if (showKeysTriggered(event, showKeyConfig)) {
    // this is an arificial delay for robotjs and os to register cmd + x
    // log.info('show me monies')
    if (showOrHideShowWindow) {
      if (showWindow == null) {
        loadShowWindow()
      } else {
        showWindow.show()
      }

      showOrHideShowWindow = !showOrHideShowWindow
      setTimeout(function () {
        var data = {}
        var savedBuffers = {}
        savedBuffers.textBufferTimer = textBufferTimer
        savedBuffers.textBufferChecker = textBufferChecker
        savedBuffers.textBufferFired = textBufferFired
        savedBuffers.textBufferContent = textBufferContent
        data.savedBuffers = savedBuffers
        log.info("where is my data")
        log.info(data)
        showWindow.webContents.send('load-buffer', data)
      }, 500)
    } else {
      if (showWindow != null) {
        showWindow.hide()
      }
        showOrHideShowWindow = !showOrHideShowWindow
      
    }
  }
  //show that circular buffer items have been triggered to new window
  if (showKeysTriggered(event, circBufferKeyConfig)) {
    // this is an arificial delay for robotjs and os to register cmd + x
    // log.info('show me monies')
    if (showOrHideCircularBufferWindow) {
      if (circularBufferWindow == null) {
        loadCircularBufferWindow()
      } else {
        circularBufferWindow.show()
      }

      showOrHideCircularBufferWindow = !showOrHideCircularBufferWindow
      setTimeout(function () {
        circularBufferWindow.webContents.send('load-circular-buffer', mouseCircularBuffer.toarray())
      }, 500)
    } else {
      if (showOrHideCircularBufferWindow != null) {
        circularBufferWindow.hide()
      }
      showOrHideCircularBufferWindow = !showOrHideCircularBufferWindow
      
    }
  }
  
})


//load buffer window 1 - n and show them on a separate window
function loadShowWindow () {
  showWindow = new BrowserWindow({
    width: 400,
    height: 600,
    focusable: false
  })
  showWindow.on('minimize', function (event) {
    event.preventDefault()
    saveWindow.hide()
  })
  showWindow.on('defocus', function (event) {
    // log.info('da focused')
    saveWindow.hide()
  })
  // I'm scared this will cause an infinite loop with above
  showWindow.on('hide', function (event) {
    // log.info('hidden')
    saveWindow.hide()
  })

  showWindow.on('close', function (event) {
    // log.info('hidden')
    showWindow = null
    showOrHideShowWindow = false
    saveWindow.hide()
  })
  showWindow.loadURL(`file://${__dirname}/resources/views/show.html`)
}

function loadCircularBufferWindow () {
  circularBufferWindow = new BrowserWindow({
    width: 400,
    height: 800,
    focusable: false
  })
  circularBufferWindow.on('minimize', function (event) {
    event.preventDefault()
    saveWindow.hide()
  })
  circularBufferWindow.on('defocus', function (event) {
    // log.info('da focused')
    saveWindow.hide()
  })
  // I'm scared this will cause an infinite loop with above
  circularBufferWindow.on('hide', function (event) {
    // log.info('hidden')
    saveWindow.hide()
  })

  circularBufferWindow.on('close', function (event) {
    // log.info('hidden')
    circularBufferWindow = null
    showOrHideCircularBufferWindow = false
    saveWindow.hide()
  })
  circularBufferWindow.loadURL(`file://${__dirname}/resources/views/circular.html`)
}


ioHook.on('keyup', event => {
  if (bufferKeyReleased(event)) {
    // log.info('buffer key released')
    var keyValue = keyMapper.getKeyFromCode(event.keycode)
    if (textBufferFired[keyValue] === true) {
      var curDate = new Date()
      var lastKeyDownDate = textBufferTimer[keyValue]
      // log.info('time diff')
      var diff = Math.abs(new Date() - lastKeyDownDate)
      // log.info(lastKeyDownDate.toString())
      // log.info(curDate.toString())
      // log.info(diff)
      // log.info(textBufferContent)
      if (diff < COPY_BUFFER_TIME) {
        // saveWindow.hide()
        Menu.sendActionToFirstResponder('hide:')
        pasteBuffer(keyValue)
      } else {
        // saveWindow.hide()
        Menu.sendActionToFirstResponder('hide:')
        // Menu.sendActionToFirstResponder('hide:')
        saveBuffer(keyValue)
      }
      textBufferFired[keyValue] = false
    }
  }
})
