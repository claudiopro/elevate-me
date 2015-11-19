(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      }
      throw TypeError('Uncaught, unspecified "error" event.');
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        args = Array.prototype.slice.call(arguments, 1);
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    args = Array.prototype.slice.call(arguments, 1);
    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else if (listeners) {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.prototype.listenerCount = function(type) {
  if (this._events) {
    var evlistener = this._events[type];

    if (isFunction(evlistener))
      return 1;
    else if (evlistener)
      return evlistener.length;
  }
  return 0;
};

EventEmitter.listenerCount = function(emitter, type) {
  return emitter.listenerCount(type);
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],2:[function(require,module,exports){
/*!
  Copyright (c) 2015 Jed Watson.
  Licensed under the MIT License (MIT), see
  http://jedwatson.github.io/classnames
*/
/* global define */

(function () {
	'use strict';

	var classNames = (function () {
		function _parseArray (resultSet, array) {
			var length = array.length;

			for (var i = 0; i < length; ++i) {
				_parse(resultSet, array[i]);
			}
		}

		var hasOwn = {}.hasOwnProperty;

		function _parseNumber (resultSet, num) {
			resultSet[num] = true;
		}

		function _parseObject (resultSet, object) {
			for (var k in object) {
				if (hasOwn.call(object, k)) {
					if (object[k]) {
						resultSet[k] = true;
					} else {
						delete resultSet[k];
					}
				}
			}
		}

		var SPACE = /\s+/;
		function _parseString (resultSet, str) {
			var array = str.split(SPACE);
			var length = array.length;

			for (var i = 0; i < length; ++i) {
				resultSet[array[i]] = true;
			}
		}

		function _parse (resultSet, arg) {
			if (!arg) return;
			var argType = typeof arg;

			// 'foo bar'
			if (argType === 'string') {
				_parseString(resultSet, arg);

			// ['foo', 'bar', ...]
			} else if (Array.isArray(arg)) {
				_parseArray(resultSet, arg);

			// { 'foo': true, ... }
			} else if (argType === 'object') {
				_parseObject(resultSet, arg);

			// '130'
			} else if (argType === 'number') {
				_parseNumber(resultSet, arg);
			}
		}

		function _classNames () {
			var classSet = {};
			_parseArray(classSet, arguments);
			
			var list = [];
			
			for (var k in classSet) {
				if (hasOwn.call(classSet, k) && classSet[k]) {
					list.push(k)
				}
			}

			return list.join(' ');
		}

		return _classNames;
	})();

	if (typeof module !== 'undefined' && module.exports) {
		module.exports = classNames;
	} else if (typeof define === 'function' && typeof define.amd === 'object' && define.amd) {
		// register as 'classnames', consistent with npm package name
		define('classnames', function () {
			return classNames;
		});
	} else {
		window.classNames = classNames;
	}
}());

},{}],3:[function(require,module,exports){
/* eslint-disable no-unused-vars */
'use strict';
var hasOwnProperty = Object.prototype.hasOwnProperty;
var propIsEnumerable = Object.prototype.propertyIsEnumerable;

function toObject(val) {
	if (val === null || val === undefined) {
		throw new TypeError('Object.assign cannot be called with null or undefined');
	}

	return Object(val);
}

module.exports = Object.assign || function (target, source) {
	var from;
	var to = toObject(target);
	var symbols;

	for (var s = 1; s < arguments.length; s++) {
		from = Object(arguments[s]);

		for (var key in from) {
			if (hasOwnProperty.call(from, key)) {
				to[key] = from[key];
			}
		}

		if (Object.getOwnPropertySymbols) {
			symbols = Object.getOwnPropertySymbols(from);
			for (var i = 0; i < symbols.length; i++) {
				if (propIsEnumerable.call(from, symbols[i])) {
					to[symbols[i]] = from[symbols[i]];
				}
			}
		}
	}

	return to;
};

},{}],4:[function(require,module,exports){
var Elevator = require('./elevator'),
  classnames = require('classnames/dedupe');

// Attaches behavior on window loaded
window.onload = function() {

  /**
   *  Handler for button click
   *  @param {Event} event Click event
   */
  function clickHandler(event) {
    var floor = event.target.getAttribute('data-floor');
    // Call elevator to floor
    elevator.call(floor);
    // Update floor display
    display(floor, true);
  }

  /**
   *  Updates the floor display
   *  @param {Number} floor Floor number
   *  @param {Boolean} [booked] True if the elevator is booked for this floor
   */
  function display(floor, booked) {
    var buttons = document.querySelectorAll('button');
    for (var i = 0; i < buttons.length; i++) {
      var fl = buttons[i].getAttribute('data-floor');
      if (fl === floor) {
        buttons[i].className = classnames(buttons[i].className.split(' '), {
          'booked': booked
        });
      }
    }
    document.querySelector('textarea').value += elevator.toString() + '\n';
  }

  // Instantiates an elevator
  var elevator = new Elevator();

  // Binds behavior to the elevator moving event
  elevator.on('moving', function(floor, direction) {
    // Move to floor
    document.querySelector('.elevator').className = classnames('elevator', 'elevator-floor-' + floor);
  });

  // Binds behavior to the elevator idle event
  elevator.on('idle', function(floor) {
    // Set to idle
    document.querySelector('.elevator').className = classnames('elevator', 'elevator-idle', 'elevator-floor-' + floor);
    // Update floor display
    display(floor, false);
  });

  // Adds event listeners to buttons so they can call the elevator
  var buttons = document.querySelectorAll('button');
  for (var i = 0; i < buttons.length; i++) {
    buttons[i].addEventListener('click', clickHandler);
  }
};

},{"./elevator":5,"classnames/dedupe":2}],5:[function(require,module,exports){
var assign = require('object-assign'),
  emitter = require('events').EventEmitter;

// Constants for elevator state
var MOVING = 0, IDLE = 1;

// Constants for min and max floor
var MAX_FLOOR = 3, MIN_FLOOR = -1;

// Constants for directions
var UP = 1, DOWN = -1;

// Instance counter
var instances = 0;

/**
 *  Constructor for the Elevator class
 */
function Elevator() {
  this.instance = ++instances;
  this.floor = 0;
  this.state = IDLE;
  this.queue = [];
  this.direction = null;

  this.timer = null;
}

Elevator.MOVING = MOVING;
Elevator.IDLE   = IDLE;

Elevator.UP     = UP;
Elevator.DOWN   = DOWN;

/**
 *  Calls the elevator to the desired floor. Moves the elevator immediately if
 *  idle and free.
 *  @param {Number} floor The desired floor
 */
Elevator.prototype.call = function(floor) {
  // console.log('call');
  // Throw if called to a floor beyond range
  if (floor > MAX_FLOOR || floor < MIN_FLOOR) {
    throw 'Cannot call to floors beyond range';
  }
  // Add the requested floor to the queue
  this.queue.push(floor);
  // console.log(this.toString());
  // If the only request, move
  if (this.queue.length === 1 && this.state === IDLE) {
    this.schedule('move');
  }
};

Elevator.prototype.move = function() {
  // console.log('move');
  // If the elevator is idle
  if (this.state === IDLE) {
    // If the queue is not empty
    if (this.queue.length > 0) {
      // Check next requested floor
      var nextFloor = this.queue.shift();
      if (nextFloor !== this.floor) {
        // Set the state to moving
        this.state = MOVING;
        // Update the direction
        this.direction = nextFloor > this.floor ? UP : DOWN;
        // Update the floor
        this.floor = nextFloor;
        // Schedule stop
        this.schedule('stop');
        // Emit event
        this.emit('moving', nextFloor, this.direction);
      }
      else {
        this.emit('idle', this.floor);
        // Move again
        this.move();
      }
    }
  }
  else {
    throw 'Cannot move if not idle';
  }
};

/**
 *  Stops the elevator at the current floor. The elevator will move again if there's
 *  a pending request.
 *  @throws Exception if the elevator stopped while idle
 */
Elevator.prototype.stop = function() {
  // console.log('stop');
  // If the elevator is moving
  if (this.state === MOVING) {
    // Sets the state to idle
    this.state = IDLE;
    // console.log(this.toString());
    // If the queue is not empty
    if (this.queue.length > 0) {
      // Move to next floor in one second
      this.schedule('move');
    }
    // Emit event
    this.emit('idle', this.floor);
  }
  else {
    throw 'Cannot stop if not moving';
  }
};

/**
 *  Schedules a delayed action on the elevator
 *  @method {String} method The method to call
 */
Elevator.prototype.schedule = function(method) {
  clearTimeout(this.timer);
  this.timer = setTimeout(this[method].bind(this), 1000);
};

/**
 *  Returns a string representation of the elevator instance
 *  @returns a string representation of the elevator instance
 */
Elevator.prototype.toString = function() {
  return 'elevator #' + this.instance +
    ', floor: ' + this.floor +
    ', direction: ' + (this.direction === UP ? 'up' : 'down') +
    ', queue: [ ' + this.queue +
    ' ], moving: ' + (this.state === MOVING ? 'yes' : 'no');
};

// Extends Elevator with methods from EventEmitter
assign(Elevator.prototype, emitter.prototype);

module.exports = Elevator;

},{"events":1,"object-assign":3}]},{},[4]);
