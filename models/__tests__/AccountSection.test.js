const createDb = require("../../helpers/create-test-db")["createDb"], getRandomAddress = require("../../helpers/get-random-address")["getRandomAddress"], Account = require("../Account")["Account"], Image = require("../Image")["Image"], AccountSection = require("../AccountSection")["AccountSection"];

describe("AccountSection tests", () => {
  let e, c, i;
  const t = getRandomAddress(), a = "Experiences";
  beforeEach(() => jest.clearAllMocks()), beforeAll(async () => {
    await (e = await createDb()).connect();
  }), afterAll(async () => {
    await e.clearDatabase(), await e.closeDatabase();
  }), describe("addDefaultToAccount", () => {
    it("should not create if account exists", async () => {
      c = await Account.createFromAddress({
        address: t,
        chainId: 1,
        email: "foo@bar.com"
      });
      try {
        i = await AccountSection.addDefaultToAccount({
          title: a,
          accountId: null
        });
      } catch (e) {
        expect(e.message).toMatch("Invalid Account Id"), expect(i).toBeFalsy();
      }
    }), it("should create a default section if account exists", async () => {
      i = await AccountSection.addDefaultToAccount({
        title: a,
        accountId: c._id
      }), c = await Account.findById(c._id), expect(c.sections.length).toBeGreaterThanOrEqual(1), 
      expect(c.sections).toEqual(expect.arrayContaining([ i._id ]));
    }), it("should include default entry if includeDefaultEntry is set to true", async () => {
      i = await AccountSection.addDefaultToAccount({
        title: a,
        accountId: c._id,
        includeDefaultEntry: !0
      }), c = await Account.findById(c._id), expect(i.entries[0].title).toEqual("New entry");
    });
  }), describe("updateMe", () => {
    it("should update properties that are not undefined", async () => {
      i = await i.updateMe({
        isVisible: !0,
        title: void 0
      }), expect(i.isVisible).toEqual(!0), expect(i.title).toEqual(a);
    });
  }), describe("updateEntry", () => {
    it("should throw an error if entry does not exist", async () => {
      try {
        await i.updateEntry(i._id);
      } catch (e) {
        expect(e.message).toMatch("Invalid entry");
      }
    }), it("should throw an error if image does not exist", async () => {
      try {
        await i.updateEntry(i.entries[0]._id, {
          imageId: i._id
        });
      } catch (e) {
        expect(e.message).toMatch("Invalid Image Id");
      }
    }), it("should update the entry accordingly", async () => {
      var e = await Image.create({});
      i = await i.updateEntry(i.entries[0]._id, {
        imageId: e._id,
        title: void 0,
        link: "https://beb.xyz"
      }), expect(i.entries[0].image).toEqual(e._id), expect(i.entries[0].title).toEqual("New entry"), 
      expect(i.entries[0].link).toEqual("https://beb.xyz");
    });
  }), describe("addDefauEntry", () => {
    it("should add a default entry", async () => {
      i = await (i = await (i = await i.addDefauEntry()).addDefauEntry()).addDefauEntry(), 
      expect(i.entries.length).toBeGreaterThanOrEqual(3), expect(i.entries[i.entries.length - 1].title).toEqual("New entry");
    });
  }), describe("deleteEntry", () => {
    it("should delete the entry", async () => {
      var e;
      for (e of i.entries.map(e => e._id)) i = await i.deleteEntry(e);
      expect(i.entries.length).toBe(0);
    });
  }), describe("deleteMe", () => {
    it("delete the section and remove it from the account", async () => {
      var {
        _id: e,
        account: t
      } = i, a = await i.deleteMe(), t = (c = await Account.findById(t), await AccountSection.findById(e));
      expect(a).toEqual(e), expect(t).toBeFalsy(), expect(c.sections).not.toEqual(expect.arrayContaining([ e ]));
    });
  });
});