const SyncedActions = require("../models/farcaster")["SyncedActions"], AccountBookmarks = require("../models/AccountBookmarks")["AccountBookmarks"], getMemcachedClient = require("../connectmemcached")["getMemcachedClient"];

class AccountBookmarkService {
  static SupportedTypes = [ "ACTIONS" ];
  async bookmarks(o, {
    type: t,
    limit: c,
    cursor: a
  }) {
    var n = getMemcachedClient();
    try {
      var i, [ u, s ] = a ? a.split("-") : [ null, null ], k = {
        account: o,
        type: t,
        createdAt: {
          $lt: u || Date.now()
        },
        id: {
          $lt: s || Number.MAX_SAFE_INTEGER
        }
      }, d = await AccountBookmarks.find(k).sort({
        createdAt: -1,
        _id: 1
      }).limit(c), m = d.map(e => e.object);
      let e;
      try {
        var l = await n.get(a ? `AccountBookmarkService:bookmarks:${o}:${t}:${c}:` + a : `AccountBookmarkService:bookmarks:${o}:` + t);
        l && (e = JSON.parse(l.value).map(e => {
          if ("ACTIONS" === t) return new SyncedActions(e);
        }).filter(e => null !== e));
      } catch (e) {
        console.error(e);
      }
      if (!e) {
        if ("ACTIONS" !== t) throw new Error("Unsupported type");
        if (e = await SyncedActions.find({
          _id: {
            $in: m
          }
        }), a) try {
          await n.set(a ? `AccountBookmarkService:bookmarks:${o}:${t}:${c}:` + a : `AccountBookmarkService:bookmarks:${o}:` + t, JSON.stringify(e));
        } catch (e) {
          console.error(e);
        }
      }
      let r = null;
      return d.length == c && (i = d[d.length - 1], r = i.createdAt.getTime() + "-" + i._id), 
      [ e.slice(0, c), r ];
    } catch (e) {
      throw console.error("Failed to fetch bookmarks:", e), e;
    }
  }
  async createBookmark(e, r) {
    if (!r.account || !r.accountId) throw new Error("Account information is required.");
    if (!e.type || !AccountBookmarkService.SupportedTypes.includes(e.type)) throw new Error("Type is required.");
    if (!e.object) throw new Error("Object is required.");
    try {
      return await AccountBookmarks.findOneAndUpdate({
        account: r.accountId || r.account._id,
        type: e.type,
        object: e.object
      }, {
        account: r.accountId || r.account._id,
        ...e
      }, {
        upsert: !0
      });
    } catch (e) {
      throw console.error("Failed to create bookmark:", e), e;
    }
  }
  async createBookmarkWithObject({
    type: e,
    ...r
  }, o) {
    if (!o.account || !o.accountId) throw new Error("Account information is required.");
    if (!e || !AccountBookmarkService.SupportedTypes.includes(e)) throw new Error("Type is required.");
    let t;
    if ("ACTIONS" !== e) throw new Error("Unsupported type");
    t = await SyncedActions.create(r);
    try {
      var c = await this.createBookmark({
        type: e,
        object: t._id
      }, o);
      return {
        ...t,
        bookmark: c
      };
    } catch (e) {
      throw console.error("Failed to create bookmark:", e), e;
    }
  }
}

module.exports = {
  Service: AccountBookmarkService
};