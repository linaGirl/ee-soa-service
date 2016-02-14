(function() {
	'use strict';

	let assert 			= require('assert');
	let path 			= require('path');
	let log 			= require('ee-log');
	let SOAService 		= require('../');
	let TestService 	= require('./lib/TestService');
	let CoffeController = require('./lib/controller/Coffee');






	describe('Service', () => {
		it('new Service() should not crash', function() {
			new SOAService.Service();
		});

		it('new TestService() should not crash', function() {
			new TestService();
		});



		it('registerController() with an existing autocontroller', function() {
			let service = new TestService();
			service.registerController('event');
		});

		it('registerController() with an non existent autocontroller', function() {
			let service = new TestService();
			service.registerController('nope');
		});

		it('registerController() with an a constructor', function() {
			let service = new TestService();
			service.registerController('coffee', CoffeController);
		});

		it('registerController() with a path', function() {
			let service = new TestService();
			service.registerController('coffee', path.join(__dirname, 'lib/controller/Coffee.js'));
		});



		it('loadContollerDirectory() with an fs based controller', function(done) {
			let service = new TestService();
			service.loadContollerDirectory(path.join(__dirname, 'lib/controller')).then(() => done()).catch(done);
		});



		it('registerController() with an a constructor', function(done) {
			let service = new TestService();
			service.registerController('coffee', CoffeController);
			service.loadController('coffee').then(() => done()).catch(done);
		});
	});
})();