!function() {
    'use strict';

    var   Class         = require('ee-class')
        , log           = require('ee-log')
        , async         = require('ee-async')
        , ORM           = require('ee-orm')
        , fs            = require('fs');


    var ormInstance, setupError;


    // set up the test db
    var setup = function(callback) {
        var   sqlStatments
            , config
            , orm
            , db;


        try {
            // local config, for local db
            config = require('../../config.js').db
        } catch(e) {
            // default setup for travis-ci
            config = {
                ee_soa_service_test: {
                      type: 'postgres'
                    , hosts: [
                        {
                              host      : 'localhost'
                            , username  : 'postgres'
                            , password  : ''
                            , port      : 5432
                            , mode      : 'readwrite'
                            , database  : 'test'
                            , maxConnections: 500
                        }
                    ]
                }
            };
        }



        // get sql for creating the test db
        sqlStatments = fs.readFileSync(__dirname+'/create-tables.sql').toString().split(';').map(function(input){
            return input.trim().replace(/\n/gi, ' ').replace(/\s{2,}/g, ' ')
        }).filter(function(item){
            return item.length;
        });


        // connect
        orm = new ORM(config);

        // wait until loaded
        orm.on('load', function(err) {
            if (err) callback(err);
            else {
                // get a connection in order to execute raw sql
                orm.getDatabase('ee_soa_service_test').getConnection(function(err, connection){
                    if (err) callback(err);
                    else {
                        // create tables
                        async.each(sqlStatments, connection.queryRaw.bind(connection), function(err) {
                            if (err) callback(err);
                            else {
                                // reload (there are new tables)
                                orm.reload(function(err) {
                                    callback(err, orm);
                                });
                            }
                        });
                    }
                });  
            }
        });
    };



    module.exports = function(callback) {
        if (ormInstance || setupError) callback(setupError, ormInstance);
        else {
            setup(function(err, orm) {
                if (err) setupError = err;
                else if (orm) ormInstance = orm;

                callback(err, orm);
            });
        }
    }

}();
