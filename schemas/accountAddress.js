const mongoose = require("mongoose"), chainSchema = require("./chain")["schema"], schema = mongoose.Schema({
  address: {
    type: String,
    unique: !0,
    required: !0
  },
  chain: chainSchema,
  account: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Account",
    index: !0
  },
  passKeyId: {
    type: String
  },
  counter: {
    type: Number,
    default: 0
  }
});

module.exports = {
  schema: schema
};