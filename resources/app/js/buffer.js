'use strict';
var nodeConsole = require('console');
var myConsole = new nodeConsole.Console(process.stdout, process.stderr);
myConsole.log('Hello World!');
const {ipcRenderer} = require('electron')

var bufferDiv =  document.querySelector('#buffer');
myConsole.log("checkyy");
myConsole.log(bufferDiv.innerHTML);
bufferDiv.innerHTML = "JavaScript was here";

ipcRenderer.on('load-buffer', (event, message) => {
      bufferDiv.innerHTML = message;
    })
myConsole.log("checkyy");
