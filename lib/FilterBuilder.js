!function() {
    'use strict';

    var   Class             = require('ee-class')
        , EventEmitter      = require('ee-event-emitter')
        , type              = require('ee-types')
        , async             = require('ee-async')
        , log               = require('ee-log');


    var ORM;



    module.exports = new Class({
        inherits: EventEmitter

        // allowed orm filters
        , _validFilters: {
              like      : true
            , in        : true
            , notIn     : true
            , notNull   : true
        }

        // valid operators
        , _validOperators: {
             '!='       : 'notEqual'
            , '<'       : 'lt'
            , '>'       : 'gt'
            , '>='      : 'gte'
            , '=>'      : 'gte'
            , '<='      : 'lte'
            , '=<'      : 'lte'
        }


        , init: function(options) {
            this._orm           = options.orm;
            this._tableName     = options.tableName;
            this._databaseName  = options.databaseName;
            this._db            = options.db;
            this._model         = options.model;

            // orm helper functions, static
            if (!ORM) ORM = this._orm.getORM();
        }


        /*
         * build a filter object from a request
         */
        , fromRequest: function(request, query, callback) {
            this._renderFilter(query, request.getFilters(), function(err, filters) {
                if (err) callback(err);
                else {
                     query.filter(filters);
                     callback();
                }
            }.bind(this));           
        }


        /*
         * recursive filter renderer, applies it directly to the query
         */
        , _renderFilter: function(query, requestFilters, callback) {
            var   filter = {}
                , otherEntities = []
                , err;


            Object.keys(requestFilters).forEach(function(columnName) {
                var   instructions = requestFilters[columnName]
                    , fieldFilters = [];
                
                if (type.array(instructions)) {
                    instructions.forEach(function(instruction) {
                        switch(type(instruction.value)) {
                            case 'function':
                                var fn = instruction.value();
                                if (this._validFilters[fn.name]){
                                    fieldFilters.push(ORM[fn.name](fn.parameters));
                                }
                                else err = new Error('The filter «'+fn.name+'» is not supported!');
                                break;

                            case 'array':
                                instruction.value = instruction.value.length ? instruction.value[0] : undefined;

                            case 'number':
                            case 'string':
                            case 'date':
                            case 'boolean':
                                if (instruction.operator === '=') fieldFilters.push(instruction.value);
                                else {
                                    if (this._validOperators[instruction.operator]) {
                                         fieldFilters.push(ORM[this._validOperators[instruction.operator]](instruction.value));
                                    }
                                    else err = new Error('The operator «'+instruction.operator+'» is not supported!');
                                }                            
                                break;

                            default:
                                err = new Error('The data structure with the type «'+type(instruction.value)+'» is not supported!');
                        }
                    }.bind(this));

                    if (fieldFilters.length > 1) filter[columnName] = ORM.and(fieldFilters);
                    else if (fieldFilters.length) filter[columnName] = fieldFilters[0];
                }
                else if (type.object(instructions)) {
                    otherEntities.push({
                          entity        : columnName
                        , instructions  : instructions
                    });
                }
            }.bind(this));

            
            // check if we failed to parse any filters
            if (err) callback(err);
            else {
                // work on subentites
                async.each(otherEntities, function(set, done) {
                    this._renderFilter(query.get(set.entity), set.instructions, function(err, renderedFilter) {
                        if (err) done(err);
                        else {
                            query.get(set.entity, renderedFilter);
                            done();
                        }
                    }.bind(this));
                }.bind(this), function(err) {
                    // we're done
                    callback(err, filter);
                }.bind(this));
            }
        }
    });
}();
