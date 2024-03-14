const KeyValueCache = require("../../models/cache/KeyValueCache")["KeyValueCache"], NormalizeCacheService = require("./NormalizeCacheService")["Service"], {
  getMemcachedClient,
  getHash
} = require("../../connectmemcached");

class CacheService extends NormalizeCacheService {
  async setWithDupe({
    key: e,
    params: a,
    value: r,
    expiresAt: t
  }) {
    var i = getMemcachedClient();
    try {
      await i.delete(getHash(this.normalize({
        key: e,
        params: a
      })), {
        noreply: !0
      });
    } catch (e) {
      console.error(e);
    }
    i = this.normalize({
      key: e,
      params: a
    });
    return KeyValueCache.create({
      key: i,
      value: JSON.stringify({
        value: r
      }),
      expiresAt: t
    });
  }
  async set({
    key: e,
    params: a,
    value: r,
    expiresAt: t
  }) {
    var i = getMemcachedClient();
    try {
      await i.delete(getHash(this.normalize({
        key: e,
        params: a
      })), {
        noreply: !0
      });
    } catch (e) {
      console.error(e);
    }
    i = this.normalize({
      key: e,
      params: a
    });
    return KeyValueCache.updateOrCreate({
      key: i,
      value: JSON.stringify({
        value: r
      }),
      expiresAt: t
    });
  }
  async get({
    key: e,
    params: a
  }) {
    var r = getMemcachedClient();
    try {
      var t = await r.get(getHash(this.normalize({
        key: e,
        params: a
      })));
      if (t) return JSON.parse(t.value).value;
    } catch (e) {
      console.error(e);
    }
    t = this.normalize({
      key: e,
      params: a
    }), e = await KeyValueCache.findOne({
      key: t
    }), a = e?.expiresAt > new Date() || !e?.expiresAt;
    if (e && a) {
      try {
        var i = e.expiresAt ? {
          lifetime: Math.floor((e.expiresAt - new Date()) / 1e3)
        } : {};
        await r.set(getHash(t), e.value, i);
      } catch (e) {
        console.error(e);
      }
      return JSON.parse(e.value).value;
    }
    return null;
  }
  async _getAfterExpiredDate({
    key: e,
    params: a,
    afterDate: r
  }) {
    var t = getMemcachedClient();
    try {
      var i = await t.get(getHash(this.normalize({
        key: e,
        params: a
      })));
      if (i) return JSON.parse(i.value).value;
    } catch (e) {
      console.error(e);
    }
    t = this.normalize({
      key: e,
      params: a
    }), i = await KeyValueCache.findOne({
      key: t
    }), e = i?.expiresAt > r || !i?.expiresAt;
    return i && e ? JSON.parse(i.value).value : null;
  }
  async getOrCallbackAndSet(e, {
    key: a,
    params: r,
    expiresAt: t
  }) {
    try {
      var i = await this.get({
        key: a,
        params: r
      });
      if (i) return i;
    } catch (e) {
      console.log(e);
    }
    i = await e?.();
    return i && this.set({
      key: a,
      params: r,
      value: i,
      expiresAt: t
    }), i;
  }
  async find(a) {
    const {
      key: e,
      params: r,
      sort: t,
      limit: i,
      ...s
    } = a;
    a = this.normalize({
      key: e,
      params: r
    });
    try {
      let e = KeyValueCache.find({
        key: a,
        ...s
      });
      t && (e = e.sort(t));
      var l = await (e = i ? e.limit(i) : e);
      if (l) return l.map(e => JSON.parse(e.value).value);
    } catch (e) {
      console.error("Error finding record with key: " + a, e);
    }
    return null;
  }
}

module.exports = {
  Service: CacheService
};