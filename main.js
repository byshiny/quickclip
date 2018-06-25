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
const {app, BrowserWindow, ipcMain, globalShortcut} = require('electron')
const {clipboard, dialog} = require('electron')
const configuration = require('./configuration')

var robot = require("robotjs")
var electron = require('electron')

var CircularBuffer = require("circular-buffer");

var copyBuf = new CircularBuffer(COPY_BUFFER_SIZE);


var readString = clipboard.readText();
console.log(readString);
console.log(copyBuf.capacity()); // -> 3
copyBuf.enq(readString);



  // Or use `remote` from the renderer process.
  // const {BrowserWindow} = require('electron').remote


var mainWindow = null;
  // Load a remote URL
  app.on('ready', () => {

    //need to externalize window size

    mainWindow = new BrowserWindow({width: 800, height: 600})
    mainWindow.on('closed', () => {
      mainWindow = null
    })
    mainWindow.loadURL('https://github.com')
    setGlobalShortcuts();
    //REMOVE THIS LATER: mainWindow.hide()
    let win = new BrowserWindow({transparent: true, frame: false})
    win.show()


    ioHook.start();

})

var content = clipboard.readText();
console.log("keyboard content" + content);

ipcMain.on('close-main-window', function () {
    app.quit();
});







var copyBuffer = new CircularBuffer(COPY_BUFFER_SIZE);

var currentEvent = null;
var mouseDown = false;
/*
ioHook.on("mousedown", event => {
  console.log(event);
  currentEvent = event;
  mouseDown = true;
  mainWindow.webContents.send('load-buffer', 0);

  callEvent();
});
*/

/*
ioHook.on("mouseup", event => {
  console.log(event);
  currentEvent = event;
  mouseDown = false;
  mainWindow = null
});
*/
//Register and start hook



function callEvent()
{
 if(mouseDown)
 {
   console.log("hellooo");
   // do whatever you want
   // it will continue executing until mouse is not released


   setTimeout(callEvent,1000);
 }
 else
 return;
}


function startListeners(){



}

function setGlobalShortcuts() {
    globalShortcut.unregisterAll();

    var shortcutKeysSettingArray = configuration.readSettings('pasteBuffer1');
    var shortcutKeysSetting = shortcutKeysSettingArray[0];
    globalShortcut.register(shortcutKeysSetting, function () {
        mainWindow.webContents.send('global-shortcut', 0);
    });

  }
