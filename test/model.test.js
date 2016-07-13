var should = require('./init.js');
var when = require('when');

var db, Model;

describe('Model', function() {

    before(function() {
        db = getSchema();
        Model = db.define('Model', function(m) {
            m.property('field', String);
        });
    });

    it('should reset prev data on save', function(done) {
        var inst = new Model({field: 'hello'});
        inst.field = 'world';
        inst.save().then(function(s) {
            s.field.should.equal('world');
            s.propertyChanged('field').should.be.false;
            done();
        }).catch(done);
    });

    describe('#toString', function() {

        it('should add model name to stringified representation', function() {
            Model.toString().should.equal('[Model Model]');
        });

    });

    describe('reload', function() {

        it('should reload model from db', function() {
            var cached;
            return Model.create({field: 'hello'})
                .then(function(inst) {
                    cached = inst;
                    return Model.update({
                        where: {id: inst.id},
                        update: {field: 'data'}
                    });
                })
                .then(function() {
                    return cached.reload();
                })
                .then(function(inst) {
                    inst.field.should.equal('data');
                });
        });

    });

    describe('upsert', function() {

        it('should create record when no id provided', function() {
            return Model.upsert({field: 'value'})
                .then(function(inst) {
                    should.exist(inst);
                    should.exist(inst.id);
                });
        });

        context('adapter does not support upsert', function() {
            var updateOrCreate, find, save, updateAttributes;

            beforeEach(function() {
                updateOrCreate = Model.schema.adapter.updateOrCreate;
                updateAttributes = Model.prototype.updateAttributes;
                find = Model.schema.adapter.find;
                save = Model.schema.adapter.save;
                Model.schema.adapter.updateOrCreate = null;
            });

            afterEach(function() {
                Model.schema.adapter.updateOrCreate = updateOrCreate;
                Model.prototype.updateAttributes = updateAttributes;
                Model.prototype.save = save;
                Model.schema.adapter.find = find;
            });

            it('should find and update when found', function() {

                Model.schema.adapter.find = function(modelName, id, cb) {
                    cb(null, {id: 1602, field: 'hello there'});
                };

                Model.prototype.updateAttributes = function(data, cb) {
                    this.__data.field = data.field;
                    cb(null, this);
                };

                return Model.upsert({id: 1602, field: 'value'}, function(err, inst) {
                        should.not.exist(err);
                        should.exist(inst);
                        inst.id.should.equal(1602);
                        inst.field.should.equal('value');
                    });

            });

            it('should try to find and create when not found', function() {

                Model.schema.adapter.find = function(modelName, id, cb) {
                    cb(null, null);
                };

                Model.prototype.save = function(data, cb) {
                    this.__data.field = data.field;
                    cb(null, this);
                };

                return Model.upsert({
                    id: 1602,
                    field: 'value'
                }, function(err, inst) {
                        should.not.exist(err);
                        should.exist(inst);
                        inst.id.should.equal(1602);
                        inst.field.should.equal('value');
                    });

            });

            it('should throw if find returns error', function() {

                Model.schema.adapter.find = function(modelName, id, cb) {
                    cb(new Error('Uh-oh'));
                };

                return Model.upsert({id: 1602, field: 'value'}, function(err, inst) {
                        should.exist(err);
                        err.message.should.equal('Uh-oh');
                    });

            });

        });

    });

    describe('findOrCreate', function() {

        it('should find and create if not found', function() {

            return Model.findOrCreate()
                .then(function(inst) {
                    should.exist(inst);
                });
        });

    });

    describe('exists', function() {

        it('should return error when falsy id provided', function() {
            Model.exists(null, function(err) {
                should.exist(err);
            });
        });

    });

    describe('fromObject', function() {

        it('should mutate existing object', function() {
            var inst = new Model();
            inst.fromObject({field: 'haha'});
            inst.field.should.equal('haha');
        });

    });

});

