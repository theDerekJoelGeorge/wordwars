(function (root) {
  const WW = root.WordWars || (root.WordWars = {});

  WW.TIME_TAX_MS = 10000;
  WW.MIN_TURN_MS = 5000;
  WW.HEIST_AMOUNT = 5;
  WW.ROBIN_HOOD_AMOUNT = 10;
  WW.TOO_QUICK_MS = 10000;
  WW.TOO_LATE_MS = 20000;
  WW.SCORE_PENALTY = 0.5;
  WW.MYSTERY_GIFT_POINTS = 10;
  WW.MYSTERY_TIME_BONUS_MS = 5000;
  WW.MYSTERY_REFUND_AMOUNT = 20;
  WW.MAX_TURN_MS = 45000;

  WW.SHOP_ITEMS = [
    {
      id: "time_tax",
      name: "Time Tax",
      cost: 6,
      description: "Take 10 seconds away from a rival's next turn.",
      icon: "assets/sabotage-time-tax.svg",
    },
    {
      id: "too_quick",
      name: "Too Quick",
      cost: 7,
      description: "Rival scores half points if they submit in under 10 seconds.",
      icon: "assets/sabotage-too-quick.svg",
    },
    {
      id: "too_late",
      name: "Too Late",
      cost: 7,
      description: "Rival scores half points if they submit after 20 seconds.",
      icon: "assets/sabotage-too-late.svg",
    },
    {
      id: "tunnel_vision",
      name: "Tunnel Vision",
      cost: 7,
      description: "Rival only sees their latest letter; earlier tiles show as asterisks.",
      icon: "assets/sabotage-tunnel-vision.svg",
    },
    {
      id: "heist",
      name: "Point Heist",
      cost: 8,
      description: "Steal 5 points from a rival immediately.",
      icon: "assets/sabotage-heist.svg",
      immediate: true,
    },
    {
      id: "no_scope",
      name: "420 No Scope",
      cost: 8,
      description: "Rival must type their word backwards (right to left).",
      icon: "assets/sabotage-no-scope.svg",
    },
    {
      id: "obsession",
      name: "Obsession",
      cost: 8,
      description: "Rival must include a letter of your choosing in their word.",
      icon: "assets/sabotage-obsession.svg",
      needsLetter: true,
    },
    {
      id: "clock_block",
      name: "Clock Block",
      cost: 10,
      description: "Hide the timer for a rival's next turn.",
      icon: "assets/sabotage-clock-block.svg",
    },
    {
      id: "double_trouble",
      name: "Double Trouble",
      cost: 10,
      description: "Freeze 2 letters from the last word for a rival.",
      icon: "assets/sabotage-double-trouble.svg",
    },
    {
      id: "robin_hood",
      name: "Robin Hood",
      cost: 12,
      description: "Take 10 points from 1st place and split them among everyone else.",
      icon: "assets/sabotage-robin-hood.svg",
      noTarget: true,
    },
    {
      id: "triple_trouble",
      name: "Triple Trouble",
      cost: 14,
      description: "Freeze 3 letters from the last word for a rival.",
      icon: "assets/sabotage-triple-trouble.svg",
    },
    {
      id: "not_today",
      name: "Not Today",
      cost: 15,
      description: "Gain immunity from the next sabotage by a chosen rival.",
      icon: "assets/sabotage-not-today.svg",
      selfEffect: true,
    },
    {
      id: "hostile_takeover",
      name: "Hostile Takeover",
      cost: 18,
      description: "Take over all points your rival earns on their next turn.",
      icon: "assets/sabotage-hostile-takeover.svg",
    },
    {
      id: "mystery",
      name: "Mystery",
      cost: 20,
      description: "Prank gamble — could backfire, do nothing, or devastate your rival.",
      icon: "assets/sabotage-mystery.svg",
    },
  ];

  WW.MYSTERY_OUTCOMES = [
    { type: "mystery_nothing", weight: 3 },
    { type: "mystery_bankrupt_buyer", weight: 2 },
    { type: "mystery_swap_all", weight: 2 },
    { type: "mystery_jackpot", weight: 2 },
    { type: "mystery_refund", weight: 2 },
    { type: "mystery_gift", weight: 2 },
    { type: "mystery_time", weight: 2 },
    { type: "time_tax", weight: 2 },
    { type: "clock_block", weight: 2 },
    { type: "double_trouble", weight: 2 },
    { type: "too_quick", weight: 2 },
    { type: "too_late", weight: 2 },
    { type: "tunnel_vision", weight: 2 },
    { type: "no_scope", weight: 1 },
    { type: "hostile_takeover", weight: 1 },
    { type: "triple_trouble", weight: 1 },
  ];

  WW.pickMysteryOutcome = function pickMysteryOutcome(rng) {
    const random = rng || Math.random;
    const pool = WW.MYSTERY_OUTCOMES;
    let total = 0;
    pool.forEach(function (entry) {
      total += entry.weight;
    });
    let roll = random() * total;
    for (let i = 0; i < pool.length; i += 1) {
      roll -= pool[i].weight;
      if (roll <= 0) return pool[i].type;
    }
    return pool[pool.length - 1].type;
  };

  WW.mysteryOutcomeLabel = function mysteryOutcomeLabel(type) {
    if (type === "mystery_nothing") return "Nothing Happened";
    if (type === "mystery_bankrupt_buyer") return "Bankrupt";
    if (type === "mystery_swap_all") return "Score Shuffle";
    if (type === "mystery_jackpot") return "Jackpot";
    if (type === "mystery_refund") return "Refund";
    if (type === "mystery_gift") return "Lucky Bonus (+" + WW.MYSTERY_GIFT_POINTS + " pts)";
    if (type === "mystery_time") return "Extra Time (+5s)";
    const item = WW.getShopItem(type);
    return item ? item.name : String(type || "");
  };

  WW.mysteryOutcomeDescription = function mysteryOutcomeDescription(type) {
    if (type === "mystery_nothing") {
      return "The prank fizzled — absolutely nothing happened.";
    }
    if (type === "mystery_bankrupt_buyer") {
      return "All of the buyer's points were transferred to this rival.";
    }
    if (type === "mystery_swap_all") {
      return "Everyone's scores were shuffled around the table.";
    }
    if (type === "mystery_jackpot") {
      return "The buyer stole all of this rival's points.";
    }
    if (type === "mystery_refund") {
      return "The buyer got their 20 points back.";
    }
    if (type === "mystery_gift") {
      return "This rival gained " + WW.MYSTERY_GIFT_POINTS + " bonus points.";
    }
    if (type === "mystery_time") {
      return "This rival gets +5 seconds on their turn.";
    }
    const item = WW.getShopItem(type);
    return item ? item.description : "";
  };

  WW.effectIcon = function effectIcon(type) {
    const item = WW.getShopItem(type);
    if (item) return item.icon;
    if (type === "immunity") return "assets/sabotage-not-today.svg";
    if (type === "mystery_gift" || type === "mystery_time" || type === "mystery_nothing" ||
        type === "mystery_bankrupt_buyer" || type === "mystery_swap_all" ||
        type === "mystery_jackpot" || type === "mystery_refund") {
      return "assets/sabotage-mystery.svg";
    }
    return "";
  };

  WW.effectLabel = function effectLabel(type, effect) {
    if (type === "time_tax") return "-10s";
    if (type === "clock_block") return "no timer";
    if (type === "immunity") return "not today";
    if (type === "double_trouble") return "2 frozen";
    if (type === "triple_trouble") return "3 frozen";
    if (type === "no_scope") return "backwards";
    if (type === "too_quick") return "<10s = half";
    if (type === "too_late") return ">20s = half";
    if (type === "tunnel_vision") return "tunnel";
    if (type === "obsession" && effect && effect.letter) {
      return "need " + effect.letter;
    }
    if (type === "mystery") return "???";
    if (type === "mystery_nothing") return "nothing";
    if (type === "mystery_bankrupt_buyer") return "bankrupt";
    if (type === "mystery_swap_all") return "shuffle";
    if (type === "mystery_jackpot") return "jackpot";
    if (type === "mystery_refund") return "refund";
    if (type === "mystery_gift") return "+" + WW.MYSTERY_GIFT_POINTS;
    if (type === "mystery_time") return "+5s";
    if (type === "mystery_resolved" && effect && effect.resolvedType) {
      return WW.effectLabel(effect.resolvedType, effect);
    }
    const item = WW.getShopItem(type);
    return item ? item.name.toLowerCase() : String(type || "").toLowerCase();
  };

  WW.getShopItem = function getShopItem(itemId) {
    return (
      WW.SHOP_ITEMS.find(function (item) {
        return item.id === itemId;
      }) || null
    );
  };

  WW.normalizeLetter = function normalizeLetter(value) {
    const letter = String(value || "")
      .toUpperCase()
      .replace(/[^A-Z]/g, "");
    return letter.length === 1 ? letter : "";
  };

  WW.canBuySabotage = function canBuySabotage(
    state,
    buyerIndex,
    itemId,
    targetId,
    letter
  ) {
    if (state.phase !== "handoff") {
      return { ok: false, reason: "wrong_phase" };
    }
    if (state.players.length < 2) {
      return { ok: false, reason: "no_targets" };
    }
    const item = WW.getShopItem(itemId);
    if (!item) {
      return { ok: false, reason: "invalid_item" };
    }
    const buyer = state.players[buyerIndex];
    if (!buyer || buyer.score < item.cost) {
      return { ok: false, reason: "insufficient_funds" };
    }

    if (item.noTarget) {
      return {
        ok: true,
        item: item,
        buyerIndex: buyerIndex,
        targetIndex: -1,
      };
    }

    if (targetId === buyer.id) {
      return { ok: false, reason: "self_target" };
    }
    const targetIndex = state.players.findIndex(function (player) {
      return player.id === targetId;
    });
    if (targetIndex < 0) {
      return { ok: false, reason: "invalid_target" };
    }

    if (item.needsLetter && !WW.normalizeLetter(letter)) {
      return { ok: false, reason: "missing_letter" };
    }

    return {
      ok: true,
      item: item,
      buyerIndex: buyerIndex,
      targetIndex: targetIndex,
    };
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
