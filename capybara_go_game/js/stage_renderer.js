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
      scale: 1.20, // Slightly smaller capy; world and enemies unchanged
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

    // Weather System
    this.weather = "none"; // "none", "rain", "snow", "storm"
    this.weatherParticles = [];
    this.weatherIntensity = 0;
    this.initWeatherParticles();

    this.lastTime = performance.now();
    this.startRenderLoop();
  }

  initWeatherParticles() {
    this.weatherParticles = [];
    for (let i = 0; i < 120; i++) {
      this.weatherParticles.push({
        x: Math.random() * (this.width || 440),
        y: Math.random() * (this.height || 350),
        speed: 2 + Math.random() * 4,
        size: 0.8 + Math.random() * 1.8,
        opacity: 0.4 + Math.random() * 0.5,
        drift: (Math.random() - 0.5) * 1.2
      });
    }
  }

  setWeather(type) {
    this.weather = type || "none";
    this.weatherIntensity = type === "storm" ? 1.0 : (type === "rain" ? 0.7 : (type === "snow" ? 0.5 : 0));
  }

  renderWeather(ctx) {
    if (!this.weather || this.weather === "none" || !this.weatherParticles) return;

    ctx.save();

    if (this.weather === "rain" || this.weather === "storm") {
      const windStrength = this.weather === "storm" ? 3.5 : 1.2;
      ctx.strokeStyle = this.weather === "storm" ? "rgba(180, 200, 255, 0.65)" : "rgba(160, 190, 255, 0.55)";
      ctx.lineWidth = this.weather === "storm" ? 1.5 : 1.0;

      for (let wi=0,wn=Math.ceil(this.weatherParticles.length*(window.GameGraphics?.profile.particles??1));wi<wn;wi++) {
        const p=this.weatherParticles[wi];
        p.y += p.speed * (this.weather === "storm" ? 2.2 : 1.4) * (this.frameScale??1);
        p.x += (windStrength + p.drift) * (this.frameScale??1);
        if (p.y > this.height + 10) { p.y = -8; p.x = Math.random() * this.width; }
        if (p.x > this.width + 10) { p.x = -5; }

        ctx.globalAlpha = p.opacity * this.weatherIntensity;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - windStrength * 2.5, p.y - p.speed * 3.5);
        ctx.stroke();
      }

      // Storm lightning flash
      if (this.weather === "storm" && Math.random() < 1-Math.pow(.997,this.frameScale??1)) {
        ctx.globalAlpha = 0.18;
        ctx.fillStyle = "#dbeafe";
        ctx.fillRect(0, 0, this.width, this.height);
      }

      // Rain darkening overlay
      ctx.globalAlpha = 0.18;
      ctx.fillStyle = "#1e3a5f";
      ctx.fillRect(0, 0, this.width, this.height);

    } else if (this.weather === "snow") {
      for (let wi=0,wn=Math.ceil(this.weatherParticles.length*(window.GameGraphics?.profile.particles??1));wi<wn;wi++) {
        const p=this.weatherParticles[wi];
        p.y += p.speed * 0.65 * (this.frameScale??1);
        p.x += (Math.sin(Date.now() * 0.001 + p.y * 0.02) * 0.6 + p.drift * 0.4) * (this.frameScale??1);
        if (p.y > this.height + 10) { p.y = -5; p.x = Math.random() * this.width; }

        ctx.globalAlpha = p.opacity * this.weatherIntensity;
        ctx.fillStyle = "#f0f8ff";
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      // Snow mist overlay
      ctx.globalAlpha = 0.08;
      ctx.fillStyle = "#e0f2fe";
      ctx.fillRect(0, 0, this.width, this.height);
    }

    ctx.restore();
  }

  loadImg(src) {
    this._imageCache??=new Map();
    if(this._imageCache.has(src))return this._imageCache.get(src);
    const img = new Image();img.src = src;this._imageCache.set(src,img);return img;
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
    
    this._capyAnimStarted = performance.now();
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
    else if (animName === "idle") {
      this.playerState.fps = 8;
      this.playerState.offsetY = 0;
      this.playerState.waddleAngle = 0;
      this.playerState.skillExpression = null;
    }
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

    if (typeof text === "number") {
      const num = Math.round(text);
      if (num >= 1000000) {
        text = (num / 1000000).toFixed(2).replace(/\.00$/, "") + "M";
      } else if (num >= 10000) {
        text = Math.round(num / 1000) + "K";
      } else {
        text = num.toLocaleString();
      }
    }

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
    const clientW = this.canvas.clientWidth, clientH = this.canvas.clientHeight;
    if (!(clientW > 0 && clientH > 0)) return;
    const scale=window.GameGraphics?.profile.scale || 1;
    const physicalW=Math.max(1,Math.round(clientW*scale)),physicalH=Math.max(1,Math.round(clientH*scale));
    if (this.canvas.width !== physicalW || this.canvas.height !== physicalH || this.width !== clientW || this.height !== clientH) {
      this.canvas.width=physicalW;this.canvas.height=physicalH;
      this.width=clientW;this.height=clientH;
      this.groundY=Math.round(this.height*.70);this.horizonY=Math.round(this.height*.40);
      if(this.isMenuMode){this.playerState.x=Math.round(this.width*.52);this.playerState.y=this.groundY;}
    }
    this.ctx.setTransform(physicalW/clientW,0,0,physicalH/clientH,0,0);
  }

  startRenderLoop() {
    let lastResizeCheck=-Infinity,frame=0;
    const timing={};
    const loop=timestamp=>{
      frame=0;
      if(document.hidden)return;
      const dt=window.GameGraphics?window.GameGraphics.frame(timing,timestamp):Math.min(.05,Math.max(0,(timestamp-this.lastTime)/1000));
      const visible=!window.Game?.ui || window.Game.ui.activeTab==='adventure';
      if(dt!==null&&visible){
        if(timestamp-lastResizeCheck>500){this.checkResize();lastResizeCheck=timestamp;}
        this.lastTime=timestamp;
        this.update(dt);this.render();
      }else if(!visible){timing.last=null;timing.next=null;this.lastTime=timestamp;}
      frame=requestAnimationFrame(loop);
    };
    document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;}else{timing.last=null;timing.next=null;this.lastTime=performance.now();if(!frame)frame=requestAnimationFrame(loop);}});
    window.addEventListener('graphics-change',()=>{lastResizeCheck=-Infinity;});
    if(!document.hidden)frame=requestAnimationFrame(loop);
  }

  update(dt) {
    dt=Math.max(0,Math.min(.05,dt));
    const frames=dt*60;this.frameScale=frames;
    const now = performance.now();

    // Parallax background scroll
    if (this.scrollSpeed > 0) {
      this.bgScrollX += this.scrollSpeed * dt * 60;
    }



    // Update Near-Camera Foreground 3D Foliage & Petals (Skipped on First Map / Gale Town)
    if (!this.isFirstMap()) {
      for (const fg of this.foregroundParticles) {
        fg.x += fg.speedX * (this.scrollSpeed > 0 ? (1 + this.scrollSpeed * 0.4) : 1) * frames;
        fg.y += fg.speedY * frames;
        fg.rotation += fg.rotSpeed * frames;
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
      const safeDt = Math.min(dt, 0.1);
      p.frameTimer += safeDt;
      const frameDuration = 1 / (p.fps || 10);
      if (p.frameTimer >= frameDuration) {
        p.frameTimer %= frameDuration;
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

    // Waddle effect during walk / Ground lock during idle
    if (p.currentAnim === "walk" || p.currentAnim === "run") {
      p.waddleAngle = Math.sin(now * 0.012) * 0.06;
      p.offsetY = window.CapySmooth ? 0 : -Math.abs(Math.sin(now * 0.012)) * 4;
    } else if (p.currentAnim === "idle") {
      p.waddleAngle = 0;
      p.offsetY = 0;
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

      proj.sparkCarry=(proj.sparkCarry||0)+(proj.isUlt?3:2)*frames*(window.GameGraphics?.profile.particles??1);
      const emitted=Math.floor(proj.sparkCarry);proj.sparkCarry-=emitted;
      for (let s = 0; s < emitted; s++) {
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
      sp.life += frames;
      sp.x += sp.vx * frames;
      sp.y += sp.vy * frames;
      sp.alpha = Math.max(0, 1 - (sp.life / sp.maxLife));
      if (sp.life >= sp.maxLife) {
        this.projectileSparks.splice(i, 1);
      }
    }

    // Update Sprint Dust Particles
    for (let i = this.runDustParticles.length - 1; i >= 0; i--) {
      const dp = this.runDustParticles[i];
      dp.life += frames;
      dp.x += dp.vx * frames;
      dp.y += dp.vy * frames;
      dp.size += 0.25 * frames;
      dp.alpha = Math.max(0, 0.85 * (1 - (dp.life / dp.maxLife)));
      if (dp.life >= dp.maxLife) {
        this.runDustParticles.splice(i, 1);
      }
    }

    // Update Impact Skid Spikes
    for (let i = this.impactDustSpikes.length - 1; i >= 0; i--) {
      const sk = this.impactDustSpikes[i];
      sk.life += frames;
      sk.scale += 0.04 * frames;
      sk.alpha = Math.max(0, 1 - (sk.life / sk.maxLife));
      if (sk.life >= sk.maxLife) {
        this.impactDustSpikes.splice(i, 1);
      }
    }

    // Ambient Sky Particles
    for (let ai=0,an=Math.ceil(this.ambientParticles.length*(window.GameGraphics?.profile.particles??1));ai<an;ai++) {
      const pt=this.ambientParticles[ai];
      pt.x += pt.speedX * frames;
      pt.y += pt.speedY * frames;
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
      fx.life += frames;
      fx.scale += 0.015 * frames;
      fx.alpha = 1 - (fx.life / fx.maxLife);
      if (fx.life >= fx.maxLife) {
        this.visualEffects.splice(i, 1);
      }
    }

    // Floating Numbers
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.life += frames;
      ft.y += ft.vy * frames;
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

    const mythicCamera=this.getMythicCamera?.();
    if(mythicCamera)ctx.translate(mythicCamera.x,mythicCamera.y);

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
    if(window.GameGraphics?.profile.sunbeams!==false)this.renderSunbeams(ctx);

    // ================= 4. AUTHENTIC ROAD DEPTH & WALKING DUST =================
    this.renderGroundAtmosphere(ctx);
    this.renderMythicLighting?.(ctx);

    // ================= 6. AMBIENT SKY PARTICLES =================
    ctx.save();
    const isMap1 = this.isFirstMap();
    for (let ai=0,an=Math.ceil(this.ambientParticles.length*(window.GameGraphics?.profile.particles??1));ai<an;ai++) {
      const pt=this.ambientParticles[ai];
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
    this.renderMythicGround?.(ctx);

    // ================= 7. DRAW ACTORS (WITH 3D SHADOWS) =================
    // Wings and transformation auras sit behind the capy, keeping its face readable.
    for (const fx of this.skillCombatEffects) {
      if (fx.behindPlayer && fx.render) { this.ctx.save(); try { fx.render(this.ctx); } finally { this.ctx.restore(); } }
    }
    this.renderPlayer();
    if (this.enemyState) {
      this.renderEnemy();
    }
    // Authentic Treasure Chest & Landing Dust
    this.renderTreasureChest();
    this.renderChestDustPuffs();

    // ================= 7.5 DRAW WEATHER EFFECTS =================
    this.renderWeather(ctx);

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
      ctx.strokeText(window.GameLocale?.text(ft.text) ?? (ft.text), ft.x, ft.y);
      ctx.fillStyle = ft.color;
      ctx.fillText(window.GameLocale?.text(ft.text) ?? (ft.text), ft.x, ft.y);
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
    if (this.isFirstMap() || window.GameGraphics?.profile.foreground===false) return;

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

    const drawW = Math.round(64 * p.scale);
    const drawH = Math.round(64 * p.scale);

    let px = Math.round(p.x - (p.knockback || 0));
    let py = Math.round(this.groundY);

    if (p.shake > 0) {
      px += Math.round((Math.random() * 6 - 3) * p.shake);
      py += Math.round((Math.random() * 4 - 2) * p.shake);
    }

    ctx.save();

    // 3D Directional Soft Oval Shadow on sandy road (matches reference image)
    ctx.beginPath();
    ctx.ellipse(px + 4, py + 1, drawW * 0.35, 7.5, 0.1, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(55, 45, 25, 0.28)";
    ctx.fill();

    // Position actor anchored bottom-center
    ctx.translate(px, py + Math.round(p.offsetY || 0));
    ctx.rotate(window.CapySmooth && (p.currentAnim === "walk" || p.currentAnim === "run") ? 0 : (p.waddleAngle || 0));

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
    // Passive skills affect combat stats without persistent character decorations.

    // Layer 2: Render Capybara Character Sprite (Clean, Crisp & Cute - Zero AI morphing/glitches)
    const isWiderFrame = frameImg.naturalWidth && frameImg.naturalWidth > 64;
    const smoothDrawn = window.CapySmooth && window.CapySmooth.draw(ctx, p.currentAnim, now - (this._capyAnimStarted || 0), -drawW / 2, -drawH + drawH * 8 / 128, drawW, drawH, p.loop, this._bloodPose);
    if (smoothDrawn) {
      // New capy-only atlas drawn; equipment and all other layers remain independent.
    } else if (isWiderFrame) {
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

    // Layer 2.5: Render Equipped Common Gear on Capybara while playing (Boots, Armor, Helmet, Weapon)
    this.renderPlayerEquippedGear(ctx, drawW, drawH, p, now);

    // A battle may clear its effects before the roar's completion callback runs.
    // Never leave the legacy glowing-eye overlay on the normal capy afterwards.
    const dragonFaceActive = this.skillCombatEffects.some(f =>
      (f.kind === "dragon-roar" || f.cinematic === "dragon") &&
      now >= f.startTime && now < f.startTime + f.duration * .72);
    if (!dragonFaceActive && (p.skillExpression === "dragon_glow" || p.skillTheme === "dragon")) {
      p.skillExpression = "normal";
      p.skillTheme = null;
      p.swordAction = null;
    }

    // Dynamic Skill Facial Expressions on Capybara (Matching authentic reference frames)
    if (p.skillExpression && p.skillExpression !== "normal") {
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

      } else if (p.skillExpression === "dragon_glow") {
        ctx.save();
        ctx.fillStyle = "#d48b55";
        ctx.beginPath();
        ctx.arc(eyeX, eyeY, 3.8, 0, Math.PI * 2);
        ctx.fill();

        ctx.translate(eyeX, eyeY);
        ctx.shadowColor = "#f97316";
        ctx.shadowBlur = 10;
        ctx.fillStyle = "#facc15";
        ctx.strokeStyle = "#ea580c";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.ellipse(0, 0, 4.2, 2.6, -0.15, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Fiery dragon slit pupil
        ctx.fillStyle = "#991b1b";
        ctx.beginPath();
        ctx.ellipse(0.5, 0, 1.0, 2.0, 0.1, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(0.9, -0.6, 1.0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    // Layer 3: Render In-Front Skill Attachments (Halo, Dragon Head, Shields, Grimoire, Weapons, Cyclones)
    // Keep the capybara silhouette clear; attack and hit effects still render normally.

    // Layer 4: Pet & Mount Companions (Duck on head, Turtle back, Crocodile front, Baby Dragon fly)
    this.renderCompanion(ctx, drawW, drawH, p, now);

    ctx.restore();

    // In-Battle Player Overhead HP Bar
    if (this.inBattle && p.currentHp !== undefined && p.maxHp) {
      const hpBarY = this.groundY + (p.offsetY || 0) - drawH - 12;
      this.renderPlayerHpBar(px, hpBarY, p);
    }
  }

  // --- IN-GAME EQUIPPED COMMON GEAR RENDERING ON CAPYBARA (AUTHENTIC REFERENCE ART) ---
  renderPlayerEquippedGear(ctx, drawW, drawH, p, now) {
    const char = window.Character || (typeof Character !== "undefined" ? Character : null);
    if (!char || !char.equipped) return;
    const eq = char.equipped;

    const isAttacking = (p.currentAnim === "attack" || p.swordAction === "slash");
    const isWalking = (p.currentAnim === "walk" || p.currentAnim === "run");

    // 1. Common Boots
    const bootsItem = eq.boots;
    if (bootsItem && (bootsItem.rarity === "common" || (bootsItem.id && bootsItem.id.startsWith("gear_")) || (bootsItem.templateId && bootsItem.templateId.startsWith("gear_")))) {
      this.drawCommonBootsOnPlayer(ctx, drawW, drawH, p, isWalking, now);
    }

    // 2. Common Armor / Tunic
    const armorItem = eq.armor;
    if (armorItem && (armorItem.rarity === "common" || (armorItem.id && armorItem.id.startsWith("gear_")) || (armorItem.templateId && armorItem.templateId.startsWith("gear_")))) {
      this.drawCommonArmorOnPlayer(ctx, drawW, drawH, p, armorItem);
    }

    // 3. Common Helmet / Hood / Wizard Hat
    const helmItem = eq.helmet;
    if (helmItem && (helmItem.rarity === "common" || (helmItem.id && helmItem.id.startsWith("gear_")) || (helmItem.templateId && helmItem.templateId.startsWith("gear_")))) {
      this.drawCommonHelmetOnPlayer(ctx, drawW, drawH, p, helmItem, now);
    }

    // 4. Common Weapon (Sword, Bow, Staff, Mace)
    const weaponItem = eq.weapon;
    if (weaponItem && (weaponItem.rarity === "common" || (weaponItem.id && weaponItem.id.startsWith("gear_")) || (weaponItem.templateId && weaponItem.templateId.startsWith("gear_")))) {
      this.drawCommonWeaponOnPlayer(ctx, drawW, drawH, p, weaponItem, isAttacking, now);
    }
  }

  drawCommonBootsOnPlayer(ctx, drawW, drawH, p, isWalking, now) {
    ctx.save();
    const stepBob = isWalking ? Math.sin(now * 0.015) * 1.8 : 0;

    // Left (Back) Boot
    ctx.save();
    ctx.translate(-drawW * 0.20, -drawH * 0.05 + stepBob);
    ctx.fillStyle = "#6d3816";
    ctx.strokeStyle = "#271206";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.roundRect(-drawW * 0.09, 0, drawW * 0.18, drawH * 0.10, [3, 3, 5, 5]);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#8c4d22";
    ctx.beginPath();
    ctx.roundRect(-drawW * 0.10, -drawH * 0.025, drawW * 0.20, drawH * 0.045, 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Right (Front) Boot
    ctx.save();
    ctx.translate(drawW * 0.16, -drawH * 0.05 - stepBob);
    ctx.fillStyle = "#6d3816";
    ctx.strokeStyle = "#271206";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.roundRect(-drawW * 0.09, 0, drawW * 0.18, drawH * 0.10, [3, 3, 5, 5]);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#8c4d22";
    ctx.beginPath();
    ctx.roundRect(-drawW * 0.10, -drawH * 0.025, drawW * 0.20, drawH * 0.045, 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.restore();
  }

  drawCommonArmorOnPlayer(ctx, drawW, drawH, p, armorItem) {
    ctx.save();
    const tId = armorItem.templateId || armorItem.id || "";
    const isPlate = tId === "gear_05";
    const isDark = tId === "gear_06";

    // Torso jerkin / breastplate
    const aX = -drawW * 0.22;
    const aY = -drawH * 0.44;
    const aW = drawW * 0.44;
    const aH = drawH * 0.32;

    if (isPlate) {
      const pGrad = ctx.createLinearGradient(aX, aY, aX + aW, aY + aH);
      pGrad.addColorStop(0, "#e2e8f0");
      pGrad.addColorStop(0.5, "#94a3b8");
      pGrad.addColorStop(1, "#475569");
      ctx.fillStyle = pGrad;
      ctx.strokeStyle = "#1e293b";
    } else if (isDark) {
      ctx.fillStyle = "#334155";
      ctx.strokeStyle = "#0f172a";
    } else {
      // Adventurer Leather Tunic (Authentic warm chestnut)
      ctx.fillStyle = "#854d24";
      ctx.strokeStyle = "#291003";
    }

    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.roundRect(aX, aY, aW, aH, [4, 4, 6, 6]);
    ctx.fill();
    ctx.stroke();

    // Shoulder pauldrons with silver beveled rims
    const pauldronW = drawW * 0.14;
    const pauldronH = drawH * 0.10;
    // Left pauldron
    ctx.fillStyle = isPlate ? "#cbd5e1" : "#6d3816";
    ctx.strokeStyle = isPlate ? "#1e293b" : "#cbd5e1";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.roundRect(aX - 3, aY - 2, pauldronW, pauldronH, 3);
    ctx.fill();
    ctx.stroke();

    // Right pauldron
    ctx.beginPath();
    ctx.roundRect(aX + aW - pauldronW + 3, aY - 2, pauldronW, pauldronH, 3);
    ctx.fill();
    ctx.stroke();

    // Belt & Buckle
    ctx.fillStyle = "#381907";
    ctx.strokeStyle = "#1a0b03";
    ctx.lineWidth = 1.2;
    const beltY = aY + aH * 0.62;
    const beltH = aH * 0.22;
    ctx.fillRect(aX, beltY, aW, beltH);
    ctx.strokeRect(aX, beltY, aW, beltH);

    // Golden Buckle
    ctx.fillStyle = "#fbbf24";
    ctx.strokeStyle = "#78350f";
    ctx.lineWidth = 1.2;
    const bkW = drawW * 0.10;
    const bkH = beltH * 1.35;
    ctx.fillRect(-bkW * 0.5, beltY - 1, bkW, bkH);
    ctx.strokeRect(-bkW * 0.5, beltY - 1, bkW, bkH);

    ctx.fillStyle = "#451a03";
    ctx.fillRect(-bkW * 0.2, beltY + 1, bkW * 0.4, bkH - 4);

    ctx.restore();
  }

  drawCommonHelmetOnPlayer(ctx, drawW, drawH, p, helmItem, now) {
    ctx.save();
    const tId = helmItem.templateId || helmItem.id || "";
    const name = (helmItem.name || "").toLowerCase();
    const isHood = tId === "gear_09" || name.includes("hood") || name.includes("forest");
    const isWizard = name.includes("wizard") || name.includes("mage");

    const headX = drawW * 0.02;
    const headY = -drawH * 0.73;

    if (isHood) {
      // Woodland Forest Hood
      ctx.fillStyle = "#16a34a";
      ctx.strokeStyle = "#14532d";
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.ellipse(headX, headY, drawW * 0.22, drawH * 0.18, 0.08, Math.PI, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Leaf pin
      ctx.fillStyle = "#4ade80";
      ctx.beginPath();
      ctx.arc(headX - drawW * 0.12, headY, 3, 0, Math.PI * 2);
      ctx.fill();

    } else if (isWizard) {
      // Wizard Hat
      ctx.fillStyle = "#78350f";
      ctx.strokeStyle = "#451a03";
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(headX - drawW * 0.22, headY);
      ctx.lineTo(headX - drawW * 0.05, headY - drawH * 0.28);
      ctx.lineTo(headX + drawW * 0.18, headY);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Green ribbon
      ctx.fillStyle = "#22c55e";
      ctx.fillRect(headX - drawW * 0.18, headY - 4, drawW * 0.34, 4);

    } else {
      // Authentic Plumed Knight Helm
      // Dome
      const hGrad = ctx.createLinearGradient(headX - drawW * 0.18, headY - drawH * 0.18, headX + drawW * 0.18, headY);
      hGrad.addColorStop(0, "#ffffff");
      hGrad.addColorStop(0.3, "#e2e8f0");
      hGrad.addColorStop(0.7, "#94a3b8");
      hGrad.addColorStop(1, "#475569");
      ctx.fillStyle = hGrad;
      ctx.strokeStyle = "#1e293b";
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.ellipse(headX, headY, drawW * 0.22, drawH * 0.19, 0.06, Math.PI, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Visor Rim Band
      ctx.fillStyle = "#cbd5e1";
      ctx.beginPath();
      ctx.roundRect(headX - drawW * 0.18, headY - drawH * 0.02, drawW * 0.36, drawH * 0.065, 2);
      ctx.fill();
      ctx.stroke();

      // Ear & Cheek Guard
      ctx.fillStyle = "#94a3b8";
      ctx.beginPath();
      ctx.roundRect(headX - drawW * 0.20, headY - drawH * 0.02, drawW * 0.09, drawH * 0.14, 2);
      ctx.fill();
      ctx.stroke();

      // Iconic Crimson Plume on top
      const plumeSway = Math.sin(now * 0.007) * 3;
      ctx.fillStyle = "#dc2626";
      ctx.strokeStyle = "#7f1d1d";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(headX - 2, headY - drawH * 0.18);
      ctx.quadraticCurveTo(headX - drawW * 0.18 + plumeSway, headY - drawH * 0.35, headX - drawW * 0.32 + plumeSway, headY - drawH * 0.15);
      ctx.quadraticCurveTo(headX - drawW * 0.18 + plumeSway * 0.5, headY - drawH * 0.12, headX - 2, headY - drawH * 0.16);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    ctx.restore();
  }

  drawCommonWeaponOnPlayer(ctx, drawW, drawH, p, weaponItem, isAttacking, now) {
    ctx.save();
    const tId = weaponItem.templateId || weaponItem.id || "";
    const name = (weaponItem.name || "").toLowerCase();

    // Hand anchor
    let wX = drawW * 0.22;
    let wY = -drawH * 0.38;
    let wRot = 0.24;

    if (isAttacking) {
      wX = drawW * 0.36;
      wY = -drawH * 0.22;
      wRot = 1.30;
    } else {
      wRot += Math.sin(now * 0.006) * 0.06;
    }

    ctx.translate(wX, wY);
    ctx.rotate(wRot);

    if (tId === "gear_01" || name.includes("bow")) {
      // Hunter Recurve Bow
      ctx.strokeStyle = "#92400e";
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.arc(0, 0, 16, -Math.PI * 0.42, Math.PI * 0.42);
      ctx.stroke();

      ctx.strokeStyle = "#22c55e";
      ctx.lineWidth = 4.2;
      ctx.beginPath();
      ctx.arc(0, 0, 16, -0.18, 0.18);
      ctx.stroke();

      ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.moveTo(Math.cos(-Math.PI * 0.42) * 16, Math.sin(-Math.PI * 0.42) * 16);
      ctx.lineTo(Math.cos(Math.PI * 0.42) * 16, Math.sin(Math.PI * 0.42) * 16);
      ctx.stroke();

    } else if (tId === "gear_02" || name.includes("staff")) {
      // Druid Amber/Ruby Staff
      ctx.strokeStyle = "#78350f";
      ctx.lineWidth = 2.8;
      ctx.beginPath();
      ctx.moveTo(0, 10);
      ctx.lineTo(0, -26);
      ctx.stroke();

      ctx.shadowColor = "#f59e0b";
      ctx.shadowBlur = 10;
      ctx.fillStyle = "#fde047";
      ctx.strokeStyle = "#b45309";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(0, -28, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

    } else if (tId === "gear_03" || name.includes("mace") || name.includes("axe")) {
      // Spiked Steel Mace
      ctx.strokeStyle = "#451a03";
      ctx.lineWidth = 2.8;
      ctx.beginPath();
      ctx.moveTo(0, 10);
      ctx.lineTo(0, -18);
      ctx.stroke();

      ctx.fillStyle = "#64748b";
      ctx.strokeStyle = "#0f172a";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(0, -20, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#cbd5e1";
      [[-7, -20], [7, -20], [0, -27], [0, -13]].forEach(([sx, sy]) => {
        ctx.beginPath();
        ctx.arc(sx, sy, 2, 0, Math.PI * 2);
        ctx.fill();
      });

    } else {
      // Novice Iron Sword (Matching showcase art)
      const bGrad = ctx.createLinearGradient(-3, -28, 3, 0);
      bGrad.addColorStop(0, "#ffffff");
      bGrad.addColorStop(0.4, "#e2e8f0");
      bGrad.addColorStop(1, "#94a3b8");
      ctx.fillStyle = bGrad;
      ctx.strokeStyle = "#1e293b";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(0, -28); // Tip
      ctx.lineTo(4, -22);
      ctx.lineTo(3.5, 0);
      ctx.lineTo(-3.5, 0);
      ctx.lineTo(-4, -22);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Blade Fuller
      ctx.strokeStyle = "rgba(255, 255, 255, 0.75)";
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.moveTo(0, -25);
      ctx.lineTo(0, -2);
      ctx.stroke();

      // Golden Crossguard
      ctx.fillStyle = "#fbbf24";
      ctx.strokeStyle = "#78350f";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.roundRect(-8, 0, 16, 4, 1.5);
      ctx.fill();
      ctx.stroke();

      // Leather Grip
      ctx.fillStyle = "#78350f";
      ctx.fillRect(-2, 4, 4, 6);

      // Pommel
      ctx.fillStyle = "#f59e0b";
      ctx.strokeStyle = "#78350f";
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.arc(0, 11, 2.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    ctx.restore();
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
      p.animHp += (currentHp - p.animHp) * (1-Math.pow(.82,this.frameScale??1));
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
    ctx.strokeText(window.GameLocale?.text("🐾 Capy") ?? ("🐾 Capy"), x, y - 4);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(window.GameLocale?.text("🐾 Capy") ?? ("🐾 Capy"), x, y - 4);

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

  // --- PET & MOUNT COMPANION SYSTEM RENDERING & ANIMATION ---

  renderCompanion(ctx, drawW, drawH, p, now) {
    const comp = window.Character && window.Character.getActiveCompanionData && window.Character.getActiveCompanionData();
    if (!comp || comp.id === "duck") return;

    if (!this.companionParticles) this.companionParticles = [];

    if (comp.id === "duck") {
      // 1. BEBEK SANTAI (COZY DUCKY) - Sits on Capybara's Head with gentle bobbing
      ctx.save();
      const duckBob = Math.sin(now * 0.005) * 1.5;
      const headX = (p.facing < 0 ? -4 : 4);
      const headY = -drawH * 0.95 + duckBob;
      ctx.translate(headX, headY);

      // Duck Body (Chubby golden-yellow duckling)
      const bGrad = ctx.createRadialGradient(-2, -3, 2, 0, 0, 10);
      bGrad.addColorStop(0, "#fef08a");
      bGrad.addColorStop(0.7, "#facc15");
      bGrad.addColorStop(1, "#eab308");
      ctx.fillStyle = bGrad;
      ctx.strokeStyle = "#ca8a04";
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.ellipse(0, 0, 9, 6.5, -0.05, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Cute Little Flapping Wing
      ctx.save();
      const wingFlap = Math.sin(now * 0.01) * 0.15;
      ctx.translate(-2, 0);
      ctx.rotate(wingFlap);
      ctx.fillStyle = "#facc15";
      ctx.beginPath();
      ctx.ellipse(0, 0, 5, 3.2, 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      // Duck Head
      const hGrad = ctx.createRadialGradient(4, -6, 1, 4, -6, 7);
      hGrad.addColorStop(0, "#fef9c3");
      hGrad.addColorStop(0.8, "#facc15");
      hGrad.addColorStop(1, "#ca8a04");
      ctx.fillStyle = hGrad;
      ctx.beginPath();
      ctx.arc(4.5, -6, 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Orange Bill
      ctx.fillStyle = "#f97316";
      ctx.strokeStyle = "#c2410c";
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(8, -7);
      ctx.lineTo(13.5, -5.5);
      ctx.lineTo(8, -4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Happy Curved Eyes (^_^)
      ctx.strokeStyle = "#451a03";
      ctx.lineWidth = 1.2;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.arc(4.2, -7.2, 1.6, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();

      // Cheerful Pink Blush
      ctx.fillStyle = "rgba(244, 114, 182, 0.55)";
      ctx.beginPath();
      ctx.arc(2.8, -5.2, 1.8, 0, Math.PI * 2);
      ctx.fill();

      // Tiny Green Leaf Sprout Hat
      ctx.save();
      const leafSway = Math.sin(now * 0.007) * 0.2;
      ctx.translate(4.5, -11.5);
      ctx.rotate(leafSway);
      ctx.strokeStyle = "#15803d";
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, 3);
      ctx.stroke();
      ctx.fillStyle = "#22c55e";
      ctx.beginPath();
      ctx.ellipse(2, -1, 3.5, 1.8, -0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      // Floating Shimmering Water Droplets
      if (Math.random() < (1-Math.pow(.96,this.frameScale??1))*(window.GameGraphics?.profile.particles??1)) {
        this.companionParticles.push({
          x: headX + (Math.random() * 16 - 8),
          y: headY - 14,
          vx: (Math.random() - 0.5) * 0.6,
          vy: -0.8 - Math.random() * 0.8,
          alpha: 0.8,
          size: 1.5 + Math.random() * 1.5,
          color: "#38bdf8"
        });
      }

      ctx.restore();

    } else if (comp.id === "turtle") {
      // 2. KURA-KURA RAKSASA (GUARDIAN TURTLE) - Walks Behind Capybara
      ctx.save();
      const turtleX = -drawW * 0.55;
      const turtleY = 0;
      ctx.translate(turtleX, turtleY);

      // Turtle Ground Shadow
      ctx.beginPath();
      ctx.ellipse(0, 1, 16, 4.5, 0, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(55, 45, 25, 0.25)";
      ctx.fill();

      // 4 Chunky Webbed Feet
      const fWalk = (p.waddleAngle ? Math.sin(now * 0.012) * 2.5 : 0);
      ctx.fillStyle = "#22543d";
      ctx.strokeStyle = "#14532d";
      ctx.lineWidth = 0.8;
      [
        { x: -10 + fWalk, y: -2, r: 3.2 },
        { x: -4 - fWalk, y: -1, r: 3.0 },
        { x: 4 + fWalk, y: -1, r: 3.0 },
        { x: 10 - fWalk, y: -2, r: 3.2 }
      ].forEach(f => {
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });

      // Mossy Domed Shell
      const sGrad = ctx.createLinearGradient(-14, -18, 14, 0);
      sGrad.addColorStop(0, "#166534");
      sGrad.addColorStop(0.5, "#15803d");
      sGrad.addColorStop(1, "#14532d");
      ctx.fillStyle = sGrad;
      ctx.strokeStyle = "#052e16";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.ellipse(0, -9, 14, 10, 0, Math.PI, 0);
      ctx.lineTo(14, -5);
      ctx.lineTo(-14, -5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Runic Hexagon Markings on Shell (Glowing Cyan/Emerald)
      ctx.save();
      ctx.shadowColor = "#38bdf8";
      ctx.shadowBlur = 8;
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 1.2;
      [-6, 0, 6].forEach((hx, idx) => {
        const hy = -9 - (idx === 1 ? 3 : 0);
        ctx.beginPath();
        ctx.arc(hx, hy, 2.8, 0, Math.PI * 2);
        ctx.stroke();
      });
      ctx.restore();

      // Turtle Head (Extended Forward)
      const headNod = Math.sin(now * 0.004) * 1.0;
      ctx.fillStyle = "#22543d";
      ctx.strokeStyle = "#14532d";
      ctx.beginPath();
      ctx.ellipse(13, -7 + headNod, 5, 3.8, 0.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Warm Brown Turtle Eye
      ctx.fillStyle = "#fef3c7";
      ctx.beginPath();
      ctx.arc(14.5, -8 + headNod, 1.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#451a03";
      ctx.beginPath();
      ctx.arc(14.8, -8 + headNod, 1.0, 0, Math.PI * 2);
      ctx.fill();

      // Shell Moss Sprout
      ctx.fillStyle = "#86efac";
      ctx.beginPath();
      ctx.arc(-2, -18, 2.0, 0, Math.PI * 2);
      ctx.fill();

      // Ambient Protective Jade Aura Rings
      ctx.save();
      ctx.strokeStyle = "rgba(56, 189, 248, 0.35)";
      ctx.lineWidth = 1.2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.ellipse(drawW * 0.28, -drawH * 0.45, drawW * 0.48, drawH * 0.48, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      ctx.restore();

    } else if (comp.id === "croc") {
      // 3. SAHABAT BUAYA (CHILL GATOR) - Waddles Beside Capybara
      ctx.save();
      const crocX = drawW * 0.46;
      const crocY = 0;
      ctx.translate(crocX, crocY);

      // Gator Ground Shadow
      ctx.beginPath();
      ctx.ellipse(2, 1, 18, 4.5, 0, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(55, 45, 25, 0.25)";
      ctx.fill();

      // Swaying Tail
      ctx.save();
      const tailSway = Math.sin(now * 0.008) * 0.25;
      ctx.translate(-10, -5);
      ctx.rotate(tailSway);
      ctx.fillStyle = "#059669";
      ctx.strokeStyle = "#064e3b";
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(-10, -3, -15, -1);
      ctx.quadraticCurveTo(-8, 3, 0, 4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      // Gator Body
      const cGrad = ctx.createLinearGradient(0, -12, 0, 0);
      cGrad.addColorStop(0, "#10b981");
      cGrad.addColorStop(0.6, "#059669");
      cGrad.addColorStop(1, "#fef08a"); // Pale cream belly
      ctx.fillStyle = cGrad;
      ctx.strokeStyle = "#064e3b";
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.ellipse(0, -5, 12, 6, 0.05, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Scaly Back Spikes
      ctx.fillStyle = "#047857";
      [-6, -2, 2, 6].forEach(sx => {
        ctx.beginPath();
        ctx.moveTo(sx - 1.5, -10.5);
        ctx.lineTo(sx, -13);
        ctx.lineTo(sx + 1.5, -10.5);
        ctx.closePath();
        ctx.fill();
      });

      // Snout & Happy Jaw
      ctx.fillStyle = "#10b981";
      ctx.beginPath();
      ctx.moveTo(7, -8.5);
      ctx.lineTo(18, -6.5);
      ctx.quadraticCurveTo(20, -4, 18, -2);
      ctx.lineTo(7, -2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Nostril Bump
      ctx.fillStyle = "#047857";
      ctx.beginPath();
      ctx.arc(17, -6.8, 0.9, 0, Math.PI * 2);
      ctx.fill();

      // Sleepy Smiling Eyes
      ctx.strokeStyle = "#022c22";
      ctx.lineWidth = 1.2;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.arc(8, -8, 2.0, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();

      // Cute White Tooth
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.moveTo(13, -3.5);
      ctx.lineTo(14.5, -0.5);
      ctx.lineTo(16, -3.5);
      ctx.closePath();
      ctx.fill();

      // 4 Stubby Paws
      const pWalk = (p.waddleAngle ? Math.sin(now * 0.012) * 2.0 : 0);
      ctx.fillStyle = "#047857";
      [
        { x: -6 + pWalk, y: 0 },
        { x: -2 - pWalk, y: 0 },
        { x: 4 + pWalk, y: 0 },
        { x: 8 - pWalk, y: 0 }
      ].forEach(pt => {
        ctx.beginPath();
        ctx.ellipse(pt.x, pt.y, 2.5, 1.6, 0, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.restore();

    } else if (comp.id === "dragon") {
      // 4. BAYI NAGA API (BABY PYRO DRAGON) - Floats Above & Behind Capybara
      ctx.save();
      const dragonHover = Math.sin(now * 0.004) * 5;
      const dragonX = -drawW * 0.46;
      const dragonY = -drawH * 1.15 + dragonHover;
      ctx.translate(dragonX, dragonY);

      // 2 Cute Flapping Bat Wings
      const wingAng = Math.sin(now * 0.016) * 0.38;
      ctx.save();
      ctx.rotate(wingAng);
      ctx.fillStyle = "#b91c1c";
      ctx.strokeStyle = "#7f1d1d";
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.moveTo(-2, -5);
      ctx.lineTo(-12, -18);
      ctx.lineTo(-6, -11);
      ctx.lineTo(-2, -14);
      ctx.lineTo(0, -5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      // Baby Dragon Body
      const dGrad = ctx.createRadialGradient(2, -2, 2, 0, 0, 11);
      dGrad.addColorStop(0, "#ef4444");
      dGrad.addColorStop(0.7, "#dc2626");
      dGrad.addColorStop(1, "#991b1b");
      ctx.fillStyle = dGrad;
      ctx.strokeStyle = "#7f1d1d";
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.ellipse(0, 0, 10, 7.5, 0.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Peach Belly Scales
      ctx.fillStyle = "#fed7aa";
      ctx.beginPath();
      ctx.ellipse(2, 2, 6, 3.8, 0.15, 0, Math.PI * 2);
      ctx.fill();

      // Curled Tail with Flame Tip
      ctx.strokeStyle = "#dc2626";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-8, 2);
      ctx.quadraticCurveTo(-14, 6, -16, 0);
      ctx.stroke();

      // Radiant Fiery Flame Tip
      ctx.save();
      ctx.shadowColor = "#f97316";
      ctx.shadowBlur = 12;
      const fGrad = ctx.createRadialGradient(-16, 0, 1, -16, 0, 6);
      fGrad.addColorStop(0, "#ffffff");
      fGrad.addColorStop(0.4, "#fde047");
      fGrad.addColorStop(0.8, "#f97316");
      fGrad.addColorStop(1, "rgba(239, 68, 68, 0)");
      ctx.fillStyle = fGrad;
      ctx.beginPath();
      ctx.arc(-16, 0, 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Dragon Head
      ctx.fillStyle = "#ef4444";
      ctx.beginPath();
      ctx.ellipse(7, -5, 6.5, 5.5, -0.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Golden Hornlets
      ctx.fillStyle = "#f59e0b";
      ctx.strokeStyle = "#b45309";
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(5, -9);
      ctx.lineTo(3, -15);
      ctx.lineTo(7, -10);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Large Amber Dragon Eye
      ctx.fillStyle = "#fef08a";
      ctx.beginPath();
      ctx.arc(8, -5.5, 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#7f1d1d";
      ctx.beginPath();
      ctx.ellipse(8.3, -5.5, 0.8, 1.8, 0.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(8.8, -6.2, 0.7, 0, Math.PI * 2);
      ctx.fill();

      // Ambient Floating Embers
      if (Math.random() < (1-Math.pow(.88,this.frameScale??1))*(window.GameGraphics?.profile.particles??1)) {
        this.companionParticles.push({
          x: dragonX - 16 + (Math.random() * 4 - 2),
          y: dragonY + (Math.random() * 4 - 2),
          vx: -0.8 - Math.random() * 0.8,
          vy: (Math.random() - 0.5) * 0.8,
          alpha: 1.0,
          size: 1.8 + Math.random() * 1.5,
          color: ["#fde047", "#f97316", "#ef4444"][Math.floor(Math.random() * 3)]
        });
      }

      ctx.restore();
    }

    // Render & Update Ambient Companion Particles
    if (this.companionParticles.length > 0) {
      ctx.save();
      for (let i = this.companionParticles.length - 1; i >= 0; i--) {
        const pt = this.companionParticles[i];
        pt.x += pt.vx * (this.frameScale??1);
        pt.y += pt.vy * (this.frameScale??1);
        pt.alpha -= 0.025 * (this.frameScale??1);
        if (pt.alpha <= 0) {
          this.companionParticles.splice(i, 1);
          continue;
        }
        ctx.globalAlpha = Math.max(0, pt.alpha);
        ctx.fillStyle = pt.color;
        ctx.shadowColor = pt.color;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  // --- COMPANION COMBAT SUPPORT ACTIONS ---

  triggerCompanionCombatAction(companionId, startX, startY, targetX, targetY, onHit, onComplete = null, speedMult = 1.0) {
    const duration = 480 / speedMult;
    let hitTriggered = false;

    if (companionId === "duck") {
      // 🦆 DUCK BREAD TOSS & SPLASH
      this.skillCombatEffects.push({
        startTime: performance.now(),
        duration: duration + 150,
        update: (progress) => {
          if (progress >= 0.85 && !hitTriggered) {
            hitTriggered = true;
            Sound.playSfx && Sound.playSfx("magicBurst");
            if (this.enemyState) {
              this.enemyState.flashWhite = 0.8;
              this.enemyState.shake = 1.6;
            }
            this.addVisualEffect("healRing", startX, startY, 1.4);
            this.addVisualEffect("hitSpark", targetX, targetY - 25, 1.6);
            this.addMagicImpactSparks(targetX, targetY - 25, ["#38bdf8", "#fde047", "#ffffff"]);
            if (onHit) onHit();
          }
        },
        render: (ctx) => {
          const now = performance.now();
          const elapsed = now - (this.skillCombatEffects.find(f => f.update)?.startTime || now);
          const p = Math.min(1, elapsed / duration);
          if (p < 1) {
            // Spinning Golden Loaf of Bread in Parabolic Arc
            const bx = startX + (targetX - startX) * p;
            const by = startY + (targetY - startY) * p - Math.sin(p * Math.PI) * 75;

            ctx.save();
            ctx.translate(bx, by);
            ctx.rotate(now * 0.02);
            ctx.shadowColor = "#f59e0b";
            ctx.shadowBlur = 12;

            // Toast / Bread Loaf
            ctx.fillStyle = "#f59e0b";
            ctx.strokeStyle = "#78350f";
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.roundRect(-8, -6, 16, 12, 3);
            ctx.fill();
            ctx.stroke();

            // Inner Warm Bread Crust
            ctx.fillStyle = "#fef3c7";
            ctx.beginPath();
            ctx.roundRect(-5, -4, 10, 8, 2);
            ctx.fill();

            // Sparkly Water Droplets Trail
            ctx.fillStyle = "rgba(56, 189, 248, 0.85)";
            ctx.beginPath();
            ctx.arc(-10, 2, 2.5, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
          }
        },
        onComplete: () => {
          if (onComplete) onComplete();
        }
      });

    } else if (companionId === "turtle") {
      // 🐢 TURTLE ANCIENT CRYSTAL BARRIER
      this.skillCombatEffects.push({
        startTime: performance.now(),
        duration: duration + 200,
        update: (progress) => {
          if (progress >= 0.4 && !hitTriggered) {
            hitTriggered = true;
            Sound.playSfx && Sound.playSfx("shield");
            this.playerState.shake = 1.0;
            this.addVisualEffect("shieldPulse", startX, startY - 25, 2.0);
            this.addMagicImpactSparks(startX, startY - 25, ["#38bdf8", "#86efac", "#ffffff"]);
            if (onHit) onHit();
          }
        },
        render: (ctx) => {
          const now = performance.now();
          const elapsed = now - (this.skillCombatEffects.find(f => f.update)?.startTime || now);
          const p = Math.min(1, elapsed / duration);
          if (p < 1) {
            // Expanding Hexagonal Shield Dome around Capybara
            const shieldScale = Math.sin(p * Math.PI) * 1.15;
            ctx.save();
            ctx.translate(startX, startY - 28);
            ctx.scale(shieldScale, shieldScale);
            ctx.shadowColor = "#38bdf8";
            ctx.shadowBlur = 22;

            ctx.strokeStyle = "rgba(56, 189, 248, 0.95)";
            ctx.lineWidth = 3.5;
            ctx.fillStyle = "rgba(14, 165, 233, 0.22)";
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
              const ang = (i / 6) * Math.PI * 2 + now * 0.003;
              const hx = Math.cos(ang) * 44;
              const hy = Math.sin(ang) * 44;
              if (i === 0) ctx.moveTo(hx, hy);
              else ctx.lineTo(hx, hy);
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Inner Sacred Rune
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(0, 0, 22, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
          }
        },
        onComplete: () => {
          if (onComplete) onComplete();
        }
      });

    } else if (companionId === "croc") {
      // 🐊 CHILL GATOR SNAP BITE CHOMP
      this.skillCombatEffects.push({
        startTime: performance.now(),
        duration: duration + 100,
        update: (progress) => {
          if (progress >= 0.55 && !hitTriggered) {
            hitTriggered = true;
            Sound.playSfx && Sound.playSfx("attackHeavy");
            if (this.enemyState) {
              this.enemyState.flashWhite = 1.0;
              this.enemyState.shake = 2.4;
            }
            this.addVisualEffect("critBurst", targetX, targetY - 20, 1.8);
            this.addMagicImpactSparks(targetX, targetY - 20, ["#ef4444", "#f59e0b", "#ffffff"]);
            if (onHit) onHit();
          }
        },
        render: (ctx) => {
          const now = performance.now();
          const elapsed = now - (this.skillCombatEffects.find(f => f.update)?.startTime || now);
          const p = Math.min(1, elapsed / duration);

          // Gator Lunges to Enemy & Snaps Jaws
          if (p < 0.6) {
            const lp = p / 0.6;
            const gx = startX + (targetX - startX - 25) * lp;
            const gy = targetY;

            ctx.save();
            ctx.translate(gx, gy);
            ctx.shadowColor = "#10b981";
            ctx.shadowBlur = 14;

            // Giant Comic Crocodile Jaws Snapping
            const mouthOpen = (1 - lp) * 0.55;
            // Upper Jaw
            ctx.save();
            ctx.rotate(-mouthOpen);
            ctx.fillStyle = "#10b981";
            ctx.strokeStyle = "#064e3b";
            ctx.lineWidth = 2.0;
            ctx.beginPath();
            ctx.ellipse(12, -8, 16, 7, 0, Math.PI, 0);
            ctx.fill();
            ctx.stroke();
            // Upper Teeth
            ctx.fillStyle = "#ffffff";
            [6, 12, 18, 24].forEach(tx => {
              ctx.beginPath();
              ctx.moveTo(tx - 2, -1);
              ctx.lineTo(tx, 5);
              ctx.lineTo(tx + 2, -1);
              ctx.fill();
            });
            ctx.restore();

            // Lower Jaw
            ctx.save();
            ctx.rotate(mouthOpen);
            ctx.fillStyle = "#059669";
            ctx.strokeStyle = "#064e3b";
            ctx.lineWidth = 2.0;
            ctx.beginPath();
            ctx.ellipse(12, 2, 16, 6, 0, 0, Math.PI);
            ctx.fill();
            ctx.stroke();
            // Lower Teeth
            ctx.fillStyle = "#ffffff";
            [8, 14, 20].forEach(tx => {
              ctx.beginPath();
              ctx.moveTo(tx - 2, 0);
              ctx.lineTo(tx, -5);
              ctx.lineTo(tx + 2, 0);
              ctx.fill();
            });
            ctx.restore();

            ctx.restore();
          }
        },
        onComplete: () => {
          if (onComplete) onComplete();
        }
      });

    } else if (companionId === "dragon") {
      // 🐲 BABY PYRO DRAGON FIRE BREATH CONE
      this.skillCombatEffects.push({
        startTime: performance.now(),
        duration: duration + 200,
        update: (progress) => {
          if (progress >= 0.5 && !hitTriggered) {
            hitTriggered = true;
            Sound.playSfx && Sound.playSfx("magicBurst");
            if (this.enemyState) {
              this.enemyState.flashWhite = 0.9;
              this.enemyState.shake = 2.0;
            }
            this.addVisualEffect("hitSpark", targetX, targetY - 25, 2.0);
            this.addMagicImpactSparks(targetX, targetY - 25, ["#ef4444", "#f97316", "#fde047", "#ffffff"]);
            if (onHit) onHit();
          }
        },
        render: (ctx) => {
          const now = performance.now();
          const elapsed = now - (this.skillCombatEffects.find(f => f.update)?.startTime || now);
          const p = Math.min(1, elapsed / duration);
          if (p < 1) {
            const bx = startX + 25;
            const by = startY - 30;

            // Flaming Breath Cone Towards Enemy
            ctx.save();
            ctx.shadowColor = "#f97316";
            ctx.shadowBlur = 24;

            const fCone = ctx.createRadialGradient(bx, by, 10, targetX, targetY - 20, 110);
            fCone.addColorStop(0, "rgba(255, 255, 255, 0.95)");
            fCone.addColorStop(0.2, "rgba(253, 224, 71, 0.85)");
            fCone.addColorStop(0.6, "rgba(249, 115, 22, 0.75)");
            fCone.addColorStop(1, "rgba(239, 68, 68, 0)");

            ctx.fillStyle = fCone;
            ctx.beginPath();
            ctx.moveTo(bx, by);
            const spread = Math.sin(p * Math.PI) * 35;
            ctx.lineTo(targetX + 15, targetY - 20 - spread);
            ctx.lineTo(targetX + 15, targetY - 20 + spread);
            ctx.closePath();
            ctx.fill();

            // Swirling Fireballs inside stream
            for (let i = 0; i < 3; i++) {
              const fbP = (p * 1.5 + i * 0.3) % 1;
              const fx = bx + (targetX - bx) * fbP;
              const fy = by + (targetY - by - 20) * fbP + Math.sin(now * 0.02 + i) * 12;
              ctx.fillStyle = "#ffffff";
              ctx.beginPath();
              ctx.arc(fx, fy, 4 * (1 - fbP * 0.5), 0, Math.PI * 2);
              ctx.fill();
            }

            ctx.restore();
          }
        },
        onComplete: () => {
          if (onComplete) onComplete();
        }
      });
    }
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
    const hasBlackHole = hasSkill("black_hole") || (p.currentAnim === "black_hole") || (p.skillTheme === "black_hole") || (p.skillExpression === "void_eye");
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
      if ((p.currentAnim === "skill" && hasBlackHole) || p.skillExpression === "void_eye") {
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

    // 12. Mythic: Black Hole / Cosmic Crystal Sword or Dragon Flame Greatsword
    const isDragonCast = p.skillTheme === "dragon" || p.skillExpression === "dragon_glow";
    const isBlackHoleCast = p.skillTheme === "black_hole" || p.skillExpression === "void_eye" || (p.currentAnim === "black_hole");
    const isDragonTheme = isDragonCast || (!isBlackHoleCast && (p.skillTheme === "dragon" || (hasSkill("dragon") && !hasSkill("black_hole"))));
    // The sword disappears once skill completes (only rendered when swordAction is actively present)
    const hasEquippedSword = !!p.swordAction && (isDragonCast || isBlackHoleCast || ((hasSkill("black_hole") || hasSkill("dragon")) && !hasSkill("blood_blade")));
    if (hasEquippedSword) {
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

      // Intense Bloom Glow (Orange for Dragon, Purple for Void)
      ctx.shadowColor = isDragonTheme ? "#f97316" : "#d946ef";
      ctx.shadowBlur = 18;

      // Dark Pommel & Grip with Golden Ring Bindings
      ctx.fillStyle = isDragonTheme ? "#451a03" : "#1e1b4b";
      ctx.strokeStyle = isDragonTheme ? "#78350f" : "#312e81";
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

      // Faceted Octagonal Pommel
      ctx.fillStyle = isDragonTheme ? "#ea580c" : "#a855f7";
      ctx.strokeStyle = "#fbbf24";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(0, 19, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = isDragonTheme ? "#fef08a" : "#f5d0fe";
      ctx.beginPath();
      ctx.arc(-0.8, 17.8, 1.2, 0, Math.PI * 2);
      ctx.fill();

      // Winged Royal Crossguard with Golden Quillons
      ctx.fillStyle = isDragonTheme ? "#991b1b" : "#581c87";
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
      ctx.fillStyle = isDragonTheme ? "#facc15" : "#d946ef";
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.arc(0, 5, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Large Faceted Blade (Length 44px, Width 14px)
      // Left Facet
      const leftGrad = ctx.createLinearGradient(-7, -44, 0, 4);
      if (isDragonTheme) {
        leftGrad.addColorStop(0, "#ffffff");
        leftGrad.addColorStop(0.25, "#fef08a");
        leftGrad.addColorStop(0.7, "#f97316");
        leftGrad.addColorStop(1, "#dc2626");
      } else {
        leftGrad.addColorStop(0, "#ffffff");
        leftGrad.addColorStop(0.25, "#f5d0fe");
        leftGrad.addColorStop(0.7, "#d946ef");
        leftGrad.addColorStop(1, "#a855f7");
      }
      ctx.fillStyle = leftGrad;
      ctx.beginPath();
      ctx.moveTo(0, -44); // Tip
      ctx.lineTo(0, 4);
      ctx.lineTo(-5.5, 3.5);
      ctx.lineTo(-6.8, -30);
      ctx.closePath();
      ctx.fill();

      // Right Facet
      const rightGrad = ctx.createLinearGradient(0, -44, 7, 4);
      if (isDragonTheme) {
        rightGrad.addColorStop(0, "#fffbeb");
        rightGrad.addColorStop(0.25, "#fb923c");
        rightGrad.addColorStop(0.7, "#ea580c");
        rightGrad.addColorStop(1, "#991b1b");
      } else {
        rightGrad.addColorStop(0, "#fdf4ff");
        rightGrad.addColorStop(0.25, "#e879f9");
        rightGrad.addColorStop(0.7, "#9333ea");
        rightGrad.addColorStop(1, "#6b21a8");
      }
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
        if (fx.render && !fx.behindPlayer) fx.render(ctx);
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

  // --- 100% Procedural 120 FPS Ancient Red Dragon, Blast & Crater Vector Engine ---

  drawDragonWing(ctx, side, now) {
    const flapFlex = Math.sin(now * 0.007) * 0.20;
    const isFront = side > 0;

    ctx.save();
    ctx.shadowColor = "#f97316";
    ctx.shadowBlur = 15;

    // Wing Membrane with Searing Flame Gradient
    const memGrad = ctx.createLinearGradient(0, -60, 42, 20);
    memGrad.addColorStop(0, isFront ? "#f97316" : "#ea580c");
    memGrad.addColorStop(0.35, isFront ? "#dc2626" : "#b91c1c");
    memGrad.addColorStop(0.75, isFront ? "#991b1b" : "#7f1d1d");
    memGrad.addColorStop(1, "rgba(45, 10, 10, 0.45)");
    ctx.fillStyle = memGrad;
    ctx.strokeStyle = "#450a0a";
    ctx.lineWidth = 1.8;

    // Aggressive Razor-Scalloped Wing Membrane Shape
    ctx.beginPath();
    ctx.moveTo(0, 0);       // Shoulder joint
    ctx.lineTo(-18, -42);   // Sharp elbow
    ctx.lineTo(8, -74);     // Primary talon joint
    // 4 Sinuous bat-draconic wing fingers & scallops
    ctx.quadraticCurveTo(32, -54 + flapFlex * 14, 50, -58);
    ctx.quadraticCurveTo(45, -34 + flapFlex * 10, 58, -28);
    ctx.quadraticCurveTo(42, -10 + flapFlex * 7, 46, 10);
    ctx.quadraticCurveTo(22, 6, 0, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Fiery Dragon Wing Veins & Spar Struts radiating from joint
    ctx.strokeStyle = "#fde047";
    ctx.lineWidth = 1.2;
    ctx.shadowColor = "#facc15";
    ctx.shadowBlur = 6;
    const struts = [
      { x: 50, y: -58 },
      { x: 58, y: -28 },
      { x: 46, y: 10 }
    ];
    struts.forEach(st => {
      ctx.beginPath();
      ctx.moveTo(8, -74);
      ctx.lineTo(st.x, st.y);
      ctx.stroke();
    });

    // Main Forearm Bone Rod
    ctx.strokeStyle = "#991b1b";
    ctx.lineWidth = 4.2;
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(-18, -42); ctx.lineTo(8, -74);
    ctx.stroke();

    // Sharp Curved Thumb Claw
    ctx.fillStyle = "#fef08a";
    ctx.strokeStyle = "#451a03";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(6, -72); ctx.lineTo(11, -85); ctx.lineTo(14, -74);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Finger talons
    struts.forEach(st => {
      ctx.fillStyle = "#fef08a";
      ctx.strokeStyle = "#451a03";
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.moveTo(st.x - 2, st.y - 2);
      ctx.lineTo(st.x + 6, st.y + (st.y < 0 ? -4 : 4));
      ctx.lineTo(st.x + 1, st.y + 4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    });

    ctx.restore();
  }

  // Draw Individual Interlocking 3D Dragon Scale
  drawDragonScale(ctx, x, y, size, angle, baseColor = "#dc2626", highlight = "#fca5a5") {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.fillStyle = baseColor;
    ctx.strokeStyle = "#380606";
    ctx.lineWidth = 1.1;

    // Diamond Shield Scale Shape
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.lineTo(size * 0.72, -size * 0.15);
    ctx.lineTo(0, size * 1.1);
    ctx.lineTo(-size * 0.72, -size * 0.15);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Sharp central ridge & specular sheen
    ctx.strokeStyle = highlight;
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.65);
    ctx.lineTo(0, size * 0.85);
    ctx.stroke();
    ctx.restore();
  }

  renderDragonBreathStream(ctx, x, y, targetX, targetY, progress, now) {
    const clamp=v=>Math.max(0,Math.min(1,v)),ease=v=>{v=clamp(v);return v*v*(3-2*v);};
    const grow=ease(progress/.30),fade=1-ease((progress-.73)/.27),power=ease(progress/.16)*fade;
    if(power<=0)return;
    const dx=targetX-x,dy=targetY-y,reach=grow,tipX=x+dx*reach,tipY=y+dy*reach;
    const length=Math.hypot(dx,dy)||1,nx=-dy/length,ny=dx/length,width=(5+23*grow)*power;
    ctx.save();ctx.globalAlpha*=power;ctx.shadowColor='#f4782b';ctx.shadowBlur=12;
    for(let layer=0;layer<3;layer++){
      const w=width*(1-layer*.31),wave=Math.sin(now*.007+layer)*w*.17;
      const g=ctx.createLinearGradient(x,y,tipX,tipY);g.addColorStop(0,layer===2?'#fff8d3':'#ffc260');g.addColorStop(.5,layer===2?'#ffd27c':'#f78128');g.addColorStop(1,layer===2?'#ffbe58':'#c93623');ctx.fillStyle=g;ctx.globalAlpha=power*(layer===0?.55:.8);
      ctx.beginPath();ctx.moveTo(x+nx*2,y+ny*2);
      ctx.bezierCurveTo(x+dx*reach*.35+nx*(w*.3+wave),y+dy*reach*.35+ny*(w*.3+wave),tipX-dx*.1+nx*w,tipY-dy*.1+ny*w,tipX+nx*w*.3,tipY+ny*w*.3);
      ctx.quadraticCurveTo(tipX+dx*.07,tipY+dy*.07,tipX-nx*w*.3,tipY-ny*w*.3);
      ctx.bezierCurveTo(tipX-dx*.1-nx*w,tipY-dy*.1-ny*w,x+dx*reach*.35-nx*(w*.3-wave),y+dy*reach*.35-ny*(w*.3-wave),x-nx*2,y-ny*2);ctx.closePath();ctx.fill();
    }
    ctx.shadowBlur=5;
    for(let i=0;i<22;i++){
      const t=(progress*2.3+i/22)%1,flow=ease(t),r=(1.1+Math.sin(t*Math.PI)*3.1)*power,offset=Math.sin(i*2.4+now*.006+t*5)*width*flow*.6;
      ctx.globalAlpha=power*Math.sin(t*Math.PI)*.65;ctx.fillStyle=i%3?'#ffae4b':'#fff1b3';ctx.beginPath();ctx.ellipse(x+dx*reach*flow+nx*offset,y+dy*reach*flow+ny*offset,r*1.7,r,Math.atan2(dy,dx),0,Math.PI*2);ctx.fill();
    }
    ctx.restore();
  }

  renderProceduralAncientDragon(ctx, x, y, scale, progress, now, isBreathing) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);

    // Smooth sinusoidal cycles for 120 FPS animations
    const flap = Math.sin(now * 0.007);
    const hoverBob = Math.sin(now * 0.004) * 3.5;

    // 1. Fiery Radiant Bloom Aura behind Dragon (Zero square edges)
    const bloomGrad = ctx.createRadialGradient(0, -10, 15, 0, -10, 85);
    bloomGrad.addColorStop(0, "rgba(255, 139, 81, 0.30)");
    bloomGrad.addColorStop(0.25, "rgba(175, 35, 37, 0.26)");
    bloomGrad.addColorStop(0.65, "rgba(220, 38, 38, 0.25)");
    bloomGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = bloomGrad;
    ctx.beginPath();
    ctx.arc(0, -10, 85, 0, Math.PI * 2);
    ctx.fill();

    // 2. Far Wing (Behind Body)
    ctx.save();
    ctx.translate(-14, -24);
    ctx.rotate(-0.35 + flap * 0.18);
    ctx.scale(.72,.78);
    this.drawDragonWing(ctx, -1, now);
    ctx.restore();

    // 3. Lean & Sinuous Serpentine Tail
    ctx.save();
    ctx.translate(-34, 4);
    const tailWave = Math.sin(now * 0.005) * 8;
    ctx.fillStyle = "#991b1b";
    ctx.strokeStyle = "#260f22";
    ctx.lineWidth = 2.0;

    ctx.beginPath();
    ctx.moveTo(13, -2);
    ctx.quadraticCurveTo(-24, 6 + tailWave * 0.5, -42, -6 + tailWave);
    ctx.quadraticCurveTo(-52, -12 + tailWave, -66, -3 + tailWave * 1.2);
    ctx.lineTo(-68, 4 + tailWave * 1.2);
    ctx.lineTo(-56, 8 + tailWave);
    ctx.quadraticCurveTo(-36, 14 + tailWave * 0.5, 13, 9);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Tail Scales Along Sinuous Length
    for (let ts = 0; ts < 4; ts++) {
      const tx = -10 - ts * 12;
      const ty = 2 + (tailWave * 0.25 * ts);
      this.drawDragonScale(ctx, tx, ty, 3.2 - ts * 0.4, -0.25, "#641c30", "#d47763");
    }

    // Bladed Spiked Tail Spade
    ctx.fillStyle = "#f97316";
    ctx.strokeStyle = "#78350f";
    ctx.lineWidth = 1.2;
    ctx.shadowColor = "#fde047";
    ctx.shadowBlur = 3;
    ctx.beginPath();
    ctx.moveTo(-58, 2 + tailWave);
    ctx.lineTo(-76, -10 + tailWave * 1.2);
    ctx.lineTo(-84, 1 + tailWave * 1.3);
    ctx.lineTo(-72, 10 + tailWave * 1.2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // 4. Lean, Muscular & Athletic Torso (No Belly Fat! Tight predatory waist)
    ctx.save();
    ctx.shadowColor = "#f97316";
    ctx.shadowBlur = 14;
    const bodyGrad = ctx.createLinearGradient(-35, -22, 18, 16);
    bodyGrad.addColorStop(0, "#d34a46");
    bodyGrad.addColorStop(0.45, "#942638");
    bodyGrad.addColorStop(1, "#7f1d1d");
    ctx.fillStyle = bodyGrad;
    ctx.strokeStyle = "#260f22";
    ctx.lineWidth = 2.2;

    ctx.beginPath();
    ctx.moveTo(-34, -10);
    ctx.quadraticCurveTo(-16, -26, 8, -20); // Back line
    ctx.quadraticCurveTo(22, -12, 18, 4);   // Muscular chest bulge
    ctx.quadraticCurveTo(6, 12, -12, 8);    // Lean, athletic tucked flank (NOT fat!)
    ctx.quadraticCurveTo(-26, 6, -34, -2);  // Muscular pelvis
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Sharp Armored Underbelly Ventral Scutes (Gold Serrated Plates)
    const bellyGrad = ctx.createLinearGradient(-10, -12, 18, 16);
    bellyGrad.addColorStop(0, "#efd3a0");
    bellyGrad.addColorStop(0.4, "#facc15");
    bellyGrad.addColorStop(1, "#ca8a04");
    ctx.fillStyle = bellyGrad;
    ctx.strokeStyle = "#78350f";
    ctx.lineWidth = 1.4;

    ctx.beginPath();
    ctx.moveTo(-6, -14);
    ctx.quadraticCurveTo(12, -8, 16, 2);
    ctx.quadraticCurveTo(8, 12, -8, 8);
    ctx.quadraticCurveTo(-4, 0, -6, -14);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Serrated plates horizontal segments with sharp shadow
    for (let s = 0; s < 4; s++) {
      const sy = -8 + s * 6;
      ctx.beginPath();
      ctx.moveTo(-5 + s * 1.2, sy);
      ctx.lineTo(14 - s * 2.0, sy + 2.5);
      ctx.stroke();
    }

    // --- OVERLAPPING INTERLOCKING DRAGON SCALES (DORSAL & FLANK) ---
    // Row 1: Upper Back Scales
    const backScales = [
      { x: -26, y: -14, rot: -0.3, s: 4.2 },
      { x: -18, y: -19, rot: -0.2, s: 4.4 },
      { x: -9,  y: -21, rot: -0.05, s: 4.5 },
      { x: 0,   y: -20, rot: 0.15, s: 4.4 },
      { x: 8,   y: -16, rot: 0.35, s: 4.0 }
    ];
    backScales.forEach(sc => {
      this.drawDragonScale(ctx, sc.x, sc.y, sc.s, sc.rot, "#942638", "#e8a480");
    });

    // Row 2: Mid-Flank Scales
    const midScales = [
      { x: -22, y: -6, rot: -0.2, s: 3.8 },
      { x: -14, y: -9, rot: -0.1, s: 4.0 },
      { x: -4,  y: -10, rot: 0.1, s: 4.0 },
      { x: 4,   y: -7, rot: 0.25, s: 3.8 }
    ];
    midScales.forEach(sc => {
      this.drawDragonScale(ctx, sc.x, sc.y, sc.s, sc.rot, "#641c30", "#d47763");
    });

    ctx.restore(); // End Torso

    // 5. Razor-Sharp Serrated Spinal Spikes
    ctx.fillStyle = "#facc15";
    ctx.strokeStyle = "#78350f";
    ctx.lineWidth = 1.2;
    const spinePoints = [
      { x: -32, y: -8,  rot: -0.65, h: 9 },
      { x: -24, y: -18, rot: -0.40, h: 12 },
      { x: -12, y: -25, rot: -0.15, h: 14 },
      { x: 0,   y: -26, rot: 0.15,  h: 13 },
      { x: 12,  y: -22, rot: 0.40,  h: 10 }
    ];
    spinePoints.forEach(sp => {
      ctx.save();
      ctx.translate(sp.x, sp.y);
      ctx.rotate(sp.rot);
      ctx.beginPath();
      ctx.moveTo(-2.5, 0); ctx.lineTo(0, -sp.h); ctx.lineTo(2.5, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    });

    // 6. Muscular Predatory Claw / Forelimb (Lean, Vascular & Deadly)
    ctx.save();
    ctx.translate(6, 8);
    ctx.rotate(0.20 + flap * 0.1);
    ctx.fillStyle = "#641c30";
    ctx.strokeStyle = "#260f22";
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-4, -6); ctx.lineTo(8, 2); ctx.lineTo(5, 15); ctx.lineTo(-2, 13);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Arm Scales
    this.drawDragonScale(ctx, 1, 4, 3.0, 0.4, "#991b1b", "#d47763");

    // 3 Razor Sharp Hooked Talons
    ctx.fillStyle = "#efd3a0";
    ctx.strokeStyle = "#451a03";
    ctx.lineWidth = 1.2;
    for (let c = -1; c <= 1; c++) {
      ctx.beginPath();
      ctx.moveTo(1 + c * 3.5, 13);
      ctx.lineTo(5 + c * 5.2, 21);
      ctx.lineTo(0 + c * 3.5, 18);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();

    // 7. Sinuous S-Curved Neck & Menacing Horned Dragon Cranium
    ctx.save();
    ctx.translate(12, -18);
    const neckSway = Math.sin(now * 0.005) * 3;
    ctx.rotate(neckSway * 0.03);

    // Lean, Muscular Serpentine Neck
    const neckGrad = ctx.createLinearGradient(0, -4, 24, -26);
    neckGrad.addColorStop(0, "#942638");
    neckGrad.addColorStop(0.5, "#d34a46");
    neckGrad.addColorStop(1, "#641c30");
    ctx.fillStyle = neckGrad;
    ctx.strokeStyle = "#260f22";
    ctx.lineWidth = 2.0;

    ctx.beginPath();
    ctx.moveTo(-3, 4);
    ctx.quadraticCurveTo(6, -10, 15, -22); // Dorsal neck curve
    ctx.lineTo(28, -22);                   // Throat top
    ctx.quadraticCurveTo(20, -2, 8, 12);   // Ventral throat curve (Lean, NOT puffy!)
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Neck Armor Scales (2 Rows of Scaled Plating along neck)
    const neckScales = [
      { x: 3,  y: -2, rot: 0.6, s: 3.8 },
      { x: 8,  y: -9, rot: 0.7, s: 3.8 },
      { x: 14, y: -16, rot: 0.8, s: 3.6 },
      { x: 9,  y: 2,  rot: 0.5, s: 3.4 },
      { x: 15, y: -4, rot: 0.65, s: 3.4 }
    ];
    neckScales.forEach(sc => {
      this.drawDragonScale(ctx, sc.x, sc.y, sc.s, sc.rot, "#641c30", "#d47763");
    });

    // Neck Dorsal Crest Spikes
    for (let ns = 0; ns < 3; ns++) {
      ctx.save();
      ctx.translate(2 + ns * 6, -3 - ns * 8);
      ctx.rotate(-0.2 + ns * 0.3);
      ctx.fillStyle = "#facc15";
      ctx.strokeStyle = "#78350f";
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.moveTo(-2, 0); ctx.lineTo(0, -8); ctx.lineTo(2, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // --- MENACING PREDATORY HEAD & HORNS ---
    ctx.translate(24, -22);

    // Multi-Tiered Sweeping Golden Dragon Horns (Sharp, Aggressive, Serrated)
    ctx.fillStyle = "#efd3a0";
    ctx.strokeStyle = "#854d0e";
    ctx.lineWidth = 1.6;
    ctx.shadowColor = "#facc15";
    ctx.shadowBlur = 3;

    // 1. Primary Giant Dragon Horn
    ctx.beginPath();
    ctx.moveTo(-4, -5);
    ctx.bezierCurveTo(-13, -11, -25, -18, -29, -30);
    ctx.bezierCurveTo(-12, -23, -7, -12, 2, -2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Horn ridges/rings
    for (let hr = 0; hr < 3; hr++) {
      const hx = -6 - hr * 7;
      const hy = -6 - hr * 5;
      ctx.strokeStyle = "#78350f";
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(hx, hy); ctx.lineTo(hx + 3, hy + 4);
      ctx.stroke();
    }

    // 2. Secondary Cheek Horn
    ctx.beginPath();
    ctx.moveTo(-2, 2);
    ctx.quadraticCurveTo(-12, -4, -22, -6);
    ctx.quadraticCurveTo(-10, 2, 3, 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 3. Sharp Brow Hornlet
    ctx.fillStyle = "#fde047";
    ctx.beginPath();
    ctx.moveTo(4, -7); ctx.lineTo(1, -13); ctx.lineTo(8, -6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Sharp Menacing Cranium & Upper Snout
    ctx.fillStyle = "#942638";
    ctx.strokeStyle = "#260f22";
    ctx.lineWidth = 2.0;
    ctx.shadowColor = "#f97316";
    ctx.shadowBlur = 2;

    ctx.beginPath();
    ctx.moveTo(-9, -5);
    ctx.lineTo(-4, -12); // Armored crown slopes into the brow.
    ctx.lineTo(6, -11);
    ctx.lineTo(15, -7);
    ctx.lineTo(22, -6);
    ctx.quadraticCurveTo(30, -5, 31, -1);
    ctx.lineTo(28, 4); // Keep the breath exit at the original mouth anchor.
    ctx.lineTo(13, 3);
    ctx.lineTo(5, 6);
    ctx.lineTo(0, 10);
    ctx.lineTo(-8, 4)
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Snout Scales & Nasal Spike
    ctx.fillStyle = "#facc15";
    ctx.beginPath();
    ctx.moveTo(25, -3); ctx.lineTo(28, -8); ctx.lineTo(29, -2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    this.drawDragonScale(ctx, 10, -3, 3.0, 0.2, "#991b1b", "#d47763");
    this.drawDragonScale(ctx, 16, -2, 2.8, 0.1, "#991b1b", "#d47763");

    ctx.save();ctx.shadowBlur=0;
    ctx.fillStyle='#401428';ctx.strokeStyle='#260f22';ctx.lineWidth=1.1;
    ctx.beginPath();ctx.moveTo(-6,-6);ctx.lineTo(7,-8);ctx.lineTo(16,-4);ctx.lineTo(7,-4);ctx.lineTo(-1,1);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.beginPath();ctx.moveTo(-7,3);ctx.lineTo(3,1);ctx.lineTo(10,5);ctx.lineTo(0,10);ctx.lineTo(-9,7);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.fillStyle='#1c0b17';ctx.beginPath();ctx.ellipse(26,-1,1.7,.8,-.25,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#edb77e';ctx.lineWidth=.65;ctx.beginPath();ctx.moveTo(-3,-10);ctx.lineTo(6,-9);ctx.lineTo(13,-6);ctx.stroke();ctx.restore();

    // Upper Sharp Curved Fangs (Menacing & Dangerous)
    ctx.fillStyle = "#ffffff";
    const upperFangs = [
      { x: 10, h: 6 },
      { x: 16, h: 7 },
      { x: 22, h: 5 }
    ];
    upperFangs.forEach(fg => {
      ctx.beginPath();
      ctx.moveTo(fg.x, 4);
      ctx.lineTo(fg.x + 2, 4 + fg.h);
      ctx.lineTo(fg.x + 3.5, 4);
      ctx.closePath();
      ctx.fill();
    });

    // Menacing Predatory Slit Eye (Glowing Crimson-Amber with Drifting Embers)
    ctx.fillStyle = "#facc15";
    ctx.shadowColor = "#fde047";
    ctx.shadowBlur = 2;
    ctx.beginPath();
    ctx.ellipse(8, -2, 3.5, 1.7, -0.22, 0, Math.PI * 2);
    ctx.fill();

    // Razor-Sharp Vertical Slit Pupil
    ctx.fillStyle = "#0a0a0a";
    ctx.beginPath();
    ctx.ellipse(8.5, -2, 0.65, 1.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Specular Gint Highlight
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(9.2, -2.6, 0.55, 0, Math.PI * 2);
    ctx.fill();

    // Articulated Roaring Lower Jaw (Sharp Spiked Chin)
    ctx.save();
    ctx.translate(2, 6);
    const smoothJaw=v=>{v=Math.max(0,Math.min(1,v));return v*v*(3-2*v);};
    const jawCharge=smoothJaw((progress-.37)/.14)*(1-smoothJaw((progress-.89)/.11));
    const jawOpen = .12 + Math.sin(now*.004)*.025 + jawCharge*.34;
    ctx.rotate(jawOpen);

    ctx.fillStyle = "#641c30";
    ctx.strokeStyle = "#260f22";
    ctx.lineWidth = 1.9;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(22, 2);   // Lower jaw tip
    ctx.lineTo(20, 5);   // Spiked Chin point
    ctx.lineTo(16, 8);   // Spiked Chin barb
    ctx.lineTo(0, 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Chin Barb Spike
    ctx.fillStyle = "#facc15";
    ctx.beginPath();
    ctx.moveTo(18, 5); ctx.lineTo(20, 11); ctx.lineTo(15, 7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Lower Curved Fangs
    ctx.fillStyle = "#ffffff";
    const lowerFangs = [
      { x: 5, h: 5 },
      { x: 11, h: 6 },
      { x: 17, h: 4 }
    ];
    lowerFangs.forEach(fg => {
      ctx.beginPath();
      ctx.moveTo(fg.x, 1);
      ctx.lineTo(fg.x + 1.8, 1 - fg.h);
      ctx.lineTo(fg.x + 3.2, 1);
      ctx.closePath();
      ctx.fill();
    });

    // Inner Throat White-Hot Plasma Core (during breath attack)
    if (isBreathing) {
      const fireCore = ctx.createRadialGradient(2, 0, 1, 14, 0, 18);
      fireCore.addColorStop(0, "#ffffff");
      fireCore.addColorStop(0.3, "#efd3a0");
      fireCore.addColorStop(0.7, "#f97316");
      fireCore.addColorStop(1, "rgba(220, 38, 38, 0)");
      ctx.fillStyle = fireCore;
      ctx.beginPath();
      ctx.ellipse(11, 0, 9, 3.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore(); // End Lower Jaw
    ctx.restore(); // End Neck & Head

    // 8. Near Wing (In Front of Body - Dynamic 120 FPS Flap)
    ctx.save();
    ctx.translate(-14, -23);
    ctx.rotate(-0.28 + flap * 0.20);
    ctx.scale(-.66,.72);
    this.drawDragonWing(ctx, 1, now);
    ctx.restore();

    ctx.restore(); // End Whole Dragon
  }

  renderProceduralBlast(ctx, x, y, p, now) {
    ctx.save();
    const blastAlpha = Math.sin(p * Math.PI);
    ctx.globalAlpha = Math.min(1, blastAlpha * 1.5);

    // 1. Central White-Hot Supernova Core
    const coreScale = 1.8 + p * 1.2;
    const cGrad = ctx.createRadialGradient(x, y - 20, 4, x, y - 20, 65 * coreScale);
    cGrad.addColorStop(0, "#ffffff");
    cGrad.addColorStop(0.2, "rgba(254, 240, 138, 0.95)");
    cGrad.addColorStop(0.55, "rgba(249, 115, 22, 0.85)");
    cGrad.addColorStop(0.85, "rgba(220, 38, 38, 0.5)");
    cGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = cGrad;
    ctx.beginPath();
    ctx.arc(x, y - 20, 65 * coreScale, 0, Math.PI * 2);
    ctx.fill();

    // 2. Jagged Cartoon Explosion Teeth (Spikes erupting outward)
    ctx.save();
    ctx.translate(x, y - 20);
    ctx.rotate(now * 0.002);
    ctx.fillStyle = "#fde047";
    ctx.strokeStyle = "#ea580c";
    ctx.lineWidth = 3.0;
    ctx.shadowColor = "#ff4500";
    ctx.shadowBlur = 24;

    const spikeCount = 14;
    ctx.beginPath();
    for (let s = 0; s < spikeCount * 2; s++) {
      const angle = (s / (spikeCount * 2)) * Math.PI * 2;
      const isSpike = s % 2 === 0;
      const r = (isSpike ? (55 + (s % 3) * 16) : 26) * coreScale;
      const sx = Math.cos(angle) * r;
      const sy = Math.sin(angle) * r;
      if (s === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // 3. Expanding Concentric Shockwave Rings along Ground
    ctx.strokeStyle = "#efd3a0";
    ctx.lineWidth = 7 * (1 - p);
    ctx.shadowColor = "#f97316";
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.ellipse(x, this.groundY, 125 * p, 34 * p, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = "#d34a46";
    ctx.lineWidth = 4 * (1 - p);
    ctx.beginPath();
    ctx.ellipse(x, this.groundY, 155 * p, 42 * p, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }

  renderProceduralCrater(ctx, x, y, p, now) {
    const crAlpha = Math.max(0, 1 - p);
    ctx.save();
    ctx.globalAlpha = crAlpha;

    // 1. Scorched Black Ellipse
    ctx.fillStyle = "rgba(28, 25, 23, 0.88)";
    ctx.beginPath();
    ctx.ellipse(x, y, 62, 20, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Molten Lava Cracks / Fissures radiating from center
    ctx.strokeStyle = "#f97316";
    ctx.lineWidth = 3.0 * crAlpha;
    ctx.shadowColor = "#fde047";
    ctx.shadowBlur = 14;

    const fissureOffsets = [
      [-38, -6], [-48, 5], [-22, 12], [0, 15],
      [26, 12], [46, 4], [35, -8], [12, -14], [-15, -12]
    ];
    ctx.beginPath();
    fissureOffsets.forEach(pt => {
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + pt[0] * 0.5 + Math.sin(pt[0]) * 4, y + pt[1] * 0.5, x + pt[0], y + pt[1]);
    });
    ctx.stroke();

    // Inner Yellow Molten Heat
    ctx.strokeStyle = "#efd3a0";
    ctx.lineWidth = 1.4 * crAlpha;
    ctx.beginPath();
    fissureOffsets.forEach(pt => {
      ctx.moveTo(x, y);
      ctx.lineTo(x + pt[0] * 0.6, y + pt[1] * 0.6);
    });
    ctx.stroke();

    ctx.restore();
  }

  launchDragonBreath(startX, startY, targetX, targetY, onHit, onComplete = null, speedMult = 1.0) {
    const totalDuration = 1750 / speedMult;
    let hitTriggered = false;
    let roarTriggered = false;
    let breathSoundTriggered = false;

    // Orchestrate Capybara Character Actions (Clean & authentic, never glitching into raw low-res frames)
    this.setPlayerAnim("skill", true);
    if (this.playerState) {
      this.playerState.skillTheme = "dragon";
      this.playerState.swordAction = "ready";
      this.playerState.skillExpression = "dragon_glow";
    }

    // Play initial flame ignition sound
    Sound.playSfx("fire");

    // Dragon Fire Wisps & Embers for Procedural 60 FPS Particle Effects
    const dragonWisps = [];
    for (let i = 0; i < 18; i++) {
      dragonWisps.push({
        angle: (i / 18) * Math.PI * 2,
        dist: 45 + (i % 3) * 16,
        speed: 0.04 + (i % 4) * 0.015,
        size: 3 + (i % 3) * 2,
        color: ["#fef08a", "#f97316", "#ef4444", "#ffffff"][i % 4]
      });
    }

    // Stream Plasma Firebolts across the Breath Beam
    const plasmaBolts = [];
    for (let i = 0; i < 7; i++) {
      plasmaBolts.push({
        tOffset: (i / 7),
        jitter: Math.random() * 14 - 7,
        size: 8 + (i % 3) * 4
      });
    }

    // Explosion Debris Shards for Phase 5
    const explosionShards = [];
    for (let i = 0; i < 22; i++) {
      const angle = (i / 22) * Math.PI * 2 + (Math.random() * 0.3 - 0.15);
      const spd = Math.random() * 90 + 50;
      explosionShards.push({
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd - 30,
        size: Math.random() * 4 + 2,
        color: ["#fde047", "#f97316", "#dc2626", "#ffffff"][i % 4]
      });
    }

    const effectStart = performance.now();

    this.skillCombatEffects.push({
      kind: "dragon-roar",
      startTime: effectStart,
      duration: totalDuration,
      update: (progress, elapsed) => {
        // Player Choreography matching Black Hole standards
        if (progress < 0.20) {
          // Phase 1: Dragon Soul Awaken
          if (this.playerState.currentAnim !== "skill") this.setPlayerAnim("skill", true);
          this.playerState.swordAction = "ready";
          this.playerState.skillExpression = "dragon_glow";
        } else if (progress < 0.38) {
          // Phase 2: Draconic Ignition & Sword Thrust
          if (this.playerState.currentAnim !== "attack") this.setPlayerAnim("attack", false);
          this.playerState.swordAction = "slash";
          this.playerState.skillExpression = "slash_squint";
        } else if (progress < 0.72) {
          // Phase 3 & 4: Dragon Manifestation & Searing Breath
          if (this.playerState.currentAnim !== "skill") this.setPlayerAnim("skill", false);
          this.playerState.swordAction = "cast";
          this.playerState.skillExpression = "dragon_glow";

          // Thermal pressure push on enemy monster during breath beam
          if (progress >= 0.52 && progress < 0.70 && this.enemyState) {
            this.enemyState.knockback = -15 * ((progress - 0.52) / 0.18);
            this.enemyState.shake = 4.0;
          }
        } else {
          // Phase 6 & 7: Settle & Recovery
          if (this.playerState.currentAnim !== "idle") this.setPlayerAnim("idle", true);
          this.playerState.swordAction = null;
          this.playerState.skillTheme = null;
          this.playerState.skillExpression = "normal";
          if (this.enemyState && progress >= 0.88) {
            this.enemyState.knockback = 0;
            this.enemyState.shake = 0;
          }
        }

        // Sound cue: Roar & Initial Ground Rumble at Manifestation (progress 0.35)
        if (progress >= 0.35 && !roarTriggered) {
          roarTriggered = true;
          Sound.playSfx("bossRoar");
          this.triggerScreenShake(1.5);
        }

        // Sound cue: Searing Dragon Breath whoosh (progress 0.50)
        if (progress >= 0.50 && !breathSoundTriggered) {
          breathSoundTriggered = true;
          Sound.playSfx("fire");
        }

        // Impact & Cataclysmic Explosion at progress 0.70!
        if (progress >= 0.70 && !hitTriggered) {
          hitTriggered = true;
          Sound.playSfx("attackHeavy");
          Sound.playSfx("magicBurst");
          this.triggerScreenShake(2.8);
          this.triggerSlashSpeedLines(targetX, targetY - 20, "#f97316");
          this.addGroundSlashFissure(targetX, this.groundY, "#ea580c");

          if (this.enemyState) {
            this.enemyState.flashWhite = 1.0;
            this.enemyState.shake = 8.5;
            this.enemyState.knockback = 32;
            setTimeout(() => { if (this.enemyState) this.enemyState.knockback = 0; }, 280 / speedMult);
          }
          this.addVisualEffect("critBurst", targetX, targetY - 20, 3.0);
          this.addMagicImpactSparks(targetX, targetY - 20, ["#ff2200", "#f97316", "#fde047", "#ffffff"]);

          try {
            if (onHit) onHit();
          } catch (err) {
            console.error("Dragon Roar onHit error:", err);
          }
        }
      },
      render: (ctx) => {
        const now = performance.now();
        const elapsed = now - effectStart;
        const p = Math.min(1, Math.max(0, elapsed / totalDuration));

        // 1. Ambient Inferno Screen Vignette (Fiery Dark Red / Gold at screen borders)
        ctx.save();
        const dimAlpha = Math.sin(p * Math.PI) * 0.65;
        const screenGrad = ctx.createRadialGradient(
          (startX + targetX) * 0.5, this.groundY - 60, 40,
          (startX + targetX) * 0.5, this.groundY - 60, this.width * 0.8
        );
        screenGrad.addColorStop(0, `rgba(40, 10, 0, ${dimAlpha * 0.2})`);
        screenGrad.addColorStop(0.5, `rgba(80, 15, 0, ${dimAlpha * 0.5})`);
        screenGrad.addColorStop(1, `rgba(20, 2, 0, ${dimAlpha * 0.85})`);
        ctx.fillStyle = screenGrad;
        ctx.fillRect(-20, -20, this.width + 40, this.height + 40);
        ctx.restore();

        // 2. Ground Summoning Ring of Fire under Capy (Phase 1 & 2, 0.00 - 0.35)
        if (p < 0.35) {
          const ringP = p < 0.15 ? (p / 0.15) : (1 - (p - 0.15) / 0.20);
          ctx.save();
          ctx.translate(this.playerState.x, this.groundY - 4);
          ctx.scale(1, 0.35); // Elliptical 3D perspective

          // Outer glowing heat aura
          const auraGrad = ctx.createRadialGradient(0, 0, 10, 0, 0, 56 * ringP);
          auraGrad.addColorStop(0, "rgba(254, 240, 138, 0.9)");
          auraGrad.addColorStop(0.3, "rgba(249, 115, 22, 0.75)");
          auraGrad.addColorStop(0.7, "rgba(220, 38, 38, 0.45)");
          auraGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
          ctx.fillStyle = auraGrad;
          ctx.beginPath();
          ctx.arc(0, 0, 56 * ringP, 0, Math.PI * 2);
          ctx.fill();

          // Dragon Rune Circles
          ctx.rotate(now * 0.003);
          ctx.strokeStyle = "#fde047";
          ctx.lineWidth = 2.5;
          ctx.shadowColor = "#f97316";
          ctx.shadowBlur = 14;
          ctx.beginPath();
          ctx.arc(0, 0, 42 * ringP, 0, Math.PI * 2);
          ctx.stroke();

          // Rune star spokes
          ctx.beginPath();
          for (let s = 0; s < 6; s++) {
            const sang = (s / 6) * Math.PI * 2;
            ctx.moveTo(Math.cos(sang) * 16 * ringP, Math.sin(sang) * 16 * ringP);
            ctx.lineTo(Math.cos(sang) * 40 * ringP, Math.sin(sang) * 40 * ringP);
          }
          ctx.stroke();

          // Rising flame tendrils
          for (let f = 0; f < 8; f++) {
            const fang = (f / 8) * Math.PI * 2;
            const fx = Math.cos(fang) * (32 * ringP);
            const fy = Math.sin(fang) * (14 * ringP);
            const fH = (22 + Math.sin(now * 0.01 + f) * 8) * ringP;

            ctx.save();
            ctx.translate(fx, fy);
            const fGrad = ctx.createLinearGradient(0, 0, 0, -fH);
            fGrad.addColorStop(0, "rgba(254, 240, 138, 0.95)");
            fGrad.addColorStop(0.5, "rgba(249, 115, 22, 0.8)");
            fGrad.addColorStop(1, "rgba(239, 68, 68, 0)");
            ctx.fillStyle = fGrad;
            ctx.beginPath();
            ctx.moveTo(-4, 0);
            ctx.quadraticCurveTo(-2, -fH * 0.6, 0, -fH);
            ctx.quadraticCurveTo(2, -fH * 0.6, 4, 0);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
          }

          ctx.restore();
        }

        // 3. Golden Crescent Fire Slash Arc (Phase 2, 0.18 - 0.35)
        if (p >= 0.18 && p < 0.35) {
          const sp = (p - 0.18) / 0.17;
          const sAlpha = Math.sin(sp * Math.PI);
          ctx.save();
          ctx.translate(this.playerState.x + 30, this.groundY - 45);
          ctx.rotate(-0.35 + sp * 0.7);
          ctx.globalAlpha = sAlpha;
          ctx.shadowColor = "#f97316";
          ctx.shadowBlur = 28;

          // Outer orange arc
          ctx.strokeStyle = "rgba(249, 115, 22, 0.95)";
          ctx.lineWidth = 16 * sAlpha;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.arc(0, 0, 58, -Math.PI * 0.65, Math.PI * 0.35);
          ctx.stroke();

          // Inner gold core
          ctx.strokeStyle = "#fef08a";
          ctx.lineWidth = 5 * sAlpha;
          ctx.beginPath();
          ctx.arc(0, 0, 58, -Math.PI * 0.6, Math.PI * 0.3);
          ctx.stroke();
          ctx.restore();
        }

        // 4. ANCIENT RED DRAGON AVATAR (Phase 3 & 4, 0.32 - 0.72) - 100% Procedural 120 FPS Vector Engine
        if (p >= 0.32 && p < 0.72) {
          const dp = (p - 0.32) / 0.40;
          const dragonAlpha = Math.sin(dp * Math.PI);

          // Dragon position: hovering majestic above Capy & surging toward enemy
          const dragonX = this.playerState.x + 50 + dp * 36;
          const dragonY = this.groundY - 110 + Math.sin(now * 0.005) * 5;
          const dScale = 1.05 + Math.sin(dp * Math.PI) * 0.10;
          const isBreathing = (p >= 0.50 && p < 0.70);

          ctx.save();
          ctx.globalAlpha = Math.min(1, dragonAlpha * 1.3);

          // 12 Orbiting Dragon Flame Wisps
          for (let w of dragonWisps) {
            const wAng = w.angle + now * w.speed * 0.04;
            const wx = dragonX + Math.cos(wAng) * (w.dist * 1.05);
            const wy = dragonY + Math.sin(wAng) * (w.dist * 0.55);
            ctx.fillStyle = w.color;
            ctx.shadowColor = w.color;
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.arc(wx, wy, w.size, 0, Math.PI * 2);
            ctx.fill();
          }

          // Render 100% Custom Animated Vector Dragon (Zero Square Boxes, Pure 120 FPS)
          this.renderProceduralAncientDragon(ctx, dragonX, dragonY, dScale, dp, now, isBreathing);

          ctx.restore();
        }

        // 5. INFERNO DRAGON BREATH STREAM (Phase 4, 0.50 - 0.70)
        if (p >= 0.50 && p < 0.70) {
          const bp = (p - 0.50) / 0.20;
          const dp = (p - 0.32) / 0.40;
          const dragonX = this.playerState.x + 50 + dp * 36;
          const dragonY = this.groundY - 110 + Math.sin(now * 0.005) * 5;
          const dScale = 1.05 + Math.sin(dp * Math.PI) * 0.10;
          // Follow the articulated muzzle, rather than starting the fire inside the neck.
          const neckAngle=Math.sin(now*.005)*.09;
          const mawX=dragonX+(12+49*Math.cos(neckAngle)+17*Math.sin(neckAngle))*dScale;
          const mawY=dragonY+(-18+49*Math.sin(neckAngle)-17*Math.cos(neckAngle))*dScale;
          this.renderDragonBreathStream(ctx,mawX,mawY,targetX,targetY-20,bp,now);
        }

        // 6. CATACLYSMIC IMPACT & SUPERNOVA DRAGON BLAST (Phase 5, 0.70 - 0.86)
        if (p >= 0.70 && p < 0.86) {
          const expP = (p - 0.70) / 0.16;

          // Pure Procedural Supernova Blast (Zero square bitmaps)
          this.renderProceduralBlast(ctx, targetX, targetY, expP, now);

          // Flying Fire Debris Shards
          for (let shard of explosionShards) {
            const sx = targetX + shard.vx * expP;
            const sy = (targetY - 20) + shard.vy * expP + 0.5 * 120 * expP * expP; // Gravity
            ctx.fillStyle = shard.color;
            ctx.shadowColor = shard.color;
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(sx, sy, shard.size * (1 - expP * 0.7), 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // 7. SCORCHED GROUND CRATER & SMOKE (Phase 6, 0.82 - 0.96)
        if (p >= 0.82 && p < 0.96) {
          const crP = (p - 0.82) / 0.14;
          const crAlpha = 1 - crP;

          // Pure Procedural Scorched Earth Lava Crater (Zero square bitmaps)
          this.renderProceduralCrater(ctx, targetX, this.groundY, crP, now);

          // Procedural Rising Dark Smoke Puffs
          for (let sm = 0; sm < 6; sm++) {
            const smX = targetX + (sm % 2 === 0 ? 1 : -1) * (14 + sm * 4) + Math.sin(now * 0.004 + sm) * 10;
            const smY = this.groundY - 20 - (crP * 55 + sm * 8);
            const smSize = 10 + crP * 16 + sm * 3;

            ctx.fillStyle = `rgba(50, 40, 40, ${crAlpha * 0.4})`;
            ctx.beginPath();
            ctx.arc(smX, smY, smSize, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // 8. DRAGON VORTEX SETTLE & FLOATING EMBERS (Phase 7, 0.88 - 1.00)
        if (p >= 0.88) {
          const settleP = (p - 0.88) / 0.12;
          const settleAlpha = 1 - settleP;

          ctx.save();
          ctx.globalAlpha = settleAlpha;

          // Swirling ember vortex around Capy's sword
          const vRadius = 36 * (1 - settleP);
          ctx.strokeStyle = "#f97316";
          ctx.lineWidth = 2.0;
          ctx.shadowColor = "#fde047";
          ctx.shadowBlur = 12;

          ctx.beginPath();
          for (let th = 0; th < Math.PI * 3; th += 0.2) {
            const rad = (th / (Math.PI * 3)) * vRadius;
            const vx = this.playerState.x + 35 + Math.cos(th + now * 0.01) * rad;
            const vy = (this.groundY - 45) + Math.sin(th + now * 0.01) * rad * 0.5;
            if (th === 0) ctx.moveTo(vx, vy);
            else ctx.lineTo(vx, vy);
          }
          ctx.stroke();

          ctx.restore();
        }
      },
      onComplete: () => {
        this.setPlayerAnim("idle", true);
        if (this.playerState) {
          this.playerState.skillTheme = null;
          this.playerState.swordAction = null;
          this.playerState.skillExpression = "normal";
        }
        if (this.enemyState) {
          this.enemyState.knockback = 0;
          this.enemyState.shake = 0;
        }
        if (onComplete) onComplete();
      }
    });
  }

  launchBlackHole(targetX, targetY, onHit, onComplete = null, speedMult = 1.0) {
    const duration = 1800 / Math.max(.25, speedMult);
    const startTime = performance.now();
    const originX = this.playerState.x + 25, originY = this.groundY - 40;
    const x = targetX, y = targetY - 28;
    let hit = false;
    const clamp = n => Math.max(0, Math.min(1, n));
    const ease = n => { n = clamp(n); return n * n * (3 - 2 * n); };
    this.setPlayerAnim("skill", false);
    this.skillCombatEffects.push({
      startTime, duration,
      update: progress => {
        if (progress >= .76 && !hit) { hit = true; if (onHit) onHit(); }
      },
      render: ctx => {
        const p = clamp((performance.now() - startTime) / duration);
        const arrival = ease((p - .12) / .22);
        const cx = originX + (x - originX) * arrival;
        const cy = originY + (y - originY) * arrival - Math.sin(arrival * Math.PI) * 24;
        const growth = ease(p / .2);
        const collapse = p > .66 ? 1 - ease((p - .66) / .13) : 1;
        const radius = (12 + 31 * ease((p - .27) / .22)) * growth * collapse;
        const fade = 1 - ease((p - .88) / .12);
        ctx.save();
        ctx.globalAlpha = fade;
        // A local gravity well: a luminous accretion disk around an opaque core.
        if (radius > .3) {
          ctx.translate(cx, cy);
          const halo = ctx.createRadialGradient(0, 0, radius*.25, 0, 0, radius*2.3);
          halo.addColorStop(0, '#ede0ff88');halo.addColorStop(.35, '#a451ed77');halo.addColorStop(.65, '#562bc340');halo.addColorStop(1, '#542bc300');
          ctx.fillStyle = halo;ctx.fillRect(-radius*2.3,-radius*2.3,radius*4.6,radius*4.6);
          ctx.save();ctx.rotate(-.32);ctx.scale(1,.46);
          for (let ring=0;ring<3;ring++) {
            ctx.beginPath();ctx.ellipse(0,0,radius*(1.3+ring*.24),radius*(1.3+ring*.24),0,0,Math.PI*2);
            ctx.strokeStyle=['#b978ff','#e1b3ff','#7b66e8'][ring];ctx.lineWidth=3-ring*.6;ctx.shadowColor='#aa62ff';ctx.shadowBlur=9;ctx.stroke();
          }
          ctx.restore();ctx.shadowBlur=0;
          for(let i=0;i<24;i++) {
            const age=(p*2.6+i/24)%1;
            const angle=i*2.39996+p*9+age*3;
            const distance=radius*(2.4-age*1.55);
            ctx.beginPath();ctx.arc(Math.cos(angle)*distance,Math.sin(angle)*distance*.65,1+(i%3)*.45,0,Math.PI*2);
            ctx.fillStyle=i%3===0?'#e6f3ff':'#c59aff';ctx.globalAlpha=fade*Math.sin(age*Math.PI);ctx.fill();
          }
          ctx.globalAlpha=fade;
          ctx.beginPath();ctx.arc(0,0,radius*.74,0,Math.PI*2);ctx.fillStyle='#080514';ctx.fill();
          ctx.strokeStyle='#f2d7ff';ctx.lineWidth=1.5;ctx.shadowColor='#b85cff';ctx.shadowBlur=12;ctx.stroke();
          // Curved light arcs slide continuously, independent of display frame count.
          ctx.shadowBlur=0;ctx.rotate(p*7);
          for(let a=0;a<3;a++){ctx.beginPath();ctx.arc(0,0,radius*.92,a*2.094,a*2.094+1.25);ctx.strokeStyle=a===0?'#f9e9ff':'#ab7cff';ctx.lineWidth=2;ctx.stroke();}
        }
        ctx.restore();
        if(p>.75){
          const burst=clamp((p-.75)/.25),r=14+ease(burst)*87;
          ctx.save();ctx.translate(x,y);ctx.globalAlpha=Math.pow(1-burst,2);
          ctx.beginPath();ctx.ellipse(0,0,r,r*.62,-.32,0,Math.PI*2);ctx.strokeStyle='#e5c5ff';ctx.lineWidth=3*(1-burst)+.5;ctx.stroke();
          for(let i=0;i<14;i++){const a=i*Math.PI*2/14;ctx.beginPath();ctx.moveTo(Math.cos(a)*r*.7,Math.sin(a)*r*.6);ctx.lineTo(Math.cos(a)*(r+8),Math.sin(a)*(r+8)*.8);ctx.strokeStyle=i%2?'#a78bfa':'#dff1ff';ctx.lineWidth=1.5;ctx.stroke();}
          ctx.restore();
        }
      },
      onComplete: () => {
        if (!hit) { hit = true; if (onHit) onHit(); }
        this.playerState.skillExpression = null;
        this.playerState.skillTheme = null;
        this.setPlayerAnim("idle", true);
        if (onComplete) onComplete();
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
      e.animHp += (e.currentHp - e.animHp) * (1-Math.pow(.82,this.frameScale??1));
    } else {
      e.animHp = e.currentHp;
    }
    const animPct = Math.max(0, Math.min(1, e.animHp / e.maxHp));

    ctx.save();
    ctx.font = `bold ${e.isBoss ? 12 : 10}px 'Fredoka', 'Nunito', sans-serif`;
    ctx.textAlign = "center";
    ctx.strokeStyle = "rgba(0,0,0,0.9)";
    ctx.lineWidth = 3;
    ctx.strokeText(window.GameLocale?.text((e.isBoss ? "👑 " : "") + e.name) ?? ((e.isBoss ? "👑 " : "") + e.name), x, y - 4);
    ctx.fillStyle = e.isBoss ? "#ffd166" : "#ffffff";
    ctx.fillText(window.GameLocale?.text((e.isBoss ? "👑 " : "") + e.name) ?? ((e.isBoss ? "👑 " : "") + e.name), x, y - 4);

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
    const formatCompactHp = (val) => {
      val = Math.round(Number(val) || 0);
      if (val >= 1000000) return (val / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
      if (val >= 10000) return Math.round(val / 1000) + "K";
      if (val >= 1000) return (val / 1000).toFixed(1).replace(/\.0$/, "") + "K";
      return val.toString();
    };
    const hpText = e.maxHp >= 10000
      ? `${formatCompactHp(Math.max(0, e.currentHp))} / ${formatCompactHp(e.maxHp)}`
      : `${Math.max(0, Math.round(e.currentHp))} / ${e.maxHp}`;
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
