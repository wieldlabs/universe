const _CacheService = require("../services/cache/CacheService")["Service"], generateChallenge = require("../helpers/generate-challenge")["generateChallenge"], fido2 = require("fido2-lib"), base64url = require("base64url"), ethers = require("ethers"), {
  abi: keyRegistrarAbi,
  address: keyRegistrarAddress,
  gateway_address: keyGatewayAddress,
  gateway_registry_address: keyGatewayRegistryAddress
} = require("../helpers/abi/key-registrar"), {
  abi: idRegistrarAbi,
  address: idRegistrarAddress,
  gateway_registry_address: idGatewayRegistryAddress
} = require("../helpers/abi/id-registrar"), getProvider = require("../helpers/alchemy-provider")["getProvider"], {
  Alchemy,
  Network,
  Utils
} = require("alchemy-sdk"), getFlags = require("../helpers/flags")["getFlags"], memcache = require("../connectmemcache")["memcache"];

class AccountRecovererService {
  _accepableRecovererTypes = [ "PASSKEY", "FARCASTER_SIGNER", "FARCASTER_SIGNER_EXTERNAL" ];
  _bufferToAB(e) {
    for (var r = new ArrayBuffer(e.length), t = new Uint8Array(r), a = 0; a < e.length; ++a) t[a] = e[a];
    return r;
  }
  async _verifyAttestationResponse({
    signature: e,
    challenge: r
  }) {
    try {
      var t = JSON.parse(e), a = t.response.clientDataJSON, s = t.response.attestationObject, i = this.bufferToAB(base64url.toBuffer(t.id)), {
        id: n,
        type: d
      } = t;
      if ("public-key" !== d) throw new Error("Invalid PassKey type");
      var o = new fido2.Fido2Lib({
        timeout: 6e4,
        challengeSize: 52,
        rpId: "production" === process.env.NODE_ENV ? "Wield" : "localhost",
        rpName: "Wield"
      }), c = {
        challenge: r,
        origin: "production" === process.env.NODE_ENV ? "https://wield.xyz" : "http://localhost:5678",
        factor: "either"
      };
      return {
        ...await o.attestationResult({
          rawId: i,
          id: i,
          response: {
            ...t.response,
            attestationObject: s,
            clientDataJSON: a
          }
        }, c),
        id: n
      };
    } catch (e) {
      throw console.error(e), new Error("Could not parse PassKey signature");
    }
  }
  async _addPasskeyRecoverer(e, {
    signature: r
  }) {
    var t, e = await new _CacheService().get({
      key: "ChallengeForRecoverer",
      params: {
        accountId: e._id,
        type: "PASSKEY"
      }
    });
    if (e) return e = (r = await this._verifyAttestationResponse({
      signature: r,
      challenge: e
    })).authnrData.get("credentialPublicKeyPem"), t = r.authnrData.get("counter"), 
    {
      type: "PASSKEY",
      id: r.authnrData.get("id"),
      pubKey: e,
      counter: t,
      challenge: {
        challenge: generateChallenge()
      }
    };
    throw new Error("No challenge found");
  }
  async _addFarcasterSignerRecoverer(e, {
    address: r,
    id: t,
    type: a
  }) {
    return {
      type: a,
      id: t.toString(),
      pubKey: r?.toLowerCase?.()
    };
  }
  async verifyFarcasterSignerAndGetFid(e, {
    signerAddress: r,
    custodyAddress: t,
    fid: a
  }) {
    var s = getProvider({
      network: 10,
      node: process.env.OPTIMISM_NODE_URL
    }), i = getFlags(), n = i.USE_GATEWAYS ? keyGatewayRegistryAddress : keyRegistrarAddress, i = i.USE_GATEWAYS ? idGatewayRegistryAddress : idRegistrarAddress, n = new ethers.Contract(n, keyRegistrarAbi, s), i = new ethers.Contract(i, idRegistrarAbi, s);
    let d = a;
    if (d = d || await i.idOf(t)) return 1 === (await n.keyDataOf(d, r))?.state ? d : null;
    throw new Error("Address does not own a valid FID");
  }
  async getFid(e, {
    custodyAddress: r
  }) {
    var t = getProvider({
      network: 10,
      node: process.env.OPTIMISM_NODE_URL
    }), a = idGatewayRegistryAddress;
    return await new ethers.Contract(a, idRegistrarAbi, t).idOf(r);
  }
  async addOrGetSigner(e, {
    signerAddress: r,
    fid: t,
    custodyAddress: a,
    signature: s,
    deadline: i,
    metadata: n
  }) {
    var d = getProvider({
      network: 10,
      node: process.env.OPTIMISM_NODE_URL
    }), o = await new Alchemy({
      apiKey: process.env.OPTIMISM_NODE_URL,
      network: Network.OPT_MAINNET
    }).core.getGasPrice(), o = Utils.formatUnits(o, "gwei"), c = ethers.utils.parseUnits(o, "gwei"), g = ethers.utils.parseUnits("0.175", "gwei");
    if (c.gt(g)) throw new Error(`Gas price is too high: ${o} gwei`);
    g = process.env.FARCAST_KEY;
    if (!g) throw new Error("Not configured!");
    o = ethers.Wallet.fromMnemonic(g).connect(d), g = new ethers.Contract(keyGatewayRegistryAddress, keyRegistrarAbi, o), 
    d = new ethers.Contract(keyGatewayAddress, keyRegistrarAbi, o), o = r, g = await g.keyDataOf(t, o);
    if (1 === g?.state) return r;
    if (0 !== g?.state) throw new Error("Signer has been removed");
    {
      console.log({
        custodyAddress: a,
        keyType: 1,
        key: o,
        metadataType: 1,
        metadata: n,
        deadline: i,
        fidSignature: s
      });
      var g = new _CacheService(), y = await g.get({
        key: "AccountRecovererService:addOrGetSigner",
        params: {
          custodyAddress: a
        }
      });
      let e = 1;
      if (y) {
        if (5 <= (e = parseInt(y))) throw new Error("You can only add 5 signers per day. Please wait 24 hours and try again.");
        e++;
      }
      await g.set({
        key: "AccountRecovererService:addOrGetSigner",
        params: {
          custodyAddress: a
        },
        value: e,
        expiresAt: new Date(Date.now() + 864e5)
      });
      y = await d.addFor(a, 1, o, 1, n, ethers.BigNumber.from(i), s, {
        gasLimit: 25e4,
        maxFeePerGas: c,
        maxPriorityFeePerGas: c
      });
      return await y.wait(), console.log("Added Signer"), console.log({
        hash: y.hash,
        signerAddress: r,
        fid: t,
        custodyAddress: a
      }), r;
    }
  }
  async getSigners(e, {
    fid: r,
    state: t = 1
  }) {
    var a = getProvider({
      network: 10,
      node: process.env.OPTIMISM_NODE_URL
    }), s = getFlags().USE_GATEWAYS ? keyGatewayRegistryAddress : keyRegistrarAddress;
    return await new ethers.Contract(s, keyRegistrarAbi, a).keysOf(r, t);
  }
  async requestInitialChallengeForRecoverer(e, {
    type: r
  }) {
    if (!e) throw new Error("Account not found");
    if ("PASSKEY" !== r) throw new Error("Invalid recoverer type");
    var t = new _CacheService(), a = new Date(Date.now() + 6e5), s = generateChallenge();
    return await t.set({
      key: "ChallengeForRecoverer",
      params: {
        accountId: e._id,
        type: r
      },
      value: s,
      expiresAt: a
    }), s;
  }
  async addRecoverer(e, {
    signature: t,
    type: a,
    address: s,
    id: i
  }) {
    if (!e) throw new Error("Account not found");
    if (-1 === this._accepableRecovererTypes.indexOf(a)) throw new Error("Invalid recoverer type");
    try {
      let r;
      if ("PASSKEY" === a ? r = await this._addPasskeyRecoverer(e, {
        signature: t
      }) : "FARCASTER_SIGNER" !== a && "FARCASTER_SIGNER_EXTERNAL" !== a || (r = await this._addFarcasterSignerRecoverer(e, {
        address: s,
        id: i,
        type: a
      })), e.recoverers) {
        if (e.recoverers.find(e => e.id === r.id && e.pubKey === r.pubKey)) return e;
        e.recoverers.push(r);
      } else e.recoverers = [ r ];
      var n = await e.save();
      return await Promise.all([ memcache.delete("Account:findById:" + e._id), memcache.delete(`FarcasterHubService:getFidByAccountId:${e._id}:false`), memcache.delete(`FarcasterHubService:getFidByAccountId:${e._id}:true`) ]), 
      n;
    } catch (e) {
      throw console.error(e), new Error("Could not add recoverer: " + e.message);
    }
  }
}

module.exports = {
  Service: AccountRecovererService
};