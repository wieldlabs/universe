const mongoose = require("mongoose"), createDb = require("../../helpers/create-test-db")["createDb"], getRandomAddress = require("../../helpers/get-random-address")["getRandomAddress"], Thread = require("../Thread")["Thread"], ThreadMessage = require("../ThreadMessage")["ThreadMessage"], Account = require("../Account")["Account"];

describe("ThreadMessage tests", () => {
  let r, a, d, e;
  const t = getRandomAddress(), s = getRandomAddress();
  beforeEach(() => jest.clearAllMocks()), beforeAll(async () => {
    await (db = await createDb()).connect(), r = await Account.createFromAddress({
      address: t,
      chainId: 1
    }), a = await Account.createFromAddress({
      address: s,
      chainId: 1
    }), [ d, e ] = await Thread.createThread({
      fromAccountId: r._id,
      recipientAddress: s,
      recipientChainId: 1
    });
  }), afterAll(async () => {
    await db.clearDatabase(), await db.closeDatabase();
  }), describe("_verifyThreadAndSender", () => {
    it("should throw an error if thread does not belong to account", async () => {
      try {
        await ThreadMessage._verifyThreadAndSender({
          threadId: new mongoose.Types.ObjectId(),
          senderId: r._id
        });
      } catch (e) {
        expect(e.message).toBe("Invalid Thread or Sender");
      }
    }), it("should return true if thread and account are valid", async () => {
      var e = await ThreadMessage._verifyThreadAndSender({
        threadId: d._id,
        senderId: a._id
      });
      expect(e).toBe(!0);
    });
  }), describe("createForThread", () => {
    it("should throw an error if thread or sender is invalid", async () => {
      try {
        await ThreadMessage._verifyThreadAndSender({
          threadId: new mongoose.Types.ObjectId(),
          senderId: r._id
        });
      } catch (e) {
        expect(e.message).toBe("Invalid Thread or Sender");
      }
    }), it("should create a new ThreadMessage", async () => {
      var e = await ThreadMessage.createForThread({
        threadId: d._id,
        senderId: r._id,
        contentRaw: "hello!"
      }), a = await ThreadMessage.find({
        thread: d._id
      });
      expect(a.length).toBeGreaterThanOrEqual(1), expect(e.sender.toString()).toBe(r._id.toString()), 
      expect(e.richContent.content.raw).toBe("hello!");
    });
  });
});