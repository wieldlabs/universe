const _CommunityService = require("../CommunityService")["Service"], _RoleService = require("../RoleService")["Service"], _AccountCommunityService = require("../AccountCommunityService")["Service"], _InitializeAccountCommunityService = require("./InitializeAccountCommunityService")["Service"];

class InitializeCommunityService {
  async createDefaultReadWritePermissions(e) {
    var i;
    if (e) return [ await (i = new _CommunityService()).createPermissionForCommunity(e, {
      name: "read",
      uniqueIdentifier: "READ",
      editable: !1,
      description: {
        raw: "Allows viewing content"
      }
    }), await i.createPermissionForCommunity(e, {
      name: "write",
      uniqueIdentifier: "WRITE",
      editable: !1,
      description: {
        raw: "Allows publishing content"
      }
    }) ];
    throw new Error("Invalid community");
  }
  async createDefaultPublicAndOwnerRoles(e) {
    var i, r;
    if (e) return r = await (i = new _CommunityService()).createRoleForCommunity(e, {
      name: "public",
      isManagedByIndexer: !0,
      editable: !1,
      description: {
        raw: "The default role for all users, all permissions by default"
      }
    }), await new _RoleService().createIndexerRuleForRole(r, {
      indexerRuleType: "PUBLIC"
    }), [ r, await i.createRoleForCommunity(e, {
      name: "owner",
      isManagedByIndexer: !1,
      editable: !1,
      description: {
        raw: "The default owner role with all permissions"
      }
    }) ];
    throw new Error("Invalid community");
  }
  async createAccountCommunityForOwner({
    community: e,
    ownerRoleId: i
  }) {
    if (!e?.owner) throw new Error("Invalid community or community owner");
    if (i) return e = await new _InitializeAccountCommunityService().initialize(null, {
      communityId: e._id,
      joined: !0
    }, {
      accountId: e.owner
    }), await new _AccountCommunityService().createOrUpdateRoleForAccountCommunity(e, {
      roleId: i,
      isManagedByIndexer: !1
    }), e;
    throw new Error("Invalid owner role id");
  }
  async grantDefaultPermissionsToPublicAndOwner({
    community: e,
    publicRole: i,
    ownerRole: r,
    readPermission: n,
    writePermission: o
  }) {
    if (!e) throw new Error("Invalid community");
    if (!i || !r) throw new Error("Invalid roles");
    if (n && o) return await (e = new _RoleService()).updateRolePermissions(i, {
      permissionIds: [ n._id, o._id ]
    }), await e.updateRolePermissions(r, {
      permissionIds: [ n._id, o._id ]
    }), null;
    throw new Error("Invalid permissions");
  }
  async createDefaultRoleWithPermissions(e) {
    var i, r, n, o;
    if (e) return [ i, r ] = await this.createDefaultReadWritePermissions(e), [ n, o ] = await this.createDefaultPublicAndOwnerRoles(e), 
    await this.grantDefaultPermissionsToPublicAndOwner({
      community: e,
      publicRole: n,
      ownerRole: o,
      readPermission: i,
      writePermission: r
    }), await this.createAccountCommunityForOwner({
      community: e,
      ownerRoleId: o._id
    }), {
      roles: [ n, o ],
      permissions: [ i, r ]
    };
    throw new Error("Invalid community");
  }
}

module.exports = {
  Service: InitializeCommunityService
};