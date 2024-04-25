const app = require("express").Router(), Sentry = require("@sentry/node"), rateLimit = require("express-rate-limit"), ethers = require("ethers"), factoryContractAbi = require("../helpers/abi/public-mint-nft-capped-factory.json"), nftAbi = require("../helpers/abi/public-mint-nft.json"), axios = require("axios"), frameContext = require("../helpers/farcaster-utils")["frameContext"], {
  getFarcasterUserAndLinksByFid,
  getFarcasterCastByShortHash
} = require("../helpers/farcaster"), config = require("../helpers/constants/config")["config"], Contract = require("../models/wallet/Contract")["Contract"], CacheService = require("../services/cache/CacheService")["Service"], cacheService = new CacheService(), generateImageWithText = require("../helpers/generate-image")["generateImageWithText"], heavyLimiter = rateLimit({
  windowMs: 6e4,
  max: 100,
  message: "Too many requests! See docs.far.quest for more info.",
  validate: {
    limit: !1
  }
}), MAX_MINT_COUNT = 500, factoryContractAddress = "0x831f011B38Fd707229B2D1fCF3C8a1964200c9fe", factoryContractInterfaceType = "WTF1";

async function createContract({
  name: e,
  symbol: a,
  totalCap: r,
  ownerAddress: o,
  baseUrl: n
}) {
  try {
    if (!(e && a && r && o)) throw new Error("Missing required fields!");
    var c = process.env.FARCAST_KEY, s = ethers.Wallet.fromMnemonic(c), m = new ethers.providers.JsonRpcProvider("https://rpc.degen.tips", 666666666), i = s.connect(m), p = await new ethers.Contract(factoryContractAddress, factoryContractAbi.abi, i).deployCappedNFTContract(e, a, r, o, n), f = (console.log("Deploying mint contract"), 
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
  }, await e.save(), {
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
    var a = new ethers.providers.JsonRpcProvider("https://rpc.degen.tips", 666666666), r = process.env.FARCAST_KEY, o = ethers.Wallet.fromMnemonic(r).connect(a), n = await new ethers.Contract(factoryContractAddress, factoryContractAbi.abi, o).mintNftContract(e, t);
    return console.log(`Mint successful for address: ${t}, txHash: ` + n.hash), 
    n.hash;
  } catch (t) {
    throw console.error("Error in mintIfWhitelisted: " + t), t;
  }
}

app.post("/v1/contracts/:contractId/frames/post_url", frameContext, async (a, t) => {
  var {
    step: e,
    mustFollow: r,
    mustLikeAndRecast: o
  } = a.query;
  let n, c, s;
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
    n = p.metadata.frame.frameImageUrl, c = config().DEFAULT_URI + `/wtf/v1/contracts/${p._id}/frames/post_url?step=mint`, 
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
      if (l) {
        n = config().DEFAULT_URI + `/wtf/v1/frames/image?image=${encodeURIComponent(p.metadata.frame.frameImageUrl)}&text=Already%20Minted!`, 
        c = "";
        s = `
          <meta property="fc:frame:button:1" content="View Tx" />
          <meta property="fc:frame:button:1:action" content="link" />
          <meta property="fc:frame:button:1:target" content="https://explorer.degen.tips/tx/${l}" />

          <meta property="fc:frame:button:2" content="Create with /whoami" />
          <meta property="fc:frame:button:2:action" content="link" />
          <meta property="fc:frame:button:2:target" content="https://warpcast.com/~/channel/whoami" />
        `;
        break;
      }
      var l = "Wtf:Frame:MintCount", y = await f.get(l + ":" + p._id);
      if ((y = y ? parseInt(y.value) : 0) >= MAX_MINT_COUNT) {
        n = config().DEFAULT_URI + `/wtf/v1/frames/image?image=${encodeURIComponent(p.metadata.frame.frameImageUrl)}&text=Mint%20Closed`, 
        c = "", s = `
          <meta property="fc:frame:button:1" content="Mint Closed" />
          <meta property="fc:frame:button:1:action" content="post" />
          <meta property="fc:frame:button:2" content="Create with /whoami" />
          <meta property="fc:frame:button:2:action" content="link" />
          <meta property="fc:frame:button:2:target" content="https://warpcast.com/~/channel/whoami" />
        `;
        break;
      }
      let t = !0, e = {};
      if (r && r.toString() !== i.toString() && (g = await getFarcasterUserAndLinksByFid({
        fid: r,
        context: {
          fid: i
        }
      }), e = g, t = g.isFollowing), !t) {
        n = "https://i.imgur.com/Bvfd03f.png", c = config().DEFAULT_URI + `/wtf/v1/contracts/${p._id}/frames/post_url?step=mint&mustFollow=` + r + (o ? "&mustLikeAndRecast=" + o : ""), 
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
      if (o) {
        let t;
        a.context.frameData?.frameActionBody?.castId?.hash && (t = "0x" + Buffer.from(a.context.frameData?.frameActionBody?.castId?.hash).toString("hex"));
        var [ g, h ] = await Promise.all([ Reactions.exists({
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
        if (!g || !h) {
          n = "https://i.imgur.com/3urlLNk.png", c = config().DEFAULT_URI + `/wtf/v1/contracts/${p._id}/frames/post_url?step=mint&mustLikeAndRecast=` + o, 
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
        var b = await mint({
          to: m,
          contractAddress: p.address
        }), w = (await Promise.all([ cacheService.set({
          key: "Wtf:Frame:Minted",
          params: {
            connectedAddress: m,
            contractId: p._id
          },
          value: b,
          expiresAt: null
        }), y ? f.incr(l + ":" + p._id, 1, {
          noreply: !0
        }) : f.set(l + ":" + p._id, 1, {
          noreply: !0
        }) ]), n = "https://i.imgur.com/0lBFB2h.png", c = "", "https://explorer.degen.tips/tx/" + b), C = "https://far.quest/contracts/create-mint";
        encodeURIComponent("Create your free degen mint (gasless!) with this frame 🎩 " + C), 
        Math.random().toString().slice(0, 7);
        s = `
          <meta property="fc:frame:button:1" content="View Tx" />
          <meta property="fc:frame:button:1:action" content="link" />
          <meta property="fc:frame:button:1:target" content="${w}" />

          <meta property="fc:frame:button:2" content="Create with /whoami" />
          <meta property="fc:frame:button:2:action" content="link" />
          <meta property="fc:frame:button:2:target" content="https://warpcast.com/~/channel/whoami" />
        `;
      } catch (t) {
        console.error(t), n = config().DEFAULT_URI + (`/wtf/v1/frames/image?image=${encodeURIComponent(p.metadata.frame.frameImageUrl)}&text=` + encodeURIComponent("Minted Out")), 
        c = "", s = `
          <meta property="fc:frame:button:1" content="Create free mint in /whoami" />
          <meta property="fc:frame:button:1:action" content="link" />
          <meta property="fc:frame:button:1:target" content="https://warpcast.com/~/channel/whoami" />
        `;
      }
      break;
    }

   default:
    n = p.metadata.frame.frameImageUrl, c = config().DEFAULT_URI + `/wtf/v1/contracts/${p._id}/frames/post_url?step=mint`, 
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
        <meta property="fc:frame:image" content="${n}" />
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

const isWarpcastHash = t => {
  var e = new RegExp("https?:\\/\\/warpcast.com\\/([a-zA-Z0-9_.-]+)\\/(0x[a-f0-9]+)", "gi");
  return t.match(e);
};

app.post("/v1/frames/create/post_url", frameContext, async (e, t) => {
  const {
    step: a,
    image: r
  } = e.query;
  let o = "", n;
  var c = config().DEFAULT_URI + "/wtf/v1/frames/create/post_url";
  switch (a) {
   case "fillImage":
    n = "https://far.quest/assets/fillImage.png", o = `
          <meta property="fc:frame:input:text" content="Image url or Cast url" />
          <meta property="fc:frame:button:1" content="Next" />
          <meta property="fc:frame:button:1:action" content="post" />
          <meta property="fc:frame:post_url" content="${c}?step=requireFollow" />
        `;
    break;

   case "requireFollow":
    if (e.context?.untrustedData?.inputText) {
      let t = e.context.untrustedData.inputText;
      isWarpcastHash(t) && (s = t.replace("https://warpcast.com", "").split("/"), 
      s = await getFarcasterCastByShortHash(s?.[2], s?.[1])) && (t = "https://client.warpcast.com/v2/cast-image?castHash=" + s.hash), 
      n = "https://far.quest/assets/mustFollow.png", o = `
                <meta property="fc:frame:button:1" content="Yes" />
          <meta property="fc:frame:button:1:action" content="post" />
                <meta property="fc:frame:button:2" content="No" />
          <meta property="fc:frame:button:2:action" content="post" />
          <meta property="fc:frame:post_url" content="${c}?step=mustLikeAndRecast&image=${encodeURIComponent(t)}" />
      `;
    } else n = "https://far.quest/assets/fillImage.png", o = `
          <meta property="fc:frame:input:text" content="Image or Cast url is required." />
          <meta property="fc:frame:button:1" content="Next" />
          <meta property="fc:frame:button:1:action" content="post" />
          <meta property="fc:frame:post_url" content="${c}?step=requireFollow" />
        `;
    break;

   case "mustLikeAndRecast":
    var s = 1 === parseInt(e.body?.untrustedData?.buttonIndex) ? e.context.frameData.fid : null;
    n = "https://i.imgur.com/7dg2SRZ.png", o = `
                <meta property="fc:frame:button:1" content="Yes" />
          <meta property="fc:frame:button:1:action" content="post" />
                <meta property="fc:frame:button:2" content="No" />
          <meta property="fc:frame:button:2:action" content="post" />
          <meta property="fc:frame:post_url" content="${c}?step=fillName${s ? "&mustFollow=" + s : ""}&image=${encodeURIComponent(r)}" />
        `;
    break;

   case "fillName":
    var s = e.query.mustFollow, m = 1 === parseInt(e.body?.untrustedData?.buttonIndex) ? "true" : null;
    n = /\.(jpeg|jpg|gif|png|svg)$/.test(r) ? r : config().DEFAULT_URI + ("/contracts/v1/images?image=" + encodeURIComponent(r)), 
    o = `
        <meta property="fc:frame:input:text" content="Name (Optional)" />
        <meta property="fc:frame:button:1" content="Create Free Mint ✨" />
          <meta property="fc:frame:button:1:action" content="post" />
          <meta property="fc:frame:post_url" content="${c}?step=confirm${s ? "&mustFollow=" + s : ""}${m ? "&mustLikeAndRecast=" + m : ""}&image=${encodeURIComponent(r)}" />
        `;
    break;

   case "confirm":
    {
      n = "https://far.quest/assets/frameSuccess.png";
      s = /\.(jpeg|jpg|gif|png|svg)$/.test(r) ? r : config().DEFAULT_URI + ("/contracts/v1/images?image=" + encodeURIComponent(r));
      const p = e.context.untrustedData.inputText || "Untitiled";
      m = "https://far.quest/contracts/degen/" + (await handleCreateContractRequest({
        body: {
          name: p,
          image: s,
          rawImage: r,
          symbol: "FARQUEST",
          ownerAddress: e.context.connectedAddress,
          mustFollow: e.query.mustFollow,
          mustLikeAndRecast: e.query.mustLikeAndRecast
        }
      })).contract.slug, s = `https://warpcast.com/~/compose?text=${encodeURIComponent("Mint " + p + " for free ✨\n\n" + m)}&embeds[]=${m}&rand=` + Math.random().toString().slice(0, 7);
      o = `
      <meta property="fc:frame:button:1" content="Share free mint link" />
          <meta property="fc:frame:button:1:action" content="link" />
          <meta property="fc:frame:button:1:target" content="${s}" />
      `;
      break;
    }

   default:
    o = `
        <meta property="fc:frame:input:text" content="Error: Invalid step provided." />
      `;
  }
  var i = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta property="fc:frame" content="vNext" />
        <meta property="fc:frame:image" content="${n}" />
        <meta property="fc:frame:image:aspect_ratio" content="1:1" />
        ${o}
      </head>
    </html>`;
  t.setHeader("Content-Type", "text/html"), t.send(i);
}), module.exports = {
  router: app
};