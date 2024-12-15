const express = require("express"), app = express.Router(), Sentry = require("@sentry/node"), {
  memcache,
  getHash
} = require("../connectmemcache"), {
  DEFAULT_NETWORKS,
  DEFAULT_LIMIT,
  DEFAULT_CURSORS,
  DEFAULT_FILTER_NO_SYMBOL
} = require("../helpers/wallet"), CastHandle = require("../models/CastHandle")["CastHandle"], Account = require("../models/Account")["Account"], Metadata = require("../models/Metadata")["Metadata"], {
  prod,
  config
} = require("../helpers/registrar"), crypto = require("crypto"), {
  Pack,
  Player
} = require("../models/farcaster/tcg"), _RegistrarService = require("../services/RegistrarService")["Service"], Webhook = require("../models/Webhook")["Webhook"], wowTokenFactoryABI = require("../abis/wowTokenFactory")["wowTokenFactoryABI"], farTokenFactoryABI = require("../abis/farTokenFactory")["farTokenFactoryABI"], wowTokenABI = require("../abis/wowToken")["wowTokenABI"], farTokenABI = require("../abis/farToken")["farTokenABI"], BondingErc20 = require("../models/token/BondingErc20")["BondingErc20"], ethers = require("ethers"), padWithZeros = require("../helpers/number")["padWithZeros"], BondingErc20History = require("../models/token/BondingErc20History")["BondingErc20History"], axios = require("axios"), {
  Influencers,
  InfluencerAddresses,
  InfluencerTokens,
  TokenBreakdown,
  Transactions
} = require("../models/farcaster/analytics"), {
  getTokenPrice,
  NETWORK
} = require("../helpers/moralis"), {
  TIME_PERIODS,
  BASE_DEX_CONTRACTS_LOWERCASE
} = require("../schemas/farcaster/analytics"), {
  processFarTokenTradeEvent,
  processFarTokenTransferEvent,
  processFarTokenGraduatedEvent,
  MAX_PRIMARY_SUPPLY
} = require("../helpers/fartoken"), BondingErc20Transaction = require("../models/token/BondingErc20Transaction")["BondingErc20Transaction"], PRIMARY_MARKET_SUPPLY = 800000000n * 10n ** 18n, FARTOKEN_FACTORY_ADDRESS = "0x5c4743942072d2d0772b9887770e0943a67af6b4", WOW_FACTORY_ADDRESS = "0x997020e5f59ccb79c74d527be492cc610cb9fa2b", fetchIPFSMetadata = async r => {
  if (!r?.startsWith("ipfs://")) return null;
  try {
    var e = r.replace("ipfs://", "");
    return (await axios.get(`https://pinata.wieldcd.net/ipfs/${e}?pinataGatewayToken=` + process.env.PINATA_GATEWAY_TOKEN)).data;
  } catch (e) {
    return console.error(`Error fetching IPFS metadata for ${r}:`, e.message), null;
  }
};

function isValidSignatureForStringBody(e, r, t) {
  t = crypto.createHmac("sha256", t), t.update(e, "utf8"), e = t.digest("hex");
  return r === e;
}

async function isValidWebhook(e, r) {
  if ("production" === process.env.NODE_ENV) {
    var t = JSON.parse(r), a = await Webhook.findOne({
      webhookId: t.webhookId
    });
    if (!a) throw new Error("No webhook found for webhookId: " + t.webhookId);
    if (!isValidSignatureForStringBody(r, e.headers["x-alchemy-signature"], a.signingKey)) throw new Error(`Invalid signature for webhook! req.headers["x-alchemy-signature"]: ${e.headers["x-alchemy-signature"]} - req.body: ` + r);
  }
}

app.post("/nft-activity", express.raw({
  type: "application/json"
}), async (r, t) => {
  try {
    var e = r.body.toString("utf8"), a = (await isValidWebhook(r, e), JSON.parse(e));
    if (!a.event?.activity) throw new Error("No activity found in req.body.event webhook!");
    var o = new _RegistrarService("optimism"), n = new _RegistrarService();
    for (const m of a.event.activity) {
      var {
        contractAddress: s,
        erc721TokenId: i
      } = m, c = i?.toLowerCase(), d = m.toAddress?.toLowerCase();
      if (!c || !c.startsWith("0x")) throw new Error(`Invalid tokenId! Must start with 0x: ${c} for contractAddress: ` + s);
      if (!d || !d.startsWith("0x")) throw new Error(`Invalid owner! Must start with 0x: ${d} for tokenId: ` + c);
      if (![ prod().REGISTRAR_ADDRESS.toLowerCase(), prod().OPTIMISM_REGISTRAR_ADDRESS.toLowerCase() ].includes(s.toLowerCase())) throw new Error("No valid registrar contract found for contractAddress: " + s);
      var l = await Metadata.findOne({
        uri: c
      }), u = s.toLowerCase() === prod().OPTIMISM_REGISTRAR_ADDRESS.toLowerCase(), w = l?.domain || c, p = await CastHandle.findOne({
        handle: w
      }), h = u ? o : n;
      let e = null;
      try {
        p?.expiresAt || (e = await h.expiresAt(w, {
          tokenId: c
        }));
      } catch (e) {
        console.error(`Error getting expiresAt for handle: ${w} on ` + (u ? "OP" : "ETH"), e), 
        Sentry.captureException(e);
      }
      var k = await CastHandle.findOneAndUpdate({
        handle: w
      }, {
        owner: d.toLowerCase(),
        chain: u ? "OP" : "ETH",
        tokenId: c.toLowerCase(),
        ...e ? {
          expiresAt: e
        } : {}
      }, {
        upsert: !0,
        new: !0
      });
      if (config().SHOULD_CREATE_PACKS && l?.domain) {
        try {
          await Promise.all([ memcache.delete("tcg:inventory:first-page:" + k.owner, {
            noreply: !0
          }), memcache.delete("tcg:packs:first-page:" + k.owner, {
            noreply: !0
          }) ]);
        } catch (e) {
          console.error(e);
        }
        var f, y = await Pack.findOne({
          handle: k._id
        });
        let e;
        e = u ? "Premium" : w.length <= 9 ? "Collector" : "Normal", y ? (y.handle = k._id, 
        y.type = e, await y.save()) : (await Pack.create({
          set: config().PACK_SET,
          type: e,
          handle: k._id
        }), (f = await Account.findByAddressAndChainId({
          address: d,
          chainId: 1
        })) && await Player.findOne({
          account: f._id
        }) && await k.setCastHandleMetadataForFarheroPacks(e));
      }
      console.log(`NFT Activity Webhook - Updated cast handle: ${w} to owner: ${d} on ` + (u ? "OP" : "ETH"));
    }
    return t.status(200).send("NFT activity webhook received");
  } catch (e) {
    console.error("Error handling webhook:", e), Sentry.captureException(e, {
      extra: {
        rawBody: r.body?.toString("utf8")
      }
    }), t.status(500).send("Internal Server Error");
  }
}), app.post("/analytics-address-activity", express.raw({
  type: "application/json"
}), async (e, r) => {
  try {
    var t = e.body.toString("utf8"), a = (await isValidWebhook(e, t), JSON.parse(t));
    if (!a.event?.activity) throw new Error("No activity found in req.body.event webhook!");
    if ("BASE_MAINNET" !== a.event.network) return r.status(200).send("Webhook received but not on BASE_MAINNET");
    var o = a.event.activity.filter(e => "token" === e.category), n = [ ...new Set([ ...o.map(e => e.fromAddress.toLowerCase()), ...o.map(e => e.toAddress.toLowerCase()) ]) ], s = await InfluencerAddresses.find({
      address: {
        $in: n
      },
      chain: "BASE"
    });
    if (0 === s.length) return r.status(200).send("No influencer addresses found");
    var i = new Date();
    for (const p of o) if ([ "token", "external", "erc20" ].includes(p.category) && !p.erc721TokenId && !p.erc1155Metadata) {
      var c = BASE_DEX_CONTRACTS_LOWERCASE[p.fromAddress.toLowerCase()], d = BASE_DEX_CONTRACTS_LOWERCASE[p.toAddress.toLowerCase()];
      let e = !(!c && !d);
      e ? await Transactions.updateMany({
        hash: p.hash
      }, {
        $set: {
          isSwap: !0
        }
      }) : e = !!await Transactions.exists({
        hash: p.hash,
        isSwap: !0
      });
      const h = p.toAddress.toLowerCase(), k = p.fromAddress.toLowerCase();
      var l, u = p.hash + ":log:" + p.log.logIndex, w = s.find(e => e.address === h || e.address === k);
      w ? (l = !c && w.address !== k && "0x0000000000000000000000000000000000000000" !== k, 
      await Transactions.updateOne({
        uniqueId: u
      }, {
        $set: {
          fid: w.fid,
          blockNum: p.blockNum,
          uniqueId: u,
          hash: p.hash,
          from: k,
          to: h,
          value: p.value,
          asset: p.asset,
          category: l ? "airdrop" : "token" === p.category ? "erc20" : p.category,
          rawContract: {
            value: p.rawContract.rawValue,
            address: p.rawContract.address,
            decimal: p.rawContract.decimals
          },
          timestamp: i,
          chain: "BASE",
          isSwap: e
        }
      }, {
        upsert: !0
      })) : console.error(`No influencer found for address ${k} or ` + h);
    }
    r.status(200).send("Webhook received and processed");
  } catch (e) {
    console.error("Error handling webhook:", e), Sentry.captureException(e), r.status(500).send("Internal Server Error");
  }
}), app.post("/bonding-token-created", express.raw({
  type: "application/json"
}), async (r, t) => {
  try {
    var e = r.body.toString("utf8"), a = (await isValidWebhook(r, e), JSON.parse(e));
    if (!a.event?.data?.block?.logs) throw new Error("No logs found in req.body.event.data.block webhook!");
    if ("BASE_MAINNET" !== a.event.network) return t.status(200).send("Webhook received but not on BASE_MAINNET");
    var o = a.event.data.block.logs, n = a.event.data.block.timestamp, s = parseInt(a.event.data.block.number);
    for (const B of o) try {
      var i, c, d, l, u, w, p, h, k, f, y, m, g, v, A, E, b, T, S, C = {
        ...B,
        blockNumber: s,
        transactionHash: B.transaction.hash
      }, I = B.account.address.toLowerCase(), L = (I === WOW_FACTORY_ADDRESS ? new ethers.utils.Interface(wowTokenFactoryABI) : new ethers.utils.Interface(farTokenFactoryABI)).parseLog(C);
      [ "WowTokenCreated", "FarTokenCreated" ].includes(L.name) && ({
        tokenCreator: i,
        platformReferrer: c,
        protocolFeeRecipient: d,
        bondingCurve: l,
        tokenURI: u,
        name: w,
        symbol: p,
        tokenAddress: h,
        poolAddress: k
      } = L.args, f = B.transaction?.from?.address?.toLowerCase(), y = await fetchIPFSMetadata(u), 
      m = BondingErc20.findOneAndUpdate({
        tokenAddress: h.toLowerCase()
      }, {
        tokenCreator: i.toLowerCase(),
        platformReferrer: c.toLowerCase(),
        protocolFeeRecipient: d.toLowerCase(),
        bondingCurve: l.toLowerCase(),
        tokenURI: u,
        metadata: y,
        name: w,
        symbol: p,
        poolAddress: k.toLowerCase(),
        chainId: 8453,
        factoryAddress: I,
        timestamp: new Date(1e3 * n),
        blockNumber: s,
        actualCreator: f,
        type: I === WOW_FACTORY_ADDRESS ? "WOW" : "FARTOKEN",
        lastStatsUpdate: new Date(1e3 * n),
        lastProcessedBlock: s
      }, {
        upsert: !0,
        new: !0
      }), g = BondingErc20History.create({
        tokenAddress: h.toLowerCase(),
        timestamp: new Date(1e3 * n),
        blockNumber: s,
        txHash: B.transaction.hash,
        eventName: "WowTokenCreated",
        tokenCreator: i.toLowerCase(),
        platformReferrer: c.toLowerCase(),
        protocolFeeRecipient: d.toLowerCase(),
        bondingCurve: l.toLowerCase(),
        tokenURI: u,
        metadata: y,
        poolAddress: k.toLowerCase(),
        marketType: 0,
        marketCapInETH: "0",
        bondingCurveProgress: "0",
        totalSupply: "0",
        exchangeRate: "0",
        cumulativeTxCount: 0,
        cumulativeVolume: "0",
        holdersCount: 0,
        rawEventData: L.args
      }), v = Transactions.updateOne({
        uniqueId: B.transaction.hash
      }, {
        $set: {
          fid: i.toLowerCase(),
          blockNum: s,
          uniqueId: B.transaction.hash,
          hash: B.transaction.hash,
          from: ethers.constants.AddressZero,
          to: h.toLowerCase(),
          value: 0,
          asset: p,
          category: "erc20created",
          rawContract: {
            value: 0,
            address: h.toLowerCase(),
            decimal: 18
          },
          timestamp: new Date(),
          chain: "BASE",
          isSwap: !0,
          isFartoken: !0
        }
      }, {
        upsert: !0
      }), A = BondingErc20Transaction.updateOne({
        tokenAddress: h.toLowerCase()
      }, {
        $set: {
          tokenAddress: h.toLowerCase(),
          timestamp: new Date(1e3 * n),
          blockNumber: s,
          txHash: B.transaction.hash,
          type: "Create",
          from: ethers.constants.AddressZero,
          to: h.toLowerCase(),
          address: i.toLowerCase(),
          addressBalance: "0",
          tokenAmount: "0",
          amountInETH: "0",
          totalSupply: "0"
        }
      }, {
        upsert: !0
      }), E = getHash(`getBondingTokenTransactions:${h.toLowerCase()}:10:initial`), 
      b = getHash("getBondingTokens:initial:lastActivity"), T = getHash("getBondingTokens:initial:timestamp"), 
      S = getHash(`getBondingTokenHistory:${h.toLowerCase()}:5m`), await Promise.all([ m, g, v, A, memcache.delete(E, {
        noreply: !0
      }), memcache.delete(b, {
        noreply: !0
      }), memcache.delete(T, {
        noreply: !0
      }), memcache.delete(S, {
        noreply: !0
      }) ]), console.log("Created BondingErc20 for token: " + h));
    } catch (e) {
      console.error("Error processing log:", e), Sentry.captureException(e);
      continue;
    }
    t.status(200).send("Webhook processed successfully");
  } catch (e) {
    console.error("Error processing webhook:", e), Sentry.captureException(e, {
      extra: {
        rawBody: r.body?.toString("utf8")
      }
    }), t.status(500).send("Internal Server Error");
  }
}), app.post("/bonding-token-events", express.raw({
  type: "application/json"
}), async (r, t) => {
  try {
    var e = r.body.toString("utf8"), a = (await isValidWebhook(r, e), JSON.parse(e));
    if ("GRAPHQL" !== a.type) throw new Error("Unexpected webhook type: " + a.type);
    if (!a.event?.data?.block?.logs) throw new Error("No logs found in req.body.event.data.block webhook!");
    var o = a.event.data.block.logs, n = parseInt(a.event.data.block.number), s = new Date(1e3 * a.event.data.block.timestamp);
    if (!Array.isArray(o)) throw new Error("Logs is not an array!");
    for (const w of o) {
      var i = {
        ...w,
        blockNumber: n,
        transactionHash: w.transaction?.hash
      }, c = w.account.address?.toLowerCase();
      if (c) {
        var d = await BondingErc20.findOne({
          tokenAddress: c
        });
        if (d) try {
          var l = ("WOW" === d.type ? new ethers.utils.Interface(wowTokenABI) : new ethers.utils.Interface(farTokenABI)).parseLog(i), u = l.name;
          switch (u) {
           case "FarTokenBuy":
           case "FarTokenSell":
           case "WowTokenBuy":
           case "WowTokenSell":
            await processFarTokenTradeEvent({
              tokenAddress: c,
              token: d,
              event: {
                ...i,
                transaction: {
                  blockNumber: a.event.data.block.number,
                  hash: i.transactionHash
                },
                event: u
              },
              eventName: u,
              decodedLog: l,
              blockTimestamp: s
            });
            break;

           case "FarTokenTransfer":
           case "WowTokenTransfer":
            await processFarTokenTransferEvent({
              tokenAddress: c,
              token: d,
              event: {
                ...i,
                transaction: {
                  blockNumber: a.event.data.block.number,
                  hash: i.transactionHash
                }
              },
              decodedLog: l,
              blockTimestamp: s
            });
            break;

           case "FarTokenMarketGraduated":
           case "WowMarketGraduated":
            await processFarTokenGraduatedEvent({
              tokenAddress: c,
              event: {
                ...i,
                transaction: {
                  blockNumber: a.event.data.block.number,
                  hash: i.transactionHash
                }
              },
              blockTimestamp: s
            });
            break;

           default:
            Sentry.captureMessage("Unknown event in /bonding-token-events: " + u, {
              level: "error",
              extra: {
                enrichedLog: i,
                rawBody: e
              }
            });
          }
          (!d.lastProcessedBlock || n > d.lastProcessedBlock) && (d.lastStatsUpdate = s, 
          d.lastProcessedBlock = n, await d.save());
        } catch (e) {
          console.error(`Error processing event for token ${c}:`, e);
          continue;
        }
      } else Sentry.captureMessage("Missing token address in log:", {
        level: "error",
        extra: {
          enrichedLog: i,
          rawBody: e
        }
      });
    }
    t.status(200).send("Events processed successfully");
  } catch (e) {
    console.error("Error processing events:", e), Sentry.captureException(e, {
      extra: {
        rawBody: r.body?.toString("utf8")
      }
    }), t.status(500).send("Internal Server Error");
  }
}), module.exports = {
  router: app
};