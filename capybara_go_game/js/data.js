// Capybara Go! - Game Database & Manifest
const GameData = {
  chapters: [
    {
      id: 1,
      name: "Gale Town",
      description: "A peaceful starting village with gentle breezes and rolling roads.",
      bg: "assets/backgrounds/panoramas/village_road_bg.png",
      enemies: ["sprout", "slime_green", "mushroom_red", "flower_red"],
      bossDays: { 20: "boss_crown_warrior", 40: "boss_blue_knight", 60: "boss_capbara_king" },
      maxDays: 60,
      rewardGold: 1000,
      rewardGems: 100
    },
    {
      id: 2,
      name: "Whispering Woods",
      description: "A lush, serene woodland teeming with mysterious fauna and ancient castle ruins.",
      bg: "assets/backgrounds/panoramas/forest_woods_bg.png",
      enemies: ["sprout", "slime_green", "mushroom_red", "flower_red"],
      bossDays: { 20: "boss_skeleton_guard", 40: "boss_crown_warrior", 60: "boss_purple_mage" },
      maxDays: 60,
      rewardGold: 1500,
      rewardGems: 120
    },
    {
      id: 3,
      name: "Sunken Desert",
      description: "Scorching dunes hiding forgotten ancient ruins.",
      bg: "assets/backgrounds/panoramas/desert_dunes_bg.png",
      enemies: ["cactus_mimic", "bee", "purple_boar", "stone_golem"],
      bossDays: { 20: "boss_skeleton_guard", 40: "boss_crown_warrior", 60: "boss_purple_mage" },
      maxDays: 60,
      rewardGold: 2500,
      rewardGems: 180
    },
    {
      id: 4,
      name: "Frozen Peaks",
      description: "Frostbitten mountains where icy chills slow the boldest warriors.",
      bg: "assets/backgrounds/panoramas/frozen_peak_bg.png",
      enemies: ["blue_flyer", "stone_golem", "slime_green", "pink_flower"],
      bossDays: { 20: "boss_blue_knight", 40: "boss_skeleton_guard", 60: "boss_capbara_king" },
      maxDays: 60,
      rewardGold: 4000,
      rewardGems: 250
    },
    {
      id: 5,
      name: "Molten Core",
      description: "Rivers of molten magma guarded by ferocious fiery creatures.",
      bg: "assets/backgrounds/panoramas/volcano_core_bg.png",
      enemies: ["purple_boar", "stone_golem", "bee", "cactus_mimic"],
      bossDays: { 20: "boss_crown_warrior", 40: "boss_purple_mage", 60: "boss_skeleton_guard" },
      maxDays: 60,
      rewardGold: 6000,
      rewardGems: 350
    },
    {
      id: 6,
      name: "Moonlit Citadel",
      description: "The shadowed bastion of the legendary Capybara Monarch.",
      bg: "assets/backgrounds/panoramas/moonlit_night_bg.png",
      enemies: ["sprout", "slime_green", "mushroom_red", "flower_red", "pink_flower", "bee", "cactus_mimic", "blue_flyer", "purple_boar", "stone_golem"],
      bossDays: { 20: "boss_blue_knight", 40: "boss_purple_mage", 60: "boss_capbara_king" },
      maxDays: 60,
      rewardGold: 10000,
      rewardGems: 500
    }
  ],

  enemies: {
    sprout: { name: "Little Sprout", sprite: "assets/characters/enemies/roster/sprout.png", hp: 420, atk: 15, def: 4, exp: 20, gold: 15, scale: 1.0 },
    slime_green: { name: "Emerald Slime", sprite: "assets/characters/enemies/roster/slime_green.png", hp: 550, atk: 18, def: 5, exp: 25, gold: 20, scale: 1.0 },
    mushroom_red: { name: "Toxic Shroom", sprite: "assets/characters/enemies/roster/mushroom_red.png", hp: 720, atk: 22, def: 6, exp: 30, gold: 25, scale: 1.05 },
    flower_red: { name: "Carnivorous Bloom", sprite: "assets/characters/enemies/roster/flower_red.png", hp: 780, atk: 26, def: 6, exp: 35, gold: 30, scale: 1.1 },
    pink_flower: { name: "Sweet Blossom", sprite: "assets/characters/enemies/roster/pink_flower.png", hp: 850, atk: 28, def: 7, exp: 40, gold: 32, scale: 1.1 },
    bee: { name: "Stinger Hornet", sprite: "assets/characters/enemies/roster/bee.png", hp: 620, atk: 32, def: 3, crit: 0.15, exp: 45, gold: 35, scale: 0.95 },
    cactus_mimic: { name: "Prickly Mimic", sprite: "assets/characters/enemies/roster/cactus_mimic.png", hp: 1100, atk: 24, def: 12, exp: 50, gold: 40, scale: 1.1 },
    blue_flyer: { name: "Azure Wyvernling", sprite: "assets/characters/enemies/roster/blue_flyer.png", hp: 950, atk: 30, def: 8, dodge: 0.15, exp: 55, gold: 45, scale: 1.1 },
    purple_boar: { name: "Shadow Boar", sprite: "assets/characters/enemies/roster/purple_boar.png", hp: 1250, atk: 34, def: 10, exp: 65, gold: 50, scale: 1.15 },
    stone_golem: { name: "Granite Golem", sprite: "assets/characters/enemies/roster/stone_golem.png", hp: 1850, atk: 40, def: 18, exp: 80, gold: 65, scale: 1.2 }
  },

  bosses: {
    boss_crown_warrior: {
      name: "Crown Warmaster",
      sprite: "assets/characters/bosses/boss_crown_warrior.png",
      hp: 4500,
      atk: 52,
      def: 20,
      skill: "Crown Slam",
      skillMultiplier: 1.8,
      exp: 250,
      gold: 200,
      scale: 1.3
    },
    boss_blue_knight: {
      name: "Frostbite Paladin",
      sprite: "assets/characters/bosses/boss_blue_knight.png",
      hp: 7800,
      atk: 68,
      def: 26,
      skill: "Glacial Slash",
      skillMultiplier: 2.0,
      exp: 400,
      gold: 350,
      scale: 1.35
    },
    boss_skeleton_guard: {
      name: "Dreadbone Warden",
      sprite: "assets/characters/bosses/boss_skeleton_guard.png",
      hp: 11500,
      atk: 82,
      def: 32,
      skill: "Crypt Shield & Cleave",
      skillMultiplier: 2.2,
      exp: 600,
      gold: 500,
      scale: 1.4
    },
    boss_purple_mage: {
      name: "Void Archmage",
      sprite: "assets/characters/bosses/boss_purple_mage.png",
      hp: 16000,
      atk: 98,
      def: 28,
      skill: "Chaos Nebula",
      skillMultiplier: 2.5,
      exp: 900,
      gold: 750,
      scale: 1.4
    },
    boss_capbara_king: {
      name: "Supreme Capybara King",
      sprite: "assets/characters/bosses/boss_capbara_king.png",
      hp: 24000,
      atk: 120,
      def: 40,
      skill: "Imperial Citrus Fury",
      skillMultiplier: 3.0,
      exp: 1500,
      gold: 1500,
      scale: 1.5
    }
  },

  // Full Skill Roster: 26 Authentic Skills from Reference Grid + Classic Variants
  skills: [
    // --- 10 Authentic Common Skills ---
    { id: 201, key: "common_01_sword_slash", name: "Sword Slash", icon: "assets/skills/skill_common_01_sword_slash.png", cardImg: "assets/skills/card_common_01_sword_slash.png", rarity: "common", badgeVal: "115%", desc: "A swift sword slash dealing 115% physical damage and +8% ATK.", type: "attack", atkBonus: 0.08, dmgMult: 1.15 },
    { id: 202, key: "common_02_fire_slash", name: "Fire Slash", icon: "assets/skills/skill_common_02_fire_slash.png", cardImg: "assets/skills/card_common_02_fire_slash.png", rarity: "common", badgeVal: "120%", desc: "Enchant blade with flames, dealing 120% ATK damage and burning enemy.", type: "element", dmgMult: 1.20, dotBurn: 0.10 },
    { id: 203, key: "common_03_shield", name: "Shield", icon: "assets/skills/skill_common_03_shield.png", cardImg: "assets/skills/card_common_03_shield.png", rarity: "common", badgeVal: "15%", desc: "Summon a protective shield equal to 15% Max HP. DEF +10.", type: "defense", defBonus: 10, shieldRatio: 0.15 },
    { id: 204, key: "common_04_heal", name: "Heal", icon: "assets/skills/skill_common_04_heal.png", cardImg: "assets/skills/card_common_04_heal.png", rarity: "common", badgeVal: "5%", desc: "Instantly restore 30 HP and regenerate 5% Max HP each turn.", type: "defense", turnRegen: 0.05, instantHeal: 30 },
    { id: 205, key: "common_05_throwing_knife", name: "Throwing Knife", icon: "assets/skills/skill_common_05_throwing_knife.png", cardImg: "assets/skills/card_common_05_throwing_knife.png", rarity: "common", badgeVal: "30%", desc: "Fling razor daggers at combat start for 30% ATK. +8% Crit Rate.", type: "attack", critBonus: 0.08, startCombatDmg: 0.30 },
    { id: 206, key: "common_06_rock", name: "Rock", icon: "assets/skills/skill_common_06_rock.png", cardImg: "assets/skills/card_common_06_rock.png", rarity: "common", badgeVal: "20%", desc: "Hurl heavy stones dealing 110% ATK damage with 20% chance to stun.", type: "element", stunChance: 0.20, dmgMult: 1.10 },
    { id: 207, key: "common_07_vortex", name: "Vortex", icon: "assets/skills/skill_common_07_vortex.png", cardImg: "assets/skills/card_common_07_vortex.png", rarity: "common", badgeVal: "+10%", desc: "Conjure a swirling mini vortex granting +10% Speed and +8% Dodge.", type: "element", speedBonus: 0.10, dodgeBonus: 0.08 },
    { id: 208, key: "common_08_water_wave", name: "Water Wave", icon: "assets/skills/skill_common_08_water_wave.png", cardImg: "assets/skills/card_common_08_water_wave.png", rarity: "common", badgeVal: "115%", desc: "Crash a water tidal wave for 115% ATK damage, slowing attacker.", type: "element", dmgMult: 1.15, chillAttacker: 0.15 },
    { id: 209, key: "common_09_bow", name: "Bow", icon: "assets/skills/skill_common_09_bow.png", cardImg: "assets/skills/card_common_09_bow.png", rarity: "common", badgeVal: "+10%", desc: "Equip a hunting bow. +10% ATK and +20% Critical Damage.", type: "attack", atkBonus: 0.10, critDmgBonus: 0.20 },
    { id: 210, key: "common_10_bomb", name: "Bomb", icon: "assets/skills/skill_common_10_bomb.png", cardImg: "assets/skills/card_common_10_bomb.png", rarity: "common", badgeVal: "35%", desc: "Toss an explosive bomb dealing 35% blast damage at battle start.", type: "utility", startCombatDmg: 0.35, dotBurn: 0.10 },

    // --- 10 Authentic Legendary Skills ---
    { id: 301, key: "legendary_01_flaming_sword", name: "Flaming Sword", icon: "assets/skills/skill_legendary_01_flaming_sword.png", cardImg: "assets/skills/card_legendary_01_flaming_sword.png", rarity: "legendary", badgeVal: "+15%", desc: "Engulf weapon in eternal hellfire: +15% ATK, strikes deal 125% fire damage & burn.", type: "legendary", atkBonus: 0.15, dotBurn: 0.15, dmgMult: 1.25 },
    { id: 302, key: "legendary_02_thunder_hammer", name: "Thunder Hammer", icon: "assets/skills/skill_legendary_02_thunder_hammer.png", cardImg: "assets/skills/card_legendary_02_thunder_hammer.png", rarity: "legendary", badgeVal: "55%", desc: "Every 3 turns, smite foe with Thunder Hammer dealing 55% Shock damage & 20% Stun!", type: "legendary", procEvery: 3, dmgMult: 0.55, stunChance: 0.20, effect: "thunder" },
    { id: 303, key: "legendary_03_guardian_shield", name: "Guardian Shield", icon: "assets/skills/skill_legendary_03_guardian_shield.png", cardImg: "assets/skills/card_legendary_03_guardian_shield.png", rarity: "legendary", badgeVal: "20%", desc: "Golden winged aegis: +20 DEF, 20% Max HP shield, reflects 15% damage.", type: "legendary", defBonus: 20, shieldRatio: 0.20, reflectRatio: 0.15 },
    { id: 304, key: "legendary_04_healing_aura", name: "Healing Aura", icon: "assets/skills/skill_legendary_04_healing_aura.png", cardImg: "assets/skills/card_legendary_04_healing_aura.png", rarity: "legendary", badgeVal: "6%", desc: "Sacred golden light surrounds you: restore 6% Max HP every turn, Max HP +15%.", type: "legendary", turnRegen: 0.06, hpBonus: 0.15 },
    { id: 305, key: "legendary_05_tornado", name: "Tornado", icon: "assets/skills/skill_legendary_05_tornado.png", cardImg: "assets/skills/card_legendary_05_tornado.png", rarity: "legendary", badgeVal: "+15%", desc: "Howling twin cyclones grant +15% Dodge, counterattack on dodge with double strikes!", type: "legendary", dodgeBonus: 0.15, counterOnDodge: true, multiHits: 2 },
    { id: 306, key: "legendary_06_dark_pulse", name: "Dark Pulse", icon: "assets/skills/skill_legendary_06_dark_pulse.png", cardImg: "assets/skills/card_legendary_06_dark_pulse.png", rarity: "legendary", badgeVal: "12%", desc: "Emanate void waves: 12% Lifesteal, execute non-boss monsters below 10% HP.", type: "legendary", lifesteal: 0.12, dmgMult: 1.15, executeThreshold: 0.10 },
    { id: 307, key: "legendary_07_multi_arrow", name: "Multi Arrow", icon: "assets/skills/skill_legendary_07_multi_arrow.png", cardImg: "assets/skills/card_legendary_07_multi_arrow.png", rarity: "legendary", badgeVal: "3x", desc: "Fire a barrage of 3 magic arrows for 40% damage each. +10% Crit Rate.", type: "legendary", multiHits: 3, hitDmgRatio: 0.40, critBonus: 0.10 },
    { id: 308, key: "legendary_08_fireball", name: "Fireball", icon: "assets/skills/skill_legendary_08_fireball.png", cardImg: "assets/skills/card_legendary_08_fireball.png", rarity: "legendary", badgeVal: "50%", desc: "Every 3 turns, launch a blazing fireball dealing 50% splash fire damage.", type: "legendary", procEvery: 3, dmgMult: 0.50, dotBurn: 0.12 },
    { id: 309, key: "legendary_09_earthquake", name: "Earthquake", icon: "assets/skills/skill_legendary_09_earthquake.png", cardImg: "assets/skills/card_legendary_09_earthquake.png", rarity: "legendary", badgeVal: "60%", desc: "Rupture the ground dealing 60% damage with 20% Stun chance. DEF +15.", type: "legendary", stunChance: 0.20, dmgMult: 0.60, defBonus: 15 },
    { id: 310, key: "legendary_10_magic_book", name: "Magic Book", icon: "assets/skills/skill_legendary_10_magic_book.png", cardImg: "assets/skills/card_legendary_10_magic_book.png", rarity: "legendary", badgeVal: "+25%", desc: "Ancient floating grimoire: +25% Rage gain, +8% all stats, +40% Ultimate power!", type: "legendary", rageBoost: 0.25, ultMult: 1.40, allStatsBonus: 0.08 },

    // --- 6 Authentic Mythic Skills (EXCLUSIVE TO GOLDEN CHESTS!) ---
    { id: 401, key: "mythic_01_blood_blade", name: "Blood Blade", icon: "assets/skills/skill_mythic_01_blood_blade.png", cardImg: "assets/skills/card_mythic_01_blood_blade.png", rarity: "mythic", isChestExclusive: true, badgeVal: "15%", desc: "Cursed sanguis scythe: +15% ATK, 15% Lifesteal on all hits, restore 12% HP on kill!", type: "mythic", lifesteal: 0.15, atkBonus: 0.15, onKillHeal: 0.12 },
    { id: 402, key: "mythic_02_dragon_roar", name: "Dragon Roar", icon: "assets/skills/skill_mythic_02_dragon_roar.png", cardImg: "assets/skills/card_mythic_02_dragon_roar.png", rarity: "mythic", isChestExclusive: true, badgeVal: "+15%", desc: "Summon the fiery avatar of an ancient dragon! +15% ATK, +10% Crit, 40% opener roar!", type: "mythic", atkBonus: 0.15, startCombatDmg: 0.40, critBonus: 0.10 },
    { id: 403, key: "mythic_03_black_hole", name: "Black Hole", icon: "assets/skills/skill_mythic_03_black_hole.png", cardImg: "assets/skills/card_mythic_03_black_hole.png", rarity: "mythic", isChestExclusive: true, badgeVal: "25%", desc: "Spawn a cosmic gravity singularity every 4 turns, dealing 25% ATK damage & granting -8% incoming damage.", type: "mythic", dmgReduction: 0.08, dmgMult: 0.25, procEvery: 4 },
    { id: 404, key: "mythic_04_angel_blessing", name: "Angel Blessing", icon: "assets/skills/skill_mythic_04_angel_blessing.png", cardImg: "assets/skills/card_mythic_04_angel_blessing.png", rarity: "mythic", isChestExclusive: true, badgeVal: "40%", desc: "Golden wings & halo: Revive with 40% HP upon defeat! +6% HP regen each turn, +20% Holy Shield.", type: "mythic", reviveOnce: true, reviveHpRatio: 0.40, turnRegen: 0.06, shieldRatio: 0.20 },
    { id: 405, key: "mythic_05_meteor_strike", name: "Meteor Strike", icon: "assets/skills/skill_mythic_05_meteor_strike.png", cardImg: "assets/skills/card_mythic_05_meteor_strike.png", rarity: "mythic", isChestExclusive: true, badgeVal: "160%", desc: "Summon colossal apocalyptic meteors! Ultimate deals 160% calamity damage and burns for 20% ATK.", type: "mythic", ultMult: 1.60, startCombatDmg: 0.35, dotBurn: 0.20 },
    { id: 406, key: "mythic_06_demon_form", name: "Demon Form", icon: "assets/skills/skill_mythic_06_demon_form.png", cardImg: "assets/skills/card_mythic_06_demon_form.png", rarity: "mythic", isChestExclusive: true, badgeVal: "+20%", desc: "Transform into horned Shadow Demon Capybara! +20% ATK, +25% Crit DMG, +20% ATK when low HP!", type: "mythic", atkBonus: 0.20, critDmgBonus: 0.25, allStatsBonus: 0.10, lowHpAtkBonus: 0.20 },

    // Classic & Utility Roguelike Skills
    { id: 0, name: "Rage Heal", icon: "assets/skills/skill_003.png", rarity: "rare", badgeVal: "15%", desc: "Whenever Rage hits 100%, immediately restore 15% Max HP.", type: "defense", rageHealRatio: 0.15 },
    { id: 1, name: "Thunderclap", icon: "assets/skills/skill_001.png", rarity: "rare", badgeVal: "50%", desc: "Every 3 turns, strike a bolt dealing 50% ATK damage.", type: "element", procEvery: 3, dmgMult: 0.50, effect: "thunder" },
    { id: 3, name: "Vampire Bite", icon: "assets/skills/skill_003.png", rarity: "epic", badgeVal: "12%", desc: "Heal for 12% of all physical damage dealt.", type: "passive", lifesteal: 0.12 },
    { id: 4, name: "Iron Hide", icon: "assets/skills/skill_004.png", rarity: "common", badgeVal: "+15%", desc: "Increase Max HP by 15% and DEF by 8.", type: "stat", hpBonus: 0.15, defBonus: 8 },
    { id: 5, name: "Sharp Claws", icon: "assets/skills/skill_005.png", rarity: "common", badgeVal: "+10%", desc: "Increase ATK by 10% and Crit Rate by +6%.", type: "stat", atkBonus: 0.10, critBonus: 0.06 },
    { id: 6, name: "Frost Nova", icon: "assets/skills/skill_006.png", rarity: "rare", badgeVal: "15%", desc: "15% chance to freeze enemy for 1 turn upon attacking.", type: "element", freezeChance: 0.15 },
    { id: 7, name: "Wind Dash", icon: "assets/skills/skill_007.png", rarity: "uncommon", badgeVal: "+10%", desc: "Increase Dodge chance by +10%. Counterattack on dodge!", type: "passive", dodgeBonus: 0.10, counterOnDodge: true },
    { id: 9, name: "Citrus Blessing", icon: "assets/skills/skill_009.png", rarity: "legendary", badgeVal: "+15%", desc: "Balance a Yuzu fruit on head: +15% ATK, +15% HP, +8% Crit!", type: "legendary", atkBonus: 0.15, hpBonus: 0.15, critBonus: 0.08 },
    { id: 11, name: "Double Strike", icon: "assets/skills/skill_011.png", rarity: "epic", badgeVal: "20%", desc: "20% chance to attack twice in a single turn.", type: "attack", doubleHitChance: 0.20 },
    { id: 14, name: "Gold Miner", icon: "assets/skills/skill_014.png", rarity: "common", badgeVal: "+25%", desc: "Increase Gold earned from all encounters by +25%.", type: "utility", goldBonus: 0.25 },
    { id: 16, name: "Phoenix Heart", icon: "assets/skills/skill_016.png", rarity: "legendary", badgeVal: "35%", desc: "Revive once per adventure run with 35% HP!", type: "legendary", reviveOnce: true },
    { id: 25, name: "Lucky Clover", icon: "assets/skills/skill_025.png", rarity: "rare", badgeVal: "+20%", desc: "Increase chance of finding higher tier equipment by 20%.", type: "utility", lootQuality: 0.20 },
    { id: 30, name: "Capybara Zen", icon: "assets/skills/skill_030.png", rarity: "legendary", badgeVal: "+10%", desc: "Maximum chill: Immune to Freeze, Stun, and Burn. +10% All Stats.", type: "legendary", crowdControlImmune: true, allStatsBonus: 0.10 },
    { id: 40, name: "King's Mandate", icon: "assets/skills/skill_040.png", rarity: "legendary", badgeVal: "+50%", desc: "Increase gold & gem drops by +50%. +15% ATK and +15 DEF.", type: "legendary", goldBonus: 0.50, gemBonus: 0.50, atkBonus: 0.15, defBonus: 15 },
    { id: 41, name: "Critical Recovery", icon: "assets/skills/skill_common_04_heal.png", badge: "assets/skills/badge_crit_recovery.svg", rarity: "common", badgeVal: "30%", desc: "At <30% HP for the 1st time, restore 10% HP each round for 3 rounds.", type: "defense" },
    { id: 42, name: "Critical Frenzy", icon: "assets/skills/skill_common_01_sword_slash.png", badge: "assets/skills/badge_crit_frenzy.svg", rarity: "common", badgeVal: "50%", desc: "At <50% HP, ATK, DEF ↑ ↑ .", type: "stat" },
    { id: 43, name: "Swift Revenge", icon: "assets/skills/skill_common_07_vortex.png", badge: "assets/skills/badge_swift_revenge.svg", rarity: "common", badgeVal: "100%", desc: "Round 1 Counter Rate +100%.", type: "passive" }
  ],

  // Equipment Database
  equipmentTypes: {
    weapon: { name: "Weapon", icon: "assets/ui/capybara_cartoon_kit/equipment_icons/equipment_sword.png", stat: "atk" },
    armor: { name: "Armor", icon: "assets/ui/capybara_cartoon_kit/equipment_icons/equipment_armor.png", stat: "hp" },
    helmet: { name: "Helmet", icon: "assets/ui/capybara_cartoon_kit/equipment_icons/equipment_helmet.png", stat: "def" },
    boots: { name: "Boots", icon: "assets/ui/capybara_cartoon_kit/equipment_icons/equipment_boots.png", stat: "dodge" },
    ring: { name: "Ring", icon: "assets/ui/capybara_cartoon_kit/equipment_icons/equipment_ring.png", stat: "crit" },
    amulet: { name: "Amulet", icon: "assets/ui/capybara_cartoon_kit/equipment_icons/equipment_amulet.png", stat: "lifesteal" }
  },

  equipmentTemplates: [
    // Weapons
    { id: "w1", slot: "weapon", name: "Wooden Club", icon: "assets/ui/capybara_cartoon_kit/equipment_icons/equipment_sword.png", rarity: "common", baseAtk: 15 },
    { id: "w2", slot: "weapon", name: "Iron Broadsword", icon: "assets/ui/capybara_cartoon_kit/equipment_icons/equipment_sword.png", rarity: "uncommon", baseAtk: 30 },
    { id: "w3", slot: "weapon", name: "Ranger's Recurve Bow", icon: "assets/ui/capybara_cartoon_kit/equipment_icons/equipment_bow.png", rarity: "rare", baseAtk: 50, critBonus: 0.08 },
    { id: "w4", slot: "weapon", name: "Mystic Oak Staff", icon: "assets/ui/capybara_cartoon_kit/equipment_icons/equipment_staff.png", rarity: "epic", baseAtk: 75, skillBoost: 0.15 },
    { id: "w5", slot: "weapon", name: "Capybara Excalibur", icon: "assets/ui/capybara_cartoon_kit/equipment_icons/equipment_sword.png", rarity: "legendary", baseAtk: 120, critBonus: 0.15, lifestealBonus: 0.10 },

    // Armors
    { id: "a1", slot: "armor", name: "Leaf Tunic", icon: "assets/ui/capybara_cartoon_kit/equipment_icons/equipment_armor.png", rarity: "common", baseHp: 80 },
    { id: "a2", slot: "armor", name: "Sturdy Leather Vest", icon: "assets/ui/capybara_cartoon_kit/equipment_icons/equipment_armor.png", rarity: "uncommon", baseHp: 160 },
    { id: "a3", slot: "armor", name: "Knight's Steel Cuirass", icon: "assets/ui/capybara_cartoon_kit/equipment_icons/equipment_armor.png", rarity: "rare", baseHp: 280, defBonus: 10 },
    { id: "a4", slot: "armor", name: "Dragonhide Plate", icon: "assets/ui/capybara_cartoon_kit/equipment_icons/equipment_armor.png", rarity: "epic", baseHp: 450, defBonus: 20 },
    { id: "a5", slot: "armor", name: "Royal Aegis Cloak", icon: "assets/ui/capybara_cartoon_kit/equipment_icons/equipment_armor.png", rarity: "legendary", baseHp: 750, defBonus: 35, regen: 0.05 },

    // Helmets
    { id: "h1", slot: "helmet", name: "Acorn Cap", icon: "assets/ui/capybara_cartoon_kit/equipment_icons/equipment_helmet.png", rarity: "common", baseDef: 6 },
    { id: "h2", slot: "helmet", name: "Copper Helm", icon: "assets/ui/capybara_cartoon_kit/equipment_icons/equipment_helmet.png", rarity: "uncommon", baseDef: 14 },
    { id: "h3", slot: "helmet", name: "Gladiator Visor", icon: "assets/ui/capybara_cartoon_kit/equipment_icons/equipment_helmet.png", rarity: "rare", baseDef: 25, hpBonus: 60 },
    { id: "h4", slot: "helmet", name: "Crown of Thorns", icon: "assets/ui/capybara_cartoon_kit/equipment_icons/equipment_helmet.png", rarity: "epic", baseDef: 40, reflect: 0.15 },
    { id: "h5", slot: "helmet", name: "Monarch's Golden Tiara", icon: "assets/ui/capybara_cartoon_kit/equipment_icons/equipment_helmet.png", rarity: "legendary", baseDef: 65, hpBonus: 200, critBonus: 0.10 },

    // Boots
    { id: "b1", slot: "boots", name: "Straw Sandals", icon: "assets/ui/capybara_cartoon_kit/equipment_icons/equipment_boots.png", rarity: "common", baseDodge: 0.04, baseHp: 30 },
    { id: "b2", slot: "boots", name: "Traveler's Moccasins", icon: "assets/ui/capybara_cartoon_kit/equipment_icons/equipment_boots.png", rarity: "uncommon", baseDodge: 0.08, baseHp: 70 },
    { id: "b3", slot: "boots", name: "Windrunner Greaves", icon: "assets/ui/capybara_cartoon_kit/equipment_icons/equipment_boots.png", rarity: "rare", baseDodge: 0.14, baseHp: 130 },
    { id: "b4", slot: "boots", name: "Shadowfang Treads", icon: "assets/ui/capybara_cartoon_kit/equipment_icons/equipment_boots.png", rarity: "epic", baseDodge: 0.20, baseHp: 220 },
    { id: "b5", slot: "boots", name: "Pegasus Hoofwear", icon: "assets/ui/capybara_cartoon_kit/equipment_icons/equipment_boots.png", rarity: "legendary", baseDodge: 0.28, baseHp: 380, speedBonus: 0.25 },

    // Rings
    { id: "r1", slot: "ring", name: "Copper Band", icon: "assets/ui/capybara_cartoon_kit/equipment_icons/equipment_ring.png", rarity: "common", baseCrit: 0.05 },
    { id: "r2", slot: "ring", name: "Emerald Ring", icon: "assets/ui/capybara_cartoon_kit/equipment_icons/equipment_ring.png", rarity: "uncommon", baseCrit: 0.10, baseAtk: 10 },
    { id: "r3", slot: "ring", name: "Ruby Signet", icon: "assets/ui/capybara_cartoon_kit/equipment_icons/equipment_ring.png", rarity: "rare", baseCrit: 0.16, baseAtk: 25 },
    { id: "r4", slot: "ring", name: "Ring of Oblivion", icon: "assets/ui/capybara_cartoon_kit/equipment_icons/equipment_ring.png", rarity: "epic", baseCrit: 0.24, critDmg: 0.40 },
    { id: "r5", slot: "ring", name: "Celestial Band", icon: "assets/ui/capybara_cartoon_kit/equipment_icons/equipment_ring.png", rarity: "legendary", baseCrit: 0.32, critDmg: 0.65, baseAtk: 50 },

    // Amulets
    { id: "m1", slot: "amulet", name: "Wooden Talisman", icon: "assets/ui/capybara_cartoon_kit/equipment_icons/equipment_amulet.png", rarity: "common", baseLifesteal: 0.04 },
    { id: "m2", slot: "amulet", name: "Silver Pendant", icon: "assets/ui/capybara_cartoon_kit/equipment_icons/equipment_amulet.png", rarity: "uncommon", baseLifesteal: 0.08, baseHp: 50 },
    { id: "m3", slot: "amulet", name: "Heart of the Grove", icon: "assets/ui/capybara_cartoon_kit/equipment_icons/equipment_amulet.png", rarity: "rare", baseLifesteal: 0.14, baseHp: 120 },
    { id: "m4", slot: "amulet", name: "Bloodstone Choker", icon: "assets/ui/capybara_cartoon_kit/equipment_icons/equipment_amulet.png", rarity: "epic", baseLifesteal: 0.22, baseAtk: 30 },
    { id: "m5", slot: "amulet", name: "Amulet of Immortality", icon: "assets/ui/capybara_cartoon_kit/equipment_icons/equipment_amulet.png", rarity: "legendary", baseLifesteal: 0.30, baseHp: 300, baseAtk: 45 }
  ],

  // Permanent Talents System (Persistent account perks)
  talents: [
    { id: "t_might", name: "Capybara Might", icon: "assets/ui/capybara_cartoon_kit/equipment_icons/equipment_sword.png", desc: "+8 Base ATK per rank", costBase: 100, costMult: 1.5, maxRank: 20, stat: "atk", valPerRank: 8 },
    { id: "t_vitality", name: "Sturdy Resilience", icon: "assets/ui/capybara_cartoon_kit/equipment_icons/equipment_armor.png", desc: "+45 Base HP per rank", costBase: 100, costMult: 1.5, maxRank: 20, stat: "hp", valPerRank: 45 },
    { id: "t_fur", name: "Thick Fur Armor", icon: "assets/ui/capybara_cartoon_kit/equipment_icons/equipment_helmet.png", desc: "+3 Base DEF per rank", costBase: 120, costMult: 1.5, maxRank: 20, stat: "def", valPerRank: 3 },
    { id: "t_greed", name: "Treasure Sniffer", icon: "assets/items/loot/loot_001.png", desc: "+6% Gold gain per rank", costBase: 150, costMult: 1.6, maxRank: 10, stat: "goldBonus", valPerRank: 0.06 },
    { id: "t_spirit", name: "Fiery Spirit", icon: "assets/ui/capybara_cartoon_kit/bars/rage_fill.png", desc: "Start runs with +10 initial Rage", costBase: 200, costMult: 1.8, maxRank: 5, stat: "startRage", valPerRank: 10 },
    { id: "t_fortune", name: "Citrus Fortune", icon: "assets/skills/skill_009.png", desc: "+3% Epic/Legendary drop chance", costBase: 300, costMult: 2.0, maxRank: 5, stat: "luck", valPerRank: 0.03 }
  ],

  // Adventure Random Events Pool
  events: [
    {
      id: "spring",
      title: "Sacred Sparkling Spring",
      icon: "assets/effects/fx_heal_ring.png",
      dialog: "You discover a crystal-clear spring surrounded by blooming lilies. The water sparkles with warm life energy.",
      options: [
        { label: "Drink Spring Water", desc: "Restore 40% of Max HP", action: "heal_pct", val: 0.40 },
        { label: "Toss a Gold Coin (25 🪙)", desc: "Pray for a permanent blessing (+15% ATK)", action: "pray_blessing", costGold: 25 }
      ]
    },
    {
      id: "witch",
      title: "Forest Witch's Cauldron",
      icon: "assets/skills/skill_012.png",
      dialog: "A quirky smiling witch stirs an aromatic cauldron. 'Care for a sip of my supreme potion, little capybara?'",
      options: [
        { label: "Drink Boldly", desc: "Gain +30% ATK & +15% Crit, but lose 15% current HP", action: "witch_brew" },
        { label: "Decline Politely", desc: "The witch giggles and hands you 30 Gold instead", action: "add_gold", val: 30 }
      ]
    },
    {
      id: "merchant",
      title: "Wandering Badger Merchant",
      icon: "assets/items/loot/loot_002.png",
      dialog: "'Greetings, brave traveler! Rare goods from distant kingdoms, specially discounted today!'",
      options: [
        { label: "Buy Healing Tonic (50 🪙)", desc: "Heal 60% HP immediately", action: "heal_pct", costGold: 50, val: 0.60 },
        { label: "Buy Mystery Skill Tome (120 🪙)", desc: "Learn a random powerful skill immediately", action: "buy_skill", costGold: 120 },
        { label: "Wave Goodbye", desc: "Save your coins for later", action: "pass" }
      ]
    },
    {
      id: "campfire",
      title: "Warm Travelers' Campsite",
      icon: "assets/effects/fx_critical_burst.png",
      dialog: "You find a Campsite. A cozy crackling fire in a safe clearing relaxes your weary limbs.",
      options: [
        { label: "Roast Sweet Potato", desc: "Restore 30% HP and gain +10% Max HP this run", action: "camp_buff" },
        { label: "Sharpen Claws by the Fire", desc: "Gain +15% ATK for this run", action: "camp_atk" }
      ]
    },
    {
      id: "chest",
      title: "Ornate Ancient Chest",
      icon: "assets/items/loot/loot_003.png",
      dialog: "An antique chest sits half-buried under creeping vines, gleaming with gold gilding.",
      options: [
        { label: "Pry Chest Open", desc: "Claim Gold, Gems, and gear!", action: "open_event_chest" },
        { label: "Carefully Inspect for Traps", desc: "Disarm mechanism to guarantee extra gems!", action: "open_safe_chest" }
      ]
    },
    {
      id: "shrine",
      title: "Divine Celestial Shrine",
      icon: "assets/effects/fx_levelup_spark.png",
      dialog: "An ancient shrine dedicated to the Capybara Ancestors resonates with radiant light.",
      options: [
        { label: "Touch the Monolith", desc: "Choose 1 of 3 Divine Skill Cards", action: "skill_select" }
      ]
    },
    {
      id: "gambler",
      title: "Goblin's Dice Table",
      icon: "assets/items/loot/loot_004.png",
      dialog: "A grinning goblin rattles golden dice in a cup. 'Double your gold, or lose a tiny wager, friend!'",
      options: [
        { label: "Wager 50 🪙 (50% Chance to win 120 🪙)", desc: "Test your fortune!", action: "gamble_dice", costGold: 50 },
        { label: "Shake Head & Pass", desc: "A prudent capybara keeps their purse", action: "pass" }
      ]
    },
    {
      id: "yuzu_tree",
      title: "Golden Yuzu Orchard",
      icon: "assets/skills/skill_009.png",
      dialog: "A rare fragrant orchard laden with plump golden citrus fruits. The absolute favorite of all capybaras!",
      options: [
        { label: "Bath in Yuzu Hot Spring", desc: "Fully restore HP & fill Rage to 100%!", action: "yuzu_spa" },
        { label: "Harvest Golden Yuzu (Gain 20 💎)", desc: "Store the precious fruits for gems", action: "add_gems", val: 20 }
      ]
    },
    // Mysterious Merchant
    {
      id: "mysterious_merchant",
      title: "Mysterious Merchant",
      dialog: "A cloaked figure steps out of the shadows, showing you a collection of rare items. \"For the right price... anything can be yours,\" he whispers.",
      icon: "🛒",
      options: [
        { label: "Buy Rare Potion (200 Gold)", costGold: 200, action: "heal_pct", val: 0.50, result: "You chug the potion! Restored 50% HP!" },
        { label: "Buy Attack Scroll (350 Gold)", costGold: 350, action: "atk_boost", val: 0.20, result: "Power surges through you! +20% ATK for this run!" },
        { label: "Decline & Walk Away", action: "nothing", result: "You walk away. Perhaps he'll appear again..." }
      ]
    },
    // Ancient Shrine
    {
      id: "ancient_shrine",
      title: "Ancient Shrine",
      dialog: "A moss-covered stone shrine stands at the crossroads, emanating a warm, golden glow. Ancient runes shimmer invitingly.",
      icon: "⛩️",
      options: [
        { label: "Pray for Strength", action: "atk_boost", val: 0.15, result: "The shrine glows! ATK blessed by +15%!" },
        { label: "Pray for Endurance", action: "hp_boost", val: 0.20, result: "You feel invincible! Max HP +20% for this run!" },
        { label: "Pray for Fortune", action: "gold_reward", val: 280, result: "Golden coins rain from the shrine! +280 Gold!" }
      ]
    },
    // Dragon Egg Found
    {
      id: "dragon_egg",
      title: "Dragon Egg!",
      dialog: "Hidden under a pile of ancient rubble, you discover a pulsating crimson egg. It hums with fierce draconic energy...",
      icon: "🥚",
      options: [
        { label: "Absorb its power", action: "atk_boost", val: 0.25, result: "Dragon power surges through you! ATK +25%!" },
        { label: "Smash it open", action: "gold_reward", val: 450, result: "Ancient gold coins spill out! +450 Gold!" },
        { label: "Leave it alone", action: "nothing", result: "You decide to leave the mysterious egg undisturbed." }
      ]
    },
    // Rainbow Spring
    {
      id: "rainbow_spring",
      title: "Rainbow Spring",
      dialog: "A magical spring bubbles with water of every color of the rainbow. Creatures flock here from all over the realm to be healed.",
      icon: "🌈",
      options: [
        { label: "Take a full bath", action: "heal_full", result: "Fully refreshed! HP fully restored + DEF +10!" },
        { label: "Just sip a little", action: "heal_pct", val: 0.30, result: "Feeling better! Restored 30% HP." }
      ]
    },
    // Lost Traveler
    {
      id: "lost_traveler",
      title: "Lost Traveler",
      dialog: "A bewildered adventurer sits by the road, muttering about monsters and treasure. They look like they need help.",
      icon: "🧙",
      options: [
        { label: "Help them find the way", action: "gems_reward", val: 5, result: "Grateful, they reward you with 5 Gems!" },
        { label: "Share your food (50 Gold)", costGold: 50, action: "atk_boost", val: 0.10, result: "They share battle tips in return! ATK +10%!" },
        { label: "Ignore them", action: "nothing", result: "You walk on. Every adventurer for themselves." }
      ]
    },
    // Cursed Chest
    {
      id: "cursed_chest",
      title: "Cursed Chest",
      dialog: "A glittering chest sits in the middle of the road. But dark energy swirls around it... Opening it could be glorious or catastrophic.",
      icon: "🗃️",
      options: [
        { label: "Open it! (Risk/Reward)", action: "cursed_chest_gamble", result: "" },
        { label: "Leave it alone", action: "nothing", result: "Better safe than sorry. You leave the chest." }
      ]
    },
    // Capy Village Festival
    {
      id: "capy_village",
      title: "Capy Village Festival!",
      dialog: "You stumble upon a festive Capybara village! The smell of roasted food fills the air. The villagers recognize you as a hero!",
      icon: "🏘️",
      options: [
        { label: "Feast & Rest", action: "heal_pct", val: 0.40, result: "Feasted like a king! Restored 40% HP!" },
        { label: "Trade with merchants", action: "gold_reward", val: 200, result: "Good trades! Earned 200 Gold!" },
        { label: "Train with the guards", action: "atk_boost", val: 0.12, result: "Trained hard! ATK +12%!" }
      ]
    },
    // Meteor Strike
    {
      id: "meteor_strike",
      title: "METEOR STRIKE!",
      dialog: "The sky darkens... a searing streak of light tears through the clouds and CRASHES nearby! The shockwave knocks you off your feet!",
      icon: "☄️",
      options: [
        { label: "Investigate the crater", action: "atk_boost", val: 0.30, result: "Cosmic energy absorbed! ATK +30%! But HP -10%!" },
        { label: "Collect meteor fragments", action: "gold_reward", val: 600, result: "Rare meteor ore! +600 Gold!" },
        { label: "Run away!", action: "nothing", result: "You sprint away. The meteor narrowly missed you!" }
      ]
    }
  ],

  // Fortunes & Bad Luck (Authentic Capybara Go! Stream Events)
  minorFortunes: [
    // === AUTHENTIC MAJOR FORTUNE (From Screenshot 1) ===
    {
      id: "knightly_combat_book",
      category: "Major Fortune",
      text: "Knightly combat requires comprehensive martial training. You carefully study <span class=\"highlight-blue\">Olga Crownsword</span>'s knight manual.",
      pills: [
        { icon: "🗡️", text: "ATK+21%", valClass: "val-green" },
        { icon: "🪙", text: "Gain Gold+100", valClass: "val-cyan" }
      ],
      type: "multi",
      buffs: [
        { type: "atk_pct", val: 0.21 },
        { type: "gold", val: 100 }
      ]
    },
    // === AUTHENTIC MINOR FORTUNE (From Screenshot 2) ===
    {
      id: "fairy_rescue",
      category: "Minor Fortune",
      text: "You rescue a tiny fairy trapped in a jar. In gratitude, she sprinkles <span class=\"highlight-orange\">restorative dust</span> over you.",
      pills: [
        { icon: "❤️", text: "Restore 30% HP", valClass: "val-yellow" }
      ],
      type: "heal_pct",
      val: 0.30
    },
    // === AUTHENTIC BAD LUCK (From Screenshot 3) ===
    {
      id: "treasure_map_scam",
      category: "Bad Luck",
      text: "A wandering merchant convinced you to throw coins into a '<span class=\"highlight-orange\">wishing well</span>' that was actually a drain pipe.",
      pills: [
        { icon: "🗡️", text: "ATK-5%", valClass: "val-red" }
      ],
      type: "atk_debuff",
      val: 0.05
    },
    // === ADDITIONAL MAJOR FORTUNES ===
    {
      id: "thunderstorm_strike",
      category: "Major Fortune",
      text: "A <span class=\"highlight-blue\">Thunderstorm</span> booms and lightning streaks the stormy sky, imbuing your blade with storm power.",
      pills: [
        { icon: "⚡", text: "ATK+10%", valClass: "val-green" }
      ],
      type: "atk_pct",
      val: 0.10
    },
    {
      id: "starlight_dew",
      category: "Major Fortune",
      text: "Celestial starlight crystallizes into pure dew, bathing the <span class=\"highlight-creature\">Capybara Hero</span> in divine vigor.",
      pills: [
        { icon: "⭐", text: "ATK+5%", valClass: "val-green" },
        { icon: "❤️", text: "Max HP+5%", valClass: "val-green" }
      ],
      type: "all_pct",
      val: 0.05
    },
    {
      id: "angel_statue_blessing",
      category: "Major Fortune",
      text: "A radiant <span class=\"highlight-creature\">Angel Statue</span> glows brilliantly, bestowing legendary divine protection.",
      pills: [
        { icon: "👼", text: "Max HP+15%", valClass: "val-green" }
      ],
      type: "hp_pct",
      val: 0.15
    },
    {
      id: "dragon_treasure_hoard",
      category: "Major Fortune",
      text: "You discover a sleeping dragon's hoard overflowing with <span class=\"highlight-creature\">Golden Goblets</span> and gems!",
      pills: [
        { icon: "🪙", text: "Gain Gold+300", valClass: "val-cyan" },
        { icon: "💎", text: "Gain Gems+30", valClass: "val-cyan" }
      ],
      type: "jackpot",
      val: 300
    },
    // === ADDITIONAL MINOR FORTUNES ===
    {
      id: "unicorn_blessing",
      category: "Minor Fortune",
      text: "You heal an injured <span class=\"highlight-creature\">unicorn</span> and receive its blessing.",
      pills: [
        { icon: "❤️", text: "Max HP+7%", valClass: "val-green" }
      ],
      type: "hp_pct",
      val: 0.07
    },
    {
      id: "ancient_whetstone",
      category: "Minor Fortune",
      text: "You discover an ancient whetstone beside a <span class=\"highlight-creature\">mossy shrine</span> and hone your blade.",
      pills: [
        { icon: "🗡️", text: "ATK+5%", valClass: "val-green" }
      ],
      type: "atk_pct",
      val: 0.05
    },
    {
      id: "ironbark_shield",
      category: "Minor Fortune",
      text: "A friendly wood-carpenter gifts you a reinforced <span class=\"highlight-creature\">ironbark shield</span>.",
      pills: [
        { icon: "🛡️", text: "DEF+6%", valClass: "val-green" }
      ],
      type: "def_pct",
      val: 0.06
    },
    {
      id: "spring_melon",
      category: "Minor Fortune",
      text: "You share a delicious sweet water melon with a <span class=\"highlight-creature\">wild beaver</span> friend.",
      pills: [
        { icon: "💖", text: "Restore 25% HP", valClass: "val-yellow" }
      ],
      type: "heal_pct",
      val: 0.25
    },
    {
      id: "clover_patch",
      category: "Minor Fortune",
      text: "You stumble across a glowing four-leaf <span class=\"highlight-creature\">clover</span> dancing in the wind.",
      pills: [
        { icon: "🎯", text: "Crit Rate+3%", valClass: "val-green" }
      ],
      type: "crit_pct",
      val: 0.03
    },
    {
      id: "travelers_pouch",
      category: "Minor Fortune",
      text: "A lost pouch of shining imperial currency was tucked under a <span class=\"highlight-creature\">giant mushroom</span>.",
      pills: [
        { icon: "🪙", text: "Gain Gold+120", valClass: "val-cyan" }
      ],
      type: "gold",
      val: 120
    },
    // === BAD LUCK (TAKDIR BURUK - RENAMED FROM MISFORTUNE) ===
    {
      id: "poison_thorn_bush",
      category: "Bad Luck",
      text: "You trip into a venomous <span class=\"highlight-danger\">thorn briar</span>! Sharp brambles pierce your fur.",
      pills: [
        { icon: "💔", text: "HP -15%", valClass: "val-red" }
      ],
      type: "dmg_pct",
      val: 0.15
    },
    {
      id: "rusty_curse",
      category: "Bad Luck",
      text: "A wicked marsh swamp mist rusts your <span class=\"highlight-danger\">steel weapon</span>.",
      pills: [
        { icon: "🗡️", text: "ATK-5%", valClass: "val-red" }
      ],
      type: "atk_debuff",
      val: 0.05
    },
    {
      id: "sneaky_goblin_pickpocket",
      category: "Bad Luck",
      text: "A sneaky <span class=\"highlight-danger\">Goblin Thief</span> cuts your coin sack and scurries into the woods!",
      pills: [
        { icon: "🪙", text: "Gold -80", valClass: "val-red" }
      ],
      type: "lose_gold",
      val: 80
    },
    {
      id: "falling_boulder_trap",
      category: "Bad Luck",
      text: "A loose <span class=\"highlight-danger\">granite boulder</span> tumbles down the cliffside, smashing your shield!",
      pills: [
        { icon: "🛡️", text: "DEF-4%", valClass: "val-red" }
      ],
      type: "def_debuff",
      val: 0.04
    },
    {
      id: "swamp_leech_bite",
      category: "Bad Luck",
      text: "A swarm of ravenous <span class=\"highlight-danger\">Swamp Leeches</span> clings to you, draining vitality.",
      pills: [
        { icon: "🩸", text: "HP -10%", valClass: "val-red" }
      ],
      type: "dmg_pct",
      val: 0.10
    }
  ],

  achievements: [
    { id: "first_blood", name: "First Blood", desc: "Win your very first battle", icon: "🗡️", condition: "battles_won", target: 1, reward: { gold: 100 } },
    { id: "survivalist", name: "Survivalist", desc: "Survive until Day 40 in any run", icon: "🛡️", condition: "max_day_reached", target: 40, reward: { gold: 500, gems: 10 } },
    { id: "dragon_slayer", name: "Dragon Slayer", desc: "Use Dragon Roar skill 10 times", icon: "🐉", condition: "dragon_roar_used", target: 10, reward: { gold: 300, gems: 5 } },
    { id: "void_master", name: "Void Master", desc: "Use Black Hole skill 5 times", icon: "🌑", condition: "black_hole_used", target: 5, reward: { gold: 300, gems: 5 } },
    { id: "collector", name: "Skill Collector", desc: "Collect 10 different skills in one run", icon: "⭐", condition: "skills_in_run", target: 10, reward: { gems: 20 } },
    { id: "gold_rush", name: "Gold Rush", desc: "Accumulate 50,000 total Gold", icon: "💰", condition: "total_gold_earned", target: 50000, reward: { gems: 50 } },
    { id: "chapter_master", name: "Chapter Master", desc: "Clear all 6 chapters", icon: "👑", condition: "chapters_cleared", target: 6, reward: { gems: 100 } },
    { id: "boss_hunter", name: "Boss Hunter", desc: "Defeat 10 bosses", icon: "💀", condition: "bosses_defeated", target: 10, reward: { gold: 800, gems: 15 } },
    { id: "iron_will", name: "Iron Will", desc: "Complete 20 runs total", icon: "⚔️", condition: "total_runs", target: 20, reward: { gold: 1000, gems: 25 } },
    { id: "speedrunner", name: "Speedrunner", desc: "Beat a chapter boss within 30 seconds", icon: "⚡", condition: "boss_fast_kill", target: 1, reward: { gold: 500, gems: 10 } },
    { id: "lucky_star", name: "Lucky Star", desc: "Spin the Fortune Wheel 10 times", icon: "🎰", condition: "wheel_spins", target: 10, reward: { gold: 200, gems: 5 } },
    { id: "perfect_run", name: "Perfect Run", desc: "Complete a run without dying", icon: "💎", condition: "perfect_runs", target: 1, reward: { gems: 30 } },
    { id: "merchant_friend", name: "Merchant Friend", desc: "Buy from the Mysterious Merchant 5 times", icon: "🛒", condition: "merchant_buys", target: 5, reward: { gold: 400 } },
    { id: "nature_lover", name: "Nature Lover", desc: "Visit the Rainbow Spring 3 times", icon: "🌈", condition: "spring_visits", target: 3, reward: { gold: 300, gems: 5 } },
    { id: "chapter_1_clear", name: "Gale Town Hero", desc: "Clear Gale Town (Chapter 1)", icon: "🏙️", condition: "chapter_cleared", target: 1, reward: { gold: 500, gems: 10 } },
    { id: "chapter_2_clear", name: "Forest Ranger", desc: "Clear Whispering Woods (Chapter 2)", icon: "🌲", condition: "chapter_cleared", target: 2, reward: { gold: 800, gems: 15 } },
    { id: "chapter_3_clear", name: "Desert Fox", desc: "Clear Sunken Desert (Chapter 3)", icon: "🏜️", condition: "chapter_cleared", target: 3, reward: { gold: 1200, gems: 20 } },
    { id: "chapter_4_clear", name: "Frost Walker", desc: "Clear Frozen Peaks (Chapter 4)", icon: "❄️", condition: "chapter_cleared", target: 4, reward: { gold: 1800, gems: 30 } },
    { id: "chapter_5_clear", name: "Lava Strider", desc: "Clear Molten Core (Chapter 5)", icon: "🌋", condition: "chapter_cleared", target: 5, reward: { gold: 2500, gems: 40 } },
    { id: "high_roller", name: "High Roller", desc: "Win 1000+ gold from a single event", icon: "🎲", condition: "single_event_gold", target: 1000, reward: { gems: 15 } }
  ],

  fortuneWheelSlots: [
    { label: "500 Gold", type: "gold", value: 500, color: "#f59e0b", icon: "🪙", weight: 25 },
    { label: "1000 Gold", type: "gold", value: 1000, color: "#f97316", icon: "💰", weight: 15 },
    { label: "5 Gems", type: "gems", value: 5, color: "#3b82f6", icon: "💎", weight: 20 },
    { label: "15 Gems", type: "gems", value: 15, color: "#8b5cf6", icon: "💎", weight: 10 },
    { label: "200 Gold", type: "gold", value: 200, color: "#eab308", icon: "🪙", weight: 30 },
    { label: "ATK +20%", type: "atk_boost", value: 0.20, color: "#ef4444", icon: "⚔️", weight: 8 },
    { label: "Full Heal", type: "heal_full", value: 1, color: "#22c55e", icon: "💚", weight: 10 },
    { label: "JACKPOT!", type: "gems", value: 50, color: "#ec4899", icon: "🌟", weight: 2 }
  ],

  dailyLoginRewards: [
    { day: 1, gold: 200, gems: 0, icon: "🪙" },
    { day: 2, gold: 300, gems: 0, icon: "🪙" },
    { day: 3, gold: 300, gems: 3, icon: "💎" },
    { day: 4, gold: 500, gems: 0, icon: "🪙" },
    { day: 5, gold: 500, gems: 5, icon: "💎" },
    { day: 6, gold: 800, gems: 0, icon: "🪙" },
    { day: 7, gold: 1000, gems: 20, icon: "🌟" }
  ],

  battlePassTracks: {
    season: "Season 1: Rise of the Dragon",
    endDate: "2026-11-30",
    free: [
      { level: 1, reward: { gold: 500 }, icon: "🪙" },
      { level: 5, reward: { gold: 1000 }, icon: "🪙" },
      { level: 10, reward: { gold: 2000, gems: 10 }, icon: "💎" },
      { level: 15, reward: { gold: 3000 }, icon: "🪙" },
      { level: 20, reward: { gold: 5000, gems: 25 }, icon: "💎" },
      { level: 25, reward: { gold: 8000, gems: 50 }, icon: "🌟" }
    ],
    premium: [
      { level: 1, reward: { gems: 10 }, icon: "💎" },
      { level: 5, reward: { gems: 20, gold: 1000 }, icon: "💎" },
      { level: 10, reward: { gems: 50, gold: 3000 }, icon: "🌟" },
      { level: 15, reward: { gems: 80, gold: 5000 }, icon: "🌟" },
      { level: 20, reward: { gems: 150, gold: 10000 }, icon: "👑" },
      { level: 25, reward: { gems: 300, gold: 20000 }, icon: "👑" }
    ]
  }
};

if (typeof module !== "undefined") module.exports = GameData;
