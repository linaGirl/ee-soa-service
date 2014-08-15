!function() {

    var   Class             = require('ee-class')
        , log               = require('ee-log')
        , async             = require('ee-async')
        , EventEmitter      = require('ee-event-emitter')
        , SOAService        = require('../../../');


    
    module.exports = new Class({
        inherits: SOAService


        , init: function init(options) {
            var entities = ['event', 'venue', 'image'];
            
            init.super.call(this, options, entities);
        }
    });
}();
