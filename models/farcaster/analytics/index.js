const mongoose = require("mongoose"), {
  influencersSchema,
  influencerAddressSchema,
  tokenBreakdownSchema,
  influencerTokensSchema,
  transactionsSchema
} = require("../../../schemas/farcaster/analytics");

class InfluencersClass {
  static ping() {
    console.log("model: InfluencersClass");
  }
}

class InfluencerAddressesClass {
  static ping() {
    console.log("model: InfluencerAddressesClass");
  }
}

class TokenBreakdownClass {
  static ping() {
    console.log("model: TokenBreakdownClass");
  }
  static async getTokenStats({
    timePeriod: e,
    chain: s,
    limit: n = 100
  }) {
    return this.aggregate([ {
      $match: {
        timePeriod: e,
        chain: s,
        totalUsdInvested: {
          $gt: 0
        },
        countOfTrades: {
          $gt: 0
        }
      }
    }, {
      $group: {
        _id: {
          chain: "$chain",
          tokenAddress: "$tokenAddress",
          name: "$name",
          symbol: "$symbol",
          decimals: "$decimals",
          logo: "$logo"
        },
        totalRealizedProfitUsd: {
          $sum: "$realizedProfitUsd"
        },
        totalUsdInvested: {
          $sum: "$totalUsdInvested"
        },
        totalTokensBought: {
          $sum: "$totalTokensBought"
        },
        totalTokensSold: {
          $sum: "$totalTokensSold"
        },
        totalSoldUsd: {
          $sum: "$totalSoldUsd"
        },
        countOfTrades: {
          $sum: "$countOfTrades"
        },
        uniqueTraders: {
          $addToSet: "$influencerAddress"
        },
        realizedProfitPercentages: {
          $push: {
            $cond: [ {
              $ne: [ "$realizedProfitPercentage", null ]
            }, "$realizedProfitPercentage", 0 ]
          }
        },
        totalBuys: {
          $sum: "$totalBuys"
        },
        totalSells: {
          $sum: "$totalSells"
        }
      }
    }, {
      $project: {
        _id: 0,
        chain: "$_id.chain",
        tokenAddress: "$_id.tokenAddress",
        name: "$_id.name",
        symbol: "$_id.symbol",
        decimals: "$_id.decimals",
        logo: "$_id.logo",
        totalRealizedProfitUsd: 1,
        totalUsdInvested: 1,
        totalTokensBought: 1,
        totalTokensSold: 1,
        totalSoldUsd: 1,
        countOfTrades: 1,
        uniqueTraders: {
          $size: "$uniqueTraders"
        },
        avgRealizedProfitPercentage: {
          $avg: "$realizedProfitPercentages"
        },
        totalBuys: 1,
        totalSells: 1
      }
    }, {
      $sort: {
        totalRealizedProfitUsd: -1
      }
    }, {
      $limit: n
    } ]);
  }
}

class InfluencerTokensClass {
  static ping() {
    console.log("model: InfluencerTokensClass");
  }
}

class TransactionsClass {
  static ping() {
    console.log("model: TransactionsClass");
  }
}

influencersSchema.loadClass(InfluencersClass), influencerAddressSchema.loadClass(InfluencerAddressesClass), 
tokenBreakdownSchema.loadClass(TokenBreakdownClass), influencerTokensSchema.loadClass(InfluencerTokensClass), 
transactionsSchema.loadClass(TransactionsClass);

const Influencers = mongoose.models.Influencers || mongoose.model("farcaster.analytics.Influencers", influencersSchema), InfluencerAddresses = mongoose.models.InfluencerAddresses || mongoose.model("farcaster.analytics.InfluencerAddresses", influencerAddressSchema), TokenBreakdown = mongoose.models.TokenBreakdown || mongoose.model("farcaster.analytics.TokenBreakdown", tokenBreakdownSchema), InfluencerTokens = mongoose.models.InfluencerTokens || mongoose.model("farcaster.analytics.InfluencerTokens", influencerTokensSchema), Transactions = mongoose.models.Transactions || mongoose.model("farcaster.analytics.Transactions", transactionsSchema);

module.exports = {
  Influencers: Influencers,
  InfluencerAddresses: InfluencerAddresses,
  TokenBreakdown: TokenBreakdown,
  InfluencerTokens: InfluencerTokens,
  Transactions: Transactions
};