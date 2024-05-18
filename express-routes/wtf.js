const app = require("express").Router(), Sentry = require("@sentry/node"), rateLimit = require("express-rate-limit"), ethers = require("ethers"), factoryContractAbi = require("../helpers/abi/public-mint-nft-capped-factory.json"), axios = require("axios"), frameContext = require("../helpers/farcaster-utils")["frameContext"], {
  getFarcasterUserAndLinksByFid,
  getFarcasterCastByShortHash,
  getFarcasterCastByHash
} = require("../helpers/farcaster"), config = require("../helpers/constants/config")["config"], Contract = require("../models/wallet/Contract")["Contract"], Token = require("../models/wallet/Token")["Token"], CacheService = require("../services/cache/CacheService")["Service"], cacheService = new CacheService(), generateImageWithText = require("../helpers/generate-image")["generateImageWithText"], crypto = require("crypto"), getMemcachedClient = require("../connectmemcached")["getMemcachedClient"], Reactions = require("../models/farcaster")["Reactions"], getImageUrlOrUploadImage = require("../helpers/fetch-and-upload-image")["getImageUrlOrUploadImage"], heavyLimiter = rateLimit({
  windowMs: 6e4,
  max: 50,
  message: "Too many requests! See docs.far.quest for more info.",
  validate: {
    limit: !1
  }
}), lightLimiter = rateLimit({
  windowMs: 6e4,
  max: 100,
  message: "Too many requests! See docs.far.quest for more info.",
  validate: {
    limit: !1
  }
}), ACTION_URL = "https://warpcast.com/~/add-cast-action?url=https%3A%2F%2Fbuild.far.quest%2Fwtf%2Fv1%2Fframes%2Fadd-action", MAX_MINT_COUNT = 500, MAX_SET_IMAGES = 5, TEST_HASH = "0x0000000000000000000000000000000000000000", CHANNEL_URL = "https://warpcast.com/~/channel/whoami", factoryContractAddress = "0x831f011B38Fd707229B2D1fCF3C8a1964200c9fe", factoryContractInterfaceType = "WTF1";

async function findCastImageFromHash(t) {
  return t ? (t = await getFarcasterCastByHash(t))?.embeds?.images?.[0]?.url || t?.embeds?.urls?.[0]?.openGraph?.image || t?.embeds?.urls?.[1]?.openGraph?.image || t?.embeds?.quoteCasts?.[0]?.embeds?.images?.[0]?.url || t?.embeds?.quoteCasts?.[0]?.embeds?.urls?.[0]?.openGraph?.image || t?.embeds?.quoteCasts?.[0]?.embeds?.urls?.[1]?.openGraph?.image || t?.embeds?.quoteCasts?.[1]?.embeds?.images?.[0]?.url || t?.embeds?.quoteCasts?.[1]?.embeds?.urls?.[0]?.openGraph?.image || t?.embeds?.quoteCasts?.[1]?.embeds?.urls?.[1]?.openGraph?.image : null;
}

async function createContract({
  name: e,
  symbol: a,
  totalCap: r,
  ownerAddress: o,
  baseUrl: n
}) {
  try {
    if (!(e && a && r && o)) throw new Error("Missing required fields!");
    var c = process.env.FARCAST_KEY || process.env.FARCAST_STAGING_KEY;
    if (!c) throw new Error("Not configured!");
    var s = ethers.Wallet.fromMnemonic(c), m = new ethers.providers.JsonRpcProvider("https://rpc.degen.tips", 666666666), p = s.connect(m), i = await new ethers.Contract(factoryContractAddress, factoryContractAbi.abi, p).deployCappedNFTContract(e, a, r, o, n), f = (console.log("Deploying mint contract"), 
    console.log(i), await i.wait());
    let t;
    var u = (f.events || []).find(t => "ContractDeployed" === t.event);
    return u ? (t = u.args[0], console.log("New contract deployed at address: " + t)) : console.log("No 'ContractDeployed' event found."), 
    console.log("Contract deployed at address: " + i.address), {
      contractAddress: t,
      txHash: i.hash
    };
  } catch (t) {
    throw Sentry.captureException(t), console.error("Error deploying contract: " + t), 
    t;
  }
}

async function createContractSetToken({
  tokenId: t,
  contract: a
}) {
  if (!a || !a.isSet) throw new Error("Contract not valid!");
  var r = a.address;
  if ("RANDOM" !== a?.setData?.type) return null;
  {
    var o = a.setData?.metadata?.filter(t => t.percentage && 0 < t.percentage);
    const n = o.reduce((t, e) => t + e.percentage, 0);
    let e = 0;
    o = o.map(t => (e += t.percentage / n * 1e4, {
      ...t,
      cumulativePercentage: e
    }));
    const c = crypto.randomInt(1, 10001);
    o = o.find(t => c <= t.cumulativePercentage);
    return o ? (a = {
      contractAddress: r,
      contract: a._id,
      tokenId: t,
      tokenType: "ERC721",
      metadata: {
        name: o.name,
        imageUrl: o.imageUrl,
        rawImageUrl: o.rawImageUrl,
        description: o.description
      }
    }, await Token.findOneAndUpdate({
      contractAddress: r,
      tokenId: t
    }, a, {
      upsert: !0,
      new: !0
    })) : null;
  }
}

async function uploadMetadata({
  contractAddress: t,
  metadataContent: e,
  tokenId: a
}) {
  e = {
    type: "json",
    content: e
  };
  try {
    return (await axios.post(`https://api.syndicate.io/token-metadata/update/69edacd2-a2c0-4b08-b163-8dc1af14a523/666666666/${t}/` + a, e, {
      headers: {
        Authorization: "Bearer " + process.env.SYNDICATE_API_KEY,
        "Content-Type": "application/json"
      }
    })).data;
  } catch (t) {
    throw new Error(t);
  }
}

async function handleCreateContractRequest(t) {
  var e = await Contract.createContract({
    name: t.body.name || "Contract-" + Math.random().toString(36).substring(2, 15),
    symbol: t.body.symbol || "FARQUEST",
    chainId: 666666666,
    address: "0x0",
    totalSupply: MAX_MINT_COUNT,
    contractDeployer: t.body.ownerAddress,
    tokenType: "ERC721",
    factoryInterfaceType: factoryContractInterfaceType
  }, !1), a = config().DEFAULT_URI + `/contracts/v1/metadata/${e.slug}/`, {
    contractAddress: a,
    txHash: r
  } = await createContract({
    ...t.body,
    baseUrl: a,
    totalCap: MAX_MINT_COUNT
  });
  return e.address = a, e.deployedTxHash = r, e.isVerified = !0, e.metadata = {
    name: t.body.name,
    imageUrl: t.body.image,
    rawImageUrl: t.body.rawImage,
    description: t.body.description,
    externalUrl: "https://cast.wtf",
    frame: {
      frameImageUrl: t.body.image,
      framePostUrl: config().DEFAULT_URI + `/wtf/v1/contracts/${e._id}/frames/post_url?step=mint` + (t.body.mustFollow ? "&mustFollow=" + t.body.mustFollow : "") + (t.body.mustLikeAndRecast ? "&mustLikeAndRecast=" + t.body.mustLikeAndRecast : ""),
      image: t.body.image,
      title: "Free Mint | " + t.body.name,
      description: "Free Mint | " + t.body.name,
      domain: "far.quest",
      frameButton1: {
        text: "Free Mint ✨ (No Gas, 500 total)",
        action: "post"
      }
    }
  }, t.body.isSet && (e.isSet = !0, e.setData = {
    ...t.body.setData,
    metadata: t.body.setData?.metadata?.map?.(t => ({
      imageUrl: t.imageUrl,
      rawImageUrl: t.rawImageUrl,
      name: t.name,
      description: t.description,
      percentage: t.percentage
    }))
  }), await e.save(), {
    code: "201",
    success: !0,
    message: "Successfully created contract and cached whitelisted address.",
    contractAddress: a,
    txHash: r,
    contract: e
  };
}

async function processCastOrImageUrl(e) {
  try {
    if (!e) return null;
    var a = e.trim(), r = getMemcachedClient();
    try {
      var o = await r.get("WTF:processCastOrImageUrl:" + a);
      if (o) return o.value;
    } catch (t) {}
    let t;
    return a.startsWith("https://client.warpcast.com/v2/cast-image") || a.startsWith("https://imagedelivery.net") ? a : (t = isWarpcastOrFarquestCastHash(a) ? await returnCastImageOrImage(a) : await getImageUrlOrUploadImage(a), 
    await r.set("WTF:processCastOrImageUrl:" + a, t, {
      lifetime: 86400
    }), t);
  } catch (t) {
    return Sentry.captureException(t), console.error(t), config().DEFAULT_URI + ("/contracts/v1/images?image=" + encodeURIComponent(e));
  }
}

async function mint({
  to: t,
  contractAddress: e
}) {
  try {
    var a, r, o = new ethers.providers.JsonRpcProvider("https://rpc.degen.tips", 666666666), n = process.env.FARCAST_KEY || process.env.FARCAST_STAGING_KEY;
    if (n) return a = ethers.Wallet.fromMnemonic(n).connect(o), r = await new ethers.Contract(factoryContractAddress, factoryContractAbi.abi, a).mintNftContract(e, t), 
    console.log(`Mint successful for address: ${t}, txHash: ` + r.hash), r;
    throw new Error("Not configured!");
  } catch (t) {
    throw console.error("Error in mintIfWhitelisted: " + t), t;
  }
}

app.post("/v1/frames/:factory/create/contract", heavyLimiter, async (t, e) => {
  try {
    var a = await handleCreateContractRequest(t);
    return e.json(a);
  } catch (t) {
    return Sentry.captureException(t), console.error(t), e.json({
      code: "500",
      success: !1,
      message: "Internal server error!"
    });
  }
}), app.post("/v1/frames/:factory/create/metadata", heavyLimiter, async (t, e) => {
  try {
    return await uploadMetadata({
      contractAddress: t.body.contractAddress,
      metadataContent: {
        image: t.body.image,
        name: t.body.name,
        description: t.body.description,
        external_url: "https://cast.wtf"
      },
      tokenId: 1
    }), e.json({
      code: "201",
      success: !0,
      message: "Successfully uploaded metadata and set metadata URI."
    });
  } catch (t) {
    return Sentry.captureException(t), console.error(t), e.json({
      code: "500",
      success: !1,
      message: "Internal server error!"
    });
  }
}), app.post("/v1/contracts/:contractId/frames/post_url", [ lightLimiter, frameContext ], async (r, t) => {
  var {
    step: e,
    mustFollow: o,
    mustLikeAndRecast: n
  } = r.query;
  let c, s, m;
  var p = r.context.connectedAddress, i = r.context.isExternal ? p : r.context.frameData.fid;
  if (!p) return t.status(401).json({
    success: !1,
    message: "Unauthorized"
  });
  let f;
  var u = getMemcachedClient(), a = "contract:" + r.params.contractId;
  try {
    var d = await u.get(a);
    d ? f = JSON.parse(d.value) : (f = await Contract.findById(r.params.contractId), 
    await u.set(a, JSON.stringify(f), {
      lifetime: 604800
    }));
  } catch (t) {
    f = await Contract.findById(r.params.contractId);
  }
  if (!f || !f.metadata?.frame) return t.status(404).json({
    success: !1,
    message: "No Contract Frame found"
  });
  switch (e) {
   case void 0:
    c = f.metadata.frame.frameImageUrl, s = config().DEFAULT_URI + `/wtf/v1/contracts/${f._id}/frames/post_url?step=mint`, 
    m = `
        <meta property="fc:frame:button:1:action" content="post" />
        <meta property="fc:frame:button:1" content="Mint" />
      `;
    break;

   case "mint":
    {
      if (!f.isVerified) throw new Error("Contract is not verified");
      var l = await cacheService.get({
        key: "Wtf:Frame:Minted",
        params: {
          connectedAddress: p,
          contractId: f._id
        }
      });
      if (l && "development" !== process.env.NODE_ENV) {
        c = "https://i.imgur.com/yByoglU.png", s = "";
        var y = "https://far.quest/contracts/degen/" + f.slug, y = `https://warpcast.com/~/compose?text=${encodeURIComponent("Mint " + f.metadata?.name + " for free ✨\n\n" + y)}&embeds[]=${y}&rand=` + Math.random().toString().slice(0, 7);
        m = `
          <meta property="fc:frame:button:1" content="View" />
          <meta property="fc:frame:button:1:action" content="link" />
          <meta property="fc:frame:button:1:target" content="https://explorer.degen.tips/tx/${l}" />

          <meta property="fc:frame:button:2" content="Share Mint" />
          <meta property="fc:frame:button:2:action" content="link" />
          <meta property="fc:frame:button:2:target" content="${y}" />
      
      
          <meta property="fc:frame:button:3" content="Install Action" />
          <meta property="fc:frame:button:3:action" content="link" />
          <meta property="fc:frame:button:3:target" content="${ACTION_URL}" />

          <meta property="fc:frame:button:4" content="Create with /whoami" />
          <meta property="fc:frame:button:4:action" content="link" />
          <meta property="fc:frame:button:4:target" content="${CHANNEL_URL}" />
        `;
        break;
      }
      var l = "Wtf:Frame:MintedOut:" + f._id;
      if ("1" === (await u.get(l))?.value) {
        c = "https://i.imgur.com/zSqLZoV.png", m = `
          <meta property="fc:frame:button:1" content="Install Action" />
          <meta property="fc:frame:button:1:action" content="link" />
          <meta property="fc:frame:button:1:target" content="${ACTION_URL}" />

          <meta property="fc:frame:button:2" content="Create with /whoami" />
          <meta property="fc:frame:button:2:action" content="link" />
          <meta property="fc:frame:button:2:target" content="${CHANNEL_URL}" />
        `;
        break;
      }
      let t = !0, e = {};
      o && o.toString() !== i.toString() && ([ y, l, g ] = await Promise.all([ getFarcasterUserAndLinksByFid({
        fid: o,
        context: {
          fid: i
        }
      }), getFarcasterUserAndLinksByFid({
        fid: "274",
        context: {
          fid: i
        }
      }), getFarcasterUserAndLinksByFid({
        fid: "251",
        context: {
          fid: i
        }
      }) ]), e = y, t = y.isFollowing && (l.isFollowing || "274" === i.toString()) && (g.isFollowing || "251" === i.toString()));
      y = r.query.count ? parseInt(r.query.count) : 0, l = 5 <= y;
      if (!t && !l) {
        c = "https://i.imgur.com/Bvfd03f.png", s = config().DEFAULT_URI + `/wtf/v1/contracts/${f._id}/frames/post_url?step=mint&count=${y + 1}&mustFollow=` + o + (n ? "&mustLikeAndRecast=" + n : ""), 
        m = `
          <meta property="fc:frame:button:1:action" content="link" />
          <meta property="fc:frame:button:1:target" content="https://warpcast.com/${e.username}" />
          <meta property="fc:frame:button:1" content="@${e.username}" />
              <meta property="fc:frame:button:2" content="@jc" />
          <meta property="fc:frame:button:2:action" content="link" />
          <meta property="fc:frame:button:2:target" content="https://warpcast.com/jc" />
              <meta property="fc:frame:button:3" content="@n" />
          <meta property="fc:frame:button:3:action" content="link" />
          <meta property="fc:frame:button:3:target" content="https://warpcast.com/n" />

          <meta property="fc:frame:button:4:action" content="post" />
          <meta property="fc:frame:button:4" content="Mint ➡️" />
        `;
        break;
      }
      let a;
      if (r.context.frameData?.frameActionBody?.castId?.hash && (a = "0x" + Buffer.from(r.context.frameData?.frameActionBody?.castId?.hash).toString("hex")), 
      n && a && a !== TEST_HASH && !l) {
        var [ g, l ] = await Promise.all([ Reactions.exists({
          targetHash: a,
          deletedAt: null,
          fid: i,
          reactionType: 1
        }), Reactions.exists({
          targetHash: a,
          deletedAt: null,
          reactionType: 2,
          fid: i
        }) ]);
        if (!g || !l) {
          c = "https://i.imgur.com/3urlLNk.png", s = config().DEFAULT_URI + `/wtf/v1/contracts/${f._id}/frames/post_url?step=mint&count=${y + 1}&mustLikeAndRecast=` + n, 
          m = `
          <meta property="fc:frame:button:1:action" content="post" />
          <meta property="fc:frame:button:1" content="Mint ➡️" />
          <meta property="fc:frame:button:2:action" content="post" />
          <meta property="fc:frame:button:2" content="try again 🔄" />
        `;
          break;
        }
      }
      try {
        var h = await mint({
          to: p,
          contractAddress: f.address
        }), b = h?.hash;
        if (c = "https://i.imgur.com/MfWeABe.png", f.isSet) {
          var w = ((await h.wait()).events?.find(t => "Transfer" === t.event))?.args?.[2];
          if (w) try {
            var C = await createContractSetToken({
              contract: f,
              tokenId: w.toString()
            });
            c = C?.metadata?.rawImageUrl || C?.metadata?.imageUrl || c;
          } catch (t) {
            console.error(t);
          }
        }
        await Promise.all([ cacheService.set({
          key: "Wtf:Frame:Minted",
          params: {
            connectedAddress: p,
            contractId: f._id
          },
          value: b,
          expiresAt: null
        }) ]), s = "";
        var I = "https://explorer.degen.tips/tx/" + b, A = "https://far.quest/contracts/degen/" + f.slug, v = `https://warpcast.com/~/compose?text=${encodeURIComponent("Mint " + f.metadata?.name + " for free ✨\n\n" + A)}&embeds[]=${A}&rand=` + Math.random().toString().slice(0, 7);
        m = `
          <meta property="fc:frame:button:1" content="View Tx" />
          <meta property="fc:frame:button:1:action" content="link" />
          <meta property="fc:frame:button:1:target" content="${I}" />

          <meta property="fc:frame:button:2" content="Share Mint" />
          <meta property="fc:frame:button:2:action" content="link" />
          <meta property="fc:frame:button:2:target" content="${v}" />

             
          <meta property="fc:frame:button:3" content="Install Action" />
          <meta property="fc:frame:button:3:action" content="link" />
          <meta property="fc:frame:button:3:target" content="${ACTION_URL}" />


          <meta property="fc:frame:button:4" content="Create with /whoami" />
          <meta property="fc:frame:button:4:action" content="link" />
          <meta property="fc:frame:button:4:target" content="${CHANNEL_URL}" />
        `;
      } catch (t) {
        t.message?.includes?.("execution reverted: Total cap reached") ? (await u.set("Wtf:Frame:MintedOut:" + f._id, "1", {
          lifetime: 604800,
          noreply: !0
        }), c = "https://i.imgur.com/zSqLZoV.png") : (c = "https://i.imgur.com/dDh20zB.png", 
        Sentry.captureException(t)), s = config().DEFAULT_URI + `/wtf/v1/contracts/${f._id}/frames/post_url?step=mint&count=${y + 1}&mustLikeAndRecast=` + n, 
        m = `
          <meta property="fc:frame:button:1" content="Install Action" />
          <meta property="fc:frame:button:1:action" content="link" />
          <meta property="fc:frame:button:1:target" content="${ACTION_URL}" />

          <meta property="fc:frame:button:2" content="Create with /whoami" />
          <meta property="fc:frame:button:2:action" content="link" />
          <meta property="fc:frame:button:2:target" content="${CHANNEL_URL}" />

          <meta property="fc:frame:button:3" content="try again 🔄" />
          <meta property="fc:frame:button:3:action" content="post" />
        `;
      }
      break;
    }

   default:
    c = f.metadata.frame.frameImageUrl, s = config().DEFAULT_URI + `/wtf/v1/contracts/${f._id}/frames/post_url?step=mint`, 
    m = `
        <meta property="fc:frame:button:1:action" content="post" />
        <meta property="fc:frame:button:1" content="Mint" />
      `;
  }
  d = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta property="fc:frame" content="vNext" />
        <meta property="fc:frame:image" content="${c}" />
        <meta property="fc:frame:post_url" content="${s}" />
        <meta property="fc:frame:image:aspect_ratio" content="1:1" />
        ${m}
      </head>
    </html>`;
  t.setHeader("Content-Type", "text/html"), t.send(d);
}), app.get("/v1/frames/image", async (t, e) => {
  var {
    text: t,
    image: a
  } = t.query, t = await generateImageWithText({
    text: t,
    image: decodeURIComponent(a),
    type: "jpg"
  });
  e.setHeader("Content-Type", t.imageType), e.send(t.imageBuffer);
});

const isWarpcastOrFarquestCastHash = t => {
  var e = t.match("https?:\\/\\/warpcast.com\\/([a-zA-Z0-9_.-]+)\\/(0x[a-f0-9]+)"), t = t.match("https?:\\/\\/far.quest\\/([a-zA-Z0-9_.-]+)\\/(0x[a-f0-9]+)");
  return e || t;
};

async function returnCastImageOrImage(t) {
  if (isWarpcastOrFarquestCastHash(t)) {
    var e = t.replace("https://warpcast.com", "").replace("https://far.quest", "").split("/"), e = await getFarcasterCastByShortHash(e?.[2], e?.[1]);
    if (e) return "https://client.warpcast.com/v2/cast-image?castHash=" + e.hash;
  }
  return t;
}

app.post("/v1/frames/create/post_url", frameContext, async (e, a) => {
  const {
    step: t,
    image: r,
    name: o
  } = e.query;
  let n = [];
  try {
    e.context?.untrustedData?.state && (n = (n = JSON.parse(e.context.untrustedData.state)).images);
  } catch (t) {
    console.error(t);
  }
  let c = "", s;
  var m, p = config().DEFAULT_URI + "/wtf/v1/frames/create/post_url";
  try {
    switch (t) {
     case "fillImage":
      s = "https://i.imgur.com/oSBcdZ1.png", c = `
          <meta property="fc:frame:input:text" content="Image url or Cast url" />
          <meta property="fc:frame:button:1" content="Add more images" />
          <meta property="fc:frame:button:1:action" content="post" />
          <meta property="fc:frame:button:1:post_url" content="${p}?step=fillSet" />

          <meta property="fc:frame:button:2" content="Continue" />
          <meta property="fc:frame:button:2:action" content="post" />
          <meta property="fc:frame:post_url" content="${p}?step=requireFollow" />
        `;
      break;

     case "fillSet":
      if (s = "https://i.imgur.com/oSBcdZ1.png", e.context?.untrustedData?.inputText) {
        let t = [];
        var i = await processCastOrImageUrl(e.context.untrustedData.inputText);
        if (n.length) try {
          t = [ ...n, i ];
        } catch (t) {
          console.error(t);
        } else t = [ i ];
        if (t.length === MAX_SET_IMAGES) {
          s = "https://i.imgur.com/VXFJNNG.png", c = `
          <meta property="fc:frame:state" content=${JSON.stringify({
            images: t
          })} />
        <meta property="fc:frame:input:text" content="Collection Image (Optional)" />
        <meta property="fc:frame:button:1" content="Start Over" />
          <meta property="fc:frame:button:1:action" content="post" />
          <meta property="fc:frame:button:1:post_url" content="${p}?step=fillImage" />

          <meta property="fc:frame:button:2" content="Confirm" />
          <meta property="fc:frame:button:2:action" content="post" />
          <meta property="fc:frame:post_url" content="${p}?step=createSet&isSet=true" />
        `;
          break;
        }
        s = i, c = `
            <meta property="fc:frame:state" content=${JSON.stringify({
          images: t
        })} />
          <meta property="fc:frame:input:text" content="Enter image/cast #${t.length + 1} of max ${MAX_SET_IMAGES}" />
          <meta property="fc:frame:button:1" content="${t.length === MAX_SET_IMAGES - 1 ? "Add final image" : "Add more images"}" />
          <meta property="fc:frame:button:1:action" content="post" />
          <meta property="fc:frame:button:1:post_url" content="${p}?step=fillSet" />
          <meta property="fc:frame:button:2" content="Done (${t.length} images)" />
          <meta property="fc:frame:button:2:action" content="post" />
          <meta property="fc:frame:post_url" content="${p}?step=chooseSetImage&isSet=true" />
        `;
      } else s = "https://i.imgur.com/oSBcdZ1.png", c = `
          <meta property="fc:frame:state" content=${JSON.stringify({
        images: n
      })} />
          <meta property="fc:frame:input:text" content="Image or Cast url is required." />
          <meta property="fc:frame:button:1" content="Add more images" />
          <meta property="fc:frame:button:1:action" content="post" />
          <meta property="fc:frame:button:1:post_url" content="${p}?step=fillSet" />
        `, n.length && (c += `
          <meta property="fc:frame:button:2" content="Done (${n.length} ${1 === n.length ? "image" : "images"})" />
          <meta property="fc:frame:button:2:action" content="post" />
          <meta property="fc:frame:post_url" content="${p}?step=chooseSetImage&isSet=true" />
          `);
      break;

     case "requireFollow":
      c = e.context?.untrustedData?.inputText || e.query.isSet ? (m = e.context.untrustedData.inputText, 
      s = "https://i.imgur.com/oMUBXnr.png", `
                <meta property="fc:frame:button:1" content="Yes" />
          <meta property="fc:frame:button:1:action" content="post" />
                <meta property="fc:frame:button:2" content="No" />
          <meta property="fc:frame:button:2:action" content="post" />
          <meta property="fc:frame:post_url" content="${p}?step=mustLikeAndRecast&image=${encodeURIComponent(m)}" />
      `) : (s = "https://i.imgur.com/65Z0lgC.png", `
          <meta property="fc:frame:input:text" content="Image or Cast url is required." />
          <meta property="fc:frame:button:1" content="Next" />
          <meta property="fc:frame:button:1:action" content="post" />
          <meta property="fc:frame:post_url" content="${p}?step=requireFollow" />
        `);
      break;

     case "mustLikeAndRecast":
      var f = 1 === parseInt(e.body?.untrustedData?.buttonIndex) ? e.context.isExternal ? e.context.connectedAddress : e.context.frameData.fid : null;
      s = "https://i.imgur.com/PgFh6wI.png", c = `
                <meta property="fc:frame:button:1" content="Yes" />
          <meta property="fc:frame:button:1:action" content="post" />
                <meta property="fc:frame:button:2" content="No" />
          <meta property="fc:frame:button:2:action" content="post" />
          <meta property="fc:frame:post_url" content="${p}?step=fillName${f ? "&mustFollow=" + f : ""}&image=${encodeURIComponent(r)}" />
        `;
      break;

     case "fillName":
      var u = e.query.mustFollow, d = 1 === parseInt(e.body?.untrustedData?.buttonIndex) || e.query.mustLikeAndRecast ? "true" : null;
      try {
        s = await processCastOrImageUrl(r);
      } catch (t) {
        console.error(t), s = r;
      }
      if (s?.startsWith("https://client.warpcast.com/v2/cast-image")) try {
        var l = await findCastImageFromHash(new URL(s).searchParams.get("castHash"));
        if (l) {
          c = `
        <meta property="fc:frame:input:text" content="Name (Optional)" />
        <meta property="fc:frame:button:1" content="Start Over" />
          <meta property="fc:frame:button:1:action" content="post" />
          <meta property="fc:frame:button:1:post_url" content="${p}?step=fillImage" />

          <meta property="fc:frame:button:2" content="Use post's image" />
          <meta property="fc:frame:button:2:action" content="post" />
          <meta property="fc:frame:button:2:post_url" content="${p}?step=fillName${u ? "&mustFollow=" + u : ""}${d ? "&mustLikeAndRecast=" + d : ""}&image=${encodeURIComponent(l)}"/>

        <meta property="fc:frame:button:3" content="Create Free Mint ✨" />
          <meta property="fc:frame:button:3:action" content="post" />
          <meta property="fc:frame:post_url" content="${p}?step=confirm${u ? "&mustFollow=" + u : ""}${d ? "&mustLikeAndRecast=" + d : ""}&image=${encodeURIComponent(s)}" />
        `;
          break;
        }
      } catch (t) {
        console.error(t);
      }
      c = `
        <meta property="fc:frame:input:text" content="Name (Optional)" />
        <meta property="fc:frame:button:1" content="Start Over" />
          <meta property="fc:frame:button:1:action" content="post" />
          <meta property="fc:frame:button:1:post_url" content="${p}?step=fillImage" />

        <meta property="fc:frame:button:2" content="Create Free Mint ✨" />
          <meta property="fc:frame:button:2:action" content="post" />
          <meta property="fc:frame:post_url" content="${p}?step=confirm${u ? "&mustFollow=" + u : ""}${d ? "&mustLikeAndRecast=" + d : ""}&image=${encodeURIComponent(s)}" />
        `;
      break;

     case "chooseSetImage":
      s = "https://i.imgur.com/VXFJNNG.png", c = `
        <meta property="fc:frame:state" content=${JSON.stringify({
        images: n
      })} />
        <meta property="fc:frame:input:text" content="Collection Image (Optional)" />
        <meta property="fc:frame:button:1" content="Start Over" />
          <meta property="fc:frame:button:1:action" content="post" />
          <meta property="fc:frame:button:1:post_url" content="${p}?step=fillImage" />

          <meta property="fc:frame:button:2" content="Confirm" />
          <meta property="fc:frame:button:2:action" content="post" />
          <meta property="fc:frame:post_url" content="${p}?step=createSet&isSet=true" />
        `;
      break;

     case "createSet":
      var y = e.context.frameData?.fid || null;
      s = await processCastOrImageUrl(s = e.context.untrustedData.inputText || n[0]), 
      c = `
        <meta property="fc:frame:state" content=${JSON.stringify({
        images: n
      })} />
        <meta property="fc:frame:input:text" content="Collection Name (Optional)" />
        <meta property="fc:frame:button:1" content="Start Over" />
          <meta property="fc:frame:button:1:action" content="post" />
          <meta property="fc:frame:button:1:post_url" content="${p}?step=fillImage" />

        <meta property="fc:frame:button:2" content="Create Free Mint ✨" />
          <meta property="fc:frame:button:2:action" content="post" />
          <meta property="fc:frame:post_url" content="${p}?step=confirm${y ? "&mustFollow=" + y : ""}&mustLikeAndRecast=true&isSet=true&image=${encodeURIComponent(s)}" />
        `;
      break;

     case "confirm":
      {
        s = "https://far.quest/assets/frameSuccess.png";
        var g = r;
        const o = e.context.untrustedData.inputText || "Untitled-" + Math.round(1e4 * Math.random());
        var h = {
          name: o,
          image: g,
          rawImage: g,
          symbol: "FARQUEST",
          ownerAddress: e.context.connectedAddress,
          mustFollow: e.query.mustFollow,
          mustLikeAndRecast: e.query.mustLikeAndRecast
        };
        if (e.query.isSet) try {
          var b = n;
          const A = 100 / b.length;
          h.isSet = !0, h.setData = {
            type: "RANDOM",
            metadata: b.map((t, e) => ({
              imageUrl: t,
              rawImageUrl: t,
              name: o,
              description: "Image #" + e + " of Collection " + o,
              percentage: A
            }))
          };
        } catch (t) {
          console.error(t);
        }
        var w = "https://far.quest/contracts/degen/" + (await handleCreateContractRequest({
          body: h
        })).contract.slug, C = `https://warpcast.com/~/compose?text=${encodeURIComponent("Mint " + o + " for free ✨\n\n" + w)}&embeds[]=${w}&rand=` + Math.random().toString().slice(0, 7);
        c = `
      <meta property="fc:frame:button:1" content="Install Action" />
          <meta property="fc:frame:button:1:action" content="link" />
          <meta property="fc:frame:button:1:target" content="${ACTION_URL}" />

      <meta property="fc:frame:button:2" content="Share free mint link" />
          <meta property="fc:frame:button:2:action" content="link" />
          <meta property="fc:frame:button:2:target" content="${C}" />
      `;
        break;
      }

     default:
      c = `
        <meta property="fc:frame:input:text" content="Error: Invalid step provided." />
      `;
    }
    var I = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta property="fc:frame" content="vNext" />
        <meta property="fc:frame:image" content="${s}" />
        <meta property="fc:frame:image:aspect_ratio" content="1:1" />
        ${c}
      </head>
    </html>`;
    a.setHeader("Content-Type", "text/html"), a.send(I);
  } catch (t) {
    console.error(t), Sentry.captureException(t);
    I = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta property="fc:frame" content="vNext" />
        <meta property="fc:frame:image" content="${s = "https://i.imgur.com/KEYb9zT.png"}" />
        <meta property="fc:frame:image:aspect_ratio" content="1:1" />
          <meta property="fc:frame:button:1" content="Start Over" />
          <meta property="fc:frame:button:1:action" content="post" />
          <meta property="fc:frame:button:1:post_url" content="${p}?step=fillImage" />
      </head>
    </html>`;
    a.setHeader("Content-Type", "text/html"), a.send(I);
  }
}), app.get("/v1/frames/add-action", (t, e) => {
  var a = {
    name: "far.quest Free Mint",
    icon: "smiley",
    description: "Create a free mint from any cast. All gas sponsored ✨",
    aboutUrl: "https://far.quest/",
    action: {
      type: "post"
    }
  }, t = t.query["v2"];
  if (!t) return e.status(200).json({
    ...a,
    description: "Create a free mint from any cast or images. All gas sponsored!",
    name: "far.quest Free Mint ✨"
  });
  e.status(200).json(a);
}), app.post("/v1/frames/add-action", frameContext, async (t, e) => {
  var a, r = t.query["v2"], o = t.body?.untrustedData?.castId?.hash;
  return o ? (a = t.context.frameData["fid"], a = {
    mustFollow: a,
    mustLikeAndRecast: "true",
    image: "https://client.warpcast.com/v2/cast-image?castHash=" + o
  }, r ? (r = "https://far.quest/contracts/degen/" + (await handleCreateContractRequest({
    body: {
      name: "" + o?.slice(2, 8),
      image: a.image,
      rawImage: a.image,
      symbol: "FARQUEST",
      ownerAddress: t.context.connectedAddress,
      mustFollow: a.mustFollow,
      mustLikeAndRecast: a.mustLikeAndRecast
    }
  })).contract.slug, e.status(200).json({
    message: "Success! Share: " + r
  })) : (o = config().DEFAULT_URI + "/wtf/v1/frames/create/post_url", e.status(200).json({
    type: "frame",
    frameUrl: o + `?step=fillName&${a.mustFollow ? "&mustFollow=" + a.mustFollow : ""}&${a.mustLikeAndRecast ? "&mustLikeAndRecast=" + a.mustLikeAndRecast : ""}&image=` + encodeURIComponent(a.image)
  }))) : e.status(400).json({
    message: "Invalid Cast ID!"
  });
}), module.exports = {
  router: app
};