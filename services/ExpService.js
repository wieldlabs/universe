const AccountExp = require("../models/AccountExp")["AccountExp"], Post = require("../models/Post")["Post"];

class ExpService {
  getPostReactedToExpCount(t) {
    return t?.reactions?.likes || 0;
  }
  getPostReplyExpCount() {
    return 5;
  }
  getPostRepliedToExpCount() {
    return 5;
  }
  getPostCreatedExpCount() {
    return 10;
  }
  getFollowedByExpCount() {
    return 10;
  }
  async awardPostOrReplyExp(t, {
    post: e
  }, o) {
    var n;
    return e ? ((e = await Post.findById(e?.parent).select("account")) && (n = await AccountExp.findOne({
      account: e.account
    })) && (n.exp += this.getPostRepliedToExpCount(), await n.save()), (n = await AccountExp.findOne({
      account: o.accountId
    })) && (o = e ? this.getPostReplyExpCount() : this.getPostCreatedExpCount(), 
    n.exp += o, await n.save()), n) : null;
  }
  async awardReactionExp(t, {
    post: e,
    accountReaction: o
  }, n) {
    return !(e && e.account && o && o?.reactions?.likes) || new Date(o.createdAt) - new Date(o.updatedAt) < -100 || e.account.toString() === n.accountId.toString() ? null : ((n = await AccountExp.findOne({
      account: e.account
    })) && (n.exp += this.getPostReactedToExpCount(o), await n.save()), n);
  }
  async awardRelationshipExp(t, {
    relationship: e
  }) {
    if (e && e?.isFollowing) return (e = await AccountExp.findOne({
      account: e.to
    })) && (e.exp += this.getFollowedByExpCount(), await e.save()), e;
  }
}

module.exports = {
  Service: ExpService
};