const mongoose = require("mongoose"), challenSchema = mongoose.Schema({
  challenge: {
    type: String,
    required: !0
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 6048e5)
  }
}), schema = mongoose.Schema({
  type: {
    type: String,
    enum: [ "PASSKEY", "FARCASTER_SIGNER", "FARCASTER_SIGNER_EXTERNAL" ]
  },
  id: {
    type: String,
    index: !0
  },
  pubKey: {
    type: String
  },
  counter: {
    type: Number,
    default: 0
  },
  encyrptedWalletJson: {
    type: String
  },
  challenge: challenSchema
});

module.exports = {
  schema: schema
};