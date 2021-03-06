const express = require('express')
const socketio = require('socket.io')
const http = require('http')
const path = require('path')

const messageModify = require('./utils/message-modify')
const players = require('./utils/players')
const gameplay = require('./utils/gameplay')
const words = require('./utils/words')

const app = express()
const server = http.createServer(app)
const io = socketio(server) //config socketio to work with server

app.use(express.static(path.join(__dirname, '../public')))
const port = process.env.PORT || 3000


io.on('connection', (socket)=>{ //listener for all socket events
  let disableChat = false

//------------------------------------ PLAYER CONNECTION + DISCONNECTION ----------------------------------------------
  socket.on('request-active-rooms', (ack)=>{
    try{
      ack(gameplay.allRooms())
    }catch(e){
      console.log(e)
    }
  })
  //self explanatory, IDIOT!
  socket.on('disconnect', ()=>{
    const toRemove = players.getPlayer(socket.id)

    if(!toRemove){
      return console.log('FROM DISCONNECT: nothing to remove')
    }

    const roomName = toRemove.roomName
    //remove player from gameplay.js and players.js
    const removeStatus = gameplay.removePlayerFromRoom(toRemove.username, toRemove.roomName)
    console.log('rmstat:', removeStatus)
    const player = players.removePlayer(socket.id)

    if(player !== undefined){ //only fires on game.html (index.html fires 'disconnect' submitting, but player is not registered at that stage, causing an error)
      io.to(roomName).emit('message-client', {username: 'SKROBBL', text: `${player.username} has left.`})
    }

    //SPESHUL CASES OF DISCONNECTS
    if(removeStatus === 1){//if all players of room have left..
      return
    }

    else if(removeStatus === -1){//if the typer has left, start the next round
      io.to(roomName).emit('end-round', {players: gameplay.orderScores(roomName), word: gameplay.getRoomWord(roomName)})

      io.to(player.roomName).emit('message-client', {username: 'SKROBBL', text: 'Current typer has left the game! (What a jerk!!!!!!!!!!!). Starting next round...'})
      chooseTyper(roomName)
    }

    else if(gameplay.getNumGuessers(roomName) <= 0){//end the round; no more eligible guessers left after this dc
      io.to(roomName).emit('end-round', {players: gameplay.orderScores(roomName), word: gameplay.getRoomWord(roomName)})
      io.to(roomName).emit('message-client', {username: 'SKROBBL', text: 'No eligible guessers left. Round will now end.'})
      chooseTyper(roomName)
    }
    io.to(player.roomName).emit('populate-sidebar', gameplay.getPlayersInRoom(player.roomName))

  })

  //validates player properties on join stage
  socket.on('validate-player', (player, joinOption, acknowledge)=>{
    try{
      player.roomName = player.roomName.trim().toUpperCase()
      //check for valid room + join option combination, null entries in URL
      if(joinOption === 'join'){
        if(players.findRoom(player.roomName) === undefined){ //will only throw if user somehow edits querystring
          return acknowledge('Error: Room does not exist!')
        }
      //check if room name already exists if creating one
      }else if (joinOption === 'create'){
        if(players.findRoom(player.roomName) !== undefined){
          return acknowledge('Bad input: Room already exists.')
        }
      }else if (player.username === undefined || player.roomName === undefined||player.username === "" || player.roomName ===""){ //IN CASE PEOPLE TRY TO ENTER GAME VIA URL WITH BAD INPUT
          return acknowledge('BAD QUERYSTRING, NICE TRY!!!!!!!!!!!!!!!!!!!!!!!!!!')
      }
      acknowledge()

    }catch(e){
      console.log(e)
    }
  })

  //adds player to player array; connects them to room : NOTE::: ARGUMENT IS FROM GAME.JS
  socket.on('join', (playerArg, acknowledge)=>{
    try{
      const newplayer = players.addPlayer({
        roomName: playerArg.roomName,
        username: playerArg.username,
        id: socket.id
      })

      if(newplayer.error){//this executes if players.js returns object with error (from addPlayer())
        return acknowledge(newplayer.error)
      }
      gameplay.updateRoom(newplayer.roomName, newplayer)

      if(gameplay.getPlayersInRoom(newplayer.roomName).length > 8){
        return acknowledge('Error: room is already full (8 players)')
      }
      socket.join(newplayer.roomName)
      socket.broadcast.to(newplayer.roomName).emit('message-client', {username: 'SKROBBL', text: `${newplayer.username} has joined the room.`})

      if(gameplay.getRoomWord(newplayer.roomName) === undefined){
        socket.emit('message-client', {username: 'Welcome to skrobbl!', text: 'The game will start when all players have clicked the "ready" button.'})
      }else{
        socket.emit('message-client', {username: 'Welcome to skrobbl!', text: 'The game has already started - wait until next round to participate.'})
        disableChat = true
      }
      io.to(newplayer.roomName).emit('populate-sidebar', gameplay.getPlayersInRoom(newplayer.roomName))

      acknowledge()
    }catch(e){
      console.log(e)
    }
  })
//----------------------------------------BASIC MESSAGING --------------------------------------------------------------*

  //when receiving message (in game chat) from player, send to everyone in room
  socket.on('message', (message)=>{
    try{
      const player = players.getPlayer(socket.id)
      let flag = null
      if(message ==="" || disableChat === true){
        return
      }

      if(message === gameplay.getRoomWord(player.roomName) + '©'){//this gets sent when the timer on clientside finishes - update score (+= 0) to end round without sendimg msg
        flag = gameplay.updateScore(player.roomName, player.username, 'guesser')
      }
      //timer hasn't expired yet
      else if(gameplay.isRoomWord(message, player.roomName) === true){
        flag = gameplay.updateScore(player.roomName, player.username, 'guesser')
        gameplay.updateScore(player.roomName, player.username, 'typer')
        const guessersLeft = gameplay.getNumGuessers(player.roomName)
        io.to(player.roomName).emit('message-client', {username: 'SKROBBL', text: `${player.username} has guessed the werd! ${guessersLeft} correct guesser(s) left.`})
        disableChat = true
      }else{
        if(message.indexOf('©') !== -1){//sometimes timer messages show because game has ended >>> room word becomes undefined so above condition (...'©'..) === false
          return
        }
        io.to(player.roomName).emit('message-client', {username: players.getPlayer(socket.id).username, text: message})
      }

      if(flag === 0){//game has ended because #guessers = 0
        gameplay.stopTimer(player.roomName)
        io.to(player.roomName).emit('end-round', {players: gameplay.orderScores(player.roomName), word: gameplay.getRoomWord(player.roomName)})
        return startRound()
      }
    }catch(e){
      console.log(e)
    }

})

  socket.on('enable-chat', ()=>{
    try{
      disableChat = false
    }catch(e){
      console.log(e)
    }
  })
//------------------------------------GAMEPLAY--------------------------------------------------------------------------
  const startRound = ()=>{
    const player = players.getPlayer(socket.id)
    chooseTyper(player.roomName)

    io.to(player.roomName).emit('populate-sidebar', gameplay.getPlayersInRoom(player.roomName))
  }

  //check if all players are ready
  socket.on('ready', (ack)=>{
    try{
      const player = players.getPlayer(socket.id)
      const {ready, needed, error} = gameplay.roomReady(player.roomName)

      if(!ready || !needed || error){
        return ack(error)
      }

      io.to(player.roomName).emit('update-ready-button', {ready,needed})
      io.to(player.roomName).emit('message-client', {username: 'SKROBBL', text: `${player.username} is ready!`} )
      if(ready === needed){
        gameplay.resetScores(player.roomName)
        startRound()
      }
    }catch(e){
      console.log(e)
    }
  })

//--------------------*1) CHOOSING WORDS
  //randomize 3 words; send back to client as response; randomize 9 words and emit to everyone in room to render them onto hint buttons
  socket.on('request-words', (ack)=>{
    try{
      const choices = words.getWords()
      ack(choices)
    }catch(e){
      console.log(e)
    }
  })

  //TELL EVERY PLAYER IN ROOM THAT WORD WAS CHOSEN
  socket.on('word-chosen', (word)=>{
    try{
      //update word in gameplay.js and on UI for game.js
      const player = players.getPlayer(socket.id)
      gameplay.updateRoomWord(player.roomName, word)
      gameplay.startTimer(player.roomName)
      io.to(player.roomName).emit('update-word', word)

      //update hints on UI
      const hints = words.getHints()
      io.to(player.roomName).emit('render-hints', hints)
      disableChat = true
    }catch(e){
      console.log(e)
    }
  })

//----------------FUNCTION DEFINITIONS FOR CHOOSING WORDS
  //choose a typer; disable hints for guessers NOTE: THIS IS THE FUNCTION THAT DETERMINES IF GAME HAS ENDED OR NOT
  const chooseTyper = (roomName)=>{
    const typerid = gameplay.chooseTyper(roomName)
    if(typerid === undefined || typerid === -1){
        gameplay.stopTimer(roomName)
        io.to(roomName).emit('end-game', {players: gameplay.orderScores(roomName), word: gameplay.getRoomWord(roomName)})
        return gameplay.resetRoom(roomName)
    }

    console.log('typer id: ' + typerid)
    const typer = players.getPlayer(typerid).username
    const numGuessers = gameplay.getNumGuessers(roomName, 'max')

    io.to(typerid).emit('typer')
    io.to(roomName).emit('message-client', {username: 'SKROBBL', text: `${typer} is the typer! ${numGuessers} player(s) may guess correctly this round.`})
  }

//----------------------GIVING HINTS --------------------------------------------
//TELL EVERY PLAYER IN ROOM TO UPDATE HINT BUTTONS
  socket.on('chose-hint', (index)=>{
    try{
      const player = players.getPlayer(socket.id)
      io.to(player.roomName).emit('update-hint-buttons', index)
    }catch(e){
      console.log(e)
    }
  })

//CHECK VERBAL HINT SENT FROM TYPER; IF VALID,
  socket.on('verbal-hint', (msg, ack)=>{
    try{
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
    }catch(e){
      console.log(e)
    }
  })
})//EVERYTHING HAS TO BE NESTED INSIDE CONNECTION EVENT!!!!!!!

server.listen(port, ()=>{
  console.log(`running on port ${port}!`)
})
