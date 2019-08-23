const $roomname = document.getElementById('room-name')
const $username = document.getElementById('username')
const $send = document.getElementById('go-button')
const $form = document.getElementById('join-form')

//NOTE: THIS PAGE PURELY ERRORCHECKS PLAYER INPUT. GAME.JS IS IN CHARGE OF ADDING TO THE PLAYER ARRAY, ETC.

const socket = io()

$send.onclick = ()=>{
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

  //check for invalid names(i.e BAD CHARACTERS)
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
