const createDb = require("../../helpers/create-test-db")["createDb"], getRandomAddress = require("../../helpers/get-random-address")["getRandomAddress"], Account = require("../../models/Account")["Account"], Community = require("../../models/Community")["Community"], Role = require("../../models/Role")["Role"], Channel = require("../../models/Channel")["Channel"], IndexerRule = require("../../models/IndexerRule")["IndexerRule"], AccountCommunity = require("../../models/AccountCommunity")["AccountCommunity"], _PermissionService = require("../PermissionService")["Service"], _CommunityService = require("../CommunityService")["Service"], _AccountCommunityService = require("../AccountCommunityService")["Service"], _ChannelService = require("../ChannelService")["Service"], _RoleService = require("../RoleService")["Service"], _IndexerRuleService = require("../IndexerRuleService")["Service"], mongoose = require("mongoose")["default"];

describe("RoleService tests", () => {
  let e, t, i, n, r, a, o, d, c, m, l, s;
  const u = getRandomAddress();
  beforeEach(() => jest.clearAllMocks()), beforeAll(async () => {
    await (e = await createDb()).connect(), m = await Community.create({
      name: "community"
    }), l = await Account.createFromAddress({
      address: u,
      chainId: 1
    }), s = await AccountCommunity.create({
      account: l._id,
      community: m._id,
      joined: !1
    }), t = new _PermissionService(), i = new _CommunityService(), a = new _RoleService(), 
    n = new _IndexerRuleService(), r = new _AccountCommunityService(), o = await i.createRoleForCommunity(m, {
      name: "role",
      isManagedByIndexer: !0
    }), d = await i.createPermissionForCommunity(m, {
      name: "read",
      uniqueIdentifier: "read",
      editable: !1
    }), c = await i.createPermissionForCommunity(m, {
      name: "write",
      uniqueIdentifier: "write",
      editable: !1
    });
  }), afterAll(async () => {
    await e.clearDatabase(), await e.closeDatabase();
  }), describe("updateRolePermissions", () => {
    it("should update the role's permissionString depending on an array of permission Ids", async () => {
      var e = await a.updateRolePermissions(o, {
        permissionIds: [ d._id, c._id ]
      }), i = await t.generatePermissionStringFromIds([ d._id, c._id ]);
      expect(e.permissionString).toBe(i);
    }), it("should update permission string to null if no permission ids provided", async () => {
      var e = await a.updateRolePermissions(o, {
        permissionIds: []
      });
      expect(e.permissionString).toBe(null);
    });
  }), describe("getRoleBasePermissionArray", () => {
    it("should return an array of permission matching the role's permissionString", async () => {
      var e = await a.updateRolePermissions(o, {
        permissionIds: [ d._id, c._id ]
      }), e = await a.getRoleBasePermissionArray(e);
      expect(e[0]._id.toString()).toBe(d._id.toString()), expect(e[1]._id.toString()).toBe(c._id.toString());
    }), it("should return empty array if role permission string is null", async () => {
      var e = await a.updateRolePermissions(o, {
        permissionIds: []
      }), e = await a.getRoleBasePermissionArray(e);
      expect(e.length).toBe(0);
    });
  }), describe("hasPermission", () => {
    let r;
    beforeAll(async () => {
      r = await i.createChannelForCommunity(m, {
        name: "channel"
      });
    }), afterAll(async () => {
      await Channel.deleteOne({
        _id: r._id
      });
    }), it("should return true if a role has a permission", async () => {
      var e = await a.updateRolePermissions(o, {
        permissionIds: [ d._id, c._id ]
      }), i = await a.hasPermission(e, {
        permissionId: d._id
      }), e = await a.hasPermission(e, {
        permissionId: c._id
      });
      expect(i).toBe(!0), expect(e).toBe(!0);
    }), it("should return false if a role does not have the permission", async () => {
      var e = await a.updateRolePermissions(o, {
        permissionIds: []
      }), e = await a.hasPermission(e, {
        permissionId: d._id
      });
      expect(e).toBe(!1);
    }), it("should work with channel permission overwrites", async () => {
      await new _ChannelService().createPermissionOverwriteForChannel(r, {
        objectType: "ROLE",
        objectTypeId: o._id,
        permissionIds: [ d._id ]
      });
      var e = await a.updateRolePermissions(o, {
        permissionIds: []
      }), i = await a.hasPermission(e, {
        permissionId: d._id,
        channelId: r._id
      }), i = (expect(i).toBe(!0), await a.hasPermission(e, {
        permissionId: c._id,
        channelId: r._id
      }));
      expect(i).toBe(!1);
    });
  }), describe("computePermissionOverwrite", () => {
    let s;
    beforeAll(async () => {
      s = await i.createChannelForCommunity(m, {
        name: "channel"
      });
    }), afterAll(async () => {
      await Channel.deleteOne({
        _id: s._id
      });
    }), it("should return base permission if channel is not found", async () => {
      var e = [ o ], e = await a.computePermissionOverwrite(e, {
        channelId: new mongoose.Types.ObjectId(),
        basePermission: "1"
      }, {
        account: l
      });
      expect(e).toBe("1");
    }), it("should work with channel permission overwrites", async () => {
      var e = new _ChannelService(), i = (await e.createPermissionOverwriteForChannel(s, {
        objectType: "ROLE",
        objectTypeId: o._id,
        permissionIds: [ d._id ]
      }), [ o ]), r = await a.computePermissionOverwrite(i, {
        channelId: s._id,
        basePermission: "0"
      }, {
        account: l
      }), r = (expect(r).toBe(d.bitwiseFlag), t.combinePermissionStrings([ d.bitwiseFlag, c.bitwiseFlag ])), n = await a.computePermissionOverwrite(i, {
        channelId: s._id,
        basePermission: r
      }, {
        account: l
      }), n = (expect(n).toBe(r), await e.createPermissionOverwriteForChannel(s, {
        objectType: "ROLE",
        objectTypeId: o._id,
        deniedPermissionIds: [ c._id ]
      }), await a.computePermissionOverwrite(i, {
        channelId: s._id,
        basePermission: r
      }, {
        account: l
      })), n = (expect(n).toBe(d.bitwiseFlag), await e.createPermissionOverwriteForChannel(s, {
        objectType: "USER",
        objectTypeId: l._id,
        permissionIds: [ c._id ]
      }), await a.computePermissionOverwrite(i, {
        channelId: s._id,
        basePermission: r
      }, {
        account: l
      }));
      expect(n).toBe(r);
    });
  }), describe("deleteIndexerRuleForRole", () => {
    it("should delete an indexerRule from a role's indexerRules array", async () => {
      var e = await a.createIndexerRuleForRole(o, {
        indexerRuleType: "NFT",
        ruleData: {
          address: "0x0000000000000000000000000000000000000000",
          chainId: 1,
          minAmount: 1
        }
      }), i = await Role.findById(o._id), i = (expect(i.indexerRules.length).toBeDefined(), 
      await a.deleteIndexerRuleForRole(o, {
        indexerRuleId: e._id
      }), await IndexerRule.findById(e._id)), e = await n.getRuleData(e), r = await Role.findById(o._id);
      expect(r.indexerRules.length).toBe(0), expect(i).toBeNull(), expect(e).toBeNull();
    });
  });
});