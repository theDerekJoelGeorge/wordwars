(function (root) {
  const WW = root.WordWars || (root.WordWars = {});

  WW.DAILY_SEED_PREFIX = "worsus-daily:";
  WW.DAILY_MIN_FITS = 20;
  WW.DAILY_MAX_FITS = 800;
  WW.DAILY_LEADERBOARD_SIZE = 25;
  WW.DAILY_NAME_MAX = 24;
  WW.DAILY_DEVICE_RE = /^[a-f0-9]{32}$/i;
  WW.DAILY_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

  function pad2(value) {
    return String(value).padStart(2, "0");
  }

  function emptyDraft(frozenSlots) {
    const draft = ["", "", "", "", ""];
    if (frozenSlots) {
      frozenSlots.forEach(function (slot) {
        if (slot.wild) return;
        draft[slot.index] = String(slot.letter || "").toUpperCase();
      });
    }
    return draft;
  }

  function cloneSlots(slots) {
    return (slots || []).map(function (slot) {
      return {
        index: slot.index,
        letter: String(slot.letter || "").toUpperCase(),
      };
    });
  }

  function hashString(value) {
    const text = String(value || "");
    let hash = 1779033703 ^ text.length;
    for (let i = 0; i < text.length; i += 1) {
      hash = Math.imul(hash ^ text.charCodeAt(i), 3432918353);
      hash = (hash << 13) | (hash >>> 19);
    }
    return hash >>> 0;
  }

  WW.dailyDateKey = function dailyDateKey(date) {
    const d = date instanceof Date ? date : new Date();
    return (
      d.getUTCFullYear() +
      "-" +
      pad2(d.getUTCMonth() + 1) +
      "-" +
      pad2(d.getUTCDate())
    );
  };

  WW.isDailyDateKey = function isDailyDateKey(value) {
    return WW.DAILY_DATE_RE.test(String(value || ""));
  };

  WW.dailyRoomId = function dailyRoomId(dateKey) {
    const key = WW.isDailyDateKey(dateKey) ? dateKey : WW.dailyDateKey();
    return "daily-" + key;
  };

  WW.dateKeyFromRoomId = function dateKeyFromRoomId(roomId) {
    const id = String(roomId || "");
    const key = id.indexOf("daily-") === 0 ? id.slice(6) : id;
    return WW.isDailyDateKey(key) ? key : "";
  };

  WW.createSeededRng = function createSeededRng(seed) {
    let t = typeof seed === "number" ? seed >>> 0 : hashString(seed);
    return function () {
      t += 0x6d2b79f5;
      let r = Math.imul(t ^ (t >>> 15), 1 | t);
      r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  };

  function countFitsBySlot() {
    const words = WW.WORDS || [];
    const counts = [{}, {}, {}, {}, {}];
    for (let i = 0; i < words.length; i += 1) {
      const word = String(words[i] || "").toLowerCase();
      if (word.length !== WW.WORD_LENGTH) continue;
      for (let index = 0; index < WW.WORD_LENGTH; index += 1) {
        const letter = word.charAt(index).toUpperCase();
        counts[index][letter] = (counts[index][letter] || 0) + 1;
      }
    }
    return counts;
  }

  function pickFreeze(rng, counts) {
    const viable = [];
    const fallback = [];
    for (let index = 0; index < WW.WORD_LENGTH; index += 1) {
      Object.keys(counts[index]).forEach(function (letter) {
        const n = counts[index][letter];
        const option = { index: index, letter: letter, count: n };
        fallback.push(option);
        if (n >= WW.DAILY_MIN_FITS && n <= WW.DAILY_MAX_FITS) {
          viable.push(option);
        }
      });
    }
    const pool = viable.length ? viable : fallback;
    if (!pool.length) {
      return { index: 0, letter: "A" };
    }
    return pool[Math.floor(rng() * pool.length) % pool.length];
  }

  WW.createDailyPuzzle = function createDailyPuzzle(dateKey) {
    const key = WW.isDailyDateKey(dateKey) ? dateKey : WW.dailyDateKey();
    const rng = WW.createSeededRng(WW.DAILY_SEED_PREFIX + key);
    const letterPoints = WW.shuffleLetterPoints(rng);
    const freeze = pickFreeze(rng, countFitsBySlot());
    return {
      dateKey: key,
      frozenSlots: [{ index: freeze.index, letter: freeze.letter }],
      letterPoints: letterPoints,
    };
  };

  WW.publicDailyPuzzle = function publicDailyPuzzle(puzzle) {
    return {
      dateKey: puzzle.dateKey,
      frozenSlots: cloneSlots(puzzle.frozenSlots),
      letterPoints: WW.cloneLetterPoints(puzzle.letterPoints),
    };
  };

  WW.normalizeDailyName = function normalizeDailyName(value) {
    const name = String(value || "")
      .replace(/[\u0000-\u001f\u007f]/g, "")
      .trim()
      .slice(0, WW.DAILY_NAME_MAX);
    return name || "Player";
  };

  WW.normalizeDailyDeviceId = function normalizeDailyDeviceId(value) {
    const id = String(value || "").toLowerCase();
    return WW.DAILY_DEVICE_RE.test(id) ? id : "";
  };

  WW.normalizeDailyWord = function normalizeDailyWord(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/[^a-z]/g, "")
      .slice(0, WW.WORD_LENGTH);
  };

  WW.validateDailyWord = function validateDailyWord(word, puzzle) {
    const w = WW.normalizeDailyWord(word);
    if (w.length !== WW.WORD_LENGTH) {
      return { ok: false, reason: "incomplete", word: w, score: 0 };
    }
    const slots = (puzzle && puzzle.frozenSlots) || [];
    for (let i = 0; i < slots.length; i += 1) {
      const slot = slots[i];
      if (slot.wild) continue;
      if (w.charAt(slot.index) !== String(slot.letter || "").toLowerCase()) {
        return { ok: false, reason: "wrong_letter", word: w, score: 0 };
      }
    }
    if (!WW.hasWord(w)) {
      return { ok: false, reason: "not_a_word", word: w, score: 0 };
    }
    const score = WW.wordValue(w, puzzle && puzzle.letterPoints);
    return { ok: true, reason: "", word: w, score: score };
  };

  WW.rankDailyEntries = function rankDailyEntries(entries, deviceId) {
    const rows = Object.keys(entries || {}).map(function (id) {
      const row = entries[id] || {};
      return {
        deviceId: id,
        name: WW.normalizeDailyName(row.name),
        word: WW.normalizeDailyWord(row.word),
        score: Number(row.score) || 0,
        at: Number(row.at) || 0,
      };
    });
    rows.sort(function (a, b) {
      if (b.score !== a.score) return b.score - a.score;
      if (a.at !== b.at) return a.at - b.at;
      return a.deviceId < b.deviceId ? -1 : 1;
    });
    const youId = WW.normalizeDailyDeviceId(deviceId);
    let you = null;
    rows.forEach(function (row, index) {
      row.rank = index + 1;
      if (youId && row.deviceId === youId) {
        you = {
          rank: row.rank,
          name: row.name,
          word: row.word,
          score: row.score,
          at: row.at,
        };
      }
    });
    return {
      ranks: rows.slice(0, WW.DAILY_LEADERBOARD_SIZE).map(function (row) {
        return {
          rank: row.rank,
          name: row.name,
          word: row.word,
          score: row.score,
          you: Boolean(youId && row.deviceId === youId),
        };
      }),
      you: you,
      total: rows.length,
    };
  };

  WW.applyDailyBest = function applyDailyBest(entries, deviceId, nextEntry) {
    const id = WW.normalizeDailyDeviceId(deviceId);
    const copy = Object.assign({}, entries || {});
    if (!id || !nextEntry) {
      return { entries: copy, improved: false, kept: Boolean(copy[id]) };
    }
    const incoming = {
      name: WW.normalizeDailyName(nextEntry.name),
      word: WW.normalizeDailyWord(nextEntry.word),
      score: Number(nextEntry.score) || 0,
      at: Number(nextEntry.at) || 0,
    };
    const prev = copy[id];
    if (prev) {
      const prevScore = Number(prev.score) || 0;
      if (incoming.score < prevScore) {
        return { entries: copy, improved: false, kept: true };
      }
      if (incoming.score === prevScore) {
        return { entries: copy, improved: false, kept: true };
      }
    }
    copy[id] = incoming;
    return { entries: copy, improved: true, kept: Boolean(prev) };
  };

  WW.createDailyPlayState = function createDailyPlayState(puzzle, name) {
    const next = WW.createGame();
    const slots = cloneSlots(puzzle && puzzle.frozenSlots);
    next.phase = "playing";
    next.daily = true;
    next.seeded = true;
    next.lastWord = "daily";
    next.frozenSlots = slots;
    next.letterPoints = WW.cloneLetterPoints(puzzle && puzzle.letterPoints);
    next.draft = emptyDraft(slots);
    next.hideTimer = true;
    next.timeRemainingMs = 24 * 60 * 60 * 1000;
    next.turnEndsAt = Date.now() + 24 * 60 * 60 * 1000;
    next.turnDurationMs = 24 * 60 * 60 * 1000;
    next.players = [
      {
        id: "daily",
        name: WW.normalizeDailyName(name),
        score: 0,
        turnsTaken: 0,
        color: "#fbab20",
        pendingEffects: [],
        notCheap: false,
        isAi: false,
        aiLevel: "",
      },
    ];
    return next;
  };

  WW.submitDailyWord = function submitDailyWord(state, puzzle) {
    if (!state || state.phase !== "playing") return state;
    const next = Object.assign({}, state);
    if ((state.draft || []).some(function (cell) {
      return !cell;
    })) {
      next.invalidReason = "incomplete";
      next.shakeNonce = (state.shakeNonce || 0) + 1;
      return next;
    }
    const result = WW.validateDailyWord(state.draft.join(""), puzzle);
    if (!result.ok) {
      next.invalidReason = result.reason;
      next.shakeNonce = (state.shakeNonce || 0) + 1;
      return next;
    }
    next.phase = "revealing";
    next.daily = true;
    next.invalidReason = null;
    next.lastSubmitResult = {
      word: result.word,
      points: result.score,
      frozenSlots: cloneSlots(state.frozenSlots),
      timedOut: false,
      opening: false,
      tiles: (state.draft || []).slice(),
    };
    next.draft = (state.draft || []).slice();
    if (next.players && next.players[0]) {
      next.players = next.players.slice();
      next.players[0] = Object.assign({}, next.players[0], {
        score: result.score,
      });
    }
    return next;
  };

  WW.resetDailyDraft = function resetDailyDraft(state, puzzle, name) {
    const next = WW.createDailyPlayState(puzzle, name || (state.players[0] && state.players[0].name));
    if (state && state.players && state.players[0]) {
      next.players[0].score = state.players[0].score;
    }
    return next;
  };

  WW.dailyStorageKeys = function dailyStorageKeys(dateKey) {
    const key = WW.isDailyDateKey(dateKey) ? dateKey : WW.dailyDateKey();
    return {
      device: "wordsus.daily.deviceId",
      name: "wordsus.daily.name",
      best: "wordsus.daily.best." + key,
    };
  };

  WW.readDailyDeviceId = function readDailyDeviceId() {
    const keys = WW.dailyStorageKeys();
    try {
      const existing = WW.normalizeDailyDeviceId(
        root.localStorage && root.localStorage.getItem(keys.device)
      );
      if (existing) return existing;
    } catch (err) {
      /* ignore */
    }
    const bytes = new Uint8Array(16);
    if (root.crypto && root.crypto.getRandomValues) {
      root.crypto.getRandomValues(bytes);
    } else {
      for (let i = 0; i < 16; i += 1) bytes[i] = Math.floor(Math.random() * 256);
    }
    const id = Array.from(bytes, function (byte) {
      return byte.toString(16).padStart(2, "0");
    }).join("");
    try {
      if (root.localStorage) root.localStorage.setItem(keys.device, id);
    } catch (err) {
      /* ignore */
    }
    return id;
  };

  WW.readDailyName = function readDailyName() {
    try {
      return WW.normalizeDailyName(
        root.localStorage &&
          root.localStorage.getItem(WW.dailyStorageKeys().name)
      );
    } catch (err) {
      return "Player";
    }
  };

  WW.writeDailyName = function writeDailyName(name) {
    const value = WW.normalizeDailyName(name);
    try {
      if (root.localStorage) {
        root.localStorage.setItem(WW.dailyStorageKeys().name, value);
      }
    } catch (err) {
      /* ignore */
    }
    return value;
  };

  WW.readDailyBest = function readDailyBest(dateKey) {
    try {
      const raw =
        root.localStorage &&
        root.localStorage.getItem(WW.dailyStorageKeys(dateKey).best);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.word) return null;
      return {
        word: WW.normalizeDailyWord(parsed.word),
        score: Number(parsed.score) || 0,
      };
    } catch (err) {
      return null;
    }
  };

  WW.writeDailyBest = function writeDailyBest(dateKey, entry) {
    const next = {
      word: WW.normalizeDailyWord(entry && entry.word),
      score: Number(entry && entry.score) || 0,
    };
    const prev = WW.readDailyBest(dateKey);
    if (prev && prev.score >= next.score) return prev;
    try {
      if (root.localStorage) {
        root.localStorage.setItem(
          WW.dailyStorageKeys(dateKey).best,
          JSON.stringify(next)
        );
      }
    } catch (err) {
      /* ignore */
    }
    return next;
  };

  if (typeof module !== "undefined") module.exports = WW;
})(typeof globalThis !== "undefined" ? globalThis : this);
