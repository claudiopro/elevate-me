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
