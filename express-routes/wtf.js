const app = require("express").Router(), Sentry = require("@sentry/node"), rateLimit = require("express-rate-limit"), ethers = require("ethers"), factoryContractAbi = require("../helpers/abi/public-mint-nft-capped-factory.json"), nftAbi = require("../helpers/abi/public-mint-nft.json"), axios = require("axios"), frameContext = require("../helpers/farcaster-utils")["frameContext"], getFarcasterUserAndLinksByFid = require("../helpers/farcaster")["getFarcasterUserAndLinksByFid"], config = require("../helpers/constants/config")["config"], Contract = require("../models/wallet/Contract")["Contract"], CacheService = require("../services/cache/CacheService")["Service"], cacheService = new CacheService(), generateImageWithText = require("../helpers/generate-image")["generateImageWithText"], heavyLimiter = rateLimit({
  windowMs: 6e4,
  max: 100,
  message: "Too many requests! See docs.far.quest for more info.",
  validate: {
    limit: !1
  }
}), MAX_MINT_COUNT = 1e3, factoryContractAddress = "0x831f011B38Fd707229B2D1fCF3C8a1964200c9fe", factoryContractInterfaceType = "WTF1";

async function createContract({
  name: e,
  symbol: a,
  totalCap: r,
  ownerAddress: o,
  baseUrl: n
}) {
  try {
    if (!(e && a && r && o)) throw new Error("Missing required fields!");
    var c = process.env.FARCAST_KEY, s = ethers.Wallet.fromMnemonic(c), i = new ethers.providers.JsonRpcProvider("https://rpc.degen.tips", 666666666), m = s.connect(i), p = await new ethers.Contract(factoryContractAddress, factoryContractAbi.abi, m).deployCappedNFTContract(e, a, r, o, n), f = (console.log(p), 
    await p.wait());
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
    description: t.body.description,
    externalUrl: "https://cast.wtf",
    frame: {
      frameImageUrl: t.body.image,
      framePostUrl: config().DEFAULT_URI + `/wtf/v1/contracts/${e._id}/frames/post_url?step=mint` + (t.body.mustFollow ? "&mustFollow=" + t.body.mustFollow : ""),
      image: t.body.image,
      title: "Free Mint | " + t.body.name,
      description: "Free Mint | " + t.body.name,
      domain: "far.quest",
      frameButton1: {
        text: "Free Mint",
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
  if ("production" === process.env.NODE_ENV) return e.json({
    code: "403",
    success: !1,
    message: "This endpoint is not available in production!"
  });
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

const getMemcachedClient = require("../connectmemcached")["getMemcachedClient"];

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

app.post("/v1/contracts/:contractId/frames/post_url", frameContext, async (e, t) => {
  var {
    step: a,
    mustFollow: r
  } = e.query;
  let o, n, c;
  var s = e.context.connectedAddress, i = e.context.isExternal ? s : e.context.frameData.fid;
  if (!s) return t.status(401).json({
    success: !1,
    message: "Unauthorized"
  });
  let m;
  var p = getMemcachedClient(), f = "contract:" + e.params.contractId;
  try {
    var d = await p.get(f);
    d ? m = JSON.parse(d.value) : (m = await Contract.findById(e.params.contractId), 
    await p.set(f, JSON.stringify(m), {
      lifetime: 604800
    }));
  } catch (t) {
    m = await Contract.findById(e.params.contractId);
  }
  if (!m || !m.metadata?.frame) return t.status(404).json({
    success: !1,
    message: "No Contract Frame found"
  });
  switch (a) {
   case void 0:
    o = m.metadata.frame.frameImageUrl, n = config().DEFAULT_URI + `/wtf/v1/contracts/${m._id}/frames/post_url?step=mint`, 
    c = `
        <meta property="fc:frame:button:1:action" content="post" />
        <meta property="fc:frame:button:1" content="Mint" />
      `;
    break;

   case "mint":
    {
      if (!m.isVerified) throw new Error("Contract is not verified");
      var l, u = await cacheService.get({
        key: "Wtf:Frame:Minted",
        params: {
          connectedAddress: s,
          contractId: m._id
        }
      }), y = "Wtf:Frame:MintCount", g = await cacheService.get({
        key: y,
        params: {
          contractId: m._id
        }
      });
      if ((g = g ? parseInt(g) : 0) >= MAX_MINT_COUNT) {
        o = config().DEFAULT_URI + `/wtf/v1/frames/image?image=${encodeURIComponent(m.metadata.frame.frameImageUrl)}&text=Mint%20Closed`, 
        n = "", c = `
          <meta property="fc:frame:button:1" content="Mint Closed" />
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
        o = config().DEFAULT_URI + `/wtf/v1/frames/image?image=${encodeURIComponent(m.metadata.frame.frameImageUrl)}&text=Follow`, 
        n = config().DEFAULT_URI + `/wtf/v1/contracts/${m._id}/frames/post_url?step=mint&mustFollow=` + r, 
        c = `
          <meta property="fc:frame:button:1:action" content="link" />
          <meta property="fc:frame:button:1:target" content="https://warpcast.com/${e.username}" />
          <meta property="fc:frame:button:1" content="Follow ${e.username}" />
          <meta property="fc:frame:button:2:action" content="post" />
          <meta property="fc:frame:button:2" content="Try Again" />
        `;
        break;
      }
      if (u) o = config().DEFAULT_URI + `/wtf/v1/frames/image?image=${encodeURIComponent(m.metadata.frame.frameImageUrl)}&text=Already%20Minted!`, 
      n = "", c = `
          <meta property="fc:frame:button:1" content="Already Minted! View Tx Hash" />
          <meta property="fc:frame:button:1:action" content="link" />
          <meta property="fc:frame:button:1:target" content="https://explorer.degen.tips/tx/${u}" />
        `; else try {
        var h = await mint({
          to: s,
          contractAddress: m.address
        }), b = (await cacheService.set({
          key: "Wtf:Frame:Minted",
          params: {
            connectedAddress: s,
            contractId: m._id
          },
          value: h,
          expiresAt: new Date(Date.now() + 36e5)
        }), await cacheService.set({
          key: y,
          value: (g + 1).toString()
        }), o = "https://far.quest/assets/followMint.png", n = "", "https://far.quest/contracts/create-mint"), w = `https://warpcast.com/~/compose?text=${encodeURIComponent("Create your free degen mint with this frame 🎩 " + b)}&embeds[]=${b}&rand=` + Math.random().toString().slice(0, 7);
        c = `
              <meta property="fc:frame:button:1" content="Follow @jc" />
          <meta property="fc:frame:button:1:action" content="link" />
          <meta property="fc:frame:button:1:target" content="https://warpcast.com/jc" />
              <meta property="fc:frame:button:2" content="Follow @n" />
          <meta property="fc:frame:button:2:action" content="link" />
          <meta property="fc:frame:button:2:target" content="https://warpcast.com/n" />
          <meta property="fc:frame:button:3" content="Share to create your free mint" />
          <meta property="fc:frame:button:3:action" content="link" />
          <meta property="fc:frame:button:3:target" content="${w}" />
        `;
      } catch (t) {
        console.error(t), o = config().DEFAULT_URI + `/wtf/v1/frames/image?image=${encodeURIComponent(m.metadata.frame.frameImageUrl)}&text=Something%20went%20wrong`, 
        n = "", c = `
          <meta property="fc:frame:button:1" content="Something went wrong. Please try again." />
        `;
      }
      break;
    }

   default:
    o = m.metadata.frame.frameImageUrl, n = config().DEFAULT_URI + `/wtf/v1/contracts/${m._id}/frames/post_url?step=mint`, 
    c = `
        <meta property="fc:frame:button:1:action" content="post" />
        <meta property="fc:frame:button:1" content="Mint" />
      `;
  }
  d = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta property="fc:frame" content="vNext" />
        <meta property="fc:frame:image" content="${o}" />
        <meta property="fc:frame:post_url" content="${n}" />
        <meta property="fc:frame:image:aspect_ratio" content="1:1" />
        ${c}
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
}), app.post("/v1/frames/create/post_url", frameContext, async (t, e) => {
  var {
    step: a,
    image: r
  } = t.query;
  let o = "", n;
  var c = config().DEFAULT_URI + "/wtf/v1/frames/create/post_url";
  switch (a) {
   case "fillImage":
    n = "https://far.quest/assets/fillImage.png", o = `
          <meta property="fc:frame:input:text" content="Image url" />
          <meta property="fc:frame:button:1" content="Next" />
          <meta property="fc:frame:button:1:action" content="post" />
          <meta property="fc:frame:post_url" content="${c}?step=requireFollow" />
        `;
    break;

   case "requireFollow":
    o = t.context.untrustedData.inputText ? (n = "https://far.quest/assets/mustFollow.png", 
    `
                <meta property="fc:frame:button:1" content="Yes" />
          <meta property="fc:frame:button:1:action" content="post" />
                <meta property="fc:frame:button:2" content="No" />
          <meta property="fc:frame:button:2:action" content="post" />
          <meta property="fc:frame:post_url" content="${c}?step=fillName&image=${encodeURIComponent(t.context.untrustedData.inputText)}" />
      `) : (n = "https://far.quest/assets/fillImage.png", `
          <meta property="fc:frame:input:text" content="Error: Image url is required." />
          <meta property="fc:frame:button:1" content="Next" />
          <meta property="fc:frame:button:1:action" content="post" />
          <meta property="fc:frame:post_url" content="${c}?step=fillName" />
        `);
    break;

   case "fillName":
    var s = 1 === parseInt(t.body?.untrustedData?.buttonIndex) ? t.context.frameData.fid : null;
    n = decodeURIComponent(r), o = `
        <meta property="fc:frame:input:text" content="Name (Optional)" />
        <meta property="fc:frame:button:1" content="Create Free Mint ✨" />
          <meta property="fc:frame:button:1:action" content="post" />
          <meta property="fc:frame:post_url" content="${c}?step=confirm&image=${encodeURIComponent(r)}&${s ? "mustFollow=" + s : ""}" />
        `;
    break;

   case "confirm":
    n = "https://far.quest/assets/frameSuccess.png";
    s = "https://far.quest/contracts/degen/" + (await handleCreateContractRequest({
      body: {
        name: t.context.untrustedData.inputText || "Free Mint",
        image: r,
        symbol: "FARQUEST",
        ownerAddress: t.context.connectedAddress,
        mustFollow: t.query.mustFollow
      }
    })).contract.slug, s = `https://warpcast.com/~/compose?text=${encodeURIComponent(s)}&embeds[]=${s}&rand=` + Math.random().toString().slice(0, 7);
    o = `
      <meta property="fc:frame:button:1" content="Share your free mint" />
          <meta property="fc:frame:button:1:action" content="link" />
          <meta property="fc:frame:button:1:target" content="${s}" />
      `;
    break;

   default:
    o = `
        <meta property="fc:frame:input:text" content="Error: Invalid step provided." />
      `;
  }
  a = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta property="fc:frame" content="vNext" />
        <meta property="fc:frame:image" content="${n}" />
        <meta property="fc:frame:image:aspect_ratio" content="1:1" />
        ${o}
      </head>
    </html>`;
  e.setHeader("Content-Type", "text/html"), e.send(a);
}), module.exports = {
  router: app
};