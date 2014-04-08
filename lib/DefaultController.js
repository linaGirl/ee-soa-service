
    !function() {
        'use strict';

        var Class          = require('ee-class')
            , log          = require('ee-log')
            , EventEmitter = require('ee-event-emitter')
            , ORM          = require('ee-orm')
            , type         = require( "ee-types" );

        module.exports = new Class({
            inherits: EventEmitter

            , init: function(options) {
                this.options = options || {};

                process.nextTick(function() {
                    this._load();
                }.bind(this));
            }

            , list: function(queryData, callback) {

            }


            , listOne: function(queryData, callback) {

            }

            , create: function(queryData, callback) {

            }

            , createOrUpdate: function(queryData, callback) {

            }

            , createRelation: function(queryData, callback) {

            }

            , update: function(queryData, callback) {

            }

            , delete: function(queryData, callback) {

            }

            , describe: function(queryData, callback) {

            }

            , _load: function() {
                this.emit('load');
            }

        });

    }();
