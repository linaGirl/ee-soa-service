
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
                //var util = require('util');
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
                            name                  : (row.aliasName || row.referencedModel.name)
                            , key                 : row.name
                            , type                : row.type
                            , length              : row.length
                            , nullable            : row.nullable
                            // , referencedColumn : row.referencedColumn
                            , _rel                : {
                                collection        : '/' + row.referencedModel.name
                                , setReference    : '/' + this.table + '/{id}/' + (row.aliasName || row.referencedModel.name) + '/{id}'
                                , getReference    : '/' + this.table + '/{id}/' + (row.aliasName || row.referencedModel.name)
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
                            , _rel            : {
                                collection   : '/' + mapping.model.name
                                , setMapping : '/' + this.table + '/{id}/' + mapping.model.name + '/{id}'
                                , getMapping : '/' + this.table + '/{id}/' + mapping.model.name
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
                                , targetColumn    : belongTo.targetColumn
                                , _rel            : {
                                    collection     : '/' + belongTo.model.name
                                    , setReference : '/' + this.table + '/{id}/' + (belongTo.model.name) + '/{id}'
                                    , getReference : '/' + this.table + '/{id}/' + belongTo.model.name
                                }
                            };
                        }
                    }.bind(this));
                }

                //log(this.specs);
            }

            , _applyFilters: function(query, filters) {
                filters.forEach(function(filter) {
                    // OR
                    if(type.array(filter)) {

                    }
                    // AND
                    else {
                        var model = filter.model;
                        var fn    = filter.fn;
                        var value = filter.value;


                    }

                    if(filter.filters) {
                        this._applyFilters(query, filter.filters);
                    }

                }.bind(this));

                return;
            }

            , _getFilter: function(filter) {
                if(filter.fn === 'in') {
                    return {
                        field: filter.field
                    }
                }
            }

            , list: function(queryData, callback) {
                // TODO: you have to manage the filters! you have to!
                // TODO: add subselects to rootSelect

                if(queryData.subSelects) {
                    queryData.subSelects.forEach(function(subSelect) {
                        var controller = subSelect.controller;

                        if(Object.hasOwnProperty.call(this.specs.hasOne, controller)) {
                            queryData.select.push(this.specs.hasOne[controller].key);
                        }

                        // if(Object.hasOwnProperty.call(this.specs.belongsTo, controller)) {
                        //     queryData.select.push(controller);
                        // }
                    }.bind(this));
                }

                var query = this.rootQuery(queryData.select, queryData.filter).limit(queryData.limit).offset(queryData.offset);

                // FILTERS
                if(queryData.filters) {
                    this._applyFilters(query, queryData.filters);
                }

                if(queryData.referenceWith) {
                    var withModel    = queryData.referenceWith.model;
                    var referenceId  = queryData.referenceWith.id;
                    var referenceIds = queryData.referenceWith.ids;

                    if(!withModel || (!referenceId && !referenceIds) ) {
                        //TODO create error
                        return callback(new Error(''));
                    }

                    // hasOne || belongsTo || mapping
                    if(Object.hasOwnProperty.call(this.specs.hasOne, withModel) || Object.hasOwnProperty.call(this.specs.belongsTo, withModel) || Object.hasOwnProperty.call(this.specs.hasMany, withModel)) {
                        var filter = {};
                        if(referenceId) filter = { id: referenceId };
                        if(referenceIds) filter = { id: ORM.in(referenceIds) };

                        query['get' + (withModel.charAt(0).toUpperCase() + withModel.slice(1))](filter);
                    }
                    else
                    {
                        // TODO write error
                        return callback(new Error(''));
                    }
                }

                query.find(function(err, entities) {
                    if(err) return callback(err);

                    var waitForCallback = false;
                    if(queryData.subSelects) {
                        // TODO: do it with referenceWith
                        queryData.subSelects.forEach(function(subSelect) {
                            var controller = subSelect.controller;
                            var map        = {};
                            var ids        = [];

                            if(Object.hasOwnProperty.call(this.specs.hasOne, controller)) {
                                ids = function(entities) {
                                    var _ids           = [];
                                    entities.forEach(function(entity, entityKey) {
                                        if(!type.number(entityKey)) return;

                                        // var id  = entity[this.specs.hasOne[controller].key];
                                        // if(!id) return;
                                        // log(id);
                                        //
                                        // if(!map[id]) map[id] = [];
                                        // map[id].push(entity);

                                        var id = entity.id;
                                        if(!id) return;

                                        var refId = entity[this.specs.hasOne[controller].key];
                                        if(!map[refId]) map[refId] = [];
                                        map[refId].push(entity);

                                        _ids.push(id);
                                    }.bind(this));

                                    return _ids;
                                }.bind(this)(entities);

                                subSelect.action = 'list';
                                subSelect.referenceWith = {
                                    model: this.table
                                    , ids: ids
                                };

                                waitForCallback = true;
                                this.emit('request', subSelect, function(err, data) {
                                    if(err) return callback(err, data);

                                    if(data) {

                                        data.forEach(function(subEntity) {
                                            if(map[subEntity.id]) {
                                                map[subEntity.id].forEach(function(reference) {
                                                    reference[controller] = subEntity;
                                                }.bind(this));
                                            }
                                        }.bind(this));

                                        callback(err, entities);
                                    }

                                }.bind(this));
                            }
                            if(Object.hasOwnProperty.call(this.specs.belongsTo, controller)) {
                                ids = function(entities) {
                                    var _ids           = [];
                                    entities.forEach(function(entity, entityKey) {
                                        if(!type.number(entityKey)) return;

                                        // var id  = entity[this.specs.hasOne[controller].key];
                                        // if(!id) return;
                                        // log(id);
                                        //
                                        // if(!map[id]) map[id] = [];
                                        // map[id].push(entity);

                                        var id = entity.id;
                                        if(!id) return;

                                        map[id] = entity;

                                        _ids.push(id);
                                    }.bind(this));

                                    return _ids;
                                }.bind(this)(entities);

                                subSelect.action = 'list';
                                subSelect.select.push(this.specs.belongsTo[controller].targetColumn)
                                subSelect.referenceWith = {
                                    model: this.table
                                    , ids: ids
                                };

                                waitForCallback = true;
                                this.emit('request', subSelect, function(err, data) {
                                    if(err) return callback(err, data);

                                    if(data) {

                                        data.forEach(function(subEntity, subEntityKey) {
                                            var refId = subEntity[this.specs.belongsTo[controller].targetColumn];

                                            if(map[refId]) {
                                                if(map[refId][controller]) {
                                                    var refEntity = map[refId];
                                                    refEntity[controller].push(subEntity);
                                                }
                                            }
                                        }.bind(this));

                                        callback(err, entities);
                                    }

                                }.bind(this));
                            }
                            if(Object.hasOwnProperty.call(this.specs.hasMany, controller)) {
                                ids = function(entities) {
                                    var _ids           = [];
                                    entities.forEach(function(entity, entityKey) {
                                        if(!type.number(entityKey)) return;

                                        // var id  = entity[this.specs.hasOne[controller].key];
                                        // if(!id) return;
                                        // log(id);
                                        //
                                        // if(!map[id]) map[id] = [];
                                        // map[id].push(entity);

                                        var id = entity.id;
                                        if(!id) return;

                                        map[id] = entity;

                                        _ids.push(id);
                                    }.bind(this));

                                    return _ids;
                                }.bind(this)(entities);

                                subSelect.action = 'list';
                                subSelect.referenceWith = {
                                    model: this.table
                                    , ids: ids
                                };

                                waitForCallback = true;
                                this.emit('request', subSelect, function(err, data) {
                                    if(err) return callback(err, data);

                                    if(data) {

                                        data.forEach(function(subEntity, subEntityKey) {
                                            log(subEntity);
                                        }.bind(this));

                                        callback(err, entities);
                                    }

                                }.bind(this));
                            }
                            //TODO: write ids on filter
                            // subSelect.filter = { id: ORM.in(_ids) };

                        }.bind(this));
                    }

                    if(!waitForCallback) callback(err, entities);
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
                if(Object.hasOwnProperty.call(this.specs.hasOne, withModel)) {
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
                if(Object.hasOwnProperty.call(this.specs.belongsTo, withModel)) {
                    this.rootQuery({id: id}).findOne(function(err, entity) {
                        if(err) return callback(err);

                        if(entity) {
                            entity[this.specs.belongsTo[withModel]].push(this.root[withModel]({id: referenceId}));
                            entity.save(function(err, result) {
                                return callback(err, result);
                            }.bind(this));
                        }

                    }.bind(this));
                }

                //mapping
                if(Object.hasOwnProperty.call(this.specs.hasMany, withModel)) {
                    this.rootQuery({id: id}).findOne(function(err, entity) {
                        if(err) return callback(err);

                        if(entity) {
                            entity[this.specs.hasMany[withModel]].push(this.root[withModel]({id: referenceId}));
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
