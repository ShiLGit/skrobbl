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
  socket.on('request-active-rooms', (ack)=>{
    ack(gameplay.allRooms())
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
      io.to(roomName).emit('message-client', {username: 'SKROBBL', text: 'No more eligible guessers left. Round will now end.'})
      chooseTyper(roomName)
    }
    io.to(player.roomName).emit('populate-sidebar', gameplay.getPlayersInRoom(player.roomName))


    if(player !== undefined){ //only fires on game.html (index.html fires this when submitting, but player is not registered at that stage, causing an error)
      io.to(roomName).emit('disconnect-client')
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
    }
    io.to(newplayer.roomName).emit('populate-sidebar', gameplay.getPlayersInRoom(newplayer.roomName))

    acknowledge()
  })
//----------------------------------------BASIC MESSAGING --------------------------------------------------------------*

  //when receiving message (in game chat) from player, send to everyone in room
  socket.on('message', (message)=>{
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
      const guessersLeft = gameplay.getNumGuessers(player.roomName)
      io.to(player.roomName).emit('message-client', {username: 'SKROBBL', text: `${player.username} has guessed the werd! ${guessersLeft} correct guesser(s) left.`})
      disableChat = true
    }else{
      io.to(player.roomName).emit('message-client', {username: players.getPlayer(socket.id).username, text: message})
    }

    if(flag === 0){//game has ended because #guessers = 0
      gameplay.updateScore(player.roomName, player.username, 'typer')
      gameplay.stopTimer(player.roomName)
      io.to(player.roomName).emit('end-round', {players: gameplay.orderScores(player.roomName), word: gameplay.getRoomWord(player.roomName)})
      return startRound()
    }
  })

  socket.on('enable-chat', ()=>{
    disableChat = false
  })
//------------------------------------GAMEPLAY--------------------------------------------------------------------------
  const startRound = ()=>{
    const player = players.getPlayer(socket.id)
    chooseTyper(player.roomName)

    io.to(player.roomName).emit('populate-sidebar', gameplay.getPlayersInRoom(player.roomName))
  }

  //check if all players are ready
  socket.on('ready', ()=>{
    const player = players.getPlayer(socket.id)
    const {ready, needed} = gameplay.roomReady(player.roomName)
    if(ready === needed){
      gameplay.resetScores(player.roomName)
      startRound()
    }
    io.to(player.roomName).emit('update-ready-button', {ready,needed})
    io.to(player.roomName).emit('message-client', {username: 'SKROBBL', text: `${player.username} is ready!`} )
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
    gameplay.startTimer(player.roomName)
    io.to(player.roomName).emit('update-word', word)
    disableChat = true
  })

//----------------FUNCTION DEFINITIONS FOR CHOOSING WORDS
  //choose a typer; disable hints for guessers NOTE: THIS IS THE FUNCTION THAT DETERMINES IF GAME HAS ENDED OR NOT
  const chooseTyper = (roomName)=>{
    const typerid = gameplay.chooseTyper(roomName)
    if(typerid === undefined){
        console.log('game haz ended fam')
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
