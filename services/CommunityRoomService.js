const CommunityRoom = require("../models/CommunityRoom")["CommunityRoom"], AccountAddress = require("../models/AccountAddress")["AccountAddress"];

class CommunityRoomService {
  async getPeers(e, {
    communityId: r
  }, o) {
    if (!r) throw new Error("CommunityRoomService#getPeers communityId is required");
    let m = await CommunityRoom.findOne({
      community: r
    }), t = (m = m || await CommunityRoom.create({
      community: r
    }), new Map()), s = new Set();
    return m.peers.forEach((e, r) => {
      e.expiresAt > Date.now() && e.username && e.peerId && !s.has(e.username) && (t.set(r, e), 
      s.add(e.username));
    }), m.peers = t, await m.save(), Array.from(m.peers.values());
  }
  async setPeer(e, {
    communityId: r,
    peerId: o,
    account: m
  }, t) {
    if (!r) throw new Error("CommunityRoomService#setPeer communityId is required");
    let s = await CommunityRoom.findOne({
      community: r
    }), n = (s = s || await CommunityRoom.create({
      community: r
    }), new Map()), i = m?.username;
    i || (r = await AccountAddress.findById(m?.addressId), i = r?.address || "ANON-" + m._id), 
    s.peers.forEach((e, r) => {
      e.expiresAt > Date.now() && e.username && e.peerId && n.set(r, e);
    }), s.peers = n;
    r = o;
    return s.peers.set(r, {
      peerId: r,
      expiresAt: new Date(Date.now() + 5e3),
      username: i
    }), await s.save(), Array.from(s.peers.values());
  }
}

module.exports = {
  Service: CommunityRoomService
};