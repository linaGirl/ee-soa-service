!function() {
    'use strict';

    var   Class             = require('ee-class')
        , EventEmitter      = require('ee-event-emitter')
        , log               = require('ee-log');


    var ORM;



    module.exports = new Class({
        inherits: EventEmitter


        , init: function(options) {
            this._orm           = options.orm;
            this._tableName     = options.tableName;
            this._databaseName  = options.databaseName;
            this._db            = options.db;
            this._model         = options.model;
            this._action        = options.action;
            this._extension     = options.extension;
            this._controller    = options.controller;
            this._filterBuilder = options.filterBuilder
            this._subrequests   = options.subrequests;

            // orm helper functions, static
            if (!ORM) ORM = this._orm.getORM();
        }


        /*
         * apply extensions on the action query
         */
        , _applyExtensions: function(request, query, callback) {
            callback(null, query);
        }
    });
}();
