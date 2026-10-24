// A new presentation for the existing permanent-upgrade system.
(() => {
 function init(){
  const game=window.Game,screen=document.querySelector('.capy-talents-screen');if(!game||!screen)return;
  screen.classList.add('capy-camp');
  const title=document.getElementById('talents-rank-title');
  const heading=document.createElement('header');heading.className='camp-heading';heading.innerHTML='<div><small>WOODLAND RETREAT</small><h1>Capy Camp</h1></div><span class="camp-power"></span>';title.before(heading);title.classList.add('camp-rank');
  const stage=screen.querySelector('.talents-hero-stage');
  stage.classList.add('camp-clearing');
  const scenery=document.createElement('div');scenery.className='camp-scenery';scenery.setAttribute('aria-hidden','true');
  scenery.innerHTML=`<svg viewBox="0 0 420 260" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="campSky" x2="0" y2="1"><stop stop-color="#c8dfca"/><stop offset="1" stop-color="#f2e8be"/></linearGradient><linearGradient id="campGrass" x2="0" y2="1"><stop stop-color="#a8c18a"/><stop offset="1" stop-color="#769c75"/></linearGradient></defs><rect width="420" height="260" fill="url(#campSky)"/><circle cx="320" cy="45" r="28" fill="#fff3b5" opacity=".8"/><path d="M0 110Q85 42 170 99T420 90V260H0Z" fill="#90b4a0"/><path d="M0 155Q130 103 240 145T420 130V260H0Z" fill="url(#campGrass)"/><g fill="#4c7b66" stroke="#37594d" stroke-width="3"><path d="M-10 145L30 18 74 145Z"/><path d="M350 133L388 6 430 133Z"/></g><g stroke="#64583d" stroke-width="5" stroke-linecap="round"><path d="M30 95v74M387 94v66"/></g><ellipse cx="216" cy="218" rx="112" ry="28" fill="#547b5d" opacity=".25"/><path d="M90 154l48-87 55 88Z" fill="#e5b96d" stroke="#695840" stroke-width="3"/><path d="M138 67l8 89h47Z" fill="#c38c56"/><path d="M119 156l23-51 24 51Z" fill="#504e40"/><path d="M80 161h122" stroke="#756449" stroke-width="4" stroke-linecap="round"/><g stroke="#84715a" stroke-width="3"><path d="M286 85v94M274 95h31"/></g><rect x="280" y="100" width="18" height="27" rx="5" fill="#ffe5a0" stroke="#655c43" stroke-width="3"/><circle cx="289" cy="113" r="18" fill="#ffdfa3" opacity=".18"/><ellipse cx="214" cy="231" rx="68" ry="18" fill="#896e49" stroke="#67563e" stroke-width="3"/><path d="M160 223h108m-120 9h132m-115 9h98" stroke="#b59a6a" stroke-width="2"/><g fill="#f4dc8a"><circle cx="66" cy="193" r="3"/><circle cx="339" cy="181" r="3"/><circle cx="355" cy="215" r="3"/></g><g fill="#476d51"><path d="M49 226l-3-15 10 13 4-15 3 19M315 246l-4-16 10 13 6-14 2 17"/></g></svg>`;
  stage.prepend(scenery);stage.querySelector('.talents-stage-rays').style.display='none';
  const message=document.createElement('div');message.className='camp-scene-label';message.textContent='Rest. Train. Grow.';stage.append(message);
  const stations=document.createElement('div');stations.className='camp-stations';
  const items=[{key:'hp',name:'Vitality Kitchen',hint:'A hearty meal. A stronger heart.',icon:'♥',color:'kitchen',gain:'+30 HP',verb:'Cook a hearty meal'}, {key:'atk',name:'Training Stump',hint:'A little practice goes a long way.',icon:'⚒',color:'training',gain:'+3 ATK',verb:'Practice your strike'}, {key:'def',name:'Armor Bench',hint:'Make every adventure a little safer.',icon:'⬟',color:'armor',gain:'+1 DEF',verb:'Reinforce your armor'}];
  for(const item of items){const button=document.createElement('button');button.type='button';button.className='camp-station '+item.color;button.dataset.stat=item.key;button.innerHTML=`<span class="camp-station-art" aria-hidden="true"><img src="assets/ui/camp/station-${item.key}.png" alt=""></span><strong>${item.name}</strong><small class="camp-station-level"></small><span class="camp-station-gain">${item.gain}</span><span class="camp-station-cta">Train <b>›</b></span>`;button.addEventListener('click',()=>open(item));stations.append(button);}
  stage.after(stations);
  const book=screen.querySelector('.talents-milestone-section');book.classList.add('camp-journal');
  const journalHeading=document.createElement('div');journalHeading.className='camp-journal-heading';journalHeading.innerHTML='<span>✦ Field Journal</span><small class="camp-journal-count"></small>';book.prepend(journalHeading);
  const badge10=document.getElementById('badge-milestone-10');const badge20=document.getElementById('badge-milestone-20');
  badge10.classList.add('camp-stamp');badge20.classList.add('camp-stamp');
  badge10.innerHTML='<span class="camp-stamp-icon">✿</span><strong>Supply parcel</strong><small>Milestone 10 · 720 Gold</small><span class="milestone-claim-tag" id="tag-claim-10">Claim!</span>';
  badge20.innerHTML='<span class="camp-stamp-icon">✦</span><strong>Explorer stamp</strong><small id="badge-milestone-20-title"></small><span class="milestone-claim-tag" id="tag-claim-20">Rank Up!</span>';
  book.remove(); // Erva delivers milestones automatically.
  const oldCards=screen.querySelector('.talents-cards-container');
  const dialog=document.createElement('dialog');dialog.className='camp-upgrade-dialog';dialog.innerHTML='<form method="dialog"><button class="camp-dialog-close" aria-label="Close station">✕</button></form><small class="camp-dialog-eyebrow">CAMP WORKSHOP</small><h2></h2><p class="camp-dialog-hint"></p><div class="camp-upgrade-options" role="group" aria-label="Training approach"></div><div class="camp-dialog-card"></div><p class="camp-upgrade-outcome" role="status"></p><p class="camp-next-gain"></p>';
  document.body.append(dialog);
  const cards={};for(const item of items){cards[item.key]=document.getElementById('card-upgrade-'+item.key);cards[item.key].hidden=true;dialog.querySelector('.camp-dialog-card').append(cards[item.key]);}
  oldCards.remove();let current=null;
  function open(item){current=item;game.ui.renderTalentsScreen();for(const [key,card]of Object.entries(cards))card.hidden=key!==item.key;dialog.querySelector('h2').textContent=item.name;dialog.querySelector('.camp-dialog-hint').textContent=item.hint;dialog.querySelector('.camp-upgrade-outcome').textContent='';dialog.classList.remove('camp-failed');refreshOptions();dialog.showModal();}
  function refreshOptions(){
   if(!current)return;
   const key=current.key;game.ui.coreUpgradeApproaches ||= {};const selected=game.ui.coreUpgradeApproaches[key]||'steady',options=game.Character.getCoreUpgradeOptions(key),host=dialog.querySelector('.camp-upgrade-options');
   host.replaceChildren();
   for(const option of options){const b=document.createElement('button');b.type='button';b.className='camp-risk-option '+option.id;b.setAttribute('aria-pressed',String(selected===option.id));b.innerHTML='<strong>'+option.name+'</strong><span>'+Math.round(option.chance*100)+'% success</span><b>+'+option.gain+' '+key.toUpperCase()+'</b>';b.addEventListener('click',()=>{game.ui.coreUpgradeApproaches[key]=option.id;dialog.querySelector('.camp-upgrade-outcome').textContent='';dialog.classList.remove('camp-failed');refreshOptions();});host.append(b);}
   const option=options.find(x=>x.id===selected)||options[0];dialog.querySelector('.camp-next-gain').textContent=Math.round(option.chance*100)+'% success · +'+option.gain+' '+key.toUpperCase()+' on success. Gold is spent even if training fails. Existing stats stay safe.';
  }
  function sync(){const info=game.Character.getTalentProgress();heading.querySelector('.camp-power').textContent='⚔ '+game.Character.getCombatPower().toLocaleString('en-US');journalHeading.querySelector('small').textContent=info.displayLevel+' / 20 stamps';for(const item of items)stations.querySelector('[data-stat='+item.key+'] .camp-station-level').textContent='Level '+((game.Character.statUpgrades||{})[item.key]||0);refreshOptions();}
  const originalRender=game.ui.renderTalentsScreen.bind(game.ui);game.ui.renderTalentsScreen=function(...args){originalRender(...args);sync();};
  const upgrade=game.ui.upgradeCoreStat.bind(game.ui);game.ui.upgradeCoreStat=function(key){const before=(game.Character.statUpgrades||{})[key]||0;const result=upgrade(key);if(((game.Character.statUpgrades||{})[key]||0)>before){
   dialog.classList.remove('camp-failed');dialog.querySelector('.camp-upgrade-outcome').textContent='Success! +'+game.Character.lastCoreUpgradeResult.gain+' '+key.toUpperCase()+' permanently added.';
   const item=items.find(x=>x.key===key);message.textContent=item.verb+' ✓';message.classList.add('camp-action-active');clearTimeout(message._timer);message._timer=setTimeout(()=>{message.textContent='Rest. Train. Grow.';message.classList.remove('camp-action-active');},1400);
   const hero=stage.querySelector('.capy-ui-smooth-canvas');if(hero?.animate)hero.animate([{transform:'rotate(0deg)'},{transform:key==='atk'?'rotate(-7deg) translateX(-3px)':key==='hp'?'scale(1.025,.98)':'translateY(-3px)',offset:.45},{transform:'rotate(0deg)'}],{duration:500,easing:'ease-out'});
   if(dialog.open){dialog.classList.remove('camp-upgraded');void dialog.offsetWidth;dialog.classList.add('camp-upgraded');}
  }else if(result?.attempted){dialog.classList.add('camp-failed');dialog.querySelector('.camp-upgrade-outcome').textContent='Training failed. '+result.cost+' Gold spent; no stats or rank progress gained.';if(dialog.animate)dialog.animate([{opacity:1},{opacity:.65},{opacity:1}],{duration:320});}
   return result;
  };
  screen.querySelector('.talents-preview-btn').innerHTML='<span aria-hidden="true">▤</span><small>Rank guide</small>';
  game.ui.renderTalentsScreen();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
