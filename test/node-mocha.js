var Dispatcher = require('../dist/dispatcher')
  , dispatcher = new Dispatcher()
  , _ = require('underscore')
  , assert = require('assert');


function someFn() { 1 == 1; };
function someFn2() { 2 == 2; };

describe('dispatcher', function() {
  describe('on()', function() {
    it('should add to listeners array', function () {
      var len = _.size(dispatcher._listeners);
      dispatcher.on('event1', someFn);
      assert.equal(_.size(dispatcher._listeners), len + 1);
    });

    it('should listen all', function (done) {
      var called = 0;
      dispatcher.on('*', function () {
        if(++called == 2) {
          assert.ok(true);
          dispatcher.off('*');
          done();
        }
      });
      dispatcher.emit('all1');
      dispatcher.emit('all2');
    });

    it('should support multi-tier event names', function (done) {
      this.timeout(3000);
      var count = 0;
      setTimeout(function () {
        assert.equal(count, 11);
        done();
      }, 1500);
      dispatcher.on('tier1', function () { count++; });
      dispatcher.on('tier1:tier2.namespace', function () { count++; })
      dispatcher.on('tier1.namespakce2', function () { count++; })

      dispatcher.emit('tier1');
      dispatcher.emit('tier1:tier2');
      dispatcher.emit('tier1:tier2:tier3');
      dispatcher.emit('tier1.namespace');
      dispatcher.emit('tier1:tier2.namespace2');
    });

    it('should only catch events with same number of tiers or more', function (done) {
      var count = 0;
      dispatcher.on('t1:t2', function () {
        count++;
        if(count == 2) {
          assert.ok(true);
          done();
        }
      });
      dispatcher.emit('t1');
      dispatcher.emit('t1:t2');
      dispatcher.emit('t1:t2:t3');
    });

    it('should\'nt get more than 10 listeners', function () {
      for(var i = 0; i < 14; i++) {
        dispatcher.on('a', someFn);
      }
      assert.equal(dispatcher.listeners('a').length, 10);
    })

    it('should emit \'newListener\' event', function (done) {
      dispatcher.on('newListener', function () {
        assert.ok(true);
        done();
      });
      dispatcher.on('event1', someFn);
      dispatcher.off('newListener');
    });
  });

  describe('once()', function() {
    it('should add to listeners array when .once() called', function () {
      var len = _.size(dispatcher._listeners);
      dispatcher.once('event2', someFn);
      assert.equal(_.size(dispatcher._listeners), len + 1);
    });

    it('should remove from listeners array when .emit() called', function () {
      var len = _.size(dispatcher._listeners);
      dispatcher.emit('event2');
      assert.equal(_.size(dispatcher._listeners), len - 1);
    });

    it('should emit \'newListener\' event for once', function (done) {
      dispatcher.once('newListener', function () {
        assert.ok(true);
        done();
      });
      dispatcher.once('event3', someFn);
      dispatcher.once('event3', someFn);
      dispatcher.removeAllListeners();
    });
  });

  describe('off()', function() {
    it('should remove from listeners array', function () {
      dispatcher.on('event1', someFn);
      var len = _.size(dispatcher._listeners);
      dispatcher.off('event1');
      assert.equal(_.size(dispatcher._listeners), len - 1);
    });

    it('should be able to remove a spesific listener', function () {
      dispatcher.on('event1', someFn);
      dispatcher.on('event1', someFn2);

      var len = _.size(dispatcher._listeners);
      dispatcher.off('event1', someFn);
      assert.equal(_.size(dispatcher._listeners), len - 1);
      dispatcher.removeAllListeners();
    });

    it('should emit \'removeListener\' event', function (done) {
      var count = 0;
      dispatcher.on('removeListener', function () {
        if (++count === 2) {
          assert.ok(true);
          done();
        }
      });
      dispatcher.on('event1', someFn);
      dispatcher.off('event1', someFn);
      dispatcher.on('event1', someFn);
      dispatcher.off('event1');
      dispatcher.removeAllListeners();
    });
  });

  describe('emit()', function() {
    it('should emit an event', function (done) {
      dispatcher.on('event3', function () {
        assert.ok(true, 'caught an emitted event');
        dispatcher.off('event3');
        done();
      });
      dispatcher.emit('event3');
    });

    it('should emit an event with arguments', function (done) {
      function a() {};

      dispatcher.on('event6', function (ctx) {
        assert.ok(ctx.arguments.length > 0 && ctx.event == 'event6');
        assert.equal(ctx.arguments[0], 'test');
        assert.equal(ctx.arguments[1], 'something');
        assert.equal(ctx.arguments[2], a);
        assert.equal(ctx.arguments[3], 123);
        dispatcher.off('event6');
        done();
      });
      dispatcher.emit('event6', 'test', 'something', a, 123);
    });

    it('should listen event4 of anything', function (done) {
      var len = _.size(dispatcher._listeners);
      dispatcher.on('event4', function () {
        assert.ok(true);
        dispatcher.off('event4');
        done();
      });
      dispatcher.emit('event4.namespace2');
    });

    it('should listen namespace', function (done) {
      dispatcher.removeAllListeners();

      var called = 1;
      dispatcher.on('.namespace1', function () {
        if(called++ == 2) {
          assert.ok(true);
          dispatcher.off('.namespace1');
          done();
        }
      });
      dispatcher.emit('event5.namespace1');
      dispatcher.emit('event6.namespace1');
    });

    it('should match events with namespaces', function (done) {
      dispatcher.removeAllListeners();
      dispatcher.on('event.test', function () {
        assert.ok(true);
        done();
      });
      dispatcher.emit('event.test');
    });
  });

  describe('listeners()', function() {
    it('should return listeners of an event', function () {
      dispatcher.removeAllListeners();

      dispatcher.on('a', someFn);
      assert.equal(dispatcher.listeners('a').length, 1);
    });

    it('should match multiple events', function () {
      dispatcher.removeAllListeners();

      dispatcher.on('a', function (){});
      dispatcher.on('a.namespace', function (){});
      dispatcher.on('a:b.namespace', someFn);
      assert.equal(dispatcher.listeners('a:b').length, 3);
      assert.equal(dispatcher.listeners('a').length, 2);
      assert.equal(dispatcher.listeners('a.namespace').length, 2);
    });
  });

  describe('callback dependency', function () {
    it('should execute event8 after event8.namespace', function (done) {
      dispatcher.removeAllListeners();

      var result = false;
      dispatcher.on('event8.namespace', function () {
        result = true;
      });
      dispatcher.on('event8', ['.namespace'], function () {
        assert.ok(result);
        dispatcher.removeAllListeners();
        done();
      })
      dispatcher.emit('event8');
    });

    it('should execute event8 even though it\'s dependent on event7', function (done) {
      dispatcher.on('event8', ['event7'], function () {
        assert.ok(true);
        done();
      })
      dispatcher.emit('event8');
    });

    it('should execute multiple dependencies in order', function (done) {
      dispatcher.removeAllListeners();
      var count = 0;
      dispatcher.on('event9', ['.namespace2', '.namespace3'], function () {
        assert.equal(count, 2, 'event9 not executed last')
        done();
      });
      dispatcher.on('event9.namespace2', ['.namespace3'], function () {
        if(count == 1)
          count++;
        else
          assert.ok(false, '.namespace2 not executed second')
      });

      dispatcher.on('event9.namespace3', function () {
        if(count == 0)
          count++;
        else
          assert.ok(false, '.namespace3 not executed first')
      });

      dispatcher.emit('event9');
    });

    it('should support promises', function (done) {
      this.timeout(6500);
      dispatcher.removeAllListeners();
      var result = 0;

      dispatcher.on('a.n1', function () {
        var fn;
        var promise = {
          then: function (func) {
            fn = func;
          }
        };
        setTimeout(function () {
          result++;
          fn();
        }, 2000);
        return promise;
      });

      dispatcher.on('a.n2', '.n1', function() {
        var fn;
        var promise = {
          then: function (func) {
            fn = func;
          }
        };
        setTimeout(function () {
          result++;
          fn();
        }, 1500);
        return promise;
      });

      dispatcher.on('a', ['.n1', '.n2'], function () {
        if(result == 2) {
          assert.ok(true);
          done();
        }
      });

      dispatcher.emit('a');
    });

    it('should run after everything else', function (done) {
      var count = 0;

      dispatcher.removeAllListeners();
      dispatcher.on('a.ns', function () {
        count++;
      });
      dispatcher.on('a', '*', function () {
        assert.equal(count, 5);
        done();
      });
      dispatcher.on('a:t', '.ns', function () {
        count++;
      });
      dispatcher.on('a:t:t2.ns', function () {
        count++;
      });
      dispatcher.on('a', '.ns', function () {
        count++;
      });
      dispatcher.on('a:t.ns', function () {
        count++;
      });
      dispatcher.emit('a:t:t2');
    });
  });

  describe('multiple dispatcher instances', function () {
    it('should have two different instances', function () {
      dispatcher.removeAllListeners();
      var dispatcher1 = new Dispatcher();
      var dispatcher2 = new Dispatcher();

      dispatcher1.on('a', someFn);

      assert.notEqual(dispatcher1.listeners().length, dispatcher2.listeners().length);
    });

    it('two instaces can have different maxListeners', function () {
      var dispatcher1 = new Dispatcher();
      var dispatcher2 = new Dispatcher();
      dispatcher1.setMaxListeners(5);
      dispatcher2.setMaxListeners(20);

      for(var i = 0; i < 100; i++) {
        dispatcher1.on('event', someFn);
        dispatcher2.on('event', someFn);
      }

      assert.equal(dispatcher1.listeners().length, 5);
      assert.equal(dispatcher2.listeners().length, 20);
    });
  });

  describe('stopPropagation()', function () {
    it('should stop after 1st event', function (done) {
      var ok = true;

      dispatcher.on('e1.ns', function (ctx) {
        ctx.stopPropagation();
      });

      dispatcher.on('e1', '.ns', function (ctx) {
        ok = false;
      });

      dispatcher.emit('e1');

      setTimeout(function () {
        assert.ok(ok);
        done();
      }, 1000);

      dispatcher.removeAllListeners();
    });
  });

  describe('applyEmit()', function () {
    it('should return a function', function () {
      assert.equal(typeof dispatcher.applyEmit('e1'), 'function');
    });

    it('should emit event on function run', function (done) {
      dispatcher.on('e1', function () {
        assert.ok(true);
        done();
      });
      dispatcher.applyEmit('e1')();
    });

    it('shouldn\'t misemit', function (done) {
      var ok = true;

      dispatcher.on('e1', function (ctx) {
        ok = false;
      });

      dispatcher.applyEmit('e2')();

      setTimeout(function () {
        assert.ok(ok);
        dispatcher.removeAllListeners();
        done();
      }, 1000);
    });

    it('should emit arguments', function (done) {
      dispatcher.on('e1', function (ctx) {
        assert.equal(ctx.arguments.length, 4);
        done();
      });

      dispatcher.applyEmit('e1', 'arg1', 2, 2.45, function(){})();
    });
  });
});
