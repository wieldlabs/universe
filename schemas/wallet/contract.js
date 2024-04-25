const mongoose = require("mongoose"), framesSchema = require("../farcaster")["framesSchema"], schema = mongoose.Schema({
  address: {
    type: String,
    index: !0
  },
  chainId: Number,
  name: String,
  slug: {
    type: String,
    index: !0
  },
  symbol: String,
  totalSupply: Number,
  tokenType: String,
  contractDeployer: {
    type: String,
    index: !0
  },
  deployedTxHash: String,
  deployedBlockNumber: Number,
  factoryInterfaceType: {
    type: String,
    index: !0
  },
  metadata: {
    name: String,
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
    lastIngestedAt: Date,
    frame: framesSchema,
    rawImageUrl: String
  },
  metadataUrl: String,
  isVerified: Boolean,
  isSpam: Boolean
}, {
  timestamps: !0
});

schema.index({
  address: 1,
  chainId: 1
}), schema.index({
  chainId: 1,
  contractDeployer: 1
}), schema.index({
  chainId: 1,
  contractDeployer: 1,
  type: 1
}), schema.index({
  slug: 1,
  chainId: 1
}), schema.index({
  address: 1,
  chainId: 1,
  type: 1
}), schema.index({
  factoryInterfaceType: 1,
  chainId: 1
}), schema.index({
  factoryInterfaceType: 1,
  chainId: 1,
  createdAt: 1
}), module.exports = {
  schema: schema
};