
var dispatcher = {
  _listeners: [],

  _parseListener: function (dependencies, listener) {
    if(typeof dependencies == 'function') {
      listener = dependencies;
    } else if(Array.isArray(dependencies)) {
      listener.dependencies = dependencies;
    } else if(typeof dependencies == 'string') {
      listener.dependencies = [dependencies];
    } else throw new Error('EventHandler is not a function.');

    return listener;
  },

  removeAllListeners: function (eventName) {
    if(eventName || eventName == 0) return this.off(eventName);
    this._listeners = [];
  },

  on: function (eventName, dependencies, listener) {
    listener = this._parseListener(dependencies, listener);
    listener.eventName = eventName;
    this._listeners.push(listener);
  },

  once: function (eventName, dependencies, listener) {
    listener = this._parseListener(dependencies, listener);
    listener.eventName = eventName;
    listener.once = true;
    this._listeners.push(listener);
  },

  off: function (eventName, listener) {
    if(typeof eventName === 'undefined') return;
    if(listener) {
      for(var i = 0; i < this._listeners.length; i++) {
        if(eventName == this._listeners[i].eventName && this._listeners[i] === listener)
          this._listeners.splice(i, 1);
      }
    }
    else {
      for(var i = 0; i < this._listeners.length; i++) {
        if(eventName == this._listeners[i].eventName)
          this._listeners.splice(i, 1);
      }
    }
  },

  listeners: function (eventName) {
    var eventParts = eventName.split('.')
      , eventName = eventParts[0]
      , namespace = eventParts[1] ? '.' + eventParts[1] : null
      , results = [];

    if(namespace)
      _match = this._matchWithNamespace;
    else
      _match = this._matchEvent;

    if(typeof this._listeners.filter == 'function')
      return this._listeners.filter(function (listener) {
        _match(eventName, listener.eventName, namespace);
      });
    else {
      for(var i = 0; i < this._listeners; i++) {
        if(_match(eventName, listener.eventName, namespace))
          results.push(listener);
      }
      return results;
    }
  },

  _matchWithNamespace: function (eventName, listenerEventName, namespace) {
    return eventName == listenerEventName || listenerEventName == namespace || listenerEventName == '*';
  },

  _matchEvent: function (eventName, listenerEventName) {
    return eventName == listenerEventName || listenerEventName.indexOf(eventName + '.') > -1 || listenerEventName == '*';
  },

  _matchArray: function (listenerArray, eventName) {
    var _match;

    // check for namespace
    if(eventName.indexOf('.') != -1) {
      var eventParts = eventName.split('.')
        , eventName = eventParts[0]
        , namespace = eventParts[1] ? '.' + eventParts[1] : null
      _match = this._matchWithNamespace;
    } else {
      _match = this._matchEvent;
    }

    while(listener = listenerArray.pop()) {
      if(_match(eventName, listener.eventName, namespace) || listener.eventName.substring(listener.eventName.indexOf('.')) == namespace && listener.eventName != '*')
        return true;
    }

    return false;
  },

  emit: function (eventName) {
    if(!eventName) {
      return new Error('Nothing to emit.');
    }

    // common variables
    var deferredListeners = []
      , listenerArray = this._listeners.slice()
      , listener, _match, promise;

    // check for namespace
    if(eventName.indexOf('.') != -1) {
      var eventParts = eventName.split('.')
        , eventName = eventParts[0]
        , namespace = eventParts[1] ? '.' + eventParts[1] : null
      _match = this._matchWithNamespace;
    } else {
      _match = this._matchEvent;
    }

    if(!eventName) {
      return new Error('Nothing to emit.');
    }

    while(listener = listenerArray.pop()) {
      // check if current listener matches
      if(_match(eventName, listener.eventName, namespace)) {
        // dependencies
        if(listener.dependencies) {
          deferredListeners.push(listener);
          continue;
        }

        // run listener
        if(arguments.length > 1)
          promise = listener.apply(null, arguments);
        else
          promise = listener();

        if(promise && promise.then) {
          console.log('has promise')
          deferredListeners.push(listener);
          promise.then(function () {
            deferredListeners.splice(deferredListeners.indexOf(listener), 1);
          });
        }
      }

      // remove one time listeners
      if(listener.once)
        this._listeners.splice(listenerArray.length, 1);
    }
    // check if there is callback dependency
    if(deferredListeners.length > 0) {
      while(listener = deferredListeners.pop()) {
        dependent = false;
        for(var j = 0; j < listener.dependencies.length; j++) {
          dependent = this._matchArray(deferredListeners.slice(), listener.dependencies[j]) ? true : dependent;
        }

        if(!dependent) {
          // run listener
          if(arguments.length > 1)
            listener.apply(null, arguments);
          else
            listener();

          if(promise && promise.then) {
            deferredListeners.unshift(listener);
            promise.then(function () {
              deferredListeners.splice(deferredListeners.indexOf(listener), 1);
            });
          }
        } else {
          deferredListeners.unshift(listener);
        }
      }
    }
  }
}

dispatcher.removeListener = dispatcher.off;
dispatcher.addListener = dispatcher.on;

module.exports = dispatcher;
