const fs = require("fs");
const path = require("path");

const source = path.join(__dirname, "word-source.txt");

if (!fs.existsSync(source)) {
  console.error("No word source found at", source);
  process.exit(1);
}

const text = fs.readFileSync(source, "utf8");

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
