const express = require('express')
const socketio = require('socket.io')
const http = require('http')
const path = require('path')

const fs = require('fs')
const messageModify = require('./utils/message-modify')
const players = require('./utils/players')
const gameplay = require('./utils/gameplay')

const app = express()
const server = http.createServer(app)
const io = socketio(server) //config socketio to work with server

app.use(express.static(path.join(__dirname, '../public')))
const port = process.env.PORT || 3000


io.on('connection', (socket)=>{ //listener for all socket events
  let disableChat = false
//------------------------------------ PLAYER CONNECTION + DISCONNECTION ----------------------------------------------*

  //self explanatory, IDIOT!
  socket.on('disconnect', ()=>{
    const toRemove = players.getPlayer(socket.id)
    if(!toRemove){
      return console.log('FROM DISCONNECT: nothing to remove')
    }
    gameplay.removePlayerFromRoom(toRemove.username, toRemove.roomName)

    const player = players.removePlayer(socket.id)
    console.log('post-remove: ', players.players)
    console.log('?????????', gameplay.getPlayersInRoom(player.roomName))
    io.to(player.roomName).emit('populate-sidebar', gameplay.getPlayersInRoom(player.roomName))


    if(player !== undefined){ //only fires on game.html (index.html fires this when submitting, but player is not registered at that stage, causing an error)
      io.to(player.roomName).emit('disconnect-client')
    }
  })

  //validates player properties on join stage
  socket.on('validate-player', (player, joinOption, acknowledge)=>{
    player.roomName = player.roomName.trim().toUpperCase()
    //check for valid room + join option combination, null entries in URL
    if(joinOption === 'join'){
      if(players.findRoom(player.roomName) === undefined){
        return acknowledge('ROOM DOES NOT EXIST')
      }
    //check if room name already exists if creating one
    }else if (joinOption === 'create'){
      if(players.findRoom(player.roomName) !== undefined){
        return acknowledge('ROOM ALRDY EXISTS')
      }
    }else if (player.username === undefined || player.roomName === undefined||player.username === "" || player.roomName ===""){ //IN CASE PEOPLE TRY TO ENTER GAME VIA URL WITH BAD INPUT
        return acknowledge('ONE OF THE NAME FIELDS ARE EMPTY')
    }

    acknowledge()
  })

  //adds player to player array; connects them to room : NOTE::: ARGUMENT IS FROM GAME.JS
  socket.on('join', (playerArg, acknowledge)=>{

    const newplayer = players.addPlayer({
      roomName: playerArg.roomName,
      username: playerArg.username,
      id: socket.id
    })

    if(newplayer.error){//this executes if players.js returns object with error (from addPlayer())
      acknowledge(newplayer.error)
    }
    gameplay.updateRoom(newplayer.roomName, newplayer)

    if(gameplay.getPlayersInRoom(newplayer.roomName).length > 8){
      acknowledge('Error: room is already full (8 players)')
    }
    socket.join(newplayer.roomName)
    socket.broadcast.to(newplayer.roomName).emit('message-client', {username: 'SKROBBL BOT', text: `${newplayer.username} has joined the room.`})
    io.to(newplayer.roomName).emit('populate-sidebar', gameplay.getPlayersInRoom(newplayer.roomName))

    acknowledge()
  })
//----------------------------------------BASIC MESSAGING --------------------------------------------------------------*

  //when receiving message (in game chat) from player, send to everyone in room
  socket.on('message', (message)=>{
    const player = players.getPlayer(socket.id)
    if(message ==="" || disableChat === true){
      return
    }

    if(gameplay.isRoomWord(message, player.roomName) === true){
      const flag = gameplay.updateScore(player.roomName, player.username)
      io.to(player.roomName).emit('message-client', {username: 'SKROBBL BOT', text: `${player.username} has guessed the werd!`})

      if(flag === 0){
        console.log('time to end tha round!!!!!!')
        startRound()
        io.to(player.roomName).emit('end-round')
      }
      disableChat = true
    }else{
      io.to(player.roomName).emit('message-client', {username: players.getPlayer(socket.id).username, text: message})
    }
  })

  socket.on('enable-chat', ()=>{
    disableChat = false
  })
//------------------------------------GAMEPLAY--------------------------------------------------------------------------
  const startRound = ()=>{
    chooseTyper()
    const player = players.getPlayer(socket.id)

    io.to(player.roomName).emit('populate-sidebar', gameplay.getPlayersInRoom(player.roomName))
  }

  //check if all players are ready
  socket.on('ready', ()=>{
    const player = players.getPlayer(socket.id)
    const {ready, needed} = gameplay.roomReady(player.roomName)
    if(ready === needed){
      startRound()
    }
    io.to(player.roomName).emit('update-ready-button', {ready,needed})
    io.to(player.roomName).emit('message-client', {username: 'SKROBBL BOT', text: `${player.username} is ready!`} )
  })

//--------------------*1) CHOOSING WORDS
  //randomize 3 words; send back to client as response; randomize 9 words and emit to everyone in room to render them onto hint buttons
  socket.on('request-words', (ack)=>{
    const buffer = fs.readFileSync(path.join(__dirname, '/utils/words.txt')).toString()
    const wordArray = buffer.split(';')

    const words = [3]
    for(i = 0; i < 3; i++){
      words[i] = wordArray[Math.floor(Math.random() * wordArray.length)]
    }

    //everything up to ack() from here is responsible for hint array
    const hints = [12]
    for(i = 0; i<12; i++){
      hints[i] = wordArray[Math.floor(Math.random()*wordArray.length)]
    }
    const player = players.getPlayer(socket.id)
    io.to(player.roomName).emit('render-hints', hints)
    ack(words)
  })

  //TELL EVERY PLAYER IN ROOM THAT WORD WAS CHOSEN
  socket.on('word-chosen', (word)=>{
    player = players.getPlayer(socket.id)
    gameplay.updateRoomWord(player.roomName, word)
    io.to(player.roomName).emit('update-word', word)
    disableChat = true
  })

//----------------FUNCTION DEFINITIONS FOR CHOOSING WORDS
  //choose a typer; disable hints for guessers NOTE: THIS IS THE FUNCTION THAT DETERMINES IF GAME HAS ENDED OR NOT
  const chooseTyper = ()=>{
    const player = players.getPlayer(socket.id)
    const typerid = gameplay.chooseTyper(player.roomName)
    if(typerid === undefined){
        return console.log('game haz ended fam')
    }

    console.log('typer id: ' + typerid)
    const typer = players.getPlayer(typerid).username

    io.to(typerid).emit('typer')
    io.to(player.roomName).emit('message-client', {username: 'SKROBBL BOT', text: `${typer} is the typer!`})
    socket.broadcast.to(player.roomName).emit('disable-hints')
  }

//----------------------GIVING HINTS --------------------------------------------
//TELL EVERY PLAYER IN ROOM TO UPDATE HINT BUTTONS
  socket.on('chose-hint', (index)=>{
    const player = players.getPlayer(socket.id)
    io.to(player.roomName).emit('update-hint-buttons', index)
  })

//CHECK VERBAL HINT SENT FROM TYPER; IF VALID,
  socket.on('verbal-hint', (msg, ack)=>{
    const player = players.getPlayer(socket.id)

    //check for invalid messages
    const msgObj = messageModify.checkMessage(msg, player.roomName)
    if(msgObj.error){
      console.log(msgObj.error)
      return ack({error: msgObj.error})
    }else{
      ack()
    }

    //send message through translation
    messageModify.muddle(msgObj.message).then((msg)=>{
      io.to(player.roomName).emit('update-hints', msg) // tell everywan in room to render a new hint!!!!!!!!
    })

    gameplay.updateNumHints(player.roomName, player.username)

  })

//----------------------2) RESETTING ROUNDS

})//EVERYTHING HAS TO BE NESTED INSIDE CONNECTION EVENT!!!!!!!

server.listen(port, ()=>{
  console.log(`running on port ${port}!`)
})