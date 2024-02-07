const Permission = require("../models/Permission")["Permission"], BigInt = require("big-integer");

class PermissionService {
  async generatePermissionStringFromIds(i = []) {
    i = await Permission.find({
      _id: {
        $in: i
      }
    }).select("bitwiseFlag");
    return i.length ? i.reduce((i, e) => (BigInt(i) | BigInt(e.bitwiseFlag)).toString(), "0") : null;
  }
  combinePermissionStrings(i = []) {
    return i.reduce((i, e) => (BigInt(i) | BigInt(e)).toString(), "0");
  }
  isFlagSetForPermissionString(i, e) {
    return !(!e || !i) && (BigInt(i) & BigInt(e)).toString() === BigInt(e).toString();
  }
  async isFlagSetForPermissionStringById(i, e) {
    e = await Permission.findById(e);
    return !(!e || !i) && this.isFlagSetForPermissionString(i, e.bitwiseFlag);
  }
}

module.exports = {
  Service: PermissionService
};