(function() {
	'use strict';

	let fs 					= require('fs');
	let EventEmitter 		= require('ee-event-emitter');
	let type 				= require('ee-types');
	let LegacyRequestBridge = require('./LegacyRequestBridge');
	let Controller 			= require('./Controller');
	let AutoCRUDController  = require('./AutoCRUDController');



	// use it as singleton
	let legacyRequestBridge = new LegacyRequestBridge();

	




	module.exports = class Service extends EventEmitter {


		/**
		 * set up the service
		 *
		 * @param {object} options
		 * @param {object} controllerOptions
		 */
		constructor(options, controllerOptions) {

			// the set contains all the names
			// of the controllers that need to
			// be loaded
			this.registeredControllers = new Map();


			// storage for all loaded controllers
			this.controllers = new Map();


			// store the controlelr options
			this.controllerOptions = controllerOptions;
		}














		/**
		 * accepts incoming requests
		 *
		 * @param {object} request
		 * @param {object} response
		 */
		request(request, response) {

			// the service can handle legacy requests
			// via a bridge that translates the old to
			// the new requests and vice versa
			if (response) request = legacyRequestBridge.convert(request, response);


			// the controller must be availbale
			if (this.hasController(request.getObjectName())) {


				// get the controller
				this.loadController(controllerName).then((controller) => {


					// check if the controller has the 
					// action requested
					if (controller.hasAction(request.getActionName())) {


						// execute the action
						controller.request(request);
					} else response.sendError('action_not_found', `The controller '${request.getObjectName()}' on the service '${this.getServiceName()}' has no action '${request.getActionName()}'!`);
				}).catch((err) => response.sendError('service_error', `The service '${this.getServiceName()}' failed to load the controller '${request.getObjectName()}'!`, err));
			} else response.sendError('object_not_found', `The service '${this.getServiceName()}' has no controller '${request.getObjectName()}'!`);
		}










		/**
		 * load or return an already loaded controller 
		 *
		 * @param {string} controllerName
		 *
		 * @returns {promise}
		 */
		loadController(controllerName) {


			// check if the controller is loaded or
			// is beeing loaded
			if (this.controllers.has(controllerName)) {
				let controller = this.controllers.get(controllerName);


				// if the controller is an array the controller
				// is beeing loaded, else its loaded aready loaded
				// or it failed to laod if it's an error
				if (type.array(controller)) return this.queueControllerRequest(controllerName);
				else if (type.error(controller)) return Promise.reject(controller);
				else return Promise.resolve(controller);
			}
			else {
				let controlletValue = this.registeredControllers.get(controllerName);


				// set promise callback array for requests that get in 
				// while the controler is beeing loaded
				this.controllers.set(controllerName, []);


				// determine thy type of the registered
				// controller
				if (type.string(controlletValue)) {


					// load the controllet from the filesystem
					let Constructor;

					try {
						Constructor = require(controlletValue);
					} catch (err) {
						return Promise.reject(err);
					}

					return this.instantiateController(controllerName, Constructor);
				} else if (type.function(controlletValue)) {


					// constructor, execute and check if it implemetns
					// the contoller implementation
					return this.instantiateController(controllerName, controlletValue);
				} else if (type.undefined(controlletValue) || type.null(controlletValue)) {


					// virtual controller, load using the db if 
					// possible
					if (this.db && this.db.has(controllerName)) return this.instantiateController(controllerName, AutoCRUDController);
					else return Promise.reject(new Error(`Cannot load the controller '${controllerName}' because the corresponding database entitiy is not available!`)); 
				} else return Promise.reject(new Error(`Cannot load the controller '${controllerName}' because it was registred incorrectly!`));
			}
		}






		




		/**
		 * return a queued promise
		 *
		 * @param {string} controllerName
		 *
		 * @returns {promise}
		 */
		queueControllerRequest(controllerName) {
			return new Promise((resolve, reject) => {
				this.controllers.get(controllerName).push({
					  resolve: resolve
					, reject: reject
				});
			});
		}



	



		/**
		 * instantiate controller and register it
		 *
		 * @param {string} controllerName
		 * @param {function} ControllerConstructor
		 *
		 * @returns {promise}
		 */
		instantiateController(controllerName, ControllerConstructor) {
			let instance;


			// eait until our promise is queues, then 
			// load the controller
			process.nextTick(() => {
				new Promise((resolve, reject) => {

					// instantiate
					try {
						instance = new ControllerConstructor(this, this.controllerOptions);
					} catch (err) {
						return reject(err);
					}


					if (instance instanceof Controller) {

						// nice, let the controller load stuff
						instance.load().then(() => resolve(instance)).reject(reject);
					} else reject(new Error(`Cannot load the controller '${controllerName}' because it does not inherit from the Controller class!`));
				}).then((instance) => {


					// call all callbacks
					this.controllers.get(controllerName).forEach((item) => item.resolve(instance));

					// store
					this.controllers.set(controllerName, instance);
				}).catch((err) {


					// call all callbacks
					this.controllers.get(controllerName).forEach((item) => item.reject(err));

					// store
					this.controllers.set(controllerName, err);
				});
			});



			// 	return a queued promise
			return this.queueControllerRequest(controllerName);
		}













		/**
		 * makes a specific controller available
		 * to the service
		 *
		 * @param {string} controllerName
		 * @param {string|function|undefined|null}
		 *
		 * @returns {this}
		 */
		registerController(controllerName, path) {
			this.registeredControllers.set(controllerName, path);
		}



		






		/**
		 * checks if a controller is available
		 *
		 * @param {string} controllerName
		 *
		 * @param {boolean} true if the controller is registered
		 */
		hasController(controllerName) {
			return this.registeredControllers.has(controllerName);
		}
	};
})();
