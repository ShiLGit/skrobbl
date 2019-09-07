const path = require('path')
const fs = require('fs')


const wordArray = fs.readFileSync(path.join(__dirname, '/txt/words.txt')).toString().split(';')
const hintArray = fs.readFileSync(path.join(__dirname, '/txt/hints.txt')).toString().split(';')


//select 'amount' number of unique random words from 'array'; return them
const selectRandom = (array, amount)=>{
  const usedIndexes = [amount]
  const toReturn = [amount]

  for(let i =0;i < amount; i++){
    //find index that hasn't been used
    let newIndex = 0
    do{
      newIndex = Math.floor(Math.random() * array.length)
    }while(usedIndexes.indexOf(newIndex) !== -1)

    //populate array to return with new item
    usedIndexes[i] = newIndex
    toReturn[i] = array[newIndex]
  }

  return toReturn
}

//select 3 random words from words.txt
const getWords = ()=>{
  return selectRandom(wordArray, 3)
}

//select 12 random words from hints.txt
const getHints = ()=>{
  return selectRandom(hintArray, 12)
}

module.exports = {
getWords,
getHints
}
