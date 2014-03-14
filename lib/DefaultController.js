
    !function() {
        'use strict';

        var Class          = require('ee-class')
            , log          = require('ee-log')
            , EventEmitter = require('ee-event-emitter');

        module.exports = new Class({
            inherits: EventEmitter

            , init: function(options) {
                this.options = options || {};

                this.orm       = options.orm;
                this.dbName    = options.dbName || 'eventbox';
                this.table     = options.table;
                this.rootQuery = this.orm[this.dbName][this.table];

                this.service   = options.service; // TODO: handle with events

                process.nextTick(function() {
                    this._load();
                }.bind(this));
            }

            , list: function(req, callback) {
                var query = this.rootQuery(req.select).limit(req.limit).offset(req.offset);
                query.find(function(err, entities) {
                    callback(err, entities);
                }.bind(this));
            }

            , listOne: function(req, callback) {
                var query = this.rootQuery(req.select).filter(req.filter).limit(1);
                query.find(function(err, entity) {
                    if(entity) entity = entity[0];
                    callback(err, entity);
                }.bind(this));
            }

            , create: function(req, callback) {
            }

            , createOrUpdate: function(req, callback) {
            }

            , createMapping: function(query, callback) {

            }

            , update: function(req, callback) {
                this.rootQuery({id: req.id}).update(req.fields, function(err, info) {
                    callback(err, info);
                }.bind(this));
            }

            , delete: function(req, callback) {
            }

            , describe: function(req, callback) {
            }

            , _load: function() {
                this.emit('load');
            }

        });

    }();
