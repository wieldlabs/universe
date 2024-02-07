const mongoose = require("mongoose"), schema = mongoose.Schema({
  thread: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Thread",
    index: !0
  },
  isAccepted: {
    type: Boolean,
    default: !1,
    index: !0
  },
  userLastSeen: {
    type: Date,
    default: new Date()
  },
  account: {
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