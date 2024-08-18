const Expo = require("expo-server-sdk")["Expo"], _CacheService = require("../services/cache/CacheService")["Service"], {
  getFarcasterUserByFid,
  getFarcasterCastByHash
} = require("./farcaster"), Sentry = require("@sentry/node"), expo = new Expo({
  accessToken: process.env.EXPO_ACCESS_TOKEN
}), memcache = require("../connectmemcache")["memcache"], CacheService = new _CacheService(), sendNotification = async ({
  fromFid: e,
  toFid: t,
  notificationType: c,
  castHash: i
}) => {
  try {
    let a = 1;
    var r = await memcache.get("getFarcasterUnseenNotificationsCount:" + t), s = (r ? a = r.value : await memcache.set("getFarcasterUnseenNotificationsCount:" + t, a), 
    await CacheService.get({
      key: "expoTokens:" + t
    }));
    if (s) {
      var o = (e?.toString() || "").trim(), n = await getFarcasterUserByFid(e);
      if (n) {
        var m = "fid:" + o.slice(0, 6) + (6 < o.length ? "..." : ""), y = n.displayName ? `${n.displayName?.trim()} (@${n.username?.trim() || m})` : "@" + (n.username?.trim() || m);
        let e;
        i && (e = await getFarcasterCastByHash(i));
        let t;
        switch (c) {
         case "link":
          t = y + " followed you";
          break;

         case "reply":
          t = y + " replied to your cast";
          break;

         case "like":
          t = y + " liked your cast";
          break;

         case "recast":
          t = y + " recasted your cast";
          break;

         case "mention":
          t = y + " mentioned you in a cast";
        }
        if (t) {
          const d = {
            title: t,
            badge: a
          };
          e && "string" == typeof e.text && (d.body = e.text.slice(0, 100) + (100 < e.text.length ? "..." : "")), 
          expo.sendPushNotificationsAsync([ ...s.map(e => ({
            ...d,
            to: e
          })) ]);
        }
      }
    }
  } catch (e) {
    Sentry.captureException(e);
  }
};

module.exports = {
  sendNotification: sendNotification
};