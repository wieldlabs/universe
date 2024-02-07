const mongoose = require("mongoose"), schema = mongoose.Schema({
  isNotified: {
    type: Boolean,
    default: !1
  },
  rewardClaimedCount: {
    type: Number,
    default: 0
  },
  account: {
    type: mongoose.Schema.Types.ObjectId,
    index: !0,
    ref: "Account"
  },
  communityReward: {
    type: mongoose.Schema.Types.ObjectId,
    index: !0,
    ref: "CommunityReward"
  }
}, {
  timestamps: !0
});

module.exports = {
  schema: schema
};