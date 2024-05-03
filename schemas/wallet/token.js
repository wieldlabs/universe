const mongoose = require("mongoose"), attributeSchema = mongoose.Schema({
  displayType: String,
  value: String,
  traitType: String
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
  metadata: {
    name: String,
    imageUrl: String,
    description: String,
    lastIngestedAt: Date,
    rawImageUrl: String,
    attributes: [ attributeSchema ]
  },
  timeLastUpdated: Date
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