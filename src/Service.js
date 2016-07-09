(function() {
    'use strict';


    const EventEmitter = require('events');
    const type = require('ee-types');








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
         * loads a controller from the filesystem
         *
         * @param {string} path an absolute or relative
         *                      path for loading and
         *                      reghistering a controller
         *
         */
        loadControllerClass(path, options) {

        }





        /**
         * creates a pretty useless empty controller
         * this method should be replaced with custom
         * controller generators by casses extending
         * from this class
         */
        loadController(...names) {

        }









        /**
         * incoming request handler. checks permissions and
         * dipatches the rwquest to the correspondign functions
         *
         * @param {object} request
         * @param {obejct} respone
         */
        request(request, response) {
            const action = request.getAction();


            // do only execute predefined actions
            if (this.validActions.has(action)) {

                // make suer the user is allowed to work on the resource
                this.checkPermissions(request, response).then(() => {

                    // the response may be already sent by the permissions
                    // management, do only continue if not
                    if (!response.isSent()) {
                        const resourceName = request.getResource();


                        if (this.controllers.has(resourceName)) {
                            const controller = this.controllers.get();


                            if (controller.hasAction(action)) {

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
                                        return Promnise.resolve();
                                    } else return Promnise.reject(new Error(`The action '${action}' on the '${resourceName}' resource failed to set a status!`));
                                }).catch((err) => {

                                    // 500, server error
                                    response.status = response.status.serverError;
                                    response.statusMessage = `The action '${action}' on the '${resourceName}' resource failed!`;
                                    response.statusError = err;
                                    response.send();
                                });
                            }
                            else {

                                // 501, not implemented
                                response.status = response.status.notImplemented;
                                response.statusMessage = `The action '${action}' was not implemented on the '${resourceName}' resource!`;
                                response.send();
                            }
                        }
                        else {

                            // 404, not found
                            response.status = response.status.notFound;
                            response.statusMessage = `The resource '${resourceName}' could not be found!`;
                            response.send();
                        }
                    }
                });
            }
            else {


                // it's kind of a 404, but we're going
                // with a 403 forbidden
                response.status = response.status.forbidden;
                response.statusMessage = `The action '${action}' cannot be called!`;
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
                                response.status = response.status.tooManyRequests;
                                response.statusMessage = `Rate limit exceeded! You have ${rateLimitInfo.capacity} credits per ${rateLimitInfo.interval} seconds. Left ${rateLimitInfo.left}!`;
                                response.send();
                            }

                            // ok, lets continue
                            return Promise.resolve();
                        });
                    }
                    else {

                        // 401, unauthorized
                        response.status = response.status.unauthorized;
                        response.statusMessage = `Accessing the ${resourceName} resource with the action ${actionName} using the current credentials is not allowed!`;
                        response.send();
                    }
                }).catch((err) => {

                    // 500, server error
                    response.status = response.status.serverError;
                    response.statusMessage = `The permissions management failed to load the permissions!`;
                    response.statusError = err;
                    response.send();

                    return Promise.resolve();
                });
            } else return Promise.resolve();
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

                // instantiate the controller, pass them
                // the service so that they can get the
                // required options from it
                const instance = new (this.controllers.get(controllerName))(controllerName, this);

                // store
                this.controllers.set(controllerName, instance);

                // load the controller
                return instance.load();
            })).then(() => {

                // ready for work :)
                this._loaded = true;
                this.emit('load');
            }).catch((err) => {
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
            if (this.loaded) return Promise.resolve();
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
