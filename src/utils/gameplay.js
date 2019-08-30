//this module is for keeping track of what's going on in each room during gameplay (keeps player objects with more in-game info, groups players into rooms)
const rooms = []

//add player to room or create room if dne yet
const updateRoom = (roomName, newplayer)=>{
  const room = rooms.find((ele)=>{
    return ele.name === roomName
  })
  const av = Math.floor(Math.random() * 10)

  if(!room){ //create new room object, append player to player array if room dne
    const newRoom = {
      name: roomName,
      players: [
        {
          username: newplayer.username,
          id: newplayer.id,
          avatar: av % 6,
          typeStatus: 0, //1 for has been/is typer
          score: 0,
          numHints: 0
        }
      ],
      ready: 0,
      timer: null,
      pointDebuff: 1,
      currentTyper: undefined
    }

    rooms.push(newRoom)
  }else{
    const playerToAdd = {
      username: newplayer.username,
      id: newplayer.id,
      avatar: av%6,
      typeStatus: 0,
      score: 0,
      numHints: 0
    }

    room.players.push(playerToAdd)
    console.log("all rooms: ", rooms)
  }
}

//delete player, autodelete room if leaving player is last player of room; RETURN MEANINgS: 1 - room is gone, 0 - room still exists, -1 - typer has left
const removePlayerFromRoom = (username, roomName) =>{
  console.log('tha fak')
  let roomIndex = 0
  try{//room is sometimes === undefined when many players instantaneously disconnect, which will throw error
    const room = rooms.find((ele)=>{
      roomIndex++
      return ele.name === roomName
    })
    const index = room.players.findIndex((ele)=>{
      return ele.username === username
    })

    if(index !== -1){ //delete from players array
      const removedPlayer = room.players.splice(index, 1)[0]

      if(room.players.length === 0){//room is closed: all players have left
        rooms.splice(0)
        console.log('Remaining rooms: ', rooms)
        return 1
      }else if (removedPlayer.id === room.currentTyper){//the typer left..
        return -1
      }
      console.log('Remaining rooms: ', rooms)
      return 0
    }
  }catch(err){
    console.log(err)
  }

}

const chooseTyper = (roomName)=>{
    const room = rooms.find((ele)=>{
      return ele.name === roomName
    })

    typer = room.players.find((player)=>{
      return player.typeStatus === 0
    })
    if(typer===undefined){
      room.currentTyper = undefined
      return undefined
    }
    typer.typeStatus = 1
    room.currentTyper = typer.id
    return typer.id
}

//update secret word
const updateRoomWord = (roomName, word) =>{
  const room = rooms.find((ele)=>{
    return ele.name === roomName
  })
  room.word = word
  room.numGuessers = room.players.length - 1 //this is the # of players that are guessing
  console.log('post update: ', room)
}

//compare string to secret word of specified room
const isRoomWord = (word, roomName) =>{
  const room = rooms.find((ele)=>{
    return ele.name === roomName
  })
  if(!room.word){
    return false
  }
  if(room.word.toUpperCase() === word.trim().toUpperCase()){
    return true
  }
  else{
    return false
  }
}

//update player score upon guessing correct word :: NOTE RETURNING 0 >>> NO USERS LEFT FOR GUESSING
const updateScore = (roomName, username, role)=>{
  const room = rooms.find((ele)=>{
    return ele.name === roomName
  })

  if(role === 'guesser'){
    const player = room.players.find((ele)=>{
      return ele.username === username
    })
    if(Math.ceil(room.numGuessers/2) > 0){
      player.score += Math.round(100* room.numGuessers * room.pointDebuff)
    }
    room.numGuessers--

    if(room.numGuessers <= 0){
      return 0
    }
  }else if (role === 'typer'){
    const typer = room.players.find((ele)=>{
      return ele.id === room.currentTyper
    })
    console.log('typer found:', typer)
    if(typer != undefined){
      typer.score += Math.round((room.players.length-1 - room.numGuessers)*75*room.pointDebuff)
    }
  }
  console.log('after score update:', room)

  return room.numGuessers
}

//update number of hints the typer has given (for calculating score:: NEED TO FACTOR IN WORDS IN HINTS!!)
const updateNumHints = (roomName, username)=>{
  const room = rooms.find((ele)=>{
    return ele.name === roomName
  })

  const player = room.players.find((ele)=>{
    return ele.username === username
  })

  player.numHints++
  console.log('from gamplay.js- new numhints: ', player)
}

//return secret word of given room: for verbal hint checking
const getRoomWord = (roomName) =>{
  const room = rooms.find((ele)=>{
    return ele.name === roomName
  })

  return room.word
}

//return game info about all player in room
const getPlayersInRoom = (roomName)=>{
  try{//ROOM IS SOMETIMES UNDEFINED WHEN MANY DCS HAPPEN AT SAME INSTNANT
    const room = rooms.find((ele)=>{
      return ele.name === roomName
    })

    return room.players
  }catch(err){
    console.log(err)
  }
}
//return # players ready; #players needed
const roomReady= (roomName)=>{
  const room = rooms.find((ele)=>{
    return ele.name === roomName
  })
  console.log(room)
  room.ready++;
  return {ready: room.ready, needed: room.players.length}
}

//return all roomnames + their population
const allRooms = ()=>{
  const roomlist = []

  for(let i = 0; i < rooms.length; i++){
    roomlist.push({name: rooms[i].name, numGuessers: rooms[i].players.length})
  }
  return roomlist
}

//return array of player names (in a room), ordered according to their score
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
      toReturn.push({name: players[maxIndex].username, score: players[maxIndex].score})
      players.splice(maxIndex, 1)
    }
    return toReturn
  }catch(e){
    console.log(e)
    return null
  }
}

//reset word, ready
const resetRoom = (roomName)=>{
  console.log('reset.')

  const room = rooms.find((ele)=>{
    return ele.name === roomName
  })
  if(room === undefined){
    return
  }
  room.ready = 0
  room.word = undefined
  console.log('post reset: ', room)
}
/*timer for word reveals: not on index.js because if socket that timer is on closes, then timer disappears for whole room; not on clientside because waste to have all room members
make req when timer runs out*/
const startTimer = (roomName)=>{
  const room = rooms.find((ele)=>{return ele.name === roomName})
  let lettersLeft = room.word.length - Math.ceil(room.word.length * 0.3) //Math.ceil...*0.3 is from gameplay.js' blank-caluclationsion!
  room.pointDebuff = 1.0

  room.timer = setInterval(()=>{
    lettersLeft--
    room.pointDebuff = lettersLeft/room.word.length
    if(lettersLeft <= 0){
      clearInterval(room.timer)
    }
  }, 10000)
}
//stops timer for a room
const stopTimer = (roomName)=>{
  const room = rooms.find((ele)=>{return ele.name === roomName})
  clearInterval(room.timer)
  room.pointDebuff = 1.0
}

//reset room points
const resetScores = (roomName)=>{
  const room = rooms.find((ele)=>{
    return ele.name === roomName
  })

  for(let i = 0; i <room.players.length; i++){
    room.players[i].score = 0
    room.players[i].typeStatus = 0
    room.players[i].numHints = 0
  }
}
module.exports = {
  updateRoom,
  removePlayerFromRoom,
  chooseTyper,
  updateRoomWord,
  isRoomWord,
  updateScore,
  updateNumHints,
  getRoomWord,
  getPlayersInRoom,
  roomReady,
  allRooms,
  orderScores,
  resetRoom,
  resetScores,
  startTimer,
  stopTimer
}
