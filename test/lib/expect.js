!function() {
    'use strict';


    var   log           = require('ee-log')
        , assert        = require('assert');


    module.exports = function(val, cb){
        return function(err, result){
            try {
                assert.equal(JSON.stringify(result), val);
            } catch (err) {
                return cb(err);
            }
            cb();
        }
    };
}();
