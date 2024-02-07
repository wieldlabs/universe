const createDb = require("../../helpers/create-test-db")["createDb"], {
  getSignedMessage,
  wallet
} = require("../../helpers/test-sign-wallet"), getRandomAddress = require("../../helpers/get-random-address")["getRandomAddress"], generateNewAccessTokenFromAccount = require("../../helpers/jwt")["generateNewAccessTokenFromAccount"], Account = require("../../models/Account")["Account"], AccountNonce = require("../../models/AccountNonce")["AccountNonce"], Service = require("../AuthService")["Service"];

describe("AuthService tests", () => {
  let e, n, c;
  const s = wallet.address;
  beforeEach(() => jest.clearAllMocks()), beforeAll(async () => {
    await (e = await createDb()).connect(), n = await Account.createFromAddress({
      address: s,
      chainId: 1
    }), c = new Service();
  }), afterAll(async () => {
    await e.clearDatabase(), await e.closeDatabase();
  }), describe("verifySignature", () => {
    it("should return an error if account is not found", async () => {
      expect.assertions(1);
      try {
        await c.verifySignature({
          address: getRandomAddress(),
          chainId: 999
        });
      } catch (e) {
        expect(e.message).toMatch("Account not found");
      }
    }), it("should return an error if signature is invalid", async () => {
      expect.assertions(1);
      try {
        await c.verifySignature({
          address: s,
          chainId: 1,
          signature: "0xfake"
        });
      } catch (e) {
        expect(e).toBeInstanceOf(Error);
      }
    }), it("should return the account and account nonce if valid", async () => {
      var e = await AccountNonce.findOne({
        account: n._id
      }), t = (await getSignedMessage(e.nonce))["message"], t = await c.verifySignature({
        address: s,
        chainId: 1,
        signature: t
      });
      expect(t.account._id.toString()).toEqual(n._id.toString()), expect(t.accountNonce._id.toString()).toEqual(e._id.toString());
    });
  }), describe("authBySignature", () => {
    it("should return an error if signature is invalid", async () => {
      expect.assertions(1);
      try {
        var e = getRandomAddress(), t = await Account.createFromAddress({
          address: e,
          chainId: 1
        }), a = await AccountNonce.findOne({
          account: t._id
        }), n = (await getSignedMessage(a.nonce))["message"];
        await c.authBySignature({
          address: e,
          chainId: 1,
          signature: n
        });
      } catch (e) {
        expect(e.message).toMatch("Unauthorized");
      }
    }), it("should return account if valid", async () => {
      var e = await AccountNonce.findOne({
        account: n._id
      }), e = (await getSignedMessage(e.nonce))["message"], e = await c.authBySignature({
        address: s,
        chainId: 1,
        signature: e
      });
      expect(e._id.toString()).toEqual(n._id.toString());
    });
  }), describe("authenticate", () => {
    it("should throw an error if account does not exist", async () => {
      expect.assertions(1);
      try {
        await c.authenticate({
          address: getRandomAddress(),
          chainId: 1
        });
      } catch (e) {
        expect(e.message).toBe("Account not found");
      }
    }), it("should generate a new nonce and generate an access token", async () => {
      var e = await AccountNonce.findOne({
        account: n._id
      }), t = (await getSignedMessage(e.nonce))["message"], t = await c.authenticate({
        address: s,
        chainId: 1,
        signature: t
      }), a = await Account.findById(n._id), a = await generateNewAccessTokenFromAccount(a);
      expect(t.accountNonce.nonce).not.toEqual(e.nonce), expect(t.accessToken).toEqual(a);
    });
  });
});