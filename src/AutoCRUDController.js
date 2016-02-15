(function() {
	'use strict';

	let CRUDController = require('./CRUDController');




	module.exports = class AutoCRUDController extends CRUDController {
		



		/**
		 * set up the controller basics
		 *
		 * @param {string} name
		 * @param {object} service the service the controller is running on
		 * @param {object} options
		 */
		constructor(name, service, options) {
			super(name, service, options);

			if (options && options.db) this.db = options.db;
			else throw new Error(`Cannot load AutoCRUDController because the database object is missing!`);
		}
		






		load() {
			return super.load().then(() => {
				if (this.db.has(this.name)) return Promise.resolve();
				else return Promise.reject(`Cannot load the '${this.name}' controller because the database does not export the '${this.name}' entitiy!`);
			});
		}
	};
})();
