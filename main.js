'use strict';

/*

STEPS:

1. Need to go get that circular buffer to store all values
2. Extenralize configuration keys or different platforms
3. Flow for adding the event back in
*/

/* GLOBAL Parameters
 */
console.log(process.version)
var COPY_BUFFER_SIZE = 10;

const ioHook = require('iohook');
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

var robot = require("robotjs")
var electron = require('electron')

var CircularBuffer = require("circular-buffer");

var copyBuf = new CircularBuffer(COPY_BUFFER_SIZE);

var textBufferArray = new Array(10);
var textBufferChecker = new Array(10);
var textBufferTimer = new Array(10);

var readString = clipboard.readText();
console.log("copy text");
console.log(readString);
console.log(copyBuf.capacity()); // -> 3
copyBuf.enq(readString);



// Or use `remote` from the renderer process.
// const {BrowserWindow} = require('electron').remote


var mainWindow = null;
let bufferWindow = null;
// Load a remote URL
app.on('ready', () => {

  //need to externalize window size
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600
  })
  mainWindow.on('closed', () => {
    mainWindow = null
  })
  mainWindow.loadURL('https://github.com')
  setGlobalShortcuts();
  //REMOVE THIS LATER: mainWindow.hide()
  //let win = new BrowserWindow({transparent: true, frame: false})
  //win.show()
  ioHook.start();
})

var content = clipboard.readText();
console.log("keyboard content" + content);

ipcMain.on('close-main-window', function() {
  app.quit();
});


var copyBuffer = new CircularBuffer(COPY_BUFFER_SIZE);

var currentEvent = null;
var mouseDown = false;
/*
ioHook.on('keydown', event => {
  console.log(event); // { type: 'mousemove', x: 700, y: 400 }
  showBuffer();
});
*/
/* This function shows the current window that is available
 */

function showBuffer() {
  //TODO: Parameterize width and height
  bufferWindow = new BrowserWindow({
    width: 400,
    height: 200,
    transparent: false
  })
  bufferWindow.loadURL(`file://${__dirname}/resources/app/index.html`);
  bufferWindow.webContents.on('did-finish-load', function() {
    bufferWindow.webContents.send('load-buffer', readString);
  });
}



ioHook.on("mousewheel", event => {
  console.log(event);
  currentEvent = event;
  mouseDown = true;
});

ioHook.on("mouseup", event => {
  console.log(event);
  currentEvent = event;
  mouseDown = false;
  mainWindow = null
});


ioHook.on("keyup", e => {
  //ahh fuck this keyset problem: 
  console.log(e.rawcode, String.fromCharCode(e.rawcode));
});

//Register and start hook



function callEvent() {
  if (mouseDown) {
    console.log("hellooo");
    // do whatever you want
    // it will continue executing until mouse is not released


    setTimeout(callEvent, 1000);
  } else {
    return;
  }
}


function startListeners() {


}

function saveBuffer(bufferNum) {
  readString = clipboard.readText();
  textBufferChecker[0] = 1;
  textBufferArray[0] = readString;
  textBufferTimer[0] = new Date();
  console.log("Content saved");
  console.log(readString);
}

function pasteBuffer(bufferNum) {
  readString = clipboard.readText();
  textBufferChecker[0] = 1;
  textBufferArray[0] = readString;
  textBufferTimer[0] = new Date();
  console.log("Content saved");
  console.log(readString);
}

function triggerBuffer(bufferNum) {
  textBufferTimer[0] = new Date();
}
function setGlobalShortcuts() {
  globalShortcut.unregisterAll();

  var osKey = configuration.readSettings('os');
  console.log("oskkyy " + osKey);
  var shortcutKeySettingJSON = configuration.readSettings(osKey);

  //you need to loop afterwards
  var shortcutKeySetting1 = shortcutKeySettingJSON.pasteBuffer1.num;
  var shortcutNum1 = shortcutKeySettingJSON['pasteBuffer1']['num'];
  var shortcutKeySetting2 = shortcutKeySettingJSON['pasteBuffer2']['shortcutKeys'];
  var shortcutNum2 = shortcutKeySettingJSON['pasteBuffer2']['num'];
    console.log("shorty" + shortcutKeySetting1);
  console.log("shorty" + shortcutNum1);
  globalShortcut.register(shortcutKeySetting1, function() {
    mainWindow.webContents.send('global-shortcut', 0);
  });
  //pop up paste buffer
  globalShortcut.register('n', function() {
    showBuffer();
  });
  globalShortcut.register('m', function() {
    bufferWindow.webContents.send('inc-opq', readString);;
  });
  //need to loop to register all shortcuts
  globalShortcut.register(shortcutKeySetting1, function(){
    triggerBuffer(shortcutNum1);
  });
}
