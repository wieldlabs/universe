const mongoose = require("mongoose"), createDb = require("../../helpers/create-test-db")["createDb"], getSignedMessage = require("../../helpers/test-sign-wallet")["getSignedMessage"], getRandomAddress = require("../../helpers/get-random-address")["getRandomAddress"], Account = require("../Account")["Account"], AccountNonce = require("../AccountNonce")["AccountNonce"];

describe("AccountNonce tests", () => {
  let e, n, c;
  const t = getRandomAddress();
  beforeEach(() => jest.clearAllMocks()), beforeAll(async () => {
    await (e = await createDb()).connect();
  }), afterAll(async () => {
    await e.clearDatabase(), await e.closeDatabase();
  }), describe("create", () => {
    it("should generate a new Account Nonce less than 10000", async () => {
      n = await Account.createFromAddress({
        address: t,
        chainId: 1,
        email: "foo@bar.com"
      }), c = await AccountNonce.findOne({
        account: n._id
      }), expect(c).toBeTruthy(), expect(parseInt(c.nonce, 10)).toBeLessThan(1e4);
    });
  }), describe("generateNewNonce", () => {
    it("should generate a new nonce", async () => {
      var e = c.nonce;
      await c.generateNewNonce(), expect(e).not.toBe(c.nonce);
    });
  }), describe("generateNewTransactionNonce", () => {
    it("should generate a new nonce", async () => {
      var e = c.transactionNonce;
      await c.generateNewTransactionNonce(), expect(e).not.toBe(c.transactionNonce);
    });
  }), describe("generateNewTransactionNonceByAccountId", () => {
    it("should generate a new nonce for accountId", async () => {
      var e = c.transactionNonce, n = await AccountNonce.generateNewTransactionNonceByAccountId(c.account);
      expect(e).not.toBe(n.transactionNonce);
    }), it("should throw an error for invalid account nonce", async () => {
      expect.assertions(1);
      try {
        await AccountNonce.generateNewTransactionNonceByAccountId(mongoose.Types.ObjectId());
      } catch (e) {
        expect(e.message).toBe("Invalid account nonce");
      }
    });
  }), describe("decodeAddressBySignature", () => {
    it("should decode the signature", async () => {
      var {
        message: e,
        address: n
      } = await getSignedMessage(c.nonce), e = await c.decodeAddressBySignature(e);
      expect(e.toLowerCase()).toBe(n.toLowerCase());
    });
  });
});