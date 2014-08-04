!function() {
    'use strict';

    var   Class             = require('ee-class')
        , EventEmitter      = require('ee-event-emitter')
        , log               = require('ee-log')
        , fs                = require('fs')
        , DataController    = require('./DataController')
        , Response          = require('./Response');


    var ORM;



    module.exports = new Class({
        inherits: EventEmitter

        // loading status
        , _loaded: false

        // mapping between request actions && our internal mapping
        , _actionMap: {
              4     : 'create'
            , 1     : 'list'
            , 32    : 'createOrUpdate'
            , 8     : 'update'
            , 16    : 'delete'
            , 128   : 'describe'
        }


        , init: function(options, serviceImplementationDirectory, entityList) {
            this._orm           = options.orm;
            this._databaseName  = options.databaseName;
            this._controllerDir = serviceImplementationDirectory.substr(0, serviceImplementationDirectory.lastIndexOf('/'))+'/controller';
            this._entityList    = entityList || [];

            // controller storage
            this._controllers = {};


            // validate input
            if (!this._orm[this._databaseName]) throw new Error('The database «'+this._databaseName+'» was not loaded on the orm!');

            // shortcut for the curretn database
            this._db = this._orm[this._databaseName];

            // orm helper functions, static
            if (!ORM) ORM = this._orm.getORM();


            // load the controllers
            this._loadControllers(options, function(err) {
                this._loaded = true;
                this.emit('_load', err);
            }.bind(this));
        }


        /*
         * handles incoming soa requests
         */
        , request: function(request, response) {
            var   action        = this._getAction(request)
                , controller    = this.getController(request.getCollection());

            if (controller) {
                if (controller.hasAction(action)) controller[action](request, new Response({response: response}));
                else response.send(response.statusCodes.INVALID_ACTION, {status: 'method_not_allowed', message: 'The controller «'+request.getCollection()+'» has no method «'+action+'»!'});
            }
            else response.send(response.statusCodes.TARGET_NOT_FOUND, {status: 'controller_not_found', message: 'The controller «'+request.getCollection()+'» could not be found!'});
        }



        /*
         * determine which action to call
         */
        , _getAction: function(request) {
            var action = this._actionMap[request.getAction()];
            if (request.hasResourceId()) action += 'One';
            if (request.hasRelatedTo()) action += 'Relation';
            return action;
        }


        /*
         * return the controller
         */
        , getController: function(controllerName) {
            return this.hasController(controllerName) ? this._controllers[controllerName] : null;
        }


        /*
         * check if a controller exists
         */
        , hasController: function(controllerName) {
            return Object.hasOwnProperty.call(this._controllers, controllerName);
        }



        /*
         * load controllers from the fs, build others from 
         * the db definition
         */
        , _loadControllers: function(options, callback) {
            options.db = this._db;


            // first scan the directory
            fs.readdir(this._controllerDir, function(err, files) {
                if (err) callback(err);
                else {
                    files.forEach(function(fileName) {
                        var   controllerName = fileName[0].toLowerCase()+fileName.slice(1, -3)
                            , Controller
                            , controller;

                        if (fileName.substr(-3) === '.js') {
                            try {
                                Controller = require(this._controllerDir+'/'+fileName);
                            } catch (err) {
                                log.error('Failed to load controller «'+controllerName+'»!');
                                throw err;
                            }

                            try {
                                controller = new Controller(options, controllerName);
                            } catch (err) {
                                log.error('Failed to instantiate controller «'+controllerName+'»!');
                                throw err;
                            }

                            this._controllers[controllerName] = controller;
                        }
                    }.bind(this));


                    // load all controller that were not implemented already
                    this._entityList.forEach(function(entityName) {
                        var controller;

                        if (!this._controllers[entityName]){
                            try {
                                controller = new DataController(options, entityName);
                            } catch (err) {
                                log.error('Failed to instantiate controller «'+entityName+'»!');
                                throw err;
                            }

                            this._controllers[entityName] = controller;
                        }
                    }.bind(this));

                    // we're done
                    callback();
                }
            }.bind(this));
        }


        /*
         * indicate that we're ready for loading
         */
        , load: function(callback) {
            if (this._loaded) callback(this._loadingError);
            else this.once('_load', callback);
        }


        /*
         * returns a list of cotrollers
         */
        , getcontrollerList: function() {
            return Object.keys(this._controllers);
        }


        /*
         * returns the service name
         */
        , getName: function() {
            return this.name;
        }


        /*
         * out myself as service
         */
        , isService: function() {
            return true;
        }
    });
}();
