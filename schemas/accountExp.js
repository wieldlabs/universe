const mongoose = require("mongoose"), portfolioSchema = mongoose.Schema({
  NFTScore: {
    type: String
  },
  NFTScoreUSD: {
    type: String
  },
  tokenScore: {
    type: String
  },
  walletScore: {
    type: String
  },
  updatedAt: {
    type: String
  }
}), schema = mongoose.Schema({
  exp: {
    type: Number,
    default: 0,
    required: !0
  },
  baseExp: {
    type: Number,
    default: 0,
    required: !0
  },
  portfolio: [ portfolioSchema ],
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