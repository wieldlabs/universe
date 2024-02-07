const mongoose = require("mongoose"), schema = mongoose.Schema({
  recipientId: {
    type: mongoose.Schema.Types.ObjectId,
    index: !0,
    required: !0
  },
  recipientType: {
    type: Number,
    index: !0,
    required: !0
  },
  slug: {
    type: String,
    index: !0,
    required: !0
  },
  channel: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Channel",
    index: !0,
    required: !0
  }
}, {
  timestamps: !0
});

module.exports = {
  schema: schema
};