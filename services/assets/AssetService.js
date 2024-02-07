const _RichBlockService = require("../RichBlockService")["Service"];

class AssetService {
  async addComponent(e, {
    type: c,
    ...o
  }) {
    if (e) return (o = await new _RichBlockService().createBlock({
      blockType: c,
      ...o
    })) ? (o = [ ...e.components || [], {
      blockId: o._id,
      blockType: c
    } ], e.components = o, e.save()) : e;
    throw new Error("Invalid asset data");
  }
}

module.exports = {
  Service: AssetService
};