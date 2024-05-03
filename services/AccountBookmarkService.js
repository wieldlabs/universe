const SyncedActions = require("../models/farcaster")["SyncedActions"], AccountBookmarks = require("../models/AccountBookmarks")["AccountBookmarks"];

class AccountBookmarkService {
  static SupportedTypes = [ "ACTIONS" ];
  async bookmarks(r, {
    type: e,
    limit: t,
    offset: c
  }) {
    try {
      var a = (await AccountBookmarks.find({
        account: r,
        type: e
      }).limit(t).skip(c)).map(o => o.object);
      let o;
      if ("ACTIONS" !== e) throw new Error("Unsupported type");
      return o = await SyncedActions.find({
        _id: {
          $in: a
        }
      });
    } catch (o) {
      throw console.error("Failed to fetch bookmarks:", o), o;
    }
  }
  async createBookmark(o, r) {
    if (!r.account || !r.accountId) throw new Error("Account information is required.");
    if (!o.type || !AccountBookmarkService.SupportedTypes.includes(o.type)) throw new Error("Type is required.");
    if (!o.object) throw new Error("Object is required.");
    try {
      return await AccountBookmarks.findOneAndUpdate({
        account: r.accountId || r.account._id,
        type: o.type,
        object: o.object
      }, {
        account: r.accountId || r.account._id,
        ...o
      }, {
        upsert: !0
      });
    } catch (o) {
      throw console.error("Failed to create bookmark:", o), o;
    }
  }
  async createBookmarkWithObject({
    type: o,
    ...r
  }, e) {
    if (!e.account || !e.accountId) throw new Error("Account information is required.");
    if (!o || !AccountBookmarkService.SupportedTypes.includes(o)) throw new Error("Type is required.");
    let t;
    if ("ACTIONS" !== o) throw new Error("Unsupported type");
    t = await SyncedActions.create(r);
    try {
      var c = await this.createBookmark({
        type: o,
        object: t._id
      }, e);
      return {
        ...t,
        bookmark: c
      };
    } catch (o) {
      throw console.error("Failed to create bookmark:", o), o;
    }
  }
}

module.exports = {
  Service: AccountBookmarkService
};