const mongoose = require("mongoose"), schema = new mongoose.Schema({
  tokenAddress: {
    type: String,
    required: !0,
    unique: !0,
    validate: {
      validator: function(e) {
        return e === e.toLowerCase();
      },
      message: e => e.value + " must be lowercase"
    }
  },
  tokenCreator: {
    type: String,
    required: !0
  },
  overrideTokenCreator: {
    type: String
  },
  platformReferrer: {
    type: String,
    required: !0
  },
  protocolFeeRecipient: {
    type: String,
    required: !0
  },
  bondingCurve: {
    type: String,
    required: !0
  },
  tokenURI: {
    type: String
  },
  metadata: {
    name: String,
    symbol: String,
    description: String,
    websiteLink: String,
    twitter: String,
    discord: String,
    telegram: String,
    nsfw: Boolean,
    image: String
  },
  timestamp: {
    type: Date,
    required: !0
  },
  name: {
    type: String,
    required: !0
  },
  symbol: {
    type: String,
    required: !0
  },
  poolAddress: {
    type: String,
    required: !0
  },
  chainId: {
    type: Number,
    required: !0
  },
  factoryAddress: {
    type: String,
    required: !0
  },
  actualCreator: {
    type: String
  },
  blockNumber: {
    type: Number,
    required: !0
  },
  createdAt: {
    type: Date,
    required: !0
  },
  marketType: {
    type: Number,
    default: 0,
    index: !0
  },
  allocatedSupply: {
    type: String
  },
  fid: {
    type: Number,
    index: !0
  },
  type: {
    type: String,
    default: "WOW",
    enum: [ "WOW", "FARTOKEN", "FIDTOKEN", "HIDDEN_WOW", "HIDDEN_FARTOKEN", "HIDDEN_FIDTOKEN" ],
    required: !0
  },
  lastStatsUpdate: {
    type: Date
  },
  lastProcessedBlock: {
    type: Number
  }
}, {
  timestamps: !0
});

schema.index({
  tokenAddress: 1
}), schema.index({
  tokenCreator: 1
}), schema.index({
  actualCreator: 1
}), schema.index({
  chainId: 1
}), schema.index({
  lastStatsUpdate: 1,
  type: 1
}), schema.index({
  nsfw: 1,
  createdAt: 1
}), schema.index({
  type: 1,
  createdAt: -1,
  lastStatsUpdate: 1
}), schema.index({
  tokenAddress: 1,
  type: 1
}), schema.index({
  timestamp: -1
}), schema.index({
  lastStatsUpdate: 1,
  timestamp: -1
}), schema.index({
  type: 1,
  marketType: 1
}), schema.index({
  tokenCreator: 1,
  type: 1
}), schema.index({
  actualCreator: 1,
  type: 1
}), schema.index({
  createdAt: -1,
  type: 1,
  marketType: 1
}), schema.index({
  lastStatsUpdate: 1,
  marketType: 1
}), schema.index({
  type: 1,
  lastStatsUpdate: -1,
  _id: -1
}), schema.index({
  type: 1,
  timestamp: -1,
  _id: -1
}), schema.index({
  type: 1,
  name: 1
}), schema.index({
  marketType: 1,
  createdAt: -1,
  _id: -1
}), schema.index({
  marketType: 1,
  lastStatsUpdate: -1,
  _id: -1
}), schema.index({
  lastStatsUpdate: 1,
  _id: 1
}), schema.index({
  name: "text"
}), module.exports = {
  schema: schema
};