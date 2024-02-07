const Filter = require("bad-words"), allowList = [ "reputation", "computational", "booby", "turd" ];

class ExtendedFilter extends Filter {
  constructor(e) {
    super(e);
  }
  isProfane(e) {
    return !1;
  }
}

const filter = new ExtendedFilter();

module.exports = filter;