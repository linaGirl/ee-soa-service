
    !function() {
        'use strict';

        var Class               = require('ee-class')
            , log               = require('ee-log')
            , EventEmitter      = require('ee-event-emitter')
            , ORM               = require('ee-orm')
            , type              = require( "ee-types" )
            , DefaultController = require('./DefaultController');

        module.exports = new Class({
            inherits: DefaultController

            , init: function init(options) {
                this.options = options || {};

                this.orm       = options.orm;
                this.dbName    = options.dbName;
                this.table     = options.table;
                this.root      = this.orm[this.dbName];
                this.rootQuery = this.root[this.table];

                if(this.rootQuery) this._generateObjectSpecs(this.rootQuery.getDefinition());
                else throw new Error('[' + this.table + ']could not load definition of tableController')

                init.parent(options);
            }

            , _generateObjectSpecs: function(ormSpecs) {

                this.specs = {
                    primaryKeys  : ormSpecs.primaryKeys
                    , primaryKey : ormSpecs.primaryKeys[0] || null
                    , hasOne     : {}
                    , hasMany    : {}
                    , belongsTo  : {}
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

            , listOne: function(queryData, callback) {
                if(!queryData.hasResourceId()) return callback(new Error('no resourceId provided!'));

                var idsCheck = {};
                // TODO: check all primaries
                // if(this.specs.primaryKeys) {
                //     this.specs.primaryKeys.forEach(function(primaryKey) {
                //         idsCheck[primaryKey] = queryData.???
                //     }.bind(this));
                // }
                idsCheck[this.specs.primaryKey] = [
                    {
                        operator: '='
                        , value: queryData.getResourceId()
                    }
                ];
                queryData.setFilters(idsCheck);
                queryData.setRange({
                    from: 0
                    , to: 1
                });

                this.list(queryData, function(err, data) {
                    if(err) return callback(err);

                    if(data.length) {
                        data = data[0];
                    }

                    callback(err, data);
                }.bind(this));

            }

            , list: function(queryData, callback) {

                // SET OFFSET AND LIMIT
                var offset = 0;
                var limit  = 10;
                var from   = queryData.getRange().from === null ? false : queryData.getRange().from;
                var to     = queryData.getRange().to === null ? false : queryData.getRange().to;
                if(from && to) {
                    offset = from;
                    limit  = to - from;
                }

                // APPLY FILTERS
                var filters       = queryData.getFilters();
                var objectFilters = filters ? this._getObjectFilters(filters) : {};

                // APPLY SUBREQUEST SELECTS
                var subRequests = queryData.getSubRequests();
                if(subRequests.length) {
                    this._removeSubRequestSelectFields(queryData, subRequests);
                }

                var query = this.rootQuery(queryData.getFields(), objectFilters).limit(limit).offset(offset);
                if(filters) {
                    this._applySubFilters(query, filters);
                }

                query.find(function(err, entities) {
                    if(err) return callback(err);

                    // SUBREQUESTS
                    if(subRequests.length && entities.length) {
                        this._handleSubRequests(subRequests, entities, function(err) {
                            if(err) return callback(err);

                            callback(err, entities);
                        }.bind(this));
                    }
                    else {
                        callback(err, entities);
                    }

                }.bind(this));
            }

            , _applySubFilters: function(query, filters) {
                Object.keys(filters).forEach(function(filterName) {
                    var filter = filters[filterName];
                    // SUBFILTERS
                    if(!type.array(filter)) {
                        var objectFilter = this._getObjectFilters(filter);
                        var subQuery     = query.get(filterName, objectFilter);
                        this._applySubFilters(subQuery, filter);
                    }
                }.bind(this));

                return;
            }

            , _getObjectFilters: function(filters) {
                var objectFilters = {};
                Object.keys(filters).forEach(function(filterName) {
                    var filter = filters[filterName];
                    // OBJECT FILTERS
                    if(type.array(filter)) {
                        objectFilters[filterName] = this._getFilter(filter[0]); //TODO: don't take first element, there could be more then 1!
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

            , _removeSubRequestSelectFields: function(queryData, subRequests) {
                subRequests.forEach(function(subRequest) {
                    var collection = subRequest.getCollection();

                    if(Object.hasOwnProperty.call(this.specs.hasOne, collection)) {
                        var index = queryData.getFields().indexOf(collection);
                        queryData.getFields().splice(index,1);
                        queryData.getFields().push(this.specs.hasOne[collection].key);
                    }
                    if(Object.hasOwnProperty.call(this.specs.belongsTo, collection) || Object.hasOwnProperty.call(this.specs.hasMany, collection)) {
                        var index = queryData.getFields().indexOf(collection);
                        queryData.getFields().splice(index,1);
                    }

                }.bind(this));

                return;
            }

            , _handleSubRequests: function(subRequests, entities, callback) {
                var subRequestsCount = subRequests.length;

                var loaded = function() {
                    subRequestsCount--;
                    if(subRequestsCount === 0) {
                        callback();
                    }
                }.bind(this);

                var callbackToParent = function(err) {
                    if(err) return callback(err);

                    loaded();
                }.bind(this);

                subRequests.forEach(function(subRequest) {
                    var collection = subRequest.getCollection();
                    // TODO: maybe to removed
                    subRequest.setRange({
                        from: 0
                        , to: 0
                    });

                    if(Object.hasOwnProperty.call(this.specs.hasOne, collection)) {
                        this._handleHasOneSubRequest(entities, subRequest, callbackToParent);
                    }
                    else if(Object.hasOwnProperty.call(this.specs.belongsTo, collection)) {
                        this._handleBelongsToSubRequest(entities, subRequest, callbackToParent);
                    }
                    else if(Object.hasOwnProperty.call(this.specs.hasMany, collection)) {
                        this._handleHasManySubRequest(entities, subRequest, callbackToParent);
                    }
                    else {
                        callbackToParent(new Error('no ' + collection + ' field on entity ' + this.table));
                    }

                }.bind(this));
            }

            , _handleHasOneSubRequest: function(entities, subRequest, callback) {
                var collection = subRequest.getCollection();
                var map        = {};
                var ids        = [];
                ids = function(entities) {
                    var _ids           = [];
                    entities.forEach(function(entity, entityKey) {
                        if(!type.number(entityKey)) return;

                        var id      = entity[this.specs.primaryKey];
                        if(!id) return;

                        var refId = entity[this.specs.hasOne[collection].key];
                        if(!map[refId]) map[refId] = [];
                        map[refId].push(entity);

                        _ids.push(id);
                    }.bind(this));

                    return _ids;
                }.bind(this)(entities);

                //subRequest.getFields().push('id');
                subRequest.filters[this.table] = {};
                subRequest.filters[this.table][this.specs.primaryKey] = [
                        {
                            operator   : '='
                            , value    : function() {
                                return {
                                    name         : 'IN'
                                    , parameters : ids
                                }
                            }.bind(this)
                        }
                    ];

                this.emit('request', subRequest, function(err, data) {
                    if(err) return callback(err);

                    if(data) {
                        data.forEach(function(subEntity) {
                            if(map[subEntity.id]) { // TODO: replace .id with "real"-primary
                                map[subEntity.id].forEach(function(reference) {
                                    reference[collection] = subEntity;
                                }.bind(this));
                            }
                        }.bind(this));
                    }

                    return callback(err);

                }.bind(this));
            }

            , _handleBelongsToSubRequest: function(entities, subRequest, callback) {
                var collection = subRequest.getCollection();
                var map        = {};
                var ids        = [];
                ids = function(entities) {
                    var _ids           = [];
                    entities.forEach(function(entity, entityKey) {
                        if(!type.number(entityKey)) return;

                        var id      = entity[this.specs.primaryKey];
                        if(!id) return;

                        map[id] = entity;

                        _ids.push(id);
                    }.bind(this));

                    return _ids;
                }.bind(this)(entities);

                //subRequest.getFields().push('id');
                subRequest.getFields().push(this.specs.belongsTo[collection].targetColumn);
                subRequest.filters[this.table] = {};
                subRequest.filters[this.table][this.specs.primaryKey] = [
                        {
                            operator   : '='
                            , value    : function() {
                                return {
                                    name         : 'IN'
                                    , parameters : ids
                                }
                            }.bind(this)
                        }
                    ];

                this.emit('request', subRequest, function(err, data) {
                    if(err) return callback(err);

                    if(data) {

                        data.forEach(function(subEntity, subEntityKey) {
                            var refId = subEntity[this.specs.belongsTo[collection].targetColumn];

                            if(map[refId]) {
                                if(map[refId][collection]) {
                                    map[refId][collection].push(subEntity);
                                }
                            }
                        }.bind(this));

                        return callback(err);
                    }

                }.bind(this));
            }

            , _handleHasManySubRequest: function(entities, subRequest, callback) {
                var collection = subRequest.getCollection();
                var map        = {};
                var ids        = [];
                ids = function(entities) {
                    var _ids           = [];
                    entities.forEach(function(entity, entityKey) {
                        if(!type.number(entityKey)) return;

                        var idField = entity.getDefinition().primaryKeys[0];
                        var id      = entity[idField];
                        if(!id) return;

                        map[id] = entity;

                        _ids.push(id);
                    }.bind(this));

                    return _ids;
                }.bind(this)(entities);

                subRequest.getFields().push('id');
                subRequest.filters[this.table] = {
                    id: [
                        {
                            operator   : '='
                            , value    : function() {
                                return {
                                    name         : 'IN'
                                    , parameters : ids
                                }
                            }.bind(this)
                        }
                    ]
                }

                waitForCallback = true;
                this.emit('request', subRequest, function(err, data) {
                    if(err) return callback(err);

                    if(data) {

                        data.forEach(function(subEntity, subEntityKey) {
                            log(subEntity);
                        }.bind(this));

                        callback(err);
                    }

                }.bind(this));
            }

            , create: function(queryData, callback) {
                queryData.getContent(function(err, content) {
                    if(err) return callback(err);

                    var record = new this.rootQuery(content);

                    record.save(function(err, newRecord) {
                        callback(err, newRecord);
                    }.bind(this));
                }.bind(this));
            }

            , createOrUpdate: function(queryData, callback) {
                this.listOne(queryData, function(err, data) {
                    if(err) return callback(err, data);

                    //UPDATE
                    if(data) {
                        this.update(queryData, callback);
                    }
                    //CREATE
                    else {
                        this.create(queryData, callback);
                    }
                }.bind(this));
            }

            , createRelation: function(queryData, callback) {
                if(!queryData.hasRelatedTo()) return callback(new Error(''));

                var id          = queryData.getResourceId();
                var withModel   = queryData.getRelatedTo().model;
                var referenceId = queryData.getRelatedTo().id;

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
                            entity[withModel].push(this.root[withModel]({id: referenceId}));
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
                            entity[withModel].push(this.root[withModel]({id: referenceId}));
                            entity.save(function(err, result) {
                                return callback(err, result);
                            }.bind(this));
                        }

                    }.bind(this));
                }
            }

            , update: function(queryData, callback) {
                this.listOne(queryData, function(err, data) {
                    if(err) return callback(err);

                    if(data) {
                        queryData.getContent(function(err, content) {
                            if(err) return callback(err);

                            Object.keys(content).forEach(function(value, key) {
                                data[key] = value;
                            }.bind(this));

                            data.save(function(err, record) {
                                callback(err, record);
                            }.bind(this));

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

        });

    }();
