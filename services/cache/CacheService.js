const KeyValueCache = require("../../models/cache/KeyValueCache")["KeyValueCache"], NormalizeCacheService = require("./NormalizeCacheService")["Service"], {
  memcache,
  getHash
} = require("../../connectmemcache");

class CacheService extends NormalizeCacheService {
  async setWithDupe({
    key: e,
    params: a,
    value: t,
    expiresAt: r
  }) {
    e = this.normalize({
      key: e,
      params: a
    }), await memcache.delete(getHash(e), {
      noreply: !0
    }), a = await KeyValueCache.create({
      key: e,
      value: JSON.stringify({
        value: t
      }),
      expiresAt: r
    });
    return await Promise.all([ memcache.set(getHash(e), a.value, r ? {
      lifetime: Math.floor((r - new Date()) / 1e3)
    } : {}), memcache.delete(getHash(e) + "_null", {
      noreply: !0
    }) ]), a;
  }
  async set({
    key: e,
    params: a,
    value: t,
    expiresAt: r
  }) {
    e = this.normalize({
      key: e,
      params: a
    }), await memcache.delete(getHash(e), {
      noreply: !0
    }), a = await KeyValueCache.updateOrCreate({
      key: e,
      value: JSON.stringify({
        value: t
      }),
      expiresAt: r
    });
    return await Promise.all([ memcache.set(getHash(e), a.value, r ? {
      lifetime: Math.floor((r - new Date()) / 1e3)
    } : {}), memcache.delete(getHash(e) + "_null", {
      noreply: !0
    }) ]), a;
  }
  async get({
    key: e,
    params: a
  }) {
    e = this.normalize({
      key: e,
      params: a
    }), a = await memcache.get(getHash(e) + "_null");
    if (!a) {
      a = await memcache.get(getHash(e));
      if (a) return JSON.parse(a.value).value;
      var a = await KeyValueCache.findOne({
        key: e
      }), t = a?.expiresAt > new Date() || !a?.expiresAt;
      if (a && t) return t = a.expiresAt ? {
        lifetime: Math.floor((a.expiresAt - new Date()) / 1e3)
      } : {}, await memcache.set(getHash(e), a.value, t), JSON.parse(a.value).value;
      await memcache.set(getHash(e) + "_null", "1");
    }
    return null;
  }
  async _getAfterExpiredDate({
    key: e,
    params: a,
    afterDate: t
  }) {
    var e = this.normalize({
      key: e,
      params: a
    }), a = await memcache.get(getHash(e));
    return a ? JSON.parse(a.value).value : (t = (a = await KeyValueCache.findOne({
      key: e
    }))?.expiresAt > t || !a?.expiresAt, a && t ? (await memcache.set(getHash(e), a.value, a.expiresAt ? {
      lifetime: Math.floor((a.expiresAt - new Date()) / 1e3)
    } : {}), JSON.parse(a.value).value) : null);
  }
  async getOrCallbackAndSet(e, {
    key: a,
    params: t,
    expiresAt: r
  }) {
    try {
      var i = await this.get({
        key: a,
        params: t
      });
      if (i) return i;
    } catch (e) {
      console.error(e);
    }
    i = await e?.();
    return i && this.set({
      key: a,
      params: t,
      value: i,
      expiresAt: r
    }), i;
  }
  async find(a) {
    const {
      key: e,
      params: t,
      sort: r,
      limit: i,
      ...s
    } = a;
    var l = this.normalize({
      key: e,
      params: t
    });
    try {
      var c = await memcache.get(getHash(JSON.stringify(a)));
      if (c) return JSON.parse(c.value);
      let e = KeyValueCache.find({
        key: l,
        ...s
      });
      r && (e = e.sort(r));
      var m, h = await (e = i ? e.limit(i) : e);
      if (h) return m = h.map(e => JSON.parse(e.value).value), await memcache.set(getHash(JSON.stringify(a)), JSON.stringify(m), {
        lifetime: 300
      }), m;
    } catch (e) {
      console.error("Error finding record with key: " + l, e);
    }
    return null;
  }
}

module.exports = {
  Service: CacheService
};