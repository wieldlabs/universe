const mongoose = require("mongoose"), schema = require("../schemas/post")["schema"], ContentService = require("../services/ContentService")["Service"];

class PostClass {
  static ping() {
    console.log("model: PostClass");
  }
  static _buildPostFeedMatchQuery({
    filters: t
  }) {
    let e = {};
    return t.showHidden || (e.isHidden = !1), t.excludeComments && (e = {
      ...e,
      parent: null
    }), t.excludeChannels && (e = {
      ...e,
      channel: null
    }), t.account && (e = {
      ...e,
      account: mongoose.Types.ObjectId(t.account)
    }), t.post && (e = {
      ...e,
      parent: mongoose.Types.ObjectId(t.post)
    }), t.channel && (e = {
      ...e,
      channel: mongoose.Types.ObjectId(t.channel)
    }), t.community && (e = {
      ...e,
      community: mongoose.Types.ObjectId(t.community)
    }), e = t.communities && t.communities.length ? {
      ...e,
      community: {
        $in: t.communities.map(t => mongoose.Types.ObjectId(t))
      }
    } : e;
  }
  static async _getParentOrError(t) {
    t = await this.findById(t);
    if (t) return t;
    throw new Error("Invalid parent id");
  }
  static async _verifyAndUpdateParentReplies({
    parentId: t,
    postId: e
  }) {
    t = await this.findById(t);
    if (t) return t.replies.push(e), t.save();
    throw new Error("Invalid parent id");
  }
  static async createForAccount({
    parentId: t,
    accountId: e,
    channelId: n,
    externalId: s,
    communityId: o,
    contentRaw: i,
    contentJson: a,
    contentHtml: c,
    blocks: r
  }) {
    i = await new ContentService().makeRichContent({
      contentRaw: i,
      contentJson: a,
      contentHtml: c,
      blocks: r
    }), a = new Post({
      account: e,
      community: o,
      channel: n,
      externalId: s,
      richContent: i
    });
    return t && (c = await this._verifyAndUpdateParentReplies({
      parentId: t,
      postId: a._id
    }), a.parent = c._id, a.root = c.root || c._id, a.community = c.community || null, 
    a.channel = c.channel || null), a.save();
  }
  static async countComments(t) {
    return this.countDocuments({
      parent: t
    });
  }
  static async findAndSortByLatest({
    limit: t = 20,
    offset: e = 0,
    filters: n = {}
  } = {}) {
    n = this._buildPostFeedMatchQuery({
      filters: n
    });
    return await Post.aggregate([ {
      $match: n
    }, {
      $sort: {
        createdAt: -1,
        _id: 1
      }
    }, {
      $skip: parseInt(e, 10)
    }, {
      $limit: parseInt(t, 10)
    } ]);
  }
  static async findAndSortByLastActivity({
    limit: t = 20,
    offset: e = 0,
    filters: n = {}
  } = {}) {
    n = this._buildPostFeedMatchQuery({
      filters: n
    });
    return await Post.aggregate([ {
      $match: n
    }, {
      $sort: {
        updatedAt: -1,
        _id: 1
      }
    }, {
      $skip: parseInt(e, 10)
    }, {
      $limit: parseInt(t, 10)
    } ]);
  }
  static async findAndSort({
    limit: t = 20,
    offset: e = 0,
    filters: n = {},
    sort: s = "latest"
  } = {}) {
    return "lastActivity" !== s ? this.findAndSortByLatest({
      limit: t,
      offset: e,
      filters: n
    }) : this.findAndSortByLastActivity({
      limit: t,
      offset: e,
      filters: n
    });
  }
}

schema.loadClass(PostClass);

const Post = mongoose.models.Post || mongoose.model("Post", schema);

module.exports = {
  Post: Post
};