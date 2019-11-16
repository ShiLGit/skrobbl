let words= ["bored", "blaring", "blatant", "bore", "boredom"]
let bigWords = words.filter((word) => word.length > 3)
bigWords.sort((a,b)=>{return a.length - b.length})
let wordCount = 0
//TO DO::::::::::::::::::: CHECK FOR OCCURRENCES
for(let i = 0; i < bigWords.length; i++){
  console.log("NEXT WORD: " + bigWords[i])
  bigWords[i] = bigWords[i].toUpperCase();
  wordCount = 1

  //check rest of array for repeats of bigwords[i]
  for(let j = 0; j < bigWords.length; j++){
    if(j === i){
      j++
    }
    console.log(bigWords);
    console.log(j);

    if(j >= bigWords.length){
      break;
    }
    bigWords[j] = bigWords[j].toUpperCase();
    if(bigWords[i] === bigWords[j] || bigWords[j].indexOf(bigWords[i]) != -1){
      wordCount++
      console.log(`matched ${bigWords[i]} with ${bigWords[j]}`);
      console.log("WC = " + wordCount);
      bigWords.splice(j, 1);

      j--;

    }
    console.log("i = " + i + "; bw.l = " + bigWords.length);

  }
}
