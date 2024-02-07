const mongoose = require("mongoose"), schema = require("../schemas/communityRoom")["schema"];

class CommunityRoomClass {}

schema.loadClass(CommunityRoomClass);

const CommunityRoom = mongoose.models.CommunityRoom || mongoose.model("CommunityRoom", schema);

module.exports = {
  CommunityRoom: CommunityRoom
};