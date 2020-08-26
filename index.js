/* eslint-disable no-underscore-dangle */
/* eslint-disable no-console */
const remove = require('lodash/remove');
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const admin = require('firebase-admin');
const rateLimit = require('express-rate-limit');
const CryptoJS = require('crypto-js');

const { AES } = CryptoJS;
const app = express();
const http = require('http').Server(app);
const redis = require('redis');

// const client = redis.createClient({
//   password: 'POrpnFJvYT0MiLK1sbNY+EGME1UTxrsRL4/t1atWEfaOeYcYgOOEmCuCGVT+T23QyCRivB1dRi9NiJsc',
// });
const io = require('socket.io')(http);
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const { promisify } = require('util');

const publicDir = path.join(__dirname, 'public');
const sessionLife = 60 * 60 * 24;
// const getAsync = promisify(client.get).bind(client);
// const setAsync = promisify(client.set).bind(client);

/**
 * Crypto AES
 */
function encryptAESforURL(message, secretKey) {
  const cipherWordArray = CryptoJS.enc.Utf8.parse(AES.encrypt(message, secretKey).toString());
  return CryptoJS.enc.Base64.stringify(cipherWordArray);
}
function decryptAESforURL(cipher, secretKey) {
  const wordArray = CryptoJS.enc.Base64.parse(cipher);
  const cipherEncoded = CryptoJS.enc.Utf8.stringify(wordArray);
  return AES.decrypt(cipherEncoded, secretKey).toString(CryptoJS.enc.Utf8);
}

/**
 * Db
 */
const uri = 'mongodb+srv://server:easypass@cluster0.jivtk.mongodb.net/users';
mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true }).then(() => console.log('DB Connection Successfull'))
  .catch((err) => {
    console.error(err);
  });
mongoose.connection.on('connected', () => {
  console.log('db connected');
});

mongoose.connection.on('error', (error) => {
  console.log('Error while connecting to mongodb database:', error);
});
mongoose.connection.once('open', () => {
  console.log('Successfully connected to mongodb database');
});

const UserSchema = new mongoose.Schema({
  username: String,
  hash: String,
});
const RequestSchema = new mongoose.Schema({
  from: String,
  to: String,
  status: Number,
});
const regTokens = new mongoose.Schema({
  username: String,
  registrationToken: String,
  secretKey: String,
});
const Token = mongoose.model('Token', regTokens);
const User = mongoose.model('User', UserSchema);
const Request = mongoose.model('Profile', RequestSchema);

/**
 * Firebase
 */
const serviceAccount = require('./binge-18543-firebase-adminsdk-je19s-d192ebe321.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://binge-18543.firebaseio.com',
});

/**
 * Passport Imports
 */
const { ExtractJwt, Strategy } = require('passport-jwt');
const passport = require('passport');
const fs = require('fs');
const jsonwebtoken = require('jsonwebtoken');

const pathToPUBKey = path.join(__dirname, 'keys', 'public.pem');
const pathToPRIVKey = path.join(__dirname, 'keys', 'private.pem');
const PUB_KEY = fs.readFileSync(pathToPUBKey, 'utf8');
const PRIV_KEY = fs.readFileSync(pathToPRIVKey, 'utf8');

function issueJWT(user) {
  const { _id } = user;
  const expiresIn = '1d';

  const payload = {
    sub: _id,
    iat: Date.now(),
  };

  const signedToken = jsonwebtoken.sign(payload, PRIV_KEY, { expiresIn, algorithm: 'RS256' });

  return {
    token: `Bearer ${signedToken}`,
    expires: expiresIn,
  };
}

const options = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: PUB_KEY,
  algorithms: ['RS256'],
};
passport.use(new Strategy(options, ((jwtPayload, done) => {
  // Since we are here, the JWT is valid!

  // We will assign the `sub` property on the JWT to the database ID of user
  User.findOne({ _id: jwtPayload.sub }, (err, user) => {
    // This flow look familiar?  It is the same as when we implemented
    // the `passport-local` strategy
    if (err) {
      return done(err, false);
    }
    if (user) {
      // Since we are here, the JWT is valid and our user is valid, so we are authorized!
      return done(null, user);
    }
    return done(null, false);
  });
})));


const port = process.env.PORT || 3000;

/**
 * Utils
 */
function sendNotificationByToken(title, msg, tokenDoc) {
  console.log('In sendNotificationByToken');
  const paddedTitle = `DecryptedBingeBox: ${title}`;
  const paddedBody = `DecryptedBingeBox: ${msg}`;
  const cipherTitle = AES.encrypt(paddedTitle, tokenDoc.secretKey).toString();
  const cipherBody = AES.encrypt(paddedBody, tokenDoc.secretKey).toString();
  const message = {
    data: {
      title: cipherTitle,
      body: cipherBody,
    },
    token: tokenDoc.registrationToken,
  };
  admin.messaging().send(message)
    .then((response) => {
    // Response is a message ID string.
      console.log('Successfully sent message:', response);
    })
    .catch((error) => {
      console.log('Error sending message:', error);
    });
}

function validPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

function genPassword(password) {
  return bcrypt.hash(password, 10);
}

process.on('unhandledRejection', (err) => {
  console.error(err);
});

const createAccountLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour window
  max: 20, // start blocking after 5 requests
  message:
    'Too many accounts created from this IP, please try again after an hour',
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

app.get('/', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

app.post('/login', (req, res, next) => {
  if (req.body.username && req.body.password) {
    User.findOne({ username: req.body.username })
      .then((user) => {
        console.log(user);
        if (!user) {
          return res.status(401).json({ success: false, msg: 'could not find user' });
        }
        // Function defined at bottom of app.js
        validPassword(req.body.password, user.hash).then((isValid) => {
          if (isValid) {
            const tokenObject = issueJWT(user);
            return res.status(200).json({ success: true, token: tokenObject.token, expiresIn: tokenObject.expires });
          }
          return res.status(401).json({ success: false, msg: 'you entered the wrong password' });
        });
      })
      .catch((err) => {
        next(err);
      });
  } else {
    res.status(400).json({ success: false, msg: 'Malformed request' });
  }
});

app.post('/register', createAccountLimiter, (req, res, next) => {
  console.log(req.body);
  if (req.body.password && req.body.username) {
    genPassword(req.body.password).then((hash) => {
      console.log(hash);
      const newUser = new User({
        username: req.body.username,
        hash,
      });
      User.findOne({ username: req.body.username })
        .then((user) => {
          if (user) {
            return res.json({ success: false, msg: 'User already exists!' });
          }
          newUser.save()
            .then((savedUser) => {
              console.log('Success register');
              console.log(savedUser);
              const tokenObject = issueJWT(savedUser);
              return res.status(200).json({ success: true, token: tokenObject.token, expiresIn: tokenObject.expires });
            })
            .catch((err) => next(err));
        });
    });
  } else {
    res.status(400).json({ success: false, msg: 'Malformed request' });
  }
});

app.post('/sendRequest', passport.authenticate('jwt', { session: false }), (req, res) => {
  if (req.body.contactToAdd) {
    if (req.body.contactToAdd === req.user.username) {
      return res.status(200).json({ success: false, msg: 'Cannot add yourself' });
    }
    User.findOne({ username: req.body.contactToAdd })
      .then((user) => {
        if (!user) {
          return res.status(200).json({ success: false, msg: 'Could not find user' });
        }
        if (req.user.username !== req.body.contactToAdd) {
          Request.findOne({
            $or:
            [
              { from: req.body.contactToAdd, to: req.user.username },
              { to: req.body.contactToAdd, from: req.user.username },
            ],
          }).then((request) => {
            if (request) {
              if (request.status === 1) {
                return res.status(200).json({ success: true, msg: 'Already Friends' });
              } if (request.status === 0) {
                if (request.to === req.user.username) {
                  Request.findOneAndUpdate({ to: req.user.username, from: req.body.contactToAdd }, { status: 1 }, { useFindAndModify: false, new: true }, (err, res) => {
                    if (err) throw err;
                  });
                  return res.status(200).json({ success: true, msg: 'Friends' });
                }
                return res.status(200).json({ success: true, msg: 'Already Sent Request' });
              } if (request.status === -1) {
                return res.status(200).json({ success: true, msg: 'Already Sent Request' });
              }
            } else {
              const newRequest = new Request({
                from: req.user.username,
                to: req.body.contactToAdd,
                status: 0,
              });
              newRequest.save().then(() => {
                Token.find({ username: req.body.contactToAdd }, (err, res2) => {
                  console.log('Saved');
                  console.log(res2);
                  if (err) { throw err; }
                  res2.forEach(sendNotificationByToken.bind(this, 'New friend request', `${req.user.username} sent you friend request`));
                });
              });
              return res.status(200).json({ success: true, msg: 'Sent Request' });
            }
          });
        } else {
          return res.status(200).json({ success: false, msg: 'Cannot send request to yourself' });
        }
      });
    console.log(req.user);
  }
});

app.post('/logout', passport.authenticate('jwt', { session: false }), (req, res) => {
  Token.findOneAndRemove({ username: req.user.username, secretKey: req.headers.authorization.slice('Bearer '.length) }, { useFindAndModify: false }).then((res) => {
    console.log(`Succesfully removed ${req.user.username}`);
    console.log(res);
  });
  res.status(200).json();
});

app.post('/registerFCMToken', passport.authenticate('jwt', { session: false }), (req, res) => {
  if (req.body.registrationToken
    && typeof req.body.registrationToken === 'string'
    && req.body.registrationToken.length > 0) {
    console.log(req.headers.authorization.slice('Bearer '.length));
    Token.findOneAndUpdate({ username: req.user.username, registrationToken: req.body.registrationToken }, {
      username: req.user.username,
      registrationToken: req.body.registrationToken,
      secretKey: req.headers.authorization.slice('Bearer '.length),
    }, { upsert: true, useFindAndModify: false }).then((res2) => {
      console.log(`Registered token ${req.body.registrationToken}`);
      console.log(res2);
    });
    return res.status(200).json({ success: true });
  }
  return res.status(400).json({ success: false });
});

app.get('/getFriendRequests', passport.authenticate('jwt', { session: false }), (req, res) => {
  const key = req.headers.authorization;
  Request.find({ to: req.user.username, status: 0 }, (err, results) => {
    if (err) {
      res.status(500).json();
      throw err;
    }
    const responseObj = [];
    results.forEach((request) => {
      const id = encryptAESforURL(request._id.toString(), key);
      responseObj.push({
        from: request.from,
        id,
      });
    });
    return res.status(200).json(responseObj);
  });
});

app.get('/acceptRequest', passport.authenticate('jwt', { session: false }), (req, res) => {
  const { id, accept } = req.query;
  console.log(req.user.username);
  console.log(id);
  if (id) {
    const status = accept === 'false' ? -1 : 1;
    const _id = decryptAESforURL(id, req.headers.authorization);
    Request.findOneAndUpdate({ _id }, { status }, { useFindAndModify: false, new: true }, (err, result) => {
      console.log(result);
      if (err) {
        res.status(500).json();
      }
      if (result) {
        if (result.status === 1) {
          Token.find({ username: result.from }, (err2, tokens) => {
            console.log(`Sending notificaiton to ${result.from}`);
            console.log(tokens);
            if (err2) { throw err2; }
            tokens.forEach(sendNotificationByToken.bind(this, 'Friend Request Accepted', `${req.user.username} accepted your friend request`));
          });
        }
        res.status(200).json({ success: true });
      } else {
        res.status(401).json();
      }
    });
  } else {
    res.status(400).json();
  }
});

app.get('/getFriends', passport.authenticate('jwt', { session: false }), (req, res) => {
  const key = `Friends: ${req.headers.authorization}`;
  Request.find({
    $or:
    [
      { to: req.user.username, status: 1 },
      { from: req.user.username, status: 1 },
    ],
  }, (err, results) => {
    console.log(results, `'${req.user.username}'`);
    if (err) {
      res.status(500).json();
      throw err;
    }
    const responseObj = [];
    results.forEach((request) => {
      const id = encryptAESforURL(request._id.toString(), key);
      responseObj.push({
        name: request.from,
        id,
      });
    });
    res.status(200).json(responseObj);
  });
});

app.get('/inviteFriend', passport.authenticate('jwt', { session: false }), (req, res) => {
  const key = `Friends: ${req.headers.authorization}`;
  const {
    id, sessionId, url, movie, provider,
  } = req.query;
  const notificaitonBody = JSON.stringify({
    sessionId,
    url,
    movie,
    provider,
    from: req.user.username,
  });
  const _id = decryptAESforURL(id, key);
  Request.findOne({
    $or:
    [
      { _id, to: req.user.username, status: 1 },
      { _id, from: req.user.username, status: 1 },
    ],
  }, (err, result) => {
    if (err) throw err;
    if (result) {
      let username = null;
      if (result.to === req.user.username) {
        username = result.from;
      } else {
        username = result.to;
      }
      Token.find({ username }, (err2, tokens) => {
        console.log(`Sending notificaiton to ${username}`);
        console.log(tokens);
        if (err2) { throw err2; }
        tokens.forEach(sendNotificationByToken.bind(this, 'Invitation', notificaitonBody));
        res.status(200).json();
      });
    }
  });
});

app.use('/', express.static(publicDir));

http.listen(port);

function getLiveSession(sessionId) {
  return getAsync(`livesession:${sessionId}`);
}

function setLiveSession(sessionId, sessionInfo) {
  return setAsync(`livesession:${sessionId}`, JSON.stringify(sessionInfo), 'KEEPTTL');
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
