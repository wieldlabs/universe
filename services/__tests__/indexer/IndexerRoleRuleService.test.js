const mongoose = require("mongoose"), axios = require("axios").default, {
  IndexerRuleService,
  CommunityService
} = (jest.mock("axios"), require("../../../services")), _IndexerRoleRuleService = require("../../../services/indexer/IndexerRoleRuleService")["Service"], Community = require("../../../models/Community")["Community"], createDb = require("../../../helpers/create-test-db")["createDb"], getRandomAddress = require("../../../helpers/get-random-address")["getRandomAddress"];

describe("IndexerRule Service tests", () => {
  let e, t, r, i, s, a, l, o;
  beforeEach(() => {
    jest.clearAllMocks();
  }), beforeAll(async () => {
    await (e = await createDb()).connect(), t = await Community.create({
      name: "Test community"
    }), i = await CommunityService.createRoleForCommunity(t, {
      name: "Test role",
      isManagedByIndexer: !0
    }), r = await CommunityService.createRoleForCommunity(t, {
      name: "Test allowlist role"
    }), a = await CommunityService.createRoleForCommunity(t, {
      name: "Test public role"
    }), s = await CommunityService.createRoleForCommunity(t, {
      name: "Test api role"
    }), l = getRandomAddress(), o = new _IndexerRoleRuleService();
  }), afterAll(async () => {
    await e.clearDatabase(), await e.closeDatabase();
  }), describe("_canClaimAllowlistRole", () => {
    it("should return true if address is in allowlist", async () => {
      var [ e ] = await IndexerRuleService.createRuleWithData({
        communityId: t._id,
        ruleOwnerType: 0,
        ruleOwnerId: r._id,
        indexerRuleType: "ALLOWLIST",
        ruleData: {
          addresses: [ l ],
          chainId: 1
        }
      }), a = await o._canClaimAllowlistRole(e, {
        data: {
          address: l
        }
      }), a = (expect(a).toBe(!0), await o._canClaimAllowlistRole(e, {
        data: {
          address: getRandomAddress()
        }
      }));
      expect(a).toBe(!1);
    });
  }), describe("_canClaimNFTRole", () => {
    it("should return true if address has the NFT", async () => {
      expect.assertions(2);
      var [ e ] = await IndexerRuleService.createRuleWithData({
        communityId: t._id,
        ruleOwnerType: 0,
        ruleOwnerId: i._id,
        indexerRuleType: "NFT",
        ruleData: {
          address: l,
          chainId: 1
        }
      }), a = (axios.get.mockResolvedValue({
        data: {
          ownedNfts: [ l ],
          success: !0
        }
      }), await o._canClaimNFTRole(e, {
        data: {
          address: l
        }
      })), a = (expect(a).toBe(!0), axios.get.mockResolvedValue({
        data: {
          ownedNfts: [],
          success: !0
        }
      }), await o._canClaimNFTRole(e, {
        data: {
          address: l
        }
      }));
      expect(a).toBe(!1);
    });
  }), describe("_canClaimAPIRole", () => {
    it("should return true if API returns { success: true }", async () => {
      expect.assertions(2);
      var [ e ] = await IndexerRuleService.createRuleWithData({
        communityId: t._id,
        ruleOwnerType: 0,
        ruleOwnerId: s._id,
        indexerRuleType: "API",
        ruleData: {
          uri: "https://api.test.com/isOwner"
        }
      }), a = (axios.get.mockResolvedValue({
        data: {
          success: !0
        }
      }), await o._canClaimAPIRole(e, {
        data: {
          address: l
        }
      })), a = (expect(a).toBe(!0), axios.get.mockResolvedValue({
        data: {
          success: !1
        }
      }), await o._canClaimAPIRole(e, {
        data: {
          address: l
        }
      }));
      expect(a).toBe(!1);
    });
  }), describe("canClaimRole", () => {
    it("should return true for PUBLIC role", async () => {
      var [ e ] = await IndexerRuleService.createRuleWithData({
        communityId: t._id,
        ruleOwnerType: 0,
        ruleOwnerId: a._id,
        indexerRuleType: "PUBLIC"
      }), e = await o.canClaimRole(e, {
        roleId: a._id,
        data: {}
      });
      expect(e).toBe(!0);
    });
  });
});