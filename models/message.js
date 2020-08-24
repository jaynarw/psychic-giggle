const mongoose = require('mongoose');

const { Schema } = mongoose;
const messageSchema = new Schema({
  to: String,
  from: String,
  message: String,
}, { timestamps: true });
module.exports = mongoose.model('Message', messageSchema);
