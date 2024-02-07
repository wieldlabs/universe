const mongoose = require("mongoose"), schema = mongoose.Schema({
  account: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Account",
    index: !0
  },
  rewardId: {
    type: mongoose.Types.ObjectId,
    index: !0
  },
  rewardType: {
    type: String,
    enum: [ "ASSET_3D", "SCORE", "IMAGE", "NFT", "TOKEN" ],
    index: !0
  },
  quantity: {
    type: Number,
    default: 1
  },
  lastBlockHash: {
    type: String
  }
});

schema.index({
  lastBlockHash: 1,
  rewardType: 1,
  account: 1
}), schema.index({
  lastBlockHash: 1,
  rewardType: 1,
  quantity: 1
}), schema.index({
  rewardType: 1,
  quantity: 1
}), schema.index({
  rewardType: 1,
  account: 1,
  quantity: 1
}), module.exports = {
  schema: schema
};