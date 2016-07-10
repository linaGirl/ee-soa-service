(function() {
    'use strict';



    const type = require('ee-types');
    const Request = require('./Request');




    module.exports = class RelationalRequest extends Request {


        // the remote resource that is targeted by the request
        get remoteResource() { return this._remoteResource; }


        // the remote resource id that is targeted by the request
        get remoteResourceId() { return this._remoteResourceId; }


        // the remote service that is targeted by the request
        get remoteService() { return this._remoteService; }







        /**
         * set up the class
         *
         * @param {string} resourceName
         * @param {string} actionName
         */
        constructor(serviceName, resourceName, actionName) {
            super(serviceName, resourceName, actionName);
        }








        /**
         * set the remote resource
         *
         * @param {string} remote resource
         *
         * @returns {this}
         */
        setRemoteResource(remoteResource) {
            if (!type.string(remoteResource) || !remoteResource.length) throw new Error(`The remote resource name must be typeof string and have a lenght > 0!`);
            this._remoteResource = remoteResource;
            return this;
        }








        /**
         * set the remote resource id
         *
         * @param {string} remote resource id
         *
         * @returns {this}
         */
        setRemoteResourceId(remoteResourceId) {
            this._remoteResourceId = remoteResourceId;
            return this;
        }








        /**
         * set the remote service
         *
         * @param {string} remote service
         *
         * @returns {this}
         */
        setRemoteService(remoteService) {
            if (!type.string(remoteService) || !remoteService.length) throw new Error(`The remote service name must be typeof string and have a lenght > 0!`);
            this._remoteService = remoteService;
            return this;
        }








        /**
         * set the remote
         *
         * @param {string} remote service
         * @param {string} remote resource
         * @param {any} remote resource id
         *
         * @returns {this}
         */
        setRemote(remoteService, remoteResource, remoteResourceId) {
            this.setRemoteService(remoteService);
            this.setRemoteResource(remoteResource);
            this.setRemoteResourceId(remoteResourceId);
            return this;
        }









        /**
         * retuurns true if the remote identifiers were set
         *
         * @returns {boolean}
         */
        hasRemote() {
            return type.string(this.resource) && type.string(this.service);
        }
    };





    module.exports.prototype._type = 'relationalRequest';
})();
