const fs = require("fs");
const path = require("path");

const sources = [
  path.join(
    process.env.USERPROFILE || "",
    ".cursor/projects/c-Users-derek-OneDrive-Desktop-wordwars/agent-tools/b98d24d1-9344-4d49-a2c4-713079a0f8d5.txt"
  ),
  path.join(__dirname, "word-source.txt"),
];

let text = "";
for (const file of sources) {
  if (fs.existsSync(file)) {
    text = fs.readFileSync(file, "utf8");
    break;
  }
}

if (!text) {
  console.error("No word source found");
  process.exit(1);
}

const words = [
  ...new Set(
    text
      .split(/\r?\n/)
      .map((word) => word.trim().toLowerCase())
      .filter((word) => /^[a-z]{5}$/.test(word))
  ),
].sort();

const out = `(function (root) {
  const WW = root.WordWars || (root.WordWars = {});
  WW.WORDS = ${JSON.stringify(words)};
  if (typeof module !== "undefined") module.exports = WW;
})(typeof globalThis !== "undefined" ? globalThis : this);
`;

fs.mkdirSync(path.join(__dirname, "..", "js"), { recursive: true });
fs.writeFileSync(path.join(__dirname, "..", "js", "words.js"), out);
console.log("wrote", words.length, "words");
