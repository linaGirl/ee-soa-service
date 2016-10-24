(function() {
    'use strict';

    const log                       = require('ee-log');
    const type                      = require('ee-types');
    const EventEmitter              = require('ee-event-emitter');
    const LegacyRequestTranslator   = require('distributed-prototype').LegacyRequestTranslator;



    module.exports = class LegacyBridge extends EventEmitter {



        constructor(serviceName) {
            super();


            this.serviceName = serviceName;


            // convert requests
            this.converter = new LegacyRequestTranslator();
        }






        getName() {
            return this.serviceName;
        }







        sendRequest(request, response) {

            request.requestingService = this.serviceName;

            // get legacy representation
            this.converter.toLegacy(request, response).then((result) => {
                this.emit('request', result.request, result.response);
            });
        }
    }
})();
