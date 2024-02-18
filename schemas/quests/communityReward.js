const mongoose = require("mongoose"), questRewardsSchema = require("./questReward")["schema"], schema = mongoose.Schema({
  isArchived: {
    type: Boolean,
    default: !1
  },
  community: {
    type: mongoose.Schema.Types.ObjectId,
    index: !0,
    ref: "Community"
  },
  score: {
    type: Number,
    default: 0
  },
  reward: questRewardsSchema,
  type: {
    type: String,
    enum: [ "EXCHANGE", "BATTLE_PASS" ]
  },
  claimableQuantity: {
    type: Number,
    default: -1
  }
}, {
  timestamps: !0
});

module.exports = {
  schema: schema
};