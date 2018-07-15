'use strict'

var nconf = require('nconf').file({file: './app/save.json'})

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
