EE-SOA-SERVICE
====================

## include in package.json
- "ee-soa-service" : "version"
- "ee-class"       : "0.4.*"

## service structure
you may use the default service structure for your service-package:

+-- Controller (dir for your custom controllers)  
|   +-- TestController.js  
+-- lib  
|   +-- Service.js (your service file, see below)  
+-- test (your tests)  
+-- config.js.dist (your config.dist file, for testing etc.)  
+-- index.js  
+-- LICENCE  
+-- package.json  
+-- README.md  
+-- service.js (config file)  
+-- test.js (if you need a test file)  

---
### /lib/Service.js

    !function() {
        'use strict';

        var Class     = require('ee-class')
            , Service = require('ee-soa-service');

        module.exports = new Class({
            inherits: Service

            , name: 'serviceName'
            , init: function init(options) {
                this.options    = options || {};
                this.serviceDir = __dirname + '/../';

                init.parent(options);
            }

        });

    }();
---

---
### /Controller/TestController.js (with a DefaultORMController)


    !function() {
        'use strict';

        var Class                  = require('ee-class')
            , DefaultORMController = require('ee-soa-service').DefaultORMController;

        module.exports = new Class({
            inherits: DefaultORMController

            , init: function init(options) {
                this.options       = options || {};
                this.options.table = 'event';

                init.parent(options);
            }

        });

    }();


---

---
### /Service.js



    module.exports = {
        //controller: ['TestController'] //[optional] if empty we try to load all user created controllers
        tables: ['user'] //define tables from wich defaultcontrollers will be generated
        //, controllerDir: 'Controller' //[optional] default to 'Controller'
    };



---
