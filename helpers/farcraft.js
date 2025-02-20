const Sentry = require("@sentry/node"), {
  Element,
  Combination
} = require("../models/game/farcraft"), {
  memcache,
  getHash
} = require("../connectmemcache"), {
  Alchemy,
  Network
} = require("alchemy-sdk"), getConnectedAddressesForFid = require("./farcaster")["getConnectedAddressesForFid"], FARCRAFT_COLLECTION_ADDRESS = "0x69036eea7b9fff9f77279b80f37bfb959b129e56", getScoreForFid = async t => {
  var r = getHash("getFarcraftScoreForFid:" + t);
  try {
    var o = await memcache.get(r);
    if (o) return o.value;
    var [ a, n, c ] = await Promise.all([ Element.aggregate([ {
      $match: {
        discoveredBy: t.toString()
      }
    }, {
      $group: {
        _id: null,
        totalDepthScore: {
          $sum: {
            $add: [ "$depth", 1 ]
          }
        }
      }
    } ]), Combination.countDocuments({
      discoveredBy: t.toString()
    }), getOwnedNFTCountByFID(t) ]);
    let e = 2 * n;
    return 0 < a.length && (e += a[0].totalDepthScore), 0 < e && (e *= (c || 0) + 1), 
    await memcache.set(r, e, {
      lifetime: 300
    }), e;
  } catch (e) {
    throw console.error("Error in getScoreForFid:", e), Sentry.captureException(e), 
    e;
  }
}, getOwnedNFTCountByFID = async e => {
  var t = getHash("getOwnedNFTCountByFID:" + e), r = await memcache.get(t);
  if (r) return r.value;
  let o = 0;
  for (const n of (await getConnectedAddressesForFid(e))?.ethereum || []) {
    var a = await getOwnedNftCountByAddress(n);
    o += a;
  }
  return await memcache.set(t, o, {
    lifetime: 900
  }), o;
}, clearCacheGetOwnedNFTCountByFID = async e => {
  e = getHash("getOwnedNFTCountByFID:" + e);
  await memcache.delete(e);
}, getOwnedNftCountByAddress = async e => {
  var t = {
    apiKey: process.env.BASE_NODE_URL,
    network: Network.BASE_MAINNET
  }, t = new Alchemy(t);
  try {
    var r = await t.nft.getNftsForOwner(e, {
      contractAddresses: [ FARCRAFT_COLLECTION_ADDRESS ],
      omitMetadata: !0
    }), o = r.totalCount ?? r.ownedNfts.length;
    return console.log(`Wallet ${e} owns ${o} NFTs from the collection ${FARCRAFT_COLLECTION_ADDRESS}.`), 
    o;
  } catch (e) {
    return console.error("Error fetching NFTs for owner:", e), 0;
  }
};

module.exports = {
  getScoreForFid: getScoreForFid,
  getOwnedNFTCountByFID: getOwnedNFTCountByFID,
  clearCacheGetOwnedNFTCountByFID: clearCacheGetOwnedNFTCountByFID
};