!function() {
    'use strict';

    var   Class             = require('ee-class')
        , EventEmitter      = require('ee-event-emitter')
        , log               = require('ee-log')
        , Action            = require('../lib/Action');


    var ORM;


    module.exports = new Class({
        inherits: Action
       

        /*
         * biuld the query required for the action
         */
        , prepareQuery: function(request, query, callback) {

            // invoke extensions, they can modify the query
            this.emit('query', this._action, request, query, callback);
        }



        /*
         * execute the action
         */
        , execute: function(request, callback) {

        }
    });
}();
