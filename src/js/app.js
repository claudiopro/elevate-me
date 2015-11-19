var Elevator = require('./elevator'),
  classnames = require('classnames/dedupe');

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
}

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
