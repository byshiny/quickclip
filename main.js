'use strict';


var electron = require('electron');
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
'use strict';
const ioHook = require('iohook');

ioHook.on("mousemove", event => {
  console.log(event);
  /* You get object like this
    {
      type: 'mousemove',
      x: 700,
      y: 400
    }
   */
});

//Register and start hook
ioHook.start();

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
