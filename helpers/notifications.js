const Expo = require("expo-server-sdk")["Expo"], _CacheService = require("../services/cache/CacheService")["Service"], getFarcasterUserByFid = require("./farcaster")["getFarcasterUserByFid"], Sentry = require("@sentry/node"), expo = new Expo({
  accessToken: process.env.EXPO_ACCESS_TOKEN
}), CacheService = new _CacheService(), sendNotification = async ({
  fromFid: e,
  toFid: a,
  notificationType: r
}) => {
  try {
    var i = await CacheService.get({
      key: "expoTokens:" + a
    });
    if (i) {
      var t = e?.toString() || "", c = await getFarcasterUserByFid(e);
      let a;
      var o = "fid:" + t.slice(0, 6) + (6 < t.length ? "..." : ""), s = c.displayName ? `${c.displayName} (@${c.username || o})` : "@" + (c.username || o);
      switch (r) {
       case "link":
        a = s + " followed you";
        break;

       case "reply":
        a = s + " replied to your cast";
        break;

       case "reaction":
        a = s + " reacted to your cast";
        break;

       case "mention":
        a = s + " mentioned you in a cast";
      }
      a && await expo.sendPushNotificationsAsync([ ...i.map(e => ({
        to: e,
        title: a
      })) ]);
    }
  } catch (e) {
    Sentry.captureException(e);
  }
};

module.exports = {
  sendNotification: sendNotification
};