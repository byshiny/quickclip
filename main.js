'use strict';

/*

STEPS:

1. Need to go get that circular buffer to store all values
2. Extenralize configuration keys or different platforms
3. Flow for adding the event back in
*/

/* GLOBAL Parameters
*/

var COPY_BUFFER_SIZE = 10;
console.log("directory name!")
console.log(__dirname)

const ioHook = require('iohook');
const {app, BrowserWindow} = require('electron')
const {clipboard} = require('electron')
var robot = require("robotjs")
var electron = require('electron')


console.log(app)
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
    //REMOVE THIS LATER: mainWindow.hide()

    ioHook.start();
})

var content = clipboard.readText();
console.log(content);








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

    var shortcutKeysSetting = configuration.readSettings('shortcutKeys');
    var shortcutPrefix = shortcutKeysSetting.length === 0 ? '' : shortcutKeysSetting.join('+') + '+';

    globalShortcut.register(shortcutPrefix + '1', function () {
        mainWindow.webContents.send('global-shortcut', 0);
    });
    globalShortcut.register(shortcutPrefix + '2', function () {
        mainWindow.webContents.send('global-shortcut', 1);
    });
  }
