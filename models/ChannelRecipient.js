const mongoose = require("mongoose"), schema = require("../schemas/channelRecipient")["schema"];

class ChannelRecipientClass {
  static ping() {
    console.log("model: ChannelRecipientClass");
  }
  static _buildMatchQuery({
    filters: e
  }) {
    let i = {};
    return e.recipientIds && e.recipientIds.length && (i = {
      ...i,
      recipientId: {
        $in: e.recipientIds.map(e => mongoose.Types.ObjectId(e))
      }
    }), e.recipientType && (i = {
      ...i,
      recipientType: e.recipientType
    }), i = e.communityId ? {
      ...i,
      community: mongoose.Types.ObjectId(e.communityId)
    } : i;
  }
  static async findAndSort({
    limit: e = 20,
    offset: i = 0,
    filters: n = {},
    sort: t = "createdAt"
  } = {}) {
    n = this._buildMatchQuery({
      filters: n
    }), t = "-" === t[0] ? {
      [t.slice(1)]: -1,
      _id: 1
    } : {
      [t]: 1,
      _id: 1
    };
    return await this.aggregate([ {
      $match: n
    }, {
      $sort: t
    }, {
      $skip: parseInt(i, 10)
    }, {
      $limit: parseInt(e, 10)
    } ]);
  }
}

schema.loadClass(ChannelRecipientClass);

const ChannelRecipient = mongoose.models.ChannelRecipient || mongoose.model("ChannelRecipient", schema);

module.exports = {
  ChannelRecipient: ChannelRecipient
};