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
            callback();
        }



        /*
         * execute the action
         */
        , execute: function(request, query, response) {
            response.send(new Error('NOT_IMPLEMENTED'));
        }
    });
}();
