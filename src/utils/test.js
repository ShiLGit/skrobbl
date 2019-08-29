

let chars = []
let letterCount = Math.ceil(word.length * 0.3)
const incrementSize = Math.floor(word.length / letterCount)
let revealIndex = incrementSize
let toPrint = ""

for(i = 0; i < word.length; i++){
  chars[i] = '_ '
}

do{
  if(revealIndex > word.length - 1){
    revealIndex -= word.length
  }
  chars[revealIndex] = word[revealIndex]
  revealIndex += incrementSize
  letterCount--
}while(letterCount > 0)

for(let i = 0; i<word.length; i++){
  toPrint += chars[i] + ' '
}
