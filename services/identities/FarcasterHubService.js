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
  async getFidByAccountId(e, r) {
    if (!e) return null;
    var t = await memcache.get(`FarcasterHubService:getFidByAccountId:${e}:` + r);
    if (t) return "" === t.value ? null : t.value;
    let c;
    var t = await Account.findById(e), a = this._getSigner(t, r);
    if (a) c = a.id; else {
      await t.populate("addresses");
      a = t.addresses[0].address;
      if (r) return a?.toLowerCase?.();
      c = await getFarcasterFidByCustodyAddress(a?.toLowerCase?.());
    }
    return await memcache.set(`FarcasterHubService:getFidByAccountId:${e}:` + r, c || "", {
      lifetime: 300
    }), c;
  }
  isExternalAccount(e) {
    return !e.recoverers?.find?.(e => "FARCASTER_SIGNER" === e.type);
  }
}

module.exports = {
  Service: FarcasterHubService
};