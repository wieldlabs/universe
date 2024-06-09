const mongoose = require("mongoose"), Role = require("../../models/Role")["Role"], _CommunityService = require("../CommunityService")["Service"], _AccountCommunityService = require("../AccountCommunityService")["Service"], RoleService = require("../RoleService")["Service"], AccountCommunity = require("../../models/AccountCommunity")["AccountCommunity"], Account = require("../../models/Account")["Account"];

class RoleMutationService extends RoleService {
  async _canAdminRoleCommunityOrError(e, o, r) {
    if (!e) throw new Error("Invalid role");
    var n = new _CommunityService(), n = (await e.populate("community"), await n.canAdmin(e.community, o, r));
    if (n) return !0;
    throw new Error("You do not have permission to edit the role.");
  }
  async updateRolePermissionsOrUnauthorized(e, {
    roleId: o,
    ...r
  }, n) {
    var i = await Role.findById(o);
    return await this._canAdminRoleCommunityOrError(i, {
      roleId: o
    }, n), this.updateRolePermissions(i, r, n);
  }
  async editRoleOrUnauthorized(e, {
    roleId: o,
    roleInput: r
  }, n) {
    var i = await Role.findById(o);
    if (await this._canAdminRoleCommunityOrError(i, {
      roleId: o
    }, n), i?.editable) return i.edit(r);
    throw new Error("You do not have permission to edit the role.");
  }
  async deleteRoleOrUnauthorized(e, {
    roleId: o
  }, r) {
    var n = await Role.findById(o);
    if (await this._canAdminRoleCommunityOrError(n, {
      roleId: o
    }, r), n?.editable) return n.delete();
    throw new Error("You do not have permission to delete the role.");
  }
  async grantRoleOrUnauthorized(e, {
    roleId: o,
    accountId: r,
    address: n
  }, i) {
    var t = await Role.findById(o);
    if (await this._canAdminRoleCommunityOrError(t, {
      roleId: o
    }, i), !t?.editable) throw new Error("You do not have permission to grant the role.");
    let a = null;
    return r ? a = await AccountCommunity.findOrCreate({
      accountId: new mongoose.Types.ObjectId(r),
      communityId: t.community
    }) : n && (o = await Account.findOrCreateByAddressAndChainId({
      address: n,
      chainId: 1
    }), a = await AccountCommunity.findOrCreate({
      accountId: o._id,
      communityId: t.community
    })), new _AccountCommunityService().grantRole(a, {
      roleId: t._id,
      isManagedByIndexer: !1,
      isValid: !0
    });
  }
  async revokeRoleOrUnauthorized(e, {
    roleId: o,
    accountId: r,
    address: n
  }, i) {
    var t = await Role.findById(o);
    if (await this._canAdminRoleCommunityOrError(t, {
      roleId: o
    }, i), !t?.editable) throw new Error("You do not have permission to revoke the role.");
    let a = null;
    if (r) a = await AccountCommunity.findOne({
      account: new mongoose.Types.ObjectId(r),
      community: t.community
    }); else if (n) {
      o = await Account.findByAddressAndChainId({
        address: n,
        chainId: 1
      });
      if (!o) throw new Error("Invalid Account Community");
      a = await AccountCommunity.findOne({
        account: o._id,
        community: t.community
      });
    }
    if (a) return new _AccountCommunityService().revokeRole(a, {
      roleId: t._id
    });
    throw new Error("Invalid Account Community");
  }
  async createIndexerRuleForRoleOrUnauthorized(e, {
    roleId: o,
    ruleDataInput: r = {}
  }, n) {
    var i = await Role.findById(o), o = (await this._canAdminRoleCommunityOrError(i, {
      roleId: o
    }, n), r.indexerRuleType);
    let t;
    switch (o) {
     case "NFT":
      t = r.indexerRuleNFTInput;
      break;

     case "ALLOWLIST":
      t = r.indexerRuleAllowlistInput;
      break;

     case "API":
      t = r.indexerRuleAPIInput;
      break;

     default:
      t = null;
    }
    return this.createIndexerRuleForRole(i, {
      indexerRuleType: o,
      ruleData: t
    }, n);
  }
}

module.exports = {
  Service: RoleMutationService
};