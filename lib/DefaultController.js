
    !function() {
        'use strict';

        var Class          = require('ee-class')
            , log          = require('ee-log')
            , EventEmitter = require('ee-event-emitter')
            , ORM          = require('ee-orm');

        module.exports = new Class({
            inherits: EventEmitter

            , init: function(options) {
                this.options = options || {};

                this.orm       = options.orm;
                this.dbName    = options.dbName || 'eventbox';
                this.table     = options.table;
                this.root      = this.orm[this.dbName];
                this.rootQuery = this.root[this.table];

                if(this.rootQuery) this._generateObjectSpecs(this.rootQuery.getDefinition());
                //else throw new Error('[' + this.table + ']could not load definition of tableController')

                process.nextTick(function() {
                    this._load();
                }.bind(this));
            }

            , _generateObjectSpecs: function(ormSpecs) {
                var util = require('util');
                //log(util.inspect(ormSpecs, {colors: true, depth: 5}));

                this.specs = {
                    primaryKeys : ormSpecs.primaryKeys
                    , hasOne    : {}
                    , hasMany   : {}
                    , belongsTo : {}
                };

                // columns & references
                Object.keys(ormSpecs.columns).forEach(function(columnName) {
                    var row = ormSpecs.columns[columnName];

                    if(row.isForeignKey) {
                        this.specs.hasOne[row.aliasName || row.referencedModel.name] = {
                            name               : row.name
                            , type             : row.type
                            , length           : row.length
                            , nullable         : row.nullable
                            , referencedColumn : row.referencedColumn
                            , _rel             : {
                                _collection     : '/' + row.referencedModel.name
                                , _reference    : '/' + this.table + '/{id}/' + (row.aliasName || row.referencedModel.name) + '/{id}'
                                , _getReference : '/' + this.table + '/{id}/' + (row.aliasName || row.referencedModel.name)
                            }
                        };
                    }
                    else {
                        this.specs[columnName] = {
                            name       : row.name
                            , type     : row.type
                            , length   : row.length
                            , nullable : row.nullable
                        };
                    }

                }.bind(this));

                // mappings
                if(ormSpecs.columns.id && ormSpecs.columns.id.mapsTo) {
                    ormSpecs.columns.id.mapsTo.forEach(function(mapping) {
                        this.specs.hasMany[mapping.model.name] = {
                            name              : mapping.model.name
                            , collectionName  : mapping.name
                            , _rel            : {
                                _collection   : '/' + mapping.model.name
                                , _mapping    : '/' + this.table + '/{id}/' + mapping.model.name + '/{id}'
                                , _getMapping : '/' + this.table + '/{id}/' + mapping.name
                            }
                        };
                    }.bind(this));
                }

                // belongsTo
                if(ormSpecs.columns.id && ormSpecs.columns.id.belongsTo) {
                    ormSpecs.columns.id.belongsTo.forEach(function(belongTo) {
                        if(belongTo.model && !belongTo.model.isMapping) {
                            this.specs.belongsTo[belongTo.model.name] = {
                                name              : belongTo.model.name
                                , collectionName  : belongTo.name
                                , _rel            : {
                                    _collection     : '/' + belongTo.model.name
                                    , _reference    : '/' + this.table + '/{id}/' + (belongTo.model.name) + '/{id}'
                                    , _getReference : '/' + this.table + '/{id}/' + belongTo.name
                                }
                            };
                        }
                    }.bind(this));
                }

                log(this.specs);
            }

            , list: function(queryData, callback) {
                var query = this.rootQuery(queryData.select).filter(queryData.filter).limit(queryData.limit).offset(queryData.offset);
                query.find(function(err, entities) {
                    if(err) return callback(err);

                    if(queryData.subSelects) {
                        var map = {};
                        var ids = function(entities) {
                            var _ids = [];
                            entities.forEach(function(entity) {
                                _ids.push(entity.id);
                                map[entity.id] = entity;
                            }.bind(this));

                            return _ids;
                        }(entities);

                        queryData.subSelects.forEach(function(subSelect) {
                            if(this.specs.hasOne[subSelect.controller]) {
                                entities.forEach(function(entity) {
                                    log(entity[subSelect.controller]);
                                }.bind(this));

                                subSelect.action = 'list';
                                subSelect.filter = {};
                                // this.emit('request', subSelect, function(err, data) {
                                //
                                // }.bind(this));
                            }
                            //TODO: write ids on filter
                            // subSelect.filter = { id: ORM.in(_ids) };
                            // this.emit('request', subSelect, function(err, data) {
                            //     log(data);
                            // }.bind(this));
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
                this.createReference(queryData, callback);
            }

            , createReference: function(queryData, callback) {
                var id          = queryData.id;
                var withModel   = queryData.referenceWith.model;
                var referenceId = queryData.referenceWith.id;

                if(!id || !withModel || !referenceId) {
                    //TODO create error
                    return callback(new Error(''));
                }

                //reference
                if(this.specs.hasOne[withModel]) {
                    this.rootQuery({id: id}).findOne(function(err, entity) {
                        if(err) return callback(err);

                        if(entity) {
                            entity[withModel] = this.root[withModel]({id: referenceId});
                            entity.save(function(err, result) {
                                return callback(err, result);
                            }.bind(this));
                        }

                    }.bind(this));
                }

                //belongsTo
                if(this.specs.belongsTo[withModel]) {
                    this.rootQuery({id: id}).findOne(function(err, entity) {
                        if(err) return callback(err);

                        if(entity) {
                            entity[this.specs.belongsTo[withModel].collectionName].push(this.root[withModel]({id: referenceId}));
                            entity.save(function(err, result) {
                                return callback(err, result);
                            }.bind(this));
                        }

                    }.bind(this));
                }

                //mapping
                if(this.specs.hasMany[withModel]) {
                    this.rootQuery({id: id}).findOne(function(err, entity) {
                        if(err) return callback(err);

                        if(entity) {
                            entity[this.specs.hasMany[withModel].collectionName].push(this.root[withModel]({id: referenceId}));
                            entity.save(function(err, result) {
                                return callback(err, result);
                            }.bind(this));
                        }

                    }.bind(this));
                }
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
                callback(null, this.specs);
            }

            , _load: function() {
                this.emit('load');
            }

        });

    }();
