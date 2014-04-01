
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

            , _applySubFilters: function(query, filters) {
                Object.keys(filters).forEach(function(filterName) {
                    var filter = filters[filterName];
                    if(!type.array(filter)) {
                        var objectFilter = this._getObjectFilters(filter);
                        var subQuery     = query['get' + (filterName.charAt(0).toUpperCase() + filterName.slice(1))](objectFilter);
                        this._applySubFilters(subQuery, filter);
                    }
                }.bind(this));
            }

            , _getObjectFilters: function(filters) {
                var objectFilters = {};
                Object.keys(filters).forEach(function(filterName) {
                    var filter = filters[filterName];
                    // OBJECT FILTERS
                    if(type.array(filter)) {
                        objectFilters[filterName] = this._getFilter(filter[0]);
                    }
                }.bind(this));

                return objectFilters;
            }

            , _getFilter: function(filter) {
                if(filter.operator === '=') {
                    if(type.function(filter.value)) {
                        var ormFilter = filter.value();
                        if(ormFilter.name === 'IN') {
                            return ORM.in(ormFilter.parameters);
                        }
                    }
                    return filter.value;
                }
                if(filter.operator === '>') {
                    return ORM.gt(filter.value);
                }
            }

            , list: function(queryData, callback) {
                // TODO: you have to manage the filters! you have to!
                // TODO: add subselects to rootSelect -> rüfe already did
                // if(queryData.subSelects) {
                //     queryData.subSelects.forEach(function(subSelect) {
                //         var controller = subSelect.controller;
                //
                //         if(Object.hasOwnProperty.call(this.specs.hasOne, controller)) {
                //             queryData.select.push(this.specs.hasOne[controller].key);
                //         }
                //
                //         // if(Object.hasOwnProperty.call(this.specs.belongsTo, controller)) {
                //         //     queryData.select.push(controller);
                //         // }
                //     }.bind(this));
                // }

                // SET OFFSET AND LIMIT
                var offset = 0;
                var limit  = 10;
                var from   = queryData.getRange().from;
                var to     = queryData.getRange().to;
                if(from && to) {
                    offset = from;
                    limit  = to - from;
                }

                // APPLY FILTERS
                var filters       = queryData.getFilters();
                var objectFilters = filters ? this._getObjectFilters(filters) : {};

                var query = this.rootQuery(queryData.getFields(), objectFilters).limit(limit).offset(offset);
                if(filters) {
                    this._applySubFilters(query, filters);
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
                if(!queryData.hasResourceId()) return callback(new Error('no resourceId provided!'));

                this.rootQuery(queryData.getFields(), {id: queryData.getResourceId()}).findOne(function(err, data) {
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
                this.listOne(queryData, function(err, data) {
                    if(err) return callback(err, data);

                    //UPDATE
                    if(data) {
                        Object.keys(queryData.data).forEach(function(key) {
                            data[key] = queryData.data[key];
                        }.bind(this));

                        data.save(function(err, record) {
                            callback(err, record);
                        }.bind(this));
                    }
                    //CREATE
                    else {
                        this.create(queryData, callback);
                    }
                }.bind(this));
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
                if(!queryData.hasResourceId()) return callback(new Error('no resourceId provided!'));

                this.rootQuery({id: queryData.getResourceId()}).limit(1).delete(function(err) {
                    callback(err);
                }.bind(this));
            }

            , describe: function(queryData, callback) {
                callback(null, this.specs);
            }

            , _load: function() {
                this.emit('load');
            }

        });

    }();
