!function() {

    var   Class             = require('ee-class')
        , log               = require('ee-log')
        , async             = require('ee-async')
        , EventEmitter      = require('ee-event-emitter')
        , SOAService        = require('../../../');



    module.exports = new Class({
        inherits: SOAService.Service


        , init: function init(options) {
            init.super.call(this, options, 'test');
        }
    });
}();
