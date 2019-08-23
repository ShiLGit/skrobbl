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

const messageTemplate = document.getElementById('message-template').innerHTML
const hintTemplate = document.getElementById('hint-template').innerHTML
const allAvatars = ['../img/avatar_1.png', '../img/avatar_2.png', '../img/avatar_3.png', '../img/avatar_4.png','../img/avatar_5.png', '../img/avatar_6.png']
//const roundHeaderTemplate = document.getElementById('round-header-template').innerHTML
/*
$notifBox.onclick = ()=>{
  $notifBox.style.display = 'none'
}*/

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

  //parse roomName
  qs =qs.replace('=', '0') //set up string so that indexOf() doesn't return indices for old properties
  qs =qs.replace('&', '0')
  start = qs.indexOf('=')
  end = qs.indexOf('&')
  joinReq.roomName = qs.slice(start+1, end)

  //parse username
  qs =qs.replace('=', '0')
  start = qs.indexOf('=')
  joinReq.username = qs.slice(start+1)

  return joinReq
}

//join room iff querystring is valid
const attemptJoin = ()=>{
  const joinReq = parseQS()

  const uri = window.location.toString();
  if (uri.indexOf("?") > 0) {
      const clean_uri = uri.substring(0, uri.indexOf("?"));
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
  console.log(players.length)
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
    username: 'skrobbl bot!!!',
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

socket.on('end-round', ()=>{
  //alert('round ended!')

  //reset all buttons
  for(let i =0; i < $hintButtons.length; i++){
    $hintButtons[i].disabled = true
    $hintButtons[i].style.backgroundColor = '#C3D8DA'
    $hintButtons[i].style.innerHTML =''
    $hintButtons[i].style.opacity = '0.5'
  }

  //verbal hint reset
  const roundEndedHTML = `<div class = "round-header-bg">
                            <p class = "round-header-text">NEW ROUND</p>
                          </div>`
  $hintContainer.insertAdjacentHTML('beforeend', roundEndedHTML)
  $verbalHintSend.style.display = 'none';

  socket.emit('enable-chat')

})

//you're the typer faaaaaam (choose a word)
socket.on('typer', ()=>{
  socket.emit('request-words', (words)=>{
    for(let i = 0; i < 3; i++){
      $wordButtons[i].innerHTML = words[i]
    }
    document.getElementById('modal').style.display = 'inline-block'
  })
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
  console.log(numLetters, letterIndex)

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
  console.log('i = ', i)
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
//DISALLOW GUESSERS TO MESS UP HINTS
socket.on('disable-hints', ()=>{
  for(let i = 0; i < $hintButtons.length; i++){
    $hintButtons[i].disabled = true
  }
})

//VERBAL HINTS: CHECK IF HINT SENT IS VALID, DISPLAY HELPERMSG IF NOT
document.getElementById('hint').onclick = (e)=>{
  const $hintbar = document.getElementById('hintbar')
  e.preventDefault()
  $hintbar.focus()

  $helperMsg.innerHTML = 'please wait - translating message! (will take a few seconds)'
  socket.emit('verbal-hint', $hintbar.value, (ack)=>{
    if(ack.error){
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

const createNotification = (text)=>{
  //animate
  /*
  let lol = 0;
  setInterval(()=>{
    lol+=1
    $notifBox.style.top = lol + "px"
  }, 10)*/

  document.getElementById('notif-text').innerHTML = text
  $notifBox.style.display = 'block'
}


//-------------------misc?----------------------------------------------

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
