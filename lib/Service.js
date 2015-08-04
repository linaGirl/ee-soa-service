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
            // make sure to call super first, it does some important setup stuff
            init.super.call(this, options, dirname);

            // set the servicename
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
            if (!this._controllerCollection[collection].list) callback(new Error('The list action is not implemented on the «'+this.name+'.'+collection+'» controller!'));
            else {
                this._controllerCollection[collection].list(req, function(err, result, status, headers) {
                    this._handleResponse(err, result, req, callback, status, headers);
                }.bind(this));
            }
        }




        , _listOneAction: function(collection, req, callback) {
            if (!this._controllerCollection[collection].listOne) callback(new Error('The listOne action is not implemented on the «'+this.name+'.'+collection+'» controller!'));
            else {
                this._controllerCollection[collection].listOne(req, function(err, result, status, headers) {
                    this._handleResponse(err, result, req, callback, status, headers);
                }.bind(this));
            }
        }





        , _createAction: function(collection, req, callback) {
            if (!this._controllerCollection[collection].create) callback(new Error('The create action is not implemented on the «'+this.name+'.'+collection+'» controller!'));
            else {
                this._controllerCollection[collection].create(req, function(err, result, status, headers) {
                    this._handleResponse(err, result, req, callback, status, headers);
                }.bind(this));
            }
        }





        , _updateAction: function(collection, req, callback) {
            if (!this._controllerCollection[collection].update) callback(new Error('The list update is not implemented on the «'+this.name+'.'+collection+'» controller!'));
            else {
                this._controllerCollection[collection].update(req, function(err, result, status, headers) {
                    this._handleResponse(err, result, req, callback, status, headers);
                }.bind(this));
            }
        }





        , _createOrUpdateAction: function(collection, req, callback) {
            if (!this._controllerCollection[collection].createOrUpdate) callback(new Error('The createOrUpdate action is not implemented on the «'+this.name+'.'+collection+'» controller!'));
            else {
                this._controllerCollection[collection].createOrUpdate(req, function(err, result, status, headers) {
                    this._handleResponse(err, result, req, callback, status, headers);
                }.bind(this));
            }
        }





        , _createRelationAction: function(collection, req, callback) {
            if (!this._controllerCollection[collection].createRelation) callback(new Error('The createRelation action is not implemented on the «'+this.name+'.'+collection+'» controller!'));
            else {
                this._controllerCollection[collection].createRelation(req, function(err, result, status, headers) {
                    this._handleResponse(err, result, req, callback, status, headers);
                }.bind(this));
            }
        }





        , _deleteAction: function(collection, req, callback) {
            if (!this._controllerCollection[collection].delete) callback(new Error('The delete action is not implemented on the «'+this.name+'.'+collection+'» controller!'));
            else {
                this._controllerCollection[collection].delete(req, function(err, result, status, headers) {
                    this._handleResponse(err, result, req, callback, status, headers);
                }.bind(this));
            }
        }





        , _describeAction: function(collection, req, callback) {
            if (!this._controllerCollection[collection].describe) callback(new Error('The describe action is not implemented on the «'+this.name+'.'+collection+'» controller!'));
            else {
                this._controllerCollection[collection].describe(req, function(err, result, status, headers) {
                    this._handleResponse(err, result, req, callback, status, headers);
                }.bind(this));
            }
        }
    });
}();
