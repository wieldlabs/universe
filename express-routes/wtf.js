const app = require("express").Router(), Sentry = require("@sentry/node"), rateLimit = require("express-rate-limit"), ethers = require("ethers"), factoryContractAbi = require("../helpers/abi/public-mint-nft-capped-factory.json"), axios = require("axios"), {
  frameContext,
  getAddressPasses
} = require("../helpers/farcaster-utils"), {
  getFarcasterUserAndLinksByFid,
  getFarcasterCastByShortHash,
  getFarcasterCastByHash
} = require("../helpers/farcaster"), config = require("../helpers/constants/config")["config"], Contract = require("../models/wallet/Contract")["Contract"], Token = require("../models/wallet/Token")["Token"], CacheService = require("../services/cache/CacheService")["Service"], _ScoreService = require("../services/ScoreService")["Service"], _FarcasterRpgService = require("../services/farcaster/FarcasterRpgService")["Service"], cacheService = new CacheService(), generateImageWithText = require("../helpers/generate-image")["generateImageWithText"], crypto = require("crypto"), {
  memcache,
  getHash
} = require("../connectmemcache"), Reactions = require("../models/farcaster")["Reactions"], getImageUrlOrUploadImage = require("../helpers/fetch-and-upload-image")["getImageUrlOrUploadImage"], authContext = require("../helpers/express-middleware")["authContext"], Referral = require("../models/Referral")["Referral"], {
  getFartapKey,
  getFartapScoreType
} = require("../helpers/fartap"), heavyLimiter = rateLimit({
  windowMs: 6e4,
  max: 50,
  message: "Too many requests! See docs.wield.xyz for more info.",
  validate: {
    limit: !1
  }
}), lightLimiter = rateLimit({
  windowMs: 6e4,
  max: 100,
  message: "Too many requests! See docs.wield.xyz for more info.",
  validate: {
    limit: !1
  }
}), ACTION_URL = "https://warpcast.com/~/add-cast-action?url=https%3A%2F%2Fbuild.far.quest%2Fwtf%2Fv1%2Fframes%2Fadd-action", MAX_MINT_COUNT = 250, MAX_SET_IMAGES = 5, ANGRY_MODE_COUNT = 5, TEST_HASH = "0x0000000000000000000000000000000000000000", CHANNEL_URL = "https://warpcast.com/~/channel/whoami", factoryContractAddress = "0x831f011B38Fd707229B2D1fCF3C8a1964200c9fe", factoryContractInterfaceType = "WTF1";

async function findCastImageFromHash(t) {
  return t ? (t = await getFarcasterCastByHash(t))?.embeds?.images?.[0]?.url || t?.embeds?.urls?.[0]?.openGraph?.image || t?.embeds?.urls?.[1]?.openGraph?.image || t?.embeds?.quoteCasts?.[0]?.embeds?.images?.[0]?.url || t?.embeds?.quoteCasts?.[0]?.embeds?.urls?.[0]?.openGraph?.image || t?.embeds?.quoteCasts?.[0]?.embeds?.urls?.[1]?.openGraph?.image || t?.embeds?.quoteCasts?.[1]?.embeds?.images?.[0]?.url || t?.embeds?.quoteCasts?.[1]?.embeds?.urls?.[0]?.openGraph?.image || t?.embeds?.quoteCasts?.[1]?.embeds?.urls?.[1]?.openGraph?.image : null;
}

async function createContract({
  name: e,
  symbol: a,
  totalCap: r,
  ownerAddress: o,
  baseUrl: s
}) {
  try {
    if (!(e && a && r && o)) throw new Error("Missing required fields!");
    var n = process.env.FARCAST_KEY;
    if (!n) throw new Error("Not configured!");
    var c = ethers.Wallet.fromMnemonic(n), m = new ethers.providers.JsonRpcProvider("https://rpc.degen.tips", 666666666), i = c.connect(m), p = await new ethers.Contract(factoryContractAddress, factoryContractAbi.abi, i).deployCappedNFTContract(e, a, r, o, s), u = (console.log("Deploying mint contract"), 
    console.log(p), await p.wait());
    let t;
    var f = (u.events || []).find(t => "ContractDeployed" === t.event);
    return f ? (t = f.args[0], console.log("New contract deployed at address: " + t)) : console.log("No 'ContractDeployed' event found."), 
    console.log("Contract deployed at address: " + p.address), {
      contractAddress: t,
      txHash: p.hash
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
    const s = o.reduce((t, e) => t + e.percentage, 0);
    let e = 0;
    o = o.map(t => (e += t.percentage / s * 1e4, {
      ...t,
      cumulativePercentage: e
    }));
    const n = crypto.randomInt(1, 10001);
    o = o.find(t => n <= t.cumulativePercentage);
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
        text: "Free Mint ✨ (No Gas, 250 total)",
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
    var a = e.trim(), r = await memcache.get(getHash("WTF:processCastOrImageUrl:" + a));
    if (r) return r.value;
    let t;
    return a.startsWith("https://client.warpcast.com/v2/cast-image") || a.startsWith("https://imagedelivery.net") ? a : (t = isWarpcastOrFarquestCastHash(a) ? await returnCastImageOrImage(a) : await getImageUrlOrUploadImage(a), 
    await memcache.set(getHash("WTF:processCastOrImageUrl:" + a), t, {
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
    var a, r, o = new ethers.providers.JsonRpcProvider("https://rpc.degen.tips", 666666666), s = process.env.FARCAST_KEY;
    if (s) return a = ethers.Wallet.fromMnemonic(s).connect(o), r = await new ethers.Contract(factoryContractAddress, factoryContractAbi.abi, a).mintNftContract(e, t), 
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
    mustLikeAndRecast: s
  } = r.query;
  let n, c, m;
  if (!r.context) return t.status(401).json({
    success: !1,
    message: "Unauthorized"
  });
  var i = r.context.connectedAddress, p = r.context.isExternal ? i : r.context.frameData.fid;
  if (!i) return t.status(401).json({
    success: !1,
    message: "Unauthorized"
  });
  let u;
  var a = "contract:" + r.params.contractId, f = await memcache.get(a);
  if (f ? u = JSON.parse(f.value) : (u = await Contract.findById(r.params.contractId), 
  await memcache.set(a, JSON.stringify(u), {
    lifetime: 604800
  })), !u || !u.metadata?.frame) return t.status(404).json({
    success: !1,
    message: "No Contract Frame found"
  });
  switch (e) {
   case void 0:
    n = u.metadata.frame.frameImageUrl, c = config().DEFAULT_URI + `/wtf/v1/contracts/${u._id}/frames/post_url?step=mint`, 
    m = `
        <meta property="fc:frame:button:1:action" content="post" />
        <meta property="fc:frame:button:1" content="Mint" />
      `;
    break;

   case "mint":
    {
      if (!u.isVerified) throw new Error("Contract is not verified");
      var d = await cacheService.get({
        key: "Wtf:Frame:Minted",
        params: {
          connectedAddress: i,
          contractId: u._id
        }
      });
      if (d && "development" !== process.env.NODE_ENV) {
        n = "https://i.imgur.com/yByoglU.png", c = "";
        var l = "https://far.quest/contracts/degen/" + u.slug, l = `https://warpcast.com/~/compose?text=${encodeURIComponent("Mint " + u.metadata?.name + " for free ✨\n\n" + l)}&embeds[]=${l}&rand=` + Math.random().toString().slice(0, 7);
        m = `
          <meta property="fc:frame:button:1" content="View" />
          <meta property="fc:frame:button:1:action" content="link" />
          <meta property="fc:frame:button:1:target" content="https://explorer.degen.tips/tx/${d}" />

          <meta property="fc:frame:button:2" content="Share Mint" />
          <meta property="fc:frame:button:2:action" content="link" />
          <meta property="fc:frame:button:2:target" content="${l}" />
      
      
          <meta property="fc:frame:button:3" content="Install Action" />
          <meta property="fc:frame:button:3:action" content="link" />
          <meta property="fc:frame:button:3:target" content="${ACTION_URL}" />

          <meta property="fc:frame:button:4" content="Create with /whoami" />
          <meta property="fc:frame:button:4:action" content="link" />
          <meta property="fc:frame:button:4:target" content="${CHANNEL_URL}" />
        `;
        break;
      }
      var d = "Wtf:Frame:MintedOut:" + u._id;
      if ("1" === (await memcache.get(d))?.value) {
        n = "https://i.imgur.com/zSqLZoV.png", m = `
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
      o && o.toString() !== p.toString() && ([ l, d, g ] = await Promise.all([ getFarcasterUserAndLinksByFid({
        fid: o,
        context: {
          fid: p
        }
      }), getFarcasterUserAndLinksByFid({
        fid: "274",
        context: {
          fid: p
        }
      }), getFarcasterUserAndLinksByFid({
        fid: "251",
        context: {
          fid: p
        }
      }) ]), e = l, t = (l.isFollowing || e.external || !e.username) && (d.isFollowing || "274" === p.toString()) && (g.isFollowing || "251" === p.toString()));
      var l = r.query.count ? parseInt(r.query.count) : 0, d = l >= ANGRY_MODE_COUNT, g = e.username || "fid:" + o, y = e.username && !e.external ? "https://warpcast.com/" + g : "https://far.quest/" + g;
      if (!t && !d) {
        n = "https://i.imgur.com/Bvfd03f.png", c = config().DEFAULT_URI + `/wtf/v1/contracts/${u._id}/frames/post_url?step=mint&count=${l + 1}&mustFollow=` + o + (s ? "&mustLikeAndRecast=" + s : ""), 
        m = `
          <meta property="fc:frame:button:1:action" content="link" />
          <meta property="fc:frame:button:1:target" content="${y}" />
          <meta property="fc:frame:button:1" content="${g}" />
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
      s && a && a !== TEST_HASH && !d) {
        var [ y, g ] = await Promise.all([ Reactions.exists({
          targetHash: a,
          deletedAt: null,
          fid: p,
          reactionType: 1
        }), Reactions.exists({
          targetHash: a,
          deletedAt: null,
          reactionType: 2,
          fid: p
        }) ]);
        if (!y || !g) {
          n = "https://i.imgur.com/3urlLNk.png", c = config().DEFAULT_URI + `/wtf/v1/contracts/${u._id}/frames/post_url?step=mint&count=${l + 1}&mustLikeAndRecast=` + s, 
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
          to: i,
          contractAddress: u.address
        }), C = h?.hash;
        if (n = "https://i.imgur.com/MfWeABe.png", u.isSet) {
          var b = ((await h.wait()).events?.find(t => "Transfer" === t.event))?.args?.[2];
          if (b) try {
            var w = await createContractSetToken({
              contract: u,
              tokenId: b.toString()
            });
            n = w?.metadata?.rawImageUrl || w?.metadata?.imageUrl || n;
          } catch (t) {
            console.error(t);
          }
        }
        await Promise.all([ cacheService.set({
          key: "Wtf:Frame:Minted",
          params: {
            connectedAddress: i,
            contractId: u._id
          },
          value: C,
          expiresAt: null
        }) ]), c = "";
        var v = "https://explorer.degen.tips/tx/" + C, A = "https://far.quest/contracts/degen/" + u.slug, x = `https://warpcast.com/~/compose?text=${encodeURIComponent("Mint " + u.metadata?.name + " for free ✨\n\n" + A)}&embeds[]=${A}&rand=` + Math.random().toString().slice(0, 7);
        m = `
          <meta property="fc:frame:button:1" content="View Tx" />
          <meta property="fc:frame:button:1:action" content="link" />
          <meta property="fc:frame:button:1:target" content="${v}" />

          <meta property="fc:frame:button:2" content="Share Mint" />
          <meta property="fc:frame:button:2:action" content="link" />
          <meta property="fc:frame:button:2:target" content="${x}" />

             
          <meta property="fc:frame:button:3" content="Install Action" />
          <meta property="fc:frame:button:3:action" content="link" />
          <meta property="fc:frame:button:3:target" content="${ACTION_URL}" />


          <meta property="fc:frame:button:4" content="Create with /whoami" />
          <meta property="fc:frame:button:4:action" content="link" />
          <meta property="fc:frame:button:4:target" content="${CHANNEL_URL}" />
        `;
      } catch (t) {
        t.message?.includes?.("execution reverted: Total cap reached") ? (await memcache.set("Wtf:Frame:MintedOut:" + u._id, "1", {
          lifetime: 604800,
          noreply: !0
        }), n = "https://i.imgur.com/zSqLZoV.png") : (n = "https://i.imgur.com/dDh20zB.png", 
        Sentry.captureException(t)), c = config().DEFAULT_URI + `/wtf/v1/contracts/${u._id}/frames/post_url?step=mint&count=${l + 1}&mustLikeAndRecast=` + s, 
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
    n = u.metadata.frame.frameImageUrl, c = config().DEFAULT_URI + `/wtf/v1/contracts/${u._id}/frames/post_url?step=mint`, 
    m = `
        <meta property="fc:frame:button:1:action" content="post" />
        <meta property="fc:frame:button:1" content="Mint" />
      `;
  }
  f = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta property="fc:frame" content="vNext" />
        <meta property="fc:frame:image" content="${n}" />
        <meta property="fc:frame:post_url" content="${c}" />
        <meta property="fc:frame:image:aspect_ratio" content="1:1" />
        ${m}
      </head>
    </html>`;
  t.setHeader("Content-Type", "text/html"), t.send(f);
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
  let s = [];
  try {
    e.context?.untrustedData?.state && (s = (s = JSON.parse(e.context.untrustedData.state)).images);
  } catch (t) {
    console.error(t);
  }
  let n = "", c;
  var m, i = config().DEFAULT_URI + "/wtf/v1/frames/create/post_url";
  try {
    switch (t) {
     case "fillImage":
      c = "https://i.imgur.com/oSBcdZ1.png", n = `
          <meta property="fc:frame:input:text" content="Image url or Cast url" />
          <meta property="fc:frame:button:1" content="Add more images" />
          <meta property="fc:frame:button:1:action" content="post" />
          <meta property="fc:frame:button:1:post_url" content="${i}?step=fillSet" />

          <meta property="fc:frame:button:2" content="Continue" />
          <meta property="fc:frame:button:2:action" content="post" />
          <meta property="fc:frame:post_url" content="${i}?step=requireFollow" />
        `;
      break;

     case "fillSet":
      if (c = "https://i.imgur.com/oSBcdZ1.png", e.context?.untrustedData?.inputText) {
        let t = [];
        var p = await processCastOrImageUrl(e.context.untrustedData.inputText);
        if (s.length) try {
          t = [ ...s, p ];
        } catch (t) {
          console.error(t);
        } else t = [ p ];
        if (t.length === MAX_SET_IMAGES) {
          c = "https://i.imgur.com/VXFJNNG.png", n = `
          <meta property="fc:frame:state" content=${JSON.stringify({
            images: t
          })} />
        <meta property="fc:frame:input:text" content="Collection Image (Optional)" />
        <meta property="fc:frame:button:1" content="Start Over" />
          <meta property="fc:frame:button:1:action" content="post" />
          <meta property="fc:frame:button:1:post_url" content="${i}?step=fillImage" />

          <meta property="fc:frame:button:2" content="Confirm" />
          <meta property="fc:frame:button:2:action" content="post" />
          <meta property="fc:frame:post_url" content="${i}?step=createSet&isSet=true" />
        `;
          break;
        }
        c = p, n = `
            <meta property="fc:frame:state" content=${JSON.stringify({
          images: t
        })} />
          <meta property="fc:frame:input:text" content="Enter image/cast #${t.length + 1} of max ${MAX_SET_IMAGES}" />
          <meta property="fc:frame:button:1" content="${t.length === MAX_SET_IMAGES - 1 ? "Add final image" : "Add more images"}" />
          <meta property="fc:frame:button:1:action" content="post" />
          <meta property="fc:frame:button:1:post_url" content="${i}?step=fillSet" />
          <meta property="fc:frame:button:2" content="Done (${t.length} images)" />
          <meta property="fc:frame:button:2:action" content="post" />
          <meta property="fc:frame:post_url" content="${i}?step=chooseSetImage&isSet=true" />
        `;
      } else c = "https://i.imgur.com/oSBcdZ1.png", n = `
          <meta property="fc:frame:state" content=${JSON.stringify({
        images: s
      })} />
          <meta property="fc:frame:input:text" content="Image or Cast url is required." />
          <meta property="fc:frame:button:1" content="Add more images" />
          <meta property="fc:frame:button:1:action" content="post" />
          <meta property="fc:frame:button:1:post_url" content="${i}?step=fillSet" />
        `, s.length && (n += `
          <meta property="fc:frame:button:2" content="Done (${s.length} ${1 === s.length ? "image" : "images"})" />
          <meta property="fc:frame:button:2:action" content="post" />
          <meta property="fc:frame:post_url" content="${i}?step=chooseSetImage&isSet=true" />
          `);
      break;

     case "requireFollow":
      n = e.context?.untrustedData?.inputText || e.query.isSet ? (m = e.context.untrustedData.inputText, 
      c = "https://i.imgur.com/oMUBXnr.png", `
                <meta property="fc:frame:button:1" content="Yes" />
          <meta property="fc:frame:button:1:action" content="post" />
                <meta property="fc:frame:button:2" content="No" />
          <meta property="fc:frame:button:2:action" content="post" />
          <meta property="fc:frame:post_url" content="${i}?step=mustLikeAndRecast&image=${encodeURIComponent(m)}" />
      `) : (c = "https://i.imgur.com/65Z0lgC.png", `
          <meta property="fc:frame:input:text" content="Image or Cast url is required." />
          <meta property="fc:frame:button:1" content="Next" />
          <meta property="fc:frame:button:1:action" content="post" />
          <meta property="fc:frame:post_url" content="${i}?step=requireFollow" />
        `);
      break;

     case "mustLikeAndRecast":
      var u = 1 === parseInt(e.body?.untrustedData?.buttonIndex) ? e.context.isExternal ? e.context.connectedAddress : e.context.frameData.fid : null;
      c = "https://i.imgur.com/PgFh6wI.png", n = `
                <meta property="fc:frame:button:1" content="Yes" />
          <meta property="fc:frame:button:1:action" content="post" />
                <meta property="fc:frame:button:2" content="No" />
          <meta property="fc:frame:button:2:action" content="post" />
          <meta property="fc:frame:post_url" content="${i}?step=fillName${u ? "&mustFollow=" + u : ""}&image=${encodeURIComponent(r)}" />
        `;
      break;

     case "fillName":
      var f = e.query.mustFollow, d = 1 === parseInt(e.body?.untrustedData?.buttonIndex) || e.query.mustLikeAndRecast ? "true" : null;
      try {
        c = await processCastOrImageUrl(r);
      } catch (t) {
        console.error(t), c = r;
      }
      if (c?.startsWith("https://client.warpcast.com/v2/cast-image")) try {
        var l = await findCastImageFromHash(new URL(c).searchParams.get("castHash"));
        if (l) {
          n = `
        <meta property="fc:frame:input:text" content="Name (Optional)" />
        <meta property="fc:frame:button:1" content="Start Over" />
          <meta property="fc:frame:button:1:action" content="post" />
          <meta property="fc:frame:button:1:post_url" content="${i}?step=fillImage" />

          <meta property="fc:frame:button:2" content="Use post's image" />
          <meta property="fc:frame:button:2:action" content="post" />
          <meta property="fc:frame:button:2:post_url" content="${i}?step=fillName${f ? "&mustFollow=" + f : ""}${d ? "&mustLikeAndRecast=" + d : ""}&image=${encodeURIComponent(l)}"/>

        <meta property="fc:frame:button:3" content="Create Free Mint ✨" />
          <meta property="fc:frame:button:3:action" content="post" />
          <meta property="fc:frame:post_url" content="${i}?step=confirm${f ? "&mustFollow=" + f : ""}${d ? "&mustLikeAndRecast=" + d : ""}&image=${encodeURIComponent(c)}" />
        `;
          break;
        }
      } catch (t) {
        console.error(t);
      }
      n = `
        <meta property="fc:frame:input:text" content="Name (Optional)" />
        <meta property="fc:frame:button:1" content="Start Over" />
          <meta property="fc:frame:button:1:action" content="post" />
          <meta property="fc:frame:button:1:post_url" content="${i}?step=fillImage" />

        <meta property="fc:frame:button:2" content="Create Free Mint ✨" />
          <meta property="fc:frame:button:2:action" content="post" />
          <meta property="fc:frame:post_url" content="${i}?step=confirm${f ? "&mustFollow=" + f : ""}${d ? "&mustLikeAndRecast=" + d : ""}&image=${encodeURIComponent(c)}" />
        `;
      break;

     case "chooseSetImage":
      c = "https://i.imgur.com/VXFJNNG.png", n = `
        <meta property="fc:frame:state" content=${JSON.stringify({
        images: s
      })} />
        <meta property="fc:frame:input:text" content="Collection Image (Optional)" />
        <meta property="fc:frame:button:1" content="Start Over" />
          <meta property="fc:frame:button:1:action" content="post" />
          <meta property="fc:frame:button:1:post_url" content="${i}?step=fillImage" />

          <meta property="fc:frame:button:2" content="Confirm" />
          <meta property="fc:frame:button:2:action" content="post" />
          <meta property="fc:frame:post_url" content="${i}?step=createSet&isSet=true" />
        `;
      break;

     case "createSet":
      var g = e.context.frameData?.fid || null;
      c = await processCastOrImageUrl(c = e.context.untrustedData.inputText || s[0]), 
      n = `
        <meta property="fc:frame:state" content=${JSON.stringify({
        images: s
      })} />
        <meta property="fc:frame:input:text" content="Collection Name (Optional)" />
        <meta property="fc:frame:button:1" content="Start Over" />
          <meta property="fc:frame:button:1:action" content="post" />
          <meta property="fc:frame:button:1:post_url" content="${i}?step=fillImage" />

        <meta property="fc:frame:button:2" content="Create Free Mint ✨" />
          <meta property="fc:frame:button:2:action" content="post" />
          <meta property="fc:frame:post_url" content="${i}?step=confirm${g ? "&mustFollow=" + g : ""}&mustLikeAndRecast=true&isSet=true&image=${encodeURIComponent(c)}" />
        `;
      break;

     case "confirm":
      {
        c = "https://far.quest/assets/frameSuccess.webp";
        var y = r;
        const o = e.context.untrustedData.inputText || "Untitled-" + Math.round(1e4 * Math.random());
        var h = {
          name: o,
          image: y,
          rawImage: y,
          symbol: "FARQUEST",
          ownerAddress: e.context.connectedAddress,
          mustFollow: e.query.mustFollow,
          mustLikeAndRecast: e.query.mustLikeAndRecast
        };
        if (e.query.isSet) try {
          var C = s;
          const A = 100 / C.length;
          h.isSet = !0, h.setData = {
            type: "RANDOM",
            metadata: C.map((t, e) => ({
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
        var b = "https://far.quest/contracts/degen/" + (await handleCreateContractRequest({
          body: h
        })).contract.slug, w = `https://warpcast.com/~/compose?text=${encodeURIComponent("Mint " + o + " for free ✨\n\n" + b)}&embeds[]=${b}&rand=` + Math.random().toString().slice(0, 7);
        n = `
      <meta property="fc:frame:button:1" content="Install Action" />
          <meta property="fc:frame:button:1:action" content="link" />
          <meta property="fc:frame:button:1:target" content="${ACTION_URL}" />

      <meta property="fc:frame:button:2" content="Share free mint link" />
          <meta property="fc:frame:button:2:action" content="link" />
          <meta property="fc:frame:button:2:target" content="${w}" />
      `;
        break;
      }

     default:
      n = `
        <meta property="fc:frame:input:text" content="Error: Invalid step provided." />
      `;
    }
    var v = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta property="fc:frame" content="vNext" />
        <meta property="fc:frame:image" content="${c}" />
        <meta property="fc:frame:image:aspect_ratio" content="1:1" />
        ${n}
      </head>
    </html>`;
    a.setHeader("Content-Type", "text/html"), a.send(v);
  } catch (t) {
    console.error(t), Sentry.captureException(t, {
      extra: {
        frameData: e.context.frameData,
        body: e.body,
        query: e.query,
        context: e.context
      }
    });
    v = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta property="fc:frame" content="vNext" />
        <meta property="fc:frame:image" content="${c = "https://i.imgur.com/KEYb9zT.png"}" />
        <meta property="fc:frame:image:aspect_ratio" content="1:1" />
          <meta property="fc:frame:button:1" content="Start Over" />
          <meta property="fc:frame:button:1:action" content="post" />
          <meta property="fc:frame:button:1:post_url" content="${i}?step=fillImage" />
      </head>
    </html>`;
    a.setHeader("Content-Type", "text/html"), a.send(v);
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
});

const MAX_TAPS_PER_SECOND = 10, boostsMultiplier = {
  farstray: .1,
  farbeaver: .2,
  farligator: .4,
  farinu: .8,
  farpossum: 1,
  faryote: 1.2,
  farsune: 1.6,
  farllama: 2,
  farlucky: 3
}, boostsPrice = {
  farstray: 100,
  farbeaver: 1e3,
  farligator: 1e4,
  farinu: 5e4,
  farpossum: 75e3,
  faryote: 1e5,
  farsune: 15e4,
  farllama: 2e5,
  farlucky: 5e5
}, questsPrice = {
  followWieldLabs: 25e9,
  likeWieldLabsLatest: 25e9,
  followTwitch: 25e9,
  followJcdenton: 25e9,
  followNico: 25e9,
  followTg: 25e9,
  followTgAnnouncement: 25e9,
  followDiscord: 25e9
}, referralQuesPrice = {
  referralQuest1: 5e9,
  referralQuest2: 75e8,
  referralQuest5: 8e9,
  referralQuest10: 85e8,
  referralQuest15: 95e8,
  referralQuest20: 105e8,
  referralQuest25: 115e8,
  referralQuest30: 125e8,
  referralQuest40: 135e8,
  referralQuest50: 145e8,
  referralQuest60: 155e8,
  referralQuest70: 165e8,
  referralQuest80: 175e8,
  referralQuest90: 185e8,
  referralQuest100: 195e8,
  referralQuest200: 205e8,
  referralQuest300: 3e10,
  referralQuest400: 25e10,
  referralQuest500: 2e13,
  referralQuest1000: 5e13,
  referralQuest5000: 125e12
}, paidQuests = {
  dotCast: 5e11,
  dotCast3: 1e12,
  dotCast5: 5e12,
  dotCast10: 1e13,
  dotCast25: 25e12,
  dotCast50: 4e13,
  dotCast75: 5e13,
  dotCast100: 75e12,
  dotCast250: 1e14,
  dotCast1000: 125e12
}, MULTIPLIER = 1.1, REFERRAL_BONUS = 1e6, getTotalReferral = async t => {
  var e = await memcache.get(`ReferralV2:TELEGRAM:${t}:total:count`);
  return e ? e.value : (e = await Referral.countDocuments({
    referralType: "TELEGRAM",
    account: t,
    isValid: !0
  }), await memcache.set(`ReferralV2:TELEGRAM:${t}:total:count`, e), e);
};

app.post("/v1/fartap/game", [ heavyLimiter, authContext ], async (t, a) => {
  if (!t.context.account) return a.status(401).json({
    message: "Unauthorized"
  });
  var {
    taps: e = 0,
    boosts: r = {},
    quests: o
  } = t.body, s = t.context.account._id, n = await getFartapKey(), c = new Date();
  let m = await cacheService.get({
    key: n,
    params: {
      accountId: s
    }
  });
  m = m ? JSON.parse(m) : {
    passiveTaps: 0,
    boosts: {},
    score: 1e7,
    gameLastUpdated: c
  };
  const i = (c - new Date(m.gameLastUpdated)) / 1e3;
  var p = i * MAX_TAPS_PER_SECOND, e = Math.min(Math.max(e, m.score), p + m.score), p = Object.entries(m.boosts).reduce((t, [ e, a ]) => t + (boostsMultiplier[e] || 0) * a * i, 0), u = m.passiveTaps + p;
  let f = e + p;
  Object.entries(r).forEach(([ a, r ]) => {
    if (boostsPrice[a]) {
      var o = boostsPrice[a];
      if ((m.boosts[a] || 0) < r) {
        let e = 0;
        for (let t = m.boosts[a] || 0; t < r; t++) e += Math.floor(o * Math.pow(MULTIPLIER, t));
        f >= e && (m.boosts = {
          ...m.boosts,
          [a]: r
        }, f -= e);
      }
    }
  }), m.score = f, m.passiveTaps = u, m.gameLastUpdated = c;
  const d = await getTotalReferral(s);
  if (m.totalReferralCount = d, (!m.appliedRefCount || m.appliedRefCount < d) && (e = m.score + (d - m.appliedRefCount) * REFERRAL_BONUS, 
  m.score = e, m.appliedRefCount = d), o && 0 < Object.keys(o).length) {
    if (await memcache.get(getHash(`fartap:quest:lock:${s}:claiming:` + JSON.stringify(o)))) return a.status(429).json({
      success: !1,
      message: "Quest claim in progress, please try again"
    });
    try {
      if (await memcache.set(getHash(`fartap:quest:lock:${s}:claiming:` + JSON.stringify(o)), "1", {
        lifetime: 30
      }), Object.entries(o).forEach(([ t ]) => {
        var e;
        questsPrice[t] && !m.quests?.[t] ? (m.score += questsPrice[t], m.quests = {
          ...m.quests || {},
          [t]: !0
        }) : referralQuesPrice[t] && !m.quests?.[t] && ((e = (t => {
          t = t.match(/referralQuest(\d+)/);
          return t ? parseInt(t[1], 10) : null;
        })(t)) ? d >= e ? (m.score += referralQuesPrice[t], m.quests = {
          ...m.quests || {},
          [t]: !0
        }) : console.error(`Not enough referrals for quest ${t}. Has: ${d}, Needs: ` + e) : console.error("Invalid referral quest format: " + t));
      }), !0 === o?.dotCast && !m.quests?.dotCast) {
        await t.context.account.populate("addresses");
        var l = t.context.account.addresses[0].address?.toLowerCase();
        if (!l) return a.status(400).json({
          success: !1,
          message: "No address found for the account."
        });
        let e = !1;
        try {
          var g = await getAddressPasses(l, !0);
          e = g.isHolder;
        } catch (t) {
          console.error("Cannot getAddressPasses!", l), e = !1;
        }
        e ? (m.score += paidQuests.dotCast, m.quests = {
          ...m.quests || {},
          dotCast: !0,
          checkedDotCast: !0
        }) : m.quests = {
          ...m.quests || {},
          checkedDotCast: !1
        };
      }
      if (!0 === o?.dotCast3 && !m.quests?.dotCast3) {
        await t.context.account.populate("addresses");
        var y = t.context.account.addresses[0].address?.toLowerCase();
        if (!y) return a.status(400).json({
          success: !1,
          message: "No address found for the account."
        });
        let e = !1;
        try {
          var h = await getAddressPasses(y, !1);
          e = 3 <= h.passes?.length;
        } catch (t) {
          console.error("Cannot getAddressPasses!", y), e = !1;
        }
        e ? (m.score += paidQuests.dotCast3, m.quests = {
          ...m.quests || {},
          dotCast3: !0,
          checkedDotCast3: !0
        }) : m.quests = {
          ...m.quests || {},
          checkedDotCast3: !1
        };
      }
      if (!0 === o?.dotCast5 && !m.quests?.dotCast5) {
        await t.context.account.populate("addresses");
        var C = t.context.account.addresses[0].address?.toLowerCase();
        if (!C) return a.status(400).json({
          success: !1,
          message: "No address found for the account."
        });
        let e = !1;
        try {
          var b = await getAddressPasses(C, !1);
          e = 5 <= b.passes?.length;
        } catch (t) {
          console.error("Cannot getAddressPasses!", C), e = !1;
        }
        e ? (m.score += paidQuests.dotCast5, m.quests = {
          ...m.quests || {},
          dotCast5: !0,
          checkedDotCast5: !0
        }) : m.quests = {
          ...m.quests || {},
          checkedDotCast5: !1
        };
      }
      if (!0 === o?.dotCast10 && !m.quests?.dotCast10) {
        await t.context.account.populate("addresses");
        var w = t.context.account.addresses[0].address?.toLowerCase();
        if (!w) return a.status(400).json({
          success: !1,
          message: "No address found for the account."
        });
        let e = !1;
        try {
          var v = await getAddressPasses(w, !1);
          e = 10 <= v.passes?.length;
        } catch (t) {
          console.error("Cannot getAddressPasses!", w), e = !1;
        }
        e ? (m.score += paidQuests.dotCast10, m.quests = {
          ...m.quests || {},
          dotCast10: !0,
          checkedDotCast10: !0
        }) : m.quests = {
          ...m.quests || {},
          checkedDotCast10: !1
        };
      }
      if (!0 === o?.dotCast25 && !m.quests?.dotCast25) {
        await t.context.account.populate("addresses");
        var A = t.context.account.addresses[0].address?.toLowerCase();
        if (!A) return a.status(400).json({
          success: !1,
          message: "No address found for the account."
        });
        let e = !1;
        try {
          var x = await getAddressPasses(A, !1);
          e = 25 <= x.passes?.length;
        } catch (t) {
          console.error("Cannot getAddressPasses!", A), e = !1;
        }
        e ? (m.score += paidQuests.dotCast25, m.quests = {
          ...m.quests || {},
          dotCast25: !0,
          checkedDotCast25: !0
        }) : m.quests = {
          ...m.quests || {},
          checkedDotCast25: !1
        };
      }
      if (!0 === o?.dotCast50 && !m.quests?.dotCast50) {
        await t.context.account.populate("addresses");
        var q = t.context.account.addresses[0].address?.toLowerCase();
        if (!q) return a.status(400).json({
          success: !1,
          message: "No address found for the account."
        });
        let e = !1;
        try {
          var I = await getAddressPasses(q, !1);
          e = 50 <= I.passes?.length;
        } catch (t) {
          console.error("Cannot getAddressPasses!", q), e = !1;
        }
        e ? (m.score += paidQuests.dotCast50, m.quests = {
          ...m.quests || {},
          dotCast50: !0,
          checkedDotCast50: !0
        }) : m.quests = {
          ...m.quests || {},
          checkedDotCast50: !1
        };
      }
      if (!0 === o?.dotCast75 && !m.quests?.dotCast75) {
        await t.context.account.populate("addresses");
        var S = t.context.account.addresses[0].address?.toLowerCase();
        if (!S) return a.status(400).json({
          success: !1,
          message: "No address found for the account."
        });
        let e = !1;
        try {
          var R = await getAddressPasses(S, !1);
          e = 75 <= R.passes?.length;
        } catch (t) {
          console.error("Cannot getAddressPasses!", S), e = !1;
        }
        e ? (m.score += paidQuests.dotCast75, m.quests = {
          ...m.quests || {},
          dotCast75: !0,
          checkedDotCast75: !0
        }) : m.quests = {
          ...m.quests || {},
          checkedDotCast75: !1
        };
      }
      if (!0 === o?.dotCast100 && !m.quests?.dotCast100) {
        await t.context.account.populate("addresses");
        var k = t.context.account.addresses[0].address?.toLowerCase();
        if (!k) return a.status(400).json({
          success: !1,
          message: "No address found for the account."
        });
        let e = !1;
        try {
          var U = await getAddressPasses(k, !1);
          e = 100 <= U.passes?.length;
        } catch (t) {
          console.error("Cannot getAddressPasses!", k), e = !1;
        }
        e ? (m.score += paidQuests.dotCast100, m.quests = {
          ...m.quests || {},
          dotCast100: !0,
          checkedDotCast100: !0
        }) : m.quests = {
          ...m.quests || {},
          checkedDotCast100: !1
        };
      }
      if (!0 === o?.dotCast250 && !m.quests?.dotCast250) {
        await t.context.account.populate("addresses");
        var _ = t.context.account.addresses[0].address?.toLowerCase();
        if (!_) return a.status(400).json({
          success: !1,
          message: "No address found for the account."
        });
        let e = !1;
        try {
          var T = await getAddressPasses(_, !1);
          e = 250 <= T.passes?.length;
        } catch (t) {
          console.error("Cannot getAddressPasses!", _), e = !1;
        }
        e ? (m.score += paidQuests.dotCast250, m.quests = {
          ...m.quests || {},
          dotCast250: !0,
          checkedDotCast250: !0
        }) : m.quests = {
          ...m.quests || {},
          checkedDotCast250: !1
        };
      }
      if (!0 === o?.dotCast1000 && !m.quests?.dotCast1000) {
        await t.context.account.populate("addresses");
        var $ = t.context.account.addresses[0].address?.toLowerCase();
        if (!$) return a.status(400).json({
          success: !1,
          message: "No address found for the account."
        });
        let e = !1;
        try {
          var F = await getAddressPasses($, !1);
          e = 1e3 <= F.passes?.length;
        } catch (t) {
          console.error("Cannot getAddressPasses!", $), e = !1;
        }
        e ? (m.score += paidQuests.dotCast1000, m.quests = {
          ...m.quests || {},
          dotCast1000: !0,
          checkedDotCast1000: !0
        }) : m.quests = {
          ...m.quests || {},
          checkedDotCast1000: !1
        };
      }
    } finally {
      await memcache.delete(getHash(`fartap:quest:lock:${s}:claiming:` + JSON.stringify(o)));
    }
  }
  await cacheService.set({
    key: n,
    params: {
      accountId: s
    },
    value: JSON.stringify(m),
    expiresAt: null
  });
  p = new _ScoreService(), await t.context.account.populate("addresses"), r = await getFartapScoreType();
  return await p.setScore({
    address: t.context.account.addresses[0].address,
    score: Math.floor(f),
    scoreType: r,
    shouldRecord: !1
  }), a.json({
    success: !0,
    data: m
  });
}), module.exports = {
  router: app
};