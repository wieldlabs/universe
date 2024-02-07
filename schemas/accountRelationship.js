const mongoose = require("mongoose"), schema = mongoose.Schema({
  isFollowing: {
    type: Boolean,
    default: !1
  },
  isBlocking: {
    type: Boolean,
    default: !1
  },
  from: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Account",
    index: !0
  },
  to: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Account",
    index: !0
  }
}, {
  timestamps: !0
});

module.exports = {
  schema: schema
};