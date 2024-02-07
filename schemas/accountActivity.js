const mongoose = require("mongoose"), schema = mongoose.Schema({
  lastSeen: {
    type: Date,
    default: () => new Date()
  },
  isWhitelisted: {
    type: Boolean,
    default: !1
  },
  isOnboarded: {
    type: Boolean,
    default: !1
  },
  isEmailVerified: {
    type: Boolean,
    default: !1
  }
});

module.exports = {
  schema: schema
};