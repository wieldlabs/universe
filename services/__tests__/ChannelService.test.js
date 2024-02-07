const createDb = require("../../helpers/create-test-db")["createDb"], getRandomAddress = require("../../helpers/get-random-address")["getRandomAddress"], Account = require("../../models/Account")["Account"], Community = require("../../models/Community")["Community"], AccountCommunity = require("../../models/AccountCommunity")["AccountCommunity"], _AccountCommunityService = require("../AccountCommunityService")["Service"], _InitializeCommunityService = require("../initializer/InitializeCommunityService")["Service"], _CommunityService = require("../CommunityService")["Service"], _ChannelService = require("../ChannelService")["Service"];

describe("ChannelService tests", () => {
  let i, t, n, c, a, r, o, m, s, d, u, l, y, C;
  const A = getRandomAddress(), w = getRandomAddress(), v = getRandomAddress();
  beforeEach(() => jest.clearAllMocks()), beforeAll(async () => {
    await (i = await createDb()).connect(), a = await Account.createFromAddress({
      address: A,
      chainId: 1
    }), r = await Account.createFromAddress({
      address: v,
      chainId: 1
    }), o = await Account.createFromAddress({
      address: w,
      chainId: 1
    }), u = await Community.create({
      name: "Good community",
      owner: a._id
    }), m = await AccountCommunity.create({
      account: a._id,
      community: u._id
    }), s = await AccountCommunity.create({
      account: o._id,
      community: u._id
    }), d = await AccountCommunity.create({
      account: r._id,
      community: u._id
    }), t = new _AccountCommunityService(), n = new _CommunityService(), c = new _ChannelService();
    var e = (await new _InitializeCommunityService().createDefaultRoleWithPermissions(u))["permissions"];
    y = e[0], C = e[1], l = await n.createChannelForCommunity(u, {
      name: "channel",
      recipients: [ {
        recipientId: r._id,
        recipientType: 0,
        slug: `${v}@${u.bebdomain}.cast`
      } ]
    }, {
      account: a
    });
  }), afterAll(async () => {
    await i.clearDatabase(), await i.closeDatabase();
  }), describe("createPermissionOverwritesForChannelRecipients", () => {
    it("should return true if account community has a valid role", async () => {
      var e = await n.getCommunityAllPermissionString(u), e = (await c.createPermissionOverwritesForChannelRecipients(l, {
        allowedPermissionString: e,
        deniedPermissionString: e
      }), await t.validPermissionForAccountCommunity(m, {
        permissionId: y._id,
        channelId: l._id
      }, {
        account: a
      })), e = (expect(e).toBe(!0), await t.validPermissionForAccountCommunity(d, {
        permissionId: C._id,
        channelId: l._id
      }, {
        account: r
      })), e = (expect(e).toBe(!0), await t.validPermissionForAccountCommunity(s, {
        permissionId: C._id,
        channelId: l._id
      }, {
        account: o
      }));
      expect(e).toBe(!1);
    });
  });
});