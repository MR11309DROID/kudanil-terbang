(() => {
 function init(){
  const game=window.Game;if(!game)return;
  const gear=document.getElementById('tab-equipment');gear.classList.add('traveler-workshop');
  const title=document.createElement('header');title.className='workshop-title';title.innerHTML='<small>PREPARE FOR THE NEXT CHAPTER</small><h1>Traveler’s Workshop</h1><p>A good journey starts with a well-packed bag.</p>';gear.querySelector('.gear-screen-header').after(title);
  const inv=gear.querySelector('.my-equipment-title');if(inv)inv.textContent='Trail Backpack';
  for(const [slot,label]of Object.entries({weapon:'Weapon',ring:'Ring',amulet:'Charm',armor:'Armor',helmet:'Headwear',boots:'Boots'})){
   const node=document.getElementById('slot-'+slot);if(node){node.dataset.slotLabel=label;node.setAttribute('aria-label',label+' equipment slot');}
  }
  const performanceView=new window.ErvaPerformance();window.ErvaActorPerformance=performanceView;
  const talk=document.createElement('dialog');talk.className='erva-talk-dialog';talk.dataset.ervaScene='conversation';talk.innerHTML='<form method="dialog"><button class="erva-talk-close" aria-label="Close conversation">✕</button></form><small>YOUR CAMP GUIDE</small><h2>Erva</h2><div class="erva-portrait-wrap"><img class="erva-actor" data-portrait="true" data-base="neutral" src="assets/ui/camp/erva-fish-portrait-neutral.png" alt="Erva speaking"></div><p class="erva-talk-line" role="status"></p><div class="erva-talk-actions"><button type="button" class="erva-next-gift">My next gift?</button></div><form method="dialog"><button class="erva-talk-bye">See you, Erva</button></form>';document.body.append(talk);
  let pendingSad=false,careSpoken=false,talkTimer=0,resumeStation=null,reactionTimer=0,welcomed=false;
  const reactionTimes=new Map();
  function speak(key){
   if(Sound.voice||performanceView.active)return;
   const clip=window.ErvaLocale.resolveVoice(key).clip;if(!clip)return;
   window.ErvaLocale.bind(talk.querySelector('.erva-talk-line'),key,clip.text);
   talk.querySelectorAll('.erva-talk-actions button').forEach(b=>b.disabled=true);
   clearTimeout(talkTimer);talkTimer=setTimeout(()=>talk.querySelectorAll('.erva-talk-actions button').forEach(b=>b.disabled=false),(clip.duration+1)*1000);
   const spoken=Sound.playErvaVoice(key,{priority:true});if(!spoken)performanceView.preview(key);
  }
  talk.querySelector('.erva-next-gift').addEventListener('click',()=>{const info=game.Character.getTalentProgress(),clip=window.ErvaVoiceClips.tip;if(info.isClaimedM10&&info.nextTierName===clip.onlyNextRank)speak('tip');else window.ErvaLocale.nextGift(talk.querySelector('.erva-talk-line'),info.isClaimedM10?info.nextTierName:'training level 10');});
  talk.addEventListener('close',()=>{clearTimeout(talkTimer);Sound.stopVoice();performanceView.end();talk.querySelectorAll('.erva-talk-actions button').forEach(b=>b.disabled=false);const station=resumeStation;resumeStation=null;if(station)setTimeout(()=>{if(!document.querySelector('dialog[open]'))station.showModal();},0);});
  window.addEventListener('erva-voice-end',()=>{clearTimeout(talkTimer);talk.querySelectorAll('.erva-talk-actions button').forEach(b=>b.disabled=false);});
  if(game.battleSystem?.handleDefeat){const defeat=game.battleSystem.handleDefeat.bind(game.battleSystem);game.battleSystem.handleDefeat=function(...args){pendingSad=true;return defeat(...args);};}
  const celebrate=document.createElement('dialog');celebrate.className='mira-rank-dialog erva-gift-dialog';celebrate.dataset.ervaScene='gift';celebrate.innerHTML='<small>A GIFT FROM ERVA</small><h2></h2><div class="erva-gift-stage"><img class="erva-pose erva-actor" data-base="shy" src="assets/ui/camp/erva-fish-shy.png" alt="Erva offering your gift"><span class="erva-parcel" aria-hidden="true"><i></i></span></div><p class="mira-congrats"></p><div class="mira-rank-gifts" role="status"></div><form method="dialog"><button>Thanks, Erva! ✦</button></form>';document.body.append(celebrate);
  const queue=[];let scheduled=false,settling=false,motions=[];
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function animate(node,frames,options){if(reduced)return;const a=node.animate(frames,{fill:'both',...options});motions.push(a);a.finished.catch(()=>{});}
  function giftMotion(clip){
   const cue=clip.cues.find(c=>c.at>0),delay=(cue?.at||2)*1000,parcel=celebrate.querySelector('.erva-parcel'),reward=celebrate.querySelector('.mira-rank-gifts');
   animate(parcel,[{opacity:0,transform:'translate(-50%,0) scale(.45)'},{opacity:1,transform:'translate(-50%,-12px) scale(.8)',offset:.25},{opacity:1,transform:'translate(-50%,52px) scale(1.08)',offset:.78},{opacity:0,transform:'translate(-50%,72px) scale(.7)'}],{delay,duration:950,easing:'cubic-bezier(.3,.1,.3,1)'});
   animate(reward,[{opacity:.6,transform:'translateY(6px) scale(.96)'},{opacity:1,transform:'translateY(0) scale(1.025)',offset:.7},{opacity:1,transform:'scale(1)'}],{delay:delay+550,duration:650,easing:'ease-out'});
  }
  window.addEventListener('erva-voice-start',e=>{if(celebrate.open&&['gift','rank'].includes(e.detail.key))giftMotion(e.detail.clip);});
  function showNext(){
   scheduled=false;if(window.ErvaGuideActive||document.querySelector('dialog[open]:not(.erva-talk-dialog):not(.camp-upgrade-dialog):not(.erva-gift-dialog)')){scheduled=true;setTimeout(showNext,600);return;}if(celebrate.open||!queue.length)return;
   const gift=queue.shift();resumeStation=null;clearTimeout(reactionTimer);reactionTimer=0;if(window.ErvaGuideActive||talk.open)talk.close();document.querySelector('.camp-upgrade-dialog[open]')?.close();
   const key=gift.milestone===20?'rank':'gift',clip=window.ErvaLocale.resolveVoice(key).clip||window.ErvaVoiceClips[key];
   celebrate.querySelector('h2').textContent=gift.milestone===20?gift.rank:'A little care package';
   window.ErvaLocale.bind(celebrate.querySelector('.mira-congrats'),key,clip.text);
   celebrate.querySelector('.mira-rank-gifts').textContent='Received automatically: '+gift.gold.toLocaleString('en-US')+' Gold'+(gift.gems?' · '+gift.gems+' Gems':'');
   const actor=celebrate.querySelector('.erva-actor');actor.dataset.base=gift.milestone===20?'proud':'shy';actor.src=performanceView.asset(clip.emotion);
   celebrate.showModal();Sound.playSfx(gift.milestone===20?'levelUp':'reward');
   const spoken=Sound.playErvaVoice(key,{priority:true});if(!spoken){performanceView.preview(key);giftMotion(clip);}
   animate(celebrate.querySelector('.erva-gift-stage'),[{opacity:0,transform:'translateY(16px) scale(.94)'},{opacity:1,transform:'translateY(0) scale(1)'}],{duration:550,easing:'cubic-bezier(.16,1,.3,1)'});
  }
  celebrate.addEventListener('close',()=>{Sound.stopVoice();performanceView.end();motions.forEach(a=>a.cancel());motions=[];if(queue.length)setTimeout(showNext,180);});
  function queueReaction(key,options={}){
   if(window.ErvaGuideActive||!window.ErvaVoiceClips[key]||reactionTimer||talk.open||celebrate.open||Sound.voice||performanceView.active||queue.length)return false;
   const now=performance.now();if(now-(reactionTimes.get(key)??-Infinity)<6500)return false;
   reactionTimer=setTimeout(()=>{
    reactionTimer=0;if(window.ErvaGuideActive||talk.open||celebrate.open||Sound.voice||performanceView.active||queue.length||(game.ui.activeTab&&game.ui.activeTab!=='talents'))return;
    const station=document.querySelector('.camp-upgrade-dialog[open]');
    if(station&&!options.resumeStation)return;
    if(document.querySelector('dialog[open]')&&!station)return;
    if(station){if(options.resumeStation)resumeStation=station;station.close();}
    reactionTimes.set(key,performance.now());talk.showModal();speak(key);
   },options.delay??380);return true;
  }
  window.bindErvaUpgradeReactions(game.ui,queueReaction);
  const switchTab=game.ui.switchTab?.bind(game.ui);
  if(switchTab)game.ui.switchTab=function(tab,...args){const result=switchTab(tab,...args);if(tab==='talents'){
   const run=game.Character.activeRun;
   if(pendingSad){if(queueReaction('sad'))pendingSad=false;}
   else if(!careSpoken&&run&&run.currentHp<run.maxHp*.3){if(queueReaction('angry'))careSpoken=true;}
   else if(!welcomed){if(queueReaction('welcome'))welcomed=true;}
  }return result;};
  const render=game.ui.renderTalentsScreen.bind(game.ui);
  game.ui.renderTalentsScreen=function(...args){
   if(!settling){settling=true;try{queue.push(...window.collectErvaGifts(game.Character));}finally{settling=false;}}
   const result=render(...args);if(queue.length&&!scheduled&&!celebrate.open){scheduled=true;setTimeout(showNext,650);}return result;
  };
  game.ui.renderTalentsScreen();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
