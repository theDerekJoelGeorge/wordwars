const test = require("node:test");
const assert = require("node:assert/strict");

require("../js/words.js");
require("../js/scoring.js");
require("../js/dictionary.js");
require("../js/shop.js");
require("../js/engine.js");
const WW = require("../js/daily.js");

test("dailyDateKey follows the device local calendar day", () => {
  const morning = new Date(2026, 8, 5, 0, 15, 0);
  const night = new Date(2026, 8, 5, 23, 59, 0);
  assert.equal(WW.dailyDateKey(morning), "2026-09-05");
  assert.equal(WW.dailyDateKey(night), "2026-09-05");
  assert.ok(WW.msUntilNextDaily(morning) > 0);
  assert.ok(WW.msUntilNextDaily(night) <= 60 * 1000);
});

test("the same local date always builds the same daily puzzle", () => {
  const first = WW.createDailyPuzzle("2026-09-05");
  const second = WW.createDailyPuzzle("2026-09-05");
  assert.equal(first.dateKey, "2026-09-05");
  assert.deepEqual(first.frozenSlots, second.frozenSlots);
  assert.deepEqual(first.letterPoints, second.letterPoints);
  assert.equal(first.frozenSlots.length, 1);
  assert.ok(first.frozenSlots[0].letter);
  assert.ok(first.frozenSlots[0].index >= 0);
  assert.ok(first.frozenSlots[0].index < 5);
});

test("daily rooms use a prefixed id the party server can recognize", () => {
  assert.equal(WW.dailyRoomId("2026-09-05"), "daily-2026-09-05");
  assert.equal(WW.dateKeyFromRoomId("daily-2026-09-05"), "2026-09-05");
  assert.equal(WW.dateKeyFromRoomId("2026-09-05"), "2026-09-05");
  assert.equal(WW.dateKeyFromRoomId("CRANE"), "");
});

test("seeded rng is deterministic", () => {
  const a = WW.createSeededRng("worsus-daily:2026-09-05");
  const b = WW.createSeededRng("worsus-daily:2026-09-05");
  assert.equal(a(), b());
  assert.equal(a(), b());
});

test("daily word must be real and keep the frozen letter", () => {
  const puzzle = {
    dateKey: "2026-09-05",
    frozenSlots: [{ index: 0, letter: "C" }],
    letterPoints: WW.cloneLetterPoints(WW.LETTER_POINTS),
  };
  const valid = WW.validateDailyWord("crane", puzzle);
  assert.equal(valid.ok, true);
  assert.equal(valid.word, "crane");
  assert.equal(valid.score, WW.wordValue("crane", puzzle.letterPoints));

  assert.equal(WW.validateDailyWord("plane", puzzle).ok, false);
  assert.equal(WW.validateDailyWord("plane", puzzle).reason, "wrong_letter");
  assert.equal(WW.validateDailyWord("cxxxx", puzzle).reason, "not_a_word");
  assert.equal(WW.validateDailyWord("cat", puzzle).reason, "incomplete");
});

test("leaderboard keeps only the first entry per device", () => {
  let entries = {};
  const first = WW.applyDailyBest(entries, "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", {
    name: "Ada",
    word: "crane",
    score: 12,
    at: 100,
  });
  assert.equal(first.improved, true);
  entries = first.entries;

  const worse = WW.applyDailyBest(entries, "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", {
    name: "Ada",
    word: "cable",
    score: 8,
    at: 200,
  });
  assert.equal(worse.improved, false);
  assert.equal(worse.entries.aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.word, "crane");

  const better = WW.applyDailyBest(entries, "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", {
    name: "Ada",
    word: "crazy",
    score: 20,
    at: 400,
  });
  assert.equal(better.improved, false);
  assert.equal(better.entries.aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.word, "crane");
});

test("ranks sort by score then time and keep you outside the top 25", () => {
  const entries = {};
  for (let i = 0; i < 26; i += 1) {
    const id = String(i).padStart(32, "0");
    entries[id] = {
      name: "P" + i,
      word: "crane",
      score: 50 - i,
      at: 1000 + i,
    };
  }
  const youId = "00000000000000000000000000000025";
  const board = WW.rankDailyEntries(entries, youId);
  assert.equal(board.total, 26);
  assert.equal(board.ranks.length, 25);
  assert.equal(board.ranks[0].score, 50);
  assert.equal(board.you.rank, 26);
  assert.equal(board.you.score, 25);
  assert.equal(
    board.ranks.some(function (row) {
      return row.you;
    }),
    false
  );
});

test("tied scores share the same leaderboard place", () => {
  const entries = {
    aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa: {
      name: "Ada",
      word: "crane",
      score: 20,
      at: 100,
    },
    bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb: {
      name: "Bea",
      word: "crate",
      score: 20,
      at: 200,
    },
    cccccccccccccccccccccccccccccccc: {
      name: "Cyd",
      word: "cable",
      score: 10,
      at: 300,
    },
  };
  const board = WW.rankDailyEntries(
    entries,
    "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
  );
  assert.equal(board.ranks[0].rank, 1);
  assert.equal(board.ranks[1].rank, 1);
  assert.equal(board.ranks[2].rank, 3);
  assert.equal(board.you.rank, 1);
  assert.equal(board.ranks[0].name, "Ada");
  assert.equal(board.ranks[1].name, "Bea");
});

test("daily play state scores a fitting word", () => {
  const puzzle = WW.createDailyPuzzle("2026-09-05");
  const slot = puzzle.frozenSlots[0];
  const match = (WW.WORDS || []).find(function (word) {
    return word.charAt(slot.index) === slot.letter.toLowerCase();
  });
  assert.ok(match);
  let state = WW.createDailyPlayState(puzzle, "Ada");
  assert.equal(state.daily, true);
  assert.equal(state.phase, "playing");
  assert.equal(state.draft[slot.index], slot.letter);
  for (let i = 0; i < match.length; i += 1) {
    if (i === slot.index) continue;
    state = WW.reduce(state, { type: "TYPE", letter: match.charAt(i) });
  }
  state = WW.submitDailyWord(state, puzzle);
  assert.equal(state.phase, "revealing");
  assert.equal(state.lastSubmitResult.word, match);
  assert.equal(
    state.lastSubmitResult.points,
    WW.wordValue(match, puzzle.letterPoints)
  );
});
