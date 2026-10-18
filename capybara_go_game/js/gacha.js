// Capybara Go! - Chest Gacha & Equipment Summoning System
class GachaSystem {
  constructor() {
    this.opening = false;
  }

  ensureCharacterPity() {
    if (!Character.gachaPity) {
      Character.gachaPity = {
        legendaryEpic: 10,
        legendarySEpic: 60,
        adventurer: 9,
        hero: 10,
        adventurerAds: 3,
        heroAds: 1
      };
    }
  }

  // Helper: Roll random item by rarity weights with pity override
  rollItemByWeights(weights, forceRarity = null) {
    let chosenRarity = forceRarity;

    if (!chosenRarity) {
      const luckBonus = (Character.talents.t_fortune || 0) * 0.03;
      let rand = Math.random() - luckBonus;
      let cumulative = 0;

      for (const [rarity, rate] of Object.entries(weights)) {
        cumulative += rate;
        if (rand < cumulative) {
          chosenRarity = rarity;
          break;
        }
      }
      if (!chosenRarity) chosenRarity = "common";
    }

    // Map "great" or "uncommon" to "rare"
    const tmplRarity = (chosenRarity === "great" || chosenRarity === "uncommon") ? "rare" : chosenRarity;

    // Filter templates matching rarity
    let candidates = GameData.equipmentTemplates.filter(t => t.rarity === tmplRarity);
    if (candidates.length === 0) {
      candidates = GameData.equipmentTemplates;
    }

    const pickedTmpl = candidates[Math.floor(Math.random() * candidates.length)];
    const item = Character.createItemFromTemplate(pickedTmpl.id, 1);
    Character.inventory.push(item);
    return item;
  }

  // 1. LEGENDARY TREASURE CHEST (Event Chest)
  // Costs 320 Gems (1x) or 2980 Gems (10x)
  openLegendary(pullCount = 1) {
    if (this.opening) return null;
    this.ensureCharacterPity();

    const costGems = pullCount === 10 ? 2980 : 320;
    if (Character.gems < costGems) {
      return { success: false, msg: `Not enough Gems! Need ${costGems} 💎.` };
    }

    Character.gems -= costGems;
    const droppedItems = [];

    // Weights: Supreme 1%, Mythic 4%, S-Epic (legendary) 8%, Epic 25%, Rare 62%
    const weights = {
      supreme: 0.01,
      mythic: 0.04,
      legendary: 0.08,
      epic: 0.25,
      rare: 0.62
    };

    for (let i = 0; i < pullCount; i++) {
      Character.gachaPity.legendaryEpic--;
      Character.gachaPity.legendarySEpic--;

      let forceRarity = null;

      // Pity checks
      if (Character.gachaPity.legendarySEpic <= 0) {
        const pRoll = Math.random();
        forceRarity = pRoll < 0.15 ? "supreme" : (pRoll < 0.45 ? "mythic" : "legendary");
        Character.gachaPity.legendarySEpic = 60;
        Character.gachaPity.legendaryEpic = 10;
      } else if (Character.gachaPity.legendaryEpic <= 0) {
        forceRarity = "epic";
        Character.gachaPity.legendaryEpic = 10;
      } else if (pullCount === 10 && i === 9 && !droppedItems.some(it => ["epic", "legendary", "mythic", "supreme"].includes(it.rarity))) {
        // Guarantee at least 1 Epic/Legendary/Mythic/Supreme in 10-pull
        forceRarity = "epic";
        Character.gachaPity.legendaryEpic = 10;
      }

      const item = this.rollItemByWeights(weights, forceRarity);
      if (item.rarity === "supreme" || item.rarity === "mythic" || item.rarity === "legendary") {
        Character.gachaPity.legendarySEpic = 60;
        Character.gachaPity.legendaryEpic = 10;
      } else if (item.rarity === "epic") {
        Character.gachaPity.legendaryEpic = 10;
      }

      droppedItems.push(item);
    }

    Character.save();
    return {
      success: true,
      items: droppedItems,
      chestName: "Legendary Treasure Chest",
      pullCount: pullCount
    };
  }

  // 2. ADVENTURER'S SUPPLY CRATE (Left Equipment Crate)
  // Costs Free/AD or 80 Gems
  openAdventurer(isAd = false) {
    if (this.opening) return null;
    this.ensureCharacterPity();

    if (isAd) {
      if ((Character.gachaPity.adventurerAds || 0) <= 0) {
        return { success: false, msg: "No AD chances left today for Adventurer Crate!" };
      }
      Character.gachaPity.adventurerAds--;
    } else {
      const costGems = 80;
      if (Character.gems < costGems) {
        return { success: false, msg: `Not enough Gems! Need ${costGems} 💎.` };
      }
      Character.gems -= costGems;
    }

    Character.gachaPity.adventurer--;
    let forceRarity = null;
    if (Character.gachaPity.adventurer <= 0) {
      forceRarity = "rare";
      Character.gachaPity.adventurer = 9;
    }

    // Weights: Rare 35%, Common 65%
    const weights = {
      rare: 0.35,
      common: 0.65
    };

    const item = this.rollItemByWeights(weights, forceRarity);
    if (item.rarity === "rare" || item.rarity === "epic") {
      Character.gachaPity.adventurer = 9;
    }

    Character.save();
    return {
      success: true,
      items: [item],
      chestName: "Adventurer's Supply Crate",
      pullCount: 1
    };
  }

  // 3. HERO'S SUPPLY CRATE (Right Equipment Crate)
  // Costs Free/AD or 1 Key or 300 Gems
  openHero(isAd = false) {
    if (this.opening) return null;
    this.ensureCharacterPity();

    if (isAd) {
      if ((Character.gachaPity.heroAds || 0) <= 0) {
        return { success: false, msg: "No AD chances left today for Hero Crate!" };
      }
      Character.gachaPity.heroAds--;
    } else {
      if (Character.keys >= 1) {
        Character.keys -= 1;
      } else if (Character.gems >= 300) {
        Character.gems -= 300;
      } else {
        return { success: false, msg: "Need 1 🗝️ Key or 300 💎 Gems to open!" };
      }
    }

    Character.gachaPity.hero--;
    let forceRarity = null;
    if (Character.gachaPity.hero <= 0) {
      forceRarity = "epic";
      Character.gachaPity.hero = 10;
    }

    // Weights: Epic 25%, Rare 75%
    const weights = {
      epic: 0.25,
      rare: 0.75
    };

    const item = this.rollItemByWeights(weights, forceRarity);
    if (item.rarity === "epic" || item.rarity === "legendary") {
      Character.gachaPity.hero = 10;
    }

    Character.save();
    return {
      success: true,
      items: [item],
      chestName: "Hero's Supply Crate",
      pullCount: 1
    };
  }

  // Legacy fallback compatibility
  openChest(type = "wood") {
    if (type === "royal") {
      return this.openLegendary(1);
    } else {
      return this.openAdventurer(false);
    }
  }
}

const Gacha = new GachaSystem();
