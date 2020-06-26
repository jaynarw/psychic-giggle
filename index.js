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
app.get('/audio', (req, res) => {
  res.sendFile(`${__dirname}/www/audio.html`);
});
app.get('/audio.js', (req, res) => {
  res.sendFile(`${__dirname}/www/audio.js`);
});
app.get('/js/socket.io.js', (req, res) => {
  res.sendFile(`${__dirname}/node_modules/socket.io-client/dist/socket.io.js`);
});

http.listen(80);

const liveSessions = {};
const socketSessionMap = {};
const syncTimeSockets = {};

function validateNickname(nickname) {
  if (typeof nickname === 'string') {
    if (nickname.length === 0) return 'Nickname length should be greater than zero.';
    if (nickname.length > 15) return 'Nickname length should be less than 15.';
    return true;
  } return 'Send me string';
}

io.on('connection', (socket) => {
  socket.on('msg', (data) => {
    const socketId = socket.id;
    if (socketSessionMap[socketId] && typeof socketSessionMap[socketId].session === 'string' && liveSessions[socketSessionMap[socketId].session]) {
      io.to(socketSessionMap[socketId].session).emit('msg-recieved', data);
    }
  });
  socket.on('sync time', () => {
    const socketId = socket.id;
    if (socketSessionMap[socketId] && typeof socketSessionMap[socketId].session === 'string' && liveSessions[socketSessionMap[socketId].session]) {
      if (syncTimeSockets[socketSessionMap[socketId].session]) {
        syncTimeSockets[socketSessionMap[socketId].session].push(socketId);
      } else {
        syncTimeSockets[socketSessionMap[socketId].session] = [socketId];
      }
      socket.to(socketSessionMap[socketId].session).emit('send time');
    }
  });
  socket.on('rec time', (state) => {
    const socketId = socket.id;
    if (socketSessionMap[socketId] && typeof socketSessionMap[socketId].session === 'string' && liveSessions[socketSessionMap[socketId].session] && syncTimeSockets[socketSessionMap[socketId].session]) {
      syncTimeSockets[socketSessionMap[socketId].session].forEach((sinker) => {
        io.to(sinker).emit('set time', state);
      });
      syncTimeSockets[socketSessionMap[socketId].session] = undefined;
    }
  });
  socket.on('create session', (nickname, currentTitle, fn) => {
    if (validateNickname(nickname) === true) {
      const socketId = socket.id;
      if (socketSessionMap[socketId]) {
        fn(socketSessionMap[socketId].session);
      } else {
        const newSession = uuidv4();
        liveSessions[newSession] = { users: 1, currentTitle };
        socket.join(newSession);
        socketSessionMap[socketId] = { session: newSession, nickname };
        fn({ success: true, session: newSession });
      }
    } else {
      fn({ success: false, error: validateNickname(nickname) });
    }
  });
  socket.on('join session', (data, nickname, currentTitle, fn) => {
    if (validateNickname(nickname) === true) {
      if (typeof data === 'string' && liveSessions[data]) {
        if (liveSessions[data].currentTitle === currentTitle) {
          socket.join(data);
          const socketId = socket.id;
          socketSessionMap[socketId] = { session: data, nickname };
          socket.to(data).emit('joined', nickname);
          liveSessions[data].users += 1;
          fn({ success: true });
        } else {
          fn({ success: false, error1: `This session is running ${liveSessions[data].currentTitle}. Can't join this session.` });
        }
      } else {
        fn({ success: false, error1: 'Session ID is invalid' });
      }
    } else {
      fn({ success: false, error2: validateNickname(nickname) });
    }
  });
  socket.on('client sync', (data) => {
    const socketId = socket.id;
    if (socketSessionMap[socketId] && typeof socketSessionMap[socketId].session === 'string' && liveSessions[socketSessionMap[socketId].session]) {
      socket.to(socketSessionMap[socketId].session).emit('perform sync', data);
    }
  });
  socket.on('disconnect', () => {
    if (socketSessionMap[socket.id]) {
      const { session, nickname } = socketSessionMap[socket.id];
      console.log(`${nickname} disconnected`);
      io.to(session).emit('left', nickname);
      if (typeof socketSessionMap[socket.id].session === 'string' && liveSessions[socketSessionMap[socket.id].session]) {
        liveSessions[socketSessionMap[socket.id].session].users -= 1;
        delete socketSessionMap[socket.id];
      }
    }
  });
});
let activeAudioSockets = [];
const audioNsp = io.of('/audio');
audioNsp.on('connection', (socket) => {
  const existingSocket = activeAudioSockets.find(
    (existingSocket) => existingSocket === socket.id,
  );

  if (!existingSocket) {
    activeAudioSockets.push(socket.id);

    socket.emit('update-user-list', {
      users: activeAudioSockets.filter(
        (existingSocket) => existingSocket !== socket.id,
      ),
    });

    socket.broadcast.emit('update-user-list', {
      users: [socket.id],
    });
  }

  //  break;
  socket.on('offer', (data) => {
    if (activeAudioSockets.includes(data.target)) {
      audioNsp.to(data.target).emit('offer', {
        sdp: data.sdp,
        name: socket.id,
      });
    }
  });
  socket.on('answer', (data) => {
    if (activeAudioSockets.includes(data.target)) {
      audioNsp.to(data.target).emit('answer', { sdp: data.sdp });
    } else {
      console.log('Not found socket answer', data.target);
    }
  });
  socket.on('candidate', (data) => {
    if (activeAudioSockets.includes(data.target)) {
      audioNsp.to(data.target).emit('candidate', { candidate: data.candidate });
    } else {
      console.log('Not found socket cnd', data.target);
    }
  });
  socket.on('leave', (data) => {
    if (activeAudioSockets.includes(data.socketid)) {
      audioNsp.to(data.socketid).emit('leave');
    }
  });
  socket.on('disconnect', () => {
    activeAudioSockets = activeAudioSockets.filter(
      (activeSockets) => activeSockets !== socket.id,
    );
    socket.broadcast.emit('remove-user', {
      socketId: socket.id,
    });
  });
});
