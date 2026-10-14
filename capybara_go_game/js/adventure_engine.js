// Capybara Go! - 60-Day Roguelike Adventure Journey Engine
class AdventureEngine {
  constructor(renderer, battleSystem) {
    this.renderer = renderer;
    this.battleSystem = battleSystem;

    this.autoTravel = false;
    this.traveling = false;
    this.currentEvent = null;

    this.onEventTriggered = null; // UI Callback
    this.onRunComplete = null;    // UI Callback
    this.onLevelUpSkill = null;   // UI Callback
    this.onTravelStateChange = null; // UI Callback for button state
  }

  startChapter(chapterId) {
    if (!Character.startRun(chapterId)) {
      return false;
    }

    const chapter = GameData.chapters.find(c => c.id === chapterId);
    this.renderer.setBackground(chapter.bg);
    this.renderer.setPlayerAnim("idle");
    this.renderer.scrollSpeed = 0;

    Sound.playMusic("adventure");
    this.currentEvent = null;
    if (this.onTravelStateChange) this.onTravelStateChange("ready");
    return true;
  }

  travelNextDay() {
    if (this.traveling || this.battleSystem.inBattle) return;
    if (this.hasPendingChest || (this.renderer && this.renderer.chestState)) {
      if (window.Game && window.Game.ui) {
        window.Game.ui.openTreasureChestModal();
      }
      return;
    }
    if (!Character.activeRun) return;

    const run = Character.activeRun;
    if (run.day > run.maxDays) {
      this.handleChapterVictory();
      return;
    }

    this.traveling = true;
    this.currentEvent = null;
    if (this.onTravelStateChange) this.onTravelStateChange("moving");

    // Start Walking animation & Parallax background scrolling
    this.renderer.setPlayerAnim("walk");
    this.renderer.scrollSpeed = 3.5 * this.battleSystem.speedMultiplier;

    const travelDuration = 900 / this.battleSystem.speedMultiplier;
    setTimeout(() => {
      this.renderer.setPlayerAnim("idle");
      this.renderer.scrollSpeed = 0;
      this.traveling = false;

      this.processDayEvent(run.day);
    }, travelDuration);
  }

  processDayEvent(day) {
    const run = Character.activeRun;
    const chapter = GameData.chapters.find(c => c.id === run.chapterId);

    // 1. Check Milestone Boss Day (Days 20, 40, 60)
    if (chapter.bossDays && chapter.bossDays[day]) {
      const bossKey = chapter.bossDays[day];
      const bossData = GameData.bosses[bossKey];
      this.currentEvent = {
        type: "boss",
        title: `👑 Day ${day}: Boss Milestone!`,
        desc: `A menacing shadow looms over the horizon... The ${bossData.name} blocks your path!`,
        bossData: bossData
      };
      if (this.onEventTriggered) this.onEventTriggered(this.currentEvent);
      return;
    }

    // 2. Check Elite Monster Day (Days 10, 30, 50)
    if (day % 10 === 0) {
      const enemyPool = chapter.enemies;
      const enemyKey = enemyPool[Math.floor(Math.random() * enemyPool.length)];
      const raw = GameData.enemies[enemyKey];
      const eliteData = {
        ...raw,
        name: `Elite ${raw.name}`,
        hp: Math.round(raw.hp * 1.8),
        atk: Math.round(raw.atk * 1.5),
        exp: Math.round(raw.exp * 2.2),
        gold: Math.round(raw.gold * 2.5),
        scale: raw.scale * 1.15
      };

      this.currentEvent = {
        type: "elite",
        title: `⚔️ Day ${day}: Elite Encounter!`,
        desc: `An exceptionally fierce ${eliteData.name} ambushes you with blazing eyes!`,
        enemyData: eliteData
      };
      if (this.onEventTriggered) this.onEventTriggered(this.currentEvent);
      return;
    }

    // 3. Regular Day:
    // Event category distribution (Authentic Capybara Go stream pacing):
    // 65% Fortune & Luck Stream
    // 20% Combat (max 2 consecutive combats)
    // 15% Narrative Event / Campsite / Shrines
    run.consecutiveCombat = run.consecutiveCombat || 0;
    const roll = Math.random();

    let dayEventType = "fortune";
    if (day === 1) {
      dayEventType = "fortune";
    } else if (run.consecutiveCombat >= 2) {
      dayEventType = roll < 0.80 ? "fortune" : "narrative";
    } else if (roll < 0.65) {
      dayEventType = "fortune";
    } else if (roll < 0.85) {
      dayEventType = "combat";
    } else {
      dayEventType = "narrative";
    }

    if (dayEventType === "fortune") {
      run.consecutiveCombat = 0;
      let fortune;
      if (day === 1) {
        // Guarantee Olga Crownsword Major Fortune on Day 1 for immediate demonstration!
        const allFortunes = GameData.minorFortunes;
        fortune = allFortunes.find(f => f.id === "knightly_combat_book") || allFortunes[0];
        run.majorFortunePity = 0;
        run.lastFortuneCategory = "Major Fortune";
      } else {
        fortune = this.rollAdventureFortune(run);
      }
      
      // Apply immediate stat buff / heal / gold / penalties (Bad Luck vs Fortune)
      this.applyFortuneEffect(fortune, run);

      this.currentEvent = {
        type: "minor_fortune",
        day: day,
        title: `Day ${day}`,
        desc: fortune.text,
        fortuneData: fortune
      };
      if (this.onEventTriggered) this.onEventTriggered(this.currentEvent);

      run.day++;
      Character.save();

      if (this.autoTravel && !this.battleSystem.inBattle) {
        setTimeout(() => {
          this.travelNextDay();
        }, 1200 / this.battleSystem.speedMultiplier);
      }
    } else if (dayEventType === "combat") {
      run.consecutiveCombat = (run.consecutiveCombat || 0) + 1;
      const enemyPool = chapter.enemies;
      const enemyKey = enemyPool[Math.floor(Math.random() * enemyPool.length)];
      const enemyData = GameData.enemies[enemyKey];

      this.currentEvent = {
        type: "combat",
        day: day,
        title: `⚔️ Day ${day}: Wild Monster`,
        desc: `A wild ${enemyData.name} leaps from the brush, challenging you to battle!`,
        enemyData: enemyData
      };
      if (this.onEventTriggered) this.onEventTriggered(this.currentEvent);
    } else {
      run.consecutiveCombat = 0;
      const eventDef = GameData.events[Math.floor(Math.random() * GameData.events.length)];
      this.currentEvent = {
        type: "narrative",
        day: day,
        title: `Day ${day}: ${eventDef.title}`,
        desc: eventDef.dialog,
        eventDef: eventDef
      };
      if (this.onEventTriggered) this.onEventTriggered(this.currentEvent);
    }
  }

  startCurrentCombat() {
    if (!this.currentEvent) return;

    if (this.currentEvent.type === "boss") {
      this.battleSystem.startBattle(this.currentEvent.bossData, true, (res) => this.onBattleFinished(res));
    } else if (this.currentEvent.type === "combat" || this.currentEvent.type === "elite") {
      this.battleSystem.startBattle(this.currentEvent.enemyData, false, (res) => this.onBattleFinished(res));
    }
  }

  onBattleFinished(result) {
    if (result.victory) {
      const run = Character.activeRun;
      run.day++;

      // Check if boss defeated on Day 60 -> Chapter Clear!
      if (result.isBoss && run.day > run.maxDays) {
        this.handleChapterVictory();
        return;
      }

      // Roll chance for Roguelike Skill Selection or Equipment drop (Matches Video Project 2)
      const shouldOfferSkill = (run.day % 3 === 0) || result.isBoss;
      if (shouldOfferSkill) {
        if (window.Game && window.Game.ui && window.Game.ui.triggerFallingChest) {
          this.hasPendingChest = true;
          window.Game.ui.triggerFallingChest({
            storyText: `The ${result.isBoss ? 'mighty Boss' : 'swordsman'} falls, and you obtain a <span class="highlight-blue">Golden Chest</span>, but it's clear the humans won't stop here.`,
            onClaimed: () => {
              this.hasPendingChest = false;
              if (this.onTravelStateChange) this.onTravelStateChange("ready");
              this.checkAutoAdvance();
            }
          });
        } else if (this.onLevelUpSkill) {
          this.offerSkillCards(() => {
            if (this.onTravelStateChange) this.onTravelStateChange("ready");
            this.checkAutoAdvance();
          });
        }
      } else {
        if (this.onTravelStateChange) this.onTravelStateChange("ready");
        this.checkAutoAdvance();
      }
    } else {
      // Run Defeat
      Character.endRun(false);
      if (this.onRunComplete) {
        this.onRunComplete(false);
      }
    }
  }

  resolveNarrativeChoice(optionIndex) {
    if (!this.currentEvent || !this.currentEvent.eventDef) return;
    const ev = this.currentEvent.eventDef;
    const opt = ev.options[optionIndex];
    if (!opt) return;

    const run = Character.activeRun;

    // Check cost
    if (opt.costGold && Character.gold < opt.costGold) {
      return { success: false, msg: "Not enough gold!" };
    }
    if (opt.costGold) {
      Character.addGold(-opt.costGold);
    }

    let resultMsg = "";
    if (opt.action === "heal_pct") {
      const healAmt = Math.round(run.maxHp * opt.val);
      run.currentHp = Math.min(run.maxHp, run.currentHp + healAmt);
      Sound.playSfx("heal");
      this.renderer.addVisualEffect("healRing", this.renderer.playerState.x, this.renderer.playerState.y);
      this.renderer.addFloatingText(healAmt, this.renderer.playerState.x, this.renderer.playerState.y - 20, "heal");
      resultMsg = `Restored ${healAmt} HP!`;
      if (window.Game && window.Game.ui) window.Game.ui.renderRunStatsBar(true);
    } else if (opt.action === "pray_blessing") {
      run.bonusAtkPct = (run.bonusAtkPct || 0) + 0.15;
      Sound.playSfx("magicBurst");
      resultMsg = "Blessed by the sacred waters: +15% ATK!";
    } else if (opt.action === "witch_brew") {
      run.bonusAtkPct = (run.bonusAtkPct || 0) + 0.30;
      run.bonusCrit = (run.bonusCrit || 0) + 0.15;
      const dmg = Math.round(run.currentHp * 0.15);
      run.currentHp = Math.max(1, run.currentHp - dmg);
      Sound.playSfx("hit");
      this.renderer.addFloatingText(dmg, this.renderer.playerState.x, this.renderer.playerState.y - 20, "poison");
      resultMsg = `Gained +30% ATK & +15% Crit! (Lost ${dmg} HP)`;
      if (window.Game && window.Game.ui) window.Game.ui.renderRunStatsBar(true);
    } else if (opt.action === "add_gold") {
      Character.addGold(opt.val);
      resultMsg = `Received ${opt.val} Gold!`;
      return { success: true, msg: resultMsg, goldWon: opt.val };
    } else if (opt.action === "add_gems") {
      Character.gems += opt.val;
      Sound.playSfx("gem");
      resultMsg = `Received ${opt.val} Gems!`;
      return { success: true, msg: resultMsg, gemsWon: opt.val };
    } else if (opt.action === "camp_buff") {
      const healAmt = Math.round(run.maxHp * 0.30);
      run.currentHp = Math.min(run.maxHp, run.currentHp + healAmt);
      run.bonusHpPct = (run.bonusHpPct || 0) + 0.10;
      run.maxHp = Math.round(run.maxHp * 1.10);
      Sound.playSfx("heal");
      resultMsg = `Cozy feast: Healed ${healAmt} HP and Max HP +10%!`;
      if (window.Game && window.Game.ui) window.Game.ui.renderRunStatsBar(true);
    } else if (opt.action === "camp_atk") {
      run.bonusAtkPct = (run.bonusAtkPct || 0) + 0.15;
      Sound.playSfx("slash");
      resultMsg = "Sharp claws: +15% ATK for this run!";
    } else if (opt.action === "open_event_chest" || opt.action === "open_safe_chest") {
      Sound.playSfx("chestOpen");
      const dropGold = 80 + Math.floor(Math.random() * 120);
      const dropGems = opt.action === "open_safe_chest" ? 25 : 10;
      Character.addGold(dropGold);
      Character.gems += dropGems;

      // 40% chance for equipment drop
      if (Math.random() < 0.45) {
        const tmpl = GameData.equipmentTemplates[Math.floor(Math.random() * GameData.equipmentTemplates.length)];
        const item = Character.createItemFromTemplate(tmpl.id, 1);
        Character.inventory.push(item);
        resultMsg = `Found ${dropGold} 🪙, ${dropGems} 💎, and [${item.name}]!`;
      } else {
        resultMsg = `Found ${dropGold} 🪙 and ${dropGems} 💎!`;
      }
      return { success: true, msg: resultMsg, goldWon: dropGold, gemsWon: dropGems };
    } else if (opt.action === "gamble_dice") {
      const won = Math.random() < 0.50;
      if (won) {
        Character.addGold(120);
        resultMsg = "Lucky roll! You won 120 Gold!";
        return { success: true, msg: resultMsg, goldWon: 120 };
      } else {
        Sound.playSfx("uiCancel");
        resultMsg = "Snake eyes! The goblin laughs as you lose the wager.";
      }
    } else if (opt.action === "yuzu_spa") {
      run.currentHp = run.maxHp;
      run.rage = 100;
      Sound.playSfx("heal");
      this.renderer.addVisualEffect("healRing", this.renderer.playerState.x, this.renderer.playerState.y);
      resultMsg = "Ultimate Yuzu bliss! HP fully restored & 100% Rage!";
      if (window.Game && window.Game.ui) window.Game.ui.renderRunStatsBar(true);
    } else if (opt.action === "skill_select") {
      this.offerSkillCards(() => {
        this.advanceAfterNarrative();
      });
      return { success: true, pendingSkill: true };
    } else {
      resultMsg = "You travel onwards.";
    }

    Character.save();
    this.advanceAfterNarrative();
    return { success: true, msg: resultMsg };
  }

  advanceAfterNarrative() {
    const run = Character.activeRun;
    if (run) {
      run.day++;
      if (run.day > run.maxDays) {
        this.handleChapterVictory();
      } else {
        this.checkAutoAdvance();
      }
    }
  }

  offerSkillCards(onSelectedCallback) {
    const run = Character.activeRun;
    const available = GameData.skills.filter(s => 
      !run.skills.some(owned => owned.id === s.id) && 
      s.rarity !== "mythic" && 
      !s.isChestExclusive
    );
    
    // If hero hasn't chosen any skill yet this run, offer the 3 iconic authentic skills matching Image 1
    let candidates = null;
    if (!run.skills || run.skills.length === 0) {
      const iconic = available.filter(s => s.id === 41 || s.id === 42 || s.id === 43);
      if (iconic.length === 3) {
        candidates = iconic;
      }
    }
    if (!candidates || candidates.length < 3) {
      const shuffled = [...available].sort(() => 0.5 - Math.random());
      candidates = shuffled.slice(0, 3);
    }

    Sound.playSfx("levelUp");
    if (this.onLevelUpSkill) {
      this.onLevelUpSkill(candidates, (chosenSkill) => {
        run.skills.push(chosenSkill);
        Sound.playSfx("confirm");
        this.renderer.addVisualEffect("critBurst", this.renderer.playerState.x, this.renderer.playerState.y, 1.3);
        Character.save();

        if (this.onEventTriggered) {
          this.onEventTriggered({
            type: "skill_learned",
            day: run.day,
            desc: `You've learned <span class="highlight-blue">${chosenSkill.name}</span>.`
          });
        }

        if (onSelectedCallback) onSelectedCallback();
      });
    }
  }

  checkAutoAdvance() {
    if (this.hasPendingChest || (this.renderer && this.renderer.chestState)) return;
    if (this.autoTravel && !this.battleSystem.inBattle && Character.activeRun) {
      setTimeout(() => {
        if (this.hasPendingChest || (this.renderer && this.renderer.chestState)) return;
        this.travelNextDay();
      }, 700 / this.battleSystem.speedMultiplier);
    }
  }

  handleChapterVictory() {
    const run = Character.activeRun;
    const chapter = GameData.chapters.find(c => c.id === run.chapterId);

    Character.gold += chapter.rewardGold;
    Character.gems += chapter.rewardGems;

    Character.endRun(true);
    Sound.playSfx("stageClear");

    if (this.onRunComplete) {
      this.onRunComplete(true, chapter);
    }
  }

  applyFortuneEffect(fortune, run) {
    if (!fortune) return;
    if (fortune.type === "multi" && Array.isArray(fortune.buffs)) {
      fortune.buffs.forEach(b => this.applyFortuneEffect(b, run));
      return;
    }
    if (fortune.type === "hp_pct") {
      run.bonusHpPct = (run.bonusHpPct || 0) + fortune.val;
      const oldMax = run.maxHp;
      run.maxHp = Math.round(run.maxHp * (1 + fortune.val));
      run.currentHp += (run.maxHp - oldMax);
      this.renderer.addVisualEffect("healRing", this.renderer.playerState.x, this.renderer.playerState.y);
      if (window.Game && window.Game.ui) window.Game.ui.renderRunStatsBar(true);
    } else if (fortune.type === "atk_pct") {
      run.bonusAtkPct = (run.bonusAtkPct || 0) + fortune.val;
      this.renderer.addVisualEffect("critBurst", this.renderer.playerState.x, this.renderer.playerState.y);
      this.renderer.addFloatingText(`+${Math.round(fortune.val * 100)}% ATK`, this.renderer.playerState.x, this.renderer.playerState.y - 20, "crit");
    } else if (fortune.type === "def_pct") {
      run.bonusDef = (run.bonusDef || 0) + Math.max(2, Math.round(15 * fortune.val));
      this.renderer.addVisualEffect("shieldPulse", this.renderer.playerState.x, this.renderer.playerState.y);
    } else if (fortune.type === "heal_pct") {
      const healAmt = Math.round(run.maxHp * fortune.val);
      run.currentHp = Math.min(run.maxHp, run.currentHp + healAmt);
      this.renderer.addVisualEffect("healRing", this.renderer.playerState.x, this.renderer.playerState.y);
      this.renderer.addFloatingText(`+${healAmt} HP`, this.renderer.playerState.x, this.renderer.playerState.y - 20, "heal");
      if (window.Game && window.Game.ui) window.Game.ui.renderRunStatsBar(true);
    } else if (fortune.type === "crit_pct") {
      run.bonusCrit = (run.bonusCrit || 0) + fortune.val;
    } else if (fortune.type === "all_pct") {
      run.bonusAtkPct = (run.bonusAtkPct || 0) + fortune.val;
      run.bonusHpPct = (run.bonusHpPct || 0) + fortune.val;
      run.maxHp = Math.round(run.maxHp * (1 + fortune.val));
      this.renderer.addVisualEffect("critBurst", this.renderer.playerState.x, this.renderer.playerState.y, 1.4);
      if (window.Game && window.Game.ui) window.Game.ui.renderRunStatsBar(true);
    } else if (fortune.type === "gold") {
      Character.addGold(fortune.val);
      this.renderer.addFloatingText(`+${fortune.val} 🪙`, this.renderer.playerState.x, this.renderer.playerState.y - 20, "heal");
    } else if (fortune.type === "jackpot") {
      Character.addGold(fortune.val);
      Character.gems += 30;
      this.renderer.addVisualEffect("critBurst", this.renderer.playerState.x, this.renderer.playerState.y, 1.6);
      this.renderer.addFloatingText("+300 🪙 +30 💎", this.renderer.playerState.x, this.renderer.playerState.y - 25, "crit");
    } else if (fortune.type === "dmg_pct") {
      // Bad Luck: lose HP
      const loss = Math.max(10, Math.round(run.currentHp * fortune.val));
      run.currentHp = Math.max(1, run.currentHp - loss);
      this.renderer.playerState.shake = 1.8;
      this.renderer.addVisualEffect("hitSpark", this.renderer.playerState.x, this.renderer.playerState.y - 10);
      this.renderer.addFloatingText(`-${loss} HP`, this.renderer.playerState.x, this.renderer.playerState.y - 20, "enemyDmg");
      if (window.Game && window.Game.ui) window.Game.ui.renderRunStatsBar(true);
    } else if (fortune.type === "atk_debuff") {
      // Bad Luck: reduce ATK
      run.bonusAtkPct = (run.bonusAtkPct || 0) - fortune.val;
      this.renderer.addFloatingText(`-${Math.round(fortune.val * 100)}% ATK`, this.renderer.playerState.x, this.renderer.playerState.y - 20, "poison");
    } else if (fortune.type === "def_debuff") {
      // Bad Luck: reduce DEF
      run.bonusDef = (run.bonusDef || 0) - 2;
      this.renderer.addFloatingText("-4% DEF", this.renderer.playerState.x, this.renderer.playerState.y - 20, "poison");
    } else if (fortune.type === "lose_gold") {
      // Bad Luck: stolen gold
      const lost = Math.min(Character.gold, fortune.val);
      Character.addGold(-lost);
      this.renderer.addFloatingText(`-${lost} 🪙`, this.renderer.playerState.x, this.renderer.playerState.y - 20, "poison");
    }
  }

  rollAdventureFortune(run) {
    const allFortunes = GameData.minorFortunes || [];
    const minorPool = allFortunes.filter(f => f.category === "Minor Fortune");
    const majorPool = allFortunes.filter(f => f.category === "Major Fortune");
    const badLuckPool = allFortunes.filter(f => f.category === "Bad Luck");

    run.majorFortunePity = (run.majorFortunePity || 0) + 1;
    const lastCat = run.lastFortuneCategory || null;

    let targetCategory = "Minor Fortune";

    // Pity system: guarantee Major Fortune if pity reaches 5
    if (run.majorFortunePity >= 5) {
      targetCategory = "Major Fortune";
    } else if (lastCat === "Major Fortune") {
      // Major Cooldown: no back-to-back major fortunes
      targetCategory = Math.random() < 0.75 ? "Minor Fortune" : "Bad Luck";
    } else if (lastCat === "Bad Luck") {
      // Bad Luck shield: never 2 bad lucks in a row
      targetCategory = Math.random() < 0.22 ? "Major Fortune" : "Minor Fortune";
    } else {
      // Standard weighted distribution: ~18% Major, ~22% Bad Luck, ~60% Minor
      const r = Math.random();
      if (r < 0.18) {
        targetCategory = "Major Fortune";
      } else if (r < 0.40) {
        targetCategory = "Bad Luck";
      } else {
        targetCategory = "Minor Fortune";
      }
    }

    let candidatePool = minorPool;
    if (targetCategory === "Major Fortune") {
      candidatePool = majorPool.length > 0 ? majorPool : allFortunes;
      run.majorFortunePity = 0;
    } else if (targetCategory === "Bad Luck") {
      candidatePool = badLuckPool.length > 0 ? badLuckPool : minorPool;
    }

    run.lastFortuneCategory = targetCategory;

    // Anti-duplicate protection: avoid repeating the last 3 events
    run.recentEventIds = run.recentEventIds || [];
    let availableEvents = candidatePool.filter(e => !run.recentEventIds.includes(e.id));
    if (availableEvents.length === 0) availableEvents = candidatePool;

    const picked = availableEvents[Math.floor(Math.random() * availableEvents.length)] || candidatePool[0];
    run.recentEventIds.push(picked.id);
    if (run.recentEventIds.length > 3) run.recentEventIds.shift();

    return picked;
  }
}

