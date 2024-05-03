const app = require("express").Router(), Contract = require("../models/wallet/Contract")["Contract"], {
  getMemcachedClient,
  getHash
} = require("../connectmemcached"), axios = (app.get("/v1/", async (r, a) => {
  try {
    var s, {
      factoryInterfaceType: n,
      contractDeployer: o,
      cursor: c,
      sort: i = "createdAt",
      limit: l = 10,
      filters: d
    } = r.query, g = getMemcachedClient(), [ u, m ] = c ? c.split("-") : [ null, null ], f = n ? {
      factoryInterfaceType: n
    } : {}, p = (f.createdAt = {
      $lt: u || Date.now()
    }, f.id = {
      $lt: m || Number.MAX_SAFE_INTEGER
    }, o && (f.contractDeployer = o), d && (s = JSON.parse(d)).createdAt && (s.createdAt.startsWith("-") ? f.createdAt = {
      $lt: s.createdAt.slice(1)
    } : f.createdAt = {
      $gt: s.createdAt
    }), {
      sort: i,
      limit: parseInt(l, 10)
    });
    let e;
    var h, y = `getContracts:${JSON.stringify(f)}:${l}:` + c;
    try {
      var v = await g.get(y);
      v && (e = JSON.parse(v.value));
    } catch (e) {
      console.error(e);
    }
    if (!e) {
      e = await Contract.find(f, null, p);
      try {
        c && await g.set(y, JSON.stringify(e), {
          lifetime: 60
        });
      } catch (e) {
        console.error(e);
      }
    }
    let t = null;
    return e.length === l && (h = e[e.length - 1], t = h.createdAt.getTime() + "-" + h._id), 
    a.json({
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
}), require("axios")), cheerio = require("cheerio"), Token = require("../models/wallet/Token")["Token"];

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
}), module.exports = {
  router: app
};