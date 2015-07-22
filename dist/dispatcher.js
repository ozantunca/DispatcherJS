/**
 * @author: Ozan Tunca
 * @version: v1.0.0
*/

'use strict';

(function () {
  var utils = {
    each: function (arr, iteratee) {
      for(var l = arr.length; l-- !== 0;)
        iteratee(arr[l], l);
    }
  }

  var Dispatcher = function () {
    this._listeners = [];
    this._maxListeners = 10;
  };

  Dispatcher.prototype._parseListener = function (dependencies, listener) {
    var newListener = {
      fn: listener
    };

    if (typeof dependencies == 'function') {
      newListener.fn = dependencies;
    } else if (Array.isArray(dependencies)) {
      newListener.dependencies = dependencies;
    } else if (typeof dependencies == 'string') {
      newListener.dependencies = [dependencies];
    } else throw new Error('EventHandler is not a function.');

    return newListener;
  };

  Dispatcher.prototype.removeAllListeners = function (eventName) {
    if (eventName || eventName == 0) return this.off(eventName);
    this._listeners = [];
  };

  Dispatcher.prototype.setMaxListeners = function (num) {
    this._maxListeners = num;
  };

  Dispatcher.prototype.on = function (eventName, dependencies, listener, once) {
    // convert event name to string
    if (typeof eventName !== 'string')
      eventName = eventName.toString();

    // check for max listeners
    if (this.listeners(eventName).length >= this._maxListeners)
      return;

    listener = this._parseListener(dependencies, listener);
    listener.eventName = eventName;

    if (once)
      listener.once = true;

    // add listener
    this._listeners.push(listener);
    if (eventName != 'newListener')
      this.emit('newListener', listener.fn);
  };

  Dispatcher.prototype.once = function (eventName, dependencies, listener) {
    this.on(eventName, dependencies, listener, true);
  };

  Dispatcher.prototype.off = function (eventName, listener) {
    if (typeof eventName === 'undefined') return;
    // Remove only a specific listener
    if (listener) {
      var i = this._listeners.length;
      while (i--) {
        if (eventName == this._listeners[i].eventName && this._listeners[i].fn === listener) {
          this.emit('removeListener', this._listeners[i].fn);
          this._listeners.splice(i, 1);
        }
      }
    }
    else {
      var i = this._listeners.length;
      while (i--) {
        if (eventName == this._listeners[i].eventName) {
          this.emit('removeListener', this._listeners[i].fn)
          this._listeners.splice(i, 1);
        }
      }
    }
  };

  Dispatcher.prototype.listeners = function (eventName) {
    if (!eventName)
      return this._listeners;

    var eventParts = eventName.split('.')
      , eventName = eventParts[0]
      , namespace = eventParts[1] ? '.' + eventParts[1] : null
      , _match
      , results = [];

    if (namespace)
      _match = this._matchWithNamespace;
    else
      _match = this._matchEvent;

    if (typeof this._listeners.filter == 'function')
      return this._listeners.filter(function (listener) {
        return _match(eventName, listener.eventName, namespace);
      });
    else {
      for (var i = 0; i < this._listeners; i++) {
        if (_match(eventName, listener.eventName, namespace))
          results.push(listener);
      }
      return results;
    }
  };

  Dispatcher.prototype._matchWithNamespace = function (eventName, listenerEventName, namespace) {
    return eventName == listenerEventName || eventName + namespace == listenerEventName
    || eventName.indexOf(listenerEventName + ':') == 0
    || listenerEventName == namespace || listenerEventName == '*'
    || eventName.indexOf(listenerEventName.substring(0, listenerEventName.indexOf('.')) + ':') == 0;
  };

  Dispatcher.prototype._matchEvent = function (eventName, listenerEventName) {
    return eventName == listenerEventName || eventName.indexOf(listenerEventName + ':') == 0
    || listenerEventName.indexOf(eventName + '.') == 0 || listenerEventName == '*'
    || eventName.indexOf(listenerEventName.substring(0, listenerEventName.indexOf('.')) + ':') == 0;
  };

  Dispatcher.prototype._matchArray = function (listenerArray, eventName) {
    var _match, listener;

    // check for namespace
    if (eventName.indexOf('.') != -1) {
      var eventParts = eventName.split('.')
        , eventName = eventParts[0]
        , namespace = eventParts[1] ? '.' + eventParts[1] : null;
      _match = this._matchWithNamespace;
    } else {
      _match = this._matchEvent;
    }

    while (listener = listenerArray.pop()) {
      if (_match(eventName, listener.eventName, namespace) || listener.eventName.substring(listener.eventName.indexOf('.')) == namespace && listener.eventName != '*') {
        return true;
      }
    }

    return false;
  };

  Dispatcher.prototype._deferredLoop = function (deferredListeners, waitingAsync, context) {
    var deferredLength, listener, promise, dependent
      , _this = this
      , deadlockCounter = 0;

    deferredLength = deadlockCounter = deferredListeners.length;

    while (listener = deferredListeners.pop()) {
      if (deadlockCounter == 0) {
        if (waitingAsync) return;
        else throw new Error('Deadlock!');
      }
      dependent = false;

      if (!listener.dependencies) {
        deferredListeners.unshift(listener);
        deadlockCounter--;
        continue;
      }

      for (var j = 0; j < listener.dependencies.length; j++) {
        dependent = _this._matchArray(deferredListeners.slice(), listener.dependencies[j]) ? true : dependent;
      }

      if (!dependent) {
        // run listener
        promise = listener.fn(context);

        if (promise && promise.then) {
          waitingAsync++;
          deferredListeners.unshift(listener);

          // run promise
          promise.then(function () {
            waitingAsync--;
            _this._deferredLoop(deferredListeners, waitingAsync, context);
          });
        }

      } else {
        deferredListeners.unshift(listener);
      }

      if (deferredListeners.length == deferredLength) {
        deadlockCounter--;
      } else {
        deferredLength = deadlockCounter = deferredListeners.length;
      }
    }
  };

  Dispatcher.prototype.emit = function (eventName) {
    if (!eventName) {
      throw new Error('Nothing to emit.');
    }

    if (typeof eventName !== 'string') {
      eventName = eventName.toString();
    }

    // common variables
    var deferredListeners = []
      , listenerArray = this._listeners.slice()
      , waitingAsync = 0
      , _this = this
      , context = {
        arguments: typeof arguments == 'object' ? Array.prototype.slice.call(arguments, 1) : [],
        event: eventName,
        stopPropagation: function () {
          listenerArray = [];
          deferredListeners = [];
        }
      }
      , listener, _match, promise;

    // check for namespace
    if (eventName.indexOf('.') != -1) {
      var eventParts = eventName.split('.')
        , eventName = eventParts[0]
        , namespace = eventParts[1] ? '.' + eventParts[1] : null;
      _match = _this._matchWithNamespace;
    } else {
      _match = _this._matchEvent;
    }

    if (!eventName) {
      throw new Error('Nothing to emit.');
    }

    utils.each(listenerArray, function (listener, i) {
      // check if current listener matches
      if (_match(eventName, listener.eventName, namespace)) {
        // dependencies
        if (listener.dependencies) {
          deferredListeners.push(listener);
          return;
        }

        // run listener
        promise = listener.fn(context);

        if (promise && promise.then) {
          waitingAsync++;
          deferredListeners.push(listener);

          // run promise
          promise.then(function () {
            waitingAsync--;
            _this._deferredLoop(deferredListeners, waitingAsync, context);
          });
        }

        // remove one time listeners
        if (listener.once) {
          _this._listeners.splice(i, 1);
        }
      }
    });

    // check if there is callback dependency
    if (deferredListeners.length > 0) {
      _this._deferredLoop(deferredListeners, waitingAsync, context);
    }
  };

  Dispatcher.prototype.applyEmit = function (eventName) {
    var _this = this;
    var args = typeof arguments == 'object' ? Array.prototype.slice.call(arguments, 0) : [];

    return function () {
      _this.emit.apply(_this, args);
    }
  };

  Dispatcher.prototype.removeListener = Dispatcher.prototype.off;
  Dispatcher.prototype.addListener = Dispatcher.prototype.on;
  Dispatcher.prototype.one = Dispatcher.prototype.once;

  if (typeof exports === 'object') {
    // CommonJS
    module.exports = Dispatcher;
  }
  else if (typeof define === 'function' && define.amd) {
     // AMD. Register as an anonymous module.
    define(function() {
      return Dispatcher;
    });
  }
  else {
    // Browser global.
    window.Dispatcher = Dispatcher;
  }
})();
