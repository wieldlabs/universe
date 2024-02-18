const mongoose = require("mongoose"), questRewardsSchema = new mongoose.Schema({
  title: {
    type: String
  },
  type: {
    type: String,
    enum: [ "ASSET_3D", "SCORE", "IMAGE", "NFT", "RANDOM" ]
  },
  quantity: {
    type: Number,
    default: 1
  },
  rewardId: {
    type: mongoose.Schema.Types.ObjectId,
    index: !0
  },
  isSponsored: {
    type: Boolean,
    default: !1
  },
  category: {
    type: String
  },
  percentage: {
    type: Number,
    default: 0
  }
}), schema = new mongoose.Schema({
  rewards: [ questRewardsSchema ]
});

module.exports = {
  schema: schema
};