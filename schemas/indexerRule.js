const mongoose = require("mongoose"), schema = mongoose.Schema({
  indexerRuleType: {
    type: String,
    enum: [ "ALLOWLIST", "PUBLIC", "SALES", "NFT", "COLLECTION", "FARCASTER", "API" ]
  },
  ruleDataId: {
    type: mongoose.Schema.Types.ObjectId,
    index: !0
  },
  community: {
    type: mongoose.Schema.Types.ObjectId,
    index: !0,
    ref: "Community"
  },
  ruleOwnerType: {
    type: Number,
    index: !0
  },
  ruleOwnerId: {
    type: mongoose.Schema.Types.ObjectId,
    index: !0
  },
  lastIndexedBlock: {
    type: String
  },
  lastIndexedAt: {
    type: Date
  }
}, {
  timestamps: !0
});

module.exports = {
  schema: schema
};