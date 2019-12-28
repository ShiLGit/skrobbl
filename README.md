# skrobbl
Multiplayer web game inspired by skribbl.io (made w/ socket.io and nodejs)

Deployed on Heroku : http://skrobbl.herokuapp.com/ 

Server side made with nodejs and socket.io; front-end made with vanilla css/Javascript/HTML (+ some libraries)

------------------------------------------------------------------------------------------

How the game works: 
Win condition: get the most points at the end of the game.

1) A player is chosen to be a typer at the start of each round: they are given a secret word that the other players should guess. Points are given to the typer when correct guesses are made.

2) All other players are guessers. They earn points by correctly guessing the secret word. The game ends when every player has had a turn as the typer. 

>>The typer may give hints to the other players: 
  1) Send a message that gets run through Yandex Translate several times before printing (to muddle its meaning)
  2) Choose relevant words from an array of randomly-populated buttons for other players to see

