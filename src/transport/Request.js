(function() {
    'use strict';



    const type = require('ee-types');




    module.exports = class Request {



        // the requests type
        get type() { return this._type; }




        // the action that is targeted by the request
        get action() { return this._action; }


        // the resource that is targeted by the request
        get resource() { return this._resource; }


        // the resource id that is targeted by the request
        get resourceId() { return this._resourceId; }


        // the service that is targeted by the request
        get service() { return this._service; }





        // access token used for authorization
        get accessTokens() { return this._accessTokens; }


        // session token used for transferring
        // additional state, defualts to null
        get sessionToken() { return this._sessionToken; }








        /**
         * set up the class
         *
         * @param {string} resourceName
         * @param {string} actionName
         */
        constructor(serviceName, resourceName, actionName, resourceId) {

            // a request my have multiple accessTokens
            this._accessTokens = new Set();

            // make sure the request ahs a type
            if (!type.string(this.type) || !this.type.length) throw new Error(`The request must have valid type!`);

            // set basic data
            this.setService(serviceName);
            this.setResource(resourceName);
            this.setAction(actionName);
            this.setResourceId(resourceId);
        }








        /**
         * set the action
         *
         * @param {string} action
         *
         * @returns {this}
         */
        setAction(action) {
            if (!type.string(action) || !action.length) throw new Error(`The action name must be typeof string and have a lenght > 0!`);
            this._action = action;
            return this;
        }








        /**
         * set the resource
         *
         * @param {string} resource
         *
         * @returns {this}
         */
        setResource(resource) {
            if (!type.string(resource) || !resource.length) throw new Error(`The resource name must be typeof string and have a lenght > 0!`);
            this._resource = resource;
            return this;
        }








        /**
         * checks if a resource id is set
         *
         * @returns {boolean}
         */
        hasResourceId() {
            return !type.undefined(this.resourceId);
        }








        /**
         * set the resource id
         *
         * @param {string} resourceId
         *
         * @returns {this}
         */
        setResourceId(resourceId) {
            this._resourceId = resourceId;
            return this;
        }








        /**
         * set the service
         *
         * @param {string} service
         *
         * @returns {this}
         */
        setService(service) {
            if (!type.string(service) || !service.length) throw new Error(`The service name must be typeof string and have a lenght > 0!`);
            this._service = service;
            return this;
        }









        /**
         * add an accessToken
         *
         * @param {string} accessToken
         *
         * @returns {this}
         */
        addAccessToken(accessToken) {
            if (!type.string(accessToken) || !accessToken.length) throw new Error(`The accessToken must be typeof string and have a lenght > 0!`);
            this._accessTokens.add(accessToken);
            return this;
        }








        /**
         * set the session token
         *
         * @param {string} sessionToken
         *
         * @returns {this}
         */
        setSessionToken(sessionToken) {
            if (!type.string(sessionToken) || !sessionToken.length) throw new Error(`The sessionToken must be typeof string and have a lenght > 0!`);
            this._sessionToken = sessionToken;
            return this;
        }
    };







    // the sessiontoken has is normally null
    module.exports.prototype._sessionToken = null;


    // default
    module.exports.prototype._type = 'request';
})();
