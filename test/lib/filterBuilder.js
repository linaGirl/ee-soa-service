!function() {
    'use strict';


    var   log           = require('ee-log')
        , assert        = require('assert');


    module.exports = {

        and: function() {
            var a = Array.prototype.slice.call(arguments);
            
            a.type = 'and';
            return a;
        }

        , or: function() {
            var a = Array.prototype.slice.call(arguments);

            a.type = 'or';
            return a;
        }

        , item: function(field, fn, value) {
            return {
                  fields    : field
                , function  : fn
                , value     : value
            };
        }
    }
}();
