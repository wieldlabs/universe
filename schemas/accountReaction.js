const mongoose = require("mongoose"), reactionSchema = require("./reaction")["schema"], schema = mongoose.Schema({
  reactionObjectType: {
    type: String,
    enum: [ "POST" ],
    index: !0
  },
  reactionObjectTypeId: {
    type: mongoose.Schema.Types.ObjectId,
    index: !0
  },
  reactions: reactionSchema,
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