const mongoose = require("mongoose"), schema = require("../schemas/accountReaction")["schema"], Post = require("./Post")["Post"];

class AccountReactionClass {
  static ping() {
    console.log("model: AccountReaction");
  }
  static _getDefaultReactions() {
    return {
      likes: 0
    };
  }
  static async _findOrCreateAccountReaction({
    accountId: t,
    reactionObjectTypeId: e,
    reactionObjectType: c
  }) {
    let o = await this.findOne({
      account: t,
      reactionObjectTypeId: e,
      reactionObjectType: c
    });
    return o = o || await this.create({
      account: t,
      reactionObjectTypeId: e,
      reactionObjectType: c,
      reactions: this._getDefaultReactions()
    });
  }
  static async countReactionsByPostId(t) {
    return (await this.find({
      reactionObjectTypeId: t,
      reactionObjectType: "POST"
    })).reduce((t, e) => t + e.reactions.likes, 1);
  }
  static async findReactionsByPostId(t, {
    limit: e = 20,
    offset: c = 0
  } = {}) {
    return this.find({
      reactionObjectTypeId: t,
      reactionObjectType: "POST"
    }).skip(parseInt(c, 10)).limit(parseInt(e, 10));
  }
  static async findReactionByAccountAndObjectId({
    accountId: t,
    reactionObjectType: e,
    reactionObjectTypeId: c
  }) {
    return this.findOne({
      reactionObjectTypeId: c,
      reactionObjectType: e,
      account: t
    });
  }
  static async reactForPost({
    postId: t,
    accountId: e,
    reactionType: c,
    amount: o
  }) {
    var n = await Post.findById(t);
    if (!n) throw new Error("Invalid post id: " + t);
    if (1 < Math.abs(o)) throw new Error("Invalid amount: " + o);
    e = await this._findOrCreateAccountReaction({
      accountId: e,
      reactionObjectTypeId: t,
      reactionObjectType: "POST"
    });
    return "LIKES" === c && (e.reactions.likes = o, await e.save()), [ n, e ];
  }
}

schema.loadClass(AccountReactionClass);

const AccountReaction = mongoose.models.AccountReaction || mongoose.model("AccountReaction", schema);

module.exports = {
  AccountReaction: AccountReaction
};