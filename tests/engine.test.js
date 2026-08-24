const test = require("node:test");
const assert = require("node:assert/strict");

require("../js/words.js");
require("../js/scoring.js");
require("../js/dictionary.js");
require("../js/shop.js");
const WW = require("../js/engine.js");
require("../js/ai.js");

function rngSeq(values) {
  let i = 0;
  return function () {
    const value = values[Math.min(i, values.length - 1)];
    i += 1;
    return value;
  };
}

function isFrozenSlot(state, index) {
  return (state.frozenSlots || []).some(function (slot) {
    return slot.index === index;
  });
}

function beginPlay(state, nowMs, rng) {
  let next = WW.reduce(state, { type: "READY", nowMs: nowMs }, rng);
  if (next.phase === "spinning") {
    next = WW.reduce(next, { type: "SPIN_DONE", nowMs: nowMs }, rng);
  }
  return next;
}

function typeWord(state, word, rng) {
  let next = state;
  for (let i = 0; i < word.length; i += 1) {
    if (isFrozenSlot(next, i)) continue;
    next = WW.reduce(next, { type: "TYPE", letter: word[i] }, rng);
  }
  return WW.reduce(next, { type: "SUBMIT" }, rng);
}

function stableLetterPoints() {
  return WW.cloneLetterPoints(WW.LETTER_POINTS);
}

function startTwo(rng) {
  let state = WW.createGame();
  state = WW.reduce(
    state,
    {
      type: "START",
      playerCount: 2,
      names: ["Ada", "Bea"],
      letterPoints: stableLetterPoints(),
    },
    rng
  );
  state = beginPlay(state, 1_000, rng);
  return state;
}

test("scoring uses Scrabble letter values only", () => {
  assert.equal(WW.wordValue("crane"), 7);
  assert.equal(WW.wordValue("quiz"), 22);
  assert.equal(WW.scoreWord("crane"), 7);
  assert.equal(WW.scoreWord("crane", 15_000), 7);
  assert.equal(WW.scoreWord("crane", 0), 7);
});

test("freeze is chosen after the next player is ready", () => {
  const rng = rngSeq([0.4]);
  let state = startTwo(rng);
  state = typeWord(state, "crane", rng);
  assert.equal(state.phase, "revealing");
  assert.equal(state.lastWord, "crane");
  assert.equal(state.frozenSlots.length, 0);
  assert.equal(state.players[0].score, 0);
  assert.equal(state.players[0].turnsTaken, 0);
  assert.equal(state.lastSubmitResult.opening, true);
  assert.equal(state.seeded, true);
  state = WW.reduce(state, { type: "REVEAL_DONE" }, rng);
  assert.equal(state.phase, "handoff");
  assert.equal(state.frozenSlots.length, 0);
  state = WW.reduce(state, { type: "READY", nowMs: 2_000 }, rng);
  assert.equal(state.phase, "spinning");
  assert.equal(state.frozenSlots.length, 1);
  assert.equal(state.frozenSlots[0].index, 2);
  assert.equal(state.frozenSlots[0].letter, "A");
  assert.equal(state.turnEndsAt, 2_000 + WW.TURN_MS);
  assert.deepEqual(state.draft, ["C", "R", "A", "N", "E"]);
  state = WW.reduce(state, { type: "SPIN_DONE", nowMs: 2_000 }, rng);
  assert.equal(state.phase, "playing");
  assert.equal(state.turnEndsAt, 2_000 + WW.TURN_MS);
  assert.deepEqual(state.draft, ["", "", "A", "", ""]);
});

test("next word must include the frozen letter in that slot", () => {
  const rng = rngSeq([0.4, 0.4]);
  let state = startTwo(rng);
  state = typeWord(state, "crane", rng);
  state = WW.reduce(state, { type: "REVEAL_DONE" }, rng);
  state = beginPlay(state, 2_000, rng);
  state = typeWord(state, "zzazz", rng);
  assert.equal(state.phase, "playing");
  assert.equal(state.invalidReason, "not_a_word");
  state = WW.reduce(state, { type: "BACKSPACE" }, rng);
  state = WW.reduce(state, { type: "BACKSPACE" }, rng);
  state = WW.reduce(state, { type: "BACKSPACE" }, rng);
  state = WW.reduce(state, { type: "BACKSPACE" }, rng);
  state = typeWord(state, "slate", rng);
  assert.equal(state.phase, "revealing");
  assert.equal(state.lastWord, "slate");
  assert.equal(state.invalidReason, null);
});

test("reused words are rejected and the timer keeps running", () => {
  const rng = rngSeq([0.4]);
  let state = startTwo(rng);
  state = typeWord(state, "crane", rng);
  state = WW.reduce(state, { type: "REVEAL_DONE" }, rng);
  state = beginPlay(state, 2_000, rng);
  const before = state.timeRemainingMs;
  state = typeWord(state, "crane", rng);
  assert.equal(state.invalidReason, "reused");
  assert.equal(state.phase, "playing");
  assert.equal(state.timeRemainingMs, before);
  assert.equal(state.shakeNonce, 1);
});

test("timeout scores 0 and the next ready spin re-rolls from the last word", () => {
  const rng = rngSeq([0.4, 0.99]);
  let state = startTwo(rng);
  state = typeWord(state, "crane", rng);
  state = WW.reduce(state, { type: "REVEAL_DONE" }, rng);
  state = beginPlay(state, 5_000, rng);
  state = WW.reduce(state, { type: "TICK", nowMs: 5_000 + WW.TURN_MS }, rng);
  assert.equal(state.phase, "revealing");
  assert.equal(state.lastSubmitResult.timedOut, true);
  assert.equal(state.lastSubmitResult.points, 0);
  assert.equal(state.players[1].score, 0);
  assert.equal(state.players[1].turnsTaken, 1);
  assert.equal(state.lastWord, "crane");
  assert.equal(state.frozenSlots.length, 0);
  assert.equal(state.playLog.length, 1);
  assert.equal(state.playLog[0].word, "crane");
  assert.equal(state.playLog[0].opening, true);
  state = WW.reduce(state, { type: "REVEAL_DONE" }, rng);
  state = WW.reduce(state, { type: "READY", nowMs: 40_000 }, rng);
  assert.equal(state.phase, "spinning");
  assert.equal(state.frozenSlots.length, 1);
  assert.equal(state.frozenSlots[0].index, 4);
  assert.equal(state.frozenSlots[0].letter, "E");
});

test("seed timeout leaves the next player as the seeder", () => {
  const rng = rngSeq([0]);
  let state = startTwo(rng);
  state = WW.reduce(state, { type: "TIMEOUT" }, rng);
  state = WW.reduce(state, { type: "REVEAL_DONE" }, rng);
  assert.equal(state.phase, "handoff");
  assert.equal(state.currentPlayerIndex, 1);
  assert.equal(state.frozenSlots.length, 0);
  assert.equal(state.lastWord, null);
  assert.equal(state.players[0].turnsTaken, 0);
  assert.equal(state.seeded, false);
});

test("game ends after five turns each with a unique winner", () => {
  const words = [
    "crane",
    "slate",
    "grace",
    "brace",
    "trace",
    "share",
    "spare",
    "stare",
    "scare",
    "scale",
    "place",
  ];
  const rng = rngSeq([0.4]);
  let state = WW.createGame();
  state = WW.reduce(
    state,
    { type: "START", playerCount: 2, names: ["Ada", "Bea"], letterPoints: stableLetterPoints() },
    rng
  );
  words.forEach(function (word, turn) {
    state = beginPlay(state, (turn + 1) * 1_000, rng);
    state = WW.reduce(
      state,
      { type: "TICK", nowMs: (turn + 1) * 1_000 + (turn === 0 ? 0 : 10_000) },
      rng
    );
    state = typeWord(state, word, rng);
    state = WW.reduce(state, { type: "REVEAL_DONE" }, rng);
  });
  assert.equal(state.phase, "game_over");
  assert.equal(WW.winners(state).length, 1);
  assert.equal(WW.winners(state)[0].name, "Ada");
  assert.ok(state.players[0].score > state.players[1].score);
});

test("opening word scores nothing and the seeder plays last", () => {
  const rng = rngSeq([0.4]);
  let state = startTwo(rng);
  state = typeWord(state, "crane", rng);
  assert.equal(state.players[0].score, 0);
  assert.equal(state.players[0].turnsTaken, 0);
  assert.equal(state.seeded, true);
  state = WW.reduce(state, { type: "REVEAL_DONE" }, rng);
  assert.equal(state.currentPlayerIndex, 1);

  state = beginPlay(state, 2_000, rng);
  state = typeWord(state, "slate", rng);
  assert.equal(state.players[1].turnsTaken, 1);
  assert.equal(state.players[1].score, 5);
  state = WW.reduce(state, { type: "REVEAL_DONE" }, rng);
  assert.equal(state.currentPlayerIndex, 0);
  assert.equal(state.players[0].turnsTaken, 0);
});

test("a one-round match ends after one scoring turn each", () => {
  const rng = rngSeq([0.4]);
  let state = WW.createGame();
  state = WW.reduce(
    state,
    {
      type: "START",
      playerCount: 2,
      names: ["Ada", "Bea"],
      turnsPerPlayer: 1,
      letterPoints: stableLetterPoints(),
    },
    rng
  );
  ["crane", "slate", "grace"].forEach(function (word, turn) {
    state = beginPlay(state, (turn + 1) * 1_000, rng);
    state = typeWord(state, word, rng);
    state = WW.reduce(state, { type: "REVEAL_DONE" }, rng);
  });
  assert.equal(state.phase, "game_over");
  assert.equal(state.players[0].turnsTaken, 1);
  assert.equal(state.players[1].turnsTaken, 1);
  assert.equal(state.players[0].score, 8);
  assert.equal(state.players[1].score, 5);
  assert.equal(WW.winners(state)[0].name, "Ada");
  assert.deepEqual(
    state.playLog.map(function (entry) {
      return {
        word: entry.word,
        points: entry.points,
        playerName: entry.playerName,
        opening: entry.opening,
      };
    }),
    [
      { word: "crane", points: 0, playerName: "Ada", opening: true },
      { word: "slate", points: 5, playerName: "Bea", opening: false },
      { word: "grace", points: 8, playerName: "Ada", opening: false },
    ]
  );
});

test("a tie starts one sudden-death turn for the leaders", () => {
  const rng = rngSeq([0.4]);
  let state = WW.createGame();
  state = WW.reduce(
    state,
    { type: "START", playerCount: 2, names: ["Ada", "Bea"], letterPoints: stableLetterPoints() },
    rng
  );
  const words = [
    "crane",
    "react",
    "grace",
    "brace",
    "trace",
    "share",
    "spare",
    "stare",
    "scare",
    "scale",
    "crate",
  ];
  words.forEach(function (word, turn) {
    state = beginPlay(state, 1_000, rng);
    state = typeWord(state, word, rng);
    state = WW.reduce(state, { type: "REVEAL_DONE" }, rng);
  });
  assert.equal(state.phase, "handoff");
  assert.equal(state.isSuddenDeath, true);
  assert.deepEqual(state.suddenDeathRemaining, [0, 1]);
  assert.equal(state.currentPlayerIndex, 0);

  state = beginPlay(state, 1_000, rng);
  state = typeWord(state, "shame", rng);
  state = WW.reduce(state, { type: "REVEAL_DONE" }, rng);
  assert.equal(state.phase, "handoff");
  assert.equal(state.currentPlayerIndex, 1);
  state = beginPlay(state, 1_000, rng);
  state = WW.reduce(state, { type: "TIMEOUT" }, rng);
  state = WW.reduce(state, { type: "REVEAL_DONE" }, rng);
  assert.equal(state.phase, "game_over");
  assert.equal(WW.winners(state)[0].name, "Ada");
});

function handoffWithScores(scores, rng) {
  let state = WW.createGame();
  state = WW.reduce(
    state,
    {
      type: "START",
      playerCount: scores.length,
      names: scores.map(function (_, i) {
        return "P" + (i + 1);
      }),
      letterPoints: stableLetterPoints(),
    },
    rng
  );
  state.players = state.players.map(function (player, index) {
    return Object.assign({}, player, { score: scores[index] });
  });
  state.seeded = true;
  return state;
}

test("BUY_SABOTAGE heist deducts cost and transfers points", () => {
  const rng = rngSeq([0.4]);
  let state = handoffWithScores([50, 40], rng);
  assert.equal(state.currentPlayerIndex, 0);
  state = WW.reduce(
    state,
    { type: "BUY_SABOTAGE", itemId: "heist", targetId: "p2" },
    rng
  );
  assert.equal(state.players[0].score, 45);
  assert.equal(state.players[1].score, 35);
  assert.match(state.lastShopMessage, /Point Heist/);
});

test("BUY_SABOTAGE heist rejects insufficient funds", () => {
  const rng = rngSeq([0.4]);
  let state = handoffWithScores([5, 40], rng);
  const before = state.players[0].score;
  state = WW.reduce(
    state,
    { type: "BUY_SABOTAGE", itemId: "heist", targetId: "p2" },
    rng
  );
  assert.equal(state.players[0].score, before);
  assert.equal(state.lastShopMessage, null);
});

test("BUY_SABOTAGE hostile takeover steals target's next turn points", () => {
  const rng = rngSeq([0.4]);
  let state = handoffWithScores([50, 37], rng);

  state = WW.reduce(
    state,
    { type: "BUY_SABOTAGE", itemId: "hostile_takeover", targetId: "p2" },
    rng
  );
  assert.equal(state.players[0].score, 30);
  assert.equal(state.players[1].score, 37);
  assert.equal(state.players[1].pendingEffects.length, 1);
  assert.equal(state.players[1].pendingEffects[0].type, "hostile_takeover");
  assert.match(state.lastShopMessage, /Hostile Takeover/);

  // p1 plays first (no freeze on first move in this test harness)
  state = beginPlay(state, 1_000, rng);
  state = typeWord(state, "crane", rng);
  state = WW.reduce(state, { type: "REVEAL_DONE" }, rng);

  // p2 plays next, but their points get stolen
  state = beginPlay(state, 2_000, rng);
  state = typeWord(state, "slate", rng);

  assert.equal(state.lastSubmitResult.points, 0);
  assert.equal(state.players[0].score, 42); // 30 + 7 (crane) + 5 (stolen from slate)
  assert.equal(state.players[1].score, 37);
  const lastPlay = state.playLog[state.playLog.length - 1];
  assert.equal(lastPlay.word, "slate");
  assert.equal(lastPlay.points, 5);
  assert.equal(lastPlay.playerName, "P2");
});

test("BUY_SABOTAGE time_tax shortens the target's next turn", () => {
  const rng = rngSeq([0.4, 0.4]);
  let state = handoffWithScores([50, 0], rng);
  state = WW.reduce(
    state,
    { type: "BUY_SABOTAGE", itemId: "time_tax", targetId: "p2" },
    rng
  );
  assert.equal(state.players[1].pendingEffects.length, 1);
  assert.equal(state.players[1].pendingEffects[0].type, "time_tax");
  state = beginPlay(state, 1_000, rng);
  state = typeWord(state, "crane", rng);
  state = WW.reduce(state, { type: "REVEAL_DONE" }, rng);
  assert.equal(state.currentPlayerIndex, 1);
  state = WW.reduce(state, { type: "READY", nowMs: 2_000 }, rng);
  assert.equal(state.phase, "spinning");
  assert.equal(state.turnDurationMs, WW.TURN_MS - WW.TIME_TAX_MS);
  assert.equal(state.turnEndsAt, 2_000 + (WW.TURN_MS - WW.TIME_TAX_MS));
  state = WW.reduce(state, { type: "SPIN_DONE", nowMs: 2_000 }, rng);
  assert.equal(state.phase, "playing");
  assert.equal(state.timeRemainingMs, WW.TURN_MS - WW.TIME_TAX_MS);
  assert.equal(state.turnEndsAt, 2_000 + (WW.TURN_MS - WW.TIME_TAX_MS));
  assert.equal(state.players[1].pendingEffects.length, 0);
});

test("BUY_SABOTAGE double_trouble freezes two letters", () => {
  const rng = rngSeq([0.1, 0.6, 0.1, 0.6]);
  let state = handoffWithScores([50, 0], rng);
  state = WW.reduce(
    state,
    { type: "BUY_SABOTAGE", itemId: "double_trouble", targetId: "p2" },
    rng
  );
  state = beginPlay(state, 1_000, rng);
  state = typeWord(state, "crane", rng);
  state = WW.reduce(state, { type: "REVEAL_DONE" }, rng);
  state = WW.reduce(state, { type: "READY", nowMs: 2_000 }, rng);
  assert.equal(state.phase, "spinning");
  assert.equal(state.frozenSlots.length, 2);
  assert.equal(state.freezeCount, 2);
});

test("BUY_SABOTAGE robin hood redistributes from the leader", () => {
  const rng = rngSeq([0.4]);
  let state = handoffWithScores([20, 50, 30], rng);
  state = WW.reduce(
    state,
    { type: "BUY_SABOTAGE", itemId: "robin_hood" },
    rng
  );
  assert.equal(state.players[0].score, 13);
  assert.equal(state.players[1].score, 35);
  assert.equal(state.players[2].score, 37);
  assert.match(state.lastShopMessage, /Robin Hood/);
});

test("BUY_SABOTAGE rejects wrong phase and self-target", () => {
  const rng = rngSeq([0.4]);
  let state = handoffWithScores([50, 40], rng);
  state = WW.reduce(state, { type: "READY", nowMs: 1_000 }, rng);
  const playing = state;
  state = WW.reduce(
    playing,
    { type: "BUY_SABOTAGE", itemId: "heist", targetId: "p2" },
    rng
  );
  assert.equal(state, playing);

  state = handoffWithScores([50, 40], rng);
  state = WW.reduce(
    state,
    { type: "BUY_SABOTAGE", itemId: "heist", targetId: "p1" },
    rng
  );
  assert.equal(state.players[0].score, 50);
});

test("BUY_SABOTAGE clock_block hides the timer on the target's next turn", () => {
  const rng = rngSeq([0.4, 0.4]);
  let state = handoffWithScores([50, 0], rng);
  state = WW.reduce(
    state,
    { type: "BUY_SABOTAGE", itemId: "clock_block", targetId: "p2" },
    rng
  );
  assert.equal(state.players[1].pendingEffects[0].type, "clock_block");
  state = beginPlay(state, 1_000, rng);
  state = typeWord(state, "crane", rng);
  state = WW.reduce(state, { type: "REVEAL_DONE" }, rng);
  state = WW.reduce(state, { type: "READY", nowMs: 2_000 }, rng);
  assert.equal(state.hideTimer, true);
  assert.equal(state.activeEffects[0].type, "clock_block");
});

test("BUY_SABOTAGE mystery reveals its real sabotage only on the rival's turn", () => {
  const rng = rngSeq([18 / 30, 0.4]);
  let state = handoffWithScores([50, 0], rng);

  state = WW.reduce(
    state,
    { type: "BUY_SABOTAGE", itemId: "mystery", targetId: "p2" },
    rng
  );
  assert.equal(state.lastShopMessage, null);
  assert.equal(state.players[0].score, 10);
  assert.equal(state.players[1].pendingEffects[0].type, "mystery_resolved");
  assert.equal(
    state.players[1].pendingEffects[0].resolvedType,
    "clock_block"
  );

  state = beginPlay(state, 1_000, rng);
  state = typeWord(state, "crane", rng);
  state = WW.reduce(state, { type: "REVEAL_DONE" }, rng);

  state = WW.reduce(state, { type: "READY", nowMs: 2_000 }, rng);
  assert.equal(state.hideTimer, true);
  assert.equal(state.players[1].pendingEffects.length, 0);
  assert.ok(state.activeEffects.some(function (e) { return e.type === "clock_block"; }));
});

test("BUY_SABOTAGE mystery prank can do nothing on reveal", () => {
  const rng = rngSeq([0, 0.4]);
  let state = handoffWithScores([50, 20], rng);
  state = WW.reduce(
    state,
    { type: "BUY_SABOTAGE", itemId: "mystery", targetId: "p2" },
    rng
  );
  assert.equal(state.players[1].pendingEffects[0].resolvedType, "mystery_nothing");
  state = beginPlay(state, 1_000, rng);
  state = typeWord(state, "crane", rng);
  state = WW.reduce(state, { type: "REVEAL_DONE" }, rng);
  state = WW.reduce(state, { type: "READY", nowMs: 2_000 }, rng);
  assert.ok(state.activeEffects.some(function (e) { return e.type === "mystery_nothing"; }));
  assert.equal(state.players[0].score, 17);
  assert.equal(state.players[1].score, 20);
});

test("BUY_SABOTAGE mystery prank can bankrupt the buyer", () => {
  const rng = rngSeq([4 / 30, 0.4]);
  let state = handoffWithScores([50, 20], rng);
  state = WW.reduce(
    state,
    { type: "BUY_SABOTAGE", itemId: "mystery", targetId: "p2" },
    rng
  );
  assert.equal(state.players[1].pendingEffects[0].resolvedType, "mystery_bankrupt_buyer");
  state = beginPlay(state, 1_000, rng);
  state = typeWord(state, "crane", rng);
  state = WW.reduce(state, { type: "REVEAL_DONE" }, rng);
  state = WW.reduce(state, { type: "READY", nowMs: 2_000 }, rng);
  assert.equal(state.players[0].score, 0);
  assert.equal(state.players[1].score, 37);
});

test("BUY_SABOTAGE mystery prank can shuffle everyone's scores", () => {
  const rng = rngSeq([6 / 30, 0.4]);
  let state = handoffWithScores([50, 20, 10], rng);
  state = WW.reduce(
    state,
    { type: "BUY_SABOTAGE", itemId: "mystery", targetId: "p2" },
    rng
  );
  assert.equal(state.players[1].pendingEffects[0].resolvedType, "mystery_swap_all");
  state = beginPlay(state, 1_000, rng);
  state = typeWord(state, "crane", rng);
  state = WW.reduce(state, { type: "REVEAL_DONE" }, rng);
  state = WW.reduce(state, { type: "READY", nowMs: 2_000 }, rng);
  assert.equal(state.players[0].score, 20);
  assert.equal(state.players[1].score, 10);
  assert.equal(state.players[2].score, 17);
});

test("BUY_SABOTAGE not_cheap doubles the cost of sabotages against the buyer", () => {
  const rng = rngSeq([0.4]);
  let state = handoffWithScores([50, 40], rng);
  state = WW.reduce(state, { type: "BUY_SABOTAGE", itemId: "not_cheap" }, rng);
  assert.equal(state.players[0].score, 20);
  assert.equal(state.players[0].notCheap, true);

  state = beginPlay(state, 1_000, rng);
  state = typeWord(state, "crane", rng);
  state = WW.reduce(state, { type: "REVEAL_DONE" }, rng);

  state = WW.reduce(
    state,
    { type: "BUY_SABOTAGE", itemId: "time_tax", targetId: "p1" },
    rng
  );
  assert.equal(state.players[1].score, 28);
  assert.equal(state.players[0].pendingEffects[0].type, "time_tax");
});

test("BUY_SABOTAGE cry_over_spilt_milk blocks backspace on the rival's turn", () => {
  const rng = rngSeq([0.4, 0.4]);
  let state = handoffWithScores([50, 0], rng);
  state = WW.reduce(
    state,
    { type: "BUY_SABOTAGE", itemId: "cry_over_spilt_milk", targetId: "p2" },
    rng
  );
  assert.equal(state.players[0].score, 25);
  assert.equal(state.players[1].pendingEffects[0].type, "no_backspace");

  state = beginPlay(state, 1_000, rng);
  state = typeWord(state, "crane", rng);
  state = WW.reduce(state, { type: "REVEAL_DONE" }, rng);
  state = beginPlay(state, 2_000, rng);
  assert.equal(state.blockBackspace, true);

  state = WW.reduce(state, { type: "TYPE", letter: "A" }, rng);
  const afterType = state.draft.slice();
  state = WW.reduce(state, { type: "BACKSPACE" }, rng);
  assert.deepEqual(state.draft, afterType);
});

test("BUY_SABOTAGE sui_you_later awards 7 points per vowel in the rival's word", () => {
  const rng = rngSeq([0.4, 0.4]);
  let state = handoffWithScores([50, 0], rng);
  state = WW.reduce(
    state,
    { type: "BUY_SABOTAGE", itemId: "sui_you_later", targetId: "p2" },
    rng
  );
  assert.equal(state.players[0].score, 20);

  state = beginPlay(state, 1_000, rng);
  state = typeWord(state, "crane", rng);
  state = WW.reduce(state, { type: "REVEAL_DONE" }, rng);
  state = beginPlay(state, 2_000, rng);
  state = typeWord(state, "slate", rng);

  assert.equal(state.players[0].score, 41);
  assert.equal(state.players[1].score, 5);
});

test("BUY_SABOTAGE not_today arms immunity against a rival", () => {
  const rng = rngSeq([0.4]);
  let state = handoffWithScores([50, 40], rng);
  state = WW.reduce(
    state,
    { type: "BUY_SABOTAGE", itemId: "not_today", targetId: "p2" },
    rng
  );
  assert.equal(state.players[0].score, 15);
  assert.equal(state.players[0].pendingEffects[0].type, "immunity");
  assert.equal(state.players[0].pendingEffects[0].vsPlayerId, "p2");

  state = beginPlay(state, 1_000, rng);
  state = typeWord(state, "crane", rng);
  state = WW.reduce(state, { type: "REVEAL_DONE" }, rng);

  const before = state.players[1].score;
  state = WW.reduce(
    state,
    { type: "BUY_SABOTAGE", itemId: "heist", targetId: "p1" },
    rng
  );
  assert.equal(state.players[1].score, before - 10);
  assert.equal(state.players[0].pendingEffects.length, 0);
  assert.match(state.lastShopMessage, /Not Today/);
});

test("PAUSE_TIMER freezes remaining time until RESUME_TIMER", () => {
  const rng = rngSeq([0.1]);
  let state = startTwo(rng);
  assert.equal(state.phase, "playing");
  const startedAt = state.turnEndsAt;
  state = WW.reduce(state, { type: "PAUSE_TIMER", nowMs: 6_000 }, rng);
  assert.equal(state.turnEndsAt, null);
  assert.equal(state.timeRemainingMs, startedAt - 6_000);
  state = WW.reduce(state, { type: "TICK", nowMs: 20_000 }, rng);
  assert.equal(state.phase, "playing");
  assert.equal(state.timeRemainingMs, startedAt - 6_000);
  state = WW.reduce(state, { type: "RESUME_TIMER", nowMs: 20_000 }, rng);
  assert.equal(state.turnEndsAt, 20_000 + (startedAt - 6_000));
});

test("START marks AI players", () => {
  let state = WW.createGame();
  state = WW.reduce(state, {
    type: "START",
    playerCount: 2,
    names: ["Ada", "CPU"],
    ais: [false, true],
    letterPoints: stableLetterPoints(),
  });
  assert.equal(state.players[0].isAi, false);
  assert.equal(state.players[1].isAi, true);
  state = beginPlay(state, 1_000);
  assert.equal(state.players[1].isAi, true);
});

test("AI player two plays after the opening word", () => {
  const rng = rngSeq([0.4]);
  let state = WW.createGame();
  state = WW.reduce(
    state,
    {
      type: "START",
      playerCount: 2,
      names: ["Ada", "CPU"],
      ais: [false, true],
      aiLevels: ["", "intermediate"],
      letterPoints: stableLetterPoints(),
    },
    rng
  );
  state = beginPlay(state, 1_000, rng);
  state = typeWord(state, "crane", rng);
  state = WW.reduce(state, { type: "REVEAL_DONE" }, rng);
  assert.equal(state.phase, "handoff");
  assert.equal(state.currentPlayerIndex, 1);
  assert.equal(state.players[1].isAi, true);
  state = beginPlay(state, 2_000, rng);
  assert.equal(state.phase, "playing");
  assert.ok(state.frozenSlots.length);
  const word = WW.pickAiWord(state, function () {
    return 0;
  });
  assert.ok(word);
  const slot = state.frozenSlots[0];
  assert.equal(word.charAt(slot.index), String(slot.letter).toLowerCase());
  state = typeWord(state, word, rng);
  assert.equal(state.phase, "revealing");
  assert.equal(state.invalidReason, null);
});

test("pickAiWord keeps frozen letters and skips used words", () => {
  const state = {
    usedWords: ["slate"],
    frozenSlots: [
      { index: 0, letter: "C" },
      { index: 4, letter: "E" },
    ],
    requiredLetter: null,
    letterPoints: stableLetterPoints(),
  };
  const word = WW.pickAiWord(state, function () {
    return 0;
  });
  assert.ok(word);
  assert.equal(word.charAt(0), "c");
  assert.equal(word.charAt(4), "e");
  assert.notEqual(word, "slate");
  assert.ok(WW.hasWord(word));
});

test("START stores AI difficulty", () => {
  let state = WW.createGame();
  state = WW.reduce(state, {
    type: "START",
    playerCount: 2,
    names: ["Ada", "CPU"],
    ais: [false, true],
    aiLevels: ["", "hard"],
    letterPoints: stableLetterPoints(),
  });
  assert.equal(state.players[0].isAi, false);
  assert.equal(state.players[1].isAi, true);
  assert.equal(state.players[1].aiLevel, "hard");
});

function aiHandoff(scores, level, rng) {
  const state = handoffWithScores(scores, rng);
  state.players[0].isAi = true;
  state.players[0].aiLevel = level;
  return state;
}

function sabotageSpread(state, rolls) {
  const seen = {};
  rolls.forEach(function (roll) {
    const pick = WW.pickAiSabotage(state, 0, function () {
      return roll;
    });
    if (pick) seen[pick.itemId] = true;
  });
  return Object.keys(seen);
}

test("pickAiSabotage skips the beginner AI", () => {
  const state = aiHandoff([80, 40], "beginner", rngSeq([0.4]));
  assert.equal(WW.pickAiSabotage(state, 0, () => 0.5), null);
});

test("pickAiSabotage spreads across many sabotages", () => {
  const state = aiHandoff([80, 40], "intermediate", rngSeq([0.4]));
  const rolls = [0.01, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 0.99];
  const picked = sabotageSpread(state, rolls);
  assert.ok(picked.length >= 5, "expected variety, got " + picked.join(", "));
  assert.ok(!picked.includes("mystery"));
});

test("pickAiSabotage never buys more than the AI can afford", () => {
  const state = aiHandoff([9, 40], "hard", rngSeq([0.4]));
  const rolls = [0.01, 0.25, 0.5, 0.75, 0.99];
  sabotageSpread(state, rolls).forEach(function (itemId) {
    assert.ok(WW.getShopItem(itemId).cost <= 9, itemId + " costs too much");
  });
});

test("pickAiSabotage saves Robin Hood for when the AI is behind", () => {
  const rolls = [0.01, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 0.99];
  const behind = aiHandoff([40, 80], "intermediate", rngSeq([0.4]));
  const ahead = aiHandoff([80, 40], "intermediate", rngSeq([0.4]));
  assert.ok(sabotageSpread(behind, rolls).includes("robin_hood"));
  assert.ok(!sabotageSpread(ahead, rolls).includes("robin_hood"));
  assert.ok(sabotageSpread(ahead, rolls).includes("not_cheap"));
  assert.ok(!sabotageSpread(behind, rolls).includes("not_cheap"));
});

test("pickAiSabotage targets the strongest rival", () => {
  const state = aiHandoff([90, 30, 60], "hard", rngSeq([0.4]));
  const pick = WW.pickAiSabotage(state, 0, () => 0.5);
  assert.ok(pick);
  if (!WW.getShopItem(pick.itemId).noTarget) {
    assert.equal(pick.targetId, state.players[2].id);
  }
});

test("pickAiWord hard always picks the top word", () => {
  const state = {
    players: [{ isAi: true, aiLevel: "hard" }],
    currentPlayerIndex: 0,
    usedWords: [],
    frozenSlots: [],
    requiredLetter: null,
    letterPoints: stableLetterPoints(),
  };
  const first = WW.pickAiWord(state, function () {
    return 0;
  });
  const last = WW.pickAiWord(state, function () {
    return 0.99;
  });
  assert.ok(first);
  assert.equal(first, last);
});
