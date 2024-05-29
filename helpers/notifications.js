const Expo = require("expo-server-sdk")["Expo"], _CacheService = require("../services/cache/CacheService")["Service"], getFarcasterUserByFid = require("./farcaster")["getFarcasterUserByFid"], Sentry = require("@sentry/node"), expo = new Expo({
  accessToken: process.env.EXPO_ACCESS_TOKEN
}), memcache = require("../connectmemcache")["memcache"], CacheService = new _CacheService(), sendNotification = async ({
  fromFid: e,
  toFid: a,
  notificationType: c
}) => {
  try {
    let t = 1;
    var i = await memcache.get("getFarcasterUnseenNotificationsCount:" + a), r = (i ? t = i.value : await memcache.set("getFarcasterUnseenNotificationsCount:" + a, t), 
    await CacheService.get({
      key: "expoTokens:" + a
    }));
    if (r) {
      var o = e?.toString() || "", s = await getFarcasterUserByFid(e);
      let a;
      var n = "fid:" + o.slice(0, 6) + (6 < o.length ? "..." : ""), d = s.displayName ? `${s.displayName} (@${s.username || n})` : "@" + (s.username || n);
      switch (c) {
       case "link":
        a = d + " followed you";
        break;

       case "reply":
        a = d + " replied to your cast";
        break;

       case "reaction":
        a = d + " reacted to your cast";
        break;

       case "mention":
        a = d + " mentioned you in a cast";
      }
      a && expo.sendPushNotificationsAsync([ ...r.map(e => ({
        to: e,
        title: a,
        badge: t
      })) ]);
    }
  } catch (e) {
    Sentry.captureException(e);
  }
};

module.exports = {
  sendNotification: sendNotification
};