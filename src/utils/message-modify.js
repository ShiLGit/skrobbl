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
  console.log(words);
  //check word count
  if(words.length < 5){
    return {error: 'message does not contain enough words (min 5)'}
  }

  //check if hint contains secret word
  let secretWord = gameplay.getRoomWord(roomName)
  if(message.toUpperCase().indexOf(secretWord.toUpperCase()) != -1){
    return {error: `hint can't contain the secret word '${secretWord}' (even if it's inside another bigger word!)`}
  }

  //check for wrong spellings
  const illegalWords = spell.check(message)
  if(illegalWords.length > 0){
    return {error: `message contains illegal words: ${illegalWords}`}
  }

  //check for spammed words to help reach word count
    let sentence = ''
    let prevWord = ''
    for(let i = 0; i < words.length; i++){
      if(words[i].toUpperCase() === prevWord.toUpperCase()){
        return {error: "nice try, you sneaky mongrel!!! you can't reach the required word count by spamming the same words!!!"}
      }
      prevWord = words[i]
      sentence += words[i] + ' '
    }


  //check for suspiciously frequent words
  let bigWords = words.filter((word) => word.length > 3)
  console.log(bigWords);

  return {message: sentence}

}

module.exports = {muddle, checkMessage}
