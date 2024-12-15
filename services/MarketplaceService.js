const ethers = require("ethers"), axios = require("axios"), Sentry = require("@sentry/node"), getProvider = require("../helpers/alchemy-provider")["getProvider"], config = require("../helpers/marketplace")["config"], validateAndConvertAddress = require("../helpers/validate-and-convert-address")["validateAndConvertAddress"], memcache = require("../connectmemcache")["memcache"], {
  Listings,
  ListingLogs,
  Fids,
  Offers,
  Appraisals
} = require("../models/farcaster"), CastHandle = require("../models/CastHandle")["CastHandle"], {
  getFarcasterUserByFid,
  searchFarcasterUserByMatch,
  searchCastHandleByMatch
} = require("../helpers/farcaster"), _CacheService = require("../services/cache/CacheService")["Service"], {
  WETH_CONTRACT,
  NETWORK,
  getTokenPrice
} = require("../helpers/moralis");

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
      $lte: 1e3,
      $gte: 0
    } : "5k" === e ? {
      $lte: 5e3,
      $gt: 1e3
    } : "10k" === e ? {
      $lte: 1e4,
      $gt: 5e3
    } : "og" === e ? {
      $lte: 2e4,
      $gte: 0
    } : "castHandle" === e ? -1 : null : null;
  }
  async ethToUsd(e) {
    if (!e) return "0";
    try {
      var t, r = await memcache.get("MarketplaceService_ethToUsd");
      return r ? ethers.BigNumber.from(r.value).mul(e).toString() : (t = (await getTokenPrice(NETWORK.ETH.chainId, WETH_CONTRACT))?.usdPrice) ? (await memcache.set("MarketplaceService_ethToUsd", parseInt(t).toString(), {
        lifetime: 300
      }), ethers.BigNumber.from(parseInt(t)).mul(e).toString()) : "0";
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
    let t;
    var r = await memcache.get("getBestOffer:" + e);
    return (t = r ? new Offers(JSON.parse(r.value)) : t) || (t = await Offers.findOne({
      canceledAt: null,
      fid: e
    }).sort({
      amount: -1
    })) && await memcache.set("getBestOffer:" + e, JSON.stringify(t)), t ? ([ r, e ] = await Promise.all([ this.fetchUserData(e), this.ethToUsd(t.amount) ]), 
    e = this.usdFormatter.format(ethers.utils.formatEther(e)), {
      ...JSON.parse(JSON.stringify(t)),
      usd: e,
      user: r
    }) : null;
  }
  async getListing({
    fid: e,
    tokenId: t,
    chainId: r
  }) {
    let a;
    var i = "Listing:" + e + (t ? ":" + t : "") + (r ? ":" + r : ""), s = await memcache.get(i);
    if (!(a = s ? new Listings(JSON.parse(s.value)) : a)) {
      var s = {
        fid: e,
        canceledAt: null,
        deadline: {
          $gt: Math.floor(Date.now() / 1e3)
        }
      };
      if (t) {
        if (t.toString().startsWith("0x")) try {
          t = ethers.BigNumber.from(t).toString();
        } catch (e) {}
        s.tokenId = t;
      }
      r && (s.chainId = r), (a = (a = await Listings.findOne(s)) ? a._doc : null) && await memcache.set(i, JSON.stringify(a));
    }
    return a ? ([ t, r ] = await Promise.all([ this.fetchUserData(e), this.ethToUsd(a.minFee) ]), 
    s = this.usdFormatter.format(ethers.utils.formatEther(r)), {
      ...JSON.parse(JSON.stringify(a)),
      usd: s,
      user: t
    }) : null;
  }
  async fetchCastHandle(e, t) {
    if (e && !e.toString().startsWith("0x")) try {
      e = ethers.BigNumber.from(e).toHexString();
    } catch (e) {
      console.error("Error converting tokenId to 0x format:", e);
    }
    return CastHandle.findOne({
      tokenId: e,
      chainId: t
    });
  }
  async fetchUserData(e, t, r) {
    return -1 == e ? this.fetchCastHandle(t, r) : getFarcasterUserByFid(e);
  }
  async fetchListing(e, t, r) {
    return this.getListing({
      fid: e,
      tokenId: t,
      chainId: r
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
    let i;
    var s = 0 < Object.keys(a).length, n = await memcache.get(`MarketplaceService:getOnlyBuyNowListings:${e}:${t}:` + r + (s ? ":" + JSON.stringify(a) : ""));
    n && (i = JSON.parse(n.value).map(e => new Listings(e)));
    const [ o, c ] = r ? r.split("-") : [ "0", null ];
    var d, n = parseInt(o), h = (i || (d = {
      fid: {
        $gte: 0
      },
      id: "-" !== e[0] ? {
        $lt: c || Number.MAX_SAFE_INTEGER
      } : {
        $gt: c || 0
      },
      deadline: {
        $gt: Math.floor(Date.now() / 1e3)
      },
      canceledAt: null
    }, a.collection && (h = this._getFidCollectionQuery(a.collection)) && (d.fid = h), 
    a.address && (d.ownerAddress = a.address), i = await Listings.find(d).limit(t).skip(n).sort(e + " _id"), 
    r ? await memcache.set(`MarketplaceService:getOnlyBuyNowListings:${e}:${t}:` + r + (s ? ":" + JSON.stringify(a) : ""), JSON.stringify(i)) : await memcache.set(`MarketplaceService:getOnlyBuyNowListings:${e}:${t}:` + r + (s ? ":" + JSON.stringify(a) : ""), JSON.stringify(i), {
      lifetime: 60
    })), await Promise.all(i.map(async e => {
      var [ t, r ] = await Promise.all([ this.fetchUserData(e.fid, e.tokenId, e.chainId), this.ethToUsd(e.minFee) ]), r = this.usdFormatter.format(ethers.utils.formatEther(r));
      return {
        fid: e.fid,
        user: t,
        listing: {
          ...e._doc,
          usd: r,
          user: t
        }
      };
    })));
    let l = null;
    if (h.length >= t) {
      const c = h[h.length - 1].listing._id;
      l = n + h.length + "-" + c.toString();
    }
    return [ h.slice(0, t), l ];
  }
  async latestFid() {
    let e;
    var t = await memcache.get("MarketplaceService:latestFid");
    return (e = t ? t.value : e) || (e = await Fids.estimatedDocumentCount(), await memcache.set("MarketplaceService:latestFid", e, {
      lifetime: 3600
    })), e;
  }
  async searchListings({
    limit: e = 20,
    filters: t = {}
  }) {
    var r = [ searchFarcasterUserByMatch(t.query, e, "value", !1) ], [ t, e = [] ] = (config().ENABLE_NFT_MARKETPLACE && r.push(searchCastHandleByMatch(t.query, e, "value")), 
    await Promise.all(r)), r = [ ...t, ...e ];
    return [ await Promise.all(r.map(async e => {
      let t = null;
      return t = e.handle ? await this.fetchListing(-1, e.tokenId, "ETH" === e.chain ? 1 : 10) : await this.fetchListing(e.fid), 
      {
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
    if ("castHandle" === a.collection) return this.getCastHandles({
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
      let e;
      var a = await memcache.get(`MarketplaceService:getProxyAddress:${t}:` + r);
      return (e = a ? JSON.parse(a.value) : e) || (e = await this.marketplace.getAddress(validateAndConvertAddress(t), r), 
      await memcache.set(`MarketplaceService:getProxyAddress:${t}:` + r, JSON.stringify(e))), 
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
        }), await memcache.delete("Listing:" + n, {
          noreply: !0
        });
        break;
      }
    } catch (e) {
      throw new Error("Cannot cancel listing, try again later");
    }
    if (i) return i;
    throw new Error("FID not listed");
  }
  async getHighestSale() {
    var e = await memcache.get("MarketplaceService:stats:highestSale");
    return e ? e.value : (e = await ListingLogs.findOne({
      eventType: {
        $in: [ "Bought", "OfferApproved" ]
      }
    }).sort({
      price: -1
    })) ? (await memcache.set("MarketplaceService:stats:highestSale", e.price, {
      lifetime: 60
    }), e.price) : void 0;
  }
  async getTotalVolume() {
    var e = await memcache.get("MarketplaceService:stats:totalVolume");
    return e ? e.value : (e = await ListingLogs.aggregate([ {
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
    } ])).length ? (await memcache.set("MarketplaceService:stats:totalVolume", e[0].total, {
      lifetime: 60
    }), e[0].total) : void 0;
  }
  async getStats() {
    try {
      let e;
      var t, r, a, i, s, n, o = await memcache.get("MarketplaceService:getStats");
      return (e = o ? JSON.parse(o.value) : e) || ([ t, r, a, i, s ] = await Promise.all([ Listings.findOne({
        canceledAt: null
      }).sort({
        minFee: 1
      }), Offers.findOne({
        canceledAt: null
      }).sort({
        amount: -1
      }), this.getHighestSale(), this.ethToUsd(1), this.latestFid() ]), n = a || "0", 
      e = {
        stats: {
          floor: {
            usd: this.usdFormatter.format(ethers.utils.formatEther(ethers.BigNumber.from(t.minFee).mul(i))),
            wei: t.minFee
          },
          lastFid: {
            value: "#" + s || "0"
          },
          highestOffer: {
            usd: this.usdFormatter.format(ethers.utils.formatEther(ethers.BigNumber.from(r?.amount || "0").mul(i))),
            wei: r?.amount || "0"
          },
          highestSale: {
            usd: this.usdFormatter.format(ethers.utils.formatEther(ethers.BigNumber.from(n).mul(i))),
            wei: n
          }
        },
        success: !0
      }, await memcache.set("MarketplaceService:getStats", JSON.stringify(e))), 
      e;
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
    }), r = new ethers.utils.Interface(config().FID_MARKETPLACE_ABI);
    for (t of e.logs) try {
      var a = r.parseLog(t);
      if ("Listed" === a.name) {
        var i = (await memcache.get("MarketplaceService:stats:floor"))?.value, s = !i || ethers.BigNumber.from(a.args.amount).lt(ethers.BigNumber.from(i)) ? a.args.amount.toString() : i;
        await memcache.set("MarketplaceService:stats:floor", s);
        break;
      }
      if ("Bought" === a.name) {
        var [ n, o ] = await Promise.all([ memcache.get("MarketplaceService:stats:highestSale"), memcache.get("MarketplaceService:stats:totalVolume") ]), c = n?.value, d = o?.value, h = a.args.amount.toString(), l = (c && !ethers.BigNumber.from(h).gt(ethers.BigNumber.from(c)) || await memcache.set("MarketplaceService:stats:highestSale", h), 
        d ? ethers.BigNumber.from(d).add(ethers.BigNumber.from(h)).toString() : h);
        await memcache.set("MarketplaceService:stats:totalVolume", l), await memcache.delete("MarketplaceService:getStats", {
          noreply: !0
        });
        break;
      }
    } catch (e) {
      console.error(e);
    }
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
        }), await memcache.set("Listing:" + n, JSON.stringify(i));
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
    let i = null, s = null;
    for (r of t.logs) try {
      var n, o, c = a.parseLog(r);
      "Bought" === c.name ? (o = {
        fid: n = c.args.fid.toNumber()
      }, i = await Listings.findOneAndUpdate(o, {
        txHash: e,
        canceledAt: new Date()
      }, {
        upsert: !0,
        new: !0
      }), s = {
        eventType: "Bought",
        fid: n,
        from: c.args.buyer,
        price: this._padWithZeros(c.args.amount.toString()),
        txHash: e
      }, await memcache.set("Listing:" + c.args.fid, JSON.stringify(i))) : "Referred" === c.name && (s = {
        ...s || {},
        referrer: c.args.referrer
      });
    } catch (e) {}
    if (s && await ListingLogs.updateOne({
      txHash: e
    }, s, {
      upsert: !0
    }), i) return this.computeStats({
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
        };
        i = await Offers.findOneAndUpdate(o, {
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
        }), await memcache.delete("getBestOffer:" + s.args.fid, {
          noreply: !0
        });
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
        };
        i = await Offers.findOneAndUpdate(o, {
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
        }), await memcache.delete("getBestOffer:" + s.args.fid, {
          noreply: !0
        });
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
        };
        i = await Offers.findOneAndUpdate(o, {
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
        }), await Promise.all([ memcache.delete("getBestOffer:" + s.args.fid, {
          noreply: !0
        }), memcache.delete("Listing:" + n, {
          noreply: !0
        }) ]);
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
    referrer: i,
    limit: s = 20,
    cursor: n
  }) {
    let o = `MarketplaceService:getActivities:${e}:${t}:${r}:${a}:` + n + s;
    i && (o = o + ":" + i);
    let c;
    var d = await memcache.get(o), [ d, h ] = (d && (c = JSON.parse(d.value).map(e => new ListingLogs(e))), 
    n ? n.split("-") : [ Date.now(), null ]), e = (c || (d = {
      createdAt: {
        $lt: d
      },
      id: {
        $lt: h || Number.MAX_SAFE_INTEGER
      }
    }, e && "all" !== e && "Bought" === (d.eventType = e) && (d.eventType = {
      $in: [ "Bought", "OfferApproved" ]
    }), t ? d.fid = t : a && (h = this._getFidCollectionQuery(a)) && (d.fid = h), 
    r && (d.from = r), i && (d.referrer = i), c = await ListingLogs.find(d).limit(s).sort({
      createdAt: -1
    }), n ? await memcache.set(o, JSON.stringify(c)) : await memcache.set(o, JSON.stringify(c), {
      lifetime: 60
    })), await Promise.all(c.map(async e => {
      var [ t, r ] = await Promise.all([ this.fetchUserData(e.fid), this.ethToUsd(e.price) ]), a = this.usdFormatter.format(ethers.utils.formatEther(r)), a = {
        ...e._doc,
        usd: a,
        user: t
      };
      return e.referrer && (a.referrerUsd = this.usdFormatter.format(config().FID_MARKETPLACE_REF_PERCENTAGE * ethers.utils.formatEther(r) / 100)), 
      a;
    })));
    let l = null;
    return [ e, l = c.length === s ? c[c.length - 1].createdAt.getTime() + "-" + c[c.length - 1].id : l ];
  }
  async getOffers({
    fid: e,
    buyerAddress: t,
    tokenId: r,
    chainId: a
  }) {
    var i = {
      canceledAt: null
    };
    if (e) try {
      var s = parseInt(e, 10);
      i.fid = isNaN(s) ? null : s;
    } catch (e) {}
    if (t && (i.buyerAddress = t), r) {
      if (r.toString().startsWith("0x")) try {
        r = ethers.BigNumber.from(r).toString();
      } catch (e) {}
      i.tokenId = r;
    }
    a && (i.chainId = a);
    e = await Offers.find(i).sort({
      amount: -1
    }).limit(10);
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
  async listTokenId({
    txHash: e,
    chainId: t
  }) {
    if (!e || !t) throw new Error("Missing txHash or chainId");
    if (1 !== (t = parseInt(t)) && 10 !== t) throw new Error("Invalid chainId. Only 1 (Ethereum) and 10 (Optimism) are supported.");
    var r = await ListingLogs.findOne({
      txHash: e,
      chainId: t
    });
    if (r) return Listings.findOne({
      tokenId: r.tokenId,
      chainId: t
    });
    r = await this.getReceipt({
      txHash: e
    });
    if (!r) throw new Error("Transaction not found");
    var a, i = new ethers.utils.Interface(config().NFT_MARKETPLACE_ABI), s = 10 === t ? config().NFT_MARKETPLACE_ADDRESS_OP : config().NFT_MARKETPLACE_ADDRESS_ETH;
    let n = null;
    for (a of r.logs) try {
      if (a.address.toLowerCase() === s.toLowerCase()) {
        var o = i.parseLog(a);
        if ("Listed" === o.name) {
          var c = o.args.tokenId.toString(), d = {
            tokenId: c,
            chainId: t
          };
          n = await Listings.findOneAndUpdate(d, {
            ownerAddress: o.args.owner,
            minFee: this._padWithZeros(o.args.price.toString()),
            deadline: o.args.deadline,
            txHash: e,
            canceledAt: null,
            tokenId: c,
            fid: -1,
            chainId: t
          }, {
            upsert: !0,
            new: !0
          }), await ListingLogs.updateOne({
            txHash: e,
            chainId: t
          }, {
            eventType: "Listed",
            tokenId: c,
            chainId: t,
            fid: -1,
            from: o.args.owner,
            price: this._padWithZeros(o.args.price.toString()),
            txHash: e
          }, {
            upsert: !0
          }), await memcache.delete(`Listing:-1:${c}:` + t, {
            noreply: !0
          });
          break;
        }
      }
    } catch (e) {
      console.error("Error parsing log:", e);
    }
    if (n) return await this.computeStatsTokenId({
      txHash: e,
      chainId: t
    }), n;
    throw new Error("Token not listed");
  }
  async buyTokenId({
    txHash: e,
    chainId: t
  }) {
    if (!e || !t) throw new Error("Missing txHash or chainId");
    if (1 !== (t = parseInt(t)) && 10 !== t) throw new Error("Invalid chainId. Only 1 (Ethereum) and 10 (Optimism) are supported.");
    var r = await ListingLogs.findOne({
      txHash: e,
      chainId: t
    });
    if (r) return Listings.findOne({
      tokenId: r.tokenId,
      chainId: t
    });
    r = await this.getReceipt({
      txHash: e
    });
    if (!r) throw new Error("Transaction not found");
    var a, i, s, n, o = new ethers.utils.Interface(config().NFT_MARKETPLACE_ABI), c = 10 === t ? config().NFT_MARKETPLACE_ADDRESS_OP : config().NFT_MARKETPLACE_ADDRESS_ETH;
    let d = null, h = null;
    for (a of r.logs) try {
      a.address.toLowerCase() === c.toLowerCase() && ("Bought" === (i = o.parseLog(a)).name ? (n = {
        tokenId: s = i.args.tokenId.toString(),
        chainId: t
      }, d = await Listings.findOneAndUpdate(n, {
        txHash: e,
        canceledAt: new Date()
      }, {
        upsert: !0,
        new: !0
      }), h = {
        eventType: "Bought",
        tokenId: s,
        chainId: t,
        fid: -1,
        from: i.args.buyer,
        price: this._padWithZeros(i.args.price.toString()),
        txHash: e
      }, await memcache.delete(`Listing:-1:${s}:` + t, {
        noreply: !0
      })) : "Referred" === i.name && (h = {
        ...h || {},
        referrer: i.args.referrer
      }));
    } catch (e) {
      console.error("Error parsing log:", e);
    }
    if (h && await ListingLogs.updateOne({
      txHash: e,
      chainId: t
    }, h, {
      upsert: !0
    }), d) return await this.computeStatsTokenId({
      txHash: e,
      chainId: t
    }), d;
    throw new Error("Token not bought");
  }
  async offerTokenId({
    txHash: e,
    chainId: t
  }) {
    if (!e || !t) throw new Error("Missing txHash or chainId");
    if (1 !== (t = parseInt(t)) && 10 !== t) throw new Error("Invalid chainId. Only 1 (Ethereum) and 10 (Optimism) are supported.");
    if (await ListingLogs.findOne({
      txHash: e,
      chainId: t
    })) return Offers.findOne({
      txHash: e,
      chainId: t
    });
    var r = await this.getReceipt({
      txHash: e
    });
    if (!r) throw new Error("Transaction not found");
    var a, i = new ethers.utils.Interface(config().NFT_MARKETPLACE_ABI), s = 10 === t ? config().NFT_MARKETPLACE_ADDRESS_OP : config().NFT_MARKETPLACE_ADDRESS_ETH;
    let n = null;
    for (a of r.logs) try {
      if (a.address.toLowerCase() === s.toLowerCase()) {
        var o = i.parseLog(a);
        if ("OfferMade" === o.name) {
          var c = o.args.tokenId.toString(), d = {
            tokenId: c,
            chainId: t,
            buyerAddress: o.args.buyer
          };
          n = await Offers.findOneAndUpdate(d, {
            tokenId: c,
            chainId: t,
            txHash: e,
            buyerAddress: o.args.buyer,
            amount: this._padWithZeros(o.args.amount.toString()),
            deadline: o.args.deadline,
            fid: -1
          }, {
            upsert: !0,
            new: !0
          }), await ListingLogs.updateOne({
            txHash: e,
            chainId: t
          }, {
            eventType: "OfferMade",
            tokenId: c,
            chainId: t,
            fid: -1,
            from: o.args.buyer,
            price: this._padWithZeros(o.args.amount.toString()),
            txHash: e
          }, {
            upsert: !0
          }), await memcache.delete(`getBestOffer:${c}:` + t, {
            noreply: !0
          });
          break;
        }
      }
    } catch (e) {
      console.error("Error parsing log:", e);
    }
    if (n) return await this.computeStatsTokenId({
      txHash: e,
      chainId: t
    }), n;
    throw new Error("Token not offered");
  }
  async cancelOfferTokenId({
    txHash: e,
    chainId: t
  }) {
    if (!e || !t) throw new Error("Missing txHash or chainId");
    if (1 !== (t = parseInt(t)) && 10 !== t) throw new Error("Invalid chainId. Only 1 (Ethereum) and 10 (Optimism) are supported.");
    if (await ListingLogs.findOne({
      txHash: e,
      chainId: t
    })) return Offers.findOne({
      txHash: e,
      chainId: t
    });
    var r = await this.getReceipt({
      txHash: e
    });
    if (!r) throw new Error("Transaction not found");
    var a, i = new ethers.utils.Interface(config().NFT_MARKETPLACE_ABI), s = 10 === t ? config().NFT_MARKETPLACE_ADDRESS_OP : config().NFT_MARKETPLACE_ADDRESS_ETH;
    let n = null;
    for (a of r.logs) try {
      if (a.address.toLowerCase() === s.toLowerCase()) {
        var o = i.parseLog(a);
        if ("OfferCanceled" === o.name) {
          var c = o.args.tokenId.toString(), d = {
            tokenId: c,
            chainId: t,
            buyerAddress: o.args.buyer
          };
          n = await Offers.findOneAndUpdate(d, {
            tokenId: c,
            chainId: t,
            txHash: e,
            canceledAt: new Date(),
            fid: -1
          }, {
            upsert: !0,
            new: !0
          }), await ListingLogs.updateOne({
            txHash: e,
            chainId: t
          }, {
            eventType: "OfferCanceled",
            tokenId: c,
            chainId: t,
            fid: -1,
            from: o.args.buyer,
            txHash: e
          }, {
            upsert: !0
          }), await memcache.delete(`getBestOffer:${c}:` + t, {
            noreply: !0
          });
          break;
        }
      }
    } catch (e) {
      console.error("Error parsing log:", e);
    }
    if (n) return await this.computeStatsTokenId({
      txHash: e,
      chainId: t
    }), n;
    throw new Error("Token offer not canceled");
  }
  async approveOfferTokenId({
    txHash: e,
    chainId: t
  }) {
    if (!e || !t) throw new Error("Missing txHash or chainId");
    if (1 !== (t = parseInt(t)) && 10 !== t) throw new Error("Invalid chainId. Only 1 (Ethereum) and 10 (Optimism) are supported.");
    if (await ListingLogs.findOne({
      txHash: e,
      chainId: t
    })) return Offers.findOne({
      txHash: e,
      chainId: t
    });
    var r = await this.getReceipt({
      txHash: e
    });
    if (!r) throw new Error("Transaction not found");
    var a, i = new ethers.utils.Interface(config().NFT_MARKETPLACE_ABI), s = 10 === t ? config().NFT_MARKETPLACE_ADDRESS_OP : config().NFT_MARKETPLACE_ADDRESS_ETH;
    let n = null;
    for (a of r.logs) try {
      if (a.address.toLowerCase() === s.toLowerCase()) {
        var o = i.parseLog(a);
        if ("OfferApproved" === o.name) {
          var c = o.args.tokenId.toString(), d = {
            tokenId: c,
            chainId: t,
            buyerAddress: o.args.buyer
          };
          n = await Offers.findOneAndUpdate(d, {
            txHash: e,
            canceledAt: new Date(),
            fid: -1
          }, {
            upsert: !0,
            new: !0
          }), await Listings.updateOne({
            tokenId: c,
            chainId: t,
            canceledAt: null
          }, {
            canceledAt: new Date()
          }), await ListingLogs.updateOne({
            txHash: e,
            chainId: t
          }, {
            eventType: "OfferApproved",
            tokenId: c,
            chainId: t,
            fid: -1,
            from: o.args.buyer,
            price: this._padWithZeros(o.args.amount.toString()),
            txHash: e
          }, {
            upsert: !0
          }), await Promise.all([ memcache.delete(`getBestOffer:${c}:` + t, {
            noreply: !0
          }), memcache.delete(`Listing:-1:${c}:` + t, {
            noreply: !0
          }) ]);
          break;
        }
      }
    } catch (e) {
      console.error("Error parsing log:", e);
    }
    if (n) return await this.computeStatsTokenId({
      txHash: e,
      chainId: t
    }), n;
    throw new Error("Token offer not approved");
  }
  async cancelListTokenId({
    txHash: e,
    chainId: t
  }) {
    if (!e || !t) throw new Error("Missing txHash or chainId");
    if (1 !== (t = parseInt(t)) && 10 !== t) throw new Error("Invalid chainId. Only 1 (Ethereum) and 10 (Optimism) are supported.");
    var r = await ListingLogs.findOne({
      txHash: e,
      chainId: t
    });
    if (r) return Listings.findOne({
      tokenId: r.tokenId,
      chainId: t
    });
    r = await this.getReceipt({
      txHash: e
    });
    if (!r) throw new Error("Transaction not found");
    var a, i = new ethers.utils.Interface(config().NFT_MARKETPLACE_ABI), s = 10 === t ? config().NFT_MARKETPLACE_ADDRESS_OP : config().NFT_MARKETPLACE_ADDRESS_ETH;
    let n = null;
    for (a of r.logs) try {
      if (a.address.toLowerCase() === s.toLowerCase()) {
        var o = i.parseLog(a);
        if ("Canceled" === o.name) {
          var c = o.args.tokenId.toString(), d = {
            tokenId: c,
            chainId: t
          };
          n = await Listings.findOneAndUpdate(d, {
            txHash: e,
            canceledAt: new Date()
          }, {
            upsert: !0,
            new: !0
          }), await ListingLogs.updateOne({
            txHash: e,
            chainId: t
          }, {
            eventType: "Canceled",
            tokenId: c,
            chainId: t,
            fid: -1,
            from: o.args.seller,
            txHash: e
          }, {
            upsert: !0
          }), await memcache.delete(`Listing:-1:${c}:` + t, {
            noreply: !0
          });
          break;
        }
      }
    } catch (e) {
      console.error("Error parsing log:", e);
    }
    if (n) return await this.computeStatsTokenId({
      txHash: e,
      chainId: t
    }), n;
    throw new Error("Token listing not canceled");
  }
  async getCastHandles({
    sort: e = "createdAt",
    limit: t = 20,
    cursor: r = ""
  }) {
    var a = `MarketplaceService:getCastHandles:${e}:${t}:` + r, i = await memcache.get(a);
    if (i) return JSON.parse(i.value);
    var [ i, s ] = r ? r.split("-") : [ Date.now(), null ], r = parseInt(i);
    let n;
    var o = {};
    switch (e) {
     case "fid":
      n = {
        tokenId: 1
      }, s && (o.tokenId = {
        $gt: s
      });
      break;

     case "-fid":
      n = {
        tokenId: -1
      }, s && (o.tokenId = {
        $lt: s
      });
      break;

     case "createdAt":
      n = {
        createdAt: 1
      }, s && (o.createdAt = {
        $gt: new Date(parseInt(s))
      });
      break;

     default:
      n = {
        createdAt: -1
      }, s && (o.createdAt = {
        $lt: new Date(parseInt(s))
      });
    }
    var i = await CastHandle.find(o).limit(t).sort(n), c = i.map(e => ({
      listing: null,
      user: e,
      fid: -1
    }));
    let d = null;
    i.length === t && (i = i[i.length - 1], d = r + t + "-" + (e.includes("fid") ? i.tokenId : i.createdAt.getTime()));
    r = [ c, d ];
    return await memcache.set(a, JSON.stringify(r), {
      lifetime: 300
    }), r;
  }
  async computeStatsTokenId({
    txHash: e,
    chainId: t
  }) {
    var r, e = await this.getReceipt({
      txHash: e
    }), a = new ethers.utils.Interface(config().NFT_MARKETPLACE_ABI), i = 10 === t ? config().NFT_MARKETPLACE_ADDRESS_OP : config().NFT_MARKETPLACE_ADDRESS_ETH;
    for (r of e.logs) try {
      if (r.address.toLowerCase() === i.toLowerCase()) {
        var s = a.parseLog(r);
        if ("Listed" === s.name) {
          var n = (await memcache.get("MarketplaceService:tokenId:stats:floor:" + t))?.value, o = !n || ethers.BigNumber.from(s.args.price).lt(ethers.BigNumber.from(n)) ? s.args.price.toString() : n;
          await memcache.set("MarketplaceService:tokenId:stats:floor:" + t, o);
          break;
        }
        if ("Bought" === s.name || "OfferApproved" === s.name) {
          var [ c, d ] = await Promise.all([ memcache.get("MarketplaceService:tokenId:stats:highestSale:" + t), memcache.get("MarketplaceService:tokenId:stats:totalVolume:" + t) ]), h = c?.value, l = d?.value, f = s.args.price.toString(), g = (h && !ethers.BigNumber.from(f).gt(ethers.BigNumber.from(h)) || await memcache.set("MarketplaceService:tokenId:stats:highestSale:" + t, f), 
          l ? ethers.BigNumber.from(l).add(ethers.BigNumber.from(f)).toString() : f);
          await memcache.set("MarketplaceService:tokenId:stats:totalVolume:" + t, g), 
          await memcache.delete("MarketplaceService:tokenId:getStats:" + t, {
            noreply: !0
          });
          break;
        }
      }
    } catch (e) {
      console.error("Error computing stats:", e);
    }
  }
  async getTokenIdStats(t) {
    try {
      let e;
      var r, a, i, s, n, o, c, d = "MarketplaceService:tokenId:getStats:" + t, h = await memcache.get(d);
      return (e = h ? JSON.parse(h.value) : e) || ([ r, a, i, s, n ] = await Promise.all([ Listings.findOne({
        canceledAt: null,
        chainId: t
      }).sort({
        minFee: 1
      }), Offers.findOne({
        canceledAt: null,
        chainId: t
      }).sort({
        amount: -1
      }), memcache.get("MarketplaceService:tokenId:stats:highestSale:" + t), memcache.get("MarketplaceService:tokenId:stats:totalVolume:" + t), this.ethToUsd(1) ]), 
      o = i?.value || "0", c = s?.value || "0", e = {
        stats: {
          floor: {
            usd: this.usdFormatter.format(ethers.utils.formatEther(ethers.BigNumber.from(r?.minFee || "0").mul(n))),
            wei: r?.minFee || "0"
          },
          highestOffer: {
            usd: this.usdFormatter.format(ethers.utils.formatEther(ethers.BigNumber.from(a?.amount || "0").mul(n))),
            wei: a?.amount || "0"
          },
          highestSale: {
            usd: this.usdFormatter.format(ethers.utils.formatEther(ethers.BigNumber.from(o).mul(n))),
            wei: o
          },
          totalVolume: {
            usd: this.usdFormatter.format(ethers.utils.formatEther(ethers.BigNumber.from(c).mul(n))),
            wei: c
          }
        },
        success: !0
      }, await memcache.set(d, JSON.stringify(e), {
        lifetime: 300
      })), e;
    } catch (e) {
      return console.error(e), Sentry.captureException(e), {
        success: !1,
        stats: {}
      };
    }
  }
  async getHistoricalSales({
    fid: e,
    tokenId: t,
    chainId: r,
    timerange: a = "30d"
  }) {
    var i = {}, s = (e && (i.fid = e), t && (i.tokenId = t), r && (i.chainId = r), 
    new Date()), n = new Date(s), [ o, e ] = a.match(/(\d+)(\w)/).slice(1);
    switch (e) {
     case "d":
      n.setDate(s.getDate() - parseInt(o));
      break;

     case "w":
      n.setDate(s.getDate() - 7 * parseInt(o));
      break;

     case "m":
      n.setMonth(s.getMonth() - parseInt(o));
      break;

     case "y":
      n.setFullYear(s.getFullYear() - parseInt(o));
      break;

     default:
      throw new Error("Invalid timerange format");
    }
    i.createdAt = {
      $gte: n,
      $lte: s
    }, i.eventType = {
      $in: [ "Bought", "OfferApproved" ]
    };
    const [ c, d ] = await Promise.all([ ListingLogs.find(i).sort({
      createdAt: 1
    }), this.ethToUsd(1) ]);
    t = c.reduce((e, t) => {
      var r = t.createdAt.toISOString().split("T")[0], t = (e[r] || (e[r] = {
        timestamp: new Date(r).getTime(),
        count: 0
      }), parseFloat(ethers.utils.formatEther(ethers.BigNumber.from(t.price).mul(d))));
      return e[r].count += t, e;
    }, {});
    return Object.values(t).sort((e, t) => e.timestamp - t.timestamp);
  }
}

module.exports = {
  Service: MarketplaceService
};