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

  WW.meaning = function meaning(word) {
    const map = WW.MEANINGS || {};
    return map[String(word || "").toLowerCase()] || "";
  };

  WW.meaningSource = function meaningSource(word) {
    const key = String(word || "").toLowerCase();
    if (!WW.meaning(key)) return "";
    const wiki = WW.WIKTIONARY_WORDS;
    if (Array.isArray(wiki) && wiki.indexOf(key) !== -1) return "Wiktionary";
    return "Open English WordNet";
  };

  WW.meaningSourceUrl = function meaningSourceUrl(word) {
    const key = String(word || "").toLowerCase();
    if (!WW.meaning(key)) return "";
    if (WW.meaningSource(key) === "Wiktionary") {
      return "https://en.wiktionary.org/wiki/" + encodeURIComponent(key);
    }
    return "https://en-word.net/lemma/" + encodeURIComponent(key);
  };

  if (WW.WORDS && WW.WORDS.length) {
    WW.setDictionary(WW.WORDS);
  }

  if (typeof module !== "undefined") module.exports = WW;
})(typeof globalThis !== "undefined" ? globalThis : this);
