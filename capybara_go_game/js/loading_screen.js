// Capybara Go! - Authentic Mobile Loading Screen Engine (Habby Style)
class LoadingScreen {
  static init() {
    if (this._initialized) return;
    this._initialized = true;

    this.overlay = document.getElementById("loading-screen");
    this.progressBar = document.getElementById("loading-bar-fill");
    this.mascot = document.getElementById("loading-mascot-runner");
    this.mascotImg = document.getElementById("loading-mascot-img");
    this.statusText = document.getElementById("loading-status-text");
    this.percentText = document.getElementById("loading-percentage");
    this.tapPrompt = document.getElementById("loading-tap-prompt");
    this.barContainer = document.querySelector(".loading-bar-container");
    this.statusWrap = document.querySelector(".loading-status-wrap");

    if (!this.overlay) return;

    this.progress = 0;
    this.frameIndex = 1;
    this.mascotAnimTimer = null;
    this.isReady = false;
    this.hasStarted = false;

    // Start mascot run cycle immediately
    this.startMascotAnimation();

    // Start smooth, guaranteed progress ticker
    this.startLoadingProgress();

    // Bind Tap to Start click handlers (whole screen tap or button)
    this.overlay.addEventListener("click", () => this.handleTapToStart());
  }

  static startMascotAnimation() {
    if (this.mascotAnimTimer) clearInterval(this.mascotAnimTimer);
    this.mascotAnimTimer = setInterval(() => {
      this.frameIndex = (this.frameIndex % 9) + 1;
      const frameNum = String(this.frameIndex).padStart(2, "0");
      if (this.mascotImg) {
        this.mascotImg.src = `assets/characters/player/run/frame_${frameNum}.png`;
      }
    }, 85);
  }

  static startLoadingProgress() {
    const totalDurationMs = 2000; // Fast and snappy 2-second loading
    const startTime = performance.now();

    const updateStatusMessage = (pct) => {
      if (!this.statusText) return;
      if (pct < 25) {
        this.statusText.textContent = "Checking for update...";
      } else if (pct < 50) {
        this.statusText.textContent = "Verifying local game data...";
      } else if (pct < 75) {
        this.statusText.textContent = "Preloading skills & equipment...";
      } else if (pct < 98) {
        this.statusText.textContent = "Syncing Capybara talents & blessings...";
      } else {
        this.statusText.textContent = "Ready for Adventure!";
      }
    };

    const progressLoop = () => {
      if (this.isReady) return;

      const elapsed = performance.now() - startTime;
      const linearProgress = Math.min(1, elapsed / totalDurationMs);
      
      // Gentle ease-out curve for natural game feel
      const easedProgress = Math.round((1 - Math.pow(1 - linearProgress, 2.2)) * 100);
      
      this.progress = Math.min(100, Math.max(this.progress, easedProgress));
      this.updateUI(this.progress);
      updateStatusMessage(this.progress);

      if (this.progress >= 100) {
        this.onLoadingComplete();
      } else {
        requestAnimationFrame(progressLoop);
      }
    };

    // Fallback timer: guarantees completion even if tab is throttled or in background
    setTimeout(() => {
      if (!this.isReady) {
        this.progress = 100;
        this.updateUI(100);
        this.onLoadingComplete();
      }
    }, totalDurationMs + 300);

    requestAnimationFrame(progressLoop);
  }

  static updateUI(pct) {
    const rounded = Math.min(100, Math.floor(pct));
    if (this.progressBar) {
      this.progressBar.style.width = `${rounded}%`;
    }
    if (this.percentText) {
      this.percentText.textContent = `${rounded}%`;
    }
    if (this.mascot) {
      // Keep mascot clamped so it doesn't overflow right edge
      const clamped = Math.max(0, Math.min(94, rounded));
      this.mascot.style.left = `${clamped}%`;
    }
  }

  static onLoadingComplete() {
    if (this.isReady) return;
    this.isReady = true;
    this.updateUI(100);

    if (this.statusText) {
      this.statusText.textContent = "Ready for Adventure!";
    }

    // Stop mascot running animation, set to idle frame
    if (this.mascotAnimTimer) {
      clearInterval(this.mascotAnimTimer);
      this.mascotAnimTimer = null;
    }
    if (this.mascotImg) {
      this.mascotImg.src = "assets/characters/player/idle/frame_01.png";
    }

    // Transition progress bar to Tap to Start prompt
    setTimeout(() => {
      if (this.barContainer) this.barContainer.style.display = "none";
      if (this.statusWrap) this.statusWrap.style.display = "none";
      if (this.tapPrompt) {
        this.tapPrompt.style.display = "flex";
        this.tapPrompt.classList.add("pulse-active");
      }
    }, 150);
  }

  static handleTapToStart() {
    // If user taps while loading is still in progress, accelerate immediately to ready
    if (!this.isReady) {
      this.onLoadingComplete();
      return;
    }

    if (this.hasStarted) return;
    this.hasStarted = true;

    // Cheerful game launch chime
    if (window.Sound) {
      Sound.playSfx("reward");
      // Unlock audio and start BGM
      if (window.Character && Character.activeRun) {
        Sound.playMusic("adventure");
      } else {
        Sound.playMusic("menu");
      }
    }

    // Smooth cinematic fade out
    this.overlay.classList.add("fade-out");
    setTimeout(() => {
      this.overlay.style.display = "none";
    }, 600);
  }
}

// Auto-run immediately as soon as DOM is ready or inline
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => LoadingScreen.init());
} else {
  LoadingScreen.init();
}
