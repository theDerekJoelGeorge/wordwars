import "../js/words.js";
import "../js/scoring.js";
import "../js/dictionary.js";
import "../js/shop.js";
import "../js/engine.js";
import "../js/daily.js";

function WW() {
  return globalThis.WordWars;
}

const RATE_WINDOW_MS = 20000;
const RATE_MAX = 8;

export default class DailyServer {
  options = { hibernate: true };

  constructor(room) {
    this.room = room;
    this.hits = new Map();
  }

  dateKey() {
    return WW().dateKeyFromRoomId(this.room.id) || WW().dailyDateKey();
  }

  puzzle() {
    return WW().createDailyPuzzle(this.dateKey());
  }

  async loadEntries() {
    const stored = await this.room.storage.get("entries");
    return stored && typeof stored === "object" ? stored : {};
  }

  snapshot(entries, deviceId) {
    const puzzle = WW().publicDailyPuzzle(this.puzzle());
    const board = WW().rankDailyEntries(entries, deviceId);
    return {
      type: "DAILY",
      dateKey: puzzle.dateKey,
      puzzle: puzzle,
      ranks: board.ranks,
      you: board.you,
      total: board.total,
    };
  }

  tooMany(connId) {
    const now = Date.now();
    const stamps = (this.hits.get(connId) || []).filter(function (at) {
      return now - at < RATE_WINDOW_MS;
    });
    if (stamps.length >= RATE_MAX) {
      this.hits.set(connId, stamps);
      return true;
    }
    stamps.push(now);
    this.hits.set(connId, stamps);
    return false;
  }

  send(conn, msg) {
    conn.send(JSON.stringify(msg));
  }

  async onConnect(conn) {
    const entries = await this.loadEntries();
    this.send(conn, this.snapshot(entries, ""));
  }

  async onMessage(message, sender) {
    let msg = message;
    if (typeof message === "string") {
      try {
        msg = JSON.parse(message);
      } catch (err) {
        this.send(sender, {
          type: "ERROR",
          code: "bad",
          message: "Could not read that message.",
        });
        return;
      }
    }

    const type = msg && msg.type;
    if (type === "PING") return;

    if (type === "HELLO" || type === "LIST") {
      const entries = await this.loadEntries();
      this.send(sender, this.snapshot(entries, msg.deviceId));
      return;
    }

    if (type !== "SUBMIT") {
      this.send(sender, {
        type: "ERROR",
        code: "bad",
        message: "Unknown daily message.",
      });
      return;
    }

    if (this.tooMany(sender.id)) {
      this.send(sender, {
        type: "ERROR",
        code: "rate",
        message: "Slow down a little.",
      });
      return;
    }

    const deviceId = WW().normalizeDailyDeviceId(msg.deviceId);
    if (!deviceId) {
      this.send(sender, {
        type: "ERROR",
        code: "device",
        message: "Missing player id.",
      });
      return;
    }

    const puzzle = this.puzzle();
    const checked = WW().validateDailyWord(msg.word, puzzle);
    if (!checked.ok) {
      this.send(sender, {
        type: "ERROR",
        code: checked.reason || "word",
        message: "That word does not count.",
      });
      return;
    }

    const entries = await this.loadEntries();
    const applied = WW().applyDailyBest(entries, deviceId, {
      name: msg.name,
      word: checked.word,
      score: checked.score,
      at: Date.now(),
    });
    if (applied.improved) {
      await this.room.storage.put("entries", applied.entries);
    }
    const board = WW().rankDailyEntries(applied.entries, deviceId);
    this.send(sender, {
      type: "ACCEPTED",
      dateKey: puzzle.dateKey,
      improved: applied.improved,
      you: board.you,
      ranks: board.ranks,
      total: board.total,
    });
  }
}
