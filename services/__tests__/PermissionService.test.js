const mongoose = require("mongoose"), BigInt = require("big-integer"), createDb = require("../../helpers/create-test-db")["createDb"], Community = require("../../models/Community")["Community"], _PermissionService = require("../PermissionService")["Service"], _CommunityService = require("../CommunityService")["Service"];

describe("PermissionService tests", () => {
  let e, s, n, a, o, m;
  beforeEach(() => jest.clearAllMocks()), beforeAll(async () => {
    await (e = await createDb()).connect(), m = await Community.create({
      name: "community"
    }), s = new _PermissionService(), n = new _CommunityService(), a = await n.createPermissionForCommunity(m, {
      name: "read",
      uniqueIdentifier: "read",
      editable: !1
    }), o = await n.createPermissionForCommunity(m, {
      name: "write",
      uniqueIdentifier: "write",
      editable: !1
    });
  }), afterAll(async () => {
    await e.clearDatabase(), await e.closeDatabase();
  }), describe("generatePermissionStringFromIds", () => {
    it("should generate a permission string depending on an array of permission Ids", async () => {
      var e = await s.generatePermissionStringFromIds([ a._id ]);
      expect(e).toBe(BigInt(a.bitwiseFlag).toString());
    }), it("should work with multiple permission Ids", async () => {
      var e = await n.createPermissionForCommunity(m, {
        name: "3",
        uniqueIdentifier: "3",
        editable: !0
      }), i = await n.createPermissionForCommunity(m, {
        name: "4",
        uniqueIdentifier: "4",
        editable: !0
      }), t = await n.createPermissionForCommunity(m, {
        name: "5",
        uniqueIdentifier: "5",
        editable: !0
      }), r = await s.generatePermissionStringFromIds([ a._id, o._id, e._id, i._id, t._id ]);
      expect(r).toBe((BigInt(a.bitwiseFlag) | BigInt(o.bitwiseFlag) | BigInt(e.bitwiseFlag) | BigInt(i.bitwiseFlag) | BigInt(t.bitwiseFlag)).toString());
    }), it("should return empty permission if no permission Ids are provided", async () => {
      var e = await s.generatePermissionStringFromIds([]);
      expect(e).toBe(null);
    });
  }), describe("isFlagSetForPermissionString", () => {
    it("should assert if a permission string contains a bitwise flag", async () => {
      var e = await s.generatePermissionStringFromIds([ a._id, o._id ]);
      expect(s.isFlagSetForPermissionString(e, a.bitwiseFlag)).toBe(!0), expect(s.isFlagSetForPermissionString(e, o.bitwiseFlag)).toBe(!0), 
      expect(s.isFlagSetForPermissionString(e, null)).toBe(!1), expect(s.isFlagSetForPermissionString(e, "4")).toBe(!1);
    });
  }), describe("isFlagSetForPermissionStringById", () => {
    it("should assert if a permission string contains a permissionId", async () => {
      var e = await s.generatePermissionStringFromIds([ a._id, o._id ]);
      expect(await s.isFlagSetForPermissionStringById(e, a._id)).toBe(!0), expect(await s.isFlagSetForPermissionStringById(e, o._id)).toBe(!0), 
      expect(await s.isFlagSetForPermissionStringById(e, null)).toBe(!1), expect(await s.isFlagSetForPermissionStringById(e, mongoose.Types.ObjectId())).toBe(!1);
    });
  });
});