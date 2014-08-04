!function() {
    'use strict';

    var   Class             = require('ee-class')
        , EventEmitter      = require('ee-event-emitter')
        , log               = require('ee-log')
        , type              = require('ee-types')
        , Action            = require('../lib/Action');


    var ORM;


    module.exports = new Class({
        inherits: Action
        

        , init: function init(options) {
            init.super.call(this, options);

            // get the static orm with helper functions
            if (!ORM) ORM = this._orm.getORM();
        }


        /*
         * biuld the query required for the action
         */
        , prepareQuery: function(request, query, callback) {
            if (!query) query = this._model();

            this._filterBuilder.fromRequest(request, query, function(err) {
                if (err) callback(err);
                else this._applyExtensions(request, query, callback);
            }.bind(this));            
        }



        /*
         * execute the action
         */
        , execute: function(request, query, response) {
            query.find(response.send.bind(response));
        }
    });
}();
