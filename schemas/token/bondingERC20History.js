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
    index: !0
  },
  eventName: {
    type: String,
    required: !0
  },
  from: {
    type: String,
    index: !0
  },
  to: {
    type: String,
    index: !0
  },
  recipient: {
    type: String,
    index: !0
  },
  amountInETH: {
    type: String
  },
  tokenAmount: {
    type: String
  },
  fromBalance: {
    type: String
  },
  toBalance: {
    type: String
  },
  marketType: {
    type: Number,
    required: !0
  },
  marketCapInETH: {
    type: String
  },
  totalSupply: {
    type: String
  },
  tokenId: {
    type: Number
  }
}, {
  timestamps: !0,
  timeseries: {
    timeField: "timestamp",
    metaField: "tokenAddress",
    granularity: "minutes"
  }
});

schema.index({
  tokenAmount: 1
}), schema.index({
  amountInETH: 1
}), schema.index({
  tokenAddress: 1,
  timestamp: -1
}), schema.index({
  tokenAddress: 1,
  txHash: 1
}), schema.index({
  tokenAddress: 1,
  eventName: 1,
  timestamp: -1
}), schema.index({
  tokenAddress: 1,
  from: 1,
  timestamp: -1
}), schema.index({
  tokenAddress: 1,
  to: 1,
  timestamp: -1
}), schema.index({
  tokenAddress: 1,
  recipient: 1,
  timestamp: -1
}), schema.index({
  blockNumber: 1,
  tokenAddress: 1
}), schema.index({
  txHash: 1,
  eventName: 1
}), schema.index({
  marketType: 1,
  tokenAddress: 1,
  timestamp: -1
}), schema.index({
  tokenAddress: 1,
  eventName: 1,
  blockNumber: -1
}), schema.index({
  timestamp: -1,
  marketType: 1
}), schema.index({
  tokenAddress: 1,
  marketType: 1,
  timestamp: -1
}), schema.index({
  tokenCreator: 1,
  timestamp: -1
}), schema.index({
  tokenAddress: 1,
  timestamp: -1,
  _id: -1
}), module.exports = {
  schema: schema
};