const _CacheService = require("../services/cache/CacheService")["Service"], generateChallenge = require("../helpers/generate-challenge")["generateChallenge"], fido2 = require("fido2-lib"), base64url = require("base64url"), ethers = require("ethers"), {
  abi: keyRegistrarAbi,
  address: keyRegistrarAddress,
  gateway_address: keyGatewayAddress,
  gateway_registry_address: keyGatewayRegistryAddress
} = require("../helpers/abi/key-registrar"), {
  abi: idRegistrarAbi,
  address: idRegistrarAddress,
  gateway_registry_address: idGatewayRegistryAddress
} = require("../helpers/abi/id-registrar"), getProvider = require("../helpers/alchemy-provider")["getProvider"], getFlags = require("../helpers/flags")["getFlags"];

function bytesToHex(e) {
  if (void 0 !== e) return null === e ? null : "0x" + Buffer.from(e).toString("hex");
}

const KEY_METADATA_TYPE_1 = [ {
  components: [ {
    internalType: "uint256",
    name: "requestFid",
    type: "uint256"
  }, {
    internalType: "address",
    name: "requestSigner",
    type: "address"
  }, {
    internalType: "bytes",
    name: "signature",
    type: "bytes"
  }, {
    internalType: "uint256",
    name: "deadline",
    type: "uint256"
  } ],
  internalType: "struct SignedKeyRequestValidator.SignedKeyRequestMetadata",
  name: "metadata",
  type: "tuple"
} ];

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
    custodyAddress: t
  }) {
    var a = getProvider({
      network: 10,
      node: process.env.OPTIMISM_NODE_URL
    }), s = getFlags(), i = s.USE_GATEWAYS ? keyGatewayRegistryAddress : keyRegistrarAddress, s = s.USE_GATEWAYS ? idGatewayRegistryAddress : idRegistrarAddress, i = new ethers.Contract(i, keyRegistrarAbi, a), s = await new ethers.Contract(s, idRegistrarAbi, a).idOf(t);
    if (s) return 1 === (await i.keyDataOf(s, r))?.state ? s : null;
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
    }), o = process.env.FARCAST_KEY;
    if (!o) throw new Error("Not configured!");
    var o = ethers.Wallet.fromMnemonic(o).connect(d), d = new ethers.Contract(keyGatewayRegistryAddress, keyRegistrarAbi, o), o = new ethers.Contract(keyGatewayAddress, keyRegistrarAbi, o), c = bytesToHex(new Uint8Array(Object.values(r))), d = await d.keyDataOf(t, c);
    if (1 === d?.state) return r;
    if (0 === d?.state) return 0, console.log({
      custodyAddress: a,
      keyType: 1,
      key: c,
      metadataType: 1,
      metadata: n,
      deadline: i,
      fidSignature: s
    }), await (await o.addFor(a, 1, c, 1, n, i, s)).wait(), r;
    throw new Error("Signer has been removed");
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
      return await e.save();
    } catch (e) {
      throw console.error(e), new Error("Could not add recoverer: " + e.message);
    }
  }
}

module.exports = {
  Service: AccountRecovererService
};