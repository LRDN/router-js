/*!
 * JavaScript Router v1.0.1
 * https://github.com/lrdn/router-js
 *
 * Copyright (c) 2019 LRDN <git@lrdn.net>
 * Released under the MIT license
 */
const Router = (function () {
	'use strict';

	return function () {
		const self = this;

		self.routes = new Map();
		self.handlers = {};
		self.matches = {};
		self.setup = {};
		self.meta = {};

		self.routing = {
			pause: false,
			scroll: false,
			current: null,
			history: null,
			callbacks: []
		};

		function isPlainObject(value) {
			if (value !== null && typeof value === 'object') {
				const prototype = Object.getPrototypeOf(value);

				if (prototype === null || prototype === Object.prototype) {
					return true;
				}
			}

			return false;
		}

		function mergeObjects(target, ...sources) {
			for (let source of sources) {
				if (source === null || typeof source !== 'object') {
					continue;
				}

				for (let key of Object.keys(source)) {
					const isArray = Array.isArray(source[key]);
					const isObject = isPlainObject(source[key]);

					if (isArray || isObject) {
						if (
							target[key] === null || typeof target[key] !== 'object' ||
							target[key].constructor !== source[key].constructor
						) {
							target[key] = isArray ? [] : {};
						}

						mergeObjects(target[key], source[key]);
					} else {
						target[key] = source[key];
					}
				}
			}

			return target;
		}

		function normalizePath(path) {
			path = path.replace(/\/+$/, '');
			path = path.replace(/\/{2,}/g, '/');

			if (path.match(/^\//) === null) {
				path = '/' + path;
			}

			return path;
		}

		function escapePath(path) {
			if (path.match(/\\:/g)) {
				path = path.replace(/\\:/g, ':');
			}

			return path.replace(/[.+*^$?|(){}[\]\\]/g, '\\$&');
		}

		function escapeMatch(match) {
			return match.replace(/(?:[^\\]|^)\((?!\?:)/g, '$&?:');
		}

		function createPattern(path, route) {
			const parse = path.split(/(\/?\\?:\w+\??)/g);

			for (let [index, segment] of parse.entries()) {
				let parameter = segment.match(/^(\/)?:(\w+)(\?)?$/);

				if (parameter === null) {
					route.pattern+= escapePath(segment);
					continue;
				}

				const [prefix = '', name, optional = ''] = parameter.slice(1);

				parameter = prefix + '(' + (
					typeof route.matches[name] === 'string' ?
					escapeMatch(route.matches[name]) : '[^/]+'
				) + ')';

				if (prefix && optional && parse[index + 1] === '') {
					parameter = '(?:' + parameter + ')';
				}

				route.pattern+= parameter + optional;
				route.parameters.push(name);
			}
		}

		function registerHandler(type, callback, priority = 10) {
			const target = self.setup.route || self.setup.group || self;

			if (target.handlers.hasOwnProperty(type) === false) {
				target.handlers[type] = [];
			}

			for (let [index, handler] of target.handlers[type].entries()) {
				if (handler.priority === priority) {
					if (callback === false) {
						target.handlers[type].splice(index, 1);
					} else {
						handler.callback = callback;
					}

					return;
				}
			}

			if (callback === false) {
				return;
			}

			target.handlers[type].push({
				callback: callback,
				priority: priority
			});

			target.handlers[type].sort(function (a, b) {
				return a.priority - b.priority;
			});
		}

		function assignData(key, data, merge = true) {
			const target = self.setup.route || self.setup.group || self;

			if (merge === false) {
				target[key] = {};
			}

			mergeObjects(target[key], data);
		}

		function matchRoute(request) {
			matching: for (let [path, route] of self.routes) {
				const pattern = new RegExp(`^${route.pattern}/*$`, 'i');
				const match = pattern.exec(request);

				if (match) {
					const groups = match.slice(1);
					const parameters = {};

					for (let [index, value] of groups.entries()) {
						const name = route.parameters[index];
						parameters[name] = value || null;

						if (
							typeof route.matches[name] === 'function' &&
							route.matches[name](value) === false
						) {
							continue matching;
						}
					}

					return mergeObjects({}, route, {
						parameters: parameters,
						path: path
					});
				}
			}

			return null;
		}

		function ensureInternalURL(url) {
			if (url instanceof URL === false) {
				url = new URL(url, window.location);
			}

			if (
				url.protocol === window.location.protocol &&
				url.host === window.location.host
			) {
				return url;
			}

			return null;
		}

		function scrollRestoration(args, callback = null) {
			const scrollPosition = { x: 0, y: 0 };

			if (args.history && args.history.scrollPosition) {
				mergeObjects(scrollPosition, args.history.scrollPosition);
			} else if (args.url.hash) {
				const element = document.querySelector(args.url.hash);

				if (element) {
					const offset = element.getBoundingClientRect();

					mergeObjects(scrollPosition, {
						x: offset.left + window.scrollX,
						y: offset.top + window.scrollY
					});
				}
			}

			if (typeof callback === 'function') {
				callback.call(this, scrollPosition);
			} else {
				window.scrollTo({
					left: scrollPosition.x,
					top: scrollPosition.y
				});
			}

			self.routing.scroll = true;
		}

		function queueCallbacks(args, ...callbacks) {
			for (let callback of callbacks) {
				if (callback && callback.hasOwnProperty('callback')) {
					callback = callback.callback;
				}

				if (typeof callback === 'function') {
					self.routing.callbacks.push(callback.bind(this, ...args));
				}
			}
		}

		function executeCallbacks() {
			if (self.routing.callbacks.length && self.routing.pause === false) {
				self.routing.callbacks.shift()();
				executeCallbacks();
			}
		}

		function popstateListener(event) {
			self.routing.history = window.history.state || {};
			this.resolve(window.location);
		}

		function scrollListener(event) {
			if (scrollListener.timeout) {
				window.clearTimeout(scrollListener.timeout);
			}

			scrollListener.timeout = window.setTimeout(function () {
				const historyState = mergeObjects({}, window.history.state, {
					scrollPosition: {
						x: window.scrollX,
						y: window.scrollY
					}
				});

				try {
					window.history.replaceState(historyState, '');
				} catch (error) {}
			}, 100);
		}

		function clickListener(event) {
			if (
				event.defaultPrevented || event.button ||
				event.shiftKey || event.ctrlKey || event.altKey || event.metaKey
			) {
				return;
			}

			let element = event.target;

			while (element.nodeName !== 'A') {
				if (element.parentNode) {
					element = element.parentNode;
					continue;
				}

				return;
			}

			const href = element.getAttribute('href');
			const target = element.getAttribute('target');

			if (href === null || target && target.match(/_blank/i)) {
				return;
			}

			const url = ensureInternalURL(href);

			if (url) {
				event.preventDefault();
				this.navigate(url);
			}
		}

		return {
			group: function createGroup(setup) {
				if (self.setup.group) {
					return;
				}

				self.setup.group = {
					handlers: mergeObjects({}, self.handlers),
					matches: mergeObjects({}, self.matches),
					meta: mergeObjects({}, self.meta)
				};

				setup.call(this);
				delete self.setup.group;
			},

			route: function registerRoute(path, setup = null) {
				if (self.setup.route) {
					return;
				}

				const target = self.setup.group || self;

				self.setup.route = {
					handlers: mergeObjects({}, target.handlers),
					matches: mergeObjects({}, target.matches),
					meta: mergeObjects({}, target.meta),
					parameters: [],
					pattern: ''
				};

				if (setup) {
					setup.call(this);
				}

				path = normalizePath(path);
				createPattern(path, self.setup.route);
				self.routes.set(path, self.setup.route);
				delete self.setup.route;
			},

			routes: function listRoutes(filter = null) {
				const routes = [];

				for (let [path, route] of self.routes) {
					if (filter === null || path.indexOf(filter) === 0) {
						routes.push({
							meta: mergeObjects({}, route.meta),
							pattern: route.pattern,
							path: path
						});
					}
				}

				if (routes.length) {
					return routes;
				}

				return null;
			},

			resolve: function resolveRoute(url, callback = null) {
				self.routing.pause = false;
				self.routing.scroll = false;
				self.routing.callbacks = [];

				if ((url = ensureInternalURL(url)) === null) {
					return;
				}

				const current = self.routing.current;
				const resolve = matchRoute(url.pathname);

				if (resolve === null) {
					return;
				}

				mergeObjects(resolve, {
					args: {
						meta: mergeObjects({}, resolve.meta),
						parameters: mergeObjects({}, resolve.parameters),
						history: self.routing.history,
						pattern: resolve.pattern,
						path: resolve.path,
						url: url
					}
				});

				const args = [
					current ? current.args : null,
					resolve.args,
					scrollRestoration.bind(this, resolve.args)
				];

				const complete = () => {
					queueCallbacks.call(this, args, function () {
						if (self.routing.scroll === false) {
							scrollRestoration.call(this, resolve.args);
						}
					}, callback);

					self.routing.current = resolve;
					self.routing.history = null;
					executeCallbacks();
				};

				if (current) {
					if (resolve.path === current.path) {
						if (resolve.handlers.hasOwnProperty('update')) {
							queueCallbacks.call(this, args, ...resolve.handlers.update);
						}

						complete();
						return;
					}

					if (current.handlers.hasOwnProperty('leave')) {
						queueCallbacks.call(this, args, ...current.handlers.leave);
					}
				}

				for (let type of ['before', 'enter', 'after']) {
					if (resolve.handlers.hasOwnProperty(type)) {
						queueCallbacks.call(this, args, ...resolve.handlers[type]);
					}
				}

				complete();
			},

			navigate: function navigateRoute(url, callback = null) {
				if (url = ensureInternalURL(url)) {
					if (url.href !== window.location.href) {
						try {
							window.history.pushState({}, '', url);
						} catch (error) {
							window.location.assign(url);
							return;
						}
					}

					this.resolve(url, callback);
				}
			},

			listen: function attachListeners() {
				const listeners = {
					popstate: popstateListener,
					scroll: scrollListener,
					click: clickListener
				};

				for (let [type, listener] of Object.entries(listeners)) {
					window.addEventListener(type, listener.bind(this));
				}

				const navigation = (
					window.performance.getEntriesByType('navigation').shift() ||
					window.performance.navigation
				);

				if (navigation && navigation.type) {
					if (navigation.type === 'back_forward' || navigation.type === 2) {
						self.routing.history = window.history.state || {};
					}
				}

				if ('scrollRestoration' in window.history) {
					window.history.scrollRestoration = 'manual';
				}

				if (self.routing.current === null) {
					this.resolve(window.location);
				}
			},

			resume: function resumeRouting() {
				self.routing.pause = false;
				executeCallbacks();
			},

			pause: function pauseRouting() {
				self.routing.pause = true;
			},

			update: registerHandler.bind(null, 'update'),
			before: registerHandler.bind(null, 'before'),
			enter: registerHandler.bind(null, 'enter'),
			after: registerHandler.bind(null, 'after'),
			leave: registerHandler.bind(null, 'leave'),
			match: assignData.bind(null, 'matches'),
			meta: assignData.bind(null, 'meta')
		};
	};
})();