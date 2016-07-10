(function() {
    'use strict';


    const Service = require('../../').distributed.Service;
    const UserController = require('./UserController');
    const path = require('path');







    module.exports = class UserService extends Service {


        /**
         * set up the service
         */
        constructor() {
            super('user');


            this.registerController('user', UserController);
        }
    };

})();
