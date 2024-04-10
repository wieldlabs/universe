const app = require("express").Router(), Contract = require("../models/wallet/Contract")["Contract"], {
  getMemcachedClient,
  getHash
} = require("../connectmemcached");

app.get("/v1/contracts", async (e, a) => {
  try {
    var {
      factoryInterfaceType: s,
      cursor: c,
      limit: n = 10
    } = e.query, o = getMemcachedClient(), [ l, u ] = c ? c.split("-") : [ null, null ], d = s ? {
      factoryInterfaceType: s
    } : {}, i = {
      sort: {
        createdAt: -1
      },
      limit: parseInt(n, 10)
    };
    d.createdAt = {
      $lt: l || Date.now()
    }, d.id = {
      $lt: u || Number.MAX_SAFE_INTEGER
    };
    let t;
    var g, m = `getContracts:${s}:${n}:` + c;
    try {
      var p = await o.get(m);
      p && (t = JSON.parse(p.value));
    } catch (t) {
      console.error(t);
    }
    if (!t) {
      t = await Contract.find(d, null, i);
      try {
        c && await o.set(m, JSON.stringify(t), {
          lifetime: 60
        });
      } catch (t) {
        console.error(t);
      }
    }
    let r = null;
    return t.length === n && (g = t[t.length - 1], r = g.createdAt.getTime() + "-" + g._id), 
    a.json({
      success: !0,
      data: t,
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