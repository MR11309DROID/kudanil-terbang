(function(root){
 const moods=['neutral','happy','excited','sad','laugh','angry','nervous','shy','proud','confident','smug'];
 function selectLines(run,event,config,language='en'){
  if(!config?.enabled||!run||event?.type!=='boss'||run.chapterId!==config.chapterId||run.day!==run.maxDays)return [];
  return (config.lines||[]).filter(line=>['erva','capy','boss'].includes(line.speaker)).map(line=>({speaker:line.speaker==='capy'?'erva':line.speaker,text:typeof line.text==='string'?line.text:(line.text?.[language]||line.text?.en||line.text?.ja||''),emotion:moods.includes(line.emotion)?line.emotion:'neutral',voiceKey:typeof line.voiceKey==='string'?line.voiceKey:null})).filter(line=>line.text.trim());
 }
 if(typeof module==='object'&&module.exports){module.exports={selectLines};return;}
 function init(){
  const game=root.Game;if(!game?.adventureEngine)return;const engine=game.adventureEngine,original=engine.startCurrentCombat;let pending=false;
  const dialog=document.createElement('dialog');dialog.className='final-boss-dialogue';dialog.setAttribute('aria-label','Before the final battle');
  dialog.innerHTML='<small class="boss-dialogue-eyebrow">FINAL ENCOUNTER</small><div class="boss-dialogue-cast"><figure data-speaker="erva" hidden><img class="erva-actor" data-portrait="true" data-base="neutral" src="assets/ui/camp/erva-fish-portrait-neutral.png" alt="Erva"><figcaption>Erva</figcaption></figure><figure data-speaker="boss" hidden><img alt="Boss"><figcaption></figcaption></figure></div><h2></h2><p class="boss-dialogue-line" data-no-localize role="status"></p><div class="boss-dialogue-progress"></div><footer><button class="boss-dialogue-skip" type="button">Skip dialogue</button><button class="boss-dialogue-next" type="button">Next</button></footer>';
  document.body.append(dialog);root.ErvaRig?.scan();
  engine.startCurrentCombat=function(...args){
   if(pending||game.battleSystem?.inBattle)return;
   const run=game.Character.activeRun,event=engine.currentEvent,lines=selectLines(run,event,root.FinalBossDialogue,root.ErvaLocale?.preferences.subtitle||'en');
   if(!lines.length)return original.apply(this,args);
   pending=true;let index=0,finished=false;const wasAuto=engine.autoTravel;engine.autoTravel=false;game.Sound?.stopVoice();
   dialog.querySelector('[data-speaker="boss"] img').src=event.bossData.sprite;dialog.querySelector('[data-speaker="boss"] figcaption').textContent=event.bossData.name;
   const focused=document.activeElement;
   function finish(){if(finished)return;finished=true;game.Sound?.stopVoice();root.ErvaActorPerformance?.end();dialog.close();dialog.querySelectorAll('figure').forEach(n=>n.hidden=true);pending=false;if(focused?.isConnected)focused.focus({preventScroll:true});if(game.Character.activeRun!==run||engine.currentEvent!==event||game.battleSystem?.inBattle)return;engine.autoTravel=wasAuto;original.apply(engine,args);}
   function render(){
    const line=lines[index];game.Sound?.stopVoice();root.ErvaActorPerformance?.end();dialog.dataset.speaker=line.speaker;
    dialog.querySelectorAll('figure').forEach(n=>{n.hidden=n.dataset.speaker!==line.speaker;});
    const actor=dialog.querySelector('.erva-actor');actor.dataset.base=line.emotion;root.ErvaRig?.set(actor,{mood:line.emotion,level:0,seed:index*19,started:performance.now(),visible:false});
    dialog.querySelector('h2').textContent=line.speaker==='erva'?'Erva':event.bossData.name;dialog.querySelector('.boss-dialogue-line').textContent=line.text;dialog.querySelector('.boss-dialogue-progress').textContent=(index+1)+' / '+lines.length;dialog.querySelector('.boss-dialogue-next').textContent=index===lines.length-1?'Fight!':'Next';
    if(line.speaker==='erva'&&line.voiceKey)game.Sound?.playErvaVoice(line.voiceKey,{priority:true});
    const figure=dialog.querySelector('figure:not([hidden])');if(!matchMedia('(prefers-reduced-motion: reduce)').matches)figure.animate([{opacity:0,translate:line.speaker==='erva'?'-15px 16px':'15px 10px',filter:'blur(4px)'},{opacity:1,translate:'0 0',filter:'blur(0)'}],{duration:500,easing:'cubic-bezier(.16,1,.3,1)'});
   }
   dialog.querySelector('.boss-dialogue-next').onclick=()=>{if(index===lines.length-1)finish();else{index++;render();}};dialog.querySelector('.boss-dialogue-skip').onclick=finish;dialog.oncancel=e=>{e.preventDefault();finish();};
   render();dialog.showModal();dialog.querySelector('.boss-dialogue-next').focus({preventScroll:true});
  };
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})(typeof window==='object'?window:this);
