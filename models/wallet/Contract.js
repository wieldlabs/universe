const contractSchema = require("../../schemas/wallet/contract")["schema"], mongoose = require("mongoose");

class ContractClass {
  static ping() {
    console.log("model: ContractClass");
  }
}

contractSchema.loadClass(ContractClass);

const Contract = mongoose.models.Contract || mongoose.model("wallet.Contract", contractSchema);

module.exports = {
  Contract: Contract
};