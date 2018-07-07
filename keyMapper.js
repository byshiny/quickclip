/*

 Notes: This is another component that needs to be refactored. It needs a
Hell of a lot of shit to be done to reduce the tech debt.

TODOs: 1. Externalize the mapping(maybe).
2. Account for different operating systems.

*/
function getKeyFromCode(eRawCode){

  if(String.fromCharCode(eRawCode) == '\u0012'){
    console.log("you pressed A!");

  }


}



module.exports = getKeyFromCode()
