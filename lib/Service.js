
    !function() {
        'use strict';

        var Class               = require('ee-class')
            , log               = require('ee-log')
            , project           = require('ee-project')
            , fs                = require('fs')
            , DefaultController = require('./DefaultController')
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

                // GET THE ORM
                this.orm    = options.orm || null;
                this.dbName = options.dbName || null;

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
                    log.info(this._conf);
                    log.info('['+this.name+'] init controllers');

                    this._initController();

                }.bind(this));

            }

            , onLoad: function(callback) {
                if(this._loaded) callback();
                else this.on('load', callback);
            }

            , request: function(req, res) {
                if(this._controllerCollection[req.controller]) {

                    switch (req.action) {
                        case 'single':
                            this._controllerCollection[req.controller].listOne(req, function(err, result) {
                                if(err) log(err);
                                log(result);
                            }.bind(this));
                        	break;
                        case 'list':
                            this._controllerCollection[req.controller].list(req, function(err, result) {
                                //log(error);
                                log(result);
                            }.bind(this));
                            break;
                        case 'update':
                            this._controllerCollection[req.controller].update(req, function(err, result) {
                                //cb(err, result);
                            }.bind(this));
                            break;
                        default:
                            throw new Error(req.action + " not known"); // TODO: write on res
                    }

                }
                else {
                    throw new Error(req.controller + " not found in service " + this.name); //TODO: write on res
                }
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
                        log(err);
                        throw new Error('Controller-File "' + controller.path + '" could not be found!');
                    }

                    var newController = new Controller({orm: this.orm, dbName: this.dbName, service: this});
                    newController.on('load', function(err) {
                        if(err) throw err;

                        log('Controller "' + controller.name + '" loaded...');
                        this._controllerCollection[controller.name] = newController;
                        loaded();
                    }.bind(this));

                }.bind(this));

                this._conf.tablesToLoad.forEach(function(table, index) {
                    try {
                        var controller = new DefaultController({orm: this.orm, dbName: this.dbName, table: table, service: this});
                    } catch (err) {
                        log(err);
                        throw new Error('Could not load DefaultController-File for table "' + table + '"');
                    }

                    controller.on('load', function(err) {
                        if(err) throw err;

                        log('Controller "' + table + '" loaded...');
                        this._controllerCollection[table] = controller;
                        loaded();
                    }.bind(this));

                }.bind(this));
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
                if(name[1] && name[1].length) return name[1].toLowerCase();
                else if(controllerFile.length) return controllerFile;
                else throw new Error('"' + controllerFile + '" is not a valid string to generate a controllerName');
            }

            , _addTablesToLoad: function(tables) {
                tables.forEach(function(value, index) {
                    if(!value.length) throw new Error('"' + value + '" is not a valid tableName');
                    if(!this._controllerAlreadyInList(value)) this._conf.tablesToLoad.push(value);
                }.bind(this));
            }

            , _addControllersToLoad: function(controllers) {
                controllers.forEach(function(value, index) {
                    if(!this._controllerAlreadyInList(value.name)) this._conf.controllersToLoad.push(value);
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

            , getControllerNames: function() {
                var names = [];
                Object.keys(this._controllerCollection).forEach(function(controllerName) {
                    names.push(controllerName);
                }.bind(this));

                return names;
            }

        });

    }();
