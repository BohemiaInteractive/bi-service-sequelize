const Service   = require('bi-service');
const sinon     = require('sinon');
const chai      = require('chai');
const sinonChai = require("sinon-chai");
const Sequelize = require('sequelize');

var sequelizeBuilder = require('../index.js');
var penetrator       = require('../lib/penetrator.js');

var expect = chai.expect;

chai.use(sinonChai);
chai.should();

describe('loadModels', function() {
    before(function() {
        this.fileIteratorStub = sinon.stub(Service.moduleLoader, 'fileIterator', fileIterator);
        this.sequelizeImportStub = sinon.stub(Sequelize.prototype, 'import');
        this.associateMethodSpy = sinon.spy();

        this.model1 = {
            name: 'model1',
            associate: this.associateMethodSpy
        };

        this.model2 = {
            name: 'model2',
            associate: this.associateMethodSpy
        };

        this.sequelizeImportStub.onFirstCall().returns(this.model1);
        this.sequelizeImportStub.onSecondCall().returns(this.model2);

        function fileIterator(paths, options, callback) {
            /*
             * fileIterator calls callback for each file found on filesystem
             */
            callback('file1', 'dir1');
            callback('file2', 'dir2');
        };

        this.sequelize = new Sequelize('test','test','test', {
            host: '127.0.0.1',
            dialect: 'postgres',
        });
        this.output = this.sequelize.loadModels('dumy/path');
    });

    after(function() {
        this.fileIteratorStub.restore();
        this.sequelizeImportStub.restore();
    });

    it('should call sequelize.import for each file ', function() {
        this.sequelizeImportStub.should.have.been.calledTwice;
        this.sequelizeImportStub.should.have.been.calledWith('dir1/file1');
        this.sequelizeImportStub.should.have.been.calledWith('dir2/file2');
    });

    it('should call the `associate` method on each loaded model object', function() {
        this.associateMethodSpy.should.have.been.calledTwice;
        this.associateMethodSpy.should.have.been.calledWith(this.output);
    });

    it('should return dictionary of loaded models', function() {
        this.output.should.have.property('model1', this.model1);
        this.output.should.have.property('model2', this.model2);
    });

});

describe('sequelizeBuilder', function() {
    it('should return new Sequelize object', function() {
        var sequelize = sequelizeBuilder({
            host: 'localhost',
            db: 'test',
            username: 'root',
            dialect: 'postgres'
        });

        sequelize.should.be.an.instanceof(Sequelize);
    });

    it('should build new Sequelize object with provided options', function() {

        var options = {
            host: 'localhost',
            db: 'test',
            username: 'root',
            password: 'test',
            dialect: 'postgres',
            pool: {
                min: 10,
                max: 100,
                idle: 10
            },
            ssl: true
        };

        var sequelize = sequelizeBuilder(options);

        sequelize.config.should.have.property('database', options.db);
        sequelize.config.should.have.property('username', options.username);
        sequelize.config.should.have.property('password', options.password);
        sequelize.config.should.have.property('host', options.host);
        sequelize.config.should.have.property('pool').that.is.eql(options.pool);
        sequelize.config.should.have.deep.property('dialectOptions.ssl', options.ssl);
    });

    it('should add cache support to the created sequelize object', function() {
        var spy = sinon.spy(penetrator, 'penetrateCacheSupport');

        var sequelize = sequelizeBuilder({
            host: 'localhost',
            db: 'test',
            username: 'root',
            dialect: 'postgres'
        });

        spy.should.have.been.calledOnce;
        spy.should.have.been.calledWithExactly(sequelize);

        spy.restore();
    });

    it('should NOT add cache support if the `cache` option is "disabled"', function() {
        var spy = sinon.spy(penetrator, 'penetrateCacheSupport');

        var sequelize = sequelizeBuilder({
            host: 'localhost',
            db: 'test',
            username: 'root',
            dialect: 'postgres',
            cache: false
        });

        spy.should.have.callCount(0);
        spy.restore();
    });

    it('should allow to define `classMethods` options', function() {

        var classMethods = {
            method1: function() {},
            method2: function() {},
            search: function() {},
        };

        var sequelize = sequelizeBuilder({
            host: 'localhost',
            db: 'test',
            username: 'root',
            dialect: 'postgres',
            classMethods: classMethods
        });

        sequelize.options.define.classMethods.should.have.property('method1', classMethods.method1);
        sequelize.options.define.classMethods.should.have.property('method2', classMethods.method2);
        sequelize.options.define.classMethods.should.have.property('search', classMethods.search);
    });

    it('should allow to define `instanceMethods` options', function() {
        var instanceMethods = {
            method1: function() {},
            method2: function() {},
            normalize: function() {},
        };

        var sequelize = sequelizeBuilder({
            host: 'localhost',
            db: 'test',
            username: 'root',
            dialect: 'postgres',
            instanceMethods: instanceMethods
        });

        sequelize.options.define.instanceMethods.should.have.property('method1', instanceMethods.method1);
        sequelize.options.define.instanceMethods.should.have.property('method2', instanceMethods.method2);
        sequelize.options.define.instanceMethods.should.have.property('normalize', instanceMethods.normalize);
    });
});
