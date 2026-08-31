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
      return {
        index: slot.index,
        letter: slot.letter,
        passed: Boolean(slot.passed),
      };
    });
  }

  function cloneShopPurchase(value) {
    if (!value || !value.itemName) return null;
    return {
      itemName: value.itemName,
      targetName: value.targetName || null,
    };
  }

  function clonePlayLog(log) {
    if (!log || !log.length) return [];
    return log.map(function (entry) {
      return {
        word: entry.word,
        points: entry.points,
        playerId: entry.playerId,
        playerName: entry.playerName,
        opening: Boolean(entry.opening),
      };
    });
  }

  function appendPlay(state, word, points, opening) {
    const player = state.players[state.currentPlayerIndex];
    const nextLog = clonePlayLog(state.playLog);
    nextLog.push({
      word: word,
      points: points,
      playerId: player ? player.id : "",
      playerName: player ? player.name : "",
      opening: Boolean(opening),
    });
    return nextLog;
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

  function cloneScoreGains(gains) {
    if (!gains || !gains.length) return [];
    return gains.map(function (gain) {
      return { playerId: gain.playerId, points: gain.points };
    });
  }

  function pushScoreGain(gains, playerId, points) {
    const amount = Number(points) || 0;
    if (!playerId || amount <= 0) return;
    for (let i = 0; i < gains.length; i += 1) {
      if (gains[i].playerId === playerId) {
        gains[i].points += amount;
        return;
      }
    }
    gains.push({ playerId: playerId, points: amount });
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
        notCheap: Boolean(player.notCheap),
        isAi: Boolean(player.isAi),
        aiLevel: player.aiLevel || "",
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

  function cloneLetterPointsState(points) {
    if (!points) return null;
    return WW.cloneLetterPoints(points);
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
            opening: Boolean(state.lastSubmitResult.opening),
            hostileMissPenalty: state.lastSubmitResult.hostileMissPenalty || 0,
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
      lastShopPurchase: cloneShopPurchase(state.lastShopPurchase),
      shopBoughtThisTurn: (state.shopBoughtThisTurn || []).slice(),
      scoreGains: cloneScoreGains(state.scoreGains),
      letterPoints: cloneLetterPointsState(state.letterPoints),
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
      blockBackspace: Boolean(state.blockBackspace),
      seeded: Boolean(state.seeded),
      turnsPerPlayer: roundsFor(state),
      playLog: clonePlayLog(state.playLog),
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

  function roundsFor(state) {
    return WW.clampRounds(state && state.turnsPerPlayer);
  }

  function isOpeningTurn(state) {
    return !state.seeded && !state.lastWord && !state.isSuddenDeath;
  }

  function allRegularTurnsDone(players, state) {
    const need = roundsFor(state);
    return players.every(function (player) {
      return player.turnsTaken >= need;
    });
  }

  function frozenSlotAt(frozenSlots, index) {
    if (!frozenSlots || !frozenSlots.length) return null;
    for (let i = 0; i < frozenSlots.length; i += 1) {
      if (frozenSlots[i].index === index) return frozenSlots[i];
    }
    return null;
  }

  function nextTypeTarget(draft, frozenSlots, reverseType) {
    const start = reverseType ? draft.length - 1 : 0;
    const step = reverseType ? -1 : 1;
    for (let i = start; reverseType ? i >= 0 : i < draft.length; i += step) {
      const frozen = frozenSlotAt(frozenSlots, i);
      if (frozen) {
        if (!frozen.passed) return { index: i, frozen: frozen };
        continue;
      }
      if (!draft[i]) return { index: i, frozen: null };
    }
    return null;
  }

  function lastTypedTarget(draft, frozenSlots, reverseType) {
    const start = reverseType ? 0 : draft.length - 1;
    const step = reverseType ? 1 : -1;
    for (let i = start; reverseType ? i < draft.length : i >= 0; i += step) {
      const frozen = frozenSlotAt(frozenSlots, i);
      if (frozen) {
        if (frozen.passed) return { index: i, frozen: frozen };
        continue;
      }
      if (draft[i]) return { index: i, frozen: null };
    }
    return null;
  }

  function passFrozenBefore(frozenSlots, filledIndex, reverseType) {
    if (!frozenSlots) return;
    frozenSlots.forEach(function (slot) {
      if (reverseType) {
        if (slot.index > filledIndex) slot.passed = true;
      } else if (slot.index < filledIndex) {
        slot.passed = true;
      }
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

  function pendingEffectTarget(effect) {
    return effect.resolvedType || effect.type;
  }

  function pushPendingEffect(target, effect) {
    target.pendingEffects.push(effect);
  }

  function applyRobinHood(players, buyerIndex) {
    const tied = leaders(players);
    if (!tied.length) {
      return { message: "Robin Hood — no leader to tax", gains: [] };
    }
    const leaderIndex = tied[0];
    const leader = players[leaderIndex];
    const take = Math.min(WW.ROBIN_HOOD_AMOUNT, leader.score);
    if (take <= 0) {
      return { message: "Robin Hood — leader has no points to share", gains: [] };
    }
    leader.score -= take;
    const recipients = players.filter(function (_, index) {
      return index !== leaderIndex;
    });
    if (!recipients.length) {
      return { message: "Robin Hood — no one to share with", gains: [] };
    }
    const each = Math.floor(take / recipients.length);
    let remainder = take - each * recipients.length;
    const gains = [];
    recipients.forEach(function (player) {
      let got = each;
      player.score += each;
      if (remainder > 0) {
        player.score += 1;
        got += 1;
        remainder -= 1;
      }
      pushScoreGain(gains, player.id, got);
    });
    return {
      message:
        "Robin Hood — took " +
        take +
        " from " +
        leader.name +
        " and shared it",
      gains: gains,
    };
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
      pushScoreGain(ctx.scoreGains, target.id, amount);
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
      pushScoreGain(ctx.scoreGains, buyer.id, amount);
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
      pushScoreGain(ctx.scoreGains, buyer.id, WW.MYSTERY_REFUND_AMOUNT);
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
    const target = check.targetIndex >= 0 ? next.players[check.targetIndex] : null;
    buyer.score -= WW.sabotagePrice(item, target);
    next.lastShopPurchase = {
      itemName: item.name,
      targetName: target ? target.name : null,
    };
    if (item.oncePerTurn) {
      next.shopBoughtThisTurn = (next.shopBoughtThisTurn || []).concat(item.id);
    }
    next.scoreGains = [];

    if (item.id === "robin_hood") {
      const hood = applyRobinHood(next.players, check.buyerIndex);
      next.lastShopMessage = hood.message;
      next.scoreGains = hood.gains;
      return next;
    }

    if (item.id === "ppl_shuffle") {
      next.letterPoints = WW.shuffleLetterPoints(random, next.letterPoints);
      next.lastShopMessage = item.name + " — letter values reshuffled";
      return next;
    }

    if (item.id === "not_cheap") {
      buyer.notCheap = true;
      next.lastShopMessage =
        item.name + " — rivals pay double to sabotage you";
      return next;
    }

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
      pushScoreGain(next.scoreGains, buyer.id, stolen);
      next.lastShopMessage =
        item.name + " — stole " + stolen + " from " + target.name;
    } else if (item.id === "hostile_takeover") {
      next.lastShopMessage =
        item.name + " — took over " + target.name + "'s next turn points";
      pushPendingEffect(target, {
        type: "hostile_takeover",
        fromPlayerId: buyer.id,
      });
    } else if (item.id === "cry_over_spilt_milk") {
      pushPendingEffect(target, {
        type: "no_backspace",
        fromPlayerId: buyer.id,
      });
      next.lastShopMessage =
        item.name + " — " + target.name + " cannot delete letters";
    } else if (item.id === "sui_you_later") {
      pushPendingEffect(target, {
        type: "sui_you_later",
        fromPlayerId: buyer.id,
      });
      next.lastShopMessage =
        item.name + " — +7 per vowel in " + target.name + "'s word";
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
    next.blockBackspace = false;
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
    } else if (type === "no_backspace") {
      ctx.blockBackspace = true;
      ctx.applied.push(effect);
    } else if (type === "sui_you_later") {
      ctx.applied.push(effect);
    } else {
      ctx.kept.push(effect);
    }
  }

  function scoreWithPenalties(word, timeRemainingMs, turnDurationMs, state) {
    let points = WW.wordValue(word, WW.getLetterPoints(state));
    const elapsed = turnDurationMs - timeRemainingMs;
    if (state.tooQuick && elapsed < WW.TOO_QUICK_MS) {
      points = Math.round(points * WW.SCORE_PENALTY);
    }
    if (state.tooLate && elapsed > WW.TOO_LATE_MS) {
      points = Math.round(points * WW.SCORE_PENALTY);
    }
    return points;
  }

  function hostileMissPenalty(players, playerIndex, effects) {
    const armed = (effects || []).some(function (effect) {
      return effect.type === "hostile_takeover";
    });
    if (!armed) return 0;
    const victim = players[playerIndex];
    if (!victim) return 0;
    const take = Math.min(
      WW.HOSTILE_TAKEOVER_MISS_PENALTY,
      Math.max(0, victim.score)
    );
    victim.score -= take;
    return take;
  }

  function applyTimeout(state) {
    const players = clonePlayers(state.players);
    const opening = isOpeningTurn(state);
    let missPenalty = 0;
    if (!opening) {
      players[state.currentPlayerIndex].turnsTaken += 1;
      missPenalty = hostileMissPenalty(
        players,
        state.currentPlayerIndex,
        state.activeEffects
      );
    }
    const tiles =
      state.phase === "spinning" ? emptyDraft(null) : state.draft.slice();

    return {
      phase: "revealing",
      players: players,
      currentPlayerIndex: state.currentPlayerIndex,
      lastWord: state.lastWord,
      frozenSlots: [],
      usedWords: state.usedWords.slice(),
      draft: tiles,
      timeRemainingMs: 0,
      turnEndsAt: null,
      lastSubmitResult: {
        word: null,
        points: missPenalty ? -missPenalty : 0,
        frozenSlots: [],
        timedOut: true,
        opening: opening,
        hostileMissPenalty: missPenalty,
        tiles: tiles,
      },
      invalidReason: null,
      shakeNonce: state.shakeNonce,
      isSuddenDeath: state.isSuddenDeath,
      suddenDeathRemaining: state.suddenDeathRemaining.slice(),
      lastShopMessage: state.lastShopMessage || null,
      lastShopPurchase: cloneShopPurchase(state.lastShopPurchase),
      shopBoughtThisTurn: (state.shopBoughtThisTurn || []).slice(),
      scoreGains: cloneScoreGains(state.scoreGains),
      letterPoints: cloneLetterPointsState(state.letterPoints),
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
      seeded: Boolean(state.seeded),
      turnsPerPlayer: roundsFor(state),
      playLog: clonePlayLog(state.playLog),
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
      lastShopPurchase: null,
      shopBoughtThisTurn: [],
      scoreGains: cloneScoreGains(state.scoreGains),
      letterPoints: cloneLetterPointsState(state.letterPoints),
      turnDurationMs: WW.TURN_MS,
      activeEffects: [],
      hideTimer: false,
      reverseType: false,
      tunnelVision: false,
      requiredLetter: null,
      tooQuick: false,
      tooLate: false,
      freezeCount: 1,
      seeded: Boolean(state.seeded),
      turnsPerPlayer: roundsFor(state),
      playLog: clonePlayLog(state.playLog),
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

    if (allRegularTurnsDone(players, state)) {
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

  function startGame(action, rng) {
    const random = rng || Math.random;
    let count = Number(action.playerCount);
    if (!Number.isFinite(count)) count = WW.MIN_PLAYERS;
    count = Math.max(
      WW.MIN_PLAYERS,
      Math.min(WW.MAX_PLAYERS, Math.floor(count))
    );
    const names = defaultNames(count, action.names);
    const colors = action.colors || [];
    const players = names.map(function (name, index) {
      const level = WW.normalizeAiLevel(action.aiLevels && action.aiLevels[index]);
      const isAi = Boolean(action.ais && action.ais[index]) || Boolean(level);
      return {
        id: "p" + (index + 1),
        name: name,
        color: colors[index] || WW.PLAYER_COLORS[index] || "#fbab20",
        score: 0,
        turnsTaken: 0,
        pendingEffects: [],
        notCheap: false,
        isAi: isAi,
        aiLevel: isAi ? level || "intermediate" : "",
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
      lastShopPurchase: null,
      shopBoughtThisTurn: [],
      scoreGains: [],
      letterPoints: action.letterPoints || WW.shuffleLetterPoints(random),
      turnDurationMs: WW.TURN_MS,
      activeEffects: [],
      hideTimer: false,
      reverseType: false,
      tunnelVision: false,
      requiredLetter: null,
      tooQuick: false,
      tooLate: false,
      freezeCount: 1,
      seeded: false,
      turnsPerPlayer: WW.clampRounds(action.turnsPerPlayer),
      playLog: [],
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
      lastShopPurchase: null,
      shopBoughtThisTurn: [],
      scoreGains: [],
      letterPoints: null,
      turnDurationMs: WW.TURN_MS,
      activeEffects: [],
      hideTimer: false,
      reverseType: false,
      tunnelVision: false,
      requiredLetter: null,
      tooQuick: false,
      tooLate: false,
      freezeCount: 1,
      seeded: false,
      turnsPerPlayer: WW.TURNS_PER_PLAYER,
      playLog: [],
    };
  };

  WW.currentPlayer = function currentPlayer(state) {
    return state.players[state.currentPlayerIndex] || null;
  };

  WW.wordFitsBoard = function wordFitsBoard(word, state) {
    const w = String(word || "").toLowerCase();
    if (w.length !== WW.WORD_LENGTH) return false;
    if (!WW.hasWord(w)) return false;
    const used = state.usedWords || state.usedWords || [];
    if (used.indexOf(w) !== -1) return false;
    const frozen = state.frozenSlots || state.frozenSlots || [];
    for (let i = 0; i < frozen.length; i += 1) {
      if (w.charAt(frozen[i].index) !== String(frozen[i].letter).toLowerCase()) {
        return false;
      }
    }
    if (state.requiredLetter) {
      if (w.indexOf(String(state.requiredLetter).toLowerCase()) === -1) {
        return false;
      }
    }
    return true;
  };

  WW.normalizeAiLevel = function normalizeAiLevel(value) {
    const key = String(value || "").toLowerCase();
    if (key === "2023" || key === "beginner") return "beginner";
    if (key === "2032" || key === "2032" || key === "hard") return "hard";
    if (key === "2025" || key === "intermediate") return "intermediate";
    return "";
  };

  WW.pickAiWord = function pickAiWord(state, rng) {
    const random = rng || Math.random;
    const pool = WW.WORDS || [];
    const matches = [];
    for (let i = 0; i < pool.length; i += 1) {
      const word = String(pool[i]).toLowerCase();
      if (WW.wordFitsBoard(word, state)) matches.push(word);
    }
    if (!matches.length) return null;
    let points = WW.LETTER_POINTS;
    try {
      if (typeof WW.getLetterPoints === "function") {
        points = WW.getLetterPoints(state);
      }
    } catch (err) {
      points = WW.LETTER_POINTS;
    }
    matches.sort(function (a, b) {
      const diff = WW.wordValue(b, points) - WW.wordValue(a, points);
      if (diff) return diff;
      if (a < b) return -1;
      if (a > b) return 1;
      return 0;
    });
    let level = "intermediate";
    if (state.players && state.players.length) {
      const player = state.players[state.currentPlayerIndex];
      if (player && player.aiLevel) {
        level = WW.normalizeAiLevel(player.aiLevel) || "intermediate";
      }
    }
    if (level === "hard") return matches[0];
    if (level === "beginner") {
      const start = Math.floor(matches.length / 2);
      const weak = matches.slice(start);
      const bag = weak.length ? weak : matches;
      return bag[Math.min(bag.length - 1, Math.floor(random() * bag.length))];
    }
    const topN = Math.min(8, matches.length);
    const index = Math.min(topN - 1, Math.floor(random() * topN));
    return matches[index];
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
      return startGame(action, random);
    }

    if (type === "BUY_SABOTAGE") {
      if (state.phase !== "handoff") return state;
      if (isOpeningTurn(state)) return state;
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
        blockBackspace: false,
        applied: [],
        kept: [],
        scoreGains: [],
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
      next.blockBackspace = ctx.blockBackspace;

      next.lastShopMessage = null;
      next.lastShopPurchase = null;
      next.shopBoughtThisTurn = [];
      next.scoreGains = cloneScoreGains(ctx.scoreGains);
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
      next.invalidReason = null;
      next.timeRemainingMs = turnMs;
      next.turnEndsAt = now + turnMs;
      return next;
    }

    if (type === "TYPE") {
      if (state.phase !== "playing") return state;
      const letter = String(action.letter || "")
        .toUpperCase()
        .replace(/[^A-Z]/g, "");
      if (letter.length !== 1) return state;
      const target = nextTypeTarget(
        state.draft,
        state.frozenSlots,
        state.reverseType
      );
      if (!target) return state;
      const next = cloneState(state);
      if (target.frozen) {
        const slot = frozenSlotAt(next.frozenSlots, target.index);
        const frozenLetter = String(target.frozen.letter || "").toUpperCase();
        if (letter === frozenLetter) {
          if (slot) slot.passed = true;
          next.invalidReason = null;
          return next;
        }
        const empty = nextEmptySlot(
          next.draft,
          next.frozenSlots,
          next.reverseType
        );
        if (empty < 0) return state;
        passFrozenBefore(next.frozenSlots, empty, next.reverseType);
        next.draft[empty] = letter;
        next.invalidReason = null;
        return next;
      }
      next.draft[target.index] = letter;
      next.invalidReason = null;
      return next;
    }

    if (type === "BACKSPACE") {
      if (state.phase !== "playing") return state;
      if (state.blockBackspace) return state;
      const target = lastTypedTarget(
        state.draft,
        state.frozenSlots,
        state.reverseType
      );
      if (!target) return state;
      const next = cloneState(state);
      if (target.frozen) {
        const slot = frozenSlotAt(next.frozenSlots, target.index);
        if (slot) slot.passed = false;
        next.invalidReason = null;
        return next;
      }
      next.draft[target.index] = "";
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

      const opening = isOpeningTurn(state);
      if (opening) {
        next.seeded = true;
        next.usedWords.push(word);
        next.lastWord = word;
        next.frozenSlots = [];
        next.phase = "revealing";
        next.turnEndsAt = null;
        next.invalidReason = null;
        next.lastSubmitResult = {
          word: word,
          points: 0,
          frozenSlots: [],
          timedOut: false,
          opening: true,
          tiles: state.draft.slice(),
        };
        next.draft = state.draft.slice();
        next.playLog = appendPlay(next, word, 0, true);
        return next;
      }

      const points = scoreWithPenalties(
        word,
        state.timeRemainingMs,
        state.turnDurationMs,
        state
      );

      const current = next.players[state.currentPlayerIndex];
      const gains = [];
      const hostile = (state.activeEffects || []).find(function (effect) {
        return effect.type === "hostile_takeover";
      });
      const pointsToTarget = hostile ? 0 : points;
      current.score += pointsToTarget;
      current.turnsTaken += 1;

      if (hostile) {
        const attackerIndex = state.players.findIndex(function (player) {
          return player.id === hostile.fromPlayerId;
        });
        if (attackerIndex >= 0) {
          next.players[attackerIndex].score += points;
          if (next.players[attackerIndex].id !== current.id) {
            pushScoreGain(gains, next.players[attackerIndex].id, points);
          }
        }
      }

      const sui = (state.activeEffects || []).find(function (effect) {
        return effect.type === "sui_you_later";
      });
      if (sui) {
        const bonus = WW.countVowels(word) * WW.SUI_VOWEL_POINTS;
        const attackerIndex = state.players.findIndex(function (player) {
          return player.id === sui.fromPlayerId;
        });
        if (attackerIndex >= 0) {
          next.players[attackerIndex].score += bonus;
          if (next.players[attackerIndex].id !== current.id) {
            pushScoreGain(gains, next.players[attackerIndex].id, bonus);
          }
        }
      }
      next.scoreGains = gains;
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
        opening: false,
        tiles: state.draft.slice(),
      };
      next.draft = state.draft.slice();
      next.playLog = appendPlay(next, word, points, false);
      return next;
    }

    if (type === "TIMEOUT") {
      if (state.phase !== "playing" && state.phase !== "spinning") return state;
      return applyTimeout(state);
    }

    if (type === "TICK") {
      if (
        (state.phase !== "playing" && state.phase !== "spinning") ||
        state.turnEndsAt == null
      ) {
        return state;
      }
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
      if (
        (state.phase !== "playing" && state.phase !== "spinning") ||
        state.turnEndsAt == null
      ) {
        return state;
      }
      const now = action.nowMs == null ? Date.now() : action.nowMs;
      const next = cloneState(state);
      next.timeRemainingMs = Math.max(0, state.turnEndsAt - now);
      next.turnEndsAt = null;
      return next;
    }

    if (type === "RESUME_TIMER") {
      if (
        (state.phase !== "playing" && state.phase !== "spinning") ||
        state.turnEndsAt != null
      ) {
        return state;
      }
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
