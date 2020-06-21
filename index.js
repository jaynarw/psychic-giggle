const app = require('express')();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const { v4: uuidv4 } = require('uuid');
const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost/test', { useNewUrlParser: true, useUnifiedTopology: true });

http.listen(80);

const liveSessions = {};
const socketSessionMap = {};

io.on('connection', (socket) => {
  socket.on('msg', (data) => {
    const socketId = socket.id;
    if (typeof socketSessionMap[socketId] === 'string' && liveSessions[socketSessionMap[socketId]] === true) {
      io.to(socketSessionMap[socketId]).emit('msg-recieved', data);
    }
  });
  socket.on('create session', (fn) => {
    const newSession = uuidv4();
    liveSessions[newSession] = true;
    socket.join(newSession);
    const socketId = socket.id;
    socketSessionMap[socketId] = newSession;
    fn(newSession);
  });
  socket.on('join session', (data) => {
    if (typeof data === 'string') {
      if (liveSessions[data] === true) {
        socket.join(data);
        const socketId = socket.id;
        socketSessionMap[socketId] = data;
      }
    }
  });
  socket.on('client sync', (data) => {
    const socketId = socket.id;
    if (typeof socketSessionMap[socketId] === 'string' && liveSessions[socketSessionMap[socketId]] === true) {
      socket.to(socketSessionMap[socketId]).emit('perform sync', data);
    }
  });
});
