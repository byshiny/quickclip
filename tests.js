/*

 Notes: This is another component that needs to be refactored. It needs a
Hell of a lot of shit to be done to reduce the tech debt.

TODOs: 1. Externalize the mapping(maybe).
2. Account for different operating systems.

/* This function converts to a number, and does a -1 subtraction to get the
   approperiate keycode. This function will have to be refactored with more complex
   logic if we allow the user to use other keys than 1 - 10 */
const assert = require('assert')
var keyMapper = require('./keyMapper')
function testGetKeyMapper () {
  var one = keyMapper.getKeyFromCode('2')
  var two = keyMapper.getKeyFromCode('3')
  var three = keyMapper.getKeyFromCode('4')
  var four = keyMapper.getKeyFromCode('5')
  var zero = keyMapper.getKeyFromCode('11')
  assert.equal(one, 1)
  assert.equal(two, 2)
  assert.equal(three, 3)
  assert.equal(four, 4)
  assert.equal(zero, 0)
}

// Run tests

testGetKeyMapper()
