const mongoose = require("mongoose"), schema = mongoose.Schema({
  address: {
    type: String,
    index: !0
  },
  chainId: Number,
  name: String,
  symbol: String,
  totalSupply: Number,
  tokenType: String,
  contractDeployer: String,
  deployedBlockNumber: Number,
  type: String,
  metadata: {
    floorPrice: Number,
    collectionName: String,
    collectionSlug: String,
    safelistRequestStatus: String,
    imageUrl: String,
    description: String,
    externalUrl: String,
    twitterUsername: String,
    discordUrl: String,
    bannerImageUrl: String,
    lastIngestedAt: Date
  },
  isSpam: Boolean
}, {
  timestamps: !0
});

schema.index({
  address: 1,
  chainId: 1
}), schema.index({
  address: 1,
  chainId: 1,
  type: 1
}), module.exports = {
  schema: schema
};