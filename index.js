(function() {
    'use strict';


    // legacy
    module.exports                      = require('./lib/Service');
    module.exports.DefaultService       = require('./lib/DefaultService');
    module.exports.DefaultController    = require('./lib/DefaultController');
    module.exports.DefaultORMController = require('./lib/DefaultORMController');



    // distributed prototype
    const distributed = module.exports.distributed = {};


    distributed.Service                 = require('./src/service/Service');
    distributed.RelatedService          = require('./src/service/RelatedService');


    distributed.Controller              = require('./src/controller/Controller');


    distributed.Request                 = require('./src/transport/Request');
    distributed.RelationalRequest       = require('./src/transport/RelationalRequest');


    distributed.Response                 = require('./src/transport/Response');

})();
