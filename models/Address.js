const mongoose = require("mongoose"), schema = require("../schemas/address")["schema"], ChainHelpers = require("../helpers/chain"), validateAndConvertAddress = require("../helpers/validate-and-convert-address")["validateAndConvertAddress"];

class AddressClass {
  static ping() {
    console.log("model: AddressClass");
  }
  static async findOrCreate({
    address: e,
    chainId: s
  }) {
    var a;
    if (ChainHelpers.chainTable[s]) return e = validateAndConvertAddress(e), 0 < (a = await this.aggregate([ {
      $match: {
        $and: [ {
          "chain.chainId": s
        }, {
          address: e
        } ]
      }
    } ])).length ? a[0] : this.create({
      address: e,
      chain: {
        chainId: s,
        name: ChainHelpers.mapChainIdToName(s)
      }
    });
    throw new Error("Invalid chain id");
  }
}

schema.loadClass(AddressClass);

const Address = mongoose.models.Address || mongoose.model("Address", schema);

module.exports = {
  Address: Address
};