# skrobbl
Multiplayer web game inspired by skribbl.io (made w/ socket.io and nodejs)

I'M GONNA DEPLOY THIS TO HEROKU EVENTUALLY: [link]

Server side made with nodejs and socket.io; front-end made with pure css/Javascript/HTML

------------------------------------------------------------------------------------------

How the game works: 

Win condition: have the most points at the end of the game

ROLES
-Typer (role): one per round. Choose one of three words for other players to guess. The game ends when every player has had a turn as the typer.

-Guesser (role): guess the word the typer has chosen. The earlier you make a correct guess, the higher your score.

HINTS
-Button hints: an array of twelve buttons will be populated with random words at the beginning of the round. The typer will pick those that are relevant to the secret word as a hint to the other players; they will be able to see the typer's choices.

-Sentence hints: the typer can type clues for the other guessers to see. However, they get run through Yandex translate (translation api) -multiple times before being printed (to muddle their meaning)

