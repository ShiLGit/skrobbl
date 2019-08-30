const replaceAt=(str, index, char)=>{
  let toReturn = ""
  for(let i = 0; i < str.length; i++){
    if(i === index){
      toReturn += str[i]
      continue
    }
    toReturn += str[i]
  }

  return toReturn
}

const revealTimer = (word)=>{
  const fullWord = word.toUpperCase()
  const $timer = document.getElementById('timer')
  let newHTML = $word.innerHTML
  let time = 10
  let revealFrom = 0

  timer = setInterval(()=>{
    $timer.innerHTML = `Time until letter reveal: ${--time}`

    if(time <= 0){
      //letterReveal
      if(revealFrom % 2 === 1){ //reveal from front
        for(let i = 0; i < fullWord.length; i++){
          if(newHTML[i] != '_'){
            revealFrom++
            //newHTML.replaceAt(i, fullWord[i])
            $word.innerHTML = newHTML
            time = 30
            break
          }
        }
      }else{
        for(let i = fullWord.length - 1; i > -1; i++){
          if(newHTML[i] != '_'){
            revealFrom++
            $word.innerHTML = newHTML
            //newHTML.replaceAt(i, fullWord[i])
            console.log(replaceAt(newHTML, i, fullWord[i]))

            time = 30
            break
          }
        }
      }

      //this will execute if there are no blanks left to fill
      clearInterval(timer)
    }
  },100)
}
