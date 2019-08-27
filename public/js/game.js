const socket = io() //connect

//const $notifBox = document.getElementById('notif')

const $sendButton = document.getElementById('send')
const $messagebar = document.getElementById('messagebar')
const $messageContainer = document.getElementById('message-container')
const $readyButton = document.getElementById('ready-button')
const $players = document.getElementsByClassName('player')
const $extrainfo = document.getElementById('extrainfo')

const $verbalHintSend = document.getElementById('send-verbal-hint')
const $hintContainer = document.getElementById('verbal-hint-container')
const $helperMsg = document.getElementById('helper-msg')
const $wordButtons = document.getElementsByClassName('choices')
const $hintButtons = [document.getElementById('hb1'),document.getElementById('hb2'),document.getElementById('hb3'),
                      document.getElementById('hb4'),document.getElementById('hb5'),document.getElementById('hb6'),
                      document.getElementById('hb7'),document.getElementById('hb8'),document.getElementById('hb9'),
                      document.getElementById('hb10'),document.getElementById('hb11'),document.getElementById('hb12')]
const $notifBox = document.getElementById('notif')

const messageTemplate = document.getElementById('message-template').innerHTML
const hintTemplate = document.getElementById('hint-template').innerHTML
const allAvatars = ['../img/avatar_1.png', '../img/avatar_2.png', '../img/avatar_3.png', '../img/avatar_4.png','../img/avatar_5.png', '../img/avatar_6.png']

//*******************************FUNKI CSS NOTIFICATIONS
$notifBox.onclick = ()=>{
  $notifBox.style.display = 'none'
}

//create a notification
const notification = (titleText, bodyText, special)=>{
  const $title = document.getElementById('notif-header')
  const $body = document.getElementById('notif-body')
  $notifBox.style.backgroundColor = 'white'

  let timeout = 6000

  $title.innerHTML = titleText
  $body.innerHTML = bodyText

  //create game-end notification if special = 1
  if(special === 1){
    $notifBox.style.backgroundColor = '#F9DBBD'
    timeout = 20000
  }
  $notifBox.style.display = 'block'
  setTimeout(()=>{
    $notifBox.style.display = 'none'
  }, timeout)
}

//****************************STEP 1: JOIN ROOM ************************************
//parse querystring to create user object
function parseQS(){
  let qs = location.search

  const joinReq = {
    roomName: '',
    username: '',
  }

  //parse joinOption
  let start = qs.indexOf('=')
  let end = qs.indexOf('&')
  joinReq.joinOption = qs.slice(start+1, end)

  //parse username
  qs =qs.replace('=', '0') //set up string so that indexOf() doesn't return indices for old properties
  qs =qs.replace('&', '0')
  start = qs.indexOf('=')
  end = qs.indexOf('&')
  joinReq.username = qs.slice(start+1, end)

  //parse roomName
  qs =qs.replace('=', '0')
  start = qs.indexOf('=')
  joinReq.roomName = qs.slice(start+1)

  return joinReq
}

//join room iff querystring is valid
const attemptJoin = ()=>{
  const joinReq = parseQS()

  //remove qs from url
  const uri = window.location.toString();
  if (uri.indexOf("game.html") > 0) {
      const clean_uri = uri.substring(0, uri.indexOf("game.html"));
      window.history.replaceState({}, document.title, clean_uri);
  }
  const player = {
    roomName: joinReq.roomName,
    username: joinReq.username
  }

  socket.emit('validate-player', player, joinReq.joinOption, (ackError)=>{
    if(ackError){
      alert(ackError)
      location.href = '/'
    }
    else{
      socket.emit('join', player,  (errAck)=>{//name already exists (join calls player.addPlayer())
        if(errAck){
            alert(errAck)
            location.href= '/'
          }
      })
    }

    $extrainfo.innerHTML = "Translations by Yandex<br/>Room name: " + player.roomName
    //if room creator enable start button
    let qs = parseQS()
  })
}

//populate sidebar with player info
socket.on('populate-sidebar', (players)=>{
  let i = 0;
  for(i=0; i< players.length; i++){
    $players[i].style.display = "block"
    $players[i].innerHTML = `<img src = ${allAvatars[players[i].avatar]}>
                            <div class = "playertext">
                                <h2>${players[i].username}</h2>
                                <p>Score:${players[i].score}</p>
                             </div>`
  }

  //clear rest of players in case someone leaves
  for(let j = i; j<8; j++){
    $players[j].style.display = "none"
  }
})
attemptJoin()
//******************************* BASIC MESSAGING ***************************************
$sendButton.onclick = (e)=>{
  e.preventDefault() //prevent browser from going through full page refresh (default behavior for forms)

  const message = $messagebar.value
  $messagebar.value = ''
  $messagebar.focus()
  socket.emit('message', message)

}

//when receiving msg from server: render it onto the screen
socket.on('message-client', ({username, text})=>{
  if(username === 'SKROBBL' || username === 'Welcome to skrobbl!'){
    const html =
    `<div class = "speshul">
        <h4 class = "username">${username}</h4>
        <p class = "msg-text">${text}</p>
      </div>`

    $messageContainer.insertAdjacentHTML('beforeend', html)
    $messageContainer.scrollTop = $messageContainer.scrollHeight
    return
  }

  const html = Mustache.render(messageTemplate, {
    username,
    text
  })
  $messageContainer.insertAdjacentHTML('beforeend', html)
  $messageContainer.scrollTop = $messageContainer.scrollHeight
})

//when user disconnect is alerted from server: render alert onto screen
socket.on('disconnect-client', ()=>{
  const html = Mustache.render(messageTemplate, {
    username: 'SKROBBL',
    text: 'A player has disconnected'
  })
  $messageContainer.insertAdjacentHTML('beforeend', html)
})

//*************************STARTING THE GAME ****************************************
//------------------choosing a word------------------------------------
$readyButton.onclick = ()=>{
  $readyButton.disabled = true;
  socket.emit('ready')
}
socket.on('update-ready-button', ({ready, needed})=>{
  $readyButton.innerHTML = `${ready}/${needed} ready`
})

socket.on('end-round', ({players, word})=>{
  resetUI()

  //show round end on hint container
  const roundEndedHTML = `<div class = "round-status-bg">
                            <p class = "round-status-text">NEW ROUND</p>
                          </div>`
  $hintContainer.insertAdjacentHTML('beforeend', roundEndedHTML)
  let html = `<p style = "bold">The word was ${word}</p><p>Current leaderboard:</p>`

  for(let i = 0; i<players.length; i++){
    html += `${players[i]}<br/>`
  }
  notification('Round has ended!', html, 0)
})

//you're the typer faaaaaam (choose a word)
socket.on('typer', ()=>{
  socket.emit('request-words', (words)=>{
    for(let i = 0; i < 3; i++){
      $wordButtons[i].innerHTML = words[i]
    }
    document.getElementById('modal').style.display = 'inline-block'
  })
  for(let i = 0; i< $hintButtons.length; i++){
    $hintButtons[i].disabled = false
  }
})

//SET LISTENER ON ALL MODAL BUTTONS FOR ONCLICK EVENT
for (let i = 0; i < $wordButtons.length; i++) {
    $wordButtons[i].onclick = ()=>{
        socket.emit('word-chosen', $wordButtons[i].innerHTML)
        document.getElementById('modal').style.display = 'none'
        $verbalHintSend.style.display = 'block'
    }
}

//----------------displaying words + hints -------------------------
//render header hint (_ _ _ _ _ ...) on your screen
socket.on('update-word', (secretWord)=>{
  const word = secretWord.toUpperCase()
  let toPrint = ""
  let toDisplay = [word.length]
  let numLetters = Math.ceil(word.length*0.3)
  const indexIncrement = Math.floor((word.length/numLetters))
  let letterIndex = indexIncrement

  //header text calculate
  for(let i = 0; i<word.length; i++){
    if(i === letterIndex && numLetters > 0){
      numLetters--
      toDisplay[i] = word[letterIndex]
      letterIndex += indexIncrement;
      if(letterIndex > word.length-1){
        letterIndex -= word.length
        toDisplay[letterIndex] = word[letterIndex]
      }
    }else{
      toDisplay[i] = '_'
    }
    toPrint = toPrint.concat(toDisplay[i])
  }
  //change header text
  const $header = document.getElementById('word').innerHTML = toPrint
  //startTimer()
})

//RENDER HINT BUTTON WORDS
socket.on('render-hints', (hints)=>{
  for(let i = 0; i < $hintButtons.length; i++){
    $hintButtons[i].innerHTML = hints[i]
  }
})
socket.on('update-hint-buttons', (i)=>{
  $hintButtons[i].style.opacity = 1;
})

//ADD LISTENER ON HINT BUTTONS FOR CLICKS
$hintButtons[0].onclick = ()=>{
  socket.emit('chose-hint', 0)
}
$hintButtons[1].onclick = ()=>{
  socket.emit('chose-hint', 1)
}
$hintButtons[2].onclick = ()=>{
  socket.emit('chose-hint', 2)
}
$hintButtons[3].onclick = ()=>{
  socket.emit('chose-hint', 3)
}
$hintButtons[4].onclick = ()=>{
  socket.emit('chose-hint', 4)
}
$hintButtons[5].onclick = ()=>{
  socket.emit('chose-hint', 5)
}
$hintButtons[6].onclick = ()=>{
  socket.emit('chose-hint', 6)
}
$hintButtons[7].onclick = ()=>{
  socket.emit('chose-hint', 7)
}
$hintButtons[8].onclick = ()=>{
  socket.emit('chose-hint', 8)
}
$hintButtons[9].onclick = ()=>{
  socket.emit('chose-hint', 9)
}
$hintButtons[10].onclick = ()=>{
  socket.emit('chose-hint', 10)
}
$hintButtons[11].onclick = ()=>{
  socket.emit('chose-hint', 11)
}

//VERBAL HINTS: CHECK IF HINT SENT IS VALID, DISPLAY HELPERMSG IF NOT
document.getElementById('hint').onclick = (e)=>{
  const $hintbar = document.getElementById('hintbar')
  e.preventDefault()
  $hintbar.focus()

  $helperMsg.innerHTML = 'please wait - translating message! (will take a few seconds)'
  socket.emit('verbal-hint', $hintbar.value, (ack)=>{
    if(ack){
      $helperMsg.style.display = 'block'
      $helperMsg.innerHTML = ack.error
    }
  })
  $hintbar.value = ""
}

socket.on('update-hints', (hint)=>{
  const html = Mustache.render(hintTemplate, {text: "HINT: " + hint})
  $hintContainer.insertAdjacentHTML('beforeend', html)
  $helperMsg.innerHTML = 'message sent!'
})

//-------------------misc?----------------------------------------------
socket.on('end-game', ({players, word})=>{
  resetUI()

  //show round end on hint container
  const roundEndedHTML = `<div class = "round-status-bg">
                              <p class = "round-status-text">GAME ENDED</p>
                            </div>`
  $hintContainer.insertAdjacentHTML('beforeend', roundEndedHTML)
  let html = `<p style = "bold">The word was ${word}</p><p>Remaining leaderboard:</p>`

  for(let i = 1; i<players.length; i++){
    html += `${players[i]}<br/>`
  }
  notification(`${players[0]} wins!`, html, 1)


  $readyButton.innerHTML = 'PLAY AGAIN'
  $readyButton.disabled = false
})
const resetUI = ()=>{
  //reset header thing _ __ _ __ _ _ _
  document.getElementById('word').innerHTML = ""
  //reset all buttons
  for(let i =0; i < $hintButtons.length; i++){
    $hintButtons[i].disabled = true
    $hintButtons[i].style.backgroundColor = '#C3D8DA'
    $hintButtons[i].style.innerHTML =''
    $hintButtons[i].style.opacity = '0.5'
  }

  //verbal hint reset
  $verbalHintSend.style.display = 'none';

  //show scoreboard
  socket.emit('enable-chat')
}
//start timer for round end ****** NOT DONE!
const startTimer = ()=>{
  const $timer = document.getElementById('timer')
  let time = 30
  let timer = setInterval(()=>{
    time--
    $timer.innerHTML = "Time left: " + time + "s"
    if(time <= 0){
      clearInterval(timer)
    }
  }, 1000)

}
