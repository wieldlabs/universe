function firstPromiseToReturnTrue(r = []) {
  var e = r.map(o => new Promise((e, r) => o.then(r => r && e(!0), r)));
  return e.push(Promise.all(r).then(() => !1)), Promise.race(e);
}

module.exports = {
  firstPromiseToReturnTrue: firstPromiseToReturnTrue
};