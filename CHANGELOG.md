# v1.0.0
- Minor bug fixes
- Better error handling. Errors now will be printed using <code>console.error</code> instead of 
<code>throw</code>ing an <code>Error</code>.
- Performance improvement. Dispatcherjs now works 2x faster!

### Breaking changes
- Introducing wildcard usage for listening an event in all namespaces. For example <code>.on('event')</code> will 
no longer match with <code>.emit('event.namespace')</code>. Instead it will only match with <code>.emit('event')</code>.
To be able to listen <code>event</code> in all namespaces <code>.on('event.*')</code> should be used.
