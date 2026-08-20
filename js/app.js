(function () {
  const WW = window.WordWars;
  const params = new URLSearchParams(window.location.search);
  const turnOverride = Number(params.get("turnMs"));
  if (Number.isFinite(turnOverride) && turnOverride > 0) {
    WW.TURN_MS = turnOverride;
  }
  const KEY_ROWS = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"];
  const desktopMq = window.matchMedia("(min-width: 721px)");
  const PLAYER_COLORS = WW.PLAYER_COLORS || [
    "#fbab20",
    "#141414",
    "#d7263d",
    "#2a9d8f",
    "#3d5a80",
    "#9b5de5",
  ];
  const PLAYER_PLACEHOLDERS = [
    "SPELLING BEE",
    "DYSLEXIC DINOSUAR",
    "GRAMMER POLICE",
    "SILENT K NIGHT",
    "AUTOCORRRECT",
    "I BEFORE E",
  ];
  const COLOR_NAMES = {
    "#fbab20": "Amber",
    "#141414": "Black",
    "#d7263d": "Red",
    "#2a9d8f": "Teal",
    "#3d5a80": "Blue",
    "#9b5de5": "Purple",
  };

  const screens = {
    setup: document.getElementById("screen-setup"),
    handoff: document.getElementById("screen-handoff"),
    play: document.getElementById("screen-play"),
    results: document.getElementById("screen-results"),
  };

  const scoreboardEl = document.getElementById("scoreboard");
  const nameFieldsEl = document.getElementById("name-fields");
  const handoffNameEl = document.getElementById("handoff-name");
  const handoffKickerEl = document.getElementById("handoff-kicker");
  const suddenBannerEl = document.getElementById("sudden-banner");
  const turnKickerEl = document.getElementById("turn-kicker");
  const turnWhoEl = document.getElementById("turn-who");
  const timerEl = document.getElementById("timer");
  const timerSecsEl = document.getElementById("timer-secs");
  const timerFillEl = document.getElementById("timer-fill");
  const boardEl = document.getElementById("board");
  const letterInput = document.getElementById("letter-input");
  const flashEl = document.getElementById("flash");
  const keyboardEl = document.getElementById("keyboard");
  const rankListEl = document.getElementById("rank-list");
  const resultsTitleEl = document.getElementById("results-title");
  const readyBtn = document.getElementById("ready-btn");
  const shopToggleBtn = document.getElementById("shop-toggle-btn");
  const shopEl = document.getElementById("shop");
  const shopCloseBtn = document.getElementById("shop-close-btn");
  const shopBalanceEl = document.getElementById("shop-balance");
  const shopItemsEl = document.getElementById("shop-items");
  const shopFlashEl = document.getElementById("shop-flash");
  const handoffBoardEl = document.getElementById("handoff-board");
  const handoffWordEl = document.getElementById("handoff-word");
  const handoffEffectsEl = document.getElementById("handoff-effects");
  const handoffEffectListEl = document.getElementById("handoff-effect-list");
  const playEffectsEl = document.getElementById("play-effects");
  const playEffectListEl = document.getElementById("play-effect-list");
  const rulesEl = document.getElementById("rules");
  const restartEl = document.getElementById("restart");
  const onboardingEl = document.getElementById("onboarding");
  const onboardingProgressEl = document.getElementById("onboarding-progress");
  const onboardingVisualEl = document.getElementById("onboarding-visual");
  const onboardingTitleEl = document.getElementById("onboarding-title");
  const onboardingBodyEl = document.getElementById("onboarding-body");
  const onboardingDotsEl = document.getElementById("onboarding-dots");
  const onboardingSkipBtn = document.getElementById("onboarding-skip-btn");
  const onboardingNextBtn = document.getElementById("onboarding-next-btn");
  const rulesBtn = document.getElementById("rules-btn");
  const restartBtn = document.getElementById("restart-btn");
  const srAnnouncer = document.getElementById("sr-announcer");
  const timerBarEl = document.getElementById("timer-bar");
  const timerLabelEl = document.getElementById("timer-label");
  const appEl = document.getElementById("app");

  let state = WW.createGame();
  let setupCount = 2;
  let revealTimer = 0;
  let scoreRevealTimer = 0;
  let spinTimer = 0;
  let lastShake = 0;
  let rafId = 0;
  let shopOpen = false;
  let shareFlash = 0;
  let dialogTrigger = null;
  let shopWasOpen = false;
  let prevPhase = "";
  let lastTimerCue = 0;
  let announceTimer = 0;
  let onboardingStep = 0;

  function getOnboardingSlides() {
    const desktop = isDesktop();
    return [
      {
        image: "assets/onboarding/welcome.svg",
        title: "Welcome to wordsus",
        body: desktop
          ? "A same-screen five-letter word war for 2–6 friends. Take turns typing words, scoring points, and sabotaging each other."
          : "A pass-and-play five-letter word war for 2–6 friends. Pass the phone, type words, score points, and sabotage each other.",
      },
      {
        image: "assets/onboarding/setup.svg",
        title: "Add your players",
        body: desktop
          ? "Name everyone and pick a colour, then tap BEGIN. When it’s your turn, tap Ready to start the timer."
          : "Name everyone and pick a colour, then tap BEGIN. Pass the device — the next player taps Ready when they have the phone.",
      },
      {
        image: "assets/onboarding/playing.svg",
        title: "Type a five-letter word",
        body: "You have 30 seconds to enter any valid dictionary word. Letters score like Scrabble — Q, Z, and J are worth the most.",
      },
      {
        image: "assets/onboarding/frozen.svg",
        title: "Frozen letters chain the game",
        body: "After each turn, one or more letters from the last word freeze in place. Your next word must work around those locked tiles.",
      },
      {
        image: "assets/onboarding/shop.svg",
        title: "Spend points in the shop",
        body: "Between turns, open the sabotage shop. Steal time, hide the clock, force backwards typing, freeze extra letters — or gamble on a mystery prank.",
      },
      {
        image: "assets/onboarding/win.svg",
        title: "Win the word war",
        body: "Five turns each. Highest score wins. If leaders tie, sudden death rounds decide it. You’re ready — add players and tap BEGIN.",
      },
    ];
  }

  function paintOnboardingSlide() {
    const slides = getOnboardingSlides();
    const slide = slides[onboardingStep];
    if (!slide) return;

    if (onboardingProgressEl) {
      onboardingProgressEl.textContent = "how to · " + (onboardingStep + 1) + " of " + slides.length;
    }
    if (onboardingVisualEl) {
      onboardingVisualEl.innerHTML =
        '<img src="' + slide.image + '" alt="" width="200" height="120" decoding="async" />';
    }
    if (onboardingTitleEl) onboardingTitleEl.textContent = slide.title;
    if (onboardingBodyEl) onboardingBodyEl.textContent = slide.body;
    if (onboardingNextBtn) {
      onboardingNextBtn.innerHTML =
        onboardingStep === slides.length - 1
          ? "close"
          : 'next<span class="icon icon-arrow" aria-hidden="true"><img src="assets/arrow.svg" alt="" width="16" height="22" /></span>';
    }

    if (onboardingDotsEl) {
      onboardingDotsEl.innerHTML = slides
        .map(function (_, index) {
          const active = index === onboardingStep;
          return (
            '<button type="button" class="onboarding-dot' +
            (active ? " is-active" : "") +
            '" role="tab" aria-selected="' +
            active +
            '" aria-label="Step ' +
            (index + 1) +
            '" data-step="' +
            index +
            '"></button>'
          );
        })
        .join("");
    }

    if (onboardingEl && !onboardingEl.hidden) {
      announce("Guide step " + (onboardingStep + 1) + " of " + slides.length + ": " + slide.title);
    }
  }

  function completeOnboarding() {
    closeOverlay(onboardingEl);
  }

  function openOnboarding(trigger) {
    onboardingStep = 0;
    paintOnboardingSlide();
    openOverlay(onboardingEl, trigger);
  }

  function goToOnboardingStep(step) {
    const slides = getOnboardingSlides();
    onboardingStep = Math.max(0, Math.min(step, slides.length - 1));
    paintOnboardingSlide();
    if (onboardingNextBtn) onboardingNextBtn.focus();
  }

  function nextOnboardingStep() {
    const slides = getOnboardingSlides();
    if (onboardingStep >= slides.length - 1) {
      completeOnboarding();
      return;
    }
    goToOnboardingStep(onboardingStep + 1);
  }

  function isDesktop() {
    return desktopMq.matches;
  }

  function paintDeviceCopy() {
    const desktop = isDesktop();
    document.body.classList.toggle("is-desktop", desktop);
    const rulesPass = document.getElementById("rules-pass");
    if (rulesPass) {
      rulesPass.textContent = desktop
        ? "When it’s your turn, tap Ready to start the timer."
        : "Pass the device. The next player taps Ready when they have the phone.";
    }
  }

  function dispatch(action) {
    const prev = state;
    state = WW.reduce(state, action);
    if (prev.phase === "handoff" && state.phase !== "handoff") {
      shopOpen = false;
    }
    if (prev.phase !== "handoff" && state.phase === "handoff") {
      shopOpen = false;
    }
    if (
      action.type === "TICK" &&
      prev.phase === "playing" &&
      state.phase === "playing"
    ) {
      paintTimer();
      return;
    }
    render();
    if (state.phase === "revealing" && prev.phase !== "revealing") {
      startScoreReveal();
    }
    if (state.phase === "spinning" && prev.phase !== "spinning") {
      startSpin();
    }
  }

  function reducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function announce(message) {
    if (!srAnnouncer || !message) return;
    window.clearTimeout(announceTimer);
    srAnnouncer.textContent = "";
    announceTimer = window.setTimeout(function () {
      srAnnouncer.textContent = message;
    }, 40);
  }

  function colorName(hex) {
    return COLOR_NAMES[String(hex || "").toLowerCase()] || "Custom";
  }

  function overlayOpen() {
    return (
      !shopEl.hidden ||
      !rulesEl.hidden ||
      !restartEl.hidden ||
      (onboardingEl && !onboardingEl.hidden)
    );
  }

  function getOpenDialogPanel() {
    if (!shopEl.hidden) return shopEl.querySelector('[role="dialog"]');
    if (!onboardingEl.hidden) return onboardingEl.querySelector('[role="dialog"]');
    if (!rulesEl.hidden) return rulesEl.querySelector('[role="dialog"]');
    if (!restartEl.hidden) return restartEl.querySelector('[role="dialog"]');
    return null;
  }

  function isFocusable(el) {
    if (!el || el.disabled) return false;
    if (el.hidden || el.closest("[hidden]")) return false;
    if (el.getAttribute("aria-hidden") === "true") return false;
    const tab = el.getAttribute("tabindex");
    if (tab === "-1") return false;
    return el.offsetWidth > 0 || el.offsetHeight > 0 || el.getClientRects().length > 0;
  }

  function getFocusable(container) {
    if (!container) return [];
    return Array.from(
      container.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    ).filter(isFocusable);
  }

  function syncBackgroundInert() {
    if (!appEl) return;
    const open = overlayOpen();
    appEl.inert = open;
    if (open) appEl.setAttribute("aria-hidden", "true");
    else appEl.removeAttribute("aria-hidden");
  }

  function pauseTimerForOverlay() {
    if (state.phase === "playing" && state.turnEndsAt != null) {
      dispatch({ type: "PAUSE_TIMER", nowMs: Date.now() });
    }
  }

  function resumeTimerForOverlay() {
    if (state.phase === "playing" && state.turnEndsAt == null && !overlayOpen()) {
      dispatch({ type: "RESUME_TIMER", nowMs: Date.now() });
    }
  }

  function openOverlay(overlay, trigger) {
    dialogTrigger = trigger || document.activeElement;
    overlay.hidden = false;
    pauseTimerForOverlay();
    syncBackgroundInert();
    const panel = overlay.querySelector('[role="dialog"]');
    const focusables = getFocusable(panel);
    window.setTimeout(function () {
      if (focusables[0]) focusables[0].focus();
      else if (panel) {
        panel.setAttribute("tabindex", "-1");
        panel.focus();
      }
    }, 0);
  }

  function closeOverlay(overlay) {
    overlay.hidden = true;
    if (overlay === shopEl) shopOpen = false;
    syncBackgroundInert();
    resumeTimerForOverlay();
    const trigger = dialogTrigger;
    dialogTrigger = null;
    if (trigger && typeof trigger.focus === "function") trigger.focus();
  }

  function updateRestartButton() {
    if (!restartBtn) return;
    const idle = state.phase === "setup";
    restartBtn.disabled = idle;
    restartBtn.setAttribute("aria-disabled", idle ? "true" : "false");
  }

  function closeEffectTips() {
    document.querySelectorAll(".effect-name.is-open").forEach(function (btn) {
      btn.classList.remove("is-open");
      btn.setAttribute("aria-expanded", "false");
    });
  }

  function onEffectListClick(event) {
    const btn = event.target.closest(".effect-name");
    if (!btn) return;
    const open = !btn.classList.contains("is-open");
    closeEffectTips();
    btn.classList.toggle("is-open", open);
    btn.setAttribute("aria-expanded", open ? "true" : "false");
  }

  function startReveal() {
    window.clearTimeout(revealTimer);
    revealTimer = window.setTimeout(
      function () {
        dispatch({ type: "REVEAL_DONE" });
      },
      reducedMotion() ? 180 : 700
    );
  }

  function clearScoreReveal() {
    window.clearTimeout(scoreRevealTimer);
    scoreRevealTimer = 0;
    boardEl.classList.remove("is-scoring");
  }

  function showFinalPoints(points) {
    flashEl.removeAttribute("aria-hidden");
    flashEl.textContent = "+" + points + " pts";
    flashEl.classList.remove("is-tally", "is-multiply", "is-bump");
    void flashEl.offsetWidth;
    flashEl.classList.add("is-good");
    announce("+" + points + " points");
    startReveal();
  }

  function bumpFlash() {
    flashEl.classList.remove("is-bump");
    void flashEl.offsetWidth;
    flashEl.classList.add("is-bump");
  }

  function startScoreReveal() {
    clearScoreReveal();
    const result = state.lastSubmitResult;
    if (!result || result.timedOut || !result.word) {
      startReveal();
      return;
    }

    const tiles = result.tiles || wordTiles(result.word);
    const letterValues = tiles.map(function (letter) {
      return WW.letterValue(letter);
    });
    const wordValue = WW.wordValue(result.word);
    const finalPoints = result.points;
    const stepDelays = [240, 210, 190, 170, 150];

    boardEl.classList.add("is-scoring");
    flashEl.textContent = "";
    flashEl.className = "flash";
    flashEl.setAttribute("aria-hidden", "true");

    const pointEls = boardEl.querySelectorAll(".tile-points");
    if (!pointEls.length) {
      showFinalPoints(finalPoints);
      return;
    }

    if (reducedMotion()) {
      pointEls.forEach(function (el, index) {
        el.textContent = "+" + letterValues[index];
        el.classList.add("is-visible");
      });
      showFinalPoints(finalPoints);
      return;
    }

    let running = 0;
    let step = 0;

    function revealLetterScore() {
      if (state.phase !== "revealing") return;
      if (step >= letterValues.length) {
        scoreRevealTimer = window.setTimeout(function () {
          if (state.phase !== "revealing") return;
          if (wordValue > 0 && finalPoints !== wordValue) {
            const scale = finalPoints / wordValue;
            const scaleLabel =
              scale >= 0.995 ? "" : " × " + trimTimeScale(scale);
            flashEl.textContent = String(wordValue) + scaleLabel;
            flashEl.classList.remove("is-bump");
            flashEl.classList.add("is-tally", "is-multiply");
            scoreRevealTimer = window.setTimeout(function () {
              if (state.phase !== "revealing") return;
              showFinalPoints(finalPoints);
            }, 520);
            return;
          }
          showFinalPoints(finalPoints);
        }, 220);
        return;
      }

      const el = pointEls[step];
      const value = letterValues[step];
      const tileEl = el.closest(".tile-stack");
      const letterTile = tileEl ? tileEl.querySelector(".tile") : null;

      el.textContent = "+" + value;
      el.classList.add("is-visible");
      if (value >= 8) el.classList.add("is-hot");
      if (letterTile) {
        letterTile.classList.remove("is-score-pop");
        void letterTile.offsetWidth;
        letterTile.classList.add("is-score-pop");
      }

      running += value;
      flashEl.textContent = "= " + running;
      flashEl.classList.add("is-tally");
      bumpFlash();
      step += 1;
      scoreRevealTimer = window.setTimeout(
        revealLetterScore,
        stepDelays[step - 1] || 150
      );
    }

    revealLetterScore();
  }

  function trimTimeScale(scale) {
    const rounded = Math.round(scale * 100) / 100;
    return String(rounded).replace(/\.?0+$/, "");
  }

  function wordTiles(word) {
    return String(word || "")
      .toUpperCase()
      .split("")
      .slice(0, WW.WORD_LENGTH);
  }

  function frozenIndices() {
    const indices = {};
    (state.frozenSlots || []).forEach(function (slot) {
      indices[slot.index] = true;
    });
    return indices;
  }

  function lastVisibleTypedIndex(draft) {
    if (state.reverseType) {
      for (let i = 0; i < draft.length; i += 1) {
        if (frozenIndices()[i]) continue;
        if (draft[i]) return i;
      }
    } else {
      for (let i = draft.length - 1; i >= 0; i -= 1) {
        if (frozenIndices()[i]) continue;
        if (draft[i]) return i;
      }
    }
    return -1;
  }

  function boardGlyph(letter, index, draft) {
    if (!letter) return "";
    if (!state.tunnelVision || state.phase !== "playing") return letter;
    const lastIndex = lastVisibleTypedIndex(draft);
    if (index === lastIndex) return letter;
    return "*";
  }

  function startSpin() {
    window.clearTimeout(spinTimer);
    const frozen = frozenIndices();
    const slots = state.frozenSlots || [];
    const target =
      slots.length > 0 ? slots[slots.length - 1].index : 0;
    const tiles = boardEl.querySelectorAll(".tile");
    if (!tiles.length) {
      dispatch({ type: "SPIN_DONE", nowMs: Date.now() });
      return;
    }

    if (reducedMotion()) {
      tiles.forEach(function (tile, index) {
        if (frozen[index]) {
          tile.classList.add("is-locked", "is-frozen");
        } else {
          tile.classList.add("is-vanishing");
        }
      });
      boardEl.classList.add("is-revealing");
      spinTimer = window.setTimeout(function () {
        dispatch({ type: "SPIN_DONE", nowMs: Date.now() });
      }, 220);
      return;
    }

    const sequence = [];
    let cycles = 2;
    for (let c = 0; c < cycles; c += 1) {
      for (let i = 0; i < 5; i += 1) sequence.push(i);
    }
    for (let i = 0; i <= target; i += 1) sequence.push(i);

    let step = 0;
    function scanStep() {
      if (state.phase !== "spinning") return;
      tiles.forEach(function (tile) {
        tile.classList.remove("is-scanning");
      });
      const index = sequence[step];
      if (tiles[index]) tiles[index].classList.add("is-scanning");
      step += 1;
      if (step >= sequence.length) {
        tiles.forEach(function (tile, tileIndex) {
          tile.classList.remove("is-scanning");
          if (frozen[tileIndex]) {
            tile.classList.add("is-locked", "is-frozen");
          } else {
            tile.classList.add("is-vanishing");
          }
        });
        boardEl.classList.add("is-revealing");
        spinTimer = window.setTimeout(function () {
          dispatch({ type: "SPIN_DONE", nowMs: Date.now() });
        }, 700);
        return;
      }
      const progress = step / sequence.length;
      const delay = 55 + progress * progress * 240;
      spinTimer = window.setTimeout(scanStep, delay);
    }

    boardEl.classList.add("is-spinning");
    scanStep();
  }

  function showScreen(name) {
    Object.keys(screens).forEach(function (key) {
      const active = key === name;
      screens[key].classList.toggle("is-active", active);
      screens[key].hidden = !active;
    });
  }

  function playerTag(playerId) {
    const index = state.players.findIndex(function (player) {
      return player.id === playerId;
    });
    return index >= 0 ? "p" + (index + 1) : "p?";
  }

  function visibleEffects() {
    const player = WW.currentPlayer(state);
    if (!player) return [];
    if (state.phase === "handoff") {
      return (player.pendingEffects || []).concat([]);
    }
    return (state.activeEffects || []).concat(player.pendingEffects || []);
  }

  function playerById(playerId) {
    return (
      state.players.find(function (player) {
        return player.id === playerId;
      }) || null
    );
  }

  function sabotageName(type, effect) {
    if (type === "mystery_resolved") return "Mystery";
    if (type === "mystery_nothing") return "Nothing Happened";
    if (type === "mystery_bankrupt_buyer") return "Bankrupt";
    if (type === "mystery_swap_all") return "Score Shuffle";
    if (type === "mystery_jackpot") return "Jackpot";
    if (type === "mystery_refund") return "Refund";
    if (type === "mystery_gift") return "Lucky Bonus";
    if (type === "mystery_time") return "Extra Time";
    if (type === "obsession" && effect && effect.letter) {
      return "Obsession (" + effect.letter + ")";
    }
    const item = WW.getShopItem(type === "immunity" ? "not_today" : type);
    if (item) return item.name;
    return WW.effectLabel(type, effect);
  }

  function sabotageDescription(type, effect) {
    if (type === "mystery_resolved") {
      return "A mystery prank is coming — it will be revealed when your rival's turn begins.";
    }
    if (WW.mysteryOutcomeDescription && WW.mysteryOutcomeDescription(type)) {
      const mysteryDesc = WW.mysteryOutcomeDescription(type);
      if (mysteryDesc) return mysteryDesc;
    }
    if (type === "mystery_gift") {
      return "This rival gained bonus points from the mystery roll.";
    }
    if (type === "mystery_time") {
      return "Mystery adds 5 seconds to this turn.";
    }
    if (type === "obsession" && effect && effect.letter) {
      return "Must include the letter " + effect.letter + ".";
    }
    const item = WW.getShopItem(type === "immunity" ? "not_today" : type);
    return item ? item.description : "";
  }

  function paintEffects(wrapEl, listEl) {
    const effects = visibleEffects();
    if (!effects.length) {
      wrapEl.hidden = true;
      listEl.innerHTML = "";
      return;
    }
    wrapEl.hidden = false;
    listEl.innerHTML = effects
      .map(function (effect, index) {
        const saboteur = playerById(effect.fromPlayerId);
        const saboteurIndex = state.players.findIndex(function (player) {
          return player.id === effect.fromPlayerId;
        });
        const color =
          (saboteur && saboteur.color) ||
          PLAYER_COLORS[saboteurIndex] ||
          PLAYER_COLORS[0];
        const initials = saboteur
          ? playerInitials(saboteur.name)
          : playerTag(effect.fromPlayerId).toUpperCase();
        const tipId = wrapEl.id + "-tip-" + index;
        const description = sabotageDescription(effect.type, effect);
        return (
          '<div class="effect-chip" role="listitem">' +
          '<div class="effect-icon" aria-hidden="true">' +
          '<span class="effect-avatar" style="background:' +
          escapeHtml(color) +
          ";color:" +
          avatarInk(color) +
          '">' +
          escapeHtml(initials) +
          "</span></div>" +
          '<button type="button" class="effect-name" aria-expanded="false" aria-describedby="' +
          tipId +
          '">' +
          escapeHtml(sabotageName(effect.type, effect)) +
          '<span class="effect-tip" id="' +
          tipId +
          '" role="tooltip">' +
          escapeHtml(description) +
          "</span></button></div>"
        );
      })
      .join("");
  }

  function paintTimer() {
    const limit = state.turnDurationMs || WW.TURN_MS;
    const secs = Math.ceil(state.timeRemainingMs / 1000);
    timerSecsEl.textContent = String(secs);
    const ratio = Math.max(0, Math.min(1, state.timeRemainingMs / limit));
    timerFillEl.style.width = ratio * 100 + "%";
    const urgent = state.phase === "playing" && secs <= 5;
    timerEl.classList.toggle("is-urgent", urgent);
    timerEl.classList.toggle("is-idle", state.phase !== "playing" && state.phase !== "revealing" && state.phase !== "spinning");
    timerEl.classList.toggle("is-hidden", Boolean(state.hideTimer));
    timerEl.setAttribute("aria-hidden", state.hideTimer ? "true" : "false");
    if (timerLabelEl) timerLabelEl.textContent = urgent ? "Hurry" : "Timer";
    if (timerBarEl) {
      const max = Math.max(1, Math.round(limit / 1000));
      timerBarEl.setAttribute("aria-valuemin", "0");
      timerBarEl.setAttribute("aria-valuemax", String(max));
      timerBarEl.setAttribute("aria-valuenow", String(Math.max(0, secs)));
      timerBarEl.setAttribute("aria-valuetext", secs + " seconds remaining");
    }
    if (state.phase === "playing" && !state.hideTimer) {
      if (secs <= 5 && lastTimerCue !== 5) {
        lastTimerCue = 5;
        announce("5 seconds remaining");
      } else if (secs <= 10 && secs > 5 && lastTimerCue !== 10) {
        lastTimerCue = 10;
        announce("10 seconds remaining");
      } else if (secs > 10) {
        lastTimerCue = 0;
      }
    }
  }

  function paintScoreboard() {
    if (!state.players.length || state.phase === "setup") {
      scoreboardEl.classList.remove("is-on");
      scoreboardEl.innerHTML = "";
      return;
    }
    scoreboardEl.classList.add("is-on");
    scoreboardEl.innerHTML = state.players
      .map(function (player, index) {
        const current = index === state.currentPlayerIndex ? " is-current" : "";
        const color = player.color || PLAYER_COLORS[index] || "#fbab20";
        return (
          '<div class="score-chip' +
          current +
          '" role="listitem"' +
          (index === state.currentPlayerIndex ? ' aria-current="true"' : "") +
          '><span class="score-avatar" aria-hidden="true" style="background:' +
          escapeHtml(color) +
          ";color:" +
          avatarInk(color) +
          '">' +
          escapeHtml(playerInitials(player.name)) +
          '</span><span class="name">' +
          escapeHtml(player.name) +
          '</span><span class="pts">' +
          player.score +
          "</span></div>"
        );
      })
      .join("");
  }

  function paintBoard() {
    const letters =
      state.phase === "revealing" &&
      state.lastSubmitResult &&
      state.lastSubmitResult.tiles
        ? state.lastSubmitResult.tiles
        : state.draft;
    const frozen = frozenIndices();
    const showFrozen = state.phase === "playing" && state.frozenSlots && state.frozenSlots.length;
    const showLetterScores =
      state.phase === "revealing" &&
      state.lastSubmitResult &&
      !state.lastSubmitResult.timedOut &&
      state.lastSubmitResult.word;

    boardEl.classList.remove("is-revealing", "is-spinning", "is-scoring");
    const boardWrap = boardEl.parentElement;
    if (boardWrap) {
      boardWrap.classList.toggle(
        "is-tunnel",
        Boolean(state.tunnelVision && state.phase === "playing")
      );
      boardWrap.classList.toggle(
        "is-reverse",
        Boolean(state.reverseType && state.phase === "playing")
      );
    }
    boardEl.innerHTML = letters
      .map(function (letter, index) {
        const isFrozenTile = showFrozen && frozen[index];
        const tileClass = "tile" + (isFrozenTile ? " is-frozen" : "");
        const glyph =
          '<span class="tile-letter">' +
          escapeHtml(boardGlyph(letter, index, letters)) +
          "</span>";
        if (showLetterScores) {
          return (
            '<div class="tile-stack" data-index="' +
            index +
            '"><div class="' +
            tileClass +
            '">' +
            glyph +
            '</div><span class="tile-points" aria-hidden="true"></span></div>'
          );
        }
        return (
          '<div class="' +
          tileClass +
          '" data-index="' +
          index +
          '">' +
          glyph +
          "</div>"
        );
      })
      .join("");

    if (state.shakeNonce !== lastShake && state.invalidReason) {
      lastShake = state.shakeNonce;
      boardEl.classList.add("is-shaking");
      window.setTimeout(function () {
        boardEl.classList.remove("is-shaking");
      }, 400);
    }
  }

  function flashCopy() {
    const reason = state.invalidReason;
    if (reason === "incomplete") return "Need five letters";
    if (reason === "not_a_word") return "Not in the dictionary";
    if (reason === "reused") return "Already played";
    if (reason === "wrong_letter") return "Keep the frozen letters";
    if (reason === "missing_letter") {
      return "Must include " + (state.requiredLetter || "that letter");
    }
    if (state.phase === "revealing" && state.lastSubmitResult) {
      if (state.lastSubmitResult.timedOut) return "Time — 0 pts";
      return "+" + state.lastSubmitResult.points + " pts";
    }
    if (state.phase === "spinning") {
      const count = state.freezeCount || 1;
      return count > 1
        ? "Picking " + count + " letters…"
        : "Picking a letter…";
    }
    if (state.frozenSlots && state.frozenSlots.length) {
      if (state.frozenSlots.length === 1) {
        const slot = state.frozenSlots[0];
        return (
          "Keep " + slot.letter + " in slot " + (slot.index + 1)
        );
      }
      return "Keep " + state.frozenSlots.length + " frozen letters";
    }
    if (state.requiredLetter) {
      return "Must include " + state.requiredLetter;
    }
    if (state.reverseType) {
      return "Type backwards — right to left";
    }
    return "Any five-letter word";
  }

  function paintPlayChrome() {
    const player = WW.currentPlayer(state);
    if (!player) return;
    turnWhoEl.textContent = player.name;
    if (state.isSuddenDeath) {
      turnKickerEl.textContent = "Sudden death";
    } else {
      turnKickerEl.textContent = "Turn " + (player.turnsTaken + 1);
    }
    paintTimer();
    paintEffects(playEffectsEl, playEffectListEl);
    const scoringReveal =
      state.phase === "revealing" &&
      state.lastSubmitResult &&
      !state.lastSubmitResult.timedOut &&
      state.lastSubmitResult.word;
    if (!scoringReveal) {
      flashEl.removeAttribute("aria-hidden");
      const copy = flashCopy();
      flashEl.textContent = copy;
      flashEl.className = "flash";
      if (state.invalidReason) flashEl.classList.add("is-bad");
      if (state.phase === "revealing" && state.lastSubmitResult) {
        flashEl.classList.add(
          state.lastSubmitResult.timedOut ? "is-timeout" : "is-good"
        );
      }
    }
    keyboardEl.hidden = state.phase !== "playing";
    keyboardEl.classList.toggle("is-reverse", Boolean(state.reverseType));
    keyboardEl.querySelectorAll(".key[data-key]").forEach(function (key) {
      const letter = key.dataset.key;
      const required =
        state.requiredLetter &&
        letter === state.requiredLetter.toUpperCase();
      key.classList.toggle("is-required", Boolean(required));
    });
    if (letterInput) {
      const word = (state.draft || []).join("");
      if (letterInput.value !== word) letterInput.value = word;
      letterInput.setAttribute(
        "aria-invalid",
        state.invalidReason ? "true" : "false"
      );
    }
  }

  function paintHandoff() {
    const player = WW.currentPlayer(state);
    if (!player) return;
    handoffNameEl.textContent = player.name + "’s turn";
    suddenBannerEl.hidden = !state.isSuddenDeath;
    handoffKickerEl.textContent = state.isSuddenDeath
      ? "Sudden death"
      : "Next up";
    if (!state.lastWord) {
      handoffWordEl.hidden = true;
      handoffBoardEl.innerHTML = "";
      handoffBoardEl.removeAttribute("aria-label");
    } else {
      handoffWordEl.hidden = false;
      handoffBoardEl.setAttribute(
        "aria-label",
        "Last word " + state.lastWord.toUpperCase().split("").join(" ")
      );
      handoffBoardEl.innerHTML = state.lastWord
        .toUpperCase()
        .split("")
        .map(function (letter) {
          return '<div class="tile" aria-hidden="true">' + escapeHtml(letter) + "</div>";
        })
        .join("");
    }
    paintEffects(handoffEffectsEl, handoffEffectListEl);
    paintShop();
  }

  function setShopOpen(open) {
    const wasOpen = shopOpen;
    shopOpen = open;
    if (open && !wasOpen) {
      dialogTrigger = shopToggleBtn;
      pauseTimerForOverlay();
    }
    paintShop();
    syncBackgroundInert();
    if (!open && wasOpen) {
      resumeTimerForOverlay();
      const trigger = dialogTrigger || shopToggleBtn;
      dialogTrigger = null;
      if (trigger && typeof trigger.focus === "function") trigger.focus();
    }
  }

  function paintShop() {
    const player = WW.currentPlayer(state);
    const onHandoff = state.phase === "handoff" && player;
    shopToggleBtn.hidden = !onHandoff;
    shopToggleBtn.setAttribute("aria-expanded", shopOpen && onHandoff ? "true" : "false");
    const showShop = Boolean(onHandoff && shopOpen);
    const opening = showShop && !shopWasOpen;
    const activeItem = document.activeElement && document.activeElement.closest
      ? document.activeElement.closest(".shop-item")
      : null;
    const activeItemId = activeItem && activeItem.dataset.itemId;
    const restoreSelect =
      document.activeElement && document.activeElement.tagName === "SELECT";
    shopEl.hidden = !showShop;
    shopEl.setAttribute("aria-hidden", showShop ? "false" : "true");
    if (!showShop) {
      shopItemsEl.innerHTML = "";
      shopWasOpen = false;
      return;
    }

    shopBalanceEl.textContent = String(player.score);
    shopFlashEl.textContent = state.lastShopMessage || "";

    const opponents = state.players.filter(function (p) {
      return p.id !== player.id;
    });

    shopItemsEl.innerHTML = WW.SHOP_ITEMS.map(function (item) {
      const canAfford = player.score >= item.cost;
      const options = opponents
        .map(function (target) {
          return (
            '<option value="' +
            escapeHtml(target.id) +
            '">' +
            escapeHtml(target.name) +
            "</option>"
          );
        })
        .join("");
      let targetHtml = "";
      if (item.noTarget) {
        targetHtml =
          '<p class="shop-item-note">Takes from 1st place, shares with everyone.</p>';
      } else {
        targetHtml =
          '<div class="shop-item-target"><span id="target-label-' +
          escapeHtml(item.id) +
          '">target:</span>' +
          '<select aria-labelledby="target-label-' +
          escapeHtml(item.id) +
          '">' +
          options +
          "</select></div>";
      }
      let letterHtml = "";
      if (item.needsLetter) {
        const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
        letterHtml =
          '<div class="shop-item-letter"><span id="letter-label-' +
          escapeHtml(item.id) +
          '">letter:</span>' +
          '<select class="shop-letter" aria-labelledby="letter-label-' +
          escapeHtml(item.id) +
          '">' +
          letters
            .map(function (letter) {
              return (
                '<option value="' +
                letter +
                '"' +
                (letter === "E" ? " selected" : "") +
                ">" +
                letter +
                "</option>"
              );
            })
            .join("") +
          "</select></div>";
      }
      const buyLabel = canAfford
        ? ""
        : ' aria-label="Buy ' +
          escapeHtml(item.name) +
          " for " +
          item.cost +
          ' points, not enough points"';
      return (
        '<div class="shop-item" data-item-id="' +
        escapeHtml(item.id) +
        '">' +
        '<div class="shop-item-icon" aria-hidden="true">' +
        (item.icon
          ? '<img src="' +
            escapeHtml(item.icon) +
            '" alt="" width="48" height="48" />'
          : "") +
        "</div>" +
        '<div class="shop-item-copy">' +
        '<h3 class="shop-item-name">' +
        escapeHtml(item.name) +
        "</h3>" +
        '<p class="shop-item-desc">' +
        escapeHtml(item.description) +
        "</p>" +
        targetHtml +
        letterHtml +
        "</div>" +
        '<button type="button" class="btn btn-amber shop-buy"' +
        (canAfford ? "" : " disabled") +
        buyLabel +
        ">Buy for " +
        item.cost +
        " points</button></div>"
      );
    }).join("");

    if (opening && !params.get("demo")) {
      shopCloseBtn.focus();
    } else if (activeItemId) {
      const item = shopItemsEl.querySelector(
        '[data-item-id="' + activeItemId + '"]'
      );
      if (item) {
        const target = restoreSelect
          ? item.querySelector("select, .shop-letter")
          : item.querySelector(".shop-buy");
        if (target && !target.disabled) target.focus();
        else shopCloseBtn.focus();
      }
    }
    shopWasOpen = true;
  }

  function paintResults() {
    const ranked = state.players
      .map(function (player, index) {
        return { player: player, index: index };
      })
      .sort(function (a, b) {
        return b.player.score - a.player.score;
      });
    const winScore = ranked[0] ? ranked[0].player.score : 0;
    const winners = ranked.filter(function (row) {
      return row.player.score === winScore;
    });
    const uniqueWinner = winners.length === 1;
    resultsTitleEl.textContent = uniqueWinner
      ? winners[0].player.name + " wins"
      : "Draw";
    rankListEl.innerHTML = ranked
      .map(function (row, place) {
        const winner = uniqueWinner && row.player.score === winScore ? " is-winner" : "";
        return (
          '<li class="' +
          winner +
          '"><span class="place">' +
          (place + 1) +
          '</span><span class="who">' +
          escapeHtml(row.player.name) +
          '</span><span class="pts">' +
          row.player.score +
          "</span></li>"
        );
      })
      .join("");
  }

  function playerInitials(name, fallback) {
    const source = String(name || "").trim() || String(fallback || "").trim();
    const parts = source.split(/\s+/).filter(Boolean);
    if (!parts.length) return "?";
    return parts
      .map(function (part) {
        return part.charAt(0);
      })
      .join("")
      .toUpperCase()
      .slice(0, 3);
  }

  function hexLuminance(hex) {
    const raw = String(hex || "").replace("#", "");
    if (raw.length !== 6) return 0;
    const channel = function (start) {
      const value = parseInt(raw.slice(start, start + 2), 16) / 255;
      return value <= 0.03928
        ? value / 12.92
        : Math.pow((value + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4);
  }

  function avatarInk(hex) {
    return hexLuminance(hex) > 0.48 ? "#141414" : "#ffffff";
  }

  function paintRowAvatar(row) {
    const input = row.querySelector(".player-name-input");
    const avatar = row.querySelector(".player-avatar");
    if (!input || !avatar) return;
    const color = row.dataset.color || PLAYER_COLORS[0];
    avatar.textContent = playerInitials(input.value, input.placeholder);
    avatar.style.background = color;
    avatar.style.color = avatarInk(color);
  }

  function paintRowSwatches(row) {
    const color = (row.dataset.color || "").toLowerCase();
    row.querySelectorAll(".color-swatch[data-color]").forEach(function (swatch) {
      const selected =
        swatch.getAttribute("data-color").toLowerCase() === color;
      swatch.classList.toggle("is-selected", selected);
      swatch.setAttribute("aria-pressed", selected ? "true" : "false");
    });
    const custom = row.querySelector(".color-swatch-custom input");
    if (custom) custom.value = row.dataset.color || PLAYER_COLORS[0];
  }

  function colorSwatchesHtml(selected) {
    return (
      '<div class="player-colors" role="group" aria-label="Choose a color">' +
      PLAYER_COLORS.map(function (color) {
        const selectedClass =
          color.toLowerCase() === String(selected || "").toLowerCase()
            ? " is-selected"
            : "";
        return (
          '<button type="button" class="color-swatch' +
          selectedClass +
          '" data-color="' +
          color +
          '" style="background:' +
          color +
          '" aria-label="' +
          colorName(color) +
          '"' +
          (selectedClass ? ' aria-pressed="true"' : ' aria-pressed="false"') +
          "></button>"
        );
      }).join("") +
      '<label class="color-swatch-custom" title="Custom color">' +
      '<input type="color" value="' +
      escapeHtml(selected) +
      '" aria-label="Custom color" />' +
      "</label></div>"
    );
  }

  function collectSetupPlayers() {
    return Array.from(nameFieldsEl.querySelectorAll(".player-row")).map(
      function (row) {
        const input = row.querySelector(".player-name-input");
        return {
          name: input ? input.value : "",
          color: row.dataset.color || PLAYER_COLORS[0],
        };
      }
    );
  }

  function playerPlaceholder(index) {
    return (
      PLAYER_PLACEHOLDERS[index] ||
      PLAYER_PLACEHOLDERS[index % PLAYER_PLACEHOLDERS.length]
    );
  }

  function paintSetup(players) {
    const existing = players || collectSetupPlayers();
    nameFieldsEl.innerHTML = "";
    const canRemove = setupCount > WW.MIN_PLAYERS;
    for (let i = 0; i < setupCount; i += 1) {
      const wrap = document.createElement("div");
      wrap.className = "player-row";
      const id = "player-name-" + (i + 1);
      const placeholder = playerPlaceholder(i);
      const saved = existing[i] || {};
      const color = saved.color || PLAYER_COLORS[i] || PLAYER_COLORS[0];
      wrap.dataset.color = color;
      wrap.innerHTML =
        '<div class="player-avatar" aria-hidden="true"></div>' +
        '<div class="field">' +
        '<label for="' +
        id +
        '">PLAYER ' +
        (i + 1) +
        "</label>" +
        '<div class="player-name-wrap">' +
        '<input class="player-name-input" id="' +
        id +
        '" data-index="' +
        i +
        '" maxlength="16" autocomplete="off" placeholder="' +
        placeholder +
        '" />' +
        '<button type="button" class="player-name-edit" tabindex="-1" aria-label="Edit player ' +
        (i + 1) +
        ' name">' +
        '<span class="icon icon-pencil" aria-hidden="true">' +
        '<img src="assets/pencil.svg" alt="" width="14" height="14" />' +
        "</span></button></div>" +
        colorSwatchesHtml(color) +
        "</div>" +
        (canRemove
          ? '<button type="button" class="remove-player" data-index="' +
            i +
            '" aria-label="Remove player ' +
            (i + 1) +
            '">×</button>'
          : "");
      const input = wrap.querySelector(".player-name-input");
      if (saved.name) input.value = saved.name;
      nameFieldsEl.appendChild(wrap);
      paintRowAvatar(wrap);
    }
    const addBtn = document.getElementById("player-plus");
    if (addBtn) addBtn.hidden = setupCount >= WW.MAX_PLAYERS;
  }

  function render() {
    paintDeviceCopy();
    paintScoreboard();
    updateRestartButton();
    const phaseChanged = prevPhase !== state.phase;
    if (state.phase === "setup") {
      showScreen("setup");
      paintSetup();
      shopEl.hidden = true;
      shopWasOpen = false;
      syncBackgroundInert();
      prevPhase = state.phase;
      return;
    }
    if (state.phase === "handoff") {
      showScreen("handoff");
      paintHandoff();
      if (phaseChanged) {
        lastTimerCue = 0;
        announce(handoffNameEl.textContent);
        window.setTimeout(function () {
          if (state.phase === "handoff" && !shopOpen) handoffNameEl.focus();
        }, 0);
      }
      syncBackgroundInert();
      prevPhase = state.phase;
      return;
    }
    if (state.phase === "playing" || state.phase === "revealing" || state.phase === "spinning") {
      showScreen("play");
      shopOpen = false;
      shopEl.hidden = true;
      shopItemsEl.innerHTML = "";
      shopWasOpen = false;
      paintBoard();
      paintPlayChrome();
      if (state.phase === "playing") {
        focusLetterInput();
        if (phaseChanged) {
          lastTimerCue = 0;
          const player = WW.currentPlayer(state);
          if (player) announce(player.name + " is playing");
        }
      } else if (letterInput) {
        letterInput.blur();
      }
      syncBackgroundInert();
      prevPhase = state.phase;
      return;
    }
    if (state.phase === "game_over") {
      showScreen("results");
      shopEl.hidden = true;
      shopWasOpen = false;
      paintResults();
      if (phaseChanged) {
        announce(resultsTitleEl.textContent);
        window.setTimeout(function () {
          resultsTitleEl.focus();
        }, 0);
      }
    }
    syncBackgroundInert();
    prevPhase = state.phase;
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function readNames() {
    return Array.from(nameFieldsEl.querySelectorAll(".player-name-input")).map(
      function (input, index) {
        const typed = input.value.trim();
        if (typed) return typed;
        return input.placeholder || playerPlaceholder(index);
      }
    );
  }

  function readColors() {
    return Array.from(nameFieldsEl.querySelectorAll(".player-row")).map(
      function (row) {
        return row.dataset.color || PLAYER_COLORS[0];
      }
    );
  }

  function buildKeyboard() {
    keyboardEl.innerHTML = "";
    KEY_ROWS.forEach(function (row, rowIndex) {
      const rowEl = document.createElement("div");
      rowEl.className = "key-row";
      if (rowIndex === 2) {
        const enter = document.createElement("button");
        enter.type = "button";
        enter.className = "key key-wide";
        enter.dataset.key = "ENTER";
        enter.textContent = "enter";
        enter.setAttribute("aria-label", "Submit word");
        rowEl.appendChild(enter);
      }
      row.split("").forEach(function (letter) {
        const key = document.createElement("button");
        key.type = "button";
        key.className = "key";
        key.dataset.key = letter;
        key.textContent = letter;
        rowEl.appendChild(key);
      });
      if (rowIndex === 2) {
        const del = document.createElement("button");
        del.type = "button";
        del.className = "key key-wide";
        del.dataset.key = "BACKSPACE";
        del.textContent = "del";
        del.setAttribute("aria-label", "Delete last letter");
        rowEl.appendChild(del);
      }
      keyboardEl.appendChild(rowEl);
    });
  }

  function keyFromEvent(event) {
    if (event.key === "Backspace") return "BACKSPACE";
    if (event.key === "Enter") return "ENTER";
    if (event.key === "Escape") return "ESCAPE";
    if (event.key === " ") return " ";
    if (event.key === "ArrowRight") return "ARROW_RIGHT";
    if (event.key === "ArrowLeft") return "ARROW_LEFT";
    const letter = String(event.key || "").toUpperCase();
    return /^[A-Z]$/.test(letter) ? letter : "";
  }

  function isTypingTarget(el) {
    if (!el || el === letterInput) return false;
    const tag = el.tagName;
    return (
      tag === "INPUT" ||
      tag === "TEXTAREA" ||
      tag === "SELECT" ||
      el.isContentEditable
    );
  }

  function focusLetterInput() {
    if (!letterInput || state.phase !== "playing") return;
    if (document.activeElement !== letterInput) {
      letterInput.focus({ preventScroll: true });
    }
  }

  function handleKey(key) {
    if (shopOpen && key === "ESCAPE") {
      setShopOpen(false);
      return;
    }
    if (!rulesEl.hidden && key === "ESCAPE") {
      closeOverlay(rulesEl);
      return;
    }
    if (!restartEl.hidden && key === "ESCAPE") {
      closeOverlay(restartEl);
      return;
    }
    if (!onboardingEl.hidden && key === "ESCAPE") {
      completeOnboarding();
      return;
    }
    if (!onboardingEl.hidden && (key === "ENTER" || key === " " || key === "ARROW_RIGHT")) {
      nextOnboardingStep();
      return;
    }
    if (!onboardingEl.hidden && key === "ARROW_LEFT" && onboardingStep > 0) {
      goToOnboardingStep(onboardingStep - 1);
      return;
    }
    if (key === "ESCAPE") {
      closeEffectTips();
    }
    if (state.phase === "handoff" && (key === "ENTER" || key === " ") && !shopOpen) {
      dispatch({ type: "READY", nowMs: Date.now() });
      return;
    }
    if (state.phase === "game_over" && key === "ENTER") {
      setupCount = Math.max(state.players.length, 2);
      dispatch({ type: "RESET" });
      return;
    }
    if (state.phase === "spinning") return;
    if (state.phase !== "playing") return;
    if (key === "ENTER") {
      dispatch({ type: "SUBMIT" });
      return;
    }
    if (key === "BACKSPACE") {
      dispatch({ type: "BACKSPACE" });
      return;
    }
    if (/^[A-Z]$/.test(key)) {
      dispatch({ type: "TYPE", letter: key });
    }
  }

  function tick() {
    if (state.phase === "playing" && !overlayOpen()) {
      dispatch({ type: "TICK", nowMs: Date.now() });
    }
    rafId = window.requestAnimationFrame(tick);
  }

  document.getElementById("player-plus").addEventListener("click", function () {
    setupCount = Math.min(WW.MAX_PLAYERS, setupCount + 1);
    paintSetup();
  });

  document.getElementById("start-btn").addEventListener("click", function () {
    dispatch({
      type: "START",
      playerCount: setupCount,
      names: readNames(),
      colors: readColors(),
    });
  });

  nameFieldsEl.addEventListener("input", function (event) {
    const row = event.target.closest(".player-row");
    if (!row) return;
    if (event.target.classList.contains("player-name-input")) {
      paintRowAvatar(row);
      return;
    }
    if (event.target.type === "color") {
      row.dataset.color = event.target.value;
      paintRowAvatar(row);
      paintRowSwatches(row);
    }
  });

  nameFieldsEl.addEventListener("click", function (event) {
    const editBtn = event.target.closest(".player-name-edit");
    if (editBtn) {
      const row = editBtn.closest(".player-row");
      const input = row && row.querySelector(".player-name-input");
      if (input) input.focus();
      return;
    }
    const removeBtn = event.target.closest(".remove-player");
    if (removeBtn) {
      if (setupCount <= WW.MIN_PLAYERS) return;
      const index = Number(removeBtn.dataset.index);
      const remaining = collectSetupPlayers();
      remaining.splice(index, 1);
      setupCount = remaining.length;
      paintSetup(remaining);
      return;
    }
    const swatch = event.target.closest(".color-swatch[data-color]");
    if (!swatch) return;
    const row = swatch.closest(".player-row");
    if (!row) return;
    row.dataset.color = swatch.getAttribute("data-color");
    paintRowAvatar(row);
    paintRowSwatches(row);
  });

  readyBtn.addEventListener("click", function () {
    shopOpen = false;
    shopEl.hidden = true;
    readyBtn.blur();
    dispatch({ type: "READY", nowMs: Date.now() });
  });

  shopToggleBtn.addEventListener("click", function () {
    setShopOpen(!shopOpen);
  });

  shopCloseBtn.addEventListener("click", function () {
    setShopOpen(false);
  });

  shopItemsEl.addEventListener("click", function (event) {
    const buyBtn = event.target.closest(".shop-buy");
    if (!buyBtn || buyBtn.disabled) return;
    const itemEl = buyBtn.closest(".shop-item");
    if (!itemEl) return;
    const item = WW.getShopItem(itemEl.dataset.itemId);
    const select = itemEl.querySelector(".shop-item-target select");
    const letterSelect = itemEl.querySelector(".shop-letter");
    const action = {
      type: "BUY_SABOTAGE",
      itemId: itemEl.dataset.itemId,
    };
    if (select) action.targetId = select.value;
    if (letterSelect) action.letter = letterSelect.value;
    if (item && item.noTarget && state.players.length) {
      action.targetId = state.players[0].id;
    }
    dispatch(action);
  });

  shopEl.addEventListener("click", function (event) {
    if (event.target === shopEl) setShopOpen(false);
  });

  rulesEl.addEventListener("click", function (event) {
    if (event.target === rulesEl || event.target.classList.contains("rules-wrapper")) {
      closeOverlay(rulesEl);
    }
  });

  restartEl.addEventListener("click", function (event) {
    if (event.target === restartEl) closeOverlay(restartEl);
  });

  onboardingEl.addEventListener("click", function (event) {
    if (event.target === onboardingEl) completeOnboarding();
  });

  onboardingSkipBtn.addEventListener("click", completeOnboarding);
  onboardingNextBtn.addEventListener("click", nextOnboardingStep);

  onboardingDotsEl.addEventListener("click", function (event) {
    const dot = event.target.closest("[data-step]");
    if (!dot) return;
    goToOnboardingStep(Number(dot.dataset.step));
  });

  document.getElementById("again-btn").addEventListener("click", function () {
    setupCount = Math.max(state.players.length, 2);
    dispatch({ type: "RESET" });
  });

  document.getElementById("rules-btn").addEventListener("click", function () {
    openOnboarding(rulesBtn);
  });

  document.getElementById("rules-close-btn").addEventListener("click", function () {
    closeOverlay(rulesEl);
    const pointsPopup = document.getElementById("rules-pointsperletter-popup");
    if (pointsPopup) pointsPopup.hidden = true;
  });

  document
    .getElementById("rules-view-pointsperletter-btn")
    .addEventListener("click", function () {
      const pointsPopup = document.getElementById("rules-pointsperletter-popup");
      if (!pointsPopup) return;
      pointsPopup.hidden = false;
      const viewBtn = document.getElementById("rules-view-pointsperletter-btn");
      if (viewBtn) viewBtn.setAttribute("aria-expanded", "true");
    });


  document.getElementById("restart-btn").addEventListener("click", function () {
    if (state.phase === "setup") return;
    openOverlay(restartEl, restartBtn);
  });

  document.getElementById("restart-cancel-btn").addEventListener("click", function () {
    closeOverlay(restartEl);
  });

  document.getElementById("restart-confirm-btn").addEventListener("click", function () {
    closeOverlay(restartEl);
    setupCount = Math.max(state.players.length, 2);
    dispatch({ type: "RESET" });
  });

  document.getElementById("share-btn").addEventListener("click", function () {
    const payload = {
      title: "wordsus",
      text: isDesktop()
        ? "Same-screen five-letter word war."
        : "Pass-and-play five-letter word war.",
      url: window.location.href,
    };
    const done = function (copied) {
      const label = document.getElementById("share-label");
      label.textContent = copied ? "copied" : "shared";
      window.clearTimeout(shareFlash);
      shareFlash = window.setTimeout(function () {
        label.textContent = "share";
      }, 1400);
    };
    if (navigator.share) {
      navigator.share(payload).then(function () {
        done(false);
      }).catch(function () {});
      return;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(payload.url).then(function () {
        done(true);
      });
    }
  });

  keyboardEl.addEventListener("pointerdown", function (event) {
    const key = event.target.closest("[data-key]");
    if (!key) return;
    event.preventDefault();
    handleKey(key.dataset.key);
    focusLetterInput();
  });

  if (letterInput) {
    letterInput.addEventListener("input", function () {
      const typed = String(letterInput.value || "")
        .toUpperCase()
        .replace(/[^A-Z]/g, "");
      const current = (state.draft || []).join("");
      if (typed === current) return;
      if (typed.length > current.length) {
        for (let i = current.length; i < typed.length; i += 1) {
          handleKey(typed.charAt(i));
        }
      } else {
        let steps = current.length - typed.length;
        while (steps > 0) {
          handleKey("BACKSPACE");
          steps -= 1;
        }
      }
    });
  }

  window.addEventListener(
    "keydown",
    function (event) {
      if (event.key === "Tab" && overlayOpen()) {
        const panel = getOpenDialogPanel();
        const nodes = getFocusable(panel);
        if (nodes.length) {
          const first = nodes[0];
          const last = nodes[nodes.length - 1];
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
            return;
          }
          if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
            return;
          }
        }
      }

      const key = keyFromEvent(event);
      if (!key) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      if (state.phase === "playing" && (key === "BACKSPACE" || key === "ENTER" || /^[A-Z]$/.test(key))) {
        event.preventDefault();
        handleKey(key);
        return;
      }

      if (key === "ESCAPE") {
        handleKey("ESCAPE");
        return;
      }

      if (isTypingTarget(event.target)) return;

      if (
        event.target &&
        event.target.tagName === "BUTTON" &&
        !(event.target.closest && event.target.closest("#keyboard")) &&
        (key === "ENTER" || key === " ")
      ) {
        return;
      }

      if (key === "BACKSPACE" || key === "ENTER" || key === " " || /^[A-Z]$/.test(key)) {
        event.preventDefault();
        handleKey(key);
      }
    },
    true
  );

  desktopMq.addEventListener("change", function () {
    render();
    if (!onboardingEl.hidden) paintOnboardingSlide();
  });

  if (!WW.WORD_SET || !WW.WORD_SET.size) {
    WW.setDictionary(WW.WORDS || []);
  }

  const demoKey = params.get("demo");
  handoffEffectListEl.addEventListener("click", onEffectListClick);
  playEffectListEl.addEventListener("click", onEffectListClick);

  if (demoKey && WW.getDemoState) {
    const demoState = WW.getDemoState(demoKey);
    if (demoState) {
      state = demoState;
      if (demoKey === "setup") {
        setupCount = 4;
      }
      if (demoKey === "handoff-shop") {
        shopOpen = true;
      }
      if (demoKey === "rules" || demoKey === "onboarding") {
        onboardingEl.hidden = false;
        paintOnboardingSlide();
      }
      if (demoKey === "restart") {
        document.getElementById("restart").hidden = false;
      }
    }
  }

  buildKeyboard();
  render();
  syncBackgroundInert();

  if (demoKey && state.phase === "spinning") {
    window.requestAnimationFrame(function () {
      startSpin();
    });
  }

  if (!demoKey) {
    tick();
  }
})();
