const mongoose = require("mongoose"), {
  IndexerRuleService,
  CommunityService
} = require("../../services"), Community = require("../../models/Community")["Community"], IndexerRule = require("../../models/IndexerRule")["IndexerRule"], IndexerRuleNFT = require("../../models/IndexerRuleNFT")["IndexerRuleNFT"], IndexerRuleAllowlist = require("../../models/IndexerRuleAllowlist")["IndexerRuleAllowlist"], createDb = require("../../helpers/create-test-db")["createDb"], getRandomAddress = require("../../helpers/get-random-address")["getRandomAddress"];

describe("IndexerRule Service tests", () => {
  let e, i, r, n;
  beforeEach(() => {
    jest.clearAllMocks();
  }), beforeAll(async () => {
    await (e = await createDb()).connect(), i = await Community.create({
      name: "Test community"
    }), r = await CommunityService.createChannelForCommunity(i, {
      name: "Test channel"
    }), n = await CommunityService.createRoleForCommunity(i, {
      name: "Test role"
    });
  }), afterAll(async () => {
    await e.clearDatabase(), await e.closeDatabase();
  }), describe("_beforeCreateRuleCheck", () => {
    it("should return error if required params are missing", async () => {
      expect.assertions(1);
      try {
        await IndexerRuleService._beforeCreateRuleCheck({});
      } catch (e) {
        expect(e.message).toEqual("Missing required parameters");
      }
    }), it("should return error if invalid rule owner type", async () => {
      expect.assertions(1);
      try {
        await IndexerRuleService._beforeCreateRuleCheck({
          communityId: i._id,
          ruleOwnerType: 3,
          ruleOwnerId: r._id,
          indexerRuleType: "SALES"
        });
      } catch (e) {
        expect(e.message).toEqual("Only role(0), channel(1) and rich blocks(2) are supported");
      }
    }), it("should return error if invalid indexerRuleType for channel", async () => {
      expect.assertions(1);
      try {
        await IndexerRuleService._beforeCreateRuleCheck({
          communityId: i._id,
          ruleOwnerType: 1,
          ruleOwnerId: r._id,
          indexerRuleType: "NFT"
        });
      } catch (e) {
        expect(e.message).toEqual("Invalid indexerRuleType for channel(1): NFT");
      }
    }), it("should return error if invalid indexerRuleType for role", async () => {
      expect.assertions(1);
      try {
        await IndexerRuleService._beforeCreateRuleCheck({
          communityId: i._id,
          ruleOwnerType: 0,
          ruleOwnerId: n._id,
          indexerRuleType: "SALES"
        });
      } catch (e) {
        expect(e.message).toEqual("Invalid indexerRuleType for role(0): SALES");
      }
    }), it("should return error if channel does not exist", async () => {
      expect.assertions(1);
      try {
        await IndexerRuleService._beforeCreateRuleCheck({
          communityId: i._id,
          ruleOwnerType: 1,
          ruleOwnerId: new mongoose.Types.ObjectId(),
          indexerRuleType: "SALES"
        });
      } catch (e) {
        expect(e.message).toEqual("Channel does not exist");
      }
    }), it("should return error if role does not exist", async () => {
      expect.assertions(1);
      try {
        await IndexerRuleService._beforeCreateRuleCheck({
          communityId: i._id,
          ruleOwnerType: 0,
          ruleOwnerId: new mongoose.Types.ObjectId(),
          indexerRuleType: "NFT"
        });
      } catch (e) {
        expect(e.message).toEqual("Role does not exist");
      }
    }), it("should return true if all conditions are satisfied for role", async () => {
      expect.assertions(1);
      var e = await IndexerRuleService._beforeCreateRuleCheck({
        communityId: i._id,
        ruleOwnerType: 0,
        ruleOwnerId: n._id,
        indexerRuleType: "NFT"
      });
      expect(e).toBe(!0);
    }), it("should return true if all conditions are satisfied for channel", async () => {
      expect.assertions(1);
      var e = await IndexerRuleService._beforeCreateRuleCheck({
        communityId: i._id,
        ruleOwnerType: 1,
        ruleOwnerId: r._id,
        indexerRuleType: "SALES"
      });
      expect(e).toBe(!0);
    });
  }), describe("createRuleWithData", () => {
    beforeEach(async () => {
      await IndexerRuleNFT.deleteMany(), await IndexerRuleAllowlist.deleteMany(), 
      await IndexerRule.deleteMany();
    }), it("should call _beforeCreateRuleCheck", async () => {
      expect.assertions(1);
      var e = jest.spyOn(IndexerRuleService, "_beforeCreateRuleCheck");
      await IndexerRuleService.createRuleWithData({
        communityId: i._id,
        ruleOwnerType: 0,
        ruleOwnerId: n._id,
        indexerRuleType: "NFT",
        ruleData: {
          address: getRandomAddress(),
          chainId: 1
        }
      }), expect(e).toHaveBeenCalled();
    }), it("should throw an error if ruleData is missing required params", async () => {
      expect.assertions(1);
      try {
        await IndexerRuleService.createRuleWithData({
          communityId: i._id,
          ruleOwnerType: 0,
          ruleOwnerId: n._id,
          indexerRuleType: "NFT",
          ruleData: {
            address: getRandomAddress()
          }
        });
      } catch (e) {
        expect(e.message).toEqual("Error creating rule: Invalid chain id");
      }
    }), it("should create an IndexerRuleNFT with an IndexerRule for rule type NFT", async () => {
      var e = getRandomAddress(), [ r, t ] = await IndexerRuleService.createRuleWithData({
        communityId: i._id,
        ruleOwnerType: 0,
        ruleOwnerId: n._id,
        indexerRuleType: "NFT",
        ruleData: {
          address: e,
          chainId: 1
        }
      }), a = (expect(r).toBeDefined(), await IndexerRuleNFT.findOne({
        indexerRuleId: r._id
      }));
      await a.populate("address"), expect(a._id.toString()).toEqual(t._id.toString()), 
      expect(a.address.address).toEqual(e), expect(r.ruleOwnerId.toString()).toEqual(n._id.toString()), 
      expect(r.ruleDataId.toString()).toEqual(a._id.toString());
    }), it("should create an IndexerRuleAllowlist with an IndexerRule for rule type ALLOWLIST", async () => {
      var e = getRandomAddress(), [ r, t ] = await IndexerRuleService.createRuleWithData({
        communityId: i._id,
        ruleOwnerType: 0,
        ruleOwnerId: n._id,
        indexerRuleType: "ALLOWLIST",
        ruleData: {
          addresses: [ e ],
          chainId: 1
        }
      }), a = (expect(r).toBeDefined(), await IndexerRuleAllowlist.findOne({
        indexerRuleId: r._id
      }));
      expect(a._id.toString()).toEqual(t._id.toString()), expect(a.addresses[0]).toEqual(e), 
      expect(r.ruleOwnerId.toString()).toEqual(n._id.toString()), expect(r.ruleDataId.toString()).toEqual(a._id.toString());
    });
  });
});