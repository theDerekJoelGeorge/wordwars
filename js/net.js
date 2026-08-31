(function (root) {
  const WW = root.WordWars || (root.WordWars = {});

  WW.partyHost = function partyHost() {
    if (typeof window === "undefined") return "127.0.0.1:1999";
    if (window.WORDSUS_PARTY_HOST) return window.WORDSUS_PARTY_HOST;
    const host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1") {
      if (window.location.port === "1999") return window.location.host;
      return "127.0.0.1:1999";
    }
    return "wordsus.partykit.dev";
  };

  function socketUrl(code) {
    const host = WW.partyHost();
    const local =
      host.indexOf("localhost") === 0 || host.indexOf("127.0.0.1") === 0;
    const proto = local ? "ws" : "wss";
    return (
      proto +
      "://" +
      host +
      "/parties/main/" +
      encodeURIComponent(WW.normalizeRoomCode(code))
    );
  }

  function seatKey(code) {
    return "wordsus.seat." + WW.normalizeRoomCode(code);
  }

  function readToken(code) {
    try {
      return sessionStorage.getItem(seatKey(code)) || "";
    } catch (err) {
      return "";
    }
  }

  function writeToken(code, token) {
    try {
      sessionStorage.setItem(seatKey(code), token);
    } catch (err) {
      /* ignore */
    }
  }

  function makeToken() {
    const bytes = new Uint8Array(16);
    if (root.crypto && root.crypto.getRandomValues) {
      root.crypto.getRandomValues(bytes);
    } else {
      for (let i = 0; i < 16; i += 1) bytes[i] = Math.floor(Math.random() * 256);
    }
    return Array.from(bytes, function (byte) {
      return byte.toString(16).padStart(2, "0");
    }).join("");
  }

  WW.createNet = function createNet(hooks) {
    let socket = null;
    let code = "";
    let closed = true;
    let retries = 0;

    function emitError(err) {
      if (hooks.onError) hooks.onError(err);
    }

    function send(msg) {
      if (!socket || socket.readyState !== 1) return false;
      socket.send(JSON.stringify(msg));
      return true;
    }

    function bindSocket(nextCode, openMsg) {
      code = WW.normalizeRoomCode(nextCode);
      closed = false;
      if (socket) {
        try {
          socket.onclose = null;
          socket.close();
        } catch (err) {
          /* ignore */
        }
      }
      socket = new WebSocket(socketUrl(code));
      socket.onopen = function () {
        retries = 0;
        send(openMsg);
      };
      socket.onmessage = function (event) {
        let msg = event.data;
        try {
          msg = JSON.parse(event.data);
        } catch (err) {
          return;
        }
        if (msg.type === "ERROR") {
          if (msg.code === "taken" && openMsg.type === "HOST" && retries < 8) {
            retries += 1;
            connectHost(openMsg.name, openMsg.color);
            return;
          }
          emitError(msg);
          return;
        }
        if (msg.type === "VIEW" && msg.view && msg.view.you && msg.view.you.seatToken) {
          writeToken(code, msg.view.you.seatToken);
        }
        if (hooks.onMessage) hooks.onMessage(msg);
      };
      socket.onclose = function () {
        if (hooks.onClose) hooks.onClose();
      };
      socket.onerror = function () {
        emitError({
          code: "socket",
          message: "Could not reach the room. Is partykit running?",
        });
      };
    }

    function connectHost(name, color) {
      const nextCode = WW.pickRoomCode();
      const token = readToken(nextCode) || makeToken();
      writeToken(nextCode, token);
      bindSocket(nextCode, {
        type: "HOST",
        name: name,
        color: color,
        seatToken: token,
      });
    }

    function connectJoin(nextCode, name, color) {
      const token = readToken(nextCode) || makeToken();
      writeToken(nextCode, token);
      bindSocket(nextCode, {
        type: "JOIN",
        name: name,
        color: color,
        seatToken: token,
      });
    }

    return {
      host: connectHost,
      join: connectJoin,
      send: send,
      code: function () {
        return code;
      },
      disconnect: function () {
        closed = true;
        if (socket) {
          try {
            socket.close();
          } catch (err) {
            /* ignore */
          }
        }
        socket = null;
      },
      connected: function () {
        return Boolean(socket && socket.readyState === 1);
      },
    };
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
