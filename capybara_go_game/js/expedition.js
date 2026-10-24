// Adventure companion: deliberately uses the existing engine and save system.
(() => {
  function init() {
    const game = window.Game;
    if (!game) return;
    const {adventureEngine: engine, battleSystem: battle, ui, Character: hero} = game;
    const panel = document.getElementById('adventure-active-panel');
    if (!panel) return;
    const compass = document.createElement('section');
    compass.className = 'expedition-compass';
    compass.setAttribute('aria-label', 'Journey progress');
    compass.innerHTML = `<div class="expedition-heading"><span>✦ THE JOURNEY</span><strong class="journey-day"></strong></div>
      <div class="journey-track" role="progressbar" aria-label="Chapter progress" aria-valuemin="0" aria-valuemax="60"><div class="journey-fill"></div><span style="left:33.33%" title="Boss • Day 20">♟</span><span style="left:66.66%" title="Boss • Day 40">♟</span><span style="left:100%" title="Final boss • Day 60">♛</span></div>
      <div class="journey-caption"><span class="journey-objective"></span><span class="journey-loot"></span></div>`;
    panel.prepend(compass);
    const controls = document.createElement('div');
    controls.className = 'expedition-controls';
    controls.innerHTML = `<button type="button" class="journey-auto" aria-pressed="false">▷ Auto travel</button><span class="journey-status" role="status">Ready for adventure</span><button type="button" class="journey-build">✦ Build <b>0</b></button>`;
    panel.querySelector('.adventure-bottom-deck').before(controls);
    const auto = controls.querySelector('.journey-auto');
    let enabled = false;
    function stop() { enabled = false; engine.autoTravel = false; render(); }
    auto.addEventListener('click', () => {
      enabled = !enabled;
      // One scheduler owns auto travel, so animations finish before advancing.
      engine.autoTravel = false;
      render();
    });
    const dialog = document.createElement('dialog');
    dialog.className = 'expedition-build-dialog';
    dialog.innerHTML = `<form method="dialog"><header><div><small>YOUR ADVENTURE</small><h2>Adventure build</h2></div><button aria-label="Close build">✕</button></header></form><div class="journey-build-list"></div>`;
    document.getElementById('game-container').append(dialog);
    controls.querySelector('.journey-build').addEventListener('click', () => {
      stop();
      const list = dialog.querySelector('.journey-build-list');
      list.replaceChildren();
      const skills = hero.activeRun?.skills || [];
      if (!skills.length) list.textContent = 'No skills yet. Collect blessings and win battles to build your skill combinations.';
      for (const skill of skills) {
        const card = document.createElement('article');
        const name = document.createElement('strong');
        name.textContent = skill.name;
        const desc = document.createElement('p');
        // Descriptions are game data; strip markup for this compact reader.
        const tmp = document.createElement('div'); tmp.innerHTML = skill.desc || skill.description || '';
        desc.textContent = tmp.textContent;
        card.append(name,desc); list.append(card);
      }
      dialog.showModal();
    });
    let previousRun = hero.activeRun;
    function render() {
      const run = hero.activeRun;
      if (run !== previousRun) {enabled = false; previousRun = run;}
      if (!run) {enabled = false; return;}
      const day = Math.min(run.day || 1,run.maxDays || 60);
      const max = run.maxDays || 60;
      const completed = Math.min(max, Math.max(0, (run.day || 1) - 1));
      const boss = [20,40,60].find(n => n >= day) || max;
      compass.querySelector('.journey-day').textContent = `DAY ${day} / ${max}`;
      const track = compass.querySelector('.journey-track');
      track.setAttribute('aria-valuemax',max); track.setAttribute('aria-valuenow',completed);
      compass.querySelector('.journey-fill').style.width = `${completed/max*100}%`;
      compass.querySelector('.journey-objective').textContent = boss === day ? '⚔ Boss ahead!' : `⚔ ${boss-day} days until the boss`;
      compass.querySelector('.journey-loot').textContent = `◈ ${Math.floor(run.runGold || 0).toLocaleString()} gold`;
      controls.querySelector('.journey-build b').textContent = (run.skills || []).length;
      auto.setAttribute('aria-pressed',String(enabled));
      auto.textContent = enabled ? 'Ⅱ Stop auto' : '▷ Auto travel';
      const ev = engine.currentEvent;
      const blocked = ev && ['combat','elite','boss','narrative'].includes(ev.type);
      const pending = engine.hasPendingChest || ui.hasPendingChest || game.renderer.chestState;
      const modal = [...document.querySelectorAll('.modal-overlay')].some(el => getComputedStyle(el).display !== 'none');
      const button = document.getElementById('btn-travel-next');
      const status = controls.querySelector('.journey-status');
      status.textContent = battle.inBattle ? '⚔ In battle…' : pending ? '🎁 Collect your chest' : blocked ? 'Make your choice' : engine.traveling ? 'Exploring…' : enabled ? 'Auto travel on' : 'Continue your journey';
      // Stop at decisions, loot, skill selections and hidden tabs. Never spend or choose automatically.
      if (enabled && (blocked || pending || modal || dialog.open || document.hidden)) {stop();return;}
      if (enabled && !engine.traveling && !battle.inBattle && button && !button.disabled && button.classList.contains('state-ready')) {
        ui.handleTravelBtnClick();
      }
    }
    // Stop keyboard repeat from skipping narrative or combat decisions.
    document.addEventListener('keydown', event => {
      if (event.code !== 'Space' || event.repeat || event.target.closest('button,input,textarea,select,[contenteditable]') || document.querySelector('dialog[open]')) return;
      if (document.getElementById('tab-adventure')?.classList.contains('active') && getComputedStyle(panel).display !== 'none') {
        const button = document.getElementById('btn-travel-next');
        const modal = [...document.querySelectorAll('.modal-overlay')].some(el => getComputedStyle(el).display !== 'none');
        if (button && !button.disabled && !modal) { event.preventDefault(); button.click(); }
      }
    });
    document.addEventListener('visibilitychange', () => {if (document.hidden) stop();});
    const observer = new MutationObserver(render);
    observer.observe(document.getElementById('btn-travel-next'),{attributes:true,attributeFilter:['class','disabled']});
    setInterval(render,650);
    render();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',init); else init();
})();
