/**
 * Downloads the raw inputs used by tools/filter-words.js into tools/data,
 * which is gitignored. Only the filtered result (tools/word-source.txt) and
 * the generated js/words.js are committed.
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const dataDir = path.join(__dirname, "data");
fs.mkdirSync(dataDir, { recursive: true });

const downloads = [
  {
    // Wordle's accepted-guess list: every word the game will let you type.
    url: "https://raw.githubusercontent.com/tabatkins/wordle-list/main/words",
    file: "wordle-guesses.txt",
  },
  {
    // Wordle's answer list: hand-curated everyday words.
    url: "https://gist.githubusercontent.com/cfreshman/a03ef2cba789d8cf00c08f767e0fad7b/raw/wordle-answers-alphabetical.txt",
    file: "wordle-answers.txt",
  },
];

for (const { url, file } of downloads) {
  const dest = path.join(dataDir, file);
  execFileSync("curl", ["-sL", "-o", dest, url], { stdio: "inherit" });
  const lines = fs.readFileSync(dest, "utf8").split(/\r?\n/).filter(Boolean).length;
  console.log(`${file}: ${lines} lines`);
}

// SCOWL word lists, shipped as JSON by the wordlist-english package.
const tarball = execFileSync(
  "npm",
  ["pack", "wordlist-english@1.2.1", "--pack-destination", dataDir, "--silent"],
  { encoding: "utf8", shell: true }
)
  .trim()
  .split(/\r?\n/)
  .pop();

execFileSync("tar", ["-xzf", path.join(dataDir, tarball), "-C", dataDir], {
  stdio: "inherit",
});
console.log("scowl: extracted to tools/data/package");
