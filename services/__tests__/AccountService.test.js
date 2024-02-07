const axios = require("axios").default, createDb = (jest.mock("axios"), require("../../helpers/create-test-db"))["createDb"], getRandomAddress = require("../../helpers/get-random-address")["getRandomAddress"], Account = require("../../models/Account")["Account"], Community = require("../../models/Community")["Community"], AccountCommunity = require("../../models/AccountCommunity")["AccountCommunity"], _AccountCommunityService = require("../AccountCommunityService")["Service"], _CommunityService = require("../CommunityService")["Service"], _RoleService = require("../RoleService")["Service"], _AccountService = require("../AccountService")["Service"], _InitializeCommunityService = require("../initializer/InitializeCommunityService")["Service"], _ChannelMutationService = require("../mutationServices/ChannelMutationService")["Service"];

describe("AccountService tests", () => {
  let i, n, a, o, c, r, s, d, l, u, m, y, h, p;
  const v = getRandomAddress();
  beforeEach(() => jest.clearAllMocks()), beforeAll(async () => {
    await (i = await createDb()).connect(), s = await Account.createFromAddress({
      address: v,
      chainId: 1
    }), u = await Account.createFromAddress({
      address: getRandomAddress(),
      chainId: 1
    }), m = await Community.create({
      name: "Good community can join",
      owner: u._id,
      bebdomain: "goodcommunitycanjoin"
    }), d = await AccountCommunity.create({
      account: s._id,
      community: m._id,
      joined: !1
    }), n = new _AccountCommunityService(), a = new _ChannelMutationService(), o = new _CommunityService(), 
    c = new _RoleService(), r = new _AccountService();
    var {
      roles: e,
      permissions: t
    } = await new _InitializeCommunityService().createDefaultRoleWithPermissions(m);
    h = t[0], p = t[1], y = e[0], l = await o.createRoleForCommunity(m, {
      name: "role",
      isManagedByIndexer: !0,
      editable: !0
    });
  }), afterAll(async () => {
    await i.clearDatabase(), await i.closeDatabase();
  }), describe("validPermissionForUnauthenticatedAccount", () => {
    it("should return true if an authenticated account has a public role with permission", async () => {
      await c.updateRolePermissions(y, {
        permissionIds: [ h._id ]
      });
      var e = await r.validPermissionForUnauthenticatedAccount(null, {
        permissionId: h._id,
        communityId: m._id
      }), e = (expect(e).toBe(!0), await r.validPermissionForUnauthenticatedAccount(null, {
        permissionId: p._id,
        communityId: m._id
      }));
      expect(e).toBe(!1);
    });
  }), describe("validPermissionForAccount", () => {
    it("should return true if an authenticated account has a public role with permission", async () => {
      await c.updateRolePermissions(y, {
        permissionIds: [ h._id ]
      });
      var e = await r.validPermissionForAccount(null, {
        permissionId: h._id,
        communityId: m._id
      }), e = (expect(e).toBe(!0), await r.validPermissionForAccount(null, {
        permissionId: p._id,
        communityId: m._id
      }));
      expect(e).toBe(!1);
    }), it("should return true if account has a valid role with permission", async () => {
      await c.updateRolePermissions(l, {
        permissionIds: [ h._id ]
      }), await n.createOrUpdateRoleForAccountCommunity(d, {
        roleId: l._id,
        isManagedByIndexer: !0
      });
      var e = await r.validPermissionForAccount(s, {
        permissionId: h._id,
        communityId: m._id
      }), e = (expect(e).toBe(!0), await r.validPermissionForAccount(s, {
        permissionId: p._id,
        communityId: m._id
      }));
      expect(e).toBe(!1);
    });
  }), describe("refreshRoles", () => {
    it("should return empty array if community does not have valid roles to claim", async () => {
      var e = await r.refreshRoles(s, {
        communityId: m._id
      });
      expect(e).toEqual([]);
    }), it("should return no role if an account is not logged in", async () => {
      var e = await r.refreshRoles(null, {
        communityId: m._id
      });
      expect(e.length).toEqual(0);
    }), it("should return all roles claimable by the account", async () => {
      const t = await o.createRoleForCommunity(m, {
        name: "allowlist role",
        isManagedByIndexer: !0,
        editable: !0
      }), i = (await c.createIndexerRuleForRole(t, {
        indexerRuleType: "ALLOWLIST",
        ruleData: {
          chainId: 1,
          addresses: [ v ]
        }
      }), axios.get.mockResolvedValue({
        data: {
          ownedNfts: [],
          success: !0
        }
      }), await o.createRoleForCommunity(m, {
        name: "nftRole",
        isManagedByIndexer: !0
      }));
      await c.createIndexerRuleForRole(i, {
        indexerRuleType: "NFT",
        ruleData: {
          address: getRandomAddress(),
          chainId: 1,
          minAmount: 1
        }
      });
      var e = await r.refreshRoles(s, {
        communityId: m._id
      });
      expect(e.length).toEqual(1), expect(e.find(e => e._id.toString() === t._id.toString())).toBeDefined(), 
      expect(e.find(e => e._id.toString() === i._id.toString())).toBe(void 0);
    });
  }), describe("claimRoles", () => {
    it("should return empty array if account is not defined", async () => {
      var e = await r.claimRoles(null, {
        communityId: m._id
      });
      expect(e).toEqual([]);
    }), it("should return an array of account community roles", async () => {
      var e = await r.claimRoles(s, {
        communityId: m._id
      });
      const t = await r.refreshRoles(s, {
        communityId: m._id
      });
      expect(e.length).toEqual(t.length), expect(e.find(e => e._id.toString() === t[0]._id.toString())).toBeDefined();
    }), it("should create AccountCommunityRole for claimable roles", async () => {
      await r.claimRoles(s, {
        communityId: m._id
      });
      const t = await r.refreshRoles(s, {
        communityId: m._id
      });
      var e = await AccountCommunity.findById(d._id).populate("roles");
      expect(e.roles.length).toBeGreaterThanOrEqual(t.length), expect(e.roles.find(({
        role: e
      }) => e._id.toString() === t[0]._id.toString())).toBeDefined();
    });
  }), describe("getRoles", () => {
    it("should return empty array if account is not defined", async () => {
      var e = await r.getRoles(null);
      expect(e).toEqual([]);
    }), it("should return all valid roles claimed by the accout", async () => {
      var e = await r.getRoles(s), t = (await AccountCommunity.find({
        account: s._id
      })).map(async e => n.getAccountCommunityRoles(e, {
        includeDefault: !0
      }));
      const i = (await Promise.all(t)).reduce((e, t) => e.concat(t));
      expect(e.length).toEqual(i.length), expect(e.find(e => e._id.toString() === i[0]._id.toString())).toBeDefined();
    });
  }), describe("getChannelRecipientsByRolesAndAccount and getChannelRecipientsByRoles", () => {
    let t, i;
    beforeAll(async () => {
      t = await a.createChannelForCommunityOrUnauthorized(null, {
        channelInput: {
          name: "channel for account"
        },
        communityId: m._id,
        recipients: [ `${v}@${m.bebdomain}.cast` ]
      }, {
        account: u
      });
      var e = await r.getRoles(s);
      i = await a.createChannelForCommunityOrUnauthorized(null, {
        channelInput: {
          name: "channel for role"
        },
        communityId: m._id,
        recipients: [ `${e[0].slug}@${m.bebdomain}.cast` ]
      }, {
        account: u
      });
    }), describe("getChannelRecipientsByRolesAndAccount", () => {
      it("should return empty array if account is not defined", async () => {
        var e = await r.getChannelRecipientsByRolesAndAccount(null);
        expect(e).toEqual([]);
      }), it("should return all valid ChannelRecipients by the accout or the account's roles", async () => {
        var e = await r.getChannelRecipientsByRolesAndAccount(s, {
          limit: 10,
          offset: 0
        });
        expect(e.length).toEqual(2), expect(e.find(e => e.channel.toString() === i._id.toString())).toBeDefined(), 
        expect(e.find(e => e.channel.toString() === t._id.toString())).toBeDefined();
      });
    }), describe("getChannelsByRolesAndAccount", () => {
      it("should return empty array if account is not defined", async () => {
        var e = await r.getChannelsByRolesAndAccount(null);
        expect(e).toEqual([]);
      }), it("should return all valid Channels by the accout or the account's roles", async () => {
        await a.createChannelForCommunityOrUnauthorized(null, {
          channelInput: {
            name: "invalid channel for account"
          },
          communityId: m._id,
          recipients: [ `${getRandomAddress()}@${m.bebdomain}.cast` ]
        }, {
          account: u
        });
        var e = await r.getChannelsByRolesAndAccount(s, {
          limit: 10,
          offset: 0
        });
        expect(e.length).toEqual(2), expect(e.find(e => e._id.toString() === i._id.toString())).toBeDefined(), 
        expect(e.find(e => e._id.toString() === t._id.toString())).toBeDefined();
      });
    });
  });
});