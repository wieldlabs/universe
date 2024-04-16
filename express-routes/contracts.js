const app = require("express").Router(), Contract = require("../models/wallet/Contract")["Contract"], {
  getMemcachedClient,
  getHash
} = require("../connectmemcached");

app.get("/v1/", async (e, a) => {
  try {
    var {
      factoryInterfaceType: s,
      contractDeployer: c,
      cursor: n,
      limit: o = 10
    } = e.query, l = getMemcachedClient(), [ u, d ] = n ? n.split("-") : [ null, null ], i = s ? {
      factoryInterfaceType: s
    } : {}, g = (c && (i.contractDeployer = c), {
      sort: {
        createdAt: -1
      },
      limit: parseInt(o, 10)
    });
    i.createdAt = {
      $lt: u || Date.now()
    }, i.id = {
      $lt: d || Number.MAX_SAFE_INTEGER
    };
    let t;
    var m, p = `getContracts:${JSON.stringify(i)}:${o}:` + n;
    try {
      var h = await l.get(p);
      h && (t = JSON.parse(h.value));
    } catch (t) {
      console.error(t);
    }
    if (!t) {
      t = await Contract.find(i, null, g);
      try {
        n && await l.set(p, JSON.stringify(t), {
          lifetime: 60
        });
      } catch (t) {
        console.error(t);
      }
    }
    let r = null;
    return t.length === o && (m = t[t.length - 1], r = m.createdAt.getTime() + "-" + m._id), 
    a.json({
      success: !0,
      contracts: t,
      next: r
    });
  } catch (t) {
    return console.error("Error fetching contracts: " + t), a.status(500).json({
      success: !1,
      message: "Internal server error"
    });
  }
}), app.get("/v1/metadata/:contractSlugOrAddress", async (t, r) => {
  try {
    var e = t.params["contractSlugOrAddress"], a = await Contract.findOne({
      $or: [ {
        slug: e
      }, {
        address: e
      } ]
    });
    return a ? r.json(a.metadata) : r.status(404).json({
      success: !1,
      message: "Contract not found"
    });
  } catch (t) {
    return console.error("Error fetching contract metadata: " + t), r.status(500).json({
      success: !1,
      message: "Internal server error"
    });
  }
}), app.get("/v1/:chainId/:contractSlugOrAddress", async (t, r) => {
  try {
    var {
      contractSlugOrAddress: e,
      chainId: a
    } = t.params, s = await Contract.findOne({
      $or: [ {
        slug: e
      }, {
        address: e
      } ],
      chainId: a
    });
    return s ? r.json({
      contract: s
    }) : r.status(404).json({
      success: !1,
      message: "Contract not found"
    });
  } catch (t) {
    return console.error("Error fetching contract metadata: " + t), r.status(500).json({
      success: !1,
      message: "Internal server error"
    });
  }
}), module.exports = {
  router: app
};