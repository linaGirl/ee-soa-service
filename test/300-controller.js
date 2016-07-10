(function() {
    'use strict';


    const assert = require('assert');
    const Service = require('../').distributed.Service;

    let service;
    let Controller;



    describe('Controller', () => {
        it('should not crash when loaded', () => {
            Controller = require('../').distributed.Controller;
        });

        it('loading a service (required dependency)', () => {
            service = new Service('user');
        });

        it('should not crash when instatiated', () => {
            new Controller('user', service);
        });


        
    });
})();
