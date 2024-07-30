const mongoose = require("mongoose"), signedKeyRequestSchema = new mongoose.Schema({
  signerData: {
    key: {
      type: String
    },
    deadline: {
      type: String
    },
    metadata: {
      type: String
    },
    signature: {
      type: String
    }
  },
  key: {
    type: String
  },
  appUrl: {
    type: String
  },
  appName: {
    type: String
  },
  appImage: {
    type: String
  },
  signature: {
    type: String
  },
  token: {
    type: String,
    index: !0
  },
  appFid: {
    type: String,
    required: !0,
    index: !0
  },
  chainId: {
    type: Number,
    default: 1
  },
  address: {
    type: String
  },
  status: {
    type: String,
    default: "pending"
  },
  isRevoked: {
    type: Boolean,
    default: !1
  }
}, {
  timestamps: !0
});

signedKeyRequestSchema.index({
  status: 1,
  appFid: 1
}), signedKeyRequestSchema.index({
  key: 1,
  address: 1
}), signedKeyRequestSchema.index({
  appFid: 1,
  address: 1
}), signedKeyRequestSchema.index({
  appFid: 1,
  address: 1,
  key: 1
}), module.exports = {
  schema: signedKeyRequestSchema
};