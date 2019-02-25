Router
======

Basic JavaScript (ES2015) request router using the history API for single page websites and applications. Requires the site to be deployed to a web server or development environment with request rewrite support enabled and configured.

Configuration
-------------

Configure your server to rewrite requests to your routing index. The following example is for the [NGINX](https://nginx.org) web server and rewrites all requests, excluding existing files and directories, to the `index.html` file.

```
location / {
	try_files $uri $uri/ /index.html?$args;
}
```

Usage
-----

Create a router instance.

```
const router = new Router();
```

Register a new route and attach a handler.

```
router.route('/example', function () {
	this.enter(function (current, resolve) {
	});
});
```

Call the listener to complete the router setup.

```
router.listen();
```

API
---

`router.routes([string filter])`
Returns an array of all registered route paths and their generated matching patterns.

`router.group(callable setup)`
Creates a routing group to define common route handlers, matches and meta data.

`router.route(string path [, callable setup])`
Registers or replaces a route with the given path. Optionally pass a setup function.

`router.resolve(string url [, callable callback])`
Resolves a location matching a registered route without updating the browser address.

`router.navigate(string url [, callable callback])`
Updates the browser address and resolves given location matching a registered route.

`router.update(callable handler [, number priority])`
Active routes are not resolved again and instead call the update handler.

`router.before(callable handler [, number priority])`
Called before a route is entered and generally designated for preparation.

`router.enter(callable handler [, number priority])`
Primary route handler meant to configure and render any required components.

`router.after(callable handler [, number priority])`
Called when all previous route handlers in the queue have been processed.

`router.leave(callable handler [, number priority])`
Called when resolving a new route but not when navigating away from the site.

`router.match(object matches [, boolean merge])`
Matches path parameters using a regular expression string or filter function.

`router.meta(object data [, boolean merge])`
Defines custom meta data accessible in every routing handler argument.

`router.listen()`
Attaches the default event listeners and resolves the current location.

`router.pause()`
Pauses the resolving handler queue to perform asynchronous actions.

`router.resume()`
Resumes a previously paused handler queue to continue route resolving.