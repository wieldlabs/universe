const Expo = require("expo-server-sdk")["Expo"], _CacheService = require("../services/cache/CacheService")["Service"], getFarcasterUserByFid = require("./farcaster")["getFarcasterUserByFid"], Sentry = require("@sentry/node"), expo = new Expo({
  accessToken: process.env.EXPO_ACCESS_TOKEN
}), getMemcachedClient = require("../connectmemcached")["getMemcachedClient"], CacheService = new _CacheService(), sendNotification = async ({
  fromFid: e,
  toFid: t,
  notificationType: r
}) => {
  try {
    var c = getMemcachedClient();
    let a = 1;
    try {
      var i = await c.get("getFarcasterUnseenNotificationsCount:" + t);
      i ? a = i.value : await c.set("getFarcasterUnseenNotificationsCount:" + t, a);
    } catch (e) {
      console.error(e);
    }
    var o = await CacheService.get({
      key: "expoTokens:" + t
    });
    if (o) {
      var n = e?.toString() || "", s = await getFarcasterUserByFid(e);
      let t;
      var d = "fid:" + n.slice(0, 6) + (6 < n.length ? "..." : ""), y = s.displayName ? `${s.displayName} (@${s.username || d})` : "@" + (s.username || d);
      switch (r) {
       case "link":
        t = y + " followed you";
        break;

       case "reply":
        t = y + " replied to your cast";
        break;

       case "reaction":
        t = y + " reacted to your cast";
        break;

       case "mention":
        t = y + " mentioned you in a cast";
      }
      t && expo.sendPushNotificationsAsync([ ...o.map(e => ({
        to: e,
        title: t,
        badge: a
      })) ]);
    }
  } catch (e) {
    Sentry.captureException(e);
  }
};

module.exports = {
  sendNotification: sendNotification
};