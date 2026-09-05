const test = require("node:test");
const assert = require("node:assert/strict");

require("../js/words.js");
require("../js/meanings.js");
const WW = require("../js/dictionary.js");

test("every playable word has a bundled meaning", () => {
  assert.ok(WW.WORDS.length > 0);
  for (const word of WW.WORDS) {
    assert.ok(WW.meaning(word), "missing meaning for " + word);
  }
});

test("meaning lookup is case-insensitive", () => {
  const gloss = WW.meaning("stars");
  assert.ok(gloss);
  assert.match(gloss, /thermonuclear reactions in the interior\.$/);
  assert.doesNotMatch(gloss, /…/);
  assert.equal(WW.meaning("STARS"), gloss);
  assert.equal(WW.meaning("Stars"), gloss);
});

test("meaning source names the dictionary for a playable word", () => {
  assert.equal(WW.meaningSource("stars"), "Open English WordNet");
  assert.equal(WW.meaningSource("STARS"), "Open English WordNet");
  assert.equal(WW.meaningSource("inbox"), "Wiktionary");
  assert.equal(WW.meaningSource("qxzqv"), "");
  assert.equal(WW.meaningSourceUrl("stars"), "https://en-word.net/lemma/stars");
  assert.equal(WW.meaningSourceUrl("inbox"), "https://en.wiktionary.org/wiki/inbox");
  assert.equal(WW.meaningSourceUrl("qxzqv"), "");
});

test("unknown words have no meaning and are not valid", () => {
  assert.equal(WW.meaning("qxzqv"), "");
  assert.equal(WW.hasWord("qxzqv"), false);
});

test("words dropped for missing meanings are not valid", () => {
  assert.equal(WW.hasWord("aftos"), false);
  assert.equal(WW.hasWord("versa"), false);
  assert.equal(WW.meaning("aftos"), "");
  assert.equal(WW.meaning("versa"), "");
});
