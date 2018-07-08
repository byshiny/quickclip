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
const COPY_BUFFER_TIME = 2000
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
var electron = require('electron')

var CircularBuffer = require('circular-buffer')
var keyMapper = require('./keyMapper')

var copyBuf = new CircularBuffer(COPY_BUFFER_COUNT)

var textBufferTimer = new Array(COPY_BUFFER_COUNT)
var textBufferChecker = new Array(COPY_BUFFER_COUNT)
var textBufferFired = new Array(COPY_BUFFER_COUNT)
var textBufferContent = new Array(COPY_BUFFER_COUNT)
// initialize all the global Arrays
function setAllTextArraysToDefault () {
  var i; var n = COPY_BUFFER_COUNT
  for (i = 0; i < n; ++i) {
    textBufferTimer[i] = new Date()
    textBufferChecker[i] = 0
    textBufferFired[i] = false
    textBufferContent[i] = ''
  }
}

setAllTextArraysToDefault()

var readString = clipboard.readText()
console.log('copy text')
console.log(readString)
console.log(copyBuf.capacity()) // -> 3
copyBuf.enq(readString)

// Or use `remote` from the renderer process.
// const {BrowserWindow} = require('electron').remote

var mainWindow = null
let bufferWindow = null
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

var copyBuffer = new CircularBuffer(COPY_BUFFER_COUNT)

var currentEvent = null
var mouseDown = false
/*
ioHook.on('keydown', event => {
  console.log(event); // { type: 'mousemove', x: 700, y: 400 }
  showBuffer();
});
*/
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

/*
ioHook.on("mousewheel", event => {
  console.log(event);
  currentEvent = event;
  mouseDown = true;
});

ioHook.on("mouseup", event => {
  console.log(event);
  currentEvent = event;
  mouseDown = false;
  //remember to add mainwindow = null later.
});
*/
function bufferKeyPressed (event) {
  // TODO: REFACTOR WHEN CONFIGURATION Is SET
  var keycode = event.keycode
  if (keycode >= 2 && keycode <= 11) {
    return true
  }
  return false
}
ioHook.on('keydown', event => {
  var number = keyMapper.getKeyFromCode(event.keycode)
  if (bufferKeyPressed(event)) {
    if (textBufferFired[number] == false) {
      triggerBuffer(number)
      console.log('this is a numba fool')
      console.log(number)
      console.log(event)
      console.log(event.altKey)
    }
  }
})

ioHook.on('keyup', event => {
  if (bufferKeyPressed(event)) {
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

function callEvent () {
  if (mouseDown) {
    console.log('hellooo')
    setTimeout(callEvent, 1000)
  } else {

  }
}
function saveBuffer (bufferNum) {
  var readString = clipboard.readText()
  textBufferChecker[bufferNum] = 1
  textBufferContent[bufferNum] = readString
  textBufferTimer[bufferNum] = new Date()
  console.log('Content saved')
  console.log(readString)
}
function pasteBuffer (bufferNum) {
  // this is pretty much a classic swaparoo in CS
  var currentText = clipboard.readText()
  console.log('buff num' + bufferNum)
  var textFromBuffer = textBufferContent[bufferNum]
  clipboard.writeText(textFromBuffer)
  robot.keyTap('v', ['command'])
  clipboard.writeText(currentText)
}

function triggerBuffer (bufferNum) {
  textBufferTimer[bufferNum] = new Date()
  textBufferFired[bufferNum] = true
}

function setGlobalShortcuts () {
  globalShortcut.unregisterAll()

  var osKey = configuration.readSettings('os')
  console.log('oskkyy ' + osKey)
  var shortcutKeySettingJSON = configuration.readSettings(osKey)

  // you need to loop afterwards
  var shortcutKeySetting1 = shortcutKeySettingJSON.pasteBuffer1.shortcutKeys
  var shortcutNum1 = shortcutKeySettingJSON.pasteBuffer1.num
  var shortcutKeySetting2 = shortcutKeySettingJSON.pasteBuffer2.shortcutKeys
  var shortcutNum2 = shortcutKeySettingJSON.pasteBuffer2.num
  console.log('shorty' + shortcutKeySetting1)
  console.log('shorty' + shortcutNum1)
  globalShortcut.register(shortcutKeySetting1, function () {
    mainWindow.webContents.send('global-shortcut', 0)
  })
  // pop up paste buffer
  var nRegistered = globalShortcut.isRegistered('n')

  console.log('Is this registed??' + nRegistered)

  globalShortcut.register('n', function () {
    showBuffer()
  })
  globalShortcut.register('m', function () {
    bufferWindow.webContents.send('inc-opq', readString)
  })
  // need to loop to register all shortcuts
  console.log('register check ' + globalShortcut.isRegistered(shortcutKeySetting1))
  globalShortcut.register(shortcutKeySetting1, function () {
    showBuffer()
  })
}
