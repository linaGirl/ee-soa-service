!function() {
    'use strict';

    var   Class             = require('ee-class')
        , EventEmitter      = require('ee-event-emitter')
        , SOAResponse       = require('ee-soa-response')
        , log               = require('ee-log');



    module.exports = new Class({
        inherits: EventEmitter

        // make the statuscodes accesible to the users
        , status: SOAResponse.statusCodes


        // indicates if the response was already sent
        , _sent: false


        , init: function(options) {
            this._response = options.response;
        }


        /*
         * send a status response (probably some sort of error)
         */
        , sendStatus: function(statusCode, status, parameters, headers) {
            if (!parameters) parameters = {};
            parameters.status = status;

            this.send(statusCode, parameters, headers);
        }


        /*
         * send a response
         */
        , send: function(statusCode, data, headers) {
            if (this._sent) throw new Error('Response already sent!');

            if (headers) {
                Object.keys(headers).forEach(function(headerName) {
                    this._response.setHeader(headerName, headers[headerName]);
                }.bind(this));
            }

            if (statusCode instanceof Error) {
                data = {status: 'error', message: statusCode.message};
                statusCode = this.status.SERVICE_EXCEPTION; 
            }

            if (statusCode === null || statusCode === undefined) statusCode = this.status.OK;

            if (data.toJSON) data = data.toJSON();

            this._response.send(statusCode, data);
            this._sent = true;
        }
    });
}();
