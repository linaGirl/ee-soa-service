(function() {
    'use strict';






    module.exports = class Service {


        /**
         *
         */
        constructor() {

        }




        beforeList(request, response) {
            return Promise.resolve();
        }


        prepareListQuery(request, response) {
            return Promise.resolve(this.db.resource());
        }



        list(request, response) {
            response.sendOk();
        }


        beforeQueryExecute() {

        }


        afterQueryExecute() {

        }


        before


        afterList(request, response) {
            response.send()
            return Promise.resolve();
        }

    };

})();
