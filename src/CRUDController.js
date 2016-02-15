(function() {
	'use strict';

	let Controller = require('./Controller');




	module.exports = class CRUDController extends Controller {
		



		/**
		 * set up the controller basics
		 *
		 * @param {string} name
		 * @param {object} service the service the controller is running on
		 * @param {object} options
		 */
		constructor(name, service, options) {
			super(name, service, options);

		}


		





		/**
		 * prepare the controller 
		 *
		 * @returns {promise}
		 */
		load() {
			return Promise.resolve();
		}
		
	};
})();
