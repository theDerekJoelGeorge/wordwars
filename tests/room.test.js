const test = require("node:test");
const assert = require("node:assert/strict");

require("../js/words.js");
require("../js/scoring.js");
require("../js/dictionary.js");
require("../js/shop.js");
require("../js/engine.js");
require("../js/ai.js");
const WW = require("../js/room.js");

function drain(box) {
  const fns = box.timers.slice();
  box.timers.length = 0;
  fns.forEach(function (item) {
    item.fn();
  });
}

function makeTable(code) {
  const sent = [];
  const closed = [];
  const box = { timers: [] };
  const table = WW.createTable({
    code: code || "CRANE",
    now: function () {
      return 1_000_000;
    },
    random: function () {
      return 0.1;
    },
    send: function (id, msg) {
      sent.push({ id: id, msg: msg });
    },
    close: function (id) {
      closed.push(id);
    },
    delay: function (fn) {
      const id = box.timers.length + 1;
      box.timers.push({ id: id, fn: fn });
      return id;
    },
    clearDelay: function (id) {
      box.timers = box.timers.filter(function (item) {
        return item.id !== id;
      });
    },
  });
  return { table: table, sent: sent, box: box, closed: closed };
}

function lastView(sent, connId) {
  for (let i = sent.length - 1; i >= 0; i -= 1) {
    if (sent[i].id === connId && sent[i].msg.type === "VIEW") {
      return sent[i].msg.view;
    }
  }
  return null;
}

test("normalizeRoomCode keeps five letters", () => {
  assert.equal(WW.normalizeRoomCode("crane!"), "CRANE");
  assert.equal(WW.normalizeRoomCode("slates"), "SLATE");
});

test("filterGameView keeps a rival's typed letters visible", () => {
  const game = WW.createGame();
  const started = WW.reduce(game, {
    type: "START",
    playerCount: 2,
    names: ["Ada", "Bea"],
    colors: ["#fbab20", "#141414"],
    ais: [false, false],
    aiLevels: ["", ""],
  });
  let playing = WW.reduce(started, { type: "READY", nowMs: 1 });
  playing = WW.reduce(playing, { type: "TYPE", letter: "C" });
  playing = WW.reduce(playing, { type: "TYPE", letter: "R" });
  const forBea = WW.filterGameView(playing, "p2");
  const forAda = WW.filterGameView(playing, "p1");
  assert.equal(forAda.draft.join(""), "CR");
  assert.equal(forBea.draft.join(""), "CR");
});

test("gameActionAllowed rejects the wrong player", () => {
  const started = WW.reduce(WW.createGame(), {
    type: "START",
    playerCount: 2,
    names: ["Ada", "Bea"],
    colors: ["#fbab20", "#141414"],
  });
  const playing = WW.reduce(started, { type: "READY", nowMs: 1 });
  assert.equal(WW.gameActionAllowed(playing, "p1", "TYPE"), true);
  assert.equal(WW.gameActionAllowed(playing, "p2", "TYPE"), false);
  assert.equal(WW.gameActionAllowed(playing, "p1", "TICK"), false);
});

test("host and guest share a lobby then start", () => {
  const { table, sent } = makeTable();
  table.handleMessage("c1", {
    type: "HOST",
    name: "Ada",
    color: "#fbab20",
    seatToken: "aaaa",
  });
  table.handleMessage("c2", {
    type: "JOIN",
    name: "Bea",
    color: "#d7263d",
    seatToken: "bbbb",
  });
  const lobby = lastView(sent, "c2");
  assert.equal(lobby.screen, "lobby");
  assert.equal(lobby.code, "CRANE");
  assert.equal(lobby.seats.length, 2);
  assert.equal(lobby.seats[0].ready, true);
  assert.equal(lobby.seats[1].ready, false);
  assert.equal(lastView(sent, "c1").canStart, false);
  table.handleMessage("c1", { type: "START" });
  assert.equal(lastView(sent, "c1").screen, "lobby");
  table.handleMessage("c2", { type: "SET_READY", ready: true });
  assert.equal(lastView(sent, "c1").canStart, true);
  table.handleMessage("c1", { type: "START" });
  const game = lastView(sent, "c1");
  assert.equal(game.screen, "game");
  assert.equal(game.game.players.length, 2);
  assert.equal(game.you.playerId, "p1");
});

test("join without a host is no_room", () => {
  const { table, sent } = makeTable();
  table.handleMessage("c2", {
    type: "JOIN",
    name: "Bea",
    color: "#d7263d",
    seatToken: "bbbb",
  });
  const err = sent.find(function (row) {
    return row.msg.type === "ERROR";
  });
  assert.equal(err.msg.code, "no_room");
});

test("spectator view shows the current player's typed letters", () => {
  const { table, sent } = makeTable();
  table.handleMessage("c1", {
    type: "HOST",
    name: "Ada",
    color: "#fbab20",
    seatToken: "aaaa",
  });
  table.handleMessage("c2", {
    type: "JOIN",
    name: "Bea",
    color: "#d7263d",
    seatToken: "bbbb",
  });
  table.handleMessage("c2", { type: "SET_READY", ready: true });
  table.handleMessage("c1", { type: "START" });
  table.handleMessage("c1", { type: "GAME", action: { type: "READY" } });
  table.handleMessage("c2", { type: "GAME", action: { type: "TYPE", letter: "Z" } });
  let bea = lastView(sent, "c2");
  assert.equal(bea.game.draft.join(""), "");
  table.handleMessage("c1", { type: "GAME", action: { type: "TYPE", letter: "A" } });
  const ada = lastView(sent, "c1");
  bea = lastView(sent, "c2");
  assert.equal(ada.game.draft[0], "A");
  assert.equal(bea.game.draft[0], "A");
  assert.equal(bea.waiting, false);
});

test("disconnecting on your turn pauses then times out", () => {
  const { table, sent, box } = makeTable();
  table.handleMessage("c1", {
    type: "HOST",
    name: "Ada",
    color: "#fbab20",
    seatToken: "aaaa",
  });
  table.handleMessage("c2", {
    type: "JOIN",
    name: "Bea",
    color: "#d7263d",
    seatToken: "bbbb",
  });
  table.handleMessage("c2", { type: "SET_READY", ready: true });
  table.handleMessage("c1", { type: "START" });
  table.handleMessage("c1", { type: "GAME", action: { type: "READY" } });
  table.handleClose("c1");
  const paused = lastView(sent, "c2");
  assert.equal(paused.reconnecting, true);
  assert.equal(paused.game.turnEndsAt, null);
  drain(box);
  const after = lastView(sent, "c2");
  assert.equal(after.game.phase, "revealing");
  assert.equal(after.game.lastSubmitResult.timedOut, true);
});

test("host kicking a guest tells them they were kicked", () => {
  const { table, sent, closed } = makeTable();
  table.handleMessage("c1", {
    type: "HOST",
    name: "Ada",
    color: "#fbab20",
    seatToken: "aaaa",
  });
  table.handleMessage("c2", {
    type: "JOIN",
    name: "Bea",
    color: "#d7263d",
    seatToken: "bbbb",
  });
  table.handleMessage("c1", { type: "REMOVE_SEAT", seatId: "s2" });
  const kicked = sent.filter(function (row) {
    return row.id === "c2" && row.msg.type === "ERROR";
  });
  assert.equal(kicked.length, 1);
  assert.equal(kicked[0].msg.code, "kicked");
  assert.match(kicked[0].msg.message, /host kicked you out/i);
  assert.deepEqual(closed, ["c2"]);
  const lobby = lastView(sent, "c1");
  assert.equal(lobby.seats.length, 1);
  assert.equal(lobby.seats[0].isHost, true);
});

test("autogenerated lobby names stay unique", () => {
  const { table, sent } = makeTable();
  table.handleMessage("c1", {
    type: "HOST",
    name: "SPELLING BEE",
    color: "#fbab20",
    seatToken: "aaaa",
  });
  table.handleMessage("c2", {
    type: "JOIN",
    name: "SPELLING BEE",
    color: "#d7263d",
    seatToken: "bbbb",
  });
  const lobby = lastView(sent, "c2");
  assert.equal(lobby.seats[0].name, "SPELLING BEE");
  assert.equal(lobby.seats[1].name, "DYSLEXIC DINOSUAR");
  table.handleMessage("c2", { type: "SET_NAME", name: "SPELLING BEE" });
  const after = lastView(sent, "c2");
  assert.notEqual(after.you.name, "SPELLING BEE");
  assert.notEqual(after.you.name, after.seats[0].name);
});

test("custom lobby names stay unique", () => {
  const { table, sent } = makeTable();
  table.handleMessage("c1", {
    type: "HOST",
    name: "Ada",
    color: "#fbab20",
    seatToken: "aaaa",
  });
  table.handleMessage("c2", {
    type: "JOIN",
    name: "Ada",
    color: "#d7263d",
    seatToken: "bbbb",
  });
  const lobby = lastView(sent, "c2");
  assert.equal(lobby.seats[0].name, "Ada");
  assert.equal(lobby.seats[1].name, "Ada 2");
});

test("lobby colors stay unique", () => {
  const { table, sent } = makeTable();
  table.handleMessage("c1", {
    type: "HOST",
    name: "Ada",
    color: "#fbab20",
    seatToken: "aaaa",
  });
  table.handleMessage("c2", {
    type: "JOIN",
    name: "Bea",
    color: "#fbab20",
    seatToken: "bbbb",
  });
  const lobby = lastView(sent, "c2");
  assert.equal(lobby.seats[0].color, "#fbab20");
  assert.equal(lobby.seats[1].color, "#141414");
  table.handleMessage("c2", { type: "SET_COLOR", color: "#fbab20" });
  const after = lastView(sent, "c2");
  assert.notEqual(after.you.color, "#fbab20");
  assert.notEqual(after.you.color, after.seats[0].color);
});

test("host disconnect in lobby keeps the room for joiners", () => {
  const { table, sent } = makeTable();
  table.handleMessage("c1", {
    type: "HOST",
    name: "Ada",
    color: "#fbab20",
    seatToken: "aaaa",
  });
  table.handleClose("c1");
  const afterDrop = table.inspect();
  assert.equal(afterDrop.closed, false);
  assert.equal(afterDrop.seats.length, 1);
  assert.equal(afterDrop.seats[0].connected, false);

  table.handleMessage("c2", {
    type: "JOIN",
    name: "Bea",
    color: "#d7263d",
    seatToken: "bbbb",
  });
  assert.equal(table.inspect().seats.length, 2);
  table.handleMessage("c1", {
    type: "HOST",
    name: "Ada",
    color: "#fbab20",
    seatToken: "aaaa",
  });
  const host = lastView(sent, "c1");
  assert.equal(host.you.isHost, true);
  assert.equal(host.seats[0].connected, true);

  table.handleMessage("c1", { type: "LEAVE" });
  table.handleMessage("c2", { type: "LEAVE" });
  assert.equal(table.inspect().closed, true);
  assert.equal(table.inspect().seats.length, 0);
});
