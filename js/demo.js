(function (root) {
  const WW = root.WordWars || (root.WordWars = {});

  function player(id, name, score, turnsTaken, color) {
    return {
      id: id,
      name: name,
      score: score,
      turnsTaken: turnsTaken,
      color: color || "#fbab20",
      pendingEffects: [],
    };
  }

  function basePlayers() {
    return [
      player("p1", "Alex", 42, 2, "#fbab20"),
      player("p2", "Jordan", 38, 2, "#141414"),
      player("p3", "Sam", 25, 2, "#d7263d"),
    ];
  }

  WW.getDemoState = function getDemoState(key) {
    const players = basePlayers();

    const states = {
      setup: function () {
        return WW.createGame();
      },

      rules: function () {
        return WW.createGame();
      },

      restart: function () {
        return {
          phase: "playing",
          players: players,
          currentPlayerIndex: 0,
          lastWord: "STARS",
          frozenSlots: [{ index: 2, letter: "A" }],
          usedWords: ["STARS"],
          draft: ["C", "R", "A", "", ""],
          timeRemainingMs: 22000,
          turnEndsAt: Date.now() + 22000,
          lastSubmitResult: null,
          invalidReason: null,
          shakeNonce: 0,
          isSuddenDeath: false,
          suddenDeathRemaining: [],
          lastShopMessage: null,
        };
      },

      "handoff-first": function () {
        return {
          phase: "handoff",
          players: [player("p1", "Alex", 0, 0), player("p2", "Jordan", 0, 0)],
          currentPlayerIndex: 0,
          lastWord: null,
          frozenSlots: [],
          usedWords: [],
          draft: ["", "", "", "", ""],
          timeRemainingMs: WW.TURN_MS,
          turnEndsAt: null,
          lastSubmitResult: null,
          invalidReason: null,
          shakeNonce: 0,
          isSuddenDeath: false,
          suddenDeathRemaining: [],
          lastShopMessage: null,
        };
      },

      "handoff-mid": function () {
        return {
          phase: "handoff",
          players: players,
          currentPlayerIndex: 1,
          lastWord: "STARS",
          frozenSlots: [],
          usedWords: ["HELLO", "STARS"],
          draft: ["", "", "", "", ""],
          timeRemainingMs: WW.TURN_MS,
          turnEndsAt: null,
          lastSubmitResult: null,
          invalidReason: null,
          shakeNonce: 0,
          isSuddenDeath: false,
          suddenDeathRemaining: [],
          lastShopMessage: null,
        };
      },

      "handoff-shop": function () {
        return {
          phase: "handoff",
          players: [
            Object.assign(player("p1", "Alex", 87, 2), {
              pendingEffects: [
                { type: "time_tax", fromPlayerId: "p3" },
                { type: "double_trouble", fromPlayerId: "p1" },
                { type: "obsession", letter: "E", fromPlayerId: "p2" },
              ],
            }),
            player("p2", "Jordan", 38, 2),
            player("p3", "Sam", 25, 2),
          ],
          currentPlayerIndex: 0,
          lastWord: "FLAME",
          frozenSlots: [],
          usedWords: ["HELLO", "FLAME"],
          draft: ["", "", "", "", ""],
          timeRemainingMs: WW.TURN_MS,
          turnEndsAt: null,
          lastSubmitResult: null,
          invalidReason: null,
          shakeNonce: 0,
          isSuddenDeath: false,
          suddenDeathRemaining: [],
          lastShopMessage: "Double Trouble armed on Jordan.",
          turnDurationMs: WW.TURN_MS,
          activeEffects: [],
          hideTimer: false,
          reverseType: false,
          tunnelVision: false,
          requiredLetter: null,
          tooQuick: false,
          tooLate: false,
          freezeCount: 1,
        };
      },

      "playing-chaos": function () {
        return {
          phase: "playing",
          players: players,
          currentPlayerIndex: 1,
          lastWord: "CRANE",
          frozenSlots: [
            { index: 0, letter: "C" },
            { index: 4, letter: "E" },
          ],
          usedWords: ["CRANE"],
          draft: ["", "", "A", "", "E"],
          timeRemainingMs: 16000,
          turnEndsAt: Date.now() + 16000,
          lastSubmitResult: null,
          invalidReason: null,
          shakeNonce: 0,
          isSuddenDeath: false,
          suddenDeathRemaining: [],
          lastShopMessage: null,
          turnDurationMs: WW.TURN_MS,
          activeEffects: [
            { type: "double_trouble", fromPlayerId: "p1" },
            { type: "no_scope", fromPlayerId: "p3" },
            { type: "tunnel_vision", fromPlayerId: "p1" },
            { type: "obsession", letter: "L", fromPlayerId: "p2" },
          ],
          hideTimer: false,
          reverseType: true,
          tunnelVision: true,
          requiredLetter: "L",
          tooQuick: false,
          tooLate: true,
          freezeCount: 2,
        };
      },

      "handoff-sudden": function () {
        return {
          phase: "handoff",
          players: [
            player("p1", "Alex", 50, 5),
            player("p2", "Jordan", 50, 5),
          ],
          currentPlayerIndex: 0,
          lastWord: "CRANE",
          frozenSlots: [],
          usedWords: ["HELLO", "STARS", "CRANE"],
          draft: ["", "", "", "", ""],
          timeRemainingMs: WW.TURN_MS,
          turnEndsAt: null,
          lastSubmitResult: null,
          invalidReason: null,
          shakeNonce: 0,
          isSuddenDeath: true,
          suddenDeathRemaining: [0, 1],
          lastShopMessage: null,
        };
      },

      "spinning": function () {
        return {
          phase: "spinning",
          players: players,
          currentPlayerIndex: 1,
          lastWord: "CRANE",
          frozenSlots: [{ index: 2, letter: "A" }],
          usedWords: ["CRANE"],
          draft: ["C", "R", "A", "N", "E"],
          timeRemainingMs: WW.TURN_MS,
          turnEndsAt: null,
          lastSubmitResult: null,
          invalidReason: null,
          shakeNonce: 0,
          isSuddenDeath: false,
          suddenDeathRemaining: [],
          lastShopMessage: null,
          turnDurationMs: WW.TURN_MS,
        };
      },

      "playing-empty": function () {
        return {
          phase: "playing",
          players: [player("p1", "Alex", 0, 0), player("p2", "Jordan", 0, 0)],
          currentPlayerIndex: 0,
          lastWord: null,
          frozenSlots: [],
          usedWords: [],
          draft: ["", "", "", "", ""],
          timeRemainingMs: WW.TURN_MS,
          turnEndsAt: Date.now() + WW.TURN_MS,
          lastSubmitResult: null,
          invalidReason: null,
          shakeNonce: 0,
          isSuddenDeath: false,
          suddenDeathRemaining: [],
          lastShopMessage: null,
        };
      },

      "playing-typing": function () {
        return {
          phase: "playing",
          players: players,
          currentPlayerIndex: 0,
          lastWord: "STARS",
          frozenSlots: [{ index: 2, letter: "A" }],
          usedWords: ["STARS"],
          draft: ["C", "R", "A", "", ""],
          timeRemainingMs: 22000,
          turnEndsAt: Date.now() + 22000,
          lastSubmitResult: null,
          invalidReason: null,
          shakeNonce: 0,
          isSuddenDeath: false,
          suddenDeathRemaining: [],
          lastShopMessage: null,
        };
      },

      "playing-frozen": function () {
        return {
          phase: "playing",
          players: players,
          currentPlayerIndex: 1,
          lastWord: "STARS",
          frozenSlots: [{ index: 2, letter: "A" }],
          usedWords: ["STARS"],
          draft: ["", "", "A", "", ""],
          timeRemainingMs: 18000,
          turnEndsAt: Date.now() + 18000,
          lastSubmitResult: null,
          invalidReason: null,
          shakeNonce: 0,
          isSuddenDeath: false,
          suddenDeathRemaining: [],
          lastShopMessage: null,
          activeEffects: [
            { type: "time_tax", fromPlayerId: "p1" },
            { type: "double_trouble", fromPlayerId: "p3" },
          ],
          hideTimer: false,
        };
      },

      "playing-error-incomplete": function () {
        const s = states["playing-typing"]();
        s.draft = ["C", "R", "", "", ""];
        s.invalidReason = "incomplete";
        s.shakeNonce = 1;
        return s;
      },

      "playing-error-not-a-word": function () {
        const s = states["playing-typing"]();
        s.draft = ["X", "Y", "A", "Z", "Q"];
        s.invalidReason = "not_a_word";
        s.shakeNonce = 1;
        return s;
      },

      "playing-error-reused": function () {
        const s = states["playing-frozen"]();
        s.draft = ["S", "T", "A", "R", "S"];
        s.invalidReason = "reused";
        s.shakeNonce = 1;
        return s;
      },

      "playing-error-wrong-letter": function () {
        const s = states["playing-frozen"]();
        s.draft = ["B", "R", "E", "A", "D"];
        s.invalidReason = "wrong_letter";
        s.shakeNonce = 1;
        return s;
      },

      "playing-urgent": function () {
        const s = states["playing-frozen"]();
        s.draft = ["B", "R", "E", "A", ""];
        s.timeRemainingMs = 4000;
        s.turnEndsAt = Date.now() + 4000;
        return s;
      },

      "revealing-success": function () {
        return {
          phase: "revealing",
          players: players,
          currentPlayerIndex: 0,
          lastWord: "CRANE",
          frozenSlots: [],
          usedWords: ["STARS", "CRANE"],
          draft: ["C", "R", "A", "N", "E"],
          timeRemainingMs: 0,
          turnEndsAt: null,
          lastSubmitResult: {
            word: "CRANE",
            points: 73,
            frozenSlots: [],
            timedOut: false,
            tiles: ["C", "R", "A", "N", "E"],
          },
          invalidReason: null,
          shakeNonce: 0,
          isSuddenDeath: false,
          suddenDeathRemaining: [],
          lastShopMessage: null,
        };
      },

      "revealing-timeout": function () {
        return {
          phase: "revealing",
          players: players,
          currentPlayerIndex: 1,
          lastWord: "STARS",
          frozenSlots: [],
          usedWords: ["STARS"],
          draft: ["", "", "A", "", ""],
          timeRemainingMs: 0,
          turnEndsAt: null,
          lastSubmitResult: {
            word: "",
            points: 0,
            frozenSlots: [],
            timedOut: true,
            tiles: ["", "", "A", "", ""],
          },
          invalidReason: null,
          shakeNonce: 0,
          isSuddenDeath: false,
          suddenDeathRemaining: [],
          lastShopMessage: null,
        };
      },

      "results-winner": function () {
        return {
          phase: "game_over",
          players: [
            player("p1", "Alex", 62, 5),
            player("p2", "Jordan", 48, 5),
            player("p3", "Sam", 35, 5),
          ],
          currentPlayerIndex: 0,
          lastWord: "CRANE",
          frozenSlots: [{ index: 2, letter: "A" }],
          usedWords: ["STARS", "CRANE"],
          draft: ["", "", "", "", ""],
          timeRemainingMs: 0,
          turnEndsAt: null,
          lastSubmitResult: null,
          invalidReason: null,
          shakeNonce: 0,
          isSuddenDeath: false,
          suddenDeathRemaining: [],
          lastShopMessage: null,
        };
      },

      "results-draw": function () {
        return {
          phase: "game_over",
          players: [
            player("p1", "Alex", 50, 5),
            player("p2", "Jordan", 50, 5),
          ],
          currentPlayerIndex: 0,
          lastWord: "CRANE",
          frozenSlots: [{ index: 2, letter: "A" }],
          usedWords: ["STARS", "CRANE"],
          draft: ["", "", "", "", ""],
          timeRemainingMs: 0,
          turnEndsAt: null,
          lastSubmitResult: null,
          invalidReason: null,
          shakeNonce: 0,
          isSuddenDeath: false,
          suddenDeathRemaining: [],
          lastShopMessage: null,
        };
      },
    };

    const factory = states[key];
    return factory ? factory() : null;
  };

  WW.DEMO_KEYS = [
    "setup",
    "rules",
    "restart",
    "handoff-first",
    "handoff-mid",
    "handoff-shop",
    "playing-chaos",
    "handoff-sudden",
    "spinning",
    "playing-empty",
    "playing-typing",
    "playing-frozen",
    "playing-error-incomplete",
    "playing-error-not-a-word",
    "playing-error-reused",
    "playing-error-wrong-letter",
    "playing-urgent",
    "revealing-success",
    "revealing-timeout",
    "results-winner",
    "results-draw",
  ];
})(typeof globalThis !== "undefined" ? globalThis : this);
