
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

            , list: function(queryData, callback) {
                var query = this.rootQuery(queryData.select).filter(queryData.filter).limit(queryData.limit).offset(queryData.offset);
                query.find(function(err, entities) {
                    if(queryData.subSelects) {
                        subSelects.forEach(function(subSelect) {
                            this.emit('subRequest', subSelect, function(err, data) {
                                log(data);
                            }.bind(this));
                        }.bind(this));
                    }
                    callback(err, entities);
                }.bind(this));
            }

            , listOne: function(queryData, callback) {
                this.list({select:queryData.select, filter: queryData.filter, limit: 1}, function(err, data) {
                    if(data) data = data[0];
                    callback(err, data);
                }.bind(this));
            }

            , create: function(queryData, callback) {
                var record = new this.rootQuery(queryData.data);

                record.save(function(err, newRecord) {
                    callback(err, newRecord);
                }.bind(this));
            }

            , createOrUpdate: function(queryData, callback) {
                // TODO: every time with ID, don`t do a "real" update more an overwrite
                if(queryData.filter && queryData.filter.id) {
                    this.update(queryData, callback);
                }
                else {
                    this.create(queryData, callback);
                }
            }

            , createMapping: function(queryData, callback) {

            }

            , update: function(queryData, callback) {
                this.listOne(queryData, function(err, data) {
                    if(err) return callback(err, data);

                    if(data) {
                        Object.keys(queryData.data).forEach(function(key) {
                            data[key] = queryData.data[key];
                        }.bind(this));

                        data.save(function(err, record) {
                            callback(err, record);
                        }.bind(this));
                    }
                }.bind(this));
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
