(function (root) {
  const WW = root.WordWars || (root.WordWars = {});

  WW.TURN_MS = 30000;
  WW.WORD_LENGTH = 5;
  WW.MIN_PLAYERS = 2;
  WW.MAX_PLAYERS = 6;
  WW.TURNS_PER_PLAYER = 5;
  WW.PLAYER_COLORS = [
    "#fbab20",
    "#141414",
    "#d7263d",
    "#2a9d8f",
    "#3d5a80",
    "#9b5de5",
  ];

  WW.LETTER_POINTS = {
    A: 1,
    B: 3,
    C: 3,
    D: 2,
    E: 1,
    F: 4,
    G: 2,
    H: 4,
    I: 1,
    J: 8,
    K: 5,
    L: 1,
    M: 3,
    N: 1,
    O: 1,
    P: 3,
    Q: 10,
    R: 1,
    S: 1,
    T: 1,
    U: 1,
    V: 4,
    W: 4,
    X: 8,
    Y: 4,
    Z: 10,
  };

  WW.letterValue = function letterValue(letter) {
    const key = String(letter || "").toUpperCase();
    return WW.LETTER_POINTS[key] || 0;
  };

  WW.wordValue = function wordValue(word) {
    return String(word || "")
      .toUpperCase()
      .split("")
      .reduce(function (sum, letter) {
        return sum + WW.letterValue(letter);
      }, 0);
  };

  WW.timeScale = function timeScale(ms, turnMs) {
    const limit = turnMs == null ? WW.TURN_MS : turnMs;
    if (ms <= 0 || limit <= 0) return 0;
    return Math.min(1, ms / limit);
  };

  WW.pointsFromRemaining = function pointsFromRemaining(ms, turnMs) {
    return WW.timeScale(ms, turnMs);
  };

  WW.scoreWord = function scoreWord(word, ms, turnMs) {
    return Math.round(WW.wordValue(word) * WW.timeScale(ms, turnMs));
  };

  if (typeof module !== "undefined") module.exports = WW;
})(typeof globalThis !== "undefined" ? globalThis : this);
