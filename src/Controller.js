(function() {
	'use strict';
	

	module.exports = class Controller {
		



		/**
		 * set up the controller basics
		 *
		 * @param {string} name
		 * @param {object} service the service the controller is running on
		 * @param {object} options
		 */
		constructor(name, service, options) {
			this.name = name;
			this.service = service;
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
