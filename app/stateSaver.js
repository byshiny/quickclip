'use strict'
const importFresh = require('import-fresh')
const path = require('path')
var pathString = path.resolve(__dirname) + '/resources/save.json'
var nconf = importFresh('nconf').file({file: pathString})

function saveValue (settingKey, settingValue) {
  nconf.set(settingKey, settingValue)
  nconf.save()
}

function readValue (settingKey) {
  nconf.load()
  return nconf.get(settingKey)
}

function getUserHome () {
  return process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME']
}

module.exports = {
  saveValue: saveValue,
  readValue: readValue
}
