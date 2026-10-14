// Capybara Go! - Character, Inventory, and Account Progression
class CharacterManager {
  constructor() {
    this.SAVE_KEY = "capybara_go_save_v2";
    this.baseStats = {
      hp: 350,
      atk: 45,
      def: 12,
      critRate: 0.10,
      critDmg: 1.50,
      dodgeRate: 0.05,
      lifesteal: 0.0,
      speed: 1.0
    };

    this.gold = 500;
    this.gems = 150;
    this.energy = 30;
    this.maxEnergy = 30;
    this.keys = 3;
    this.accountLevel = 1;
    this.accountExp = 0;

    this.equipped = {
      weapon: null,
      armor: null,
      helmet: null,
      boots: null,
      ring: null,
      amulet: null
    };

    this.inventory = [];
    this.talents = {
      t_might: 0,
      t_vitality: 0,
      t_fur: 0,
      t_greed: 0,
      t_spirit: 0,
      t_fortune: 0
    };

    this.unlockedChapters = 1;
    this.bestiary = {};

    // Current Run State (Day 1 - 60)
    this.activeRun = null;

    this.load();
    this.ensureStarterGear();
  }

  ensureStarterGear() {
    if (this.inventory.length === 0 && !this.equipped.weapon) {
      // Starter gifts
      const club = this.createItemFromTemplate("w1", 1);
      const tunic = this.createItemFromTemplate("a1", 1);
      const cap = this.createItemFromTemplate("h1", 1);
      const sandals = this.createItemFromTemplate("b1", 1);
      const ring = this.createItemFromTemplate("r1", 1);
      const talisman = this.createItemFromTemplate("m1", 1);

      this.equip(club);
      this.equip(tunic);
      this.equip(cap);
      this.equip(sandals);
      this.equip(ring);
      this.equip(talisman);
      this.save();
    }
  }

  createItemFromTemplate(templateId, level = 1) {
    const tmpl = GameData.equipmentTemplates.find(t => t.id === templateId) || GameData.equipmentTemplates[0];
    const uid = "item_" + Date.now() + "_" + Math.floor(Math.random() * 10000);
    const item = {
      uid,
      templateId: tmpl.id,
      name: tmpl.name,
      slot: tmpl.slot,
      rarity: tmpl.rarity,
      icon: tmpl.icon,
      level: level,
      atk: (tmpl.baseAtk || 0) + (level - 1) * 8,
      hp: (tmpl.baseHp || 0) + (level - 1) * 35,
      def: (tmpl.baseDef || 0) + (level - 1) * 4,
      crit: tmpl.baseCrit || 0,
      dodge: tmpl.baseDodge || 0,
      lifesteal: tmpl.baseLifesteal || 0,
      critDmg: tmpl.critDmg || 0
    };
    return item;
  }

  getEffectiveStats() {
    const s = { ...this.baseStats };

    // Apply Talents
    for (const [tId, rank] of Object.entries(this.talents)) {
      const tDef = GameData.talents.find(t => t.id === tId);
      if (tDef && rank > 0) {
        if (tDef.stat === "atk") s.atk += tDef.valPerRank * rank;
        if (tDef.stat === "hp") s.hp += tDef.valPerRank * rank;
        if (tDef.stat === "def") s.def += tDef.valPerRank * rank;
      }
    }

    // Apply Equipped Items
    for (const slot of Object.keys(this.equipped)) {
      const it = this.equipped[slot];
      if (it) {
        if (it.atk) s.atk += it.atk;
        if (it.hp) s.hp += it.hp;
        if (it.def) s.def += it.def;
        if (it.crit) s.critRate += it.crit;
        if (it.dodge) s.dodgeRate += it.dodge;
        if (it.lifesteal) s.lifesteal += it.lifesteal;
        if (it.critDmg) s.critDmg += it.critDmg;
      }
    }

    // Apply In-Run Skills & Buffs
    if (this.activeRun) {
      if (this.activeRun.bonusAtkPct) s.atk *= (1 + this.activeRun.bonusAtkPct);
      if (this.activeRun.bonusHpPct) s.hp *= (1 + this.activeRun.bonusHpPct);
      if (this.activeRun.bonusDef) s.def += this.activeRun.bonusDef;
      if (this.activeRun.bonusCrit) s.critRate += this.activeRun.bonusCrit;
      if (this.activeRun.bonusDodge) s.dodgeRate += this.activeRun.bonusDodge;
      if (this.activeRun.bonusLifesteal) s.lifesteal += this.activeRun.bonusLifesteal;

      for (const sk of this.activeRun.skills) {
        if (sk.atkBonus) s.atk *= (1 + sk.atkBonus);
        if (sk.hpBonus) s.hp *= (1 + sk.hpBonus);
        if (sk.defBonus) s.def += sk.defBonus;
        if (sk.critBonus) s.critRate += sk.critBonus;
        if (sk.dodgeBonus) s.dodgeRate += sk.dodgeBonus;
        if (sk.lifesteal) s.lifesteal += sk.lifesteal;
        if (sk.critDmgBonus) s.critDmg += sk.critDmgBonus;
      }
    }

    s.hp = Math.round(s.hp);
    s.atk = Math.round(s.atk);
    s.def = Math.round(s.def);
    return s;
  }

  equip(item) {
    if (!item || !item.slot) return;
    const old = this.equipped[item.slot];
    if (old) {
      this.inventory.push(old);
    }
    // Remove from inventory
    this.inventory = this.inventory.filter(i => i.uid !== item.uid);
    this.equipped[item.slot] = item;
    this.save();
  }

  unequip(slot) {
    const it = this.equipped[slot];
    if (it) {
      this.equipped[slot] = null;
      this.inventory.push(it);
      this.save();
    }
  }

  upgradeItem(uid) {
    let item = this.inventory.find(i => i.uid === uid);
    if (!item) {
      for (const slot of Object.keys(this.equipped)) {
        if (this.equipped[slot] && this.equipped[slot].uid === uid) {
          item = this.equipped[slot];
          break;
        }
      }
    }
    if (!item) return false;

    const cost = item.level * 150;
    if (this.gold < cost) return false;

    this.gold -= cost;
    item.level += 1;
    if (item.atk) item.atk += 10;
    if (item.hp) item.hp += 45;
    if (item.def) item.def += 5;

    this.save();
    return true;
  }

  upgradeTalent(talentId) {
    const tDef = GameData.talents.find(t => t.id === talentId);
    if (!tDef) return false;
    const curRank = this.talents[talentId] || 0;
    if (curRank >= tDef.maxRank) return false;

    const cost = Math.round(tDef.costBase * Math.pow(tDef.costMult, curRank));
    if (this.gold < cost) return false;

    this.gold -= cost;
    this.talents[talentId] = curRank + 1;
    this.save();
    return true;
  }

  startRun(chapterId = 1) {
    if (this.energy < 5) return false;
    this.energy -= 5;

    const chapter = GameData.chapters.find(c => c.id === chapterId) || GameData.chapters[0];
    const stats = this.getEffectiveStats();

    const startRage = (this.talents.t_spirit || 0) * 10;

    this.activeRun = {
      chapterId: chapter.id,
      day: 1,
      maxDays: chapter.maxDays,
      currentHp: stats.hp,
      maxHp: stats.hp,
      rage: startRage,
      shield: 0,
      skills: [],
      runGold: 0,
      runExp: 0,
      statusEffects: {},
      bonusAtkPct: 0,
      bonusHpPct: 0,
      bonusDef: 0,
      bonusCrit: 0,
      bonusDodge: 0,
      bonusLifesteal: 0,
      reviveUsed: false,
      majorFortunePity: 0,
      lastFortuneCategory: null,
      recentEventIds: [],
      consecutiveCombat: 0
    };

    this.save();
    return true;
  }

  addGold(amount) {
    this.gold = Math.max(0, (this.gold || 0) + amount);
    if (this.activeRun && amount > 0) {
      this.activeRun.runGold = (this.activeRun.runGold || 0) + amount;
    }
    this.save();
    if (window.Game && window.Game.ui) {
      window.Game.ui.renderHeader();
      window.Game.ui.renderStageFloatingHeader();
    }
    return this.gold;
  }

  endRun(isVictory = false) {
    if (!this.activeRun) return;
    const run = this.activeRun;
    // Gold is already added in real-time to this.gold when earned
    this.accountExp += run.runExp;

    if (this.accountExp >= this.accountLevel * 200) {
      this.accountExp -= this.accountLevel * 200;
      this.accountLevel += 1;
    }

    if (isVictory && run.chapterId === this.unlockedChapters && this.unlockedChapters < GameData.chapters.length) {
      this.unlockedChapters += 1;
    }

    this.activeRun = null;
    this.save();
  }

  save() {
    const state = {
      gold: this.gold,
      gems: this.gems,
      energy: this.energy,
      keys: this.keys,
      accountLevel: this.accountLevel,
      accountExp: this.accountExp,
      equipped: this.equipped,
      inventory: this.inventory,
      talents: this.talents,
      unlockedChapters: this.unlockedChapters,
      bestiary: this.bestiary,
      activeRun: this.activeRun
    };
    try {
      localStorage.setItem(this.SAVE_KEY, JSON.stringify(state));
    } catch (e) {}
  }

  load() {
    try {
      const raw = localStorage.getItem(this.SAVE_KEY);
      if (!raw) return;
      const s = JSON.parse(raw);
      if (s.gold !== undefined) this.gold = s.gold;
      if (s.gems !== undefined) this.gems = s.gems;
      if (s.energy !== undefined) this.energy = s.energy;
      if (s.keys !== undefined) this.keys = s.keys;
      if (s.accountLevel !== undefined) this.accountLevel = s.accountLevel;
      if (s.accountExp !== undefined) this.accountExp = s.accountExp;
      if (s.equipped) this.equipped = s.equipped;
      if (s.inventory) this.inventory = s.inventory;
      if (s.talents) this.talents = s.talents;
      if (s.unlockedChapters !== undefined) this.unlockedChapters = s.unlockedChapters;
      if (s.bestiary) this.bestiary = s.bestiary;
      if (s.activeRun) {
        this.activeRun = s.activeRun;
        // Fix any saved skills that might have emoji string icons instead of file paths
        if (this.activeRun.skills && Array.isArray(this.activeRun.skills)) {
          this.activeRun.skills.forEach(sk => {
            if (sk.id === 101 && (!sk.icon || !sk.icon.includes('.'))) sk.icon = "assets/skills/skill_016.png";
            if (sk.id === 102 && (!sk.icon || !sk.icon.includes('.'))) sk.icon = "assets/skills/skill_022.png";
            if (sk.id === 103 && (!sk.icon || !sk.icon.includes('.'))) sk.icon = "assets/skills/skill_011.png";
          });
        }
      }
    } catch (e) {}
  }
}

const Character = new CharacterManager();
