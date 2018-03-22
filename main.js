'use strict';

/*

STEPS:

1. Need to go get that circular buffer to store all values
2. Extenralize configuration keys or different platforms
3. Flow for adding the event back in
*/

/* GLOBAL Parameters
*/

var copyBufferSize = 10;


const ioHook = require('iohook');
var electron = require('electron');
const {clipboard, app, BrowserWindow} = require('electron')
var CircularBuffer = require("circular-buffer");


var readString = clipboard.readText();
console.log(readString);
console.log(buf.capacity()); // -> 3
copyBuf.enq(readString);



  // Or use `remote` from the renderer process.
  // const {BrowserWindow} = require('electron').remote


var mainWindow = null;
  // Load a remote URL
  app.on('ready', () => {

    //need to externalize window size

    ioHook.start();
})



/*
var app = electron.app;
const {BrowserWindow, ipcMain} = require('electron');
var configuration = require('./configuration');
var mainWindow = null;

app.on('ready', function() {
    mainWindow = new BrowserWindow({
        frame: false,
        height: 700,
        resizable: false,
        width: 368
    });

    mainWindow.loadURL('file://' + __dirname + '/app/index.html');

    if (!configuration.readSettings('shortcutKeys')) {
        configuration.saveSettings('shortcutKeys', ['ctrl', 'shift']);
    }
});

ipcMain.on('close-main-window', function () {
    app.quit();
});
*/







var copyBuffer = new CircularBuffer(copyBufferSize);

var currentEvent = null;
var mouseDown = false;
ioHook.on("mousedown", event => {
  console.log(event);
  currentEvent = event;
  mouseDown = true;
  mainWindow = new BrowserWindow({width: 800, height: 600})
  mainWindow.on('closed', () => {
    mainWindow = null
  })
  mainWindow.loadURL('https://github.com')
  callEvent();
});

mainWindow.webContents.send('load-buffer', 0);

ioHook.on("mouseup", event => {
  console.log(event);
  currentEvent = event;
  mouseDown = false;
  mainWindow = null
});

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
/*
function setGlobalShortcuts() {
    globalShortcut.unregisterAll();

    var shortcutKeysSetting = configuration.readSettings('shortcutKeys');
    var shortcutPrefix = shortcutKeysSetting.length === 0 ? '' : shortcutKeysSetting.join('+') + '+';

    globalShortcut.register(shortcutPrefix + '1', function () {
        mainWindow.webContents.send('global-shortcut', 0);
    });
    globalShortcut.register(shortcutPrefix + '2', function () {
        mainWindow.webContents.send('global-shortcut', 1);
    });
    */
