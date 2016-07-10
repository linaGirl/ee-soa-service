(function() {
    'use strict';


    const EventEmitter = require('events');
    const path = require('path');
    const fs = require('fs');

    const type = require('ee-types');
    const Controller = require('../controller/Controller');








    module.exports = class Service extends EventEmitter {



        get loaded() {
            return !!this._loaded;
        }



        /**
         * sets the service up. does't load any controllers.
         * controllers must be loaded from the userspace
         *
         * @param {string} serviceName the name of the service
         */
        constructor(serviceName) {
            super();


            // we need a serviceName
            if (!type.string(serviceName) || serviceName.length < 1) throw new Error(`You have to specify a service name!`);
            this.name = serviceName;


            // map containing all loaded services
            this.controllers = new Map();


            // it's clearyl defined what actions can be called
            // by a request
            this.validActions = new Set(['list', 'listOne', 'create', 'update', 'delete', 'updateOrCreate', 'createRelation', 'updateRelation', 'deleteRelation']);
        }








        /**
         * incoming request handler. checks permissions and
         * dipatches the rwquest to the correspondign functions
         *
         * @param {object} request
         * @param {obejct} respone
         */
        request(request, response) {

            // check if the service is ready
            if (this.loaded) {
                const action = request.action;

                // do only execute predefined actions
                if (this.validActions.has(action)) {

                    // make suer the user is allowed to work on the resource
                    this.checkPermissions(request, response).then(() => {

                        // the response may be already sent by the permissions
                        // management, do only continue if not
                        if (!response.isSent()) {
                            const resourceName = request.resource;

                            if (this.controllers.has(resourceName)) {
                                const controller = this.controllers.get(resourceName);



                                // all actions have lifecycle methods that
                                // are called if they are implented. all
                                // of them must return a promise
                                controller.callLifeCycleMethod(action, 'before', request, response).then(() => {

                                    if (response.isSent()) return Promise.resolve();
                                    else return controller.callMethod(action, request, response);
                                }).then(() => {

                                    if (response.isSent()) return Promise.resolve();
                                    else return controller.callLifeCycleMethod(action, 'after', request, response);
                                }).then(() => {

                                    // nice, check the outcome
                                    if (response.isSent()) return Promise.resolve();
                                    else if (response.hasStatus()) {
                                        response.send();
                                        return Promise.resolve();
                                    } else return Promise.reject(new Error(`The action '${action}' on the '{this.name}.${resourceName}' resource failed to set a status!`));
                                }).catch((err) => {

                                    // 500, server error
                                    response.status = response.statusCodes.serverError;
                                    response.statusMessage = `The action '${action}' on the '{this.name}.${resourceName}' resource failed!`;
                                    response.statusError = err;
                                    response.send();
                                });
                            }
                            else {

                                // 404, not found
                                response.status = response.statusCodes.notFound;
                                response.statusMessage = `The resource '{this.name}.${resourceName}' could not be found!`;
                                response.send();
                            }
                        } else return Promise.resolve();
                    }).catch((err) => {

                        // 500, server error
                        response.status = response.statusCodes.serverError;
                        response.statusMessage = `The action '${action}' on the '{this.name}.${request.resource}' resource failed!`;
                        response.statusError = err;
                        response.send();
                    });
                }
                else {


                    // it's kind of a 404, but we're going
                    // with a 403 forbidden
                    response.status = response.statusCodes.forbidden;
                    response.statusMessage = `The action '${action}' cannot be called!`;
                    response.send();
                }
            }
            else {

                // 404, not found
                response.status = response.statusCodes.serviceUnavailable;
                response.statusMessage = `The resource '${this.name}.${request.resource}' is currently not available!`;
                response.send();
            }
        }









        /**
         * handles the permissions management if loaded
         * does also the rate limit checks
         *
         * @param {object} request
         * @param {obejct} respone
         */
        checkPermissions(request, response) {
            if (this.permissionManager) {

                // permissions are loaded, check them
                return this.permissionManager.getPermission(request.getAccessTokens()).then((permissions) => {
                    const resourceName = request.getResource();
                    const actionName = request.getactionName();


                    if (permissions.isActionAllowed(`${this.name}.${resourceName}`, actionName)) {


                        // store the permissions on the request
                        request.setPermissions(permissions);


                        // check the reate limits
                        return permissions.getRateLimitInfo().then((rateLimitInfo) => {

                            // if there isn't any info we're good, it
                            // indicates that isnt any limit
                            if (rateLimitInfo && rateLimitInfo.left <= 0) {

                                // 429, too many requests
                                response.status = response.statusCodes.tooManyRequests;
                                response.statusMessage = `Rate limit exceeded! You have ${rateLimitInfo.capacity} credits per ${rateLimitInfo.interval} seconds. Left ${rateLimitInfo.left}!`;
                                response.send();
                            }

                            // ok, lets continue
                            return Promise.resolve();
                        });
                    }
                    else {

                        // 401, unauthorized
                        response.status = response.statusCodes.unauthorized;
                        response.statusMessage = `Accessing the ${resourceName} resource with the action ${actionName} using the current credentials is not allowed!`;
                        response.send();

                        return Promise.resolve();
                    }
                }).catch((err) => {

                    // 500, server error
                    response.status = response.statusCodes.serverError;
                    response.statusMessage = `The permissions management failed to load the permissions!`;
                    response.statusError = err;
                    response.send();

                    return Promise.resolve();
                });
            } else return Promise.resolve();
        }










        /**
         * loads all js files from a directory
         * and registers them as controllers
         *
         * @param {string} controllersDirectory absolute path
         * @param {regexp} inclusionPattern a pattern to test the
         *                 controller names against
         * @param {regexp} nameReplacePattern pattern that can be used
         *                 to remove some parts from the controllers
         *
         * @returns {promise}
         */
        loadControllersFromDirectory(controllersDirectory, inclusionPattern, nameReplacePattern) {
            return new Promise((resolve, reject) => {

                // get path info
                fs.stat(controllersDirectory, (err, stats) => {
                    if (err) {
                        err.message = `Failed to stat the controller directory '${controllersDirectory}' for the service '${this.name}': ${err.message}`
                        reject(err);
                    }
                    else {

                        // must be a directory
                        if (stats.isDirectory()) {
                            fs.readdir(controllersDirectory, (err, files) => {
                                if (err) {
                                    err.message = `Failed to list the controller directory '${controllersDirectory}' for the service '${this.name}': ${err.message}`
                                    reject(err);
                                }
                                else {

                                    // laod all controllers from the directory
                                    for (const fileName of files) {

                                        // has to be js, and tested against th einclusion pattern
                                        if (path.extname(fileName) === '.js' && (inclusionPattern ? inclusionPattern.test(fileName) : true)) {
                                            const controllerName = path.basename(fileName, '.js').replace((nameReplacePattern || ''), '');
                                            let ControllerConstructor;

                                            // go, load the controller
                                            try {
                                                ControllerConstructor = require(path.join(controllersDirectory, fileName));
                                            } catch (err) {
                                                err.message = `Failed to laod the controller '${path.join(controllersDirectory, fileName)}' for the service '${this.name}': ${err.message}`
                                                return reject(err);
                                            }


                                            // register
                                            this.registerController(controllerName, ControllerConstructor);
                                        }
                                    }


                                    // nice job, done ;)
                                    resolve();
                                }
                            });
                        }
                        else reject(new Error(`Failed to load controllers from directory ${controllersDirectory}: path is not a directory!`));
                    }
                });
            });
        }










        /**
         * register a controlelr constructor function
         *
         * @param {string} controllerName the name of the controller
         * @param {object} controllerClass the class constructor function
         */
        registerController(controllerName, controllerClass) {

            // check name avilability
            this.checkControllerRegistration(controllerClass.name);

            // check input
            if (type.function(controllerClass)) this.controllers.set(controllerName, controllerClass);
            else throw new Error(`Cannot register the '${controllerName}' class, it has to be a constructor function! Got a '${type(controllerClass)}'`);
        }










        /**
         * register a instantiated controller
         *
         * @param {object} controllerInstance instance of a controller
         */
        registerControllerInstance(controllerInstance) {
            if (type.object(controllerInstance) && controllerInstance instanceof Controller) {

                // check name avilability
                this.checkControllerRegistration(controllerInstance.name);

                // register
                this.controllers.set(controllerInstance.name, controllerInstance);
            }
            else throw new Error(`Expected an instantiated class extending the Controller class!`);
        }










        /**
         * checks if the slot for the contrller name is
         * free and available
         *
         * @param {string} controllerName
         */
        checkControllerRegistration(controllerName) {
            if (!type.string(controllerName) || !controllerName.length) throw new Error(`Please provide a valid controller name!`);
            if (this.controllers.has(controllerName)) throw new Error(`Cannot register the controller '${controllerName}', it was already registered before!`);
        }









        /**
         * loads all the registred controllers
         * sets the loaded flags, emits the load
         * event as soon all controllers were loaded
         *
         * @returns {promise}
         */
        load() {
            return Promise.all(Array.from(this.controllers.keys()).map((controllerName) => {
                const controllerValue = this.controllers.get(controllerName);


                // there may controlelrs that were instantiated already
                if (type.object(controllerValue) && controllerValue instanceof Controller) {


                    if (controllerValue.isLoading()) {

                        // loading is in progress
                        return new Promise((resolve, reject) => {
                            controllerValue.on((err) => {
                                if (err) reject(err);
                                else resolve();
                            });
                        });
                    }
                    else if (controllerValue.isLoaded()) {

                        // loading has finishedd
                        if (controllerValue.hasLoadingError()) return Promise.resject(controllerValue.getLoadingError());
                        else return Promise.resolve();
                    }
                    else {

                        // load now
                        return controllerValue.load();
                    }
                }
                else {
                    let instance;

                    // instantiate the controller, pass them
                    // the service so that they can get the
                    // required options from it
                    try {
                        instance = new controllerValue(controllerName, this);
                    } catch (err) {
                        err.message = `Failed to instantiate the '${controllerName}' controller: ${err.message}`;
                        return Promise.reject(err);
                    }


                    if (!(instance instanceof Controller)) return Promise.reject(new Error(`The controller '${controllerName}' does not extend the Controller class!`));
                    else {

                        // store
                        this.controllers.set(controllerName, instance);

                        // load the controller
                        return instance.load();
                    }
                }
            })).then(() => {

                // ready for work :)
                this._loaded = true;
                this.emit('load');
            }).catch((err) => {
                this._loadingError = err;
                this.emit('load', new Error(`The service '${this.serviceName}' failed to load: ${err.message}`));
            });
        }








        /**
         * called by the service manager. waits until
         * all constrollers are loaded and returns then
         *
         * @reutrns {promise}
         */
        ready() {
            if (this._loadingError) return Promise.reject(this._loadingError);
            else if (this.loaded) return Promise.resolve();
            else {
                return new Promise((resolve, reject) => {
                    this.once('load', (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });
            }
        }







        /**
         * legacy method used for determining the objects type
         */
        isService() {
            return true;
        }
    };

})();
