(function() {
	'use strict';

	let assert 			= require('assert');
	let path 			= require('path');
	let log 			= require('ee-log');
	let SOAService 		= require('../');
	let TestService 	= require('./lib/TestService');
	let CoffeController = require('./lib/controller/Coffee');
	let MockRelated 	= require('./lib/MockRelated');






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

		it('registerController() with a controller constructor', function() {
			let service = new TestService();
			service.registerController('coffee', CoffeController);
		});

		it('registerController() with a path', function() {
			let service = new TestService();
			service.registerController('coffee', path.join(__dirname, 'lib/controller/Coffee.js'));
		});



		it('loadContollerDirectory()', function(done) {
			let service = new TestService();
			service.loadContollerDirectory(path.join(__dirname, 'lib/controller')).then(() => done()).catch(done);
		});



		it('loadController() with a controller constructor', function(done) {
			let service = new TestService();
			service.registerController('coffee', CoffeController);
			service.loadController('coffee').then(() => done()).catch(done);
		});

		it('loadController() with a controller registered with a path', function(done) {
			let service = new TestService();
			service.registerController('coffee', path.join(__dirname, 'lib/controller/Coffee.js'));
			service.loadController('coffee').then(() => done()).catch(done);
		});

		it('loadController() with a not registred auto-controller', function(done) {
			let service = new TestService();
			service.loadController('event').then(() => done(new Error('the controller should not load!'))).catch(() => done());
		});

		it('loadController() registred with an non existing auto-controller', function(done) {
			let service = new TestService();
			service.registerController('nope');
			service.loadController('nope').then(() => done(new Error('the controller should not load!'))).catch(() => done());
		});

		it('loadController() registred with an existing auto-controller', function(done) {
			let service = new TestService({}, {db: new MockRelated()});
			service.registerController('event');
			service.loadController('event').then(() => done()).catch(done);
		});
	});
})();