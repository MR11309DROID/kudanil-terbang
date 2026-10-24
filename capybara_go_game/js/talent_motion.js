// Upgrade feedback uses the actual committed stats, never a second purchase.
(() => {
  const active = new WeakMap();
  function animate(element, frames, options) {
    if (!element?.animate) return;
    const motion = element.animate(frames, options);
    motion.finished.catch(() => {});
    return motion;
  }
  UIManager.prototype.playTalentUpgrade = function(statKey, beforePower, afterPower) {
    const stage = document.querySelector('.talents-hero-stage');
    if (!stage) return;
    const old = active.get(stage);
    if (old) old();
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const motions = [];
    let frame = 0, timer = 0, removed = false;
    const banner = document.createElement('div');
    banner.className = 'talent-power-reveal';
    banner.setAttribute('role', 'status');
    banner.setAttribute('aria-label', `Power increased by ${Math.max(0, afterPower - beforePower)} to ${afterPower}`);
    banner.innerHTML = '<span class="talent-power-emblem" aria-hidden="true">⚔</span><strong class="talent-power-number" aria-hidden="true"></strong><span class="talent-power-gain" aria-hidden="true"></span>';
    const number = banner.querySelector('.talent-power-number');
    const gain = banner.querySelector('.talent-power-gain');
    number.textContent = Math.round(beforePower).toLocaleString('en-US');
    gain.textContent = `↑ +${Math.max(0, afterPower - beforePower).toLocaleString('en-US')}`;
    const burst = document.createElement('div');
    burst.className = 'talent-upgrade-burst';
    burst.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < 6; i++) {
      const spark = document.createElement('i');
      spark.style.setProperty('--angle', `${i * 60}deg`);
      spark.style.setProperty('--delay', `${i * 25}ms`);
      burst.append(spark);
    }
    const cleanup = () => {
      if (removed) return;
      removed = true;
      cancelAnimationFrame(frame); clearTimeout(timer);
      motions.forEach(m => m?.cancel());
      banner.remove(); burst.remove();
      active.delete(stage);
    };
    active.set(stage, cleanup);
    stage.append(burst, banner);
    const card = document.getElementById(`card-upgrade-${statKey}`);
    const icon = card?.querySelector('.stat-card-icon');
    const level = document.getElementById(`stat-lvl-${statKey}`);
    const hero = stage.querySelector('.talents-capy-hero-img');
    if (!reduced) {
      motions.push(animate(card, [
        {transform:'translateY(0) scale(1)',filter:'brightness(1)'},
        {transform:'translateY(2px) scale(.97)',filter:'brightness(1.04)',offset:.18},
        {transform:'translateY(-3px) scale(1.025)',filter:'brightness(1.16)',offset:.58},
        {transform:'translateY(0) scale(1)',filter:'brightness(1)'}
      ], {duration:380,easing:'cubic-bezier(.2,.7,.25,1)'}));
      motions.push(animate(icon, [{transform:'scale(1)'},{transform:'scale(1.12)',offset:.5},{transform:'scale(1)'}],{duration:400,easing:'ease-out'}));
      motions.push(animate(level, [{color:'#fff6be',transform:'scale(1.15)'},{color:'inherit',transform:'scale(1)'}],{duration:500,easing:'ease-out'}));
      motions.push(animate(hero, [{filter:'brightness(1)'},{filter:'brightness(1.2) drop-shadow(0 0 12px #ffe486)',offset:.4},{filter:'brightness(1)'}],{duration:600,easing:'ease-out'}));
      motions.push(animate(banner,[{opacity:0,transform:'translateY(8px) scaleX(.88)'},{opacity:1,transform:'translateY(0) scaleX(1)'}],{duration:220,easing:'cubic-bezier(.16,1,.3,1)',fill:'both'}));
      motions.push(animate(gain,[{opacity:0,transform:'translateY(7px)'},{opacity:1,transform:'translateY(0)'}],{delay:180,duration:280,fill:'both',easing:'ease-out'}));
    }
    const started = performance.now();
    function tick(now) {
      if (removed) return;
      const t = reduced ? 1 : Math.min(1, (now - started) / 520);
      const eased = 1 - Math.pow(1 - t, 3);
      number.textContent = Math.round(beforePower + (afterPower - beforePower) * eased).toLocaleString('en-US');
      if (t < 1) frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    timer = setTimeout(() => {
      if (reduced) {cleanup();return;}
      const exit = animate(banner,[{opacity:1,transform:'translateY(0)'},{opacity:0,transform:'translateY(-5px)'}],{duration:220,easing:'ease-out',fill:'forwards'});
      if (exit) exit.finished.then(cleanup).catch(cleanup); else cleanup();
    }, reduced ? 700 : 1100);
  };
})();
