const express = require('express');
const app = express();
const port = process.env.PORT || 3000;
const path = require('path');
const fs = require('fs');
const clientFilesPath = path.join(__dirname, 'client');

let hasGameStarted = false;

let questionSequence = [];

//setup websocket server
const socketIO = require("socket.io");
const http = require('http');
let players = new Map();

const server = http.createServer(app);
const io = socketIO(server, { cors: { origin: "*" } });

app.use(express.static(clientFilesPath));

app.get('/', (req, res) => {
  const filePath = path.join(__dirname,"Client","index.html");
  res.sendFile(filePath);
});

app.get('/questions', (req, res) => {
  const filePath = path.join(__dirname, 'Server','questions.json');
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      console.error(err);
      res.status(500).send('Internal Server Error');
      return;
    }
    const jsonData = JSON.parse(data);
    res.json(jsonData);
  });
});

app.get('/question-sequence', (req, res) => {
  // Generate an array of question sequence
  if(questionSequence.length <= 0){
    questionSequence = generateRandomSequence(3);
  }
  // Send the question sequence as a JSON response
  res.json(questionSequence);
});

app.get('/resetServerVariables',(req,res)=>{
  res.send(resetServerVariables());
});

function generateRandomSequence(questionNumber) {
  const arr = [];

  while (arr.length < questionNumber) {
    const randomNumber = Math.floor(Math.random() * 10) + 1;
    if (!arr.includes(randomNumber)) {
      arr.push(randomNumber);
    }
  }
  return arr;
}


io.on('connection', socket => {

  if (!hasGameStarted) {
    let tempPlayer = {
      clientId: socket.id,
      playerName: "",
      isReady: false,
      score: 0,
      gameFinished: false,
    }
    players.set(socket.id,tempPlayer);
    socket.emit("this-player", tempPlayer);
  }

  io.emit('existing-players', JSON.stringify(Array.from(players)));

  socket.on('update-player-details', player => {
    players.set(player.clientId, player);
    io.emit('update-player-details', player);
  });

  socket.on("ready-to-start-game", (player) => {
    
    players.get(player.clientId).isReady = true;

    if (areAllReady()) {
      io.emit("start-the-game");
      hasGameStarted = true;
    }
  });

  socket.on("show-leaderboard",()=>{
    let shouldDisplayLeaderboard = true;
    players.forEach((player) => {
      if(!player.gameFinished){
        shouldDisplayLeaderboard = false;
      }
    });
    if(shouldDisplayLeaderboard){
      hasGameStarted = false;
      io.emit("show-leaderboard",JSON.stringify(Array.from(players)));
    }
  });

  socket.on('disconnect', () => {
    players.delete(socket.id);
    io.emit("player-disconnected",socket.id);
    });
});

function areAllReady(){
  let allReady = true;
  let it = players.entries();
  for(const entry of it){
    if(!entry[1].isReady){
      allReady = false;
    }
  }
  return allReady;
}

function resetServerVariables(){
  //reset all the server variables here.
  players.clear();
  
  if(questionSequence.length > 0){
    questionSequence.length = 0;
  }

  return "server Variables Reset Done";
}

server.listen(port, () => {
  console.log("Server running.....");
});