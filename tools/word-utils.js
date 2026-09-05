const fs = require("fs");

function readLines(file) {
  return fs
    .readFileSync(file, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * A turn freezes a slot from the word just played, and that word is then spent.
 * If a word is the only one with letter L at position P, freezing that slot
 * leaves the next player nothing to type. Removing a word can strand another,
 * hence the loop.
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

function stripMarkup(text) {
  return String(text || "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function cleanGloss(raw) {
  let text = stripMarkup(raw);
  text = text.split(";")[0];
  text = text.replace(/\s+/g, " ").trim();
  text = text.replace(/^["'`]+|["'`]+$/g, "");
  const sentence = text.match(/^(.+?[.!?])(?:\s|$)/);
  if (sentence) text = sentence[1].trim();
  if (text && !/[.!?]$/.test(text)) text += ".";
  return text;
}

module.exports = { readLines, dropDeadEnds, stripMarkup, cleanGloss };
