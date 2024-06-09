const mongoose = require("mongoose"), createDb = require("../../helpers/create-test-db")["createDb"], getRandomAddress = require("../../helpers/get-random-address")["getRandomAddress"], Account = require("../Account")["Account"], Community = require("../Community")["Community"], Post = require("../Post")["Post"];

describe("Post tests", () => {
  let t, r, i, o, a;
  const e = getRandomAddress();
  beforeEach(() => jest.clearAllMocks()), beforeAll(async () => {
    await (t = await createDb()).connect(), r = await Account.createFromAddress({
      address: e,
      chainId: 1
    }), i = await Community.create({
      name: "community1"
    }), o = await Community.create({
      name: "community2"
    });
  }), afterAll(async () => {
    await t.clearDatabase(), await t.closeDatabase();
  }), describe("_verifyAndUpdateParentReplies", () => {
    it("should throw an error for an invalid parent post", async () => {
      expect.assertions(1);
      try {
        await Post._verifyAndUpdateParentReplies({
          parentId: new mongoose.Types.ObjectId(),
          postId: new mongoose.Types.ObjectId()
        });
      } catch (t) {
        expect(t.message).toBe("Invalid parent id");
      }
    });
  }), describe("createForAccount", () => {
    it("should create a post", async () => {
      a = await Post.createForAccount({
        accountId: r._id,
        contentRaw: "HI"
      });
      var t = await Post.findById(a._id);
      expect(t.account.toString()).toEqual(r._id.toString());
    }), it("should insert the post id into parent replies array", async () => {
      var t = await Post.createForAccount({
        accountId: r._id,
        contentRaw: "HI comment",
        parentId: a._id
      });
      a = await Post.findById(a._id), expect(a.replies.length).toBeGreaterThanOrEqual(1), 
      expect(t.parent.toString()).toBe(a._id.toString()), await a.populate({
        path: "replies"
      }), expect(a.replies[0]._id.toString()).toBe(t._id.toString());
    });
  }), describe("findAndSortByLatest", () => {
    it("should find posts by account if the account filter is active", async () => {
      var t = await Post.findAndSortByLatest({
        filters: {
          account: r._id
        }
      }), e = await Post.find({
        account: r._id
      }).sort("-createdAt");
      expect(e.length).toEqual(t.length), expect(e[0]._id.toString()).toEqual(t[0]._id.toString()), 
      expect(e[1]._id.toString()).toEqual(t[1]._id.toString());
    }), it("should find posts by parent if the post filter is active", async () => {
      var t = await Post.findAndSortByLatest({
        filters: {
          post: a._id
        }
      }), e = await Post.find({
        parent: a._id
      }).sort("-createdAt");
      expect(e.length).toEqual(t.length), expect(e[0]._id.toString()).toEqual(t[0]._id.toString());
    }), it("should find posts by communities if the communities filter is active", async () => {
      var t = await Post.create({
        account: r._id,
        community: i._id
      }), e = (await new Promise(t => setTimeout(t, 1e3)), await Post.create({
        account: r._id,
        community: o._id
      })), a = await Post.findAndSortByLatest({
        filters: {
          communities: [ i._id, o._id ]
        }
      });
      expect(a.length).toEqual(2), expect(a[0]._id.toString()).toEqual(e._id.toString()), 
      expect(a[1]._id.toString()).toEqual(t._id.toString());
    }), it("should find all posts by latest createdAt if no filters", async () => {
      var t = await Post.createForAccount({
        accountId: r._id,
        contentRaw: "justCreatedThisPost"
      }), e = await Post.createForAccount({
        accountId: r._id,
        contentRaw: "justCreatedThisComment",
        parentId: t._id
      }), a = await Post.findAndSortByLatest();
      expect(a[0]._id.toString()).toEqual(e._id.toString()), expect(a[1]._id.toString()).toEqual(t._id.toString());
    });
  }), describe("findAndSortByLastActivity", () => {
    it("should find all posts by latest replies", async () => {
      var t = await Post.createForAccount({
        accountId: r._id,
        contentRaw: "justCreatedThisPost"
      }), e = await Post.createForAccount({
        accountId: r._id,
        contentRaw: "justCreatedThisPost"
      }), a = await Post.createForAccount({
        accountId: r._id,
        contentRaw: "justCreatedThisComment",
        parentId: e._id
      }), i = await Post.createForAccount({
        accountId: r._id,
        contentRaw: "justCreatedThisComment",
        parentId: t._id
      }), o = await Post.createForAccount({
        accountId: r._id,
        contentRaw: "justCreatedThisPost"
      }), n = await Post.findAndSortByLastActivity({
        filters: {
          excludeComments: !0
        }
      });
      expect(n[0]._id.toString()).toEqual(o._id.toString()), expect(n[1]._id.toString()).toEqual(t._id.toString()), 
      expect(n[2]._id.toString()).toEqual(e._id.toString()), expect(i.root.toString()).toEqual(t._id.toString()), 
      expect(a.root.toString()).toEqual(e._id.toString());
    });
  });
});