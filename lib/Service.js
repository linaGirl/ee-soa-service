
    !function() {
        'use strict';

            var Class                = require('ee-class')
            , log                    = require('ee-log')
            , DefaultController      = require('./DefaultController')
            , DefaultORMController   = require('./DefaultORMController')
            , DefaultService         = require('./DefaultService')
            , EventEmitter           = require('ee-event-emitter')
            , SoaServiceRegistration = require('em-soa-authentication').SoaServiceRegistration;

        module.exports = new Class({
            inherits: DefaultService

            , init: function init(options) {
                this.options = options || {};

                this._registerServiceForAuthentication(new SoaServiceRegistration(this.options.controllerOptions));

                init.parent(options);
            }

            , _initDefaultController: function(loaded) {
                if(Object.hasOwnProperty.call(this.options, 'controllerOptions') && Object.hasOwnProperty.call(this.options.controllerOptions, 'orm')) {
                    this._conf.tablesToLoad.forEach(function(table, index) {
                        try {
                            this.options.controllerOptions.table = table;
                            var controller                       = new DefaultORMController(this.options.controllerOptions);
                        } catch (err) {
                            throw new Error('['+this.name+'] Could not load DefaultController-File for table "' + table + '"');
                        }

                        controller.on('load', function(err) {
                            if(err) throw err;

                            log('['+this.name+'] DefaultController "' + table + '" loaded...');
                            this._controllerCollection[table] = controller;
                            loaded();
                        }.bind(this));

                        controller.on('request', this._handleRequest.bind(this));

                    }.bind(this));
                }
            }

            , _registerServiceForAuthentication: function(auth) {
                this.onLoad(function(err) {
                    auth.registerService(this);
                }.bind(this));
            }

            , _listAction: function(collection, req, callback) {
                this._controllerCollection[collection].list(req, function(err, result) {
                    this._handleResponse(err, result, req, callback);
                }.bind(this));
            }

            , _listOneAction: function(collection, req, callback) {
                this._controllerCollection[collection].listOne(req, function(err, result) {
                    this._handleResponse(err, result, req, callback);
                }.bind(this));
            }

            , _createAction: function(collection, req, callback) {
                this._controllerCollection[collection].create(req, function(err, result) {
                    this._handleResponse(err, result, req, callback);
                }.bind(this));
            }

            , _updateAction: function(collection, req, callback) {
                this._controllerCollection[collection].update(req, function(err, result) {
                    this._handleResponse(err, result, req, callback);
                }.bind(this));
            }

            , _createOrUpdateAction: function(collection, req, callback) {
                this._controllerCollection[collection].createOrUpdate(req, function(err, result) {
                    this._handleResponse(err, result, req, callback);
                }.bind(this));
            }

            , _createRelationAction: function(collection, req, callback) {
                this._controllerCollection[collection].createRelation(req, function(err, result) {
                    this._handleResponse(err, result, req, callback);
                }.bind(this));
            }

            , _deleteAction: function(collection, req, callback) {
                this._controllerCollection[collection].delete(req, function(err, result) {
                    this._handleResponse(err, result, req, callback);
                }.bind(this));
            }

            , _describeAction: function(collection, req, callback) {
                this._controllerCollection[collection].describe(req, function(err, result) {
                    this._handleResponse(err, result, req, callback);
                }.bind(this));
            }

        });

    }();
