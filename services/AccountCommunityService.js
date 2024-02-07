const mongoose = require("mongoose"), Post = require("../models/Post")["Post"], Role = require("../models/Role")["Role"], AccountCommunityRole = require("../models/AccountCommunityRole")["AccountCommunityRole"], _RoleService = require("./RoleService")["Service"], _AccountCommunityRoleService = require("./AccountCommunityRoleService")["Service"];

class AccountCommunityService {
  async createOrUpdateRoleForAccountCommunity(e, {
    roleId: o,
    isManagedByIndexer: t,
    isValid: n = !0
  }) {
    if (e && e.community) return o = await new _AccountCommunityRoleService().createOrUpdateAccountCommunityRole(e, {
      roleId: o,
      isManagedByIndexer: t,
      isValid: n
    }), e.roles.includes(o._id) || (e.roles.push(o._id), await e.save()), o;
    throw new Error("Invalid account community");
  }
  async validPermissionForAccountCommunity(e, {
    permissionIdentifier: o,
    permissionId: t,
    channelId: n
  }, i) {
    e = await this.getAccountCommunityRoles(e, {
      includeDefault: !0
    });
    return new _RoleService().hasPermissionForRoles(e, {
      permissionIdentifier: o,
      permissionId: t,
      channelId: n
    }, i);
  }
  async countUnseenPostsCount(e, o, t = {}) {
    return e?.lastSeen && e?.community && (await Post.find({
      community: e.community,
      account: {
        $ne: t.accountId
      },
      createdAt: {
        $gt: new Date(e?.lastSeen)
      }
    }).select("id").sort({
      createdAt: -1
    }).limit(20))?.length || 0;
  }
  async getAccountCommunityRoles(e, {
    includeDefault: o = !0
  } = {}) {
    var t;
    return e ? (t = ((await e.populate({
      path: "roles",
      match: {
        isValid: !0
      },
      populate: {
        path: "role"
      }
    }))?.roles?.map?.(e => e.role) || []).filter(e => e && !0 !== e.isHidden), o && (o = await Role.findDefaultPublicRoleForCommunity({
      communityId: e.community
    })) && t.push(o), t) : [];
  }
  async revokeRole(e, {
    roleId: o
  }) {
    if (e) return await AccountCommunityRole.findOneAndUpdate({
      accountCommunity: e._id,
      isValid: !0,
      role: mongoose.Types.ObjectId(o)
    }, {
      isValid: !1,
      isManagedByIndexer: !1
    });
    throw new Error("Invalid account community");
  }
  async grantRole(e, o) {
    return this.createOrUpdateRoleForAccountCommunity(e, o);
  }
}

module.exports = {
  Service: AccountCommunityService
};