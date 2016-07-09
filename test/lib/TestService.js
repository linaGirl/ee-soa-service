(function() {
    'use strict';
    

    const Service = require('../../').related.RelatedService;
    const path = require('path');







    module.exports = class TestService extends Service {


        /**
         * set up the service
         */
        constructor(options) {
            super('test', options);


            // load controlelrs from folder
            this.loadContollersFromDirectory(path.join(__dirname, './controller'));


            // load a class
            this.loadControllerClass(path.join(__dirname, './TestController'));


            // load db controllers
            this.loadController('event', 'venue', 'image');


            // indicate that we're finished registering our controllers
            this.load();
        }
    };

})();
