const createDb = require("../../helpers/create-test-db")["createDb"], Community = require("../Community")["Community"];

describe("Community tests", () => {
  let e, t;
  beforeEach(() => jest.clearAllMocks()), beforeAll(async () => {
    await (e = await createDb()).connect(), t = await Community.create({
      name: "Beta users"
    });
  }), afterAll(async () => {
    await e.clearDatabase(), await e.closeDatabase();
  }), describe("findAndSort", () => {
    it("should find and sort communities", async () => {
      expect.assertions(1);
      var e = await Community.findAndSort({
        sort: "trendy"
      });
      expect(e[0].name).toBe(t.name);
    });
  });
});