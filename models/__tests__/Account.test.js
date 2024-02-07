const createDb = require("../../helpers/create-test-db")["createDb"], {
  getSignedMessage,
  wallet
} = require("../../helpers/test-sign-wallet"), getRandomAddress = require("../../helpers/get-random-address")["getRandomAddress"], Account = require("../Account")["Account"], AccountAddress = require("../AccountAddress")["AccountAddress"], AccountNonce = require("../AccountNonce")["AccountNonce"];

describe("Account tests", () => {
  let e, t, a;
  const n = getRandomAddress();
  beforeEach(() => jest.clearAllMocks()), beforeAll(async () => {
    await (e = await createDb()).connect();
  }), afterAll(async () => {
    await e.clearDatabase(), await e.closeDatabase();
  }), describe("createFromAddress", () => {
    it("should insert an account and an accountAddress into collection", async () => {
      t = await Account.createFromAddress({
        address: n,
        chainId: 1,
        email: "foo@bar.com"
      });
      var e = await Account.findOne({
        _id: t._id
      }), a = (expect(e._id).toEqual(t._id), expect(e.addresses.length).toBe(1), 
      await AccountNonce.findOne({
        account: t._id
      }));
      expect(a).toBeTruthy(), expect(parseInt(a.nonce, 10)).toBeLessThan(1e4), await e.populate("addresses"), 
      expect(e.addresses[0].address).toEqual(n);
    }), it("should create an Account Nonce less than 10000", async () => {
      a = await AccountNonce.findOne({
        account: t._id
      }), expect(a).toBeTruthy(), expect(parseInt(a.nonce, 10)).toBeLessThan(1e4);
    }), it("should not insert an account if chain id is invalid", async () => {
      expect.assertions(1);
      try {
        await Account.createFromAddress({
          address: n,
          chainId: 9999999999999,
          email: "foo@bar.com"
        });
      } catch (e) {
        expect(e.message).toMatch("Invalid chain id");
      }
    }), it("should not insert an account if address is invalid", async () => {
      expect.assertions(1);
      try {
        await Account.createFromAddress({
          address: "invalid address",
          chainId: 1,
          email: "foo@bar.com"
        });
      } catch (e) {
        expect(e.message).toMatch("invalid address");
      }
    });
  }), describe("findByAddressAndChainId", () => {
    it("should return the account corresponding with the address and chain", async () => {
      var e = await Account.findByAddressAndChainId({
        address: n,
        chainId: 1
      });
      expect(e._id).toEqual(t._id);
    }), it("should return null if not found", async () => {
      var e = await Account.findByAddressAndChainId({
        address: n,
        chainId: 9999999
      });
      expect(e).toBeFalsy();
    }), it("should return an error if address is invalid", async () => {
      try {
        await Account.findByAddressAndChainId({
          address: "invalid address",
          chainId: 1
        });
      } catch (e) {
        expect(e).toBeInstanceOf(Error);
      }
    });
  }), describe("verifySignature", () => {
    it("should return an error if account is not found", async () => {
      try {
        await Account.verifySignature({
          address: n,
          chainId: 999
        });
      } catch (e) {
        expect(e.message).toMatch("Account not found");
      }
    }), it("should return an error if signature is invalid", async () => {
      try {
        await Account.verifySignature({
          address: n,
          chainId: 1,
          signature: "0xfake"
        });
      } catch (e) {
        expect(e).toBeInstanceOf(Error);
      }
    }), it("should return the account and account nonce if valid", async () => {
      var e = await Account.createFromAddress({
        address: wallet.address,
        chainId: 1
      }), a = await AccountNonce.findOne({
        account: e._id
      }), t = (await getSignedMessage(a.nonce))["message"], t = await Account.verifySignature({
        address: wallet.address,
        chainId: 1,
        signature: t
      });
      expect(t.account._id).toEqual(e._id), expect(t.accountNonce._id).toEqual(a._id);
    });
  }), describe("authBySignature", () => {
    it("should return an error if signature is invalid", async () => {
      try {
        var e = (await getSignedMessage(a.nonce))["message"];
        await Account.authBySignature({
          address: n,
          chainId: 1,
          signature: e
        });
      } catch (e) {
        expect(e.message).toMatch("Unauthorized");
      }
    }), it("should return generate a new nonce and generate an access token", async () => {
      var e = await Account.findOne({
        address: wallet.address,
        chainId: 1
      }), e = await AccountNonce.findOne({
        account: e._id
      }), a = (await getSignedMessage(e.nonce))["message"], a = await Account.authBySignature({
        address: wallet.address,
        chainId: 1,
        signature: a
      });
      expect(a.accountNonce.nonce).not.toEqual(e.nonce), expect(a.accessToken).toBeTruthy();
    });
  }), describe("updateMe", () => {
    it("Should update only relevant fields", async () => {
      t = await t.updateMe({
        email: "nico@beb.xyz",
        username: "nico",
        location: "web3",
        badField: "blah"
      }), expect(t.email).toEqual("nico@beb.xyz"), expect(t.username).toEqual("nico"), 
      expect(t.location).toEqual("web3");
    }), it("Should ignore undefined fields while preserving null fields", async () => {
      var e = {
        email: null,
        username: void 0
      };
      t = await t.updateMe(e), expect(t.username).toEqual("nico"), expect(t.email).toBeFalsy();
    }), it("Should not insert a profile image if it does not exist", async () => {
      try {
        var e = {
          profileImageId: t._id
        };
        t = await t.updateMe(e);
      } catch (e) {
        expect(e.message).toMatch("Invalid Image Id");
      }
    });
  }), describe("virtual property: addressId", () => {
    it("should return the first addressId", async () => {
      var e = await AccountAddress.findOne({
        account: t._id
      });
      expect(t.addressId).toEqual(e._id);
    });
  }), describe("_existingUsernameCheck", () => {
    it("should return True", async () => {
      var e = await Account.createFromAddress({
        address: getRandomAddress(),
        chainId: 1,
        email: "foo@bar.com"
      }), e = (await e.updateMe({
        username: "DarthVader"
      }), await Account._existingUsernameCheck(e, "darthvader"));
      expect(e).toEqual(!0);
    });
  });
});