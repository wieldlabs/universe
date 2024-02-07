const mongoose = require("mongoose"), pick = require("lodash/pick"), schema = require("../schemas/channel")["schema"], ContentService = require("../services/ContentService")["Service"];

class ChannelClass {
  static ping() {
    console.log("model: ChannelClass");
  }
  static async _generateUniqueSlug({
    name: e,
    index: t = 0
  }) {
    if (10 < t) throw new Error("Cannot generate unique slug");
    var n = Math.floor(1e3 + 9e3 * Math.random()), n = e.toLowerCase().replace(/\s/g, "-") + "-" + n;
    return await this.exists({
      slug: n
    }) ? this._generateUniqueSlug({
      name: e,
      index: t + 1
    }) : n;
  }
  static _buildMatchQuery({
    filters: e
  }) {
    let t = {};
    return e.communityId && (t = {
      ...t,
      community: mongoose.Types.ObjectId(e.communityId)
    }), t = e.onlyPublic ? {
      ...t,
      $or: [ {
        recipients: {
          $exists: !1
        }
      }, {
        recipients: {
          $size: 0
        }
      } ]
    } : t;
  }
  static _lookupByRecipientIds({
    filters: e
  }) {
    var t = [];
    return e.recipientIds && e.recipientIds.length && (t.push({
      $lookup: {
        from: "channelrecipients",
        localField: "recipients",
        foreignField: "_id",
        as: "recipients"
      }
    }), t.push({
      $match: {
        recipients: {
          $elemMatch: {
            recipientId: {
              $in: e.recipientIds.map(e => mongoose.Types.ObjectId(e))
            }
          }
        }
      }
    })), t;
  }
  static async findAndSort({
    filters: e,
    sort: t = "-createdAt",
    offset: n = 0,
    limit: i = 10
  }) {
    var s = this._buildMatchQuery({
      filters: e
    }), t = "-" === t[0] ? {
      [t.slice(1)]: -1,
      _id: 1
    } : {
      [t]: 1,
      _id: 1
    }, s = [ {
      $match: s
    } ], e = (e.recipientIds && s.push(...this._lookupByRecipientIds({
      filters: e
    })), await this.aggregate([ ...s, {
      $sort: t
    }, {
      $skip: parseInt(n, 10)
    }, {
      $limit: parseInt(i, 10)
    } ]));
    return e;
  }
  static async updateLastPost({
    channelId: e,
    postId: t
  }) {
    e = await this.findById(e);
    if (e) return e.lastPost = t, e.lastPostCreatedAt = new Date(), await e.save(), 
    e;
    throw new Error("Channel not found");
  }
  async edit(e) {
    var t = pick(e, [ "name", "description", "position" ]);
    return void 0 !== t.name && e.name.length < 64 && (this.name = t.name, this.slug = await this.constructor._generateUniqueSlug({
      name: t.name
    })), void 0 !== t.position && (this.position = t.position), void 0 !== t.description && (this.description = new ContentService().makeContent({
      contentRaw: e.description?.raw,
      contentJson: e.description?.json,
      contentHtml: e.description?.html
    })), this.save();
  }
  static async create({
    communityId: e,
    name: t,
    description: n,
    createdBy: i
  }) {
    var s;
    if (e) return s = await this._generateUniqueSlug({
      name: t
    }), new Channel({
      community: e,
      name: t,
      slug: s,
      createdBy: i,
      description: new ContentService().makeContent({
        contentRaw: n?.raw,
        contentJson: n?.json,
        contentHtml: n?.html
      })
    }).save();
    throw new Error("Invalid community");
  }
  async delete() {
    return this.isHidden = !0, await this.save(), this._id;
  }
}

schema.loadClass(ChannelClass);

const Channel = mongoose.models.Channel || mongoose.model("Channel", schema);

module.exports = {
  Channel: Channel
};