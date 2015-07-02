
    !function() {
        'use strict';

        var Class          = require('ee-class')
            , log          = require('ee-log')
            , project      = require('ee-project')
            , fs           = require('fs')
            , EventEmitter = require('ee-event-emitter')
            , SOAResponse  = require('ee-soa-response')
            , type         = require('ee-types')
            , argv         = require('ee-argv')
            , debug        = argv.has('dev-service')
            , debugService = argv.has('debug-service');

        module.exports = new Class({
            inherits: EventEmitter

            , name                 : ''
            , _controllerLoadCount : 0
            , _loaded              : false



            , _permissionMap: {
                  list: 'read'
                , listOne: 'read'
                , create: 'create'
                , createOrUpdate: 'create'
                , update: 'update'
                , updateRelation: 'update'
                , delete: 'delete'
                , deleteRelation: 'delete'
                , describe: 'describe'
            }



            , init: function(options, dirname) {
                this.options = options || {};

                if(dirname) {
                    this.serviceDir = dirname + '/../';
                }

                // load permissions management if its present
                if (options.permissionManager) this.permissionManager = options.permissionManager;
                if (options.accessToken) this.accessToken = options.accessToken;


                this._conf = {
                      tablesToLoad: []
                    , controllersToLoad: []
                };

                this._controllerCollection = {};

                this._middleware = [];

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


                // set the loaded flag
                this.on('load', function() {
                    this.loaded = true;
                }.bind(this));


                // Load configurations
                this._loadConfiguration(function(err) {
                    if(err) throw err;

                    if(debug) log.info('['+this.name+'] configuration loaded');
                    if(debug) log.info('['+this.name+'] init controllers');

                    this._initController();

                }.bind(this));
            }



            /**
             * returns a map of controllers and their actions
             */
            , getControllerMap: function(map) {
                var map = map || {};

                Object.keys(this._controllerCollection).forEach(function(controllerName) {
                    map[this.name+'.'+controllerName] = this._controllerCollection[controllerName].getActionNames();
                }.bind(this));

                return map;
            }




            , isService: function() {
                return true;
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

            , getControllers: function() {
                return this._controllerCollection;
            }

            , useMiddleware: function(middleware) {
                if (middleware && typeof middleware.request === 'function') {
                    if(debug) log('['+this.name+'] middleware «' + middleware + '» loaded!')
                    this._middleware.push(middleware);
                }
                else throw new Error('['+this.name+'] can`t load middleware «' + middleware + '»!');
            }

            , nextRequest: function(req, res) {
                var index  = 0
                    , next = function(err) {
                        if(this._middleware.length > index) {
                            index++;
                            this._middleware[index - 1].request(req, res, next, this._middleware.length === index);
                        }
                        else {
                            this._request(req, function(err, data, status, headers) {

                                if(headers) {
                                    Object.keys(headers).forEach(function(headerKey) {
                                        res.setHeader(headerKey, headers[headerKey]);
                                    }.bind(this));
                                }

                                if(err) {
                                    if(debug) log('['+this.name+'] returned an error', err);
                                    res.send(status || res.statusCodes.SERVICE_EXCEPTION, err);
                                    return;
                                }

                                if(data) {
                                    if(type.function(data.toJSON)) data = data.toJSON();

                                    if(debug) log('['+this.name+'] send data to response', data);

                                    res.send(status || res.statusCodes.OK, data);
                                }
                                else {
                                    if(debug) log('['+this.name+'] no data provided for request', req, data);
                                    res.send(status || res.statusCodes.TARGET_NOT_FOUND);
                                }

                            }.bind(this));
                        }
                        //else res.send(res.status.TARGET_NOT_FOUND, {});
                    }.bind(this);

                next();
            }

            , request: function(req, res) {
                this.nextRequest(req, res);
            }



            /**
             * handle requests after the middelwares were executed
             */
            , _request: function(req, callback) {
                var collection = req.getCollection();

                if (debugService) log.info('[DefaultService] incoming request on '+[this.name, req.getCollection(), req.getActionName()].join('.')+' ...');

                if(this._hasController(collection)) {
                    var action = req.getActionName() || req.getAction();

                    // TODO: move to DefaultORMController
                    if((action === 'create' || action === 'createOrUpdate') && req.hasRelatedTo()) {
                        action = 'createRelation';
                    }

                    if (debugService) log.info('[DefaultService] the permissions management is '+(this.permissionManager ? 'enabled' : 'disabled')+' ...');

                    // check permissions if the permissions manager
                    // was loaded
                    if (this.permissionManager) {

                        // load the permissions
                        this.permissionManager.getPermission(req.accessTokens || []).then(function(permission) {

                            // check permissions, go through or return an error
                            if (permission.isActionAllowed(this.name+'.'+collection, this._permissionMap[action] || action)) {

                                if (debugService) log.info('[DefaultService] '+[this.name, req.getCollection(), req.getActionName()].join('.')+' - access was granted!');

                                // store the permissions object on the request
                                req.permissions = permission;

                                // go :)
                                this._executeRequest(collection, action, req, callback);
                            }
                            else {
                                if (debugService) log.info('[DefaultService] '+[this.name, req.getCollection(), req.getActionName()].join('.')+' - access was denied! tokens: '+(req.accessTokens || []).join(', '));

                                callback(new Error('You [the user(s) '+permission.getUsers().map(function(u) {return u.id}).join(', ')+' and the service(s) '+permission.getServices().map(function(s) {return s.identifier}).join(', ')+'] are not allowed to access the controller «'+collection+'», action «'+(this._permissionMap[action] || action)+'» on the service «'+this.name+'»!'), {}, SOAResponse.statusCodes.ACCESS_UNAUTHORIZED);
                            }
                        }.bind(this)).catch(function(err) {
                            if (debugService) log.info('[DefaultService] '+[this.name, req.getCollection(), req.getActionName()].join('.')+' - the permission mnagement returned an error: '+err);

                            // failed to load the permissions
                            callback(new Error('Failed to load the permissions for the controller «'+collection+'», action «'+(this._permissionMap[action] || action)+'» on the service «'+this.name+'»: '+err), {}, SOAResponse.statusCodes.SERVICE_EXCEPTION);
                        }.bind(this));
                    }

                    // permissions not implemented (i fuckin hope so :/)
                    else this._executeRequest(collection, action, req, callback);
                }
                else callback(new Error(collection + " not found in service " + this.name));
            }



            /**
             * execute the request after the permissions check
             */
            , _executeRequest: function(collection, action, req, callback) {
                var controllerAction = '_' + action + 'Action';

                // it's not exactly known why this works like this works :/
                if (this[controllerAction]) {
                    if (debugService) log.info('[DefaultService] '+[this.name, req.getCollection(), req.getActionName()].join('.')+' - calling service method «'+controllerAction+'» ...');

                    this[controllerAction](collection, req, callback);
                }
                else if (this._controllerCollection[collection][action]) {
                    if (debugService) log.info('[DefaultService] '+[this.name, req.getCollection(), req.getActionName()].join('.')+' - calling controller ...');

                    this._controllerCollection[collection][action](req, function(err, result, status, headers) {
                        if (debugService) {
                            if (err) log.warn('[DefaultService] '+[this.name, req.getCollection(), req.getActionName()].join('.')+' - got an error response from the controller: '+err);
                            else if (status) log.info('[DefaultService] '+[this.name, req.getCollection(), req.getActionName()].join('.')+' - controller responded with the status «'+status+'» ...');
                            else log.info('[DefaultService] '+[this.name, req.getCollection(), req.getActionName()].join('.')+' - controller responded with the default status ...');
                        }

                        this._handleResponse(err, result, req, callback, status, headers);
                    }.bind(this));
                }
                else callback(new Error(action + " action not known"));
            }




            , _handleRequest: function(req, callback) {
                var collection = req.getCollection();

                if (debugService) log.info('[DefaultService] Outgoing request for '+[this.name, req.getCollection(), req.getActionName()].join('.')+' ...');

                // add my own accesstoken if the feature is loaded
                if (this.accessToken && req.accessTokens) {
                    if (debugService) log.debug('[DefaultService] Added my service token ...');

                    req.accessTokens.push(this.accessToken);
                }



                var res = new SOAResponse();
                    res.on('end', function(status, result) {
                        var err = null;
                        if(result && result.error) err = result;

                        if (debugService) log.info('[DefaultService] Outgoing request for '+[this.name, req.getCollection(), req.getActionName()].join('.')+' responded with the status «'+status+'» ...');

                        callback(err, result); //TODO: write status and check, give callback direct to on end, or write error on res
                    }.bind(this));

                if(this._hasController(collection)) {
                    if (debugService) log.debug('[DefaultService] Hanbdling request internally ...');

                    this.request(req, res);
                }
                else {
                    if (debugService) log.debug('[DefaultService] Emitting request ...');

                    this.emit('request', req, res);
                }
            }

            , _handleResponse: function(err, result, req, callback, status, headers) {

                //
                //==========================
                // TODO: REMOVE AFTER TESTING
                //==========================
                if(err) {
                    if(!err.error) {
                        err = {
                            error: 1
                            , msg: '['+this.name+'] ' + err.message
                        };
                    }
                }
                //==========================
                //  END REMOVE AFTER TESTING
                //==========================

                callback(err, result, status, headers);
            }

            , _initController: function() {
                var loaded = function() {
                    this._controllerLoadCount--;
                    if(this._controllerLoadCount <= 0) {
                        log.info('['+this.name+'] controllers loaded');
                        this._loaded = true;
                        this.emit('load');
                    }
                }.bind(this);

                this._controllerLoadCount = this._conf.controllersToLoad.length + this._conf.tablesToLoad.length;

                if(this._controllerLoadCount === 0) loaded();

                this._conf.controllersToLoad.forEach(function(controller, index) {
                    try {
                        var Controller = require(controller.path);
                    } catch (err) {
                        log(err);
                        throw new Error('['+this.name+'] Error loading controllerFile "' + controller.path + '": ' + err);
                    }

                    var newController = new Controller(this.options.controllerOptions);
                    newController.on('load', function(err) {
                        if(err) throw err;

                        if(debug) log('['+this.name+'] Controller "' + controller.name + '" loaded...');
                        var name = newController.name || controller.name;
                        this._controllerCollection[name] = newController;
                        loaded();
                    }.bind(this));

                    newController.on('request', this._handleRequest.bind(this));

                }.bind(this));

                this._initDefaultController(loaded);
            }

            , _initDefaultController: function (loaded) {
                // how about telling the user he has actually to load the controllers himself or
                // he must use the Service, not the Defaultservice
                if (this._conf.tablesToLoad.length) throw new Error('There are some controllers that should be generated from db tables, you probably inherit from the DefaultService instead of from the Service.');
            }

            , _loadConfiguration: function(cb) {

                // load configuration
                var bundleConfiguration
                    , controllerToLoad
                    , controllerDir = 'Controller'
                    , serviceDir    = this.serviceDir;

                try {
                    bundleConfiguration = require(serviceDir + 'service.js');
                } catch (err) {
                    log('Failed to load the service onfiguration for the «%s» service ...', this.name);
                    log(err);
                    process.exit();
                }

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
                    var path = serviceDir + controllerDir;
                    fs.readdir(path, function(err, files) {
                        if (!err) this._initControllersToLoad(files, serviceDir, controllerDir);
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
                // var name = controllerFile.match(/^(.*)Controller?(\.js)?$/);
                // if(name && name[1] && name[1].length) return name[1].charAt(0).toLowerCase() + name[1].slice(1);
                // else if(controllerFile.length) return controllerFile;
                var name = controllerFile.replace(/controller/gi, '').replace('.js', '');
                name     = name.charAt(0).toLowerCase() + name.slice(1);
                if(name) return name;
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
