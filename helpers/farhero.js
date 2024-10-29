const getFarheroXpScoreType = () => "farhero-xp", getXpFarscore = e => e <= 1 ? 1500 : e <= 10 ? 500 : e <= 20 ? 250 : e <= 50 ? 100 : 0;

module.exports = {
  getFarheroXpScoreType: getFarheroXpScoreType,
  getXpFarscore: getXpFarscore
};