const app = require("express").Router(), rateLimit = require("express-rate-limit"), {
  getScoreForFid,
  clearCacheGetOwnedNFTCountByFID
} = require("../helpers/farcraft"), FarcraftMetadata = require("../models/game/farcraft")["FarcraftMetadata"], lightLimiter = rateLimit({
  windowMs: 1e3,
  max: 1e3,
  message: "Too many requests, please try again later.",
  handler: (e, a, t) => {
    a.status(429).send("Too many requests, please try again later.");
  }
});

app.get("/score/:fid", lightLimiter, async (e, a) => {
  try {
    var t = parseInt(e.params.fid);
    if (isNaN(t)) return a.status(400).json({
      success: !1,
      message: "Invalid FID provided"
    });
    await clearCacheGetOwnedNFTCountByFID(t);
    var r = await getScoreForFid(t);
    return a.json({
      success: !0,
      data: {
        fid: t,
        score: r
      }
    });
  } catch (e) {
    return console.error("Error getting score for FID:", e), a.status(500).json({
      success: !1,
      message: "Failed to get score",
      error: e.message
    });
  }
}), app.get([ "/metadata", "/metadata/:tokenId" ], lightLimiter, async (e, a) => {
  var e = parseInt(e.params.tokenId);
  return isNaN(e) ? a.json({
    name: "FarCraft on FarAgent",
    description: "The first infinite AI game on Base. Play on Farcaster // https://far.quest. Cast @faragent combine fire + water to start playing!",
    image: "https://far.quest/farcraft/farcraft.gif",
    banner_image: "https://pinata.wieldcd.net/ipfs/bafybeid6q7v6q7cpkbqxlqvzjrosxbazfwmfdj56ib5ba2yp7z7vlnmcju?pinataGatewayToken=hcDt8y-InaDYkoLjrA1A6Q5Ys_B0TZnf4dgz8K8EphTZpYra9GagnNWYo9LVkinj",
    featured_image: "https://far.quest/farcraft/farcraft.gif",
    external_link: "https://farcraft.fun",
    collaborators: [ "0x7911B2C4fDdCFA3aeD4F1f17C8cDC232f798cdaE", "0x997b0CcEd542b6d2A7e0Bae5649aFd9d0861CB4e", "0x79f6d03d54dcff1081988f2f886bb235493742f1" ]
  }) : (e = await FarcraftMetadata.findOne({
    tokenId: parseInt(e)
  })) ? a.json({
    name: e.name,
    description: e.description,
    image: e.imageUrl,
    attributes: [ {
      trait_type: "Element 1",
      value: e.elements?.[0]
    }, {
      trait_type: "Element 2",
      value: e.elements?.[1]
    }, {
      trait_type: "Element 3",
      value: e.elements?.[2]
    }, {
      trait_type: "Element 4",
      value: e.elements?.[3]
    } ]
  }) : a.status(500).json({
    code: "500",
    success: !1,
    message: "Metadata not found!"
  });
}), module.exports = {
  router: app
};