const createDb = require("../create-test-db")["createDb"], {
  getSignedMessage,
  wallet
} = require("../test-sign-wallet"), requireAuth = require("../auth-middleware")["requireAuth"], Account = require("../../models/Account")["Account"], AccountNonce = require("../../models/AccountNonce")["AccountNonce"];

describe("Auth middleware tests", () => {
  let e, a, t;
  beforeEach(() => jest.clearAllMocks()), beforeAll(async () => {
    await (e = await createDb()).connect();
  }), afterAll(async () => {
    await e.clearDatabase(), await e.closeDatabase();
  }), describe("authBySignature", () => {
    it("should decode the correct access token", async () => {
      a = await Account.createFromAddress({
        address: wallet.address,
        chainId: 1
      }), t = await AccountNonce.findOne({
        account: a._id
      });
      var e = (await getSignedMessage(t.nonce))["message"], e = (await Account.authBySignature({
        address: wallet.address,
        chainId: 1,
        signature: e
      }))["accessToken"], e = await requireAuth(e);
      expect(e.payload.id).toEqual(a._id.toString());
    });
  });
});