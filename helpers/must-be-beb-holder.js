const Account = require("../models/Account")["Account"], _AlchemyService = require("../services/AlchemyService")["Service"], prod = require("./registrar")["prod"], requireAuth = require("./auth-middleware")["requireAuth"], mustBeBEBHolder = async e => {
  try {
    var r = (await requireAuth(e)).payload.id, o = await Account.findById(r).populate("addresses");
    if (!o) throw new Error("Account not found");
    var t = o.addresses?.[0]?.address, d = new _AlchemyService({
      apiKey: prod().NODE_URL,
      chain: prod().NODE_NETWORK
    }), a = new _AlchemyService({
      apiKey: prod().OPTIMISM_NODE_URL,
      chain: prod().OPTIMISM_NODE_NETWORK
    }), i = await d.isHolderOfCollection({
      wallet: t,
      contractAddress: prod().REGISTRAR_ADDRESS
    });
    if (i ||= await a.isHolderOfCollection({
      wallet: t,
      contractAddress: prod().OPTIMISM_REGISTRAR_ADDRESS
    })) return !0;
    throw new Error("Due to demand, you must own a BEB domain to use this feature. Register one for free at Wield and contribute to the network!");
  } catch (e) {
    throw new Error(e.message);
  }
};

module.exports = {
  mustBeBEBHolder: mustBeBEBHolder
};