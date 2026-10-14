// Capybara Go! - Main Game Entry Point
function initGame() {
  const canvas = document.getElementById("stage-canvas");
  if (!canvas) return;

  // Set crisp canvas dimensions for 50:50 split
  canvas.width = 440;
  canvas.height = 350;

  try {
    // Initialize Core Systems
    const renderer = new StageRenderer(canvas);
    const battleSystem = new BattleSystem(renderer);
    const adventureEngine = new AdventureEngine(renderer, battleSystem);
    const ui = new UIManager(adventureEngine, battleSystem);

    // Set initial background for idle or active run
    const activeChapterId = (Character.activeRun && Character.activeRun.chapterId) || 1;
    const chapter = GameData.chapters.find(c => c.id === activeChapterId) || GameData.chapters[0];
    if (chapter) {
      renderer.setBackground(chapter.bg);
    }

    // Energy regeneration interval (1 energy every 5 mins)
    setInterval(() => {
      if (Character.energy < Character.maxEnergy) {
        Character.energy++;
        Character.save();
        ui.renderHeader();
      }
    }, 300000);

    // Expose for debugging if needed
    window.ui = ui;
    window.Game = {
      renderer,
      battleSystem,
      adventureEngine,
      ui,
      Character,
      GameData,
      Sound,
      Gacha
    };
  } catch (err) {
    console.error("Game core init error:", err);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initGame);
} else {
  initGame();
}
