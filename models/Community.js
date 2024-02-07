const mongoose = require("mongoose"), pick = require("lodash/pick"), schema = require("../schemas/community")["schema"], ContentService = require("../services/ContentService")["Service"];

class CommunityClass {
  static ping() {
    console.log("model: CommunityClass");
  }
  static _buildMatchQuery(e = {}) {
    let t = {};
    return t = e.domains ? {
      ...t,
      bebdomain: {
        $in: e.domains
      }
    } : t;
  }
  static async findAndSort({
    sort: e,
    ...t
  }) {
    return "trendy" === e ? this.findAndSoryByTrendy(t) : this.findAndSoryByCreated(t);
  }
  static async findAndSoryByCreated({
    offset: e = 0,
    limit: t = 10,
    filters: n = {}
  }) {
    n = this._buildMatchQuery(n);
    return await this.aggregate([ {
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
  static async findAndSoryByTrendy({
    offset: e = 0,
    limit: t = 10
  }) {
    return await this.aggregate([ {
      $lookup: {
        from: "posts",
        let: {
          community: "$_id"
        },
        pipeline: [ {
          $match: {
            $expr: {
              $eq: [ "$community", "$$community" ]
            },
            createdAt: {
              $gte: new Date(new Date().getTime() - 6048e5)
            }
          }
        }, {
          $group: {
            _id: "$account"
          }
        } ],
        as: "trendyPosts"
      }
    }, {
      $addFields: {
        trendyPostCount: {
          $size: "$trendyPosts"
        }
      }
    }, {
      $sort: {
        trendyPostCount: -1,
        _id: 1
      }
    }, {
      $skip: parseInt(e, 10)
    }, {
      $limit: parseInt(t, 10)
    } ]);
  }
  async edit(e) {
    var t = pick(e, [ "name", "imageId", "bannerImageId", "bio", "socialLinks" ]);
    return void 0 !== t.name && e.name.length < 64 && (this.name = t.name), void 0 !== t.imageId && (this.image = t.imageId), 
    void 0 !== t.bannerImageId && (this.bannerImage = t.bannerImageId), void 0 !== t.bio && (this.bio = new ContentService().makeContent({
      contentRaw: e.bio?.raw,
      contentJson: e.bio?.json,
      contentHtml: e.bio?.html
    })), this.save();
  }
}

schema.loadClass(CommunityClass);

const Community = mongoose.models.Community || mongoose.model("Community", schema);

module.exports = {
  Community: Community
};