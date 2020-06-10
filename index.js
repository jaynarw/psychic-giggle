/* eslint-disable no-console */
const app = require('express')();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const mongoose = require('mongoose');

const { Schema } = mongoose;
const messageSchema = new Schema({
  to: String,
  from: String,
  message: String,
}, { timestamps: true });
const Message = mongoose.model('Message', messageSchema);

mongoose.connect('mongodb://localhost:27017/chat', { useNewUrlParser: true, useUnifiedTopology: true });

server.listen(80);

app.get('/', (req, res) => {
  res.sendFile(`${__dirname}/index.html`);
});
app.get('/js/socket.io.js', (req, res) => {
  res.sendFile(`${__dirname}/node_modules/socket.io-client/dist/socket.io.js`);
});
app.get('/js/client.js', (req, res) => {
  res.sendFile(`${__dirname}/client.js`);
});

function sendMessagesToClient(msgArr) {
  const messages = [];
  for (let i = 0; i < msgArr.length; i += 1) {
    const {
      from, to, message, updatedAt,
    } = msgArr[i];
    messages.push({
      from, to, message, time: updatedAt.toString(),
    });
  }
  return messages;
}

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', () => {
  io.on('connection', (socket) => {
    socket.emit('connection success');
    socket.on('join', (data) => {
      const from = data.name;
      Message.find({
        $or:
        [
          { from: data.name, to: data.to },
          { to: data.name, from: data.to },
        ],
      }).sort({ updatedAt: 1 }).then((msgArr) => {
        const messages = sendMessagesToClient(msgArr);
        socket.emit('set messages', messages);
      });
      socket.join(data.name);
      socket.on('message', (msg) => {
        const { to, message } = msg;
        if (!from.length || !to.length || !message.length) {
          socket.emit('uh oh');
        } else {
          Message.create({ from, to, message }).then((createdMsg) => {
            console.log('New message created');
            const [newMessage] = sendMessagesToClient([createdMsg]);
            io.sockets.in(from).in(to).emit('set message', newMessage);
          });
        }
      });
    });
  });
  console.log('Connected to db');
});
