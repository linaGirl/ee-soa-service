(function() {
    'use strict';


    const assert = require('assert');
    let Request;



    describe('Request', () => {
        it('should not crash when loaded', () => {
            Request = require('../').distributed.Request;
        });

        it('should not crash when instatiated', () => {
            new Request('user', 'userProfile', 'list');
        });



        //
        // type
        //
        it('should return the correct type', () => {
            const request = new Request('user', 'userProfile', 'list');
            assert.equal(request.type, 'request');
        });

        it('should not accept a new type', () => {
            const request = new Request('user', 'userProfile', 'list');
            assert.throws(() => {
                request.type = 'something';
            });
        });



        //
        // service
        //
        it('should return the correct service', () => {
            const request = new Request('user', 'userProfile', 'list');
            assert.equal(request.service, 'user');
        });

        it('should return the correct service if it\'s changed', () => {
            const request = new Request('user', 'userProfile', 'list');
            request.setService('users');
            assert.equal(request.service, 'users');
        });



        //
        // resource
        //
        it('should return the correct resource', () => {
            const request = new Request('user', 'userProfile', 'list');
            assert.equal(request.resource, 'userProfile');
        });

        it('should return the correct resource if it\'s changed', () => {
            const request = new Request('user', 'userProfile', 'list');
            request.setResource('userProfiles');
            assert.equal(request.resource, 'userProfiles');
        });



        //
        // resource id
        //
        it('should return the correct resource if it\'s set', () => {
            const request = new Request('user', 'userProfile', 'list');
            request.setResourceId(42);
            assert.equal(request.resourceId, 42);
        });

        it('should indicate correctly if a resource id is set', () => {
            const request = new Request('user', 'userProfile', 'list');
            assert(!request.hasResourceId());
            request.setResourceId(42);
            assert(request.hasResourceId());
        });



        //
        // action
        //
        it('should return the correct action', () => {
            const request = new Request('user', 'userProfile', 'list');
            assert.equal(request.action, 'list');
        });

        it('should return the correct action if it\'s changed', () => {
            const request = new Request('user', 'userProfile', 'list');
            request.setAction('create');
            assert.equal(request.action, 'create');
        });




    });
})();
