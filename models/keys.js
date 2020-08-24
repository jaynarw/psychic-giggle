const mongoose = require('mongoose');

const { Schema } = mongoose;
const keysSchema = new Schema({
  username: String,
  // registrationId: Number,
  keys: Object,
  maxDeviceId: { type: Number, default: 1 },
}, { timestamps: true });
module.exports = mongoose.model('keys', keysSchema);
