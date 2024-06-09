const mongoose = require("mongoose"), createDb = require("../../helpers/create-test-db")["createDb"], getRandomAddress = require("../../helpers/get-random-address")["getRandomAddress"], Account = require("../Account")["Account"], Post = require("../Post")["Post"], AccountReaction = require("../AccountReaction")["AccountReaction"];

describe("AccountReaction tests", () => {
  let t, o, c;
  const e = getRandomAddress();
  beforeEach(() => jest.clearAllMocks()), beforeAll(async () => {
    await (t = await createDb()).connect(), o = await Account.createFromAddress({
      address: e,
      chainId: 1
    }), c = await Post.createForAccount({
      accountId: o._id,
      contentRaw: "HI"
    });
  }), afterAll(async () => {
    await t.clearDatabase(), await t.closeDatabase();
  }), describe("reactForPost", () => {
    it("should throw an error for an invalid  post", async () => {
      expect.assertions(1);
      try {
        await AccountReaction.reactForPost({
          accountId: new mongoose.Types.ObjectId(),
          postId: new mongoose.Types.ObjectId(),
          reactionType: "LIKES",
          amount: 1
        });
      } catch (t) {
        expect(t.message).toContain("Invalid post");
      }
    }), it("should create an AccountReaction", async () => {
      var [ , t ] = await AccountReaction.reactForPost({
        accountId: o._id,
        postId: c._id,
        reactionType: "LIKES",
        amount: 1
      });
      expect(t.reactionObjectTypeId.toString()).toBe(c._id.toString()), expect(t.account.toString()).toBe(o._id.toString()), 
      expect(t.reactions.likes).toBe(1);
    }), it("should find and toggle the existing AccountReaction", async () => {
      var [ , t ] = await AccountReaction.reactForPost({
        accountId: o._id,
        postId: c._id,
        reactionType: "LIKES",
        amount: 0
      }), e = await AccountReaction.find({
        accountId: o._id,
        reactionObjectTypeId: c._id,
        reactionObjectType: "POST"
      });
      expect(e.length).toBe(1), expect(e[0]._id.toString()).toBe(t._id.toString()), 
      expect(e[0].reactions.likes).toBe(0);
    });
  }), describe("countReactionsByPostId", () => {
    it("should count the total amount of likes per post", async () => {
      var t = await Account.createFromAddress({
        address: getRandomAddress(),
        chainId: 1
      }), e = (await AccountReaction.reactForPost({
        accountId: t._id,
        postId: c._id,
        reactionType: "LIKES",
        amount: 1
      }), await AccountReaction.countReactionsByPostId(c._id)), e = (expect(e).toBeGreaterThanOrEqual(1), 
      await AccountReaction.reactForPost({
        accountId: t._id,
        postId: c._id,
        reactionType: "LIKES",
        amount: -1
      }), await AccountReaction.countReactionsByPostId(c._id));
      expect(e).toBe(0);
    });
  });
});