const {
  getFarcasterUserByFid,
  getFarcasterFidByCustodyAddress
} = require("../../helpers/farcaster");

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
  async getFidByAccount(e, r) {
    var t;
    return e ? (t = this._getSigner(e, r)) ? t.id : (await e.populate("addresses"), 
    t = e.addresses[0].address, r ? t?.toLowerCase?.() : await getFarcasterFidByCustodyAddress(t?.toLowerCase?.())) : null;
  }
  isExternalAccount(e) {
    return !e.recoverers?.find?.(e => "FARCASTER_SIGNER" === e.type);
  }
}

module.exports = {
  Service: FarcasterHubService
};