DispatcherJS
============

An event emitter implementation that supports namespaces and callback dependency. Works in Node.js and browser.

# Features
- Namespaces
- Callback dependency
- Multi-tier event naming
- Compatible with Node.js EventEmitter
- Works on browser without any dependency

# Installation
As an NPM module
```sh
npm install dispatcherjs
```
or as a bower component
```sh
bower install dispatcherjs
```

# Usage
If you already have native Node.js EventEmitter implemented in your system, you can safely replace it with DispatcherJS. It won't break. When an error occurs in DispatcherJS, it throws an ```Error``` and stops execution. 


### dispatcher.addListener(event[, dependencies], listener)
### dispatcher.on(event[, dependencies], listener)
Adds a listener for a specified event.
```javascript
	dispatcher.on('request', function (arg1, arg2) {
    	console.log('We have received a request.');
    });
```
A namespace can also be specified with or without an event using <code>.</code> delimiter. For example let's assume there is a request for API. A ```.api``` namespace can be added to provide more specific naming.

```javascript
	dispatcher.on('request.api', function (arg1, arg2) {
    	console.log('We have received a request for API.');
    });
```

Now let's specify a ```.static``` namespace for to define request for static files. 
```javascript
	dispatcher.on('request.static', function (arg1, arg2) {
    	console.log('We have received a request for static files.');
    });
```

Now when a ```request``` event is emitted both listeners will run but if ```request.api``` event is emitted only the first one will run. 

We can also **listen a namespace**:
```javascript
	dispatcher.on('.static', function (arg1, arg2) {
    	console.log('We have received an event for "static" namespace.');
    });
```

#### Listening All Events
Specifying <code>*</code> as event name will let the listener listen for all.
```javascript
	dispatcher.on('*', function() {
    	console.log('We are listening everyone');
    });
```

#### Multi-tier Event Names
Multi-tiering is useful when using a namespace is not specific enough to define a listener. For example if API requests are for <code>user</code> resources, a <code>:</code> delimiter can be used.

```javascript
	dispatcher.on('request:user.api', apiFunc);
```
Or something even more specific like adding a <code>userId</code>.

```javascript
	dispatcher.on('request:user:491283812.api', apiFunc);
```
Any listener that listens for <code>request:user</code> will receive both events but a listener for <code>request:user:491283812</code> won't receive the first one.

#### Callback Dependency
A list of dependencies can be specified for every listener to ensure it is executed in right time. For example let's assume there is a listener of <code>foo</code> that needs to be executed after every <code>foo.bar</code> and <code>foo.bazz</code> listeners. This can be achieved like following:

```javascript
	dispatcher.on('foo', ['.bar', '.baz'], someFunc);
```
or when there is only one dependency:

```javascript
	dispatcher.on('foo', '.bar', someFunc);
```

Things can get complicated if listeners are doing asynchronous operations. Dispatcher has a solution for that using promises. An async listener should return a Promise object to ensure listeners depending on this listener will be executed after async operation is done. Example with standard EcmaScript 6 Promise:

```javascript
	dispatcher.on('foo', function () {
    	return new Promise(function someAsyncFunction() {
        	// Do asynchronous stuff
        });
    });
```

### dispatcher.once(event[, dependencies], listener)
Same with <code>.on()</code> but it is removed after executed once.

### dispatcher.removeListener(event[, listener])
### dispatcher.off(event[, listener])
Removes given listener from dispatcher or removes all listeners that listens given event.
```javascript
	function someHandler(arg1, arg2) {
    	console.log('We have received a request.');
    }
	dispatcher.off('message', someHandler);
```
or
```javascript
	dispatcher.off('message');
```

### dispatcher.removeAllListeners([event])
Removes all listeners, or those of the specified event.

### dispatcher.listeners([event])
Returns all listeners or those of the specified event.

### dispatcher.emit(event[, arguments...])
Emits an event and runs all listeners matches specified event. Optionally given arguments will be passed to listeners. Example:
```javascript
	dispatcher.emit('message');
```
Now with arguments:
```javascript
	dispatcher.emit('message', 'arg1', 2, true);
```
More complex events can also be emitted like:

```javascript
	dispatcher.emit('message:fromUser:123456.api');
```
An event without event name will not be emitted. Dispatcher will not emit a <code>.api</code> event which has only a namespace. 
