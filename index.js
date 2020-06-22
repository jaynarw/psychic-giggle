/* eslint-disable no-console */
const app = require('express')();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const { v4: uuidv4 } = require('uuid');
const mongoose = require('mongoose');
const { join } = require('path');

mongoose.connect('mongodb://localhost/test', { useNewUrlParser: true, useUnifiedTopology: true });

app.get('/', (req, res) => {
  res.sendFile(`${__dirname}/www/index.html`);
});
app.get('/js/socket.io.js', (req, res) => {
  res.sendFile(`${__dirname}/node_modules/socket.io-client/dist/socket.io.js`);
});

http.listen(80);

const liveSessions = {};
const socketSessionMap = {};
const syncTimeSockets = {};

io.on('connection', (socket) => {
  socket.on('msg', (data) => {
    const socketId = socket.id;
    if (typeof socketSessionMap[socketId] === 'string' && liveSessions[socketSessionMap[socketId]] === true) {
      io.to(socketSessionMap[socketId]).emit('msg-recieved', data);
    }
  });
  socket.on('sync time', () => {
    const socketId = socket.id;
    if (typeof socketSessionMap[socketId] === 'string' && liveSessions[socketSessionMap[socketId]] === true) {
      if (syncTimeSockets[socketSessionMap[socketId]]) {
        syncTimeSockets[socketSessionMap[socketId]].push(socketId);
      } else {
        syncTimeSockets[socketSessionMap[socketId]] = [socketId];
      }
      socket.to(socketSessionMap[socketId]).emit('send time');
    }
  });
  socket.on('rec time', (state) => {
    const socketId = socket.id;
    if (typeof socketSessionMap[socketId] === 'string' && liveSessions[socketSessionMap[socketId]] === true && syncTimeSockets[socketSessionMap[socketId]]) {
      syncTimeSockets[socketSessionMap[socketId]].forEach((sinker) => {
        io.to(sinker).emit('set time', state);
      });
      syncTimeSockets[socketSessionMap[socketId]] = undefined;
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
  socket.on('join session', (data, fn) => {
    if (typeof data === 'string' && liveSessions[data] === true) {
      socket.join(data);
      const socketId = socket.id;
      socketSessionMap[socketId] = data;
      fn(true);
    } else {
      fn(false);
    }
  });
  socket.on('client sync', (data) => {
    const socketId = socket.id;
    if (typeof socketSessionMap[socketId] === 'string' && liveSessions[socketSessionMap[socketId]] === true) {
      socket.to(socketSessionMap[socketId]).emit('perform sync', data);
    }
  });
});
