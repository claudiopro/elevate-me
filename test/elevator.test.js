var expect = require('chai').expect;
var spy = require('sinon').spy;
var stub = require('sinon').stub;
var Elevator = require('../src/js/elevator');

describe('the Elevator class', function() {
  var elevator;

  beforeEach(function() {
    elevator = new Elevator();
  });

  it('keeps a queue of requested floor numbers', function() {
    elevator.call(1);
    elevator.call(2);
    elevator.call(3);
    expect(elevator.queue).to.have.members([1,2,3]);
  });

  describe('the call() method', function() {
    it('adds the requested floor to the queue', function() {
      elevator.call(1);
      expect(elevator.queue[elevator.queue.length - 1]).to.equal(1);

      elevator.call(2);
      expect(elevator.queue[elevator.queue.length - 1]).to.equal(2);
    });

    it('calls move() within a second if idle and the queue is empty', function(done) {
      elevator.queue = [];
      stub(elevator, 'move');
      elevator.call(1);
      setTimeout(function() {
        expect(elevator.move.called).to.equal(true);
        done();
      }, 1100);
    });

    it('schedules a call to move() if idle and the queue is empty', function() {
      elevator.queue = [];
      stub(elevator, 'schedule');
      elevator.call(1);
      expect(elevator.schedule.calledWith('move')).to.equal(true);
    });

    it('throws if calling to floors beyond the range', function() {
      expect(function(){
        elevator.call(-2);
      }).to.throw();
      expect(function(){
        elevator.call(4);
      }).to.throw();
    });

    it('does not throw if calling to floors within the range', function() {
      expect(function(){
        elevator.call(0);
      }).not.to.throw();
      expect(function(){
        elevator.call(1);
      }).not.to.throw();
    });
  });

  describe('the stop() method', function() {
    it('sets the state to IDLE', function() {
      elevator.state = Elevator.MOVING;
      elevator.stop();
      expect(elevator.state).to.equal(Elevator.IDLE);
    });

    it('throws if called when the elevator is not moving', function() {
      elevator.state = Elevator.IDLE;
      expect(function(){
        elevator.stop();
      }).to.throw();
    });

    it('calls move() within a second if the queue is not empty', function(done) {
      elevator.state = Elevator.MOVING;
      elevator.queue = [1];
      stub(elevator, 'move');
      elevator.stop();
      setTimeout(function() {
        expect(elevator.move.called).to.equal(true);
        done();
      }, 1100);
    });

    it('emits the idle event', function(done) {
      elevator.state = Elevator.MOVING;
      elevator.floor = 1;
      elevator.on('idle', function(floor) {
        expect(floor).to.equal(1);
        done();
      });
      elevator.stop();
    });
  });

  describe('the move() method', function() {
    it('sets the state to MOVING if the queue is not empty', function() {
      elevator.state = Elevator.IDLE;
      elevator.queue = [1];
      elevator.move();
      expect(elevator.state).to.equal(Elevator.MOVING);
    });

    it('sets the state to IDLE if the queue is empty', function() {
      elevator.state = Elevator.IDLE;
      elevator.queue = [];
      elevator.move();
      expect(elevator.state).to.equal(Elevator.IDLE);
    });

    it('throws if called when the elevator is not closed', function() {
      elevator.state = Elevator.MOVING;
      expect(function(){
        elevator.move();
      }).to.throw();
    });

    it('changes the direction if called to a floor in the opposite direction', function() {
      elevator.direction = Elevator.UP;
      elevator.floor = 3;
      elevator.queue = [2];
      elevator.move();
      expect(elevator.direction).to.equal(Elevator.DOWN);

      elevator.state = Elevator.IDLE;
      elevator.direction = Elevator.DOWN;
      elevator.floor = 0;
      elevator.queue = [2];
      elevator.move();
      expect(elevator.direction).to.equal(Elevator.UP);
    });

    it('keeps the direction if called to a floor in the same direction', function() {
      elevator.direction = Elevator.UP;
      elevator.floor = 1;
      elevator.queue = [2];
      elevator.move();
      expect(elevator.direction).to.equal(Elevator.UP);

      elevator.state = Elevator.IDLE;
      elevator.direction = Elevator.DOWN;
      elevator.floor = 2;
      elevator.queue = [1];
      elevator.move();
      expect(elevator.direction).to.equal(Elevator.DOWN);
    });

    it('emits the idle event when next floor is the same', function(done) {
      elevator.floor = 1;
      elevator.queue = [1];
      elevator.state = Elevator.IDLE;
      elevator.on('idle', function(floor) {
        expect(floor).to.equal(1);
        done();
      });
      elevator.move();
    });

    it('emits the moving event when next floor is different', function(done) {
      elevator.floor = 1;
      elevator.queue = [2];
      elevator.state = Elevator.IDLE;
      elevator.on('moving', function(floor, direction) {
        expect(floor).to.equal(2);
        expect(direction).to.equal(Elevator.UP);
        done();
      });
      elevator.move();
    });
  });

  describe('the schedule() method', function() {
    it('clears the existing timeout', function(done) {
      var elapsed = false;
      elevator.timer = setTimeout(function() {
        elapsed = true;
      }, 100);
      elevator.schedule('move');
      setTimeout(function() {
        expect(elapsed).not.to.equal(true);
        done();
      }, 200);
    });

    it('calls the desired method within the interval', function(done) {
      stub(elevator, 'move');
      elevator.schedule('move');
      setTimeout(function() {
        expect(elevator.move.called).to.equal(true);
        done();
      }, 1100);
    });
  });
});
