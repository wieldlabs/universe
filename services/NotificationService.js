const HTMLParser = require("node-html-parser"), mongoose = require("mongoose"), Expo = require("expo-server-sdk")["Expo"], Sentry = require("@sentry/node"), Notification = require("../models/Notification")["Notification"], Post = require("../models/Post")["Post"], Community = require("../models/Community")["Community"], AccountRelationship = require("../models/AccountRelationship")["AccountRelationship"], AccountAddress = require("../models/AccountAddress")["AccountAddress"], AccountThread = require("../models/AccountThread")["AccountThread"], Account = require("../models/Account")["Account"], expo = new Expo({
  accessToken: process.env.EXPO_ACCESS_TOKEN
});

class NotificationService {
  async reactForPostNotification(t, {
    post: o,
    accountReaction: e
  }, n) {
    if (o && o.account) {
      var c = await Community.findById(o?.community), i = c ? `https://beb.xyz/${c.bebdomain}?postId=` + o._id : "https://beb.xyz/?postId=" + o._id;
      if (e.reactions.likes) {
        if (o.account.toString() === n.account._id.toString()) return null;
        var a = await Notification.createForReceiver({
          initiatorId: n.account._id,
          receiverId: o.account,
          type: "POST_REACTION",
          title: `${n.account.username || "Anon"} upvoted your post`,
          contentRaw: o.richContent.content?.raw,
          contentHtml: o.richContent.content?.html,
          contentJson: o.richContent.content?.json,
          externalUrl: i,
          imageId: n.account.profileImage
        });
        if (!a) return null;
        await o.populate("account");
        for (const s of o.account.expoPushTokens || []) if (!Expo.isExpoPushToken(s) || s.includes("SIMULATOR")) console.log(`Push token ${s} is not a valid Expo push token`); else try {
          var r = await expo.sendPushNotificationsAsync([ {
            to: s,
            sound: "default",
            badge: 1,
            title: `${n.account.username || "Anon"} upvoted your post`,
            body: o.richContent.content?.raw || "",
            data: {
              type: "POST_REACTION",
              postId: o._id,
              notificationId: a._id,
              externalUrl: i
            }
          } ]);
          console.log("sendPushNotificationsAsync#tickets=" + JSON.stringify(r));
        } catch (t) {
          console.error(t), Sentry.captureException(t);
        }
        return a;
      }
    }
    return null;
  }
  async createReplyNotification(t, {
    post: o
  }, e) {
    var n = await Post.findById(o?.parent).select("account");
    if (!o || !n) return null;
    var c = await Community.findById(o?.community), i = c ? `https://beb.xyz/${c.bebdomain}?postId=` + o.parent : "https://beb.xyz/?postId=" + o.parent, a = await Notification.createForReceiver({
      initiatorId: e.account._id,
      receiverId: n.account,
      type: "POST_COMMENT",
      title: `🔥 ${e.account.username || "Anon"} commented on your post`,
      contentRaw: o.richContent.content?.raw,
      contentHtml: o.richContent.content?.html,
      contentJson: o.richContent.content?.json,
      externalUrl: i,
      imageId: e.account.profileImage
    });
    if (!a) return null;
    await n.populate("account");
    for (const s of n.account.expoPushTokens || []) if (!Expo.isExpoPushToken(s) || s.includes("SIMULATOR")) console.log(`Push token ${s} is not a valid Expo push token`); else try {
      var r = await expo.sendPushNotificationsAsync([ {
        to: s,
        sound: "default",
        badge: 1,
        title: `${e.account.username || "Anon"} commented on your post`,
        body: o.richContent.content?.raw || "",
        data: {
          type: "POST_COMMENT",
          postId: o._id,
          notificationId: a._id,
          externalUrl: i
        }
      } ]);
      console.log("sendPushNotificationsAsync#tickets=" + JSON.stringify(r));
    } catch (t) {
      console.error(t), Sentry.captureException(t);
    }
    return a;
  }
  async createConnectionRequestNotification(t, {
    relationship: o
  }, e) {
    var n = await AccountRelationship.getTwoWayRelationship({
      from: e.account._id,
      to: o.to
    });
    return await AccountAddress.findOne({
      account: e.account._id
    }) && n && n.iFollowThem ? await Notification.createForReceiver({
      initiatorId: e.account._id,
      receiverId: o.to,
      type: "CONNECTION_REQUEST",
      title: n.theyFollowMe ? `✌️ ${e.account.username || "Anon"} followed you back` : `✌️ ${e.account.username || "Anon"} followed you`,
      contentRaw: n.theyFollowMe ? "You are now connected. Send a GM!" : "Follow them back to connect.",
      imageId: e.account.profileImage
    }) : null;
  }
  async createMentionsNotification(t, {
    post: c
  }, i) {
    var o = c?.richContent?.content?.html;
    if (c && c.account && o) {
      var o = HTMLParser.parse(o).querySelectorAll('[data-type="mention"]'), e = await Community.findById(c?.community);
      const a = e ? `https://beb.xyz/${e.bebdomain}?postId=` + c._id : "https://beb.xyz/?postId=" + c._id;
      return await Promise.all(o.map(async t => {
        t = t.getAttribute("data-id"), t = await AccountAddress.findOne({
          address: t
        });
        if (!t) return null;
        var o = await Notification.createForReceiver({
          initiatorId: i.accountId || i.account._id,
          receiverId: t.account,
          type: "POST_MENTION",
          title: `${i.account.username || "Anon"} mentioned you`,
          contentRaw: c.richContent.content?.raw,
          contentHtml: c.richContent.content?.html,
          contentJson: c.richContent.content?.json,
          externalUrl: a,
          imageId: i.account.profileImage
        });
        if (!o) return null;
        await t.populate("account");
        for (const n of t.account.expoPushTokens || []) if (!Expo.isExpoPushToken(n) || n.includes("SIMULATOR")) console.log(`Push token ${n} is not a valid Expo push token`); else try {
          var e = await expo.sendPushNotificationsAsync([ {
            to: n,
            sound: "default",
            badge: 1,
            title: `${i.account.username || "Anon"} mentioned you`,
            body: c.richContent.content?.raw || "",
            data: {
              type: "POST_MENTION",
              postId: c._id,
              notificationId: o._id,
              externalUrl: a
            }
          } ]);
          console.log("sendPushNotificationsAsync#tickets=" + JSON.stringify(e));
        } catch (t) {
          console.error(t), Sentry.captureException(t);
        }
        return o;
      }));
    }
  }
  async createThreadMessageNotification(t, {
    threadMessage: o
  }, e) {
    if (!o || !o.thread) return null;
    var n = await AccountThread.getAccountThreadByThread({
      exceptSelfId: e.accountId,
      threadId: o.thread
    });
    for (const i of (await Account.find({
      _id: {
        $in: n.map(t => new mongoose.Types.ObjectId(t.account))
      },
      deleted: !1
    })).reduce((t, o) => t.concat(o.expoPushTokens || []), [])) if (!Expo.isExpoPushToken(i) || i.includes("SIMULATOR")) console.log(`Push token ${i} is not a valid Expo push token`); else try {
      var c = await expo.sendPushNotificationsAsync([ {
        to: i,
        sound: "default",
        badge: 1,
        title: `${e.account?.username || "Anon"} sent you a message`,
        body: o.richContent?.content?.raw || ""
      } ]);
      console.log("sendPushNotificationsAsync#tickets=" + JSON.stringify(c));
    } catch (t) {
      console.error(t), Sentry.captureException(t);
    }
  }
}

module.exports = {
  Service: NotificationService
};