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





        , init: function(options, dirname) {
            this.options = options || {};

            this.silent = options && options.silent || argv.has('silent');

            // make sure the controlelroptions are set and that the properties
            // reside in the prototype
            if (!this.options.controllerOptions) this.options.controllerOptions = {};
            else this.options.controllerOptions = Object.create(this.options.controllerOptions);



            if(dirname) {
                this.serviceDir = dirname + '/../';
            }

            // load permissions management if its present
            if (options.permissionManager) this.permissionManager = options.permissionManager;
            if (options.accessToken) {
                this.accessToken = options.accessToken;

                // add my accessToken
                this.options.controllerOptions.accessToken = options.accessToken;
            }


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





        /**
         * send requests through middlewares
         */
        , nextRequest: function(req, res) {
            var index  = 0
                , next = function(err) {
                    if(this._middleware.length > index) {
                        index++;
                        this._middleware[index - 1].request(req, res, next, this._middleware.length === index);
                    }
                    else {
                        this._request(req, function(err, data, status, headers) {

                            if (type.object(headers)) {
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





        /**
         * handle incoming requests
         */
        , request: function(req, res) {
            this.nextRequest(req, res);
        }







        /**
         * handle requests after the middelwares were executed
         */
        , _request: function(req, callback) {
            var collection = req.getCollection();

            if (debugService) {
                log.highlight('[DefaultService] incoming request on '+[this.name, req.getCollection(), req.getActionName()].join('.')+' ...');

                var cb = callback;

                callback = function(err) {
                    if (err) log.warn('[DefaultService] '+[this.name, req.getCollection(), req.getActionName()].join('.')+' - the request resulted in an error: '+(err && err.msg ? err.msg : err));
                    else log.highlight('[DefaultService] '+[this.name, req.getCollection(), req.getActionName()].join('.')+' - the response is beeing sent!');

                    cb.apply(null, Array.prototype.slice.call(arguments, 0))
                }.bind(this);
            }


            if(this._hasController(collection)) {
                var action = req.getActionName() || req.getAction();

                // set the right action for relations:
                // soa-request doesn`t know createRelation, updateRelation or deleteRelation action
                if((action === 'create' || action === 'createOrUpdate') && req.hasRelatedTo()) {
                    action = 'createRelation';
                }
                if(action === 'update' && req.hasRelatedTo()) {
                    action = 'updateRelation';
                }
                if(action === 'delete' && req.hasRelatedTo()) {
                    action = 'deleteRelation';
                }

                if (debugService) log.info('[DefaultService] the permissions management is '+(this.permissionManager ? 'enabled' : 'disabled')+' ...');

                // check permissions if the permissions manager
                // was loaded
                if (this.permissionManager) {

                    // load the permissions
                    this.permissionManager.getPermission(req.accessTokens || []).then(function(permission) {
                        try {

                            // check permissions, go through or return an error
                            if (permission.isActionAllowed(this.name+'.'+collection, action)) {

                                if (debugService) log.info('[DefaultService] '+[this.name, req.getCollection(), req.getActionName()].join('.')+' - access was granted!');

                                // store the permissions object on the request
                                req.permissions = permission;

                                if (type.function(permission.getRateLimitInfo)) {

                                    // check rate limit
                                    permission.getRateLimitInfo().then((info) => {

                                        // if there isn't any info we're good, it
                                        // indicates that isnt any limit
                                        if (!info || info.left > 0) this._executeRequest(collection, action, req, callback);
                                        else this._handleResponse(new Error(`Rate limit exceeded! You have ${info.capacity} credits per ${info.interval} second. Left 0!`), null, req, callback, SOAResponse.statusCodes.ACCESS_LIMIT_EXCEEDED);
                                    }).catch((err) => {
                                        if (debugService) log.info('[DefaultService] '+[this.name, req.getCollection(), req.getActionName()].join('.')+' - the permission mnagement rate limiter returned an error: '+err);
                                        log(err);

                                        // failed to load the permissions
                                        this._handleResponse(new Error('Failed to load the rate limits for the controller «'+collection+'», action «'+(action)+'» on the service «'+this.name+'»: '+err), null, req, callback, SOAResponse.statusCodes.SERVICE_EXCEPTION);
                                    });
                                }
                                else this._executeRequest(collection, action, req, callback);
                            }
                            else {
                                if (debugService) log.info('[DefaultService] '+[this.name, req.getCollection(), action].join('.')+' - access was denied! tokens: '+(req.accessTokens || []).join(', '));

                                this._handleResponse(new Error('You [the user(s) '+permission.getUsers().map(function(u) {return u.id}).join(', ')+' and the service(s) '+permission.getServices().map(function(s) {return s.identifier}).join(', ')+'] are not allowed to access the controller «'+collection+'», action «'+(action)+'» on the service «'+this.name+'»!'), null, req, callback, SOAResponse.statusCodes.ACCESS_UNAUTHORIZED);
                            }
                        }
                        catch (err) {
                            log.warn('[DefaultService] '+[this.name, req.getCollection(), action].join('.')+' threw an error:');
                            log(err);

                            this._handleResponse(new Error('The controller «'+collection+'», action «'+(action)+'» threw an error on the service «'+this.name+'»: '+err), null, req, callback, SOAResponse.statusCodes.SERVICE_EXCEPTION);
                        }
                    }.bind(this)).catch(function(err) {
                        if (debugService) log.info('[DefaultService] '+[this.name, req.getCollection(), req.getActionName()].join('.')+' - the permission mnagement returned an error: '+err);
                        log(err);

                        // failed to load the permissions
                        this._handleResponse(new Error('Failed to load the permissions for the controller «'+collection+'», action «'+(action)+'» on the service «'+this.name+'»: '+err), null, req, callback, SOAResponse.statusCodes.SERVICE_EXCEPTION);
                    }.bind(this));
                }

                // permissions not implemented (i fuckin hope so :/)
                else this._executeRequest(collection, action, req, callback);
            }
            else this._handleResponse(new Error(collection + " not found in service " + this.name), {}, req, callback);
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








        /**
         * handeles Outgoing generic requests
         */
        , sendRequest: function(request, response) {
            if (debugService) {
                response.on('end', function(status) {
                    log.info('[DefaultService] Outgoing request for '+[this.name, request.getCollection(), request.getActionName()].join('.')+' responded with the status «'+status+'» ...');
                }.bind(this));
            }

            this.emit('request', request, response);
        }








        /**
         * handles Outgoing orm controller requests
         */
        , _handleRequest: function(req, callback) {
            var   collection = req.getCollection()
                , response;


            if (debugService) log.info('[DefaultService] Outgoing request for '+[this.name, req.getCollection(), req.getActionName()].join('.')+' ...');


            // we may have gotten a soa response instead of a callback
            if (type.object(callback)) {
                response = callback;

                if (debugService) {
                    response.once('end', function(status, result) {
                        log.info('[DefaultService] Outgoing request for '+[this.name, req.getCollection(), req.getActionName()].join('.')+' responded with the status «'+status+'» ...');
                    }.bind(this));
                }
            }

            // we need to make our own response object
            else {
                response = new SOAResponse();

                response.once('end', function(status, result) {
                    var err = null;
                    if(result && result.error) err = result;

                    if (debugService) log.info('[DefaultService] Outgoing request for '+[this.name, req.getCollection(), req.getActionName()].join('.')+' responded with the status «'+status+'» ...');

                    callback(err, result, status, response.headers); //TODO: write status and check, give callback direct to on end, or write error on res
                }.bind(this));
            }


            // keep the request internal?
            if(this._hasController(collection)) {
                if (debugService) log.debug('[DefaultService] Hanbdling request internally ...');

                this.request(req, response);
            }
            else {
                if (debugService) log.debug('[DefaultService] Emitting request ...');

                this.emit('request', req, response);
            }
        }









        , _handleResponse: function(err, result, request, callback, status, headers) {

            //
            //==========================
            // TODO: REMOVE AFTER TESTING
            //==========================
            if(err) {
                if(!err.error) {
                    if (debugService) log.warn('['+[this.name, request.getCollection(), request.getActionName()].join('.')+'] Got error response: '), log(err);

                    err = {
                          error: 1
                        , status: status
                        , msg: '['+[this.name, request.getCollection(), request.getActionName()].join('.')+'] ' + err.message
                    };
                }
            }
            //==========================
            //  END REMOVE AFTER TESTING
            //==========================

            // pay the rate limit
            if (request.permissions && type.function(request.permissions.payRateLimit)) {

                if (headers && headers['Rate-Limit-Cost'] && !isNaN(headers['Rate-Limit-Cost'])) {
                    // get request cost
                    let cost = parseInt((headers['Rate-Limit-Request-Cost'] ? headers['Rate-Limit-Request-Cost'] : headers['Rate-Limit-Cost']), 10);

                    // delete header that must not be exposed to the outside
                    if (headers['Rate-Limit-Request-Cost']) delete headers['Rate-Limit-Request-Cost'];


                    // get info
                    request.permissions.getRateLimitInfo().then((info) => {
                        if (info) {

                            // increase cost if the request is near the capacity of the limit
                            cost *= (1+cost/info.capacity);

                            // pay
                            return request.permissions.payRateLimit(cost).then((info) => {
                                headers['Rate-Limit'] = `${info.capacity}/${info.interval}s`;
                                headers['Rate-Limit-Balance'] = info.left;

                                callback(err, result, status, headers);
                            });
                        } else callback(err, result, status, headers);
                    }).catch((err) => {
                        if (debugService) log.info('[DefaultService] '+[this.name, request.getCollection(), request.getActionName()].join('.')+' - the permission mnagement rate limiter returned an error: '+err);
                        log(err);

                        // failed to load the permissions
                        callback(new Error('Failed to store the rate limits for the controller «'+request.getCollection()+'», action «'+(request.getActionName())+'» on the service «'+this.name+'»: '+err), null, SOAResponse.statusCodes.SERVICE_EXCEPTION, null);
                    });
                }
                else {
                    request.permissions.getRateLimitInfo().then((info) => {
                        headers = headers || {};

                        if (info) {
                            headers['Rate-Limit'] = `${info.capacity}/${info.interval}s`;
                            headers['Rate-Limit-Balance'] = info.left;
                        }

                        callback(err, result, status, headers);
                    }).catch((err) => {
                        if (debugService) log.info('[DefaultService] '+[this.name, request.getCollection(), request.getActionName()].join('.')+' - the permission mnagement rate limiter returned an error: '+err);
                        log(err);

                        // failed to load the permissions
                        callback(new Error('Failed to get the rate limits for the controller «'+request.getCollection()+'», action «'+(request.getActionName())+'» on the service «'+this.name+'»: '+err), null, SOAResponse.statusCodes.SERVICE_EXCEPTION, null);
                    });
                }
            }
            else callback(err, result, status, headers);
        }








        , _initController: function() {
            var loaded = function() {
                this._controllerLoadCount--;
                if(this._controllerLoadCount <= 0) {
                    if (!this.silent) log.info('The '+this.name.green+' service has finished loading its '+((this._conf.controllersToLoad.length+this._conf.tablesToLoad.length)+'').yellow+' controllers ...');
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

                // make sure each controller rknows its name
                if (!newController.name) newController.name = controller.name;
                if (!newController.serviceName) newController.serviceName = this.name;

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
