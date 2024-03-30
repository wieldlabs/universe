const ethers = require("ethers"), axios = require("axios"), Sentry = require("@sentry/node"), getProvider = require("../helpers/alchemy-provider")["getProvider"], config = require("../helpers/marketplace")["config"], validateAndConvertAddress = require("../helpers/validate-and-convert-address")["validateAndConvertAddress"], getMemcachedClient = require("../connectmemcached")["getMemcachedClient"], {
  Listings,
  ListingLogs,
  Fids,
  Offers,
  Appraisals
} = require("../models/farcaster"), {
  getFarcasterUserByFid,
  searchFarcasterUserByMatch
} = require("../helpers/farcaster"), _CacheService = require("../services/cache/CacheService")["Service"];

class MarketplaceService {
  constructor() {
    var e = getProvider({
      network: config().NODE_NETWORK,
      node: config().NODE_URL
    }), t = new ethers.Contract(config().FID_MARKETPLACE_V1_ADDRESS, config().FID_MARKETPLACE_ABI, e), r = new ethers.Contract(config().ID_REGISTRY_ADDRESS, config().ID_REGISTRY_ABI, e);
    this.marketplace = t, this.idRegistry = r, this.alchemyProvider = e, this.usdFormatter = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }
  _getFidCollectionQuery(e) {
    return e ? "1k" === e ? {
      $lte: 1e3
    } : "5k" === e ? {
      $lte: 5e3,
      $gt: 1e3
    } : "10k" === e ? {
      $lte: 1e4,
      $gt: 5e3
    } : "og" === e ? {
      $lte: 2e4
    } : null : null;
  }
  async ethToUsd(e) {
    if (!e) return "0";
    try {
      var t = getMemcachedClient();
      try {
        var r = await t.get("MarketplaceService_ethToUsd");
        if (r) return ethers.BigNumber.from(r.value).mul(e).toString();
      } catch (e) {
        console.error(e);
      }
      var a = `
    https://api.etherscan.io/api?module=stats&action=ethprice&apikey=` + process.env.ETHERSCAN_API_KEY, i = (await axios.get(a)).data.result?.ethusd;
      if (!i) return "0";
      try {
        await t.set("MarketplaceService_ethToUsd", parseInt(i).toString(), {
          lifetime: 1800
        });
      } catch (e) {
        console.error(e);
      }
      return ethers.BigNumber.from(parseInt(i)).mul(e).toString();
    } catch (e) {
      return console.error(e), Sentry.captureException(e), "0";
    }
  }
  _padWithZeros(e) {
    for (;e.length < 32; ) e = "0" + e;
    return e;
  }
  async getBestOffer({
    fid: e
  }) {
    var t = getMemcachedClient();
    let r;
    try {
      var a = await t.get("getBestOffer:" + e);
      a && (r = new Offers(JSON.parse(a.value)));
    } catch (e) {
      console.error(e);
    }
    if (!r && (r = await Offers.findOne({
      canceledAt: null,
      fid: e
    }).sort({
      amount: -1
    }))) try {
      await t.set("getBestOffer:" + e, JSON.stringify(r));
    } catch (e) {
      console.error(e);
    }
    return r ? ([ a, t ] = await Promise.all([ this.fetchUserData(e), this.ethToUsd(r.amount) ]), 
    e = this.usdFormatter.format(ethers.utils.formatEther(t)), {
      ...JSON.parse(JSON.stringify(r)),
      usd: e,
      user: a
    }) : null;
  }
  async getListing({
    fid: e
  }) {
    var t = getMemcachedClient();
    let r;
    try {
      var a = await t.get("Listing:" + e);
      a && (r = new Listings(JSON.parse(a.value)));
    } catch (e) {
      console.error(e);
    }
    if (!r) {
      var a = {
        fid: e,
        canceledAt: null,
        deadline: {
          $gt: Math.floor(Date.now() / 1e3)
        }
      };
      if (r = (r = await Listings.findOne(a)) ? r._doc : null) try {
        await t.set("Listing:" + e, JSON.stringify(r));
      } catch (e) {
        console.error(e);
      }
    }
    return r ? ([ a, t ] = await Promise.all([ this.fetchUserData(e), this.ethToUsd(r.minFee) ]), 
    e = this.usdFormatter.format(ethers.utils.formatEther(t)), {
      ...JSON.parse(JSON.stringify(r)),
      usd: e,
      user: a
    }) : null;
  }
  async fetchUserData(e) {
    return getFarcasterUserByFid(e);
  }
  async fetchListing(e) {
    return this.getListing({
      fid: e
    });
  }
  async fetchDataForFids(e) {
    return Promise.all(e.map(async e => {
      var [ t, r, a ] = await Promise.all([ this.fetchUserData(e), this.fetchListing(e) ]);
      return {
        fid: e,
        user: t,
        listing: r,
        bestOffer: a
      };
    }));
  }
  async filterByUserProfile(e) {
    return e.filter(e => e.user);
  }
  async getOnlyBuyNowListings({
    sort: e = "fid",
    limit: t = 20,
    cursor: r = "",
    filters: a = {}
  }) {
    var i = getMemcachedClient();
    let s;
    var n = 0 < Object.keys(a).length;
    try {
      var o = await i.get(`MarketplaceService:getOnlyBuyNowListings:${e}:${t}:` + r + (n ? ":" + JSON.stringify(a) : ""));
      o && (s = JSON.parse(o.value).map(e => new Listings(e)));
    } catch (e) {
      console.error(e);
    }
    const [ c, l ] = r ? r.split("-") : [ "0", null ];
    o = parseInt(c);
    if (!s) {
      var f = {
        id: "-" !== e[0] ? {
          $lt: l || Number.MAX_SAFE_INTEGER
        } : {
          $gt: l || 0
        },
        deadline: {
          $gt: Math.floor(Date.now() / 1e3)
        },
        canceledAt: null
      };
      a.collection && (g = this._getFidCollectionQuery(a.collection)) && (f.fid = g), 
      s = await Listings.find(f).limit(t).skip(o).sort(e + " _id");
      try {
        r ? await i.set(`MarketplaceService:getOnlyBuyNowListings:${e}:${t}:` + r + (n ? ":" + JSON.stringify(a) : ""), JSON.stringify(s)) : await i.set(`MarketplaceService:getOnlyBuyNowListings:${e}:${t}:` + r + (n ? ":" + JSON.stringify(a) : ""), JSON.stringify(s), {
          lifetime: 60
        });
      } catch (e) {
        console.error(e);
      }
    }
    var g = await Promise.all(s.map(async e => {
      var [ t, r ] = await Promise.all([ this.fetchUserData(e.fid), this.ethToUsd(e.minFee) ]), r = this.usdFormatter.format(ethers.utils.formatEther(r));
      return {
        fid: e.fid,
        user: t,
        listing: {
          ...e._doc,
          usd: r,
          user: t
        }
      };
    }));
    let h = null;
    if (g.length >= t) {
      const l = g[g.length - 1].listing._id;
      h = o + g.length + "-" + l.toString();
    }
    return [ g.slice(0, t), h ];
  }
  async latestFid() {
    var e = getMemcachedClient();
    let t;
    try {
      var r = await e.get("MarketplaceService:latestFid");
      r && (t = r.value);
    } catch (e) {
      console.error(e);
    }
    if (!t) {
      t = await Fids.count();
      try {
        await e.set("MarketplaceService:latestFid", t);
      } catch (e) {
        console.error(e);
      }
    }
    return t;
  }
  async searchListings({
    limit: e = 20,
    filters: t = {}
  }) {
    t = await searchFarcasterUserByMatch(t.query, e, "value", !1);
    return [ await Promise.all(t.map(async e => {
      var t = await this.fetchListing(e.fid);
      return {
        fid: e.fid,
        user: e,
        listing: t
      };
    })), null ];
  }
  async getListingsDsc({
    limit: e = 20,
    cursor: t = ""
  }) {
    var [ t, ,  ] = t ? t.split("-") : [ await this.latestFid(), null ], t = parseInt(t), r = t - parseInt(e), a = [];
    for (let e = t; e > r; e--) a.push(e.toString());
    var i, t = await this.fetchDataForFids(a);
    let s = null;
    return t.length >= e && (i = ethers.BigNumber.from(t[t.length - 1].fid), s = i.sub(1).toString() + "-" + i.sub(1).toString()), 
    [ t.slice(0, e), s ];
  }
  async getListings({
    sort: e = "fid",
    limit: t = 20,
    cursor: r = "",
    filters: a = {}
  }) {
    if (a.query) return this.searchListings({
      sort: e,
      limit: t,
      cursor: r,
      filters: a
    });
    if ("minFee" === e || "-minFee" === e || "updatedAt" === e || "-updatedAt" === e || a.onlyListing) return this.getOnlyBuyNowListings({
      sort: e,
      limit: t,
      cursor: r,
      filters: a
    });
    if ("-fid" === e) return this.getListingsDsc({
      sort: e,
      limit: t,
      cursor: r,
      filters: a
    });
    var [ e, ,  ] = r ? r.split("-") : [ "1", null ], a = parseInt(e), i = a + parseInt(t), s = [];
    for (let e = a; e < i; e++) s.push(e.toString());
    r = await this.fetchDataForFids(s);
    let n = null;
    return r.length >= t && (e = ethers.BigNumber.from(r[r.length - 1].fid), n = e.add(1).toString() + "-" + e.add(1).toString()), 
    [ r.slice(0, t), n ];
  }
  async getProxyAddress({
    address: t,
    salt: r
  }) {
    if (!t || !r) return null;
    try {
      var a = getMemcachedClient();
      let e;
      try {
        var i = await a.get(`MarketplaceService:getProxyAddress:${t}:` + r);
        i && (e = JSON.parse(i.value));
      } catch (e) {
        console.error(e);
      }
      return e || (e = await this.marketplace.getAddress(validateAndConvertAddress(t), r), 
      await a.set(`MarketplaceService:getProxyAddress:${t}:` + r, JSON.stringify(e))), 
      e;
    } catch (e) {
      return Sentry.captureException(e), null;
    }
  }
  async getTransactionArguments({
    txHash: e
  }) {
    var e = await this.alchemyProvider.getTransaction(e.toString());
    if (e) return {
      functionName: (e = new ethers.utils.Interface(config().FID_MARKETPLACE_ABI).parseTransaction({
        data: e.data,
        value: e.value
      })).name,
      args: e.args
    };
    throw new Error("Transaction not found");
  }
  async getReceipt({
    txHash: e
  }) {
    let t = 0, r;
    for (;t < 120 && (t += 1, await new Promise(e => setTimeout(e, 1e3)), !(r = await this.alchemyProvider.getTransactionReceipt(e.toString()))); );
    if (120 <= t) throw new Error("Timeout");
    return r;
  }
  async getBlockTimestamp(e) {
    e = await this.alchemyProvider.getBlock(e);
    return new Date(1e3 * e.timestamp);
  }
  async cancelListing({
    txHash: e
  }) {
    if (!e) throw new Error("Missing txHash");
    var t = await ListingLogs.findOne({
      txHash: e
    });
    if (t) return Listings.findOne({
      fid: t.fid
    });
    t = await this.getReceipt({
      txHash: e
    });
    if (!t) throw new Error("Transaction not found");
    var r, a = new ethers.utils.Interface(config().FID_MARKETPLACE_ABI);
    let i = null;
    for (r of t.logs) try {
      var s = a.parseLog(r), n = s.args.fid.toNumber(), o = {
        fid: n
      };
      if ("Canceled" === s.name) {
        i = await Listings.findOneAndUpdate(o, {
          txHash: e,
          canceledAt: new Date()
        }, {
          new: !0
        }), await ListingLogs.updateOne({
          txHash: e
        }, {
          eventType: "Canceled",
          fid: n,
          txHash: e
        }, {
          upsert: !0
        });
        var c = getMemcachedClient();
        try {
          await c.delete("Listing:" + n, {
            noreply: !0
          });
        } catch (e) {
          console.error(e);
        }
        break;
      }
    } catch (e) {
      throw new Error("Cannot cancel listing, try again later");
    }
    if (i) return i;
    throw new Error("FID not listed");
  }
  async getHighestSale() {
    var e = getMemcachedClient();
    try {
      var t = await e.get("MarketplaceService:stats:highestSale");
      if (t) return t.value;
    } catch (e) {
      console.error(e);
    }
    t = await ListingLogs.findOne({
      eventType: {
        $in: [ "Bought", "OfferApproved" ]
      }
    }).sort({
      price: -1
    });
    if (t) try {
      return await e.set("MarketplaceService:stats:highestSale", t.price, {
        lifetime: 60
      }), t.price;
    } catch (e) {
      console.error(e);
    }
  }
  async getTotalVolume() {
    var e = getMemcachedClient();
    try {
      var t = await e.get("MarketplaceService:stats:totalVolume");
      if (t) return t.value;
    } catch (e) {
      console.error(e);
    }
    t = await ListingLogs.aggregate([ {
      $match: {
        eventType: {
          $in: [ "Bought", "OfferApproved" ]
        }
      }
    }, {
      $group: {
        _id: null,
        total: {
          $sum: "$price"
        }
      }
    } ]);
    if (t.length) try {
      return await e.set("MarketplaceService:stats:totalVolume", t[0].total, {
        lifetime: 60
      }), t[0].total;
    } catch (e) {
      console.error(e);
    }
  }
  async getStats() {
    try {
      var t = getMemcachedClient();
      let e;
      try {
        var r = await t.get("MarketplaceService:getStats");
        r && (e = JSON.parse(r.value));
      } catch (e) {
        console.error(e);
      }
      if (!e) {
        var [ a, i, s, n, o ] = await Promise.all([ Listings.findOne({
          canceledAt: null
        }).sort({
          minFee: 1
        }), Offers.findOne({
          canceledAt: null
        }).sort({
          amount: -1
        }), this.getHighestSale(), this.ethToUsd(1), this.latestFid() ]), c = s || "0";
        e = {
          stats: {
            floor: {
              usd: this.usdFormatter.format(ethers.utils.formatEther(ethers.BigNumber.from(a.minFee).mul(n))),
              wei: a.minFee
            },
            lastFid: {
              value: "#" + o || "0"
            },
            highestOffer: {
              usd: this.usdFormatter.format(ethers.utils.formatEther(ethers.BigNumber.from(i?.amount || "0").mul(n))),
              wei: i?.amount || "0"
            },
            highestSale: {
              usd: this.usdFormatter.format(ethers.utils.formatEther(ethers.BigNumber.from(c).mul(n))),
              wei: c
            }
          },
          success: !0
        };
        try {
          await t.set("MarketplaceService:getStats", JSON.stringify(e));
        } catch (e) {
          console.error(e);
        }
      }
      return e;
    } catch (e) {
      return console.error(e), Sentry.captureException(e), {
        success: !1,
        stats: {}
      };
    }
  }
  async computeStats({
    txHash: e
  }) {
    var t, e = await this.getReceipt({
      txHash: e
    }), r = new ethers.utils.Interface(config().FID_MARKETPLACE_ABI), a = getMemcachedClient();
    for (t of e.logs) try {
      var i = r.parseLog(t);
      if ("Listed" === i.name) {
        try {
          var s = (await a.get("MarketplaceService:stats:floor"))?.value, n = !s || ethers.BigNumber.from(i.args.amount).lt(ethers.BigNumber.from(s)) ? i.args.amount.toString() : s;
          await a.set("MarketplaceService:stats:floor", n);
        } catch (e) {
          console.error(e);
        }
        break;
      }
      if ("Bought" === i.name) {
        try {
          var [ o, c ] = await Promise.all([ a.get("MarketplaceService:stats:highestSale"), a.get("MarketplaceService:stats:totalVolume") ]), l = o?.value, f = c?.value, g = i.args.amount.toString(), h = (l && !ethers.BigNumber.from(g).gt(ethers.BigNumber.from(l)) || await a.set("MarketplaceService:stats:highestSale", g), 
          f ? ethers.BigNumber.from(f).add(ethers.BigNumber.from(g)).toString() : g);
          await a.set("MarketplaceService:stats:totalVolume", h), await a.delete("MarketplaceService:getStats", {
            noreply: !0
          });
        } catch (e) {
          console.error(e);
        }
        break;
      }
    } catch (e) {}
  }
  async list({
    txHash: e
  }) {
    if (!e) throw new Error("Missing txHash");
    var t = await ListingLogs.findOne({
      txHash: e
    });
    if (t) return Listings.findOne({
      fid: t.fid
    });
    t = await this.getReceipt({
      txHash: e
    });
    if (!t) throw new Error("Transaction not found");
    var r, a = new ethers.utils.Interface(config().FID_MARKETPLACE_ABI);
    let i = null;
    for (r of t.logs) try {
      var s = a.parseLog(r), n = s.args.fid.toNumber(), o = {
        fid: n
      };
      if ("Listed" === s.name) {
        i = await Listings.findOneAndUpdate(o, {
          ownerAddress: s.args.owner,
          minFee: this._padWithZeros(s.args.amount.toString()),
          deadline: s.args.deadline,
          txHash: e,
          canceledAt: null
        }, {
          upsert: !0,
          new: !0
        }), await ListingLogs.updateOne({
          txHash: e
        }, {
          eventType: "Listed",
          fid: n,
          from: s.args.owner,
          price: this._padWithZeros(s.args.amount.toString()),
          txHash: e
        }, {
          upsert: !0
        });
        var c = getMemcachedClient();
        try {
          await c.set("Listing:" + n, JSON.stringify(i));
        } catch (e) {
          console.error(e);
        }
        break;
      }
    } catch (e) {}
    if (i) return this.computeStats({
      txHash: e
    }), i;
    throw new Error("FID not listed");
  }
  async buy({
    txHash: e
  }) {
    if (!e) throw new Error("Missing txHash");
    var t = await ListingLogs.findOne({
      txHash: e
    });
    if (t) return Listings.findOne({
      fid: t.fid
    });
    t = await this.getReceipt({
      txHash: e
    });
    if (!t) throw new Error("Transaction not found");
    var r, a = new ethers.utils.Interface(config().FID_MARKETPLACE_ABI);
    let i = null;
    for (r of t.logs) try {
      var s = a.parseLog(r);
      if ("Bought" === s.name) {
        var n = s.args.fid.toNumber(), o = {
          fid: n
        }, c = (i = await Listings.findOneAndUpdate(o, {
          txHash: e,
          canceledAt: new Date()
        }, {
          upsert: !0,
          new: !0
        }), await ListingLogs.updateOne({
          txHash: e
        }, {
          eventType: "Bought",
          fid: n,
          from: s.args.buyer,
          price: this._padWithZeros(s.args.amount.toString()),
          txHash: e
        }, {
          upsert: !0
        }), getMemcachedClient());
        try {
          await c.set("Listing:" + s.args.fid, JSON.stringify(i));
        } catch (e) {
          console.error(e);
        }
        break;
      }
    } catch (e) {}
    if (i) return this.computeStats({
      txHash: e
    }), i;
    throw new Error("FID not bought");
  }
  async offer({
    txHash: e
  }) {
    if (!e) throw new Error("Missing txHash");
    if (await ListingLogs.findOne({
      txHash: e
    })) return Offers.findOne({
      txHash: e
    });
    var t = await this.getReceipt({
      txHash: e
    });
    if (!t) throw new Error("Transaction not found");
    var r, a = new ethers.utils.Interface(config().FID_MARKETPLACE_ABI);
    let i = null;
    for (r of t.logs) try {
      var s = a.parseLog(r);
      if ("OfferMade" === s.name) {
        var n = s.args.fid.toString(), o = {
          fid: n,
          buyerAddress: s.args.buyer
        }, c = (i = await Offers.findOneAndUpdate(o, {
          fid: n,
          txHash: e,
          buyerAddress: s.args.buyer,
          amount: this._padWithZeros(s.args.amount.toString()),
          deadline: s.args.deadline
        }, {
          upsert: !0,
          new: !0
        }), await ListingLogs.updateOne({
          txHash: e
        }, {
          eventType: "OfferMade",
          fid: n,
          from: s.args.buyer,
          price: this._padWithZeros(s.args.amount.toString()),
          txHash: e
        }, {
          upsert: !0
        }), getMemcachedClient());
        try {
          await c.delete("getBestOffer:" + s.args.fid, {
            noreply: !0
          });
        } catch (e) {
          console.error(e);
        }
        break;
      }
    } catch (e) {}
    if (i) return this.computeStats({
      txHash: e
    }), i;
    throw new Error("FID not offered");
  }
  async cancelOffer({
    txHash: e
  }) {
    if (!e) throw new Error("Missing txHash");
    if (await ListingLogs.findOne({
      txHash: e
    })) return Offers.findOne({
      txHash: e
    });
    var t = await this.getReceipt({
      txHash: e
    });
    if (!t) throw new Error("Transaction not found");
    var r, a = new ethers.utils.Interface(config().FID_MARKETPLACE_ABI);
    let i = null;
    for (r of t.logs) try {
      var s = a.parseLog(r);
      if ("OfferCanceled" === s.name) {
        var n = s.args.fid.toNumber(), o = {
          fid: n,
          buyerAddress: s.args.buyer
        }, c = (i = await Offers.findOneAndUpdate(o, {
          fid: n,
          txHash: e,
          canceledAt: new Date()
        }, {
          upsert: !0,
          new: !0
        }), await ListingLogs.updateOne({
          txHash: e
        }, {
          eventType: "OfferCanceled",
          fid: n,
          from: s.args.buyer,
          txHash: e
        }, {
          upsert: !0
        }), getMemcachedClient());
        try {
          await c.delete("getBestOffer:" + s.args.fid, {
            noreply: !0
          });
        } catch (e) {
          console.error(e);
        }
        break;
      }
    } catch (e) {}
    if (i) return this.computeStats({
      txHash: e
    }), i;
    throw new Error("FID offer not canceled");
  }
  async approveOffer({
    txHash: e
  }) {
    if (!e) throw new Error("Missing txHash");
    if (await ListingLogs.findOne({
      txHash: e
    })) return Offers.findOne({
      txHash: e
    });
    var t = await this.getReceipt({
      txHash: e
    });
    if (!t) throw new Error("Transaction not found");
    var r, a = new ethers.utils.Interface(config().FID_MARKETPLACE_ABI);
    let i = null;
    for (r of t.logs) try {
      var s = a.parseLog(r);
      if ("OfferApproved" === s.name) {
        var n = s.args.fid.toNumber(), o = {
          fid: n,
          buyerAddress: s.args.buyer
        }, c = (i = await Offers.findOneAndUpdate(o, {
          txHash: e,
          canceledAt: new Date()
        }, {
          upsert: !0,
          new: !0
        }), await Listings.updateOne({
          fid: n,
          canceledAt: null
        }, {
          canceledAt: new Date()
        }), await ListingLogs.updateOne({
          txHash: e
        }, {
          eventType: "OfferApproved",
          fid: n,
          from: s.args.buyer,
          price: i.amount,
          txHash: e
        }, {
          upsert: !0
        }), getMemcachedClient());
        try {
          await c.delete("getBestOffer:" + s.args.fid, {
            noreply: !0
          }), await c.delete("Listing:" + n, {
            noreply: !0
          });
        } catch (e) {
          console.error(e);
        }
        break;
      }
    } catch (e) {}
    if (i) return this.computeStats({
      txHash: e
    }), i;
    throw new Error("FID offer not canceled");
  }
  async getActivities({
    eventType: e,
    fid: t,
    from: r,
    collection: a,
    limit: i = 20,
    cursor: s
  }) {
    var n = getMemcachedClient(), o = `MarketplaceService:getActivities:${e}:${t}:${r}:${a}:` + s + i;
    let c;
    try {
      var l = await n.get(o);
      l && (c = JSON.parse(l.value).map(e => new ListingLogs(e)));
    } catch (e) {
      console.error(e);
    }
    var [ l, f ] = s ? s.split("-") : [ Date.now(), null ];
    if (!c) {
      l = {
        createdAt: {
          $lt: l
        },
        id: {
          $lt: f || Number.MAX_SAFE_INTEGER
        }
      };
      e && "all" !== e && "Bought" === (l.eventType = e) && (l.eventType = {
        $in: [ "Bought", "OfferApproved" ]
      }), t ? l.fid = t : a && (f = this._getFidCollectionQuery(a)) && (l.fid = f), 
      r && (l.from = r), c = await ListingLogs.find(l).limit(i).sort({
        createdAt: -1
      });
      try {
        s ? await n.set(o, JSON.stringify(c)) : await n.set(o, JSON.stringify(c), {
          lifetime: 60
        });
      } catch (e) {
        console.error(e);
      }
    }
    let g = null;
    return [ await Promise.all(c.map(async e => {
      var [ t, r ] = await Promise.all([ this.fetchUserData(e.fid), this.ethToUsd(e.price) ]), r = this.usdFormatter.format(ethers.utils.formatEther(r));
      return {
        ...e._doc,
        usd: r,
        user: t
      };
    })), g = c.length === i ? c[c.length - 1].createdAt.getTime() + "-" + c[c.length - 1].id : g ];
  }
  async getOffers({
    fid: e,
    buyerAddress: t
  }) {
    var r = {
      canceledAt: null
    };
    if (e) try {
      var a = parseInt(e, 10);
      r.fid = isNaN(a) ? null : a;
    } catch (e) {}
    t && (r.buyerAddress = t);
    e = await Offers.find(r).sort({
      createdAt: -1
    });
    return await Promise.all((e || []).map(async e => {
      var [ t, r ] = await Promise.all([ this.fetchUserData(e.fid), this.ethToUsd(e.amount) ]), r = this.usdFormatter.format(ethers.utils.formatEther(r));
      return {
        ...e._doc,
        usd: r,
        user: t
      };
    }));
  }
  async getOffer({
    fid: e,
    buyerAddress: t
  }) {
    if (e && t) return e = {
      canceledAt: null,
      fid: e,
      buyerAddress: t
    }, await Offers.findOne(e);
    throw new Error("Missing fid or buyerAddress");
  }
  async getAppraisal({
    fid: e
  }) {
    e = await new _CacheService().get({
      key: "MarketplaceService:appraise:" + e,
      params: {
        fid: e
      }
    });
    return e || {
      totalSum: ethers.utils.parseEther("0.001").toString(),
      count: 1,
      average: ethers.utils.parseEther("0.001").toString()
    };
  }
  async appraise({
    fid: e,
    appraisedBy: t,
    amount: r
  }) {
    if (e && r) {
      var a, i, s = ethers.utils.parseEther("100000"), n = ethers.BigNumber.from(r);
      if (!(n.lt(0) || n.gt(s) || n.isZero())) return await Appraisals.create({
        fid: e.toString(),
        appraisedBy: t,
        amount: this._padWithZeros(n.toString())
      }), (n = await (s = new _CacheService()).get({
        key: t = "MarketplaceService:appraise:" + e,
        params: {
          fid: e
        }
      })) ? (n = n, i = ethers.BigNumber.from(n.totalSum).add(r), n = n.count + 1, 
      a = i.div(n).toString(), i = {
        totalSum: i.toString(),
        count: n,
        average: a
      }, await s.set({
        key: t,
        params: {
          fid: e
        },
        value: i
      }), i) : (await s.set({
        key: t,
        params: {
          fid: e
        },
        value: {
          totalSum: r,
          count: 1,
          average: r
        }
      }), {
        totalSum: r,
        count: 1,
        average: r
      });
    }
  }
}

module.exports = {
  Service: MarketplaceService
};