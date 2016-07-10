(function() {
    'use strict';



    const type = require('ee-types');
    const EventEmitter = require('events');



    const statusCodes = new Set();

    // list of available valid statuscodes
    statusCodes.add('serverError');
    statusCodes.add('notImplemented');
    statusCodes.add('notFound');
    statusCodes.add('forbidden');
    statusCodes.add('tooManyRequests');
    statusCodes.add('unauthorized');
    statusCodes.add('ok');
    statusCodes.add('serviceUnavailable');


    // proxy calls to the status object,
    // so only valid statuscodes can be used
    const proxy = new Proxy(statusCodes, {
        get(target, property) {
            if (target.has(property)) return property;
            else throw new Error(`The status ${property} is not valid!`);
        }
    });








    module.exports = class Response extends EventEmitter{


        // accept only valid status codes
        set status(status) {
            if (statusCodes.has(status)) this._status = status;
            else throw new Error(`Cannot set the status '${status}'. It's invalid!`);
        }
        get status() { return this._status; }




        // accept string status messages
        set statusMessage(message) {
            if (type.string(message)) this._statusMessage = message;
            else throw new Error(`Cannot set a statusMessage that is not a string!`);
        }
        get statusMessage() { return this._statusMessage; }





        // accept only errors
        set statusError(err) {
            if (err instanceof Error) this._statusError = err;
            else throw new Error(`Cannot set a statuserror that is not an instance of an Error!`);
        }
        get statusError() { return this._statusError; }




        // data to return
        set data(data) { this._data = data; }
        get data() { return this._data; }





        // expose the statuscodes
        get statusCodes() { return proxy; }








        /**
         * set up the response
         */
        constructor() {
            super();

            // status items
            this._status = null;
            this._statusMessage = '';
            this._statusError = null;
            this._data = null;

            // internal status
            this._internalStatus = 'notSent';
        }









        /**
         * indicates if the response was sent already
         *
         * @returns {boolean}
         */
        isSent() {
            return this._internalStatus === 'sent';
        }







        /**
         * indicates if a status was set
         *
         * @returns {boolean}
         */
        hasStatus() {
            return this.status !== null;
        }




        /**
         * sends the request
         */
        send() {
            if (this.isSent()) throw new Error(`Cannot send response. The response was already sent!`);

            this._internalStatus = 'sent';

            if (!this.status) throw new Error(`Cannot send response. The response status was not set!`);

            // make sure that the call is not
            // inside any try catch statements
            // provided by the service
            process.nextTick(() => {

                this.emit('send');

                // clean up
                this.removeAllListeners();
            });
        }
    };
})();
