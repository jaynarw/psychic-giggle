/* eslint-disable no-console */
const remove = require('lodash/remove');
const express = require('express');

const app = express();
const http = require('http').Server(app);
const redis = require('redis');

const client = redis.createClient({
  password: 'POrpnFJvYT0MiLK1sbNY+EGME1UTxrsRL4/t1atWEfaOeYcYgOOEmCuCGVT+T23QyCRivB1dRi9NiJsc',
});
const io = require('socket.io')(http);
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const { promisify } = require('util');

const publicDir = path.join(__dirname, 'public');
const sessionLife = 60 * 60 * 24;
const getAsync = promisify(client.get).bind(client);
const setAsync = promisify(client.set).bind(client);

const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

app.use('/', express.static(publicDir));

http.listen(port);

function getLiveSession(sessionId) {
  return getAsync(`livesession:${sessionId}`).then(console.log).catch(console.error);
}

function setLiveSession(sessionId, sessionInfo) {
  return setAsync(`livesession:${sessionId}`, JSON.stringify(sessionInfo), 'KEEPTTL').then(console.log).catch(console.error);
}

function validateNickname(nickname) {
  if (typeof nickname === 'string') {
    if (nickname.trim() === '') return 'Nickname cannot be blank';
    if (nickname.length === 0) return 'Nickname length should be greater than zero.';
    if (nickname.length > 15) return 'Nickname length should be less than 15.';
    return true;
  } return 'Send me string';
}

io.on('connection', (socket) => {
  socket.emit('get-session');

  socket.on('create session', (nickname, currentTitle, fn) => {
    if (validateNickname(nickname) === true) {
      client.hgetall(`socket-data:${socket.id}`, (err, reply) => {
        if (err) throw err;
        if (reply) {
          fn(reply.session);
        } else {
          const newSession = uuidv4().slice(0, 6);
          const sessionInfo = { users: 1, currentTitle, userList: [{ id: socket.id, nickname }] };
          client.setex(`livesession:${newSession}`, sessionLife, JSON.stringify(sessionInfo), redis.print);
          socket.join(newSession);
          client.hmset(`socket-data:${socket.id}`, 'session', newSession, 'nickname', nickname, redis.print);
          fn({ success: true, session: newSession });
          io.in(newSession).emit('update users list', sessionInfo.userList);
        }
      });
    } else {
      fn({ success: false, error: validateNickname(nickname) });
    }
  });

  socket.on('join session', (sessionId, nickname, currentTitle, fn) => {
    if (validateNickname(nickname) === true) {
      if (typeof sessionId === 'string') {
        getLiveSession(sessionId).then((res) => {
          if (res) {
            const sessionInfo = JSON.parse(res);
            if (sessionInfo.currentTitle === currentTitle) {
              socket.join(sessionId);
              client.hmset(`socket-data:${socket.id}`, 'session', sessionId, 'nickname', nickname, redis.print);
              socket.to(sessionId).emit('joined', nickname);
              sessionInfo.users += 1;
              sessionInfo.userList.push({ id: socket.id, nickname });
              io.in(sessionId).emit('update users list', sessionInfo.userList);
              fn({ success: true });
              setLiveSession(sessionId, sessionInfo).then(console.log);
            } else {
              fn({ success: false, error1: `This session is running ${sessionInfo.currentTitle}. Can't join this session.` });
            }
          } else {
            fn({ success: false, error1: 'Session ID is invalid' });
          }
        });
      }
    } else {
      fn({ success: false, error2: validateNickname(nickname) });
    }
  });

  socket.on('client sync', (data) => {
    client.hgetall(`socket-data:${socket.id}`, (err, socketData) => {
      if (err) throw err;
      if (socketData) socket.to(socketData.session).emit('perform sync', { ...data, nickname: socketData.nickname });
    });
  });

  socket.on('typing', () => {
    client.hgetall(`socket-data:${socket.id}`, (err, socketData) => {
      if (err) throw err;
      if (socketData) socket.to(socketData.session).emit('typing', socketData.nickname);
    });
  });

  socket.on('msg', (message) => {
    client.hgetall(`socket-data:${socket.id}`, (err, socketData) => {
      if (err) throw err;
      if (socketData) {
        socket.to(socketData.session).emit('msg-recieved', {
          nickname: socketData.nickname,
          message,
        });
        socket.emit('msg-recieved', {
          fromMe: true,
          nickname: socketData.nickname,
          message,
        });
      }
    });
  });

  socket.on('gif msg', (gifId) => {
    client.hgetall(`socket-data:${socket.id}`, (err, socketData) => {
      if (err) throw err;
      if (socketData) {
        socket.to(socketData.session).emit('gif-msg-recieved', {
          nickname: socketData.nickname,
          gifId,
        });
        socket.emit('gif-msg-recieved', {
          fromMe: true,
          nickname: socketData.nickname,
          gifId,
        });
      }
    });
  });

  socket.on('sync time', () => {
    client.hget(`socket-data:${socket.id}`, 'session', (err, sessionId) => {
      if (err) throw err;
      if (sessionId) {
        client.lpush(`sync-time-sockets:${sessionId}`, socket.id);
        socket.to(sessionId).emit('send time');
      }
    });
  });

  socket.on('rec time', (state) => {
    client.hget(`socket-data:${socket.id}`, 'session', (err, sessionId) => {
      if (err) throw err;
      if (sessionId) {
        client.lrange(`sync-time-sockets:${sessionId}`, 0, -1, (error, result) => {
          if (error) throw error;
          if (result) {
            result.forEach((sinker) => {
              io.to(sinker).emit('set time', state);
            });
            client.del(`sync-time-sockets:${sessionId}`);
          }
        });
      }
    });
  });

  socket.on('offer', (data) => {
    client.hgetall(`socket-data:${socket.id}`, (err, result) => {
      if (err) throw err;
      if (result) {
        io.to(data.target).emit('offer', {
          sdp: data.sdp,
          name: socket.id,
          nicknameFrom: result.nickname,
        });
      }
    });
  });

  socket.on('answer', (data) => {
    client.hgetall(`socket-data:${socket.id}`, (err, result) => {
      if (err) throw err;
      if (result) {
        io.to(data.target).emit('answer', {
          sdp: data.sdp,
          name: socket.id,
          nicknameFrom: result.nickname,
        });
      }
    });
  });

  socket.on('hangup', (data) => {
    client.hgetall(`socket-data:${socket.id}`, (err, result) => {
      if (err) throw err;
      if (result) {
        io.to(data.target).emit('hangup', {
          name: socket.id,
          nicknameFrom: result.nickname,
        });
      }
    });
  });

  socket.on('candidate', (data) => {
    client.hgetall(`socket-data:${socket.id}`, (err, result) => {
      if (err) throw err;
      if (result) {
        io.to(data.target).emit('candidate', {
          name: socket.id,
          candidate: data.candidate,
        });
      }
    });
  });

  socket.on('disconnect', () => {
    client.hgetall(`socket-data:${socket.id}`, (err, result) => {
      if (err) throw err;
      if (result) {
        const { session, nickname } = result;
        io.to(session).emit('left', nickname);
        getLiveSession(session).then((res) => {
          if (res) {
            const sessionInfo = JSON.parse(res);
            sessionInfo.users -= 1;
            remove(sessionInfo.userList, (user) => (user.id === socket.id));
            io.in(session).emit('update users list', sessionInfo.userList);
            setLiveSession(session, sessionInfo);
          }
        });
        client.del(`socket-data:${socket.id}`);
      }
    });
  });
});
