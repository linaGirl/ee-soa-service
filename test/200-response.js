(function() {
    'use strict';


    const assert = require('assert');
    let Response;



    describe('Response', () => {
        it('should not crash when loaded', () => {
            Response = require('../').distributed.Response;
        });

        it('should not crash when instatiated', () => {
            new Response();
        });



        it('the status should be saved correctly', () => {
            const response = new Response();
            response.status = response.statusCodes.ok;
            assert.equal(response.status, 'ok');
        });



        it('invalid status codes should be rejected', () => {
            const response = new Response();

            assert.throws(() => {
                response.status = response.statusCodes.okidoki;
            });

            assert.throws(() => {
                response.status = 'nope';
            });
        });



        it('sending should work', (done) => {
            const response = new Response();
            response.status = response.statusCodes.ok;
            response.on('send', done);
            assert.equal(response.isSent(), false);
            response.send();
            assert.equal(response.isSent(), true);
        });



        it('sending should not work if no status was provided', () => {
            const response = new Response();

            assert.throws(() => {
                response.send();
            });
        });
    });
})();
