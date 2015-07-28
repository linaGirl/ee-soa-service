
    !function() {
        'use strict';

        var Class          = require('ee-class')
            , log          = require('ee-log')
            , EventEmitter = require('ee-event-emitter')
            , type         = require('ee-types');

        module.exports = new Class({
            inherits: EventEmitter

            , init: function(options) {
                this.options = options || {};

                // make the accesstoken available to the controller
                if (this.option.accessToken) this.accessToken = options.accessToken;

                this.controllerActions = ['list', 'listOne', 'create', 'createOrUpdate', 'createRelation', 'update', 'updateRelation', 'delete', 'deleteRelation', 'describe'];

                process.nextTick(function() {
                    this._load();
                }.bind(this));
            }


            /**
             * returns a default lsit of controller actions
             */
            , getActionNames: function() {
                return this.controllerActions;
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

            , updateRelation: function(queryData, callback) {
                callback(new Error("updateRelation action not implemented on controller"));
            }

            , delete: function(queryData, callback) {
                callback(new Error("delete action not implemented on controller"));
            }

            , deleteRelation: function(queryData, callback) {
                callback(new Error("deleteRelation action not implemented on controller"));
            }

            , describe: function(queryData, callback) {
                callback(new Error("describe action not implemented on controller"));
            }

            , _load: function() {
                this.emit('load');
            }

        });

    }();
