!function() {
    'use strict';


    var   Class             = require('ee-class')
        , EventEmitter      = require('ee-event-emitter')
        , log               = require('ee-log')
        , fs                = require('fs')
        , FilterBuilder     = require('./FilterBuilder');


    var ORM;


    module.exports = new Class({
        inherits: EventEmitter


        // valid actions
        , _validActions: {
              create: true
            , createOne: true
            , createOrUpdate: true
            , createOrUpdateOne: true
            , list: true
            , listOne: true
            , update: true
            , updateOne: true
            , delete: true
            , deleteOne: true
            , createRelation: true
            , createRelationOne: true
            , updateRelation: true
            , updateRelationOne: true
            , deleteRelation: true
            , deleteRelationOne: true
            , describe: true
            , describeOne: true
        }


        /*
         * options -> orm, db name, tablename
         * loclPath -> the path to the current service implementation
         */
        , init: function(options, tableName) {
            this._orm           = options.orm;
            this._tableName     = tableName;
            this._databaseName  = options.databaseName;
            this._db            = options.db;

            log.debug('Loading DataController %s ...', tableName);

            // validate input
            if (!this._orm[this._databaseName][this._tableName]) throw new Error('The table «'+this._tableName+'» was not loaded on the db «'+this._databaseName+'»!');

            // shortcut for the curretn database
            this._model = this._orm[this._databaseName][this._tableName];


            // orm helper functions, static
            if (!ORM) ORM = this._orm.getORM();


            // get a filterbuilder instance
            this._filterBuilder = new FilterBuilder({
                  orm           : this._orm
                , db            : this._db 
                , databaseName  : this._databaseName
                , tableName     : this._tableName
                , model         : this._model
            });


            // prepare the model
            this._loadModel();

            // load actions from fs
            this._loadActions(function(err) {
                this.emit('load', err);
            }.bind(this));
        }


        /*
         * the methods below could be generated easy, but this would make 
         * it harder to extend the data controller
         */



        /*
         * prepares the list query
         *
         * @param <Object> the request
         * @param <Object> orm query
         * @param <Function> callback
         */
        , _prepareListQuery: function(request, query, callback) {
            this._actions.list.prepareQuery(request, query, callback);
        }

        /*
         * prepares the list one query
         *
         * @param <Object> the request
         * @param <Object> orm query
         * @param <Function> callback
         */
        , _prepareListOneQuery: function(request, query, callback) {
            this._actions.listOne.prepareQuery(request, query, callback);
        }

        /*
         * prepares the create query
         *
         * @param <Object> the request
         * @param <Object> orm query
         * @param <Function> callback
         */
        , _prepareCreateQuery: function(request, query, callback) {
            this._actions.create.prepareQuery(request, query, callback);
        }

        /*
         * prepares the create or update query
         *
         * @param <Object> the request
         * @param <Object> orm query
         * @param <Function> callback
         */
        , _prepareCreateOrUpdateQuery: function(request, query, callback) {
            this._actions.createOrUpdate.prepareQuery(request, query, callback);
        }
        
        /*
         * prepares the update query
         *
         * @param <Object> the request
         * @param <Object> orm query
         * @param <Function> callback
         */
        , _prepareUpdateQuery: function(request, query, callback) {
            this._actions.update.prepareQuery(request, query, callback);
        }
        
        /*
         * prepares the update query
         *
         * @param <Object> the request
         * @param <Object> orm query
         * @param <Function> callback
         */
        , _prepareUpdateOneQuery: function(request, query, callback) {
            this._actions.updateOne.prepareQuery(request, query, callback);
        }

        /*
         * prepares the delete query
         *
         * @param <Object> the request
         * @param <Object> orm query
         * @param <Function> callback
         */
        , _prepareDeleteQuery: function(request, query, callback) {
            this._actions.delete.prepareQuery(request, query, callback);
        }

        /*
         * prepares the delete query
         *
         * @param <Object> the request
         * @param <Object> orm query
         * @param <Function> callback
         */
        , _prepareDeleteOneQuery: function(request, query, callback) {
            this._actions.deleteOne.prepareQuery(request, query, callback);
        }

        /*
         * prepares the create relation query
         *
         * @param <Object> the request
         * @param <Object> orm query
         * @param <Function> callback
         */
        , _prepareCreateRelationQuery: function(request, query, callback) {
            this._actions.createRelation.prepareQuery(request, query, callback);
        }

        /*
         * prepares the update relation query
         *
         * @param <Object> the request
         * @param <Object> orm query
         * @param <Function> callback
         */
        , _prepareUpdateRelationQuery: function(request, query, callback) {
            this._actions.updateRelation.prepareQuery(request, query, callback);
        }

        /*
         * prepares the delete relation query
         *
         * @param <Object> the request
         * @param <Object> orm query
         * @param <Function> callback
         */
        , _prepareDeleteRelationQuery: function(request, query, callback) {
            this._actions.deleteRelation.prepareQuery(request, query, callback);
        }

        /*
         * prepares the describe query
         *
         * @param <Object> the request
         * @param <Object> orm query
         * @param <Function> callback
         */
        , _prepareDescribeQuery: function(request, query, callback) {
            this._actions.describe.prepareQuery(request, query, callback);
        }








        /*
         * executes the list action
         *
         * @param <Object> the request
         * @param <Object> response
         */
        , list: function(request, response) {
            this._prepareListQuery(request, null, function(err, query) {
                if (err) response.send(err);
                else this._actions.list.execute(request, query, response);
            }.bind(this));
        }
        
        /*
         * executes the list one action
         *
         * @param <Object> the request
         * @param <Object> response
         */
        , listOne: function(request, response) {
            this._prepareListQuery(request, null, function(err, query) {
                if (err) response.send(err);
                else this._actions.listOne.execute(request, query, response);
            }.bind(this));
        }
        
        /*
         * executes the create action
         *
         * @param <Object> the request
         * @param <Object> response
         */
        , create: function(request, response) {
            this._prepareCreateQuery(request, null, function(err, query) {
                if (err) response.send(err);
                else this._actions.create.execute(request, query, response);
            }.bind(this));
        }
        
        /*
         * executes the create action
         *
         * @param <Object> the request
         * @param <Object> response
         */
        , createOne: function(request, response) {
            response.send(response.status.NOT_IMPLEMENTED, {status: 'method_not_implemented', message: 'The «createOne» action is not implemented on this controller!'})
        }
        
        /*
         * executes the create or update action
         *
         * @param <Object> the request
         * @param <Object> response
         */
        , createOrUpdate: function(request, response) {
            this._prepareListQuery(request, null, function(err, query) {
                if (err) response.send(err);
                else this._actions.createOrUpdate.execute(request, query, response);
            }.bind(this));
        }
        
        /*
         * executes the update action
         *
         * @param <Object> the request
         * @param <Object> response
         */
        , update: function(request, response) {
            this._prepareListQuery(request, null, function(err, query) {
                if (err) response.send(err);
                else this._actions.update.execute(request, query, response);
            }.bind(this));
        }
        
        /*
         * executes the update one action
         *
         * @param <Object> the request
         * @param <Object> response
         */
        , updateOne: function(request, response) {
            this._prepareListQuery(request, null, function(err, query) {
                if (err) response.send(err);
                else this._actions.updateOne.execute(request, query, response);
            }.bind(this));
        }
        
        /*
         * executes the delete action
         *
         * @param <Object> the request
         * @param <Object> response
         */
        , delete: function(request, response) {
            this._prepareListQuery(request, null, function(err, query) {
                if (err) response.send(err);
                else this._actions.delete.execute(request, query, response);
            }.bind(this));
        }
        
        /*
         * executes the delete one action
         *
         * @param <Object> the request
         * @param <Object> response
         */
        , deleteOne: function(request, response) {
            this._prepareListQuery(request, null, function(err, query) {
                if (err) response.send(err);
                else this._actions.deleteOne.execute(request, query, response);
            }.bind(this));
        }
        
        /*
         * executes the create relation action
         *
         * @param <Object> the request
         * @param <Object> response
         */
        , createRelation: function(request, response) {
            this._prepareListQuery(request, null, function(err, query) {
                if (err) response.send(err);
                else this._actions.createRelation.execute(request, query, response);
            }.bind(this));
        }
        
        /*
         * executes the update relation action
         *
         * @param <Object> the request
         * @param <Object> response
         */
        , updateRelation: function(request, response) {
            this._prepareListQuery(request, null, function(err, query) {
                if (err) response.send(err);
                else this._actions.updateRelation.execute(request, query, response);
            }.bind(this));
        }
        
        /*
         * executes the list action
         *
         * @param <Object> the request
         * @param <Object> response
         */
        , deleteRelation: function(request, response) {
            this._prepareListQuery(request, null, function(err, query) {
                if (err) response.send(err);
                else this._actions.deleteRelation.execute(request, query, response);
            }.bind(this));
        }
        
        /*
         * executes the list action
         *
         * @param <Object> the request
         * @param <Object> response
         */
        , describe: function(request, response) {
            this._prepareListQuery(request, null, function(err, query) {
                if (err) response.send(err);
                else this._actions.describe.execute(request, query, response);
            }.bind(this));
        }








        /*
         * load actions from the actions dir
         */
        , _loadActions: function(callback) {
            var path = __dirname.substr(0, __dirname.lastIndexOf('/'))+'/actions';

            // the action singleton storage
            this._actions = {};

            // scan for actions
            fs.readdir(path, function(err, files) {
                if (err) callback(err);
                else {
                    files.forEach(function(fileName) {
                        var   actionName = fileName[0].toLowerCase()+fileName.slice(1, -3)
                            , Action
                            , action;

                        if (fileName.substr(-3) === '.js') {
                            // load action from fs
                            try {
                                Action = require(path+'/'+fileName);
                            } catch(err) {
                                log.error('Failed to load action controller «%s» ...', actionName);
                                throw err;
                            }

                            // create instance
                            try {
                                action = new Action({
                                      orm           : this._orm
                                    , tableName     : this._tableName
                                    , databaseName  : this._databaseName
                                    , model         : this._model
                                    , db            : this._db
                                    , action        : actionName
                                    , controller    : this
                                    , filterBuilder : this._filterBuilder
                                });
                            } catch(err) {
                                log.error('Failed to instantiate the action controller «%s» ...', actionName);
                                throw err;
                            }

                            this._actions[actionName] = action;
                        }
                    }.bind(this));

                    callback();
                }
            }.bind(this));
        }




        /*
         * creates required data structures needed for efficient
         * operation
         */
        , _loadModel: function() {
            var definition = this._model.getDefinition();

            // internal definitions
            this._references    = {};
            this._belongsTo     = {};
            this._mappings      = {};
            this._columns       = {};
            this._primaryKeys   = definition.primaryKeys;

            // public, external definition
            this._definition = {
                  columns       : {}
                , hasOne        : {}
                , hasMany       : {}
                , belongsTo     : {}
                , primaryKeys   : definition.primaryKeys
            };



            // build internal & external definitions
            Object.keys(definition.columns).forEach(function(columnName) {
                var column = definition.columns[columnName];

                this._columns[column.name] = column;

                this._definition.columns[column.name] = {
                      name      : column.name
                    , type      : column.type
                    , length    : column.length
                    , nullable  : !!column.nullable
                };

                if (column.mapsTo) {
                    column.mapsTo.forEach(function(mapping) {
                        this._mappings[mapping.name] = {
                              model         : mapping.model
                            , via           : mapping.via
                            , column        : column.name
                            , otherColumn   : mapping.column.name
                        };

                        this._definition.hasMany[mapping.name] = {
                            name: mapping.name
                        };
                    }.bind(this));                    
                }

                if (column.belongsTo) {
                    column.belongsTo.forEach(function(belongsTo) {
                        this._belongsTo[belongsTo.name] = {
                              belongsTo         : belongsTo.model
                            , column            : column.name
                            , referencingColumn : belongsTo.targetColumn
                        };

                        this._definition.belongsTo[belongsTo.name] = {
                            name: belongsTo.name
                        };
                    }.bind(this));                    
                }

                if (column.referencedModel) {
                    this._references[column.referencedModel.name] = {
                          model             : column.referencedModel
                        , column            : column.name
                        , referencedColumn  : column.referencedColumn
                    }

                    this._definition.hasOne[column.referencedModel.name] = {
                        name: column.referencedModel.name
                    };                  
                }
            }.bind(this));   
        }


        /*
         * checks if an action is implemented and allowed
         */
        , hasAction: function(actionName) {
            return Object.hasOwnProperty.call(this._validActions, actionName) && this[actionName];
        }
    });
}();
