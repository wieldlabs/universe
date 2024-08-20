const mongoose = require("mongoose"), schema = mongoose.Schema({
  handle: {
    type: String,
    required: !0,
    unique: !0
  },
  owner: {
    type: String,
    required: !0
  },
  chain: {
    type: String,
    enum: [ "ETH", "OP" ],
    required: !0
  },
  tokenId: {
    type: String,
    required: !0
  }
});

schema.index({
  owner: 1
}), schema.index({
  tokenId: 1
}), schema.index({
  chain: 1
}), module.exports = {
  schema: schema
};