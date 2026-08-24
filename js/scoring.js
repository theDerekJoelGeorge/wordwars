(function (root) {
  const WW = root.WordWars || (root.WordWars = {});

  WW.TURN_MS = 30000;
  WW.WORD_LENGTH = 5;
  WW.MIN_PLAYERS = 2;
  WW.MAX_PLAYERS = 6;
  WW.MIN_ROUNDS = 1;
  WW.MAX_ROUNDS = 10;
  WW.TURNS_PER_PLAYER = 5;

  WW.clampRounds = function clampRounds(value) {
    let rounds = Number(value);
    if (!Number.isFinite(rounds)) rounds = WW.TURNS_PER_PLAYER;
    return Math.max(WW.MIN_ROUNDS, Math.min(WW.MAX_ROUNDS, Math.floor(rounds)));
  };
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

  WW.letterValue = function letterValue(letter, pointsMap) {
    const map = pointsMap || WW.LETTER_POINTS;
    const key = String(letter || "").toUpperCase();
    return map[key] || 0;
  };

  WW.wordValue = function wordValue(word, pointsMap) {
    return String(word || "")
      .toUpperCase()
      .split("")
      .reduce(function (sum, letter) {
        return sum + WW.letterValue(letter, pointsMap);
      }, 0);
  };

  WW.cloneLetterPoints = function cloneLetterPoints(map) {
    const source = map || WW.LETTER_POINTS;
    const copy = {};
    Object.keys(source).forEach(function (key) {
      copy[key] = source[key];
    });
    return copy;
  };

  WW.shuffleLetterPoints = function shuffleLetterPoints(rng, base) {
    const source = base || WW.LETTER_POINTS;
    const letters = Object.keys(source);
    const values = letters.map(function (letter) {
      return source[letter];
    });
    const random = rng || Math.random;
    for (let i = values.length - 1; i > 0; i -= 1) {
      const j = Math.floor(random() * (i + 1));
      const tmp = values[i];
      values[i] = values[j];
      values[j] = tmp;
    }
    const result = {};
    letters.forEach(function (letter, index) {
      result[letter] = values[index];
    });
    return result;
  };

  WW.getLetterPoints = function getLetterPoints(state) {
    if (state && state.letterPoints) return state.letterPoints;
    return WW.LETTER_POINTS;
  };

  WW.scoreWord = function scoreWord(word) {
    return WW.wordValue(word);
  };

  if (typeof module !== "undefined") module.exports = WW;
})(typeof globalThis !== "undefined" ? globalThis : this);
