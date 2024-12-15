const mongoose = require("mongoose"), schema = new mongoose.Schema({
  tokenAddress: {
    type: String,
    required: !0,
    index: !0
  },
  timestamp: {
    type: Date,
    required: !0,
    index: !0
  },
  blockNumber: {
    type: Number,
    required: !0
  },
  txHash: {
    type: String,
    required: !0,
    unique: !0
  },
  type: {
    type: String,
    required: !0,
    enum: [ "Buy", "Sell", "Transfer", "Create" ]
  },
  from: {
    type: String,
    index: !0
  },
  to: {
    type: String,
    index: !0
  },
  address: {
    type: String,
    index: !0
  },
  addressBalance: {
    type: String,
    index: !0
  },
  tokenAmount: {
    type: String
  },
  amountInETH: {
    type: String
  },
  totalSupply: {
    type: String
  }
});

schema.index({
  tokenAddress: 1,
  timestamp: -1,
  addressBalance: -1
}), schema.index({
  tokenAddress: 1,
  timestamp: -1,
  _id: -1
}), schema.index({
  address: 1,
  timestamp: -1
}), schema.index({
  txHash: 1,
  tokenAddress: 1
}), module.exports = {
  schema: schema
};