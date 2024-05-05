const SyncedActions = require("../models/farcaster")["SyncedActions"], AccountBookmarks = require("../models/AccountBookmarks")["AccountBookmarks"], getMemcachedClient = require("../connectmemcached")["getMemcachedClient"];

class AccountBookmarkService {
  static SupportedTypes = [ "ACTIONS" ];
  async bookmarks(r, {
    type: o,
    limit: c,
    cursor: a
  }) {
    var n = getMemcachedClient();
    try {
      var i, [ s, u ] = a ? a.split("-") : [ null, null ], d = {
        account: r,
        type: o,
        createdAt: {
          $lt: s || Date.now()
        },
        id: {
          $lt: u || Number.MAX_SAFE_INTEGER
        }
      }, k = await AccountBookmarks.find(d).sort({
        createdAt: -1,
        _id: 1
      }).limit(parseInt(c) + 1), m = k.map(e => e.object);
      let e;
      if (!e) {
        if ("ACTIONS" !== o) throw new Error("Unsupported type");
        if (e = await SyncedActions.find({
          _id: {
            $in: m
          }
        }), a) try {
          await n.set(a ? `AccountBookmarkService:bookmarks:${r}:${o}:${c}:` + a : `AccountBookmarkService:bookmarks:${r}:` + o, JSON.stringify(e));
        } catch (e) {
          console.error(e);
        }
      }
      let t = null;
      return k.length > c && (i = k[k.length - 2], t = i.createdAt.getTime() + "-" + i._id), 
      [ e.slice(0, c), t ];
    } catch (e) {
      throw console.error("Failed to fetch bookmarks:", e), e;
    }
  }
  async createBookmark(e, t) {
    if (!t.account || !t.accountId) throw new Error("Account information is required.");
    if (!e.type || !AccountBookmarkService.SupportedTypes.includes(e.type)) throw new Error("Type is required.");
    if (!e.object) throw new Error("Object is required.");
    try {
      return await AccountBookmarks.findOneAndUpdate({
        account: t.accountId || t.account._id,
        type: e.type,
        object: e.object
      }, {
        account: t.accountId || t.account._id,
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
    ...t
  }, r) {
    if (!r.account || !r.accountId) throw new Error("Account information is required.");
    if (!e || !AccountBookmarkService.SupportedTypes.includes(e)) throw new Error("Type is required.");
    let o;
    if ("ACTIONS" !== e) throw new Error("Unsupported type");
    o = await SyncedActions.create(t);
    try {
      var c = await this.createBookmark({
        type: e,
        object: o._id
      }, r);
      return {
        ...o,
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