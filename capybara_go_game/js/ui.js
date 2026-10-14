// Capybara Go! - Complete UI Controller & View Binding
class UIManager {
  constructor(adventureEngine, battleSystem) {
    this.engine = adventureEngine;
    this.battle = battleSystem;

    this.activeTab = "adventure";
    this.selectedItem = null;
    this.speedMult = 1.0;

    this.initEventListeners();
    this.initEngineCallbacks();
    this.renderHeader();
    this.renderActiveTab();
  }

  initEngineCallbacks() {
    this.engine.onEventTriggered = (event) => {
      this.renderAdventureEvent(event);
      this.renderHeader();
    };

    this.engine.onLevelUpSkill = (skillOptions, onChosen) => {
      this.showSkillChoiceModal(skillOptions, onChosen);
    };

    this.engine.onRunComplete = (victory, chapter) => {
      this.showRunSummaryModal(victory, chapter);
      this.renderHeader();
      this.renderActiveTab();
    };

    // Battle HUD Callbacks
    const battleHud = document.getElementById("stage-battle-hud");
    const roundText = document.getElementById("stage-round-text");
    const stageFloatingHeader = document.querySelector(".stage-floating-header");

    const fightSplash = document.getElementById("stage-fight-splash");

    this.battle.onBattleStart = () => {
      if (battleHud) battleHud.style.display = "block";
      if (stageFloatingHeader) stageFloatingHeader.style.display = "none";
      if (roundText) roundText.textContent = "Round 1/30";
      if (fightSplash) {
        fightSplash.style.display = "none";
        fightSplash.classList.remove("animate");
      }
    };

    const subtitleEl = document.getElementById("boss-incoming-subtitle");

    this.battle.onFightSplash = (enemyCombat, isBoss, onDone) => {
      if (fightSplash) {
        fightSplash.style.display = "flex";
        fightSplash.classList.remove("animate", "is-boss");

        // Determine if this is an Elite or Chapter Boss
        const isElite = enemyCombat && (enemyCombat.isBoss || isBoss || (enemyCombat.skill && enemyCombat.skillMultiplier > 1.4));
        const isChapterBoss = enemyCombat && (enemyCombat.isBoss || isBoss);

        if (isElite || isChapterBoss) {
          fightSplash.classList.add("is-boss");
          if (subtitleEl) {
            subtitleEl.textContent = isChapterBoss ? "Boss incoming!!" : "Elite incoming!!";
          }
          // Play menacing boss roar
          Sound.playSfx("bossRoar");
        } else {
          // Standard combat punch sound
          Sound.playSfx("attackHeavy");
        }

        void fightSplash.offsetWidth; // Force CSS DOM reflow to re-trigger keyframe
        fightSplash.classList.add("animate");

        // Add impact rumble shake to player & enemy
        if (this.engine.renderer) {
          const shakeIntensity = isChapterBoss ? 1.0 : (isElite ? 0.8 : 0.5);
          this.engine.renderer.playerState.shake = shakeIntensity;
          if (this.engine.renderer.enemyState) {
            this.engine.renderer.enemyState.shake = shakeIntensity;
          }
        }

        const baseDuration = (isElite || isChapterBoss) ? 1200 : 850;
        const duration = baseDuration / (this.battle.speedMultiplier || 1.0);

        setTimeout(() => {
          if (fightSplash) {
            fightSplash.style.display = "none";
            fightSplash.classList.remove("animate", "is-boss");
          }
          if (onDone) onDone();
        }, duration);
      } else {
        if (onDone) onDone();
      }
    };

    this.battle.onRoundChange = (round, maxRounds = 30) => {
      if (roundText) roundText.textContent = `Round ${round}/${maxRounds}`;
    };

    this.battle.onBattleEnd = (victory, earnedGold) => {
      if (battleHud) battleHud.style.display = "none";
      if (stageFloatingHeader) stageFloatingHeader.style.display = "flex";
      if (fightSplash) {
        fightSplash.style.display = "none";
        fightSplash.classList.remove("animate");
      }
      this.renderAdventureScreen();
      this.renderStageFloatingHeader();

      if (victory && earnedGold > 0) {
        // Trigger coin fountain starting from center of battle stage
        const stageCanvas = document.getElementById("stage-canvas");
        let startPoint = null;
        if (stageCanvas) {
          const rect = stageCanvas.getBoundingClientRect();
          startPoint = { x: rect.left + rect.width * 0.65, y: rect.top + rect.height * 0.55 };
        }
        this.triggerCoinFountain(startPoint, Math.min(18, Math.max(10, Math.floor(earnedGold / 15))));
      }
    };
  }

  initEventListeners() {
    // Bottom Tab Buttons
    document.querySelectorAll(".nav-tab-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        Sound.playSfx("click");
        const tab = btn.dataset.tab;
        this.switchTab(tab);
      });
    });

    // Settings Modal (Pengaturan Audio & Suara)
    this.initSettingsModal();

    // Authentic Treasure Chest Modal (Matches Video Project 2)
    this.initTreasureChestModal();

    // Speed Toggle (1x / 2x) & In-Stage Battle Speed Button
    const speedBtn = document.getElementById("btn-speed");
    const stageSpeedBtn = document.getElementById("stage-speed-btn");

    const toggleSpeed = () => {
      Sound.playSfx("click");
      if (this.speedMult === 1.0) {
        this.speedMult = 2.0;
        if (speedBtn) {
          speedBtn.textContent = "2X ⏩";
          speedBtn.classList.add("speed-active");
        }
        if (stageSpeedBtn) {
          stageSpeedBtn.textContent = "x2";
          stageSpeedBtn.classList.add("speed-fast");
        }
      } else {
        this.speedMult = 1.0;
        if (speedBtn) {
          speedBtn.textContent = "1X ▶";
          speedBtn.classList.remove("speed-active");
        }
        if (stageSpeedBtn) {
          stageSpeedBtn.textContent = "x1";
          stageSpeedBtn.classList.remove("speed-fast");
        }
      }
      this.battle.setSpeed(this.speedMult);
    };

    if (speedBtn) speedBtn.addEventListener("click", toggleSpeed);
    if (stageSpeedBtn) stageSpeedBtn.addEventListener("click", toggleSpeed);

    // Engine travel state hook to update capsule button UI
    this.engine.onTravelStateChange = (state) => {
      this.setTravelButtonState(state);
    };

    // Travel / Next Day Action Button
    const travelBtn = document.getElementById("btn-travel-next");
    if (travelBtn) {
      travelBtn.addEventListener("click", () => {
        Sound.playSfx("click");
        this.handleTravelBtnClick();
      });
    }

    // Authentic Menu Hub Event Listeners
    this.initMenuEventListeners();
  }

  initMenuEventListeners() {
    // 1. Giant Start Button
    const btnStart = document.getElementById("btn-start-run");
    if (btnStart) {
      btnStart.addEventListener("click", () => {
        Sound.playSfx("confirm");
        const chapterId = Character.selectedChapter || 1;
        if (chapterId > Character.unlockedChapters) {
          this.showToast("Chapter ini masih terkunci! Selesaikan chapter sebelumnya.");
          return;
        }
        if (Character.energy < 5) {
          this.showToast("Energi tidak cukup! Butuh 5 ⚡");
          return;
        }
        Character.energy -= 5;
        Character.save();
        this.renderHeader();

        if (this.engine.startChapter(chapterId)) {
          const feed = document.getElementById("event-cards-feed");
          if (feed) feed.innerHTML = "";
          this.renderAdventureScreen();
          this.engine.travelNextDay();
        }
      });
    }

    // 2. Chapter Previous / Next Arrows
    const btnPrev = document.getElementById("btn-menu-chapter-prev");
    const btnNext = document.getElementById("btn-menu-chapter-next");

    if (btnPrev) {
      btnPrev.addEventListener("click", (e) => {
        e.stopPropagation();
        Sound.playSfx("click");
        const cur = Character.selectedChapter || 1;
        if (cur > 1) {
          Character.selectedChapter = cur - 1;
          Character.save();
          this.renderMenuHub();
        }
      });
    }

    if (btnNext) {
      btnNext.addEventListener("click", (e) => {
        e.stopPropagation();
        Sound.playSfx("click");
        const cur = Character.selectedChapter || 1;
        if (cur < GameData.chapters.length) {
          Character.selectedChapter = cur + 1;
          Character.save();
          this.renderMenuHub();
        }
      });
    }

    // 3. Hamburger Drawer Button (Opens Settings Modal)
    const btnDrawer = document.getElementById("btn-menu-drawer");
    if (btnDrawer) {
      btnDrawer.addEventListener("click", (e) => {
        e.stopPropagation();
        const modal = document.getElementById("modal-settings");
        if (modal) {
          Sound.playSfx("click");
          modal.style.display = "flex";
        }
      });
    }

    // 4. Newbie Gifts Widget
    const btnNewbie = document.getElementById("btn-newbie-gifts");
    if (btnNewbie) {
      btnNewbie.addEventListener("click", (e) => {
        e.stopPropagation();
        Sound.playSfx("click");
        this.showToast("🎁 Hadiah Pemula: Hari ke-1 telah diklaim! Hadiah berikutnya dalam 6h 23j.");
      });
    }

    // 5. Milestone Chest Widget
    const btnMilestone = document.getElementById("btn-milestone-chest");
    if (btnMilestone) {
      btnMilestone.addEventListener("click", (e) => {
        e.stopPropagation();
        Sound.playSfx("click");
        this.showToast("🎁 Milestone Hari 40: Bertahan hingga Hari 40 untuk klaim 500 🪙 & 50 💎!");
      });
    }

    // 6. Currency Plus Buttons
    const btnAddEnergy = document.getElementById("btn-add-energy");
    if (btnAddEnergy) {
      btnAddEnergy.addEventListener("click", (e) => {
        e.stopPropagation();
        Sound.playSfx("pickup");
        Character.energy = Math.min(50, Character.energy + 10);
        Character.save();
        this.renderHeader();
        this.showToast("+10 ⚡ Energi berhasil ditambahkan!");
      });
    }

    const btnAddGems = document.getElementById("btn-add-gems");
    if (btnAddGems) {
      btnAddGems.addEventListener("click", (e) => {
        e.stopPropagation();
        Sound.playSfx("pickup");
        Character.gems += 50;
        Character.save();
        this.renderHeader();
        this.showToast("+50 💎 Gems berhasil ditambahkan!");
      });
    }

    const btnAddGold = document.getElementById("btn-add-gold");
    if (btnAddGold) {
      btnAddGold.addEventListener("click", (e) => {
        e.stopPropagation();
        Sound.playSfx("pickup");
        Character.gold += 500;
        Character.save();
        this.renderHeader();
        this.showToast("+500 🪙 Koin berhasil ditambahkan!");
      });
    }
  }

  initSettingsModal() {
    const modal = document.getElementById("modal-settings");
    const btnMenuSettings = document.getElementById("btn-menu-settings");
    const btnStageSettings = document.getElementById("btn-stage-settings");
    const btnCloseX = document.getElementById("btn-settings-close-x");
    const btnClose = document.getElementById("btn-settings-close");

    const toggleMaster = document.getElementById("toggle-sound-master");
    const toggleBgm = document.getElementById("toggle-sound-bgm");
    const toggleSfx = document.getElementById("toggle-sound-sfx");

    const syncUI = () => {
      if (toggleMaster) {
        const isOn = !Sound.muted;
        toggleMaster.classList.toggle("active", isOn);
        const lbl = toggleMaster.querySelector(".switch-label");
        if (lbl) lbl.textContent = isOn ? "ON" : "OFF";
      }
      if (toggleBgm) {
        const isOn = !Sound.bgmMuted;
        toggleBgm.classList.toggle("active", isOn);
        const lbl = toggleBgm.querySelector(".switch-label");
        if (lbl) lbl.textContent = isOn ? "ON" : "OFF";
      }
      if (toggleSfx) {
        const isOn = !Sound.sfxMuted;
        toggleSfx.classList.toggle("active", isOn);
        const lbl = toggleSfx.querySelector(".switch-label");
        if (lbl) lbl.textContent = isOn ? "ON" : "OFF";
      }
    };

    const openModal = () => {
      Sound.playSfx("click");
      syncUI();
      if (modal) {
        modal.style.display = "flex";
      }
    };

    const closeModal = () => {
      Sound.playSfx("confirm");
      if (modal) {
        modal.style.display = "none";
      }
    };

    if (btnMenuSettings) {
      btnMenuSettings.addEventListener("click", (e) => {
        e.stopPropagation();
        openModal();
      });
    }

    if (btnStageSettings) {
      btnStageSettings.addEventListener("click", (e) => {
        e.stopPropagation();
        openModal();
      });
    }

    if (btnCloseX) {
      btnCloseX.addEventListener("click", () => closeModal());
    }

    if (btnClose) {
      btnClose.addEventListener("click", () => closeModal());
    }

    const btnToMenu = document.getElementById("btn-settings-to-menu");
    if (btnToMenu) {
      btnToMenu.addEventListener("click", () => {
        Sound.playSfx("confirm");
        closeModal();

        // 1. If currently inside an active run, gracefully end and clean up run
        if (Character.activeRun) {
          if (this.battle && this.battle.inBattle) {
            this.battle.inBattle = false;
            if (this.engine && this.engine.renderer) {
              this.engine.renderer.inBattle = false;
              this.engine.renderer.clearEnemy();
            }
          }
          if (this.engine) {
            this.engine.hasPendingChest = false;
            this.engine.autoTravel = false;
            const autoBtn = document.getElementById("btn-auto-travel");
            if (autoBtn) autoBtn.classList.remove("active");
            if (this.engine.renderer) {
              this.engine.renderer.removeTreasureChest();
              this.engine.renderer.setPlayerAnim("idle", true);
              this.engine.renderer.playerState.x = this.engine.renderer.homePlayerX;
              this.engine.renderer.playerState.offsetY = 0;
            }
          }
          Character.endRun(false);
        }

        // 2. Dismiss any open submodals (treasure chest, skill choice, etc.)
        const chestModal = document.getElementById("modal-treasure-chest");
        if (chestModal) {
          chestModal.style.display = "none";
          chestModal.classList.remove("open");
        }
        const skillModal = document.getElementById("modal-skill-choice");
        if (skillModal) {
          skillModal.style.display = "none";
          skillModal.classList.remove("open");
        }

        // 3. Switch to Adventure tab in Main Menu / Home Hub mode
        this.switchTab("adventure");
        this.renderAdventureScreen();
        this.renderHeader();
        this.setTravelButtonState("ready", "Start Adventure");
        Sound.playMusic("menu");
        this.showToast("Kembali ke Menu Utama 🏠");
      });
    }

    if (modal) {
      modal.addEventListener("click", (e) => {
        if (e.target === modal) {
          closeModal();
        }
      });
    }

    if (toggleMaster) {
      toggleMaster.addEventListener("click", () => {
        Sound.toggleMute();
        syncUI();
        Sound.playSfx("click");
      });
    }

    if (toggleBgm) {
      toggleBgm.addEventListener("click", () => {
        Sound.toggleBgm();
        syncUI();
        Sound.playSfx("click");
      });
    }

    if (toggleSfx) {
      toggleSfx.addEventListener("click", () => {
        Sound.toggleSfx();
        syncUI();
        Sound.playSfx("click");
      });
    }

    // Initial state sync
    syncUI();
  }

  // ================= AUTHENTIC TREASURE CHEST SYSTEM (MATCHES VIDEO PROJECT 2) =================

  initTreasureChestModal() {
    const modal = document.getElementById("modal-treasure-chest");
    const btnOpen = document.getElementById("btn-treasure-open");
    const btnClaim = document.getElementById("btn-treasure-claim");
    const stageCanvas = document.getElementById("stage-canvas");

    // Click on stage canvas chest entity to pick up
    if (stageCanvas) {
      stageCanvas.addEventListener("click", (e) => {
        const r = this.engine && this.engine.renderer;
        if (r && r.chestState && (r.chestState.state === "resting" || r.chestState.state === "falling" || r.chestState.state === "bouncing")) {
          const rect = stageCanvas.getBoundingClientRect();
          const scaleX = stageCanvas.width / rect.width;
          const scaleY = stageCanvas.height / rect.height;
          const clickX = (e.clientX - rect.left) * scaleX;
          const clickY = (e.clientY - rect.top) * scaleY;
          const dx = clickX - r.chestState.x;
          const dy = clickY - (r.chestState.y - 20);
          if (Math.hypot(dx, dy) <= 75) {
            this.openTreasureChestModal();
          }
        }
      });

      stageCanvas.addEventListener("mousemove", (e) => {
        const r = this.engine && this.engine.renderer;
        if (r && r.chestState && r.chestState.state === "resting") {
          const rect = stageCanvas.getBoundingClientRect();
          const scaleX = stageCanvas.width / rect.width;
          const scaleY = stageCanvas.height / rect.height;
          const clickX = (e.clientX - rect.left) * scaleX;
          const clickY = (e.clientY - rect.top) * scaleY;
          const dx = clickX - r.chestState.x;
          const dy = clickY - (r.chestState.y - 20);
          if (Math.hypot(dx, dy) <= 65) {
            stageCanvas.style.cursor = "pointer";
            return;
          }
        }
        if (stageCanvas.style.cursor === "pointer") {
          stageCanvas.style.cursor = "default";
        }
      });
    }

    if (btnOpen) {
      btnOpen.addEventListener("click", () => {
        const closedImg = document.getElementById("treasure-img-closed");
        if (closedImg) {
          closedImg.style.animation = "chestImpactShake 0.22s ease-in-out";
        }
        Sound.playSfx("chestOpen");

        setTimeout(() => {
          const findPhase = document.getElementById("treasure-phase-find");
          const openPhase = document.getElementById("treasure-phase-open");
          if (findPhase) findPhase.style.display = "none";
          if (openPhase) openPhase.style.display = "flex";

          this.populateChestCards();
        }, 220);
      });
    }

    if (btnClaim) {
      btnClaim.addEventListener("click", () => {
        if (!this._selectedChestSkill) {
          this.showToast("Please tap to select 1 skill first!");
          return;
        }

        Sound.playSfx("confirm");
        if (modal) {
          modal.style.display = "none";
          modal.classList.remove("open");
        }

        // Clear chest flags
        this.hasPendingChest = false;
        if (this.engine) this.engine.hasPendingChest = false;

        // Remove chest from stage
        if (this.engine && this.engine.renderer) {
          this.engine.renderer.removeTreasureChest();
        }

        // Apply ONLY THE SINGLE CHOSEN SKILL to the run!
        const run = Character.activeRun;
        const chosen = this._selectedChestSkill;
        if (run && chosen) {
          if (!run.skills.some(owned => owned.id === chosen.id)) {
            run.skills.push(chosen);
          }
          this.showToast(`[${chosen.name}] Added!`);
          this._selectedChestSkill = null;
        }

        // Update any chest event card in the feed
        const feedCardRows = document.querySelectorAll(".chest-event-card .card-striped-bottom-row");
        feedCardRows.forEach(row => {
          row.innerHTML = `<div class="event-choice-resolved">✨ <span class="highlight-blue">${chosen ? chosen.name : 'Treasure'} Claimed!</span></div>`;
        });

        // Heal 25% HP with real-time smooth animation (Matches Video 0:02 "Restore 20-25% HP")
        if (run && run.currentHp < run.maxHp) {
          const healAmt = Math.round(run.maxHp * 0.25);
          run.currentHp = Math.min(run.maxHp, run.currentHp + healAmt);
          Sound.playSfx("heal");
          if (this.engine.renderer) {
            this.engine.renderer.addVisualEffect("healRing", this.engine.renderer.playerState.x, this.engine.renderer.playerState.y);
            this.engine.renderer.addFloatingText(`+${healAmt}`, this.engine.renderer.playerState.x, this.engine.renderer.playerState.y - 25, "heal");
          }
          this.renderRunStatsBar(true);
        }

        this.renderStageFloatingHeader();
        this.renderAdventureScreen();
        Character.save();

        if (this._onChestClaimedCallback) {
          const cb = this._onChestClaimedCallback;
          this._onChestClaimedCallback = null;
          this._pendingChestOptions = null;
          cb();
        } else {
          this.setTravelButtonState("ready", "Next Day");
        }
      });
    }
  }

  populateChestCards() {
    const container = document.getElementById("treasure-cards-container");
    const btnClaim = document.getElementById("btn-treasure-claim");
    if (!container) return;
    container.innerHTML = "";

    this._selectedChestSkill = null;
    if (btnClaim) {
      btnClaim.disabled = true;
      btnClaim.textContent = "Select a Skill";
    }

    const run = Character.activeRun;
    const ownedIds = (run && run.skills) ? run.skills.map(s => s.id) : [];

    // 1. Mythic Skills Pool (Guaranteed 1 Exclusive Mythic variant in every Golden Chest!)
    const allMythics = GameData.skills.filter(s => s.rarity === "mythic");
    const unownedMythics = allMythics.filter(s => !ownedIds.includes(s.id));
    const mythicPool = unownedMythics.length > 0 ? unownedMythics : allMythics;
    const pickedMythic = mythicPool[Math.floor(Math.random() * mythicPool.length)];

    // 2. High-tier Adventure Skills Pool (Legendary, Epic, Rare variants)
    const allHighTier = GameData.skills.filter(s => s.rarity !== "mythic" && (s.rarity === "legendary" || s.rarity === "epic" || s.rarity === "rare"));
    const unownedHighTier = allHighTier.filter(s => !ownedIds.includes(s.id));
    const highTierPool = unownedHighTier.length >= 2 ? unownedHighTier : allHighTier;

    // Pick 2 unique high-tier skills
    const shuffledOthers = [...highTierPool].sort(() => 0.5 - Math.random());
    const pickedOthers = [];
    for (const sk of shuffledOthers) {
      if (pickedOthers.length >= 2) break;
      if (sk.id !== pickedMythic.id && !pickedOthers.some(o => o.id === sk.id)) {
        pickedOthers.push(sk);
      }
    }

    // Combine 3 distinct cards (1 Mythic + 2 High-Tier)
    const candidates = [pickedMythic, ...pickedOthers];
    candidates.sort((a, b) => {
      const order = { mythic: 0, legendary: 1, epic: 2, rare: 3, uncommon: 4, common: 5 };
      return (order[a.rarity] || 9) - (order[b.rarity] || 9);
    });

    this._currentChestOfferedCards = candidates;

    candidates.forEach((sk, idx) => {
      const card = document.createElement("div");
      card.className = "treasure-skill-card";

      const tagClass = `tag-${sk.rarity || 'epic'}`;
      const tagText = sk.rarity === 'mythic' 
        ? '👑 Mythic' 
        : sk.rarity === 'legendary' 
          ? '🔥 Legendary' 
          : sk.rarity === 'epic' 
            ? '⚔️ Epic' 
            : `★ ${sk.rarity.toUpperCase()}`;

      card.innerHTML = `
        <span class="treasure-card-tag ${tagClass}">${tagText}</span>
        <span class="treasure-card-check">✔</span>
        <div class="treasure-card-icon">
          <img src="${sk.icon}" alt="${sk.name}" style="width: 34px; height: 34px; object-fit: contain; border-radius: 6px;">
        </div>
        <h4 class="treasure-card-title">${sk.name}</h4>
        <p class="treasure-card-desc">${sk.desc}</p>
      `;

      // Allow selecting ONLY ONE skill
      card.addEventListener("click", () => {
        Sound.playSfx("click");
        container.querySelectorAll(".treasure-skill-card").forEach(c => c.classList.remove("selected"));
        card.classList.add("selected");
        this._selectedChestSkill = sk;

        if (btnClaim) {
          btnClaim.disabled = false;
          btnClaim.textContent = `Claim ${sk.name} ✨`;
        }
      });

      container.appendChild(card);

      // Staggered slide up emergence from chest
      setTimeout(() => {
        card.classList.add("revealed");
        Sound.playSfx("confirm");
      }, 100 + idx * 240);
    });
  }

  openTreasureChestModal(options = null) {
    if (options) {
      this._pendingChestOptions = Object.assign({}, this._pendingChestOptions || {}, options);
    } else {
      options = this._pendingChestOptions || {};
    }

    if (options.onClaimed) {
      this._onChestClaimedCallback = options.onClaimed;
    }

    const modal = document.getElementById("modal-treasure-chest");
    const findPhase = document.getElementById("treasure-phase-find");
    const openPhase = document.getElementById("treasure-phase-open");
    const btnClaim = document.getElementById("btn-treasure-claim");

    this._selectedChestSkill = null;
    if (btnClaim) {
      btnClaim.disabled = true;
      btnClaim.textContent = "Select a Skill";
    }

    if (findPhase) findPhase.style.display = "flex";
    if (openPhase) openPhase.style.display = "none";

    const closedImg = document.getElementById("treasure-img-closed");
    if (closedImg) closedImg.style.animation = "";

    if (modal) {
      modal.style.display = "flex";
      modal.classList.add("open");
      Sound.playSfx("confirm");
    }
  }

  triggerFallingChest(options = {}) {
    const renderer = this.engine && this.engine.renderer;
    if (!renderer) return;

    // Set pending chest flags immediately so neither auto-advance nor Next Day skips it
    this.hasPendingChest = true;
    if (this.engine) this.engine.hasPendingChest = true;
    this._pendingChestOptions = options;

    this.setTravelButtonState("chest", "🎁 Pick up Chest");

    // 1. Drop the chest from the sky onto stage canvas
    renderer.dropTreasureChest(() => {
      // 2. When chest lands with impact and dust puff:
      const feed = document.getElementById("event-cards-feed");
      const deck = document.getElementById("events-scroll-deck");
      if (!feed) return;

      const cardWrap = document.createElement("div");
      cardWrap.className = "event-stream-item";

      const run = Character.activeRun;
      const dayNum = run ? run.day : 1;
      const storyText = options.storyText || "The swordsman falls, and you obtain a <span class='highlight-blue'>Golden Chest</span>, but it's clear the humans won't stop here.";

      cardWrap.innerHTML = `
        <div class="day-divider-pill">
          <span class="day-dot">●</span>
          <span class="day-text">Day ${dayNum}</span>
          <span class="day-dot">●</span>
        </div>
        <div class="card-striped-event-card chest-event-card">
          <div class="card-striped-top-banner"></div>
          <div class="card-striped-content">
            <div class="event-story-text">${storyText}</div>
            <div class="card-striped-bottom-row">
              <div class="card-pills-wrap">
                <span class="card-pill-capsule pill-heal">❤️ Restore 25% HP</span>
              </div>
              <button class="btn-game btn-gold btn-pickup-capsule">Pick up</button>
            </div>
          </div>
          <div class="card-striped-bottom-banner"></div>
        </div>
      `;

      const pickupBtn = cardWrap.querySelector(".btn-pickup-capsule");
      if (pickupBtn) {
        pickupBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          this.openTreasureChestModal(options);
        });
      }

      feed.appendChild(cardWrap);
      if (deck) {
        setTimeout(() => {
          deck.scrollTo({ top: deck.scrollHeight, behavior: "smooth" });
        }, 40);
      }
    });
  }

  switchTab(tabName) {
    this.activeTab = tabName;
    document.querySelectorAll(".nav-tab-btn").forEach(b => {
      b.classList.toggle("active", b.dataset.tab === tabName);
    });
    document.querySelectorAll(".tab-page").forEach(page => {
      page.classList.toggle("active", page.id === `tab-${tabName}`);
    });

    if (tabName === "adventure") {
      if (this.battle.inBattle) {
        Sound.playMusic("battle");
      } else if (Character.activeRun) {
        Sound.playMusic("adventure");
      } else {
        Sound.playMusic("menu");
      }
    } else {
      Sound.playMusic("menu");
    }

    this.renderHeader();
    this.renderActiveTab();
  }

  renderHeader() {
    const elGold = document.getElementById("header-gold");
    const elGems = document.getElementById("header-gems");
    const elEnergy = document.getElementById("header-energy");
    const elKeys = document.getElementById("header-keys");

    if (elGold) elGold.textContent = Character.gold.toLocaleString();
    if (elGems) elGems.textContent = Character.gems.toLocaleString();
    if (elEnergy) elEnergy.textContent = `${Character.energy}/${Character.maxEnergy}`;
    if (elKeys) elKeys.textContent = Character.keys;

    // Player profile pill in menu mode
    const pName = document.getElementById("player-profile-name");
    const pTitle = document.getElementById("player-profile-title");
    const pPower = document.getElementById("player-profile-power");

    if (pName) pName.textContent = Character.playerName || "Capy13126397";
    if (pTitle) pTitle.textContent = Character.playerTitle || "Apprentice - 1";
    if (pPower) pPower.textContent = Character.getCombatPower().toLocaleString();

    // Header Day indicator if in run
    const headerDay = document.getElementById("header-day-badge");
    const headerChapter = document.getElementById("header-chapter-name");
    const dayProgress = document.getElementById("header-day-progress");

    if (Character.activeRun) {
      const run = Character.activeRun;
      const ch = GameData.chapters.find(c => c.id === run.chapterId);
      if (headerDay) headerDay.textContent = `Day ${run.day} / ${run.maxDays}`;
      if (headerChapter) headerChapter.textContent = ch ? ch.name : "Chapter";
      if (dayProgress) {
        const pct = Math.min(100, Math.round((run.day / run.maxDays) * 100));
        dayProgress.style.width = `${pct}%`;
      }
    } else {
      if (headerDay) headerDay.textContent = "Home Hub";
      if (headerChapter) headerChapter.textContent = "Select Chapter";
      if (dayProgress) dayProgress.style.width = "0%";
    }
  }

  renderMenuHub() {
    const chapterId = Character.selectedChapter || 1;
    const ch = GameData.chapters.find(c => c.id === chapterId) || GameData.chapters[0];
    const isUnlocked = chapterId <= Character.unlockedChapters;

    const elChName = document.getElementById("menu-chapter-name");
    const elLongest = document.getElementById("menu-longest-days");
    const btnStart = document.getElementById("btn-start-run");

    if (elChName) {
      elChName.textContent = `${ch.id}.${ch.name}${!isUnlocked ? " 🔒" : ""}`;
    }

    if (elLongest) {
      const days = (Character.longestSurvived && Character.longestSurvived[chapterId]) || (chapterId === 1 ? 39 : 0);
      elLongest.textContent = `${days} days`;
    }

    if (btnStart) {
      const textSpan = btnStart.querySelector(".btn-start-text");
      const energyTag = btnStart.querySelector(".btn-start-energy-tag");
      if (!isUnlocked) {
        if (textSpan) textSpan.textContent = "Locked 🔒";
        if (energyTag) energyTag.style.display = "none";
        btnStart.style.filter = "grayscale(0.8)";
      } else {
        if (textSpan) textSpan.textContent = "Start";
        if (energyTag) energyTag.style.display = "flex";
        btnStart.style.filter = "none";
      }
    }

    if (this.engine && this.engine.renderer) {
      this.engine.renderer.setMenuMode(true);
      if (ch && ch.bg) {
        this.engine.renderer.setBackground(ch.bg);
      }
    }
  }

  renderActiveTab() {
    if (this.activeTab === "adventure") {
      this.renderAdventureScreen();
    } else if (this.activeTab === "equipment") {
      this.renderEquipmentScreen();
    } else if (this.activeTab === "talents") {
      this.renderTalentsScreen();
    } else if (this.activeTab === "chests") {
      this.renderChestsScreen();
    } else if (this.activeTab === "bestiary") {
      this.renderBestiaryScreen();
    }
  }

  renderAdventureScreen() {
    const run = Character.activeRun;
    const idlePanel = document.getElementById("adventure-start-panel");
    const activePanel = document.getElementById("adventure-active-panel");
    const runStatsBar = document.getElementById("run-stats-bar");
    const container = document.getElementById("game-container");

    if (!run) {
      this._currentDisplayHp = undefined;
      if (container) container.classList.remove("in-run");
      if (idlePanel) idlePanel.style.display = "flex";
      if (activePanel) activePanel.style.display = "none";
      if (runStatsBar) runStatsBar.style.display = "none";
      this.renderMenuHub();
      return;
    }

    if (container) container.classList.add("in-run");
    if (this.engine && this.engine.renderer) {
      this.engine.renderer.setMenuMode(false);
    }
    if (idlePanel) idlePanel.style.display = "none";
    if (activePanel) activePanel.style.display = "flex";
    if (runStatsBar) runStatsBar.style.display = "flex";

    this.renderRunStatsBar();
    this.renderStageFloatingHeader();

    // Render Active Run Skills Bar (Top row within stage viewport)
    const skillsList = document.getElementById("run-active-skills");
    if (skillsList) {
      skillsList.innerHTML = "";
      if (run.skills && run.skills.length > 0) {
        skillsList.style.display = "flex";
        run.skills.forEach(sk => {
          // Auto-fix icon path if not a valid image path
          if (sk.id === 101 && (!sk.icon || !sk.icon.includes('.'))) sk.icon = "assets/skills/skill_016.png";
          if (sk.id === 102 && (!sk.icon || !sk.icon.includes('.'))) sk.icon = "assets/skills/skill_022.png";
          if (sk.id === 103 && (!sk.icon || !sk.icon.includes('.'))) sk.icon = "assets/skills/skill_011.png";

          const slot = document.createElement("div");
          slot.className = `run-skill-slot rarity-${sk.rarity || 'common'}`;
          slot.title = `${sk.name}: ${sk.desc}`;

          const isImagePath = sk.icon && (sk.icon.includes('/') || sk.icon.includes('.'));
          if (isImagePath) {
            const icon = document.createElement("img");
            icon.src = sk.icon;
            icon.alt = sk.name;
            icon.onerror = () => {
              const fallbackEmoji = sk.displayIcon || (sk.name ? sk.name.charAt(0) : "★");
              slot.innerHTML = `<span class="run-skill-emoji">${fallbackEmoji}</span>`;
            };
            slot.appendChild(icon);
          } else {
            const span = document.createElement("span");
            span.className = "run-skill-emoji";
            span.textContent = sk.displayIcon || sk.icon || "★";
            slot.appendChild(span);
          }
          
          slot.addEventListener("click", () => {
            this.showToast(`[${sk.name}]: ${sk.desc}`);
          });
          skillsList.appendChild(slot);
        });
      } else {
        skillsList.style.display = "none";
      }
    }
  }

  renderStageFloatingHeader() {
    const run = Character.activeRun;
    if (!run) return;

    // Gold & Gems mini counters (Matches Authentic In-Run HUD)
    const stageGold = document.getElementById("stage-gold-num");
    if (stageGold) stageGold.textContent = Character.gold;

    const stageGems = document.getElementById("stage-gems-num");
    if (stageGems) stageGems.textContent = Character.gems;

    // Milestone nodes & progress bar
    const startNode = document.getElementById("node-day-start");
    const eventNode = document.getElementById("node-day-event");
    const battleNode = document.getElementById("node-day-battle");
    const bossNode = document.getElementById("node-day-boss");
    const fillBar = document.getElementById("stage-milestone-fill");

    const chapterId = run.chapterId || 1;
    // Format: Chapter-Day like 1-1, 2-1 or Day number
    if (startNode) startNode.textContent = `${chapterId}-${Math.max(1, run.day)}`;
    
    // Milestones ahead: next boss, elite combat, chapter boss
    const nextBossDay = Math.min(run.maxDays || 60, Math.ceil(run.day / 20) * 20);
    const midDay1 = Math.min(nextBossDay, Math.max(run.day + 4, 10));
    const midDay2 = Math.min(nextBossDay, Math.max(midDay1 + 4, 15));

    if (eventNode) eventNode.textContent = midDay1;
    if (battleNode) battleNode.textContent = midDay2;
    if (bossNode) bossNode.textContent = nextBossDay;

    if (fillBar) {
      const pct = Math.min(100, Math.max(10, Math.round(((run.day % 20 || 1) / 20) * 100)));
      fillBar.style.width = `${pct}%`;
    }
  }

  renderRunStatsBar(animate = true) {
    const run = Character.activeRun;
    if (!run) return;

    const stats = Character.getEffectiveStats();

    // EXP / Level
    const lvlText = document.getElementById("stat-level-text");
    if (lvlText) lvlText.textContent = `Lv.${Character.accountLevel || 1}`;
    const expFillEl = document.getElementById("stat-exp-fill");
    if (expFillEl) {
      const expNeeded = Character.accountLevel * 100;
      const curExp = Character.accountExp || 0;
      const pct = Math.min(100, Math.max(15, Math.round(((curExp % expNeeded) / expNeeded) * 100) || 55));
      expFillEl.style.width = `${pct}%`;
    }

    // HP pill
    const targetHp = Math.max(0, run.currentHp !== undefined ? run.currentHp : stats.hp);
    const maxHp = Math.max(1, run.maxHp || stats.hp);
    const hpPct = Math.max(0, Math.min(100, Math.round((targetHp / maxHp) * 100)));

    const hpPctEl = document.getElementById("stat-hp-pct");
    const hpFillEl = document.getElementById("stat-hp-fill");
    const hpGhostEl = document.getElementById("stat-hp-ghost");
    const hpNumEl = document.getElementById("stat-hp-num");
    const heartBadge = document.querySelector(".badge-hp-heart");

    if (this._currentDisplayHp === undefined) {
      this._currentDisplayHp = targetHp;
    }

    const prevHp = this._currentDisplayHp;
    const isDamage = targetHp < prevHp;
    const isHeal = targetHp > prevHp;

    if (animate && (isDamage || isHeal)) {
      // 1. Immediate primary fill adjustment
      if (hpFillEl) {
        hpFillEl.style.width = `${hpPct}%`;
      }

      if (isDamage) {
        // Ghost bar lingers briefly to show exact lost chunk before catching up
        if (hpGhostEl) {
          setTimeout(() => {
            if (hpGhostEl) hpGhostEl.style.width = `${hpPct}%`;
          }, 120);
        }

        // Heart damage shake
        if (heartBadge) {
          heartBadge.classList.remove("heart-damaged-shake", "heart-heal-pulse");
          void heartBadge.offsetWidth;
          heartBadge.classList.add("heart-damaged-shake");
        }

        if (hpNumEl) {
          hpNumEl.classList.remove("hp-number-healed");
          hpNumEl.classList.add("hp-number-damaged");
        }
      } else if (isHeal) {
        if (hpGhostEl) {
          hpGhostEl.style.width = `${hpPct}%`;
        }

        // Heart heal glow
        if (heartBadge) {
          heartBadge.classList.remove("heart-damaged-shake", "heart-heal-pulse");
          void heartBadge.offsetWidth;
          heartBadge.classList.add("heart-heal-pulse");
        }

        if (hpNumEl) {
          hpNumEl.classList.remove("hp-number-damaged");
          hpNumEl.classList.add("hp-number-healed");
        }
      }

      // 2. Real-time smooth rolling numbers animation
      if (this._hpAnimFrame) {
        cancelAnimationFrame(this._hpAnimFrame);
      }

      const animStartHp = prevHp;
      const animEndHp = targetHp;
      const startTime = performance.now();
      const animDuration = 260; // Snappy 260ms real-time number transition

      const step = (now) => {
        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / animDuration);
        const currentVal = Math.round(animStartHp + (animEndHp - animStartHp) * progress);
        const currentPct = Math.max(0, Math.min(100, Math.round((currentVal / maxHp) * 100)));

        if (hpNumEl) hpNumEl.textContent = `${currentVal}/${maxHp}`;
        if (hpPctEl) hpPctEl.textContent = `${currentPct}%`;

        if (progress < 1) {
          this._hpAnimFrame = requestAnimationFrame(step);
        } else {
          this._currentDisplayHp = animEndHp;
          if (hpNumEl) {
            hpNumEl.textContent = `${animEndHp}/${maxHp}`;
            setTimeout(() => {
              hpNumEl.classList.remove("hp-number-damaged", "hp-number-healed");
            }, 300);
          }
          if (hpPctEl) hpPctEl.textContent = `${hpPct}%`;
        }
      };

      this._hpAnimFrame = requestAnimationFrame(step);
    } else {
      // Direct non-animated sync
      this._currentDisplayHp = targetHp;
      if (hpFillEl) hpFillEl.style.width = `${hpPct}%`;
      if (hpGhostEl) hpGhostEl.style.width = `${hpPct}%`;
      if (hpPctEl) hpPctEl.textContent = `${hpPct}%`;
      if (hpNumEl) hpNumEl.textContent = `${targetHp}/${maxHp}`;
    }

    // ATK pill
    const atkNumEl = document.getElementById("stat-atk-num");
    if (atkNumEl) atkNumEl.textContent = stats.atk;

    // DEF pill
    const defNumEl = document.getElementById("stat-def-num");
    if (defNumEl) defNumEl.textContent = stats.def;
  }

  renderChapterSelection() {
    const list = document.getElementById("chapter-list-container");
    if (!list) return;
    list.innerHTML = "";

    GameData.chapters.forEach(ch => {
      const isUnlocked = ch.id <= Character.unlockedChapters;
      const card = document.createElement("div");
      card.className = `chapter-card ${isUnlocked ? 'unlocked' : 'locked'}`;
      card.innerHTML = `
        <div class="chapter-card-banner" style="background-image: url('${ch.bg}')">
          <div class="chapter-num">Chapter ${ch.id}</div>
        </div>
        <div class="chapter-card-info">
          <h3>${ch.name}</h3>
          <p>${ch.description}</p>
          <div class="chapter-rewards">Reward: 🪙 ${ch.rewardGold} | 💎 ${ch.rewardGems}</div>
        </div>
        <div class="chapter-card-action">
          ${isUnlocked 
            ? `<button class="btn-game btn-gold start-ch-btn" data-id="${ch.id}">Embark (⚡ 5)</button>` 
            : `<button class="btn-game btn-slate" disabled>🔒 Locked</button>`}
        </div>
      `;

      if (isUnlocked) {
        card.querySelector(".start-ch-btn").addEventListener("click", () => {
          Sound.playSfx("confirm");
          if (this.engine.startChapter(ch.id)) {
            const feed = document.getElementById("event-cards-feed");
            if (feed) feed.innerHTML = "";
            this.renderHeader();
            this.renderAdventureScreen();
            this.engine.travelNextDay();
          } else {
            this.showToast("Not enough Energy! Need 5 ⚡");
          }
        });
      }

      list.appendChild(card);
    });
  }

  renderAdventureEvent(event) {
    const feed = document.getElementById("event-cards-feed");
    const deck = document.getElementById("adventure-event-deck");
    const travelBtn = document.getElementById("btn-travel-next");
    const btnText = document.getElementById("next-day-btn-text");

    this.renderRunStatsBar();
    this.renderHeader();

    if (!event) return;
    if (!feed) return;

    const dayNum = event.day || (Character.activeRun ? Character.activeRun.day : 1);
    const cardWrap = document.createElement("div");
    cardWrap.className = "event-card-wrap";

    // Day milestone divider (Matches Screenshot: "Day 16 ———————————")
    let dividerHtml = "";
    if (this._lastRenderedDay !== dayNum) {
      this._lastRenderedDay = dayNum;
      dividerHtml = `
        <div class="day-milestone-divider">
          <span class="day-milestone-title">Day ${dayNum}</span>
          <div class="day-milestone-line"></div>
        </div>
      `;
    }

    if (event.type === "minor_fortune") {
      const f = event.fortuneData;
      let text = f.text || "";
      // Ensure vibrant highlights matching screenshot (blue & orange)
      text = text.replace(/<span class="highlight-creature">/g, '<span class="highlight-orange">');

      let cardClass = "card-striped card-minor-fortune";
      let catClass = "label-minor";
      let catLabel = "Minor Fortune";

      if (f.category === "Major Fortune") {
        cardClass = "card-striped card-major-fortune";
        catClass = "label-major";
        catLabel = "Major Fortune";
      } else if (f.category === "Bad Luck" || f.category === "Misfortune") {
        cardClass = "card-striped card-bad-luck";
        catClass = "label-bad-luck";
        catLabel = "Bad Luck";
      }

      // Build pill capsules on bottom left matching reference screenshots
      let pillsHtml = "";
      if (Array.isArray(f.pills) && f.pills.length > 0) {
        pillsHtml = f.pills.map(p => `
          <div class="card-pill-capsule">
            <span class="pill-icon">${p.icon}</span>
            <span class="pill-text ${p.valClass || 'val-green'}">${p.text}</span>
          </div>
        `).join("");
      } else if (f.rewardText) {
        pillsHtml = `
          <div class="card-pill-capsule">
            <span class="pill-icon">${f.badge ? f.badge.split(' ')[0] : '✨'}</span>
            <span class="pill-text val-green">${f.rewardText}</span>
          </div>
        `;
      }

      // Execute authentic win sequence from video (Minor Win -> Big Win)
      this.playFortuneWinSequence(f, () => {
        cardWrap.innerHTML = `
          ${dividerHtml}
          <div class="${cardClass}">
            <div class="card-striped-top-banner"></div>
            <div class="card-striped-content">
              <div class="event-story-text">${text}</div>
              <div class="card-striped-bottom-row">
                <div class="card-pills-wrap">
                  ${pillsHtml}
                </div>
                <div class="card-category-label ${catClass}">${catLabel}</div>
              </div>
            </div>
            <div class="card-striped-bottom-banner"></div>

            <!-- Authentic Shining Light Sheen Overlay (Matches cframe_030) -->
            <div class="card-sheen-overlay">
              <div class="card-sheen-bar"></div>
            </div>
            <div class="card-glint glint-tl">✦</div>
            <div class="card-glint glint-br">✦</div>
          </div>
        `;

        feed.appendChild(cardWrap);

        if (deck) {
          setTimeout(() => {
            deck.scrollTo({ top: deck.scrollHeight, behavior: "smooth" });
          }, 30);
        }

        // Trigger authentic coin fountain if fortune granted gold
        let goldAmt = 0;
        if (f.type === "gold" || f.type === "jackpot") goldAmt = f.val || 0;
        if (f.buffs) {
          const gBuff = f.buffs.find(b => b.type === "gold");
          if (gBuff) goldAmt += gBuff.val;
        }
        if (!goldAmt && f.pills) {
          f.pills.forEach(p => {
            const m = p.text && p.text.match(/Gold\+(\d+)/i);
            if (m) goldAmt += parseInt(m[1], 10);
          });
        }

        if (goldAmt > 0) {
          setTimeout(() => {
            this.triggerCoinFountain(cardWrap, goldAmt);
          }, 250);
        }

        let gemAmt = 0;
        if (f.category === "Major Fortune" || f.type === "jackpot") gemAmt = 30;
        if (f.gems) gemAmt = f.gems;
        if (gemAmt > 0) {
          setTimeout(() => {
            this.triggerGemFountain(cardWrap, gemAmt);
          }, 350);
        }

        this.renderRunStatsBar();
        const statBar = document.getElementById("run-stats-bar");
        if (statBar) {
          statBar.classList.remove("stat-bump-pulse");
          void statBar.offsetWidth;
          statBar.classList.add("stat-bump-pulse");
        }

        this.setTravelButtonState("ready", "Next Day");
      });
      return;
    } else if (event.type === "skill_learned") {
      cardWrap.innerHTML = `
        ${dividerHtml}
        <div class="parchment-event-card">
          <div class="event-story-text">${event.desc}</div>
        </div>
      `;
      this.setTravelButtonState("ready", "Next Day");
    } else if (event.type === "combat" || event.type === "elite" || event.type === "boss") {
      const enemyName = event.enemyData ? event.enemyData.name : (event.bossData ? event.bossData.name : "Monster");

      cardWrap.innerHTML = `
        ${dividerHtml}
        <div class="parchment-event-card">
          <div class="event-story-text">A wild <span class="highlight-red">${enemyName}</span> emerges from the shadows ready to strike!</div>
        </div>
      `;

      this.setTravelButtonState("combat", "⚔️ Fight!");
    } else if (event.type === "narrative" && event.eventDef) {
      const def = event.eventDef;
      let optionsHtml = `<div class="event-choice-list" style="margin-top: 6px;">`;
      def.options.forEach((opt, idx) => {
        optionsHtml += `
          <button class="event-choice-capsule-btn" data-choice="${idx}">
            <strong>${opt.label}</strong>
            <small>${opt.desc}</small>
          </button>
        `;
      });
      optionsHtml += `</div>`;

      let desc = event.desc || "";
      desc = desc.replace(/Campsite/g, '<span class="highlight-orange">Campsite</span>');

      cardWrap.innerHTML = `
        ${dividerHtml}
        <div class="parchment-event-card">
          <div class="event-story-text">${desc}</div>
          ${optionsHtml}
        </div>
      `;

      cardWrap.querySelectorAll(".event-choice-capsule-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
          const idx = parseInt(btn.dataset.choice, 10);
          Sound.playSfx("click");
          const res = this.engine.resolveNarrativeChoice(idx);
          if (res && res.success) {
            btn.parentElement.innerHTML = `<div class="event-choice-resolved">✨ <span class="highlight-blue">${res.msg || 'Success'}</span></div>`;
            this.renderRunStatsBar();
            this.renderStageFloatingHeader();
            if (res.goldWon) {
              this.triggerCoinFountain(btn.parentElement, res.goldWon);
            }
            if (res.gemsWon) {
              this.triggerGemFountain(btn.parentElement, res.gemsWon);
            }
            this.setTravelButtonState("ready", "Next Day");
          } else if (res && !res.success) {
            this.showToast(res.msg);
          }
        });
      });

      this.setTravelButtonState("combat", "Make a Choice");
      const travelBtn = document.getElementById("btn-travel-next");
      if (travelBtn) travelBtn.disabled = true;
    }

    feed.appendChild(cardWrap);

    // Auto-scroll to bottom of event stream smoothly
    if (deck) {
      setTimeout(() => {
        deck.scrollTo({ top: deck.scrollHeight, behavior: "smooth" });
      }, 50);
    }
  }

  showFortuneSplashAnimation(fortune) {
    const overlay = document.getElementById("fortune-splash-overlay");
    const badge = document.getElementById("fortune-splash-badge");
    const icon = document.getElementById("fortune-splash-icon");
    const title = document.getElementById("fortune-splash-title");
    const sub = document.getElementById("fortune-splash-sub");

    if (!overlay || !badge) return;

    // Reset previous theme classes
    badge.classList.remove("theme-major", "theme-minor", "theme-badluck", "theme-misfortune");

    if (fortune.category === "Major Fortune") {
      badge.classList.add("theme-major");
      if (icon) icon.textContent = "⭐";
      if (title) title.textContent = "MAJOR FORTUNE";
      if (sub) sub.textContent = "A rare divine blessing shines upon you!";
      Sound.playSfx("majorFortune");
    } else if (fortune.category === "Bad Luck" || fortune.category === "Misfortune") {
      badge.classList.add("theme-badluck");
      if (icon) icon.textContent = "💀";
      if (title) title.textContent = "BAD LUCK";
      if (sub) sub.textContent = "A harsh twist of fate strikes your path!";
      Sound.playSfx("misfortune");
    } else {
      badge.classList.add("theme-minor");
      if (icon) icon.textContent = "🍀";
      if (title) title.textContent = "MINOR FORTUNE";
      if (sub) sub.textContent = "Good fortune smiles on your journey!";
      Sound.playSfx("fortune");
    }

    // Display banner with smooth fade out
    overlay.style.display = "flex";

    // Allow user to click splash badge to replay sound effect
    badge.onclick = (e) => {
      e.stopPropagation();
      if (fortune.category === "Major Fortune") {
        Sound.playSfx("majorFortune");
      } else if (fortune.category === "Bad Luck" || fortune.category === "Misfortune") {
        Sound.playSfx("misfortune");
      } else {
        Sound.playSfx("fortune");
      }
    };

    if (this._fortuneSplashTimer) clearTimeout(this._fortuneSplashTimer);
    this._fortuneSplashTimer = setTimeout(() => {
      overlay.style.display = "none";
    }, 1500);
  }

  setWinBannerText(text) {
    const layers = ["win-text-shadow", "win-text-bevel", "win-text-stroke", "win-text-front"];
    layers.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        const tp = el.querySelector("textPath");
        if (tp) tp.textContent = text;
        else el.textContent = text;
      }
    });
  }

  playFortuneWinSequence(fortune, onComplete) {
    const banner = document.getElementById("fortune-win-banner");
    const container = document.querySelector(".adventure-run-container");

    if (!banner) {
      if (onComplete) onComplete();
      return;
    }

    const cat = fortune ? (fortune.category || "Minor Fortune") : "Minor Fortune";

    if (cat === "Major Fortune") {
      // 1. Initial State: Minor Win with cyan light aura, rotating sunburst & chime (Matches Video 0:04)
      banner.style.display = "flex";
      banner.className = "fortune-win-banner state-minor-win";
      this.setWinBannerText("Minor Win");
      Sound.playMinorWin();

      // 2. Sudden Dramatic Escalation at 460ms -> Big Win (Matches Video 0:05-0:07)
      setTimeout(() => {
        // Shockwave expansion ring
        const ring = banner.querySelector(".win-shockwave-ring");
        if (ring) {
          ring.classList.remove("trigger");
          void ring.offsetWidth;
          ring.classList.add("trigger");
        }

        // Screen rumble & flash
        if (container) {
          container.classList.remove("win-flash-fx", "win-rumble-fx");
          void container.offsetWidth;
          container.classList.add("win-flash-fx", "win-rumble-fx");
          setTimeout(() => container.classList.remove("win-flash-fx", "win-rumble-fx"), 400);
        }

        // Transform into Big Win (Golden rays + punchy bounce + fanfare)
        banner.className = "fortune-win-banner state-big-win";
        this.setWinBannerText("Big Win");
        Sound.playBigWin();

        // 3. Fade out smoothly and reveal card at ~1350ms
        setTimeout(() => {
          banner.style.transition = "opacity 0.22s ease-out, transform 0.22s ease-out";
          banner.style.opacity = "0";
          banner.style.transform = "translateX(-50%) translateY(-18px) scale(1.08)";
          setTimeout(() => {
            banner.style.display = "none";
            banner.style.opacity = "";
            banner.style.transform = "";
            banner.style.transition = "";
            if (onComplete) onComplete();
          }, 220);
        }, 900);
      }, 460);

    } else if (cat === "Bad Luck" || cat === "Misfortune") {
      // Bad Luck: quick ominous flash & thud
      Sound.playBadLuckThud();
      if (container) {
        container.classList.add("win-flash-fx");
        setTimeout(() => container.classList.remove("win-flash-fx"), 250);
      }
      setTimeout(() => {
        if (onComplete) onComplete();
      }, 250);

    } else {
      // Minor Fortune: stays Minor Win
      banner.style.display = "flex";
      banner.className = "fortune-win-banner state-minor-win";
      this.setWinBannerText("Minor Win");
      Sound.playMinorWin();

      setTimeout(() => {
        banner.style.transition = "opacity 0.22s ease-out, transform 0.22s ease-out";
        banner.style.opacity = "0";
        banner.style.transform = "translateX(-50%) translateY(-15px) scale(1.05)";
        setTimeout(() => {
          banner.style.display = "none";
          banner.style.opacity = "";
          banner.style.transform = "";
          banner.style.transition = "";
          if (onComplete) onComplete();
        }, 220);
      }, 750);
    }
  }

  showStageGoldPill(duration = 2400) {
    const pill = document.getElementById("stage-gold-pill");
    if (!pill) return;
    if (this._goldHideTimer) {
      clearTimeout(this._goldHideTimer);
      this._goldHideTimer = null;
    }
    pill.classList.add("active-loot-reveal");
    if (duration > 0) {
      this._goldHideTimer = setTimeout(() => {
        this.hideStageGoldPill();
      }, duration);
    }
  }

  hideStageGoldPill() {
    const pill = document.getElementById("stage-gold-pill");
    if (pill) {
      pill.classList.remove("active-loot-reveal");
    }
    if (this._goldHideTimer) {
      clearTimeout(this._goldHideTimer);
      this._goldHideTimer = null;
    }
  }

  showStageGemPill(duration = 2400) {
    const pill = document.getElementById("stage-gems-pill");
    if (!pill) return;
    if (this._gemHideTimer) {
      clearTimeout(this._gemHideTimer);
      this._gemHideTimer = null;
    }
    pill.classList.add("active-loot-reveal");
    if (duration > 0) {
      this._gemHideTimer = setTimeout(() => {
        this.hideStageGemPill();
      }, duration);
    }
  }

  hideStageGemPill() {
    const pill = document.getElementById("stage-gems-pill");
    if (pill) {
      pill.classList.remove("active-loot-reveal");
    }
    if (this._gemHideTimer) {
      clearTimeout(this._gemHideTimer);
      this._gemHideTimer = null;
    }
  }

  triggerCoinFountain(sourceElementOrPoint, amountGained = 100) {
    const container = document.getElementById("flying-coins-container");
    if (!container) return;

    Sound.playCoinFountain();
    this.showStageGoldPill(0);

    // 1. Determine Starting Coordinates (Center of parchment story card or click target)
    let startX = window.innerWidth / 2;
    let startY = window.innerHeight * 0.65;

    if (sourceElementOrPoint) {
      if (typeof sourceElementOrPoint.x === "number" && typeof sourceElementOrPoint.y === "number") {
        startX = sourceElementOrPoint.x;
        startY = sourceElementOrPoint.y;
      } else if (sourceElementOrPoint.getBoundingClientRect) {
        // Look specifically for gold pill / badge or gold text first
        let targetInner = null;
        const allPills = sourceElementOrPoint.querySelectorAll ? sourceElementOrPoint.querySelectorAll(".card-pill-capsule") : [];
        for (const p of allPills) {
          if (p.textContent.toLowerCase().includes("gold") || p.textContent.includes("🪙")) {
            targetInner = p;
            break;
          }
        }
        if (!targetInner && sourceElementOrPoint.querySelector) {
          targetInner = sourceElementOrPoint.querySelector(".card-pill-capsule, .event-reward-badge, .event-choice-resolved, .parchment-event-card") || sourceElementOrPoint;
        } else if (!targetInner) {
          targetInner = sourceElementOrPoint;
        }

        const rect = targetInner.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          startX = rect.left + rect.width / 2;
          startY = rect.top + rect.height / 2;
        }
      }
    }

    // 2. Determine Destination Coordinates (Stage Top Gold Pill, or Header Gold Counter)
    const stageGoldPill = document.getElementById("stage-gold-pill");
    const headerGoldPill = document.getElementById("header-gold");
    let endX = window.innerWidth * 0.82;
    let endY = 24;

    const targetHudEl = (stageGoldPill && stageGoldPill.offsetWidth > 0) ? stageGoldPill : (headerGoldPill ? headerGoldPill.parentElement : null);
    if (targetHudEl) {
      const sRect = targetHudEl.getBoundingClientRect();
      if (sRect.width > 0) {
        endX = sRect.left + sRect.width / 2;
        endY = sRect.top + sRect.height / 2;
      }
    }

    const stageGoldNum = document.getElementById("stage-gold-num");
    const headerGoldNum = document.getElementById("header-gold");

    const finalGold = Character.gold;
    const gained = typeof amountGained === "number" && amountGained > 0 ? amountGained : 100;
    const startGold = Math.max(0, finalGold - gained);

    // Immediately display pre-award gold so the count-up is clearly visible as coins land
    if (stageGoldNum) stageGoldNum.textContent = startGold.toLocaleString();
    if (headerGoldNum) headerGoldNum.textContent = startGold.toLocaleString();

    // 3. Spawn 14-16 Golden Coins matching Video Project 1
    const coinCount = 15;
    let coinsArrived = 0;

    for (let i = 0; i < coinCount; i++) {
      // Staggered launch delay
      const launchDelay = i * 32 + (Math.random() * 15);

      setTimeout(() => {
        const coin = document.createElement("div");
        coin.className = "flying-coin-item";
        container.appendChild(coin);

        // Natural random dispersal parameters
        // Burst upward and outward first (arc fountain)
        const burstSpreadX = (Math.random() - 0.5) * 120;
        const arcHeight = 110 + Math.random() * 70;

        // Control point for smooth parabolic curved flight towards top-right HUD
        const cpX = (startX + endX) / 2 + burstSpreadX;
        const cpY = Math.min(startY, endY) - arcHeight;

        // Rotation direction and spin speed
        const spinSpeed = (Math.random() > 0.5 ? 1 : -1) * (720 + Math.random() * 540);
        const coinDuration = 640 + Math.random() * 180; // snappy, energetic flight

        const startTime = performance.now();
        let lastSparkleTime = 0;

        const animFrame = (now) => {
          const elapsed = now - startTime;
          const t = Math.min(1, elapsed / coinDuration);

          // Quadratic Bezier Formula B(t) = (1-t)^2*P0 + 2(1-t)t*P1 + t^2*P2
          const curX = (1 - t) * (1 - t) * startX + 2 * (1 - t) * t * cpX + t * t * endX;
          const curY = (1 - t) * (1 - t) * startY + 2 * (1 - t) * t * cpY + t * t * endY;

          // Scale: pops out large on burst (1.35x), scales down naturally on landing (0.85x)
          const scale = (1 - t * 0.25) + Math.sin(t * Math.PI) * 0.45;
          // 3D-like flip wobble + spin
          const rotZ = t * spinSpeed;
          const flipScaleX = Math.cos(t * Math.PI * 4); // coin spinning in 3D

          coin.style.transform = `translate3d(${curX - 13}px, ${curY - 13}px, 0) scale(${scale}) rotate(${rotZ}deg) scaleX(${Math.abs(flipScaleX) * 0.6 + 0.4})`;

          // Spawn trailing twinkle sparkle during mid-flight
          if (now - lastSparkleTime > 70 && t > 0.12 && t < 0.88) {
            lastSparkleTime = now;
            const sparkle = document.createElement("span");
            sparkle.className = "flying-coin-sparkle";
            sparkle.textContent = "✦";
            sparkle.style.left = `${curX - 5 + (Math.random() - 0.5) * 12}px`;
            sparkle.style.top = `${curY - 5 + (Math.random() - 0.5) * 12}px`;
            container.appendChild(sparkle);
            setTimeout(() => sparkle.remove(), 400);
          }

          if (t < 1) {
            requestAnimationFrame(animFrame);
          } else {
            // Coin reached target HUD pill!
            coin.remove();
            coinsArrived++;

            // Live progressive counter update
            const progress = coinsArrived / coinCount;
            const currentDisplay = coinsArrived === coinCount ? finalGold : Math.min(finalGold, Math.round(startGold + (gained * progress)));
            if (stageGoldNum) stageGoldNum.textContent = currentDisplay.toLocaleString();
            if (headerGoldNum) headerGoldNum.textContent = currentDisplay.toLocaleString();

            // Trigger gold counter bump pulse & audio tap
            Sound.playSfx("coin");

            if (targetHudEl) {
              targetHudEl.classList.remove("coin-hud-bump");
              void targetHudEl.offsetWidth; // Force CSS reflow
              targetHudEl.classList.add("coin-hud-bump");
            }

            if (coinsArrived === coinCount) {
              this.renderRunStatsBar();
              this.renderStageFloatingHeader();
              this.renderHeader();
              this.showStageGoldPill(1800);
            }
          }
        };

        requestAnimationFrame(animFrame);
      }, launchDelay);
    }
  }

  triggerGemFountain(sourceElementOrPoint, amountGained = 25) {
    const container = document.getElementById("flying-coins-container");
    if (!container) return;

    Sound.playSfx("gem");
    this.showStageGemPill(0);

    // 1. Determine Starting Coordinates
    let startX = window.innerWidth / 2;
    let startY = window.innerHeight * 0.65;

    if (sourceElementOrPoint) {
      if (typeof sourceElementOrPoint.x === "number" && typeof sourceElementOrPoint.y === "number") {
        startX = sourceElementOrPoint.x;
        startY = sourceElementOrPoint.y;
      } else if (sourceElementOrPoint.getBoundingClientRect) {
        let targetInner = null;
        const allPills = sourceElementOrPoint.querySelectorAll ? sourceElementOrPoint.querySelectorAll(".card-pill-capsule") : [];
        for (const p of allPills) {
          if (p.textContent.toLowerCase().includes("gem") || p.textContent.includes("💎")) {
            targetInner = p;
            break;
          }
        }
        if (!targetInner && sourceElementOrPoint.querySelector) {
          targetInner = sourceElementOrPoint.querySelector(".card-pill-capsule, .event-reward-badge, .event-choice-resolved, .parchment-event-card") || sourceElementOrPoint;
        } else if (!targetInner) {
          targetInner = sourceElementOrPoint;
        }

        const rect = targetInner.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          startX = rect.left + rect.width / 2;
          startY = rect.top + rect.height / 2;
        }
      }
    }

    // 2. Determine Destination Coordinates (Stage Top Gem Pill, or Header Gems Counter)
    const stageGemsPill = document.getElementById("stage-gems-pill");
    const headerGemsPill = document.getElementById("header-gems");
    let endX = window.innerWidth * 0.88;
    let endY = 24;

    const targetHudEl = (stageGemsPill && stageGemsPill.offsetWidth > 0) ? stageGemsPill : (headerGemsPill ? headerGemsPill.parentElement : null);
    if (targetHudEl) {
      const sRect = targetHudEl.getBoundingClientRect();
      if (sRect.width > 0) {
        endX = sRect.left + sRect.width / 2;
        endY = sRect.top + sRect.height / 2;
      }
    }

    const stageGemsNum = document.getElementById("stage-gems-num");
    const headerGemsNum = document.getElementById("header-gems");

    const finalGems = Character.gems;
    const gained = typeof amountGained === "number" && amountGained > 0 ? amountGained : 25;
    const startGems = Math.max(0, finalGems - gained);

    if (stageGemsNum) stageGemsNum.textContent = startGems.toLocaleString();
    if (headerGemsNum) headerGemsNum.textContent = startGems.toLocaleString();

    // 3. Spawn 8-12 Sparkling Emerald Gems
    const gemCount = Math.min(12, Math.max(6, Math.floor(gained / 2)));
    let gemsArrived = 0;

    for (let i = 0; i < gemCount; i++) {
      const launchDelay = i * 40 + (Math.random() * 20);

      setTimeout(() => {
        const gem = document.createElement("div");
        gem.className = "flying-gem-item";
        container.appendChild(gem);

        const burstSpreadX = (Math.random() - 0.5) * 110;
        const arcHeight = 110 + Math.random() * 60;

        const cpX = (startX + endX) / 2 + burstSpreadX;
        const cpY = Math.min(startY, endY) - arcHeight;

        const spinSpeed = (Math.random() > 0.5 ? 1 : -1) * (540 + Math.random() * 360);
        const gemDuration = 620 + Math.random() * 160;

        const startTime = performance.now();
        let lastSparkleTime = 0;

        const animFrame = (now) => {
          const elapsed = now - startTime;
          const t = Math.min(1, elapsed / gemDuration);

          const curX = (1 - t) * (1 - t) * startX + 2 * (1 - t) * t * cpX + t * t * endX;
          const curY = (1 - t) * (1 - t) * startY + 2 * (1 - t) * t * cpY + t * t * endY;

          const scale = (1 - t * 0.2) + Math.sin(t * Math.PI) * 0.35;
          const rotZ = 45 + t * spinSpeed;

          gem.style.transform = `translate3d(${curX - 12}px, ${curY - 12}px, 0) scale(${scale}) rotate(${rotZ}deg)`;

          if (now - lastSparkleTime > 75 && t > 0.12 && t < 0.88) {
            lastSparkleTime = now;
            const sparkle = document.createElement("span");
            sparkle.className = "flying-gem-sparkle";
            sparkle.textContent = "✦";
            sparkle.style.left = `${curX - 5 + (Math.random() - 0.5) * 12}px`;
            sparkle.style.top = `${curY - 5 + (Math.random() - 0.5) * 12}px`;
            container.appendChild(sparkle);
            setTimeout(() => sparkle.remove(), 400);
          }

          if (t < 1) {
            requestAnimationFrame(animFrame);
          } else {
            gem.remove();
            gemsArrived++;

            const progress = gemsArrived / gemCount;
            const currentDisplay = gemsArrived === gemCount ? finalGems : Math.min(finalGems, Math.round(startGems + (gained * progress)));
            if (stageGemsNum) stageGemsNum.textContent = currentDisplay.toLocaleString();
            if (headerGemsNum) headerGemsNum.textContent = currentDisplay.toLocaleString();

            Sound.playSfx("gem");

            if (targetHudEl) {
              targetHudEl.classList.remove("gem-hud-bump");
              void targetHudEl.offsetWidth;
              targetHudEl.classList.add("gem-hud-bump");
            }

            if (gemsArrived === gemCount) {
              this.renderRunStatsBar();
              this.renderStageFloatingHeader();
              this.renderHeader();
              this.showStageGemPill(1800);
            }
          }
        };

        requestAnimationFrame(animFrame);
      }, launchDelay);
    }
  }

  setTravelButtonState(state, customText) {
    const travelBtn = document.getElementById("btn-travel-next");
    const btnText = document.getElementById("next-day-btn-text");
    if (!travelBtn || !btnText) return;

    travelBtn.classList.remove("state-ready", "state-moving", "state-chest");

    if (state === "chest") {
      travelBtn.classList.add("state-chest");
      travelBtn.disabled = false;
      btnText.innerHTML = customText || "🎁 Pick up Chest";
    } else if (state === "moving") {
      travelBtn.classList.add("state-moving");
      travelBtn.disabled = true;
      btnText.innerHTML = `Moving<span class="moving-dot">.</span>`;
    } else if (state === "combat") {
      travelBtn.classList.add("state-ready");
      travelBtn.disabled = false;
      btnText.innerHTML = customText || "⚔️ Fight!";
    } else if (state === "in-battle") {
      travelBtn.classList.add("state-moving");
      travelBtn.disabled = true;
      btnText.innerHTML = "In Battle...";
    } else {
      // "ready" state -> Authentic Green "Next Day" (Matches Screenshot 2)
      travelBtn.classList.add("state-ready");
      travelBtn.disabled = false;
      btnText.innerHTML = customText || "Next Day";
    }
  }

  handleTravelBtnClick() {
    // Actively unlock audio context and prime audio hardware during user gesture
    Sound.unlockAndWarmup();

    if (this.battle.inBattle || this.engine.traveling) return;

    // 1. CHEST PICK UP PRIORITY: If chest is on stage or pending, clicking this button MUST open the chest!
    if (this.hasPendingChest || (this.engine && this.engine.renderer && this.engine.renderer.chestState)) {
      this.openTreasureChestModal();
      return;
    }

    if (this.engine.currentEvent) {
      const ev = this.engine.currentEvent;
      if (ev.type === "combat" || ev.type === "elite" || ev.type === "boss") {
        this.setTravelButtonState("in-battle");
        this.engine.startCurrentCombat();
        return;
      }
    }

    this.setTravelButtonState("moving");
    this.engine.travelNextDay();
  }

  formatSkillDescription(desc) {
    if (!desc) return "";
    let s = desc;
    // Highlight threshold conditions like <30% HP, <50% HP, Round 1 in green
    s = s.replace(/(<[0-9]+%?\s*HP|Round\s*[0-9]+)/gi, '<span class="kw-green">$1</span>');
    // Highlight stats and bonuses like ATK, DEF, Counter Rate, Crit Rate, Crit DMG, Max HP, Rage, Speed, Dodge in bright blue
    s = s.replace(/\b(ATK|DEF|Counter Rate|Crit Rate|Crit DMG|Max HP|Rage|Speed|Dodge|Gold|Gems)\b/gi, '<span class="kw-blue">$1</span>');
    // Highlight percentages and values in bright blue
    s = s.replace(/(\+[0-9]+%?|[0-9]+% HP|[0-9]+% chance|[0-9]+% damage|[0-9]+% ATK|\b[0-9]+%\b)/gi, '<span class="kw-blue">$1</span>');
    // Highlight arrows like ↑ in green
    s = s.replace(/(↑+)/g, '<span class="kw-green">$1</span>');
    return s;
  }

  showSkillChoiceModal(cards, onSelectCallback) {
    const modal = document.getElementById("modal-skill-choice");
    const container = document.getElementById("skill-cards-container");
    if (!modal || !container) return;

    Sound.playSfx("levelUp");

    container.innerHTML = "";
    cards.forEach(sk => {
      const card = document.createElement("div");
      card.className = "authentic-skill-card";

      const rarityText = (sk.rarity ? sk.rarity.charAt(0).toUpperCase() + sk.rarity.slice(1).toLowerCase() : "Common");
      const formattedDesc = this.formatSkillDescription(sk.desc);
      
      // Auto-resolve badge value if not explicitly given
      let badgeVal = sk.badgeVal;
      if (!badgeVal && sk.desc) {
        const match = sk.desc.match(/(\+[0-9]+%|[0-9]+%)/);
        if (match) badgeVal = match[1];
      }
      const subBadgeHtml = badgeVal ? `<span class="skill-badge-subval">${badgeVal}</span>` : "";

      const badgeHtml = sk.badge
        ? `<div class="skill-card-badge-direct-wrap"><img src="${sk.badge}" class="skill-card-badge-direct" alt="${sk.name}"></div>`
        : `
        <div class="skill-card-badge rarity-${sk.rarity || 'common'}">
          <div class="skill-card-rarity-pill">
            <span class="rarity-diamond-notch">✦</span>
            <span class="rarity-text-label">${rarityText}</span>
          </div>
          <div class="skill-card-icon-frame">
            <img src="${sk.icon}" class="skill-card-icon-img" alt="${sk.name}">
            ${subBadgeHtml}
          </div>
        </div>
      `;

      card.innerHTML = `
        <!-- Left Protruding Skill Icon Badge -->
        ${badgeHtml}

        <!-- Right Content Block -->
        <div class="skill-card-content-block">
          <!-- Top Wood-Beige Header Strip -->
          <div class="skill-card-header-bar">
            <h3 class="skill-card-title-text">${sk.name}</h3>
          </div>
          <!-- Bottom Ivory Parchment Description -->
          <div class="skill-card-body-block">
            <p class="skill-card-description-text">${formattedDesc}</p>
          </div>
        </div>
      `;

      card.addEventListener("click", () => {
        Sound.playSfx("buttonClick");
        modal.classList.remove("open");
        onSelectCallback(sk);
        this.renderAdventureScreen();
      });
      container.appendChild(card);
    });

    modal.classList.add("open");
  }

  showRunSummaryModal(victory, chapter) {
    const modal = document.getElementById("modal-run-summary");
    if (!modal) return;

    const title = document.getElementById("summary-title");
    const text = document.getElementById("summary-text");
    const btn = document.getElementById("summary-claim-btn");

    if (victory) {
      if (title) title.textContent = "🏆 CHAPTER VICTORY!";
      if (text) text.innerHTML = `
        <p>Congratulations, Capybara Champion! You successfully completed all 60 days of <strong>${chapter.name}</strong>!</p>
        <p>Earned: 🪙 +${chapter.rewardGold} Gold | 💎 +${chapter.rewardGems} Gems</p>
      `;
    } else {
      if (title) title.textContent = "💀 RUN DEFEATED";
      if (text) text.innerHTML = `
        <p>Your Capybara collapsed from exhaustion in the dangerous wilderness...</p>
        <p>Temporary skills were lost, but you kept all gathered account Gold & EXP! Upgrade your equipment and talents to try again!</p>
      `;
    }

    if (btn) {
      btn.onclick = () => {
        Sound.playSfx("confirm");
        modal.classList.remove("open");
        this.renderAdventureScreen();
        this.renderHeader();
      };
    }

    modal.classList.add("open");
  }

  // Equipment & Paperdoll Screen
  renderEquipmentScreen() {
    const stats = Character.getEffectiveStats();

    // Fill Hero Stats Labels
    document.getElementById("stat-hp").textContent = stats.hp;
    document.getElementById("stat-atk").textContent = stats.atk;
    document.getElementById("stat-def").textContent = stats.def;
    document.getElementById("stat-crit").textContent = Math.round(stats.critRate * 100) + "%";
    document.getElementById("stat-dodge").textContent = Math.round(stats.dodgeRate * 100) + "%";
    document.getElementById("stat-lifesteal").textContent = Math.round(stats.lifesteal * 100) + "%";

    // Fill Paperdoll Slots
    for (const [slot, item] of Object.entries(Character.equipped)) {
      const slotEl = document.getElementById(`slot-${slot}`);
      if (!slotEl) continue;

      if (item) {
        slotEl.className = `paperdoll-slot occupied rarity-${item.rarity}`;
        slotEl.innerHTML = `
          <img src="${item.icon}" class="slot-item-img" alt="${item.name}">
          <span class="slot-item-lvl">Lv.${item.level}</span>
        `;
        slotEl.onclick = () => this.showItemDetailsModal(item, true);
      } else {
        const tmplIcon = GameData.equipmentTypes[slot].icon;
        slotEl.className = "paperdoll-slot empty";
        slotEl.innerHTML = `<img src="${tmplIcon}" class="slot-ghost-icon" alt="${slot}">`;
        slotEl.onclick = null;
      }
    }

    // Fill Inventory Grid
    const invGrid = document.getElementById("inventory-grid");
    if (invGrid) {
      invGrid.innerHTML = "";
      if (Character.inventory.length === 0) {
        invGrid.innerHTML = `<div class="empty-inv-msg">No spare items in backpack. Open chests to obtain gear!</div>`;
      } else {
        Character.inventory.forEach(it => {
          const itemEl = document.createElement("div");
          itemEl.className = `inv-item-card rarity-${it.rarity}`;
          itemEl.innerHTML = `
            <img src="${it.icon}" class="inv-item-img" alt="${it.name}">
            <span class="inv-item-lvl">Lv.${it.level}</span>
          `;
          itemEl.addEventListener("click", () => {
            Sound.playSfx("click");
            this.showItemDetailsModal(it, false);
          });
          invGrid.appendChild(itemEl);
        });
      }
    }
  }

  showItemDetailsModal(item, isEquipped) {
    const modal = document.getElementById("modal-item-detail");
    if (!modal) return;

    document.getElementById("item-modal-icon").src = item.icon;
    document.getElementById("item-modal-name").textContent = item.name;
    document.getElementById("item-modal-name").className = `item-modal-title rarity-text-${item.rarity}`;
    document.getElementById("item-modal-rarity").textContent = `${item.rarity.toUpperCase()} ${item.slot.toUpperCase()}`;
    document.getElementById("item-modal-lvl").textContent = `Level ${item.level}`;

    const statRows = [];
    if (item.atk) statRows.push(`⚔️ Attack: +${item.atk}`);
    if (item.hp) statRows.push(`💖 Max HP: +${item.hp}`);
    if (item.def) statRows.push(`🛡️ Defense: +${item.def}`);
    if (item.crit) statRows.push(`🎯 Crit Rate: +${Math.round(item.crit * 100)}%`);
    if (item.dodge) statRows.push(`💨 Dodge: +${Math.round(item.dodge * 100)}%`);
    if (item.lifesteal) statRows.push(`🩸 Lifesteal: +${Math.round(item.lifesteal * 100)}%`);

    document.getElementById("item-modal-stats").innerHTML = statRows.map(s => `<div>${s}</div>`).join("");

    const upgradeCost = item.level * 150;
    const btnUpgrade = document.getElementById("btn-item-upgrade");
    btnUpgrade.innerHTML = `Upgrade (🪙 ${upgradeCost})`;
    btnUpgrade.onclick = () => {
      Sound.playSfx("click");
      if (Character.upgradeItem(item.uid)) {
        Sound.playSfx("confirm");
        this.showToast(`Upgraded ${item.name} to Lv.${item.level}!`);
        this.showItemDetailsModal(item, isEquipped);
        this.renderEquipmentScreen();
        this.renderHeader();
      } else {
        this.showToast("Not enough Gold for upgrade!");
      }
    };

    const btnEquip = document.getElementById("btn-item-equip");
    btnEquip.textContent = isEquipped ? "Unequip" : "Equip";
    btnEquip.onclick = () => {
      Sound.playSfx("confirm");
      if (isEquipped) {
        Character.unequip(item.slot);
      } else {
        Character.equip(item);
      }
      modal.classList.remove("open");
      this.renderEquipmentScreen();
    };

    document.getElementById("btn-item-close").onclick = () => {
      modal.classList.remove("open");
    };

    modal.classList.add("open");
  }

  // Talents Screen
  renderTalentsScreen() {
    const container = document.getElementById("talents-list-container");
    if (!container) return;
    container.innerHTML = "";

    GameData.talents.forEach(t => {
      const curRank = Character.talents[t.id] || 0;
      const isMax = curRank >= t.maxRank;
      const cost = isMax ? 0 : Math.round(t.costBase * Math.pow(t.costMult, curRank));

      const card = document.createElement("div");
      card.className = "talent-card";
      card.innerHTML = `
        <div class="talent-icon-wrap">
          <img src="${t.icon}" class="talent-img" alt="${t.name}">
        </div>
        <div class="talent-info">
          <h4>${t.name} <span class="talent-rank">${curRank} / ${t.maxRank}</span></h4>
          <p>${t.desc}</p>
        </div>
        <div class="talent-action">
          ${isMax 
            ? `<button class="btn-game btn-slate" disabled>MAX</button>` 
            : `<button class="btn-game btn-gold talent-upgrade-btn" data-id="${t.id}">🪙 ${cost}</button>`}
        </div>
      `;

      if (!isMax) {
        card.querySelector(".talent-upgrade-btn").addEventListener("click", () => {
          Sound.playSfx("click");
          if (Character.upgradeTalent(t.id)) {
            Sound.playSfx("confirm");
            this.showToast(`Upgraded ${t.name} to Rank ${curRank + 1}!`);
            this.renderTalentsScreen();
            this.renderHeader();
          } else {
            this.showToast("Not enough Gold!");
          }
        });
      }

      container.appendChild(card);
    });
  }

  // Authentic Chests Gacha & Shop Screen
  renderChestsScreen() {
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

    // 1. Update Pity Counters
    const elLegEpic = document.getElementById("pity-leg-epic");
    if (elLegEpic) elLegEpic.textContent = Character.gachaPity.legendaryEpic;

    const elLegSEpic = document.getElementById("pity-leg-sepic");
    if (elLegSEpic) elLegSEpic.textContent = Character.gachaPity.legendarySEpic;

    const elCrateAdv = document.getElementById("pity-crate-adv");
    if (elCrateAdv) elCrateAdv.textContent = Character.gachaPity.adventurer;

    const elCrateHero = document.getElementById("pity-crate-hero");
    if (elCrateHero) elCrateHero.textContent = Character.gachaPity.hero;

    // 2. Update Badges
    const badgeAdvAd = document.getElementById("badge-adv-ad");
    if (badgeAdvAd) badgeAdvAd.textContent = Character.gachaPity.adventurerAds ?? 3;

    const badgeHeroAd = document.getElementById("badge-hero-ad");
    if (badgeHeroAd) badgeHeroAd.textContent = Character.gachaPity.heroAds ?? 1;

    // 3. Update Hero Key Label
    const heroKeyLabel = document.getElementById("hero-key-label");
    if (heroKeyLabel) {
      heroKeyLabel.textContent = `${Character.keys || 0}/1`;
    }

    // 4. Legendary Chest Action Buttons
    const btnLeg1 = document.getElementById("btn-gacha-leg-1");
    if (btnLeg1) {
      btnLeg1.onclick = () => {
        Sound.playSfx("click");
        const res = Gacha.openLegendary(1);
        if (res && res.success) {
          this.showGachaResultsModal(res.items, "Legendary Treasure Chest");
          this.renderHeader();
          this.renderChestsScreen();
        } else if (res && !res.success) {
          this.showToast(res.msg);
        }
      };
    }

    const btnLeg10 = document.getElementById("btn-gacha-leg-10");
    if (btnLeg10) {
      btnLeg10.onclick = () => {
        Sound.playSfx("click");
        const res = Gacha.openLegendary(10);
        if (res && res.success) {
          this.showGachaResultsModal(res.items, "Legendary Treasure Chest (10x)");
          this.renderHeader();
          this.renderChestsScreen();
        } else if (res && !res.success) {
          this.showToast(res.msg);
        }
      };
    }

    // 5. Adventurer Crate Buttons
    const btnAdvAd = document.getElementById("btn-gacha-adv-ad");
    if (btnAdvAd) {
      btnAdvAd.onclick = () => {
        Sound.playSfx("click");
        const res = Gacha.openAdventurer(true);
        if (res && res.success) {
          this.showGachaResultsModal(res.items, "Adventurer's Supply Crate (AD)");
          this.renderHeader();
          this.renderChestsScreen();
        } else if (res && !res.success) {
          this.showToast(res.msg);
        }
      };
    }

    const btnAdvGem = document.getElementById("btn-gacha-adv-gem");
    if (btnAdvGem) {
      btnAdvGem.onclick = () => {
        Sound.playSfx("click");
        const res = Gacha.openAdventurer(false);
        if (res && res.success) {
          this.showGachaResultsModal(res.items, "Adventurer's Supply Crate");
          this.renderHeader();
          this.renderChestsScreen();
        } else if (res && !res.success) {
          this.showToast(res.msg);
        }
      };
    }

    // 6. Hero Crate Buttons
    const btnHeroAd = document.getElementById("btn-gacha-hero-ad");
    if (btnHeroAd) {
      btnHeroAd.onclick = () => {
        Sound.playSfx("click");
        const res = Gacha.openHero(true);
        if (res && res.success) {
          this.showGachaResultsModal(res.items, "Hero's Supply Crate (AD)");
          this.renderHeader();
          this.renderChestsScreen();
        } else if (res && !res.success) {
          this.showToast(res.msg);
        }
      };
    }

    const btnHeroKey = document.getElementById("btn-gacha-hero-key");
    if (btnHeroKey) {
      btnHeroKey.onclick = () => {
        Sound.playSfx("click");
        const res = Gacha.openHero(false);
        if (res && res.success) {
          this.showGachaResultsModal(res.items, "Hero's Supply Crate");
          this.renderHeader();
          this.renderChestsScreen();
        } else if (res && !res.success) {
          this.showToast(res.msg);
        }
      };
    }

    // 7. Info / Probability Buttons
    document.querySelectorAll(".gacha-help-circle-btn").forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        Sound.playSfx("click");
        const type = btn.dataset.info;
        if (type === "legendary") {
          this.showToast("Legendary Rates: S-Epic 5%, Epic 25%, Rare 45%, Great 25%. Guaranteed S-Epic in 60 pulls!");
        } else if (type === "hero") {
          this.showToast("Hero Rates: Epic 20%, Rare 40%, Great 40%. Guaranteed Epic in 10 pulls!");
        } else {
          this.showToast("Adventurer Rates: Great 45%, Common 55%. Guaranteed Great in 9 pulls!");
        }
      };
    });

    // 8. Sub-nav Shelf Buttons
    document.querySelectorAll(".shop-subtab-btn").forEach(btn => {
      btn.onclick = () => {
        Sound.playSfx("click");
        document.querySelectorAll(".shop-subtab-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        const tab = btn.dataset.subtab;
        if (tab === "value_pack") {
          this.showToast("🎁 Daily Value Pack: 100 Gems & 500 Gold claimed!");
          Character.gems += 100;
          Character.gold += 500;
          Character.save();
          this.renderHeader();
        } else if (tab === "pack_shop") {
          this.showToast("🎒 Pack Shop: Adventure Bundle available soon!");
        } else if (tab === "top_up") {
          this.showToast("💎 Top Up: Daily Free +50 Gems claimed!");
          Character.gems += 50;
          Character.save();
          this.renderHeader();
        }
      };
    });
  }

  showGachaResultsModal(items, chestName) {
    Sound.playSfx("chestOpen");
    setTimeout(() => Sound.playSfx("lootRare"), 400);

    const modal = document.getElementById("modal-gacha-result");
    const container = document.getElementById("gacha-loot-container");
    if (!modal || !container) return;

    document.getElementById("gacha-chest-title").textContent = chestName;
    container.innerHTML = "";

    items.forEach((it, idx) => {
      const card = document.createElement("div");
      card.className = `gacha-item-card rarity-${it.rarity}`;
      card.style.animationDelay = `${idx * 0.15}s`;
      card.innerHTML = `
        <div class="gacha-item-img-wrap">
          <img src="${it.icon}" class="gacha-item-img" alt="${it.name}">
        </div>
        <div class="gacha-item-name rarity-text-${it.rarity}">${it.name}</div>
        <div class="gacha-item-rarity">${it.rarity.toUpperCase()}</div>
      `;
      container.appendChild(card);
    });

    document.getElementById("btn-gacha-claim").onclick = () => {
      Sound.playSfx("confirm");
      modal.classList.remove("open");
    };

    modal.classList.add("open");
  }

  // Bestiary Screen
  renderBestiaryScreen() {
    const list = document.getElementById("bestiary-grid");
    if (!list) return;
    list.innerHTML = "";

    // Regular Monsters
    for (const [key, enemy] of Object.entries(GameData.enemies)) {
      const kills = Character.bestiary[enemy.name] || 0;
      const card = document.createElement("div");
      card.className = `bestiary-card ${kills > 0 ? 'discovered' : 'undiscovered'}`;
      card.innerHTML = `
        <div class="bestiary-img-wrap">
          <img src="${enemy.sprite}" class="bestiary-img" alt="${enemy.name}">
        </div>
        <div class="bestiary-name">${kills > 0 ? enemy.name : '???'}</div>
        <div class="bestiary-kills">${kills > 0 ? `Defeated: ${kills}` : 'Not Seen'}</div>
      `;
      list.appendChild(card);
    }

    // Bosses
    for (const [key, boss] of Object.entries(GameData.bosses)) {
      const kills = Character.bestiary[boss.name] || 0;
      const card = document.createElement("div");
      card.className = `bestiary-card boss-card ${kills > 0 ? 'discovered' : 'undiscovered'}`;
      card.innerHTML = `
        <div class="bestiary-img-wrap">
          <img src="${boss.sprite}" class="bestiary-img" alt="${boss.name}">
        </div>
        <div class="bestiary-name">👑 ${kills > 0 ? boss.name : '??? Boss'}</div>
        <div class="bestiary-kills">${kills > 0 ? `Slain: ${kills}` : 'Undefeated'}</div>
      `;
      list.appendChild(card);
    }
  }

  showToast(msg) {
    const toast = document.getElementById("game-toast");
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add("visible");
    setTimeout(() => {
      toast.classList.remove("visible");
    }, 2400);
  }
}

// Global diagnostic & gameplay trigger for Falling Treasure Chest
window.triggerFallingChest = (opts = {}) => {
  if (window.Game && window.Game.ui) {
    window.Game.ui.triggerFallingChest(opts);
  }
};
