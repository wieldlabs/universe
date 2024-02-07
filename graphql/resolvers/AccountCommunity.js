const AccountCommunityService = require("../../services")["AccountCommunityService"], resolvers = {
  AccountCommunity: {
    account: async (o, e, n) => {
      return await n.dataloaders.accounts.load(o.account);
    },
    community: async (o, e, n) => {
      return await n.dataloaders.communities.load(o.community);
    },
    unseenPostsCount: async (o, e, n) => {
      return o?.joined ? await AccountCommunityService.countUnseenPostsCount(o, {}, n) : 0;
    }
  }
};

module.exports = {
  resolvers: resolvers
};