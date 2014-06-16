
    !function() {
        'use strict';

        var Class               = require('ee-class')
            , log               = require('ee-log')
            , EventEmitter      = require('ee-event-emitter')
            , type              = require('ee-types')
            , DefaultController = require('./DefaultController')
            , ORMFilter         = require('./ORMFilter')
            , argv              = require('ee-argv')
            , debug             = argv.has('dev-service-spec');

        module.exports = new Class({
            inherits: DefaultController

            , init: function init(options, tableName) {
                this.options = options || {};

                this.orm       = options.orm;
                this.ormObject = this.orm.getORM();
                this.dbName    = options.dbName;
                this.table     = tableName || options.table;
                this.root      = this.orm[this.dbName];
                this.rootQuery = this.root[this.table];

                if(this.rootQuery) this._generateObjectSpecs(this.rootQuery.getDefinition());
                else throw new Error('[' + this.table + ']could not load definition of tableController')

                init.super.call(this, options);
            }

            , _generateObjectSpecs: function(ormSpecs) {

                this.specs = {
                    primaryKeys  : ormSpecs.primaryKeys
                    , primaryKey : ormSpecs.primaryKeys[0] || null
                    , hasOne     : {}
                    , hasMany    : {}
                    , belongsTo  : {}
                };

                // columns & hasOne
                Object.keys(ormSpecs.columns).forEach(function(columnName) {
                    var row = ormSpecs.columns[columnName];

                    if(row.isForeignKey) {
                        this.specs.hasOne[row.aliasName || row.referencedModel.name] = {
                            name                  : (row.aliasName || row.referencedModel.name)
                            , key                 : row.name
                            , type                : row.type
                            , length              : row.length
                            , nullable            : row.nullable
                            , referencedColumn    : row.referencedColumn
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
                            , primaryKeys     : mapping.model.primaryKeys
                            , primaryKey      : mapping.model.primaryKeys[0]
                            , _rel            : {
                                collection   : '/' + mapping.model.name
                                , setMapping : '/' + this.table + '/{id}/' + mapping.model.name + '/{id}'
                                , getMapping : '/' + this.table + '/{id}/' + mapping.model.name
                            }
                        };

                        var table = {name: mapping.via.model.name};
                        Object.keys(mapping.via.model.columns).forEach(function(mappingColumnName) {
                            table[mapping.via.model.columns[mappingColumnName].referencedTable] = mappingColumnName;
                        }.bind(this));

                        this.specs.hasMany[mapping.model.name].table = table;

                    }.bind(this));
                }

                // belongsTo
                if(ormSpecs.columns.id && ormSpecs.columns.id.belongsTo) {
                    ormSpecs.columns.id.belongsTo.forEach(function(belongTo) {
                        //if(belongTo.model && !belongTo.model.isMapping) { //TODO: may remove !belongTo.model.isMapping
                        if(belongTo.model) {
                            this.specs.belongsTo[belongTo.model.name] = {
                                name              : belongTo.model.name
                                , targetColumn    : belongTo.targetColumn
                                , isMapping       : belongTo.model.isMapping
                                , _rel            : {
                                    collection     : '/' + belongTo.model.name
                                    , setReference : '/' + this.table + '/{id}/' + (belongTo.model.name) + '/{id}'
                                    , getReference : '/' + this.table + '/{id}/' + belongTo.model.name
                                }
                            };
                        }
                    }.bind(this));
                }

                if(debug) log(this.table, this.specs);
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
                queryData.setRange(0, 1);

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
                var limit  = 10; //TODO: may be removed
                var from   = queryData.getRange().from;
                var to     = queryData.getRange().to;
                if(type.number(from) && type.number(to)) {
                    offset = from;
                    limit  = to - from;
                }

                // APPLY FILTERS
                var filters       = queryData.getFilters();
                var objectFilters = {};
                if(filters) {
                    var ormFilters = this._getObjectFilters(filters);
                    if(ormFilters.error) return callback(new Error(ormFilters.msg));
                    else objectFilters = ormFilters;
                }

                // APPLY SUBREQUEST SELECTS
                var subRequests = queryData.getSubRequests();
                if(subRequests.length) {
                    this._removeSubRequestSelectFields(queryData, subRequests);
                }

                // ADD PRIMARY KEYS
                if(this.specs.primaryKeys.length) {
                    this.specs.primaryKeys.forEach(function(primaryKey) {
                        queryData.getFields().push(primaryKey);
                    }.bind(this));
                }

                var query = this.rootQuery(queryData.getFields(), objectFilters).limit(limit).offset(offset);
                //ORDER
                var orders    = queryData.getOrder();
                if(orders) {
                    Object.keys(orders).forEach(function(field) {
                        var direction = orders[field];

                        if(type.string(direction)) {
                            query.order(field, direction.toUpperCase() === 'DESC');
                        }
                        else {
                            this._applySubOrder(query, field, direction);
                        }
                    }.bind(this));
                }

                //FILTERS
                if(filters) {
                    this.objectFilterErrors = null;
                    this._applySubFilters(query, filters);
                    if(this.objectFilterErrors) {
                        return callback(new Error(this.objectFilterErrors.join()));
                    }
                }

                query.find(function(err, entities) {
                    if(err) return callback(err);

                    entities = entities.toJSON();

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

            , _applySubOrder: function(query, field, order) {
                var subQuery = query.get(field);

                Object.keys(order).forEach(function(field2) {
                    var direction = order[field2];

                    if(type.string(direction)) {
                        subQuery.orderRoot(field2, direction.toUpperCase() === 'DESC');
                    }
                    else {
                        this._applySubOrder(subQuery, field2, direction);
                    }
                }.bind(this));

                return;
            }

            , _applySubFilters: function(query, filters) {
                Object.keys(filters).forEach(function(filterName) {
                    var filter = filters[filterName];
                    // SUBFILTERS
                    if(!type.array(filter)) {
                        var objectFilter = this._getObjectFilters(filter);

                        if(objectFilter.error) {
                            if(!this.objectFilterErrors) this.objectFilterErrors = [];
                            this.objectFilterErrors.push(objectFilter.msg);
                        }

                        try {
                            var subQuery = query.get(filterName, objectFilter);
                        } catch (e) {
                            if(!this.objectFilterErrors) this.objectFilterErrors = [];
                            this.objectFilterErrors.push(e.message);
                            return;
                        }

                        this._applySubFilters(subQuery, filter);
                    }
                }.bind(this));

                return;
            }

            , _getObjectFilters: function(filters) {
                var objectFilters = {};
                var errors        = [];
                Object.keys(filters).forEach(function(filterName) {
                    var filter = filters[filterName];
                    // OBJECT FILTERS
                    if(type.array(filter)) {
                        var andFilters = [];
                        filter.forEach(function(filterElement) {
                            var ormFilter = ORMFilter.get(filterElement, this.ormObject);
                            if(ormFilter.error) {
                                errors.push(ormFilter.msg);
                            }
                            else {
                                andFilters.push(ormFilter);
                            }
                        }.bind(this));
                        if(andFilters.length) {
                            if(andFilters.length > 1)
                                objectFilters[filterName] = this.ormObject.and(andFilters);
                            else
                                objectFilters[filterName] = andFilters[0];
                        }
                    }
                }.bind(this));

                if(errors.length) return { error: 1, msg: errors.join() };
                else return objectFilters;
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

                    subRequest.setRange(0,0);

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

                // FIXME: you could do better dude!
                // ========
                // use the right primary!
                var primaryKey = this.specs.primaryKey;
                if(primaryKey == this.specs.hasOne[collection].key) {
                    this.specs.primaryKeys.some(function(pkey) {
                        if(pkey !== this.specs.hasOne[collection].key)
                        {
                            primaryKey = pkey;
                            return true;
                        }

                        return false;
                    }.bind(this));
                }
                // ========
                // ENDFIXME

                ids = function(entities) {
                    var _ids           = [];
                    entities.forEach(function(entity, entityKey) {
                        if(!type.number(entityKey)) return;

                        var id      = entity[primaryKey];
                        if(!id) return;

                        var refId = entity[this.specs.hasOne[collection].key];
                        if(!map[refId]) map[refId] = [];
                        map[refId].push(entity);

                        _ids.push(id);
                    }.bind(this));

                    return _ids;
                }.bind(this)(entities);

                subRequest.getFields().push(this.specs.hasOne[collection].referencedColumn);
                subRequest.filters[this.table] = {};
                subRequest.filters[this.table][primaryKey] = [
                        {
                            operator   : '='
                            , value    : function() {
                                return {
                                    name         : 'in'
                                    , parameters : ids
                                }
                            }.bind(this)
                        }
                    ];

                this.emit('request', subRequest, function(err, data) {
                    if(err) return callback(err);

                    if(data) {
                        data.forEach(function(subEntity) {
                            if(map[subEntity[this.specs.hasOne[collection].referencedColumn]]) {
                                map[subEntity[this.specs.hasOne[collection].referencedColumn]].forEach(function(reference) {
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
                                    name         : 'in'
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
                                // before if(map[refId][collection]) map[refId][collection].push(subEntity);
                                if(!map[refId][collection]) map[refId][collection] = [];
                                map[refId][collection].push(subEntity);
                            }
                        }.bind(this));

                    }

                    return callback(err);

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

                        var id      = entity[this.specs.primaryKey];
                        if(!id) return;

                        map[id] = entity;

                        _ids.push(id);
                    }.bind(this));

                    return _ids;
                }.bind(this)(entities);

                var idFilter                    = {};
                idFilter[this.specs.primaryKey] = this.ormObject.in(ids);
                var subMap                      = {};

                this.root[this.specs.hasMany[collection].table.name](['*']).get(this.table, idFilter).find(function(err, mappings) {
                    if(err) return callback(err);

                    if(mappings)
                    {
                        mappings.forEach(function(mapping) {
                            var entityId    = mapping[this.specs.hasMany[collection].table[this.table]];
                            var subEntityId = mapping[this.specs.hasMany[collection].table[collection]];

                            if(!subMap[subEntityId]) subMap[subEntityId] = [];
                            if(map[entityId]) subMap[subEntityId].push(map[entityId]);

                        }.bind(this));
                    }

                    subRequest.filters[this.table] = {};
                    subRequest.filters[this.table][this.specs.primaryKey] = [
                        {
                            operator   : '='
                            , value    : function() {
                                return {
                                    name         : 'in'
                                    , parameters : ids
                                }
                            }.bind(this)
                        }
                    ];

                    this.emit('request', subRequest, function(err, data) {
                        if(err) return callback(err);

                        if(data) {
                            data.forEach(function(subEntity) {
                                if(subMap[subEntity[this.specs.hasMany[collection].primaryKey]]) {
                                    subMap[subEntity[this.specs.hasMany[collection].primaryKey]].forEach(function(reference) {
                                        if(!reference[collection]) reference[collection] = [];
                                        reference[collection].push(subEntity);
                                    }.bind(this));
                                }
                            }.bind(this));
                        }

                        return callback(err);

                    }.bind(this));

                }.bind(this));

            }

            , create: function(queryData, callback) {
                queryData.getContent(function(err, content) {
                    if(err) return callback(err);

                    if(content) {
                        if(Object.hasOwnProperty.call(content, 'undefined'))
                            return callback(new Error('[' + this.table + '] try to set variable "undefined"!'));

                        var record = new this.rootQuery(content);
                    }
                    else {
                        var record = new this.rootQuery();
                    }

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
                if(!queryData.hasRelatedTo()) return callback(new Error('[' + this.table + ']no relatedTo provided!'));

                var id          = queryData.getResourceId();
                var withModel   = queryData.getRelatedTo().model;
                var referenceId = queryData.getRelatedTo().id;

                if(!id || !withModel || !referenceId) {
                    return callback(new Error('[' + this.table + '] resource id || relatedTo model || relatedTo id => not provided!'));
                }

                //reference
                if(Object.hasOwnProperty.call(this.specs.hasOne, withModel)) {
                    this.listOne(queryData, function(err, data) {
                        if(err) return callback(err, data);

                        if(data) {
                            var filterForWithModel                                            = {};
                            filterForWithModel[this.specs.hasOne[withModel].referencedColumn] = referenceId;

                            data[withModel] = this.root[withModel](filterForWithModel);
                            data.save(function(err, result) {
                                return callback(err, result);
                            }.bind(this));
                        }

                    }.bind(this));
                }

                //belongsTo
                if(Object.hasOwnProperty.call(this.specs.belongsTo, withModel)) {
                    this.listOne(queryData, function(err, entity) {
                        if(err) return callback(err);

                        if(entity) {
                            var filterForWithModel                                           = {};
                            filterForWithModel[this.specs.belongsTo[withModel].targetColumn] = referenceId;

                            entity[withModel].push(this.root[withModel](filterForWithModel));
                            entity.save(function(err, result) {
                                return callback(err, result);
                            }.bind(this));
                        }

                    }.bind(this));
                }

                //mapping
                if(Object.hasOwnProperty.call(this.specs.hasMany, withModel)) {
                    this.listOne(queryData, function(err, entity) {
                        if(err) return callback(err);

                        if(entity) {
                            var filterForWithModel                                       = {};
                            filterForWithModel[this.specs.hasMany[withModel].primaryKey] = referenceId;

                            entity[withModel].push(this.root[withModel](filterForWithModel));
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
                            if(!content) return callback(new Error('[' + this.table + '] no content in request provided!'));

                            Object.keys(content).forEach(function(fieldName) {
                                data[fieldName] = content[fieldName];
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
