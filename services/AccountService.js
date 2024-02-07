const AccountCommunity = require("../models/AccountCommunity")["AccountCommunity"], Community = require("../models/Community")["Community"], AccountNonce = require("../models/AccountNonce")["AccountNonce"], AccountAddress = require("../models/AccountAddress")["AccountAddress"], Role = require("../models/Role")["Role"], ChannelRecipient = require("../models/ChannelRecipient")["ChannelRecipient"], Channel = require("../models/Channel")["Channel"], validateAndConvertAddress = require("../helpers/validate-and-convert-address")["validateAndConvertAddress"], _AccountCommunityService = require("./AccountCommunityService")["Service"], _CacheService = require("./cache/CacheService")["Service"], _RoleService = require("./RoleService")["Service"];

class AccountService {
  async _getCachedRoleIds(e) {
    return await new _CacheService().getOrCallbackAndSet(async () => {
      return (await this.getRoles(e)).filter(e => e?._id).map(e => e._id);
    }, {
      key: "ClaimedRoles",
      params: {
        accountId: e._id
      },
      expiresAt: new Date(Date.now() + 9e5)
    });
  }
  async updateCurrentAddress(e, {
    address: n,
    signature: i
  }) {
    n = validateAndConvertAddress(n);
    if (await AccountAddress.exists({
      address: n
    })) throw new Error("An account already exists with the address");
    var t = await AccountNonce.findOne({
      account: e._id
    });
    if ((await t.decodeAddressBySignature(i)).toLowerCase() !== n.toLowerCase()) throw new Error("Unauthorized");
    if (t) return i = await AccountAddress.findOneAndUpdate({
      _id: e.addresses[0]
    }, {
      address: n
    }, {
      returnDocument: "after"
    }), await t.generateNewNonce(), i;
    throw new Error("Nonce not found");
  }
  async canClaimRole(e, {
    roleId: n
  }) {
    var i, t;
    return !(!e?._id || !n) && (i = new _RoleService(), t = await AccountAddress.findById(e.addresses[0]), 
    n = await Role.findById(n), await i.canClaimRole(n, {
      address: t.address,
      account: e
    }));
  }
  async claimRole(e, {
    roleId: n
  }) {
    if (!e?._id || !n) throw new Error("Invalid account or roleId");
    var i;
    if (await this.canClaimRole(e, {
      roleId: n
    })) return n = await Role.findById(n), i = new _AccountCommunityService(), e = await AccountCommunity.findOrCreate({
      accountId: e._id,
      communityId: n.community
    }), await i.createOrUpdateRoleForAccountCommunity(e, {
      roleId: n._id,
      isManagedByIndexer: n.isManagedByIndexer
    });
    throw new Error("Cannot claim role");
  }
  async getRoles(e) {
    if (!e?._id) return [];
    e = await AccountCommunity.find({
      account: e._id,
      community: {
        $exists: !0
      }
    });
    const n = new _AccountCommunityService();
    return (await Promise.all(e.map(async e => {
      return await n.getAccountCommunityRoles(e, {
        includeDefault: !0
      });
    }))).flat();
  }
  async getChannelsByRolesAndAccount(e, {
    filters: n = {},
    ...i
  } = {}) {
    var t;
    return e?._id ? (t = await this._getCachedRoleIds(e), Channel.findAndSort({
      ...i,
      sort: "-lastPostCreatedAt",
      filters: {
        ...n,
        recipientIds: [ ...t, e._id ]
      }
    })) : [];
  }
  async getChannelRecipientsByRolesAndAccount(e, {
    filters: n = {},
    ...i
  } = {}) {
    var t;
    return e?._id ? (t = await this._getCachedRoleIds(e), ChannelRecipient.findAndSort({
      ...i,
      filters: {
        ...n,
        recipientIds: [ ...t, e._id ]
      }
    })) : [];
  }
  async refreshRoles(n, {
    communityId: e
  }) {
    if (!n?._id || !e) return [];
    const i = new _RoleService();
    e = await Community.findById(e).populate({
      path: "roles",
      match: {
        isManagedByIndexer: !0,
        editable: !0
      }
    });
    const t = await AccountAddress.findById(n.addresses[0]), r = [];
    return await Promise.all(e.roles.map(async e => {
      await i.canClaimRole(e, {
        address: t.address,
        account: n
      }) && r.push(e);
    })), r;
  }
  async claimRoles(e, {
    communityId: n
  }) {
    if (!e?._id || !n) return [];
    var i, t = await this.refreshRoles(e, {
      communityId: n
    }), r = new _AccountCommunityService(), a = await AccountCommunity.findOne({
      account: e._id,
      community: n
    });
    for (i of t) await r.createOrUpdateRoleForAccountCommunity(a, {
      roleId: i._id,
      isManagedByIndexer: i.isManagedByIndexer
    });
    return t;
  }
  async validPermissionForUnauthenticatedAccount(e, {
    communityId: n,
    permissionIdentifier: i,
    permissionId: t,
    channelId: r
  }) {
    n = await Role.findDefaultPublicRoleForCommunity({
      communityId: n
    });
    return new _RoleService().hasPermission(n, {
      permissionIdentifier: i,
      permissionId: t,
      channelId: r
    });
  }
  async validPermissionForAccount(e, {
    communityId: n,
    permissionIdentifier: i,
    permissionId: t,
    channelId: r
  }, a) {
    var o;
    return !!n && (o = () => this.validPermissionForUnauthenticatedAccount(null, {
      communityId: n,
      permissionIdentifier: i,
      permissionId: t,
      channelId: r
    }), e?._id ? (e = await AccountCommunity.findOrCreate({
      accountId: e._id,
      communityId: n
    }), await new _AccountCommunityService().validPermissionForAccountCommunity(e, {
      permissionIdentifier: i,
      permissionId: t,
      channelId: r
    }, a)) : o());
  }
}

module.exports = {
  Service: AccountService
};