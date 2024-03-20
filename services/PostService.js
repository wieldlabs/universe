const Sentry = require("@sentry/node"), _AccountService = require("./AccountService")["Service"], _ContentSerice = require("./ContentService")["Service"], _CommunityService = require("./CommunityService")["Service"], _CacheService = require("./cache/CacheService")["Service"], Post = require("../models/Post")["Post"], Community = require("../models/Community")["Community"], Channel = require("../models/Channel")["Channel"], AccountCommunity = require("../models/AccountCommunity")["AccountCommunity"];

class PostService {
  async _makePost(e, {
    parentId: n,
    channelId: t,
    externalId: i,
    communityId: o,
    contentRaw: c,
    contentJson: r,
    contentHtml: a,
    blocks: u
  }, s) {
    c = await new _ContentSerice().makeRichContent({
      contentRaw: c,
      contentJson: r,
      contentHtml: a,
      blocks: u
    }), r = new Post({
      account: s.account?._id || s.accountId,
      community: o,
      channel: t,
      externalId: i,
      richContent: c
    });
    let m;
    if (n && (m = await Post._getParentOrError(n), r.parent = m._id, r.root = m.root || m._id, 
    r.community = m.community || null, r.channel = m.channel || null), r.channel) {
      a = await Channel.findById(r.channel);
      if (!a) throw new Error("Invalid channel");
      r.community = a.community;
    }
    return [ r, m ];
  }
  async canHide(e, n, t) {
    var i, o;
    return !!(e?.account && t.account && ((i = t.account._id).toString() === e.account.toString() || (o = new _CommunityService(), 
    e = await Community.findById(e.community), await o.canAdmin(e, n, t)) || process.env.GLOBAL_MODERATOR_ID && i.toString() === process.env.GLOBAL_MODERATOR_ID));
  }
  async canPost(e, {
    communityId: n,
    channelId: t
  }, i) {
    if (!n || !i.account) return !1;
    var o = "" + n + (t || "");
    if (void 0 !== i.communities?.[o]?.canWrite) return i.communities?.[o]?.canWrite;
    var c = new _AccountService();
    try {
      var r = await c.validPermissionForAccount(i.account, {
        communityId: n,
        channelId: t,
        permissionIdentifier: "WRITE"
      }, i);
      return i.communities = {
        ...i.communities,
        [o]: {
          canWrite: r
        }
      }, r;
    } catch (e) {
      return console.error(e), Sentry.captureException(e), !1;
    }
  }
  async canRead(e, n, t) {
    var i = e?.community || n?.communityId, e = e?.channel || n?.channelId, n = "" + i + (e || "");
    if (!i) return !1;
    if (void 0 !== t.communities?.[n]?.canRead) return t.communities?.[n]?.canRead;
    try {
      var o = await new _AccountService().validPermissionForAccount(t.account || {
        _id: t.accountId
      }, {
        communityId: i,
        channelId: e,
        permissionIdentifier: "READ"
      }, t);
      return t.communities = {
        ...t.communities,
        [n]: {
          canRead: o
        }
      }, o;
    } catch (e) {
      return console.error(e), Sentry.captureException(e), !1;
    }
  }
  async getExplorePostFeedCommunityIds(n, e, t) {
    var i = (await AccountCommunity.find({
      account: t.accountId || t.account?._id,
      joined: !0
    })).map(e => e.community);
    const o = await Promise.all(i.map(async e => {
      return await this.canRead(n, {
        communityId: e
      }, t);
    }));
    return i.filter((e, n) => o[n]);
  }
  async getExplorePostFeed(e, {
    filters: n = {},
    ...t
  }, i) {
    var o = await new _CacheService().getOrCallbackAndSet(async () => this.getExplorePostFeedCommunityIds(e, {
      filters: n,
      ...t
    }, i), {
      key: "ExploreFeedCommunities",
      params: {
        accountId: i.accountId || i.account?._id
      },
      expiresAt: new Date(Date.now() + 9e5)
    });
    return Post.findAndSort({
      ...t,
      filters: {
        ...n,
        communities: o,
        excludeChannels: !0
      }
    });
  }
  async getPostFeed(e, {
    filters: n = {},
    ...t
  }, i) {
    return n.explore ? this.getExplorePostFeed(e, {
      filters: n,
      ...t
    }, i) : Post.findAndSort({
      ...t,
      filters: n
    });
  }
  async createPostOrUnauthorized(e, n, t) {
    var [ n, i ] = await this._makePost(null, n, t);
    if (await this.canPost(e, {
      communityId: n.community,
      channelId: n.channel
    }, t)) return n.channel && Channel.updateLastPost({
      channelId: n.channel,
      postId: n._id
    }), i ? (n.root.toString() === i._id.toString() ? i.updatedAt = new Date() : await Post.updateOne({
      _id: n.root
    }, {
      updatedAt: new Date()
    }), i.replies.push(n._id), (await Promise.all([ n.save(), i.save() ]))[0]) : n.save();
    throw new Error("You do not have permission to post in the community.");
  }
  async hidePostOrUnauthorized(e, {
    postId: n
  }, t) {
    var i = await Post.findById(n);
    if (await this.canHide(i, {
      postId: n
    }, t)) return i.isHidden = !0, i.save();
    throw new Error("You do not have permission to hide in the community.");
  }
}

module.exports = {
  Service: PostService
};