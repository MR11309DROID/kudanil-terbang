// Capybara Go! - Advanced Bulletproof Audio Manager
class AudioManager {
  constructor() {
    this.musicVolume = 0.55;
    this.sfxVolume = 1.0;
    this.muted = localStorage.getItem("capybara_go_muted") === "true";
    this.bgmMuted = localStorage.getItem("capybara_go_bgm_muted") === "true";
    this.sfxMuted = localStorage.getItem("capybara_go_sfx_muted") === "true";
    this.currentTrackName = null;
    this.currentMusicAudio = null;
    this.unlocked = false;

    this.musicTracks = {
      menu: "assets/audio/music/menu_loop.wav",
      adventure: "assets/audio/music/adventure_loop.wav",
      battle: "assets/audio/music/battle_loop.wav"
    };

    this.sfxFiles = {
      click: "assets/audio/sfx/ui_click.wav",
      confirm: "assets/audio/sfx/ui_confirm.wav",
      cancel: "assets/audio/sfx/ui_cancel.wav",
      hover: "assets/audio/sfx/ui_hover.wav",
      slash: "assets/audio/sfx/slash.wav",
      attackLight: "assets/audio/sfx/attack_light.wav",
      attackHeavy: "assets/audio/sfx/attack_heavy.wav",
      hit: "assets/audio/sfx/hit.wav",
      enemyHit: "assets/audio/sfx/enemy_hit.wav",
      enemyDie: "assets/audio/sfx/enemy_die.wav",
      bossRoar: "assets/audio/sfx/boss_roar.wav",
      bossHit: "assets/audio/sfx/boss_hit.wav",
      dodge: "assets/audio/sfx/dodge_whoosh.wav",
      heal: "assets/audio/sfx/heal.wav",
      shield: "assets/audio/sfx/shield.wav",
      fire: "assets/audio/sfx/fire_spell.wav",
      ice: "assets/audio/sfx/ice_spell.wav",
      lightning: "assets/audio/sfx/lightning_spell.wav",
      magicBurst: "assets/audio/sfx/magic_burst.wav",
      levelUp: "assets/audio/sfx/level_up.wav",
      chestOpen: "assets/audio/sfx/chest_open_v2.wav",
      chestOpenSmall: "assets/audio/sfx/chest_open.wav",
      lootRare: "assets/audio/sfx/loot_rare.wav",
      coin: "assets/audio/sfx/coin_pickup.wav",
      gem: "assets/audio/sfx/gem_pickup.wav",
      victory: "assets/audio/sfx/victory.wav",
      defeat: "assets/audio/sfx/defeat.wav",
      stageClear: "assets/audio/sfx/stage_clear.wav",
      // Authentic YouTube Fortune SFX (0:40-0:50)
      fortune: "assets/audio/sfx/fortune_real.wav",
      majorFortune: "assets/audio/sfx/major_fortune_real.wav",
      misfortune: "assets/audio/sfx/misfortune_real.wav",
      badLuck: "assets/audio/sfx/misfortune_real.wav",
      minorWin: "assets/audio/sfx/authentic_minor_win.wav",
      bigWin: "assets/audio/sfx/authentic_big_win.wav",
      coinFountain: "assets/audio/sfx/authentic_coin_fountain.wav"
    };

    // Preloaded HTML5 Audio objects pool
    this.sfxPool = {};
    for (const [key, path] of Object.entries(this.sfxFiles)) {
      try {
        const a = new Audio(path);
        a.preload = "auto";
        this.sfxPool[key] = a;
      } catch (e) {}
    }

    // In-memory decoded Web Audio API buffers (zero latency, immune to browser autoplay restrictions once unlocked)
    this.audioBuffers = {};

    // Load saved mute setting
    const savedMute = localStorage.getItem("capybara_go_muted");
    if (savedMute !== null) {
      this.muted = savedMute === "true";
    }

    // Shared Persistent Web Audio Context
    this.audioCtx = null;
    this.initAudioContext();

    // Begin asynchronous decoding for instant zero-latency playback
    this.preloadKeyBuffers();

    // Global User Gesture Unlocker on any user interaction
    const unlockHandler = () => {
      this.unlockAndWarmup();
    };

    window.addEventListener("pointerdown", unlockHandler, { passive: true });
    window.addEventListener("mousedown", unlockHandler, { passive: true });
    window.addEventListener("touchstart", unlockHandler, { passive: true });
    window.addEventListener("keydown", unlockHandler, { passive: true });
    window.addEventListener("click", unlockHandler, { passive: true });
  }

  initAudioContext() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx && !this.audioCtx) {
        this.audioCtx = new AudioCtx();
      }
    } catch (e) {
      console.warn("[Sound] Web Audio API initialization:", e);
    }
  }

  getAudioContext() {
    if (!this.audioCtx) {
      this.initAudioContext();
    }
    return this.audioCtx;
  }

  resumeAudioContext() {
    const ctx = this.getAudioContext();
    if (ctx && ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
  }

  // Actively unlock audio context and prime audio hardware upon direct user interaction
  unlockAndWarmup() {
    this.unlocked = true;
    const ctx = this.getAudioContext();
    if (ctx) {
      if (ctx.state === "suspended") {
        ctx.resume().catch(() => {});
      }
      // Play a sub-audible 0.001s silent pulse to guarantee hardware activation
      try {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, ctx.currentTime);
        osc.connect(g);
        g.connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.005);
      } catch (e) {}
    }

    // Also prime key SFX audio tags
    ["fortune", "majorFortune", "misfortune"].forEach(k => {
      const el = this.sfxPool[k];
      if (el && el.paused && el.readyState >= 2) {
        const origVol = el.volume;
        el.volume = 0;
        const p = el.play();
        if (p && p.then) {
          p.then(() => {
            el.pause();
            el.currentTime = 0;
            el.volume = origVol;
          }).catch(() => {});
        }
      }
    });

    if (this.currentMusicAudio && !this.muted && this.currentMusicAudio.paused) {
      this.currentMusicAudio.play().catch(() => {});
    }
  }

  async preloadKeyBuffers() {
    const criticalKeys = [
      "fortune", "majorFortune", "misfortune", "minorWin", "bigWin", "coinFountain",
      "click", "confirm", "levelUp", "victory", "defeat", "lootRare"
    ];

    for (const key of criticalKeys) {
      const path = this.sfxFiles[key];
      if (!path) continue;
      this.loadBuffer(key, path);
    }
  }

  async loadBuffer(key, path) {
    try {
      const resp = await fetch(path);
      if (!resp.ok) return;
      const arrayBuf = await resp.arrayBuffer();
      const ctx = this.getAudioContext();
      if (ctx) {
        ctx.decodeAudioData(arrayBuf, (decoded) => {
          this.audioBuffers[key] = decoded;
        }, (err) => {
          // decoding fallback handled
        });
      }
    } catch (e) {
      // Fetch error handled
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    localStorage.setItem("capybara_go_muted", this.muted);
    if (this.currentMusicAudio) {
      if (this.muted || this.bgmMuted) {
        this.currentMusicAudio.pause();
      } else if (this.unlocked) {
        this.currentMusicAudio.play().catch(() => {});
      }
    }
    return this.muted;
  }

  toggleBgm() {
    this.bgmMuted = !this.bgmMuted;
    localStorage.setItem("capybara_go_bgm_muted", this.bgmMuted);
    if (this.currentMusicAudio) {
      if (this.bgmMuted || this.muted) {
        this.currentMusicAudio.pause();
      } else if (this.unlocked) {
        this.currentMusicAudio.play().catch(() => {});
      }
    }
    return !this.bgmMuted;
  }

  toggleSfx() {
    this.sfxMuted = !this.sfxMuted;
    localStorage.setItem("capybara_go_sfx_muted", this.sfxMuted);
    return !this.sfxMuted;
  }

  playMusic(trackName) {
    if (this.currentTrackName === trackName && this.currentMusicAudio) {
      if (!this.muted && !this.bgmMuted && this.currentMusicAudio.paused && this.unlocked) {
        this.currentMusicAudio.play().catch(() => {});
      }
      return;
    }

    const path = this.musicTracks[trackName];
    if (!path) return;

    if (this.currentMusicAudio) {
      const oldAudio = this.currentMusicAudio;
      let fade = 1.0;
      const fadeInterval = setInterval(() => {
        fade -= 0.2;
        if (fade <= 0) {
          clearInterval(fadeInterval);
          oldAudio.pause();
        } else {
          oldAudio.volume = Math.max(0, fade * this.musicVolume);
        }
      }, 50);
    }

    this.currentTrackName = trackName;
    const audio = new Audio(path);
    audio.loop = true;
    audio.volume = (this.muted || this.bgmMuted) ? 0 : this.musicVolume;
    this.currentMusicAudio = audio;

    if (!this.muted && !this.bgmMuted && this.unlocked) {
      audio.play().catch(() => {});
    }
  }

  // --- Primary Bulletproof Sound Effect Trigger ---
  playSfx(sfxName) {
    if (this.muted || this.sfxMuted) return;
    this.resumeAudioContext();

    // 1. Prioritize zero-latency Web Audio API AudioBuffer playback
    const ctx = this.getAudioContext();
    const buffer = this.audioBuffers[sfxName];
    if (ctx && buffer) {
      try {
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        const gainNode = ctx.createGain();
        gainNode.gain.setValueAtTime(Math.min(1.0, this.sfxVolume * 1.15), ctx.currentTime);
        source.connect(gainNode);
        gainNode.connect(ctx.destination);
        source.start(0);
        return;
      } catch (e) {
        console.warn("[Sound] WebAudio buffer play error:", e);
      }
    }

    // 2. Secondary Preloaded HTML5 Audio Element playback
    const path = this.sfxFiles[sfxName];
    if (path) {
      try {
        let poolAudio = this.sfxPool[sfxName];
        if (!poolAudio || !poolAudio.paused) {
          poolAudio = new Audio(path);
        }
        poolAudio.currentTime = 0;
        poolAudio.volume = this.sfxVolume;
        const playPromise = poolAudio.play();
        if (playPromise && playPromise.catch) {
          playPromise.catch(() => {
            // If HTML5 audio is blocked by browser policy, run synthesized tones
            this.playSynthesizedFallback(sfxName);
          });
        }
        return;
      } catch (e) {
        this.playSynthesizedFallback(sfxName);
        return;
      }
    }

    this.playSynthesizedFallback(sfxName);
  }

  // Convenience methods for fortune events
  playFortuneChime() {
    this.playSfx("fortune");
  }

  playMajorFortuneFanfare() {
    this.playSfx("majorFortune");
  }

  playMisfortuneThud() {
    this.playSfx("misfortune");
  }

  playBadLuckThud() {
    this.playSfx("badLuck");
  }

  playMinorWin() {
    this.playSfx("minorWin");
  }

  playBigWin() {
    this.playSfx("bigWin");
  }

  playCoinFountain() {
    this.playSfx("coinFountain");
  }

  // Guaranteed Synthesized Fallback if browser media stack blocks audio files
  playSynthesizedFallback(sfxName) {
    if (this.muted || this.sfxMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    if (sfxName === "fortune") {
      const notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);
        g.gain.setValueAtTime(0.35 * this.sfxVolume, now + idx * 0.08);
        g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.35);
        osc.connect(g);
        g.connect(ctx.destination);
        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.38);
      });
    } else if (sfxName === "majorFortune") {
      const notes = [392.00, 523.25, 659.25, 783.99, 1046.50, 1318.51];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);
        g.gain.setValueAtTime(0.45 * this.sfxVolume, now + idx * 0.08);
        g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.6);
        osc.connect(g);
        g.connect(ctx.destination);
        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.65);
      });
    } else if (sfxName === "misfortune") {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(35, now + 0.3);
      g.gain.setValueAtTime(0.6 * this.sfxVolume, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.36);
    } else if (sfxName === "coin") {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(987.77, now);
      osc.frequency.exponentialRampToValueAtTime(1318.5, now + 0.05);
      g.gain.setValueAtTime(0.3 * this.sfxVolume, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.13);
    } else if (sfxName === "coinFountain") {
      const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + idx * 0.04);
        g.gain.setValueAtTime(0.25 * this.sfxVolume, now + idx * 0.04);
        g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.04 + 0.18);
        osc.connect(g);
        g.connect(ctx.destination);
        osc.start(now + idx * 0.04);
        osc.stop(now + idx * 0.04 + 0.20);
      });
    }
  }
}

const Sound = new AudioManager();

// Global diagnostic helper for developer & player inspection
window.testFortuneSound = (type = "fortune") => {
  if (Sound.muted) {
    Sound.toggleMute();
  }
  Sound.unlockAndWarmup();
  if (type === "major" || type === "majorFortune") {
    Sound.playMajorFortuneFanfare();
  } else if (type === "misfortune") {
    Sound.playMisfortuneThud();
  } else {
    Sound.playFortuneChime();
  }
  console.log(`[Sound] Triggered authentic YouTube SFX: ${type}`);
};
