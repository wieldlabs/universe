const mongoose = require("mongoose"), attributeSchema = mongoose.Schema({
  displayType: String,
  value: String,
  traitType: String
}), imageSchema = mongoose.Schema({
  cachedUrl: String,
  thumbnailUrl: String,
  pngUrl: String,
  contentType: String,
  size: Number,
  originalUrl: String
}), schema = mongoose.Schema({
  contract: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Contract",
    index: !0
  },
  contractAddress: {
    type: String,
    index: !0
  },
  tokenId: String,
  tokenType: {
    type: String,
    enum: [ "ERC721", "ERC1155", "ERC20" ]
  },
  name: String,
  description: String,
  image: imageSchema,
  attributes: [ attributeSchema ],
  timeLastUpdated: Date,
  balance: String,
  acquiredAt: {
    blockTimestamp: Date,
    blockNumber: Number
  }
}, {
  timestamps: !0
});

schema.index({
  contract: 1,
  tokenId: 1
}), schema.index({
  contractAddress: 1,
  tokenId: 1
}), module.exports = {
  schema: schema
};