(function() {
    'use strict';

    const log                       = require('ee-log');
    const type                      = require('ee-types');
    const EventEmitter              = require('ee-event-emitter');
    const LegacyRequestTranslator   = require('distributed-prototype').LegacyRequestTranslator;



    module.exports = class LegacyBridge extends EventEmitter {



        constructor(service) {
            super();


            this.service = service;


            // convert requests
            this.converter = new LegacyRequestTranslator();
        }






        getName() {
            return this.service.name;
        }







        sendRequest(request, response) {

            // tell the other side who asked
            request.requestingService = this.getName();

            // add our token if avilable
            if (this.service.accessToken) request.setToken(this.service.accessToken);

            // get legacy representation
            this.converter.toLegacy(request, response).then((result) => {
                this.emit('request', result.request, result.response);
            });
        }
    }
})();
