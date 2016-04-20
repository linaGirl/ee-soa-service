
    !function() {
        'use strict';

        var Class               = require('ee-class')
            , log               = require('ee-log')
            , EventEmitter      = require('ee-event-emitter')
            , type              = require('ee-types')
            , DefaultController = require('./DefaultController')
            , ORMFilter         = require('./ORMFilter')
            , argv              = require('ee-argv')
            , debug             = argv.has('dev-service-spec')
            , debugService      = argv.has('debug-service');





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
                this.serviceName = options.serviceName;


                if(this.rootQuery) this._generateObjectSpecs(this.rootQuery.getDefinition());
                else throw new Error('[' + this.table + '] could not load definition of tableController')

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
                            , hasAlias            : row.aliasName ? true : false
                            , referencedModelName : row.referencedModel.name
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
                        var collectionName = mapping.aliasName || mapping.model.name;
                        this.specs.hasMany[collectionName] = {
                            name              : collectionName
                            , hasAlias        : mapping.aliasName ? true : false
                            , modelName       : mapping.model.name
                            , primaryKeys     : mapping.model.primaryKeys
                            , primaryKey      : mapping.model.primaryKeys[0]
                            , _rel            : {
                                collection   : '/' + mapping.model.name
                                , setMapping : '/' + this.table + '/{id}/' + collectionName + '/{id}'
                                , getMapping : '/' + this.table + '/{id}/' + collectionName
                            }
                        };

                        var table = {name: mapping.via.model.name};
                        Object.keys(mapping.via.model.columns).forEach(function(mappingColumnName) {
                            table[mapping.via.model.columns[mappingColumnName].referencedTable] = mappingColumnName;
                        }.bind(this));

                        this.specs.hasMany[collectionName].table = table;

                    }.bind(this));
                }

                // belongsTo
                if(ormSpecs.columns.id && ormSpecs.columns.id.belongsTo) {
                    ormSpecs.columns.id.belongsTo.forEach(function(belongTo) {
                        // TODO: may remove !belongTo.model.isMapping
                        //if(belongTo.model && !belongTo.model.isMapping) {
                        if(belongTo.model) {
                            var collectionName = belongTo.aliasName || belongTo.model.name;
                            this.specs.belongsTo[collectionName] = {
                                name              : collectionName
                                , hasAlias        : belongTo.aliasName ? true : false
                                , modelName       : belongTo.model.name
                                , targetColumn    : belongTo.targetColumn
                                , targetPrimary   : belongTo.model.primaryKeys[0]
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

                this.list(queryData, function(err, data, status, headers) {
                    if(err) return callback(err);

                    if(data.length) {
                        data = data[0];
                        callback(err, data, status, headers);
                    }
                    else {
                        callback(err, null, 26, headers);
                    }

                }.bind(this));

            }

            , _getSingleModel: function(queryData, baseQuery, callback) {
                var query;

                if(!queryData.hasResourceId()) return callback(new Error('[' + this.table + '] no resourceId provided!'));



                var idFilter                    = {};
                idFilter[this.specs.primaryKey] = queryData.getResourceId();


                query = (baseQuery || this.rootQuery)(['*'], idFilter);

                // row restrictions
                this.applyRowRestrictions(queryData, query);

                query.findOne(function(err, data) {
                    callback(err, data);
                }.bind(this));
            }





            // @tobiaskneubeuheler: this is what exactly?
            , preListQuery: false









            , list: function(queryData, callback, baseQuery, interceptor) {

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

                // APPLY FIELD FUNCTIONS
                if(queryData.getFields().length && typeof this.ormObject.select === 'function') {
                    this._addFieldFunctions(queryData);
                }

                // ADD PRIMARY KEYS
                if(this.specs.primaryKeys.length) {
                    this.specs.primaryKeys.forEach(function(primaryKey) {
                        queryData.getFields().push(primaryKey);
                    }.bind(this));
                }

                var query = (baseQuery || this.rootQuery)(queryData.getFields(), objectFilters);

                // preListQuery
                if(this.preListQuery && type.function(this.preListQuery)) {
                    this.preListQuery(query, queryData);
                }

                query.limit(limit).offset(offset);

                // includeSoftDelted if deleted field is selected or filtered
                if(queryData.getFields().indexOf('deleted') >= 0 || (queryData.filters.deleted && queryData.filters.deleted[0])) {
                    query.includeSoftDeleted();
                }

                // locale extension?
                if (queryData.languages && queryData.languages.length && typeof query.setLocale === 'function') query.setLocale(queryData.languages);

                // row restrictions
                this.applyRowRestrictions(queryData, query);


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


                // complete with subresource loading
                var doList = function(entities) {
                    let localCost = (entities && entities.length) ? entities.length*Object.keys(entities[0]).length : 0; 

                    // maybe there is more data to load ....
                    if (subRequests.length && entities.length) {
                        this._handleSubRequests(subRequests, entities, function(err, cost) {
                            if (err) callback(err);
                            else {

                                callback(err, entities, null, {
                                      'Rate-Limit-Cost': cost+localCost
                                    , 'Rate-Limit-Request-Cost': localCost
                                });
                            }
                        }.bind(this));
                    }
                    else {

                        callback(null, entities, null, {
                              'Rate-Limit-Cost': localCost
                            , 'Rate-Limit-Request-Cost': localCost
                        });
                    }
                }.bind(this);


                // load data
                (typeof query.raw === 'function' ? query.raw() : query).find(function(err, entities) {
                    if (err) callback(err);
                    else {
                        // we need plain json
                        if (typeof entities.toJSON === 'function') entities = entities.toJSON();

                        // is there an interception?
                        if (interceptor) {
                            interceptor(entities, function(err) {
                                if (err) callback(err);
                                else doList(entities);
                            }.bind(this));
                        }
                        else doList(entities);
                    }
                }.bind(this));
            }











            , _addFieldFunctions: function(queryData) {
                var fields = queryData.getFields();

                // collect Related-ORM functions
                fields.forEach(function(field) {
                    if(field.isAlias) {
                        var fieldSelect = this.ormObject.select(field.alias);
                        if(typeof fieldSelect[field.functionName] === 'function') {
                            var fieldFunction = fieldSelect[field.functionName];
                            queryData.getFields().push(fieldFunction.apply(fieldSelect, field.functionParameters));
                        }

                        var index = queryData.getFields().indexOf(field);
                        if(index >= 0) {
                            queryData.getFields().splice(index,1);
                        }
                    }
                }.bind(this));

                return;
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















            , _applySubFilters: function(query, filters, path) {
                path = path || [];

                Object.keys(filters).forEach(function(filterName) {
                    var filter = filters[filterName];
                    // SUBFILTERS
                    if(!type.array(filter)) {
                        var objectFilter = this._getObjectFilters(filter);

                        if(objectFilter.error) {
                            if(!this.objectFilterErrors) this.objectFilterErrors = [];
                            this.objectFilterErrors.push('['+[this.dbName, this.table].join('.')+':'+path.join('.')+'] Failed to apply ORM filter on «'+filterName+'»: '+objectFilter.msg);
                        }

                        try {
                            var subQuery = query.get(filterName, objectFilter);
                        } catch (e) {
                            if(!this.objectFilterErrors) this.objectFilterErrors = [];
                            this.objectFilterErrors.push('['+[this.dbName, this.table].join('.')+':'+path.join('.')+'] Failed to get ORM entity «'+filterName+'»: '+e.message);


                            if (debugService) {
                                log.warn('['+[this.dbName, this.table].join('.')+':'+path.join('.')+'] Failed to get ORM entity «'+filterName+'»:');
                                log(e);
                            }

                            return;
                        }

                        this._applySubFilters(subQuery, filter, path.concat(filterName));
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
                            if(ormFilter && ormFilter.error) {
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
                        if(index >= 0) {
                            queryData.getFields().splice(index,1);
                        }
                        queryData.getFields().push(this.specs.hasOne[collection].key);
                    }
                    if(Object.hasOwnProperty.call(this.specs.belongsTo, collection) || Object.hasOwnProperty.call(this.specs.hasMany, collection)) {
                        var index = queryData.getFields().indexOf(collection);
                        if(index >= 0) queryData.getFields().splice(index,1);
                    }

                }.bind(this));

                return;
            }








            , _handleSubRequests: function(subRequests, entities, callback) {
                var subRequestsCount = subRequests.length;

                let subrequestCost = 0;


                var loaded = function() {
                    subRequestsCount--;
                    if(subRequestsCount === 0) {
                        callback(null, subrequestCost);
                    }
                }.bind(this);

                var callbackToParent = function(err, data, status, headers) {
                    if(err) return callback(err);

                    if (headers && headers['Rate-Limit-Cost']) subrequestCost += parseInt(headers['Rate-Limit-Cost'], 10);

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

                // Add alias support
                if(this.specs.hasOne[collection].hasAlias) subRequest.collection = this.specs.hasOne[collection].referencedModelName;

                this.emit('request', subRequest, function(err, data, status, headers) {
                    if(err) return callback(err);

                    if (data && (type.object(data) || type.array(data)) && data.length) {
                        data.forEach(function(subEntity) {
                            if(map[subEntity[this.specs.hasOne[collection].referencedColumn]]) {
                                map[subEntity[this.specs.hasOne[collection].referencedColumn]].forEach(function(reference) {
                                    reference[collection] = subEntity;
                                }.bind(this));
                            }
                        }.bind(this));
                    }

                    callback(err, data, status, headers);
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
                if(!this.specs.belongsTo[collection].hasAlias) {
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
                }
                else {
                    subRequest.filters[this.specs.belongsTo[collection].targetColumn] = [{
                        operator   : '='
                        , value    : function() {
                            return {
                                name         : 'in'
                                , parameters : ids
                            }
                        }.bind(this)
                    }];
                }

                // Add alias support
                if(this.specs.belongsTo[collection].hasAlias) subRequest.collection = this.specs.belongsTo[collection].modelName;

                this.emit('request', subRequest, function(err, data, status, headers) {
                    if(err) return callback(err);

                    if (data && (type.object(data) || type.array(data)) && data.length) {

                        data.forEach(function(subEntity, subEntityKey) {
                            var refId = subEntity[this.specs.belongsTo[collection].targetColumn];

                            if(map[refId]) {
                                // before if(map[refId][collection]) map[refId][collection].push(subEntity);
                                if(!map[refId][collection]) map[refId][collection] = [];
                                map[refId][collection].push(subEntity);
                            }
                        }.bind(this));

                    }

                    return callback(err, data, status, headers);

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

                    // Add alias support
                    if(this.specs.hasMany[collection].hasAlias) subRequest.collection = this.specs.hasMany[collection].modelName;

                    this.emit('request', subRequest, function(err, data, status, headers) {
                        if(err) return callback(err);

                        if (data && (type.object(data) || type.array(data)) && data.length) {
                            data.forEach(function(subEntity) {
                                if(subMap[subEntity[this.specs.hasMany[collection].primaryKey]]) {
                                    subMap[subEntity[this.specs.hasMany[collection].primaryKey]].forEach(function(reference) {
                                        if(!reference[collection]) reference[collection] = [];
                                        reference[collection].push(subEntity);
                                    }.bind(this));
                                }
                            }.bind(this));
                        }

                        return callback(err, data, status, headers);

                    }.bind(this));

                }.bind(this));

            }




            /**
             * gets the referenced column of a referenced entity using a
             * filter string
             *
             * @param {object} entitx, the specs object for the entity
             * @param {string} the filter to use for getting the value
             *
             * @returns {Promise} promise
             */
            , resolveReference: function(entity, filter) {

                return this.sendRequest({
                      url       : entity._rel.collection
                    , filter    : filter
                    , limit     : 1
                    , select    : entity.referencedColumn
                });
            }





            /**
             * resolves referrenced columns by filter values
             *
             * @param {object} values object containing the values
             *
             * @returns {Promise} promise
             */
            , resolveReferences: function(values) {

                // check all values
                if (type.object(values)) {
                    return Promise.all(Object.keys(values).map(function(fieldName) {

                        // check if we got a filter on the reference
                        if (this.specs.hasOne[fieldName] && type.string(values[fieldName])) {

                            // get the value, if available
                            return this.resolveReference(this.specs.hasOne[fieldName], values[fieldName]).then(function(results) {
                                if (results && results.length) {

                                    // set the value on the local table
                                    values[this.specs.hasOne[fieldName].key] = results[0][this.specs.hasOne[fieldName].referencedColumn];
                                }


                                // remove fitler string
                                delete values[fieldName];


                                // we're ok
                                return Promise.resolve();
                            }.bind(this));
                        }
                        else return Promise.resolve();
                    }.bind(this)));
                }
                else return Promise.resolve();
            }






            /**
             * applies the row restrictions to any query exeucted in this controller
             *
             * @param {request} resquest the incoming request
             * @param {query|model} query the model or query to apply the restrictions to
             */
            , applyRowRestrictions: function(request, query) {
                 // row restrictions
                if (request.permissions && query.setRestrictions) {

                    // appl ythe restrictions
                    query.setRestrictions(request.permissions.getRowRestrictions());

                    // set some variables
                    if (request.permissions.hasUser()) query.setRestrictionVariable('userId', request.permissions.getFirstUser().id);
                    if (request.permissions.hasTenant()) query.setRestrictionVariable('tenantId', request.permissions.getFirstTenant().id);
                }
            }







            , create: function(queryData, callback, baseQuery) {
                queryData.getContent(function(err, content) {
                    if (err) return callback(err);
                    else {

                        // resolve references passed by filter
                        this.resolveReferences(content).then(function() {
                            if(content) {
                                if(Object.hasOwnProperty.call(content, 'undefined'))
                                    return callback(new Error('[' + this.table + '] attempt to set value "undefined"!'));

                                var record = (baseQuery || new this.rootQuery()).setValues(content);
                            }
                            else {
                                var record = baseQuery || new this.rootQuery();
                            }

                            // added support for storing localized data
                            if (record.setLocale && queryData.languages && queryData.languages.length) record.setLocale(queryData.languages[0]);

                            // row restrictions
                            this.applyRowRestrictions(queryData, record);

                            record.save(function(err, newRecord) {
                                callback(err, newRecord);
                            }.bind(this));
                        }.bind(this)).catch(callback);
                    }
                }.bind(this));
            }

            , createOrUpdate: function(queryData, callback) {
                this.listOne(queryData, function(err, data) {
                    if(err) return callback(err, data);

                    //UPDATE
                    if(!type.array(data)) {
                        this.update(queryData, callback);
                    }
                    //CREATE
                    else {
                        queryData.content[this.specs.primaryKey] = queryData.getResourceId();
                        this.create(queryData, callback);
                    }
                }.bind(this));
            }

            , createRelation: function(queryData, callback, baseQuery) {
                if(!queryData.hasRelatedTo()) return callback(new Error('[' + this.table + ']no relatedTo provided!'));

                var id          = queryData.getResourceId();
                var withModel   = queryData.getRelatedTo().model;
                var referenceId = queryData.getRelatedTo().id;

                if(!id || !withModel || !referenceId) {
                    return callback(new Error('[' + this.table + '] resource id || relatedTo model || relatedTo id => not provided!'));
                }

                //reference
                if(Object.hasOwnProperty.call(this.specs.hasOne, withModel)) {
                    this._getSingleModel(queryData, baseQuery, function(err, data) {
                        if(err) return callback(err, data);

                        if(data) {
                            var filterForWithModel                                            = {};
                            filterForWithModel[this.specs.hasOne[withModel].referencedColumn] = referenceId;

                            var referenceModel;
                            if(!this.root[withModel] && this.specs.hasOne[withModel].hasAlias) {
                                referenceModel = this.root[this.specs.hasOne[withModel].referencedModelName](filterForWithModel);
                            }
                            else {
                                referenceModel = this.root[withModel](filterForWithModel);
                            }

                            data[withModel] = referenceModel;

                            // row restrictions
                            this.applyRowRestrictions(queryData, data);


                            data.save(function(err, result) {
                                if(err) return callback(err);

                                this.listOne(queryData, callback);
                            }.bind(this));
                        }

                    }.bind(this));
                }

                //belongsTo
                if(Object.hasOwnProperty.call(this.specs.belongsTo, withModel)) {
                    this._getSingleModel(queryData, baseQuery, function(err, entity) {
                        if(err) return callback(err);

                        if(entity) {
                            var filterForWithModel                                            = {};
                            filterForWithModel[this.specs.belongsTo[withModel].targetPrimary] = referenceId;

                            if(!entity[withModel]) return callback(new Error('[' + this.table + '] could not find model "' + withModel + '" on model "' + this.table + '" to save belongsTo relation!'));

                            entity[withModel].push(this.root[withModel](filterForWithModel));


                            // row restrictions
                            this.applyRowRestrictions(queryData, entity);


                            entity.save(function(err, result) {
                                if(err) return callback(err);

                                this.listOne(queryData, callback);
                            }.bind(this));
                        }

                    }.bind(this));
                }

                //mapping
                if(Object.hasOwnProperty.call(this.specs.hasMany, withModel)) {
                    queryData.getContent(function(err, content) {
                        if(err) return callback(err);

                        if(content) {
                            if(Object.hasOwnProperty.call(content, 'undefined'))
                                return callback(new Error('[' + this.table + '] try to set variable "undefined"!'));

                            content[this.specs.hasMany[withModel].table[this.table]] = id;
                            content[this.specs.hasMany[withModel].table[withModel]]  = referenceId;

                            var record = (baseQuery || new this.root[this.specs.hasMany[withModel].table.name]()).setValues(content);

                            // row restrictions
                            this.applyRowRestrictions(queryData, record);

                            record.save(function(err, newRecord) {
                                callback(err, newRecord);
                            }.bind(this));
                        }
                        else {
                            this._getSingleModel(queryData, baseQuery, function(err, entity) {
                                if(err) return callback(err);

                                if(entity) {
                                    var filterForWithModel                                       = {};
                                    filterForWithModel[this.specs.hasMany[withModel].primaryKey] = referenceId;

                                    entity[withModel].push(this.root[withModel](filterForWithModel));

                                    // row restrictions
                                    this.applyRowRestrictions(queryData, entity);

                                    entity.save(function(err, result) {
                                        if(err) return callback(err);

                                        this.listOne(queryData, callback);
                                    }.bind(this));
                                }

                            }.bind(this));
                        }
                    }.bind(this));
                }
            }

            , update: function(queryData, callback, baseQuery) {
                if(!queryData.hasResourceId()) return callback(new Error('no resourceId provided!'));

                // UPDATE RESOURCE
                if(!queryData.hasRelatedTo()) {
                    this._getSingleModel(queryData, baseQuery, function(err, data) {
                        if(err) return callback(err);

                        if(data) {
                            queryData.getContent(function(err, content) {
                                if(err) return callback(err);
                                if(!content) return callback(new Error('[' + this.table + '] no content in request provided!'));
                                if(Object.hasOwnProperty.call(content, 'undefined')) return callback(new Error('[' + this.table + '] try to set variable "undefined"!'));

                                // resolve references passed by filter
                                this.resolveReferences(content).then(function() {
                                    Object.keys(content).forEach(function(fieldName) {
                                        data[fieldName] = content[fieldName];
                                    }.bind(this));


                                    // row restrictions
                                    this.applyRowRestrictions(queryData, data);

                                    data.save(function(err, record) {
                                        if(err) return callback(err);

                                        this.listOne(queryData, callback);
                                    }.bind(this));
                                }.bind(this)).catch(callback);
                            }.bind(this));
                        }
                        else {
                            callback(err, null, 26);
                        }
                    }.bind(this));
                }
                // UPDATE RELATIONS
                else {
                    this.updateRelation(queryData, callback, baseQuery);
                }
            }

            // ONE CAN ONLY UPDATE MAPPING RELATIONS WITH DATA
            , updateRelation: function(queryData, callback, baseQuery) {
                queryData.getContent(function(err, content) {
                    if(err) return callback(err);
                    if(!content) return callback(new Error('[' + this.table + '] no content in request provided!'));
                    if(Object.hasOwnProperty.call(content, 'undefined')) return callback(new Error('[' + this.table + '] try to set variable "undefined"!'));

                    var id          = queryData.getResourceId();
                    var withModel   = queryData.getRelatedTo().model;
                    var referenceId = queryData.getRelatedTo().id;

                    if(!id || !withModel || !referenceId) {
                        return callback(new Error('[' + this.table + '] resource id || relatedTo model || relatedTo id => not provided!'));
                    }

                    //mapping
                    if(Object.hasOwnProperty.call(this.specs.hasMany, withModel)) {
                        var idFilter                                              = {};
                        idFilter[this.specs.hasMany[withModel].table[this.table]] = id;
                        idFilter[this.specs.hasMany[withModel].table[withModel]]  = referenceId;

                        this.root[this.specs.hasMany[withModel].table.name](['*'], idFilter).findOne(function(err, mapping) {
                            if(err) return callback(err);
                            if(!mapping) return callback(new Error('relation not found'));

                            Object.keys(content).forEach(function(fieldName) {
                                mapping[fieldName] = content[fieldName];
                            }.bind(this));


                            // row restrictions
                            this.applyRowRestrictions(queryData, mapping);

                            mapping.save(function(err, result) {
                                if(err) return callback(err);

                                callback(null, mapping);
                            }.bind(this));

                        }.bind(this));
                    }
                    else {
                        callback(new Error('relation is no mapping!'));
                    }

                }.bind(this));
            }

            , delete: function(queryData, callback, baseQuery) {
                if(!queryData.hasResourceId()) return callback(new Error('no resourceId provided!'));

                // DELETE RESOURCE
                if(!queryData.hasRelatedTo()) {
                    this._getSingleModel(queryData, baseQuery, function(err, data) {
                        if(err) return callback(err);

                        if(data) {
                            data.delete(function(err) {
                                if(err) return callback(err);

                                callback(null, data);
                            }.bind(this));
                        }
                        else {
                            callback(err, null, 26);
                        }
                    }.bind(this));
                    // (baseQuery || this.rootQuery)({id: queryData.getResourceId()}).delete(function(err) {
                    //     callback(err);
                    // }.bind(this));
                }
                // DELETE RELATIONS
                else {
                    this.deleteRelation(queryData, callback, baseQuery);
                }
            }

            , deleteRelation: function(queryData, callback, baseQuery) {
                var id          = queryData.getResourceId();
                var withModel   = queryData.getRelatedTo().model;
                var referenceId = queryData.getRelatedTo().id;

                if(!id || !withModel || !referenceId) {
                    return callback(new Error('[' + this.table + '] resource id || relatedTo model || relatedTo id => not provided!'));
                }

                //reference
                if(Object.hasOwnProperty.call(this.specs.hasOne, withModel)) {
                    this._getSingleModel(queryData, baseQuery, function(err, data) {
                        if(err) return callback(err, data);
                        if(!data) return callback(new Error('relation not found'));

                        data[withModel] = null;
                        data.save(function(err, result) {
                            if(err) return callback(err);

                            this.listOne(queryData, callback);
                        }.bind(this));

                    }.bind(this));
                }

                //belongsTo
                if(Object.hasOwnProperty.call(this.specs.belongsTo, withModel)) {

                    var targetFilter                                            = {};
                    targetFilter[this.specs.belongsTo[withModel].targetPrimary] = referenceId;

                    this.root[withModel](targetFilter).findOne(function(err, data) {
                        if(err) return callback(err);
                        if(!data) return callback(new Error('relation not found'));

                        data[this.specs.belongsTo[withModel].targetColumn] = null;

                        data.save(function(err, result) {
                            if(err) return callback(err);

                            this.listOne(queryData, callback);
                        }.bind(this));

                    }.bind(this));
                }

                //mapping
                if(Object.hasOwnProperty.call(this.specs.hasMany, withModel)) {
                    var idFilter                                              = {};
                    idFilter[this.specs.hasMany[withModel].table[this.table]] = id;
                    idFilter[this.specs.hasMany[withModel].table[withModel]]  = referenceId;

                    this.root[this.specs.hasMany[withModel].table.name](['*'], idFilter).findOne(function(err, mapping) {
                        if(err) return callback(err);
                        if(!mapping) return callback(new Error('relation not found'));

                        mapping.delete(function(err) {
                            if(err) return err;

                            this.listOne(queryData, callback);
                        }.bind(this))
                    }.bind(this));
                }
            }





            , describe: function(request, callback) {
                var definition = Object.create(this.specs);


                // we need to clone the specs object
                Object.keys(this.specs).forEach(function(key) {
                    definition[key] = this.specs[key];
                }.bind(this));


                // return an object describing the permissions
                if (request && request.permissions) {
                    definition.permissions = request.permissions.getObjectPermissions(this.serviceName+'.'+this.table);
                    definition.capabilities = request.permissions.getCapabilities();
                }


                callback(null, definition);
            }
        });
    }();
