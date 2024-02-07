const mongoose = require("mongoose"), schema = mongoose.Schema({
  messages: [ {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ThreadMessage"
  } ],
  transactions: [ {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ThreadTransaction"
  } ]
}, {
  timestamps: !0
});

module.exports = {
  schema: schema
};