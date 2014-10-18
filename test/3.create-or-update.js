!function() {
    'use strict';

    
    var   Class             = require('ee-class')
        , log               = require('ee-log')
        , assert            = require('assert')
        , async             = require('ee-async')
        , SOARequest        = require('ee-soa-request')
        , SOAResponse       = require('ee-soa-response')
        , setupDB           = require('./lib/dbSetup')
        , expect            = require('./lib/expect')
        , createResponse    = require('./lib/createResponse');


    // required globals for the tests
    var orm, ORM, db, service, dataService;


    // the test service
    var   Service       = require('./service')
        , DataService   = require('./dataService');


    
    // prepare the test environment
    describe('(Preparations)', function() {
        it('Setting up the database ...', function(done) {
            this.timeout(5000);
            setupDB(function(err, ormInstance) {
                if (err) done(err);
                else {
                    orm = ormInstance;
                    ORM = orm.getORM();
                    db = orm.ee_soe_service_test;
                    done();
                }
            });
        });


        it('Setting up a service', function(done) {
            dataService = new DataService({
                  orm           : orm
                , databaseName  : 'ee_soa_service_test'
            });

            dataService.load(done);
        });
    });





    describe('[Create Or Update Requests]', function() {
        it('A create request without data should fail (missing fk)', function(done) {
            var request = new SOARequest.CreateRequest();
            request.setCollection('event');

            // execute request
            dataService.request(request, createResponse(function(status, data, message) {
                assert.equal(message, 'SERVICE_EXCEPTION');
                done();
            }));
        });

        it('A create request without data should succeed', function(done) {
            var request = new SOARequest.CreateRequest();
            request.setCollection('image');

            // execute request
            dataService.request(request, createResponse(function(status, data, message) {
                assert.equal(message, 'OK');
                assert.deepEqual(data, {id: 1, url: null});
                done();
            }));
        });

        it('A create should succeed', function(done) {
            var request = new SOARequest.CreateRequest();
            request.setCollection('image');
            request.setContent({
               url: 'http://s3-ec.buzzfed.com/static/2013-10/enhanced/webdr06/15/9/anigif_enhanced-buzz-25158-1381844793-0.gif'
            });

            // execute request
            dataService.request(request, createResponse(function(status, data, message) {
                assert.equal(message, 'OK');
                assert.deepEqual(data, {id: 2, url: 'http://s3-ec.buzzfed.com/static/2013-10/enhanced/webdr06/15/9/anigif_enhanced-buzz-25158-1381844793-0.gif'});
                done();
            }));
        });


        it('A create request with a fk should succeed', function(done) {
             var request = new SOARequest.CreateRequest();
            request.setCollection('venue');
            request.setContent({
                 id_image       : 2
               , id_municipality: 1
               , name           : 'Reitschule'
            });

            // execute request
            dataService.request(request, createResponse(function(status, data, message) {
                assert.equal(message, 'OK');
                assert.deepEqual(data, {id: 1, id_municipality: 1, name: 'Reitschule'});
                done();
            }));
        });
    });
}();
