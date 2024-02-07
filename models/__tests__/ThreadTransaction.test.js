const mongoose = require("mongoose"), createDb = require("../../helpers/create-test-db")["createDb"], getRandomAddress = require("../../helpers/get-random-address")["getRandomAddress"], Thread = require("../Thread")["Thread"], ThreadTransaction = require("../ThreadTransaction")["ThreadTransaction"], Account = require("../Account")["Account"];

describe("ThreadTransaction tests", () => {
  let a, t, r;
  const e = getRandomAddress(), n = getRandomAddress();
  beforeEach(() => jest.clearAllMocks()), beforeAll(async () => {
    await (db = await createDb()).connect(), a = await Account.createFromAddress({
      address: e,
      chainId: 1
    }), t = await Account.createFromAddress({
      address: n,
      chainId: 1
    }), [ r ] = await Thread.createThread({
      fromAccountId: a._id,
      recipientAddress: n,
      recipientChainId: 1
    });
  }), afterAll(async () => {
    await db.clearDatabase(), await db.closeDatabase();
  }), describe("completeTransaction", () => {
    it("should throw an error if threadTransactionId is invalid", async () => {
      try {
        await ThreadTransaction.completeTransaction({
          threadTransactionId: mongoose.Types.ObjectId()
        });
      } catch (e) {
        expect(e.message).toBe("Invalid Transaction");
      }
    }), it("should modify the thread transaction with given param", async () => {
      var e = await ThreadTransaction.createNewStake({
        threadId: r._id,
        senderId: a._id,
        recipientId: t._id,
        nonce: 1,
        tokenAmount: "0.1",
        signature: "hashedSignature",
        transactionHash: "niceHash"
      }), e = await ThreadTransaction.completeTransaction({
        threadTransactionId: e._id,
        completionTransactionHash: "completionHash"
      });
      expect(e.isCompleted).toBe(!0), expect(e.completionTransactionHash).toBe("completionHash");
    });
  });
});