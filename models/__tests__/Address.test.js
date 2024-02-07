const createDb = require("../../helpers/create-test-db")["createDb"], getRandomAddress = require("../../helpers/get-random-address")["getRandomAddress"], Address = require("../Address")["Address"];

describe("Address tests", () => {
  let e;
  const d = getRandomAddress();
  beforeEach(() => jest.clearAllMocks()), beforeAll(async () => {
    await (e = await createDb()).connect();
  }), afterAll(async () => {
    await e.clearDatabase(), await e.closeDatabase();
  }), describe("findOrCreate", () => {
    let a;
    it("should generate a new Address with valid address and chainId", async () => {
      a = await Address.findOrCreate({
        address: d,
        chainId: 1
      });
      var e = await Address.findOne({
        address: d
      });
      expect(e.address).toEqual(d), expect(e.chain.chainId).toEqual(1);
    }), it("should return the existing address if creating non-unique addresses", async () => {
      var e = await Address.findOrCreate({
        address: d,
        chainId: 1
      });
      expect(e.address).toEqual(d), expect(e.chain.chainId).toEqual(1), expect(e._id.toString()).toEqual(a._id.toString());
    });
  });
});