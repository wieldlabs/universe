const mongoose = require("mongoose"), floorSchema = mongoose.Schema({
  floorPriceEth: {
    type: String
  },
  floorPriceUSD: {
    type: String
  },
  updatedAt: {
    type: String
  },
  collectionUrl: {
    type: String
  }
}), schema = mongoose.Schema({
  openseaFloor: [ floorSchema ],
  looksRareFloor: [ floorSchema ],
  contractAddress: {
    type: mongoose.Schema.Types.ObjectId,
    index: !0,
    ref: "Address"
  }
});

module.exports = {
  schema: schema
};