(function() {
    'use strict';


    const assert = require('assert');
    let Service;



    describe('Service', () => {
        it('should not crash when loaded', () => {
            Service = require('../').distributed.Service;
        });

        it('should not crash when instatiated', () => {
            new Service('user');
        });


        
    });
})();
