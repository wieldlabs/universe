const app = require("express").Router(), formidable = require("formidable"), Sentry = require("@sentry/node"), Image = require("../models/Image")["Image"], Service = require("../services/OpenseaService")["Service"], OpenseaService = new Service({
  apiKey: process.env.OPENSEA_API_KEY,
  baseUrl: "https://api.opensea.io/api/v1"
});

app.post("/upload", async (e, s) => {
  try {
    var r, a, {
      fields: t,
      files: i
    } = await new Promise((a, t) => {
      formidable().parse(e, (e, s, r) => {
        if (e) return t(e);
        a({
          fields: s,
          files: r
        });
      });
    });
    return i?.files || t?.files ? (r = i?.files || t?.files, a = await Image.uploadImage({
      image: r
    }), s.json({
      code: "201",
      success: !0,
      message: "Successfully created image",
      image: a
    })) : s.json({
      code: "500",
      success: !1,
      message: "No files selected"
    });
  } catch (e) {
    return Sentry.captureException(e), console.error(e), s.json({
      code: "500",
      success: !1,
      message: e.message
    });
  }
}), app.get("/nfts-by-address", async (e, s) => {
  var {
    address: e,
    cursor: r = null,
    limit: a = 20
  } = e.query, e = {
    owner: e,
    limit: parseInt(a),
    cursor: r
  };
  try {
    var t = await OpenseaService.getAssetsByOwner(e);
    return s.json({
      assets: t?.assets || [],
      previous: t?.previous || null,
      next: t?.next || null
    });
  } catch (e) {
    return Sentry.captureException(e), console.error(e), s.status(500).json({
      error: e.message
    });
  }
}), app.post("/upload-and-verify-nft", async (e, s) => {
  var {
    address: e,
    tokenId: r,
    contractAddress: a
  } = e.body;
  if (!e || !r || !a) return s.json({
    code: "500",
    success: !1,
    message: "Invalid address or tokenId"
  });
  e = {
    owner: e,
    token_ids: r,
    asset_contract_address: a
  };
  try {
    var t, i = (await OpenseaService.getAssetsByOwner(e))?.assets?.[0];
    return i ? (t = await Image.create({
      src: i.image_url,
      isVerified: !0,
      verificationOrigin: "NFT",
      verificationExternalUrl: i.permalink,
      name: i.name,
      verificationTokenId: i.token_id,
      verificationContractAddress: i.asset_contract.address,
      verificationChainId: parseInt(process.env.CHAIN_ID || 1)
    }), s.json({
      code: "201",
      success: !0,
      message: "Successfully created image",
      image: t
    })) : s.json({
      code: "500",
      success: !1,
      message: "Invalid NFT"
    });
  } catch (e) {
    return Sentry.captureException(e), console.error(e), s.json({
      code: "500",
      success: !1,
      message: e.message
    });
  }
}), module.exports = {
  router: app
};