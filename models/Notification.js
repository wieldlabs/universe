const mongoose = require("mongoose"), schema = require("../schemas/notification")["schema"], ContentService = require("../services/ContentService")["Service"];

class NotificationClass {
  static ping() {
    console.log("model: NotificationClass");
  }
  static async updateUnseenNotifications(t) {
    return (await this.updateMany({
      lastSeen: null,
      account: t
    }, {
      lastSeen: new Date()
    })).modifiedCount;
  }
  static async updateLastSeen(t) {
    t = await this.findById(t);
    return t ? (t.lastSeen = new Date(), t.save) : null;
  }
  static async createForReceiver({
    initiatorId: t,
    receiverId: e,
    type: n,
    contentRaw: i,
    contentJson: o,
    contentHtml: a,
    externalUrl: c,
    imageId: s,
    title: r
  }) {
    i = new ContentService().makeContent({
      contentRaw: i,
      contentJson: o,
      contentHtml: a
    });
    return await this.findOne({
      type: n,
      title: r,
      "content.raw": i.raw,
      "content.json": i.json,
      "content.html": i.html,
      initiator: t,
      receiver: e,
      externalUrl: c,
      image: s
    }, {
      "content.$": 1
    }) ? null : this.create({
      type: n,
      title: r,
      content: i,
      initiator: t,
      receiver: e,
      externalUrl: c,
      image: s
    });
  }
}

schema.loadClass(NotificationClass);

const Notification = mongoose.models.Notification || mongoose.model("Notification", schema);

module.exports = {
  Notification: Notification
};