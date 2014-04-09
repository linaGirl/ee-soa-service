
    !function() {
        'use strict';

        var Class               = require('ee-class')
            , log               = require('ee-log')
            , project           = require('ee-project')
            , fs                = require('fs')
            , EventEmitter      = require('ee-event-emitter');

        module.exports = new Class({
            inherits: EventEmitter

            , _conf: {
                'tablesToLoad'        : []
                , 'controllersToLoad' : []
            }

            , _controllerCollection : {}

            , _controllerLoadCount  : 0
            , _loaded               : false

            , name                  : ''

            , init: function(options) {
                this.options = options || {};

                // set name if not defined
                if(!this.name) {
                    if(project.config.name) this.name = project.config.name
                    else {
                        var dir = project.root;
                        dir = dir.split('/');

                        if(dir) this.name = dir[dir.length - 2];
                    }

                    if(!this.name) throw new Error('no service name provided!');
                }

                // Load configurations
                this._loadConfiguration(function(err) {
                    if(err) throw err;

                    log.info('['+this.name+'] configuration loaded');
                    log.info('['+this.name+'] init controllers');

                    this._initController();

                }.bind(this));

            }

            , onLoad: function(callback) {
                if(this._loaded) callback();
                else this.on('load', callback);
            }

            , getControllerNames: function() {
                var names = [];
                Object.keys(this._controllerCollection).forEach(function(controllerName) {
                    names.push(controllerName);
                }.bind(this));

                return names;
            }

            , request: function(req, res) {
                this._request(req, function(err, data) {
                    if(err) return log(err); // TODO: do it with statusCodes

                    if(data) {
                        log('send data to response', data);
                        res.send(res.status.OK, data);
                    }
                    else {
                        log('not data provided for request', req, data);
                    }

                }.bind(this));
            }

            , internalRequest: function(req, callback) {
                this._request(req, callback);
            }

            , _request: function(req, callback) {
                var collection = req.getCollection();

                if(this._hasController(collection)) {
                    var action = req.getActionName();

                    if((action === 'create' || action === 'update' || action === 'createOrUpdate') && req.hasRelatedTo()) {
                        action = 'createRelation';
                    }

                    var controllerAction = '_' + action + 'Action';
                    if(this[controllerAction]) {
                        this[controllerAction](collection, req, callback);
                    }
                    else if(this._controllerCollection[collection][action])
                    {
                        this._controllerCollection[collection][action](req, function(err, result) {
                            this._handleResponse(err, result, req, callback);
                        }.bind(this));
                    }
                    else {
                        log(this);
                        throw new Error(action + " action not known"); // TODO: write on res
                    }

                }
                else {
                    throw new Error(collection + " not found in service " + this.name); //TODO: write on res
                }
            }

            , _handleRequest: function(req, callback) {
                var collection = req.getCollection();

                if(this._hasController(collection)) {
                    this._request(req, callback);
                }
                else {
                    this.emit('request', req, callback);
                }
            }

            , _handleResponse: function(err, result, req, callback) {
                callback(err, result);
            }

            , _initController: function() {
                var loaded = function() {
                    this._controllerLoadCount--;
                    if(this._controllerLoadCount === 0) {
                        log.info('['+this.name+'] controllers loaded');
                        this._loaded = true;
                        this.emit('load');
                    }
                }.bind(this);

                this._controllerLoadCount = this._conf.controllersToLoad.length + this._conf.tablesToLoad.length;

                this._conf.controllersToLoad.forEach(function(controller, index) {
                    try {
                        var Controller = require(controller.path);
                    } catch (err) {
                        throw new Error('['+this.name+'] Controller-File "' + controller.path + '" could not be found!');
                    }

                    var newController = new Controller(this.options.controllerOptions);
                    newController.on('load', function(err) {
                        if(err) throw err;

                        log('['+this.name+'] Controller "' + controller.name + '" loaded...');
                        var name = newController.name || controller.name;
                        this._controllerCollection[name] = newController;
                        loaded();
                    }.bind(this));

                    newController.on('request', this._handleRequest.bind(this));

                }.bind(this));

                this._initDefaultController(loaded);
            }

            , _initDefaultController: function (loaded) {
                // LOAD YOUR DEFAULTCONTROLLERS
            }

            , _loadConfiguration: function(cb) {

                // load configuration
                var bundleConfiguration
                    , controllerToLoad
                    , controllerDir = 'Controller'
                    , serviceDir    = project.root;

                try {
                    bundleConfiguration = require(serviceDir + 'service.js');
                } catch (err) {}

                if(bundleConfiguration) {

                    if(bundleConfiguration.controller) {
                        controllerToLoad = bundleConfiguration.controller;
                    }

                    if(bundleConfiguration.controllerDir) {
                        controllerDir = bundleConfiguration.controllerDir;
                    }

                    if(bundleConfiguration.tables) {
                        this._addTablesToLoad(bundleConfiguration.tables);
                    }

                }

                // load all
                if(!controllerToLoad) {
                    fs.readdir(serviceDir + controllerDir, function(err, files) {
                        if(err) throw err;
                        this._initControllersToLoad(files, serviceDir, controllerDir);
                        cb();
                    }.bind(this));
                }
                // load configurated controllers
                else {
                    this._initControllersToLoad(controllerToLoad, serviceDir, controllerDir);
                    cb();
                }

            }

            , _initControllersToLoad: function(controllerToLoad, serviceDir, controllerDir) {
                controllerToLoad.forEach(function(controllerFile, index) {
                    var controller = {
                          name: this._getControllerName(controllerFile)
                        , path: serviceDir + controllerDir + '/' + controllerFile
                    };
                    this._addControllersToLoad([controller]);
                }.bind(this));
            }

            , _getControllerName: function(controllerFile)
            {
                var name = controllerFile.match(/^(.*)Controller(\.js)?$/);
                if(name && name[1] && name[1].length) return name[1].charAt(0).toLowerCase() + name[1].slice(1);
                else if(controllerFile.length) return controllerFile;
                else throw new Error('['+this.name+'] "' + controllerFile + '" is not a valid string to generate a controllerName');
            }

            , _addTablesToLoad: function(tables) {
                tables.forEach(function(value, index) {
                    if(!value.length) throw new Error('"' + value + '" is not a valid tableName');
                    if(!this._controllerAlreadyInList(value)) this._conf.tablesToLoad.push(value);
                    else throw new Error('['+this.name+'] another controller with name "' + value + '" already managed !');
                }.bind(this));
            }

            , _addControllersToLoad: function(controllers) {
                controllers.forEach(function(value, index) {
                    if(!this._controllerAlreadyInList(value.name)) this._conf.controllersToLoad.push(value);
                    else throw new Error('['+this.name+'] another controller with name "' + value.name + '" already managed !');
                }.bind(this));
            }

            , _controllerAlreadyInList: function(controllerName)
            {
                this._conf.controllersToLoad.forEach(function(controller, index) {
                    if(controller.name === controllerName) return true;
                }.bind(this));
                if(this._conf.tablesToLoad.indexOf(controllerName) >= 0) return true;

                return false;
            }

            , _hasController: function(controllerName) {
                return Object.hasOwnProperty.call(this._controllerCollection, controllerName);
            }

        });

    }();
