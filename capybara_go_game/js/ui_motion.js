// Presentation only. Existing click handlers, dialog ownership and tutorial state stay authoritative.
(() => {
 const animations=new Map(),reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const allowed=()=>!document.hidden&&!reduced.matches&&window.GameGraphics?.settings.quality!=='low';
 function stop(){for(const a of animations.values())a.cancel();animations.clear();}
 function play(node,frames,duration=320){
  if(!node||!allowed())return;
  animations.get(node)?.cancel();
  const a=node.animate(frames,{duration,easing:'cubic-bezier(.2,.75,.25,1)'});animations.set(node,a);
  a.finished.catch(()=>{}).then(()=>{if(animations.get(node)===a)animations.delete(node);});
 }
 function enter(node){
  if(!allowed()||window.ErvaGuideActive)return;
  const base=getComputedStyle(node).transform;
  const transform=base==='none'?'':base;
  play(node,[{opacity:0,transform:transform+' translate3d(0,18px,0) scale(.96)'},{opacity:1,transform:transform+' translate3d(0,-1px,0) scale(1.008)',offset:.78},{opacity:1,transform:transform||'none'}],340);
 }
 function init(){
  // Observe just the surface itself, never the game/Erva subtree on every frame.
  const surfaces=document.querySelectorAll('dialog:not(.erva-talk-dialog):not(.mira-rank-dialog),.modal-overlay');
  const wasOpen=new WeakMap();
  const open=node=>node.tagName==='DIALOG'?node.open:!node.hidden&&getComputedStyle(node).display!=='none';
  for(const surface of surfaces){
   wasOpen.set(surface,open(surface));
   new MutationObserver(()=>{
    const visible=open(surface),before=wasOpen.get(surface);wasOpen.set(surface,visible);
    if(visible&&!before)enter(surface.tagName==='DIALOG'?surface:surface.querySelector('.modal-panel,.modal-content')||surface.firstElementChild);
    if(!visible){const node=surface.tagName==='DIALOG'?surface:surface.querySelector('.modal-panel,.modal-content')||surface.firstElementChild;animations.get(node)?.cancel();animations.delete(node);}
   }).observe(surface,{attributes:true,attributeFilter:['open','style','hidden']});
  }
  for(const tab of document.querySelectorAll('#bottom-nav .nav-tab-btn')){
   let active=tab.classList.contains('active');
   new MutationObserver(()=>{
    const selected=tab.classList.contains('active');
    if(selected&&!active&&!window.ErvaGuideActive){
     const icon=tab.querySelector('.nav-tab-img,.nav-adventure-img');
     play(icon,[{scale:'.85',translate:'0 3px'},{scale:'1.12',translate:'0 -4px',offset:.55},{scale:'1',translate:'0 0'}],360);
     const page=document.getElementById('tab-'+tab.dataset.tab);
     if(!window.Game?.battleSystem?.inBattle)play(page,[{opacity:.65,translate:'0 10px'},{opacity:1,translate:'0 0'}],250);
    }
    active=selected;
   }).observe(tab,{attributes:true,attributeFilter:['class']});
  }
  document.addEventListener('click',event=>{
   if(event.target.closest?.('.erva-guide-help')){stop();return;}
   const button=event.target.closest?.('.quick-sidebar-btn,.ev-home-shortcut,.ev-button,.ev-close,.modal-close-btn,.btn-toggle-quick-stack');
   if(button&&!button.disabled&&!window.ErvaGuideActive)play(button,[{scale:'.94'},{scale:'1.035',offset:.6},{scale:'1'}],260);
  },true);
  const guide=document.querySelector('.erva-guide');
  if(guide)new MutationObserver(()=>{
   const active=!guide.hidden;document.documentElement.classList.toggle('ui98-guiding',active);if(active)stop();
  }).observe(guide,{attributes:true,attributeFilter:['hidden']});
  if(typeof IntersectionObserver==='function'){
   const visibility=new IntersectionObserver(entries=>{for(const entry of entries)entry.target.classList.toggle('ui98-sleep',entry.intersectionRatio<.15);},{threshold:[0,.15]});
   document.querySelectorAll('.quick-sidebar-btn').forEach(node=>visibility.observe(node));
  }
  const visibility=()=>{document.documentElement.classList.toggle('ui98-paused',document.hidden);if(document.hidden)stop();};
  document.addEventListener('visibilitychange',visibility);visibility();
  window.addEventListener('graphics-change',()=>{if(!allowed())stop();});
  reduced.addEventListener('change',()=>{if(reduced.matches)stop();});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
