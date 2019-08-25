const $send = document.getElementById('go-button')
const $form = document.getElementById('join-form')
const $joinDisplay = document.getElementById('join-option-display')
//NOTE: THIS PAGE PURELY ERRORCHECKS PLAYER INPUT. GAME.JS IS IN CHARGE OF ADDING TO THE PLAYER ARRAY, ETC.

const socket = io()

document.getElementById('create').onclick = ()=>{
  $joinDisplay.innerHTML =
  `<input type = "text" id = "room-name" placeholder="Room Name" autocomplete = "false" required = "true" name = "room-name"/><br/>
  <input type = "text" id = "username" placeholder="Username" autocomplete = "false" required = "true" name = "username"/><br/>`
}

document.getElementById('join').onclick = ()=>{
  socket.emit('request-active-rooms', (rooms)=>{
    console.log(rooms)

    if(rooms.length === 0){
      $joinDisplay.innerHTML = `<p>No active rooms.</p>`
    }
    else{
      let html =''
      for(let i =0;i <rooms.length; i++){
        html += `<p>${rooms[i].name}: ${rooms[i].numPlayers}</p></br>`
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
    return alert('Error: Must check a room option.')
  }
  else if($username.value.trim() === ''){
    return alert('Error: must enter username.')
  }
  else if ($roomname.value.trim() === ''){
    return alert('Error: must enter room name.')
  }

  //check for invalid names(i.e BAD CHARACTERS THATLL MESS UP QS PARSING)
  if($roomname.value.indexOf('=') !== -1 ||$roomname.value.indexOf('&') !==-1){
    return alert('Error: room name contains illegal characters. (= and/or &)')
  }
  else if ($username.value.indexOf('=') !== -1 ||$username.value.indexOf('&') !==-1){
    return alert('Error: username contains illegal characters. (= and/or &)')
  }

  //populate player
  const joinOption = document.querySelector('input[name="join-option"]:checked').value
  player.roomName = $roomname.value
  player.username = $username.value

  socket.emit('validate-player', player, joinOption, (ackError)=>{
    if(ackError){ //validate-player on backend only sends errors as ack argument
      alert(ackError)
    }else {
      $form.submit()
    }
  })
}

socket.on('validate-player-client', (res)=>{
  if(res.error){
    return alert('Error: ', res.error)
  }
  else if (res.approved){
    $form.submit()
  }
})
