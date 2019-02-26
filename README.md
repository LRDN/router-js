JavaScript Router
=================

Basic JavaScript (ES2015) client-side router using the history API for single page websites and applications. Requires the site to be deployed to a web server or development environment with request rewrite support enabled.

Server Configuration
--------------------

Configure your server to rewrite requests to your routing index. The following example is for the [NGINX](https://nginx.org) web server and rewrites all requests, excluding existing files and directories, to the `index.html` file.

```
location / {
	try_files $uri $uri/ /index.html?$args;
}
```

Basic Usage
-----------

[Download](https://raw.githubusercontent.com/lrdn/router-js/master/src/router.js) the latest version and include it in your project. Make sure to use [babel-minify](https://github.com/babel/minify) in your deployment process to compress your script files since many common tools do not function properly with ES2015 code yet.

Create a new router instance. The current version does not offer any configurable options.

```
const router = new Router();
```

Register your custom routes and define local handlers within the setup functions. Note that routes are always resolved in the order they have been registered and can in some cases conflict with each other.

```
router.route('/products', function () {
	this.enter(function (current, resolve) {
		document.body.innerHTML = 'Products';
	});
});

router.route('/products/:id/:name?', function () {
	this.match({
		id: '\\d+',
		name: '\\w+'
	});

	this.enter(function (current, resolve) {
		document.body.innerHTML = resolve.parameters.id;

		if (resolve.parameters.name) {
			document.body.innerHTML+= '<br>' + resolve.parameters.name;
		}
	});
});
```

Call the listener to complete the router setup and resolve the current location. Attaches the default window event listeners required for history navigation, scroll restoration and click detection.

```
router.listen();
```

Asynchronous Usage
------------------

Route resolving can be paused within all handlers to wait for certain tasks to be completed, such as page transition animations or asynchronous requests. Resuming the router will execute the next handler in the stack.

```
router.route('/products', function () {
	this.enter(function (current, resolve) {
		window.setTimeout(() => {
			document.body.innerHTML = 'Products';
			this.resume();
		}, 1000);

		this.pause();
	});
});
```

Scroll Restoration
------------------

By default the scroll position is updated at the end of the handler stack. You can however call the scroll restoration function manually and additionally implement a custom behavior.

```
router.route('/products', function () {
	this.enter(function (current, resolve, scrollRestoration) {
		scrollRestoration(function (scrollPosition) {
			window.scrollTo({
				left: scrollPosition.x,
				top: scrollPosition.y,
				behavior: 'smooth'
			});
		});
	});
});
```

Fallback Route
--------------

Register a fallback route to catch requests that could not be resolved by any of the preceding routes. Note that this method will still return the HTTP status code `200` unless error pages are handled on the server-side.

```
router.route('/:fallback', function () {
	this.match({
		fallback: '.*'
	});

	this.enter(function (current, resolve) {
		document.body.innerHTML = '404';
	});
});
```

API
---

`router.group(callable setup)`\
Creates a routing group to define common route handlers, matches and meta data.

`router.route(string path [, callable setup])`\
Registers or replaces a route with the given path. Optionally pass a setup function.

`router.resolve(string url [, callable callback])`\
Resolves a location matching a registered route without updating the browser address.

`router.navigate(string url [, callable callback])`\
Updates the browser address and resolves given location matching a registered route.

`router.update(callable handler [, number priority])`\
Active routes are not resolved again and instead call the update handler.

`router.before(callable handler [, number priority])`\
Called before a route is entered and generally designated for preparation.

`router.enter(callable handler [, number priority])`\
Primary route handler meant to configure and render any required components.

`router.after(callable handler [, number priority])`\
Called when all previous route handlers in the queue have been processed.

`router.leave(callable handler [, number priority])`\
Called when resolving a new route but not when navigating away from the site.

`router.match(object matches [, boolean merge])`\
Matches path parameters using a regular expression string or filter function.

`router.meta(object data [, boolean merge])`\
Defines custom meta data accessible in every routing handler argument.

`router.routes([string filter])`\
Returns an array of route paths and their generated matching patterns.

`router.listen()`\
Attaches the default event listeners and resolves the current location.

`router.pause()`\
Pauses the resolving handler queue to perform asynchronous tasks.

`router.resume()`\
Resumes a previously paused handler queue.