const createDb = require("../../helpers/create-test-db")["createDb"], getRandomAddress = require("../../helpers/get-random-address")["getRandomAddress"], Account = require("../../models/Account")["Account"], Community = require("../../models/Community")["Community"], AccountCommunity = require("../../models/AccountCommunity")["AccountCommunity"], _AccountCommunityService = require("../AccountCommunityService")["Service"], _InitializeCommunityService = require("../initializer/InitializeCommunityService")["Service"], _CommunityService = require("../CommunityService")["Service"], _RoleService = require("../RoleService")["Service"];

describe("AccountCommunityService tests", () => {
  let t, o, r, n, a, c, m, s, u, d, l;
  const y = getRandomAddress();
  beforeEach(() => jest.clearAllMocks()), beforeAll(async () => {
    await (t = await createDb()).connect(), a = await Account.createFromAddress({
      address: y,
      chainId: 1
    }), s = await Community.create({
      name: "Good community can join",
      owner: a._id
    }), c = await AccountCommunity.create({
      account: a._id,
      community: s._id,
      joined: !1
    }), o = new _AccountCommunityService(), r = new _CommunityService(), n = new _RoleService();
    var {
      roles: e,
      permissions: i
    } = await new _InitializeCommunityService().createDefaultRoleWithPermissions(s);
    d = i[0], l = i[1], u = e[0], m = await r.createRoleForCommunity(s, {
      name: "role",
      isManagedByIndexer: !0
    });
  }), afterAll(async () => {
    await t.clearDatabase(), await t.closeDatabase();
  }), describe("validPermissionForAccountCommunity", () => {
    it("should return true if account community has a valid role", async () => {
      await n.updateRolePermissions(m, {
        permissionIds: [ d._id ]
      });
      var e = await o.createOrUpdateRoleForAccountCommunity(c, {
        roleId: m._id,
        isManagedByIndexer: !0
      }), i = await o.validPermissionForAccountCommunity(c, {
        permissionId: d._id
      }), i = (expect(i).toBe(!0), await o.validPermissionForAccountCommunity(c, {
        permissionId: l._id
      })), i = (expect(i).toBe(!1), e.isValid = !1, await e.save(), await o.validPermissionForAccountCommunity(c, {
        permissionId: d._id
      }));
      expect(i).toBe(!1);
    });
  });
});