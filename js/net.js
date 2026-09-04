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
    if (host.indexOf("partykit.dev") !== -1) return window.location.host;
    return "wordsus.thederekjoelgeorge.partykit.dev";
  };

  function partySocketUrl(party, roomId) {
    const host = WW.partyHost();
    const local =
      host.indexOf("localhost") === 0 || host.indexOf("127.0.0.1") === 0;
    const proto = local ? "ws" : "wss";
    return (
      proto +
      "://" +
      host +
      "/parties/" +
      party +
      "/" +
      encodeURIComponent(roomId)
    );
  }

  function socketUrl(code) {
    return partySocketUrl("main", WW.normalizeRoomCode(code));
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
    let reconnects = 0;
    let openMsg = null;
    let reconnectTimer = 0;
    let pingTimer = 0;

    function emitError(err) {
      if (hooks.onError) hooks.onError(err);
    }

    function clearReconnect() {
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = 0;
      }
    }

    function clearPing() {
      if (pingTimer) {
        clearInterval(pingTimer);
        pingTimer = 0;
      }
    }

    function send(msg) {
      if (!socket || socket.readyState !== 1) return false;
      socket.send(JSON.stringify(msg));
      return true;
    }

    function scheduleReconnect() {
      if (closed || !code || !openMsg) return;
      clearReconnect();
      const wait = Math.min(400 * Math.pow(2, reconnects), 6000);
      reconnects += 1;
      reconnectTimer = setTimeout(function () {
        reconnectTimer = 0;
        if (closed || !openMsg) return;
        const token = readToken(code) || openMsg.seatToken;
        bindSocket(code, {
          type: openMsg.type,
          name: openMsg.name,
          color: openMsg.color,
          seatToken: token,
        });
      }, wait);
    }

    function bindSocket(nextCode, nextOpen) {
      code = WW.normalizeRoomCode(nextCode);
      openMsg = nextOpen;
      closed = false;
      clearPing();
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
        reconnects = 0;
        send(openMsg);
        clearPing();
        pingTimer = setInterval(function () {
          send({ type: "PING" });
        }, 20000);
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
          if (openMsg) openMsg.seatToken = msg.view.you.seatToken;
        }
        if (hooks.onMessage) hooks.onMessage(msg);
      };
      socket.onclose = function () {
        clearPing();
        socket = null;
        if (closed) return;
        if (hooks.onDisconnect) hooks.onDisconnect();
        scheduleReconnect();
      };
      socket.onerror = function () {
        if (closed) return;
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

    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", function () {
        if (document.hidden || closed) return;
        if (socket && socket.readyState === 1) {
          send({ type: "PING" });
          return;
        }
        scheduleReconnect();
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
        openMsg = null;
        clearReconnect();
        clearPing();
        if (socket) {
          try {
            socket.onclose = null;
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

  WW.createDailyNet = function createDailyNet(hooks) {
    let socket = null;
    let dateKey = "";
    let closed = true;
    let reconnectTimer = 0;
    let pingTimer = 0;
    let deviceId = "";

    function emitError(err) {
      if (hooks.onError) hooks.onError(err);
    }

    function clearReconnect() {
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = 0;
      }
    }

    function clearPing() {
      if (pingTimer) {
        clearInterval(pingTimer);
        pingTimer = 0;
      }
    }

    function send(msg) {
      if (!socket || socket.readyState !== 1) return false;
      socket.send(JSON.stringify(msg));
      return true;
    }

    function scheduleReconnect() {
      if (closed || !dateKey || !deviceId) return;
      clearReconnect();
      reconnectTimer = setTimeout(function () {
        reconnectTimer = 0;
        if (closed) return;
        bindSocket(dateKey, deviceId);
      }, 1500);
    }

    function bindSocket(nextDate, nextDevice) {
      dateKey = nextDate;
      deviceId = nextDevice;
      closed = false;
      clearPing();
      if (socket) {
        try {
          socket.onclose = null;
          socket.close();
        } catch (err) {
          /* ignore */
        }
      }
      socket = new WebSocket(partySocketUrl("main", WW.dailyRoomId(dateKey)));
      socket.onopen = function () {
        send({ type: "HELLO", deviceId: deviceId });
        clearPing();
        pingTimer = setInterval(function () {
          send({ type: "PING" });
        }, 20000);
      };
      socket.onmessage = function (event) {
        let msg = event.data;
        try {
          msg = JSON.parse(event.data);
        } catch (err) {
          return;
        }
        if (msg.type === "ERROR") {
          emitError(msg);
          return;
        }
        if (hooks.onMessage) hooks.onMessage(msg);
      };
      socket.onclose = function () {
        clearPing();
        socket = null;
        if (closed) return;
        if (hooks.onDisconnect) hooks.onDisconnect();
        scheduleReconnect();
      };
      socket.onerror = function () {
        if (closed) return;
        emitError({
          code: "socket",
          message: "Could not reach today's leaderboard.",
        });
      };
    }

    return {
      connect: function (nextDate, nextDevice) {
        bindSocket(nextDate, nextDevice);
      },
      submit: function (payload) {
        return send({
          type: "SUBMIT",
          deviceId: payload.deviceId,
          name: payload.name,
          word: payload.word,
        });
      },
      send: send,
      disconnect: function () {
        closed = true;
        clearReconnect();
        clearPing();
        if (socket) {
          try {
            socket.onclose = null;
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
