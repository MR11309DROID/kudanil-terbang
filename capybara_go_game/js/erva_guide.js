(() => {
 const KEY='erva-intro-v1';
 const steps=[
 {tab:'adventure',target:'.nav-tab-btn[data-tab="adventure"]',title:'Hey, you made it!',mood:'happy',expression:'welcoming',text:"Hey! I'm Erva. First time here? Come on, I'll show you around. Won't take long."},
 {tab:'adventure',target:'#btn-start-run',title:'Ready when you are',mood:'excited',expression:'eager',text:"This is where you start a run. It costs five energy. Pick your map first, then off you go!"},
 {tab:'equipment',target:'.paperdoll-container',title:'Check your gear',mood:'proud',expression:'confident',text:"Got some new gear? Bring it here and equip it. A shiny sword won't help much sitting in your bag."},
 {tab:'talents',target:'.camp-stations',title:'A little training?',mood:'neutral',expression:'curious',text:"Here's our camp. Food gives you more health, the stump boosts your attack, and the bench improves your defense."},
 {tab:'talents',target:'.camp-station.training',title:'Feeling lucky?',mood:'nervous',expression:'concerned',text:"Quick heads-up: training can fail. Steady is safer. Daring gives a bigger boost, but fails more often. You spend the gold either way."},
 {tab:'talents',target:'.camp-power',title:'Leave the gifts to me',mood:'shy',expression:'warm',text:"Keep training and I'll bring your milestone gifts over myself. You don't need to hunt for a claim button."},
 {tab:'adventure',target:'.nav-tab-btn[data-tab="chests"]',title:"You're good to go",mood:'happy',expression:'playful',text:"The shop's over here if you want to look around. That's the tour! Need me again? Tap Erva's Guide. Go on, your capy's waiting."}
 ];
 ['guide_welcome','guide_start','guide_gear','guide_camp','guide_risk','guide_gift','guide_shop'].forEach((voice,i)=>steps[i].voice=voice);
 const sidebarSteps=[{"tab":"adventure","target":"#btn-newbie-gifts","title":"A little head start","mood":"happy","expression":"welcoming","voice":"sidebar_newbie","text":"New here? Take a peek at Newbie Gifts. Check the timer and see what's still up for grabs."},{"tab":"adventure","target":".qbtn-daily","title":"Your daily treat","mood":"happy","expression":"welcoming","voice":"sidebar_daily","text":"Daily is your little welcome-back treat. Pop in, check today's reward, and claim it if it's ready."},{"tab":"adventure","target":".qbtn-wheel","title":"Give it a spin?","mood":"excited","expression":"curious","voice":"sidebar_wheel","text":"That's the Wheel. Check what a spin costs before you give it a go. And hey, no promises on the prize!"},{"tab":"adventure","target":".qbtn-achieve","title":"You earned that","mood":"proud","expression":"curious","voice":"sidebar_achieve","text":"Been winning fights and trying new things? Have a look in Achieve. You might have a reward waiting there."},{"tab":"adventure","target":".qbtn-pass","title":"A few extra goals","mood":"neutral","expression":"curious","voice":"sidebar_pass","text":"The Pass has tasks and rewards to work through. Have a look at what's free and what needs unlocking before you pick anything."},{"tab":"adventure","profile":true,"target":".player-profile-dialog [data-action=stats]","title":"How are we doing?","mood":"neutral","expression":"curious","voice":"sidebar_stats","text":"Want to see how your capy's doing? Stats has the numbers. Handy when you're figuring out what to work on next."},{"tab":"adventure","target":".qbtn-pets","title":"Meet the little crew","mood":"happy","expression":"welcoming","voice":"sidebar_pets","text":"And these are your Pets! Open this up to check your companions and mounts, and see who you'd like to bring along."},{"tab":"adventure","target":"#btn-toggle-quick-stack","title":"A little more room","mood":"happy","expression":"welcoming","voice":"sidebar_shortcuts","text":"Too many buttons in the way? This tucks the shortcuts away. Tap it again whenever you want them back."},{"tab":"adventure","target":"#btn-menu-drawer","title":"Just the adventure","mood":"neutral","expression":"curious","voice":"sidebar_clean","text":"Want a clear view? Open Settings and turn on Clean UI. Tap the scene when you want your controls back. Easy!"}];
 sidebarSteps.splice(5,0,{tab:'adventure',target:'.qbtn-gacha',title:'A lucky little detour',mood:'excited',expression:'eager',voice:'sidebar_gacha',text:'This is Capy Gacha! Earn silver coins from daily quests, then draw for mounts and gold tokens. Exchange gold tokens for a mount you want. Check the odds before drawing.'});
 steps.splice(steps.length-1,0,...sidebarSteps);
 window.ErvaGuideSteps=steps;
 function init(){
  const game=window.Game;if(!game?.ui)return;
  let index=0,active=false,origin='adventure',focused=null,currentSteps=steps,completionKey=KEY,stackWasCollapsed=false,closing=false;
  const sound=game.Sound;let guideVoice=null,renderRevision=0,tabSwitching=false;
  const layer=document.createElement('div');layer.className='erva-guide';layer.hidden=true;
  layer.innerHTML='<div class="erva-guide-ring" aria-hidden="true" hidden></div><section data-erva-scene="guide" class="erva-guide-card" role="dialog" aria-modal="true" aria-labelledby="erva-guide-title"><button class="erva-guide-skip">Skip tour</button><small>ERVA’S LITTLE TOUR <span></span></small><div class="erva-guide-face"><img class="erva-actor" data-portrait="true" data-base="happy" alt="Erva"/><b aria-hidden="true"></b></div><h2 id="erva-guide-title"></h2><p></p><footer><button class="erva-guide-back">Back</button><button class="erva-guide-replay" aria-label="Replay Erva voice">↻ Voice</button><button class="erva-guide-next">Show me</button></footer></section>';
  document.body.append(layer);
  const card=layer.querySelector('section'),ring=layer.querySelector('.erva-guide-ring');
  const juice=window.ErvaJuice.create(card),pointer=document.createElement('div');pointer.className='erva-target-pointer';pointer.hidden=true;pointer.setAttribute('aria-hidden','true');pointer.innerHTML='<span>▼</span>';layer.append(pointer);
  const help=document.createElement('button');help.className='erva-guide-help';help.textContent="Erva’s Guide";help.type='button';help.addEventListener('click',()=>start());document.getElementById('bottom-nav')?.before(help);
  let positionedTarget='';
  const targetKey=()=>{const r=document.querySelector(currentSteps[index]?.target)?.getBoundingClientRect();return [index,innerWidth,innerHeight,r?.left,r?.top,r?.width,r?.height].join(',');};
  function position(){
   if(!active||tabSwitching||card.dataset.popupTransition)return;
   const step=currentSteps[index],node=document.querySelector(step.target),rect=node?.getBoundingClientRect();
   positionedTarget=[index,innerWidth,innerHeight,rect?.left,rect?.top,rect?.width,rect?.height].join(',');
   if(step.voice==='guide_welcome'){
    layer.dataset.targetPresent='false';ring.hidden=true;pointer.hidden=true;
    card.classList.remove('guide-explaining','guide-at-top');card.classList.add('guide-welcome');card.style.removeProperty('--guide-room');
    const launcher=help.getBoundingClientRect();card.style.setProperty('--guide-y',Math.max(12,(launcher.height?launcher.top:innerHeight-40)-card.scrollHeight-14)+'px');return;
   }
   if(!rect?.width||!rect.height){layer.dataset.targetPresent='false';ring.hidden=true;pointer.hidden=true;card.classList.remove('guide-explaining');card.style.removeProperty('--guide-y');return;}
   const gap=16,pad=12,above=Math.max(0,rect.top-gap-pad),below=Math.max(0,innerHeight-rect.bottom-gap-pad),useAbove=above>=below,room=Math.max(above,below);
   card.classList.add('guide-explaining');card.classList.remove('guide-welcome');card.classList.toggle('guide-at-top',rect.top+rect.height/2>innerHeight*.52);
   card.style.setProperty('--guide-room',Math.max(160,room)+'px');
   // Read all intrinsic sizes together, before touching the spotlight or portrait.
   // Derive the final card height instead of forcing layout again after shrinking it.
   const face=card.querySelector('.erva-guide-face'),oldFace=face.offsetHeight,oldHeight=card.offsetHeight;
   const fixed=card.querySelector('p').scrollHeight+card.querySelector('h2').offsetHeight+card.querySelector('small').offsetHeight+card.querySelector('footer').offsetHeight+80;
   const portraitRoom=Math.max(80,room-fixed),portraitHeight=Math.min(Math.max(140,Math.min(210,innerHeight*.24)),portraitRoom);
   const height=Math.min(oldHeight-oldFace+portraitHeight,room),top=useAbove?Math.max(pad,rect.top-gap-height):Math.min(innerHeight-pad-height,rect.bottom+gap);
   card.style.setProperty('--portrait-room',portraitRoom+'px');card.style.setProperty('--guide-y',Math.max(pad,top)+'px');
   const actor=card.querySelector('img');actor.dataset.pointSide=rect.left+rect.width/2<innerWidth/2-8?'left':'right';actor.dataset.pointDown=String(rect.top+rect.height/2>top+height*.4);
   layer.dataset.targetPresent='true';ring.hidden=false;pointer.hidden=false;
   const right=rect.right+40<innerWidth,left=!right&&rect.left>40;
   pointer.style.setProperty('--pointer-angle',right?'90deg':left?'-90deg':'0deg');
   pointer.style.transform='translate3d('+(right?rect.right+6:left?rect.left-34:Math.max(12,Math.min(innerWidth-40,rect.left+rect.width/2-14)))+'px,'+(right||left?rect.top+rect.height/2-14:Math.max(8,rect.top-30))+'px,0)';
   Object.assign(ring.style,{left:'0px',top:'0px',transform:'translate3d('+Math.max(2,rect.left-5)+'px,'+Math.max(2,rect.top-5)+'px,0)',width:Math.min(innerWidth-4,rect.width+10)+'px',height:rect.height+10+'px'});
  }
  let savedScroll=[],pageScroll={x:0,y:0};
  function revealInsidePanel(target){
   const frame=document.getElementById('game-container');
   // Native scrollIntoView also scrolls overflow:hidden ancestors, clipping the fixed HUD.
   for(let panel=target?.parentElement;panel&&panel!==frame;panel=panel.parentElement){
    if(!/auto|scroll/.test(getComputedStyle(panel).overflowY)||panel.scrollHeight<=panel.clientHeight)continue;
    const a=target.getBoundingClientRect(),b=panel.getBoundingClientRect();
    if(a.top<b.top)panel.scrollTop-=b.top-a.top+8;else if(a.bottom>b.bottom)panel.scrollTop+=a.bottom-b.bottom+8;
   }
   frame.scrollTop=0;frame.scrollLeft=0;
  }
  function render(){
   const previous=card.dataset.rendered==='true'?juice.capture():null,step=currentSteps[index],revision=++renderRevision;
   const apply=()=>{
    if(!active||closing||revision!==renderRevision)return;
    if(step.profile)window.PlayerProfileGuide?.open();else window.PlayerProfileGuide?.close();
    tabSwitching=false;card.querySelector('.erva-guide-next').disabled=false;
if(sidebarSteps.some(s=>s.voice===step.voice)&&document.getElementById('quick-btn-stack')?.classList.contains('collapsed'))game.ui.toggleQuickStack();sound.stopVoice();guideVoice=window.ErvaLocale?.resolveVoice(step.voice)?.clip?step.voice:null;card.querySelector('.erva-guide-replay').disabled=!guideVoice;card.dataset.expression=step.expression;card.querySelector('small span').textContent=(index+1)+' / '+currentSteps.length;card.querySelector('img').dataset.base=step.mood;card.querySelector('img').dataset.dialogueKey=step.voice;card.querySelector('img').src='assets/ui/camp/erva-fish-portrait-'+step.mood+'.png';card.querySelector('b').textContent=({curious:'?',eager:'✦',concerned:'!',playful:'♪',warm:'♥',confident:'✧',welcoming:'✦'})[step.expression];card.querySelector('h2').textContent=step.title;window.ErvaLocale.bind(card.querySelector('p'),step.voice,window.ErvaVoiceClips?.[step.voice]?.text||step.text);card.querySelector('.erva-guide-back').disabled=index===0;card.querySelector('.erva-guide-next').textContent=index===currentSteps.length-1?"Let's go!":'Next';juice.begin(step);if(card.dataset.reaction==='alert'||card.dataset.reaction==='excited')juice.react(card.dataset.reaction);const target=document.querySelector(step.target);revealInsidePanel(target);position();if(previous)juice.move(previous);card.dataset.rendered='true';card.querySelector('.erva-guide-next').focus({preventScroll:true});if(guideVoice){const spoken=sound.playErvaVoice(guideVoice,{priority:true});if(!spoken)window.ErvaActorPerformance?.preview(guideVoice);}
   };
   // Commit the panel and destination card geometry in one frame. Waiting two
   // paints here exposed the old card over the new panel before the FLIP began.
   tabSwitching=true;
   if(game.ui.activeTab!==step.tab)game.ui.switchTab(step.tab);
   apply();
  }
  function start(list=steps,key=KEY){if(active||closing||document.querySelector('dialog[open]')||((list===steps||list===sidebarSteps)&&game.Character?.activeRun)||(list!==steps&&list!==sidebarSteps&&!game.Character?.activeRun)||game.battleSystem?.inBattle||sound.voice)return;const frame=document.getElementById('game-container');frame.scrollTop=0;frame.scrollLeft=0;savedScroll=[...frame.querySelectorAll('*')].filter(n=>n.scrollHeight>n.clientHeight&&n.scrollTop).map(n=>[n,n.scrollTop,n.scrollLeft]);pageScroll={x:window.scrollX,y:window.scrollY};currentSteps=list;completionKey=key;active=true;window.ErvaGuideActive=true;origin=game.ui.activeTab||'adventure';focused=document.activeElement;stackWasCollapsed=!!document.getElementById('quick-btn-stack')?.classList.contains('collapsed');index=0;card.dataset.rendered='false';layer.hidden=false;document.getElementById('game-container').inert=true;render();position();animatePopup(true).then(position);}
  function animatePopup(opening){return window.ErvaJuice.genie(card,help,opening);}
  async function close(){if(closing||!active)return;closing=true;renderRevision++;tabSwitching=false;juice.dispose();sound.stopVoice();window.ErvaActorPerformance?.end();await animatePopup(false);finishClose();closing=false;}
  function finishClose(){window.PlayerProfileGuide?.close();sound.stopVoice();window.ErvaActorPerformance?.end();guideVoice=null;active=false;window.ErvaGuideActive=false;layer.hidden=true;document.getElementById('game-container').inert=false;try{localStorage.setItem(completionKey,'done');for(const step of currentSteps)if(step.voice)localStorage.setItem('erva-tip-'+step.voice,'done');}catch{}if(currentSteps.some(step=>sidebarSteps.includes(step))){try{localStorage.setItem('erva-sidebar-v40','done');}catch{}}if(!!document.getElementById('quick-btn-stack')?.classList.contains('collapsed')!==stackWasCollapsed)game.ui.toggleQuickStack();game.ui.switchTab(origin);for(const [node,top,left]of savedScroll)if(node.isConnected){node.scrollTop=top;node.scrollLeft=left;}savedScroll=[];const frame=document.getElementById('game-container');frame.scrollTop=0;frame.scrollLeft=0;if(focused?.isConnected)focused.focus({preventScroll:true});window.scrollTo({left:pageScroll.x,top:pageScroll.y,behavior:'instant'});}
  card.querySelector('.erva-guide-replay').onclick=()=>{if(guideVoice){const spoken=sound.playErvaVoice(guideVoice,{priority:true});if(!spoken)window.ErvaActorPerformance?.preview(guideVoice);}};
  card.querySelector('.erva-guide-next').onclick=()=>{if(closing||tabSwitching)return;if(juice.finish())return;if(index===currentSteps.length-1)close();else{index++;render();}};
  card.querySelector('.erva-guide-back').onclick=()=>{if(!closing&&!tabSwitching&&index){index--;render();}};card.querySelector('.erva-guide-skip').onclick=close;
  layer.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();close();}if(e.key==='Tab'){const buttons=[...card.querySelectorAll('button:not(:disabled)')];const first=buttons[0],last=buttons.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});
  window.addEventListener('erva-language-change',()=>{if(active&&!closing){card.querySelector('.erva-guide-next').textContent=index===currentSteps.length-1?"Let's go!":'Next';juice.begin(currentSteps[index]);position();}});
  window.addEventListener('erva-reward-claimed',()=>{if(active&&!closing)juice.react('excited');});
  let positionFrame=0;
  function schedulePosition(){if(positionFrame||!active||closing||card.dataset.popupTransition)return;positionFrame=requestAnimationFrame(()=>{positionFrame=0;if(active&&!closing&&targetKey()!==positionedTarget){const before=juice.capture();position();juice.move(before);}});}
  window.addEventListener('resize',schedulePosition);window.addEventListener('scroll',schedulePosition,true);

  const remembered=voice=>{try{return localStorage.getItem('erva-tip-'+voice)==='done';}catch{return false;}};
  const eventStep=(voice,target,title,mood='happy')=>({voice,target,title,mood,tab:'adventure',expression:mood==='nervous'?'concerned':'welcoming',text:window.ErvaVoiceClips?.[voice]?.text||''});
  function beginEventTips(event){
   if(active||game.adventureEngine.autoTravel||game.battleSystem.inBattle||game.ui.activeTab!=='adventure'||event.type!=='narrative')return;
   const lists=[...document.querySelectorAll('.event-choice-list')],list=lists.at(-1);if(!list||list.dataset.resolved==='true')return;
   document.querySelectorAll('[data-erva-event]').forEach(n=>n.removeAttribute('data-erva-event'));list.dataset.ervaEvent='current';
   const target='[data-erva-event="current"]',tour=[];
   const add=(voice,selector,title,mood)=>{if(!remembered(voice))tour.push(eventStep(voice,selector,title,mood));};
   add('event_intro',target,'A little detour!','excited');add('event_choices',target,'Your call','neutral');
   (event.eventDef?.options||[]).forEach((opt,i)=>{const selector=target+' [data-choice="'+i+'"]';if(opt.costGold)add('event_gold',selector,'Check the price','neutral');if(/gamble|dice|cursed|witch_brew/.test(opt.action||''))add('event_risk',selector,'Feeling lucky?','nervous');if(/heal|rest|camp_buff|yuzu_spa/.test(opt.action||''))add('event_rest',selector,'Catch your breath','happy');if(/combat|fight|battle/.test(opt.action||''))add('event_fight',selector,'Ready for a fight?','excited');});
   const unique=tour.filter((s,i)=>tour.findIndex(t=>t.voice===s.voice)===i);if(!unique.length)return;
   start(unique,'erva-event-tour-v2');
  }
  const originalEvent=game.ui.renderAdventureEvent;
  game.ui.renderAdventureEvent=function(event,...args){const result=originalEvent.call(this,event,...args);if(event?.type==='narrative')setTimeout(()=>{if(game.adventureEngine.currentEvent===event)beginEventTips(event);},350);return result;};
  // Advance is shared by immediate choices and deferred skill selection.
  // Capture the run so a delayed hint cannot appear in a replacement journey.
  const originalAdvance=game.adventureEngine.advanceAfterNarrative;
  game.adventureEngine.advanceAfterNarrative=function(...args){
   const run=game.Character.activeRun,event=this.currentEvent,result=originalAdvance.apply(this,args);
   if(event?.type==='narrative'&&run&&game.Character.activeRun===run&&!remembered('event_travel'))setTimeout(()=>{
    if(game.Character.activeRun!==run||remembered('event_travel')||active||game.ui.activeTab!=='adventure'||this.currentEvent||game.battleSystem.inBattle||this.autoTravel||document.querySelector('dialog[open]'))return;
    document.querySelectorAll('[data-erva-result]').forEach(n=>n.removeAttribute('data-erva-result'));const resolved=[...document.querySelectorAll('.event-choice-resolved')].at(-1);if(resolved)resolved.dataset.ervaResult='current';
    start([eventStep('event_chosen','[data-erva-result="current"]','Let’s see!'),eventStep('event_travel','#btn-travel-next','On we go')],'erva-event-result-v2');
   },400);
   return result;
  };
  const voiceStarted=e=>{if(active&&e.detail.key===guideVoice){try{localStorage.setItem('erva-tip-'+guideVoice,'done');}catch{}}};
  window.addEventListener('erva-voice-start',voiceStarted);

  const sidebarTimer=setInterval(()=>{let done=false,mainDone=false;try{done=localStorage.getItem('erva-sidebar-v40')==='done';mainDone=localStorage.getItem(KEY)==='done';}catch{}if(done){clearInterval(sidebarTimer);return;}if(!mainDone||active||game.Character.activeRun||game.ui.activeTab!=='adventure')return;const loading=document.getElementById('loading-screen');if(loading&&getComputedStyle(loading).display!=='none')return;start(sidebarSteps,'erva-sidebar-v40');if(active)clearInterval(sidebarTimer);},1200);
  let seen=false;try{seen=localStorage.getItem(KEY)==='done';}catch{}if(!seen){const timer=setInterval(()=>{const loading=document.getElementById('loading-screen');if(loading&&getComputedStyle(loading).display!=='none'&&getComputedStyle(loading).visibility!=='hidden'&&loading.getBoundingClientRect().height)return;if(game.Character?.activeRun){clearInterval(timer);return;}if(document.querySelector('dialog[open]')||sound.voice)return;start();if(active)clearInterval(timer);},600);}
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
