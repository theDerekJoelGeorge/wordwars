import "../js/words.js";
import "../js/scoring.js";
import "../js/dictionary.js";
import "../js/shop.js";
import "../js/engine.js";
import "../js/ai.js";
import "../js/room.js";

function WW() {
  return globalThis.WordWars;
}

export default class TableServer {
  options = { hibernate: false };

  constructor(room) {
    this.room = room;
    this.table = null;
  }

  ensureTable() {
    if (this.table) return this.table;
    const self = this;
    this.table = WW().createTable({
      code: this.room.id,
      now: function () {
        return Date.now();
      },
      send: function (connId, msg) {
        const conn = self.room.getConnection(connId);
        if (conn) conn.send(JSON.stringify(msg));
      },
      close: function (connId) {
        const conn = self.room.getConnection(connId);
        if (conn) conn.close();
      },
    });
    return this.table;
  }

  onConnect(conn) {
    conn.send(
      JSON.stringify({
        type: "HELLO",
        code: WW().normalizeRoomCode(this.room.id),
      })
    );
  }

  onMessage(message, sender) {
    let msg = message;
    if (typeof message === "string") {
      try {
        msg = JSON.parse(message);
      } catch (err) {
        sender.send(
          JSON.stringify({
            type: "ERROR",
            code: "bad",
            message: "Could not read that message.",
          })
        );
        return;
      }
    }
    this.ensureTable().handleMessage(sender.id, msg);
  }

  onClose(conn) {
    if (this.table) this.table.handleClose(conn.id);
  }
}
