const Post = require("../../models/Post")["Post"], resolvers = {
  ReactionObject: {
    __resolveType(e) {
      return "Post";
    }
  },
  AccountReaction: {
    reactionObject: async e => {
      let t = null;
      return t = "POST" === e.reactionObjectType ? await Post.findById(e.reactionObjectTypeId) : t;
    },
    account: async (e, t, o) => o.dataloaders.accounts.load(e.account)
  }
};

module.exports = {
  resolvers: resolvers
};