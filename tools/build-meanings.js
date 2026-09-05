/**
 * Builds js/meanings.js and keeps the playable list in sync: a word is only
 * legal if it has a bundled gloss.
 *
 * Primary source: Open English WordNet 2025 (CC BY 4.0).
 * Gap fill: Wiktionary REST API at build time (CC BY-SA 3.0).
 *
 * Usage: node tools/build-meanings.js
 * Inputs: tools/word-source.txt and tools/data/oewn/oewn2025
 *   (run node tools/fetch-sources.js if OEWN is missing)
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { readLines, dropDeadEnds, stripMarkup, cleanGloss } = require("./word-utils");

const toolsDir = __dirname;
const dataDir = path.join(toolsDir, "data");
const oewnDir = path.join(dataDir, "oewn", "oewn2025");
const wikiCacheDir = path.join(dataDir, "wiktionary");
const sourceFile = path.join(toolsDir, "word-source.txt");
const POS_ORDER = ["noun", "verb", "adj", "adv"];
const USER_AGENT = "worsus-meanings/1.0 (https://www.worsus.com/; dictionary build)";

if (!fs.existsSync(sourceFile)) {
  console.error("Missing", sourceFile);
  process.exit(1);
}
if (!fs.existsSync(path.join(oewnDir, "data.noun"))) {
  console.error("Missing OEWN data at", oewnDir, "\nRun: node tools/fetch-sources.js");
  process.exit(1);
}

function isDataLine(line) {
  return /^[a-z0-9]/.test(line);
}

function loadExceptions() {
  const map = new Map();
  for (const pos of POS_ORDER) {
    const file = path.join(oewnDir, pos + ".exc");
    if (!fs.existsSync(file)) continue;
    for (const raw of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
      const line = raw.trim().toLowerCase();
      if (!isDataLine(line)) continue;
      const parts = line.split(/\s+/);
      if (parts.length < 2) continue;
      const existing = map.get(parts[0]) || [];
      map.set(parts[0], existing.concat(parts.slice(1)));
    }
  }
  return map;
}

function loadLemmaOffsets() {
  const map = new Map();
  for (const pos of POS_ORDER) {
    const file = path.join(oewnDir, "index." + pos);
    for (const raw of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
      const line = raw.trim().toLowerCase();
      if (!isDataLine(line)) continue;
      const parts = line.split(/\s+/);
      if (parts.length < 8) continue;
      const lemma = parts[0].replace(/_/g, " ");
      const pointerCount = Number(parts[3]);
      if (!Number.isFinite(pointerCount)) continue;
      const offsets = parts.slice(4 + pointerCount + 2).filter((part) => /^\d{8}$/.test(part));
      if (!offsets.length) continue;
      if (!map.has(lemma)) map.set(lemma, []);
      map.get(lemma).push({ pos, offset: offsets[0] });
    }
  }
  return map;
}

function loadGlosses() {
  const map = new Map();
  for (const pos of POS_ORDER) {
    const file = path.join(oewnDir, "data." + pos);
    for (const raw of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
      if (!/^\d{8} /.test(raw)) continue;
      const pipe = raw.indexOf(" | ");
      if (pipe < 0) continue;
      const offset = raw.slice(0, 8);
      map.set(pos + ":" + offset, raw.slice(pipe + 3));
    }
  }
  return map;
}

function stemsFor(word) {
  const w = word.toLowerCase();
  const out = [w];
  if (w.endsWith("ies") && w.length > 4) out.push(w.slice(0, -3) + "y");
  if (w.endsWith("ves") && w.length > 4) {
    out.push(w.slice(0, -3) + "f", w.slice(0, -3) + "fe");
  }
  if (w.endsWith("es") && w.length > 3) out.push(w.slice(0, -2));
  if (w.endsWith("s") && !w.endsWith("ss") && w.length > 2) out.push(w.slice(0, -1));
  if (w.endsWith("ied") && w.length > 4) out.push(w.slice(0, -3) + "y");
  if (w.endsWith("ed") && w.length > 3) {
    out.push(w.slice(0, -2), w.slice(0, -1));
    if (w.length > 5 && w[w.length - 3] === w[w.length - 4]) out.push(w.slice(0, -3));
  }
  if (w.endsWith("ing") && w.length > 4) {
    out.push(w.slice(0, -3), w.slice(0, -3) + "e");
    if (w.length > 6 && w[w.length - 4] === w[w.length - 5]) out.push(w.slice(0, -4));
  }
  if (w.endsWith("er") && w.length > 3) out.push(w.slice(0, -2), w.slice(0, -1));
  if (w.endsWith("est") && w.length > 4) out.push(w.slice(0, -3), w.slice(0, -2));
  if (w.endsWith("ier") && w.length > 4) out.push(w.slice(0, -3) + "y");
  if (w.endsWith("iest") && w.length > 5) out.push(w.slice(0, -4) + "y");
  if (w.endsWith("men") && w.length > 3) out.push(w.slice(0, -3) + "man");
  return [...new Set(out)];
}

function lookupOewn(word, exceptions, lemmas, glosses) {
  const forms = [word];
  const exc = exceptions.get(word);
  if (exc) forms.push(...exc);
  forms.push(...stemsFor(word));
  const seen = new Set();
  for (const form of forms) {
    if (seen.has(form)) continue;
    seen.add(form);
    const hits = lemmas.get(form);
    if (!hits) continue;
    for (const hit of hits) {
      const raw = glosses.get(hit.pos + ":" + hit.offset);
      const gloss = cleanGloss(raw);
      if (gloss) return gloss;
    }
  }
  return "";
}

function inflectionLemma(definition) {
  const plain = stripMarkup(definition).replace(/[.]+$/, "").trim();
  const match = plain.match(
    /^(?:simple past|past participle|present participle|gerund|third-person singular(?: simple present)?|plural|comparative(?: form)?|superlative(?: form)?)(?: form)? of (.+)$/i
  );
  if (!match) return "";
  return match[1].trim().split(/\s+/)[0].toLowerCase().replace(/[^a-z]/g, "");
}

function firstWiktionaryDefinition(payload) {
  const groups = payload && payload.en;
  if (!Array.isArray(groups)) return "";
  for (const group of groups) {
    const defs = group && group.definitions;
    if (!Array.isArray(defs)) continue;
    for (const entry of defs) {
      const definition = entry && entry.definition;
      if (definition) return definition;
    }
  }
  return "";
}

async function fetchWiktionary(word) {
  fs.mkdirSync(wikiCacheDir, { recursive: true });
  const cacheFile = path.join(wikiCacheDir, word + ".json");
  if (fs.existsSync(cacheFile)) {
    try {
      return JSON.parse(fs.readFileSync(cacheFile, "utf8"));
    } catch (err) {
      // Rebuild a bad cache entry below.
    }
  }
  const url = "https://en.wiktionary.org/api/rest_v1/page/definition/" + encodeURIComponent(word);
  const response = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
  });
  let payload = null;
  if (response.status === 200) {
    payload = await response.json();
  } else if (response.status !== 404) {
    console.warn("wiktionary", word, response.status);
  }
  fs.writeFileSync(cacheFile, JSON.stringify(payload));
  await new Promise((resolve) => setTimeout(resolve, 120));
  return payload;
}

async function lookupWiktionary(word, exceptions, lemmas, glosses, depth) {
  if (depth > 2) return null;
  const payload = await fetchWiktionary(word);
  const raw = firstWiktionaryDefinition(payload);
  if (!raw) return null;
  const lemma = inflectionLemma(raw);
  if (lemma && lemma !== word) {
    const viaOewn = lookupOewn(lemma, exceptions, lemmas, glosses);
    if (viaOewn) return { gloss: viaOewn, source: "oewn" };
    const viaWiki = await lookupWiktionary(lemma, exceptions, lemmas, glosses, depth + 1);
    if (viaWiki) return viaWiki;
  }
  const gloss = cleanGloss(raw);
  return gloss ? { gloss, source: "wiktionary" } : null;
}

function writeMeanings(meanings, wikiWords) {
  const out = `(function (root) {
  const WW = root.WordWars || (root.WordWars = {});
  WW.MEANINGS = ${JSON.stringify(meanings)};
  WW.WIKTIONARY_WORDS = ${JSON.stringify(wikiWords)};
  if (typeof module !== "undefined") module.exports = WW;
})(typeof globalThis !== "undefined" ? globalThis : this);
`;
  fs.writeFileSync(path.join(toolsDir, "..", "js", "meanings.js"), out);
}

async function main() {
  const candidates = [
    ...new Set(readLines(sourceFile).filter((word) => /^[a-z]{5}$/.test(word))),
  ].sort();
  console.log("loading Open English WordNet 2025…");
  const exceptions = loadExceptions();
  const lemmas = loadLemmaOffsets();
  const glosses = loadGlosses();

  const meanings = {};
  const sources = {};
  const missing = [];
  for (const word of candidates) {
    const gloss = lookupOewn(word, exceptions, lemmas, glosses);
    if (gloss) {
      meanings[word] = gloss;
      sources[word] = "oewn";
    } else missing.push(word);
  }
  console.log("oewn matched", Object.keys(meanings).length, "missing", missing.length);

  for (let i = 0; i < missing.length; i += 1) {
    const word = missing[i];
    if ((i + 1) % 50 === 0 || i === 0) {
      console.log("wiktionary", i + 1, "/", missing.length);
    }
    const hit = await lookupWiktionary(word, exceptions, lemmas, glosses, 0);
    if (hit && hit.gloss) {
      meanings[word] = hit.gloss;
      sources[word] = hit.source;
    }
  }

  const defined = candidates.filter((word) => meanings[word]);
  const droppedForMeaning = candidates.filter((word) => !meanings[word]);
  const beforeDeadEnds = defined.length;
  const kept = dropDeadEnds(defined);
  const keptSet = new Set(kept);
  const droppedAsDeadEnd = defined.filter((word) => !keptSet.has(word));
  const finalMeanings = {};
  const wikiWords = [];
  for (const word of kept) {
    finalMeanings[word] = meanings[word];
    if (sources[word] === "wiktionary") wikiWords.push(word);
  }

  fs.writeFileSync(sourceFile, kept.join("\n") + "\n");
  writeMeanings(finalMeanings, wikiWords);
  execFileSync(process.execPath, [path.join(toolsDir, "build-words.js")], {
    stdio: "inherit",
  });

  fs.writeFileSync(
    path.join(dataDir, "dropped-no-meaning.txt"),
    droppedForMeaning.join("\n") + (droppedForMeaning.length ? "\n" : "")
  );

  console.log(
    "kept",
    kept.length,
    "of",
    candidates.length,
    "words (dropped-for-meaning",
    droppedForMeaning.length,
    ", dropped-as-dead-end",
    droppedAsDeadEnd.length,
    ", defined-before-dead-ends",
    beforeDeadEnds + ")"
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
