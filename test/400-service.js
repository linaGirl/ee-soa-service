(function() {
    'use strict';


    const assert = require('assert');
    const Controller = require('../').distributed.Controller;
    const Request = require('../').distributed.Request;
    const Response = require('../').distributed.Response;
    const UserService = require('./lib/UserService');
    let Service;



    describe('Service', () => {
        it('should not crash when loaded', () => {
            Service = require('../').distributed.Service;
        });

        it('should not crash when instatiated', () => {
            new Service('user');
        });



        it('should accept instantiated controllers', () => {
            const service = new Service('user');
            const controller = new Controller('user', service);
            service.registerControllerInstance(controller);
        });

        it('should accept controller constructor', () => {
            const service = new Service('user');
            service.registerController('user', Controller);
        });




        it('should load controllers correctly', (done) => {
            const service = new UserService();
            assert.equal(service.loaded, false);
            service.ready().then(() => {
                assert.equal(service.loaded, true);
                done();
            }).catch(done);
            service.load();
        });




        it('should refuse to route requests before the service is loaded', (done) => {
            const service = new UserService();
            const request = new Request('user', 'user', 'update');
            const response = new Response();

            response.on('send', () => {
                assert.equal(response.status, 'serviceUnavailable');
                done();
            });

            service.request(request, response);
        });

        it('should fail on not implemented methods', (done) => {
            const service = new UserService();
            const request = new Request('user', 'user', 'createRelation');
            const response = new Response();

            response.on('send', () => {
                assert.equal(response.status, 'notImplemented');
                done();
            });


            service.load();
            service.ready().then(() => {
                service.request(request, response);
            }).catch(done);
        });

        it('should dispatch requests correctly', (done) => {
            const service = new UserService();
            const request = new Request('user', 'user', 'update');
            const response = new Response();

            response.on('send', () => {
                assert.equal(response.status, 'ok');
                done();
            });


            service.load();
            service.ready().then(() => {
                service.request(request, response);
            }).catch(done);
        });
    });
})();
