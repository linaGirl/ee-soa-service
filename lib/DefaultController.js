!function() {
    'use strict';

    var   Class         = require('ee-class')
        , log           = require('ee-log')
        , EventEmitter  = require('ee-event-emitter')
        , type          = require('ee-types')
        , SOAReponse    = require('ee-soa-response')
        , SOARequest    = require('ee-soa-request')
        , RPCRequest    = require('ee-soa-rpc-request');




    module.exports = new Class({
        inherits: EventEmitter




        , init: function(options) {
            this.options = options || {};

            // make the accesstoken available to the controller
            if (this.options.accessToken) this.accessToken = this.options.accessToken;


            // valid actions
            this.controllerActions = ['list', 'listOne', 'create', 'createOrUpdate', 'createRelation', 'update', 'updateRelation', 'delete', 'deleteRelation', 'describe'];

            // rpepare the soa request module
            this.SOARPCRequest = RPCRequest(this);

            // wait a tick
            process.nextTick(function() {
                this._load();
            }.bind(this));
        }





        /**
         * returns a default lsit of controller actions
         */
        , getActionNames: function() {
            return this.controllerActions;
        }





        , list: function(queryData, callback) {
            callback(new Error('The list action is not implemented on the «'+this.serviceName+'.'+this.name+'» controller!'));
        }

        , listOne: function(queryData, callback) {
            callback(new Error('The listOne action is not implemented on the «'+this.serviceName+'.'+this.name+'» controller!'));
        }

        , create: function(queryData, callback) {
            callback(new Error('The create action is not implemented on the «'+this.serviceName+'.'+this.name+'» controller!'));
        }

        , createOrUpdate: function(queryData, callback) {
            callback(new Error('The createOrUpdate action is not implemented on the «'+this.serviceName+'.'+this.name+'» controller!'));
        }

        , createRelation: function(queryData, callback) {
            callback(new Error('The createRelation action is not implemented on the «'+this.serviceName+'.'+this.name+'» controller!'));
        }

        , update: function(queryData, callback) {
            callback(new Error('The update action is not implemented on the «'+this.serviceName+'.'+this.name+'» controller!'));
        }

        , updateRelation: function(queryData, callback) {
            callback(new Error('The updateRelation action is not implemented on the «'+this.serviceName+'.'+this.name+'» controller!'));
        }

        , delete: function(queryData, callback) {
            callback(new Error('The delete action is not implemented on the «'+this.serviceName+'.'+this.name+'» controller!'));
        }

        , deleteRelation: function(queryData, callback) {
            callback(new Error('The deleteRelation action is not implemented on the «'+this.serviceName+'.'+this.name+'» controller!'));
        }

        , describe: function(queryData, callback) {
            callback(new Error('The describe action is not implemented on the «'+this.serviceName+'.'+this.name+'» controller!'));
        }



        // unkwnon functionality :(
        , _load: function() {
            this.emit('load');
        }







        /**
         * sends a request to another controller / service, adds the
         * accessToken of the current Service
         *
         * @param {request|object} request either a soa-request object or a
         *                         request configuration
         * @param {callback|response|undefined} callback either a callback
         *                                      or a soa response object or
         *                                      nothig
         * @returns {promise|undefined} a promise if no callback or response
         *                              was passed or nothing
         *
         */
        , sendRequest: function(request, callback) {
            return this._sendRequest(request, callback, this.accessToken);
        }





        /**
         * sends a request to another controller / service
         *
         * @param {request|object} request either a soa-request object or a
         *                         request configuration
         * @param {callback|response|undefined} callback either a callback
         *                                      or a soa response object or
         *                                      nothig
         * @returns {promise|undefined} a promise if no callback or response
         *                              was passed or nothing
         *
         */
        , sendUnauthenticatedRequest: function(request, callback) {
            return this._sendRequest(request, callback);
        }




        /**
         * sends a request to another controller / service, adds the
         * accessToken of the current Service
         *
         * @private
         *
         * @param {request|object} request either a soa-request object or a
         *                         request configuration
         * @param {callback|response|undefined} callback either a callback
         *                                      or a soa response object or
         *                                      nothig
         * @param {string} [token=undefined] token optional accessToken
         *
         * @returns {promise|undefined} a promise if no callback or response
         *                              was passed or nothing
         *
         */
        , _sendRequest: function(request, callback, token) {
            var   isRPCRequest = (!(request instanceof SOARequest) && type.object(request))
                , returnPromise = false
                , promise, resolvePromise, rejectPromise, response;


            // this promise may be returned to the user, else
            // else its used for the internal response handling
            promise = new Promise(function(resolve, reject) {
                resolvePromise = resolve;
                rejectPromise = reject;
            }.bind(this));




            // check how the answer is expected
            if (type.function(callback)) {

                // create a response object
                promise.then(function(data) {
                    callback(null, data);
                }.bind(this)).catch(function(err) {
                    callback(err);
                }.bind(this));
            }
            else if (callback instanceof SOAReponse) {

                // the user is not allowed to pass in a rpc request config in this case!
                if (isRPCRequest) throw new Error('You cannot send a rpc request and expect the response written to a soa response!');

                // nice, we dont have to do anything :)
                response = callback;
            }




            // we need a response object in case it doesnt exist and we're not
            // executing a rpc request
            if (!isRPCRequest && !response) {
                response = new SOAResponse();

                response.on('end', function(statusCode, data) {
                    if (statusCode !== 1 && statusCode !== 2) rejectPromise(new Error('The request returned the status «'+statusCode+'»: '+(type.object(data) ? JSON.stringify(data) : data)));
                    else resolvePromise(data);
                }.bind(this));
            }



            if (request instanceof SOARequest) {

                // we got a soa request object, add our accesstoken
                if (token) request.addAccessToken(token);

                // emit!
                this.emit('request', request, response);
            }
            else if (type.object(request)) {

                // we have to build our own request object
                if (token) request.accessToken = token;

                // create an rpc request, redirect the output to our promise
                new this.SOARPCRequest(request).send().then(function(data) {
                    resolvePromise(data);
                }.bind(this)).catch(function(data) {
                    rejectPromise(new Error('The request returned the status «'+data.status+'»: '+(type.object(data.data) ? JSON.stringify(data.data) : data.data)));
                }.bind(this));
            }
            else throw new Error('Expected a soa-request object or a request configuration that can be passed to the soa-rpc-request!');


            // the user expects a promise returned... lets do that
            if (!callback) return promise;
        }
    });

}();
