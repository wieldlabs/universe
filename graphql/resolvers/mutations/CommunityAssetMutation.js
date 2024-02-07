const Sentry = require("@sentry/node"), getGraphQLRateLimiter = require("graphql-rate-limit")["getGraphQLRateLimiter"], _CommunityAssetMutationService = require("../../../services/mutationServices/CommunityAssetMutationService")["Service"], unauthorizedErrorOrAccount = require("../../../helpers/auth-middleware")["unauthorizedErrorOrAccount"], rateLimiter = getGraphQLRateLimiter({
  identifyContext: e => e.id
}), RATE_LIMIT_MAX = 1e4, resolvers = {
  Mutation: {
    editCommunityAsset: async (e, t, r, i) => {
      i = await rateLimiter({
        root: e,
        args: t,
        context: r,
        info: i
      }, {
        max: RATE_LIMIT_MAX,
        window: "10s"
      });
      if (i) throw new Error(i);
      i = await unauthorizedErrorOrAccount(e, t, r);
      if (!i.account) return i;
      try {
        var [ s, o ] = await new _CommunityAssetMutationService().editCommunityAssetOrError(e, {
          communityAssetId: t.communityAssetId,
          metadataId: t.metadataId,
          position: t.position,
          positions: t.positions,
          deleteAsset: t.deleteAsset
        }, r);
        return {
          communityAsset: s,
          communityAssetMetadata: o,
          code: "201",
          success: !0,
          message: "Successfully saved community asset"
        };
      } catch (e) {
        return Sentry.captureException(e), console.error(e), {
          code: "500",
          success: !1,
          message: e.message
        };
      }
    }
  }
};

module.exports = {
  resolvers: resolvers
};