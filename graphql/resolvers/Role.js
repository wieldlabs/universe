const Community = require("../../models/Community")["Community"], AccountCommunityRole = require("../../models/AccountCommunityRole")["AccountCommunityRole"], IndexerRule = require("../../models/IndexerRule")["IndexerRule"], _RoleQueryService = require("../../services/queryServices/RoleQueryService")["Service"], unauthorizedErrorOrAccount = require("../../helpers/auth-middleware")["unauthorizedErrorOrAccount"], RoleQueryService = new _RoleQueryService(), resolvers = {
  Role: {
    community: async e => Community.findById(e.community),
    indexerRules: async e => IndexerRule.find({
      _id: {
        $in: e.indexerRules
      }
    }),
    membersCount: async e => {
      return await AccountCommunityRole.find({
        isValid: !0,
        role: e._id
      }).count();
    },
    members: async (e, r) => {
      return await AccountCommunityRole.findAndSort({
        ...r,
        filters: {
          isValid: !0,
          role: e._id
        }
      });
    },
    accountCommunityRole: async (e, r, o) => {
      return (await unauthorizedErrorOrAccount(e, r, o)).account ? RoleQueryService.accountCommunityRole(e, r, o) : null;
    }
  }
};

module.exports = {
  resolvers: resolvers
};