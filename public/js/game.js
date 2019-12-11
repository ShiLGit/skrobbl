
//IIFE BECAUSE OF A SINGLE (NOW 2) STOOOOOOOOOPID GLOBAL TIEMR
(function() {
'use strict';
const socket = io() //connect

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
const $hintButtons = document.getElementsByClassName('hintbtn')
const $notifBox = document.getElementById('notif')
const $word = document.getElementById('word')

const messageTemplate = document.getElementById('message-template').innerHTML
const hintTemplate = document.getElementById('hint-template').innerHTML
const allAvatars = ['../img/avatar_1.png', '../img/avatar_2.png', '../img/avatar_3.png', '../img/avatar_4.png','../img/avatar_5.png', '../img/avatar_6.png']

let timer = null
let afkTimer = null
let notifTimer = null
const sfxClick = new Audio("../sfx/click.wav")
const sfxNotif = new Audio("../sfx/notif.wav")
const sfxMsg = new Audio("../sfx/msg.wav")
const sfxWin = new Audio("../sfx/optimistic_notif.wav")
//********************CUSTOM FUNCTIONS***************************************

//--------------JOINING THE ROOM ----------------
//replace char in 'str' at index of 'index' with 'char' (LOL!!!!!!!!!!!!!)
const replaceAt=(str, index, char)=>{
  let toReturn = ""
  for(let i = 0; i < str.length; i++){
    if(i === index){
      toReturn += char
    }else{
      toReturn += str[i]
    }
  }
  return toReturn
}
//parse querystring to create user object
const parseQS = () =>{
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

  /*remove qs from url*/
  const url = window.location.toString();
  if (url.indexOf("game.html") > 0) {
      const newUrl = url.substring(0, url.indexOf("game.html"));
      window.history.replaceState({}, document.title, newUrl);
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
      socket.emit('join', player, (errAck)=>{//name already exists (join calls player.addPlayer())
        if(errAck){
            alert(errAck)
            location.href= '/'
          }
      })
    }

    $extrainfo.innerHTML = "Translations by Yandex<br/>Room name: " + player.roomName.toUpperCase()
    //if room creator enable start button
    let qs = parseQS()
  })
}

//----------------------WORD BLANK TIMER + NOTIFICATIONS
//header text calculate
const generateBlanks = (secretWord)=>{

  let word = secretWord.toUpperCase()
  let chars = []
  let letterCount = Math.ceil(word.length * 0.3)
  const incrementSize = Math.floor(word.length / letterCount)
  let revealIndex = incrementSize
  let toPrint = ""

  for(let i = 0; i < word.length; i++){
    chars[i] = '_'
  }

  do{
    if(revealIndex > word.length - 1){
      revealIndex -= word.length
    }
    chars[revealIndex] = word[revealIndex]
    revealIndex += incrementSize
    letterCount--
  }while(letterCount > 0)

  for(let i = 0; i<word.length; i++){
    toPrint += chars[i]
  }

  return toPrint
}

//start timer for letter revealing
const revealTimer = (word)=>{
  const fullWord = word.toUpperCase()
  const $timer = document.getElementById('timer')
  let newHTML = $word.innerHTML
  let time = 10
  let revealFrom = 0

  timer = setInterval(()=>{
    $timer.innerHTML = `Letter reveal in: ${--time}`

    if(time <= 0){
      //letterReveal
      if(revealFrom % 2 === 1){ //reveal from front
        for(let i = 0; i < fullWord.length; i++){

          if(newHTML[i] === '_'){
            revealFrom++
            newHTML = replaceAt(newHTML, i, fullWord[i])
            $word.innerHTML = newHTML
            time = 10

            //whole word has been revealed
            if(newHTML.indexOf('_') === -1){
              let iFailed = fullWord + '©'
              socket.emit('message', iFailed)
              clearInterval(timer)
            }
            break
          }
        }
      }else if (revealFrom % 2 === 0){//reveal from end of word
        for(let i = fullWord.length - 1; i > -1; i--){
          if(newHTML[i] === '_'){
            revealFrom++
            newHTML = replaceAt(newHTML, i, fullWord[i])
            console.log('new: ', newHTML)
            $word.innerHTML = newHTML
            time = 10

            //whole word has been revealed
            if(newHTML.indexOf('_') === -1)
            {
              let iFailed = fullWord + '©'
              socket.emit('message', iFailed)
              clearInterval(timer)
            }
            break
          }
        }
      }
    }
  },1050)
}
$notifBox.onclick = ()=>{
  sfxClick.currentTime = 0
  sfxClick.play()

  if($notifBox.getAttribute('data-exit-type')==='click'){
    $notifBox.style.display = 'none'
  }
}

//create a notification
const notification = (titleText, bodyText, special)=>{
  $notifBox.style.backgroundColor = 'white'
  $notifBox.setAttribute('data-exit-type','click')

  const html = document.getElementById('default-slide').innerHTML
  $notifBox.innerHTML = html

  const $title = document.getElementById('notif-header')
  const $body = document.getElementById('notif-body')

  $title.innerHTML = titleText
  $body.innerHTML = bodyText
  let timeout = 6000
  clearInterval(notifTimer)

  //create game-end notification if special = 'winner'
  if(special === 'winner'){
    $notifBox.style.backgroundColor = '#F9DBBD'
    timeout = 20000
  }
  $notifBox.style.display = 'block'
  notifTimer = setTimeout(()=>{
    $notifBox.style.display = 'none'
  }, timeout)
}

//make speshul click-through tutorial notifications
const tutorial = ()=>{
  sfxNotif.currentTime = 0;
 sfxNotif.play()
  //'wrap' a number to min value if it exceeds max val
  const wrapAround = (num, min, max)=>{
    if(num > max){
      return min
    }
    return num
  }

  //display a help notification that doesn't have a timeout
  $notifBox.setAttribute('data-exit-type', '')
  $notifBox.style.backgroundColor = "white"
  $notifBox.innerHTML = ""
  clearInterval(notifTimer)//make sure help screen doesn't time out because ot previous notification() calls that set a timeout


  //generate new elements unique to tutorial notifications
  $notifBox.insertAdjacentHTML('afterbegin', '<div id = "help-slides-container" data-slide-index = "0"></div>')
  const $slideContainer = document.getElementById('help-slides-container')

  $notifBox.insertAdjacentHTML('beforeend',
    `<span id = "help-buttons">
      <button id = 'close-help'>Close Help</button><button id = 'next-help'>Next: Slide</button><button id = 'ToC'>Table of Contents</button>
    </span>`)

  const $nextButton = document.getElementById('next-help')
  document.getElementById('close-help').onclick = ()=>{
      sfxClick.currentTime = 0
      sfxClick.play()
      $notifBox.style.display = 'none'
    }

  //get html for all help slides; render first slide onto notif
  const slides = []
  const slideTemplates = document.getElementsByClassName('help-slides')
  for(let i = 0; i < slideTemplates.length; i++){
      slides.push(slideTemplates[i].innerHTML)
  }
  $slideContainer.innerHTML = slides[0]


  document.getElementById('ToC').onclick = ()=>{

    sfxClick.currentTime = 0
    sfxClick.play()
    $slideContainer.innerHTML = slides[0]
    for(let i = 0; i < sections.length; i++){
      sections[i].onclick = ()=>{
        sfxClick.currentTime = 0
        sfxClick.play()
        $slideContainer.innerHTML = slides[i + 1] //i + 1 because table of contents slide is the 0th element
      }
      $nextButton.innerHTML = "Next Slide"
    }}
  //make section-clikcs on table of contents load their respective html slide
  const sections = document.getElementsByClassName('section')
  for(let i = 0; i < sections.length; i++){
    sections[i].onclick = ()=>{
      sfxClick.currentTime = 0
      sfxClick.play()
      $slideContainer.innerHTML = slides[i + 1] //i + 1 because table of contents slide is the 0th element
      $slideContainer.setAttribute('data-slide-index', `${i}`)
      console.log($slideContainer.getAttribute('data-slide-index'))
    }
  }

  //go to next slide of tutorial
  $nextButton.onclick = ()=>{
    sfxClick.currentTime = 0
    sfxClick.play()
    let currIndex = parseInt($slideContainer.getAttribute('data-slide-index'))
    console.log(currIndex);
    $slideContainer.innerHTML = slides[wrapAround(currIndex+1, 1, 3)]
    $slideContainer.setAttribute('data-slide-index', wrapAround(currIndex+1, 1, 3))
  }

  $notifBox.style.display = 'block'
}
//****************************STEP 1: JOIN ROOM ************************************

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
  sfxMsg.currentTime = 0;
  sfxMsg.play()
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
    if(text === 'The game has already started - wait until next round to participate.'){
      $readyButton.disabled = true
    }
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

//*************************STARTING THE GAME ****************************************
//------------------choosing a word------------------------------------
$readyButton.onclick = ()=>{
  $readyButton.disabled = true;
  socket.emit('ready', (ackError)=>{
    if(ackError){
      notification("Can't start game", "Need 2 or more people to play!!")
      $readyButton.disabled = false;
    }
  })
}
socket.on('update-ready-button', ({ready, needed})=>{
  sfxNotif.currentTime = 0
  sfxNotif.play()
  $readyButton.innerHTML = `${ready}/${needed} ready`
})

socket.on('end-round', ({players, word})=>{
  resetUI()
  clearInterval(timer)
  //show round end on hint container
  const roundEndedHTML = `<div class = "round-status-bg">
                            <p class = "round-status-text">NEW ROUND</p>
                          </div>`
  $hintContainer.insertAdjacentHTML('beforeend', roundEndedHTML)
  $hintContainer.scrollTop = $hintContainer.scrollHeight
  let html = `<p style = "bold">The word was ${word}</p><p>Current leaderboard:</p>`

  for(let i = 0; i<players.length; i++){
    html += `${players[i].name}: ${players[i].score}pts<br/>`
  }
  notification('Round has ended!', html, 0)
})

//you're the typer faaaaaam (choose a word)
socket.on('typer', ()=>{
  $notifBox.style.display = 'none'
  socket.emit('request-words', (words)=>{
    for(let i = 0; i < 3; i++){
      $wordButtons[i].innerHTML = words[i]
    }
    document.getElementById('modal').style.display = 'inline-block'
  })
  for(let i = 0; i< $hintButtons.length; i++){
    $hintButtons[i].disabled = false
  }

  //kicks typer if afk
  afkTimer = setTimeout(()=>{
    location.href = '/'
  }, 30000)
})

//SET LISTENER ON ALL MODAL BUTTONS FOR ONCLICK EVENT
for (let i = 0; i < $wordButtons.length; i++) {
    $wordButtons[i].onclick = ()=>{
        socket.emit('word-chosen', $wordButtons[i].innerHTML)
        document.getElementById('modal').style.display = 'none'
        $verbalHintSend.style.display = 'block'
        clearInterval(afkTimer)
    }
}

//----------------displaying words + hints -------------------------
//render header hint (_ _ _ _ _ ...) on your screen
socket.on('update-word', (secretWord)=>{
  const word = secretWord.toUpperCase()

  //change header text
  $word.innerHTML = generateBlanks(word)
  $notifBox.style.display = 'none'
  revealTimer(word)
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

Array.from($hintButtons).forEach((b)=>{
  b.onclick = ()=>{
    sfxClick.currentTime = 0
    sfxClick.play()
    socket.emit('chose-hint', b.getAttribute('data-hint-index') - 1)
  }
})

//VERBAL HINTS: CHECK IF HINT SENT IS VALID, DISPLAY HELPERMSG IF NOT
document.getElementById('hint').onclick = (e)=>{
  const $hintbar = document.getElementById('hintbar')
  e.preventDefault()
  $hintbar.focus()

  $helperMsg.innerHTML = 'Please wait - translating message! (will take a few seconds)'
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
  $hintContainer.scrollTop = $hintContainer.scrollHeight
  $helperMsg.innerHTML = 'Message sent!'
})

//-------------------misc?----------------------------------------------
socket.on('end-game', ({players, word})=>{
  sfxWin.currentTime = 0
  sfxWin.play()
  resetUI()

  //show round end on hint container
  const roundEndedHTML = `<div class = "round-status-bg">
                              <p class = "round-status-text">GAME ENDED</p>
                            </div>`
  $hintContainer.insertAdjacentHTML('beforeend', roundEndedHTML)
  $hintContainer.scrollTop = $hintContainer.scrollHeight
  let html = `<p style = "bold">The word was ${word}</p><p>Remaining leaderboard:</p>`

  for(let i = 1; i<players.length; i++){
    html += `${players[i].name}: ${players[i].score}pts<br/>`
  }
  notification(`${players[0].name} wins!`, html, 'winner')

  const htmlMsg =
        `<div class = "speshul">
          <h4 class = "username">SKROBBL</h4>
          <p class = "msg-text">${players[0].name} wins! Press 'PLAY AGAIN' to play another game.</p>
        </div>`

  $messageContainer.insertAdjacentHTML('beforeend', htmlMsg)
  $messageContainer.scrollTop = $messageContainer.scrollHeight
  $readyButton.innerHTML = 'PLAY AGAIN'
  $readyButton.disabled = false
})
const resetUI = ()=>{
  document.getElementById('timer').innerHTML = ''

  //reset header thing _ __ _ __ _ _ _
  $word.innerHTML = ""
  //reset all buttons
  for(let i =0; i < $hintButtons.length; i++){
    $hintButtons[i].disabled = true
    $hintButtons[i].style.backgroundColor = '#160F29'
    $hintButtons[i].style.innerHTML =''
    $hintButtons[i].style.opacity = '0.8'
  }

  //verbal hint reset
  $verbalHintSend.style.display = 'none';

  //show scoreboard
  socket.emit('enable-chat')
}

document.getElementById('help').onclick = ()=>{
  tutorial()
}

}());//end of iife
