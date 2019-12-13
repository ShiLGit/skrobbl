const $send = document.getElementById('go-button')
const $form = document.getElementById('join-form')
const $joinDisplay = document.getElementById('join-option-display')

const createDisplayTemplate = document.getElementById('create-template').innerHTML
const joinDisplayTemplate = document.getElementById('join-template').innerHTML
//NOTE: THIS PAGE PURELY ERRORCHECKS PLAYER INPUT. GAME.JS IS IN CHARGE OF ADDING TO THE PLAYER ARRAY, ETC.

const socket = io()

document.getElementById('create').onclick = ()=>{

  const html = Mustache.render(createDisplayTemplate)
  $joinDisplay.innerHTML = html
  $joinDisplay.style.overflow = "visible"
}

document.getElementById('join').onclick = ()=>{
  socket.emit('request-active-rooms', (rooms)=>{
    console.log(rooms)

    $joinDisplay.style.overflow = "auto"
    if(rooms.length === 0){
      $joinDisplay.innerHTML = `<p style = "margin: 10px 10px 0px 60px">No active rooms.</p>`
    }
    else{
      let html = "<p style = 'margin-left:50px'>Select a room below:</p>"
      for(let i =0;i <rooms.length; i++){
        html += Mustache.render(joinDisplayTemplate, {roomName: rooms[i].name, playerCount: rooms[i].numPlayers})
      }
      $joinDisplay.innerHTML = html
    }
  })
}

$send.onclick = ()=>{
  const $roomname = document.getElementById('room-name')
  const $username = document.getElementById('username')

  const player = {
    roomName: "",
    username: ""
  }

  //check for filled input
  if(document.querySelector('input[name="join-option"]:checked') === null){
    return alert('Bad input: Must check a room option.')
  }
  //check for valid username
  if($username.value.trim() === ''){
    return alert('Bad input: must enter username.')
  }
  else if($username.value.length > 20){
    return alert('Bad input: name too long. (20 or fewer characters)')
  }
  else if ($username.value.indexOf('=') !== -1 ||$username.value.indexOf('&') !==-1){
    return alert('Bad input: username contains illegal characters. (= and/or &)')
  }
  else if ($username.value === "SKROBBL" ||$username.value === 'Welcome to skrobbl!'){
    return alert('Bad input: stop pretending to be skrobbl!!')
  }
  const joinOption = document.querySelector('input[name="join-option"]:checked').value

  //errorheck for room-creators
  if(joinOption === 'create'){
    if ($roomname.value.trim() === ''){
      return alert('Bad input: must enter room name.')
    }
    else if ($roomname.value.length > 12){
      return alert('Bad input: room name too long. (12 or fewer characters)')
    }
    else if($roomname.value.indexOf('=') !== -1 ||$roomname.value.indexOf('&') !==-1){
      return alert('Bad input: room name contains illegal characters. (= and/or &)')
    }

    player.roomName = $roomname.value
  }else if (joinOption === 'join'){ //for room joiners
    if(document.querySelector('input[name="room-name"]:checked') === null){
      return alert('Bad input: you need to select a room')
    }
    const roomName = document.querySelector('input[name="room-name"]:checked').value
    player.roomName = roomName
  }

  //populate player
  player.username = $username.value

  socket.emit('validate-player', player, joinOption, (ackError)=>{
    if(ackError){ //validate-player on backend only sends errors as ack argument
      alert(ackError)
    }else {
      $form.submit()
    }
  })
}
