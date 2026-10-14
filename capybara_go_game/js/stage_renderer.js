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
      attack: 9,
      skill: 9,
      hurt: 9,
      die: 7
    };

    for (const [anim, count] of Object.entries(counts)) {
      this.playerAnimations[anim] = [];
      for (let i = 1; i <= count; i++) {
        const frameNum = String(i).padStart(2, "0");
        const path = `assets/characters/player/${anim}/frame_${frameNum}.png`;
        const img = new Image();
        img.src = path;
        this.playerAnimations[anim].push(img);
      }
    }
  }

  setBackground(bgPath) {
    if (!bgPath) return;
    const img = new Image();
    img.onload = () => {
      this.bgImage = this.createSeamlessTexture(img);
    };
    img.src = bgPath;
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

    if (animName === "attack") this.playerState.fps = 16;
    else if (animName === "skill") this.playerState.fps = 15;
    else if (animName === "walk") this.playerState.fps = 12;
    else if (animName === "run") this.playerState.fps = 14;
    else if (animName === "hurt") this.playerState.fps = 14;
    else if (animName === "die") this.playerState.fps = 9;
    else this.playerState.fps = 10;
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

  // --- Player Authentic Running Charge Attack Action (Matches Reference Screenshot) ---

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
    // Capybara charges all the way to enemy's front (melee contact)
    const targetContactX = e.x - 38;
    const chargeDuration = 220 / speedMult;
    const slashImpactDuration = 140 / speedMult;
    const returnDuration = 200 / speedMult;

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
        // Phase 2: Reached enemy! Deliver clean normal punch / strike
        p.x = targetContactX;
        p.offsetY = 0;
        this.setPlayerAnim("attack", false);
        Sound.playSfx("hit");

        // Subtle normal dust puff at feet
        this.addRunDustPuff(p.x - 8, this.groundY - 2, -0.8);

        // Deliver normal impact hit (clean without magic visuals)
        if (onHit) onHit();

        // Hold attack frame briefly for impact feel, then hop back
        setTimeout(() => {
          // Phase 3: Hop / leap back to home position
          const returnStartTime = performance.now();
          const startReturnX = p.x;
          // While jumping backwards, face forward with idle/walk frame
          this.setPlayerAnim("walk", true);

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
      }
    };

    requestAnimationFrame(forwardRunStep);
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

  startRenderLoop() {
    const loop = (timestamp) => {
      const dt = (timestamp - this.lastTime) / 1000;
      this.lastTime = timestamp;

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



    // Update Near-Camera Foreground 3D Foliage & Petals
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
            if (p.currentAnim === "hurt") {
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
            cs.onLanded();
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
  }

  render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

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
    for (const pt of this.ambientParticles) {
      ctx.globalAlpha = pt.alpha;
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // ================= 6.5 DRAW SPRINT DUST TRAILS & CARTOON IMPACT SKID (Under Actors) =================
    this.renderDustEffects(ctx);

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

    ctx.drawImage(frameImg, -drawW / 2, -drawH, drawW, drawH);

    ctx.restore();

    // In-Battle Player Overhead HP Bar
    if (this.inBattle && p.currentHp !== undefined && p.maxHp) {
      const hpBarY = this.groundY + (p.offsetY || 0) - drawH - 12;
      this.renderPlayerHpBar(px, hpBarY, p);
    }
  }

  renderPlayerHpBar(x, y, p) {
    const ctx = this.ctx;
    const barW = 80;
    const barH = 9;
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
    ctx.font = "bold 11px 'Fredoka', 'Nunito', sans-serif";
    ctx.textAlign = "center";
    ctx.strokeStyle = "rgba(0,0,0,0.9)";
    ctx.lineWidth = 3;
    ctx.strokeText("🐾 Capy", x, y - 5);
    ctx.fillStyle = "#ffffff";
    ctx.fillText("🐾 Capy", x, y - 5);

    // Track Background
    ctx.fillStyle = "rgba(15, 23, 42, 0.88)";
    ctx.strokeStyle = "#475569";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(x - barW / 2, y, barW, barH, 4.5);
    ctx.fill();
    ctx.stroke();

    // Damage Lag Bar (Yellow/White)
    if (animPct > pct) {
      ctx.fillStyle = "#fef08a";
      ctx.beginPath();
      ctx.roundRect(x - barW / 2, y, barW * animPct, barH, 4.5);
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
    const barW = e.isBoss ? 110 : 80;
    const barH = 10;
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
    ctx.font = `bold ${e.isBoss ? 13 : 11}px 'Fredoka', 'Nunito', sans-serif`;
    ctx.textAlign = "center";
    ctx.strokeStyle = "rgba(0,0,0,0.9)";
    ctx.lineWidth = 3;
    ctx.strokeText((e.isBoss ? "👑 " : "") + e.name, x, y - 5);
    ctx.fillStyle = e.isBoss ? "#ffd166" : "#ffffff";
    ctx.fillText((e.isBoss ? "👑 " : "") + e.name, x, y - 5);

    ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
    ctx.strokeStyle = "#475569";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(x - barW / 2, y, barW, barH, 5);
    ctx.fill();
    ctx.stroke();

    // Damage Lag Chunk (White/Yellow)
    if (animPct > pct) {
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.roundRect(x - barW / 2, y, barW * animPct, barH, 5);
      ctx.fill();
    }

    if (pct > 0) {
      const grad = ctx.createLinearGradient(x - barW / 2, 0, x - barW / 2 + barW * pct, 0);
      grad.addColorStop(0, "#ef4444");
      grad.addColorStop(1, "#f97316");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(x - barW / 2, y, barW * pct, barH, 5);
      ctx.fill();
    }
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
