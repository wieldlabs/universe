const mongoose = require("mongoose"), schema = mongoose.Schema({
  webhookId: {
    type: String,
    required: !0,
    unique: !0
  },
  signingKey: {
    type: String,
    required: !0
  },
  type: {
    type: String,
    required: !0,
    enum: [ "MINED_TRANSACTION", "DROPPED_TRANSACTION", "ADDRESS_ACTIVITY", "NFT_ACTIVITY", "NFT_METADATA_UPDATE", "GRAPHQL" ]
  }
}, {
  timestamps: !0
});

schema.index({
  webhookId: 1
}, {
  unique: !0
}), module.exports = {
  schema: schema
};