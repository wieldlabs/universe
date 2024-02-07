const mongoose = require("mongoose"), schema = mongoose.Schema({
  peerId: {
    type: String,
    required: !0,
    index: !0
  },
  username: {
    type: String,
    required: !0
  },
  expiresAt: {
    type: Date
  }
});

module.exports = {
  schema: schema
};