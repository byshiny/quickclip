'use strict';


var electron = require('electron');
var app = electron.app;
const {BrowserWindow, ipcMain} = require('electron')
var mainWindow = null;

app.on('ready', function() {
    mainWindow = new BrowserWindow({
        frame: false,
        height: 700,
        resizable: false,
        width: 368
    });

    mainWindow.loadURL('file://' + __dirname + '/app/index.html');
});

ipcMain.on('close-main-window', function () {
    app.quit();
});
