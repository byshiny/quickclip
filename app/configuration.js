'use strict'
const importFresh = require('import-fresh')
const path = require('path')
var pathString = path.resolve(__dirname) + '/resources/qconfig.json'
console.log(pathString)
var nconf = importFresh('nconf').file({file: pathString})

function saveSettings (settingKey, settingValue) {
  nconf.set(settingKey, settingValue)
  nconf.save()
}

function readSettings (settingKey) {
  nconf.load()
  return nconf.get(settingKey)
}

function getUserHome () {
  return process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME']
}

module.exports = {
  saveSettings: saveSettings,
  readSettings: readSettings
}
