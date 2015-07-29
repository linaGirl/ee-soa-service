
    !function() {
        'use strict';

        var Class                    = require('ee-class')
            , log                    = require('ee-log')
            , DefaultController      = require('./DefaultController')
            , DefaultORMController   = require('./DefaultORMController')
            , DefaultService         = require('./DefaultService')
            , EventEmitter           = require('ee-event-emitter')
            , argv                   = require('ee-argv')
            , debug                  = argv.has('dev-service');

        module.exports = new Class({
            inherits: DefaultService

            , init: function init(options, dirname) {
                this.options = options || {};


                init.super.call(this, options, dirname);

                // set the servicename as controller option
                if (!this.options.controllerOption) this.options.controllerOption = {};
                this.options.controllerOptions.serviceName = this.name;
            }

            , _initDefaultController: function(loaded) {
                if(Object.hasOwnProperty.call(this.options, 'controllerOptions') && Object.hasOwnProperty.call(this.options.controllerOptions, 'orm')) {
                    this._conf.tablesToLoad.forEach(function(table, index) {
                        try {
                            this.options.controllerOptions.table = table;
                            var controller = new DefaultORMController(this.options.controllerOptions);
                        } catch (err) {
                            throw new Error('['+this.name+'] Could not load DefaultController-File for table "' + table + '"');
                        }


                        // make sure each controller rknows its name
                        if (!controller.name) controller.name = table;
                        if (!controller.serviceName) controller.serviceName = this.name;


                        controller.on('load', function(err) {
                            if(err) throw err;

                            if(debug) log('['+this.name+'] DefaultController "' + table + '" loaded...');
                            this._controllerCollection[table] = controller;
                            loaded();
                        }.bind(this));

                        controller.on('request', this._handleRequest.bind(this));

                    }.bind(this));
                }
            }


            , _listAction: function(collection, req, callback) {
                if(!this._controllerCollection[collection].list)
                    return callback(new Error("list action not implemented on controller"));

                this._controllerCollection[collection].list(req, function(err, result, status, headers) {
                    this._handleResponse(err, result, req, callback, status, headers);
                }.bind(this));
            }

            , _listOneAction: function(collection, req, callback) {
                if(!this._controllerCollection[collection].listOne)
                    return callback(new Error("listOne action not implemented on controller"));

                this._controllerCollection[collection].listOne(req, function(err, result, status, headers) {
                    this._handleResponse(err, result, req, callback, status, headers);
                }.bind(this));
            }

            , _createAction: function(collection, req, callback) {
                if(!this._controllerCollection[collection].create)
                    return callback(new Error("create action not implemented on controller"));

                this._controllerCollection[collection].create(req, function(err, result, status, headers) {
                    this._handleResponse(err, result, req, callback, status, headers);
                }.bind(this));
            }

            , _updateAction: function(collection, req, callback) {
                if(!this._controllerCollection[collection].update)
                    return callback(new Error("update action not implemented on controller"));

                this._controllerCollection[collection].update(req, function(err, result, status, headers) {
                    this._handleResponse(err, result, req, callback, status, headers);
                }.bind(this));
            }

            , _createOrUpdateAction: function(collection, req, callback) {
                if(!this._controllerCollection[collection].createOrUpdate)
                    return callback(new Error("createOrUpdate action not implemented on controller"));

                this._controllerCollection[collection].createOrUpdate(req, function(err, result, status, headers) {
                    this._handleResponse(err, result, req, callback, status, headers);
                }.bind(this));
            }

            , _createRelationAction: function(collection, req, callback) {
                if(!this._controllerCollection[collection].createRelation)
                    return callback(new Error("createRelation action not implemented on controller"));

                this._controllerCollection[collection].createRelation(req, function(err, result, status, headers) {
                    this._handleResponse(err, result, req, callback, status, headers);
                }.bind(this));
            }

            , _deleteAction: function(collection, req, callback) {
                if(!this._controllerCollection[collection].delete)
                    return callback(new Error("delete action not implemented on controller"));

                this._controllerCollection[collection].delete(req, function(err, result, status, headers) {
                    this._handleResponse(err, result, req, callback, status, headers);
                }.bind(this));
            }

            , _describeAction: function(collection, req, callback) {
                if(!this._controllerCollection[collection].describe)
                    return callback(new Error("describe action not implemented on controller"));

                this._controllerCollection[collection].describe(req, function(err, result, status, headers) {
                    this._handleResponse(err, result, req, callback, status, headers);
                }.bind(this));
            }

        });

    }();
