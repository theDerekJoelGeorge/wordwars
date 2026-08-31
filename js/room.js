(function (root) {
  const WW = root.WordWars || (root.WordWars = {});

  WW.PLAYER_PLACEHOLDERS = WW.PLAYER_PLACEHOLDERS || [
    "SPELLING BEE",
    "DYSLEXIC DINOSUAR",
    "GRAMMER POLICE",
    "SILENT K NIGHT",
    "AUTOCORRRECT",
    "I BEFORE E",
  ];

  WW.ROOM_CODE_LENGTH = 5;
  WW.ROOM_DISCONNECT_MS = 15000;
  WW.ROOM_EMPTY_MS = 30000;
  WW.ROOM_SPIN_MS = 3400;
  WW.ROOM_REVEAL_MS = 2400;
  WW.CLIENT_GAME_ACTIONS = {
    READY: true,
    TYPE: true,
    BACKSPACE: true,
    SUBMIT: true,
    BUY_SABOTAGE: true,
  };

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function randomToken(random) {
    const roll = random || Math.random;
    let out = "";
    for (let i = 0; i < 16; i += 1) {
      out += Math.floor(roll() * 16).toString(16);
    }
    return out;
  }

  WW.normalizeRoomCode = function normalizeRoomCode(value) {
    return String(value || "")
      .toUpperCase()
      .replace(/[^A-Z]/g, "")
      .slice(0, WW.ROOM_CODE_LENGTH);
  };

  WW.pickRoomCode = function pickRoomCode(rng) {
    const random = rng || Math.random;
    const pool = WW.WORDS || [];
    if (!pool.length) return "CRANE";
    const word = String(pool[Math.floor(random() * pool.length)] || "crane");
    const code = WW.normalizeRoomCode(word);
    return code.length === WW.ROOM_CODE_LENGTH ? code : "CRANE";
  };

  WW.isFrozenDraftIndex = function isFrozenDraftIndex(game, index) {
    const slots = (game && game.frozenSlots) || [];
    return slots.some(function (slot) {
      return slot.index === index;
    });
  };

  WW.filterGameView = function filterGameView(game, viewerPlayerId) {
    if (!game) return null;
    const copy = clone(game);
    const current = copy.players && copy.players[copy.currentPlayerIndex];
    const mine = Boolean(current && current.id === viewerPlayerId);
    if (!mine) copy.tunnelVision = false;
    return copy;
  };

  WW.gameActionAllowed = function gameActionAllowed(game, actorPlayerId, actionType) {
    if (!game || !actorPlayerId) return false;
    const type = String(actionType || "");
    if (!WW.CLIENT_GAME_ACTIONS[type]) return false;
    const current = WW.currentPlayer(game);
    if (!current || current.id !== actorPlayerId) return false;
    if (current.isAi) return false;
    return true;
  };

  WW.createTable = function createTable(hooks) {
    const send = hooks.send;
    const now = hooks.now || Date.now;
    const random = hooks.random || Math.random;
    const delay = hooks.delay || function (fn, ms) {
      return setTimeout(fn, ms);
    };
    const clearDelay = hooks.clearDelay || function (id) {
      clearTimeout(id);
    };

    const table = {
      code: WW.normalizeRoomCode(hooks.code || ""),
      hostSeatId: null,
      seats: [],
      rounds: WW.TURNS_PER_PLAYER,
      game: null,
      closed: false,
      nextSeat: 1,
    };

    const timers = {
      spin: 0,
      reveal: 0,
      timeout: 0,
      empty: 0,
      disconnect: {},
    };
    let ai = null;

    function seatByConn(connId) {
      return (
        table.seats.find(function (seat) {
          return seat.connectionId === connId;
        }) || null
      );
    }

    function seatByToken(token) {
      if (!token) return null;
      return (
        table.seats.find(function (seat) {
          return seat.seatToken === token;
        }) || null
      );
    }

    function seatByPlayerId(playerId) {
      return (
        table.seats.find(function (seat) {
          return seat.playerId === playerId;
        }) || null
      );
    }

    function currentSeat() {
      if (!table.game) return null;
      const player = WW.currentPlayer(table.game);
      if (!player) return null;
      return seatByPlayerId(player.id);
    }

    function humanSeats() {
      return table.seats.filter(function (seat) {
        return !seat.isAi;
      });
    }

    function connectedHumans() {
      return humanSeats().filter(function (seat) {
        return seat.connected;
      });
    }

    function tableReady() {
      if (table.seats.length < WW.MIN_PLAYERS) return false;
      if (table.seats.length > WW.MAX_PLAYERS) return false;
      return table.seats.every(function (seat) {
        if (seat.isAi) return true;
        if (seat.isHost) return seat.connected;
        return seat.connected && seat.ready;
      });
    }

    function normalizeColor(color) {
      return String(color || "").trim().toLowerCase();
    }

    function colorsTaken(exceptId) {
      return table.seats
        .filter(function (seat) {
          return seat.id !== exceptId;
        })
        .map(function (seat) {
          return normalizeColor(seat.color);
        })
        .filter(Boolean);
    }

    function uniqueColor(requested, exceptId) {
      const pool = WW.PLAYER_COLORS || ["#fbab20"];
      const taken = colorsTaken(exceptId);
      const wanted = normalizeColor(requested);
      if (wanted && taken.indexOf(wanted) === -1) {
        const canon = pool.find(function (color) {
          return color.toLowerCase() === wanted;
        });
        return canon || String(requested).trim();
      }
      for (let i = 0; i < pool.length; i += 1) {
        if (taken.indexOf(pool[i].toLowerCase()) === -1) return pool[i];
      }
      const you = table.seats.find(function (seat) {
        return seat.id === exceptId;
      });
      return (you && you.color) || pool[0];
    }

    function namesTaken(exceptId) {
      return table.seats
        .filter(function (seat) {
          return seat.id !== exceptId;
        })
        .map(function (seat) {
          return String(seat.name || "").trim().toUpperCase();
        })
        .filter(Boolean);
    }

    function uniqueName(requested, exceptId) {
      const pool = WW.PLAYER_PLACEHOLDERS || [];
      const taken = namesTaken(exceptId);
      const wanted = String(requested || "").trim().slice(0, 24);
      if (wanted && taken.indexOf(wanted.toUpperCase()) === -1) return wanted;
      const fromPool = pool.some(function (name) {
        return name.toUpperCase() === wanted.toUpperCase();
      });
      if (!wanted || fromPool) {
        for (let i = 0; i < pool.length; i += 1) {
          if (taken.indexOf(pool[i].toUpperCase()) === -1) return pool[i];
        }
      }
      const base = wanted || "PLAYER";
      let n = 2;
      let next = (base + " " + n).slice(0, 24);
      while (taken.indexOf(next.toUpperCase()) !== -1) {
        n += 1;
        next = (base + " " + n).slice(0, 24);
      }
      return next;
    }

    function addSeat(fields) {
      const seat = {
        id: "s" + table.nextSeat,
        playerId: null,
        connectionId: fields.connectionId || null,
        seatToken: fields.seatToken || randomToken(random),
        name: uniqueName(fields.name),
        color: uniqueColor(fields.color),
        isAi: Boolean(fields.isAi),
        aiLevel: fields.isAi
          ? WW.normalizeAiLevel(fields.aiLevel) || "intermediate"
          : "",
        connected: Boolean(fields.connectionId),
        isHost: Boolean(fields.isHost),
        ready: Boolean(fields.isAi || fields.isHost),
      };
      table.nextSeat += 1;
      table.seats.push(seat);
      if (seat.isHost) table.hostSeatId = seat.id;
      return seat;
    }

    function promoteHost() {
      const next = connectedHumans()[0] || humanSeats()[0] || null;
      table.seats.forEach(function (seat) {
        seat.isHost = Boolean(next && seat.id === next.id);
        if (seat.isHost) seat.ready = true;
      });
      table.hostSeatId = next ? next.id : null;
    }

    function clearTimer(key) {
      if (timers[key]) {
        clearDelay(timers[key]);
        timers[key] = 0;
      }
    }

    function clearDisconnect(seatId) {
      if (timers.disconnect[seatId]) {
        clearDelay(timers.disconnect[seatId]);
        delete timers.disconnect[seatId];
      }
    }

    function stopAi() {
      if (ai) ai.stop();
    }

    function applyInternal(action) {
      if (!table.game) return;
      table.game = WW.reduce(table.game, action, random);
      armPhaseTimers();
      queueAi();
      broadcast();
    }

    function armTimeout() {
      clearTimer("timeout");
      const game = table.game;
      if (
        !game ||
        (game.phase !== "playing" && game.phase !== "spinning") ||
        game.turnEndsAt == null
      ) {
        return;
      }
      const waitMs = Math.max(0, game.turnEndsAt - now());
      timers.timeout = delay(function () {
        timers.timeout = 0;
        if (!table.game) return;
        if (table.game.phase !== "playing" && table.game.phase !== "spinning") {
          return;
        }
        applyInternal({ type: "TIMEOUT" });
      }, waitMs + 20);
    }

    function armPhaseTimers() {
      const game = table.game;
      if (!game) return;
      if (game.phase === "spinning") {
        if (!timers.spin) {
          timers.spin = delay(function () {
            timers.spin = 0;
            if (table.game && table.game.phase === "spinning") {
              applyInternal({ type: "SPIN_DONE", nowMs: now() });
            }
          }, WW.ROOM_SPIN_MS);
        }
      } else {
        clearTimer("spin");
      }
      if (game.phase === "revealing") {
        if (!timers.reveal) {
          timers.reveal = delay(function () {
            timers.reveal = 0;
            if (table.game && table.game.phase === "revealing") {
              applyInternal({ type: "REVEAL_DONE" });
            }
          }, WW.ROOM_REVEAL_MS);
        }
      } else {
        clearTimer("reveal");
      }
      armTimeout();
    }

    function queueAi() {
      if (!table.game) {
        stopAi();
        return;
      }
      if (!ai) {
        ai = WW.createAiDriver({
          getState: function () {
            return table.game;
          },
          dispatch: function (action) {
            applyInternal(action);
          },
        });
      }
      ai.queue();
    }

    function lobbyPayload(connId) {
      const you = seatByConn(connId);
      return {
        type: "VIEW",
        view: {
          screen: "lobby",
          code: table.code,
          rounds: table.rounds,
          you: you
            ? {
                seatId: you.id,
                playerId: you.playerId,
                isHost: you.isHost,
                seatToken: you.seatToken,
                name: you.name,
                color: you.color,
                ready: Boolean(you.isHost || you.ready),
              }
            : null,
          seats: table.seats.map(function (seat) {
            return {
              id: seat.id,
              name: seat.name,
              color: seat.color,
              isAi: seat.isAi,
              aiLevel: seat.aiLevel,
              connected: seat.connected,
              isHost: seat.isHost,
              ready: Boolean(seat.isAi || seat.isHost || seat.ready),
            };
          }),
          canStart: Boolean(you && you.isHost) && tableReady() && !table.game,
          waiting: false,
          reconnecting: false,
          game: null,
        },
      };
    }

    function gamePayload(connId) {
      const you = seatByConn(connId);
      const viewerId = you ? you.playerId : "";
      const current = WW.currentPlayer(table.game);
      const mine = Boolean(current && current.id === viewerId);
      const currentSeatRow = currentSeat();
      const reconnecting = Boolean(
        currentSeatRow && !currentSeatRow.connected && !currentSeatRow.isAi
      );
      const waiting = !mine && table.game.phase === "handoff";
      return {
        type: "VIEW",
        view: {
          screen: "game",
          code: table.code,
          rounds: table.rounds,
          you: you
            ? {
                seatId: you.id,
                playerId: you.playerId,
                isHost: you.isHost,
                seatToken: you.seatToken,
                name: you.name,
                color: you.color,
              }
            : null,
          seats: table.seats.map(function (seat) {
            return {
              id: seat.id,
              playerId: seat.playerId,
              name: seat.name,
              color: seat.color,
              isAi: seat.isAi,
              aiLevel: seat.aiLevel,
              connected: seat.connected,
              isHost: seat.isHost,
            };
          }),
          canStart: false,
          waiting: waiting,
          reconnecting: reconnecting,
          game: WW.filterGameView(table.game, viewerId),
        },
      };
    }

    function payloadFor(connId) {
      if (table.game) return gamePayload(connId);
      return lobbyPayload(connId);
    }

    function broadcast() {
      table.seats.forEach(function (seat) {
        if (!seat.connectionId || seat.isAi) return;
        send(seat.connectionId, payloadFor(seat.connectionId));
      });
    }

    function error(connId, code, message) {
      send(connId, { type: "ERROR", code: code, message: message });
    }

    function scheduleEmpty() {
      clearTimer("empty");
      if (connectedHumans().length) return;
      timers.empty = delay(function () {
        timers.empty = 0;
        if (connectedHumans().length) return;
        table.closed = true;
        table.game = null;
        table.seats = [];
        table.hostSeatId = null;
        stopAi();
        clearTimer("spin");
        clearTimer("reveal");
        clearTimer("timeout");
      }, WW.ROOM_EMPTY_MS);
    }

    function startGame() {
      const names = table.seats.map(function (seat) {
        return seat.name;
      });
      const colors = table.seats.map(function (seat) {
        return seat.color;
      });
      const ais = table.seats.map(function (seat) {
        return seat.isAi;
      });
      const aiLevels = table.seats.map(function (seat) {
        return seat.isAi ? seat.aiLevel || "intermediate" : "";
      });
      table.game = WW.reduce(
        WW.createGame(),
        {
          type: "START",
          playerCount: table.seats.length,
          names: names,
          colors: colors,
          ais: ais,
          aiLevels: aiLevels,
          turnsPerPlayer: table.rounds,
        },
        random
      );
      table.seats.forEach(function (seat, index) {
        seat.playerId = table.game.players[index].id;
      });
      armPhaseTimers();
      queueAi();
      broadcast();
    }

    function handleHost(connId, msg) {
      if (table.closed) {
        error(connId, "closed", "That room closed. Host a new one.");
        return;
      }
      const existing = seatByToken(msg.seatToken);
      if (existing) {
        existing.connectionId = connId;
        existing.connected = true;
        existing.isHost = true;
        table.hostSeatId = existing.id;
        table.seats.forEach(function (seat) {
          if (seat.id !== existing.id) seat.isHost = false;
        });
        broadcast();
        return;
      }
      if (table.hostSeatId && seatByConn(connId) === null) {
        const hostSeat = table.seats.find(function (seat) {
          return seat.id === table.hostSeatId;
        });
        if (hostSeat && hostSeat.connected) {
          error(connId, "taken", "That word is already a room.");
          return;
        }
      }
      if (table.game) {
        error(connId, "taken", "That match already started.");
        return;
      }
      if (!table.hostSeatId) {
        addSeat({
          connectionId: connId,
          seatToken: msg.seatToken,
          name: msg.name,
          color: msg.color,
          isHost: true,
        });
        broadcast();
        return;
      }
      error(connId, "taken", "That word is already a room.");
    }

    function handleJoin(connId, msg) {
      if (table.closed) {
        error(connId, "closed", "That room closed.");
        return;
      }
      if (!table.hostSeatId) {
        error(connId, "no_room", "No room with that word.");
        return;
      }
      const claimed = seatByToken(msg.seatToken);
      if (claimed) {
        claimed.connectionId = connId;
        claimed.connected = true;
        clearDisconnect(claimed.id);
        if (
          table.game &&
          currentSeat() &&
          currentSeat().id === claimed.id &&
          table.game.turnEndsAt == null
        ) {
          applyInternal({ type: "RESUME_TIMER", nowMs: now() });
          return;
        }
        broadcast();
        return;
      }
      if (table.game) {
        error(connId, "started", "That match already started.");
        return;
      }
      if (table.seats.length >= WW.MAX_PLAYERS) {
        error(connId, "full", "That room is full.");
        return;
      }
      addSeat({
        connectionId: connId,
        seatToken: msg.seatToken,
        name: msg.name,
        color: msg.color,
        isHost: false,
      });
      broadcast();
    }

    function requireHost(connId) {
      const you = seatByConn(connId);
      return Boolean(you && you.isHost);
    }

    function handleMessage(connId, msg) {
      if (!msg || !msg.type) return;
      if (msg.type === "HOST") {
        handleHost(connId, msg);
        return;
      }
      if (msg.type === "JOIN") {
        handleJoin(connId, msg);
        return;
      }
      const you = seatByConn(connId);
      if (!you) {
        error(connId, "who", "Join the room first.");
        return;
      }
      if (msg.type === "SET_READY") {
        if (table.game || you.isAi || you.isHost) return;
        you.ready = Boolean(msg.ready);
        broadcast();
        return;
      }
      if (msg.type === "SET_NAME") {
        you.name = uniqueName(msg.name, you.id);
        if (table.game && you.playerId) {
          const player = table.game.players.find(function (row) {
            return row.id === you.playerId;
          });
          if (player) player.name = you.name;
        }
        broadcast();
        return;
      }
      if (msg.type === "SET_COLOR") {
        you.color = uniqueColor(msg.color, you.id);
        if (table.game && you.playerId) {
          const player = table.game.players.find(function (row) {
            return row.id === you.playerId;
          });
          if (player) player.color = you.color;
        }
        broadcast();
        return;
      }
      if (msg.type === "SET_ROUNDS") {
        if (!requireHost(connId) || table.game) return;
        table.rounds = WW.clampRounds(msg.rounds);
        broadcast();
        return;
      }
      if (msg.type === "ADD_AI") {
        if (!requireHost(connId) || table.game) return;
        if (table.seats.length >= WW.MAX_PLAYERS) return;
        addSeat({
          isAi: true,
          aiLevel: msg.level || "intermediate",
          name: msg.name || "William Smith",
        });
        broadcast();
        return;
      }
      if (msg.type === "SET_AI") {
        if (!requireHost(connId) || table.game) return;
        const target = table.seats.find(function (seat) {
          return seat.id === msg.seatId;
        });
        if (!target || target.connected) return;
        if (msg.level) {
          target.isAi = true;
          target.aiLevel = WW.normalizeAiLevel(msg.level) || "intermediate";
          target.ready = true;
        } else {
          target.isAi = false;
          target.aiLevel = "";
          target.ready = false;
        }
        broadcast();
        return;
      }
      if (msg.type === "REMOVE_SEAT") {
        if (!requireHost(connId) || table.game) return;
        const target = table.seats.find(function (seat) {
          return seat.id === msg.seatId;
        });
        if (!target || target.isHost) return;
        const kickedId = target.connectionId;
        table.seats = table.seats.filter(function (seat) {
          return seat.id !== target.id;
        });
        if (kickedId && !target.isAi) {
          error(kickedId, "kicked", "The host kicked you out.");
          if (hooks.close) hooks.close(kickedId);
        }
        broadcast();
        return;
      }
      if (msg.type === "START") {
        if (!requireHost(connId) || table.game) return;
        if (!tableReady()) return;
        startGame();
        return;
      }
      if (msg.type === "RESET") {
        if (!requireHost(connId)) return;
        table.game = null;
        table.seats.forEach(function (seat) {
          seat.playerId = null;
          if (!seat.isAi && !seat.isHost) seat.ready = false;
        });
        stopAi();
        clearTimer("spin");
        clearTimer("reveal");
        clearTimer("timeout");
        broadcast();
        return;
      }
      if (msg.type === "GAME") {
        if (!table.game) return;
        const action = msg.action || {};
        if (!WW.gameActionAllowed(table.game, you.playerId, action.type)) {
          send(connId, payloadFor(connId));
          return;
        }
        if (action.type === "READY") action.nowMs = now();
        applyInternal(action);
      }
    }

    function handleClose(connId) {
      const seat = seatByConn(connId);
      if (!seat) {
        scheduleEmpty();
        return;
      }
      seat.connected = false;
      seat.connectionId = null;
      if (!table.game) {
        if (seat.isHost) {
          table.seats = table.seats.filter(function (row) {
            return row.id !== seat.id;
          });
          promoteHost();
        } else {
          table.seats = table.seats.filter(function (row) {
            return row.id !== seat.id;
          });
        }
        broadcast();
        scheduleEmpty();
        return;
      }
      if (seat.isHost) promoteHost();
      const current = currentSeat();
      if (current && current.id === seat.id && !seat.isAi) {
        if (table.game.phase === "playing" || table.game.phase === "spinning") {
          applyInternal({ type: "PAUSE_TIMER", nowMs: now() });
        }
        clearDisconnect(seat.id);
        timers.disconnect[seat.id] = delay(function () {
          delete timers.disconnect[seat.id];
          const still = seatByPlayerId(seat.playerId);
          if (!still || still.connected) return;
          if (
            table.game &&
            (table.game.phase === "playing" || table.game.phase === "spinning")
          ) {
            applyInternal({ type: "TIMEOUT" });
          }
        }, WW.ROOM_DISCONNECT_MS);
        broadcast();
        scheduleEmpty();
        return;
      }
      broadcast();
      scheduleEmpty();
    }

    return {
      handleMessage: handleMessage,
      handleClose: handleClose,
      viewFor: payloadFor,
      inspect: function () {
        return table;
      },
      _timers: timers,
    };
  };

  if (typeof module !== "undefined") module.exports = WW;
})(typeof globalThis !== "undefined" ? globalThis : this);
