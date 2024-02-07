const mongoose = require("mongoose"), crypto = require("crypto"), getRandomUint256 = require("../helpers/get-random-uint256")["getRandomUint256"], schema = mongoose.Schema({
  nonce: {
    type: String,
    default: () => "" + crypto.randomInt(1, 1e4)
  },
  transactionNonce: {
    type: String,
    default: () => "" + getRandomUint256()
  },
  account: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Account",
    index: !0
  }
}, {
  timestamps: !0
});

module.exports = {
  schema: schema
};