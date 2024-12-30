const mongoose = require("mongoose"), schema = require("../schemas/castHandle")["schema"];

class CastHandleClass {
  static ping() {
    console.log("model: CastHandleClass");
  }
  static normalizeTokenId(e) {
    return e.toLowerCase().replace(/0x0+/, "0x");
  }
  async setCastHandleMetadataForFarheroPacks(e) {
    return this.displayItemId = "Premium" === e ? "booster-pack-p" : "Collector" === e ? "booster-pack-c" : "booster-pack-n", 
    this.displayMetadata = {
      name: e + " Booster Pack",
      image: "Premium" === e ? "/farhero/cards/genesis-booster-p.webp" : "Collector" === e ? "/farhero/cards/genesis-booster-c.webp" : "/farhero/cards/genesis-booster-n.webp",
      displayType: "farpack",
      description: "Open this pack on https://far.quest/hero to get a FarHero!"
    }, this.unsyncedMetadata = !0, await this.save(), this;
  }
}

schema.loadClass(CastHandleClass);

const CastHandle = mongoose.models.CastHandle || mongoose.model("CastHandle", schema);

module.exports = {
  CastHandle: CastHandle
};