//this module is for keeping track of what's going on in each room during gameplay (adds additional information to each player object, groups players into rooms)
const rooms = []
//[{roomname, players}, {roomname2, players2} ...]
/*
TO BE RESOLVED
-multiplyer: what if a player leaves the room during round?
*/

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
          typeStatus: 0, //1 for has typed; -1 for is typer, 0 for never typed
          score: 0,
          numHints: 0
        }
      ],
      ready: 0
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
    console.log(room.name, ":", room.players)
  }
}

const removePlayerFromRoom = (username, roomName) =>{
  const room = rooms.find((ele)=>{
    return ele.name === roomName
  })

  const index = room.players.findIndex((ele)=>{
    return ele.username === username
  })

  if(index !== -1){ //delete from array
    return room.players.splice(index, 1)[0]
  }
  console.log('removed..', room.name, ":", room.players)
}

const chooseTyper = (roomName)=>{
    const room = rooms.find((ele)=>{
      return ele.name === roomName
    })

    typer = room.players.find((player)=>{
      return player.typeStatus === 0
    })
    console.log('fromgp:', typer)
    if(typer===undefined){
      return undefined
    }
    typer.typeStatus = 1
    return typer.id
}

//update secret word
const updateRoomWord = (roomName, word) =>{
  const room = rooms.find((ele)=>{
    return ele.name === roomName
  })
  room.word = word
  room.multiplyer = room.players.length - 1 //this is the # of players that are guessing NOTE: WHAT IF A PLAYER LEAVES MID ROUND?
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
const updateScore = (roomName, username)=>{
  const room = rooms.find((ele)=>{
    return ele.name === roomName
  })

  const player = room.players.find((ele)=>{
    return ele.username === username
  })
  if(Math.ceil(room.multiplyer/2) > 0){
    player.score += 100* room.multiplyer

  }
  else{
    player.score += 100
  }
  room.multiplyer--

  console.log('after score update:', room)
  if(room.multiplyer <= 0){
    return 0
  }
  return room.muliplyer
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
  const room = rooms.find((ele)=>{
    return ele.name === roomName
  })

  return room.players
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
  roomReady
}