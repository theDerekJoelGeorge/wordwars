(function (root) {
  const WW = root.WordWars || (root.WordWars = {});

  WW.TIME_TAX_MS = 10000;
  WW.MIN_TURN_MS = 5000;
  WW.MAX_TURN_MS = 45000;
  WW.HEIST_AMOUNT = 5;
  WW.ROBIN_HOOD_AMOUNT = 15;
  WW.HOSTILE_TAKEOVER_MISS_PENALTY = 15;
  WW.TOO_QUICK_MS = 10000;
  WW.TOO_LATE_MS = 20000;
  WW.SCORE_PENALTY = 0.5;
  WW.MYSTERY_GIFT_POINTS = 10;
  WW.MYSTERY_TIME_BONUS_MS = 5000;
  WW.MYSTERY_REFUND_AMOUNT = 20;
  WW.SUI_VOWEL_POINTS = 7;

  WW.countVowels = function countVowels(word) {
    return String(word || "")
      .toUpperCase()
      .replace(/[^AEIOU]/g, "").length;
  };

  WW.sabotagePrice = function sabotagePrice(item, target) {
    if (!item) return 0;
    if (item.noTarget || !target || !target.notCheap) return item.cost;
    return item.cost * 2;
  };

  WW.SHOP_ITEMS = [
    {
      id: "time_tax",
      name: "Time Tax",
      cost: 6,
      description: "Take away 10 sec from a rival's turn.",
      icon: "assets/sabotage-time-tax.svg",
    },
    {
      id: "ppl_shuffle",
      name: "PPL shuffle",
      cost: 7,
      description: "Shuffle the points per letter for the rest of the game.",
      icon: "assets/sabotage-middle.svg",
      noTarget: true,
      note: "Affects every player in the game.",
    },
    {
      id: "tunnel_vision",
      name: "Tunnel Vision",
      cost: 8,
      description: "Rival only sees their latest letter; earlier tiles show as asterisks.",
      icon: "assets/sabotage-tunnel-vision.svg",
    },
    {
      id: "clock_block",
      name: "Clock Block",
      cost: 8,
      description: "Hide the timer for a rival's next turn.",
      icon: "assets/sabotage-clock-block.svg",
    },
    {
      id: "heist",
      name: "Point Heist",
      cost: 10,
      description: "Steal 5 points from a rival immediately.",
      icon: "assets/sabotage-heist.svg",
      immediate: true,
    },
    {
      id: "no_scope",
      name: "Reversal",
      cost: 10,
      description: "Rival must type their word backwards (right to left).",
      icon: "assets/sabotage-no-scope.svg",
    },
    {
      id: "double_trouble",
      name: "Double Trouble",
      cost: 12,
      description: "Freeze 2 letters from the last word for a rival.",
      icon: "assets/sabotage-double-trouble.svg",
    },
    {
      id: "robin_hood",
      name: "Robin Hood",
      cost: 15,
      description: "Take 15 points from 1st place and split them among everyone else.",
      icon: "assets/sabotage-robin-hood.svg",
      noTarget: true,
      oncePerTurn: true,
      note: "Once per turn. Takes from 1st place, shares with everyone.",
    },
    {
      id: "hostile_takeover",
      name: "Hostile Takeover",
      cost: 20,
      description:
        "Take over all points your rival earns on their next turn. If they don't enter a word, they lose 15 points.",
      icon: "assets/sabotage-hostile-takeover.svg",
    },
    {
      id: "cry_over_spilt_milk",
      name: "Cry over spilt milk",
      cost: 25,
      description: "The rival cannot use backspace to delete letters.",
      icon: "assets/sabotage-cry-over-spilt-milk.svg",
    },
    {
      id: "not_cheap",
      name: "Not Cheap",
      cost: 30,
      description: "Rivals have to pay double to sabotage you.",
      icon: "assets/sabotage-not-cheap.svg",
      noTarget: true,
      note: "Affects every player in the game.",
    },
    {
      id: "sui_you_later",
      name: "Sui You Later",
      cost: 30,
      description: "Hit the Suii as you get 7 points for every vowel in your rival's word.",
      icon: "assets/sabotage-sui-you-later.svg",
    },
    {
      id: "not_today",
      name: "Not Today",
      cost: 35,
      description: "Stay immune against a single sabotage.",
      icon: "assets/sabotage-not-today.svg",
    },
    {
      id: "mystery",
      name: "Mystery",
      cost: 40,
      description: "Whatever happens is on you for buying this sabotage.",
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
      return "The buyer got their points back.";
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
    if (
      type === "mystery_gift" ||
      type === "mystery_time" ||
      type === "mystery_nothing" ||
      type === "mystery_bankrupt_buyer" ||
      type === "mystery_swap_all" ||
      type === "mystery_jackpot" ||
      type === "mystery_refund"
    ) {
      return "assets/sabotage-mystery.svg";
    }
    return "";
  };

  WW.effectLabel = function effectLabel(type, effect) {
    if (type === "time_tax") return "-10s";
    if (type === "clock_block") return "no timer";
    if (type === "immunity") return "not today";
    if (type === "no_backspace") return "no delete";
    if (type === "sui_you_later") return "+7/vowel";
    if (type === "not_cheap") return "2x cost";
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

  WW.alreadyBoughtThisTurn = function alreadyBoughtThisTurn(state, itemId) {
    const bought = (state && state.shopBoughtThisTurn) || [];
    return bought.indexOf(itemId) >= 0;
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
    if (!buyer) {
      return { ok: false, reason: "insufficient_funds" };
    }
    if (item.oncePerTurn && WW.alreadyBoughtThisTurn(state, item.id)) {
      return { ok: false, reason: "already_bought" };
    }

    if (item.noTarget) {
      if (buyer.score < item.cost) {
        return { ok: false, reason: "insufficient_funds" };
      }
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
    const target = state.players[targetIndex];
    if (buyer.score < WW.sabotagePrice(item, target)) {
      return { ok: false, reason: "insufficient_funds" };
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

  if (typeof module !== "undefined") module.exports = WW;
})(typeof globalThis !== "undefined" ? globalThis : this);
