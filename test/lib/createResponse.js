!function() {
    'use strict';

    var   log           = require('ee-log')
        , SOAResponse   = require('ee-soa-response');


    module.exports = function(callback){
        var response = new SOAResponse();
        response.on('end', function(status, data) {
            callback(status, data, SOAResponse.getMessage(status));
        });
        return response;
    };
}();
