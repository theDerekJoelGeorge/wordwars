import { routePartykitRequest, Server } from "partyserver";
import "../js/words.js";
import "../js/scoring.js";
import "../js/dictionary.js";
import "../js/shop.js";
import "../js/engine.js";
import "../js/ai.js";
import "../js/room.js";
import DailyServer from "./daily.js";

function WW() {
  return globalThis.WordWars;
}

function isDailyRoom(id) {
  return Boolean(WW().dateKeyFromRoomId(id));
}

export class Main extends Server {
  static options = { hibernate: false };

  constructor(ctx, env) {
    super(ctx, env);
    this.table = null;
    this.daily = null;
  }

  onStart() {
    this.daily = isDailyRoom(this.name) ? new DailyServer(this) : null;
  }

  ensureTable() {
    if (this.table) return this.table;
    const self = this;
    this.table = WW().createTable({
      code: this.name,
      now: function () {
        return Date.now();
      },
      send: function (connId, msg) {
        const conn = self.getConnection(connId);
        if (conn) conn.send(JSON.stringify(msg));
      },
      close: function (connId) {
        const conn = self.getConnection(connId);
        if (conn) conn.close();
      },
    });
    return this.table;
  }

  onConnect(conn) {
    if (!this.daily && isDailyRoom(this.name)) {
      this.daily = new DailyServer(this);
    }
    if (this.daily) return this.daily.onConnect(conn);
    conn.send(
      JSON.stringify({
        type: "HELLO",
        code: WW().normalizeRoomCode(this.name),
      })
    );
  }

  onMessage(conn, message) {
    if (this.daily) return this.daily.onMessage(message, conn);
    let msg = message;
    if (typeof message === "string") {
      try {
        msg = JSON.parse(message);
      } catch (err) {
        conn.send(
          JSON.stringify({
            type: "ERROR",
            code: "bad",
            message: "Could not read that message.",
          })
        );
        return;
      }
    }
    this.ensureTable().handleMessage(conn.id, msg);
  }

  onClose(conn) {
    if (this.daily) return;
    if (this.table) this.table.handleClose(conn.id);
  }
}

export default {
  async fetch(request, env) {
    return (
      (await routePartykitRequest(request, env)) ||
      new Response("Not Found", { status: 404 })
    );
  },
};
