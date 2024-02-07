const axios = require("axios").default, {
  getFarcasterUserByUsername,
  getFarcasterUserByConnectedAddress,
  getFidByCustodyAddress,
  getFarcasterUserByFid,
  getConnectedAddressForFid
} = require("../../helpers/farcaster");

class FarcasterServiceV2 {
  _cleanProfile(e = {}) {
    return {
      _id: e.fid,
      fid: e.fid,
      username: e.username,
      displayName: e.displayName,
      farcasterAddress: e.custodyAddress,
      followers: e.followerCount,
      following: e.followingCount,
      registeredAt: e.registeredAt,
      bio: e.bio?.text,
      external: e.external
    };
  }
  async getProfilesByAddress(e) {
    const r = e?.toLowerCase();
    var s, a, t;
    return r ? (e = e => ({
      ...this._cleanProfile(e),
      address: r
    }), s = [], (a = await getFarcasterUserByConnectedAddress(r)) && s.push(e(a)), 
    (a = await getFarcasterUserByFid(r)) && s.push(e(a)), (t = await getFidByCustodyAddress(r)) && (a = await getFarcasterUserByFid(t)) && s.push(e(a)), 
    s) : [];
  }
  async getProfileByUsername(e) {
    var r;
    return (e = e && await getFarcasterUserByUsername(e)) ? (r = await getConnectedAddressForFid(e.fid), 
    {
      ...this._cleanProfile(e),
      address: r
    }) : null;
  }
}

module.exports = {
  Service: FarcasterServiceV2
};