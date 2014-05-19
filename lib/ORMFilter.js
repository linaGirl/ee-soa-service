
    !function() {
        'use strict';

        var Class          = require('ee-class')
            , log          = require('ee-log')
            , type         = require( "ee-types" );

        var ormFilter = new Class({

            init: function(options) {
                this.options = options || {};
                this.operatorMap = {
                    '>'    : 'gt'
                    , '<'  : 'lt'
                    , '>=' : 'gte'
                    , '<=' : 'lte'
                };
            }

            , get: function(filter, ORM) {
                var filterFunction = filter.operator;
                var filterValue;

                if(filter.operator === '=') {

                    if(type.function(filter.value)) {
                        var ormFilter  = filter.value();
                        filterFunction = ormFilter.name;
                        filterValue    = ormFilter.parameters;
                    }
                    else {
                        return filter.value;
                    }

                }
                else if(Object.hasOwnProperty.call(this.operatorMap, filter.operator)) {
                    filterFunction = this.operatorMap[filter.operator];
                    filterValue    = filter.value;
                }

                if(Object.hasOwnProperty.call(ORM, filterFunction)) {
                    try {
                        var filterReturn = ORM[filterFunction](filterValue);
                        return filterReturn;
                    } catch (e) {
                        return {
                            error: 1
                            , msg: e.message
                        };
                    }
                }
                else {
                    return {
                        error: 1
                        , msg: 'filter "' + filterFunction + '" not found on ORM!'
                    };
                }
            }


        });

        module.exports = new ormFilter();

    }();
