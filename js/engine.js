(function (root) {
  const WW = root.WordWars || (root.WordWars = {});

  function cloneEffect(effect) {
    const copy = {
      type: effect.type,
      fromPlayerId: effect.fromPlayerId,
    };
    if (effect.vsPlayerId) copy.vsPlayerId = effect.vsPlayerId;
    if (effect.letter) copy.letter = effect.letter;
    if (effect.resolvedType) copy.resolvedType = effect.resolvedType;
    if (effect.giftPoints != null) copy.giftPoints = effect.giftPoints;
    return copy;
  }

  function cloneEffects(effects) {
    if (!effects || !effects.length) return [];
    return effects.map(cloneEffect);
  }

  function cloneFrozenSlots(slots) {
    if (!slots || !slots.length) return [];
    return slots.map(function (slot) {
      return { index: slot.index, letter: slot.letter };
    });
  }

  function emptyDraft(frozenSlots) {
    const draft = ["", "", "", "", ""];
    if (frozenSlots) {
      frozenSlots.forEach(function (slot) {
        draft[slot.index] = slot.letter;
      });
    }
    return draft;
  }

  function isFrozenIndex(index, frozenSlots) {
    if (!frozenSlots || !frozenSlots.length) return false;
    return frozenSlots.some(function (slot) {
      return slot.index === index;
    });
  }

  function clonePlayers(players) {
    return players.map(function (player) {
      return {
        id: player.id,
        name: player.name,
        score: player.score,
        turnsTaken: player.turnsTaken,
        color: player.color || "#fbab20",
        pendingEffects: cloneEffects(player.pendingEffects),
      };
    });
  }

  function cloneTurnModifiers(state) {
    return {
      reverseType: Boolean(state.reverseType),
      tunnelVision: Boolean(state.tunnelVision),
      requiredLetter: state.requiredLetter || null,
      tooQuick: Boolean(state.tooQuick),
      tooLate: Boolean(state.tooLate),
      freezeCount: state.freezeCount == null ? 1 : state.freezeCount,
    };
  }

  function cloneState(state) {
    return {
      phase: state.phase,
      players: clonePlayers(state.players),
      currentPlayerIndex: state.currentPlayerIndex,
      lastWord: state.lastWord,
      frozenSlots: cloneFrozenSlots(state.frozenSlots),
      usedWords: state.usedWords.slice(),
      draft: state.draft.slice(),
      timeRemainingMs: state.timeRemainingMs,
      turnEndsAt: state.turnEndsAt,
      lastSubmitResult: state.lastSubmitResult
        ? {
            word: state.lastSubmitResult.word,
            points: state.lastSubmitResult.points,
            frozenSlots: cloneFrozenSlots(state.lastSubmitResult.frozenSlots),
            timedOut: state.lastSubmitResult.timedOut,
            tiles: state.lastSubmitResult.tiles
              ? state.lastSubmitResult.tiles.slice()
              : null,
          }
        : null,
      invalidReason: state.invalidReason,
      shakeNonce: state.shakeNonce,
      isSuddenDeath: state.isSuddenDeath,
      suddenDeathRemaining: state.suddenDeathRemaining.slice(),
      lastShopMessage: state.lastShopMessage || null,
      turnDurationMs:
        state.turnDurationMs == null ? WW.TURN_MS : state.turnDurationMs,
      activeEffects: cloneEffects(state.activeEffects),
      hideTimer: Boolean(state.hideTimer),
      reverseType: Boolean(state.reverseType),
      tunnelVision: Boolean(state.tunnelVision),
      requiredLetter: state.requiredLetter || null,
      tooQuick: Boolean(state.tooQuick),
      tooLate: Boolean(state.tooLate),
      freezeCount: state.freezeCount == null ? 1 : state.freezeCount,
    };
  }

  function defaultNames(count, names) {
    const result = [];
    for (let i = 0; i < count; i += 1) {
      const given = names && names[i] ? String(names[i]).trim() : "";
      result.push(given || "Player " + (i + 1));
    }
    return result;
  }

  function pickMultiFreeze(word, count, rng) {
    const available = [0, 1, 2, 3, 4];
    const picked = [];
    const n = Math.max(1, Math.min(WW.WORD_LENGTH, count));
    for (let i = 0; i < n && available.length; i += 1) {
      const idx = Math.floor(rng() * available.length);
      picked.push(available.splice(idx, 1)[0]);
    }
    return picked.map(function (index) {
      return {
        index: index,
        letter: word.charAt(index).toUpperCase(),
      };
    });
  }

  function wordTiles(word) {
    if (!word) return emptyDraft(null);
    return String(word)
      .toUpperCase()
      .split("")
      .slice(0, WW.WORD_LENGTH);
  }

  function leaders(players) {
    let max = -1;
    for (let i = 0; i < players.length; i += 1) {
      if (players[i].score > max) max = players[i].score;
    }
    const tied = [];
    for (let i = 0; i < players.length; i += 1) {
      if (players[i].score === max) tied.push(i);
    }
    return tied;
  }

  function allRegularTurnsDone(players) {
    return players.every(function (player) {
      return player.turnsTaken >= WW.TURNS_PER_PLAYER;
    });
  }

  function nextEmptySlot(draft, frozenSlots, reverseType) {
    if (reverseType) {
      for (let i = draft.length - 1; i >= 0; i -= 1) {
        if (isFrozenIndex(i, frozenSlots)) continue;
        if (!draft[i]) return i;
      }
    } else {
      for (let i = 0; i < draft.length; i += 1) {
        if (isFrozenIndex(i, frozenSlots)) continue;
        if (!draft[i]) return i;
      }
    }
    return -1;
  }

  function lastTypedSlot(draft, frozenSlots, reverseType) {
    if (reverseType) {
      for (let i = 0; i < draft.length; i += 1) {
        if (isFrozenIndex(i, frozenSlots)) continue;
        if (draft[i]) return i;
      }
    } else {
      for (let i = draft.length - 1; i >= 0; i -= 1) {
        if (isFrozenIndex(i, frozenSlots)) continue;
        if (draft[i]) return i;
      }
    }
    return -1;
  }

  function pendingEffectTarget(effect) {
    return effect.resolvedType || effect.type;
  }

  function pushPendingEffect(target, effect) {
    target.pendingEffects.push(effect);
  }

  function applyRobinHood(players, buyerIndex) {
    const tied = leaders(players);
    if (!tied.length) return "Robin Hood — no leader to tax";
    const leaderIndex = tied[0];
    const leader = players[leaderIndex];
    const take = Math.min(WW.ROBIN_HOOD_AMOUNT, leader.score);
    if (take <= 0) {
      return "Robin Hood — leader has no points to share";
    }
    leader.score -= take;
    const recipients = players.filter(function (_, index) {
      return index !== leaderIndex;
    });
    if (!recipients.length) {
      return "Robin Hood — no one to share with";
    }
    const each = Math.floor(take / recipients.length);
    let remainder = take - each * recipients.length;
    recipients.forEach(function (player) {
      player.score += each;
      if (remainder > 0) {
        player.score += 1;
        remainder -= 1;
      }
    });
    return (
      "Robin Hood — took " +
      take +
      " from " +
      leader.name +
      " and shared it"
    );
  }

  function findPlayerIndex(players, playerId) {
    return players.findIndex(function (player) {
      return player.id === playerId;
    });
  }

  function rotateScores(players) {
    const scores = players.map(function (player) {
      return player.score;
    });
    const n = scores.length;
    if (n < 2) return;
    const rotated = scores.map(function (_, index) {
      return scores[(index + 1) % n];
    });
    players.forEach(function (player, index) {
      player.score = rotated[index];
    });
  }

  function resolveMysteryEffect(effect, ctx) {
    const outcome = effect.resolvedType;
    const players = ctx.players;
    const targetIndex = ctx.currentPlayerIndex;
    const buyerIndex = findPlayerIndex(players, effect.fromPlayerId);
    const buyer = buyerIndex >= 0 ? players[buyerIndex] : null;
    const target = players[targetIndex];

    if (outcome === "mystery_nothing") {
      ctx.applied.push({
        type: "mystery_nothing",
        fromPlayerId: effect.fromPlayerId,
      });
      return;
    }

    if (outcome === "mystery_bankrupt_buyer" && buyer && target) {
      const amount = buyer.score;
      buyer.score = 0;
      target.score += amount;
      ctx.applied.push({
        type: "mystery_bankrupt_buyer",
        fromPlayerId: effect.fromPlayerId,
        amount: amount,
      });
      return;
    }

    if (outcome === "mystery_jackpot" && buyer && target) {
      const amount = target.score;
      target.score = 0;
      buyer.score += amount;
      ctx.applied.push({
        type: "mystery_jackpot",
        fromPlayerId: effect.fromPlayerId,
        amount: amount,
      });
      return;
    }

    if (outcome === "mystery_swap_all") {
      rotateScores(players);
      ctx.applied.push({
        type: "mystery_swap_all",
        fromPlayerId: effect.fromPlayerId,
      });
      return;
    }

    if (outcome === "mystery_refund" && buyer) {
      buyer.score += WW.MYSTERY_REFUND_AMOUNT;
      ctx.applied.push({
        type: "mystery_refund",
        fromPlayerId: effect.fromPlayerId,
      });
      return;
    }

    applyPendingEffect(
      {
        type: outcome,
        fromPlayerId: effect.fromPlayerId,
        giftPoints: WW.MYSTERY_GIFT_POINTS,
      },
      ctx
    );
  }

  function buySabotage(state, action, rng) {
    const random = rng || Math.random;
    const check = WW.canBuySabotage(
      state,
      state.currentPlayerIndex,
      action.itemId,
      action.targetId,
      action.letter
    );
    if (!check.ok) return state;

    const next = cloneState(state);
    const buyer = next.players[check.buyerIndex];
    const item = check.item;
    buyer.score -= item.cost;

    if (item.id === "robin_hood") {
      next.lastShopMessage = applyRobinHood(next.players, check.buyerIndex);
      return next;
    }

    const target = check.targetIndex >= 0 ? next.players[check.targetIndex] : null;

    if (target && item.id !== "not_today") {
      const immunityIndex = target.pendingEffects.findIndex(function (effect) {
        return effect.type === "immunity" && effect.vsPlayerId === buyer.id;
      });
      if (immunityIndex >= 0) {
        target.pendingEffects.splice(immunityIndex, 1);
        next.lastShopMessage =
          "Not Today — " + target.name + " blocked " + item.name;
        return next;
      }
    }

    if (item.id === "heist") {
      const stolen = Math.min(WW.HEIST_AMOUNT, target.score);
      target.score -= stolen;
      buyer.score += stolen;
      next.lastShopMessage =
        item.name + " — stole " + stolen + " from " + target.name;
    } else if (item.id === "hostile_takeover") {
      next.lastShopMessage =
        item.name + " — took over " + target.name + "'s next turn points";
      pushPendingEffect(target, {
        type: "hostile_takeover",
        fromPlayerId: buyer.id,
      });
    } else if (item.id === "time_tax") {
      pushPendingEffect(target, {
        type: "time_tax",
        fromPlayerId: buyer.id,
      });
      next.lastShopMessage =
        item.name + " — " + target.name + " loses 10s next turn";
    } else if (item.id === "clock_block") {
      pushPendingEffect(target, {
        type: "clock_block",
        fromPlayerId: buyer.id,
      });
      next.lastShopMessage =
        item.name + " — timer hidden for " + target.name;
    } else if (item.id === "not_today") {
      buyer.pendingEffects.push({
        type: "immunity",
        fromPlayerId: buyer.id,
        vsPlayerId: target.id,
      });
      next.lastShopMessage = item.name + " — immune to " + target.name;
    } else if (item.id === "double_trouble") {
      pushPendingEffect(target, {
        type: "double_trouble",
        fromPlayerId: buyer.id,
      });
      next.lastShopMessage =
        item.name + " — " + target.name + " gets 2 frozen letters";
    } else if (item.id === "triple_trouble") {
      pushPendingEffect(target, {
        type: "triple_trouble",
        fromPlayerId: buyer.id,
      });
      next.lastShopMessage =
        item.name + " — " + target.name + " gets 3 frozen letters";
    } else if (item.id === "no_scope") {
      pushPendingEffect(target, {
        type: "no_scope",
        fromPlayerId: buyer.id,
      });
      next.lastShopMessage =
        item.name + " — " + target.name + " types backwards";
    } else if (item.id === "too_quick") {
      pushPendingEffect(target, {
        type: "too_quick",
        fromPlayerId: buyer.id,
      });
      next.lastShopMessage =
        item.name + " — rush penalty for " + target.name;
    } else if (item.id === "too_late") {
      pushPendingEffect(target, {
        type: "too_late",
        fromPlayerId: buyer.id,
      });
      next.lastShopMessage =
        item.name + " — slow penalty for " + target.name;
    } else if (item.id === "obsession") {
      pushPendingEffect(target, {
        type: "obsession",
        letter: WW.normalizeLetter(action.letter),
        fromPlayerId: buyer.id,
      });
      next.lastShopMessage =
        item.name +
        " — " +
        target.name +
        " must use " +
        WW.normalizeLetter(action.letter);
    } else if (item.id === "mystery") {
      const outcome = WW.pickMysteryOutcome(random);

      // Arm the mystery effect for the target's next turn, without telling the buyer.
      pushPendingEffect(target, {
        type: "mystery_resolved",
        resolvedType: outcome,
        fromPlayerId: buyer.id,
      });
      next.lastShopMessage = null;
    } else if (item.id === "tunnel_vision") {
      pushPendingEffect(target, {
        type: "tunnel_vision",
        fromPlayerId: buyer.id,
      });
      next.lastShopMessage =
        item.name + " — " + target.name + " gets tunnel vision";
    }

    return next;
  }

  function resetTurnModifiers(next) {
    next.hideTimer = false;
    next.reverseType = false;
    next.tunnelVision = false;
    next.requiredLetter = null;
    next.tooQuick = false;
    next.tooLate = false;
    next.freezeCount = 1;
  }

  function applyPendingEffect(effect, ctx) {
    const type = effect.type;

    // Convert the mystery into the actual sabotage effect on the rival's turn.
    // In the handoff screen the buyer sees only "Mystery" (UI hides details for mystery_resolved).
    if (type === "mystery_resolved") {
      if (!effect.resolvedType) {
        ctx.kept.push(effect);
        return;
      }
      resolveMysteryEffect(effect, ctx);
      return;
    }

    if (type === "time_tax") {
      ctx.turnMs = Math.max(WW.MIN_TURN_MS, ctx.turnMs - WW.TIME_TAX_MS);
      ctx.applied.push(effect);
    } else if (type === "mystery_time") {
      ctx.turnMs = Math.min(
        WW.MAX_TURN_MS,
        ctx.turnMs + WW.MYSTERY_TIME_BONUS_MS
      );
      ctx.applied.push(effect);
    } else if (type === "clock_block") {
      ctx.hideTimer = true;
      ctx.applied.push(effect);
    } else if (type === "double_trouble") {
      ctx.freezeCount = Math.max(ctx.freezeCount, 2);
      ctx.applied.push(effect);
    } else if (type === "triple_trouble") {
      ctx.freezeCount = Math.max(ctx.freezeCount, 3);
      ctx.applied.push(effect);
    } else if (type === "no_scope") {
      ctx.reverseType = true;
      ctx.applied.push(effect);
    } else if (type === "too_quick") {
      ctx.tooQuick = true;
      ctx.applied.push(effect);
    } else if (type === "too_late") {
      ctx.tooLate = true;
      ctx.applied.push(effect);
    } else if (type === "tunnel_vision") {
      ctx.tunnelVision = true;
      ctx.applied.push(effect);
    } else if (type === "obsession") {
      ctx.requiredLetter = effect.letter || null;
      ctx.applied.push(effect);
    } else if (type === "mystery_gift") {
      ctx.giftPoints = (ctx.giftPoints || 0) + (effect.giftPoints || WW.MYSTERY_GIFT_POINTS);
      ctx.applied.push(effect);
    } else if (type === "hostile_takeover") {
      // Turn-scoped: consumed on the target's next SUBMIT (handled in SUBMIT logic).
      ctx.applied.push(effect);
    } else {
      ctx.kept.push(effect);
    }
  }

  function scoreWithPenalties(word, timeRemainingMs, turnDurationMs, state) {
    let points = WW.scoreWord(word, timeRemainingMs, turnDurationMs);
    const elapsed = turnDurationMs - timeRemainingMs;
    if (state.tooQuick && elapsed < WW.TOO_QUICK_MS) {
      points = Math.round(points * WW.SCORE_PENALTY);
    }
    if (state.tooLate && elapsed > WW.TOO_LATE_MS) {
      points = Math.round(points * WW.SCORE_PENALTY);
    }
    return points;
  }

  function applyTimeout(state) {
    const players = clonePlayers(state.players);
    players[state.currentPlayerIndex].turnsTaken += 1;

    return {
      phase: "revealing",
      players: players,
      currentPlayerIndex: state.currentPlayerIndex,
      lastWord: state.lastWord,
      frozenSlots: [],
      usedWords: state.usedWords.slice(),
      draft: state.draft.slice(),
      timeRemainingMs: 0,
      turnEndsAt: null,
      lastSubmitResult: {
        word: null,
        points: 0,
        frozenSlots: [],
        timedOut: true,
        tiles: state.draft.slice(),
      },
      invalidReason: null,
      shakeNonce: state.shakeNonce,
      isSuddenDeath: state.isSuddenDeath,
      suddenDeathRemaining: state.suddenDeathRemaining.slice(),
      lastShopMessage: state.lastShopMessage || null,
      turnDurationMs:
        state.turnDurationMs == null ? WW.TURN_MS : state.turnDurationMs,
      activeEffects: cloneEffects(state.activeEffects),
      hideTimer: Boolean(state.hideTimer),
      reverseType: Boolean(state.reverseType),
      tunnelVision: Boolean(state.tunnelVision),
      requiredLetter: state.requiredLetter || null,
      tooQuick: Boolean(state.tooQuick),
      tooLate: Boolean(state.tooLate),
      freezeCount: state.freezeCount == null ? 1 : state.freezeCount,
    };
  }

  function handoffState(players, state, nextIndex, options) {
    const opts = options || {};
    return {
      phase: "handoff",
      players: players,
      currentPlayerIndex: nextIndex,
      lastWord: state.lastWord,
      frozenSlots: [],
      usedWords: state.usedWords.slice(),
      draft: wordTiles(state.lastWord),
      timeRemainingMs: WW.TURN_MS,
      turnEndsAt: null,
      lastSubmitResult: null,
      invalidReason: null,
      shakeNonce: state.shakeNonce,
      isSuddenDeath: Boolean(opts.isSuddenDeath),
      suddenDeathRemaining: opts.suddenDeathRemaining || [],
      lastShopMessage: null,
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
  }

  function afterReveal(state) {
    const players = clonePlayers(state.players);

    if (state.isSuddenDeath) {
      const remaining = state.suddenDeathRemaining.filter(function (index) {
        return index !== state.currentPlayerIndex;
      });
      if (remaining.length === 0) {
        return Object.assign(handoffState(players, state, state.currentPlayerIndex), {
          phase: "game_over",
          frozenSlots: cloneFrozenSlots(state.frozenSlots),
          draft: emptyDraft(state.frozenSlots),
          lastSubmitResult: state.lastSubmitResult,
          isSuddenDeath: true,
          suddenDeathRemaining: [],
        });
      }
      return handoffState(players, state, remaining[0], {
        isSuddenDeath: true,
        suddenDeathRemaining: remaining,
      });
    }

    if (allRegularTurnsDone(players)) {
      const tied = leaders(players);
      if (tied.length === 1) {
        return Object.assign(handoffState(players, state, state.currentPlayerIndex), {
          phase: "game_over",
          frozenSlots: cloneFrozenSlots(state.frozenSlots),
          draft: emptyDraft(state.frozenSlots),
          lastSubmitResult: state.lastSubmitResult,
        });
      }
      return handoffState(players, state, tied[0], {
        isSuddenDeath: true,
        suddenDeathRemaining: tied.slice(),
      });
    }

    const nextIndex = (state.currentPlayerIndex + 1) % state.players.length;
    return handoffState(players, state, nextIndex);
  }

  function startGame(action) {
    let count = Number(action.playerCount);
    if (!Number.isFinite(count)) count = WW.MIN_PLAYERS;
    count = Math.max(
      WW.MIN_PLAYERS,
      Math.min(WW.MAX_PLAYERS, Math.floor(count))
    );
    const names = defaultNames(count, action.names);
    const colors = action.colors || [];
    const players = names.map(function (name, index) {
      return {
        id: "p" + (index + 1),
        name: name,
        color: colors[index] || WW.PLAYER_COLORS[index] || "#fbab20",
        score: 0,
        turnsTaken: 0,
        pendingEffects: [],
      };
    });

    return {
      phase: "handoff",
      players: players,
      currentPlayerIndex: 0,
      lastWord: null,
      frozenSlots: [],
      usedWords: [],
      draft: emptyDraft(null),
      timeRemainingMs: WW.TURN_MS,
      turnEndsAt: null,
      lastSubmitResult: null,
      invalidReason: null,
      shakeNonce: 0,
      isSuddenDeath: false,
      suddenDeathRemaining: [],
      lastShopMessage: null,
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
  }

  WW.createGame = function createGame() {
    return {
      phase: "setup",
      players: [],
      currentPlayerIndex: 0,
      lastWord: null,
      frozenSlots: [],
      usedWords: [],
      draft: emptyDraft(null),
      timeRemainingMs: WW.TURN_MS,
      turnEndsAt: null,
      lastSubmitResult: null,
      invalidReason: null,
      shakeNonce: 0,
      isSuddenDeath: false,
      suddenDeathRemaining: [],
      lastShopMessage: null,
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
  };

  WW.currentPlayer = function currentPlayer(state) {
    return state.players[state.currentPlayerIndex] || null;
  };

  WW.winners = function winners(state) {
    const tied = leaders(state.players);
    return tied.map(function (index) {
      return state.players[index];
    });
  };

  WW.reduce = function reduce(state, action, rng) {
    const random = rng || Math.random;
    const type = action && action.type;

    if (type === "RESET") {
      return WW.createGame();
    }

    if (type === "START") {
      return startGame(action);
    }

    if (type === "BUY_SABOTAGE") {
      if (state.phase !== "handoff") return state;
      return buySabotage(state, action, random);
    }

    if (type === "READY") {
      if (state.phase !== "handoff") return state;
      const now = action.nowMs == null ? Date.now() : action.nowMs;
      const next = cloneState(state);
      const player = next.players[next.currentPlayerIndex];
      const ctx = {
        turnMs: WW.TURN_MS,
        hideTimer: false,
        reverseType: false,
        tunnelVision: false,
        requiredLetter: null,
        tooQuick: false,
        tooLate: false,
        freezeCount: 1,
        giftPoints: 0,
        applied: [],
        kept: [],
        players: next.players,
        currentPlayerIndex: next.currentPlayerIndex,
      };

      player.pendingEffects.forEach(function (effect) {
        applyPendingEffect(effect, ctx);
      });
      player.pendingEffects = ctx.kept;

      // Apply any mystery gift points at turn start (the rival learns on their turn).
      if (ctx.giftPoints) player.score += ctx.giftPoints;

      next.activeEffects = ctx.applied;
      next.hideTimer = ctx.hideTimer;
      next.reverseType = ctx.reverseType;
      next.tunnelVision = ctx.tunnelVision;
      next.requiredLetter = ctx.requiredLetter;
      next.tooQuick = ctx.tooQuick;
      next.tooLate = ctx.tooLate;
      next.freezeCount = ctx.freezeCount;

      next.lastShopMessage = null;
      next.invalidReason = null;
      next.lastSubmitResult = null;
      next.turnDurationMs = ctx.turnMs;
      next.timeRemainingMs = ctx.turnMs;

      if (next.lastWord) {
        next.frozenSlots = pickMultiFreeze(
          next.lastWord,
          next.freezeCount,
          random
        );
        next.phase = "spinning";
        next.turnEndsAt = null;
        next.draft = wordTiles(next.lastWord);
        return next;
      }

      next.phase = "playing";
      next.frozenSlots = [];
      next.turnEndsAt = now + ctx.turnMs;
      next.draft = emptyDraft(null);
      return next;
    }

    if (type === "SPIN_DONE") {
      if (state.phase !== "spinning") return state;
      const now = action.nowMs == null ? Date.now() : action.nowMs;
      const turnMs =
        state.turnDurationMs == null ? WW.TURN_MS : state.turnDurationMs;
      const next = cloneState(state);
      next.phase = "playing";
      next.draft = emptyDraft(state.frozenSlots);
      next.timeRemainingMs = turnMs;
      next.turnEndsAt = now + turnMs;
      next.invalidReason = null;
      return next;
    }

    if (type === "TYPE") {
      if (state.phase !== "playing") return state;
      const letter = String(action.letter || "")
        .toUpperCase()
        .replace(/[^A-Z]/g, "");
      if (letter.length !== 1) return state;
      const slot = nextEmptySlot(
        state.draft,
        state.frozenSlots,
        state.reverseType
      );
      if (slot < 0) return state;
      const next = cloneState(state);
      next.draft[slot] = letter;
      next.invalidReason = null;
      return next;
    }

    if (type === "BACKSPACE") {
      if (state.phase !== "playing") return state;
      const slot = lastTypedSlot(
        state.draft,
        state.frozenSlots,
        state.reverseType
      );
      if (slot < 0) return state;
      const next = cloneState(state);
      next.draft[slot] = "";
      next.invalidReason = null;
      return next;
    }

    if (type === "SUBMIT") {
      if (state.phase !== "playing") return state;
      const next = cloneState(state);
      if (state.draft.some(function (cell) {
        return !cell;
      })) {
        next.invalidReason = "incomplete";
        next.shakeNonce += 1;
        return next;
      }
      const word = state.draft.join("").toLowerCase();
      if (state.frozenSlots && state.frozenSlots.length) {
        for (let i = 0; i < state.frozenSlots.length; i += 1) {
          const slot = state.frozenSlots[i];
          if (word.charAt(slot.index) !== slot.letter.toLowerCase()) {
            next.invalidReason = "wrong_letter";
            next.shakeNonce += 1;
            return next;
          }
        }
      }
      if (state.requiredLetter) {
        const need = state.requiredLetter.toLowerCase();
        if (word.indexOf(need) === -1) {
          next.invalidReason = "missing_letter";
          next.shakeNonce += 1;
          return next;
        }
      }
      if (state.usedWords.indexOf(word) !== -1) {
        next.invalidReason = "reused";
        next.shakeNonce += 1;
        return next;
      }
      if (!WW.hasWord(word)) {
        next.invalidReason = "not_a_word";
        next.shakeNonce += 1;
        return next;
      }

      const points = scoreWithPenalties(
        word,
        state.timeRemainingMs,
        state.turnDurationMs,
        state
      );

      const hostile = (state.activeEffects || []).find(function (effect) {
        return effect.type === "hostile_takeover";
      });
      const pointsToTarget = hostile ? 0 : points;
      next.players[state.currentPlayerIndex].score += pointsToTarget;
      next.players[state.currentPlayerIndex].turnsTaken += 1;

      if (hostile) {
        const attackerIndex = state.players.findIndex(function (player) {
          return player.id === hostile.fromPlayerId;
        });
        if (attackerIndex >= 0) {
          next.players[attackerIndex].score += points;
        }
      }
      next.usedWords.push(word);
      next.lastWord = word;
      next.frozenSlots = [];
      next.phase = "revealing";
      next.turnEndsAt = null;
      next.invalidReason = null;
      next.lastSubmitResult = {
        word: word,
        points: pointsToTarget,
        frozenSlots: [],
        timedOut: false,
        tiles: state.draft.slice(),
      };
      next.draft = state.draft.slice();
      return next;
    }

    if (type === "TIMEOUT") {
      if (state.phase !== "playing") return state;
      return applyTimeout(state);
    }

    if (type === "TICK") {
      if (state.phase !== "playing" || state.turnEndsAt == null) return state;
      const now = action.nowMs == null ? Date.now() : action.nowMs;
      const remaining = Math.max(0, state.turnEndsAt - now);
      if (remaining <= 0) {
        return applyTimeout(state);
      }
      if (remaining === state.timeRemainingMs) return state;
      const next = cloneState(state);
      next.timeRemainingMs = remaining;
      return next;
    }

    if (type === "PAUSE_TIMER") {
      if (state.phase !== "playing" || state.turnEndsAt == null) return state;
      const now = action.nowMs == null ? Date.now() : action.nowMs;
      const next = cloneState(state);
      next.timeRemainingMs = Math.max(0, state.turnEndsAt - now);
      next.turnEndsAt = null;
      return next;
    }

    if (type === "RESUME_TIMER") {
      if (state.phase !== "playing" || state.turnEndsAt != null) return state;
      const now = action.nowMs == null ? Date.now() : action.nowMs;
      const next = cloneState(state);
      next.turnEndsAt = now + Math.max(0, state.timeRemainingMs);
      return next;
    }

    if (type === "REVEAL_DONE") {
      if (state.phase !== "revealing") return state;
      const next = afterReveal(state);
      resetTurnModifiers(next);
      next.activeEffects = [];
      return next;
    }

    return state;
  };

  if (typeof module !== "undefined") module.exports = WW;
})(typeof globalThis !== "undefined" ? globalThis : this);
