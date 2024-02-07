const _CacheService = require("../../../services/cache/CacheService")["Service"], KeyValueCache = require("../../../models/cache/KeyValueCache")["KeyValueCache"], Account = require("../../../models/Account")["Account"], createDb = require("../../../helpers/create-test-db")["createDb"], getRandomAddress = require("../../../helpers/get-random-address")["getRandomAddress"];

describe("Cache Service tests", () => {
  let a, i, c;
  beforeEach(() => {
    jest.clearAllMocks();
  }), beforeAll(async () => {
    await (a = await createDb()).connect();
    var e = getRandomAddress();
    i = await Account.createFromAddress({
      address: e,
      chainId: 1
    }), c = new _CacheService();
  }), afterAll(async () => {
    await a.clearDatabase(), await a.closeDatabase();
  }), describe("normalize", () => {
    it("should return normalized key for special key types", async () => {
      var e = c.normalize({
        key: "ExploreFeedCommunities",
        params: {
          accountId: i._id
        }
      });
      expect(e).toBe("ExploreFeedCommunities:Account:" + i._id.toString());
    }), it("should return normalized key for non special key types", async () => {
      var e = c.normalize({
        key: "NiceKey",
        params: {
          accountId: i._id
        }
      });
      expect(e).toBe("NiceKey:" + JSON.stringify({
        accountId: i._id
      }));
    });
  }), describe("set", () => {
    it("should set any value with normalized key for special key types", async () => {
      await c.set({
        key: "ExploreFeedCommunities",
        params: {
          accountId: i._id
        },
        value: [ "1", "2", "3" ]
      });
      var e = c.normalize({
        key: "ExploreFeedCommunities",
        params: {
          accountId: i._id
        }
      }), e = await KeyValueCache.findOne({
        key: e
      });
      expect(e).toBeDefined();
    }), it("should update the value and the expires at if key is already set", async () => {
      var e = [ "4", "5", "6" ], a = new Date(Date.now() + 6e5), t = (await c.set({
        key: "ExploreFeedCommunities",
        params: {
          accountId: i._id
        },
        value: e,
        expiresAt: a
      }), c.normalize({
        key: "ExploreFeedCommunities",
        params: {
          accountId: i._id
        }
      })), t = await KeyValueCache.findOne({
        key: t
      });
      expect(t.value).toBe(JSON.stringify({
        value: e
      })), expect(t.expiresAt.toString()).toBe(a.toString());
    });
  }), describe("get", () => {
    it("should get any value already set keys if not expired", async () => {
      var e = [ "1", "2", "3" ], a = (await c.set({
        key: "ExploreFeedCommunities",
        params: {
          accountId: i._id
        },
        value: e
      }), await c.get({
        key: "ExploreFeedCommunities",
        params: {
          accountId: i._id
        }
      }));
      expect(a[0]).toBe(e[0]), expect(a[1]).toBe(e[1]), expect(a[2]).toBe(e[2]);
    }), it("should return null if expired", async () => {
      var e = new Date(), e = (await c.set({
        key: "ExploreFeedCommunities",
        params: {
          accountId: i._id
        },
        value: [ "4", "5", "6" ],
        expiresAt: e
      }), await c.get({
        key: "ExploreFeedCommunities",
        params: {
          accountId: i._id
        }
      }));
      expect(e).toBe(null);
    });
  }), describe("getOrCallbackAndSet", () => {
    it("should get any value already set if not expired", async () => {
      var e = [ "1", "2", "3" ], a = (await c.set({
        key: "ExploreFeedCommunities",
        params: {
          accountId: i._id
        },
        value: e
      }), await c.getOrCallbackAndSet(null, {
        key: "ExploreFeedCommunities",
        params: {
          accountId: i._id
        }
      }));
      expect(a[0]).toBe(e[0]), expect(a[1]).toBe(e[1]), expect(a[2]).toBe(e[2]);
    }), it("if null, should call callback and set the value", async () => {
      const a = [ "1", "2", "3" ];
      var e = () => new Promise(e => {
        setTimeout(() => {
          e(a);
        }, 1e3);
      }), t = (await c.set({
        key: "ExploreFeedCommunities",
        params: {
          accountId: i._id
        },
        value: [ "4", "5", "6" ],
        expiresAt: new Date()
      }), await c.getOrCallbackAndSet(e, {
        key: "ExploreFeedCommunities",
        params: {
          accountId: i._id
        }
      }));
      await e(), expect(t[0]).toBe(a[0]), expect(t[1]).toBe(a[1]), expect(t[2]).toBe(a[2]);
    });
  });
});