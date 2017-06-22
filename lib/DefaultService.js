!function() {
    'use strict';

    var Class                           = require('ee-class')
        , log                           = require('ee-log')
        , project                       = require('ee-project')
        , fs                            = require('fs')
        , EventEmitter                  = require('ee-event-emitter')
        , SOAResponse                   = require('ee-soa-response')
        , type                          = require('ee-types')
        , argv                          = require('ee-argv')
        , debug                         = argv.has('dev-service')
        , debugService                  = argv.has('debug-service');



    const Logger = require('./Logger');
    const logger = debugService ? new Logger('f') : null;


    const distributed                   = require('distributed-prototype');
    const DistributedPermissionsBridge  = require('./DistributedPermissionsBridge');
    const path                          = require('path');
    const PermissionsServiceClient      = require('permissions-service').Client;
    const RowRestirciontsServiceClient  = require('row-restrictions-service').Client;
    const RateLimitServiceClient        = require('rate-limit-service').Client;




    module.exports = new Class({
        inherits: EventEmitter

        , name                 : ''
        , _loaded              : false





        , init: function(options, dirname) {
            this.options = options || {};

            this.silent = options && options.silent || argv.has('silent');

            // make sure the controlelroptions are set and that the properties
            // reside in the prototype
            if (!this.options.controllerOptions) this.options.controllerOptions = {};
            else this.options.controllerOptions = Object.create(this.options.controllerOptions);



            if(dirname) {
                this.serviceDir = path.join(dirname, '/../');
            }


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



            // distributed permissions management
            this.legacyLayer = new DistributedPermissionsBridge(this);
            this.legacyLayer.on('request', (request, response) => {
                this.emit('request', request, response);
            });


            this.permissions = new PermissionsServiceClient(this.legacyLayer);
            this.options.controllerOptions.permissions = this.permissions;


            // row restrictions
            this.rowRestrictions = new RowRestirciontsServiceClient({
                  serviceName: this.name || options.name
                , gateway: this.legacyLayer
            });


            // row restrictions
            this.rateLimits = new RateLimitServiceClient({
                  serviceName: this.name || options.name
                , gateway: this.legacyLayer
            });
        }






        , end: function() {
            return Promise.all(Object.keys(this._controllerCollection).map((name) => {
                if (this._controllerCollection[name].end) return this._controllerCollection[name].end();
                else return Promise.resolve();
            }));
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
            else {
                const continueLoading = () => {
                    return new Promise((resolve, reject) => {

                        // start loading stuff here
                        this._loadConfiguration((err) => {
                            if (err) reject(err);
                            else {
                                if (debug) log.info('['+this.name+'] configuration loaded');
                                if (debug) log.info('['+this.name+'] init controllers');

                                // instantiate controlelrs
                                this._initController((err) => {
                                    if (err) reject(err);
                                    else {
                                        this._loaded = true;
                                        resolve();
                                    }
                                });
                            }
                        });
                    });
                };


                // load service token
                this.permissions.load(this).then(() => {

                    // may be the implementer wants to load stuff
                    // by himself, wait for that
                    if (this.loadHook) return this.loadHook().then(continueLoading);
                    else return continueLoading();
                }).then(() => {

                    if (this.afterLoadHook) return this.afterLoadHook();
                    else return Promise.resolve();
                }).then(x => callback()).catch(callback);
            }
        }



        , setToken(token) {
            this.accessToken = token;
            this.options.controllerOptions.accessToken = token;
                        

            // add to all controllers
            Object.keys(this._controllerCollection).forEach((controllerName) => {
                this._controllerCollection[controllerName].accessToken = token;
            });
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
        , request: function(request, response) {

            // so, we've replaced this not to clean code with something
            // much cleaner. lets check fi we can redirect the request
            // to the cleaner part of the application

            if (request.relatedTo && request.relatedTo.model && request.relatedTo.model.includes('.')) {
                // distributed remote entity, let distributed habndle this request
                
                // make the request recyclable
                delete request.discovered;

                // swap endpoints
                [request.relatedTo.model, request.collection] = [request.collection, request.relatedTo.model];
                [request.relatedTo.id, request.resourceId] = [request.resourceId, request.relatedTo.id];

                // there it goes, bye :D
                this.sendRequest(request, response);
            } else {

                // handle it over here
                this.nextRequest(request, response);
            }
        }







        /**
         * handle requests after the middelwares were executed
         */
        , _request: function(req, callback) {
            var collection = req.getCollection();



            if (debugService) {
                const start = Date.now();
                const logId = logger.request({
                      action: req.getActionName()
                    , service: this.name
                    , resource: req.getCollection()
                    , resourceId: req.resourceId
                    , sourceService: this.name
                });


                const timeout = setInterval(() => {
                    logger.waiting({
                          id: logId
                        , time: Date.now()-start 
                    });
                }, 5000);



                var cb = callback;

                callback = function(err, d, statusCode) {
                    logger.response({
                          id: logId
                        , status: err ? 'error' : (statusCode ? SOAResponse.statusCodes.getMessage(statusCode).toLowerCase() : 'ok')
                        , time: Date.now()-start 
                        , comment: err ? (err.message ? err.message : (err.msg ? err.msg : 'crippled error message!')) : ''
                    });

                    clearInterval(timeout);


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

                //log.info(this.name, collection, action, 'loading ...');

                // load the permissions
                this.permissions.getPermissions(req.accessTokens || []).then((permission) => {
                    try {//log.warn(this.name, collection, action, permission.isActionAllowed(this.name, collection, action));
                        //log.success(this.name, collection, action, 'loaded!');

                        // check permissions, go through or return an error
                        if (permission.isActionAllowed(this.name, collection, action)) {

                            // store the permissions object on the request
                            req.permissions = permission;


                            // get row restrictions
                            this.rowRestrictions.getRestrictions(Array.from(permission.getRoleIds())).then((restrictions) => {
                                
                                // store on request
                                req.restrictions = restrictions;


                                // get rate limits
                                this.rateLimits.getLimit(permission).then((limit) => {


                                    if (!limit || !limit.hasLimit) this._executeRequest(collection, action, req, callback);
                                    else if (limit && limit.hasLimit && limit.currentValue > 0) {

                                        // store on request for later use
                                        req.rateLimit = limit;

                                        this._executeRequest(collection, action, req, callback);
                                    }
                                    else {
                                        this._handleResponse(new Error(`Rate limit exceeded! You have ${limit.credits} credits per ${limit.interval} second. Left ${limit.currentValue}!`), null, req, callback, SOAResponse.statusCodes.ACCESS_LIMIT_EXCEEDED);
                                    }
                                }).catch((err) => {
                                    this._handleResponse(new Error(`Failed to load rate limits: ${err.message}`), null, req, callback, SOAResponse.statusCodes.SERVICE_EXCEPTION);
                                });
                            }).catch((err) => {
                                this._handleResponse(new Error(`Failed to load row restrictions: ${err.message}`), null, req, callback, SOAResponse.statusCodes.SERVICE_EXCEPTION);
                            });
                        }
                        else {

                            this._handleResponse(new Error('Acces denied!'), null, req, callback, SOAResponse.statusCodes.ACCESS_UNAUTHORIZED);
                        }
                    }
                    catch (err) {
                        log.warn('[DefaultService] '+[this.name, req.getCollection(), action].join('.')+' threw an error:');
                        log(err);

                        this._handleResponse(new Error('The controller «'+collection+'», action «'+(action)+'» threw an error on the service «'+this.name+'»: '+err), null, req, callback, SOAResponse.statusCodes.SERVICE_EXCEPTION);
                    }
                }).catch((err) => {
                    if (debugService) log.info('[DefaultService] '+[this.name, req.getCollection(), req.getActionName()].join('.')+' - the permission management returned an error: '+err);
                    if (debugService) log(err);

                    // failed to load the permissions
                    this._handleResponse(new Error('Failed to load the permissions for the controller «'+collection+'», action «'+(action)+'» on the service «'+this.name+'»: '+err), null, req, callback, SOAResponse.statusCodes.SERVICE_EXCEPTION);
                });
            }
            else this._handleResponse(new Error(collection + " not found in service " + this.name), {}, req, callback);
        }







        /**
         * execute the request after the permissions check
         */
        , _executeRequest: function(collection, action, req, callback) {
            var controllerAction = '_' + action + 'Action';

            // it's not exactly known why this works like this works :/
            // probably a year later: still, wtf? really! but: it looks 
            // if normally the code in the if statement is used. 
            // the else if statement is friggin dangerous too.
            if (this[controllerAction]) {
                let callbackWasInvoked = false;
                const intermediateCallback = (...args) => {
                    if (!callbackWasInvoked) callback(...args);
                    callbackWasInvoked = true;
                };


                try {
                    this[controllerAction](collection, req, intermediateCallback);
                } catch (err) {
                    callback(err);
                }
            } else if (this._controllerCollection[collection][action]) {
                if (debugService) log.info('[DefaultService] '+[this.name, req.getCollection(), req.getActionName()].join('.')+' - calling controller ...');

                this._controllerCollection[collection][action](req, function(err, result, status, headers) {
                    if (debugService) {
                        if (err) log.warn('[DefaultService] '+[this.name, req.getCollection(), req.getActionName()].join('.')+' - got an error response from the controller: '+err);
                        else if (status) log.info('[DefaultService] '+[this.name, req.getCollection(), req.getActionName()].join('.')+' - controller responded with the status «'+status+'» ...');
                        else log.info('[DefaultService] '+[this.name, req.getCollection(), req.getActionName()].join('.')+' - controller responded with the default status ...');
                    }

                    this._handleResponse(err, result, req, callback, status, headers);
                }.bind(this));
            } else callback(new Error(action + " action not known"));
        }








        /**
         * handeles Outgoing generic requests
         */
        , sendRequest: function(request, response) {
            if (debugService) {
                const start = Date.now();
                const resource = request.getCollection();

                const logId = logger.request({
                      outgoing: true
                    , action: request.getActionName()
                    , service: resource.includes('.') ? resource.substr(0, resource.indexOf('.')) : 'legacy'
                    , resource: resource.includes('.') ? resource.substr(resource.indexOf('.')+1) : resource
                    , resourceId: request.resourceId
                    , sourceService: this.name
                });


                response.on('end', function(status) {
                    logger.response({
                          id: logId
                        , status: SOAResponse.statusCodes.getMessage(status).toLowerCase()
                        , time: Date.now()-start 
                    });
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

            let logReponse;


            if (debugService) {
                const start = Date.now();
                const resource = req.getCollection();
                
                const logId = logger.request({
                      outgoing: true
                    , action: req.getActionName()
                    , service: resource.includes('.') ? resource.substr(0, resource.indexOf('.')) : 'legacy'
                    , resource: resource.includes('.') ? resource.substr(resource.indexOf('.')+1) : resource
                    , resourceId: req.resourceId
                    , sourceService: this.name
                });


                logReponse = (statusCode, data) => {
                    const status = SOAResponse.statusCodes.getMessage(statusCode).toLowerCase();

                    logger.response({
                          id: logId
                        , status: status
                        , time: Date.now()-start 
                        , comment: status === 'service_exception' && data ? (data.error && data.error.msg ? data.error.message : (data.message ? data.message : (data.msg ? data.msg : ''))) : ''
                    });
                }
            }




            // we may have gotten a soa response instead of a callback
            if (type.object(callback)) {
                response = callback;

                if (debugService) {
                    response.once('end', function(status, result) {
                        logReponse(status, result);
                    }.bind(this));
                }
            }

            // we need to make our own response object
            else {
                response = new SOAResponse();

                response.once('end', function(status, result) {
                    var err = null;
                    if(result && result.error) err = result;

                    if (debugService) logReponse(status, result);

                    callback(err, result, status, response.headers); //TODO: write status and check, give callback direct to on end, or write error on res
                }.bind(this));
            }


            // keep the request internal?
            if(this._hasController(collection)) {
                this.request(req, response);
            }
            else {
                this.emit('request', req, response);
            }
        }









        , _handleResponse: function(err, result, request, callback, status, headers) {

            //
            //==========================
            // TODO: REMOVE AFTER TESTING
            //==========================
            if (err) {
                if (err instanceof Error) {

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


            try {
                if (headers && headers['Rate-Limit-Cost'] && !isNaN(headers['Rate-Limit-Cost'])) {

                    // get request cost
                    let cost = parseInt((headers['Rate-Limit-Request-Cost'] ? headers['Rate-Limit-Request-Cost'] : headers['Rate-Limit-Cost']), 10);

                    // delete header that must not be exposed to the outside
                    if (headers['Rate-Limit-Request-Cost']) delete headers['Rate-Limit-Request-Cost'];


                    if (request.rateLimit) {

                        // increase cost if the request is near the capacity of the limit
                        cost *= (1+cost/request.rateLimit.credits);

                        // pay
                        this.rateLimits.pay(request.permissions, cost);


                        headers['Rate-Limit'] = `${request.rateLimit.credits}/${request.rateLimit.interval}s`;
                        headers['Rate-Limit-Balance'] = request.rateLimit.currentValue-cost;
                    }

                    callback(err, result, status, headers);
                }
                else {
                    headers = headers || {};

                    if (request.rateLimit) {
                        headers['Rate-Limit'] = `${request.rateLimit.credits}/${request.rateLimit.interval}s`;
                        headers['Rate-Limit-Balance'] = request.rateLimit.currentValue;
                    }

                    callback(err, result, status, headers);
                }
            } catch (e) {
                callback(err, result, status, headers);
            }
        }








        , _initController: function(callback) {
            let controllerCount = this._conf.controllersToLoad.length + this._conf.tablesToLoad.length;


            if (controllerCount === 0) callback();
            else {
                const loadCallback = (err) => {
                    if (err) {
                        callback(err);
                        controllerCount = -1;
                    }
                    else if(--controllerCount === 0) {
                        if (!this.silent) {
                            console.log(' ▸'.magenta.bold+' The '+this.name.red+' service was loaded successfully '.white+'('.grey+((this._conf.controllersToLoad.length+this._conf.tablesToLoad.length)+'').grey+' controllers)'.grey);
                        }
                        callback();
                    }
                };



                this._conf.controllersToLoad.forEach((controllerConfig) => {
                    let Controller;


                    try {
                        Controller = require(controllerConfig.path);
                    } catch (err) {
                        return loadCallback(err);
                    }



                    let controllerInstance;

                    try {
                        controllerInstance = new Controller(this.controllerOptions || this.options.controllerOptions);
                    } catch (err) {
                        return loadCallback(err);
                    }


                    // a path for future implementation upgrades
                    // makes stuff suck less
                    if (this.ControllerWrapperConstructor) {
                        try {
                            controllerInstance = new this.ControllerWrapperConstructor(controllerInstance);
                        } catch (err) {
                            return loadCallback(err);
                        }
                    }


                    // make sure each controller knows its name
                    if (!controllerInstance.name) controllerInstance.name = controllerConfig.name;
                    if (!controllerInstance.serviceName) controllerInstance.serviceName = this.name;



                    controllerInstance.on('load', (err) => {
                        if (err) loadCallback(err);
                        else {
                            if(debug) log('['+this.name+'] Controller "' + controllerConfig.name + '" loaded...');
                            this._controllerCollection[controllerInstance.name || controllerConfig.name] = controllerInstance;
                            loadCallback();
                        }
                    });

                    controllerInstance.on('request', this._handleRequest.bind(this));

                });


                this._initDefaultController(loadCallback);
            }
        }








        , _initDefaultController: function (loaded) {
            // how about telling the user he has actually to load the controllers himself or
            // he must use the Service, not the Defaultservice
            if (this._conf.tablesToLoad.length) throw new Error('There are some controllers that should be generated from db tables, you probably inherit from the DefaultService instead of from the Service.');
        }







        , _loadConfiguration: function(cb) {
            const serviceJSPath = path.join(this.serviceDir, 'service.js');

            // load configuration
            let bundleConfiguration;
            let controllerToLoad;
            let controllerDir = 'controller';


            fs.access(serviceJSPath, fs.constants.R_OK | fs.constants.W_OK, (err) => {
                if (!err) {
                     try {
                        bundleConfiguration = require(serviceJSPath);
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
                }



                // load all
                if (!controllerToLoad) {
                    fs.readdir(path.join(this.serviceDir, controllerDir), function(err, files) {
                        if (!err) this._initControllersToLoad(files, this.serviceDir, controllerDir);
                        cb();
                    }.bind(this));
                }
                // load configurated controllers
                else {
                    this._initControllersToLoad(controllerToLoad, this.serviceDir, controllerDir);
                    cb();
                }
            });
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
