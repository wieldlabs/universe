const mongoose = require("mongoose"), schema = mongoose.Schema({
  handle: {
    type: String,
    required: !0,
    unique: !0
  },
  owner: {
    type: String,
    required: !0
  },
  chain: {
    type: String,
    enum: [ "ETH", "OP" ],
    required: !0
  },
  tokenId: {
    type: String,
    required: !0
  },
  expiresAt: {
    type: Number
  },
  displayItemId: {
    type: String
  },
  displayMetadata: {
    type: Object,
    default: {}
  },
  unsyncedMetadata: {
    type: Boolean,
    default: !1
  }
}, {
  timestamps: !0
});

schema.index({
  owner: 1
}), schema.index({
  tokenId: 1
}), schema.index({
  owner: 1,
  tokenId: 1
}), schema.index({
  chain: 1
}), schema.index({
  displayItemId: 1
}), schema.index({
  "displayMetadata.wear": 1
}), schema.index({
  "displayMetadata.foil": 1
}), schema.index({
  "displayMetadata.wear": 1,
  "displayMetadata.foil": 1
}), schema.index({
  "displayMetadata.wear": 1,
  chain: 1
}), schema.index({
  "displayMetadata.foil": 1,
  chain: 1
}), schema.index({
  unsyncedMetadata: 1
}), schema.index({
  unsyncedMetadata: 1,
  updatedAt: 1
}), module.exports = {
  schema: schema
};