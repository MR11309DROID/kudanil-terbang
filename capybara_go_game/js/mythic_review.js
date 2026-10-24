// Temporary review toggle; only adds missing skills and can remove its own additions.
(() => {
 function init(){
  const game=window.Game;if(!game)return;
  const panel=document.getElementById('adventure-active-panel');if(!panel)return;
  const row=document.createElement('div');row.className='mythic-review-tools';
  const button=document.createElement('button');button.type='button';button.className='mythic-review-button';
  button.title='Temporary review tool: add all six Mythic skills to the current run';
  row.append(button);panel.querySelector('.adventure-bottom-deck').before(row);
  function render(){
   const run=game.Character.activeRun;
   const enabled=!!run?._mythicReviewAddedIds;
   button.textContent=enabled?'↶ Restore build':'✦ Review 6 Mythic';
   button.setAttribute('aria-pressed',String(enabled));
   button.disabled=game.adventureEngine._mythicPreview||!run||game.battleSystem.inBattle||game.adventureEngine.traveling;
  }
  button.addEventListener('click',()=>{
   const run=game.Character.activeRun;if(game.adventureEngine._mythicPreview||!run||game.battleSystem.inBattle||game.adventureEngine.traveling)return;
   const mythics=game.GameData.skills.filter(s=>s.rarity==='mythic');
   if(mythics.length!==6){game.ui.showToast('Mythic catalog unavailable.');return;}
   if(run._mythicReviewAddedIds){
    const added=new Set(run._mythicReviewAddedIds);
    run.skills=(run.skills||[]).filter(s=>!added.has(s.id));
    delete run._mythicReviewAddedIds;
    game.ui.showToast('Original build restored.');
   }else{
    run.skills=run.skills||[];run._mythicReviewAddedIds=[];
    for(const skill of mythics)if(!run.skills.some(s=>s.id===skill.id)){run.skills.push({...skill});run._mythicReviewAddedIds.push(skill.id);}
    game.adventureEngine.autoTravel=false;
    game.ui.showToast('All 6 Mythic skills active. Fight to review their effects!');
   }
   game.Character.save();game.ui.renderAdventureScreen();render();
  });
  setInterval(render,400);render();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
