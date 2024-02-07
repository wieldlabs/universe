const RoleService = require("../../services/RoleService")["Service"], AccountCommunityRole = require("../../models/AccountCommunityRole")["AccountCommunityRole"], AccountCommunity = require("../../models/AccountCommunity")["AccountCommunity"];

class RoleQueryService extends RoleService {
  async accountCommunityRole(e, o, c) {
    return e && (c = await AccountCommunity.findOne({
      account: c.account?._id || c.accountId,
      community: e.community
    })) ? await AccountCommunityRole.findOne({
      role: e._id,
      accountCommunity: c._id
    }) : null;
  }
}

module.exports = {
  Service: RoleQueryService
};