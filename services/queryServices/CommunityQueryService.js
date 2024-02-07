const AccountCommunity = require("../../models/AccountCommunity")["AccountCommunity"], CommunityService = require("../CommunityService")["Service"], _CurrentAccountPermissionService = require("./CurrentAccountPermissionService")["Service"], _InitializeAccountCommunityService = require("../initializer/InitializeAccountCommunityService")["Service"], unauthorizedErrorOrAccount = require("../../helpers/auth-middleware")["unauthorizedErrorOrAccount"];

class CommunityQueryService extends CommunityService {
  async accountCommunity(n, e, i) {
    e = await unauthorizedErrorOrAccount(n, e, i);
    return e.account ? await AccountCommunity.findOne({
      account: e.account._id,
      community: n._id
    }) || new _InitializeAccountCommunityService().initialize(null, {
      communityId: n._id
    }, i) : null;
  }
  async currentAccountPermissions(n, e, i) {
    const c = await unauthorizedErrorOrAccount(n, e, i), r = n?._id;
    var t = e?.channelId;
    return {
      canAdmin: async () => !(!c.account || !r) && this.canAdmin(n, e, i),
      ...new _CurrentAccountPermissionService().currentAccountPermissions(n, {
        communityId: r,
        channelId: t
      }, i)
    };
  }
  async channels(n) {
    return n && (await n.populate?.({
      path: "channels",
      match: {
        isHidden: !1
      },
      sort: {
        createdAt: 1
      }
    }))?.channels || [];
  }
}

module.exports = {
  Service: CommunityQueryService
};