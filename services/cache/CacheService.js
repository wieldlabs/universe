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
    var i = getMemcachedClient(), e = this.normalize({
      key: e,
      params: a
    });
    try {
      await i.delete(getHash(e), {
        noreply: !0
      });
    } catch (e) {
      console.error(e);
    }
    a = await KeyValueCache.create({
      key: e,
      value: JSON.stringify({
        value: r
      }),
      expiresAt: t
    });
    try {
      await i.set(getHash(e), a.value, t ? {
        lifetime: Math.floor((t - new Date()) / 1e3)
      } : {});
    } catch (e) {
      console.error(e);
    }
    return a;
  }
  async set({
    key: e,
    params: a,
    value: r,
    expiresAt: t
  }) {
    var i = getMemcachedClient(), e = this.normalize({
      key: e,
      params: a
    });
    try {
      await i.delete(getHash(e), {
        noreply: !0
      });
    } catch (e) {
      console.error(e);
    }
    a = await KeyValueCache.updateOrCreate({
      key: e,
      value: JSON.stringify({
        value: r
      }),
      expiresAt: t
    });
    try {
      await i.set(getHash(e), a.value, t ? {
        lifetime: Math.floor((t - new Date()) / 1e3)
      } : {});
    } catch (e) {
      console.error(e);
    }
    return a;
  }
  async get({
    key: e,
    params: a
  }) {
    e = this.normalize({
      key: e,
      params: a
    }), a = getMemcachedClient();
    try {
      var r = await a.get(getHash(e));
      if (r) return JSON.parse(r.value).value;
    } catch (e) {
      console.error(e);
    }
    var r = await KeyValueCache.findOne({
      key: e
    }), t = r?.expiresAt > new Date() || !r?.expiresAt;
    if (r && t) {
      try {
        var i = r.expiresAt ? {
          lifetime: Math.floor((r.expiresAt - new Date()) / 1e3)
        } : {};
        await a.set(getHash(e), r.value, i);
      } catch (e) {
        console.error(e);
      }
      return JSON.parse(r.value).value;
    }
    return null;
  }
  async _getAfterExpiredDate({
    key: e,
    params: a,
    afterDate: r
  }) {
    e = this.normalize({
      key: e,
      params: a
    }), a = getMemcachedClient();
    try {
      var t = await a.get(getHash(e));
      if (t) return JSON.parse(t.value).value;
    } catch (e) {
      console.error(e);
    }
    t = await KeyValueCache.findOne({
      key: e
    }), r = t?.expiresAt > r || !t?.expiresAt;
    if (t && r) {
      try {
        await a.set(getHash(e), t.value, t.expiresAt ? {
          lifetime: Math.floor((t.expiresAt - new Date()) / 1e3)
        } : {});
      } catch (e) {
        console.error(e);
      }
      return JSON.parse(t.value).value;
    }
    return null;
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
      console.error(e);
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
    var r = getMemcachedClient();
    const {
      key: e,
      params: t,
      sort: i,
      limit: s,
      ...c
    } = a;
    var l = this.normalize({
      key: e,
      params: t
    });
    try {
      try {
        var n = await r.get(getHash(JSON.stringify(a)));
        if (n) return JSON.parse(n.value);
      } catch (e) {
        console.error(e);
      }
      let e = KeyValueCache.find({
        key: l,
        ...c
      });
      i && (e = e.sort(i));
      var o = await (e = s ? e.limit(s) : e);
      if (o) {
        var h = o.map(e => JSON.parse(e.value).value);
        try {
          await r.set(getHash(JSON.stringify(a)), JSON.stringify(h), {
            lifetime: 300
          });
        } catch (e) {
          console.error(e);
        }
        return h;
      }
    } catch (e) {
      console.error("Error finding record with key: " + l, e);
    }
    return null;
  }
}

module.exports = {
  Service: CacheService
};