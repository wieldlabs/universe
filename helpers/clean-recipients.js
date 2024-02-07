const {
  isAddress,
  isENS
} = require("./validate-and-convert-address"), cleanRecipients = e => {
  const r = [];
  return e.map(e => {
    var i = e.split("@");
    if (i.length && 2 === i.length) return i;
    throw new Error("Invalid recipient " + e);
  }).forEach(e => {
    var i = e[0], n = e[1]?.split(".");
    if (!n || 2 !== n.length) throw new Error("Invalid recipient domain " + e);
    e = n[0], n = n[1];
    isAddress(i) || isENS(i) ? r.push({
      recipientType: 0,
      locale: i,
      domain: e,
      tld: n
    }) : r.push({
      recipientType: 1,
      locale: i,
      domain: e,
      tld: n
    });
  }), r;
};

module.exports = {
  cleanRecipients: cleanRecipients
};