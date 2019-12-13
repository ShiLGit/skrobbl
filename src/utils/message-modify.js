const path = require('path')
const config = require(path.join(__dirname, '../../config.js'))

const rp = require('request-promise')
const spell = require('spell-checker-js')
const apiKey =  config.apiKey
const gameplay = require('./gameplay.js')

spell.load('en')

//run a string through translate 4 times
const muddle = async(toTranslate)=>{
  let options = {
    method: 'GET',
    json: true,
    uri: `https://translate.yandex.net/api/v1.5/tr.json/translate?key=${apiKey}&text=${toTranslate}&lang=en-zh`
  }
  let response = await rp(options)
  let newText = response.text[0]
  console.log('cn: ' + newText)

  options.uri =`https://translate.yandex.net/api/v1.5/tr.json/translate?key=${apiKey}&text=${toTranslate}&lang=zh-ta`
  response = await rp(options)
  newText = response.text[0]
  console.log('mg: ' +newText)

  options.uri =`https://translate.yandex.net/api/v1.5/tr.json/translate?key=${apiKey}&text=${toTranslate}&lang=ta-xh`
  response = await rp(options)
  newText = response.text[0]
  console.log('xh: ' +newText)

  options.uri = `https://translate.yandex.net/api/v1.5/tr.json/translate?key=${apiKey}&text=${newText}&lang=xh-en`
  response = await rp(options)
  newText = response.text[0]
  console.log('FINAL: ' + newText)

  return response.text[0]
}


const checkMessage = (message, roomName)=>{
  let words = message.split(' ')
  words = words.filter((word)=>{
    if(word !== ''){
      word = word.toUpperCase();
      return 1;
    }
  })
  words = words.map((w)=>{
    let toReturn = w.replace("'", "")
    toReturn = toReturn.replace('"')
    toReturn = toReturn.toUpperCase()
    return toReturn
  })
  console.log(words);
  //check word count
  if(words.length < 5){
    return {error: 'Message does not contain enough words (min 5)'}
  }

  //check if hint contains secret word
  let secretWord = gameplay.getRoomWord(roomName)
  if(message.toUpperCase().indexOf(secretWord.toUpperCase()) != -1){
    return {error: `Hint can't contain the secret word '${secretWord}' (even if it's inside another bigger word!)`}
  }

  //check for wrong spellings
  const illegalWords = spell.check(message)
  const letters = 'BCDEFGHJKLMNOPQRSTUVWXYZ'
  let illegal = false
  words.forEach((w)=>{
    console.log(`${w} : ${w.length}; ${letters.indexOf(w)}`)
    if(w.length == 1 && letters.indexOf(w) != -1){
      illegal = true;
    }
  })
  if(illegal = true){
    return {error: "Single letters (excluding 'I', 'A') are not allowed as hints"}
  }
  if(illegalWords.length > 0){
    return {error: `Message contains illegal words: ${illegalWords}`}
  }

  //check for spammed words to help reach word count
    let sentence = ''
    let prevWord = ''
    for(let i = 0; i < words.length; i++){
      if(words[i].toUpperCase() === prevWord.toUpperCase()){
        return {error: "Nice try, you sneaky mongrel!!! you can't reach the required word count by spamming the same words!!!"}
      }
      prevWord = words[i]
      sentence += words[i] + ' '
    }


  //check for suspiciously frequent words
  let bigWords = words.filter((word) => word.length > 3)
  bigWords.sort((a,b)=>{return a.length - b.length})
  let wordCount = 0
  //TO DO::::::::::::::::::: CHECK FOR OCCURRENCES
  for(let i = 0; i < bigWords.length; i++){
    console.log("NEXT WORD: " + bigWords[i])
    bigWords[i] = bigWords[i].toUpperCase();
    wordCount = 1

    //dont remove self lol
    for(let j = 0; j < bigWords.length; j++){
      if(j === i){
        j++
      }
      console.log(bigWords);
      console.log(j);
      if( j >= bigWords.length){
        break;
      }
      bigWords[j] = bigWords[j].toUpperCase();
      if(bigWords[i] === bigWords[j] || bigWords[i].indexOf(bigWords[j]) != -1 || bigWords[j].indexOf(bigWords[i]) != -1){
        wordCount++
        bigWords.splice(j, 1);
        j--;
        if(wordCount >= Math.round(words.length / 2)){
          return {error: `No can do!! Some words appear suspiciously frequently in your hint ... ('${bigWords[i]}')`}
        }
      }
    }
  }

  return {message: sentence}

}

module.exports = {muddle, checkMessage}
