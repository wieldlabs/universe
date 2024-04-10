const contractSchema = require("../../schemas/wallet/contract")["schema"], mongoose = require("mongoose");

class ContractClass {
  static ping() {
    console.log("model: ContractClass");
  }
  static async createContract({
    address: a,
    chainId: t,
    name: e,
    ...o
  }, s = !0) {
    if (!a || !t) throw new Error("Address and chainId are required fields.");
    var r = this._generateSlug(e, a);
    let n = r, c = await this.findOne({
      slug: n
    }), l = 0;
    for (;c; ) l++, n = r + "-" + l, c = await this.findOne({
      slug: n
    });
    e = new this({
      address: a,
      chainId: t,
      slug: n,
      ...o
    });
    return s && await e.save(), e;
  }
  static _generateSlug(a, t) {
    return a ? "" + a.toLowerCase().replace(/[^a-z0-9]/g, "-") : "" + t.toLowerCase();
  }
}

contractSchema.loadClass(ContractClass);

const Contract = mongoose.models.Contract || mongoose.model("wallet.Contract", contractSchema);

module.exports = {
  Contract: Contract
};