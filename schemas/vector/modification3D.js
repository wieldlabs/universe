const mongoose = require("mongoose"), vector3DSchema = require("./vector3D")["schema"], schema = mongoose.Schema({
  scale: vector3DSchema,
  rotation: vector3DSchema,
  transition: vector3DSchema
});

module.exports = {
  schema: schema
};