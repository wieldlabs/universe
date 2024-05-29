const SyncedActions = require("../models/farcaster")["SyncedActions"], AccountBookmarks = require("../models/AccountBookmarks")["AccountBookmarks"], memcache = require("../connectmemcache")["memcache"];

class AccountBookmarkService {
  static SupportedTypes = [ "ACTIONS" ];
  async bookmarks(r, {
    type: t,
    limit: c,
    cursor: a
  }) {
    try {
      var n, [ i, u ] = a ? a.split("-") : [ null, null ], s = {
        account: r,
        type: t,
        createdAt: {
          $lt: i || Date.now()
        },
        id: {
          $lt: u || Number.MAX_SAFE_INTEGER
        }
      }, k = await AccountBookmarks.find(s).sort({
        createdAt: -1,
        _id: 1
      }).limit(parseInt(c) + 1), d = k.map(e => e.object);
      let e;
      if (!e) {
        if ("ACTIONS" !== t) throw new Error("Unsupported type");
        e = await SyncedActions.find({
          _id: {
            $in: d
          }
        }), a && await memcache.set(a ? `AccountBookmarkService:bookmarks:${r}:${t}:${c}:` + a : `AccountBookmarkService:bookmarks:${r}:` + t, JSON.stringify(e));
      }
      let o = null;
      return k.length > c && (n = k[k.length - 2], o = n.createdAt.getTime() + "-" + n._id), 
      [ e.slice(0, c), o ];
    } catch (e) {
      throw console.error("Failed to fetch bookmarks:", e), e;
    }
  }
  async createBookmark(e, o) {
    if (!o.account || !o.accountId) throw new Error("Account information is required.");
    if (!e.type || !AccountBookmarkService.SupportedTypes.includes(e.type)) throw new Error("Type is required.");
    if (!e.object) throw new Error("Object is required.");
    try {
      return await AccountBookmarks.findOneAndUpdate({
        account: o.accountId || o.account._id,
        type: e.type,
        object: e.object
      }, {
        account: o.accountId || o.account._id,
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
    ...o
  }, r) {
    if (!r.account || !r.accountId) throw new Error("Account information is required.");
    if (!e || !AccountBookmarkService.SupportedTypes.includes(e)) throw new Error("Type is required.");
    let t;
    if ("ACTIONS" !== e) throw new Error("Unsupported type");
    t = await SyncedActions.create(o);
    try {
      var c = await this.createBookmark({
        type: e,
        object: t._id
      }, r);
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