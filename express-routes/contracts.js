const app = require("express").Router(), Contract = require("../models/wallet/Contract")["Contract"], {
  memcache,
  getHash
} = require("../connectmemcache"), config = require("../helpers/config")["config"], Sentry = require("@sentry/node"), axios = (app.get("/v1/", async (r, a) => {
  try {
    var s, {
      factoryInterfaceType: n,
      contractDeployer: o,
      cursor: c,
      sort: i = "createdAt",
      limit: d = 10,
      filters: g,
      includeUser: l = !1
    } = r.query, [ u, m ] = c ? c.split("-") : [ null, null ], p = n ? {
      factoryInterfaceType: n
    } : {}, f = (p.createdAt = {
      $lt: u || Date.now()
    }, p.id = {
      $lt: m || Number.MAX_SAFE_INTEGER
    }, o && (p.contractDeployer = o), g && (s = JSON.parse(g)).createdAt && (s.createdAt.startsWith("-") ? p.createdAt = {
      $lt: s.createdAt.slice(1)
    } : p.createdAt = {
      $gt: s.createdAt
    }), {
      sort: i,
      limit: parseInt(d, 10)
    });
    let e;
    var y, h = `getContracts:${JSON.stringify(p)}:${d}:` + c, v = await memcache.get(h);
    (e = v ? JSON.parse(v.value) : e) || (e = await Contract.find(p, null, f), c && await memcache.set(h, JSON.stringify(e), {
      lifetime: 60
    }));
    let t = null;
    return e.length === d && (y = e[e.length - 1], t = y.createdAt.getTime() + "-" + y._id), 
    l && (e = await Promise.all(e.map(async e => {
      var [ t, r, a ] = await Promise.all([ getFarcasterUserByCustodyAddress(e.contractDeployer), getFarcasterUserByConnectedAddress(e.contractDeployer), getFarcasterUserByFid(e.contractDeployer) ]), t = t || r || a;
      return {
        ...e,
        user: t
      };
    }))), a.json({
      success: !0,
      contracts: e,
      next: t
    });
  } catch (e) {
    return console.error("Error fetching contracts: " + e), a.status(500).json({
      success: !1,
      message: "Internal server error"
    });
  }
}), app.get("/v1/metadata/:contractSlugOrAddress/:tokenId", async (t, r) => {
  try {
    var a, s = t.params["contractSlugOrAddress"], n = await Contract.findOne({
      $or: [ {
        slug: s
      }, {
        address: s
      } ]
    });
    if (!n) return r.status(404).json({
      success: !1,
      message: "Contract not found"
    });
    let e = {
      ...n.metadata?.toJSON(),
      image: n.metadata?.rawImageUrl || n.metadata?.imageUrl
    };
    return n.isSet && (a = await Token.findOne({
      contractAddress: n.address,
      tokenId: t.params.tokenId
    })) && (e = {
      ...e,
      ...a.metadata?.toJSON(),
      image: a.metadata?.rawImageUrl || a.metadata?.imageUrl || e.image
    }), r.json(e);
  } catch (e) {
    return console.error("Error fetching contract metadata: " + e), r.status(500).json({
      success: !1,
      message: "Internal server error"
    });
  }
}), app.get("/v1/:chainId/:contractSlugOrAddress", async (e, t) => {
  try {
    var {
      contractSlugOrAddress: r,
      chainId: a
    } = e.params, s = await Contract.findOne({
      $or: [ {
        slug: r
      }, {
        address: r
      } ],
      chainId: a
    });
    return s ? t.json({
      contract: s
    }) : t.status(404).json({
      success: !1,
      message: "Contract not found"
    });
  } catch (e) {
    return console.error("Error fetching contract metadata: " + e), t.status(500).json({
      success: !1,
      message: "Internal server error"
    });
  }
}), require("axios")), cheerio = require("cheerio"), Token = require("../models/wallet/Token")["Token"], {
  getFarcasterUserByCustodyAddress,
  getFarcasterUserByFid,
  getFarcasterUserByAddress,
  getFarcasterUserByConnectedAddress
} = require("../helpers/farcaster"), frameContext = require("../helpers/farcaster-utils")["frameContext"], {
  getTxDataForProxyRegister2Address,
  getTxDataForOpController,
  getBebdomainTxData
} = require("../helpers/get-contracts-tx-data");

async function fetchDirectImageUrl(e) {
  const t = new AbortController();
  var r = setTimeout(() => t.abort(), 5e3);
  try {
    var a = await axios.get(e, {
      signal: t.signal
    }), s = (clearTimeout(r), a.data), n = cheerio.load(s), o = n('meta[property="og:image"]').attr("content"), c = n("img").first().attr("src");
    return o || c || e;
  } catch (e) {
    return clearTimeout(r), console.error("Error fetching direct image URL: " + e), 
    null;
  }
}

async function handleImageResponse(e, t) {
  var r = e.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  r ? e = "https://drive.google.com/uc?export=view&id=" + r[1] : /\.(jpeg|jpg|gif|png|svg)$/.test(e) || (e = await Promise.race([ fetchDirectImageUrl(e), new Promise((e, t) => setTimeout(() => t(new Error("Timeout")), 5e3)) ]));
  try {
    var a = await axios.get(e, {
      responseType: "arraybuffer"
    }), s = a.headers["content-type"];
    if (!s.startsWith("image")) return t.redirect(e);
    var n = Buffer.from(a.data, "binary");
    t.setHeader("Content-Type", s), t.send(n);
  } catch (e) {
    return console.error("Error fetching image: " + e), t.status(500).json({
      success: !1,
      message: "Internal server error"
    });
  }
}

app.get("/v1/images", async (t, r) => {
  try {
    var a, s = t.query["contractId"];
    let e = t.query.image;
    if (e || (a = await Contract.findById(s), e = a.metadata?.imageUrl), !e) return r.status(404).json({
      success: !1,
      message: "Image not found for contract"
    });
    await handleImageResponse(e, r);
  } catch (e) {
    return console.error("Error fetching contract image: " + e), r.status(500).json({
      success: !1,
      message: "Internal server error"
    });
  }
}), app.post("/v1/transactions/:txId/data", frameContext, async (t, r) => {
  var a = t.params["txId"];
  try {
    let e;
    return a === config().PROXY_REGISTER_2_ADDRESS ? e = await getTxDataForProxyRegister2Address(t) : "mint-bebdomain" === a && (e = await getBebdomainTxData(t)), 
    e ? r.status(200).json(e) : r.status(500).json({
      success: !1,
      message: "Invalid contract address"
    });
  } catch (e) {
    return Sentry.captureException(e), console.error("Error fetching tx data for contract", e), 
    r.status(500).json({
      success: !1,
      message: "Failed to fetch tx data"
    });
  }
}), module.exports = {
  router: app
};