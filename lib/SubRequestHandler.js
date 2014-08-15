!function() {
    'use strict';

    var   Class             = require('ee-class')
        , EventEmitter      = require('ee-event-emitter')
        , log               = require('ee-log')
        , SOAResponse       = require('ee-soa-response')
        , async             = require('ee-async');



    module.exports = new Class({
        inherits: EventEmitter


        , init: function(options) {
            this._references    = options.references;
            this._belongsTo     = options.belongsTo;
            this._mappings      = options.mappings;
            this._columns       = options.columns;
            this._primaryKeys   = options.primaryKeys;
            this._tableName     = options.tableName;
        }



        , execute: function(request, response, rows) {
            var subRequests = request.getSubRequests();

            async.each(subRequests, function(subRequest, done) {
                var   collection = subRequest.getCollection().trim()
                    , definition
                    , response;

                if (this.hasMapping(collection)) {
                    // prepare filters
                    log(this._mappings[collection], '_mappings');
                }
                else if (this.hasBelongsTo(collection)) {
                    definition = this._belongsTo[collection];
                    //log(this._belongsTo[collection], '_belongsTo');
                    subRequest.fields.push(definition.referencingColumn);
                    subRequest.filters[definition.referencingColumn] = [function(){ return {name: 'in', parameters: this._getColumnValues(rows, definition.column)}}]
                }
                else if (this.hasReference(collection)) {
                    log(this._references[collection], '_references');
                }
                else {
                    done(new Error('The entity «'+this._tableName+'» has no reference to the entity «'+collection+'»!'));
                    return;
                }


                response = new SOAResponse();
                log.wtf('subrequesting');
                response.on('end', function(statusCode, data) {
                    log(statusCode, data);
                    done();
                }.bind(this));

                this.emit('request', subRequest, response);
            }.bind(this), function(){
                log.error('done')
            });

            log(subRequests);
        }


        /*
         * get values of a specifc column
         */
        , _getColumnValues: function(rows, columnName) {
            var values;

            if (rows && rows.length) {
                values = rows.map(function(row) {
                    return row[columnName];
                }).filter(function(value) {
                    return value !== null && value !== undefined;
                });
            }

            return values || [];
        }



        /*
         * checks if a given mapping exists
         */
        , hasMapping: function(collection) {
            return Object.hasOwnProperty.call(this._mappings, collection);
        }

        /*
         * checks if a given references exists
         */
        , hasReference: function(collection) {
            return Object.hasOwnProperty.call(this._references, collection);
        }

        /*
         * checks if a given belongsto exists
         */
        , hasBelongsTo: function(collection) {
            return Object.hasOwnProperty.call(this._belongsTo, collection);
        }
    });
}();
