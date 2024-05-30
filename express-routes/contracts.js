const app = require("express").Router(), Contract = require("../models/wallet/Contract")["Contract"], {
  memcache,
  getHash
} = require("../connectmemcache"), axios = (app.get("/v1/", async (t, a) => {
  try {
    var s, {
      factoryInterfaceType: c,
      contractDeployer: n,
      cursor: o,
      sort: i = "createdAt",
      limit: d = 10,
      filters: l,
      includeUser: u = !1
    } = t.query, [ g, m ] = o ? o.split("-") : [ null, null ], p = c ? {
      factoryInterfaceType: c
    } : {}, f = (p.createdAt = {
      $lt: g || Date.now()
    }, p.id = {
      $lt: m || Number.MAX_SAFE_INTEGER
    }, n && (p.contractDeployer = n), l && (s = JSON.parse(l)).createdAt && (s.createdAt.startsWith("-") ? p.createdAt = {
      $lt: s.createdAt.slice(1)
    } : p.createdAt = {
      $gt: s.createdAt
    }), {
      sort: i,
      limit: parseInt(d, 10)
    });
    let e;
    var y, h = `getContracts:${JSON.stringify(p)}:${d}:` + o, v = await memcache.get(h);
    (e = v ? JSON.parse(v.value) : e) || (e = await Contract.find(p, null, f), o && await memcache.set(h, JSON.stringify(e), {
      lifetime: 60
    }));
    let r = null;
    return e.length === d && (y = e[e.length - 1], r = y.createdAt.getTime() + "-" + y._id), 
    u && (e = await Promise.all(e.map(async e => {
      var r = await getFarcasterUserByAddress(e.contractDeployer);
      return {
        ...e,
        user: r
      };
    }))), a.json({
      success: !0,
      contracts: e,
      next: r
    });
  } catch (e) {
    return console.error("Error fetching contracts: " + e), a.status(500).json({
      success: !1,
      message: "Internal server error"
    });
  }
}), app.get("/v1/metadata/:contractSlugOrAddress/:tokenId", async (r, t) => {
  try {
    var a, s = r.params["contractSlugOrAddress"], c = await Contract.findOne({
      $or: [ {
        slug: s
      }, {
        address: s
      } ]
    });
    if (!c) return t.status(404).json({
      success: !1,
      message: "Contract not found"
    });
    let e = {
      ...c.metadata?.toJSON(),
      image: c.metadata?.rawImageUrl || c.metadata?.imageUrl
    };
    return c.isSet && (a = await Token.findOne({
      contractAddress: c.address,
      tokenId: r.params.tokenId
    })) && (e = {
      ...e,
      ...a.metadata?.toJSON(),
      image: a.metadata?.rawImageUrl || a.metadata?.imageUrl || e.image
    }), t.json(e);
  } catch (e) {
    return console.error("Error fetching contract metadata: " + e), t.status(500).json({
      success: !1,
      message: "Internal server error"
    });
  }
}), app.get("/v1/:chainId/:contractSlugOrAddress", async (e, r) => {
  try {
    var {
      contractSlugOrAddress: t,
      chainId: a
    } = e.params, s = await Contract.findOne({
      $or: [ {
        slug: t
      }, {
        address: t
      } ],
      chainId: a
    });
    return s ? r.json({
      contract: s
    }) : r.status(404).json({
      success: !1,
      message: "Contract not found"
    });
  } catch (e) {
    return console.error("Error fetching contract metadata: " + e), r.status(500).json({
      success: !1,
      message: "Internal server error"
    });
  }
}), require("axios")), cheerio = require("cheerio"), Token = require("../models/wallet/Token")["Token"], {
  getFarcasterUserByCustodyAddress,
  getFarcasterUserByFid,
  getFarcasterUserByAddress
} = require("../helpers/farcaster");

async function fetchDirectImageUrl(e) {
  const r = new AbortController();
  var t = setTimeout(() => r.abort(), 5e3);
  try {
    var a = await axios.get(e, {
      signal: r.signal
    }), s = (clearTimeout(t), a.data), c = cheerio.load(s), n = c('meta[property="og:image"]').attr("content"), o = c("img").first().attr("src");
    return n || o || e;
  } catch (e) {
    return clearTimeout(t), console.error("Error fetching direct image URL: " + e), 
    null;
  }
}

async function handleImageResponse(e, r) {
  var t = e.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  t ? e = "https://drive.google.com/uc?export=view&id=" + t[1] : /\.(jpeg|jpg|gif|png|svg)$/.test(e) || (e = await Promise.race([ fetchDirectImageUrl(e), new Promise((e, r) => setTimeout(() => r(new Error("Timeout")), 5e3)) ]));
  try {
    var a = await axios.get(e, {
      responseType: "arraybuffer"
    }), s = a.headers["content-type"];
    if (!s.startsWith("image")) return r.redirect(e);
    var c = Buffer.from(a.data, "binary");
    r.setHeader("Content-Type", s), r.send(c);
  } catch (e) {
    return console.error("Error fetching image: " + e), r.status(500).json({
      success: !1,
      message: "Internal server error"
    });
  }
}

app.get("/v1/images", async (r, t) => {
  try {
    var a, s = r.query["contractId"];
    let e = r.query.image;
    if (e || (a = await Contract.findById(s), e = a.metadata?.imageUrl), !e) return t.status(404).json({
      success: !1,
      message: "Image not found for contract"
    });
    await handleImageResponse(e, t);
  } catch (e) {
    return console.error("Error fetching contract image: " + e), t.status(500).json({
      success: !1,
      message: "Internal server error"
    });
  }
}), module.exports = {
  router: app
};