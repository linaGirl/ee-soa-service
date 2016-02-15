(function() {
	'use strict';
	

	module.exports = class MockRelated {
		



		event() {
			if (this instanceof event) return {};
			else return function() {};
		}








		has(entityName) {
			return entityName === 'event';
		}
	};
})();
