const Expo = require("expo-server-sdk")["Expo"], _CacheService = require("../services/cache/CacheService")["Service"], getFarcasterUserByFid = require("./farcaster")["getFarcasterUserByFid"], Sentry = require("@sentry/node"), expo = new Expo({
  accessToken: process.env.EXPO_ACCESS_TOKEN
}), memcache = require("../connectmemcache")["memcache"], CacheService = new _CacheService(), sendNotification = async ({
  fromFid: e,
  toFid: a,
  notificationType: i
}) => {
  try {
    let t = 1;
    var r = await memcache.get("getFarcasterUnseenNotificationsCount:" + a), c = (r ? t = r.value : await memcache.set("getFarcasterUnseenNotificationsCount:" + a, t), 
    await CacheService.get({
      key: "expoTokens:" + a
    }));
    if (c) {
      var s = (e?.toString() || "").trim(), o = await getFarcasterUserByFid(e);
      if (o) {
        let a;
        var n = "fid:" + s.slice(0, 6) + (6 < s.length ? "..." : ""), m = o.displayName ? `${o.displayName?.trim()} (@${o.username?.trim() || n})` : "@" + (o.username?.trim() || n);
        switch (i) {
         case "link":
          a = m + " followed you";
          break;

         case "reply":
          a = m + " replied to your cast";
          break;

         case "like":
          a = m + " liked your cast";
          break;

         case "recast":
          a = m + " recasted your cast";
          break;

         case "mention":
          a = m + " mentioned you in a cast";
        }
        a && expo.sendPushNotificationsAsync([ ...c.map(e => ({
          to: e,
          title: a,
          badge: t
        })) ]);
      }
    }
  } catch (e) {
    Sentry.captureException(e);
  }
};

module.exports = {
  sendNotification: sendNotification
};