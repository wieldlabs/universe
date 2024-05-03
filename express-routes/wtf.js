const app = require("express").Router(), Sentry = require("@sentry/node"), rateLimit = require("express-rate-limit"), ethers = require("ethers"), factoryContractAbi = require("../helpers/abi/public-mint-nft-capped-factory.json"), nftAbi = require("../helpers/abi/public-mint-nft.json"), axios = require("axios"), frameContext = require("../helpers/farcaster-utils")["frameContext"], {
  getFarcasterUserAndLinksByFid,
  getFarcasterCastByShortHash,
  getFarcasterCastByHash
} = require("../helpers/farcaster"), config = require("../helpers/constants/config")["config"], Contract = require("../models/wallet/Contract")["Contract"], Token = require("../models/wallet/Token")["Token"], CacheService = require("../services/cache/CacheService")["Service"], cacheService = new CacheService(), generateImageWithText = require("../helpers/generate-image")["generateImageWithText"], crypto = require("crypto"), heavyLimiter = rateLimit({
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
}), ACTION_URL = "https://warpcast.com/~/add-cast-action?url=https%3A%2F%2Fbuild.far.quest%2Fwtf%2Fv1%2Fframes%2Fadd-action", MAX_MINT_COUNT = 500, CHANNEL_URL = "https://warpcast.com/~/channel/whoami", factoryContractAddress = "0x831f011B38Fd707229B2D1fCF3C8a1964200c9fe", factoryContractInterfaceType = "WTF1";

async function findCastImageFromHash(t) {
  return t ? (t = await getFarcasterCastByHash(t))?.embeds?.images?.[0]?.url || t?.embeds?.urls?.[0]?.openGraph?.image || t?.embeds?.urls?.[1]?.openGraph?.image || t?.embeds?.quoteCasts?.[0]?.embeds?.images?.[0]?.url || t?.embeds?.quoteCasts?.[0]?.embeds?.urls?.[0]?.openGraph?.image || t?.embeds?.quoteCasts?.[0]?.embeds?.urls?.[1]?.openGraph?.image || t?.embeds?.quoteCasts?.[1]?.embeds?.images?.[0]?.url || t?.embeds?.quoteCasts?.[1]?.embeds?.urls?.[0]?.openGraph?.image || t?.embeds?.quoteCasts?.[1]?.embeds?.urls?.[1]?.openGraph?.image : null;
}

async function createContract({
  name: e,
  symbol: a,
  totalCap: r,
  ownerAddress: n,
  baseUrl: o
}) {
  try {
    if (!(e && a && r && n)) throw new Error("Missing required fields!");
    var c = process.env.FARCAST_KEY, s = ethers.Wallet.fromMnemonic(c), m = new ethers.providers.JsonRpcProvider("https://rpc.degen.tips", 666666666), i = s.connect(m), p = await new ethers.Contract(factoryContractAddress, factoryContractAbi.abi, i).deployCappedNFTContract(e, a, r, n, o), f = (console.log("Deploying mint contract"), 
    console.log(p), await p.wait());
    let t;
    var d = (f.events || []).find(t => "ContractDeployed" === t.event);
    return d ? (t = d.args[0], console.log("New contract deployed at address: " + t)) : console.log("No 'ContractDeployed' event found."), 
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
    var n = a.setData?.metadata?.filter(t => t.percentage && 0 < t.percentage);
    const o = n.reduce((t, e) => t + e.percentage, 0);
    let e = 0;
    n = n.map(t => (e += t.percentage / o * 1e4, {
      ...t,
      cumulativePercentage: e
    }));
    const c = crypto.randomInt(1, 10001);
    n = n.find(t => c <= t.cumulativePercentage);
    return n ? (a = {
      contractAddress: r,
      contract: a._id,
      tokenId: t,
      tokenType: "ERC721",
      metadata: {
        name: n.name,
        imageUrl: n.imageUrl,
        rawImageUrl: n.rawImageUrl,
        description: n.description
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
});

const getMemcachedClient = require("../connectmemcached")["getMemcachedClient"], Reactions = require("../models/farcaster")["Reactions"];

async function mint({
  to: t,
  contractAddress: e
}) {
  try {
    var a = new ethers.providers.JsonRpcProvider("https://rpc.degen.tips", 666666666), r = process.env.FARCAST_KEY, n = ethers.Wallet.fromMnemonic(r).connect(a), o = await new ethers.Contract(factoryContractAddress, factoryContractAbi.abi, n).mintNftContract(e, t);
    return console.log(`Mint successful for address: ${t}, txHash: ` + o.hash), 
    o;
  } catch (t) {
    throw console.error("Error in mintIfWhitelisted: " + t), t;
  }
}

app.post("/v1/contracts/:contractId/frames/post_url", [ lightLimiter, frameContext ], async (a, t) => {
  var {
    step: e,
    mustFollow: r,
    mustLikeAndRecast: n
  } = a.query;
  let o, c, s;
  var m = a.context.connectedAddress, i = a.context.isExternal ? m : a.context.frameData.fid;
  if (!m) return t.status(401).json({
    success: !1,
    message: "Unauthorized"
  });
  let p;
  var f = getMemcachedClient(), d = "contract:" + a.params.contractId;
  try {
    var u = await f.get(d);
    u ? p = JSON.parse(u.value) : (p = await Contract.findById(a.params.contractId), 
    await f.set(d, JSON.stringify(p), {
      lifetime: 604800
    }));
  } catch (t) {
    p = await Contract.findById(a.params.contractId);
  }
  if (!p || !p.metadata?.frame) return t.status(404).json({
    success: !1,
    message: "No Contract Frame found"
  });
  switch (e) {
   case void 0:
    o = p.metadata.frame.frameImageUrl, c = config().DEFAULT_URI + `/wtf/v1/contracts/${p._id}/frames/post_url?step=mint`, 
    s = `
        <meta property="fc:frame:button:1:action" content="post" />
        <meta property="fc:frame:button:1" content="Mint" />
      `;
    break;

   case "mint":
    {
      if (!p.isVerified) throw new Error("Contract is not verified");
      var l = await cacheService.get({
        key: "Wtf:Frame:Minted",
        params: {
          connectedAddress: m,
          contractId: p._id
        }
      });
      if (l && "development" !== process.env.NODE_ENV) {
        o = "https://i.imgur.com/yByoglU.png", c = "";
        var y = "https://far.quest/contracts/degen/" + p.slug, y = `https://warpcast.com/~/compose?text=${encodeURIComponent("Mint " + p.metadata?.name + " for free ✨\n\n" + y)}&embeds[]=${y}&rand=` + Math.random().toString().slice(0, 7);
        s = `
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
      let t = !0, e = {};
      if (r && r.toString() !== i.toString() && (l = await getFarcasterUserAndLinksByFid({
        fid: r,
        context: {
          fid: i
        }
      }), e = l, t = l.isFollowing), !t) {
        o = "https://i.imgur.com/Bvfd03f.png", c = config().DEFAULT_URI + `/wtf/v1/contracts/${p._id}/frames/post_url?step=mint&mustFollow=` + r + (n ? "&mustLikeAndRecast=" + n : ""), 
        s = `
          <meta property="fc:frame:button:1:action" content="link" />
          <meta property="fc:frame:button:1:target" content="https://warpcast.com/${e.username}" />
          <meta property="fc:frame:button:1" content="${e.username}" />
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
      if (n) {
        let t;
        a.context.frameData?.frameActionBody?.castId?.hash && (t = "0x" + Buffer.from(a.context.frameData?.frameActionBody?.castId?.hash).toString("hex"));
        var [ y, l ] = await Promise.all([ Reactions.exists({
          targetHash: t,
          deletedAt: null,
          fid: i,
          reactionType: 1
        }), Reactions.exists({
          targetHash: t,
          deletedAt: null,
          reactionType: 2,
          fid: i
        }) ]);
        if (!y || !l) {
          o = "https://i.imgur.com/3urlLNk.png", c = config().DEFAULT_URI + `/wtf/v1/contracts/${p._id}/frames/post_url?step=mint&mustLikeAndRecast=` + n, 
          s = `
          <meta property="fc:frame:button:1:action" content="post" />
          <meta property="fc:frame:button:1" content="Mint ➡️" />
          <meta property="fc:frame:button:2:action" content="post" />
          <meta property="fc:frame:button:2" content="try again 🔄" />
        `;
          break;
        }
      }
      try {
        var g = await mint({
          to: m,
          contractAddress: p.address
        }), h = g?.hash;
        if (o = "https://i.imgur.com/MfWeABe.png", p.isSet) {
          var b = ((await g.wait()).events?.find(t => "Transfer" === t.event))?.args?.[2];
          if (b) try {
            var w = await createContractSetToken({
              contract: p,
              tokenId: b.toString()
            });
            o = w?.metadata?.rawImageUrl || w?.metadata?.imageUrl || o;
          } catch (t) {
            console.error(t);
          }
        }
        await Promise.all([ cacheService.set({
          key: "Wtf:Frame:Minted",
          params: {
            connectedAddress: m,
            contractId: p._id
          },
          value: h,
          expiresAt: null
        }) ]), c = "";
        var C = "https://explorer.degen.tips/tx/" + h, v = "https://far.quest/contracts/degen/" + p.slug, A = `https://warpcast.com/~/compose?text=${encodeURIComponent("Mint " + p.metadata?.name + " for free ✨\n\n" + v)}&embeds[]=${v}&rand=` + Math.random().toString().slice(0, 7);
        s = `
          <meta property="fc:frame:button:1" content="View Tx" />
          <meta property="fc:frame:button:1:action" content="link" />
          <meta property="fc:frame:button:1:target" content="${C}" />

          <meta property="fc:frame:button:2" content="Share Mint" />
          <meta property="fc:frame:button:2:action" content="link" />
          <meta property="fc:frame:button:2:target" content="${A}" />

             
          <meta property="fc:frame:button:3" content="Install Action" />
          <meta property="fc:frame:button:3:action" content="link" />
          <meta property="fc:frame:button:3:target" content="${ACTION_URL}" />


          <meta property="fc:frame:button:4" content="Create with /whoami" />
          <meta property="fc:frame:button:4:action" content="link" />
          <meta property="fc:frame:button:4:target" content="${CHANNEL_URL}" />
        `;
      } catch (t) {
        console.error(t), o = "https://i.imgur.com/zSqLZoV.png", c = "", s = `
             
          <meta property="fc:frame:button:1" content="Install Action" />
          <meta property="fc:frame:button:1:action" content="link" />
          <meta property="fc:frame:button:1:target" content="${ACTION_URL}" />

          <meta property="fc:frame:button:2" content="Create with /whoami" />
          <meta property="fc:frame:button:2:action" content="link" />
          <meta property="fc:frame:button:2:target" content="${CHANNEL_URL}" />
        `;
      }
      break;
    }

   default:
    o = p.metadata.frame.frameImageUrl, c = config().DEFAULT_URI + `/wtf/v1/contracts/${p._id}/frames/post_url?step=mint`, 
    s = `
        <meta property="fc:frame:button:1:action" content="post" />
        <meta property="fc:frame:button:1" content="Mint" />
      `;
  }
  u = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta property="fc:frame" content="vNext" />
        <meta property="fc:frame:image" content="${o}" />
        <meta property="fc:frame:post_url" content="${c}" />
        <meta property="fc:frame:image:aspect_ratio" content="1:1" />
        ${s}
      </head>
    </html>`;
  t.setHeader("Content-Type", "text/html"), t.send(u);
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

app.post("/v1/frames/create/post_url", frameContext, async (e, t) => {
  const {
    step: a,
    image: r
  } = e.query;
  let n = "", o;
  var c = config().DEFAULT_URI + "/wtf/v1/frames/create/post_url";
  switch (a) {
   case "fillImage":
    o = "https://i.imgur.com/65Z0lgC.png", n = `
          <meta property="fc:frame:input:text" content="Image url or Cast url" />
          <meta property="fc:frame:button:1" content="Next" />
          <meta property="fc:frame:button:1:action" content="post" />
          <meta property="fc:frame:post_url" content="${c}?step=requireFollow" />
        `;
    break;

   case "requireFollow":
    if (e.context?.untrustedData?.inputText) {
      let t = e.context.untrustedData.inputText;
      isWarpcastOrFarquestCastHash(t) && (s = t.replace("https://warpcast.com", "").replace("https://far.quest", "").split("/"), 
      s = await getFarcasterCastByShortHash(s?.[2], s?.[1])) && (t = "https://client.warpcast.com/v2/cast-image?castHash=" + s.hash), 
      o = "https://i.imgur.com/oMUBXnr.png", n = `
                <meta property="fc:frame:button:1" content="Yes" />
          <meta property="fc:frame:button:1:action" content="post" />
                <meta property="fc:frame:button:2" content="No" />
          <meta property="fc:frame:button:2:action" content="post" />
          <meta property="fc:frame:post_url" content="${c}?step=mustLikeAndRecast&image=${encodeURIComponent(t)}" />
      `;
    } else o = "https://i.imgur.com/65Z0lgC.png", n = `
          <meta property="fc:frame:input:text" content="Image or Cast url is required." />
          <meta property="fc:frame:button:1" content="Next" />
          <meta property="fc:frame:button:1:action" content="post" />
          <meta property="fc:frame:post_url" content="${c}?step=requireFollow" />
        `;
    break;

   case "mustLikeAndRecast":
    var s = 1 === parseInt(e.body?.untrustedData?.buttonIndex) ? e.context.frameData.fid : null;
    o = "https://i.imgur.com/PgFh6wI.png", n = `
                <meta property="fc:frame:button:1" content="Yes" />
          <meta property="fc:frame:button:1:action" content="post" />
                <meta property="fc:frame:button:2" content="No" />
          <meta property="fc:frame:button:2:action" content="post" />
          <meta property="fc:frame:post_url" content="${c}?step=fillName${s ? "&mustFollow=" + s : ""}&image=${encodeURIComponent(r)}" />
        `;
    break;

   case "fillName":
    var s = e.query.mustFollow, m = 1 === parseInt(e.body?.untrustedData?.buttonIndex) || e.query.mustLikeAndRecast ? "true" : null, i = (o = /\.(jpeg|jpg|gif|png|svg)$/.test(r) ? r : config().DEFAULT_URI + ("/contracts/v1/images?image=" + encodeURIComponent(r)), 
    r?.startsWith("https://client.warpcast.com/v2/cast-image"));
    if (i) try {
      var p = await findCastImageFromHash(new URL(r).searchParams.get("castHash"));
      if (p) {
        n = `
        <meta property="fc:frame:input:text" content="Name (Optional)" />
        <meta property="fc:frame:button:1" content="Start Over" />
          <meta property="fc:frame:button:1:action" content="post" />
          <meta property="fc:frame:button:1:post_url" content="${c}?step=fillImage" />

          <meta property="fc:frame:button:2" content="Use post's image" />
          <meta property="fc:frame:button:2:action" content="post" />
          <meta property="fc:frame:button:2:post_url" content="${c}?step=fillName${s ? "&mustFollow=" + s : ""}${m ? "&mustLikeAndRecast=" + m : ""}&image=${encodeURIComponent(p)}"/>

        <meta property="fc:frame:button:3" content="Create Free Mint ✨" />
          <meta property="fc:frame:button:3:action" content="post" />
          <meta property="fc:frame:post_url" content="${c}?step=confirm${s ? "&mustFollow=" + s : ""}${m ? "&mustLikeAndRecast=" + m : ""}&image=${encodeURIComponent(r)}" />
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
          <meta property="fc:frame:button:1:post_url" content="${c}?step=fillImage" />

        <meta property="fc:frame:button:2" content="Create Free Mint ✨" />
          <meta property="fc:frame:button:2:action" content="post" />
          <meta property="fc:frame:post_url" content="${c}?step=confirm${s ? "&mustFollow=" + s : ""}${m ? "&mustLikeAndRecast=" + m : ""}&image=${encodeURIComponent(r)}" />
        `;
    break;

   case "confirm":
    {
      o = "https://far.quest/assets/frameSuccess.png";
      i = /\.(jpeg|jpg|gif|png|svg)$/.test(r) ? r : config().DEFAULT_URI + ("/contracts/v1/images?image=" + encodeURIComponent(r));
      const d = e.context.untrustedData.inputText || "Untitled-" + Math.random().toString().slice(0, 4);
      p = "https://far.quest/contracts/degen/" + (await handleCreateContractRequest({
        body: {
          name: d,
          image: i,
          rawImage: r,
          symbol: "FARQUEST",
          ownerAddress: e.context.connectedAddress,
          mustFollow: e.query.mustFollow,
          mustLikeAndRecast: e.query.mustLikeAndRecast
        }
      })).contract.slug, s = `https://warpcast.com/~/compose?text=${encodeURIComponent("Mint " + d + " for free ✨\n\n" + p)}&embeds[]=${p}&rand=` + Math.random().toString().slice(0, 7);
      n = `
      <meta property="fc:frame:button:1" content="Install Action" />
          <meta property="fc:frame:button:1:action" content="link" />
          <meta property="fc:frame:button:1:target" content="${ACTION_URL}" />

      <meta property="fc:frame:button:2" content="Share free mint link" />
          <meta property="fc:frame:button:2:action" content="link" />
          <meta property="fc:frame:button:2:target" content="${s}" />
      `;
      break;
    }

   default:
    n = `
        <meta property="fc:frame:input:text" content="Error: Invalid step provided." />
      `;
  }
  var f = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta property="fc:frame" content="vNext" />
        <meta property="fc:frame:image" content="${o}" />
        <meta property="fc:frame:image:aspect_ratio" content="1:1" />
        ${n}
      </head>
    </html>`;
  t.setHeader("Content-Type", "text/html"), t.send(f);
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
  var a, r = t.query["v2"], n = t.body?.untrustedData?.castId?.hash;
  return n ? (a = t.context.frameData["fid"], a = {
    mustFollow: a,
    mustLikeAndRecast: "true",
    image: "https://client.warpcast.com/v2/cast-image?castHash=" + n
  }, r ? (r = "https://far.quest/contracts/degen/" + (await handleCreateContractRequest({
    body: {
      name: "" + n?.slice(2, 8),
      image: a.image,
      rawImage: a.image,
      symbol: "FARQUEST",
      ownerAddress: t.context.connectedAddress,
      mustFollow: a.mustFollow,
      mustLikeAndRecast: a.mustLikeAndRecast
    }
  })).contract.slug, e.status(200).json({
    message: "Success! Share: " + r
  })) : (n = config().DEFAULT_URI + "/wtf/v1/frames/create/post_url", e.status(200).json({
    type: "frame",
    frameUrl: n + `?step=fillName&${a.mustFollow ? "&mustFollow=" + a.mustFollow : ""}&${a.mustLikeAndRecast ? "&mustLikeAndRecast=" + a.mustLikeAndRecast : ""}&image=` + encodeURIComponent(a.image)
  }))) : e.status(400).json({
    message: "Invalid Cast ID!"
  });
}), module.exports = {
  router: app
};