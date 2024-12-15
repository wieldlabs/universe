function padWithZeros(t) {
  return t.toString().replace(".", "").padStart(32, "0");
}

module.exports = {
  padWithZeros: padWithZeros
};