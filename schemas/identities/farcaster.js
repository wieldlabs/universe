const mongoose = require("mongoose"), schema = mongoose.Schema({
  directoryUrl: {
    type: String
  },
  avatarUrl: {
    type: String
  },
  username: {
    type: String,
    index: !0
  },
  displayName: {
    type: String
  },
  farcasterAddress: {
    type: String,
    index: !0
  },
  account: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Account",
    index: !0
  }
});

module.exports = {
  schema: schema
};