const app = require("express").Router(), Contract = require("../models/wallet/Contract")["Contract"], {
  getMemcachedClient,
  getHash
} = require("../connectmemcached"), axios = (app.get("/v1/", async (t, a) => {
  try {
    var {
      factoryInterfaceType: s,
      contractDeployer: n,
      cursor: c,
      limit: o = 10
    } = t.query, i = getMemcachedClient(), [ u, l ] = c ? c.split("-") : [ null, null ], g = s ? {
      factoryInterfaceType: s
    } : {}, m = (n && (g.contractDeployer = n), {
      sort: {
        createdAt: -1
      },
      limit: parseInt(o, 10)
    });
    g.createdAt = {
      $lt: u || Date.now()
    }, g.id = {
      $lt: l || Number.MAX_SAFE_INTEGER
    };
    let e;
    var d, f = `getContracts:${JSON.stringify(g)}:${o}:` + c;
    try {
      var p = await i.get(f);
      p && (e = JSON.parse(p.value));
    } catch (e) {
      console.error(e);
    }
    if (!e) {
      e = await Contract.find(g, null, m);
      try {
        c && await i.set(f, JSON.stringify(e), {
          lifetime: 60
        });
      } catch (e) {
        console.error(e);
      }
    }
    let r = null;
    return e.length === o && (d = e[e.length - 1], r = d.createdAt.getTime() + "-" + d._id), 
    a.json({
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
}), app.get("/v1/metadata/:contractSlugOrAddress/:tokenId", async (e, r) => {
  try {
    var t = e.params["contractSlugOrAddress"], a = await Contract.findOne({
      $or: [ {
        slug: t
      }, {
        address: t
      } ]
    });
    return a ? r.json({
      ...a.metadata?.toJSON(),
      image: a.metadata?.rawImageUrl || a.metadata?.imageUrl
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
}), require("axios")), cheerio = require("cheerio");

async function fetchDirectImageUrl(e) {
  const r = new AbortController();
  var t = setTimeout(() => r.abort(), 5e3);
  try {
    var a = await axios.get(e, {
      signal: r.signal
    }), s = (clearTimeout(t), a.data), n = cheerio.load(s), c = n('meta[property="og:image"]').attr("content"), o = n("img").first().attr("src");
    return c || o || e;
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
    var n = Buffer.from(a.data, "binary");
    r.setHeader("Content-Type", s), r.send(n);
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