(function (root) {
  const WW = root.WordWars || (root.WordWars = {});

  // Pick weights for every sabotage the AI is willing to buy. Mystery is left
  // out on purpose: its outcomes can bankrupt or backfire on the buyer.
  // The range is deliberately narrow so no single sabotage dominates.
  const SABOTAGE_WEIGHTS = {
    heist: 3,
    double_trouble: 3,
    hostile_takeover: 3,
    sui_you_later: 3,
    time_tax: 2,
    tunnel_vision: 2,
    clock_block: 2,
    no_scope: 2,
    cry_over_spilt_milk: 2,
    not_today: 2,
    robin_hood: 3,
    not_cheap: 2,
    ppl_shuffle: 1,
  };

  // Robin Hood takes from 1st place, so it only helps when the AI is behind.
  // Not Cheap only protects the player rivals are most likely to target.
  function sabotageSuitsPosition(itemId, leading) {
    if (itemId === "robin_hood") return !leading;
    if (itemId === "not_cheap") return leading;
    return true;
  }

  WW.pickAiSabotage = function pickAiSabotage(state, buyerIndex, rng) {
    const random = rng || Math.random;
    if (!state || !state.players) return null;
    if (!WW.getShopItem || !WW.canBuySabotage) return null;
    const buyer = state.players[buyerIndex];
    if (!buyer) return null;
    if (WW.normalizeAiLevel(buyer.aiLevel) === "beginner") return null;

    const rivals = state.players
      .filter(function (item) {
        return item.id !== buyer.id;
      })
      .sort(function (a, b) {
        return b.score - a.score;
      });
    const target = rivals[0];
    if (!target) return null;

    const hard = WW.normalizeAiLevel(buyer.aiLevel) === "hard";
    const leading = buyer.score >= target.score;
    const candidates = [];
    let total = 0;
    Object.keys(SABOTAGE_WEIGHTS).forEach(function (itemId) {
      if (!sabotageSuitsPosition(itemId, leading)) return;
      const item = WW.getShopItem(itemId);
      if (!item) return;
      const targetId = item.noTarget ? null : target.id;
      const check = WW.canBuySabotage(state, buyerIndex, itemId, targetId, null);
      if (!check || !check.ok) return;
      // The top difficulty leans on the pricier, higher-impact sabotages
      // without ever locking onto a single one.
      const weight = hard
        ? SABOTAGE_WEIGHTS[itemId] * (1 + item.cost / 20)
        : SABOTAGE_WEIGHTS[itemId];
      candidates.push({ itemId: itemId, targetId: targetId, weight: weight });
      total += weight;
    });
    if (!candidates.length) return null;

    let roll = random() * total;
    for (let i = 0; i < candidates.length; i += 1) {
      roll -= candidates[i].weight;
      if (roll <= 0) {
        return {
          itemId: candidates[i].itemId,
          targetId: candidates[i].targetId,
        };
      }
    }
    const last = candidates[candidates.length - 1];
    return { itemId: last.itemId, targetId: last.targetId };
  };

  WW.createAiDriver = function createAiDriver(hooks) {
    let timer = 0;
    let gen = 0;
    let job = "";
    const clock = typeof globalThis !== "undefined" ? globalThis : root;

    function state() {
      return hooks.getState();
    }

    function player() {
      return WW.currentPlayer(state());
    }

    function isAiSeat() {
      const current = player();
      return Boolean(current && current.isAi);
    }

    function stop() {
      clock.clearTimeout(timer);
      timer = 0;
      gen += 1;
      job = "";
      if (hooks.onIdle) hooks.onIdle();
    }

    function wait(ms, fn) {
      const token = gen;
      clock.clearTimeout(timer);
      timer = clock.setTimeout(function () {
        timer = 0;
        if (token !== gen) return;
        fn();
      }, ms);
    }

    function frozenMap(game) {
      const frozen = {};
      (game.frozenSlots || []).forEach(function (slot) {
        frozen[slot.index] = true;
      });
      return frozen;
    }

    function lettersToType(word, game) {
      const letters = String(word || "")
        .toUpperCase()
        .replace(/[^A-Z]/g, "")
        .slice(0, WW.WORD_LENGTH)
        .split("");
      if (game.reverseType) return letters.slice().reverse();
      return letters;
    }

    function buySabotage() {
      const game = state();
      const current = player();
      if (!game.seeded || !current) return;
      const pick = WW.pickAiSabotage(game, game.currentPlayerIndex);
      if (!pick) return;
      hooks.dispatch({
        type: "BUY_SABOTAGE",
        itemId: pick.itemId,
        targetId: pick.targetId || undefined,
      });
    }

    function pickWord(tried) {
      const game = state();
      let word = null;
      try {
        word = WW.pickAiWord(game);
      } catch (err) {
        console.error("AI word pick failed", err);
      }
      if (word && tried[word]) word = null;
      if (!word) {
        const pool = WW.WORDS || [];
        for (let i = 0; i < pool.length; i += 1) {
          const candidate = String(pool[i] || "").toLowerCase();
          if (tried[candidate]) continue;
          if (WW.wordFitsBoard(candidate, game)) {
            word = candidate;
            break;
          }
        }
      }
      if (word) tried[word] = true;
      return word;
    }

    function clearDraft(done) {
      function wipe() {
        const game = state();
        if (game.phase !== "playing" || !isAiSeat()) return;
        const frozen = frozenMap(game);
        const filled = (game.draft || []).some(function (cell, index) {
          return cell && !frozen[index];
        });
        if (!filled) {
          done();
          return;
        }
        hooks.dispatch({ type: "BACKSPACE" });
        wait(50, wipe);
      }
      wipe();
    }

    function runHandoff() {
      wait(750, function () {
        if (state().phase !== "handoff" || !isAiSeat()) return;
        try {
          buySabotage();
        } catch (err) {
          console.error("AI sabotage skipped", err);
        }
        wait(420, function () {
          if (state().phase !== "handoff" || !isAiSeat()) return;
          hooks.dispatch({ type: "READY", nowMs: Date.now() });
        });
      });
    }

    function runPlay() {
      const tried = {};
      function playWord(word) {
        const letters = lettersToType(word, state());
        let i = 0;
        function typeNext() {
          if (state().phase !== "playing" || !isAiSeat()) return;
          if (i < letters.length) {
            hooks.dispatch({ type: "TYPE", letter: letters[i] });
            i += 1;
            wait(240, typeNext);
            return;
          }
          wait(340, function () {
            if (state().phase !== "playing" || !isAiSeat()) return;
            hooks.dispatch({ type: "SUBMIT" });
            if (state().phase === "playing" && state().invalidReason) {
              const next = pickWord(tried);
              if (!next) return;
              clearDraft(function () {
                playWord(next);
              });
            }
          });
        }
        wait(520, typeNext);
      }
      const word = pickWord(tried);
      if (!word) {
        console.error("AI could not find a word");
        return;
      }
      playWord(word);
    }

    function queue() {
      const game = state();
      if (game.phase === "setup" || game.phase === "game_over" || !isAiSeat()) {
        stop();
        return;
      }
      if (hooks.onBusy) hooks.onBusy();
      if (game.phase === "spinning" || game.phase === "revealing") {
        return;
      }
      const nextJob = game.phase + ":" + String(game.currentPlayerIndex);
      if (job === nextJob) return;
      job = nextJob;
      if (game.phase === "handoff") {
        runHandoff();
        return;
      }
      if (game.phase === "playing") {
        runPlay();
      }
    }

    return {
      queue: queue,
      stop: stop,
      isAiSeat: isAiSeat,
    };
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
