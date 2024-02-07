const mongoose = require("mongoose"), createDb = require("../../helpers/create-test-db")["createDb"], getRandomAddress = require("../../helpers/get-random-address")["getRandomAddress"], Thread = require("../Thread")["Thread"], AccountThread = require("../AccountThread")["AccountThread"], ThreadMessage = require("../ThreadMessage")["ThreadMessage"], Account = require("../Account")["Account"];

describe("AccountThread tests", () => {
  let d, t, a, r, c;
  const e = getRandomAddress(), n = getRandomAddress();
  beforeEach(() => jest.clearAllMocks()), beforeAll(async () => {
    await (db = await createDb()).connect(), d = await Account.createFromAddress({
      address: e,
      chainId: 1
    }), t = await Account.createFromAddress({
      address: n,
      chainId: 1
    }), [ a, [ r, c ] ] = await Thread.createThread({
      fromAccountId: d._id,
      recipientAddress: n,
      recipientChainId: 1
    });
  }), afterAll(async () => {
    await db.clearDatabase(), await db.closeDatabase();
  }), describe("_existingAccountThread", () => {
    it("should return null if account thread does not exist", async () => {
      var e = await AccountThread._existingAccountThread({
        threadId: a._id,
        accountId: mongoose.Types.ObjectId()
      });
      expect(e).toBe(null);
    }), it("should return null if accountId or threadId is not provided", async () => {
      var e = await AccountThread._existingAccountThread({
        threadId: a._id
      });
      expect(e).toBe(null);
    }), it("should return the correct AccountThread", async () => {
      var e = await AccountThread._existingAccountThread({
        threadId: a._id,
        accountId: t._id
      });
      expect(e.account.toString()).toBe(c.account.toString()), expect(e.thread.toString()).toBe(c.thread.toString()), 
      expect(e._id.toString()).toBe(c._id.toString());
    });
  }), describe("findOrCreate", () => {
    it("should return the existing AccountThread if applicable", async () => {
      var e = await AccountThread.findOrCreate({
        threadId: a._id,
        accountId: d._id
      });
      expect(e._id.toString()).toEqual(r._id.toString());
    }), it("should create a new AccountThread", async () => {
      var [ e ] = await Thread.createThread({
        fromAccountId: d._id,
        recipientAddress: getRandomAddress(),
        recipientChainId: 1
      }), t = await AccountThread.findOrCreate({
        threadId: e._id,
        accountId: d._id
      });
      expect(t.account.toString()).toBe(d._id.toString()), expect(t.thread.toString()).toBe(e._id.toString());
    });
  }), describe("acceptAccountThread", () => {
    it("should throw an error if thread or account is not found", async () => {
      try {
        await AccountThread.acceptAccountThread({
          threadId: mongoose.Types.ObjectId(),
          accountId: d._id
        });
      } catch (e) {
        expect(e.message).toBe("Invalid AccountThread");
      }
    }), it("should modify the existing AccountThread to isAccepted = true", async () => {
      var e = await AccountThread.acceptAccountThread({
        threadId: a._id,
        accountId: t._id
      });
      expect(e.isAccepted).toEqual(!0);
    });
  }), describe("getAccountThreadByThread", () => {
    it("should return an empty array if no AccountThread is found", async () => {
      var e = await AccountThread.getAccountThreadByThread({
        threadId: mongoose.Types.ObjectId()
      });
      expect(e.length).toEqual(0);
    }), it("should get all existing account threads by thread id", async () => {
      var e = await AccountThread.getAccountThreadByThread({
        threadId: a._id
      });
      expect(e.length).toBeGreaterThanOrEqual(2);
    }), it("should get all existing except self id", async () => {
      var e = await AccountThread.getAccountThreadByThread({
        threadId: a._id,
        exceptSelfId: d._id
      });
      expect(e.length).toBe(1), expect(e[0].account.toString()).toBe(t._id.toString());
    });
  }), describe("findAndSortByLatestThreadMessage", () => {
    let t, a;
    it("should get all account threads by account and sort by thread message", async () => {
      [ t ] = await Thread.createThread({
        fromAccountId: d._id,
        recipientAddress: getRandomAddress(),
        recipientChainId: 1
      }), [ a ] = await Thread.createThread({
        fromAccountId: d._id,
        recipientAddress: getRandomAddress(),
        recipientChainId: 1
      }), await ThreadMessage.createForThread({
        threadId: a._id,
        senderId: d._id
      }), await ThreadMessage.createForThread({
        threadId: t._id,
        senderId: d._id
      });
      var e = await AccountThread.findAndSortByLatestThreadMessage(d._id);
      expect(e.length).toBeGreaterThanOrEqual(2), expect(e[0].thread._id.toString()).toMatch(t._id.toString()), 
      expect(e[1].thread._id.toString()).toMatch(a._id.toString());
    }), it("should return an empty array if no condition match", async () => {
      var e = await AccountThread.findAndSortByLatestThreadMessage(mongoose.Types.ObjectId());
      expect(e.length).toBe(0);
    }), it("should work with skip and limit", async () => {
      var e = await AccountThread.findAndSortByLatestThreadMessage(d._id, {
        limit: 1,
        offset: 1
      });
      expect(e.length).toBe(1), expect(e[0].thread._id.toString()).toBe(a._id.toString());
    });
  });
});