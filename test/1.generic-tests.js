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
    describe('[Preparations, Generic]', function() {
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





    describe('[Generic]', function() {
        it('An empty request should return a TARGET_NOT_FOUND status', function(done) {
            var request = new SOARequest.CreateRequest();

            // execute request
            dataService.request(request, createResponse(function(status, data, message) {
                assert.equal(message, 'TARGET_NOT_FOUND');
                done();
            }));
        });
    });
}();
