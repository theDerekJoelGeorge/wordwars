(function (root) {
  const WW = root.WordWars || (root.WordWars = {});

  WW.setDictionary = function setDictionary(words) {
    WW.WORDS = Array.isArray(words) ? words : [];
    WW.WORD_SET = new Set(
      WW.WORDS.map(function (word) {
        return String(word).toLowerCase();
      })
    );
  };

  WW.hasWord = function hasWord(word) {
    if (!WW.WORD_SET) {
      WW.setDictionary(WW.WORDS || []);
    }
    return WW.WORD_SET.has(String(word).toLowerCase());
  };

  if (WW.WORDS && WW.WORDS.length) {
    WW.setDictionary(WW.WORDS);
  }

  if (typeof module !== "undefined") module.exports = WW;
})(typeof globalThis !== "undefined" ? globalThis : this);
