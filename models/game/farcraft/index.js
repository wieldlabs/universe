const mongoose = require("mongoose"), {
  elementSchema,
  combinationSchema,
  metadataSchema
} = require("../../../schemas/game/farcraft");

class FarcraftMetadataClass {
  static ping() {
    console.log("model: MetadataClass");
  }
}

class ElementClass {
  static ping() {
    console.log("model: ElementClass");
  }
  static async findOrCreate(a, t, o, n = 1) {
    a = a.toLowerCase().trim();
    try {
      let e = await this.findOne({
        name: a
      });
      return e ? (e.depth = Math.max(e.depth, n), await e.save()) : e = await this.create({
        name: a,
        emoji: t,
        discoveredBy: o,
        depth: n
      }), e;
    } catch (e) {
      throw console.error("Error in Element.findOrCreate:", e), e;
    }
  }
}

class CombinationClass {
  static ping() {
    console.log("model: CombinationClass");
  }
  static async findOrCreate(a, t, o, n, m) {
    var r, s, [ a, t ] = [ a, t ].map(e => e.toLowerCase().trim()).sort();
    try {
      let e = await this.findOne({
        element1: a,
        element2: t
      });
      return e || (r = await Element.findOrCreate(a, "", m), s = await Element.findOrCreate(t, "", m), 
      e = await this.create({
        element1: a,
        element2: t,
        result: o.toLowerCase().trim(),
        discoveredBy: m
      }), await Element.findOrCreate(o.toLowerCase().trim(), n, m, Math.max(r.depth, s.depth) + 1)), 
      e;
    } catch (e) {
      throw console.error("Error in findOrCreate:", e), e;
    }
  }
  static async findByComponents(e, a) {
    var [ e, a ] = [ e, a ].map(e => e.toLowerCase().trim()).sort();
    return this.findOne({
      element1: e,
      element2: a
    });
  }
  static async findPossibleCombinations(e) {
    return e = e.toLowerCase().trim(), this.find({
      $or: [ {
        element1: e
      }, {
        element2: e
      } ]
    }).select("element1 element2 result");
  }
}

elementSchema.loadClass(ElementClass), combinationSchema.loadClass(CombinationClass), 
metadataSchema.loadClass(FarcraftMetadataClass);

const Element = mongoose.models.Element || mongoose.model("game.farcraft.Element", elementSchema), Combination = mongoose.models.Combination || mongoose.model("game.farcraft.Combination", combinationSchema), FarcraftMetadata = mongoose.models.FarcraftMetadata || mongoose.model("game.farcraft.Metadata", metadataSchema);

module.exports = {
  Element: Element,
  Combination: Combination,
  FarcraftMetadata: FarcraftMetadata
};