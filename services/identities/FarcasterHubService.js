const {
  getFarcasterUserByFid,
  getFarcasterFidByCustodyAddress
} = require("../../helpers/farcaster"), Account = require("../../models/Account")["Account"], memcache = require("../../connectmemcache")["memcache"];

class FarcasterHubService {
  _getSigner(e, r) {
    let t;
    return (t = !0 === r ? e.recoverers?.find?.(e => "FARCASTER_SIGNER_EXTERNAL" === e.type) : !1 === r ? e.recoverers?.find?.(e => "FARCASTER_SIGNER" === e.type) : (t = e.recoverers?.find?.(e => "FARCASTER_SIGNER" === e.type)) || e.recoverers?.find?.(e => "FARCASTER_SIGNER_EXTERNAL" === e.type)) || null;
  }
  async getProfileFid(e) {
    return await getFarcasterUserByFid(e);
  }
  async getProfileByAccount(e, r) {
    return (e = e && this._getSigner(e, r)) ? await getFarcasterUserByFid(e.id) : null;
  }
  async getFidByAccountId(e, r, t = !1) {
    if (!e) return null;
    var c = await memcache.get(`FarcasterHubService:getFidByAccountId:${e}:${r}:` + t);
    if (c) return "" === c.value ? null : c.value;
    let a;
    c = await Account.findById(e);
    let s;
    if (s = t ? s : this._getSigner(c, r)) a = s.id; else {
      await c.populate("addresses");
      c = c.addresses[0].address;
      if (r || t) return c?.toLowerCase?.();
      a = await getFarcasterFidByCustodyAddress(c?.toLowerCase?.());
    }
    return await memcache.set(`FarcasterHubService:getFidByAccountId:${e}:${r}:` + t, a || "", {
      lifetime: 300
    }), a;
  }
  isExternalAccount(e) {
    return !e.recoverers?.find?.(e => "FARCASTER_SIGNER" === e.type);
  }
}

module.exports = {
  Service: FarcasterHubService
};