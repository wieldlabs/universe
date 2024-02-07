const Magic = require("@magic-sdk/admin")["Magic"], fido2 = require("fido2-lib"), bufferToHex = require("ethereumjs-util")["bufferToHex"], recoverPersonalSignature = require("@metamask/eth-sig-util")["recoverPersonalSignature"], base64url = require("base64url"), mongoose = require("mongoose"), axios = require("axios").default, Account = require("../models/Account")["Account"], AccountAddress = require("../models/AccountAddress")["AccountAddress"], AccountCommunity = require("../models/AccountCommunity")["AccountCommunity"], AccountNonce = require("../models/AccountNonce")["AccountNonce"], {
  getCustodyAddress,
  getCurrentUser
} = require("../helpers/warpcast"), getFidByCustodyAddress = require("../helpers/farcaster")["getFidByCustodyAddress"], _AccountRecovererService = require("./AccountRecovererService")["Service"], generateNewAccessTokenFromAccount = require("../helpers/jwt")["generateNewAccessTokenFromAccount"], bufferToAB = e => {
  for (var r = new ArrayBuffer(e.length), t = new Uint8Array(r), a = 0; a < e.length; ++a) t[a] = e[a];
  return r;
};

class AuthService {
  async _generateNonceAndAccessToken({
    account: e,
    extra: r = {}
  }) {
    var t;
    if (e) return await (t = await AccountNonce.findOne({
      account: e._id
    })).generateNewNonce(), {
      account: e,
      accountNonce: t,
      accessToken: await generateNewAccessTokenFromAccount(e, r)
    };
    throw new Error("Account not found");
  }
  async getMessageToSign({
    address: e,
    chainId: r,
    creationOrigin: t = "EOA"
  }) {
    e = await Account.findOrCreateByAddressAndChainId({
      address: e,
      chainId: r,
      creationOrigin: t
    });
    if (!e) throw new Error("Account not found");
    if (e.deleted) throw new Error("Account is deleted");
    r = await AccountNonce.findOne({
      account: e._id
    });
    if (r) return r.getMessageToSign();
    throw new Error("AccountNonce not found");
  }
  async getWalletAccountMessageToSign({
    walletEmail: e
  }) {
    e = await Account.findOne({
      walletEmail: e
    });
    if (!e) return {
      message: "Account not found",
      encyrptedWalletJson: null
    };
    if (e.deleted) throw new Error("Account is deleted");
    var r = await AccountNonce.findOne({
      account: e._id
    });
    if (r) return {
      message: r.getMessageToSign(),
      encyrptedWalletJson: e.encyrptedWalletJson
    };
    throw new Error("AccountNonce not found");
  }
  async verifySignature({
    address: e,
    chainId: r,
    signature: t
  }) {
    r = await Account.findByAddressAndChainId({
      address: e,
      chainId: r
    });
    if (!r) throw new Error("Account not found");
    if (r.deleted) throw new Error("Account is deleted");
    var a = await AccountNonce.findOne({
      account: r._id
    });
    if ((await a.decodeAddressBySignature(t)).toLowerCase() !== e.toLowerCase()) throw new Error("Unauthorized");
    if (a) return {
      account: r,
      accountNonce: a
    };
    throw new Error("AccountNonce not found");
  }
  async authBySignature({
    address: e,
    chainId: r,
    signature: t
  }) {
    e = (await this.verifySignature({
      address: e,
      chainId: r,
      signature: t
    })).account;
    return e;
  }
  async authByEmail({
    signature: e
  }) {
    var r = new Magic(process.env.MAGIC_LINK_SECRET), r = (await r.token.validate(e), 
    await r.users.getMetadataByToken(e));
    let t = await Account.findOne({
      email: r.email
    });
    if (t?.deleted) throw new Error("Account is deleted");
    return t = t || await Account.createFromAddress({
      address: r.publicAddress,
      chainId: 1,
      email: r.email
    });
  }
  async authByWarpcast({
    address: t,
    token: a,
    chainId: n
  }) {
    try {
      let e = 0, r;
      for (;e < 60; ) {
        e += 1, await new Promise(e => setTimeout(e, 1e3));
        var o = (await axios.get("https://api.warpcast.com/v2/signed-key-request", {
          params: {
            token: a
          }
        }))["data"], i = o.result.signedKeyRequest;
        if ("completed" === i.state) {
          r = i;
          break;
        }
      }
      if (60 <= e) throw new Error("Timeout");
      var c = r.userFid.toString(), s = (await getCustodyAddress({
        fid: c,
        token: process.env.FARQUEST_FARCASTER_APP_TOKEN
      }))["custodyAddress"], d = await Account.findOrCreateByAddressAndChainId({
        address: s,
        chainId: n,
        creationOrigin: "WARPCAST"
      });
      if (d?.deleted) throw new Error("Account is deleted");
      return d.recoverers?.find?.(e => "FARCASTER_SIGNER" === e.type && e.pubKey === t) ? d : await new _AccountRecovererService().addRecoverer(d, {
        type: "FARCASTER_SIGNER",
        address: t,
        id: c
      });
    } catch (e) {
      throw console.log(e), new Error("Invalid token");
    }
  }
  async authByFid({
    address: e,
    id: r,
    chainId: t,
    signature: a
  }) {
    try {
      var n = (await this.verifySignature({
        address: e,
        chainId: t,
        signature: a
      }))["account"];
      if (n?.deleted) throw new Error("Account is deleted");
      if (n.recoverers?.find?.(e => "FARCASTER_SIGNER" === e.type && e.pubKey === r)) return n;
      var o = new _AccountRecovererService(), i = await o.verifyFarcasterSignerAndGetFid(n, {
        signerAddress: r,
        custodyAddress: e
      });
      if (i) return await o.addRecoverer(n, {
        type: "FARCASTER_SIGNER",
        address: r,
        id: i
      });
      throw new Error("Invalid signer! If this error persists, try logging out and logging in again.");
    } catch (e) {
      throw console.log(e), new Error("Invalid token");
    }
  }
  async authByPassKey({
    signature: e,
    email: r,
    chainId: t
  }) {
    try {
      if ((A = await Account.findOne({
        email: r
      }))?.deleted) throw new Error("Account is deleted");
      if (A) throw new Error("Account already exists");
      var a = JSON.parse(e), n = a.response.clientDataJSON, o = a.response.attestationObject, i = bufferToAB(base64url.toBuffer(a.id)), {
        id: c,
        type: s
      } = a;
      if ("public-key" !== s) throw new Error("Invalid PassKey type");
      var d = new fido2.Fido2Lib({
        timeout: 6e4,
        challengeSize: 52,
        rpId: "production" === process.env.NODE_ENV ? "beb.lol" : "localhost",
        rpName: "beb.lol"
      }), u = {
        challenge: "Y2hhbGxlbmdlIGNoYWxsZW5nZSBjaGFsbGVuZ2UgY2hhbGxlbmdl",
        origin: "production" === process.env.NODE_ENV ? "https://beb.lol" : "http://localhost:5678",
        factor: "either"
      }, l = await d.attestationResult({
        rawId: i,
        id: i,
        response: {
          ...a.response,
          attestationObject: o,
          clientDataJSON: n
        }
      }, u), A = await Account.createFromAddress({
        address: l.authnrData.get("credentialPublicKeyPem"),
        chainId: t,
        email: r
      }), w = await AccountAddress.findOne({
        account: A._id
      });
      return w.counter = l.authnrData.get("counter"), w.passKeyId = c, await w.save(), 
      A;
    } catch (e) {
      throw console.log(e), new Error("Could not parse PassKey signature");
    }
  }
  async authenticate({
    address: e,
    chainId: r,
    signature: t,
    type: a = "SIGNATURE",
    id: n
  }) {
    let o = null, i = !0;
    return "PASSKEY" === a ? o = await this.authByPassKey({
      signature: t,
      email: e,
      chainId: r
    }) : "WARPCAST" === a ? (o = await this.authByWarpcast({
      address: e,
      token: t,
      fid: n,
      chainId: r
    }), i = !1) : "FID" === a ? (o = await this.authByFid({
      address: e,
      signature: t,
      id: n,
      chainId: r
    }), i = !1) : o = "0x0magiclink" == e ? await this.authByEmail({
      address: e,
      chainId: r,
      signature: t
    }) : await this.authBySignature({
      address: e,
      chainId: r,
      signature: t
    }), this._generateNonceAndAccessToken({
      account: o,
      extra: {
        isExternal: i
      }
    });
  }
  async authByEncryptedWalletJson({
    email: e,
    encyrptedWalletJson: r,
    chainId: t,
    signature: a
  }) {
    var n = await Account.findOne({
      walletEmail: e
    }), o = "0x" + JSON.parse(r).address;
    let i;
    if (n) i = await this.authBySignature({
      address: o,
      chainId: t,
      signature: a
    }); else {
      n = r, n = bufferToHex(Buffer.from(n, "utf8"));
      if (recoverPersonalSignature({
        data: n,
        signature: a
      }).toLowerCase() !== o.toLowerCase()) throw new Error("Unauthorized");
      i = await Account.createFromEncryptedWalletJson({
        email: e,
        encyrptedWalletJson: r,
        chainId: t
      });
    }
    return this._generateNonceAndAccessToken({
      account: i
    });
  }
}

module.exports = {
  Service: AuthService
};