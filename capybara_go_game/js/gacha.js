// Capybara Go! - Chest Gacha & Equipment Summoning System
class GachaSystem {
  constructor() {
    this.opening = false;
  }

  openChest(type = "wood") {
    if (this.opening) return null;

    let costType = "";
    let costAmount = 0;

    if (type === "wood") {
      if (Character.keys > 0) {
        costType = "key";
        costAmount = 1;
      } else if (Character.gold >= 150) {
        costType = "gold";
        costAmount = 150;
      } else {
        return { success: false, msg: "Need 1 Key or 150 Gold to open!" };
      }
    } else if (type === "royal") {
      if (Character.gems >= 60) {
        costType = "gems";
        costAmount = 60;
      } else {
        return { success: false, msg: "Need 60 Gems to open Royal Chest!" };
      }
    }

    // Deduct cost
    if (costType === "key") Character.keys -= costAmount;
    if (costType === "gold") Character.gold -= costAmount;
    if (costType === "gems") Character.gems -= costAmount;

    // Roll Drops
    const dropCount = type === "royal" ? 3 : 2;
    const droppedItems = [];

    // Talent Luck bonus
    const luckBonus = (Character.talents.t_fortune || 0) * 0.03;

    for (let i = 0; i < dropCount; i++) {
      let rolledRarity = "common";
      const roll = Math.random() - luckBonus;

      if (type === "royal") {
        if (roll < 0.12) rolledRarity = "legendary";
        else if (roll < 0.40) rolledRarity = "epic";
        else rolledRarity = "rare";
      } else {
        if (roll < 0.05) rolledRarity = "epic";
        else if (roll < 0.25) rolledRarity = "rare";
        else if (roll < 0.60) rolledRarity = "uncommon";
        else rolledRarity = "common";
      }

      // Filter templates matching rarity
      let candidates = GameData.equipmentTemplates.filter(t => t.rarity === rolledRarity);
      if (candidates.length === 0) candidates = GameData.equipmentTemplates;

      const pickedTmpl = candidates[Math.floor(Math.random() * candidates.length)];
      const item = Character.createItemFromTemplate(pickedTmpl.id, 1);
      Character.inventory.push(item);
      droppedItems.push(item);
    }

    Character.save();
    return { success: true, items: droppedItems, type: type };
  }
}

const Gacha = new GachaSystem();
