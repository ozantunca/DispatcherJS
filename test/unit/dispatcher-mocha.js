var Dispatcher = require('../../dist/dispatcher.min')
  , dispatcher = new Dispatcher()
  , assert = require('assert');


function someFn() { 1 == 1; };
function someFn2() { 2 == 2; };

describe('lib.dispatcher', function() {

  describe('on()', function() {
    it('should add to listeners array', function () {
      var len = size(dispatcher._listeners);
      dispatcher.on('event1', someFn);
      assert.equal(size(dispatcher._listeners), len + 1);
      dispatcher.removeAllListeners();
    });

    it('should listen all', function (done) {
      var called = 1;
      dispatcher.on('*', function () {
        if(called++ == 2) {
          assert.ok(true);
          dispatcher.off('*');
          done();
        }
      });
      dispatcher.emit('all1');
      dispatcher.emit('all2');
      dispatcher.removeAllListeners();
    });

    it('should support multi-tier event names', function (done) {
      this.timeout(3000);
      var count = 0;
      setTimeout(function () {
        if(count == 11) {
          assert.ok(true);
          done();
        }
      }, 1500);
      dispatcher.on('tier1', function () { count++; });
      dispatcher.on('tier1:tier2.namespace', function () { count++; })
      dispatcher.on('tier1.namespace2', function () { count++; })

      dispatcher.emit('tier1');
      dispatcher.emit('tier1:tier2');
      dispatcher.emit('tier1:tier2:tier3');
      dispatcher.emit('tier1.namespace');
      dispatcher.emit('tier1:tier2.namespace2');
      dispatcher.removeAllListeners();
    });

    it('should only catch events with same number of tiers or more', function (done) {
      var count = 0;
      dispatcher.on('tier1:tier2', function () {
        count++;
        if(count == 2) {
          assert.ok(true);
          done();
        }
      });
      dispatcher.emit('tier1');
      dispatcher.emit('tier1:tier2');
      dispatcher.emit('tier1:tier2:tier3');
      dispatcher.removeAllListeners();
    });

    it('should\'nt get more than 10 listeners', function () {
      for(var i = 0; i < 14; i++) {
        dispatcher.on('a', someFn);
      }
      assert.equal(dispatcher._listeners.length, 10);
      dispatcher.removeAllListeners();
    })

    it('should emit \'newListener\' event', function (done) {
      dispatcher.on('newListener', function () {
        assert.ok(true);
        done();
      });
      dispatcher.on('event1', someFn);
      dispatcher.removeAllListeners();
    });
  });

  describe('once()', function() {
    it('should add to listeners array when .once() called', function () {
      var len = size(dispatcher._listeners);
      dispatcher.once('event2', someFn);
      assert.equal(size(dispatcher._listeners), len + 1);
    });

    it('should remove from listeners array when .emit() called', function () {
      var len = size(dispatcher._listeners);
      dispatcher.emit('event2');
      assert.equal(size(dispatcher._listeners), len - 1);
    });

    it('should emit \'newListener\' event', function (done) {
      dispatcher.on('newListener', function () {
        assert.ok(true);
        done();
      });
      dispatcher.once('event1', someFn);
      dispatcher.removeAllListeners();
    });
  });

  describe('off()', function() {
    it('should remove from listeners array', function () {
      dispatcher.on('event1', someFn);
      var len = size(dispatcher._listeners);
      dispatcher.off('event1');
      assert.equal(size(dispatcher._listeners), len - 1);
    });

    it('should be able to remove a spesific listener', function () {
      dispatcher.on('event1', someFn);
      dispatcher.on('event1', someFn2);

      var len = size(dispatcher._listeners);
      dispatcher.off('event1', someFn);
      assert.equal(size(dispatcher._listeners), len - 1);
      dispatcher.removeAllListeners();
    });

    it('should emit \'removeListener\' event', function (done) {
      dispatcher.on('removeListener', function () {
        assert.ok(true);
        done();
      });
      dispatcher.on('event1', someFn);
      dispatcher.off('event1', someFn);
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

    it('should emit an event with parameters', function (done) {
      dispatcher.on('event6', function (ctx) {
        assert.ok(ctx.arguments.length > 0 && ctx.event == 'event6', 'caught an emitted event');
        dispatcher.off('event6');
        done();
      });
      dispatcher.emit('event6', 'test', 'something');
    });

    it('should listen event4 of anything', function (done) {
      var len = size(dispatcher._listeners);
      dispatcher.on('event4', function () {
        assert.ok(true);
        dispatcher.off('event4');
        done();
      });
      dispatcher.emit('event4.namespace2');
    });

    it('should listen namespace', function (done) {
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
      dispatcher.removeAllListeners();
    });

    it('should match events with namespaces', function (done) {
      dispatcher.on('event.test', function () {
        assert.ok(true);
        done();
      });
      dispatcher.emit('event.test');
      dispatcher.removeAllListeners();
    });
  });

  describe('listeners()', function() {
    it('should return listeners of an event', function () {
      dispatcher.on('a', someFn);
      assert.equal(dispatcher.listeners('a').length, 1);

      dispatcher.removeAllListeners();
    });

    it('should match multiple events', function () {
      dispatcher.on('a', function (){});
      dispatcher.on('a.namespace', function (){});
      dispatcher.on('a:b.namespace', someFn);
      assert.equal(dispatcher.listeners('a:b').length, 3);

      dispatcher.removeAllListeners();
    });
  });

  describe('callback dependency', function () {
    it('should execute event8 after event8.namespace', function (done) {
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
        assert.ok(count == 2, 'event9 not executed last')
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
});


function size(listeners) {
  if(Array.isArray(listeners)) {
    return listeners.length;
  }
  else if(typeof listeners === 'object') {
    var len = 0;
    for(var key in listeners) {
      var item = listeners[key];
      len += size(item);
    }
    return len;
  }
  else if(listeners || listeners == 0) {
    return 1;
  }
  else {
    return 0;
  }
}
