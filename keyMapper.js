/*

 Notes: This is another component that needs to be refactored. It needs a
Hell of a lot of shit to be done to reduce the tech debt.

TODOs: 1. Externalize the mapping(maybe).
2. Account for different operating systems.

*/
/*this function converts to a number, and does a -1 subtraction to get the
approperiate keycode. This function will have to be refactored with more complex
logic if we allow the user to use other keys than 1 - 10 */

function getKeyFromCode(keycode){
  var keyCodeInt = parseInt(keycode);
  keyCodeInt = (keyCodeInt - 1) % 10;
  return keyCodeInt;
}


module.exports = {
    getKeyFromCode: getKeyFromCode,
};
