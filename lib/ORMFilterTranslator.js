(function() {
    'use strict';

    const log = require('ee-log');
    const type = require('ee-types');



    // operator whitelist
    const operators = new Map();

    operators.set('>', 'gt');
    operators.set('<', 'lt');
    operators.set('>=', 'gte');
    operators.set('<=', 'lte');
    operators.set('!=', 'notEqual');
    operators.set('=', 'equal');

    operators.set('like', 'like');
    operators.set('notLike', 'notLike');
    operators.set('in', 'in');
    operators.set('notIn', 'notIn');
    operators.set('notNull', 'notNull');
    operators.set('isNull', 'isNull');
    operators.set('equal', 'equal');
    operators.set('not', 'not');
    operators.set('is', 'is');
    operators.set('fulltext', 'fulltext');






    module.exports = class ORMFilterTranslator {



        /**
         * @param {object} related the related orm
         */
        constructor(related) {
            this.related = related;
        }




        /**
         * translates soa filter to related orm filters
         *
         * @param {object} soaFilterConfig the soa filter object to translate
         *
         * @returns {filter|error}
         */
        translate(soaFilterConfig) {

            // strict type checking
            if (type.object(soaFilterConfig)) {
                let filterName = soaFilterConfig.operator;
                let value = soaFilterConfig.value;


                // extract filters that are functions
                if (type.function(value)) {
                    try {
                        const config = value();
                        filterName = config.name;
                        value = config.parameters;
                    } catch (err) {
                        return new Error(`Failed to extract executable filter: ${err.message}`);
                    }
                }


                // translate filtername
                if (operators.has(filterName)) {
                    filterName = operators.get(filterName);


                    if (filterName === 'fulltext') {


                        // full text search
                        const filter = this.related.fulltext('german').and();

                        value.forEach((parameter) => {
                            filter.or().value(parameter).value(parameter).wildcardAfter();
                        });

                        return filter;
                    } else {
                        value = this.processValue(value);


                        // check if the orm exposes the filter
                        if (type.function(this.related[filterName])) {


                            // try to apply the filter
                            try {
                                return this.related[filterName](value);
                            } catch (err) {
                                return new Error(`Failed to execute the filter 'related.${filterFunction}(${filterValue});': ${e.message}`);
                            }
                        } else return new Error(`Failed to apply filter '${filterName}': the related orm doesn't support that filter!`);
                    }
                } else return new Error(`Failed to apply filter '${filterName}' because it is _not_ part of the whitelisted functions: ${Array.from(operators.keys()).join(', ')}!`);
            } else return new Error(`Failed to apply filter: expected an object, got '${type(soaFilterConfig)}'!`);
        }




        processValue(value) {
            if (type.array(value)) return value.map(val => this.processValue(val));
            else {
                if (type.function(value)) {
                    return this.translate({
                        name: '-no-name-',
                        value: value,
                    })
                } else return value;
            }
        }
    };



})();
