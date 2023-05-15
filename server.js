const express = require('express');
const app = express();
const port = process.env.PORT || 8080;
const path = require('path');
const fs = require('fs');
const cors = require('cors')

let hasGameStarted = false;

let questionSequence = [];

//setup websocket server
const socketIO = require("socket.io");
const http = require('http');
let players = new Map();

const server = http.createServer(app);
const io = socketIO(server, { cors: { origin: "*" } });
app.use(cors())

app.get('/', (req, res) => {
  res.send("Backend running");
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
  questionSequence = generateRandomSequence(1);
  // Send the question sequence as a JSON response
  res.json(questionSequence);
});

app.get('/resetServerVariables',(req,res)=>{
  res.send(resetServerVariables());
});

app.get('/test',(req,res)=>{
  res.status(200).json({"message":"test"});
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
  if(hasGameStarted){
    socket.emit('cannot-connect-now',"hasGameStarted");
    return;
  }
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
    if(players.size <= 1){
      socket.emit("only-one-player");
      return;
    }
    players.get(player.clientId).isReady = true;
    socket.emit("ok-marked-you-ready");

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
      io.emit("show-leaderboard",JSON.stringify(Array.from(players)));
    }
  });

  socket.on('disconnect', () => {
    players.delete(socket.id);
    io.emit("player-disconnected",socket.id);
    if(players.size == 0){
      resetServerVariables();
    }
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
  hasGameStarted = false;

  return "server Variables Reset Done";
}

server.listen(port, () => {
  console.log("Server running at.....", port);
});