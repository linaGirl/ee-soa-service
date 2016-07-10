(function() {
    'use strict';


    const assert = require('assert');
    const Service = require('../').distributed.Service;
    const Request = require('../').distributed.Request;
    const Response = require('../').distributed.Response;
    const Controller = require('../').distributed.Controller;
    const UserController = require('./lib/UserController');


    let service;



    describe('Controller', () => {
        it('loading a service (required dependency)', () => {
            service = new Service('user');
        });

        it('should not crash when instatiated', () => {
            new UserController('user', service);
        });




        it('should be able to call action methods', (done) => {
            const userController = new UserController('user', service);
            const request = new Request('user', 'user', 'list');
            const response = new Response();

            response.on('send', () => {
                assert.equal(response.status, 'notImplemented');
                done();
            });

            userController.callMethod(request.action, request, response);
        });




        it('invalid implemented actions should fail', (done) => {
            const userController = new UserController('user', service);
            const request = new Request('user', 'user', 'create');
            const response = new Response();

            response.on('send', () => {
                assert.equal(response.status, 'serverError');
                done();
            });

            userController.callMethod(request.action, request, response);
        });




        it('should be able to call lifecycle methods', (done) => {
            const userController = new UserController('user', service);
            const request = new Request('user', 'user', 'create');
            const response = new Response();

            userController.callLifeCycleMethod(request.action, 'before', request, response).then(done).catch(done);
        });
    });
})();
