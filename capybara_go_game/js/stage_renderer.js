// Capybara Go! - Stage & Combat Visual Canvas Renderer (Seamless Parallax & 2.5D Depth Engine)
class StageRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");

    this.width = canvas.width;
    this.height = canvas.height;

    // Ground baseline for all actors (proportional to canvas height - placed comfortably in middle of sandy road)
    this.groundY = Math.round(this.height * 0.72);
    this.horizonY = Math.round(this.height * 0.40); // 3D perspective horizon line (dividing grass and road)

    this.bgImage = null;
    this.bgScrollX = 0;
    this.scrollSpeed = 0; // 0 when idle/fighting, >0 when walking/traveling

    // Preloaded Player Animation Sprites
    this.playerAnimations = {
      idle: [],
      walk: [],
      run: [],
      attack: [],
      skill: [],
      hurt: [],
      die: []
    };

    // Preload FX Sprites
    this.fxImages = {
      slash: this.loadImg("assets/ui/capybara_cartoon_kit/effects/fx_magic_slash.png"),
      hitSpark: this.loadImg("assets/ui/capybara_cartoon_kit/effects/fx_hit_spark.png"),
      critBurst: this.loadImg("assets/ui/capybara_cartoon_kit/effects/fx_critical_burst.png"),
      healRing: this.loadImg("assets/ui/capybara_cartoon_kit/effects/fx_heal_ring.png"),
      shieldPulse: this.loadImg("assets/ui/capybara_cartoon_kit/effects/fx_shield_pulse.png"),
      iceShatter: this.loadImg("assets/ui/capybara_cartoon_kit/effects/fx_ice_shatter.png"),
      poisonPulse: this.loadImg("assets/ui/capybara_cartoon_kit/effects/fx_poison_pulse.png")
    };

    this.enemyImages = {};

    this.preloadPlayerFrames();

    // Player Actor State (Anchored at Feet - Zoomed Out Camera / Distant Perspective)
    this.homePlayerX = 140;
    this.playerState = {
      currentAnim: "idle",
      frameIndex: 0,
      frameTimer: 0,
      fps: 10,
      x: this.homePlayerX,
      y: this.groundY,
      offsetY: 0,
      scale: 1.35, // Zoomed out camera perspective
      facing: 1, // 1 for right
      shake: 0,
      flashWhite: 0,
      knockback: 0,
      waddleAngle: 0,
      isMoving: false,
      loop: true
    };

    // Enemy Actor State
    this.enemyState = null;

    // Active Projectiles (Flying Energy Slash Waves)
    this.projectiles = [];
    this.projectileSparks = [];

    // Active Particles, Visual Effects, & Floating Texts
    this.visualEffects = [];
    this.floatingTexts = [];
    this.ambientParticles = [];
    this.runDustParticles = [];
    this.impactDustSpikes = [];
    this.initAmbientParticles();

    // Authentic Golden Treasure Chest State (Falling from Sky animation matching Video Project 2)
    this.chestImageClosed = this.loadImg("assets/ui/chest_golden_closed.svg");
    this.chestState = null;
    this.chestDustPuffs = [];

    // Active Combat Skill Special Animations (Meteor, Dragon Breath, Lightning, Black Hole, etc.)
    this.skillCombatEffects = [];

    // Global Cinematic Combat Impact (Screen Rumble, Anime Slash Speed Lines, Ground Fissures)
    this.screenShake = 0;
    this.screenShakeOffset = { x: 0, y: 0 };
    this.slashSpeedLines = [];
    this.groundSlashFissures = [];

    // Current Background Track
    this.currentBgPath = "assets/backgrounds/panoramas/village_road_bg.png";

    // 3D Depth Elements
    this.init3DDepthEngine();

    this.lastTime = performance.now();
    this.startRenderLoop();
  }

  loadImg(src) {
    const img = new Image();
    img.src = src;
    return img;
  }

  preloadPlayerFrames() {
    const counts = {
      idle: 9,
      walk: 9,
      run: 9,
      attack: 12,
      sword_slash: 12,
      heal: 12,
      black_hole: 12,
      dragon_roar: 12,
      skill: 9,
      hurt: 9,
      die: 7
    };

    for (const [anim, count] of Object.entries(counts)) {
      this.playerAnimations[anim] = [];
      for (let i = 1; i <= count; i++) {
        const frameNum = String(i).padStart(2, "0");
        const path = anim === "sword_slash"
          ? `assets/skills/animations/sword_slash/frame_${frameNum}.png`
          : anim === "heal"
          ? `assets/skills/animations/heal/frame_${frameNum}.png`
          : anim === "black_hole"
          ? `assets/skills/animations/black_hole/frame_${frameNum}.png`
          : anim === "dragon_roar"
          ? `assets/skills/animations/dragon_roar/frame_${frameNum}.png`
          : `assets/characters/player/${anim}/frame_${frameNum}.png`;
        const img = new Image();
        img.src = path;
        this.playerAnimations[anim].push(img);
      }
    }

    // Preload Authentic Dragon Roar VFX Assets
    this.dragonRoarAssets = {
      frame07Dragon: new Image(),
      frame08Blast: new Image(),
      frame09Crater: new Image()
    };
    this.dragonRoarAssets.frame07Dragon.src = "assets/skills/animations/dragon_roar/frame_07.png";
    this.dragonRoarAssets.frame08Blast.src = "assets/skills/animations/dragon_roar/frame_08.png";
    this.dragonRoarAssets.frame09Crater.src = "assets/skills/animations/dragon_roar/frame_09.png";

    // Preload Authentic HD Black Hole Assets (Feathered 60 FPS sprites)
    this.blackHoleHdImages = {
      eventHorizon: new Image(),
      vortexSpiral: new Image(),
      cometFlight: new Image(),
      singularity: new Image(),
      rift: new Image(),
      supernova: new Image(),
      crush: new Image()
    };
    this.blackHoleHdImages.eventHorizon.src = "assets/skills/animations/black_hole/event_horizon_v2_hd.png";
    this.blackHoleHdImages.vortexSpiral.src = "assets/skills/animations/black_hole/vortex_spiral_hd.png";
    this.blackHoleHdImages.cometFlight.src = "assets/skills/animations/black_hole/comet_flight_hd.png";
    this.blackHoleHdImages.singularity.src = "assets/skills/animations/black_hole/singularity_hd.png";
    this.blackHoleHdImages.rift.src = "assets/skills/animations/black_hole/rift_hd.png";
    this.blackHoleHdImages.supernova.src = "assets/skills/animations/black_hole/supernova_hd.png";
    this.blackHoleHdImages.crush.src = "assets/skills/animations/black_hole/cosmic_crush_v2_hd.png";

    // Preload Authentic HD Capybara Sprites from User's Artwork (Slim, Crystal Sword & Arrow Quiver)
    this.blackHoleCapySprites = {
      f01_idle: new Image(),
      f02_awaken: new Image(),
      f03_charge: new Image(),
      f04_slash: new Image(),
      f06_cast: new Image(),
      f07_push: new Image(),
      f08_recover: new Image(),
      f10_absorb: new Image(),
      f11_relief: new Image(),
      f12_idle2: new Image()
    };
    this.blackHoleCapySprites.f01_idle.src = "assets/skills/animations/black_hole/capy_sprites/f01_idle.png";
    this.blackHoleCapySprites.f02_awaken.src = "assets/skills/animations/black_hole/capy_sprites/f02_awaken.png";
    this.blackHoleCapySprites.f03_charge.src = "assets/skills/animations/black_hole/capy_sprites/f03_charge.png";
    this.blackHoleCapySprites.f04_slash.src = "assets/skills/animations/black_hole/capy_sprites/f04_slash.png";
    this.blackHoleCapySprites.f06_cast.src = "assets/skills/animations/black_hole/capy_sprites/f06_cast.png";
    this.blackHoleCapySprites.f07_push.src = "assets/skills/animations/black_hole/capy_sprites/f07_push.png";
    this.blackHoleCapySprites.f08_recover.src = "assets/skills/animations/black_hole/capy_sprites/f08_recover.png";
    this.blackHoleCapySprites.f10_absorb.src = "assets/skills/animations/black_hole/capy_sprites/f10_absorb.png";
    this.blackHoleCapySprites.f11_relief.src = "assets/skills/animations/black_hole/capy_sprites/f11_relief.png";
    this.blackHoleCapySprites.f12_idle2.src = "assets/skills/animations/black_hole/capy_sprites/f12_idle2.png";
  }

  setBackground(bgPath) {
    if (!bgPath) return;
    this.currentBgPath = bgPath;
    const img = new Image();
    img.onload = () => {
      this.bgImage = this.createSeamlessTexture(img);
    };
    img.src = bgPath;
  }

  isFirstMap() {
    if (this.currentBgPath) {
      if (this.currentBgPath.includes("village_road_bg") || this.currentBgPath.includes("chapter_1")) {
        return true;
      }
    }
    if (typeof Character !== "undefined") {
      if (Character.activeRun && Character.activeRun.chapterId) {
        return Character.activeRun.chapterId === 1;
      }
      if (this.isMenuMode && Character.selectedChapter) {
        return Character.selectedChapter === 1;
      }
    }
    return !this.currentBgPath || this.currentBgPath.includes("village_road_bg");
  }

  createSeamlessTexture(img) {
    try {
      const blendW = Math.max(40, Math.round(img.width * 0.08));
      const outW = img.width - blendW;
      const outH = img.height;

      const canvas = document.createElement("canvas");
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext("2d");

      // 1. Draw base image
      ctx.drawImage(img, 0, 0);

      // 2. Extract right edge slice with horizontal linear alpha gradient mask
      const sliceCanvas = document.createElement("canvas");
      sliceCanvas.width = blendW;
      sliceCanvas.height = outH;
      const sCtx = sliceCanvas.getContext("2d");

      sCtx.drawImage(img, img.width - blendW, 0, blendW, outH, 0, 0, blendW, outH);

      sCtx.globalCompositeOperation = "destination-in";
      const grad = sCtx.createLinearGradient(0, 0, blendW, 0);
      grad.addColorStop(0, "rgba(0, 0, 0, 1)");
      grad.addColorStop(1, "rgba(0, 0, 0, 0)");
      sCtx.fillStyle = grad;
      sCtx.fillRect(0, 0, blendW, outH);

      // 3. Blend right-edge slice onto left edge
      ctx.globalCompositeOperation = "source-over";
      ctx.drawImage(sliceCanvas, 0, 0);

      return canvas;
    } catch (e) {
      console.warn("Could not create seamless blend texture:", e);
      return img;
    }
  }

  initAmbientParticles() {
    this.ambientParticles = [];
    for (let i = 0; i < 22; i++) {
      this.ambientParticles.push({
        x: Math.random() * this.width,
        y: Math.random() * (this.horizonY + 20),
        size: Math.random() * 2.5 + 1.2,
        speedX: Math.random() * 0.7 - 0.35,
        speedY: Math.random() * 0.4 + 0.15,
        alpha: Math.random() * 0.5 + 0.25,
        color: ["#ffd166", "#a0e8af", "#ffffff", "#ff9bb2"][Math.floor(Math.random() * 4)]
      });
    }
  }

  init3DDepthEngine() {
    // Near-Camera Foreground 3D Foliage & Petals (faster parallax layer for 3D stereoscopic depth)

    // 2. Near-Camera Foreground 3D Foliage & Petals (faster parallax layer)
    this.foregroundParticles = [];
    for (let i = 0; i < 16; i++) {
      this.foregroundParticles.push({
        x: Math.random() * (this.width + 100),
        y: Math.random() * this.height,
        size: Math.random() * 7 + 5, // large near-camera scale
        speedX: -(Math.random() * 1.4 + 0.8), // moves faster than ground for 3D depth
        speedY: Math.random() * 0.6 + 0.2,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.04,
        alpha: Math.random() * 0.45 + 0.35,
        color: ["#ffd166", "#a7f3d0", "#fbcfe8", "#fed7aa", "#6ee7b7"][Math.floor(Math.random() * 5)]
      });
    }
  }

  setPlayerAnim(animName, loop = true) {
    if (!this.playerAnimations[animName]) return;
    if (this.playerState.currentAnim === animName && this.playerState.loop === loop) return;
    
    this.playerState.currentAnim = animName;
    this.playerState.frameIndex = 0;
    this.playerState.frameTimer = 0;
    this.playerState.loop = loop;

    if (animName === "attack" || animName === "sword_slash") this.playerState.fps = 18;
    else if (animName === "heal" || animName === "black_hole") this.playerState.fps = 14;
    else if (animName === "skill") this.playerState.fps = 15;
    else if (animName === "walk") this.playerState.fps = 12;
    else if (animName === "run") this.playerState.fps = 14;
    else if (animName === "hurt") this.playerState.fps = 14;
    else if (animName === "die") this.playerState.fps = 9;
    else this.playerState.fps = 10;
  }

  setMenuMode(isMenu) {
    this.isMenuMode = !!isMenu;
    if (this.isMenuMode) {
      this.clearEnemy();
      this.removeTreasureChest();
      this.playerState.x = Math.round(this.width * 0.52);
      this.playerState.offsetY = 0;
      this.setPlayerAnim("idle", true);
    } else {
      this.playerState.x = this.homePlayerX;
      this.playerState.offsetY = 0;
      this.setPlayerAnim("idle", true);
    }
  }

  spawnEnemy(enemyData, isBoss = false) {
    let img = this.enemyImages[enemyData.sprite];
    if (!img) {
      img = new Image();
      img.src = enemyData.sprite;
      this.enemyImages[enemyData.sprite] = img;
    }

    const isFlyer = (enemyData.id === "bee" || enemyData.id === "blue_flyer" || enemyData.sprite.includes("bee") || enemyData.sprite.includes("blue_flyer"));
    const homeTargetX = this.width - (isBoss ? 125 : 105);

    this.enemyState = {
      name: enemyData.name,
      spriteImg: img,
      isBoss: isBoss,
      isFlyer: isFlyer,
      maxHp: enemyData.hp,
      currentHp: enemyData.hp,
      x: homeTargetX, // Enemy spawns and waits directly at station (never approaches player)
      targetX: homeTargetX,
      homeX: homeTargetX,
      offsetY: 0,
      scale: (enemyData.scale || 1.0) * (isBoss ? 1.05 : 0.85), // Zoomed out enemy scale
      bounceTimer: 0,
      flashWhite: 0,
      shake: 0,
      knockback: 0
    };
  }

  // --- Player Encounter Approach (Capybara Runs Forward to Confront the Waiting Monster) ---

  performPlayerEncounterApproach(onReady, speedMult = 1.0) {
    const p = this.playerState;
    const startX = Math.max(10, this.homePlayerX - 130);
    const targetX = this.homePlayerX;
    const duration = 320 / speedMult;

    p.x = startX;
    p.facing = 1;
    this.setPlayerAnim("run", true);

    const startTime = performance.now();

    const approachStep = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      // Smooth deceleration curve (cubic ease-out)
      const ease = 1 - Math.pow(1 - progress, 3);

      p.x = startX + (targetX - startX) * ease;
      p.offsetY = -Math.abs(Math.sin(progress * Math.PI * 4)) * 3;

      // Kicking up dust puffs as Capybara sprints towards the enemy
      if (Math.random() < 0.6) {
        this.addRunDustPuff(p.x - 16, this.groundY - 2, -(Math.random() * 1.5 + 0.8));
      }

      if (progress < 1) {
        requestAnimationFrame(approachStep);
      } else {
        p.x = targetX;
        p.offsetY = 0;
        this.setPlayerAnim("idle", true);
        // Cartoon skid impact on arrival confronting the enemy
        this.addImpactDustSpikes(p.x - 6, this.groundY);

        setTimeout(() => {
          if (onReady) onReady();
        }, 120 / speedMult);
      }
    };

    requestAnimationFrame(approachStep);
  }

  clearEnemy() {
    this.enemyState = null;
    this.skillCombatEffects = [];
    if (this.playerState) {
      this.playerState.swordAction = null;
      this.playerState.skillExpression = null;
    }
  }

  // --- Cartoon Dust FX (Sprinting & Skid Impact Trails matching reference image) ---

  addRunDustPuff(x, y, vx = -1.2) {
    this.runDustParticles.push({
      x: x,
      y: y + (Math.random() * 4 - 2),
      vx: vx,
      vy: -(Math.random() * 0.8 + 0.3),
      size: Math.random() * 5 + 4,
      alpha: 0.85,
      life: 0,
      maxLife: 18
    });
  }

  addImpactDustSpikes(x, y) {
    // Sharp stylized cartoon skid spikes (exact match to user screenshot)
    this.impactDustSpikes.push({
      x: x,
      y: y,
      scale: 1.0,
      alpha: 1.0,
      life: 0,
      maxLife: 16
    });

    // Also puff out 5 spherical dust motes
    for (let i = 0; i < 5; i++) {
      this.runDustParticles.push({
        x: x - i * 4,
        y: y - 2,
        vx: -(Math.random() * 2.2 + 0.8),
        vy: -(Math.random() * 1.2 + 0.2),
        size: Math.random() * 7 + 5,
        alpha: 0.9,
        life: 0,
        maxLife: 20
      });
    }
  }

  // --- Ranged Flying Slash Projectiles System ---

  launchSlashWave(startX, startY, targetX, targetY, isUlt = false, onHit = null, speedMult = 1.0) {
    const duration = (isUlt ? 260 : 220) / speedMult;
    const p = {
      startX,
      startY,
      targetX,
      targetY,
      x: startX,
      y: startY,
      isUlt,
      scale: isUlt ? 2.4 : 1.5,
      // Rotated by 90 deg (Math.PI / 2) so crescent blade stands upright and faces forward
      rotation: Math.atan2(targetY - startY, targetX - startX) + (Math.PI / 2),
      startTime: performance.now(),
      duration,
      onHit,
      alive: true
    };
    this.projectiles.push(p);
  }

  // --- Global Cinematic Combat FX (Screen Rumble, Anime Slash Speed Lines, Ground Fissure Scars) ---

  triggerScreenShake(intensity = 1.0) {
    this.screenShake = Math.max(this.screenShake, intensity);
  }

  triggerSlashSpeedLines(targetX, targetY, color = "#38bdf8") {
    this.slashSpeedLines = [];
    const count = 12;
    for (let i = 0; i < count; i++) {
      const angle = -0.38 + (Math.random() * 0.76 - 0.38);
      const length = 140 + Math.random() * 160;
      const dist = 30 + Math.random() * 80;
      const side = (i % 2 === 0) ? 1 : -1;
      const cx = targetX + Math.cos(angle) * dist * side + (Math.random() * 40 - 20);
      const cy = targetY + Math.sin(angle) * dist * side + (Math.random() * 40 - 20);
      this.slashSpeedLines.push({
        x1: cx - Math.cos(angle) * (length / 2),
        y1: cy - Math.sin(angle) * (length / 2),
        x2: cx + Math.cos(angle) * (length / 2),
        y2: cy + Math.sin(angle) * (length / 2),
        lineWidth: Math.random() * 3.5 + 1.5,
        alpha: 1.0,
        color: color
      });
    }
  }

  addGroundSlashFissure(x, y, color = "#38bdf8") {
    this.groundSlashFissures.push({
      x, y,
      maxLife: 0.65,
      life: 0.65,
      alpha: 1.0,
      width: 95,
      color: color
    });
  }

  renderSlashSpeedLines(ctx) {
    if (!this.slashSpeedLines || this.slashSpeedLines.length === 0) return;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const sl of this.slashSpeedLines) {
      ctx.globalAlpha = Math.max(0, sl.alpha);
      ctx.strokeStyle = sl.color;
      ctx.shadowColor = sl.color;
      ctx.shadowBlur = 14;
      ctx.lineWidth = sl.lineWidth;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(sl.x1, sl.y1);
      ctx.lineTo(sl.x2, sl.y2);
      ctx.stroke();

      // Blazing white hot core
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = Math.max(1, sl.lineWidth * 0.4);
      ctx.beginPath();
      ctx.moveTo(sl.x1, sl.y1);
      ctx.lineTo(sl.x2, sl.y2);
      ctx.stroke();
    }
    ctx.restore();
  }

  renderGroundSlashFissures(ctx) {
    if (!this.groundSlashFissures || this.groundSlashFissures.length === 0) return;
    ctx.save();
    for (const gf of this.groundSlashFissures) {
      ctx.save();
      ctx.translate(gf.x, gf.y);
      ctx.scale(1, 0.34); // 3D ground projection
      ctx.globalAlpha = gf.alpha;
      ctx.shadowColor = gf.color;
      ctx.shadowBlur = 18;

      // Outer crack glowing scar
      ctx.strokeStyle = gf.color;
      ctx.lineWidth = 5.5 * gf.alpha;
      ctx.beginPath();
      ctx.moveTo(-gf.width / 2, 0);
      ctx.lineTo(-gf.width * 0.22, -6);
      ctx.lineTo(gf.width * 0.12, 5);
      ctx.lineTo(gf.width / 2, 0);
      ctx.stroke();

      // Sharp white core
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2.0 * gf.alpha;
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }

  // --- Player Authentic 12-Frame Sword Slash Attack Action (3-Phase Sequence) ---

  performPlayerAttack(onHit, onComplete, speedMult = 1.0) {
    const p = this.playerState;
    const e = this.enemyState;
    if (!e) {
      this.setPlayerAnim("attack", false);
      if (onHit) onHit();
      if (onComplete) onComplete();
      return;
    }

    const startX = this.homePlayerX;
    // Capybara charges all the way to enemy's front (melee contact with sword reach)
    const targetContactX = e.x - 42;
    const chargeDuration = 180 / speedMult;
    const windupDuration = 150 / speedMult;
    const slashImpactDuration = 180 / speedMult;
    const returnDuration = 220 / speedMult;

    // Phase 1: Sprint forward towards enemy with "run" animation
    this.setPlayerAnim("run", true);
    p.facing = 1;
    const chargeStartTime = performance.now();

    const forwardRunStep = (now) => {
      const elapsed = now - chargeStartTime;
      const progress = Math.min(1, elapsed / chargeDuration);
      // Accelerating dash curve (cubic ease-in-out)
      const ease = progress < 0.5 ? 4 * progress * progress * progress : 1 - Math.pow(-2 * progress + 2, 3) / 2;
      
      p.x = startX + (targetContactX - startX) * ease;
      p.offsetY = -Math.abs(Math.sin(progress * Math.PI * 3)) * 4;

      // Spawn dust puff trails behind paws as Capybara sprints
      if (Math.random() < 0.6) {
        this.addRunDustPuff(p.x - 18, this.groundY - 2, -(Math.random() * 1.5 + 1.0));
      }

      if (progress < 1) {
        requestAnimationFrame(forwardRunStep);
      } else {
        // Reached enemy! Trigger 12-Frame Sword Slash animation
        p.x = targetContactX;
        p.offsetY = 0;
        this.setPlayerAnim("attack", false);

        // Phase 1 (Frames 1-3): Wind up, ready stance, and energy gathering
        setTimeout(() => {
          // Phase 2 (Frames 4-8): Peak Crescent Wave Slash Strike!
          Sound.playSfx("slash");
          Sound.playSfx("attackHeavy");

          // Screen rumble & cinematic impact
          this.triggerScreenShake(0.85);
          this.triggerSlashSpeedLines(e.x, this.groundY - 30, "#38bdf8");
          this.addGroundSlashFissure(e.x, this.groundY, "#38bdf8");

          // Forward flying crescent energy shockwave bursting through enemy
          this.launchSlashWave(p.x + 15, this.groundY - 35, e.x + 40, this.groundY - 35, false, null, speedMult * 1.35);

          // Impact sparks & burst ring
          this.addVisualEffect("critBurst", e.x, this.groundY - 35, 1.6);
          this.addMagicImpactSparks(e.x, this.groundY - 35, ["#38bdf8", "#0ea5e9", "#7dd3fc", "#ffffff"]);
          this.addRunDustPuff(p.x - 8, this.groundY - 2, -1.2);

          // Enemy reaction: stagger, flash white, knockback
          if (this.enemyState) {
            this.enemyState.flashWhite = 0.9;
            this.enemyState.shake = 2.4;
            this.enemyState.knockback = 12;
            setTimeout(() => { if (this.enemyState) this.enemyState.knockback = 0; }, 140 / speedMult);
          }

          // Deliver impact hit to enemy (damage calculation, flash, sparks)
          if (onHit) onHit();

          // Hold through peak slash and follow-through, then hop back
          setTimeout(() => {
            // Phase 3 (Frames 9-12): Recovery & leap back to home position
            const returnStartTime = performance.now();
            const startReturnX = p.x;

            const returnStep = (now2) => {
              const relapsed = now2 - returnStartTime;
              const rprogress = Math.min(1, relapsed / returnDuration);
              // Ease-out jump curve
              const rease = 1 - Math.pow(1 - rprogress, 2);
              
              p.x = startReturnX - (startReturnX - startX) * rease;
              // Arc jump height on retreat
              p.offsetY = -Math.sin(rprogress * Math.PI) * 12;

              if (rprogress < 1) {
                requestAnimationFrame(returnStep);
              } else {
                p.x = startX;
                p.offsetY = 0;
                this.setPlayerAnim("idle", true);
                if (onComplete) onComplete();
              }
            };
            requestAnimationFrame(returnStep);
          }, slashImpactDuration);
        }, windupDuration);
      }
    };

    requestAnimationFrame(forwardRunStep);
  }

  // --- Player Authentic 12-Frame Heal Animation (Nature Magic Circle & Protective Dome) ---

  performPlayerHeal(amount, onComplete, speedMult = 1.0) {
    const p = this.playerState;
    this.setPlayerAnim("heal", false);

    const castDuration = 360 / speedMult; // Frames 1-6
    const totalDuration = 880 / speedMult; // Full 12-frame loop
    let healed = false;

    // Trigger Epic Nature Combat Effect (Mandala, Emerald Sunbeam, Spiraling Leaves, Dome, + Symbols)
    this.skillCombatEffects.push({
      startTime: performance.now(),
      duration: totalDuration,
      update: (progress) => {
        if (progress >= (castDuration / totalDuration) && !healed) {
          healed = true;
          Sound.playSfx("heal");
          Sound.playSfx("magicBurst");
          this.triggerScreenShake(0.35);
          this.addVisualEffect("healRing", p.x, this.groundY - 28, 1.8);
          this.addMagicImpactSparks(p.x, this.groundY - 35, ["#4ade80", "#86efac", "#bbf7d0", "#ffffff", "#fef08a"]);
          if (amount) {
            this.addFloatingText(amount, p.x, this.groundY - 60, "heal");
          }
        }
      },
      render: (ctx) => {
        const now = performance.now();
        const elapsed = now - (this.skillCombatEffects.find(f => f.update)?.startTime || now);
        const prog = Math.min(1, elapsed / totalDuration);
        const capyX = p.x;
        const feetY = this.groundY;

        // 1. Volumetric Ascending Emerald Sunbeam / Divine Pillar of Light
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        const beamPulse = Math.sin(prog * Math.PI);
        const beamW = 60 * beamPulse;
        const bGrad = ctx.createLinearGradient(0, 0, 0, feetY);
        bGrad.addColorStop(0, "rgba(134, 239, 172, 0.45)");
        bGrad.addColorStop(0.6, "rgba(74, 222, 128, 0.65)");
        bGrad.addColorStop(1, "rgba(34, 197, 94, 0.0)");
        ctx.fillStyle = bGrad;
        ctx.fillRect(capyX - beamW / 2, 0, beamW, feetY);
        ctx.restore();

        // 2. 3D Concentric Nature Magic Mandala on the ground at feet
        ctx.save();
        ctx.translate(capyX, feetY + 1);
        ctx.scale(1, 0.36); // 3D ground projection
        const mandalaScale = Math.sin(prog * Math.PI);
        ctx.shadowColor = "#4ade80";
        ctx.shadowBlur = 18;

        // Outer Runic Circle
        ctx.save();
        ctx.rotate(now * 0.0018);
        ctx.strokeStyle = `rgba(74, 222, 128, ${0.85 * mandalaScale})`;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(0, 0, 52 * mandalaScale, 0, Math.PI * 2);
        ctx.stroke();

        // 8 Golden Rune Nodes
        ctx.fillStyle = "#fef08a";
        for (let a = 0; a < 8; a++) {
          const ang = (Math.PI / 4) * a;
          ctx.beginPath();
          ctx.arc(Math.cos(ang) * 52 * mandalaScale, Math.sin(ang) * 52 * mandalaScale, 3.5, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();

        // Inner 6-Petal Sacred Lotus
        ctx.save();
        ctx.rotate(-now * 0.0012);
        ctx.fillStyle = `rgba(34, 197, 94, ${0.28 * mandalaScale})`;
        ctx.strokeStyle = `rgba(134, 239, 172, ${0.9 * mandalaScale})`;
        ctx.lineWidth = 1.8;
        for (let pIdx = 0; pIdx < 6; pIdx++) {
          const pAng = (Math.PI / 3) * pIdx;
          ctx.beginPath();
          ctx.ellipse(Math.cos(pAng) * 22 * mandalaScale, Math.sin(pAng) * 22 * mandalaScale, 18 * mandalaScale, 8 * mandalaScale, pAng, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
        ctx.restore();
        ctx.restore();

        // 3. Orbiting 3D Emerald Leaves spiraling upwards in a helix
        ctx.save();
        for (let l = 0; l < 8; l++) {
          const lAngle = (l / 8) * Math.PI * 2 + (elapsed * 0.0045);
          const lHeight = (elapsed * 0.075 + l * 12) % 75;
          const lDist = 26 + Math.sin(lAngle * 2) * 6;
          const lx = capyX + Math.cos(lAngle) * lDist;
          const ly = feetY - lHeight;
          const lAlpha = Math.sin((lHeight / 75) * Math.PI) * 0.9;

          ctx.save();
          ctx.translate(lx, ly);
          ctx.rotate(lAngle + Math.PI / 4);
          ctx.globalAlpha = Math.max(0, lAlpha);
          ctx.fillStyle = "#22c55e";
          ctx.strokeStyle = "#86efac";
          ctx.lineWidth = 1.0;
          ctx.shadowColor = "#4ade80";
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.ellipse(0, 0, 6, 3, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.restore();
        }
        ctx.restore();

        // 4. Ascending Floating Glowing Green-Gold "+" Cross Glyphs
        ctx.save();
        for (let c = 0; c < 5; c++) {
          const cHeight = (elapsed * 0.065 + c * 18) % 80;
          const cx = capyX + Math.sin(c * 1.8 + elapsed * 0.003) * 26;
          const cy = feetY - 10 - cHeight;
          const cAlpha = Math.sin((cHeight / 80) * Math.PI) * 0.95;

          ctx.save();
          ctx.translate(cx, cy);
          ctx.globalAlpha = Math.max(0, cAlpha);
          ctx.shadowColor = "#4ade80";
          ctx.shadowBlur = 10;
          ctx.fillStyle = "#ffffff";
          ctx.strokeStyle = "#22c55e";
          ctx.lineWidth = 2.0;
          const cw = 4.5;
          const ch = 12;
          ctx.fillRect(-cw / 2, -ch / 2, cw, ch);
          ctx.strokeRect(-cw / 2, -ch / 2, cw, ch);
          ctx.fillRect(-ch / 2, -cw / 2, ch, cw);
          ctx.strokeRect(-ch / 2, -cw / 2, ch, cw);
          ctx.restore();
        }
        ctx.restore();

        // 5. Protective Healing Aura Dome: expands at frames 4-7, shrinks & absorbs at frame 8
        ctx.save();
        ctx.translate(capyX, feetY - 24);
        let domeR = 0;
        let domeA = 0;
        if (prog <= 0.55) {
          domeR = (prog / 0.55) * 44;
          domeA = 0.45 * (prog / 0.55);
        } else if (prog <= 0.75) {
          const shrinkP = (prog - 0.55) / 0.20;
          domeR = 44 * (1 - shrinkP);
          domeA = 0.45 + shrinkP * 0.35;
        }
        if (domeR > 1) {
          ctx.globalAlpha = domeA;
          ctx.shadowColor = "#86efac";
          ctx.shadowBlur = 18;
          const domeGrad = ctx.createRadialGradient(0, 0, 4, 0, 0, domeR);
          domeGrad.addColorStop(0, "rgba(254, 240, 138, 0.7)");
          domeGrad.addColorStop(0.5, "rgba(74, 222, 128, 0.45)");
          domeGrad.addColorStop(1, "rgba(34, 197, 94, 0.15)");
          ctx.fillStyle = domeGrad;
          ctx.strokeStyle = "rgba(134, 239, 172, 0.9)";
          ctx.lineWidth = 2.0;
          ctx.beginPath();
          ctx.arc(0, 0, domeR, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
        ctx.restore();
      },
      onComplete: () => {
        this.setPlayerAnim("idle", true);
        if (onComplete) onComplete();
      }
    });
  }

  // --- Player Ultimate Ranged Mega Slash Wave (Restored to Authentic Original Ranged Form) ---

  performPlayerUltimate(onHit, onComplete, speedMult = 1.0) {
    const p = this.playerState;
    const e = this.enemyState;
    if (!e) {
      this.setPlayerAnim("skill", false);
      if (onHit) onHit();
      if (onComplete) onComplete();
      return;
    }

    this.setPlayerAnim("skill", false);
    p.offsetY = -12;

    const releaseDelay = 160 / speedMult;
    setTimeout(() => {
      Sound.playSfx("magicBurst");

      const slashStartX = p.x + 42;
      const slashStartY = this.groundY - 50;
      const slashTargetX = e.x;
      const slashTargetY = this.groundY - 50;

      // Primary flying crescent blade
      this.launchSlashWave(
        slashStartX,
        slashStartY,
        slashTargetX,
        slashTargetY,
        true,
        () => {
          if (onHit) onHit();
        },
        speedMult
      );

      // Trailing sub-waves bursting forward
      setTimeout(() => {
        this.launchSlashWave(slashStartX - 10, slashStartY - 15, slashTargetX, slashTargetY - 15, false, null, speedMult);
        this.launchSlashWave(slashStartX - 10, slashStartY + 15, slashTargetX, slashTargetY + 15, false, null, speedMult);
      }, 60 / speedMult);

      setTimeout(() => {
        p.offsetY = 0;
        this.setPlayerAnim("idle", true);
        if (onComplete) onComplete();
      }, 200 / speedMult);

    }, releaseDelay);
  }

  // --- Enemy Attack Lunge (Short Localized Surge, Never Runs Across Screen to Player) ---

  performEnemyAttack(onHit, onComplete, speedMult = 1.0) {
    const e = this.enemyState;
    const p = this.playerState;
    if (!e) {
      if (onHit) onHit();
      if (onComplete) onComplete();
      return;
    }

    const startX = e.homeX;
    // Local forward attack surge on enemy's side (enemy DOES NOT approach player's post)
    const strikeX = startX - 45;
    const lungeDuration = 180 / speedMult;
    const returnDuration = 180 / speedMult;

    const startTime = performance.now();

    const forwardTween = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / lungeDuration);
      const ease = 1 - Math.pow(1 - progress, 3);
      e.x = startX - (startX - strikeX) * ease;
      e.offsetY = -Math.sin(progress * Math.PI) * 12;

      if (progress < 1) {
        requestAnimationFrame(forwardTween);
      } else {
        e.x = strikeX;
        e.offsetY = 0;
        if (onHit) onHit();

        setTimeout(() => {
          const returnStart = performance.now();
          const backTween = (now2) => {
            const relapsed = now2 - returnStart;
            const rprogress = Math.min(1, relapsed / returnDuration);
            const rease = 1 - Math.pow(1 - rprogress, 2);
            e.x = strikeX + (startX - strikeX) * rease;
            e.offsetY = -Math.sin(rprogress * Math.PI) * 8;

            if (rprogress < 1) {
              requestAnimationFrame(backTween);
            } else {
              e.x = startX;
              e.offsetY = 0;
              if (onComplete) onComplete();
            }
          };
          requestAnimationFrame(backTween);
        }, 100 / speedMult);
      }
    };

    requestAnimationFrame(forwardTween);
  }

  // --- Visual Feedback Spawners ---

  addFloatingText(text, x, y, type = "normal") {
    let color = "#ffffff";
    let fontSize = 16;
    let weight = "bold";

    if (type === "crit") {
      color = "#ffdd33";
      fontSize = 22;
      text = "💥 " + text + " CRIT!";
    } else if (type === "heal") {
      color = "#48f07e";
      fontSize = 17;
      text = "+" + text;
    } else if (type === "void") {
      color = "#c084fc";
      fontSize = 18;
      text = text + " VOID";
    } else if (type === "dodge") {
      color = "#6ee7b7";
      fontSize = 16;
      text = "DODGE!";
    } else if (type === "shield") {
      color = "#60a5fa";
      fontSize = 16;
      text = "🛡️ " + text;
    } else if (type === "burn") {
      color = "#f97316";
      fontSize = 15;
      text = "🔥 " + text;
    } else if (type === "poison") {
      color = "#a855f7";
      fontSize = 15;
      text = "☠️ " + text;
    }

    this.floatingTexts.push({
      text,
      x: x + (Math.random() * 16 - 8),
      y: y - 10,
      color,
      fontSize,
      weight,
      alpha: 1.0,
      life: 0,
      maxLife: 45,
      vy: -1.4
    });
  }

  addVisualEffect(type, x, y, scale = 1.0) {
    const fxImg = this.fxImages[type];
    if (!fxImg) return;

    this.visualEffects.push({
      img: fxImg,
      x,
      y,
      scale,
      rotation: (Math.random() * 0.5 - 0.25),
      alpha: 1.0,
      life: 0,
      maxLife: 18
    });
  }

  // --- Dynamic Magic Explosion Sparks (Exclusively for Magic Hits) ---

  addMagicImpactSparks(x, y, customColors = null) {
    const colors = customColors || ["#38bdf8", "#60a5fa", "#f59e0b", "#c084fc", "#ffffff"];
    for (let i = 0; i < 20; i++) {
      const angle = (Math.PI * 2 * i) / 20 + (Math.random() * 0.4 - 0.2);
      const speed = Math.random() * 3.5 + 2.0;
      this.projectileSparks.push({
        x: x,
        y: y,
        size: Math.random() * 4.5 + 2.0,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1.0,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        maxLife: Math.floor(Math.random() * 10 + 16)
      });
    }
  }

  checkResize() {
    if (!this.canvas) return;
    const clientW = this.canvas.clientWidth;
    const clientH = this.canvas.clientHeight;
    if (clientW > 0 && clientH > 0) {
      if (this.canvas.width !== clientW || this.canvas.height !== clientH) {
        this.canvas.width = clientW;
        this.canvas.height = clientH;
        this.width = clientW;
        this.height = clientH;
        this.groundY = Math.round(this.height * 0.70);
        this.horizonY = Math.round(this.height * 0.40);
        if (this.isMenuMode) {
          this.playerState.x = Math.round(this.width * 0.52);
          this.playerState.y = this.groundY;
        }
      }
    }
  }

  startRenderLoop() {
    const loop = (timestamp) => {
      const dt = (timestamp - this.lastTime) / 1000;
      this.lastTime = timestamp;

      this.checkResize();
      this.update(dt);
      this.render();

      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  update(dt) {
    const now = performance.now();

    // Parallax background scroll
    if (this.scrollSpeed > 0) {
      this.bgScrollX += this.scrollSpeed * dt * 60;
    }



    // Update Near-Camera Foreground 3D Foliage & Petals (Skipped on First Map / Gale Town)
    if (!this.isFirstMap()) {
      for (const fg of this.foregroundParticles) {
        fg.x += fg.speedX * (this.scrollSpeed > 0 ? (1 + this.scrollSpeed * 0.4) : 1);
        fg.y += fg.speedY;
        fg.rotation += fg.rotSpeed;
        if (fg.x < -40) {
          fg.x = this.width + 40;
          fg.y = Math.random() * this.height;
        }
        if (fg.y > this.height + 20) {
          fg.y = -20;
          fg.x = Math.random() * this.width;
        }
      }
    }

    // Update Player Animation Frame
    const p = this.playerState;
    const animFrames = this.playerAnimations[p.currentAnim];
    if (animFrames && animFrames.length > 0) {
      p.frameTimer += dt;
      const frameDuration = 1 / p.fps;
      if (p.frameTimer >= frameDuration) {
        p.frameTimer -= frameDuration;
        p.frameIndex++;
        if (p.frameIndex >= animFrames.length) {
          if (p.loop) {
            p.frameIndex = 0;
          } else {
            p.frameIndex = animFrames.length - 1;
            if (p.currentAnim === "hurt" || p.currentAnim === "heal" || p.currentAnim === "black_hole" || p.currentAnim === "dragon_roar") {
              this.setPlayerAnim("idle", true);
            }
          }
        }
      }
    }

    // Waddle effect during walk
    if (p.currentAnim === "walk" || p.currentAnim === "run") {
      p.waddleAngle = Math.sin(now * 0.012) * 0.06;
      p.offsetY = -Math.abs(Math.sin(now * 0.012)) * 4;
    } else if (p.currentAnim === "idle") {
      p.waddleAngle = 0;
      p.offsetY = Math.sin(now * 0.003) * 1.5;
    }

    if (p.flashWhite > 0) p.flashWhite -= dt * 4;
    if (p.shake > 0) p.shake -= dt * 8;
    if (p.knockback > 0) p.knockback = Math.max(0, p.knockback - dt * 60);

    // Update Enemy
    const e = this.enemyState;
    if (e) {
      e.bounceTimer += dt * 3.5;
      if (e.flashWhite > 0) e.flashWhite -= dt * 4;
      if (e.shake > 0) e.shake -= dt * 8;
      if (e.knockback > 0) e.knockback = Math.max(0, e.knockback - dt * 60);
    }

    // Update Flying Slash Projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      const elapsed = now - proj.startTime;
      const progress = Math.min(1, elapsed / proj.duration);

      proj.x = proj.startX + (proj.targetX - proj.startX) * progress;
      proj.y = proj.startY + (proj.targetY - proj.startY) * progress;

      for (let s = 0; s < (proj.isUlt ? 3 : 2); s++) {
        this.projectileSparks.push({
          x: proj.x - Math.random() * 12,
          y: proj.y + (Math.random() * 16 - 8),
          size: Math.random() * (proj.isUlt ? 4 : 2.5) + 1.5,
          color: proj.isUlt ? ["#60a5fa", "#38bdf8", "#93c5fd", "#f59e0b"][Math.floor(Math.random() * 4)] : ["#38bdf8", "#60a5fa", "#93c5fd"][Math.floor(Math.random() * 3)],
          alpha: 0.9,
          vx: -(Math.random() * 1.2 + 0.5),
          vy: (Math.random() * 1.6 - 0.8),
          life: 0,
          maxLife: 16
        });
      }

      if (progress >= 1) {
        if (proj.onHit) proj.onHit();
        this.projectiles.splice(i, 1);
      }
    }

    // Update Skill Combat Effects
    for (let i = this.skillCombatEffects.length - 1; i >= 0; i--) {
      const fx = this.skillCombatEffects[i];
      const elapsed = now - fx.startTime;
      const progress = Math.min(1, elapsed / fx.duration);
      try {
        if (fx.update) fx.update(progress, elapsed);
      } catch (err) {
        console.error("SkillCombatEffects update error:", err);
      }
      if (progress >= 1) {
        try {
          if (fx.onComplete) fx.onComplete();
        } catch (err) {
          console.error("SkillCombatEffects onComplete error:", err);
        }
        this.skillCombatEffects.splice(i, 1);
      }
    }

    // Update Projectile Spark Particles
    for (let i = this.projectileSparks.length - 1; i >= 0; i--) {
      const sp = this.projectileSparks[i];
      sp.life++;
      sp.x += sp.vx;
      sp.y += sp.vy;
      sp.alpha = Math.max(0, 1 - (sp.life / sp.maxLife));
      if (sp.life >= sp.maxLife) {
        this.projectileSparks.splice(i, 1);
      }
    }

    // Update Sprint Dust Particles
    for (let i = this.runDustParticles.length - 1; i >= 0; i--) {
      const dp = this.runDustParticles[i];
      dp.life++;
      dp.x += dp.vx;
      dp.y += dp.vy;
      dp.size += 0.25;
      dp.alpha = Math.max(0, 0.85 * (1 - (dp.life / dp.maxLife)));
      if (dp.life >= dp.maxLife) {
        this.runDustParticles.splice(i, 1);
      }
    }

    // Update Impact Skid Spikes
    for (let i = this.impactDustSpikes.length - 1; i >= 0; i--) {
      const sk = this.impactDustSpikes[i];
      sk.life++;
      sk.scale += 0.04;
      sk.alpha = Math.max(0, 1 - (sk.life / sk.maxLife));
      if (sk.life >= sk.maxLife) {
        this.impactDustSpikes.splice(i, 1);
      }
    }

    // Ambient Sky Particles
    for (const pt of this.ambientParticles) {
      pt.x += pt.speedX;
      pt.y += pt.speedY;
      if (pt.y > this.horizonY + 25) {
        pt.y = -5;
        pt.x = Math.random() * this.width;
      }
      if (pt.x < -10) pt.x = this.width + 10;
      if (pt.x > this.width + 10) pt.x = -10;
    }

    // Visual Effects
    for (let i = this.visualEffects.length - 1; i >= 0; i--) {
      const fx = this.visualEffects[i];
      fx.life++;
      fx.scale += 0.015;
      fx.alpha = 1 - (fx.life / fx.maxLife);
      if (fx.life >= fx.maxLife) {
        this.visualEffects.splice(i, 1);
      }
    }

    // Floating Numbers
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.life++;
      ft.y += ft.vy;
      ft.alpha = Math.max(0, 1 - (ft.life / ft.maxLife));
      if (ft.life >= ft.maxLife) {
        this.floatingTexts.splice(i, 1);
      }
    }

    // Update Falling / Bouncing Treasure Chest (Matches Video Project 2)
    if (this.chestState && this.chestState.alpha > 0) {
      const cs = this.chestState;
      if (cs.state === "falling") {
        cs.vy += cs.gravity * dt;
        cs.y += cs.vy * dt;
        cs.scaleX = 0.88;
        cs.scaleY = 1.24;
        if (cs.y >= cs.targetY) {
          cs.y = cs.targetY;
          cs.state = "bouncing";
          cs.bounceCount = 1;
          cs.vy = -220; // bounce upward!
          cs.scaleX = 1.38; // squash on impact
          cs.scaleY = 0.62;
          Sound.playSfx("hit");

          // Screen impact rumble
          const container = document.getElementById("stage-viewport");
          if (container) {
            container.classList.remove("chest-impact-rumble");
            void container.offsetWidth;
            container.classList.add("chest-impact-rumble");
            setTimeout(() => container.classList.remove("chest-impact-rumble"), 360);
          }

          // Spawn comic dust puffs
          this.spawnChestDustPuffs(cs.x, cs.targetY + 14);
        }
      } else if (cs.state === "bouncing") {
        cs.vy += cs.gravity * 1.3 * dt;
        cs.y += cs.vy * dt;
        cs.scaleX += (0.94 - cs.scaleX) * dt * 10;
        cs.scaleY += (1.1 - cs.scaleY) * dt * 10;
        if (cs.y >= cs.targetY) {
          cs.y = cs.targetY;
          cs.vy = 0;
          cs.scaleX = 1.0;
          cs.scaleY = 1.0;
          cs.rotation = 0;
          cs.state = "resting";
          if (cs.onLanded) {
            const cb = cs.onLanded;
            cs.onLanded = null;
            cb();
          }
        }
      }
    }

    // Update Chest Dust Puffs
    for (let i = this.chestDustPuffs.length - 1; i >= 0; i--) {
      const d = this.chestDustPuffs[i];
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.size += d.growth * dt;
      d.alpha -= dt * 2.2;
      if (d.alpha <= 0) {
        this.chestDustPuffs.splice(i, 1);
      }
    }

    // Screen Rumble Decay
    if (this.screenShake > 0) {
      this.screenShake = Math.max(0, this.screenShake - dt * 3.8);
      const mag = this.screenShake * 10;
      this.screenShakeOffset.x = (Math.random() * 2 - 1) * mag;
      this.screenShakeOffset.y = (Math.random() * 2 - 1) * mag;
    } else {
      this.screenShakeOffset.x = 0;
      this.screenShakeOffset.y = 0;
    }

    // Update Slash Speed Lines
    for (let i = this.slashSpeedLines.length - 1; i >= 0; i--) {
      const sl = this.slashSpeedLines[i];
      sl.alpha -= dt * 3.6;
      if (sl.alpha <= 0) {
        this.slashSpeedLines.splice(i, 1);
      }
    }

    // Update Ground Slash Fissures
    for (let i = this.groundSlashFissures.length - 1; i >= 0; i--) {
      const gf = this.groundSlashFissures[i];
      gf.life -= dt;
      gf.alpha = Math.max(0, gf.life / gf.maxLife);
      if (gf.life <= 0) {
        this.groundSlashFissures.splice(i, 1);
      }
    }
  }

  render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    ctx.save();
    if (this.screenShakeOffset.x !== 0 || this.screenShakeOffset.y !== 0) {
      ctx.translate(this.screenShakeOffset.x, this.screenShakeOffset.y);
    }

    // ================= 1. DEEP SKY BASE GRADIENT =================
    const skyGrad = ctx.createLinearGradient(0, 0, 0, this.height);
    skyGrad.addColorStop(0, "#4895ef");
    skyGrad.addColorStop(0.5, "#4cc9f0");
    skyGrad.addColorStop(1, "#bde0fe");
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, this.width, this.height);

    // ================= 2. SEAMLESS AUTHENTIC PANORAMA (FULL ARTWORK & ROAD) =================
    this.renderSeamlessPanorama(ctx);

    // ================= 3. VOLUMETRIC GOD RAYS (SUNBEAMS) =================
    this.renderSunbeams(ctx);

    // ================= 4. AUTHENTIC ROAD DEPTH & WALKING DUST =================
    this.renderGroundAtmosphere(ctx);

    // ================= 6. AMBIENT SKY PARTICLES =================
    ctx.save();
    const isMap1 = this.isFirstMap();
    for (const pt of this.ambientParticles) {
      if (isMap1 && (pt.color === "#ff9bb2" || pt.color === "#fbcfe8")) continue;
      ctx.globalAlpha = pt.alpha;
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // ================= 6.5 DRAW SPRINT DUST TRAILS & CARTOON IMPACT SKID (Under Actors) =================
    this.renderDustEffects(ctx);
    this.renderGroundSlashFissures(ctx);

    // ================= 7. DRAW ACTORS (WITH 3D SHADOWS) =================
    this.renderPlayer();
    if (this.enemyState) {
      this.renderEnemy();
    }
    // Authentic Treasure Chest & Landing Dust
    this.renderTreasureChest();
    this.renderChestDustPuffs();

    // ================= 8. DRAW PROJECTILES & SPARK PARTICLES =================
    ctx.save();
    for (const sp of this.projectileSparks) {
      ctx.globalAlpha = sp.alpha;
      ctx.fillStyle = sp.color;
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, sp.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    this.renderProjectiles();
    this.renderSkillCombatEffects();

    // ================= 9. HIT EFFECTS & FLOATING TEXTS =================
    ctx.save();
    for (const fx of this.visualEffects) {
      if (!fx.img || !fx.img.complete) continue;
      ctx.save();
      ctx.globalAlpha = Math.max(0, fx.alpha);
      ctx.translate(fx.x, fx.y);
      ctx.rotate(fx.rotation);
      ctx.scale(fx.scale, fx.scale);
      const iw = fx.img.naturalWidth || 64;
      const ih = fx.img.naturalHeight || 64;
      ctx.drawImage(fx.img, -iw / 2, -ih / 2, iw, ih);
      ctx.restore();
    }
    ctx.restore();

    ctx.save();
    for (const ft of this.floatingTexts) {
      ctx.save();
      ctx.globalAlpha = ft.alpha;
      ctx.font = `${ft.weight} ${ft.fontSize}px 'Fredoka', 'Nunito', sans-serif`;
      ctx.textAlign = "center";
      ctx.strokeStyle = "rgba(0, 0, 0, 0.85)";
      ctx.lineWidth = 3.5;
      ctx.strokeText(ft.text, ft.x, ft.y);
      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    }
    ctx.restore();

    // ================= 10. FOREGROUND 3D DEPTH FOLIAGE & BOKEH =================
    this.renderForeground3D(ctx);

    // ================= 11. ANIME SPEED SLASH LINES (OVERLAY LAYER) =================
    this.renderSlashSpeedLines(ctx);

    ctx.restore();
  }

  // --- 100% Seamless Continuous Background Engine (Village & Authentic Sandy Road) ---

  renderSeamlessPanorama(ctx) {
    if (!this.bgImage) return;

    const bg = this.bgImage;
    const bgW = bg.width;
    const bgH = bg.height;
    if (!bgW || !bgH) return;

    // Scale to full canvas height so village and sandy road are displayed in exact proportion
    const drawH = this.height;
    const drawW = (bgW / bgH) * drawH;

    // Smooth continuous forward scrolling (seamless loop)
    let scrollX = this.bgScrollX % drawW;
    if (scrollX < 0) scrollX += drawW;

    const firstTile = -1;
    const lastTile = Math.ceil(this.width / drawW) + 1;

    for (let t = firstTile; t <= lastTile; t++) {
      const tileScreenX = (t * drawW) - scrollX;
      if (tileScreenX + drawW < -20 || tileScreenX > this.width + 20) continue;

      ctx.drawImage(bg, tileScreenX, 0, drawW, drawH);
    }
  }

  // --- Volumetric God Rays (Sunbeams) ---

  renderSunbeams(ctx) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const pulse = 0.08 + Math.sin(performance.now() * 0.0018) * 0.03;
    ctx.globalAlpha = pulse;

    const rayGrad = ctx.createLinearGradient(0, 0, this.width * 0.7, this.height);
    rayGrad.addColorStop(0, "rgba(255, 235, 175, 0.85)");
    rayGrad.addColorStop(0.4, "rgba(255, 215, 120, 0.35)");
    rayGrad.addColorStop(1, "rgba(255, 200, 100, 0.0)");

    ctx.fillStyle = rayGrad;

    // Angled sunbeam shafts across the sky and canopy
    ctx.beginPath();
    ctx.moveTo(30, 0);
    ctx.lineTo(110, 0);
    ctx.lineTo(260, this.height);
    ctx.lineTo(160, this.height);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(170, 0);
    ctx.lineTo(240, 0);
    ctx.lineTo(390, this.height);
    ctx.lineTo(310, this.height);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  // --- Authentic Road Atmosphere & 3D Depth Vignette ---

  renderGroundAtmosphere(ctx) {
    ctx.save();

    // 1. 3D Grass Ledge Drop Shadow onto Sandy Road (makes grass bank physically pop in 3D above road)
    const grassLedgeGrad = ctx.createLinearGradient(0, this.horizonY - 1, 0, this.horizonY + 8);
    grassLedgeGrad.addColorStop(0, "rgba(25, 38, 22, 0.45)");
    grassLedgeGrad.addColorStop(0.4, "rgba(35, 45, 28, 0.2)");
    grassLedgeGrad.addColorStop(1, "rgba(35, 45, 28, 0.0)");
    ctx.fillStyle = grassLedgeGrad;
    ctx.fillRect(0, this.horizonY - 1, this.width, 9);

    // 2. Subtle 3D road lighting gradient (rich planar perspective depth)
    const roadDepthGrad = ctx.createLinearGradient(0, this.horizonY, 0, this.height);
    roadDepthGrad.addColorStop(0, "rgba(0, 0, 0, 0.04)");
    roadDepthGrad.addColorStop(0.35, "rgba(255, 250, 230, 0.05)");
    roadDepthGrad.addColorStop(0.85, "rgba(0, 0, 0, 0.0)");
    roadDepthGrad.addColorStop(1, "rgba(0, 0, 0, 0.18)");
    ctx.fillStyle = roadDepthGrad;
    ctx.fillRect(0, this.horizonY, this.width, this.height - this.horizonY);

    // 3. Crisp bottom dark border line separating road from battle cards (matches reference screenshot)
    ctx.strokeStyle = "#1b261e";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(0, this.height - 1);
    ctx.lineTo(this.width, this.height - 1);
    ctx.stroke();

    // 4. Walking Road Dust (Motes that kick up behind Capybara's paws as he travels)
    if (this.scrollSpeed > 0) {
      const p = this.playerState;
      const dustTime = performance.now() * 0.006;
      for (let i = 0; i < 4; i++) {
        const dx = (p.x - 20) - (Math.sin(dustTime + i * 1.5) * 14);
        const dy = this.groundY - 3 + (Math.cos(dustTime + i * 2) * 5);
        const dSize = 2 + (i % 2) * 1.5;
        ctx.beginPath();
        ctx.arc(dx, dy, dSize, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255, 255, 255, 0.32)";
        ctx.fill();
      }
    }
    ctx.restore();
  }

  // --- Cartoon Sprint Dust & Skid Impact Drawing (Exact Match to User Reference Screenshot) ---

  renderDustEffects(ctx) {
    ctx.save();

    // 1. Render Sprint Dust Puffs
    for (const dp of this.runDustParticles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, dp.alpha);
      ctx.fillStyle = "#e9dfce"; // Pale sandy road dust
      ctx.beginPath();
      ctx.arc(dp.x, dp.y, dp.size, 0, Math.PI * 2);
      ctx.fill();

      // Inner soft highlight
      ctx.fillStyle = "rgba(255, 255, 255, 0.65)";
      ctx.beginPath();
      ctx.arc(dp.x - dp.size * 0.25, dp.y - dp.size * 0.25, dp.size * 0.45, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 2. Render Stylized Cartoon Skid Spikes (Exact Jagged Tooth Profile from User Image)
    for (const sk of this.impactDustSpikes) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, sk.alpha);
      ctx.translate(sk.x, sk.y);
      ctx.scale(sk.scale, sk.scale);

      // Jagged cartoon dust tooth shape pointing backwards & upwards
      ctx.beginPath();
      ctx.moveTo(10, 0);
      ctx.lineTo(-12, -8);
      ctx.lineTo(-7, -4);
      ctx.lineTo(-24, -14);
      ctx.lineTo(-18, -6);
      ctx.lineTo(-38, -18); // Tallest spike behind Capybara
      ctx.lineTo(-32, -8);
      ctx.lineTo(-46, -11);
      ctx.lineTo(-40, -3);
      ctx.lineTo(-52, -2);
      ctx.lineTo(-54, 2);
      ctx.lineTo(10, 2);
      ctx.closePath();

      // Pale cream dust body fill
      ctx.fillStyle = "#f5ebd7";
      ctx.fill();

      // Subtle warm grey bottom shadow edge matching screenshot
      ctx.strokeStyle = "rgba(180, 165, 140, 0.8)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.restore();
    }

    ctx.restore();
  }

  // --- Foreground 3D Depth Particles (Near Camera Bokeh & Leaves) ---

  renderForeground3D(ctx) {
    // Hilangkan efek bunga sakura / daun jatuh di map pertama (Gale Town)
    if (this.isFirstMap()) return;

    ctx.save();
    for (const fg of this.foregroundParticles) {
      ctx.save();
      ctx.globalAlpha = fg.alpha;
      ctx.translate(fg.x, fg.y);
      ctx.rotate(fg.rotation);

      // 3D Soft Glow Halo
      ctx.shadowColor = fg.color;
      ctx.shadowBlur = 10;

      // Fluttering Petal / Leaf Shape
      ctx.fillStyle = fg.color;
      ctx.beginPath();
      ctx.ellipse(0, 0, fg.size, fg.size * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
    ctx.restore();
  }

  // --- Actors Rendering with 3D Perspective Cast Shadows ---

  renderPlayer() {
    const ctx = this.ctx;
    const p = this.playerState;
    const animFrames = this.playerAnimations[p.currentAnim];
    if (!animFrames || animFrames.length === 0) return;

    const frameImg = animFrames[p.frameIndex] || animFrames[0];
    if (!frameImg || !frameImg.complete) return;

    const drawW = 64 * p.scale;
    const drawH = 64 * p.scale;

    let px = p.x - (p.knockback || 0);
    let py = this.groundY;

    if (p.shake > 0) {
      px += (Math.random() * 6 - 3) * p.shake;
      py += (Math.random() * 4 - 2) * p.shake;
    }

    ctx.save();

    // 3D Directional Soft Oval Shadow on sandy road (matches reference image)
    ctx.beginPath();
    ctx.ellipse(px + 4, py + 1, drawW * 0.35, 7.5, 0.1, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(55, 45, 25, 0.28)";
    ctx.fill();

    // Position actor anchored bottom-center
    ctx.translate(px, py + (p.offsetY || 0));
    ctx.rotate(p.waddleAngle || 0);

    if (p.facing < 0) {
      ctx.scale(-1, 1);
    }

    if (p.flashWhite > 0) {
      ctx.filter = "brightness(2.4)";
    }

    const now = performance.now();
    const run = window.Character && window.Character.activeRun;
    const runSkills = (run && run.skills) ? run.skills : [];

    // Layer 1: Render Behind-Capy Skill Attachments (Wings, Demon Avatar, Healing Mandala, Singularity, Quiver)
    this.renderPlayerSkillAttachmentsBack(ctx, drawW, drawH, p, runSkills, now);

    // Layer 2: Render Capybara Character Sprite (Clean, Crisp & Cute - Zero AI morphing/glitches)
    const isWiderFrame = frameImg.naturalWidth && frameImg.naturalWidth > 64;
    if (isWiderFrame) {
      if (p.currentAnim === "heal") {
        // 176x128 frame: Capybara body is anchored at (86, 114)
        // Scale by 0.54 so the body height matches the 64x64 idle sprite exactly
        const s = p.scale * 0.54;
        const sprW = frameImg.naturalWidth * s;
        const sprH = frameImg.naturalHeight * s;
        const sprX = -86 * s;
        const sprY = -114 * s;
        ctx.drawImage(frameImg, sprX, sprY, sprW, sprH);
      } else if (p.currentAnim === "dragon_roar") {
        // 85x85 frame: Capybara body anchored at (52, 66)
        // Scale by 1.15 to match 64x64 idle sprite scale
        const s = p.scale * 1.15;
        const sprW = frameImg.naturalWidth * s;
        const sprH = frameImg.naturalHeight * s;
        const sprX = -52 * s;
        const sprY = -66 * s;
        ctx.drawImage(frameImg, sprX, sprY, sprW, sprH);
      } else {
        // 144x96 frame (attack / sword_slash): Capybara body anchored at (44, 88)
        // Scale by 0.75 so the body height matches the 64x64 idle sprite exactly
        const s = p.scale * 0.75;
        const sprW = frameImg.naturalWidth * s;
        const sprH = frameImg.naturalHeight * s;
        const sprX = -44 * s;
        const sprY = -88 * s;
        ctx.drawImage(frameImg, sprX, sprY, sprW, sprH);
      }
    } else {
      ctx.drawImage(frameImg, -drawW / 2, -drawH, drawW, drawH);
    }

    // Dynamic Skill Facial Expressions on Capybara (Matching authentic reference frames)
    if (p.skillExpression) {
      const eyeX = drawW * 0.12;
      const eyeY = -drawH * 0.62;

      if (p.skillExpression === "void_eye") {
        ctx.save();
        ctx.fillStyle = "#d48b55";
        ctx.beginPath();
        ctx.arc(eyeX, eyeY, 3.8, 0, Math.PI * 2);
        ctx.fill();

        ctx.translate(eyeX, eyeY);
        ctx.shadowColor = "#f43f5e";
        ctx.shadowBlur = 10;
        ctx.fillStyle = "#f472b6";
        ctx.strokeStyle = "#e879f9";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.ellipse(0, 0, 4.2, 2.6, -0.15, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(0.9, -0.5, 1.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

      } else if (p.skillExpression === "slash_squint") {
        ctx.save();
        ctx.fillStyle = "#d48b55";
        ctx.beginPath();
        ctx.arc(eyeX, eyeY, 3.8, 0, Math.PI * 2);
        ctx.fill();

        ctx.translate(eyeX, eyeY);
        ctx.strokeStyle = "#291003";
        ctx.lineWidth = 2.2;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(-3.5, -2.0);
        ctx.lineTo(3.5, 1.6);
        ctx.stroke();

        ctx.strokeStyle = "#c084fc";
        ctx.lineWidth = 1.1;
        ctx.shadowColor = "#a855f7";
        ctx.shadowBlur = 5;
        ctx.beginPath();
        ctx.moveTo(3.5, 1.6);
        ctx.lineTo(5.0, 0.2);
        ctx.stroke();
        ctx.restore();

      } else if (p.skillExpression === "flash_squint") {
        ctx.save();
        ctx.fillStyle = "#d48b55";
        ctx.beginPath();
        ctx.arc(eyeX, eyeY, 3.8, 0, Math.PI * 2);
        ctx.fill();

        ctx.translate(eyeX, eyeY);
        ctx.strokeStyle = "#291003";
        ctx.lineWidth = 2.2;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(-3.0, -1.8);
        ctx.lineTo(2.0, 0);
        ctx.lineTo(-3.0, 1.8);
        ctx.stroke();

        ctx.strokeStyle = "rgba(240, 171, 252, 0.85)";
        ctx.lineWidth = 1.0;
        ctx.shadowColor = "#fde047";
        ctx.shadowBlur = 7;
        ctx.beginPath();
        ctx.moveTo(-2.0, -0.9);
        ctx.lineTo(1.6, 0);
        ctx.stroke();
        ctx.restore();

      } else if (p.skillExpression === "peaceful_relief") {
        ctx.save();
        ctx.fillStyle = "#d48b55";
        ctx.beginPath();
        ctx.arc(eyeX, eyeY, 3.8, 0, Math.PI * 2);
        ctx.fill();

        ctx.translate(eyeX, eyeY);
        ctx.strokeStyle = "#291003";
        ctx.lineWidth = 2.0;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.arc(0, 1.5, 3.5, Math.PI * 1.15, Math.PI * 1.85);
        ctx.stroke();
        ctx.restore();
      }
    }

    // Layer 3: Render In-Front Skill Attachments (Halo, Dragon Head, Shields, Grimoire, Weapons, Cyclones)
    this.renderPlayerSkillAttachmentsFront(ctx, drawW, drawH, p, runSkills, now);

    ctx.restore();

    // In-Battle Player Overhead HP Bar
    if (this.inBattle && p.currentHp !== undefined && p.maxHp) {
      const hpBarY = this.groundY + (p.offsetY || 0) - drawH - 12;
      this.renderPlayerHpBar(px, hpBarY, p);
    }
  }

  renderPlayerHpBar(x, y, p) {
    const ctx = this.ctx;
    const barW = 50; // Shortened & snug overhead HP bar matching Capybara width
    const barH = 7;
    const maxHp = p.maxHp || 1;
    const currentHp = Math.max(0, p.currentHp !== undefined ? p.currentHp : maxHp);
    const pct = Math.max(0, Math.min(1, currentHp / maxHp));

    // Smooth damage lag catchup
    if (p.animHp === undefined) p.animHp = currentHp;
    if (Math.abs(p.animHp - currentHp) > 0.5) {
      p.animHp += (currentHp - p.animHp) * 0.18;
    } else {
      p.animHp = currentHp;
    }
    const animPct = Math.max(0, Math.min(1, p.animHp / maxHp));

    ctx.save();
    // Capy Name Tag
    ctx.font = "bold 10px 'Fredoka', 'Nunito', sans-serif";
    ctx.textAlign = "center";
    ctx.strokeStyle = "rgba(0,0,0,0.9)";
    ctx.lineWidth = 3;
    ctx.strokeText("🐾 Capy", x, y - 4);
    ctx.fillStyle = "#ffffff";
    ctx.fillText("🐾 Capy", x, y - 4);

    // Track Background
    ctx.fillStyle = "rgba(15, 23, 42, 0.88)";
    ctx.strokeStyle = "#475569";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(x - barW / 2, y, barW, barH, 3.5);
    ctx.fill();
    ctx.stroke();

    // Damage Lag Bar (Yellow/White)
    if (animPct > pct) {
      ctx.fillStyle = "#fef08a";
      ctx.beginPath();
      ctx.roundRect(x - barW / 2, y, barW * animPct, barH, 3.5);
      ctx.fill();
    }

    // Health Fill (Green > Amber > Red)
    if (pct > 0) {
      const grad = ctx.createLinearGradient(x - barW / 2, 0, x - barW / 2 + barW * pct, 0);
      if (pct > 0.5) {
        grad.addColorStop(0, "#22c55e");
        grad.addColorStop(1, "#4ade80");
      } else if (pct > 0.25) {
        grad.addColorStop(0, "#f59e0b");
        grad.addColorStop(1, "#fbbf24");
      } else {
        grad.addColorStop(0, "#ef4444");
        grad.addColorStop(1, "#f87171");
      }
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(x - barW / 2, y, barW * pct, barH, 4.5);
      ctx.fill();
    }

    // Shield Bar
    if (p.shield > 0) {
      const shieldPct = Math.min(1, p.shield / maxHp);
      ctx.fillStyle = "rgba(56, 189, 248, 0.8)";
      ctx.beginPath();
      ctx.roundRect(x - barW / 2, y + barH - 3, barW * shieldPct, 3, 2);
      ctx.fill();
    }

    ctx.restore();
  }

  // --- Skill Idle Visual Attachments (Authentic 60FPS Procedural & Vector Auras) ---

  renderPlayerSkillAttachmentsBack(ctx, drawW, drawH, p, runSkills, now) {
    if ((!runSkills || runSkills.length === 0) && !p.swordAction && !p.skillExpression) return;

    const hasSkill = (term) => (runSkills || []).some(s => {
      if (typeof term === "number") return s.id === term;
      const t = term.toLowerCase();
      return (s.key && s.key.toLowerCase().includes(t)) || (s.name && s.name.toLowerCase().includes(t));
    });

    // 1. Mythic: Angel Blessing (Golden Feathered Wings Flapping on Capybara's Back)
    if (hasSkill("angel") || hasSkill("blessing")) {
      const flap = Math.sin(now * 0.0035);
      
      // Left Wing
      ctx.save();
      ctx.translate(-drawW * 0.18, -drawH * 0.58);
      ctx.rotate(-0.35 + flap * 0.28);
      ctx.shadowColor = "#fde047";
      ctx.shadowBlur = 14;
      ctx.fillStyle = "#fef08a";
      ctx.strokeStyle = "#eab308";
      ctx.lineWidth = 1.5;
      for (let f = 0; f < 4; f++) {
        const fx = -f * 7;
        const fy = -f * 8;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(-15 + fx, -20 + fy, -28 + fx * 1.2, -32 + fy);
        ctx.quadraticCurveTo(-18 + fx, -10 + fy, 0, 0);
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();

      // Right Wing
      ctx.save();
      ctx.translate(drawW * 0.06, -drawH * 0.58);
      ctx.rotate(0.35 - flap * 0.28);
      ctx.shadowColor = "#fde047";
      ctx.shadowBlur = 14;
      ctx.fillStyle = "#fef08a";
      ctx.strokeStyle = "#eab308";
      ctx.lineWidth = 1.5;
      for (let f = 0; f < 4; f++) {
        const fx = f * 7;
        const fy = -f * 8;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(15 + fx, -20 + fy, 28 + fx * 1.2, -32 + fy);
        ctx.quadraticCurveTo(18 + fx, -10 + fy, 0, 0);
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
    }

    // 2. Mythic: Demon Form (Dark Shadow Avatar with Horns & Glowing Red Eyes Hovering Behind)
    if (hasSkill("demon")) {
      ctx.save();
      const demonBob = Math.sin(now * 0.003) * 3;
      ctx.translate(-drawW * 0.05, -drawH * 0.65 + demonBob);
      ctx.globalAlpha = 0.82;
      ctx.shadowColor = "#ef4444";
      ctx.shadowBlur = 18;

      const demonGrad = ctx.createLinearGradient(0, -50, 0, 30);
      demonGrad.addColorStop(0, "rgba(20, 10, 30, 0.95)");
      demonGrad.addColorStop(0.5, "rgba(88, 28, 135, 0.9)");
      demonGrad.addColorStop(1, "rgba(220, 38, 38, 0.4)");
      ctx.fillStyle = demonGrad;

      ctx.beginPath();
      // Left Horn
      ctx.moveTo(-10, -25);
      ctx.bezierCurveTo(-25, -45, -35, -50, -28, -62);
      ctx.bezierCurveTo(-22, -50, -18, -35, -5, -30);
      ctx.lineTo(5, -30);
      // Right Horn
      ctx.bezierCurveTo(18, -35, 22, -50, 28, -62);
      ctx.bezierCurveTo(35, -50, 25, -45, 10, -25);
      // Shoulders
      ctx.bezierCurveTo(30, -15, 38, 10, 25, 30);
      ctx.lineTo(-25, 30);
      ctx.bezierCurveTo(-38, 10, -30, -15, -10, -25);
      ctx.closePath();
      ctx.fill();

      // Glowing Crimson Eyes
      ctx.fillStyle = "#ff1744";
      ctx.shadowColor = "#ff1744";
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.ellipse(-10, -32, 4, 1.8, -0.3, 0, Math.PI * 2);
      ctx.ellipse(10, -32, 4, 1.8, 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 3. Legendary: Healing Aura (Radiant Holy Circle Rotating on Ground at Feet)
    if (hasSkill("healing_aura") || hasSkill("healing aura")) {
      ctx.save();
      ctx.translate(0, 0);
      ctx.scale(1, 0.42);
      ctx.shadowColor = "#4ade80";
      ctx.shadowBlur = 14;
      ctx.strokeStyle = "rgba(74, 222, 128, 0.8)";
      ctx.lineWidth = 2.5;
      const rot = (now * 0.001) % (Math.PI * 2);
      ctx.rotate(rot);
      ctx.beginPath();
      ctx.arc(0, 0, drawW * 0.52, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = "#fef08a";
      for (let a = 0; a < 4; a++) {
        const ang = (Math.PI / 2) * a;
        ctx.beginPath();
        ctx.arc(Math.cos(ang) * drawW * 0.52, Math.sin(ang) * drawW * 0.52, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // 4. Mythic: Black Hole (Cosmic Gravitational Singularity Floating Behind/Above)
    if (hasSkill("black_hole") || hasSkill("black hole")) {
      ctx.save();
      const bhBob = Math.sin(now * 0.002) * 3;
      ctx.translate(-drawW * 0.28, -drawH - 6 + bhBob);
      ctx.shadowColor = "#a855f7";
      ctx.shadowBlur = 18;

      ctx.save();
      ctx.scale(1, 0.45);
      ctx.rotate(now * 0.0035);
      const accGrad = ctx.createRadialGradient(0, 0, 4, 0, 0, 18);
      accGrad.addColorStop(0, "rgba(168, 85, 247, 0.95)");
      accGrad.addColorStop(0.6, "rgba(99, 102, 241, 0.5)");
      accGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = accGrad;
      ctx.beginPath();
      ctx.arc(0, 0, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.fillStyle = "#09090b";
      ctx.strokeStyle = "#c084fc";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(0, 0, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // 5. Legendary: Fireball (Back Orbit of 3D Orbiting Fireballs)
    if (hasSkill("fireball")) {
      const orbAngle = (now * 0.0035);
      const z1 = Math.sin(orbAngle);
      const z2 = Math.sin(orbAngle + Math.PI);
      const drawOrb = (ang) => {
        const ox = Math.cos(ang) * drawW * 0.48;
        const oy = -drawH * 0.45 + Math.sin(ang) * 12;
        ctx.save();
        ctx.translate(ox, oy);
        ctx.shadowColor = "#f97316";
        ctx.shadowBlur = 14;
        const fGrad = ctx.createRadialGradient(0, 0, 1, 0, 0, 6);
        fGrad.addColorStop(0, "#ffffff");
        fGrad.addColorStop(0.4, "#fde047");
        fGrad.addColorStop(1, "#ea580c");
        ctx.fillStyle = fGrad;
        ctx.beginPath();
        ctx.arc(0, 0, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      };
      if (z1 < 0) drawOrb(orbAngle);
      if (z2 < 0) drawOrb(orbAngle + Math.PI);
    }

    // 6. Common / Legendary: Bow / Multi Arrow (Recurve Bow Strapped to Back)
    if (hasSkill("bow") || hasSkill("multi_arrow") || hasSkill("multi arrow")) {
      ctx.save();
      ctx.translate(-drawW * 0.16, -drawH * 0.52);
      ctx.rotate(0.65);
      ctx.shadowColor = "#78350f";
      ctx.shadowBlur = 6;
      ctx.strokeStyle = "#92400e";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, 18, -Math.PI * 0.4, Math.PI * 0.4);
      ctx.stroke();
      ctx.strokeStyle = "#e2e8f0";
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(Math.cos(-Math.PI * 0.4) * 18, Math.sin(-Math.PI * 0.4) * 18);
      ctx.lineTo(Math.cos(Math.PI * 0.4) * 18, Math.sin(Math.PI * 0.4) * 18);
      ctx.stroke();
      ctx.restore();
    }

    // 9. Black Hole / Cosmic Crystal Quiver (Tabung Panah di Punggung)
    const hasBlackHole = hasSkill("black_hole") || (p.currentAnim === "black_hole") || (p.swordAction) || (p.skillExpression && p.skillExpression !== "normal");
    if (hasBlackHole) {
      ctx.save();
      ctx.translate(-drawW * 0.22, -drawH * 0.52);
      ctx.rotate(-0.35);

      // Slim leather quiver cylinder
      ctx.fillStyle = "#78350f";
      ctx.strokeStyle = "#291003";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.roundRect(-4, -2, 8, 22, 2.5);
      ctx.fill();
      ctx.stroke();

      // Golden collar band
      ctx.fillStyle = "#b45309";
      ctx.beginPath();
      ctx.roundRect(-4.5, -3, 9, 3.5, 1.2);
      ctx.fill();
      ctx.stroke();

      // 3 Sky-blue arrows with cyan feathers
      const arrows = [
        { dx: -2, dy: -8, rot: -0.20 },
        { dx: 0, dy: -11, rot: 0.02 },
        { dx: 2, dy: -7, rot: 0.22 }
      ];
      for (const arr of arrows) {
        ctx.save();
        ctx.translate(arr.dx, arr.dy);
        ctx.rotate(arr.rot);

        ctx.strokeStyle = "#451a03";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, 8);
        ctx.stroke();

        ctx.fillStyle = "#38bdf8";
        ctx.strokeStyle = "#0284c7";
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(0, -1);
        ctx.lineTo(-3, 3);
        ctx.lineTo(0, 2.2);
        ctx.lineTo(3, 3);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = "#e0f2fe";
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.moveTo(0, -0.8);
        ctx.lineTo(0, 2.5);
        ctx.stroke();
        ctx.restore();
      }
      ctx.restore();

      // 10. Black Hole: Ground Void Energy Flames (Matching Video 00:00)
      if (p.currentAnim === "skill" || p.skillExpression === "void_eye") {
        ctx.save();
        ctx.translate(0, 2);
        ctx.scale(1, 0.32);
        const auraGrad = ctx.createRadialGradient(0, 0, 8, 0, 0, 48);
        auraGrad.addColorStop(0, "rgba(168, 85, 247, 0.85)");
        auraGrad.addColorStop(0.5, "rgba(88, 28, 135, 0.65)");
        auraGrad.addColorStop(1, "rgba(3, 7, 18, 0)");
        ctx.fillStyle = auraGrad;
        ctx.beginPath();
        ctx.arc(0, 0, 48, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.save();
        ctx.shadowColor = "#c084fc";
        ctx.shadowBlur = 12;
        const tendrilCount = 7;
        for (let i = 0; i < tendrilCount; i++) {
          const tAngle = (i / tendrilCount) * Math.PI * 2;
          const wave = Math.sin(now * 0.008 + i * 1.3);
          const fx = Math.cos(tAngle) * 24;
          const fy = Math.sin(tAngle) * 7;
          const fHeight = 16 + wave * 7;

          ctx.save();
          ctx.translate(fx, fy);
          const fGrad = ctx.createLinearGradient(0, 0, 0, -fHeight);
          fGrad.addColorStop(0, "rgba(88, 28, 135, 0.85)");
          fGrad.addColorStop(0.6, "rgba(168, 85, 247, 0.75)");
          fGrad.addColorStop(1, "rgba(245, 208, 254, 0)");
          ctx.fillStyle = fGrad;

          ctx.beginPath();
          ctx.moveTo(-3.5, 0);
          ctx.quadraticCurveTo(-1.8 + wave * 1.8, -fHeight * 0.6, wave * 2.5, -fHeight);
          ctx.quadraticCurveTo(1.8 + wave * 1.8, -fHeight * 0.6, 3.5, 0);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
        ctx.restore();
      }
    }
  }

  renderPlayerSkillAttachmentsFront(ctx, drawW, drawH, p, runSkills, now) {
    if ((!runSkills || runSkills.length === 0) && !p.swordAction && !p.skillExpression) return;

    const hasSkill = (term) => (runSkills || []).some(s => {
      if (typeof term === "number") return s.id === term;
      const t = term.toLowerCase();
      return (s.key && s.key.toLowerCase().includes(t)) || (s.name && s.name.toLowerCase().includes(t));
    });

    // 1. Mythic: Angel Blessing (Golden Radiant Halo Floating Overhead)
    if (hasSkill("angel") || hasSkill("blessing")) {
      const haloBob = Math.sin(now * 0.0028) * 3;
      ctx.save();
      ctx.translate(0, -drawH - 10 + haloBob);
      ctx.rotate(-0.06);
      ctx.shadowColor = "#fde047";
      ctx.shadowBlur = 16;
      ctx.strokeStyle = "#facc15";
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.ellipse(0, 0, 18, 5, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
    }

    // 2. Mythic: Dragon Roar (Ethereal Fiery Dragon Head Floating Overhead Diagonally)
    if (hasSkill("dragon") && p.currentAnim !== "dragon_roar") {
      ctx.save();
      const dragonBob = Math.sin(now * 0.0025) * 4;
      ctx.translate(drawW * 0.22, -drawH - 12 + dragonBob);
      ctx.rotate(0.12);
      ctx.shadowColor = "#f97316";
      ctx.shadowBlur = 16;

      const dragonGrad = ctx.createLinearGradient(-20, -20, 30, 20);
      dragonGrad.addColorStop(0, "rgba(255, 240, 180, 0.95)");
      dragonGrad.addColorStop(0.4, "rgba(249, 115, 22, 0.9)");
      dragonGrad.addColorStop(1, "rgba(220, 38, 38, 0.3)");
      ctx.fillStyle = dragonGrad;

      ctx.beginPath();
      ctx.moveTo(18, 0);
      ctx.lineTo(28, 4);
      ctx.lineTo(15, 12);
      ctx.lineTo(8, 6);
      ctx.lineTo(-12, 14);
      ctx.lineTo(-20, 2);
      ctx.lineTo(-30, -8);
      ctx.lineTo(-14, -8);
      ctx.lineTo(-22, -22);
      ctx.lineTo(-8, -12);
      ctx.lineTo(6, -8);
      ctx.closePath();
      ctx.fill();

      // Golden Eye
      ctx.fillStyle = "#fef08a";
      ctx.shadowColor = "#fef08a";
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.ellipse(6, -2, 2.5, 1.2, 0.1, 0, Math.PI * 2);
      ctx.fill();

      // Drifting flame wisps
      const flameFlicker = Math.sin(now * 0.015) * 3;
      ctx.fillStyle = "rgba(251, 146, 60, 0.85)";
      ctx.beginPath();
      ctx.arc(28 + flameFlicker, 4, 3.5, 0, Math.PI * 2);
      ctx.arc(36 + flameFlicker * 1.5, 2, 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 3. Mythic: Blood Blade (Cursed Crimson Greatsword Hovering Beside Capy with Dripping Blood)
    if (hasSkill("blood_blade") || hasSkill("blood blade")) {
      ctx.save();
      const bloodBob = Math.sin(now * 0.003) * 3.5;
      ctx.translate(drawW * 0.38, -drawH * 0.55 + bloodBob);
      ctx.rotate(0.35);
      ctx.shadowColor = "#dc2626";
      ctx.shadowBlur = 14;

      const bGrad = ctx.createLinearGradient(0, -32, 0, 20);
      bGrad.addColorStop(0, "#fee2e2");
      bGrad.addColorStop(0.3, "#ef4444");
      bGrad.addColorStop(0.8, "#991b1b");
      bGrad.addColorStop(1, "#450a0a");
      ctx.fillStyle = bGrad;
      ctx.strokeStyle = "#ff4444";
      ctx.lineWidth = 1.2;

      ctx.beginPath();
      ctx.moveTo(0, 16);
      ctx.lineTo(2, 6);
      ctx.lineTo(6, 6);
      ctx.lineTo(4, -30);
      ctx.bezierCurveTo(8, -15, 6, 2, 0, 6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      const dripY = (now * 0.04) % 18;
      ctx.fillStyle = "#dc2626";
      ctx.beginPath();
      ctx.arc(3, 10 + dripY, 1.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 4. Legendary: Flaming Sword (Blazing Fiery Blade Hovering Beside Capy)
    if (hasSkill("flaming_sword") || hasSkill("flaming sword")) {
      ctx.save();
      const flameBob = Math.sin(now * 0.0032) * 3.5;
      ctx.translate(drawW * 0.36, -drawH * 0.55 + flameBob);
      ctx.rotate(0.32);
      ctx.shadowColor = "#f97316";
      ctx.shadowBlur = 15;

      const sGrad = ctx.createLinearGradient(0, -30, 0, 15);
      sGrad.addColorStop(0, "#ffffff");
      sGrad.addColorStop(0.3, "#fde047");
      sGrad.addColorStop(0.7, "#f97316");
      sGrad.addColorStop(1, "#ea580c");
      ctx.fillStyle = sGrad;

      ctx.beginPath();
      ctx.moveTo(0, 14);
      ctx.lineTo(2, 4);
      ctx.lineTo(5, 4);
      ctx.lineTo(2, -28);
      ctx.lineTo(0, -32);
      ctx.lineTo(-2, -28);
      ctx.lineTo(-5, 4);
      ctx.lineTo(-2, 4);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = "rgba(253, 224, 71, 0.85)";
      const fShift = Math.sin(now * 0.018) * 2;
      ctx.beginPath();
      ctx.arc(fShift, -15, 3.5, 0, Math.PI * 2);
      ctx.arc(-fShift, -24, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 5. Legendary: Thunder Hammer (Heavy Warhammer with Electric Lightning Arcs)
    if (hasSkill("thunder_hammer") || hasSkill("thunder hammer")) {
      ctx.save();
      const thBob = Math.sin(now * 0.0028) * 3.5;
      ctx.translate(drawW * 0.36, -drawH * 0.52 + thBob);
      ctx.rotate(0.25);
      ctx.shadowColor = "#38bdf8";
      ctx.shadowBlur = 14;

      ctx.fillStyle = "#78350f";
      ctx.fillRect(-2, -5, 4, 22);

      ctx.fillStyle = "#64748b";
      ctx.strokeStyle = "#94a3b8";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(-10, -22, 20, 17, 3);
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = "#fef08a";
      ctx.lineWidth = 1.5;
      ctx.shadowColor = "#fef08a";
      ctx.shadowBlur = 8;
      ctx.beginPath();
      const zPhase = Math.floor(now * 0.02) % 4;
      if (zPhase === 0) {
        ctx.moveTo(-11, -18); ctx.lineTo(-16, -22); ctx.lineTo(-12, -26); ctx.lineTo(-18, -30);
      } else if (zPhase === 1) {
        ctx.moveTo(11, -15); ctx.lineTo(17, -20); ctx.lineTo(13, -25); ctx.lineTo(19, -28);
      } else {
        ctx.moveTo(0, -23); ctx.lineTo(-4, -30); ctx.lineTo(4, -34);
      }
      ctx.stroke();
      ctx.restore();
    }

    // 6. Legendary: Guardian Shield (Golden Winged Aegis with Cross Emblem)
    if (hasSkill("guardian_shield") || hasSkill("guardian shield")) {
      ctx.save();
      const gsBob = Math.sin(now * 0.0027) * 3;
      ctx.translate(drawW * 0.34, -drawH * 0.45 + gsBob);
      ctx.shadowColor = "#fbbf24";
      ctx.shadowBlur = 14;

      const gsGrad = ctx.createLinearGradient(-12, -18, 12, 18);
      gsGrad.addColorStop(0, "#fef08a");
      gsGrad.addColorStop(0.5, "#f59e0b");
      gsGrad.addColorStop(1, "#b45309");
      ctx.fillStyle = gsGrad;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.5;

      ctx.beginPath();
      ctx.moveTo(0, -18);
      ctx.lineTo(14, -12);
      ctx.lineTo(12, 6);
      ctx.lineTo(0, 18);
      ctx.lineTo(-12, 6);
      ctx.lineTo(-14, -12);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Wings
      ctx.fillStyle = "#fef9c3";
      ctx.beginPath();
      ctx.moveTo(-14, -8); ctx.lineTo(-22, -15); ctx.lineTo(-16, 2); ctx.closePath();
      ctx.moveTo(14, -8); ctx.lineTo(22, -15); ctx.lineTo(16, 2); ctx.closePath();
      ctx.fill();

      // Cross
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(-2, -9, 4, 16);
      ctx.fillRect(-7, -4, 14, 4);
      ctx.restore();
    } else if (hasSkill("shield")) {
      // Common Shield (Cyan Translucent Energy Aegis)
      ctx.save();
      const csBob = Math.sin(now * 0.0025) * 2.5;
      ctx.translate(drawW * 0.32, -drawH * 0.42 + csBob);
      ctx.shadowColor = "#38bdf8";
      ctx.shadowBlur = 12;
      ctx.fillStyle = "rgba(56, 189, 248, 0.45)";
      ctx.strokeStyle = "#bae6fd";
      ctx.lineWidth = 2.0;

      ctx.beginPath();
      ctx.moveTo(0, -15);
      ctx.lineTo(12, -8);
      ctx.lineTo(10, 8);
      ctx.lineTo(0, 15);
      ctx.lineTo(-10, 8);
      ctx.lineTo(-12, -8);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // 7. Legendary: Magic Book (Open Mystical Grimoire with Fluttering Pages & Stars)
    if (hasSkill("magic_book") || hasSkill("magic book")) {
      ctx.save();
      const mbBob = Math.sin(now * 0.0022) * 4;
      ctx.translate(-drawW * 0.32, -drawH * 0.45 + mbBob);
      ctx.rotate(-0.15);
      ctx.shadowColor = "#c084fc";
      ctx.shadowBlur = 15;

      ctx.fillStyle = "#581c87";
      ctx.strokeStyle = "#e9d5ff";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.roundRect(-14, -10, 28, 20, 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#f5f3ff";
      ctx.beginPath();
      ctx.moveTo(-1, -8); ctx.lineTo(-12, -7); ctx.lineTo(-12, 7); ctx.lineTo(-1, 8);
      ctx.lineTo(12, 7); ctx.lineTo(12, -7); ctx.lineTo(1, -8);
      ctx.fill();

      // Magic Runes
      ctx.fillStyle = "#a855f7";
      ctx.fillRect(-9, -3, 6, 1.5);
      ctx.fillRect(-9, 1, 6, 1.5);
      ctx.fillRect(3, -3, 6, 1.5);
      ctx.fillRect(3, 1, 6, 1.5);

      // Star sparkle
      const starScale = 0.8 + Math.sin(now * 0.006) * 0.3;
      ctx.fillStyle = "#ffffff";
      ctx.shadowColor = "#c084fc";
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(0, -15, 2.5 * starScale, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 8. Legendary: Fireball (Front Orbit of 3D Orbiting Fireballs)
    if (hasSkill("fireball")) {
      const orbAngle = (now * 0.0035);
      const z1 = Math.sin(orbAngle);
      const z2 = Math.sin(orbAngle + Math.PI);
      const drawOrb = (ang) => {
        const ox = Math.cos(ang) * drawW * 0.48;
        const oy = -drawH * 0.45 + Math.sin(ang) * 12;
        ctx.save();
        ctx.translate(ox, oy);
        ctx.shadowColor = "#f97316";
        ctx.shadowBlur = 14;
        const fGrad = ctx.createRadialGradient(0, 0, 1, 0, 0, 6);
        fGrad.addColorStop(0, "#ffffff");
        fGrad.addColorStop(0.4, "#fde047");
        fGrad.addColorStop(1, "#ea580c");
        ctx.fillStyle = fGrad;
        ctx.beginPath();
        ctx.arc(0, 0, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      };
      if (z1 >= 0) drawOrb(orbAngle);
      if (z2 >= 0) drawOrb(orbAngle + Math.PI);
    }

    // 9. Legendary / Common: Tornado / Vortex (Mini Twisters Flanking Capy)
    if (hasSkill("tornado") || hasSkill("vortex")) {
      ctx.save();
      ctx.strokeStyle = "rgba(186, 230, 253, 0.75)";
      ctx.lineWidth = 1.5;
      const swirl = (now * 0.015);
      [-drawW * 0.42, drawW * 0.42].forEach(offsetSide => {
        ctx.beginPath();
        for (let l = 0; l < 4; l++) {
          const ly = -l * 5;
          const lw = 4 + l * 3.5;
          const lx = offsetSide + Math.sin(swirl + l) * 3;
          ctx.ellipse(lx, ly, lw, 2, 0, 0, Math.PI * 2);
        }
        ctx.stroke();
      });
      ctx.restore();
    }

    // 10. Common: Bomb (Round Bomb with Sparking Fuse)
    if (hasSkill("bomb")) {
      ctx.save();
      ctx.translate(drawW * 0.38, -6);
      ctx.fillStyle = "#1e293b";
      ctx.strokeStyle = "#475569";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(0, 0, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#94a3b8";
      ctx.fillRect(-2, -9, 4, 3);

      ctx.strokeStyle = "#f59e0b";
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.moveTo(0, -9);
      ctx.quadraticCurveTo(3, -13, 1, -15);
      ctx.stroke();

      ctx.fillStyle = "#ef4444";
      ctx.beginPath();
      ctx.arc(1 + (Math.random() * 2 - 1), -15 + (Math.random() * 2 - 1), 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 11. Legendary / Common: Earthquake / Rock (Floating Jagged Stone Shards near feet)
    if (hasSkill("earthquake") || hasSkill("rock")) {
      ctx.save();
      ctx.fillStyle = "#78716c";
      ctx.strokeStyle = "#a8a29e";
      ctx.lineWidth = 1.0;
      const stoneBob = Math.sin(now * 0.004) * 2;
      [
        { x: -drawW * 0.35, y: -8 + stoneBob, s: 4 },
        { x: drawW * 0.32, y: -10 - stoneBob, s: 5 },
        { x: 0, y: -4 + stoneBob * 0.5, s: 3.5 }
      ].forEach(st => {
        ctx.beginPath();
        ctx.arc(st.x, st.y, st.s, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });
      ctx.restore();
    }

    // 12. Mythic: Black Hole / Cosmic Crystal Sword (Pedang Kristal Kosmik Besar Sesuai Video)
    const hasBlackHole = (hasSkill("black_hole") || (p.currentAnim === "black_hole") || (p.swordAction) || (p.skillExpression && p.skillExpression !== "normal")) && p.currentAnim !== "dragon_roar";
    if (hasBlackHole) {
      ctx.save();
      const swordBob = Math.sin(now * 0.003) * 1.8;
      // In normal idle/walk: rest comfortably beside Capy's body, NOT piercing his face or chest!
      let swordX = drawW * 0.35;
      let swordY = -drawH * 0.42 + swordBob;
      let swordRot = 0.22; // Natural upright tilt beside Capy (matching Idle 2 stance)

      if (p.swordAction === "slash") {
        swordX = drawW * 0.30;
        swordY = -drawH * 0.08;
        swordRot = 1.35; // Slashing forward
      } else if (p.swordAction === "cast") {
        swordX = drawW * 0.16;
        swordY = -drawH * 0.28;
        swordRot = 0.15; // Pointing forward/up
      } else if (p.swordAction === "absorb") {
        swordX = drawW * 0.12;
        swordY = -drawH * 0.15;
        swordRot = 0.75; // Low diagonal absorb
      } else if (p.swordAction === "ready") {
        swordX = drawW * 0.24;
        swordY = -drawH * 0.26;
        swordRot = 0.35;
      }

      ctx.translate(swordX, swordY);
      ctx.rotate(swordRot + (p.waddleAngle || 0) * 0.5);
      ctx.scale(1.05, 1.05);

      // Intense Purple Crystal Bloom Glow (Matching Video)
      ctx.shadowColor = "#d946ef";
      ctx.shadowBlur = 18;

      // Dark Pommel & Grip with Golden Ring Bindings
      ctx.fillStyle = "#1e1b4b";
      ctx.strokeStyle = "#312e81";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.roundRect(-2.2, 5, 4.4, 12, 1.2);
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = "#fbbf24";
      ctx.lineWidth = 0.9;
      for (let gy = 7; gy <= 15; gy += 3) {
        ctx.beginPath();
        ctx.moveTo(-2.2, gy);
        ctx.lineTo(2.2, gy);
        ctx.stroke();
      }

      // Faceted Octagonal Amethyst Pommel
      ctx.fillStyle = "#a855f7";
      ctx.strokeStyle = "#fbbf24";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(0, 19, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#f5d0fe";
      ctx.beginPath();
      ctx.arc(-0.8, 17.8, 1.2, 0, Math.PI * 2);
      ctx.fill();

      // Winged Royal Crossguard with Golden Quillons
      ctx.fillStyle = "#581c87";
      ctx.strokeStyle = "#fbbf24";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(-14, 5);
      ctx.lineTo(-7, 3);
      ctx.lineTo(0, 4.2);
      ctx.lineTo(7, 3);
      ctx.lineTo(14, 5);
      ctx.lineTo(8, 7.5);
      ctx.lineTo(0, 6.2);
      ctx.lineTo(-8, 7.5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Central Gem Socket on Crossguard
      ctx.fillStyle = "#d946ef";
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.arc(0, 5, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Large Faceted Crystal Blade (Length 44px, Width 14px)
      // Left Facet (Light-reflecting crystalline lavender)
      const leftGrad = ctx.createLinearGradient(-7, -44, 0, 4);
      leftGrad.addColorStop(0, "#ffffff");
      leftGrad.addColorStop(0.25, "#f5d0fe");
      leftGrad.addColorStop(0.7, "#d946ef");
      leftGrad.addColorStop(1, "#a855f7");
      ctx.fillStyle = leftGrad;
      ctx.beginPath();
      ctx.moveTo(0, -44); // Tip
      ctx.lineTo(0, 4);
      ctx.lineTo(-5.5, 3.5);
      ctx.lineTo(-6.8, -30);
      ctx.closePath();
      ctx.fill();

      // Right Facet (Deep royal crystal violet)
      const rightGrad = ctx.createLinearGradient(0, -44, 7, 4);
      rightGrad.addColorStop(0, "#fdf4ff");
      rightGrad.addColorStop(0.25, "#e879f9");
      rightGrad.addColorStop(0.7, "#9333ea");
      rightGrad.addColorStop(1, "#6b21a8");
      ctx.fillStyle = rightGrad;
      ctx.beginPath();
      ctx.moveTo(0, -44); // Tip
      ctx.lineTo(6.8, -30);
      ctx.lineTo(5.5, 3.5);
      ctx.lineTo(0, 4);
      ctx.closePath();
      ctx.fill();

      // Outer Blade Sharp Edge Outline
      ctx.strokeStyle = "rgba(255, 255, 255, 0.95)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(0, -44);
      ctx.lineTo(-6.8, -30);
      ctx.lineTo(-5.5, 3.5);
      ctx.lineTo(0, 4);
      ctx.lineTo(5.5, 3.5);
      ctx.lineTo(6.8, -30);
      ctx.closePath();
      ctx.stroke();

      // Central Ridge Line (Blinding white-hot diamond beam)
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(0, -44);
      ctx.lineTo(0, 4);
      ctx.stroke();

      // Star sparkle on tip
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(0, -44, 2.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  // --- Dynamic Skill Combat Animations (Meteor Strike, Dragon Roar, Singularity, etc.) ---

  renderSkillCombatEffects() {
    const ctx = this.ctx;
    ctx.save();
    for (const fx of this.skillCombatEffects) {
      try {
        if (fx.render) fx.render(ctx);
      } catch (err) {
        console.error("renderSkillCombatEffects error:", err);
      }
    }
    ctx.restore();
  }

  launchMeteorStrike(targetX, targetY, onHit, onComplete = null, speedMult = 1.0) {
    const duration = 380 / speedMult;
    const startX = targetX + 160;
    const startY = -90;
    let hitTriggered = false;

    this.skillCombatEffects.push({
      startTime: performance.now(),
      duration: duration + 250,
      update: (progress) => {
        if (progress >= (duration / (duration + 250)) && !hitTriggered) {
          hitTriggered = true;
          this.playerState.shake = 1.8;
          if (this.enemyState) {
            this.enemyState.shake = 2.5;
            this.enemyState.flashWhite = 1.0;
          }
          Sound.playSfx("magicBurst");
          Sound.playSfx("attackHeavy");
          this.addVisualEffect("critBurst", targetX, targetY - 30, 2.2);
          this.addMagicImpactSparks(targetX, targetY - 30, ["#f97316", "#ef4444", "#fde047", "#ffffff"]);
          if (onHit) onHit();
        }
      },
      render: (ctx) => {
        const now = performance.now();
        const elapsed = now - (this.skillCombatEffects.find(f => f.update)?.startTime || now);
        const p = Math.min(1, elapsed / duration);

        if (p < 1) {
          // Descending Meteor
          const mx = startX + (targetX - startX) * p;
          const my = startY + (targetY - startY) * p;

          // Fiery Smoke Tail
          ctx.save();
          const tGrad = ctx.createLinearGradient(mx, my, mx + 50, my - 60);
          tGrad.addColorStop(0, "rgba(253, 224, 71, 0.9)");
          tGrad.addColorStop(0.3, "rgba(249, 115, 22, 0.7)");
          tGrad.addColorStop(0.8, "rgba(120, 53, 15, 0.4)");
          tGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
          ctx.fillStyle = tGrad;
          ctx.beginPath();
          ctx.moveTo(mx - 15, my - 5);
          ctx.lineTo(mx + 60, my - 70);
          ctx.lineTo(mx + 70, my - 50);
          ctx.lineTo(mx + 5, my + 15);
          ctx.closePath();
          ctx.fill();

          // Blazing Meteor Core
          ctx.shadowColor = "#f97316";
          ctx.shadowBlur = 24;
          const mGrad = ctx.createRadialGradient(mx, my, 2, mx, my, 18);
          mGrad.addColorStop(0, "#ffffff");
          mGrad.addColorStop(0.3, "#fde047");
          mGrad.addColorStop(0.7, "#ea580c");
          mGrad.addColorStop(1, "#78350f");
          ctx.fillStyle = mGrad;
          ctx.beginPath();
          ctx.arc(mx, my, 18, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        } else {
          // Ground Fiery Shockwave Ring
          const postP = Math.min(1, (elapsed - duration) / 250);
          ctx.save();
          ctx.globalAlpha = Math.max(0, 1 - postP);
          ctx.strokeStyle = "#f97316";
          ctx.lineWidth = 4 * (1 - postP);
          ctx.shadowColor = "#fde047";
          ctx.shadowBlur = 18;
          ctx.beginPath();
          ctx.ellipse(targetX, targetY, 70 * postP, 25 * postP, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
      },
      onComplete: () => {
        if (onComplete) onComplete();
      }
    });
  }

  launchDragonBreath(startX, startY, targetX, targetY, onHit, onComplete = null, speedMult = 1.0) {
    const totalDuration = 1600 / speedMult;
    let hitTriggered = false;
    let roarTriggered = false;
    let breathSoundTriggered = false;

    // Trigger dragon_roar 12-frame sprite animation on Capybara
    this.setPlayerAnim("dragon_roar", false);
    if (this.playerState) {
      this.playerState.frameIndex = 0;
      this.playerState.frameTimer = 0;
      this.playerState.fps = (12 / (totalDuration / 1000));
    }

    // Play initial flame charge sound
    Sound.playSfx("fire");

    const effectStart = performance.now();

    this.skillCombatEffects.push({
      startTime: effectStart,
      duration: totalDuration,
      update: (progress, elapsed) => {
        // Sync Capy's frame index directly to progress
        if (this.playerState && this.playerState.currentAnim === "dragon_roar") {
          const currentFrame = Math.min(11, Math.floor(progress * 12));
          this.playerState.frameIndex = currentFrame;
        }

        // At progress 0.45 (Frame 6 - Dragon Breath surge):
        if (progress >= 0.45 && !breathSoundTriggered) {
          breathSoundTriggered = true;
          Sound.playSfx("fire");
        }

        // At progress 0.58 (Frame 7 - Ancient Dragon avatar descent & roar):
        if (progress >= 0.58 && !roarTriggered) {
          roarTriggered = true;
          Sound.playSfx("bossRoar");
          this.addScreenShake(8, 300 / speedMult);
        }

        // At progress 0.68 (Frame 8 - Cataclysmic explosion impact on enemy):
        if (progress >= 0.68 && !hitTriggered) {
          hitTriggered = true;
          if (this.enemyState) {
            this.enemyState.flashWhite = 1.0;
            this.enemyState.shake = 3.5;
            this.enemyState.knockback = 28;
          }
          this.addScreenShake(14, 450 / speedMult);
          this.addVisualEffect("critBurst", targetX, targetY - 20, 2.5);
          this.addMagicImpactSparks(targetX, targetY - 20, ["#ff2200", "#f97316", "#fde047", "#ffffff"]);
          if (onHit) onHit();
        }
      },
      render: (ctx) => {
        const now = performance.now();
        const elapsed = now - effectStart;
        const progress = Math.min(1, Math.max(0, elapsed / totalDuration));

        // 1. Phase 3: Fire breath beam from Capy to enemy (progress 0.42 to 0.64)
        if (progress >= 0.42 && progress <= 0.64) {
          const bp = (progress - 0.42) / 0.22;
          const beamAlpha = Math.sin(bp * Math.PI);
          ctx.save();
          ctx.globalAlpha = beamAlpha;

          // Fiery energy cone
          const coneGrad = ctx.createLinearGradient(startX + 15, startY, targetX, targetY);
          coneGrad.addColorStop(0, "rgba(255, 255, 255, 0.95)");
          coneGrad.addColorStop(0.2, "rgba(254, 240, 138, 0.9)");
          coneGrad.addColorStop(0.6, "rgba(249, 115, 22, 0.85)");
          coneGrad.addColorStop(1, "rgba(220, 38, 38, 0.4)");
          ctx.fillStyle = coneGrad;
          ctx.shadowColor = "#f97316";
          ctx.shadowBlur = 24;

          const beamReach = startX + (targetX - startX) * Math.min(1, bp * 1.6);
          const spread = 40 * Math.sin(bp * Math.PI);
          ctx.beginPath();
          ctx.moveTo(startX + 28, startY + 5);
          ctx.lineTo(beamReach, targetY - spread);
          ctx.lineTo(beamReach, targetY + spread);
          ctx.closePath();
          ctx.fill();

          // Fiery lightning streaks within the breath
          ctx.strokeStyle = "#fef08a";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(startX + 25, startY + 5);
          for (let step = 0; step < 5; step++) {
            const sx = startX + 25 + (beamReach - startX - 25) * (step / 5);
            const sy = startY + (Math.random() * 20 - 10);
            ctx.lineTo(sx, sy);
          }
          ctx.stroke();
          ctx.restore();
        }

        // 2. Phase 4: Full Ancient Red Dragon Avatar (Frame 07) Overhead in the Sky (progress 0.55 to 0.74)
        if (progress >= 0.55 && progress <= 0.74) {
          const dp = (progress - 0.55) / 0.19;
          const dragonAlpha = Math.sin(dp * Math.PI);
          const imgDragon = this.dragonRoarAssets?.frame07Dragon || (this.playerAnimations.dragon_roar && this.playerAnimations.dragon_roar[6]);
          if (imgDragon && imgDragon.complete) {
            ctx.save();
            ctx.globalAlpha = Math.min(1, dragonAlpha * 1.25);
            ctx.shadowColor = "#f97316";
            ctx.shadowBlur = 35;

            // Grand Dragon apparition floating majestic overhead between Capy and Enemy
            const midX = (startX + targetX) * 0.5;
            const midY = this.groundY - 110;
            const dScale = 2.0 + Math.sin(dp * Math.PI) * 0.25;
            const dw = 85 * dScale;
            const dh = 85 * dScale;

            ctx.drawImage(imgDragon, midX - dw / 2, midY - dh / 2, dw, dh);
            ctx.restore();
          }
        }

        // 3. Phase 5: Massive Cataclysmic Blast & Impact (Frame 08) on Enemy (progress 0.66 to 0.82)
        if (progress >= 0.66 && progress <= 0.82) {
          const expP = (progress - 0.66) / 0.16;
          const expAlpha = Math.sin(expP * Math.PI);
          const imgBlast = this.dragonRoarAssets?.frame08Blast || (this.playerAnimations.dragon_roar && this.playerAnimations.dragon_roar[7]);
          if (imgBlast && imgBlast.complete) {
            ctx.save();
            ctx.globalAlpha = Math.min(1, expAlpha * 1.3);
            ctx.shadowColor = "#ff4500";
            ctx.shadowBlur = 40;

            const bScale = 1.8 + expP * 0.5;
            const bw = 85 * bScale;
            const bh = 85 * bScale;

            ctx.drawImage(imgBlast, targetX - bw / 2, targetY - bh * 0.55, bw, bh);

            // Ground Shockwave Expanding Ring
            ctx.strokeStyle = "#facc15";
            ctx.lineWidth = 5 * (1 - expP);
            ctx.beginPath();
            ctx.ellipse(targetX, this.groundY, 90 * expP, 28 * expP, 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
          }
        }

        // 4. Phase 6: Smoking Crater & Debris (Frame 09) on Enemy (progress 0.78 to 0.90)
        if (progress >= 0.78 && progress <= 0.90) {
          const crP = (progress - 0.78) / 0.12;
          const crAlpha = 1 - crP;
          const imgCrater = this.dragonRoarAssets?.frame09Crater || (this.playerAnimations.dragon_roar && this.playerAnimations.dragon_roar[8]);
          if (imgCrater && imgCrater.complete) {
            ctx.save();
            ctx.globalAlpha = crAlpha * 0.85;
            const cw = 85 * 1.5;
            const ch = 85 * 1.5;
            ctx.drawImage(imgCrater, targetX - cw / 2, targetY - ch * 0.5, cw, ch);
            ctx.restore();
          }
        }
      },
      onComplete: () => {
        this.setPlayerAnim("idle", true);
        if (onComplete) onComplete();
      }
    });
  }

  launchBlackHole(targetX, targetY, onHit, onComplete = null, speedMult = 1.0) {
    const duration = 1500 / speedMult;
    let hitTriggered = false;

    // Trigger casting animation on Capybara
    this.setPlayerAnim("skill", false);

    // Positions in arena
    const startX = this.playerState.x + 35;
    const startY = this.groundY - 45;
    const finalHoleX = targetX - 25;
    const finalHoleY = targetY - 25;

    // 7 Storyboard Scenes from Video Reference & Interactive Preview
    const scenes = [
      { start: 0.00, end: 0.15, title: "Phase 1: Void Awaken", dialogue: "Saksikan kekuatan VOID!" },
      { start: 0.15, end: 0.28, title: "Phase 2: Dimensional Rift Slash", dialogue: "Tebasan Dimensi!" },
      { start: 0.28, end: 0.48, title: "Phase 3: Singularity Comet Launch", dialogue: "Rasakan lubang hitam!" },
      { start: 0.48, end: 0.72, title: "Phase 4: Event Horizon Gravitational Vortex", dialogue: "Hancurlah!" },
      { start: 0.72, end: 0.78, title: "Phase 5: Cosmic Implosion", dialogue: "Titik Singularitas..." },
      { start: 0.78, end: 0.88, title: "Phase 6: SUPERNOVA EXPLOSION!", dialogue: "LEDAKAN SUPERNOVA!" },
      { start: 0.88, end: 1.00, title: "Phase 7: Void Settle and Stardust Drift", dialogue: "Kedamaian kosmik kembali..." }
    ];

    // 8 Orbiting Asteroid Boulders with 3D elliptical orbit (Clean procedural vector)
    const asteroids = [];
    for (let i = 0; i < 8; i++) {
      asteroids.push({
        angle: (i / 8) * Math.PI * 2,
        radius: 55 + (i % 3) * 18,
        speed: 0.05 + (i % 3) * 0.02,
        size: 5 + (i % 4) * 2.2,
        color: ["#64748b", "#475569", "#78716c", "#57534e"][i % 4]
      });
    }

    // Branching Lightning Arcs across accretion rim
    const lightnings = [];
    for (let i = 0; i < 6; i++) {
      lightnings.push({
        angle: (i / 6) * Math.PI * 2,
        length: 42 + (i % 2) * 16
      });
    }

    // Drifting Stardust Petals for Phase 7
    const stardustPetals = [];
    for (let i = 0; i < 35; i++) {
      stardustPetals.push({
        x: (Math.random() - 0.5) * 360,
        y: (Math.random() - 0.5) * 180,
        vx: (Math.random() - 0.5) * 0.8,
        vy: Math.random() * 0.8 + 0.3,
        size: Math.random() * 3 + 1.5,
        color: ["#c084fc", "#e879f9", "#38bdf8", "#f5d0fe"][i % 4],
        alpha: Math.random() * 0.6 + 0.4
      });
    }

    const startTime = performance.now();

    this.skillCombatEffects.push({
      startTime: startTime,
      duration: duration,
      update: (progress) => {
        // Player choreography matching video & preview
        if (progress < 0.15) {
          // Phase 1: Void Awaken
          if (this.playerState.currentAnim !== "skill") this.setPlayerAnim("skill", true);
          this.playerState.swordAction = "ready";
          this.playerState.skillExpression = "void_eye";
        } else if (progress < 0.28) {
          // Phase 2: Dimensional Rift Slash
          if (this.playerState.currentAnim !== "attack") this.setPlayerAnim("attack", false);
          this.playerState.swordAction = "slash";
          this.playerState.skillExpression = "slash_squint";
        } else if (progress < 0.75) {
          // Phase 3 & 4: Singularity Launch & Event Horizon
          if (this.playerState.currentAnim !== "skill") this.setPlayerAnim("skill", false);
          this.playerState.swordAction = "cast";
          this.playerState.skillExpression = "void_eye";

          // Gravitational suction pull on enemy monster
          if (progress >= 0.48 && progress < 0.72 && this.enemyState) {
            this.enemyState.knockback = -12 * ((progress - 0.48) / 0.24);
            this.enemyState.shake = 3.5;
          }
        } else {
          // Phase 7: Settle & recovery
          if (this.playerState.currentAnim !== "idle") this.setPlayerAnim("idle", true);
          this.playerState.swordAction = "ready";
          this.playerState.skillExpression = "peaceful_relief";
          if (this.enemyState && progress >= 0.88) {
            this.enemyState.knockback = 0;
            this.enemyState.shake = 0;
          }
        }

        // Supernova Implosion / Detonation at progress 0.78
        if (progress >= 0.78 && !hitTriggered) {
          hitTriggered = true;
          Sound.playSfx("magicBurst");
          Sound.playSfx("bossRoar");
          Sound.playSfx("attackHeavy");
          this.triggerScreenShake(2.5);
          if (this.enemyState) {
            this.enemyState.flashWhite = 1.0;
            this.enemyState.shake = 8.0;
            this.enemyState.knockback = 28;
            setTimeout(() => { if (this.enemyState) this.enemyState.knockback = 0; }, 260 / speedMult);
          }
          this.addVisualEffect("critBurst", finalHoleX, finalHoleY, 3.2);
          this.addMagicImpactSparks(finalHoleX, finalHoleY, ["#c084fc", "#9333ea", "#38bdf8", "#fde047", "#ffffff", "#030712"]);
          this.addGroundSlashFissure(finalHoleX, this.groundY, "#a855f7");
          try {
            if (onHit) onHit();
          } catch (err) {
            console.error("Black Hole onHit error:", err);
          }
        }
      },
      render: (ctx) => {
        const now = performance.now();
        const elapsed = now - startTime;
        const p = Math.min(1, elapsed / duration);
        const currScene = scenes.find(s => p >= s.start && p < s.end) || scenes[scenes.length - 1];

        // 1. Cosmic Void Nebula Screen Vignette
        ctx.save();
        const dimAlpha = Math.sin(p * Math.PI) * 0.72;
        const screenGrad = ctx.createRadialGradient(finalHoleX, finalHoleY, 20, finalHoleX, finalHoleY, this.width * 0.85);
        screenGrad.addColorStop(0, `rgba(12, 4, 28, ${dimAlpha * 0.95})`);
        screenGrad.addColorStop(0.5, `rgba(8, 2, 20, ${dimAlpha * 0.7})`);
        screenGrad.addColorStop(1, `rgba(2, 0, 8, ${dimAlpha * 0.4})`);
        ctx.fillStyle = screenGrad;
        ctx.fillRect(-20, -20, this.width + 40, this.height + 40);
        ctx.restore();

        // 2. Void Ground Energy Flames under Capy (Phase 1, 0.00 - 0.20)
        if (p < 0.20) {
          const flameIntensity = p < 0.08 ? (p / 0.08) : (1 - (p - 0.08) / 0.12);
          ctx.save();
          ctx.translate(this.playerState.x, this.groundY - 6);

          ctx.save();
          ctx.scale(1, 0.32);
          const auraGrad = ctx.createRadialGradient(0, 0, 10, 0, 0, 52 * flameIntensity);
          auraGrad.addColorStop(0, "rgba(168, 85, 247, 0.85)");
          auraGrad.addColorStop(0.5, "rgba(88, 28, 135, 0.65)");
          auraGrad.addColorStop(1, "rgba(3, 7, 18, 0)");
          ctx.fillStyle = auraGrad;
          ctx.beginPath();
          ctx.arc(0, 0, 52 * flameIntensity, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();

          ctx.shadowColor = "#c084fc";
          ctx.shadowBlur = 12 * flameIntensity;
          const tendrilCount = 7;
          for (let i = 0; i < tendrilCount; i++) {
            const tAngle = (i / tendrilCount) * Math.PI * 2;
            const wave = Math.sin(now * 0.008 + i * 1.3);
            const fx = Math.cos(tAngle) * (26 * flameIntensity);
            const fy = Math.sin(tAngle) * (8 * flameIntensity);
            const fHeight = (18 + wave * 8) * flameIntensity;

            ctx.save();
            ctx.translate(fx, fy);
            const fGrad = ctx.createLinearGradient(0, 0, 0, -fHeight);
            fGrad.addColorStop(0, "rgba(88, 28, 135, 0.85)");
            fGrad.addColorStop(0.6, "rgba(168, 85, 247, 0.75)");
            fGrad.addColorStop(1, "rgba(245, 208, 254, 0)");
            ctx.fillStyle = fGrad;

            ctx.beginPath();
            ctx.moveTo(-4, 0);
            ctx.quadraticCurveTo(-2 + wave * 2, -fHeight * 0.6, wave * 3, -fHeight);
            ctx.quadraticCurveTo(2 + wave * 2, -fHeight * 0.6, 4, 0);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
          }
          ctx.restore();
        }

        // 3. Crescent Slash Arc (Phase 2, 0.15 - 0.28)
        if (p >= 0.15 && p < 0.28) {
          const sp = (p - 0.15) / 0.13;
          const sAlpha = Math.sin(sp * Math.PI);
          ctx.save();
          ctx.translate(this.playerState.x + 28, this.groundY - 40);
          ctx.rotate(-0.25 + sp * 0.5);
          ctx.globalAlpha = sAlpha;
          ctx.shadowColor = "#f0abfc";
          ctx.shadowBlur = 24;
          ctx.strokeStyle = "rgba(232, 121, 249, 0.95)";
          ctx.lineWidth = 14 * sAlpha;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.arc(0, 0, 52, -Math.PI * 0.6, Math.PI * 0.35);
          ctx.stroke();

          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 4.5 * sAlpha;
          ctx.beginPath();
          ctx.arc(0, 0, 52, -Math.PI * 0.55, Math.PI * 0.3);
          ctx.stroke();
          ctx.restore();
        }

        // 4. Diamond Dimensional Rift Portal (Phase 2 & 3, 0.20 - 0.38)
        if (p >= 0.20 && p < 0.38) {
          let riftScale = 1.0;
          if (p < 0.25) riftScale = (p - 0.20) / 0.05;
          else if (p > 0.32) riftScale = 1 - (p - 0.32) / 0.06;

          ctx.save();
          ctx.translate(this.playerState.x + 54, this.groundY - 45);
          ctx.scale(riftScale, riftScale);
          ctx.shadowColor = "#d946ef";
          ctx.shadowBlur = 28;

          ctx.strokeStyle = "#c084fc";
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(0, -68); ctx.lineTo(16, 0); ctx.lineTo(0, 68); ctx.lineTo(-16, 0);
          ctx.closePath();
          ctx.stroke();

          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 2.0;
          ctx.beginPath();
          ctx.moveTo(0, -65); ctx.lineTo(14, 0); ctx.lineTo(0, 65); ctx.lineTo(-14, 0);
          ctx.closePath();
          ctx.stroke();

          ctx.fillStyle = "#030712";
          ctx.fill();

          ctx.strokeStyle = "#f5d0fe";
          ctx.lineWidth = 1.2;
          for (let i = 0; i < 4; i++) {
            const sAngle = (i / 4) * Math.PI * 2 + now * 0.01;
            const sx = Math.cos(sAngle) * 14;
            const sy = Math.sin(sAngle) * 45;
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(sx + Math.sin(now * 0.02 + i) * 8, sy + Math.cos(now * 0.02 + i) * 6);
            ctx.stroke();
          }
          ctx.restore();
        }

        // 5. BLACK HOLE LAUNCH & VORTEX (Phase 3, 4, 5, 6)
        if (p >= 0.28 && p < 0.88) {
          let currHoleX = finalHoleX;
          let currHoleY = finalHoleY;

          // Phase 3 (0.28 - 0.48): Comet Flight from Rift to Enemy
          if (p < 0.48) {
            const flyP = (p - 0.28) / 0.20;
            const flyEase = 1 - Math.pow(1 - flyP, 3);
            const startHoleX = this.playerState.x + 54;
            const startHoleY = this.groundY - 45;
            currHoleX = startHoleX + (finalHoleX - startHoleX) * flyEase;
            currHoleY = startHoleY + (finalHoleY - startHoleY) * flyEase - Math.sin(flyP * Math.PI) * 22;

            // Streaming Plasma Comet Tail & Zigzag Lightning
            ctx.save();
            ctx.shadowColor = "#c084fc";
            ctx.shadowBlur = 20;

            const tailLen = 65 * flyP;
            const pGrad = ctx.createLinearGradient(currHoleX, currHoleY, currHoleX - tailLen, currHoleY + 6);
            pGrad.addColorStop(0, "rgba(232, 121, 249, 0.95)");
            pGrad.addColorStop(0.5, "rgba(168, 85, 247, 0.65)");
            pGrad.addColorStop(1, "rgba(59, 7, 100, 0)");
            ctx.fillStyle = pGrad;
            ctx.beginPath();
            ctx.moveTo(currHoleX, currHoleY - 14);
            ctx.lineTo(currHoleX - tailLen, currHoleY);
            ctx.lineTo(currHoleX, currHoleY + 14);
            ctx.closePath();
            ctx.fill();

            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 2.2;
            ctx.beginPath();
            ctx.moveTo(currHoleX, currHoleY);
            for (let z = 1; z <= 5; z++) {
              const zx = currHoleX - z * (tailLen / 5);
              const zy = currHoleY + Math.sin(now * 0.03 + z * 1.5) * 10;
              ctx.lineTo(zx, zy);
            }
            ctx.stroke();
            ctx.restore();
          }

          // Phase 4 (0.48 - 0.78): Event Horizon Gravitational Vortex (Video & Screenshot!)
          if (p >= 0.48 && p < 0.78) {
            const vP = p < 0.72 ? 1.0 : (1 - (p - 0.72) / 0.06); // Collapse in Phase 5
            const vortexRadius = 68 * vP;

            ctx.save();
            ctx.translate(currHoleX, currHoleY);

            // Rotating Cosmic Accretion Disk (60 FPS smooth continuous spin)
            ctx.rotate(now * 0.0035);
            ctx.shadowColor = "#a855f7";
            ctx.shadowBlur = 28 * vP;

            // Outer glowing spiral nebula bands
            for (let b = 0; b < 3; b++) {
              const bAngle = (b / 3) * Math.PI * 2;
              const bGrad = ctx.createRadialGradient(0, 0, 16, 0, 0, vortexRadius);
              bGrad.addColorStop(0, "rgba(245, 208, 254, 0.9)");
              bGrad.addColorStop(0.4, "rgba(192, 132, 252, 0.7)");
              bGrad.addColorStop(0.8, "rgba(126, 34, 206, 0.4)");
              bGrad.addColorStop(1, "rgba(3, 7, 18, 0)");
              ctx.fillStyle = bGrad;
              ctx.beginPath();
              ctx.arc(0, 0, vortexRadius, bAngle, bAngle + Math.PI * 0.7);
              ctx.lineTo(0, 0);
              ctx.closePath();
              ctx.fill();
            }

            // Branching Purple Lightning Bolts across rim
            ctx.strokeStyle = "#f5d0fe";
            ctx.lineWidth = 1.8;
            for (let l of lightnings) {
              const lAng = l.angle + now * 0.004;
              const lx1 = Math.cos(lAng) * (vortexRadius * 0.4);
              const ly1 = Math.sin(lAng) * (vortexRadius * 0.4);
              const lx2 = Math.cos(lAng) * vortexRadius;
              const ly2 = Math.sin(lAng) * vortexRadius;
              ctx.beginPath();
              ctx.moveTo(lx1, ly1);
              ctx.lineTo((lx1 + lx2) / 2 + Math.sin(now * 0.03) * 8, (ly1 + ly2) / 2);
              ctx.lineTo(lx2, ly2);
              ctx.stroke();
            }

            // 8 Orbiting Asteroid Boulders sucked in a 3D spiral (Video & Screenshot!)
            for (let ast of asteroids) {
              const aAng = ast.angle + now * ast.speed * 0.05;
              const spiralDist = Math.max(18, ast.radius * vP - Math.sin(now * 0.003) * 6);
              const ax = Math.cos(aAng) * spiralDist;
              const ay = Math.sin(aAng) * (spiralDist * 0.45); // 3D ellipse tilt

              ctx.save();
              ctx.translate(ax, ay);
              ctx.fillStyle = ast.color;
              ctx.strokeStyle = "#1e293b";
              ctx.lineWidth = 1.0;
              ctx.beginPath();
              ctx.arc(0, 0, ast.size, 0, Math.PI * 2);
              ctx.fill();
              ctx.stroke();

              // Asteroid glow
              ctx.fillStyle = "rgba(240, 171, 252, 0.6)";
              ctx.beginPath();
              ctx.arc(-1, -1, ast.size * 0.4, 0, Math.PI * 2);
              ctx.fill();
              ctx.restore();
            }

            ctx.restore();
          }

          // Pitch-black Spherical Core with Radiant Photon Rings (All active phases)
          const coreScale = (p >= 0.72 && p < 0.78) ? (1 - (p - 0.72) / 0.06) : 1.0;
          const coreR = Math.max(4, 20 * coreScale);

          ctx.save();
          ctx.translate(currHoleX, currHoleY);

          // Radiant Photon Ring
          ctx.shadowColor = "#c084fc";
          ctx.shadowBlur = 24;
          ctx.strokeStyle = "#e879f9";
          ctx.lineWidth = 3.5;
          ctx.beginPath();
          ctx.arc(0, 0, coreR + 3, 0, Math.PI * 2);
          ctx.stroke();

          ctx.strokeStyle = "#38bdf8";
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.arc(0, 0, coreR + 1.5, 0, Math.PI * 2);
          ctx.stroke();

          // Pure pitch-black void singularity
          ctx.fillStyle = "#000000";
          ctx.beginPath();
          ctx.arc(0, 0, coreR, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();

          // Phase 5 (0.72 - 0.78): Blinding White-Hot Singularity Star
          if (p >= 0.72 && p < 0.78) {
            const starP = (p - 0.72) / 0.06;
            ctx.save();
            ctx.translate(currHoleX, currHoleY);
            ctx.shadowColor = "#ffffff";
            ctx.shadowBlur = 35;

            ctx.fillStyle = "#ffffff";
            ctx.beginPath();
            ctx.arc(0, 0, 12 + starP * 8, 0, Math.PI * 2);
            ctx.fill();

            // 4-Point Radiant Lens Flare Beams
            ctx.strokeStyle = "rgba(255, 255, 255, 0.95)";
            ctx.lineWidth = 3.0;
            const beamLen = 90 * starP;
            ctx.beginPath();
            ctx.moveTo(-beamLen, 0); ctx.lineTo(beamLen, 0);
            ctx.moveTo(0, -beamLen); ctx.lineTo(0, beamLen);
            ctx.stroke();
            ctx.restore();
          }

          // Phase 6 (0.78 - 0.88): SUPERNOVA EXPLOSION!
          if (p >= 0.78 && p < 0.88) {
            const expP = (p - 0.78) / 0.10;
            ctx.save();
            ctx.translate(currHoleX, currHoleY);

            // 1. Blinding Shockwave Blast Wave Rings
            const blastR = expP * 240;
            ctx.shadowColor = "#fb923c";
            ctx.shadowBlur = 32;

            // Fiery Orange / Yellow Inner Shockwave
            ctx.strokeStyle = `rgba(251, 146, 60, ${1 - expP})`;
            ctx.lineWidth = 14 * (1 - expP);
            ctx.beginPath();
            ctx.arc(0, 0, blastR * 0.75, 0, Math.PI * 2);
            ctx.stroke();

            // Deep Neon Purple Outer Shockwave
            ctx.strokeStyle = `rgba(192, 132, 252, ${1 - expP})`;
            ctx.lineWidth = 8 * (1 - expP);
            ctx.beginPath();
            ctx.arc(0, 0, blastR, 0, Math.PI * 2);
            ctx.stroke();

            // 2. Blinding Core Light Flash
            const coreGrad = ctx.createRadialGradient(0, 0, 5, 0, 0, 75 * (1 - expP));
            coreGrad.addColorStop(0, `rgba(255, 255, 255, ${1 - expP * 0.8})`);
            coreGrad.addColorStop(0.4, `rgba(254, 215, 170, ${0.8 * (1 - expP)})`);
            coreGrad.addColorStop(1, "rgba(168, 85, 247, 0)");
            ctx.fillStyle = coreGrad;
            ctx.beginPath();
            ctx.arc(0, 0, 75 * (1 - expP), 0, Math.PI * 2);
            ctx.fill();

            // 3. Shattering Crystal Shards & Rocks Blasting in 360 degrees
            ctx.lineWidth = 1.5;
            for (let s = 0; s < 18; s++) {
              const sAng = (s / 18) * Math.PI * 2;
              const dist = expP * (110 + (s % 3) * 55);
              const sx = Math.cos(sAng) * dist;
              const sy = Math.sin(sAng) * dist;
              ctx.save();
              ctx.translate(sx, sy);
              ctx.rotate(sAng + expP * 4);
              ctx.fillStyle = s % 2 === 0 ? "#f5d0fe" : "#a855f7";
              ctx.shadowColor = "#d946ef";
              ctx.shadowBlur = 10;
              ctx.beginPath();
              ctx.moveTo(0, -6);
              ctx.lineTo(3.5, 0);
              ctx.lineTo(0, 6);
              ctx.lineTo(-3.5, 0);
              ctx.closePath();
              ctx.fill();
              ctx.restore();
            }

            ctx.restore();
          }
        }

        // Phase 7 (0.85 - 1.00): Void Settle & Drifting Crystal Stardust
        if (p >= 0.85) {
          const settleP = (p - 0.85) / 0.15;
          ctx.save();
          for (let sp of stardustPetals) {
            const sx = finalHoleX + sp.x + sp.vx * settleP * 30;
            const sy = finalHoleY + sp.y + sp.vy * settleP * 45;
            ctx.globalAlpha = sp.alpha * (1 - settleP);
            ctx.fillStyle = sp.color;
            ctx.shadowColor = sp.color;
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(sx, sy, sp.size, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        }

        // 6. Authentic Dialogue Subtitle Box (Matching User's Screenshot!)
        ctx.save();
        const boxX = this.width / 2;
        const boxY = Math.min(this.height - 40, this.groundY + 45);
        ctx.translate(boxX, boxY);
        ctx.font = "bold 13px 'Fredoka', 'Nunito', sans-serif";
        const dialogueText = `"${currScene.dialogue}"`;
        const textWidth = ctx.measureText(dialogueText).width;
        const padX = 16;
        const boxW = Math.max(120, textWidth + padX * 2);
        const boxH = 28;

        ctx.fillStyle = "rgba(8, 3, 18, 0.88)";
        ctx.strokeStyle = "rgba(192, 132, 252, 0.6)";
        ctx.lineWidth = 1.5;
        ctx.shadowColor = "#a855f7";
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.roundRect(-boxW / 2, -boxH / 2, boxW, boxH, boxH / 2);
        ctx.fill();
        ctx.stroke();

        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#f5d0fe";
        ctx.shadowColor = "#e879f9";
        ctx.shadowBlur = 6;
        ctx.fillText(dialogueText, 0, 1);
        ctx.restore();
      },
      onComplete: () => {
        this.playerState.skillExpression = null;
        this.playerState.swordAction = null;
        this.playerState.blackHoleSprite = null;
        if (this.enemyState) {
          this.enemyState.knockback = 0;
          this.enemyState.shake = 0;
        }
        this.setPlayerAnim("idle", true);
        try {
          if (onComplete) onComplete();
        } catch (err) {
          console.error("Black Hole onComplete error:", err);
        }
      }
    });
  }

  launchThunderHammerStrike(targetX, targetY, onHit, onComplete = null, speedMult = 1.0) {
    const duration = 240 / speedMult;
    let hitTriggered = false;

    this.skillCombatEffects.push({
      startTime: performance.now(),
      duration: duration + 100,
      update: (progress) => {
        if (progress >= 0.4 && !hitTriggered) {
          hitTriggered = true;
          Sound.playSfx("lightning");
          if (this.enemyState) {
            this.enemyState.flashWhite = 1.0;
            this.enemyState.shake = 1.8;
          }
          this.addVisualEffect("critBurst", targetX, targetY - 25, 1.8);
          this.addMagicImpactSparks(targetX, targetY - 25, ["#fde047", "#38bdf8", "#ffffff"]);
          if (onHit) onHit();
        }
      },
      render: (ctx) => {
        const now = performance.now();
        const elapsed = now - (this.skillCombatEffects.find(f => f.update)?.startTime || now);
        const p = Math.min(1, elapsed / duration);

        ctx.save();
        ctx.globalAlpha = Math.max(0, 1 - p);
        ctx.strokeStyle = "#fef08a";
        ctx.lineWidth = 3.5;
        ctx.shadowColor = "#38bdf8";
        ctx.shadowBlur = 18;

        ctx.beginPath();
        ctx.moveTo(targetX + 15, -40);
        ctx.lineTo(targetX - 10, targetY * 0.25);
        ctx.lineTo(targetX + 18, targetY * 0.55);
        ctx.lineTo(targetX - 6, targetY * 0.8);
        ctx.lineTo(targetX, targetY);
        ctx.stroke();

        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
      },
      onComplete: () => {
        if (onComplete) onComplete();
      }
    });
  }

  launchTornado(startX, startY, targetX, targetY, onHit, onComplete = null, speedMult = 1.0) {
    const duration = 280 / speedMult;
    let hitTriggered = false;

    this.skillCombatEffects.push({
      startTime: performance.now(),
      duration: duration + 100,
      update: (progress) => {
        if (progress >= 0.9 && !hitTriggered) {
          hitTriggered = true;
          Sound.playSfx("attackLight");
          if (this.enemyState) {
            this.enemyState.shake = 1.5;
            this.enemyState.offsetY = -12;
            setTimeout(() => { if (this.enemyState) this.enemyState.offsetY = 0; }, 140);
          }
          this.addVisualEffect("critBurst", targetX, targetY - 25, 1.4);
          this.addMagicImpactSparks(targetX, targetY - 25, ["#bae6fd", "#e0f2fe", "#ffffff"]);
          if (onHit) onHit();
        }
      },
      render: (ctx) => {
        const now = performance.now();
        const elapsed = now - (this.skillCombatEffects.find(f => f.update)?.startTime || now);
        const p = Math.min(1, elapsed / duration);
        const cx = startX + (targetX - startX) * p;
        const cy = targetY - 25;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.strokeStyle = "rgba(186, 230, 253, 0.85)";
        ctx.lineWidth = 2.0;
        ctx.shadowColor = "#38bdf8";
        ctx.shadowBlur = 12;
        const swirl = now * 0.02;

        for (let l = 0; l < 6; l++) {
          const ly = (l - 3) * 7;
          const lw = 8 + (l + 1) * 4.5;
          ctx.beginPath();
          ctx.ellipse(Math.sin(swirl + l) * 4, ly, lw, 3.5, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
      },
      onComplete: () => {
        if (onComplete) onComplete();
      }
    });
  }

  launchFireball(startX, startY, targetX, targetY, onHit, onComplete = null, speedMult = 1.0) {
    const duration = 250 / speedMult;
    let hitTriggered = false;

    this.skillCombatEffects.push({
      startTime: performance.now(),
      duration: duration + 100,
      update: (progress) => {
        if (progress >= 1 && !hitTriggered) {
          hitTriggered = true;
          Sound.playSfx("magicBurst");
          if (this.enemyState) {
            this.enemyState.flashWhite = 0.8;
            this.enemyState.shake = 1.5;
          }
          this.addVisualEffect("critBurst", targetX, targetY - 20, 1.6);
          this.addMagicImpactSparks(targetX, targetY - 20, ["#f97316", "#ef4444", "#fde047"]);
          if (onHit) onHit();
        }
      },
      render: (ctx) => {
        const now = performance.now();
        const elapsed = now - (this.skillCombatEffects.find(f => f.update)?.startTime || now);
        const p = Math.min(1, elapsed / duration);
        const fx = startX + (targetX - startX) * p;
        const fy = startY + (targetY - startY) * p - Math.sin(p * Math.PI) * 15;

        ctx.save();
        ctx.translate(fx, fy);
        ctx.shadowColor = "#f97316";
        ctx.shadowBlur = 18;
        const fGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, 12);
        fGrad.addColorStop(0, "#ffffff");
        fGrad.addColorStop(0.3, "#fde047");
        fGrad.addColorStop(0.8, "#ea580c");
        fGrad.addColorStop(1, "rgba(220, 38, 38, 0)");
        ctx.fillStyle = fGrad;
        ctx.beginPath();
        ctx.arc(0, 0, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      },
      onComplete: () => {
        if (onComplete) onComplete();
      }
    });
  }

  launchWaterWave(startX, startY, targetX, targetY, onHit, onComplete = null, speedMult = 1.0) {
    const duration = 280 / speedMult;
    let hitTriggered = false;

    this.skillCombatEffects.push({
      startTime: performance.now(),
      duration: duration + 100,
      update: (progress) => {
        if (progress >= 0.9 && !hitTriggered) {
          hitTriggered = true;
          Sound.playSfx("hit");
          if (this.enemyState) {
            this.enemyState.shake = 1.4;
          }
          this.addVisualEffect("iceShatter", targetX, targetY - 20, 1.3);
          this.addMagicImpactSparks(targetX, targetY - 20, ["#38bdf8", "#0284c7", "#bae6fd", "#ffffff"]);
          if (onHit) onHit();
        }
      },
      render: (ctx) => {
        const now = performance.now();
        const elapsed = now - (this.skillCombatEffects.find(f => f.update)?.startTime || now);
        const p = Math.min(1, elapsed / duration);
        const wx = startX + (targetX - startX) * p;

        ctx.save();
        ctx.fillStyle = "rgba(56, 189, 248, 0.75)";
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2.0;
        ctx.shadowColor = "#0284c7";
        ctx.shadowBlur = 14;

        ctx.beginPath();
        ctx.moveTo(wx - 25, targetY);
        ctx.quadraticCurveTo(wx, targetY - 45, wx + 15, targetY - 35);
        ctx.quadraticCurveTo(wx + 25, targetY - 15, wx + 20, targetY);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      },
      onComplete: () => {
        if (onComplete) onComplete();
      }
    });
  }

  launchBombToss(startX, startY, targetX, targetY, onHit, onComplete = null, speedMult = 1.0) {
    const duration = 320 / speedMult;
    let hitTriggered = false;

    this.skillCombatEffects.push({
      startTime: performance.now(),
      duration: duration + 100,
      update: (progress) => {
        if (progress >= 1 && !hitTriggered) {
          hitTriggered = true;
          Sound.playSfx("attackHeavy");
          if (this.enemyState) {
            this.enemyState.flashWhite = 0.9;
            this.enemyState.shake = 1.8;
          }
          this.addVisualEffect("critBurst", targetX, targetY - 20, 1.8);
          this.addMagicImpactSparks(targetX, targetY - 20, ["#f97316", "#ef4444", "#fde047"]);
          if (onHit) onHit();
        }
      },
      render: (ctx) => {
        const now = performance.now();
        const elapsed = now - (this.skillCombatEffects.find(f => f.update)?.startTime || now);
        const p = Math.min(1, elapsed / duration);
        const bx = startX + (targetX - startX) * p;
        const by = startY + (targetY - startY) * p - Math.sin(p * Math.PI) * 65;

        ctx.save();
        ctx.translate(bx, by);
        ctx.rotate(now * 0.015);
        ctx.fillStyle = "#1e293b";
        ctx.strokeStyle = "#94a3b8";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#ef4444";
        ctx.beginPath();
        ctx.arc(0, -9, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      },
      onComplete: () => {
        if (onComplete) onComplete();
      }
    });
  }

  launchMultiArrow(startX, startY, targetX, targetY, onHit, onComplete = null, speedMult = 1.0) {
    const arrows = [-12, 0, 12];
    let hitsCount = 0;

    arrows.forEach((yOff, idx) => {
      setTimeout(() => {
        const duration = 200 / speedMult;
        this.skillCombatEffects.push({
          startTime: performance.now(),
          duration: duration,
          update: (progress) => {
            if (progress >= 1) {
              Sound.playSfx("hit");
              this.addVisualEffect("hitSpark", targetX, targetY + yOff - 20, 0.8);
              hitsCount++;
              if (hitsCount === arrows.length) {
                if (onHit) onHit();
                if (onComplete) onComplete();
              }
            }
          },
          render: (ctx) => {
            const now = performance.now();
            const elapsed = now - (this.skillCombatEffects.find(f => f.update)?.startTime || now);
            const p = Math.min(1, elapsed / duration);
            const ax = startX + (targetX - startX) * p;
            const ay = startY + (targetY + yOff - startY) * p;

            ctx.save();
            ctx.translate(ax, ay);
            ctx.strokeStyle = "#38bdf8";
            ctx.lineWidth = 2.0;
            ctx.shadowColor = "#38bdf8";
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.moveTo(-16, 0);
            ctx.lineTo(8, 0);
            ctx.lineTo(4, -4);
            ctx.moveTo(8, 0);
            ctx.lineTo(4, 4);
            ctx.stroke();
            ctx.restore();
          }
        });
      }, idx * 55 / speedMult);
    });
  }

  launchEarthquake(targetX, targetY, onHit, onComplete = null, speedMult = 1.0) {
    const duration = 300 / speedMult;
    let hitTriggered = false;

    this.skillCombatEffects.push({
      startTime: performance.now(),
      duration: duration + 100,
      update: (progress) => {
        if (progress >= 0.5 && !hitTriggered) {
          hitTriggered = true;
          Sound.playSfx("attackHeavy");
          if (this.enemyState) {
            this.enemyState.flashWhite = 0.8;
            this.enemyState.shake = 1.8;
          }
          this.addVisualEffect("hitSpark", targetX, targetY - 20, 1.4);
          if (onHit) onHit();
        }
      },
      render: (ctx) => {
        const now = performance.now();
        const elapsed = now - (this.skillCombatEffects.find(f => f.update)?.startTime || now);
        const p = Math.min(1, elapsed / duration);
        const spikeHeight = Math.sin(p * Math.PI) * 35;

        ctx.save();
        ctx.fillStyle = "#78716c";
        ctx.strokeStyle = "#d6d3d1";
        ctx.lineWidth = 1.5;

        [-20, -5, 10, 22].forEach((sx, idx) => {
          const h = spikeHeight * (0.7 + (idx % 2) * 0.3);
          ctx.beginPath();
          ctx.moveTo(targetX + sx - 6, targetY);
          ctx.lineTo(targetX + sx, targetY - h);
          ctx.lineTo(targetX + sx + 6, targetY);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        });
        ctx.restore();
      },
      onComplete: () => {
        if (onComplete) onComplete();
      }
    });
  }

  renderEnemy() {
    const ctx = this.ctx;
    const e = this.enemyState;
    if (!e || !e.spriteImg || !e.spriteImg.complete) return;

    ctx.save();

    const natW = e.spriteImg.naturalWidth || 96;
    const natH = e.spriteImg.naturalHeight || 96;
    const drawW = natW * (e.scale / 1.25);
    const drawH = natH * (e.scale / 1.25);

    const hoverOffset = e.isFlyer ? (26 + Math.sin(e.bounceTimer * 2) * 6) : 0;

    let ex = e.x + (e.knockback || 0);
    let ey = this.groundY;

    if (e.shake > 0) {
      ex += (Math.random() * 8 - 4) * e.shake;
      ey += (Math.random() * 6 - 3) * e.shake;
    }

    // 3D Directional Ground Shadow on sandy road
    ctx.beginPath();
    const shadowAlpha = e.isFlyer ? 0.14 : 0.28;
    ctx.ellipse(ex + 4, this.groundY + 1, drawW * 0.36, 8.5, 0.1, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(55, 45, 25, ${shadowAlpha})`;
    ctx.fill();

    // Position actor anchored bottom-center
    ctx.translate(ex, ey - hoverOffset + (e.offsetY || 0));

    if (e.flashWhite > 0) {
      ctx.filter = "brightness(2.5)";
    }

    ctx.drawImage(e.spriteImg, -drawW / 2, -drawH, drawW, drawH);

    ctx.restore();

    // HP Bar
    const hpBarY = this.groundY - hoverOffset + (e.offsetY || 0) - drawH - 12;
    this.renderEnemyHpBar(ex, hpBarY, e);
  }

  renderEnemyHpBar(x, y, e) {
    const ctx = this.ctx;
    const barW = e.isBoss ? 110 : 72;
    const barH = e.isBoss ? 9 : 8;
    const pct = Math.max(0, Math.min(1, e.currentHp / e.maxHp));

    // Smooth lag catchup
    if (e.animHp === undefined) e.animHp = e.currentHp;
    if (Math.abs(e.animHp - e.currentHp) > 0.5) {
      e.animHp += (e.currentHp - e.animHp) * 0.18;
    } else {
      e.animHp = e.currentHp;
    }
    const animPct = Math.max(0, Math.min(1, e.animHp / e.maxHp));

    ctx.save();
    ctx.font = `bold ${e.isBoss ? 12 : 10}px 'Fredoka', 'Nunito', sans-serif`;
    ctx.textAlign = "center";
    ctx.strokeStyle = "rgba(0,0,0,0.9)";
    ctx.lineWidth = 3;
    ctx.strokeText((e.isBoss ? "👑 " : "") + e.name, x, y - 4);
    ctx.fillStyle = e.isBoss ? "#ffd166" : "#ffffff";
    ctx.fillText((e.isBoss ? "👑 " : "") + e.name, x, y - 4);

    ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
    ctx.strokeStyle = "#475569";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(x - barW / 2, y, barW, barH, 3.5);
    ctx.fill();
    ctx.stroke();

    // Damage Lag Chunk (White/Yellow)
    if (animPct > pct) {
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.roundRect(x - barW / 2, y, barW * animPct, barH, 3.5);
      ctx.fill();
    }

    if (pct > 0) {
      const grad = ctx.createLinearGradient(x - barW / 2, 0, x - barW / 2 + barW * pct, 0);
      grad.addColorStop(0, "#ef4444");
      grad.addColorStop(1, "#f97316");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(x - barW / 2, y, barW * pct, barH, 3.5);
      ctx.fill();
    }

    // Numeric HP readout under the bar
    ctx.font = `bold ${e.isBoss ? 10 : 9}px 'Fredoka', 'Nunito', sans-serif`;
    ctx.strokeStyle = "rgba(0,0,0,0.9)";
    ctx.lineWidth = 2.5;
    const hpText = `${Math.max(0, Math.round(e.currentHp))} / ${e.maxHp}`;
    ctx.strokeText(hpText, x, y + barH + 9);
    ctx.fillStyle = e.isBoss ? "#fef08a" : "#f1f5f9";
    ctx.fillText(hpText, x, y + barH + 9);

    ctx.restore();
  }

  renderProjectiles() {
    const ctx = this.ctx;
    const slashImg = this.fxImages.slash;
    if (!slashImg || !slashImg.complete) return;

    ctx.save();
    for (const p of this.projectiles) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.scale(p.scale, p.scale);

      // Glowing Blue Energy Aura
      ctx.shadowColor = p.isUlt ? "#60a5fa" : "#38bdf8";
      ctx.shadowBlur = p.isUlt ? 22 : 14;

      const iw = slashImg.naturalWidth || 64;
      const ih = slashImg.naturalHeight || 64;
      ctx.drawImage(slashImg, -iw / 2, -ih / 2, iw, ih);

      ctx.restore();
    }
    ctx.restore();
  }

  // --- Authentic Golden Treasure Chest (Matches Video Project 2) ---

  dropTreasureChest(onLanded = null) {
    this.chestState = {
      x: this.playerState.x + 95,
      y: -90,
      targetY: this.groundY - 14,
      vy: 0,
      gravity: 1650,
      state: "falling",
      bounceCount: 0,
      scaleX: 0.88,
      scaleY: 1.25,
      rotation: -0.05,
      alpha: 1.0,
      sparkleTimer: 0,
      onLanded: onLanded
    };
  }

  removeTreasureChest() {
    if (this.chestState) {
      this.chestState.alpha = 0;
      this.chestState = null;
    }
  }

  spawnChestDustPuffs(x, y) {
    for (let i = 0; i < 10; i++) {
      const dir = i < 5 ? -1 : 1;
      this.chestDustPuffs.push({
        x: x + dir * (Math.random() * 14 + 6),
        y: y + (Math.random() * 6 - 3),
        vx: dir * (Math.random() * 110 + 45),
        vy: -(Math.random() * 50 + 15),
        size: Math.random() * 8 + 6,
        growth: Math.random() * 20 + 12,
        alpha: 0.85
      });
    }
  }

  renderTreasureChest() {
    if (!this.chestState || this.chestState.alpha <= 0) return;
    const ctx = this.ctx;
    const c = this.chestState;

    ctx.save();
    ctx.globalAlpha = c.alpha;

    // 1. Draw 3D Ground Shadow beneath chest
    const distAboveGround = Math.max(0, (c.targetY - c.y));
    const shadowAlpha = Math.max(0.12, 0.5 - (distAboveGround / 240) * 0.4);
    const shadowScaleX = Math.max(0.35, 1 - (distAboveGround / 250) * 0.65);
    const shadowScaleY = shadowScaleX * 0.38;

    ctx.save();
    ctx.translate(c.x, c.targetY + 12);
    ctx.scale(shadowScaleX, shadowScaleY);
    ctx.fillStyle = `rgba(15, 23, 42, ${shadowAlpha})`;
    ctx.beginPath();
    ctx.ellipse(0, 0, 38, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 2. Draw Chest with Squash/Stretch & Wobble
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(c.rotation || 0);
    ctx.scale(c.scaleX, c.scaleY);

    const chestImg = this.chestImageClosed;
    const w = 76;
    const h = 68;
    if (chestImg && chestImg.complete) {
      ctx.drawImage(chestImg, -w / 2, -h + 16, w, h);
    }

    // 3. Floating 4-point Sparkles if resting on the ground
    if (c.state === "resting") {
      c.sparkleTimer = (c.sparkleTimer || 0) + 0.05;
      const spPhase = Math.sin(c.sparkleTimer);
      ctx.fillStyle = "#ffffff";
      ctx.shadowColor = "#facc15";
      ctx.shadowBlur = 8;
      // Sparkle left
      ctx.save();
      ctx.translate(-28, -h + 20 + spPhase * 4);
      ctx.scale(0.8 + spPhase * 0.2, 0.8 + spPhase * 0.2);
      ctx.beginPath();
      ctx.moveTo(0, -6); ctx.quadraticCurveTo(0, 0, 6, 0); ctx.quadraticCurveTo(0, 0, 0, 6); ctx.quadraticCurveTo(0, 0, -6, 0); ctx.quadraticCurveTo(0, 0, 0, -6);
      ctx.fill();
      ctx.restore();
      // Sparkle right
      ctx.save();
      ctx.translate(30, -h + 28 - spPhase * 4);
      ctx.scale(0.7 - spPhase * 0.2, 0.7 - spPhase * 0.2);
      ctx.beginPath();
      ctx.moveTo(0, -6); ctx.quadraticCurveTo(0, 0, 6, 0); ctx.quadraticCurveTo(0, 0, 0, 6); ctx.quadraticCurveTo(0, 0, -6, 0); ctx.quadraticCurveTo(0, 0, 0, -6);
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();
    ctx.restore();
  }

  renderChestDustPuffs() {
    if (!this.chestDustPuffs || this.chestDustPuffs.length === 0) return;
    const ctx = this.ctx;
    ctx.save();
    for (const d of this.chestDustPuffs) {
      ctx.globalAlpha = Math.max(0, d.alpha);
      ctx.fillStyle = "#fef3c7";
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}
