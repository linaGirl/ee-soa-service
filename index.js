(function() {
    'use strict';


    // legacy
    module.exports                      = require('./lib/Service');
    module.exports.DefaultService       = require('./lib/DefaultService');
    module.exports.DefaultController    = require('./lib/DefaultController');
    module.exports.DefaultORMController = require('./lib/DefaultORMController');



    // distributed prototype
    const distributedd = module.exports.distributed = {};
    
    distributed.Service = require('./src/Service');
    distributed.RelatedService = require('./src/RelatedService');

})();
