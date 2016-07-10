(function() {
    'use strict';


    const Controller = require('../../').distributed.Controller;



    module.exports = class UserController extends Controller {


        constructor(name, service) {
            super(name, service);
        }




        load() {
            return Promise.resolve();
        }



        create() {}




        update(request, response) {
            response.data = 'ok';
            response.status = response.statusCodes.ok;
            return Promise.resolve();
        }
    }
})();
