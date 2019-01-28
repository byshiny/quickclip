'use strict'
/* This file is used to show all the contents of a bufferDiv
 */
// use for debug purpose only =D
var closeEl = document.querySelector('.close')
var settingsEl = document.querySelector('.settings')
var nodeConsole = require('console')
var myConsole = new nodeConsole.Console(process.stdout, process.stderr)

var CSS_COLOR_NAMES = ['AliceBlue', 'AntiqueWhite', 'Aqua', 'Aquamarine', 'Azure', 'Beige', 'Bisque', 'Black', 'BlanchedAlmond', 'Blue', 'BlueViolet', 'Brown', 'BurlyWood', 'CadetBlue', 'Chartreuse', 'Chocolate', 'Coral', 'CornflowerBlue', 'Cornsilk', 'Crimson', 'Cyan', 'DarkBlue', 'DarkCyan', 'DarkGoldenRod', 'DarkGray', 'DarkGrey', 'DarkGreen', 'DarkKhaki', 'DarkMagenta', 'DarkOliveGreen', 'Darkorange', 'DarkOrchid', 'DarkRed', 'DarkSalmon', 'DarkSeaGreen', 'DarkSlateBlue', 'DarkSlateGray', 'DarkSlateGrey', 'DarkTurquoise', 'DarkViolet', 'DeepPink', 'DeepSkyBlue', 'DimGray', 'DimGrey', 'DodgerBlue', 'FireBrick', 'FloralWhite', 'ForestGreen', 'Fuchsia', 'Gainsboro', 'GhostWhite', 'Gold', 'GoldenRod', 'Gray', 'Grey', 'Green', 'GreenYellow', 'HoneyDew', 'HotPink', 'IndianRed', 'Indigo', 'Ivory', 'Khaki', 'Lavender', 'LavenderBlush', 'LawnGreen', 'LemonChiffon', 'LightBlue', 'LightCoral', 'LightCyan', 'LightGoldenRodYellow', 'LightGray', 'LightGrey', 'LightGreen', 'LightPink', 'LightSalmon', 'LightSeaGreen', 'LightSkyBlue', 'LightSlateGray', 'LightSlateGrey', 'LightSteelBlue', 'LightYellow', 'Lime', 'LimeGreen', 'Linen', 'Magenta', 'Maroon', 'MediumAquaMarine', 'MediumBlue', 'MediumOrchid', 'MediumPurple', 'MediumSeaGreen', 'MediumSlateBlue', 'MediumSpringGreen', 'MediumTurquoise', 'MediumVioletRed', 'MidnightBlue', 'MintCream', 'MistyRose', 'Moccasin', 'NavajoWhite', 'Navy', 'OldLace', 'Olive', 'OliveDrab', 'Orange', 'OrangeRed', 'Orchid', 'PaleGoldenRod', 'PaleGreen', 'PaleTurquoise', 'PaleVioletRed', 'PapayaWhip', 'PeachPuff', 'Peru', 'Pink', 'Plum', 'PowderBlue', 'Purple', 'Red', 'RosyBrown', 'RoyalBlue', 'SaddleBrown', 'Salmon', 'SandyBrown', 'SeaGreen', 'SeaShell', 'Sienna', 'Silver', 'SkyBlue', 'SlateBlue', 'SlateGray', 'SlateGrey', 'Snow', 'SpringGreen', 'SteelBlue', 'Tan', 'Teal', 'Thistle', 'Tomato', 'Turquoise', 'Violet', 'Wheat', 'White', 'WhiteSmoke', 'Yellow', 'YellowGreen']
const {
    ipcRenderer,
    remote
} = require('electron')
// var saveState = document.querySelector('#saveState')
// var timeTaken = document.querySelector('#timeTaken')
myConsole.log('checkster')
var opacity = 1
ipcRenderer.on('inc-opq', (event, message) => {
    // TODO: this parameters - disappearing and transparency speed needs to be externalized.
    var opaqueTimer = setInterval(function () {
        opacity -= 0.05
        bufferDiv.style.opacity = opacity
        if (opacity <= 0) {
            clearInterval(opaqueTimer)
            var curWindow = remote.getCurrentWindow()
            curWindow.close()
        }
    }, 100)
})

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min
}

function replaceBufferFunction(key) {
    return function () {
        var valueToPass = key
        ipcRenderer.send('replace-copy-buffer', valueToPass);
    };
}
ipcRenderer.on('load-circular-buffer', (event, circularBufferArrayContent) => {
    var circularBufferDisplayId = "circular-buffer-display"
    var bufferHolder = document.getElementById(circularBufferDisplayId)
    bufferHolder.innerHTML = ""
    for (var idx in circularBufferArrayContent) {
        var button = document.createElement('button')
        var textHolder = document.createElement('div')
        var randColorInt = getRandomInt(0, CSS_COLOR_NAMES.length)
        var rand1Color = CSS_COLOR_NAMES[randColorInt]
        button.classList.add('btn')
        button.innerHTML = "" + idx
        button.setAttribute("id", "" + idx)
        var text = circularBufferArrayContent[idx]
        button.addEventListener("click", replaceBufferFunction(text));
        textHolder.innerHTML = text
        textHolder.classList.add("pre-scrollable")
        var linebreak = document.createElement('br')
        bufferHolder.appendChild(linebreak)
        button.style.backgroundColor = rand1Color
        bufferHolder.appendChild(button)
        bufferHolder.appendChild(textHolder)
    }

    
})