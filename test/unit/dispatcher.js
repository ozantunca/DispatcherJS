var dispatcher = require('../../dist/dispatcher')
    , assert = require('assert');


describe('lib.dispatcher', function() {

  describe('on()', function() {
    it('should add to listeners array', function () {
      var len = size(dispatcher._listeners);
      dispatcher.on('event1', function () {});
      assert.equal(size(dispatcher._listeners), len + 1);
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
    });
  });

  describe('once()', function() {
    it('should add to listeners array when .once() called', function () {
      var len = size(dispatcher._listeners);
      dispatcher.once('event2', function () {});
      assert.equal(size(dispatcher._listeners), len + 1);
    });

    it('should remove from listeners array when .emit() called', function () {
      var len = size(dispatcher._listeners);
      dispatcher.emit('event2');
      assert.equal(size(dispatcher._listeners), len - 1);
    });
  });

  describe('off()', function() {
    it('should remove from listeners array', function () {
      var len = size(dispatcher._listeners);
      dispatcher.off('event1');
      assert.equal(size(dispatcher._listeners), len - 1);
    });

    it('should be able to remove a spesific listener', function () {
      function handler1() { 1 == 1; }
      function handler2() { 2 == 2; }
      dispatcher.on('event1', handler1);
      dispatcher.on('event1', handler2);

      var len = size(dispatcher._listeners);
      dispatcher.off('event1', handler1);
      assert.equal(size(dispatcher._listeners), len - 1);

      dispatcher.off('event1');
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
      dispatcher.on('event6', function () {
        assert.ok(arguments.length > 1 && arguments[0] == 'event6', 'caught an emitted event');
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

    // it('should execute multiple dependencies in order (wild)', function (done) {
    //   this.timeout(5000);
    //   dispatcher.removeAllListeners();
    //   var count = 0;
    //   // a
    //   dispatcher.on('a', function () {
    //     console.log(count + ': called a')
    //     if(count != 15) {
    //       assert.ok(false);
    //       done();
    //     }
    //     count++;
    //   });
    //   // b.n1
    //   dispatcher.on('b.n1', function () {
    //     console.log(count + ': called b.n1')
    //     if(count != 5) {
    //       assert.ok(false);
    //       done();
    //     }
    //     count++;
    //   });
    //   // c.n1[.n1]
    //   dispatcher.on('c.n1', ['.n1'], function () {
    //     console.log(count + ': called c.n1')
    //     if(count != 0 && count != 6) {
    //       assert.ok(false);
    //       done();
    //     }
    //     count++;
    //   });
    //   // a.n2
    //   dispatcher.on('a.n2', function () {
    //     console.log(count + ': called a.n2')
    //     if(count != 14 && count != 21) {
    //       assert.ok(false);
    //       done();
    //     }
    //     count++;
    //   });
    //   // b.n2[a] expectedCount: 3
    //   dispatcher.on('b.n2', ['a'], function () {
    //     console.log(count + ': called b.n2')
    //     if(count != 22) {
    //       assert.ok(false);
    //       done();
    //     }
    //     count++;
    //   })
    //   // d[b] expectedCount: 4
    //   dispatcher.on('d', ['b'], function () {
    //     console.log(count + ': called d')
    //     if(count++ != 18) {
    //       assert.ok(false);
    //       done();
    //     }
    //   });
    //   // c.n2[d]
    //   dispatcher.on('c.n2', ['d'], function () {
    //     console.log(count + ': called c.n2')
    //     if(count != 1 && count != 6 && count != 12 && count != 20) {
    //       assert.ok(false);
    //       done();
    //     }
    //     count++;
    //   });
    //   // d.n1[b]
    //   dispatcher.on('d.n1', ['b'], function () {
    //     console.log(count + ': called d.n1')
    //     if(count != 17 && count != 4) {
    //       assert.ok(false);
    //       done();
    //     }
    //     count++;
    //   });
    //   // e[.n1,.n2]
    //   dispatcher.on('e', ['.n1', '.n2'], function () {
    //     console.log(count + ': called e')
    //     if(count != 8 && count != 10) {
    //       assert.ok(false);
    //       done();
    //     }
    //     count++;
    //   });
    //   // *[.n2]
    //   dispatcher.on('*', ['.n2'], function () {
    //     console.log(count + ': called *')
    //     if(count != 2 && count != 3 && count != 7 && count != 9 && count != 11 && count != 13 && count != 16 && count != 19) {
    //       assert.ok(false);
    //       done();
    //     }

    //     if(false) {
    //       assert.ok(true);
    //       done();
    //     }

    //     count++;
    //   });

    //   dispatcher.emit('c');
    //   // console.log(dispatcher._listeners);
    //   dispatcher.emit('.n1');
    // });
  })
});


function size(listeners) {
  if(typeof listeners === 'array' || typeof listeners === 'object') {
    var len = 0;
    for(var key in listeners) {
      var item = listeners[key];
      len += size(item);
    }
    return len;
  } else if(listeners || listeners == 0) {
    return 1;
  } else {
    return 0;
  }
}
