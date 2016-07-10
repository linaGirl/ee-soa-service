(function() {
    'use strict';


    const assert = require('assert');
    let Request;



    describe('RelationalRequest', () => {
        it('should not crash when loaded', () => {
            Request = require('../').distributed.RelationalRequest;
        });

        it('should not crash when instatiated', () => {
            new Request('user', 'userProfile', 'list');
        });



        it('should return the correct type', () => {
            const request = new Request('user', 'userProfile', 'list');
            assert.equal(request.type, 'relationalRequest');
        });



        it('should return the correct remote service', () => {
            const request = new Request('user', 'userProfile', 'list');
            request.setRemote('checkout', 'cart', 42);
            assert.equal(request.remoteService, 'checkout');
        });

        it('should return the correct remote resource', () => {
            const request = new Request('user', 'userProfile', 'list');
            request.setRemote('checkout', 'cart', 42);
            assert.equal(request.remoteResource, 'cart');
        });

        it('should return the correct remote resource id', () => {
            const request = new Request('user', 'userProfile', 'list');
            request.setRemote('checkout', 'cart', 42);
            assert.equal(request.remoteResourceId, 42);
        });
    });
})();
