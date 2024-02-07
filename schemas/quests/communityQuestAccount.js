const mongoose = require("mongoose"), schema = mongoose.Schema({
  isNotified: {
    type: Boolean,
    default: !1
  },
  rewardClaimed: {
    type: Boolean,
    default: !1
  },
  account: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Account"
  },
  communityQuest: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "CommunityQuest"
  }
}, {
  timestamps: !0
});

schema.index({
  account: 1
}), schema.index({
  isNotified: 1,
  account: 1
}), schema.index({
  communityQuest: 1,
  account: 1
}), module.exports = {
  schema: schema
};