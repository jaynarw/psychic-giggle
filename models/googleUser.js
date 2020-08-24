const mongoose = require('mongoose');

const userSchema = mongoose.Schema({
  googleId: String,
});

module.exports = mongoose.model('Google User', userSchema);
