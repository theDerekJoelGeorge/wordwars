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
  const PLAYER_PLACEHOLDERS = WW.PLAYER_PLACEHOLDERS || [
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
    mode: document.getElementById("screen-mode"),
    online: document.getElementById("screen-online"),
    join: document.getElementById("screen-join"),
    kicked: document.getElementById("screen-kicked"),
    lobby: document.getElementById("screen-lobby"),
    wait: document.getElementById("screen-wait"),
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
  const resultsPlaysEl = document.getElementById("results-plays");
  const playListEl = document.getElementById("play-list");
  const readyBtn = document.getElementById("ready-btn");
  const shopToggleBtn = document.getElementById("shop-toggle-btn");
  const shopEl = document.getElementById("shop");
  const shopScoresEl = document.getElementById("shop-scores");
  const shopCloseBtn = document.getElementById("shop-close-btn");
  const shopItemsEl = document.getElementById("shop-items");
  const shopFlashEl = document.getElementById("shop-flash");
  const shopPointsValueEl = document.getElementById("shop-points-value");
  const shopPointsGainEl = document.getElementById("shop-points-gain");
  const handoffBoardEl = document.getElementById("handoff-board");
  const handoffWordEl = document.getElementById("handoff-word");
  const handoffEffectsEl = document.getElementById("handoff-effects");
  const handoffEffectListEl = document.getElementById("handoff-effect-list");
  const playEffectsEl = document.getElementById("play-effects");
  const playEffectListEl = document.getElementById("play-effect-list");
  const rulesEl = document.getElementById("rules");
  const pplEl = document.getElementById("ppl");
  const pplBtn = document.getElementById("ppl-btn");
  const pplCloseBtn = document.getElementById("ppl-close-btn");
  const pplBodyEl = document.getElementById("ppl-body");
  const restartEl = document.getElementById("restart");
  const aiEl = document.getElementById("ai");
  const onboardingEl = document.getElementById("onboarding");
  const onboardingPageEl = document.getElementById("onboarding-page");
  const onboardingVisualEl = document.getElementById("onboarding-visual");
  const onboardingTitleEl = document.getElementById("onboarding-title");
  const onboardingBodyEl = document.getElementById("onboarding-body");
  const onboardingDotsEl = document.getElementById("onboarding-dots");
  const onboardingSkipBtn = document.getElementById("onboarding-skip-btn");
  const onboardingBackBtn = document.getElementById("onboarding-back-btn");
  const onboardingNextBtn = document.getElementById("onboarding-next-btn");
  const rulesBtn = document.getElementById("rules-btn");
  const restartBtn = document.getElementById("restart-btn");
  const srAnnouncer = document.getElementById("sr-announcer");
  const timerBarEl = document.getElementById("timer-bar");
  const timerLabelEl = document.getElementById("timer-label");
  const landingEl = document.getElementById("landing");
  const landingTypewriterEl = document.getElementById("landing-typewriter");
  const landingReadyBtn = document.getElementById("landing-ready-btn");
  const landingRulesBtn = document.getElementById("landing-rules-btn");
  const landingShareBtn = document.getElementById("landing-share-btn");
  const appEl = document.getElementById("app");
  const siteCreditEl = document.getElementById("site-credit");

  let state = WW.createGame();
  let setupCount = 2;
  let setupRounds = WW.TURNS_PER_PLAYER;
  let revealTimer = 0;
  let revealGuardTimer = 0;
  let scoreRevealTimer = 0;
  let spinTimer = 0;
  let spinGuardTimer = 0;
  let announceTimer = 0;
  let lastShake = 0;
  let rafId = 0;
  let lastTickAt = 0;
  let shopOpen = false;
  let shareFlash = 0;
  let lobbyCopyFlash = 0;
  let dialogTrigger = null;
  let shopWasOpen = false;
  let prevPhase = "";
  let lastTimerCue = 0;
  let lastGainSignature = "";
  let onboardingStep = 0;
  let landingTypeTimer = 0;
  let onLanding = Boolean(landingEl && !landingEl.hidden);
  let aiTargetRow = null;
  let flow = "mode";
  let onlineView = null;
  let joinDraft = ["", "", "", "", ""];
  let joinShake = 0;
  const net = WW.createNet({
    onMessage: onNetMessage,
    onError: onNetError,
    onClose: onNetClose,
  });
  const AI_YEARS = {
    beginner: "2023",
    intermediate: "2025",
    hard: "2032",
  };
  const AI_NAMES = {
    beginner: "Will Smith",
    intermediate: "William Smith",
    hard: "Sir Williamson Smith",
  };

  function letterPointsMap() {
    if (typeof WW.getLetterPoints === "function") return WW.getLetterPoints(state);
    return WW.LETTER_POINTS || {};
  }

  function pplScoreLabel(score) {
    return score === 1 ? "1 point" : score + " points";
  }

  function makePplRow(score, letters) {
    const row = document.createElement("div");
    row.className = "ppl-row";
    row.setAttribute("role", "group");
    const labelText = pplScoreLabel(score);
    row.setAttribute("aria-label", labelText);
    const label = document.createElement("p");
    label.className = "ppl-label";
    label.textContent = labelText;
    const grid = document.createElement("div");
    grid.className = "ppl-grid";
    letters.forEach(function (letter) {
      const cell = document.createElement("div");
      cell.className = "ppl-cell";
      cell.textContent = letter;
      grid.appendChild(cell);
    });
    row.appendChild(label);
    row.appendChild(grid);
    return row;
  }

  function paintPplChart() {
    if (!pplBodyEl) return;
    pplBodyEl.innerHTML = "";
    const map = letterPointsMap();
    const byScore = {};
    Object.keys(map)
      .sort()
      .forEach(function (letter) {
        const score = map[letter];
        if (!byScore[score]) byScore[score] = [];
        byScore[score].push(letter);
      });
    const groups = Object.keys(byScore)
      .map(Number)
      .sort(function (a, b) {
        return a - b;
      })
      .map(function (score) {
        return { score: score, letters: byScore[score] };
      });
    if (!groups.length) return;

    pplBodyEl.appendChild(makePplRow(groups[0].score, groups[0].letters));

    let index = 1;
    while (index < groups.length) {
      const current = groups[index];
      const next = groups[index + 1];
      const canPair =
        next && current.letters.length + next.letters.length <= 7;
      if (canPair) {
        const band = document.createElement("div");
        band.className = "ppl-band";
        band.appendChild(makePplRow(current.score, current.letters));
        band.appendChild(makePplRow(next.score, next.letters));
        pplBodyEl.appendChild(band);
        index += 2;
      } else {
        pplBodyEl.appendChild(makePplRow(current.score, current.letters));
        index += 1;
      }
    }
  }

  function getOnboardingSlides() {
    return [
      {
        visual: "logo",
        title: "a guide to wordsus",
        bodyHtml:
          "<p>A game where letters and words become your accessories for a fun battle of wits.</p>" +
          "<p>Will you play it safe or add chaos to the mix ?</p>",
      },
      {
        visual: "tiles",
        tiles: ["W", "O", "R", "D", ""],
        title: "5 letter words",
        bodyHtml:
          "<p>You have 30 seconds to enter any valid 5 letter word. Each letter carries points and try to score as many points possible with your turn .</p>",
      },
      {
        visual: "tiles",
        tiles: ["T", "I", "R", "E", "D"],
        frozen: 2,
        title: "a twist ?",
        bodyHtml:
          "<p>a letter from the previous word gets frozen at random and you have to include that letter in the word you play.</p>",
      },
      {
        visual: "image",
        image: "assets/onboarding/ppl-chart.png",
        title: "another twist ?",
        bodyHtml:
          "<p>The point system changes every game making every replay unique. Make sure you check the <span class=\"onboarding-accent\">ppl (top right)</span> before you start :)</p>",
      },
      {
        visual: "shop",
        title: "add a touch of chaos",
        bodyHtml:
          "<p>Spend your points in the sabotage shop.</p>" +
          "<p>You could choose to play it safe but always remember -<span class=\"onboarding-accent\"> nice guys finish last</span></p>",
      },
      {
        visual: "tiles",
        tiles: ["L", "O", "S", "E", "R"],
        frozen: 4,
        title: "stop reading and play",
        bodyHtml:
          "<p>Will you be the one who emerges victorious amidst all the chaos or will you be the rage baiter in your lobby ?</p>",
      },
    ];
  }

  function onboardingVisualHtml(slide) {
    if (slide.visual === "logo") {
      return (
        '<div class="onboarding-logo" aria-hidden="true">' +
        '<span class="onboarding-logo-letter">w</span>' +
        '<span class="onboarding-logo-letter">o</span>' +
        '<span class="onboarding-logo-letter">r</span>' +
        '<span class="onboarding-logo-tile">' +
        '<span class="onboarding-logo-tile-letter">D</span>' +
        '<span class="onboarding-logo-tile-pts">10</span>' +
        "</span>" +
        '<span class="onboarding-logo-letter">s</span>' +
        '<span class="onboarding-logo-letter">u</span>' +
        '<span class="onboarding-logo-letter">s</span>' +
        "</div>"
      );
    }
    if (slide.visual === "tiles") {
      return (
        '<div class="onboarding-tiles" aria-hidden="true">' +
        (slide.tiles || [])
          .map(function (letter, index) {
            const frozen = slide.frozen === index ? " is-frozen" : "";
            return (
              '<span class="onboarding-tile' +
              frozen +
              '">' +
              escapeHtml(letter) +
              "</span>"
            );
          })
          .join("") +
        "</div>"
      );
    }
    if (slide.visual === "shop") {
      return (
        '<div class="onboarding-shop" aria-hidden="true">' +
        '<img src="assets/shop.svg" alt="" width="20" height="20" />' +
        "<span>SHOP</span>" +
        "</div>"
      );
    }
    if (slide.visual === "image" && slide.image) {
      return (
        '<img class="onboarding-visual-img" src="' +
        escapeHtml(slide.image) +
        '" alt="" width="131" height="139" decoding="async" />'
      );
    }
    return "";
  }

  function paintOnboardingSlide() {
    const slides = getOnboardingSlides();
    const slide = slides[onboardingStep];
    if (!slide) return;
    const isFirst = onboardingStep === 0;
    const isLast = onboardingStep === slides.length - 1;

    if (onboardingPageEl) {
      onboardingPageEl.textContent = onboardingStep + 1 + " of " + slides.length;
    }
    if (onboardingVisualEl) {
      onboardingVisualEl.className =
        "onboarding-visual" + (slide.visual ? " is-" + slide.visual : "");
      onboardingVisualEl.innerHTML = onboardingVisualHtml(slide);
    }
    if (onboardingTitleEl) onboardingTitleEl.textContent = slide.title;
    if (onboardingBodyEl) {
      onboardingBodyEl.innerHTML = slide.bodyHtml || "";
    }
    if (onboardingBackBtn) onboardingBackBtn.hidden = isFirst;
    if (onboardingNextBtn) {
      onboardingNextBtn.hidden = false;
      onboardingNextBtn.classList.toggle("is-play", isLast);
      const label = onboardingNextBtn.querySelector("span");
      if (label) label.textContent = isLast ? "play" : "next";
      const arrow = onboardingNextBtn.querySelector(".onboarding-next-arrow");
      if (arrow) arrow.hidden = false;
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
            '"><img src="assets/onboarding/dot-' +
            (active ? "active" : "inactive") +
            '.svg" alt="" width="12" height="12" /></button>'
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

  function stopLandingTypewriter() {
    window.clearTimeout(landingTypeTimer);
    landingTypeTimer = 0;
  }

  function startLandingTypewriter() {
    if (!landingTypewriterEl) return;
    stopLandingTypewriter();

    const charEl = document.getElementById("landing-type-char");
    if (!charEl) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      charEl.textContent = "D";
      landingTypewriterEl.classList.add("has-letter");
      return;
    }

    const word = "D";
    let phase = "wait";
    let charIndex = 0;

    function schedule(nextPhase, delay) {
      phase = nextPhase;
      landingTypeTimer = window.setTimeout(step, delay);
    }

    function step() {
      if (!onLanding) return;

      if (phase === "wait") {
        charEl.textContent = "";
        charIndex = 0;
        landingTypewriterEl.classList.remove("has-letter");
        schedule("type", 900);
        return;
      }

      if (phase === "type") {
        charIndex += 1;
        charEl.textContent = word.slice(0, charIndex);
        landingTypewriterEl.classList.add("has-letter");
        if (charIndex < word.length) {
          schedule("type", 160);
          return;
        }
        schedule("hold", 2000);
        return;
      }

      if (phase === "hold") {
        schedule("erase", 400);
        return;
      }

      if (phase === "erase") {
        charIndex -= 1;
        charEl.textContent = word.slice(0, Math.max(0, charIndex));
        if (charIndex > 0) {
          schedule("erase", 140);
          return;
        }
        landingTypewriterEl.classList.remove("has-letter");
        schedule("wait", 1100);
      }
    }

    schedule("wait", 500);
  }

  function pendingRoomCode() {
    const fromQuery = WW.normalizeRoomCode(params.get("room") || "");
    if (fromQuery.length === (WW.ROOM_CODE_LENGTH || 5)) return fromQuery;
    const fromHash = WW.normalizeRoomCode(
      String(window.location.hash || "").replace(/^#/, "")
    );
    if (fromHash.length === (WW.ROOM_CODE_LENGTH || 5)) return fromHash;
    return "";
  }

  function roomInviteUrl(code) {
    const word = WW.normalizeRoomCode(code || "");
    const path = window.location.origin + window.location.pathname;
    if (!word) return path;
    return path + "?room=" + encodeURIComponent(word);
  }

  function syncRoomUrl(code) {
    if (!window.history || !window.history.replaceState) return;
    const url = new URL(window.location.href);
    const word = WW.normalizeRoomCode(code || "");
    if (word) url.searchParams.set("room", word);
    else url.searchParams.delete("room");
    url.hash = "";
    const next = url.pathname + url.search;
    const now = window.location.pathname + window.location.search;
    if (next !== now) {
      window.history.replaceState({}, "", url);
    }
  }

  function enterGameFromLanding() {
    if (!landingEl || !onLanding) return;
    onLanding = false;
    stopLandingTypewriter();
    landingEl.hidden = true;
    if (appEl) appEl.hidden = false;
    const invite = pendingRoomCode();
    if (invite) {
      joinDraft = invite.split("");
      flow = "join";
      const flash = document.getElementById("join-flash");
      if (flash) {
        flash.textContent = "Joining…";
        flash.className = "flash";
      }
      net.join(invite, myOnlineName(), myOnlineColor());
      render();
      syncBackgroundInert();
      return;
    }
    flow = "mode";
    render();
    syncBackgroundInert();
    const localBtn = document.getElementById("mode-local-btn");
    if (localBtn) localBtn.focus();
  }

  function isOnline() {
    return Boolean(onlineView);
  }

  function isMyTurn() {
    if (!isOnline()) return !isAiSeat();
    const current = WW.currentPlayer(state);
    return Boolean(
      current &&
        onlineView.you &&
        current.id === onlineView.you.playerId &&
        !current.isAi
    );
  }

  function myOnlineName() {
    if (onlineView && onlineView.you && onlineView.you.name) {
      return onlineView.you.name;
    }
    return playerPlaceholder(0);
  }

  function myOnlineColor() {
    if (onlineView && onlineView.you && onlineView.you.color) {
      return onlineView.you.color;
    }
    return PLAYER_COLORS[0];
  }

  function showKicked() {
    onlineView = null;
    flow = "kicked";
    state = WW.createGame();
    joinDraft = ["", "", "", "", ""];
    shopOpen = false;
    stopAi();
    syncRoomUrl("");
    net.disconnect();
    render();
  }

  function goToJoin() {
    flow = "join";
    joinDraft = ["", "", "", "", ""];
    const flash = document.getElementById("join-flash");
    if (flash) {
      flash.textContent = "";
      flash.className = "flash";
    }
    render();
  }

  function leaveOnline() {
    net.disconnect();
    onlineView = null;
    flow = "mode";
    state = WW.createGame();
    joinDraft = ["", "", "", "", ""];
    shopOpen = false;
    stopAi();
    syncRoomUrl("");
    render();
  }

  function onNetMessage(msg) {
    if (!msg) return;
    if (msg.type === "VIEW" && msg.view) {
      applyOnlineView(msg.view);
    }
  }

  function onNetError(err) {
    if (err && err.code === "kicked") {
      showKicked();
      return;
    }
    if (flow === "join") {
      const flash = document.getElementById("join-flash");
      if (flash) {
        flash.textContent = (err && err.message) || "Could not join.";
        flash.className = "flash is-bad";
      }
      joinShake += 1;
      paintJoinBoard();
      return;
    }
    if (flow === "online-pick" || !onlineView) {
      flow = "online-pick";
      render();
      return;
    }
    const hint = document.getElementById("lobby-hint");
    if (hint && err && err.message) hint.textContent = err.message;
  }

  function onNetClose() {
    if (flow === "kicked") return;
    if (!onlineView) return;
    if (onlineView.screen === "game") {
      onlineView = Object.assign({}, onlineView, { reconnecting: true });
      render();
      return;
    }
    leaveOnline();
  }

  function applyOnlineView(view) {
    if (view && view.screen === "lobby" && onlineView && onlineView.you && !view.you) {
      showKicked();
      return;
    }
    const prev = state;
    onlineView = view;
    flow = "net";
    if (view.code) syncRoomUrl(view.code);
    if (view.game) {
      state = view.game;
    } else {
      state = WW.createGame();
    }
    if (prev.phase === "handoff" && state.phase !== "handoff") shopOpen = false;
    if (prev.phase !== "handoff" && state.phase === "handoff") shopOpen = false;
    try {
      render();
    } catch (err) {
      console.error("online render failed", err);
    }
    if (state.phase === "revealing" && prev.phase !== "revealing") {
      armRevealGuard();
      try {
        startScoreReveal();
      } catch (err) {
        console.error("Score reveal failed", err);
      }
    }
    if (state.phase === "spinning" && prev.phase !== "spinning") {
      try {
        startSpin();
      } catch (err) {
        console.error("Spin failed", err);
      }
    }
    if (prev.phase === "revealing" && state.phase !== "revealing") {
      clearRevealGuard();
    }
  }

  function startHosting() {
    flow = "net";
    net.host(myOnlineName(), myOnlineColor());
    render();
  }

  function submitJoinCode() {
    const code = joinDraft.join("");
    if (code.length !== WW.WORD_LENGTH) {
      const flash = document.getElementById("join-flash");
      if (flash) {
        flash.textContent = "Need five letters.";
        flash.className = "flash is-bad";
      }
      joinShake += 1;
      paintJoinBoard();
      return;
    }
    const flash = document.getElementById("join-flash");
    if (flash) {
      flash.textContent = "Joining…";
      flash.className = "flash";
    }
    net.join(code, myOnlineName(), myOnlineColor());
  }

  function paintJoinBoard() {
    const board = document.getElementById("join-board");
    if (!board) return;
    board.classList.toggle("is-shaking", false);
    if (joinShake) {
      void board.offsetWidth;
      board.classList.add("is-shaking");
    }
    board.innerHTML = joinDraft
      .map(function (letter) {
        return (
          '<div class="tile-stack"><div class="tile"><span class="tile-letter">' +
          escapeHtml(letter) +
          "</span></div></div>"
        );
      })
      .join("");
  }

  function handleJoinKey(key) {
    if (key === "ENTER") {
      submitJoinCode();
      return;
    }
    if (key === "BACKSPACE") {
      for (let i = joinDraft.length - 1; i >= 0; i -= 1) {
        if (joinDraft[i]) {
          joinDraft[i] = "";
          break;
        }
      }
      paintJoinBoard();
      return;
    }
    if (!/^[A-Z]$/.test(key)) return;
    for (let i = 0; i < joinDraft.length; i += 1) {
      if (!joinDraft[i]) {
        joinDraft[i] = key;
        break;
      }
    }
    paintJoinBoard();
    if (joinDraft.every(function (cell) {
      return cell;
    })) {
      submitJoinCode();
    }
  }

  function fillKeyboard(el, withScores) {
    if (!el) return;
    el.innerHTML = "";
    KEY_ROWS.forEach(function (row, rowIndex) {
      const rowEl = document.createElement("div");
      rowEl.className = "key-row";
      if (rowIndex === 2) {
        const del = document.createElement("button");
        del.type = "button";
        del.className = "key key-wide";
        del.dataset.key = "BACKSPACE";
        del.textContent = "del";
        del.setAttribute("aria-label", "Delete last letter");
        rowEl.appendChild(del);
      }
      row.split("").forEach(function (letter) {
        const key = document.createElement("button");
        key.type = "button";
        key.className = "key";
        key.dataset.key = letter;
        if (withScores) {
          const value = WW.letterValue(letter, letterPointsMap());
          key.setAttribute(
            "aria-label",
            letter + ", " + value + (value === 1 ? " point" : " points")
          );
          key.innerHTML =
            '<span class="key-letter">' +
            letter +
            '</span><span class="key-pts" aria-hidden="true">' +
            value +
            "</span>";
        } else {
          key.setAttribute("aria-label", letter);
          key.innerHTML = '<span class="key-letter">' + letter + "</span>";
        }
        rowEl.appendChild(key);
      });
      if (rowIndex === 2) {
        const enter = document.createElement("button");
        enter.type = "button";
        enter.className = "key key-wide";
        enter.dataset.key = "ENTER";
        enter.textContent = "enter";
        enter.setAttribute("aria-label", "Submit word");
        rowEl.appendChild(enter);
      }
      el.appendChild(rowEl);
    });
  }

  function buildJoinKeyboard() {
    const el = document.getElementById("join-keyboard");
    if (!el) return;
    if (el.dataset.kind === "join") return;
    fillKeyboard(el, false);
    el.dataset.kind = "join";
  }

  function paintLobby() {
    const view = onlineView;
    const codeEl = document.getElementById("lobby-code");
    const hintEl = document.getElementById("lobby-hint");
    const rosterEl = document.getElementById("lobby-roster");
    const startBtn = document.getElementById("lobby-start-btn");
    const readyBtn = document.getElementById("lobby-ready-btn");
    const aiBtn = document.getElementById("lobby-ai-btn");
    const roundsWrap = document.getElementById("lobby-rounds");
    const roundsValue = document.getElementById("lobby-rounds-value");
    const code = view && view.code ? view.code : net.code();
    if (codeEl) {
      const letters = String(code || "     ")
        .toUpperCase()
        .padEnd(5, " ")
        .slice(0, 5)
        .split("");
      codeEl.setAttribute("aria-label", "Room code " + (code || ""));
      codeEl.innerHTML = letters
        .map(function (letter) {
          return '<div class="tile" aria-hidden="true">' + escapeHtml(letter.trim()) + "</div>";
        })
        .join("");
    }
    const host = Boolean(view && view.you && view.you.isHost);
    const youReady = Boolean(view && view.you && (view.you.isHost || view.you.ready));
    const seats = (view && view.seats) || [];
    const allReady = seats.length >= 2 && seats.every(function (seat) {
      return seat.isAi || seat.isHost || seat.ready;
    });
    if (hintEl) {
      if (!view || !view.you) {
        hintEl.textContent = "Opening room…";
      } else if (!host && !youReady) {
        hintEl.textContent = "Tap Ready when you are set.";
      } else if (!allReady) {
        hintEl.textContent = "Waiting for everyone to ready up.";
      } else if (host) {
        hintEl.textContent = "Everyone is ready. Tap BEGIN.";
      } else {
        hintEl.textContent = "Everyone is ready. Waiting for the host to begin.";
      }
    }
    if (readyBtn) {
      readyBtn.hidden = !view || !view.you || host;
      readyBtn.textContent = youReady ? "Unready" : "Ready";
      readyBtn.classList.toggle("btn-amber", !youReady);
      readyBtn.classList.toggle("btn-ghost", youReady);
      readyBtn.setAttribute("aria-pressed", youReady ? "true" : "false");
    }
    if (startBtn) {
      startBtn.hidden = !host;
      startBtn.disabled = !view || !view.canStart;
    }
    if (aiBtn) aiBtn.hidden = !host;
    if (roundsWrap) roundsWrap.hidden = !host;
    if (roundsValue && view) roundsValue.textContent = String(view.rounds);
    const minus = document.getElementById("lobby-rounds-minus");
    const plus = document.getElementById("lobby-rounds-plus");
    if (minus) minus.disabled = !host || (view && view.rounds <= WW.MIN_ROUNDS);
    if (plus) plus.disabled = !host || (view && view.rounds >= WW.MAX_ROUNDS);
    if (!rosterEl) return;
    const typingInput =
      document.activeElement &&
      rosterEl.contains(document.activeElement) &&
      document.activeElement.classList.contains("player-name-input")
        ? document.activeElement
        : null;
    const keepId = typingInput ? typingInput.id : "";
    const keepName = typingInput ? typingInput.value : "";
    const keepStart = typingInput ? typingInput.selectionStart : 0;
    const keepEnd = typingInput ? typingInput.selectionEnd : 0;
    rosterEl.innerHTML = "";
    seats.forEach(function (seat, index) {
      const wrap = document.createElement("div");
      const seatReady = Boolean(
        seat.isAi || ((seat.isHost || seat.ready) && seat.connected)
      );
      const reconnecting = !seat.isAi && !seat.connected;
      wrap.className =
        "player-row" + (seatReady ? " is-lobby-ready" : " is-lobby-wait");
      wrap.dataset.seatId = seat.id;
      wrap.dataset.color = seat.color || PLAYER_COLORS[index];
      wrap.dataset.ai = seat.isAi ? "1" : "";
      wrap.dataset.aiLevel = seat.aiLevel || "";
      const mine = view.you && view.you.seatId === seat.id;
      const canEdit = Boolean(mine);
      const id = "lobby-name-" + seat.id;
      const statusClass = seatReady
        ? " is-ready"
        : reconnecting
          ? " is-reconnect"
          : " is-wait";
      const statusText = seatReady
        ? "ready"
        : reconnecting
          ? "reconnecting"
          : "not ready";
      wrap.innerHTML =
        '<div class="player-avatar-wrap">' +
        '<div class="player-avatar" aria-hidden="true"></div>' +
        '<span class="lobby-ready-badge' +
        (seatReady ? " is-ready" : " is-wait") +
        '" aria-hidden="true">' +
        (seatReady
          ? '<svg viewBox="0 0 12 12" width="10" height="10"><path d="M2.1 6.2l2.6 2.6 5.2-5.6" fill="none" stroke="#fff" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>'
          : '<svg viewBox="0 0 12 12" width="9" height="9"><path d="M3 3l6 6M9 3l-6 6" fill="none" stroke="#fff" stroke-width="1.9" stroke-linecap="round"/></svg>') +
        "</span></div>" +
        '<div class="field">' +
        '<div class="player-name-head">' +
        '<label for="' +
        id +
        '">' +
        (seat.isHost ? "HOST" : seat.isAi ? "AI" : "PLAYER") +
        "</label>" +
        (mine ? '<span class="lobby-you">YOU</span>' : "") +
        "</div>" +
        '<div class="player-name-row">' +
        '<div class="player-name-wrap">' +
        '<input class="player-name-input" id="' +
        id +
        '" maxlength="24" autocomplete="off" ' +
        (canEdit ? "" : "readonly ") +
        "/>" +
        (canEdit
          ? '<button type="button" class="player-name-edit" tabindex="-1" aria-label="Edit your name">' +
            '<span class="icon icon-pencil" aria-hidden="true">' +
            '<img src="assets/pencil.svg" alt="" width="14" height="14" />' +
            "</span></button>"
          : "") +
        "</div>" +
        (host && !seat.isHost
          ? '<button type="button" class="remove-player" data-seat-id="' +
            seat.id +
            '" aria-label="Remove">×</button>'
          : "") +
        "</div>" +
        '<p class="lobby-status' +
        statusClass +
        '">' +
        statusText +
        "</p>" +
        (canEdit
          ? '<div class="player-tools">' +
            colorSwatchesHtml(
              seat.color,
              seats
                .filter(function (other) {
                  return other.id !== seat.id;
                })
                .map(function (other) {
                  return other.color;
                })
            ) +
            "</div>"
          : "") +
        "</div>";
      const input = wrap.querySelector(".player-name-input");
      if (input) {
        input.value =
          keepId === id ? keepName : seat.name || "";
      }
      rosterEl.appendChild(wrap);
      paintRowAvatar(wrap);
    });
    if (keepId) {
      const restore = document.getElementById(keepId);
      if (restore) {
        restore.focus();
        try {
          restore.setSelectionRange(keepStart, keepEnd);
        } catch (err) {
          /* ignore */
        }
      }
    }
  }

  function paintWait() {
    const title = document.getElementById("wait-title");
    const kicker = document.getElementById("wait-kicker");
    const reconnect = document.getElementById("wait-reconnect");
    const wordWrap = document.getElementById("wait-word");
    const board = document.getElementById("wait-board");
    const player = WW.currentPlayer(state);
    if (title) {
      title.textContent = player
        ? "Waiting for " + player.name + "…"
        : "Waiting…";
    }
    if (kicker) kicker.textContent = turnKickerCopy();
    if (reconnect) reconnect.hidden = !(onlineView && onlineView.reconnecting);
    if (!state.lastWord) {
      if (wordWrap) wordWrap.hidden = true;
      if (board) board.innerHTML = "";
    } else if (board && wordWrap) {
      wordWrap.hidden = false;
      board.innerHTML = state.lastWord
        .toUpperCase()
        .split("")
        .map(function (letter) {
          return '<div class="tile" aria-hidden="true">' + escapeHtml(letter) + "</div>";
        })
        .join("");
    }
  }

  function shareWordsus(labelId) {
    const code = isOnline() && onlineView && onlineView.code;
    const payload = {
      title: "wordsus",
      text: code
        ? "Join my wordsus room. The code is " + code + "."
        : isDesktop()
          ? "Same-screen five-letter word war."
          : "Pass-and-play five-letter word war.",
      url: code ? roomInviteUrl(code) : window.location.origin + window.location.pathname,
    };
    const done = function (copied) {
      const label = document.getElementById(labelId);
      if (!label) return;
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
    const isLast = onboardingStep === slides.length - 1;
    const focusTarget = isLast ? onboardingBackBtn : onboardingNextBtn;
    if (focusTarget && !focusTarget.hidden) focusTarget.focus();
  }

  function nextOnboardingStep() {
    const slides = getOnboardingSlides();
    if (onboardingStep >= slides.length - 1) {
      completeOnboarding();
      return;
    }
    goToOnboardingStep(onboardingStep + 1);
  }

  function prevOnboardingStep() {
    if (onboardingStep <= 0) return;
    goToOnboardingStep(onboardingStep - 1);
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
    if (isOnline() && onlineView.screen === "game") {
      if (action.type === "TICK") {
        paintTimer();
        return;
      }
      if (action.type === "PAUSE_TIMER" || action.type === "RESUME_TIMER") {
        return;
      }
      if (action.type === "SPIN_DONE" || action.type === "REVEAL_DONE") {
        return;
      }
      if (action.type === "TYPE" || action.type === "BACKSPACE") {
        if (isMyTurn() && state.phase === "playing") {
          state = WW.reduce(state, action);
          try {
            render();
          } catch (err) {
            console.error("render failed", err);
          }
        }
      }
      if (WW.CLIENT_GAME_ACTIONS && WW.CLIENT_GAME_ACTIONS[action.type]) {
        const payload = { type: action.type };
        if (action.letter) payload.letter = action.letter;
        if (action.itemId) payload.itemId = action.itemId;
        if (action.targetId) payload.targetId = action.targetId;
        net.send({ type: "GAME", action: payload });
      }
      return;
    }
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
      prev.phase === state.phase &&
      (state.phase === "playing" || state.phase === "spinning")
    ) {
      paintTimer();
      return;
    }
    try {
      render();
    } catch (err) {
      console.error("render failed", err);
    }
    if (prev.phase === "revealing" && state.phase !== "revealing") {
      clearRevealGuard();
    }
    if (state.phase === "revealing" && prev.phase !== "revealing") {
      armRevealGuard();
      try {
        startScoreReveal();
      } catch (err) {
        console.error("Score reveal failed", err);
        dispatch({ type: "REVEAL_DONE" });
      }
    }
    if (state.phase === "spinning" && prev.phase !== "spinning") {
      try {
        startSpin();
      } catch (err) {
        console.error("Spin failed", err);
        dispatch({ type: "SPIN_DONE", nowMs: Date.now() });
      }
    }
  }

  function closeStrayAiOverlays() {
    [aiEl, onboardingEl].forEach(function (overlay) {
      if (overlay && !overlay.hidden) overlay.hidden = true;
    });
    const player = WW.currentPlayer(state);
    if (shopEl && player && player.isAi) {
      shopOpen = false;
      shopEl.hidden = true;
    }
    syncBackgroundInert();
  }

  const ai = WW.createAiDriver({
    getState: function () {
      return state;
    },
    dispatch: dispatch,
    onBusy: function () {
      document.body.classList.add("ai-turn");
      try {
        closeStrayAiOverlays();
      } catch (err) {
        console.error("AI overlay close failed", err);
      }
    },
    onIdle: function () {
      document.body.classList.remove("ai-turn");
    },
  });

  function isAiSeat() {
    return ai.isAiSeat();
  }

  function stopAi() {
    ai.stop();
  }

  function queueAi() {
    if (isOnline()) {
      stopAi();
      return;
    }
    ai.queue();
  }

  function reducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function announce(message) {
    if (!srAnnouncer || !message) return;
    try {
      window.clearTimeout(announceTimer);
      srAnnouncer.textContent = "";
      announceTimer = window.setTimeout(function () {
        srAnnouncer.textContent = message;
      }, 40);
    } catch (err) {
      console.error("Announce failed", err);
    }
  }

  function colorName(hex) {
    return COLOR_NAMES[String(hex || "").toLowerCase()] || "Custom";
  }

  function overlayIsOpen(el) {
    return Boolean(el && !el.hidden);
  }

  function overlayOpen() {
    if (
      overlayIsOpen(shopEl) ||
      overlayIsOpen(rulesEl) ||
      overlayIsOpen(pplEl) ||
      overlayIsOpen(restartEl)
    ) {
      return true;
    }
    if (state.phase === "setup") {
      return overlayIsOpen(aiEl) || overlayIsOpen(onboardingEl);
    }
    return false;
  }

  function getOpenDialogPanel() {
    if (overlayIsOpen(shopEl)) return shopEl.querySelector('[role="dialog"]');
    if (overlayIsOpen(onboardingEl)) return onboardingEl.querySelector('[role="dialog"]');
    if (overlayIsOpen(pplEl)) return pplEl.querySelector('[role="dialog"]');
    if (overlayIsOpen(rulesEl)) return rulesEl.querySelector('[role="dialog"]');
    if (overlayIsOpen(restartEl)) return restartEl.querySelector('[role="dialog"]');
    if (overlayIsOpen(aiEl)) return aiEl.querySelector('[role="dialog"]');
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
    const open = overlayOpen();
    if (appEl) {
      appEl.inert = open;
      if (open) appEl.setAttribute("aria-hidden", "true");
      else appEl.removeAttribute("aria-hidden");
    }
    if (siteCreditEl) siteCreditEl.inert = open;
  }

  function pauseTimerForOverlay() {
    if (
      (state.phase === "playing" || state.phase === "spinning") &&
      state.turnEndsAt != null
    ) {
      dispatch({ type: "PAUSE_TIMER", nowMs: Date.now() });
    }
  }

  function resumeTimerForOverlay() {
    if (
      (state.phase === "playing" || state.phase === "spinning") &&
      state.turnEndsAt == null &&
      !overlayOpen()
    ) {
      dispatch({ type: "RESUME_TIMER", nowMs: Date.now() });
    }
  }

  function openOverlay(overlay, trigger) {
    if (overlay === pplEl) paintPplChart();
    dialogTrigger = trigger || document.activeElement;
    overlay.hidden = false;
    if (overlay === pplEl && pplBtn) pplBtn.setAttribute("aria-expanded", "true");
    pauseTimerForOverlay();
    syncBackgroundInert();
    const panel = overlay.querySelector('[role="dialog"]');
    const focusables = getFocusable(panel);
    window.setTimeout(function () {
      if (overlay === pplEl && panel) {
        panel.setAttribute("tabindex", "-1");
        panel.focus();
        return;
      }
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
    if (overlay === pplEl && pplBtn) pplBtn.setAttribute("aria-expanded", "false");
    syncBackgroundInert();
    resumeTimerForOverlay();
    const trigger = dialogTrigger;
    dialogTrigger = null;
    if (trigger && typeof trigger.focus === "function") trigger.focus();
    queueAi();
  }

  function updateRestartButton() {
    if (!restartBtn) return;
    const idle = state.phase === "setup";
    restartBtn.disabled = idle;
    restartBtn.setAttribute("aria-disabled", idle ? "true" : "false");
  }

  function closeEffectTips() {
    document.querySelectorAll(".effect-chip.is-open, .effect-name.is-open").forEach(function (el) {
      el.classList.remove("is-open");
      if (el.matches(".effect-name")) {
        el.setAttribute("aria-expanded", "false");
      }
      const btn = el.querySelector && el.querySelector(".effect-name");
      if (btn) btn.setAttribute("aria-expanded", "false");
    });
  }

  function onEffectListClick(event) {
    const chip = event.target.closest(".effect-chip");
    if (!chip) return;
    event.preventDefault();
    event.stopPropagation();
    const open = !chip.classList.contains("is-open");
    closeEffectTips();
    chip.classList.toggle("is-open", open);
    const btn = chip.querySelector(".effect-name");
    if (btn) btn.setAttribute("aria-expanded", open ? "true" : "false");
  }

  function clearRevealGuard() {
    window.clearTimeout(revealGuardTimer);
    revealGuardTimer = 0;
  }

  // The reveal animation is a chain of timers; if any link dies the game would
  // sit on the scoring screen forever, so force the turn forward.
  function armRevealGuard() {
    clearRevealGuard();
    revealGuardTimer = window.setTimeout(function () {
      revealGuardTimer = 0;
      if (state.phase === "revealing") {
        dispatch({ type: "REVEAL_DONE" });
      }
    }, 6000);
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
    if (result.opening) {
      flashEl.removeAttribute("aria-hidden");
      flashEl.textContent = "First word";
      flashEl.className = "flash is-good";
      announce("First word. No points.");
      startReveal();
      return;
    }

    const tiles = result.tiles || wordTiles(result.word);
    const letterValues = tiles.map(function (letter) {
      return WW.letterValue(letter, letterPointsMap());
    });
    const wordValue = WW.wordValue(result.word, letterPointsMap());
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
    window.clearTimeout(spinGuardTimer);
    spinGuardTimer = window.setTimeout(function () {
      if (state.phase === "spinning") {
        dispatch({ type: "SPIN_DONE", nowMs: Date.now() });
      }
    }, 5200);
    const frozen = frozenIndices();
    const slots = state.frozenSlots || [];
    const target =
      slots.length > 0 ? slots[slots.length - 1].index : 0;
    const tiles = boardEl.querySelectorAll(".tile");
    if (!tiles.length) {
      window.requestAnimationFrame(function () {
        if (state.phase !== "spinning") return;
        if (boardEl.querySelectorAll(".tile").length) {
          startSpin();
          return;
        }
        dispatch({ type: "SPIN_DONE", nowMs: Date.now() });
      });
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
    for (let c = 0; c < 2; c += 1) {
      for (let i = 0; i < 5; i += 1) sequence.push(i);
    }
    for (let i = 0; i <= target; i += 1) sequence.push(i);
    if (target < 4) {
      sequence.push(target + 1);
      sequence.push(target);
    } else {
      sequence.push(3);
      sequence.push(4);
    }

    let step = 0;
    function highlight(index, settling) {
      tiles.forEach(function (tile) {
        tile.classList.remove("is-scanning", "is-settling");
      });
      if (!tiles[index]) return;
      tiles[index].classList.add("is-scanning");
      if (settling) tiles[index].classList.add("is-settling");
    }

    function lockChosen() {
      if (state.phase !== "spinning") return;
      tiles.forEach(function (tile, tileIndex) {
        tile.classList.remove("is-scanning", "is-settling");
        if (frozen[tileIndex]) {
          tile.classList.add("is-locked", "is-frozen");
        } else {
          tile.classList.add("is-vanishing");
        }
      });
      boardEl.classList.add("is-revealing");
      spinTimer = window.setTimeout(function () {
        dispatch({ type: "SPIN_DONE", nowMs: Date.now() });
      }, 720);
    }

    function scanStep() {
      if (state.phase !== "spinning") return;
      const last = step >= sequence.length - 1;
      highlight(sequence[step], last);
      step += 1;
      if (last) {
        spinTimer = window.setTimeout(lockChosen, 480);
        return;
      }
      spinTimer = window.setTimeout(scanStep, 140);
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
    if (type === "hostile_takeover") {
      return (
        "Takes the points you earn this turn. If you don't enter a word, you lose " +
        WW.HOSTILE_TAKEOVER_MISS_PENALTY +
        " points."
      );
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
        const missNote =
          effect.type === "hostile_takeover"
            ? '<span class="effect-miss">' +
              escapeHtml(hostileMissHint()) +
              "</span>"
            : "";
        return (
          '<div class="effect-chip" role="listitem">' +
          '<div class="effect-icon" aria-hidden="true">' +
          '<img class="effect-skull" src="assets/sabotage-skull.svg" alt="" width="32" height="35" />' +
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
          missNote +
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
    const remaining =
      state.turnEndsAt != null
        ? Math.max(0, state.turnEndsAt - Date.now())
        : state.timeRemainingMs;
    const secs = Math.ceil(remaining / 1000);
    timerSecsEl.textContent = String(secs);
    const ratio = Math.max(0, Math.min(1, remaining / limit));
    timerFillEl.style.width = ratio * 100 + "%";
    const urgent = state.phase === "playing" && secs <= 5;
    timerEl.classList.toggle("is-urgent", urgent);
    timerEl.classList.toggle("is-idle", state.phase !== "playing" && state.phase !== "revealing");
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

  function scoreGainFor(playerId) {
    const gains = state.scoreGains || [];
    for (let i = 0; i < gains.length; i += 1) {
      if (gains[i].playerId === playerId) return gains[i].points;
    }
    return 0;
  }

  function armScoreGainPops(root) {
    if (!root) return;
    const nodes = root.querySelectorAll(".score-gain");
    const sig = (state.scoreGains || [])
      .map(function (gain) {
        return gain.playerId + ":" + gain.points;
      })
      .join("|");
    if (!nodes.length) return;
    const restart = sig !== lastGainSignature;
    lastGainSignature = sig;
    nodes.forEach(function (el) {
      if (restart || !el.classList.contains("is-on")) {
        el.classList.remove("is-on");
        void el.offsetWidth;
      }
      el.classList.add("is-on");
    });
  }

  function paintScoreboard() {
    if (!state.players.length || state.phase === "setup" || shopOpen) {
      scoreboardEl.classList.remove("is-on");
      scoreboardEl.innerHTML = "";
      return;
    }
    scoreboardEl.classList.add("is-on");
    scoreboardEl.innerHTML = state.players
      .map(function (player, index) {
        const current = index === state.currentPlayerIndex ? " is-current" : "";
        const color = player.color || PLAYER_COLORS[index] || "#fbab20";
        const gain = scoreGainFor(player.id);
        const gainHtml = gain
          ? '<span class="score-gain">+' + gain + "</span>"
          : "";
        return (
          '<div class="score-chip' +
          current +
          '" role="listitem"' +
          (index === state.currentPlayerIndex ? ' aria-current="true"' : "") +
          ' data-player-id="' +
          escapeHtml(player.id) +
          '"><span class="score-avatar" aria-hidden="true" style="background:' +
          escapeHtml(color) +
          ";color:" +
          avatarInk(color) +
          '">' +
          escapeHtml(playerInitials(player.name)) +
          '</span><span class="name">' +
          escapeHtml(player.name) +
          (isOnline() &&
          onlineView.you &&
          player.id === onlineView.you.playerId
            ? '<span class="lobby-you">YOU</span>'
            : "") +
          '</span><span class="pts-wrap">' +
          gainHtml +
          '<span class="pts">' +
          player.score +
          "</span></span></div>"
        );
      })
      .join("");
    armScoreGainPops(scoreboardEl);
  }

  function paintBoard() {
    const letters =
      (state.phase === "revealing" &&
      state.lastSubmitResult &&
      state.lastSubmitResult.tiles
        ? state.lastSubmitResult.tiles
        : state.draft) || ["", "", "", "", ""];
    const frozen = frozenIndices();
    const showFrozen = state.phase === "playing" && state.frozenSlots && state.frozenSlots.length;
    const showLetterScores =
      state.phase === "revealing" &&
      state.lastSubmitResult &&
      !state.lastSubmitResult.timedOut &&
      state.lastSubmitResult.word &&
      !state.lastSubmitResult.opening;

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

  function hasHostileTakeover() {
    return (state.activeEffects || []).some(function (effect) {
      return effect.type === "hostile_takeover";
    });
  }

  function hostileMissHint() {
    return (
      "Enter a word or lose " + WW.HOSTILE_TAKEOVER_MISS_PENALTY + " pts"
    );
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
      if (state.lastSubmitResult.timedOut) {
        if (state.lastSubmitResult.opening) return "Time’s up";
        const lost = state.lastSubmitResult.hostileMissPenalty;
        if (lost) return "Time — −" + lost + " pts";
        return "Time — 0 pts";
      }
      if (state.lastSubmitResult.opening) return "First word";
      return "+" + state.lastSubmitResult.points + " pts";
    }
    let copy = "Any five-letter word";
    if (state.phase === "spinning") {
      const count = state.freezeCount || 1;
      copy =
        count > 1
          ? "Picking " + count + " letters…"
          : "Picking a letter…";
    } else if (state.frozenSlots && state.frozenSlots.length) {
      if (state.frozenSlots.length === 1) {
        const slot = state.frozenSlots[0];
        copy = "Keep " + slot.letter + " in slot " + (slot.index + 1);
      } else {
        copy = "Keep " + state.frozenSlots.length + " frozen letters";
      }
    } else if (state.requiredLetter) {
      copy = "Must include " + state.requiredLetter;
    } else if (state.reverseType) {
      copy = "Type backwards — right to left";
    }
    if (
      hasHostileTakeover() &&
      (state.phase === "playing" || state.phase === "spinning")
    ) {
      const miss = hostileMissHint();
      if (copy === "Any five-letter word") return miss;
      return copy + " · " + miss;
    }
    return copy;
  }

  function turnKickerCopy() {
    const player = WW.currentPlayer(state);
    if (state.isSuddenDeath) return "Sudden death";
    if (
      !state.seeded ||
      (state.lastSubmitResult && state.lastSubmitResult.opening)
    ) {
      return "First word";
    }
    const rounds = WW.clampRounds(state.turnsPerPlayer);
    const counted =
      state.phase === "revealing" && state.lastSubmitResult
        ? player
          ? player.turnsTaken
          : 1
        : player
          ? player.turnsTaken + 1
          : 1;
    const turnNumber = Math.max(1, Math.min(rounds, counted));
    return "Turn " + turnNumber + " of " + rounds;
  }

  function paintPlayChrome() {
    const player = WW.currentPlayer(state);
    if (!player) return;
    turnWhoEl.textContent = player.name;
    turnKickerEl.textContent = turnKickerCopy();
    paintTimer();
    paintEffects(playEffectsEl, playEffectListEl);
    const scoringReveal =
      state.phase === "revealing" &&
      state.lastSubmitResult &&
      !state.lastSubmitResult.timedOut &&
      state.lastSubmitResult.word &&
      !state.lastSubmitResult.opening;
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
    keyboardEl.hidden = state.phase !== "playing" || (isOnline() && !isMyTurn());
    keyboardEl.classList.toggle("is-reverse", Boolean(state.reverseType));
    keyboardEl.querySelectorAll(".key[data-key]").forEach(function (key) {
      const letter = key.dataset.key;
      const required =
        state.requiredLetter &&
        letter === state.requiredLetter.toUpperCase();
      key.classList.toggle("is-required", Boolean(required));
      if (letter === "BACKSPACE") {
        const blocked = Boolean(state.blockBackspace);
        key.classList.toggle("is-disabled", blocked);
        key.disabled = blocked;
      }
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
    const isAi = Boolean(player.isAi);
    handoffKickerEl.textContent = turnKickerCopy();
    if (readyBtn) {
      const hideReady = isAi || (isOnline() && !isMyTurn());
      readyBtn.disabled = hideReady;
      readyBtn.hidden = hideReady;
    }
    if (shopToggleBtn && isOnline() && !isMyTurn()) {
      shopToggleBtn.hidden = true;
    } else if (shopToggleBtn) {
      shopToggleBtn.hidden = false;
    }
    if (isAi) shopOpen = false;
    if (isAi && !isOnline()) window.setTimeout(queueAi, 0);
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

  function canBuySomething(player) {
    if (!player || !WW.SHOP_ITEMS) return false;
    const rivals = state.players.filter(function (p) {
      return p.id !== player.id;
    });
    return WW.SHOP_ITEMS.some(function (item) {
      if (item.oncePerTurn && WW.alreadyBoughtThisTurn(state, item.id)) {
        return false;
      }
      if (item.noTarget) {
        return player.score >= WW.sabotagePrice(item, null);
      }
      if (!rivals.length) return false;
      return rivals.some(function (rival) {
        return player.score >= WW.sabotagePrice(item, rival);
      });
    });
  }

  function setShopOpen(open) {
    if (open && isOnline() && !isMyTurn()) return;
    if (open && !state.seeded) return;
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
    const onHandoff =
      state.phase === "handoff" &&
      player &&
      state.seeded &&
      (!isOnline() || isMyTurn());
    if (shopToggleBtn) {
      shopToggleBtn.hidden = !onHandoff || Boolean(player && player.isAi);
      shopToggleBtn.setAttribute("aria-expanded", shopOpen && onHandoff ? "true" : "false");
      shopToggleBtn.classList.toggle(
        "has-points",
        Boolean(onHandoff && !shopOpen && canBuySomething(player))
      );
    }
    const showShop = Boolean(onHandoff && shopOpen);
    const opening = showShop && !shopWasOpen;
    const activeItem = document.activeElement && document.activeElement.closest
      ? document.activeElement.closest(".shop-item")
      : null;
    const activeItemId = activeItem && activeItem.dataset.itemId;
    const restoreSelect =
      document.activeElement && document.activeElement.tagName === "SELECT";
    if (shopEl) {
      shopEl.hidden = !showShop;
      shopEl.setAttribute("aria-hidden", showShop ? "false" : "true");
    }
    if (!showShop) {
      if (shopItemsEl) shopItemsEl.innerHTML = "";
      if (shopScoresEl) shopScoresEl.innerHTML = "";
      shopWasOpen = false;
      paintScoreboard();
      return;
    }

    scoreboardEl.classList.remove("is-on");

    if (shopPointsValueEl) {
      shopPointsValueEl.textContent = String(player.score);
    }
    if (shopPointsGainEl) {
      const gain = scoreGainFor(player.id);
      if (gain) {
        shopPointsGainEl.hidden = false;
        shopPointsGainEl.textContent = "+" + gain;
        armScoreGainPops(shopPointsGainEl.parentElement);
      } else {
        shopPointsGainEl.hidden = true;
        shopPointsGainEl.textContent = "";
        shopPointsGainEl.classList.remove("is-on");
      }
    }

    paintShopFlash();

    const opponents = state.players.filter(function (p) {
      return p.id !== player.id;
    });
    const selectedTargets = {};
    shopItemsEl.querySelectorAll(".shop-item").forEach(function (el) {
      const select = el.querySelector(".shop-item-target select");
      if (select) selectedTargets[el.dataset.itemId] = select.value;
    });

    shopItemsEl.innerHTML = WW.SHOP_ITEMS.map(function (item) {
      const selectedId = selectedTargets[item.id];
      const selectedTarget =
        opponents.find(function (target) {
          return target.id === selectedId;
        }) ||
        opponents[0] ||
        null;
      const price = WW.sabotagePrice(item, selectedTarget);
      const alreadyBought =
        item.oncePerTurn && WW.alreadyBoughtThisTurn(state, item.id);
      const canAfford = player.score >= price;
      const canBuy = canAfford && !alreadyBought;
      const options = opponents
        .map(function (target) {
          return (
            '<option value="' +
            escapeHtml(target.id) +
            '"' +
            (selectedTarget && target.id === selectedTarget.id
              ? " selected"
              : "") +
            ">" +
            escapeHtml(target.name) +
            "</option>"
          );
        })
        .join("");
      let targetHtml = "";
      if (!item.noTarget) {
        targetHtml =
          '<div class="shop-item-target"><span class="shop-item-target-label" id="target-label-' +
          escapeHtml(item.id) +
          '">Target:</span>' +
          '<select aria-labelledby="target-label-' +
          escapeHtml(item.id) +
          '">' +
          options +
          "</select></div>";
      } else if (item.note) {
        targetHtml =
          '<p class="shop-item-note">' + escapeHtml(item.note) + "</p>";
      }
      const buyLabel = alreadyBought
        ? ' aria-label="Buy ' +
          escapeHtml(item.name) +
          ', already bought this turn"'
        : canBuy
          ? ""
          : ' aria-label="Buy ' +
            escapeHtml(item.name) +
            " for " +
            price +
            ' points, not enough points"';
      return (
        '<article class="shop-item" data-item-id="' +
        escapeHtml(item.id) +
        '">' +
        '<div class="shop-item-main">' +
        '<h3 class="shop-item-name">' +
        escapeHtml(item.name) +
        "</h3>" +
        '<p class="shop-item-desc">' +
        escapeHtml(item.description) +
        "</p>" +
        targetHtml +
        "</div>" +
        '<button type="button" class="shop-buy"' +
        (canBuy ? "" : " disabled") +
        buyLabel +
        ">" +
        (alreadyBought
          ? "Bought this turn"
          : "Buy for " + price + " points") +
        "</button></article>"
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
          ? item.querySelector("select")
          : item.querySelector(".shop-buy");
        if (target && !target.disabled) target.focus();
        else shopCloseBtn.focus();
      }
    }
    shopWasOpen = true;
  }

  function paintShopFlash() {
    if (!shopFlashEl) return;
    shopFlashEl.replaceChildren();
    const purchase = state.lastShopPurchase;
    if (purchase && purchase.itemName) {
      shopFlashEl.appendChild(document.createTextNode("You have bought "));
      const itemEl = document.createElement("span");
      itemEl.className = "shop-flash-item";
      itemEl.textContent = purchase.itemName;
      shopFlashEl.appendChild(itemEl);
      if (purchase.targetName) {
        shopFlashEl.appendChild(document.createTextNode(" against "));
        const targetEl = document.createElement("span");
        targetEl.className = "shop-flash-target";
        targetEl.textContent = purchase.targetName;
        shopFlashEl.appendChild(targetEl);
      }
      return;
    }
    if (state.lastShopMessage) {
      shopFlashEl.textContent = state.lastShopMessage;
    }
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

    const plays = (state.playLog || [])
      .map(function (entry, index) {
        return { entry: entry, index: index };
      })
      .sort(function (a, b) {
        if (b.entry.points !== a.entry.points) {
          return b.entry.points - a.entry.points;
        }
        return a.index - b.index;
      });
    if (!plays.length) {
      resultsPlaysEl.hidden = true;
      playListEl.innerHTML = "";
      return;
    }
    resultsPlaysEl.hidden = false;
    playListEl.innerHTML = plays
      .map(function (row) {
        const player = playerById(row.entry.playerId);
        const playerIndex = state.players.findIndex(function (item) {
          return item.id === row.entry.playerId;
        });
        const color =
          (player && player.color) ||
          PLAYER_COLORS[playerIndex] ||
          PLAYER_COLORS[0];
        const name = (player && player.name) || row.entry.playerName || "";
        const word = String(row.entry.word || "").toUpperCase();
        const opening = Boolean(row.entry.opening);
        const label =
          word +
          ", " +
          name +
          (opening ? ", starting word" : ", " + row.entry.points + " points");
        return (
          '<li aria-label="' +
          escapeHtml(label) +
          '"><span class="word">' +
          escapeHtml(word) +
          '</span><span class="score-avatar" aria-hidden="true" style="background:' +
          escapeHtml(color) +
          ";color:" +
          avatarInk(color) +
          '">' +
          escapeHtml(playerInitials(name)) +
          '</span><span class="pts' +
          (opening ? " is-start" : "") +
          '">' +
          (opening ? "start" : row.entry.points) +
          "</span></li>"
        );
      })
      .join("");

    // A scrollable region needs to be reachable by keyboard, but only bother
    // when the list actually overflows.
    const scrolls = playListEl.scrollHeight > playListEl.clientHeight;
    if (scrolls) {
      playListEl.setAttribute("tabindex", "0");
    } else {
      playListEl.removeAttribute("tabindex");
    }

    // Let the scrollbar hang outside the column so the points stay aligned
    // with the standings above. Overlay scrollbars measure 0 and need no room.
    playListEl.style.width = "";
    const barWidth = playListEl.offsetWidth - playListEl.clientWidth;
    if (barWidth > 0) {
      playListEl.style.width = "calc(100% + " + barWidth + "px)";
    }
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
    const roster = row.closest(".setup-roster");
    const rows = roster
      ? Array.from(roster.querySelectorAll(".player-row"))
      : [row];
    rows.forEach(function (current) {
      const taken = rows
        .filter(function (other) {
          return other !== current;
        })
        .map(function (other) {
          return String(other.dataset.color || "").toLowerCase();
        });
      const color = (current.dataset.color || "").toLowerCase();
      current.querySelectorAll(".color-swatch[data-color]").forEach(function (swatch) {
        const value = swatch.getAttribute("data-color").toLowerCase();
        const selected = value === color;
        const used = taken.indexOf(value) !== -1 && !selected;
        swatch.classList.toggle("is-selected", selected);
        swatch.classList.toggle("is-taken", used);
        swatch.disabled = used;
        swatch.setAttribute("aria-pressed", selected ? "true" : "false");
      });
      const custom = current.querySelector(".color-swatch-custom input");
      if (custom) custom.value = current.dataset.color || PLAYER_COLORS[0];
    });
  }

  function aiNameForLevel(level) {
    return AI_NAMES[WW.normalizeAiLevel(level)] || "";
  }

  function isAutoAiName(value) {
    const name = String(value || "").trim().toLowerCase();
    if (!name || name === "cpu") return true;
    return Object.keys(AI_NAMES).some(function (key) {
      return AI_NAMES[key].toLowerCase() === name;
    });
  }

  function paintRowAi(row) {
    const on = row.dataset.ai === "1";
    const level = WW.normalizeAiLevel(row.dataset.aiLevel);
    const year = AI_YEARS[level] || "";
    row.classList.toggle("is-ai", on);
    const btn = row.querySelector(".player-ai");
    if (!btn) return;
    btn.textContent = "Add\nAI";
    btn.classList.toggle("is-on", on);
    btn.removeAttribute("role");
    btn.removeAttribute("aria-checked");
    btn.setAttribute("aria-pressed", on ? "true" : "false");
    const rows = nameFieldsEl.querySelectorAll(".player-row");
    const index = Array.prototype.indexOf.call(rows, row);
    btn.setAttribute(
      "aria-label",
      on
        ? "Player " + (index + 1) + " AI, " + year + ". Change or remove."
        : "Add AI for player " + (index + 1)
    );
    btn.setAttribute(
      "data-tip",
      on ? "Change or remove this AI" : "Add an Average Individual"
    );
  }

  function paintAiModal() {
    if (!aiEl) return;
    const level = aiTargetRow && WW.normalizeAiLevel(aiTargetRow.dataset.aiLevel);
    Array.prototype.forEach.call(aiEl.querySelectorAll(".ai-choice"), function (btn) {
      const on = btn.getAttribute("data-ai-level") === level;
      btn.classList.toggle("is-on", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    });
    const isAi = Boolean(aiTargetRow && aiTargetRow.dataset.ai === "1");
    const removeBtn = document.getElementById("ai-remove-btn");
    if (removeBtn) removeBtn.hidden = !isAi;
    const kickerEl = document.getElementById("ai-kicker");
    if (kickerEl) {
      kickerEl.textContent = isAi
        ? "editing an Average Individual"
        : "adding an Average Individual";
    }
  }

  function openAiModal(row, trigger) {
    if (!aiEl) return;
    aiTargetRow = row;
    paintAiModal();
    openOverlay(aiEl, trigger);
  }

  function applyAiLevel(level) {
    const normalized = WW.normalizeAiLevel(level);
    if (!normalized) return;
    if (isOnline() && onlineView && onlineView.screen === "lobby") {
      if (!aiTargetRow) {
        net.send({
          type: "ADD_AI",
          level: normalized,
          name: aiNameForLevel(normalized),
        });
      } else if (aiTargetRow.dataset.seatId) {
        net.send({
          type: "SET_AI",
          seatId: aiTargetRow.dataset.seatId,
          level: normalized,
        });
      }
      closeOverlay(aiEl);
      return;
    }
    if (!aiTargetRow) return;
    aiTargetRow.dataset.ai = "1";
    aiTargetRow.dataset.aiLevel = normalized;
    const input = aiTargetRow.querySelector(".player-name-input");
    if (input && isAutoAiName(input.value)) {
      input.value = aiNameForLevel(normalized);
      paintRowAvatar(aiTargetRow);
    }
    paintRowAi(aiTargetRow);
    closeOverlay(aiEl);
  }

  function clearAi() {
    if (isOnline() && aiTargetRow && aiTargetRow.dataset.seatId) {
      net.send({ type: "REMOVE_SEAT", seatId: aiTargetRow.dataset.seatId });
      closeOverlay(aiEl);
      return;
    }
    if (!aiTargetRow) return;
    aiTargetRow.dataset.ai = "";
    aiTargetRow.dataset.aiLevel = "";
    const input = aiTargetRow.querySelector(".player-name-input");
    if (input && isAutoAiName(input.value)) {
      input.value = "";
      paintRowAvatar(aiTargetRow);
    }
    paintRowAi(aiTargetRow);
    closeOverlay(aiEl);
  }

  function uniquePlayerColor(requested, taken) {
    const blocked = (taken || []).map(function (color) {
      return String(color || "").toLowerCase();
    });
    const wanted = String(requested || "").trim().toLowerCase();
    if (wanted && blocked.indexOf(wanted) === -1) {
      return requested || PLAYER_COLORS[0];
    }
    for (let i = 0; i < PLAYER_COLORS.length; i += 1) {
      if (blocked.indexOf(PLAYER_COLORS[i].toLowerCase()) === -1) {
        return PLAYER_COLORS[i];
      }
    }
    return requested || PLAYER_COLORS[0];
  }

  function colorSwatchesHtml(selected, taken) {
    const blocked = (taken || []).map(function (color) {
      return String(color || "").toLowerCase();
    });
    const mine = String(selected || "").toLowerCase();
    return (
      '<div class="player-colors" role="group" aria-label="Choose a color">' +
      PLAYER_COLORS.map(function (color) {
        const value = color.toLowerCase();
        const selectedClass = value === mine ? " is-selected" : "";
        const takenClass =
          blocked.indexOf(value) !== -1 && value !== mine ? " is-taken" : "";
        return (
          '<button type="button" class="color-swatch' +
          selectedClass +
          takenClass +
          '" data-color="' +
          color +
          '" style="background:' +
          color +
          '" aria-label="' +
          colorName(color) +
          '"' +
          (takenClass ? " disabled" : "") +
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
          isAi: row.dataset.ai === "1",
          aiLevel: row.dataset.aiLevel || "",
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
    const assigned = [];
    for (let i = 0; i < setupCount; i += 1) {
      const wrap = document.createElement("div");
      wrap.className = "player-row";
      const id = "player-name-" + (i + 1);
      const placeholder = playerPlaceholder(i);
      const saved = existing[i] || {};
      const color = uniquePlayerColor(
        saved.color || PLAYER_COLORS[i] || PLAYER_COLORS[0],
        assigned
      );
      assigned.push(color);
      wrap.dataset.color = color;
      wrap.innerHTML =
        '<div class="player-avatar" aria-hidden="true"></div>' +
        '<div class="field">' +
        '<label for="' +
        id +
        '">PLAYER ' +
        (i + 1) +
        "</label>" +
        '<div class="player-name-row">' +
        '<div class="player-name-wrap">' +
        '<input class="player-name-input" id="' +
        id +
        '" data-index="' +
        i +
        '" maxlength="24" autocomplete="off" placeholder="' +
        placeholder +
        '" />' +
        '<button type="button" class="player-name-edit" tabindex="-1" aria-label="Edit player ' +
        (i + 1) +
        ' name">' +
        '<span class="icon icon-pencil" aria-hidden="true">' +
        '<img src="assets/pencil.svg" alt="" width="14" height="14" />' +
        "</span></button></div>" +
        '<button type="button" class="player-ai" data-tip-align="end">Add AI</button></div>' +
        '<div class="player-tools">' +
        colorSwatchesHtml(color, assigned.slice(0, -1)) +
        "</div>" +
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
      wrap.dataset.ai = saved.isAi ? "1" : "";
      wrap.dataset.aiLevel = saved.aiLevel || "";
      nameFieldsEl.appendChild(wrap);
      paintRowAvatar(wrap);
      paintRowAi(wrap);
    }
    const firstRow = nameFieldsEl.querySelector(".player-row");
    if (firstRow) paintRowSwatches(firstRow);
    const addBtn = document.getElementById("player-plus");
    if (addBtn) addBtn.hidden = setupCount >= WW.MAX_PLAYERS;
    paintRounds();
  }

  function paintRounds() {
    setupRounds = WW.clampRounds(setupRounds);
    const valueEl = document.getElementById("rounds-value");
    const minusBtn = document.getElementById("rounds-minus");
    const plusBtn = document.getElementById("rounds-plus");
    if (valueEl) valueEl.textContent = String(setupRounds);
    if (minusBtn) minusBtn.disabled = setupRounds <= WW.MIN_ROUNDS;
    if (plusBtn) plusBtn.disabled = setupRounds >= WW.MAX_ROUNDS;
  }

  function render() {
    paintDeviceCopy();
    paintScoreboard();
    paintPplChart();
    updateRestartButton();
    document.body.classList.toggle("is-online", isOnline());
    if (flow === "mode") {
      showScreen("mode");
      stopAi();
      prevPhase = "mode";
      return;
    }
    if (flow === "online-pick") {
      showScreen("online");
      stopAi();
      prevPhase = "online";
      return;
    }
    if (flow === "join") {
      showScreen("join");
      buildJoinKeyboard();
      paintJoinBoard();
      stopAi();
      prevPhase = "join";
      return;
    }
    if (flow === "kicked") {
      showScreen("kicked");
      stopAi();
      prevPhase = "kicked";
      return;
    }
    if (isOnline() && onlineView.screen === "lobby") {
      showScreen("lobby");
      paintLobby();
      shopEl.hidden = true;
      stopAi();
      prevPhase = "lobby";
      return;
    }
    if (isOnline() && onlineView.waiting && state.phase !== "game_over") {
      showScreen("wait");
      paintWait();
      shopOpen = false;
      shopEl.hidden = true;
      prevPhase = "wait";
      return;
    }
    const phaseChanged = prevPhase !== state.phase;
    if (state.phase === "setup") {
      showScreen("setup");
      paintSetup();
      shopEl.hidden = true;
      shopWasOpen = false;
      syncBackgroundInert();
      prevPhase = state.phase;
      stopAi();
      return;
    }
    if (state.phase === "handoff") {
      showScreen("handoff");
      try {
        paintHandoff();
      } catch (err) {
        console.error("Handoff render failed", err);
      }
      if (phaseChanged) {
        lastTimerCue = 0;
        const player = WW.currentPlayer(state);
        const pendingHostile = (player && player.pendingEffects || []).some(
          function (effect) {
            return effect.type === "hostile_takeover";
          }
        );
        announce(
          handoffNameEl.textContent +
            (pendingHostile ? ". " + hostileMissHint() : "")
        );
        window.setTimeout(function () {
          if (state.phase === "handoff" && !shopOpen && !isAiSeat()) {
            handoffNameEl.focus();
          }
        }, 0);
      }
      try {
        syncBackgroundInert();
      } catch (err) {
        console.error("Overlay sync failed", err);
      }
      prevPhase = state.phase;
      queueAi();
      return;
    }
    if (state.phase === "playing" || state.phase === "revealing" || state.phase === "spinning") {
      showScreen("play");
      shopOpen = false;
      shopEl.hidden = true;
      shopItemsEl.innerHTML = "";
      if (shopScoresEl) shopScoresEl.innerHTML = "";
      shopWasOpen = false;
      try {
        buildKeyboard();
      } catch (err) {
        console.error("Keyboard failed to build", err);
      }
      try {
        paintBoard();
        paintPlayChrome();
      } catch (err) {
        console.error("Play render failed", err);
      }
      if (state.phase === "playing") {
        focusLetterInput();
        if (phaseChanged) {
          lastTimerCue = 0;
          const player = WW.currentPlayer(state);
          if (player) {
            announce(
              player.name +
                " is playing" +
                (hasHostileTakeover() ? ". " + hostileMissHint() : "")
            );
          }
        }
      } else if (state.phase === "spinning" && phaseChanged && hasHostileTakeover()) {
        announce(hostileMissHint());
        letterInput && letterInput.blur();
      } else if (letterInput) {
        letterInput.blur();
      }
      syncBackgroundInert();
      prevPhase = state.phase;
      queueAi();
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
    queueAi();
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

  function readAis() {
    return Array.from(nameFieldsEl.querySelectorAll(".player-row")).map(
      function (row) {
        return row.dataset.ai === "1";
      }
    );
  }

  function readAiLevels() {
    return Array.from(nameFieldsEl.querySelectorAll(".player-row")).map(
      function (row) {
        return row.dataset.ai === "1"
          ? WW.normalizeAiLevel(row.dataset.aiLevel) || "intermediate"
          : "";
      }
    );
  }

  function buildKeyboard() {
    fillKeyboard(keyboardEl, true);
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
    if (!letterInput || state.phase !== "playing" || isAiSeat()) return;
    if (isOnline() && !isMyTurn()) return;
    if (document.activeElement !== letterInput) {
      letterInput.focus({ preventScroll: true });
    }
  }

  function handleKey(key) {
    if (shopOpen && key === "ESCAPE") {
      setShopOpen(false);
      return;
    }
    if (pplEl && !pplEl.hidden && key === "ESCAPE") {
      closeOverlay(pplEl);
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
    if (aiEl && !aiEl.hidden && key === "ESCAPE") {
      closeOverlay(aiEl);
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
    if (flow === "join") {
      if (/^[A-Z]$/.test(key) || key === "BACKSPACE" || key === "ENTER") {
        handleJoinKey(key);
      }
      return;
    }
    if (isOnline() && !isMyTurn() && state.phase !== "game_over") return;
    if (isAiSeat() && state.phase === "playing") return;
    if (state.phase === "handoff" && (key === "ENTER" || key === " ") && !shopOpen) {
      dispatch({ type: "READY", nowMs: Date.now() });
      return;
    }
    if (state.phase === "game_over" && key === "ENTER") {
      if (isOnline()) {
        if (onlineView.you && onlineView.you.isHost) net.send({ type: "RESET" });
        return;
      }
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
      if (state.blockBackspace) return;
      dispatch({ type: "BACKSPACE" });
      return;
    }
    if (/^[A-Z]$/.test(key)) {
      dispatch({ type: "TYPE", letter: key });
    }
  }

  function pulseTimer() {
    const now = Date.now();
    if (now - lastTickAt < 40) return;
    lastTickAt = now;
    if (
      (state.phase === "playing" || state.phase === "spinning") &&
      !overlayOpen()
    ) {
      if (isOnline()) {
        paintTimer();
        return;
      }
      dispatch({ type: "TICK", nowMs: now });
    }
  }

  function tick() {
    try {
      pulseTimer();
    } finally {
      rafId = window.requestAnimationFrame(tick);
    }
  }

  const modeLocalBtn = document.getElementById("mode-local-btn");
  const modeOnlineBtn = document.getElementById("mode-online-btn");
  if (modeLocalBtn) {
    modeLocalBtn.addEventListener("click", function () {
      flow = "local";
      render();
      const begin = document.getElementById("start-btn");
      if (begin) begin.focus();
    });
  }
  if (modeOnlineBtn) {
    modeOnlineBtn.addEventListener("click", function () {
      flow = "online-pick";
      render();
    });
  }
  const onlineHostBtn = document.getElementById("online-host-btn");
  const onlineJoinBtn = document.getElementById("online-join-btn");
  const onlineBackBtn = document.getElementById("online-back-btn");
  if (onlineHostBtn) {
    onlineHostBtn.addEventListener("click", startHosting);
  }
  if (onlineJoinBtn) {
    onlineJoinBtn.addEventListener("click", goToJoin);
  }
  if (onlineBackBtn) {
    onlineBackBtn.addEventListener("click", function () {
      flow = "mode";
      render();
    });
  }
  const joinBackBtn = document.getElementById("join-back-btn");
  if (joinBackBtn) {
    joinBackBtn.addEventListener("click", function () {
      flow = "online-pick";
      render();
    });
  }
  const kickedLeaveBtn = document.getElementById("kicked-leave-btn");
  const kickedJoinBtn = document.getElementById("kicked-join-btn");
  if (kickedLeaveBtn) {
    kickedLeaveBtn.addEventListener("click", function () {
      flow = "mode";
      render();
    });
  }
  if (kickedJoinBtn) {
    kickedJoinBtn.addEventListener("click", goToJoin);
  }
  const joinKeyboard = document.getElementById("join-keyboard");
  if (joinKeyboard) {
    joinKeyboard.addEventListener("pointerdown", function (event) {
      const key = event.target.closest("[data-key]");
      if (!key) return;
      event.preventDefault();
      handleJoinKey(key.dataset.key);
    });
  }
  const lobbyCopyBtn = document.getElementById("lobby-copy-btn");
  if (lobbyCopyBtn) {
    lobbyCopyBtn.addEventListener("click", function () {
      const code = (onlineView && onlineView.code) || net.code();
      const link = roomInviteUrl(code);
      if (!code) return;
      const done = function (label) {
        lobbyCopyBtn.textContent = label;
        window.clearTimeout(lobbyCopyFlash);
        lobbyCopyFlash = window.setTimeout(function () {
          lobbyCopyBtn.textContent = "Copy game link";
        }, 1400);
      };
      const payload = {
        title: "wordsus",
        text: "Join my wordsus room. The code is " + code + ".",
        url: link,
      };
      const copyLink = function () {
        if (!navigator.clipboard || !navigator.clipboard.writeText) return;
        navigator.clipboard.writeText(link).then(function () {
          done("Copied");
        });
      };
      if (navigator.share) {
        navigator.share(payload)
          .then(function () {
            done("Shared");
          })
          .catch(function () {
            copyLink();
          });
        return;
      }
      copyLink();
    });
  }
  const lobbyReadyBtn = document.getElementById("lobby-ready-btn");
  if (lobbyReadyBtn) {
    lobbyReadyBtn.addEventListener("click", function () {
      if (!onlineView || !onlineView.you || onlineView.you.isHost) return;
      net.send({ type: "SET_READY", ready: !onlineView.you.ready });
    });
  }
  const lobbyStartBtn = document.getElementById("lobby-start-btn");
  if (lobbyStartBtn) {
    lobbyStartBtn.addEventListener("click", function () {
      net.send({ type: "START" });
    });
  }
  const lobbyAiBtn = document.getElementById("lobby-ai-btn");
  if (lobbyAiBtn) {
    lobbyAiBtn.addEventListener("click", function () {
      aiTargetRow = null;
      openAiModal(null, lobbyAiBtn);
    });
  }
  const lobbyRoundsMinus = document.getElementById("lobby-rounds-minus");
  const lobbyRoundsPlus = document.getElementById("lobby-rounds-plus");
  if (lobbyRoundsMinus) {
    lobbyRoundsMinus.addEventListener("click", function () {
      if (!onlineView || !onlineView.you || !onlineView.you.isHost) return;
      net.send({ type: "SET_ROUNDS", rounds: onlineView.rounds - 1 });
    });
  }
  if (lobbyRoundsPlus) {
    lobbyRoundsPlus.addEventListener("click", function () {
      if (!onlineView || !onlineView.you || !onlineView.you.isHost) return;
      net.send({ type: "SET_ROUNDS", rounds: onlineView.rounds + 1 });
    });
  }
  const lobbyLeaveBtn = document.getElementById("lobby-leave-btn");
  if (lobbyLeaveBtn) {
    lobbyLeaveBtn.addEventListener("click", leaveOnline);
  }
  const lobbyRoster = document.getElementById("lobby-roster");
  if (lobbyRoster) {
    lobbyRoster.addEventListener("input", function (event) {
      const row = event.target.closest(".player-row");
      if (!row) return;
      if (event.target.classList.contains("player-name-input")) {
        net.send({ type: "SET_NAME", name: event.target.value });
        paintRowAvatar(row);
        return;
      }
      if (event.target.type === "color") {
        const taken = Array.from(lobbyRoster.querySelectorAll(".player-row"))
          .filter(function (other) {
            return other !== row;
          })
          .map(function (other) {
            return other.dataset.color;
          });
        row.dataset.color = uniquePlayerColor(event.target.value, taken);
        net.send({ type: "SET_COLOR", color: row.dataset.color });
        paintRowAvatar(row);
        paintRowSwatches(row);
      }
    });
    lobbyRoster.addEventListener("click", function (event) {
      const editBtn = event.target.closest(".player-name-edit");
      if (editBtn) {
        const row = editBtn.closest(".player-row");
        const input = row && row.querySelector(".player-name-input");
        if (input && !input.readOnly) input.focus();
        return;
      }
      const removeBtn = event.target.closest(".remove-player");
      if (removeBtn) {
        net.send({ type: "REMOVE_SEAT", seatId: removeBtn.getAttribute("data-seat-id") });
        return;
      }
      const swatch = event.target.closest(".color-swatch[data-color]");
      if (!swatch || swatch.disabled || swatch.classList.contains("is-taken")) {
        return;
      }
      const row = swatch.closest(".player-row");
      if (!row) return;
      const color = swatch.getAttribute("data-color");
      row.dataset.color = color;
      net.send({ type: "SET_COLOR", color: color });
      paintRowAvatar(row);
      paintRowSwatches(row);
    });
  }

  const setupBackBtn = document.getElementById("setup-back-btn");
  if (setupBackBtn) {
    setupBackBtn.addEventListener("click", function () {
      flow = "mode";
      render();
    });
  }

  document.getElementById("player-plus").addEventListener("click", function () {
    setupCount = Math.min(WW.MAX_PLAYERS, setupCount + 1);
    paintSetup();
  });

  document.getElementById("rounds-minus").addEventListener("click", function () {
    setupRounds = WW.clampRounds(setupRounds - 1);
    paintRounds();
  });

  document.getElementById("rounds-plus").addEventListener("click", function () {
    setupRounds = WW.clampRounds(setupRounds + 1);
    paintRounds();
  });

  document.getElementById("start-btn").addEventListener("click", function () {
    try {
      closeStrayAiOverlays();
    } catch (err) {
      console.error("AI overlay close failed", err);
    }
    dispatch({
      type: "START",
      playerCount: setupCount,
      names: readNames(),
      colors: readColors(),
      ais: readAis(),
      aiLevels: readAiLevels(),
      turnsPerPlayer: setupRounds,
    });
    queueAi();
  });

  nameFieldsEl.addEventListener("input", function (event) {
    const row = event.target.closest(".player-row");
    if (!row) return;
    if (event.target.classList.contains("player-name-input")) {
      paintRowAvatar(row);
      return;
    }
    if (event.target.type === "color") {
      const taken = Array.from(nameFieldsEl.querySelectorAll(".player-row"))
        .filter(function (other) {
          return other !== row;
        })
        .map(function (other) {
          return other.dataset.color;
        });
      row.dataset.color = uniquePlayerColor(event.target.value, taken);
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
    const aiBtn = event.target.closest(".player-ai");
    if (aiBtn) {
      const row = aiBtn.closest(".player-row");
      if (!row) return;
      openAiModal(row, aiBtn);
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
    if (!swatch || swatch.disabled || swatch.classList.contains("is-taken")) {
      return;
    }
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

  shopItemsEl.addEventListener("change", function (event) {
    if (!event.target.closest(".shop-item-target")) return;
    paintShop();
  });

  shopEl.addEventListener("click", function (event) {
    if (event.target === shopEl) setShopOpen(false);
  });

  rulesEl.addEventListener("click", function (event) {
    if (event.target === rulesEl || event.target.classList.contains("rules-wrapper")) {
      closeOverlay(rulesEl);
    }
  });

  if (pplEl) {
    pplEl.addEventListener("click", function (event) {
      if (event.target === pplEl) closeOverlay(pplEl);
    });
  }

  restartEl.addEventListener("click", function (event) {
    if (event.target === restartEl) closeOverlay(restartEl);
  });

  if (aiEl) {
    aiEl.addEventListener("click", function (event) {
      if (event.target === aiEl) closeOverlay(aiEl);
      const choice = event.target.closest(".ai-choice");
      if (choice) applyAiLevel(choice.getAttribute("data-ai-level"));
    });
    const aiCloseBtn = document.getElementById("ai-close-btn");
    if (aiCloseBtn) {
      aiCloseBtn.addEventListener("click", function () {
        closeOverlay(aiEl);
      });
    }
    const aiRemoveBtn = document.getElementById("ai-remove-btn");
    if (aiRemoveBtn) aiRemoveBtn.addEventListener("click", clearAi);
  }

  onboardingEl.addEventListener("click", function (event) {
    if (event.target === onboardingEl) completeOnboarding();
  });

  onboardingSkipBtn.addEventListener("click", completeOnboarding);
  onboardingBackBtn.addEventListener("click", prevOnboardingStep);
  onboardingNextBtn.addEventListener("click", nextOnboardingStep);

  onboardingDotsEl.addEventListener("click", function (event) {
    const dot = event.target.closest("[data-step]");
    if (!dot) return;
    goToOnboardingStep(Number(dot.dataset.step));
  });

  document.getElementById("again-btn").addEventListener("click", function () {
    if (isOnline()) {
      if (onlineView.you && onlineView.you.isHost) net.send({ type: "RESET" });
      else leaveOnline();
      return;
    }
    setupCount = Math.max(state.players.length, 2);
    dispatch({ type: "RESET" });
  });

  document.getElementById("rules-btn").addEventListener("click", function () {
    openOnboarding(rulesBtn);
  });

  document.getElementById("rules-close-btn").addEventListener("click", function () {
    closeOverlay(rulesEl);
  });

  if (pplBtn) {
    pplBtn.addEventListener("click", function () {
      openOverlay(pplEl, pplBtn);
    });
  }

  if (pplCloseBtn) {
    pplCloseBtn.addEventListener("click", function () {
      closeOverlay(pplEl);
    });
  }

  document
    .getElementById("rules-view-pointsperletter-btn")
    .addEventListener("click", function () {
      rulesEl.hidden = true;
      openOverlay(pplEl, pplBtn || rulesBtn);
    });


  document.getElementById("restart-btn").addEventListener("click", function () {
    if (state.phase === "setup") return;
    const lede = document.getElementById("restart-lede");
    if (lede) {
      lede.textContent = isOnline()
        ? "This ends the match for everyone and returns the table to the lobby."
        : "This wipes the current scores and returns everyone to setup.";
    }
    openOverlay(restartEl, restartBtn);
  });

  document.getElementById("restart-cancel-btn").addEventListener("click", function () {
    closeOverlay(restartEl);
  });

  document.getElementById("restart-confirm-btn").addEventListener("click", function () {
    closeOverlay(restartEl);
    if (isOnline()) {
      if (onlineView.you && onlineView.you.isHost) net.send({ type: "RESET" });
      else leaveOnline();
      return;
    }
    setupCount = Math.max(state.players.length, 2);
    dispatch({ type: "RESET" });
  });

  document.getElementById("share-btn").addEventListener("click", function () {
    shareWordsus("share-label");
  });

  if (landingShareBtn) {
    landingShareBtn.addEventListener("click", function () {
      shareWordsus("landing-share-label");
    });
  }

  if (landingRulesBtn) {
    landingRulesBtn.addEventListener("click", function () {
      openOnboarding(landingRulesBtn);
    });
  }

  if (landingReadyBtn) {
    landingReadyBtn.addEventListener("click", enterGameFromLanding);
  }

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

      if (flow === "join" && (key === "BACKSPACE" || key === "ENTER" || /^[A-Z]$/.test(key))) {
        event.preventDefault();
        handleKey(key);
        return;
      }

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
  if (handoffEffectListEl) {
    handoffEffectListEl.addEventListener("click", onEffectListClick);
  }
  if (playEffectListEl) {
    playEffectListEl.addEventListener("click", onEffectListClick);
  }
  document.addEventListener("click", function (event) {
    if (event.target.closest(".effect-chip")) return;
    closeEffectTips();
  });

  if (demoKey && WW.getDemoState) {
    if (landingEl) {
      landingEl.hidden = true;
      onLanding = false;
    }
    if (appEl) appEl.hidden = false;
    const demoState = WW.getDemoState(demoKey);
    if (demoState) {
      flow = "local";
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
      if (demoKey === "landing" && landingEl) {
        landingEl.hidden = false;
        onLanding = true;
        if (appEl) appEl.hidden = true;
      }
    }
  }

  if (demoKey === "ppl" && pplEl) {
    pplEl.hidden = false;
    if (pplBtn) pplBtn.setAttribute("aria-expanded", "true");
  }

  try {
    buildKeyboard();
  } catch (err) {
    console.error("Keyboard failed to build", err);
  }
  render();
  syncBackgroundInert();

  if (demoKey && state.phase === "spinning") {
    window.requestAnimationFrame(function () {
      startSpin();
    });
  }

  if (!demoKey) {
    tick();
    window.setInterval(pulseTimer, 250);
  }

  if (onLanding) {
    startLandingTypewriter();
  }
})();
