const mongoose = require("mongoose"), schema = require("../schemas/accountThread")["schema"];

class AccountThreadClass {
  static ping() {
    console.log("model: AccountThreadClass");
  }
  static _buildAccountThreadMatchQuery(e, {
    filters: t
  }) {
    let a = {
      account: new mongoose.Types.ObjectId(e)
    };
    return a = void 0 !== t.isAccepted ? {
      ...a,
      isAccepted: t.isAccepted
    } : a;
  }
  static async _existingAccountThread({
    accountId: e,
    threadId: t
  }) {
    return e && t ? this.findOne({
      account: e,
      thread: t
    }) : null;
  }
  static async findOrCreate({
    accountId: e,
    threadId: t,
    ...a
  }) {
    if (e && t) return await this._existingAccountThread({
      accountId: e,
      threadId: t
    }) || AccountThread.create({
      account: e,
      thread: t,
      ...a
    });
    throw new Error("Invalid account or thread");
  }
  static async acceptAccountThread({
    accountId: e,
    threadId: t
  }) {
    e = await this._existingAccountThread({
      accountId: e,
      threadId: t
    });
    if (e) return e.isAccepted = !0, e.save();
    throw new Error("Invalid AccountThread");
  }
  static async updateAccountThreadLastSeen({
    accountId: e,
    threadId: t
  }) {
    e = await this._existingAccountThread({
      accountId: e,
      threadId: t
    });
    if (e) return e.userLastSeen = new Date(), e.save();
    throw new Error("Invalid AccountThread");
  }
  static async getAccountThreadByThread({
    exceptSelfId: e,
    threadId: t
  }) {
    e = e ? {
      thread: t,
      account: {
        $ne: e
      }
    } : {
      thread: t
    };
    return await AccountThread.find(e);
  }
  static async findAndSortByLatestThreadMessage(e, {
    limit: t = 20,
    offset: a = 0,
    filters: c = {}
  } = {}) {
    e = this._buildAccountThreadMatchQuery(e, {
      filters: c
    });
    return await AccountThread.aggregate([ {
      $match: e
    }, {
      $lookup: {
        from: "threadmessages",
        let: {
          thread: "$thread"
        },
        pipeline: [ {
          $match: {
            $expr: {
              $eq: [ "$thread", "$$thread" ]
            }
          }
        }, {
          $sort: {
            createdAt: -1,
            _id: 1
          }
        }, {
          $limit: 1
        } ],
        as: "threadMessages"
      }
    }, {
      $addFields: {
        latestMessage: {
          $arrayElemAt: [ "$threadMessages", 0 ]
        }
      }
    }, {
      $sort: {
        "latestMessage.createdAt": -1,
        _id: 1
      }
    }, {
      $skip: parseInt(a, 10)
    }, {
      $limit: parseInt(t, 10)
    } ]);
  }
}

schema.loadClass(AccountThreadClass);

const AccountThread = mongoose.models.AccountThread || mongoose.model("AccountThread", schema);

module.exports = {
  AccountThread: AccountThread
};