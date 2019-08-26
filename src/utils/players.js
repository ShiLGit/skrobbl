//this file is mostly for keeping track of each player's basic information: better for player validation, finding basic information from socketid (to later be used in gameplay.js)

const gamplay = require('./gameplay.js')
const players = []

//add new player onto player array if valid
const addPlayer = ({id, username, roomName}) =>{
  username=username.trim()
  roomName = roomName.trim().toUpperCase()

  //check for users in same room and same name
  const existingUser = players.find((player)=>{
    return player.roomName === roomName && player.username.toUpperCase() === username.toUpperCase()
  })
  if(existingUser){
    return{
      error: "Name already in use!"
    }
  }

  const player = {id, username, roomName}
  players.push(player)
  return(player)
}

//remove user given socket id
const removePlayer = (id)=>{
  const index = players.findIndex((player)=>{ //returns posn of array item if match found
    return player.id === id
  })

  if(index !== -1){ //delete from array
    return players.splice(index, 1)[0]
  }
}

//return player object given id
const getPlayer = (id) =>{
  const match = players.find((player)=>{
    return player.id ===id
  })
  return match
}

//return array of all players in room
const getRoomPlayers = (r)=>{
  const playerlist = players.filter((player)=>{
    return player.r === r.trim().toUpperCase()
  })
  return playerlist
}

//check if there is an existing room of argument's name (faster than filter because it doesn't sort through whole array)
const findRoom = (room)=>{
  const r = players.find((player)=>{
    return player.roomName === room
  })
  return r
}


module.exports = {
  players,
  addPlayer,
  removePlayer,
  getPlayer,
  getRoomPlayers,
  findRoom
}
