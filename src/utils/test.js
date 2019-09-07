let logOne = new Promise ((resolve, reject)=>{setTimeout(function() {
  resolve(console.log("one!"))
}, Math.random() * 1000)})

let logTwo = ()=>{
  setTimeout(function() {
    console.log("two!");
  }, Math.random() * 500)

}

logOne.then(logTwo)
