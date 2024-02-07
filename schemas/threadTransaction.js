const mongoose = require("mongoose"), addressSchema = require("./address")["schema"], getRandomUint256 = require("../helpers/get-random-uint256")["getRandomUint256"], schema = mongoose.Schema({
  thread: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Thread",
    index: !0
  },
  signature: {
    type: String
  },
  nonce: {
    type: String,
    default: () => "" + getRandomUint256()
  },
  tokenAddress: addressSchema,
  isCompleted: {
    type: Boolean,
    default: !1
  },
  tokenAmount: {
    type: String
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Account",
    index: !0
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Account",
    index: !0
  },
  transactionHash: {
    type: String
  },
  completionTransactionHash: {
    type: String
  }
}, {
  timestamps: !0
});

module.exports = {
  schema: schema
};