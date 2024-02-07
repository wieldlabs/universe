class NormalizeCacheService {
  _beforeNormalize({
    key: e,
    params: r
  }) {
    if (!e) throw new Error("Invalid key");
    let a, i;
    if ("ExploreFeedCommunities" === e) {
      if (!r.accountId) throw new Error("Missing required param accountId");
      a = "ExploreFeedCommunities:Account:" + r.accountId;
    } else i = r, a = e;
    return {
      key: a,
      params: i
    };
  }
  normalize({
    key: e,
    params: r
  }) {
    var {
      key: e,
      params: r
    } = this._beforeNormalize({
      key: e,
      params: r
    });
    return "" + e + (r ? ":" + JSON.stringify(r) : "");
  }
}

module.exports = {
  Service: NormalizeCacheService
};