
    !function() {
        'use strict';

        var Class          = require('ee-class')
            , log          = require('ee-log')
            , EventEmitter = require('ee-event-emitter')
            , type         = require( "ee-types" );

        module.exports = new Class({
            inherits: EventEmitter

            , controllerActions: ['list', 'listOne', 'create', 'createOrUpdate', 'createRelation', 'update', 'delete', 'describe']

            , init: function(options) {
                this.options = options || {};

                process.nextTick(function() {
                    this._load();
                }.bind(this));
            }

            , list: function(queryData, callback) {
                callback(new Error("list action not implemented on controller"));
            }

            , listOne: function(queryData, callback) {
                callback(new Error("listOne action not implemented on controller"));
            }

            , create: function(queryData, callback) {
                callback(new Error("create action not implemented on controller"));
            }

            , createOrUpdate: function(queryData, callback) {
                callback(new Error("createOrUpdate action not implemented on controller"));
            }

            , createRelation: function(queryData, callback) {
                callback(new Error("createRelation action not implemented on controller"));
            }

            , update: function(queryData, callback) {
                callback(new Error("update action not implemented on controller"));
            }

            , delete: function(queryData, callback) {
                callback(new Error("delete action not implemented on controller"));
            }

            , describe: function(queryData, callback) {
                callback(new Error("describe action not implemented on controller"));
            }

            , _load: function() {
                this.emit('load');
            }

        });

    }();
