const createDb = require("../../helpers/create-test-db")["createDb"], getRandomAddress = require("../../helpers/get-random-address")["getRandomAddress"], Account = require("../Account")["Account"], AccountRelationship = require("../AccountRelationship")["AccountRelationship"];

describe("AccountRelationship tests", () => {
  let t, i, a;
  beforeEach(() => jest.clearAllMocks()), beforeAll(async () => {
    await (t = await createDb()).connect(), i = await Account.createFromAddress({
      address: getRandomAddress(),
      chainId: 1
    }), a = await Account.createFromAddress({
      address: getRandomAddress(),
      chainId: 1
    });
  }), afterAll(async () => {
    await t.clearDatabase(), await t.closeDatabase();
  }), describe("_existingAccountRelationship", () => {
    it("should return falsy if no existing relationship found", async () => {
      var t = await AccountRelationship._existingAccountRelationship({
        from: i._id,
        to: a._id
      });
      expect(t).toBeFalsy();
    });
  }), describe("toggleFollow", () => {
    let o;
    it("should create an AccountRelationship with isFollowing = true if no existing", async () => {
      var t = await AccountRelationship.toggleFollow({
        from: i._id,
        to: a._id
      });
      o = t, expect(t.isFollowing).toBe(!0);
    }), it("should toggle isFollowing but not create a new document if existing AccountRelationship", async () => {
      var t = await AccountRelationship.toggleFollow({
        from: i._id,
        to: a._id
      });
      expect(t._id.toString()).toBe(o._id.toString()), expect(t.isFollowing).toBe(!1);
    });
  }), describe("getTwoWayRelationship", () => {
    it("should get the relationship between account 'from' to account 'to' ", async () => {
      var t;
      await AccountRelationship.toggleFollow({
        from: a._id,
        to: i._id
      }), await AccountRelationship.toggleFollow({
        from: i._id,
        to: a._id
      }), t = await AccountRelationship.getTwoWayRelationship({
        from: i._id,
        to: a._id
      }), expect(t.iFollowThem).toBe(!0), expect(t.theyFollowMe).toBe(!0), await AccountRelationship.toggleFollow({
        from: a._id,
        to: i._id
      }), await AccountRelationship.toggleFollow({
        from: i._id,
        to: a._id
      }), t = await AccountRelationship.getTwoWayRelationship({
        from: i._id,
        to: a._id
      }), expect(t.iFollowThem).toBe(!1), expect(t.theyFollowMe).toBe(!1);
    });
  }), describe("getAccountRelationships", () => {
    let o, e;
    it("should work with filters from and isFollowing", async () => {
      o = await Account.createFromAddress({
        address: getRandomAddress(),
        chainId: 1
      }), e = await Account.createFromAddress({
        address: getRandomAddress(),
        chainId: 1
      }), await AccountRelationship.toggleFollow({
        from: i._id,
        to: o._id
      }), await AccountRelationship.toggleFollow({
        from: i._id,
        to: e._id
      });
      var t = await AccountRelationship.getAccountRelationships({
        filters: {
          from: i._id,
          isFollowing: !0
        }
      });
      expect(t.length).toBe(2), expect(t[0].to.toString()).toBe(e._id.toString()), 
      expect(t[1].to.toString()).toBe(o._id.toString());
    }), it("should work with filters to and isFollowing", async () => {
      await AccountRelationship.toggleFollow({
        from: o._id,
        to: i._id
      }), await AccountRelationship.toggleFollow({
        from: e._id,
        to: i._id
      });
      var t = await AccountRelationship.getAccountRelationships({
        filters: {
          to: i._id,
          isFollowing: !0
        }
      });
      expect(t.length).toBe(2), expect(t[0].from.toString()).toBe(e._id.toString()), 
      expect(t[1].from.toString()).toBe(o._id.toString());
    }), it("should work with both filters from and to", async () => {
      var t = await AccountRelationship.findOne({
        from: i._id,
        to: a._id
      }), o = await AccountRelationship.getAccountRelationships({
        filters: {
          from: i._id,
          to: a._id
        }
      });
      expect(o[0]._id.toString()).toBe(t._id.toString());
    }), it("should work with both filters from and excludeNotConnected", async () => {
      await AccountRelationship.toggleFollow({
        from: a._id,
        to: i._id
      });
      var t = await AccountRelationship.getAccountRelationships({
        filters: {
          from: i._id,
          excludeNotConnected: !0
        }
      });
      expect(t.length).toBe(2), expect(t[0].from.toString()).toBe(e._id.toString()), 
      expect(t[1].from.toString()).toBe(o._id.toString());
    });
  });
});