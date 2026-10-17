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
    setTimeout(() => this.checkAndShowDailyLogin && this.checkAndShowDailyLogin(), 1800);
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

    // 2. Chapter Previous / Next Arrows & Map Selector
    const btnPrev = document.getElementById("btn-menu-chapter-prev");
    const btnNext = document.getElementById("btn-menu-chapter-next");
    const elChTitle = document.getElementById("menu-chapter-name");

    if (btnPrev) {
      btnPrev.addEventListener("click", (e) => {
        e.stopPropagation();
        const cur = Character.selectedChapter || 1;
        if (cur > 1) {
          Sound.playSfx("click");
          Character.selectedChapter = cur - 1;
          Character.save();
          this.renderMenuHub();
        }
      });
    }

    if (btnNext) {
      btnNext.addEventListener("click", (e) => {
        e.stopPropagation();
        const cur = Character.selectedChapter || 1;
        if (cur < GameData.chapters.length) {
          Sound.playSfx("click");
          Character.selectedChapter = cur + 1;
          Character.save();
          this.renderMenuHub();
        }
      });
    }

    if (elChTitle) {
      elChTitle.addEventListener("click", (e) => {
        e.stopPropagation();
        Sound.playSfx("click");
        this.openChapterSelectModal();
      });
    }

    // Chapter Select Modal close handlers
    const btnCloseCh = document.getElementById("btn-chapter-select-close");
    const btnCloseChX = document.getElementById("btn-chapter-select-close-x");
    const modalCh = document.getElementById("modal-chapter-select");

    if (btnCloseCh && modalCh) {
      btnCloseCh.addEventListener("click", () => {
        modalCh.style.display = "none";
      });
    }
    if (btnCloseChX && modalCh) {
      btnCloseChX.addEventListener("click", () => {
        modalCh.style.display = "none";
      });
    }
    if (modalCh) {
      modalCh.addEventListener("click", (e) => {
        if (e.target === modalCh) modalCh.style.display = "none";
      });
    }

    // Swipe gestures on stage-viewport for chapter switching in menu mode
    const stageVp = document.getElementById("stage-viewport");
    if (stageVp) {
      let touchStartX = 0;
      let touchStartY = 0;
      stageVp.addEventListener("touchstart", (e) => {
        if (e.touches && e.touches.length === 1) {
          touchStartX = e.touches[0].clientX;
          touchStartY = e.touches[0].clientY;
        }
      }, { passive: true });
      stageVp.addEventListener("touchend", (e) => {
        if (!Character.activeRun && touchStartX > 0) {
          const touchEndX = e.changedTouches[0].clientX;
          const touchEndY = e.changedTouches[0].clientY;
          const dx = touchEndX - touchStartX;
          const dy = touchEndY - touchStartY;
          if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) {
            if (dx > 0) {
              if (btnPrev && !btnPrev.disabled) btnPrev.click();
            } else {
              if (btnNext && !btnNext.disabled) btnNext.click();
            }
          }
          touchStartX = 0;
          touchStartY = 0;
        }
      }, { passive: true });
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
      if (btnToMenu) {
        btnToMenu.style.display = Character.activeRun ? "flex" : "none";
      }
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
          this.showToast("Kembali ke Menu Utama 🏠");
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

    // Update in-run companion quick icon
    const runPetIcon = document.getElementById("run-pet-icon");
    if (runPetIcon && GameData.companions) {
      const activeComp = GameData.companions.find(c => c.id === (Character.activeCompanion || "duck"));
      if (activeComp) runPetIcon.textContent = activeComp.icon || "🐾";
    }
  }

  renderMenuHub() {
    const chapterId = Character.selectedChapter || 1;
    const ch = GameData.chapters.find(c => c.id === chapterId) || GameData.chapters[0];
    const isUnlocked = chapterId <= Character.unlockedChapters;

    const elChName = document.getElementById("menu-chapter-name");
    const elLongest = document.getElementById("menu-longest-days");
    const btnStart = document.getElementById("btn-start-run");
    const btnPrev = document.getElementById("btn-menu-chapter-prev");
    const btnNext = document.getElementById("btn-menu-chapter-next");

    if (btnPrev) {
      btnPrev.disabled = chapterId <= 1;
      btnPrev.classList.toggle("disabled", chapterId <= 1);
    }
    if (btnNext) {
      btnNext.disabled = chapterId >= GameData.chapters.length;
      btnNext.classList.toggle("disabled", chapterId >= GameData.chapters.length);
    }

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

    const lawnPanel = document.getElementById("adventure-start-panel");
    if (lawnPanel) {
      lawnPanel.setAttribute("data-theme", `chapter-${chapterId}`);
    }

    if (this.engine && this.engine.renderer) {
      this.engine.renderer.setMenuMode(true);
      if (ch && ch.bg) {
        this.engine.renderer.setBackground(ch.bg);
      }
    }
  }

  openChapterSelectModal() {
    const modal = document.getElementById("modal-chapter-select");
    const list = document.getElementById("chapter-select-list");
    if (!modal || !list) return;

    const currentId = Character.selectedChapter || 1;
    list.innerHTML = GameData.chapters.map(ch => {
      const isUnlocked = ch.id <= Character.unlockedChapters;
      const isCurrent = ch.id === currentId;
      const days = (Character.longestSurvived && Character.longestSurvived[ch.id]) || (ch.id === 1 ? 39 : 0);
      const badgeClass = isCurrent ? "badge-active" : (isUnlocked ? "badge-unlocked" : "badge-locked");
      const badgeText = isCurrent ? "Dipilih" : (isUnlocked ? "Pilih Map" : "Terkunci 🔒");

      return `
        <div class="chapter-select-item ${isCurrent ? 'active' : ''} ${!isUnlocked ? 'locked' : ''}" data-chid="${ch.id}">
          <img src="${ch.bg}" alt="${ch.name}" class="chapter-item-thumb">
          <div class="chapter-item-info">
            <div class="chapter-item-title-row">
              <span class="chapter-item-name">${ch.id}. ${ch.name}</span>
              <span class="chapter-item-badge ${badgeClass}">${badgeText}</span>
            </div>
            <div class="chapter-item-desc">${ch.description || ''}</div>
            <div class="chapter-item-stats">🏆 Max Bertahan: ${days} hari • Hadiah: ${ch.rewardGold || 1000} 🪙, ${ch.rewardGems || 100} 💎</div>
          </div>
        </div>
      `;
    }).join("");

    list.querySelectorAll(".chapter-select-item").forEach(item => {
      item.addEventListener("click", () => {
        const chId = parseInt(item.getAttribute("data-chid"), 10);
        if (chId) {
          Sound.playSfx("click");
          Character.selectedChapter = chId;
          Character.save();
          this.renderMenuHub();
          modal.style.display = "none";
        }
      });
    });

    modal.style.display = "flex";
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

  // ===== AUTHENTIC CAPYBARA GO! DEFEAT SCREEN ANIMATION =====
  showDefeatScreen(summary = {}) {
    const modal = document.getElementById("modal-defeat-screen");
    if (!modal) return;

    // 1. Extract values
    const s = summary || Character.lastRunSummary || {};
    const chapterId = s.chapterId || Character.selectedChapter || 1;
    const targetDay = Math.max(1, s.day || (Character.activeRun ? Character.activeRun.day : 39));
    const longestDay = Math.max(targetDay, s.longestDay || (Character.longestSurvived && Character.longestSurvived[chapterId]) || 39);
    const goldEarned = s.goldEarned || 1043;
    const energyEarned = s.energyEarned || 2;

    // 2. Set static and dynamic labels
    const chTag = document.getElementById("defeat-chapter-pill");
    const daysHeadline = document.getElementById("defeat-days-headline");
    const longestVal = document.getElementById("defeat-longest-val");
    const goldCount = document.getElementById("defeat-gold-count");
    const energyCount = document.getElementById("defeat-energy-count");

    if (chTag) chTag.textContent = `Chapter ${chapterId}`;
    if (longestVal) longestVal.textContent = `${longestDay}d`;
    if (goldCount) goldCount.textContent = `x${goldEarned.toLocaleString()}`;
    if (energyCount) energyCount.textContent = `x${energyEarned}`;

    // 3. Clear previous animations and display modal
    modal.style.display = "flex";
    modal.classList.remove("active");
    void modal.offsetWidth; // force reflow
    modal.classList.add("active");

    // 4. Play defeat sound fanfare
    Sound.playDefeatScreenFanfare && Sound.playDefeatScreenFanfare();

    // 5. Arrow thwack sound sequence
    const arrowDelays = [280, 360, 440, 520];
    arrowDelays.forEach(d => {
      setTimeout(() => {
        Sound.playArrowThwack && Sound.playArrowThwack();
      }, d);
    });

    // 6. Rolling numbers animation for "X days"
    if (daysHeadline) {
      daysHeadline.textContent = "1 day";
      const startCount = 1;
      const endCount = targetDay;
      const countDuration = 650;
      const countStartTime = performance.now() + 550; // starts right after arrows stick

      const countStep = (now) => {
        if (now < countStartTime) {
          requestAnimationFrame(countStep);
          return;
        }
        const elapsed = now - countStartTime;
        const progress = Math.min(1, elapsed / countDuration);
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const current = Math.round(startCount + (endCount - startCount) * easeOut);
        daysHeadline.textContent = `${current} day${current > 1 ? "s" : ""}`;

        if (progress < 1) {
          requestAnimationFrame(countStep);
        } else {
          daysHeadline.textContent = `${endCount} day${endCount > 1 ? "s" : ""}`;
        }
      };
      requestAnimationFrame(countStep);
    }

    // 7. Coin chime when gold card bounces in
    setTimeout(() => {
      Sound.playSfx && Sound.playSfx("coin");
    }, 850);

    // 8. One-click dismiss anywhere on overlay
    const dismissHandler = () => {
      modal.removeEventListener("click", dismissHandler);
      Sound.playSfx && Sound.playSfx("confirm");
      modal.classList.remove("active");
      setTimeout(() => {
        modal.style.display = "none";
        this.renderAdventureScreen();
        this.renderHeader();
        this.renderActiveTab();
      }, 250);
    };

    // Prevent immediate accidental tap during initial animation
    setTimeout(() => {
      modal.addEventListener("click", dismissHandler);
    }, 600);
  }

  showRunSummaryModal(victory, chapterOrSummary) {
    if (!victory) {
      this.showDefeatScreen(chapterOrSummary);
      return;
    }

    const modal = document.getElementById("modal-run-summary");
    if (!modal) return;

    const chapter = chapterOrSummary || (GameData.chapters && GameData.chapters[0]) || { name: "Gale Town", rewardGold: 1000, rewardGems: 100 };
    const title = document.getElementById("summary-title");
    const text = document.getElementById("summary-text");
    const btn = document.getElementById("summary-claim-btn");

    if (title) title.textContent = "🏆 CHAPTER VICTORY!";
    if (text) text.innerHTML = `
      <p>Congratulations, Capybara Champion! You successfully completed all 60 days of <strong>${chapter.name}</strong>!</p>
      <p>Earned: 🪙 +${chapter.rewardGold || 1000} Gold | 💎 +${chapter.rewardGems || 100} Gems</p>
    `;

    if (btn) {
      btn.onclick = () => {
        Sound.playSfx("confirm");
        modal.style.display = "none";
        modal.classList.remove("open");
        this.renderAdventureScreen();
        this.renderHeader();
        this.renderActiveTab();
      };
    }

    modal.style.display = "flex";
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

    // Fill Companion Banner in Equipment Tab
    const compId = Character.activeCompanion || "duck";
    const compDef = (GameData.companions || []).find(c => c.id === compId);
    const compLv = (Character.companionLevels && Character.companionLevels[compId]) || 1;
    const petBadgeEl = document.getElementById("hero-pet-badge");
    const petTitleEl = document.getElementById("hero-pet-title");
    const petLvlEl = document.getElementById("hero-pet-lvl");
    const petSubEl = document.getElementById("hero-pet-sub");
    if (compDef) {
      if (petBadgeEl) petBadgeEl.textContent = compDef.icon || "🐾";
      if (petTitleEl) petTitleEl.textContent = compDef.name;
      if (petLvlEl) petLvlEl.textContent = `Lv. ${compLv}`;
      if (petSubEl) petSubEl.textContent = `🐾 Pasif: ${compDef.passiveDesc || ''}`;
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

  // ===== CINEMATIC GACHA CHEST OPENING SYSTEM =====
  showGachaResultsModal(items, chestName) {
    this.playGachaCinematic(items, chestName);
  }

  playGachaCinematic(items, chestName) {
    this._gachaItems = items || [];
    this._gachaChestName = chestName || "Treasure Chest";
    this._gachaSkipped = false;
    this._gachaOpeningBurst = false;
    if (this._gachaTimers) {
      this._gachaTimers.forEach(t => clearTimeout(t));
    }
    this._gachaTimers = [];

    const modal = document.getElementById("modal-gacha-result");
    if (!modal) return;

    // Detect highest rarity
    const rarityRank = { common: 1, uncommon: 2, rare: 3, epic: 4, legendary: 5 };
    let bestRank = 1;
    let bestRarity = "common";
    for (const it of this._gachaItems) {
      const r = it.rarity || "common";
      if ((rarityRank[r] || 1) > bestRank) {
        bestRank = rarityRank[r] || 1;
        bestRarity = r;
      }
    }
    this._gachaBestRarity = bestRarity;

    // Pick SVG art matching chest type
    let closedSvg = "assets/ui/gacha/chest_legendary.svg";
    if (chestName.includes("Hero")) {
      closedSvg = "assets/ui/gacha/crate_hero.svg";
    } else if (chestName.includes("Adventurer")) {
      closedSvg = "assets/ui/gacha/crate_adventurer.svg";
    }

    const titleEl = document.getElementById("gacha-chest-title");
    if (titleEl) titleEl.textContent = chestName;

    const stageChest = document.getElementById("gacha-stage-chest");
    const stageLoot = document.getElementById("gacha-stage-loot");
    const closedImg = document.getElementById("gacha-chest-closed-img");
    const openedImg = document.getElementById("gacha-chest-opened-img");
    const actor = document.getElementById("gacha-chest-actor");
    const aura = document.getElementById("gacha-chest-aura");
    const beam = document.getElementById("gacha-conical-pillar");
    const crackGlow = document.getElementById("gacha-lid-crack-glow");
    const tapHint = document.getElementById("gacha-open-hint");
    const shockwave = document.getElementById("gacha-ground-shockwave");
    const claimBtn = document.getElementById("btn-gacha-claim");

    if (stageChest) stageChest.style.display = "flex";
    if (stageLoot) stageLoot.style.display = "none";
    if (closedImg) {
      closedImg.src = closedSvg;
      closedImg.style.display = "block";
    }
    if (openedImg) openedImg.style.display = "none";
    if (beam) beam.style.display = "none";
    if (crackGlow) crackGlow.classList.remove("active");
    if (tapHint) {
      tapHint.style.display = "block";
      tapHint.textContent = "✨ Tap Chest to Open ✨";
    }
    if (claimBtn) claimBtn.style.display = "none";

    // Set aura color
    if (aura) {
      aura.className = `gacha-chest-aura aura-${bestRarity}`;
    }

    // Play entrance drop
    if (actor) {
      actor.className = "gacha-chest-actor entrance";
    }
    if (shockwave) {
      shockwave.classList.remove("trigger");
      void shockwave.offsetWidth;
      shockwave.classList.add("trigger");
    }

    modal.style.display = "flex";
    Sound.playSfx("attackHeavy");

    // After drop finishes, transition to idle hover
    const t1 = setTimeout(() => {
      if (actor && !this._gachaOpeningBurst && !this._gachaSkipped) {
        actor.className = "gacha-chest-actor idle";
      }
    }, 650);
    this._gachaTimers.push(t1);

    // Auto-trigger open after suspenseful pause
    const t2 = setTimeout(() => {
      if (!this._gachaOpeningBurst && !this._gachaSkipped) {
        this.triggerChestOpenBurst();
      }
    }, 850);
    this._gachaTimers.push(t2);
  }

  triggerChestOpenBurst() {
    if (this._gachaOpeningBurst || this._gachaSkipped) return;
    this._gachaOpeningBurst = true;

    const actor = document.getElementById("gacha-chest-actor");
    const crackGlow = document.getElementById("gacha-lid-crack-glow");
    const tapHint = document.getElementById("gacha-open-hint");
    const flash = document.getElementById("gacha-screen-flash");
    const closedImg = document.getElementById("gacha-chest-closed-img");
    const openedImg = document.getElementById("gacha-chest-opened-img");
    const beam = document.getElementById("gacha-conical-pillar");
    const shockwave = document.getElementById("gacha-ground-shockwave");

    if (tapHint) tapHint.style.display = "none";

    // Suspense rattle shake
    if (actor) actor.className = "gacha-chest-actor rattling";
    if (crackGlow) crackGlow.classList.add("active");
    Sound.playSfx("dodge");

    // Sudden explosion at 650ms
    const t1 = setTimeout(() => {
      if (this._gachaSkipped) return;

      // Screen flash
      if (flash) {
        flash.classList.add("flash-active");
        setTimeout(() => flash.classList.remove("flash-active"), 280);
      }
      if (shockwave) {
        shockwave.classList.remove("trigger");
        void shockwave.offsetWidth;
        shockwave.classList.add("trigger");
      }

      // Pop open chest
      if (closedImg) closedImg.style.display = "none";
      if (openedImg) openedImg.style.display = "block";
      if (beam) beam.style.display = "block";
      if (crackGlow) crackGlow.classList.remove("active");

      Sound.playSfx("chestOpen");
      this.spawnGachaConfetti(this._gachaBestRarity);
    }, 650);
    this._gachaTimers.push(t1);

    // Reveal loot cards at 1050ms
    const t2 = setTimeout(() => {
      if (this._gachaSkipped) return;
      this.revealGachaLoot(this._gachaItems);
    }, 1050);
    this._gachaTimers.push(t2);
  }

  revealGachaLoot(items) {
    if (this._gachaTimers) {
      this._gachaTimers.forEach(t => clearTimeout(t));
    }

    const stageChest = document.getElementById("gacha-stage-chest");
    const stageLoot = document.getElementById("gacha-stage-loot");
    const singleWrap = document.getElementById("gacha-single-loot");
    const gridWrap = document.getElementById("gacha-loot-container");
    const claimBtn = document.getElementById("btn-gacha-claim");
    const claimLabel = document.getElementById("btn-gacha-claim-label");

    if (stageChest) stageChest.style.display = "none";
    if (stageLoot) stageLoot.style.display = "flex";

    if (!items || items.length === 0) return;

    if (items.length === 1) {
      // Single Pull (1x Hero Showcase)
      const it = items[0];
      if (singleWrap) {
        singleWrap.style.display = "flex";
        singleWrap.innerHTML = `
          <div class="gacha-hero-card rarity-${it.rarity}">
            <div class="gacha-hero-badge badge-${it.rarity}">★ ${it.rarity.toUpperCase()} ★</div>
            <div class="gacha-hero-icon-wrap">
              <img src="${it.icon}" class="gacha-hero-icon" alt="${it.name}">
            </div>
            <div class="gacha-hero-name rarity-text-${it.rarity}">${it.name}</div>
            <div class="gacha-hero-stats">
              ${it.baseAtk ? `<span class="gacha-stat-pill">⚔️ ATK +${it.baseAtk}</span>` : ""}
              ${it.baseHp ? `<span class="gacha-stat-pill">❤️ HP +${it.baseHp}</span>` : ""}
              ${it.defBonus ? `<span class="gacha-stat-pill">🛡️ DEF +${it.defBonus}</span>` : ""}
              ${it.critBonus ? `<span class="gacha-stat-pill">⚡ CRIT +${Math.round(it.critBonus * 100)}%</span>` : ""}
            </div>
          </div>
        `;
      }
      if (gridWrap) gridWrap.style.display = "none";
      if (claimLabel) claimLabel.textContent = "Claim Equipment ✨";

      if (it.rarity === "legendary") {
        Sound.playSfx("bigWin");
      } else if (it.rarity === "epic") {
        Sound.playSfx("lootRare");
      } else {
        Sound.playSfx("fortune");
      }

    } else {
      // Multi Pull (10x Grid Showcase)
      if (singleWrap) singleWrap.style.display = "none";
      if (gridWrap) {
        gridWrap.style.display = "grid";
        gridWrap.innerHTML = "";
        items.forEach((it, idx) => {
          const card = document.createElement("div");
          card.className = `gacha-item-card rarity-${it.rarity}`;
          card.style.animationDelay = `${idx * 0.08}s`;
          card.innerHTML = `
            <div class="gacha-item-img-wrap">
              <img src="${it.icon}" class="gacha-item-img" alt="${it.name}">
            </div>
            <div class="gacha-item-name rarity-text-${it.rarity}">${it.name}</div>
            <div class="gacha-item-rarity">${it.rarity.toUpperCase()}</div>
          `;
          gridWrap.appendChild(card);

          const t = setTimeout(() => {
            if (!this._gachaSkipped) {
              Sound.playSfx("click");
              if (it.rarity === "epic" || it.rarity === "legendary") {
                Sound.playSfx("lootRare");
              }
            }
          }, idx * 80);
          this._gachaTimers.push(t);
        });
      }
      if (claimLabel) claimLabel.textContent = `Claim All (${items.length}) Treasures ✨`;
    }

    if (claimBtn) {
      claimBtn.style.display = "inline-flex";
      claimBtn.onclick = () => {
        Sound.playSfx("confirm");
        const modal = document.getElementById("modal-gacha-result");
        if (modal) modal.style.display = "none";
        this.renderHeader();
        this.renderChestsScreen();
      };
    }
  }

  skipGachaAnimation() {
    this._gachaSkipped = true;
    if (this._gachaTimers) {
      this._gachaTimers.forEach(t => clearTimeout(t));
    }
    const canvas = document.getElementById("gacha-confetti-canvas");
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    this.revealGachaLoot(this._gachaItems);
  }

  spawnGachaConfetti(bestRarity = "rare") {
    const canvas = document.getElementById("gacha-confetti-canvas");
    if (!canvas) return;
    const colors = bestRarity === "legendary" 
      ? ["#f59e0b", "#fde047", "#ef4444", "#ffffff", "#ec4899"]
      : ["#a855f7", "#38bdf8", "#4ade80", "#fde047", "#ffffff"];

    this._gachaParticles = [];
    const cx = canvas.width / 2;
    const cy = canvas.height * 0.48;

    for (let i = 0; i < 55; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 6.5;
      this._gachaParticles.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 3.5,
        size: 4 + Math.random() * 6,
        color: colors[Math.floor(Math.random() * colors.length)],
        rot: Math.random() * Math.PI * 2,
        vrot: (Math.random() - 0.5) * 0.25,
        alpha: 1.0,
        isStar: Math.random() < 0.35
      });
    }

    const animateConfetti = () => {
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let pIdx = this._gachaParticles.length - 1; pIdx >= 0; pIdx--) {
        const p = this._gachaParticles[pIdx];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.25;
        p.rot += p.vrot;
        p.alpha -= 0.016;

        if (p.alpha <= 0) {
          this._gachaParticles.splice(pIdx, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;

        if (p.isStar) {
          ctx.beginPath();
          for (let s = 0; s < 5; s++) {
            const a1 = (Math.PI * 2 / 5) * s;
            const a2 = a1 + Math.PI / 5;
            const rx1 = Math.cos(a1) * p.size;
            const ry1 = Math.sin(a1) * p.size;
            const rx2 = Math.cos(a2) * (p.size * 0.45);
            const ry2 = Math.sin(a2) * (p.size * 0.45);
            if (s === 0) ctx.moveTo(rx1, ry1);
            else ctx.lineTo(rx1, ry1);
            ctx.lineTo(rx2, ry2);
          }
          ctx.closePath();
          ctx.fill();
        } else {
          ctx.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.7);
        }
        ctx.restore();
      }

      if (this._gachaParticles.length > 0) {
        requestAnimationFrame(animateConfetti);
      }
    };

    requestAnimationFrame(animateConfetti);
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

  // ===== DAILY LOGIN BONUS CONTROLLER =====
  openDailyLogin() {
    const modal = document.getElementById("daily-login-modal");
    if (!modal) return;
    this.renderDailyLoginModal();
    modal.style.display = "flex";
  }

  claimDailyLogin() {
    const reward = Character.checkDailyLogin && Character.checkDailyLogin();
    if (!reward) {
      document.getElementById("daily-login-modal").style.display = "none";
      if (this.showToast) this.showToast("Already claimed today! Come back tomorrow! 🌟", "info");
      return;
    }
    Sound.playSfx && Sound.playSfx("chest");
    this.renderDailyLoginModal();
    this.renderHeader();
    const btn = document.getElementById("btn-daily-claim");
    if (btn) { btn.textContent = "✅ Claimed!"; btn.disabled = true; }
    setTimeout(() => {
      const modal = document.getElementById("daily-login-modal");
      if (modal) modal.style.display = "none";
      if (btn) { btn.textContent = "Claim Reward!"; btn.disabled = false; }
    }, 1500);
  }

  renderDailyLoginModal() {
    const streak = (Character.dailyLogin && Character.dailyLogin.streak) || 1;
    const rewardsEl = document.getElementById("daily-login-rewards");
    const streakEl = document.getElementById("daily-login-streak");
    const dlrValue = document.getElementById("dlr-value");

    if (streakEl) streakEl.textContent = `Streak: ${streak} day${streak > 1 ? "s" : ""} 🔥`;

    if (rewardsEl && GameData.dailyLoginRewards) {
      rewardsEl.innerHTML = GameData.dailyLoginRewards.map((r, i) => {
        const dayNum = i + 1;
        const isClaimed = streak > dayNum;
        const isToday = streak === dayNum;
        let cls = "dlr-day-pill";
        if (isClaimed) cls += " claimed";
        if (isToday) cls += " today";
        const valText = r.gems > 0 ? `+${r.gems}💎` : `+${r.gold}🪙`;
        return `<div class="${cls}"><span class="pill-icon">${r.icon}</span><span class="pill-day">Day ${dayNum}</span><small>${valText}</small></div>`;
      }).join("");
    }

    const rewardIdx = (Math.max(0, streak - 1)) % 7;
    const todayReward = GameData.dailyLoginRewards && GameData.dailyLoginRewards[rewardIdx];
    if (dlrValue && todayReward) {
      const parts = [];
      if (todayReward.gold) parts.push(`+${todayReward.gold} 🪙`);
      if (todayReward.gems) parts.push(`+${todayReward.gems} 💎`);
      dlrValue.textContent = parts.join("  ");
    }
  }

  checkAndShowDailyLogin() {
    const today = new Date().toISOString().slice(0, 10);
    const lastLogin = Character.dailyLogin && Character.dailyLogin.lastLoginDate;
    if (lastLogin !== today) {
      this.openDailyLogin();
    }
  }

  // ===== ACHIEVEMENTS SYSTEM CONTROLLER =====
  openAchievements() {
    const modal = document.getElementById("achievements-modal");
    if (!modal) return;
    this.renderAchievementsPanel();
    modal.style.display = "flex";
  }

  renderAchievementsPanel() {
    const list = document.getElementById("achievements-list");
    if (!list || !GameData.achievements) return;
    Character.checkAchievements && Character.checkAchievements();
    const prog = Character.achievementProgress || {};
    const claimed = Character.claimedAchievements || [];

    list.innerHTML = GameData.achievements.map(ach => {
      const isDone = claimed.includes(ach.id);
      const p = prog[ach.id] || { progress: 0, target: ach.target };
      const pct = Math.min(100, Math.round((p.progress / p.target) * 100));
      const rewardText = [ach.reward.gold ? `+${ach.reward.gold}🪙` : "", ach.reward.gems ? `+${ach.reward.gems}💎` : ""].filter(Boolean).join(" ");
      return `<div class="ach-item${isDone ? " unlocked" : ""}">
        <div class="ach-icon">${ach.icon}</div>
        <div class="ach-info">
          <div class="ach-name">${ach.name} ${isDone ? '<span class="ach-badge">✓ Done</span>' : ''}</div>
          <div class="ach-desc">${ach.desc}</div>
          <div class="ach-progress-wrap">
            <div class="ach-progress-bar"><div class="ach-progress-fill" style="width:${pct}%"></div></div>
            <div class="ach-progress-text">${p.progress}/${p.target} — Reward: ${rewardText}</div>
          </div>
        </div>
      </div>`;
    }).join("");
  }

  showAchievementToast(ach) {
    const toast = document.getElementById("achievement-toast");
    const iconEl = document.getElementById("achievement-toast-icon");
    const nameEl = document.getElementById("achievement-toast-name");
    if (!toast) return;
    if (iconEl) iconEl.textContent = ach.icon || "⭐";
    if (nameEl) nameEl.textContent = ach.name;
    toast.style.display = "flex";
    toast.classList.remove("show");
    void toast.offsetWidth;
    toast.classList.add("show");
    Sound.playSfx && Sound.playSfx("fanfare");
    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => { toast.style.display = "none"; }, 400);
    }, 3500);
  }

  // ===== FORTUNE WHEEL CONTROLLER =====
  // ===== FORTUNE WHEEL CONTROLLER (AUTHENTIC CAPYBARA GO STYLE) =====
  openFortuneWheel() {
    const modal = document.getElementById("fortune-wheel-modal");
    if (!modal) return;
    this.wheelCurrentAngle = this.wheelCurrentAngle || 0;
    this.wheelPointerAngle = 0;
    this.wheelPointerVelocity = 0;
    this.wheelParticles = [];
    this.drawFortuneWheelCanvas(this.wheelCurrentAngle, -1);
    this.updateWheelStatus();
    const resEl = document.getElementById("fortune-wheel-result");
    if (resEl) resEl.style.display = "none";
    modal.style.display = "flex";
  }

  drawFortuneWheel(highlightIndex = -1) {
    this.drawFortuneWheelCanvas(this.wheelCurrentAngle || 0, highlightIndex);
  }

  drawFortuneWheelRotated(angle, highlightIndex = -1) {
    this.drawFortuneWheelCanvas(angle, highlightIndex);
  }

  drawFortuneWheelCanvas(currentAngle = 0, highlightIndex = -1) {
    const canvas = document.getElementById("fortune-wheel-canvas");
    if (!canvas || !GameData.fortuneWheelSlots) return;

    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== 320 * dpr || canvas.height !== 360 * dpr) {
      canvas.width = 320 * dpr;
      canvas.height = 360 * dpr;
    }
    const ctx = canvas.getContext("2d");
    ctx.save();
    ctx.resetTransform && ctx.resetTransform();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, 320, 360);

    const cx = 160;
    const cy = 162;
    const wheelR = 118;
    const innerR = 98;
    const slots = GameData.fortuneWheelSlots;
    const arc = (Math.PI * 2) / slots.length;

    // -------------------------------------------------------------
    // 1. DRAW WOODEN STAND & BUSHES (BEHIND WHEEL)
    // -------------------------------------------------------------
    // Pedestal wooden pillar
    ctx.save();
    const standGrad = ctx.createLinearGradient(130, 160, 190, 320);
    standGrad.addColorStop(0, "#6b3715");
    standGrad.addColorStop(0.5, "#542a0e");
    standGrad.addColorStop(1, "#3d1c07");
    ctx.fillStyle = standGrad;
    ctx.strokeStyle = "#241104";
    ctx.lineWidth = 3;

    ctx.beginPath();
    ctx.moveTo(132, 165);
    ctx.lineTo(112, 314);
    ctx.lineTo(208, 314);
    ctx.lineTo(188, 165);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Wood streaks on pillar
    ctx.strokeStyle = "rgba(168, 92, 43, 0.45)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(148, 185); ctx.lineTo(138, 305);
    ctx.moveTo(160, 175); ctx.lineTo(160, 310);
    ctx.moveTo(172, 185); ctx.lineTo(182, 305);
    ctx.stroke();

    // Base horizontal bar
    const baseGrad = ctx.createLinearGradient(60, 312, 60, 338);
    baseGrad.addColorStop(0, "#7d3f1a");
    baseGrad.addColorStop(0.3, "#632f11");
    baseGrad.addColorStop(1, "#441e08");
    ctx.fillStyle = baseGrad;
    ctx.strokeStyle = "#241104";
    ctx.lineWidth = 3;

    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(62, 312, 196, 26, 7);
    } else {
      ctx.rect(62, 312, 196, 26);
    }
    ctx.fill();
    ctx.stroke();

    // Top shine on base bar
    ctx.strokeStyle = "#a75929";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(68, 314);
    ctx.lineTo(252, 314);
    ctx.stroke();

    // Screw rivets on base
    ctx.fillStyle = "#facc15";
    ctx.strokeStyle = "#451a03";
    ctx.lineWidth = 1.2;
    [80, 240].forEach(bx => {
      ctx.beginPath();
      ctx.arc(bx, 325, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });

    // --- Cute Shrub Bushes (Left & Right) Matching Screenshot ---
    const drawBushCluster = (baseX, baseY) => {
      ctx.save();
      const bubbles = [
        { dx: -14, dy: -4, r: 13 },
        { dx: 14, dy: -4, r: 13 },
        { dx: -6, dy: -14, r: 15 },
        { dx: 8, dy: -13, r: 15 },
        { dx: 0, dy: -3, r: 17 }
      ];
      // Dark outlines
      ctx.strokeStyle = "#162e03";
      ctx.lineWidth = 2.5;
      bubbles.forEach(b => {
        ctx.beginPath();
        ctx.arc(baseX + b.dx, baseY + b.dy, b.r, 0, Math.PI * 2);
        ctx.stroke();
      });
      // Foliage fill
      bubbles.forEach(b => {
        const leafGrad = ctx.createRadialGradient(baseX + b.dx - 3, baseY + b.dy - 4, 2, baseX + b.dx, baseY + b.dy, b.r);
        leafGrad.addColorStop(0, "#a3e635");
        leafGrad.addColorStop(0.45, "#65a30d");
        leafGrad.addColorStop(1, "#3f6212");
        ctx.fillStyle = leafGrad;
        ctx.beginPath();
        ctx.arc(baseX + b.dx, baseY + b.dy, b.r, 0, Math.PI * 2);
        ctx.fill();
      });
      // Leafy highlight dots
      ctx.fillStyle = "#d9f99d";
      ctx.beginPath();
      ctx.arc(baseX - 4, baseY - 16, 2.2, 0, Math.PI * 2);
      ctx.arc(baseX + 6, baseY - 15, 2.2, 0, Math.PI * 2);
      ctx.arc(baseX - 10, baseY - 7, 1.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    drawBushCluster(78, 324);
    drawBushCluster(242, 324);
    ctx.restore();

    // -------------------------------------------------------------
    // 2. DRAW ROTATING WHEEL (RIM, SLICES, ICONS, PEGS, HUB)
    // -------------------------------------------------------------
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(currentAngle);

    // Outer Wooden Rim
    const rimGrad = ctx.createRadialGradient(0, 0, innerR, 0, 0, wheelR);
    rimGrad.addColorStop(0, "#8a461e");
    rimGrad.addColorStop(0.5, "#6b3313");
    rimGrad.addColorStop(1, "#4d230b");
    ctx.fillStyle = rimGrad;
    ctx.strokeStyle = "#271104";
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(0, 0, wheelR, 0, Math.PI * 2);
    ctx.arc(0, 0, innerR, 0, Math.PI * 2, true);
    ctx.fill();
    ctx.stroke();

    // Wooden plank dividers on rim
    ctx.strokeStyle = "rgba(39, 17, 4, 0.75)";
    ctx.lineWidth = 1.8;
    for (let i = 0; i < slots.length; i++) {
      const pAngle = arc * i - Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(pAngle) * innerR, Math.sin(pAngle) * innerR);
      ctx.lineTo(Math.cos(pAngle) * wheelR, Math.sin(pAngle) * wheelR);
      ctx.stroke();
    }

    // Inner rim decorative gold wire
    ctx.strokeStyle = "#b45309";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, innerR + 1.5, 0, Math.PI * 2);
    ctx.stroke();

    // Draw Slices
    slots.forEach((slot, i) => {
      const startAngle = arc * i - Math.PI / 2;
      const endAngle = startAngle + arc;

      // Slice background
      ctx.save();
      ctx.fillStyle = slot.color || "#fffdf5";
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, innerR, startAngle, endAngle);
      ctx.closePath();
      ctx.fill();

      // Slice border
      ctx.strokeStyle = "#271104";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Winning Slot Highlight
      if (highlightIndex === i) {
        ctx.fillStyle = "rgba(255, 234, 0, 0.38)";
        ctx.fill();
      }
      ctx.restore();

      // Slice Content (Text & Vector Icon)
      ctx.save();
      ctx.rotate(startAngle + arc / 2);

      // --- Label Text (outer curve area) ---
      ctx.textAlign = "right";
      ctx.font = "900 12px 'Lilita One', 'Fredoka', cursive, sans-serif";
      ctx.lineWidth = 3;
      ctx.strokeStyle = "#271104";
      ctx.strokeText(slot.label, innerR - 9, 4);
      ctx.fillStyle = slot.textColor || "#271104";
      ctx.fillText(slot.label, innerR - 9, 4);

      // --- Custom Vector Icon (inner slice area) ---
      const iconX = 42;
      const iconY = 0;
      ctx.translate(iconX, iconY);

      if (slot.icon === "exp") {
        // Hexagon EXP Badge
        ctx.save();
        const hexR = 12;
        ctx.beginPath();
        for (let h = 0; h < 6; h++) {
          const ha = (Math.PI / 3) * h;
          const hx = Math.cos(ha) * hexR;
          const hy = Math.sin(ha) * hexR;
          if (h === 0) ctx.moveTo(hx, hy);
          else ctx.lineTo(hx, hy);
        }
        ctx.closePath();
        ctx.fillStyle = "#15803d";
        ctx.fill();
        ctx.strokeStyle = "#14532d";
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.strokeStyle = "#86efac";
        ctx.lineWidth = 1.2;
        ctx.stroke();

        ctx.font = "900 8.5px 'Lilita One', 'Fredoka', sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.lineWidth = 2;
        ctx.strokeStyle = "#000000";
        ctx.strokeText("EXP", 0, 1);
        ctx.fillStyle = "#ffffff";
        ctx.fillText("EXP", 0, 1);
        ctx.restore();

      } else if (slot.icon === "sword") {
        // RPG Sword
        ctx.save();
        ctx.rotate(-Math.PI / 5);
        // Blade
        ctx.fillStyle = "#f8fafc";
        ctx.strokeStyle = "#1e293b";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, -12);
        ctx.lineTo(3.5, -6);
        ctx.lineTo(2.5, 3);
        ctx.lineTo(-2.5, 3);
        ctx.lineTo(-3.5, -6);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        // Guard
        ctx.fillStyle = "#facc15";
        ctx.strokeStyle = "#78350f";
        ctx.lineWidth = 1.2;
        ctx.fillRect(-6, 3, 12, 3);
        ctx.strokeRect(-6, 3, 12, 3);
        // Grip & Pommel
        ctx.fillStyle = "#92400e";
        ctx.fillRect(-1.5, 6, 3, 4);
        ctx.fillStyle = "#facc15";
        ctx.beginPath();
        ctx.arc(0, 11, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();

      } else if (slot.icon === "heart") {
        // Cute Pink/Red Heart
        ctx.save();
        ctx.scale(0.85, 0.85);
        ctx.fillStyle = "#ff3366";
        ctx.strokeStyle = "#700018";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, 9);
        ctx.bezierCurveTo(-9, 3, -11, -5, -5, -9);
        ctx.bezierCurveTo(-1, -11, 0, -6, 0, -5);
        ctx.bezierCurveTo(0, -6, 1, -11, 5, -9);
        ctx.bezierCurveTo(11, -5, 9, 3, 0, 9);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        // Specular highlight
        ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
        ctx.beginPath();
        ctx.ellipse(-4, -5, 3, 1.8, -Math.PI / 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

      } else if (slot.icon === "gold") {
        // Shiny Gold Coins
        ctx.save();
        ctx.fillStyle = "#eab308";
        ctx.strokeStyle = "#713f12";
        ctx.lineWidth = 2;
        // Back coin
        ctx.beginPath();
        ctx.arc(3, -2, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Front coin
        const coinGrad = ctx.createLinearGradient(-8, -6, 4, 8);
        coinGrad.addColorStop(0, "#fef08a");
        coinGrad.addColorStop(1, "#ca8a04");
        ctx.fillStyle = coinGrad;
        ctx.beginPath();
        ctx.arc(-2, 3, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Sparkle glint
        ctx.fillStyle = "#ffffff";
        ctx.font = "900 11px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("✦", 4, -7);
        ctx.restore();

      } else if (slot.icon === "skill") {
        // Mystical Purple Skill Card
        ctx.save();
        ctx.fillStyle = "#7c3aed";
        ctx.strokeStyle = "#facc15";
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(-7, -10, 14, 20, 3);
        else ctx.rect(-7, -10, 14, 20);
        ctx.fill();
        ctx.stroke();
        // Glowing question mark
        ctx.fillStyle = "#ffffff";
        ctx.font = "900 11px 'Lilita One', sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("?", 0, 0);
        ctx.restore();
      }

      ctx.restore();
    });

    // Outer Rim Golden Pegs (Pins) at Slice Dividers
    for (let i = 0; i < slots.length; i++) {
      const pegAngle = arc * i - Math.PI / 2;
      const pegR = 107;
      const px = Math.cos(pegAngle) * pegR;
      const py = Math.sin(pegAngle) * pegR;

      ctx.save();
      const pegGrad = ctx.createRadialGradient(px - 1, py - 1, 1, px, py, 4.5);
      pegGrad.addColorStop(0, "#fffbeb");
      pegGrad.addColorStop(0.35, "#facc15");
      pegGrad.addColorStop(1, "#a16207");
      ctx.fillStyle = pegGrad;
      ctx.strokeStyle = "#381702";
      ctx.lineWidth = 1.5;

      ctx.beginPath();
      ctx.arc(px, py, 4.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // Center Axle Hub
    ctx.save();
    // Outer wooden circle
    const hubGrad = ctx.createRadialGradient(-2, -3, 3, 0, 0, 24);
    hubGrad.addColorStop(0, "#8a471e");
    hubGrad.addColorStop(0.6, "#5c2e12");
    hubGrad.addColorStop(1, "#381907");
    ctx.fillStyle = hubGrad;
    ctx.strokeStyle = "#241104";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Brass inner bevel
    ctx.strokeStyle = "#d97706";
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(0, 0, 18, 0, Math.PI * 2);
    ctx.stroke();

    // Center disc with etched screw cross
    ctx.fillStyle = "#4a240c";
    ctx.beginPath();
    ctx.arc(0, 0, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#271104";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-5, -5); ctx.lineTo(5, 5);
    ctx.moveTo(5, -5); ctx.lineTo(-5, 5);
    ctx.stroke();
    ctx.restore();

    ctx.restore(); // End Rotating Wheel

    // -------------------------------------------------------------
    // 3. DRAW TOP BRACKET MOUNT & SPRING TICKER POINTER (IN FRONT)
    // -------------------------------------------------------------
    // Golden-Trimmed Wooden Arch Mount
    ctx.save();
    const mountGrad = ctx.createLinearGradient(142, 26, 178, 48);
    mountGrad.addColorStop(0, "#b45309");
    mountGrad.addColorStop(0.5, "#78350f");
    mountGrad.addColorStop(1, "#451a03");
    ctx.fillStyle = mountGrad;
    ctx.strokeStyle = "#241104";
    ctx.lineWidth = 2.5;

    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(142, 26, 36, 22, [10, 10, 4, 4]);
    else ctx.rect(142, 26, 36, 22);
    ctx.fill();
    ctx.stroke();

    // Golden border trim
    ctx.strokeStyle = "#fde047";
    ctx.lineWidth = 1.6;
    ctx.stroke();

    // Mount mini screws
    ctx.fillStyle = "#facc15";
    ctx.beginPath();
    ctx.arc(148, 33, 2, 0, Math.PI * 2);
    ctx.arc(172, 33, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Spring Ticker Pointer (Physics Recoil on Peg Hit)
    ctx.save();
    ctx.translate(cx, 44);
    ctx.rotate(this.wheelPointerAngle || 0);

    // Tapered pointer path pointing down towards y = 26
    ctx.beginPath();
    ctx.moveTo(-10, -4);
    ctx.quadraticCurveTo(-9, 12, 0, 27);
    ctx.quadraticCurveTo(9, 12, 10, -4);
    ctx.closePath();

    const ptrGrad = ctx.createLinearGradient(-10, -4, 10, 26);
    ptrGrad.addColorStop(0, "#fb7185");
    ptrGrad.addColorStop(0.6, "#e11d48");
    ptrGrad.addColorStop(1, "#9f1239");
    ctx.fillStyle = ptrGrad;
    ctx.fill();

    // Golden bevel outline
    ctx.strokeStyle = "#fde047";
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.strokeStyle = "#241104";
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Center Gold Rivet Pivot
    ctx.fillStyle = "#facc15";
    ctx.strokeStyle = "#451a03";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 1, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(-1, 0, 1.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // -------------------------------------------------------------
    // 4. CELEBRATION CONFETTI & PARTICLES
    // -------------------------------------------------------------
    if (this.wheelParticles && this.wheelParticles.length > 0) {
      ctx.save();
      for (let pIdx = this.wheelParticles.length - 1; pIdx >= 0; pIdx--) {
        const p = this.wheelParticles[pIdx];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.22; // gravity
        p.rot += p.vrot;
        p.alpha -= 0.015;

        if (p.alpha <= 0) {
          this.wheelParticles.splice(pIdx, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;

        if (p.isStar) {
          ctx.beginPath();
          for (let s = 0; s < 5; s++) {
            const a1 = (Math.PI * 2 / 5) * s;
            const a2 = a1 + Math.PI / 5;
            const rx1 = Math.cos(a1) * p.size;
            const ry1 = Math.sin(a1) * p.size;
            const rx2 = Math.cos(a2) * (p.size * 0.45);
            const ry2 = Math.sin(a2) * (p.size * 0.45);
            if (s === 0) ctx.moveTo(rx1, ry1);
            else ctx.lineTo(rx1, ry1);
            ctx.lineTo(rx2, ry2);
          }
          ctx.closePath();
          ctx.fill();
        } else {
          ctx.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.7);
        }
        ctx.restore();
      }
      ctx.restore();
    }

    ctx.restore();
  }

  spinFortuneWheel() {
    if (this.wheelIsSpinning) return;

    const canFree = Character.canSpinWheel && Character.canSpinWheel();
    const canPaid = Character.canAffordGoldSpin && Character.canAffordGoldSpin();

    if (!canFree && !canPaid) {
      if (this.showToast) this.showToast("Need 100 🪙 or wait until tomorrow! ⏰", "info");
      this.updateWheelStatus();
      return;
    }

    const isPaid = !canFree && canPaid;

    const btn = document.getElementById("btn-spin-wheel");
    const btnText = document.getElementById("btn-spin-wheel-text");
    if (btn) {
      btn.disabled = true;
      btn.classList.add("spinning");
    }
    if (btnText) btnText.textContent = "Spinning...";

    const resEl = document.getElementById("fortune-wheel-result");
    if (resEl) resEl.style.display = "none";

    this.wheelIsSpinning = true;

    // Pick winning index according to weighted odds
    const slots = GameData.fortuneWheelSlots;
    const totalWeight = slots.reduce((s, sl) => s + (sl.weight || 10), 0);
    let rand = Math.random() * totalWeight;
    let selectedIndex = 0;
    for (let i = 0; i < slots.length; i++) {
      rand -= (slots[i].weight || 10);
      if (rand <= 0) { selectedIndex = i; break; }
    }

    // Mathematical alignment for top pointer (-PI/2)
    const arc = (2 * Math.PI) / slots.length;
    const finalOffset = (2 * Math.PI) - ((arc * selectedIndex + arc / 2) % (2 * Math.PI));
    const jitter = (Math.random() - 0.5) * (arc * 0.45); // slight natural variance inside slice
    const fullSpins = 6 + Math.floor(Math.random() * 2);
    const startAngle = this.wheelCurrentAngle || 0;
    const totalTargetAngle = (fullSpins * 2 * Math.PI) + finalOffset + jitter;

    const duration = 3800; // ms
    const startTime = performance.now();
    this.wheelLastTickSlot = -1;
    this.wheelLastTickTime = 0;

    Sound.playSfx && Sound.playSfx("click");

    const animateWheel = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);

      // Smooth Quintic ease-out
      const ease = 1 - Math.pow(1 - progress, 4.2);

      // Silky elastic overshoot bounce in the final 12%
      let currentAngle = startAngle + ease * (totalTargetAngle - startAngle);
      if (progress > 0.88) {
        const settleT = (progress - 0.88) / 0.12;
        const bounce = Math.sin(settleT * Math.PI * 2) * Math.exp(-settleT * 4) * 0.035;
        currentAngle += bounce * (totalTargetAngle - startAngle) * 0.01;
      }

      this.wheelCurrentAngle = currentAngle;

      // Peg Ticker Physics Collision Detection
      const normalizedAngle = ((currentAngle + arc / 2) % (2 * Math.PI) + (2 * Math.PI)) % (2 * Math.PI);
      const currentPegIndex = Math.floor(normalizedAngle / arc);

      if (currentPegIndex !== this.wheelLastTickSlot) {
        this.wheelLastTickSlot = currentPegIndex;
        // Pointer deflects backwards
        this.wheelPointerAngle = -0.32;
        // Audio tick throttled for realistic feel
        if (now - this.wheelLastTickTime > 45) {
          Sound.playSfx && Sound.playSfx("click");
          this.wheelLastTickTime = now;
        }
      }

      // Spring vibration update for ticker
      this.wheelPointerVelocity = (this.wheelPointerVelocity || 0) + (0 - (this.wheelPointerAngle || 0)) * 0.32 - (this.wheelPointerVelocity || 0) * 0.22;
      this.wheelPointerAngle = (this.wheelPointerAngle || 0) + this.wheelPointerVelocity;

      this.drawFortuneWheelCanvas(currentAngle, -1);

      if (progress < 1) {
        requestAnimationFrame(animateWheel);
      } else {
        // --- SPIN COMPLETE ---
        this.wheelIsSpinning = false;
        this.wheelPointerAngle = 0;
        this.wheelPointerVelocity = 0;

        // Claim reward in character data
        const reward = Character.claimWheelSpin && Character.claimWheelSpin(selectedIndex, isPaid);

        // Spawn celebration confetti & star burst
        this.wheelParticles = [];
        const colors = ["#facc15", "#f43f5e", "#22c55e", "#38bdf8", "#a855f7", "#fb923c", "#ffffff"];
        for (let p = 0; p < 45; p++) {
          const pAngle = Math.random() * Math.PI * 2;
          const speed = 2.5 + Math.random() * 5.5;
          this.wheelParticles.push({
            x: 160,
            y: 162,
            vx: Math.cos(pAngle) * speed,
            vy: Math.sin(pAngle) * speed - 2.5,
            rot: Math.random() * Math.PI * 2,
            vrot: (Math.random() - 0.5) * 0.3,
            size: 4 + Math.random() * 6,
            color: colors[Math.floor(Math.random() * colors.length)],
            alpha: 1.0,
            isStar: Math.random() < 0.4
          });
        }

        // Keep animating particles until they settle
        const animateParticles = () => {
          this.drawFortuneWheelCanvas(this.wheelCurrentAngle, selectedIndex);
          if (this.wheelParticles && this.wheelParticles.length > 0) {
            requestAnimationFrame(animateParticles);
          }
        };
        requestAnimationFrame(animateParticles);

        // Play authentic celebratory fanfare
        if (Sound.playSfx) {
          if (reward && (reward.type === "gems" || reward.type === "skill" || reward.value >= 500)) {
            Sound.playSfx("bigWin");
          } else {
            Sound.playSfx("fortune");
          }
        }

        // Show celebration result banner
        if (resEl && reward) {
          const typeDesc = reward.type === "gold" ? `+${reward.value} 🪙` :
                           reward.type === "gems" ? `+${reward.value} 💎` :
                           reward.type === "exp" ? `+${reward.value} EXP 🌟` :
                           reward.type === "atk_boost" ? `ATK +${Math.round(reward.value * 100)}%! ⚔️` :
                           reward.type === "heal_pct" ? `Healed HP +${Math.round(reward.value * 100)}%! 💚` :
                           "Special Reward! ⭐";
          resEl.innerHTML = `🎉 <strong>${reward.label}</strong> (${typeDesc})`;
          resEl.style.display = "block";
        }

        if (btn) {
          btn.disabled = false;
          btn.classList.remove("spinning");
        }
        this.renderHeader();
        this.updateWheelStatus();
      }
    };

    requestAnimationFrame(animateWheel);
  }

  updateWheelStatus() {
    const canFree = Character.canSpinWheel && Character.canSpinWheel();
    const canPaid = Character.canAffordGoldSpin && Character.canAffordGoldSpin();
    const btn = document.getElementById("btn-spin-wheel");
    const btnText = document.getElementById("btn-spin-wheel-text");
    const cdEl = document.getElementById("fortune-wheel-cd");

    if (this.wheelIsSpinning) return;

    if (canFree) {
      if (btn) btn.disabled = false;
      if (btnText) btnText.textContent = "Spin! (Free Daily)";
      if (cdEl) {
        cdEl.textContent = "✨ 1x Free Daily Spin Ready!";
        cdEl.style.color = "#4ade80";
      }
    } else if (canPaid) {
      if (btn) btn.disabled = false;
      if (btnText) btnText.textContent = "Spin (100 🪙)";
      if (cdEl) {
        cdEl.textContent = "Daily free spin used. Extra spin: 100 Gold 🪙";
        cdEl.style.color = "#facc15";
      }
    } else {
      if (btn) btn.disabled = true;
      if (btnText) btnText.textContent = "Need 100 🪙";
      if (cdEl) {
        cdEl.textContent = "Next free spin tomorrow ⏰ (Need 100 🪙 for extra spin)";
        cdEl.style.color = "#a8a29e";
      }
    }
  }

  // ===== BATTLE PASS CONTROLLER =====
  openBattlePass() {
    const modal = document.getElementById("battle-pass-modal");
    if (!modal) return;
    this.renderBattlePassPanel();
    modal.style.display = "flex";
  }

  renderBattlePassPanel() {
    const bp = Character.battlePass || { level: 0, exp: 0, isPremium: false, claimedFree: [], claimedPremium: [] };
    const lvEl = document.getElementById("bp-level");
    const expEl = document.getElementById("bp-exp");
    const fillEl = document.getElementById("bp-progress-fill");
    const tracksEl = document.getElementById("battle-pass-tracks");

    if (lvEl) lvEl.textContent = bp.level || 0;
    if (expEl) expEl.textContent = bp.exp || 0;
    if (fillEl) fillEl.style.width = `${Math.min(100, bp.exp || 0)}%`;

    const season = GameData.battlePassTracks;
    if (!tracksEl || !season) return;

    let html = '<div style="font-size:0.78rem;color:#86efac;margin-bottom:8px;font-weight:800;">🆓 Free Pass Track</div>';
    season.free.forEach(tier => {
      const isUnlocked = (bp.level || 0) >= tier.level;
      const isClaimed = (bp.claimedFree || []).includes(tier.level);
      const rewardText = [tier.reward.gold ? `${tier.reward.gold}🪙` : "", tier.reward.gems ? `${tier.reward.gems}💎` : ""].filter(Boolean).join(" + ");
      html += `<div class="bp-track-row${isUnlocked ? " unlocked" : ""}">
        <span class="bp-track-lv">Lv.${tier.level}</span>
        <span class="bp-track-icon">${tier.icon}</span>
        <span class="bp-track-reward">${rewardText}</span>
        <span class="bp-track-badge ${isClaimed ? "bp-claimed-badge" : "bp-free-badge"}">${isClaimed ? "Claimed" : (isUnlocked ? "Unlocked!" : "Locked")}</span>
      </div>`;
    });

    html += '<div style="font-size:0.78rem;color:#c084fc;margin:14px 0 8px;font-weight:800;">👑 Premium Pass Track</div>';
    season.premium.forEach(tier => {
      const isUnlocked = bp.isPremium && (bp.level || 0) >= tier.level;
      const isClaimed = (bp.claimedPremium || []).includes(tier.level);
      const rewardText = [tier.reward.gold ? `${tier.reward.gold}🪙` : "", tier.reward.gems ? `${tier.reward.gems}💎` : ""].filter(Boolean).join(" + ");
      html += `<div class="bp-track-row premium-track${isUnlocked ? " unlocked" : ""}">
        <span class="bp-track-lv">Lv.${tier.level}</span>
        <span class="bp-track-icon">${tier.icon}</span>
        <span class="bp-track-reward">${rewardText}</span>
        <span class="bp-track-badge ${isClaimed ? "bp-claimed-badge" : (isUnlocked ? "bp-premium-badge" : "bp-claimed-badge")}">${isClaimed ? "Claimed" : (isUnlocked ? "Unlocked!" : (bp.isPremium ? "Locked" : "🔒 Premium"))}</span>
      </div>`;
    });

    tracksEl.innerHTML = html;
  }

  // ===== STATS SCREEN CONTROLLER =====
  openStats() {
    const modal = document.getElementById("stats-modal");
    if (!modal) return;
    this.renderStatsPanel();
    modal.style.display = "flex";
  }

  renderStatsPanel() {
    const grid = document.getElementById("stats-grid");
    if (!grid) return;
    const s = Character.stats || {};
    const cards = [
      { icon: "⚔️", value: s.totalBattlesWon || 0, label: "Battles Won" },
      { icon: "💀", value: s.totalBossesDefeated || 0, label: "Bosses Defeated" },
      { icon: "🏃", value: s.totalRuns || 0, label: "Total Runs" },
      { icon: "📅", value: `${s.maxDayReached || 0} days`, label: "Best Survival" },
      { icon: "🐉", value: s.dragonRoarUsed || 0, label: "Dragon Roars" },
      { icon: "🌑", value: s.blackHoleUsed || 0, label: "Black Holes" },
      { icon: "🪙", value: (s.totalGoldEarned || 0).toLocaleString(), label: "Total Gold" },
      { icon: "🎰", value: s.wheelSpins || 0, label: "Wheel Spins" },
      { icon: "🏆", value: (Character.claimedAchievements || []).length, label: "Achievements" },
      { icon: "🏅", value: `Lv. ${(Character.battlePass && Character.battlePass.level) || 0}`, label: "Battle Pass" }
    ];
    grid.innerHTML = cards.map(c =>
      `<div class="stat-card"><div class="stat-card-icon">${c.icon}</div><div class="stat-card-value">${c.value}</div><div class="stat-card-label">${c.label}</div></div>`
    ).join("");
  }

  // ===== PET & MOUNT COMPANIONS SANCTUARY =====
  openCompanions() {
    const modal = document.getElementById("companions-modal");
    if (!modal) return;
    this.renderCompanionsModal();
    modal.style.display = "flex";
  }

  renderCompanionsModal() {
    const list = document.getElementById("companions-list");
    if (!list || !GameData.companions) return;

    const activeId = Character.activeCompanion || "duck";
    const unlocked = Character.unlockedCompanions || ["duck"];
    const levels = Character.companionLevels || { duck: 1, turtle: 1, croc: 1, dragon: 1 };

    list.innerHTML = GameData.companions.map(comp => {
      const isUnlocked = unlocked.includes(comp.id);
      const isActive = activeId === comp.id;
      const curLv = levels[comp.id] || 1;
      const upgradeCost = Character.getCompanionUpgradeCost(comp.id);
      const canAffordUpgrade = (Character.gold || 0) >= upgradeCost;

      let actionBtnHtml = "";
      if (isActive) {
        actionBtnHtml = `<button class="btn-comp-action btn-comp-active">✅ Sedang Aktif</button>`;
      } else if (isUnlocked) {
        actionBtnHtml = `<button class="btn-comp-action btn-comp-equip" onclick="window.Game && window.Game.ui.equipCompanion('${comp.id}')">Pilih Pet</button>`;
      } else {
        const costText = comp.costGems > 0 ? `${comp.costGems} 💎` : `${comp.costGold} 🪙`;
        const canAffordUnlock = comp.costGems > 0 ? (Character.gems || 0) >= comp.costGems : (Character.gold || 0) >= comp.costGold;
        actionBtnHtml = `<button class="btn-comp-action btn-comp-unlock" ${canAffordUnlock ? "" : "disabled"} onclick="window.Game && window.Game.ui.unlockCompanion('${comp.id}')">Buka (${costText})</button>`;
      }

      const upgradeBtnHtml = isUnlocked && curLv < 30 ? `
        <button class="btn-comp-action btn-comp-upgrade" ${canAffordUpgrade ? "" : "disabled"} onclick="window.Game && window.Game.ui.upgradeCompanion('${comp.id}')">
          Level Up (${upgradeCost} 🪙)
        </button>
      ` : "";

      return `
        <div class="comp-card ${isActive ? 'active-comp' : ''}">
          <div class="comp-card-top">
            <div class="comp-avatar-wrap ${comp.rarity}">${comp.icon}</div>
            <div class="comp-info-col">
              <div class="comp-name-row">
                <span class="comp-name">${comp.name}</span>
                <span class="comp-level-badge">Lv. ${curLv}</span>
              </div>
              <div class="comp-tagline">${comp.tagline}</div>
              <div class="comp-desc">${comp.desc}</div>
            </div>
          </div>

          <div class="comp-perks-box">
            <div class="comp-perk-row">
              <span class="comp-perk-label">✨ Efek Pasif:</span>
              <span class="comp-perk-val">${comp.passiveDesc}</span>
            </div>
            <div class="comp-perk-row">
              <span class="comp-perk-label">⚔️ Skill Tempur:</span>
              <span class="comp-perk-val"><strong>${comp.skillName}</strong> — ${comp.skillDesc}</span>
            </div>
          </div>

          <div class="comp-actions-row">
            ${upgradeBtnHtml}
            ${actionBtnHtml}
          </div>
        </div>
      `;
    }).join("");
  }

  equipCompanion(id) {
    if (Character.equipCompanion(id)) {
      Sound.playSfx && Sound.playSfx("click");
      this.renderCompanionsModal();
      this.renderEquipmentScreen();
      this.renderHeader();
      this.showToast && this.showToast("Pet berhasil dipasang! 🐾", "success");
    }
  }

  unlockCompanion(id) {
    if (Character.unlockCompanion(id)) {
      Sound.playSfx && Sound.playSfx("chest");
      this.renderCompanionsModal();
      this.renderEquipmentScreen();
      this.renderHeader();
      this.showToast && this.showToast("Pet baru berhasil dibuka! 🎉", "success");
    } else {
      this.showToast && this.showToast("Koin atau Gems tidak mencukupi!", "error");
    }
  }

  upgradeCompanion(id) {
    if (Character.upgradeCompanion(id)) {
      Sound.playSfx && Sound.playSfx("magicBurst");
      this.renderCompanionsModal();
      this.renderEquipmentScreen();
      this.renderHeader();
      this.showToast && this.showToast("Pet berhasil naik level! ⭐", "success");
    } else {
      this.showToast && this.showToast("Gold tidak cukup untuk upgrade!", "error");
    }
  }
}

// Global diagnostic & gameplay trigger for Falling Treasure Chest
window.triggerFallingChest = (opts = {}) => {
  if (window.Game && window.Game.ui) {
    window.Game.ui.triggerFallingChest(opts);
  }
};

// Global diagnostic & test trigger for Dragon Roar cinematic skill animation
window.testDragonRoar = () => {
  if (window.Game && window.Game.renderer) {
    const r = window.Game.renderer;
    const px = r.playerState ? r.playerState.x : 90;
    const py = r.groundY - 50;
    
    // If not currently in battle, spawn a dummy target so the breath and explosion have an impact location
    let hadEnemy = !!r.enemyState;
    if (!r.enemyState) {
      r.enemyState = {
        x: px + 195,
        currentHp: 20000,
        maxHp: 20000,
        shake: 0,
        knockback: 0,
        flashWhite: 0
      };
    }

    const ex = r.enemyState.x;
    const ey = r.groundY - 50;

    r.launchDragonBreath(px, py, ex, ey, () => {
      console.log("🔥 Dragon Roar Hit Triggered!");
      if (r.addFloatingText) {
        r.addFloatingText("🔥 CRIT 14,820", ex, r.groundY - 60, "crit");
      }
    }, () => {
      console.log("🐉 Dragon Roar Animation Completed!");
      // If was dummy created for test in menu, clean up after animation ends
      if (!hadEnemy && !r.inBattle) {
        setTimeout(() => {
          if (!r.inBattle) r.enemyState = null;
        }, 1200);
      }
    });
  }
};

// Global diagnostic & test trigger for Authentic Defeat Screen
window.testDefeatScreen = (days = 39, longest = 39, gold = 1043, energy = 2) => {
  if (window.Game && window.Game.ui) {
    window.Game.ui.showDefeatScreen({
      chapterId: 1,
      day: days,
      longestDay: longest,
      goldEarned: gold,
      energyEarned: energy
    });
  }
};


