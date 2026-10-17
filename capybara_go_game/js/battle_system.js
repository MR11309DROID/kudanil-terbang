// Capybara Go! - Dynamic Turn-Based Battle System (With Action Lunges & Dynamic FX)
class BattleSystem {
  constructor(renderer) {
    this.renderer = renderer;
    this.inBattle = false;
    this.turnTimer = null;
    this.turnCount = 0;
    this.speedMultiplier = 1.0;

    this.capybaraCombat = null;
    this.enemyCombat = null;

    this.onEndCallback = null;
    this.onBattleStart = null;
    this.onFightSplash = null;
    this.onRoundChange = null;
    this.onBattleEnd = null;
  }

  setSpeed(mult) {
    this.speedMultiplier = mult;
  }

  startBattle(enemyData, isBoss = false, onEndCallback = null) {
    this.inBattle = true;
    this.renderer.inBattle = true;
    this.turnCount = 0;
    this.onEndCallback = onEndCallback;

    // Switch BGM
    Sound.playMusic("battle");
    if (isBoss) {
      Sound.playSfx("bossRoar");
    }

    // Initialize Combatants
    const run = Character.activeRun;
    const stats = Character.getEffectiveStats();

    this.capybaraCombat = {
      name: "Capybara Hero",
      hp: run.currentHp,
      maxHp: run.maxHp,
      atk: stats.atk,
      def: stats.def,
      critRate: stats.critRate,
      critDmg: stats.critDmg,
      dodgeRate: stats.dodgeRate,
      lifesteal: stats.lifesteal,
      rage: run.rage || 0,
      shield: run.shield || 0,
      frozenTurns: 0,
      stunnedTurns: 0,
      skills: run.skills || []
    };

    if (this.renderer && this.renderer.playerState) {
      this.renderer.playerState.currentHp = run.currentHp;
      this.renderer.playerState.maxHp = run.maxHp;
      this.renderer.playerState.animHp = run.currentHp;
      this.renderer.playerState.shield = run.shield || 0;
    }

    this.enemyCombat = {
      id: enemyData.id,
      name: enemyData.name,
      sprite: enemyData.sprite,
      hp: enemyData.hp,
      maxHp: enemyData.hp,
      atk: enemyData.atk,
      def: enemyData.def,
      critRate: enemyData.crit || 0.05,
      dodgeRate: enemyData.dodge || 0.05,
      exp: enemyData.exp,
      gold: enemyData.gold,
      isBoss: isBoss,
      skill: enemyData.skill,
      skillMultiplier: enemyData.skillMultiplier || 1.8,
      frozenTurns: 0,
      burnDoT: 0,
      poisonDoT: 0
    };

    // Spawn Enemy in Canvas (waiting directly at its post, enemy DOES NOT slide in towards player)
    this.renderer.spawnEnemy(enemyData, isBoss);

    if (this.onBattleStart) {
      this.onBattleStart(this.enemyCombat);
    }

    // Character runs forward heroically to confront the waiting monster!
    this.renderer.performPlayerEncounterApproach(() => {
      if (!this.inBattle) return;

      // Trigger dramatic FIGHT! intro splash (Supports Regular, Elite, and Boss)
      if (this.onFightSplash) {
        this.onFightSplash(this.enemyCombat, isBoss, () => {
          if (this.inBattle) {
            this.nextTurn();
          }
        });
      } else {
        this.nextTurn();
      }
    }, this.speedMultiplier);
  }

  nextTurn() {
    if (!this.inBattle) return;
    this.turnCount++;

    if (this.onRoundChange) {
      this.onRoundChange(this.turnCount, 30);
    }

    // Step 1: Capybara Turn (charges forward, strikes, hops back)
    this.executePlayerTurn(() => {
      if (!this.inBattle) return;

      // Check if enemy dead
      if (this.enemyCombat.hp <= 0) {
        this.handleVictory();
        return;
      }

      // Step 2: Enemy Turn (charges forward, strikes, hops back)
      const delayBetween = 350 / this.speedMultiplier;
      setTimeout(() => {
        if (!this.inBattle) return;
        this.executeEnemyTurn(() => {
          if (!this.inBattle) return;

          // Check if player dead
          if (this.capybaraCombat.hp <= 0) {
            this.handleDefeat();
            return;
          }

          // Loop next turn
          const loopDelay = 350 / this.speedMultiplier;
          setTimeout(() => {
            this.nextTurn();
          }, loopDelay);
        });
      }, delayBetween);
    });
  }

  executePlayerTurn(callback) {
    const c = this.capybaraCombat;
    const e = this.enemyCombat;
    const r = this.renderer;

    // Apply Passive Turn Regen & Periodic Shields
    let statChanged = false;
    for (const sk of c.skills) {
      if (sk.turnRegen) {
        const healAmt = Math.round(c.maxHp * sk.turnRegen);
        c.hp = Math.min(c.maxHp, c.hp + healAmt);
        if (sk.id === 204 || sk.key === "common_04_heal" || (sk.name && sk.name.toLowerCase().includes("heal"))) {
          if (r.performPlayerHeal) {
            r.performPlayerHeal(healAmt, null, this.speedMultiplier);
          } else {
            r.setPlayerAnim("heal", false);
            Sound.playSfx("heal");
            r.addVisualEffect("healRing", r.playerState.x, r.groundY - 30);
            r.addMagicImpactSparks(r.playerState.x, r.groundY - 35, ["#4ade80", "#86efac", "#ffffff"]);
            r.addFloatingText(healAmt, r.playerState.x, r.groundY - 50, "heal");
          }
        } else {
          r.addFloatingText(healAmt, r.playerState.x, r.groundY - 50, "heal");
        }
        statChanged = true;
      }
      if (sk.shieldInterval && this.turnCount % sk.shieldInterval === 0) {
        c.shield = Math.round(c.maxHp * sk.shieldRatio);
        Sound.playSfx("shield");
        r.addVisualEffect("shieldPulse", r.playerState.x, r.groundY - 45);
        r.addFloatingText(c.shield, r.playerState.x, r.groundY - 55, "shield");
        statChanged = true;
      }
    }
    if (statChanged) {
      this.syncPlayerRunStats();
    }

    // Check DoTs on enemy
    if (e.burnDoT > 0 && r.enemyState) {
      e.hp -= e.burnDoT;
      r.enemyState.currentHp = Math.max(0, e.hp);
      r.addFloatingText(e.burnDoT, r.enemyState.x, r.groundY - 40, "burn");
    }
    if (e.poisonDoT > 0 && r.enemyState) {
      e.hp -= e.poisonDoT;
      r.enemyState.currentHp = Math.max(0, e.hp);
      r.addFloatingText(e.poisonDoT, r.enemyState.x, r.groundY - 40, "poison");
    }

    if (e.hp <= 0) {
      callback();
      return;
    }

    // Turn 1 Opener Skills or Periodic Procs (Dragon Roar & Bomb)
    const dragonSkill = c.skills.find(s => (s.key === "mythic_02_dragon_roar" || (s.name && s.name.includes("Dragon"))));
    const shouldDragonTrigger = dragonSkill && ((this.turnCount === 1 && dragonSkill.startCombatDmg) || (this.turnCount > 1 && this.turnCount % 4 === 0));

    if (shouldDragonTrigger && r.enemyState && r.launchDragonBreath) {
      const mult = this.turnCount === 1 ? Math.min(0.40, dragonSkill.startCombatDmg || 0.40) : 0.35;
      const roarDmg = Math.max(1, Math.round((c.atk * mult) - (e.def * 0.30)));
      r.launchDragonBreath(
        r.playerState.x,
        r.groundY - 50,
        r.enemyState.x,
        r.groundY - 50,
        () => {
          e.hp -= roarDmg;
          if (r.enemyState) {
            r.enemyState.currentHp = Math.max(0, e.hp);
            r.addFloatingText(roarDmg, r.enemyState.x, r.groundY - 60, "crit");
          }
          this.syncPlayerRunStats();
        },
        () => {
          callback();
        },
        this.speedMultiplier
      );
      return;
    }

    if (this.turnCount === 1 && r.enemyState) {
      const bombOpener = c.skills.find(s => (s.key === "common_10_bomb" || (s.name && s.name.includes("Bomb"))) && s.startCombatDmg);
      if (bombOpener && r.launchBombToss) {
        const mult = Math.min(0.35, bombOpener.startCombatDmg || 0.35);
        const bombDmg = Math.max(1, Math.round((c.atk * mult) - (e.def * 0.30)));
        r.launchBombToss(r.playerState.x, r.groundY - 50, r.enemyState.x, r.groundY - 20, () => {
          e.hp -= bombDmg;
          if (r.enemyState) {
            r.enemyState.currentHp = Math.max(0, e.hp);
            r.addFloatingText(bombDmg, r.enemyState.x, r.groundY - 55, "crit");
          }
        }, null, this.speedMultiplier);
      }
    }

    // Periodic Skill Procs (Black Hole singularity every 4 turns)
    const blackHoleSkill = c.skills.find(s => (s.key === "mythic_03_black_hole" || (s.name && s.name.includes("Black Hole"))) && this.turnCount % (s.procEvery || 4) === 0);
    if (blackHoleSkill && r.enemyState && r.launchBlackHole) {
      const mult = blackHoleSkill.dmgMult ? Math.min(blackHoleSkill.dmgMult, 0.25) : 0.25;
      const bhDmg = Math.max(1, Math.round((c.atk * mult) - (e.def * 0.30)));
      r.launchBlackHole(
        r.enemyState.x,
        r.groundY - 25,
        () => {
          e.hp -= bhDmg;
          if (r.enemyState) {
            r.enemyState.currentHp = Math.max(0, e.hp);
            r.addFloatingText(bhDmg, r.enemyState.x, r.groundY - 60, "void");
          }
          this.syncPlayerRunStats();
        },
        () => {
          callback();
        },
        this.speedMultiplier
      );
      return;
    }

    // Periodic Skill Procs (Thunder Hammer & Lightning bolts every 3 turns)
    const thunderSkill = c.skills.find(s => (s.key === "legendary_02_thunder_hammer" || s.effect === "thunder" || (s.name && s.name.includes("Thunder"))) && this.turnCount % (s.procEvery || 3) === 0);
    if (thunderSkill && r.enemyState) {
      const mult = Math.min(0.55, thunderSkill.dmgMult || 0.55);
      const boltDmg = Math.max(1, Math.round((c.atk * mult) - (e.def * 0.30)));
      if (r.launchThunderHammerStrike) {
        r.launchThunderHammerStrike(r.enemyState.x, r.groundY - 45, () => {
          e.hp -= boltDmg;
          if (r.enemyState) {
            r.enemyState.currentHp = Math.max(0, e.hp);
            r.addFloatingText(boltDmg, r.enemyState.x, r.groundY - 60, "crit");
          }
        }, null, this.speedMultiplier);
      } else {
        e.hp -= boltDmg;
        r.enemyState.currentHp = Math.max(0, e.hp);
        Sound.playSfx("lightning");
        r.addVisualEffect("critBurst", r.enemyState.x, r.groundY - 45, 1.5);
        r.addMagicImpactSparks(r.enemyState.x, r.groundY - 45, ["#fde047", "#38bdf8", "#ffffff"]);
        r.addFloatingText(boltDmg, r.enemyState.x, r.groundY - 60, "crit");
      }
    }

    // Periodic Skill Procs (Fireball splash every 3 turns)
    const fireballSkill = c.skills.find(s => (s.key === "legendary_08_fireball" || (s.name && s.name.includes("Fireball"))) && this.turnCount % (s.procEvery || 3) === 0);
    if (fireballSkill && r.enemyState && r.launchFireball) {
      const mult = Math.min(0.50, fireballSkill.dmgMult || 0.50);
      const fbDmg = Math.max(1, Math.round((c.atk * mult) - (e.def * 0.30)));
      r.launchFireball(r.playerState.x + 30, r.groundY - 45, r.enemyState.x, r.groundY - 45, () => {
        e.hp -= fbDmg;
        if (r.enemyState) {
          r.enemyState.currentHp = Math.max(0, e.hp);
          r.addFloatingText(fbDmg, r.enemyState.x, r.groundY - 55, "crit");
        }
      }, null, this.speedMultiplier);
    }

    // Companion Combat Support Action (Duck, Turtle, Crocodile, Baby Dragon)
    const activeCompanion = window.Character && window.Character.getActiveCompanionData && window.Character.getActiveCompanionData();
    const shouldCompanionTrigger = activeCompanion && (this.turnCount === 1 || (this.turnCount % (activeCompanion.skillCooldown || 3) === 0));

    if (shouldCompanionTrigger && r.enemyState && r.triggerCompanionCombatAction) {
      const compLv = (window.Character && window.Character.companionLevels && window.Character.companionLevels[activeCompanion.id]) || 1;
      const compPowerMult = 1 + (compLv - 1) * 0.15;

      if (activeCompanion.id === "duck") {
        // Duck: Heal Capybara + Splash Damage on Enemy
        const healAmt = Math.round(c.maxHp * 0.08 * compPowerMult);
        const splashDmg = Math.max(1, Math.round(c.atk * 0.50 * compPowerMult - e.def * 0.25));
        r.triggerCompanionCombatAction(
          "duck",
          r.playerState.x,
          r.groundY - 50,
          r.enemyState.x,
          r.groundY - 20,
          () => {
            c.hp = Math.min(c.maxHp, c.hp + healAmt);
            r.addFloatingText(healAmt, r.playerState.x, r.groundY - 60, "heal");
            e.hp -= splashDmg;
            if (r.enemyState) {
              r.enemyState.currentHp = Math.max(0, e.hp);
              r.addFloatingText(splashDmg, r.enemyState.x, r.groundY - 50, "normal");
            }
            this.syncPlayerRunStats();
          },
          null,
          this.speedMultiplier
        );

      } else if (activeCompanion.id === "turtle") {
        // Turtle: Deploy Protective Shield
        const shieldAmt = Math.round(c.maxHp * 0.16 * compPowerMult);
        r.triggerCompanionCombatAction(
          "turtle",
          r.playerState.x,
          r.groundY - 20,
          r.enemyState.x,
          r.groundY - 20,
          () => {
            c.shield = (c.shield || 0) + shieldAmt;
            r.addFloatingText(shieldAmt, r.playerState.x, r.groundY - 65, "shield");
            this.syncPlayerRunStats();
          },
          null,
          this.speedMultiplier
        );

      } else if (activeCompanion.id === "croc") {
        // Crocodile: Fast Snap Bite
        const crocDmg = Math.max(1, Math.round(c.atk * 1.35 * compPowerMult - e.def * 0.35));
        r.triggerCompanionCombatAction(
          "croc",
          r.playerState.x,
          r.groundY - 15,
          r.enemyState.x,
          r.groundY - 15,
          () => {
            e.hp -= crocDmg;
            if (r.enemyState) {
              r.enemyState.currentHp = Math.max(0, e.hp);
              r.addFloatingText(crocDmg, r.enemyState.x, r.groundY - 60, "crit");
            }
          },
          null,
          this.speedMultiplier
        );

      } else if (activeCompanion.id === "dragon") {
        // Baby Dragon: Fire Breath + Burn DoT
        const flameDmg = Math.max(1, Math.round(c.atk * 0.90 * compPowerMult - e.def * 0.25));
        r.triggerCompanionCombatAction(
          "dragon",
          r.playerState.x,
          r.groundY - 45,
          r.enemyState.x,
          r.groundY - 25,
          () => {
            e.hp -= flameDmg;
            e.burnDoT = Math.max(e.burnDoT || 0, Math.round(c.atk * 0.30));
            if (r.enemyState) {
              r.enemyState.currentHp = Math.max(0, e.hp);
              r.addFloatingText(flameDmg, r.enemyState.x, r.groundY - 60, "crit");
            }
          },
          null,
          this.speedMultiplier
        );
      }
    }

    // Check Rage Ultimate (True Magic Hit / Meteor Strike!)
    if (c.rage >= 100) {
      c.rage = 0;
      Sound.playSfx("magicBurst");

      const meteorSkill = c.skills.find(s => s.key === "mythic_05_meteor_strike" || (s.name && s.name.includes("Meteor")));
      if (meteorSkill && r.launchMeteorStrike) {
        r.setPlayerAnim("skill", false);
        const ultMult = Math.min(1.60, meteorSkill.ultMult || 1.60);
        const dmg = Math.max(1, Math.round((c.atk * ultMult) - (e.def * 0.35)));
        r.launchMeteorStrike(r.enemyState.x, r.groundY - 20, () => {
          e.hp -= dmg;
          if (r.enemyState) {
            r.enemyState.currentHp = Math.max(0, e.hp);
            r.addFloatingText(dmg, r.enemyState.x, r.groundY - 65, "crit");
          }
          this.syncPlayerRunStats();
        }, () => {
          r.setPlayerAnim("idle", true);
          callback();
        }, this.speedMultiplier);
        return;
      }

      r.performPlayerUltimate(
        // On Impact
        () => {
          const ultMult = c.skills.find(s => s.ultMult)?.ultMult || 3.0;
          let dmg = Math.round(c.atk * ultMult);
          e.hp -= dmg;

          if (r.enemyState) {
            r.enemyState.currentHp = Math.max(0, e.hp);
            r.enemyState.flashWhite = 1.0;
            r.enemyState.shake = 2.0;
            r.enemyState.knockback = 24;

            const enemyCenterY = r.groundY - 48;
            // Dazzling Multi-layered Magic Effects
            r.addVisualEffect("critBurst", r.enemyState.x, enemyCenterY, 1.85);
            r.addVisualEffect("healRing", r.enemyState.x, enemyCenterY, 1.35);
            r.addMagicImpactSparks(r.enemyState.x, enemyCenterY);
            r.addFloatingText(dmg, r.enemyState.x, enemyCenterY - 25, "crit");
          }
          this.syncPlayerRunStats();
        },
        // On Complete
        () => {
          callback();
        },
        this.speedMultiplier
      );
      return;
    }

    // Normal Attack Lunge (Physical Punch Strike - Normal Clean Hit Effects)
    r.performPlayerAttack(
      // On Impact
      () => {
        const isCrit = Math.random() < c.critRate;
        const swordSlashSkill = c.skills.find(s => s.id === 201 || s.key === "common_01_sword_slash" || (s.name && s.name.toLowerCase().includes("sword slash")));
        const swordMult = swordSlashSkill ? (swordSlashSkill.dmgMult || 1.30) : 1.0;
        let dmg = Math.max(1, Math.round(((c.atk * swordMult) * (isCrit ? c.critDmg : 1.0)) - (e.def * 0.4)));

        if (e.isBoss) {
          const giantSlayer = c.skills.find(s => s.bossDmgBonus);
          if (giantSlayer) dmg = Math.round(dmg * (1 + giantSlayer.bossDmgBonus));
        }

        e.hp -= dmg;
        if (r.enemyState) {
          r.enemyState.currentHp = Math.max(0, e.hp);
          r.enemyState.flashWhite = isCrit ? 0.45 : 0.25;
          r.enemyState.shake = isCrit ? 0.8 : 0.4;
          r.enemyState.knockback = isCrit ? 8 : 4;

          const targetCenterY = r.groundY - 45;

          if (isCrit) {
            Sound.playSfx("attackHeavy");
            // Clean cartoon hit spark for crit strike with neon cyan energy flecks
            r.addVisualEffect("hitSpark", r.enemyState.x, targetCenterY, 0.95);
            r.addMagicImpactSparks(r.enemyState.x, targetCenterY, ["#38bdf8", "#0284c7", "#ffffff"]);
            r.addFloatingText(dmg, r.enemyState.x, targetCenterY - 15, "crit");
          } else {
            Sound.playSfx("slash");
            // Clean subtle hit spark for sword strike
            r.addVisualEffect("hitSpark", r.enemyState.x, targetCenterY, 0.7);
            if (swordSlashSkill) {
              r.addMagicImpactSparks(r.enemyState.x, targetCenterY, ["#38bdf8", "#7dd3fc"]);
            }
            r.addFloatingText(dmg, r.enemyState.x, targetCenterY - 15, "normal");
          }
        }

        // Lifesteal
        if (c.lifesteal > 0) {
          const healAmt = Math.round(dmg * c.lifesteal);
          if (healAmt > 0) {
            c.hp = Math.min(c.maxHp, c.hp + healAmt);
            r.addVisualEffect("healRing", r.playerState.x, r.groundY - 40);
            r.addFloatingText(healAmt, r.playerState.x, r.groundY - 50, "heal");
            this.syncPlayerRunStats();
          }
        }

        // Freeze (Magic Ice Hit)
        const freezeSkill = c.skills.find(s => s.freezeChance);
        if (freezeSkill && Math.random() < freezeSkill.freezeChance && r.enemyState) {
          e.frozenTurns = 1;
          Sound.playSfx("ice");
          r.addVisualEffect("iceShatter", r.enemyState.x, r.groundY - 45, 1.4);
          r.addMagicImpactSparks(r.enemyState.x, r.groundY - 45, ["#93c5fd", "#38bdf8", "#e0f2fe"]);
          r.addFloatingText("FROZEN!", r.enemyState.x, r.groundY - 60, "dodge");
        }

        // Burn / Poison DoT procs
        const burnSkill = c.skills.find(s => s.dotBurn);
        if (burnSkill) e.burnDoT = Math.round(c.atk * burnSkill.dotBurn);
        const poisonSkill = c.skills.find(s => s.dotPoison);
        if (poisonSkill) e.poisonDoT = Math.round(c.atk * poisonSkill.dotPoison);

        // Rage gain
        const rageMult = c.skills.find(s => s.rageBoost)?.rageBoost || 0;
        c.rage = Math.min(100, c.rage + Math.round(14 * (1 + rageMult)));

        this.syncPlayerRunStats();
      },
      // On Complete
      () => {
        // Check Double Strike perk
        const doubleSkill = c.skills.find(s => s.doubleHitChance);
        if (doubleSkill && Math.random() < doubleSkill.doubleHitChance && e.hp > 0) {
          r.addFloatingText("DOUBLE STRIKE!", r.playerState.x, r.groundY - 60, "crit");
          setTimeout(() => {
            r.performPlayerAttack(
              () => {
                let dmg2 = Math.max(1, Math.round((c.atk * 0.85) - (e.def * 0.4)));
                e.hp -= dmg2;
                if (r.enemyState) {
                  r.enemyState.currentHp = Math.max(0, e.hp);
                  r.enemyState.flashWhite = 0.25;
                  r.enemyState.shake = 0.4;
                  r.enemyState.knockback = 4;
                  Sound.playSfx("enemyHit");
                  r.addVisualEffect("hitSpark", r.enemyState.x, r.groundY - 45, 0.7);
                  r.addFloatingText(dmg2, r.enemyState.x, r.groundY - 60, "normal");
                }
                this.syncPlayerRunStats();
              },
              () => {
                callback();
              },
              this.speedMultiplier
            );
          }, 180 / this.speedMultiplier);
        } else {
          callback();
        }
      },
      this.speedMultiplier
    );
  }

  executeEnemyTurn(callback) {
    const c = this.capybaraCombat;
    const e = this.enemyCombat;
    const r = this.renderer;

    // Check Frozen
    if (e.frozenTurns > 0) {
      e.frozenTurns--;
      if (r.enemyState) {
        r.addFloatingText("Thawing...", r.enemyState.x, r.groundY - 50, "dodge");
      }
      setTimeout(callback, 250 / this.speedMultiplier);
      return;
    }

    // Check Dodge
    const didDodge = Math.random() < c.dodgeRate;
    if (didDodge) {
      Sound.playSfx("dodge");
      r.addFloatingText("DODGE!", r.playerState.x, r.groundY - 50, "dodge");

      // Counterattack skill on dodge
      const counterSkill = c.skills.find(s => s.counterOnDodge);
      if (counterSkill && r.enemyState) {
        const counterDmg = Math.round(c.atk * 1.3);
        e.hp -= counterDmg;
        r.enemyState.currentHp = Math.max(0, e.hp);
        r.enemyState.shake = 1.0;
        r.enemyState.knockback = 12;
        r.addVisualEffect("slash", r.enemyState.x, r.groundY - 45);
        r.addFloatingText(counterDmg, r.enemyState.x, r.groundY - 55, "crit");
      }

      setTimeout(callback, 300 / this.speedMultiplier);
      return;
    }

    // Enemy Charges Forward and Strikes
    r.performEnemyAttack(
      // On Impact
      () => {
        let rawDmg = e.atk;
        if (e.isBoss && Math.random() < 0.3) {
          rawDmg = Math.round(e.atk * e.skillMultiplier);
          Sound.playSfx("bossHit");
          if (r.enemyState) {
            r.addFloatingText(e.skill + "!", r.enemyState.x, r.groundY - 65, "crit");
          }
        } else {
          Sound.playSfx("attackLight");
        }

        let dmg = Math.max(1, Math.round(rawDmg - (c.def * 0.4)));

        const redSkill = c.skills.find(s => s.dmgReduction);
        if (redSkill) {
          const redVal = Math.min(0.12, redSkill.dmgReduction || 0.10);
          dmg = Math.round(dmg * (1 - redVal));
        }

        // Absorb with Shield
        if (c.shield > 0) {
          if (c.shield >= dmg) {
            c.shield -= dmg;
            r.addVisualEffect("shieldPulse", r.playerState.x, r.groundY - 45);
            r.addFloatingText("Absorbed!", r.playerState.x, r.groundY - 55, "shield");
            dmg = 0;
          } else {
            dmg -= c.shield;
            c.shield = 0;
          }
        }

        if (dmg > 0) {
          c.hp = Math.max(0, c.hp - dmg);
          r.setPlayerAnim("hurt", false);
          r.playerState.flashWhite = 1.0;
          r.playerState.shake = 1.2;
          r.playerState.knockback = 15;
          Sound.playSfx("hit");
          r.addVisualEffect("hitSpark", r.playerState.x, r.groundY - 45, 1.2);
          r.addFloatingText(dmg, r.playerState.x, r.groundY - 55, "normal");

          c.rage = Math.min(100, c.rage + 16);

          // Thorns
          const thornsSkill = c.skills.find(s => s.reflectRatio);
          if (thornsSkill && r.enemyState) {
            const reflectDmg = Math.round(dmg * thornsSkill.reflectRatio);
            e.hp -= reflectDmg;
            r.enemyState.currentHp = Math.max(0, e.hp);
            r.addFloatingText(reflectDmg, r.enemyState.x, r.groundY - 45, "burn");
          }
        }

        this.syncPlayerRunStats();
      },
      // On Complete
      () => {
        callback();
      },
      this.speedMultiplier
    );
  }

  handleVictory() {
    this.inBattle = false;
    Sound.playSfx("enemyDie");

    const e = this.enemyCombat;
    const run = Character.activeRun;

    Character.bestiary[e.name] = (Character.bestiary[e.name] || 0) + 1;

    const goldBonus = (1 + (run.skills.find(s => s.goldBonus)?.goldBonus || 0) + ((Character.talents.t_greed || 0) * 0.06));
    const earnedGold = Math.round(e.gold * goldBonus);
    const earnedExp = e.exp;

    Character.addGold(earnedGold);
    run.runExp += earnedExp;

    if (window.Game && window.Game.ui && earnedGold > 0) {
      const canvasRect = this.renderer.canvas.getBoundingClientRect();
      const enemyScreenX = canvasRect.left + (this.renderer.enemyState ? this.renderer.enemyState.x : this.renderer.canvas.width * 0.75);
      const enemyScreenY = canvasRect.top + (this.renderer.enemyState ? this.renderer.enemyState.y : this.renderer.canvas.height * 0.65);
      window.Game.ui.triggerCoinFountain({ x: enemyScreenX, y: enemyScreenY }, earnedGold);
    }

    if (e.isBoss) {
      Sound.playSfx("stageClear");
    } else {
      Sound.playSfx("victory");
    }

    setTimeout(() => {
      this.renderer.inBattle = false;
      this.renderer.clearEnemy();
      this.renderer.setPlayerAnim("idle", true);
      Sound.playMusic("adventure");

      if (this.onBattleEnd) {
        this.onBattleEnd(true, earnedGold);
      }

      if (this.onEndCallback) {
        this.onEndCallback({ victory: true, isBoss: e.isBoss, gold: earnedGold, exp: earnedExp });
      }
    }, 600 / this.speedMultiplier);
  }

  handleDefeat() {
    const run = Character.activeRun;
    const c = this.capybaraCombat;
    const r = this.renderer;

    const reviveSkill = c.skills.find(s => s.reviveOnce);
    if (reviveSkill && !run.reviveUsed) {
      run.reviveUsed = true;
      const reviveRatio = reviveSkill.reviveHpRatio || 0.5;
      c.hp = Math.round(c.maxHp * reviveRatio);
      Sound.playSfx("magicBurst");
      r.addVisualEffect("critBurst", r.playerState.x, r.groundY - 45, 2.2);
      r.addMagicImpactSparks(r.playerState.x, r.groundY - 45, ["#fde047", "#fef08a", "#ffffff"]);
      const reviveName = reviveSkill.name ? `${reviveSkill.name.toUpperCase()} REVIVE!` : "ANGEL REVIVE!";
      r.addFloatingText(reviveName, r.playerState.x, r.groundY - 60, "heal");
      r.setPlayerAnim("idle", true);
      this.syncPlayerRunStats();
      this.nextTurn();
      return;
    }

    this.inBattle = false;
    this.renderer.inBattle = false;
    r.setPlayerAnim("die", false);
    Sound.playSfx("defeat");

    setTimeout(() => {
      if (this.onBattleEnd) {
        this.onBattleEnd(false);
      }

      if (this.onEndCallback) {
        this.onEndCallback({ victory: false });
      }
    }, 1200 / this.speedMultiplier);
  }

  syncPlayerRunStats() {
    if (!Character.activeRun || !this.capybaraCombat) return;
    const c = this.capybaraCombat;
    Character.activeRun.currentHp = c.hp;
    Character.activeRun.rage = c.rage;
    Character.activeRun.shield = c.shield;

    if (this.renderer && this.renderer.playerState) {
      this.renderer.playerState.currentHp = c.hp;
      this.renderer.playerState.maxHp = c.maxHp;
      this.renderer.playerState.shield = c.shield;
    }

    if (window.Game && window.Game.ui) {
      window.Game.ui.renderRunStatsBar(true);
    }
  }
}
