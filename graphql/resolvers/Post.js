const get = require("lodash/get"), AccountReaction = require("../../models/AccountReaction")["AccountReaction"], Post = require("../../models/Post")["Post"], _PostQueryService = require("../../services/queryServices/PostQueryService")["Service"], unauthorizedErrorOrAccount = require("../../helpers/auth-middleware")["unauthorizedErrorOrAccount"], PostQueryService = new _PostQueryService(), resolvers = {
  Post: {
    rootCommentCount: async e => {
      return await Post.countDocuments({
        root: get(e, "_id")
      });
    },
    commentCount: async e => e.replies?.length || 0,
    reactionCount: async e => {
      return await AccountReaction.countReactionsByPostId(get(e, "_id"));
    },
    replies: async (e, t) => {
      return e.replies?.length ? await Post.findAndSort({
        filters: {
          post: get(e, "_id"),
          showHidden: !0
        },
        ...t
      }) : [];
    },
    parent: async (e, t, r) => e.parent ? r.dataloaders.posts.load(e.parent) : null,
    account: async (e, t, r) => {
      return await r.dataloaders.accounts.load(e.account);
    },
    community: async (e, t, r) => {
      return await r.dataloaders.communities.load(e.community);
    },
    channel: async (e, t, r) => {
      return e.channel ? await r.dataloaders.channels.load(e.channel) : null;
    },
    richContent: async (e, t, r) => PostQueryService.richContent(e, t, r),
    currentAccountPermissions: async (e, t, r) => ({
      _id: () => e._id,
      canHide: async () => {
        return !!(await unauthorizedErrorOrAccount(e, t, r)).account && PostQueryService.canHide(e, t, r);
      },
      canRead: async () => PostQueryService.canRead(e, t, r)
    })
  }
};

module.exports = {
  resolvers: resolvers
};