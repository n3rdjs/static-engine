function localScopeExample(){
    // LOCAL SCOPE
    var cat = 'Jerry';
    console.log(cat); // Jerry
  }
  // GLOBAL SCOPE
  console.log(cat); // Uncaught ReferenceError: cat is not defined