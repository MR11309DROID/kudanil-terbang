// Visual-only showcase: no skill grants, damage, currency or run progression.
(() => {
 function init(){
  const game=window.Game;if(!game)return;
  const row=document.querySelector('.mythic-review-tools');if(!row)return;
  const play=document.createElement('button');play.type='button';play.className='mythic-review-button mythic-fx-play';play.textContent='▶ Play 6 Mythic FX';
  const status=document.createElement('span');status.className='mythic-fx-status';status.setAttribute('role','status');row.append(play,status);
  let session=null;
  function allowed(){return game.Character.activeRun&&!game.battleSystem.inBattle&&!game.adventureEngine.traveling&&!game.adventureEngine.hasPendingChest&&!game.ui._winRevealCleanup&&!document.querySelector('dialog[open]')&&![...document.querySelectorAll('.modal-overlay')].some(el=>getComputedStyle(el).display!=='none');}
  function stop(){
   const s=session;if(!s)return;session=null;s.cancelled=true;clearTimeout(s.timer);if(s.resolve)s.resolve();
   const r=game.renderer;r._mythicCast=null;r.skillCombatEffects=s.effects;r.enemyState=s.enemy;Object.assign(r.playerState,s.player);r.scrollSpeed=s.scroll;
   game.adventureEngine._mythicPreview=false;play.textContent='▶ Play 6 Mythic FX';status.textContent='';
   const toggle=row.querySelector('.mythic-review-button');if(toggle)toggle.disabled=false;
   if(s.travel){s.travel.disabled=s.disabled;s.travel.className=s.className;const label=document.getElementById('next-day-btn-text');if(label)label.innerHTML=s.label;}
  }
  function waitFor(s,launch){return new Promise(resolve=>{
   let done=false;const finish=()=>{if(done)return;done=true;clearTimeout(s.timer);s.resolve=null;resolve();};s.resolve=finish;
   s.timer=setTimeout(finish,9000);launch(finish);
  });}
  function passive(name,done){
   const r=game.renderer,startTime=performance.now(),duration=1100;
   r.setPlayerAnim('skill',false);
   r.skillCombatEffects.push({startTime,duration,render:ctx=>{
    const p=Math.min(1,(performance.now()-startTime)/duration),alpha=Math.sin(p*Math.PI),x=r.playerState.x,y=r.groundY-30;
    ctx.save();ctx.translate(x,y);ctx.globalAlpha=alpha;
    if(name==='Blood Blade'){
     ctx.rotate(-.5+p*1.6);ctx.shadowColor='#ef476d';ctx.shadowBlur=15;
     for(let i=0;i<3;i++){ctx.beginPath();ctx.arc(0,0,28+i*9,-2.4,-.1);ctx.strokeStyle=['#ffbdcc','#fb416c','#9c153d'][i];ctx.lineWidth=7-i*2;ctx.stroke();}
    }else if(name==='Angel Blessing'){
     ctx.shadowColor='#ffe49c';ctx.shadowBlur=12;ctx.fillStyle='#ffeab5';
     for(const side of [-1,1]){ctx.save();ctx.scale(side,1);for(let i=0;i<5;i++){ctx.beginPath();ctx.ellipse(21+i*3,-9-i*5,24-i*2,6,-.8-p*.1,0,Math.PI*2);ctx.fill();}ctx.restore();}
     ctx.beginPath();ctx.ellipse(0,-46,19,5,0,0,Math.PI*2);ctx.strokeStyle='#fff1bf';ctx.lineWidth=3;ctx.stroke();
    }else{
     const aura=ctx.createRadialGradient(0,-8,7,0,-8,64);aura.addColorStop(0,'#ed5cff88');aura.addColorStop(.6,'#8f2fe877');aura.addColorStop(1,'#8f2fe800');ctx.fillStyle=aura;ctx.fillRect(-64,-72,128,128);
     ctx.strokeStyle='#ed77ff';ctx.lineWidth=4;for(const side of [-1,1]){ctx.beginPath();ctx.moveTo(side*13,-26);ctx.quadraticCurveTo(side*37,-42,side*27,-63);ctx.quadraticCurveTo(side*19,-48,side*6,-39);ctx.stroke();}
    }
    ctx.restore();
   },onComplete:done});
  }
  play.addEventListener('click',async()=>{
   if(session){stop();return;}if(!allowed()){game.ui.showToast('Finish the current event or battle first.');return;}
   const r=game.renderer,travel=document.getElementById('btn-travel-next');
   const s={effects:r.skillCombatEffects,enemy:r.enemyState,player:{...r.playerState},scroll:r.scrollSpeed,travel,disabled:travel?.disabled,className:travel?.className,label:document.getElementById('next-day-btn-text')?.innerHTML};session=s;
   game.adventureEngine._mythicPreview=true;game.adventureEngine.autoTravel=false;r.scrollSpeed=0;r.skillCombatEffects=[];r.spawnEnemy({name:'Practice Target',sprite:'assets/characters/enemies/roster/stone_golem.png',hp:1000,scale:1});
   if(travel)travel.disabled=true;play.textContent='■ Stop FX';
   const mythics=game.GameData.skills.filter(sk=>sk.rarity==='mythic');
   try{
    for(let i=0;i<mythics.length;i++){
     if(session!==s)break;
     const name=mythics[i].name;status.textContent=`${i+1}/6 · ${name}${[404,406].includes(mythics[i].id)?' · activation preview':''}`;
     await waitFor(s,done=>{
      const x=Math.min(r.width-55,r.playerState.x+150),y=r.groundY-20;
      if(mythics[i].id===402)r.launchDragonBreath(r.playerState.x+25,r.groundY-40,x,y,()=>{},done,1);
      else if(mythics[i].id===403)r.launchBlackHole(x,y,()=>{},done,1);
      else if(mythics[i].id===405)r.launchMeteorStrike(x,y,()=>{},done,1);
      else if(mythics[i].id===401)r.launchBloodBlade(()=>{},done,1);
      else if(mythics[i].id===404)r.launchAngelBlessing(done,1);
      else if(mythics[i].id===406)r.launchDemonForm(done,1);
      else passive(name,done);
     });
     if(session===s){r.skillCombatEffects=[];r.setPlayerAnim('idle',true);}
    }
   }catch(error){console.error('Mythic FX preview failed',error);game.ui.showToast('Preview stopped. Your run is unchanged.');}
   finally{if(session===s)stop();}
  });
  setInterval(()=>{if(session&&(game.ui.activeTab!=='adventure'||document.hidden))stop();play.disabled=!session&&!allowed();},300);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
