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
            if (!query) query = new this._model();

            // set post data
            request.getContent(function(err, data) {
                if (err) callback(err);
                else {
                    if (data) {
                        Object.keys(data).forEach(function(property) {
                            query[property] = data[property];
                        }.bind(this));
                    }

                    // invoke extensions, they can modify the query
                    this._applyExtensions(request, query, callback);
                }
            }.bind(this));
        }



        /*
         * execute the action
         */
        , execute: function(request, query, response) {
            query.save(response.send.bind(response));
        }
    });
}();
