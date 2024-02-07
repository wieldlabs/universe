const mongoose = require("mongoose"), createDb = require("../../helpers/create-test-db")["createDb"], getRandomAddress = require("../../helpers/get-random-address")["getRandomAddress"], Thread = require("../Thread")["Thread"], ThreadMessage = require("../ThreadMessage")["ThreadMessage"], AccountThread = require("../AccountThread")["AccountThread"], Account = require("../Account")["Account"], AccountNonce = require("../AccountNonce")["AccountNonce"];

describe("Thread tests", () => {
  beforeEach(() => jest.clearAllMocks()), beforeAll(async () => {
    await (db = await createDb()).connect();
  }), afterAll(async () => {
    await db.clearDatabase(), await db.closeDatabase();
  }), describe("_existingThreadBetweenAccounts", () => {
    let a, d;
    const t = getRandomAddress(), r = getRandomAddress();
    it("should return null if no existing thread between accounts", async () => {
      a = await Account.createFromAddress({
        address: t,
        chainId: 1
      }), d = await Account.createFromAddress({
        address: r,
        chainId: 1
      });
      var [ e ] = await Thread._existingThreadBetweenAccounts({
        accountIdOne: a._id,
        accountIdTwo: d._id
      });
      expect(e).toBeFalsy();
    }), it("should return the existing Thread if there is one", async () => {
      var [ e ] = await Thread.createThread({
        fromAccountId: a._id,
        recipientAddress: r,
        recipientChainId: 1
      }), [ t ] = await Thread._existingThreadBetweenAccounts({
        accountIdOne: a._id,
        accountIdTwo: d._id
      });
      expect(t._id.toString()).toMatch(e._id.toString());
    });
  }), describe("createThread", () => {
    let d, r, c;
    const t = getRandomAddress(), n = getRandomAddress();
    it("should throw an error if account does not exist", async () => {
      try {
        await Thread.createThread({
          fromAccountId: mongoose.Types.ObjectId()
        });
      } catch (e) {
        expect(e.message).toMatch("Invalid Account");
      }
    }), it("should create an account for the recipient if recipient account is not defined", async () => {
      d = await Account.createFromAddress({
        address: t,
        chainId: 1
      });
      var [ e ] = await Thread.createThread({
        fromAccountId: d._id,
        recipientAddress: n,
        recipientChainId: 1
      });
      c = e, r = await Account.findByAddressAndChainId({
        address: n,
        chainId: 1
      }), expect(r).toBeDefined();
    }), it("should create a thread and two accountThreads", async () => {
      var e = await Account.create({}), [ t, a ] = await Thread.createThread({
        fromAccountId: e._id,
        recipientAddress: n,
        recipientChainId: 1
      }), d = await AccountThread.findOne({
        account: e._id,
        thread: t._id
      }), d = (expect(d).toBeDefined(), await AccountThread.findOne({
        account: r._id,
        thread: t._id
      }));
      expect(d).toBeDefined(), expect(a.length).toBe(2), expect(a[0].account.toString()).toMatch(e._id.toString()), 
      expect(a[1].account.toString()).toMatch(r._id.toString());
    }), it("should not create a thread if a thread exists between accounts", async () => {
      var [ e ] = await Thread.createThread({
        fromAccountId: d._id,
        recipientAddress: n,
        recipientChainId: 1
      });
      expect(e._id.toString()).toEqual(c._id.toString());
    }), it("should not create an accountThread if an accountThread exists", async () => {
      var e = await AccountThread.findOne({
        account: d._id,
        thread: c._id
      }), t = await AccountThread.findOne({
        account: r._id,
        thread: c._id
      }), [ , a ] = (expect(e).toBeDefined(), expect(t).toBeDefined(), await Thread.createThread({
        fromAccountId: d._id,
        recipientAddress: n,
        recipientChainId: 1
      })), a = [ a[0]._id.toString(), a[1]._id.toString() ];
      expect(a).toContain(e._id.toString()), expect(a).toContain(t._id.toString());
    });
  }), describe("getRecipientsByThreadId", () => {
    const d = getRandomAddress(), r = getRandomAddress();
    it("should return an empty array if thread is not found", async () => {
      var e = await Thread.getRecipientsByThreadId({
        threadId: mongoose.Types.ObjectId()
      });
      expect(e.length).toBe(0);
    }), it("should return all accounts associated with thread", async () => {
      var e = await Account.createFromAddress({
        address: d,
        chainId: 1
      }), [ e, t ] = await Thread.createThread({
        fromAccountId: e._id,
        recipientAddress: r,
        recipientChainId: 1
      }), e = await Thread.getRecipientsByThreadId({
        threadId: e._id
      }), t = (expect(e.length).toBe(2), [ t[0].account.toString(), t[1].account.toString() ]);
      expect(t).toContain(e[0]._id.toString()), expect(t).toContain(e[1]._id.toString());
    }), it("should return all accounts except self if exceptSelfId", async () => {
      var e = await Account.createFromAddress({
        address: d,
        chainId: 1
      }), [ t, a ] = await Thread.createThread({
        fromAccountId: e._id,
        recipientAddress: r,
        recipientChainId: 1
      }), t = await Thread.getRecipientsByThreadId({
        threadId: t._id,
        exceptSelfId: e._id
      }), e = (expect(t.length).toBe(1), a[1].account.toString());
      expect(t[0]._id.toString()).toMatch(e);
    });
  }), describe("getMessages", () => {
    it("should get the latest ThreadMessage first", async () => {
      var e = await Thread.findOne({}), t = await AccountThread.findOne({
        thread: e._id
      }), t = (await ThreadMessage.createForThread({
        threadId: e._id,
        senderId: t.account,
        contentRaw: "Hello!"
      }), await ThreadMessage.createForThread({
        threadId: e._id,
        senderId: t.account,
        contentRaw: "Hello1!"
      }), await ThreadMessage.createForThread({
        threadId: e._id,
        senderId: t.account,
        contentRaw: "Hello2!"
      }), await Thread.getMessages(e._id));
      expect(t.length).toBeGreaterThanOrEqual(3), expect(t[0].richContent.content.raw).toEqual("Hello2!");
    });
  }), describe("createStakedThread", () => {
    let a, e, t, d;
    const r = getRandomAddress(), c = getRandomAddress();
    it("should throw an error if account does not exist", async () => {
      try {
        await Thread.createStakedThread({
          senderId: mongoose.Types.ObjectId()
        });
      } catch (e) {
        expect(e.message).toMatch("Invalid Account");
      }
    }), it("should create a thread and a thread transaction", async () => {
      a = await Account.createFromAddress({
        address: r,
        chainId: 1
      }), d = await Account.createFromAddress({
        address: c,
        chainId: 1
      }), [ e, t ] = await Thread.createStakedThread({
        senderId: a._id,
        recipientAddress: c,
        recipientChainId: 1,
        nonce: 1,
        tokenAmount: "0.1",
        signature: "hashedSignature",
        transactionHash: "0x1283"
      }), expect(e).toBeDefined(), expect(t.thread.toString()).toBe(e._id.toString()), 
      expect(t.recipient.toString()).toBe(d._id.toString()), expect(t.sender.toString()).toBe(a._id.toString());
    }), it("should regenerate account's transactionNonce", async () => {
      var e = await AccountNonce.findOne({
        account: a._id
      }), t = (await Thread.createStakedThread({
        senderId: a._id,
        recipientAddress: c,
        recipientChainId: 1,
        nonce: 1,
        tokenAmount: "0.1",
        signature: "hashedSignature",
        transactionHash: "0x1283"
      }), await AccountNonce.findOne({
        account: a._id
      }));
      expect(e.transactionNonce).not.toBe(t.transactionNonce);
    });
  });
});