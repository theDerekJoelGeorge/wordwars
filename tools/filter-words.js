/**
 * Rebuilds tools/word-source.txt from the raw Wordle guess list.
 *
 * The raw list is the Wordle *accepted guess* list, not its answer list, so it
 * carries thousands of Collins-Scrabble entries ("broos", "gurks", "fluyt")
 * that read as gibberish in a party game. We keep a word only if a spell
 * checker would accept it, using SCOWL sizes 10-60. Size 70 is excluded
 * because it is mostly proper nouns.
 *
 * Usage: node tools/filter-words.js [--report]
 * Inputs are downloaded by tools/fetch-sources.js into tools/data (gitignored).
 */
const fs = require("fs");
const path = require("path");

const toolsDir = __dirname;
const dataDir = path.join(toolsDir, "data");
const scowlDir = path.join(dataDir, "package");

const SCOWL_DIALECTS = ["english", "american", "british", "canadian", "australian"];
const SCOWL_SIZES = [10, 20, 35, 40, 50, 55, 60];
const FIVE_LETTER = /^[a-z]{5}$/;

function readLines(file) {
  return fs
    .readFileSync(file, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim().toLowerCase())
    .filter(Boolean);
}

function loadSpellCheckerWords() {
  const words = new Set();
  for (const dialect of SCOWL_DIALECTS) {
    for (const size of SCOWL_SIZES) {
      const file = path.join(scowlDir, `${dialect}-words-${size}.json`);
      if (!fs.existsSync(file)) continue;
      for (const entry of JSON.parse(fs.readFileSync(file, "utf8"))) {
        const word = String(entry).toLowerCase();
        if (FIVE_LETTER.test(word)) words.add(word);
      }
    }
  }
  return words;
}

const rawList = path.join(dataDir, "wordle-guesses.txt");
const answerList = path.join(dataDir, "wordle-answers.txt");
for (const file of [rawList, answerList, scowlDir]) {
  if (!fs.existsSync(file)) {
    console.error("Missing input:", file, "\nRun: node tools/fetch-sources.js");
    process.exit(1);
  }
}

const guesses = readLines(rawList).filter((word) => FIVE_LETTER.test(word));
const answers = new Set(readLines(answerList));
const spellCheck = loadSpellCheckerWords();

// Wordle answers are hand-curated as everyday words, so they stay in even on
// the rare occasion SCOWL disagrees.
let kept = [
  ...new Set(guesses.filter((word) => spellCheck.has(word) || answers.has(word))),
].sort();

/**
 * A turn freezes a slot from the word just played, and that word is then spent.
 * If a word is the only one with letter L at position P, freezing that slot
 * leaves the next player nothing to type. Thinning the list can create these
 * dead ends (it made "burqa" the sole word with "q" at position 3), so drop
 * them. Removing a word can strand another, hence the loop.
 */
function dropDeadEnds(list) {
  let words = list;
  for (;;) {
    const counts = new Map();
    for (const word of words) {
      for (let i = 0; i < 5; i += 1) {
        const key = i + word[i];
        counts.set(key, (counts.get(key) || 0) + 1);
      }
    }
    const doomed = new Set(
      words.filter((word) =>
        [0, 1, 2, 3, 4].some((i) => counts.get(i + word[i]) === 1)
      )
    );
    if (!doomed.size) return words;
    console.log("removing dead-end words:", [...doomed].join(" "));
    words = words.filter((word) => !doomed.has(word));
  }
}

kept = dropDeadEnds(kept);

fs.writeFileSync(path.join(toolsDir, "word-source.txt"), kept.join("\n") + "\n");
console.log(
  `kept ${kept.length} of ${new Set(guesses).size} words ` +
    `(dropped ${new Set(guesses).size - kept.length})`
);

if (process.argv.includes("--report")) {
  const keptSet = new Set(kept);
  const dropped = [...new Set(guesses)].filter((word) => !keptSet.has(word)).sort();
  fs.writeFileSync(path.join(dataDir, "dropped.txt"), dropped.join("\n") + "\n");
  console.log("wrote tools/data/dropped.txt for review");
}
