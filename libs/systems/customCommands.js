'use strict'

var chalk = require('chalk')
var constants = require('../constants')
var _ = require('lodash')
var log = global.log

function CustomCommands () {
  if (global.configuration.get().systems.customCommands === true) {
    global.parser.register(this, '!command add', this.add, constants.OWNER_ONLY)
    global.parser.register(this, '!command list', this.list, constants.OWNER_ONLY)
    global.parser.register(this, '!command remove', this.remove, constants.OWNER_ONLY)
    global.parser.register(this, '!command', this.help, constants.OWNER_ONLY)

    // start interval for registering commands from DB
    var self = this
    setInterval(function () {
      self.register(self)
    }, 1000)
  }
  log.info('CustomCommands system ' + global.translate('core.loaded') + ' ' + (global.configuration.get().systems.customCommands === true ? chalk.green(global.translate('core.enabled')) : chalk.red(global.translate('core.disabled'))))
}

CustomCommands.prototype.help = function (self, sender) {
  global.commons.sendMessage(global.translate('core.usage') + ': !command add <command> <response> | !command remove <command> | !command list', sender)
}

CustomCommands.prototype.register = function (self) {
  global.botDB.find({$where: function () { return this._id.startsWith('customcmds') }}, function (err, docs) {
    if (err) { log.error(err) }
    docs.forEach(function (e, i, ar) { global.parser.register(self, '!' + e.command, self.run, constants.VIEWERS) })
  })
}

CustomCommands.prototype.add = function (self, sender, text) {
  try {
    var parsed = text.match(/^(\w+) (\w.+)$/)
    global.commons.insertIfNotExists({__id: 'customcmds_' + parsed[1], _command: parsed[1], response: parsed[2], success: global.translate('customcmds.success.add'), error: global.translate('customcmds.failed.add')})
  } catch (e) {
    global.commons.sendMessage(global.translate('customcmds.failed.parse'), sender)
  }
}

CustomCommands.prototype.run = function (self, sender, msg, fullMsg) {
  global.botDB.findOne({$where: function () { return this._id.startsWith('customcmds') }, command: fullMsg.split('!')[1]}, function (err, item) {
    if (err) { log.error(err) }
    try { global.commons.sendMessage(item.response, sender) } catch (e) { global.parser.unregister(fullMsg) }
  })
}

CustomCommands.prototype.list = function (self, sender, text) {
  var parsed = text.match(/^(\w+)$/)
  if (_.isNull(parsed)) {
    global.botDB.find({$where: function () { return this._id.startsWith('customcmds') }}, function (err, docs) {
      if (err) { log.error(err) }
      var commands = []
      docs.forEach(function (e, i, ar) { commands.push('!' + e.command) })
      var output = (docs.length === 0 ? global.translate('customcmds.failed.list') : global.translate('customcmds.success.list') + ': ' + commands.join(', '))
      global.commons.sendMessage(output, sender)
    })
  } else {
    global.commons.sendMessage(global.translate('customcmds.failed.parse', sender))
  }
}

CustomCommands.prototype.remove = function (self, sender, text) {
  try {
    var parsed = text.match(/^(\w+)$/)
    global.commons.remove({__id: 'customcmds_' + parsed[1],
      success: function (cb) {
        global.parser.unregister('!' + cb.command)
        global.commons.sendMessage(global.translate('customcmds.success.remove'), sender)
      },
      error: global.translate('customcmds.failed.remove')})
  } catch (e) {
    global.commons.sendMessage(global.translate('customcmds.failed.parse'), sender)
  }
}

module.exports = new CustomCommands()
