const rooms = [{name: 'dawg', players: [
  {
    username: 'Wakanda',
    score: 12
  },
  {
    username: 'JIdoaij',
    score: 13
  },
  {
    username: 'first place',
    score: 90000
  },
  {
    username: 'second',
    score: 41
  }
]}]


const orderScores = (roomName)=>{
  try{
    const room = rooms.find((ele)=>{
      return ele.name === roomName
    })

    //insertion sort because array will always b small!!!
    let players = [...room.players]
    let toReturn = []
    let length = players.length

    for(let i = 0; i < length; i++){
      //find max in remaining array
      let max = -1
      for(let j = 0; j < players.length; j++){
        if(max < players[j].score){
          max = players[j].score
          maxIndex = j
        }
      }
      //remove max val from players array;
      console.log('max: ', players[maxIndex], maxIndex)
      toReturn.push(players[maxIndex].username)
      console.log('remaining array: ', players)
      players.splice(maxIndex, 1)
    }
    return toReturn
  }catch(e){
    console.log(e)
    return null
  }
}

console.log(orderScores('dawg'))
