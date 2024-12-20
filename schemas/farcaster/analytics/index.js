const mongoose = require("mongoose"), TIME_PERIODS = {
  "7d": "7",
  "30d": "30",
  all: "all"
}, TIME_PERIODS_ARRAY = Object.keys(TIME_PERIODS), CHAINS = [ "BASE" ], tokenBreakdownSchema = new mongoose.Schema({
  influencerAddress: {
    type: String,
    required: !0
  },
  chain: {
    type: String,
    default: "BASE",
    enum: CHAINS
  },
  tokenAddress: {
    type: String,
    required: !0
  },
  avgBuyPriceUsd: {
    type: Number,
    default: 0
  },
  avgSellPriceUsd: {
    type: Number,
    default: 0
  },
  totalUsdInvested: {
    type: Number,
    default: 0
  },
  totalTokensBought: {
    type: Number,
    default: 0
  },
  totalTokensSold: {
    type: Number,
    default: 0
  },
  totalSoldUsd: {
    type: Number,
    default: 0
  },
  avgCostOfQuantitySold: {
    type: Number,
    default: 0
  },
  countOfTrades: {
    type: Number,
    default: 0
  },
  realizedProfitUsd: {
    type: Number,
    default: 0
  },
  realizedProfitPercentage: {
    type: Number,
    default: 0
  },
  totalBuys: {
    type: Number,
    default: 0
  },
  totalSells: {
    type: Number,
    default: 0
  },
  name: {
    type: String,
    default: ""
  },
  symbol: {
    type: String,
    default: ""
  },
  decimals: {
    type: Number,
    default: 0
  },
  logo: {
    type: String,
    default: ""
  },
  possibleSpam: {
    type: Boolean,
    default: !1
  },
  timePeriod: {
    type: String,
    required: !0,
    enum: TIME_PERIODS_ARRAY
  }
}, {
  timestamps: !0
}), influencerTokensSchema = (tokenBreakdownSchema.index({
  influencerAddress: 1,
  chain: 1,
  tokenAddress: 1,
  timePeriod: 1
}, {
  unique: !0
}), tokenBreakdownSchema.index({
  chain: 1,
  realizedProfitUsd: -1
}), tokenBreakdownSchema.index({
  chain: 1,
  totalUsdInvested: -1
}), tokenBreakdownSchema.index({
  chain: 1,
  tokenAddress: 1,
  realizedProfitUsd: -1,
  totalUsdInvested: -1,
  countOfTrades: -1
}), tokenBreakdownSchema.index({
  chain: 1,
  influencerAddress: 1,
  realizedProfitUsd: -1,
  tokenAddress: 1
}), tokenBreakdownSchema.index({
  tokenAddress: 1,
  chain: 1,
  timePeriod: 1,
  realizedProfitUsd: -1,
  _id: -1
}), tokenBreakdownSchema.index({
  tokenAddress: 1,
  chain: 1,
  timePeriod: 1,
  totalUsdInvested: -1,
  _id: -1
}), tokenBreakdownSchema.index({
  tokenAddress: 1,
  chain: 1,
  timePeriod: 1,
  totalTokensBought: -1,
  _id: -1
}), tokenBreakdownSchema.index({
  tokenAddress: 1,
  chain: 1,
  timePeriod: 1,
  totalTokensSold: -1,
  _id: -1
}), tokenBreakdownSchema.index({
  tokenAddress: 1,
  chain: 1,
  timePeriod: 1,
  countOfTrades: -1,
  _id: -1
}), tokenBreakdownSchema.index({
  tokenAddress: 1,
  chain: 1,
  timePeriod: 1,
  totalTokensBought: -1,
  influencerAddress: 1
}), tokenBreakdownSchema.index({
  tokenAddress: 1,
  chain: 1,
  timePeriod: 1,
  totalTokensBought: -1
}), tokenBreakdownSchema.index({
  influencerAddress: 1,
  tokenAddress: 1,
  chain: 1,
  timePeriod: 1
}), new mongoose.Schema({
  tokenAddress: {
    type: String,
    required: !0
  },
  name: {
    type: String,
    default: ""
  },
  symbol: {
    type: String,
    default: ""
  },
  decimals: {
    type: Number,
    default: 0
  },
  logo: {
    type: String,
    default: ""
  },
  totalRealizedProfitUsd: {
    type: Number,
    default: 0
  },
  totalUsdInvested: {
    type: Number,
    default: 0
  },
  totalTokensBought: {
    type: Number,
    default: 0
  },
  totalTokensSold: {
    type: Number,
    default: 0
  },
  totalSoldUsd: {
    type: Number,
    default: 0
  },
  countOfTrades: {
    type: Number,
    default: 0
  },
  uniqueTraders: {
    type: Number,
    default: 0
  },
  avgRealizedProfitPercentage: {
    type: Number,
    default: 0
  },
  totalBuys: {
    type: Number,
    default: 0
  },
  totalSells: {
    type: Number,
    default: 0
  },
  timePeriod: {
    type: String,
    required: !0,
    enum: TIME_PERIODS_ARRAY
  }
}, {
  timestamps: !0
})), influencerAddressSchema = (influencerTokensSchema.index({
  chain: 1,
  tokenAddress: 1
}), influencerTokensSchema.index({
  chain: 1,
  totalRealizedProfitUsd: -1
}), influencerTokensSchema.index({
  chain: 1,
  totalUsdInvested: -1
}), influencerTokensSchema.index({
  chain: 1,
  uniqueTraders: -1
}), influencerTokensSchema.index({
  tokenAddress: 1,
  timePeriod: 1
}, {
  unique: !0
}), influencerTokensSchema.index({
  chain: 1,
  timePeriod: 1,
  totalRealizedProfitUsd: -1,
  _id: -1
}), influencerTokensSchema.index({
  chain: 1,
  timePeriod: 1,
  totalUsdInvested: -1,
  _id: -1
}), influencerTokensSchema.index({
  chain: 1,
  timePeriod: 1,
  uniqueTraders: -1,
  _id: -1
}), influencerTokensSchema.index({
  chain: 1,
  timePeriod: 1,
  countOfTrades: -1,
  _id: -1
}), influencerTokensSchema.index({
  chain: 1,
  timePeriod: 1,
  totalRealizedProfitUsd: -1,
  tokenAddress: 1,
  _id: -1
}), influencerTokensSchema.index({
  chain: 1,
  timePeriod: 1,
  totalUsdInvested: -1,
  tokenAddress: 1,
  _id: -1
}), influencerTokensSchema.index({
  chain: 1,
  timePeriod: 1,
  uniqueTraders: -1,
  tokenAddress: 1,
  _id: -1
}), influencerTokensSchema.index({
  chain: 1,
  timePeriod: 1,
  countOfTrades: -1,
  tokenAddress: 1,
  _id: -1
}), influencerTokensSchema.index({
  chain: 1,
  timePeriod: 1,
  totalRealizedProfitUsd: -1,
  totalUsdInvested: -1,
  uniqueTraders: -1,
  countOfTrades: -1,
  _id: -1
}), new mongoose.Schema({
  fid: {
    type: String,
    required: !0
  },
  address: {
    type: String,
    required: !0
  },
  confidenceScore: {
    type: Number,
    default: 1
  },
  chain: {
    type: String,
    default: "BASE",
    enum: CHAINS
  },
  totalCountOfTrades: {
    type: Number,
    default: 0
  },
  totalTradeVolume: {
    type: Number,
    default: 0
  },
  totalRealizedProfitUsd: {
    type: Number,
    default: 0
  },
  totalRealizedProfitPercentage: {
    type: Number,
    default: 0
  },
  totalBuys: {
    type: Number,
    default: 0
  },
  totalSells: {
    type: Number,
    default: 0
  },
  totalSoldVolumeUsd: {
    type: Number,
    default: 0
  },
  totalBoughtVolumeUsd: {
    type: Number,
    default: 0
  },
  timePeriod: {
    type: String,
    required: !0,
    enum: TIME_PERIODS_ARRAY
  }
}, {
  timestamps: !0
})), influencersSchema = (influencerAddressSchema.index({
  fid: 1,
  chain: 1,
  address: 1,
  timePeriod: 1
}, {
  unique: !0
}), influencerAddressSchema.index({
  fid: 1
}), influencerAddressSchema.index({
  chain: 1,
  address: 1
}), influencerAddressSchema.index({
  chain: 1,
  totalRealizedProfitUsd: -1
}), influencerAddressSchema.index({
  chain: 1,
  totalBoughtVolumeUsd: -1
}), influencerAddressSchema.index({
  address: 1,
  chain: 1,
  timePeriod: 1
}), influencerAddressSchema.index({
  fid: 1,
  chain: 1,
  timePeriod: 1,
  address: 1
}), new mongoose.Schema({
  fid: {
    type: String,
    required: !0,
    unique: !0
  },
  followerCount: {
    type: Number,
    default: 0
  },
  totalRealizedProfitUsd: {
    "7d": {
      type: Number,
      default: 0
    },
    "30d": {
      type: Number,
      default: 0
    },
    all: {
      type: Number,
      default: 0
    }
  },
  totalBoughtVolumeUsd: {
    "7d": {
      type: Number,
      default: 0
    },
    "30d": {
      type: Number,
      default: 0
    },
    all: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: !0
})), TRANSACTION_CATEGORIES = (influencersSchema.index({
  followerCount: -1
}), influencersSchema.index({
  "totalRealizedProfitUsd.7d": -1,
  _id: -1
}), influencersSchema.index({
  "totalRealizedProfitUsd.30d": -1,
  _id: -1
}), influencersSchema.index({
  "totalRealizedProfitUsd.all": -1,
  _id: -1
}), influencersSchema.index({
  "totalBoughtVolumeUsd.7d": -1,
  _id: -1
}), influencersSchema.index({
  "totalBoughtVolumeUsd.30d": -1,
  _id: -1
}), influencersSchema.index({
  "totalBoughtVolumeUsd.all": -1,
  _id: -1
}), influencersSchema.index({
  fid: 1,
  followerCount: -1
}), [ "token", "external", "erc20", "airdrop", "erc20created" ]), transactionsSchema = new mongoose.Schema({
  fid: {
    type: String,
    required: !0
  },
  isSwap: {
    type: Boolean,
    default: !1,
    required: !0
  },
  blockNum: {
    type: String,
    required: !0
  },
  uniqueId: {
    type: String,
    required: !0,
    unique: !0
  },
  hash: {
    type: String,
    required: !0
  },
  from: {
    type: String,
    required: !0
  },
  to: {
    type: String,
    required: !0
  },
  value: {
    type: Number,
    required: !0
  },
  asset: {
    type: String,
    required: !0
  },
  category: {
    type: String,
    required: !0,
    enum: TRANSACTION_CATEGORIES
  },
  rawContract: {
    value: String,
    address: String,
    decimal: String
  },
  timestamp: {
    type: Date,
    required: !0
  },
  chain: {
    type: String,
    default: "BASE",
    enum: CHAINS
  },
  erc721TokenId: String,
  erc1155Metadata: mongoose.Schema.Types.Mixed,
  tokenId: String,
  isFartoken: {
    type: Boolean,
    default: !1
  }
}, {
  timestamps: !0
}), BASE_DEX_CONTRACTS = (transactionsSchema.index({
  hash: 1
}), transactionsSchema.index({
  category: 1
}), transactionsSchema.index({
  isFartoken: 1
}), transactionsSchema.index({
  hash: 1,
  isSwap: 1
}), transactionsSchema.index({
  fid: 1,
  isSwap: 1,
  chain: 1,
  timestamp: -1
}), transactionsSchema.index({
  from: 1,
  isSwap: 1,
  chain: 1,
  timestamp: -1
}), transactionsSchema.index({
  to: 1,
  isSwap: 1,
  chain: 1,
  timestamp: -1
}), transactionsSchema.index({
  fid: 1,
  isSwap: 1
}), transactionsSchema.index({
  isSwap: 1,
  timestamp: -1
}), transactionsSchema.index({
  isSwap: 1,
  updatedAt: -1
}), transactionsSchema.index({
  isSwap: 1,
  from: 1
}), transactionsSchema.index({
  isSwap: 1,
  to: 1
}), transactionsSchema.index({
  isSwap: 1,
  asset: 1
}), transactionsSchema.index({
  isSwap: 1,
  chain: 1
}), transactionsSchema.index({
  chain: 1,
  isSwap: 1,
  timestamp: 1,
  _id: 1
}), transactionsSchema.index({
  chain: 1,
  isSwap: 1,
  timestamp: 1,
  category: 1
}), transactionsSchema.index({
  chain: 1,
  isSwap: 1,
  timestamp: 1,
  _id: 1,
  category: 1
}), transactionsSchema.index({
  chain: 1,
  isSwap: 1,
  category: 1,
  timestamp: 1,
  _id: 1
}), transactionsSchema.index({
  timestamp: 1
}, {
  name: "expireTransactions",
  expireAfterSeconds: 2592e3
}), transactionsSchema.index({
  from: 1,
  chain: 1,
  isSwap: 1,
  timestamp: -1,
  _id: -1
}), transactionsSchema.index({
  chain: 1,
  isSwap: 1,
  category: 1,
  timestamp: 1,
  _id: 1
}), transactionsSchema.index({
  to: 1,
  chain: 1,
  isSwap: 1,
  timestamp: -1,
  _id: -1
}), {
  "0x2626664c2603336E57B271c5C0b26F421741e481": {
    name: "Uniswap",
    details: "Uniswap V3 Swap Router"
  },
  "0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD": {
    name: "Uniswap",
    details: "Uniswap V3 Universal Router"
  },
  "0x4752ba5dbc23f44d87826276bf6fd6b1c372ad24": {
    name: "Uniswap",
    details: "Uniswap V2 Router"
  },
  "0x6BDED42c6DA8FBf0d2bA55B2fa120C5e0c8D7891": {
    name: "Sushiswap",
    details: "Sushiswap V2Router02"
  },
  "0x0389879e0156033202c44bf784ac18fc02edee4f": {
    name: "Sushiswap",
    details: "Sushiswap RouteProcessor4"
  },
  "0xf2614A233c7C3e7f08b1F887Ba133a13f1eb2c55": {
    name: "Sushiswap",
    details: "Sushiswap RouteProcessor5"
  },
  "0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43": {
    name: "Aerodrome",
    details: "Aerodrome Router"
  },
  "0x1B8eea9315bE495187D873DA7773a874545D9D48": {
    name: "BaseSwap",
    details: "BaseSwap Router"
  },
  "0x78a087d713Be963Bf307b18F2Ff8122EF9A63ae9": {
    name: "BaseSwap",
    details: "BaseSwap BSwap"
  },
  "0x8cFe327CEc66d1C090Dd72bd0FF11d690C33a2Eb": {
    name: "Pancakeswap",
    details: "Pancakeswap V2 Router"
  },
  "0x1b81D678ffb9C0263b24A97847620C99d213eB14": {
    name: "Pancakeswap",
    details: "Pancakeswap V3 Router"
  },
  "0x678Aa4bF4E210cf2166753e054d5b7c31cc7fa86": {
    name: "Pancakeswap",
    details: "Pancakeswap Smart Router"
  },
  "0x6b2C0c7be2048Daa9b5527982C29f48062B34D58": {
    name: "0KX",
    details: "0KX Swap Router"
  },
  "0xBc3c5cA50b6A215edf00815965485527f26F5dA8": {
    name: "0x",
    details: "0x Router"
  },
  "0xF9c2b5746c946EF883ab2660BbbB1f10A5bdeAb4": {
    name: "Kyber",
    details: "Kyber Elastic Router"
  },
  "0x4d47fd5a29904Dae0Ef51b1c450C9750F15D7856": {
    name: "Kyber",
    details: "Kyber Quoter"
  },
  "0x794e6E9152449C4Ac4f2FE8200D471626F8f5FF7": {
    name: "LiFi",
    details: "LiFi Router"
  }
}), BASE_DEX_CONTRACTS_LOWERCASE = Object.fromEntries(Object.entries(BASE_DEX_CONTRACTS).map(([ e, a ]) => [ e.toLowerCase(), a ]));

module.exports = {
  influencersSchema: influencersSchema,
  influencerAddressSchema: influencerAddressSchema,
  tokenBreakdownSchema: tokenBreakdownSchema,
  influencerTokensSchema: influencerTokensSchema,
  transactionsSchema: transactionsSchema,
  TIME_PERIODS: TIME_PERIODS,
  CHAINS: CHAINS,
  BASE_DEX_CONTRACTS: BASE_DEX_CONTRACTS,
  BASE_DEX_CONTRACTS_LOWERCASE: BASE_DEX_CONTRACTS_LOWERCASE,
  TRANSACTION_CATEGORIES: TRANSACTION_CATEGORIES
};