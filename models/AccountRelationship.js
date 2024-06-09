const mongoose = require("mongoose"), schema = require("../schemas/accountRelationship")["schema"];

class AccountRelationshipClass {
  static ping() {
    console.log("model: AccountRelationshipClass");
  }
  static async _existingAccountRelationship({
    from: o,
    to: t
  }) {
    return this.findOne({
      from: o,
      to: t
    });
  }
  static async toggleFollow({
    from: o,
    to: t
  }) {
    var i = await this._existingAccountRelationship({
      from: o,
      to: t
    });
    return i ? (i.isFollowing = !i.isFollowing, await i.save(), i) : await this.create({
      from: o,
      to: t,
      isFollowing: !0
    });
  }
  static async toggleBlock({
    from: o,
    to: t
  }) {
    var i = await this._existingAccountRelationship({
      from: o,
      to: t
    });
    return i ? (i.isBlocking = !i.isBlocking, await i.save(), i) : await this.create({
      from: o,
      to: t,
      isBlocking: !0
    });
  }
  static async getTwoWayRelationship({
    from: o,
    to: t
  }) {
    var i = await this.findOne({
      from: o,
      to: t
    }), e = await this.findOne({
      from: t,
      to: o
    });
    return {
      from: o,
      to: t,
      iFollowThem: !!i?.isFollowing,
      theyFollowMe: !!e?.isFollowing
    };
  }
  static async getConnectedAccountRelationships({
    limit: o,
    offset: t,
    filters: i
  }) {
    if (i.from) return await AccountRelationship.aggregate([ {
      $match: {
        to: new mongoose.Types.ObjectId(i.from),
        isFollowing: !0
      }
    }, {
      $lookup: {
        from: "accountrelationships",
        let: {
          from: "$from"
        },
        pipeline: [ {
          $match: {
            $expr: {
              $and: [ {
                $eq: [ "$to", "$$from" ]
              }, {
                $eq: [ "$from", new mongoose.Types.ObjectId(i.from) ]
              } ]
            }
          }
        }, {
          $limit: 1
        } ],
        as: "connections"
      }
    }, {
      $addFields: {
        connection: {
          $arrayElemAt: [ "$connections", 0 ]
        }
      }
    }, {
      $match: {
        "connection.isFollowing": !0
      }
    }, {
      $sort: {
        updatedAt: -1,
        _id: 1
      }
    }, {
      $skip: parseInt(t, 10)
    }, {
      $limit: parseInt(o, 10)
    } ]);
    throw new Error("Cannot have excludeNotConnected filter without a from filter");
  }
  static async getAccountRelationships({
    limit: o = 20,
    offset: t = 0,
    filters: i
  }) {
    let e = {};
    return i.from && (e = {
      ...e,
      from: new mongoose.Types.ObjectId(i.from)
    }), i.to && (e = {
      ...e,
      to: new mongoose.Types.ObjectId(i.to)
    }), void 0 !== i.isFollowing && (e = {
      ...e,
      isFollowing: i.isFollowing
    }), i.excludeNotConnected ? this.getConnectedAccountRelationships({
      limit: o,
      offset: t,
      filters: i
    }) : await AccountRelationship.aggregate([ {
      $match: e
    }, {
      $sort: {
        updatedAt: -1,
        _id: 1
      }
    }, {
      $skip: parseInt(t, 10)
    }, {
      $limit: parseInt(o, 10)
    } ]);
  }
}

schema.loadClass(AccountRelationshipClass);

const AccountRelationship = mongoose.models.AccountRelationship || mongoose.model("AccountRelationship", schema);

module.exports = {
  AccountRelationship: AccountRelationship
};