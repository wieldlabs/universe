const mongoose = require("mongoose"), createDb = require("../../helpers/create-test-db")["createDb"], getRandomAddress = require("../../helpers/get-random-address")["getRandomAddress"], Account = require("../Account")["Account"], Community = require("../Community")["Community"], Permission = require("../Permission")["Permission"];

describe("Permission tests", () => {
  let e, i, t, n;
  const s = getRandomAddress();
  beforeEach(() => jest.clearAllMocks()), beforeAll(async () => {
    await (e = await createDb()).connect(), i = await Account.createFromAddress({
      address: s,
      chainId: 1
    }), t = await Community.create({
      name: "community"
    });
  }), afterAll(async () => {
    await e.clearDatabase(), await e.closeDatabase();
  }), describe("create", () => {
    it("should create a new permission", async () => {
      n = await Permission.create({
        communityId: t._id,
        name: "permission",
        description: {
          raw: "read"
        },
        editable: !0,
        bitwisePosition: 1,
        uniqueIdentifier: "read"
      });
      var e = await Permission.findOne({
        uniqueIdentifier: "read",
        communityId: t._id
      });
      expect(e._id.toString()).toBe(n._id.toString()), expect(n.uniqueIdentifier).toBe("read"), 
      expect(n.description.raw).toBe("read"), expect(n.bitwisePosition).toBe(1), 
      expect(n.bitwiseFlag).toBe("2");
    }), it("should throw an error if unique identifier has been taken in community", async () => {
      expect.assertions(1);
      try {
        await Permission.create({
          communityId: t._id,
          name: "permission",
          uniqueIdentifier: "read"
        });
      } catch (e) {
        expect(e.message).toBe("Unique identifier read already token");
      }
    });
  }), describe("_generateBitwiseFlagAndPosition", () => {
    it("should generate a permission's bitwiseFlag and bitwisePosition", async () => {
      var e = n._generateBitwiseFlagAndPosition(2);
      expect(e.bitwisePosition).toBe(2), expect(e.bitwiseFlag).toBe("4");
    }), it("should handle big bitwiseFlag and bitwisePosition", async () => {
      var e = n._generateBitwiseFlagAndPosition(62);
      expect(e.bitwisePosition).toBe(62), expect(e.bitwiseFlag).toBe("" + (1 << 62));
    }), it("should throw an error if bitwise position is invalid", async () => {
      expect.assertions(1);
      try {
        n._generateBitwiseFlagAndPosition(100);
      } catch (e) {
        expect(e.message).toBe("Invalid bitwisePosition: must be between 0 and 62");
      }
    });
  }), describe("findByUniqueIdentifierOrId", () => {
    it("should find by id if exists", async () => {
      var e = await Permission.findByUniqueIdentifierOrId({
        permissionId: n._id
      });
      expect(e._id.toString()).toBe(n._id.toString());
    }), it("should return null if unique identifier is not provided, and community is not provided", async () => {
      expect.assertions(1);
      var e = await Permission.findByUniqueIdentifierOrId({
        uniqueIdentifier: "read"
      });
      expect(e).toBeNull();
    }), it("should find by unique identifier and communityId if permissionId is not valid", async () => {
      expect.assertions(1);
      var e = await Permission.findByUniqueIdentifierOrId({
        uniqueIdentifier: "read",
        communityId: t._id,
        permissionId: mongoose.Types.ObjectId()
      });
      expect(e._id.toString()).toBe(n._id.toString());
    });
  });
});