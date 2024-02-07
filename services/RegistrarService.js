const ethers = require("ethers"), Sentry = require("@sentry/node"), _AlchemyService = require("./AlchemyService")["Service"], _CacheService = require("./cache/CacheService")["Service"], _FarcasterService = require("./identities/FarcasterServiceV2")["Service"], _InitializeCommunityService = require("./initializer/InitializeCommunityService")["Service"], getTokenIdFromLabel = require("../helpers/get-token-id-from-label")["getTokenIdFromLabel"], getProvider = require("../helpers/alchemy-provider")["getProvider"], {
  config,
  prod
} = require("../helpers/registrar"), validateAndConvertAddress = require("../helpers/validate-and-convert-address")["validateAndConvertAddress"], validateAndConvertDuration = require("../helpers/validate-and-convert-duration")["validateAndConvertDuration"], generateSecretFromAddressAndDuration = require("../helpers/generate-secret-from-address-and-duration")["generateSecretFromAddressAndDuration"], Community = require("../models/Community")["Community"];

class RegistrarService {
  constructor(e = !1) {
    var r, t, i;
    e ? (e = new _AlchemyService({
      apiKey: prod().OPTIMISM_NODE_URL,
      chain: prod().OPTIMISM_NODE_NETWORK
    }), r = getProvider({
      network: prod().OPTIMISM_NODE_NETWORK,
      node: prod().OPTIMISM_NODE_URL
    }), t = new ethers.Contract(prod().OPTIMISM_CONTROLLER_ADDRESS, prod().OPTIMISM_CONTROLLER_ABI, r), 
    i = new ethers.Contract(prod().OPTIMISM_REGISTRAR_ADDRESS, prod().REGISTRAR_ABI, r), 
    this.AlchemyService = e, this.alchemyProvider = r, this.controller = t, this.registrar = i) : (e = new _AlchemyService({
      apiKey: prod().NODE_URL,
      chain: prod().NODE_NETWORK
    }), r = getProvider({
      network: config().NODE_NETWORK,
      node: config().NODE_URL
    }), t = new ethers.Contract(config().BETA_CONTROLLER_ADDRESS, config().BETA_CONTROLLER_ABI, r), 
    i = new ethers.Contract(config().REGISTRAR_ADDRESS, config().REGISTRAR_ABI, r), 
    this.AlchemyService = e, this.alchemyProvider = r, this.controller = t, this.registrar = i);
  }
  async getOwner(e, r = 0) {
    if (!e) return null;
    var t = this.getTokenIdFromLabel(e);
    try {
      var i, a = new _CacheService(), n = await a.get({
        key: "RegistrarService.getOwner",
        params: {
          domain: e
        }
      });
      return n ? n : ((i = await this.registrar.ownerOf(t)) && a.set({
        key: "RegistrarService.getOwner",
        params: {
          domain: e
        },
        value: i,
        expiresAt: new Date(Date.now() + 9e5)
      }), i);
    } catch (e) {
      return Sentry.captureException(e), console.error(e), null;
    }
  }
  async available(e) {
    return !!e && this.controller.available(e);
  }
  async expiresAt(e) {
    if (!e) return null;
    var r = this.getTokenIdFromLabel(e);
    try {
      var t, i = new _CacheService(), a = await i.get({
        key: "RegistrarService.expiresAt",
        params: {
          domain: e
        }
      });
      return a ? a : ((t = await this.registrar.nameExpires(r)) && i.set({
        key: "RegistrarService.expiresAt",
        params: {
          domain: e
        },
        value: t.toString(),
        expiresAt: new Date(Date.now() + 6e4)
      }), t?.toString());
    } catch (e) {
      return Sentry.captureException(e), console.error(e), null;
    }
  }
  async rentPrice({
    bebdomain: e,
    duration: r
  }) {
    return e && r ? ([ e, r ] = await this.controller.rentPrice(e, validateAndConvertDuration(r)), 
    {
      base: ethers.BigNumber.from(e).toString(),
      premium: ethers.BigNumber.from(r).toString()
    }) : null;
  }
  makeSecret({
    bebdomain: e,
    address: r,
    duration: t
  }) {
    return generateSecretFromAddressAndDuration({
      address: validateAndConvertAddress(r),
      duration: validateAndConvertDuration(t),
      bebdomain: e
    });
  }
  async makeCommitment({
    bebdomain: e,
    address: r,
    duration: t
  }) {
    return !!e && await this.controller.makeCommitment(e, validateAndConvertAddress(r), validateAndConvertDuration(t), this.makeSecret({
      bebdomain: e,
      address: r,
      duration: t
    }));
  }
  getTokenIdFromLabel(e) {
    return getTokenIdFromLabel(e);
  }
  async registerCommunity(e, {
    bebdomain: r,
    tld: t = "beb"
  }, i) {
    if (!r) throw new Error("Invalid domain name");
    var a = await this.getOwner(r, t);
    if (!a) throw new Error("Community is not registered in the registrar");
    if (await i.account?.populate?.("addresses"), i.account?.addresses?.[0]?.address?.toLowerCase?.() !== a?.toLowerCase?.()) throw new Error("Only owner can register a community");
    if (await Community.findOne({
      bebdomain: r
    })) throw new Error("A community already exists for this domain");
    if (process.env.BLOCK_INITIALIZE) throw new Error("Initializing Communities is blocked due to BLOCK_INITIALIZE!");
    a = new _InitializeCommunityService(), r = await Community.create({
      bebdomain: r,
      tokenId: this.getTokenIdFromLabel(r),
      name: r,
      owner: i.account._id,
      tld: t
    });
    return await a.createDefaultRoleWithPermissions(r), r;
  }
}

module.exports = {
  Service: RegistrarService
};