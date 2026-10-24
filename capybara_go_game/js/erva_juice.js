// Presentation only: tutorial ownership and progression remain in erva_guide.js.
(() => {
 const popupAnimations=new WeakMap();
 const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
 const segment=text=>typeof Intl.Segmenter==='function'?[...new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(text)].map(x=>x.segment):Array.from(text);
 function particles(host){
  if(reduced())return;const box=host.getBoundingClientRect();
  for(let i=0;i<9;i++){const dot=document.createElement('i');dot.className='erva-spark';dot.setAttribute('aria-hidden','true');dot.style.left=(box.left+box.width*(.2+.6*(i%3)/2))+'px';dot.style.top=(box.top+box.height*(.35+.45*Math.floor(i/3)/2))+'px';document.body.append(dot);
   const a=dot.animate([{opacity:0,transform:'translate3d(0,8px,0) scale(.3)'},{opacity:.8,offset:.25},{opacity:0,transform:`translate3d(${Math.sin(i*2.4)*34}px,${-25-i*4}px,0) scale(.1)`}],{duration:650+i*37,easing:'ease-out'});a.finished.catch(()=>{}).then(()=>dot.remove());}
 }
 function create(card){
  const line=card.querySelector('p'),next=card.querySelector('.erva-guide-next'),face=card.querySelector('.erva-guide-face');let frame=0,typing=false,full='',visible=null,nextLabel='',reaction=null,movement=null;
  const label=()=>{next.textContent=typing?(window.ErvaLocale?.preferences?.subtitle==='ja'?'全文表示':'Skip text'):nextLabel;next.dataset.typing=String(typing);};
  function stop(){cancelAnimationFrame(frame);frame=0;typing=false;card.dataset.typing='false';}
  function finish(){if(!typing)return false;stop();visible.textContent=full;label();return true;}
  function begin(step){
   stop();full=line.textContent;nextLabel=window.ErvaLocale?.preferences?.subtitle==='ja'?(next.textContent==="Let's go!"?'出発！':'次へ'):next.textContent;const glyphs=segment(full);
   const reserve=document.createElement('span');reserve.className='erva-text-reserve';reserve.textContent=full;reserve.setAttribute('aria-hidden','true');
   visible=document.createElement('span');visible.className='erva-text-visible';visible.setAttribute('aria-hidden','true');
   const accessible=document.createElement('span');accessible.className='erva-sr-only';accessible.textContent=full;
   line.replaceChildren(reserve,visible,accessible);
   card.dataset.reaction=/risk|fight|boss|angry/.test(step.voice)?'alert':/gift|rank/.test(step.voice)?'excited':step.voice==='guide_welcome'?'welcoming':'pointing';
   if(reduced()){visible.textContent=full;label();return;}
   typing=true;card.dataset.typing='true';label();let start,lastCount=-1;const duration=Math.min(4400,Math.max(1000,glyphs.length*24));
   function tick(now){start??=now;const n=Math.min(glyphs.length,Math.floor((now-start)/duration*glyphs.length));if(n!==lastCount){visible.textContent=glyphs.slice(0,n).join('');lastCount=n;}if(n<glyphs.length)frame=requestAnimationFrame(tick);else{stop();label();}}
   frame=requestAnimationFrame(tick);
  }
  function react(kind){if(reduced())return;reaction?.cancel();const frames=kind==='alert'?[{transform:'translate3d(0,0,0)'},{transform:'translate3d(-3px,0,0)',offset:.25},{transform:'translate3d(3px,0,0)',offset:.55},{transform:'translate3d(0,0,0)'}]:[{transform:'translate3d(0,0,0) scale(1)'},{transform:'translate3d(0,-12px,0) scale(1.035)',offset:.4},{transform:'translate3d(0,0,0) scale(1)'}];reaction=face.animate(frames,{duration:620,easing:'cubic-bezier(.2,.8,.3,1)'});if(kind==='excited')particles(face);}
  function capture(){
   const before=card.getBoundingClientRect();movement?.cancel();movement=null;return before;
  }
  function move(before){
   movement?.cancel();if(reduced())return;const after=card.getBoundingClientRect();if(!after.width||!after.height)return;
   const base=getComputedStyle(card).transform,dx=before.left-after.left,dy=before.top-after.top;
   card.style.transformOrigin='0 0';movement=card.animate([{transform:`translate3d(${dx}px,${dy}px,0) ${base} scale(${before.width/after.width},${before.height/after.height})`,opacity:.85},{transform:base,opacity:1}],{duration:420,easing:'cubic-bezier(.16,1,.3,1)'});
  }
  function dispose(){stop();reaction?.cancel();movement?.cancel();}
  return {begin,finish,dispose,react,move,capture,get typing(){return typing;}};
 }
 function spring(card,opening){
  popupAnimations.get(card)?.cancel();if(reduced())return Promise.resolve();particles(card);card.style.transformOrigin='50% 85%';
  const base=getComputedStyle(card).transform;
  const frames=opening?[{opacity:0,transform:base+' scale(.8)'},{opacity:1,transform:base+' scale(1.05)',offset:.68},{opacity:1,transform:base+' scale(1)'}]:[{opacity:1,transform:base+' scale(1)'},{opacity:.9,transform:base+' scale(1.025)',offset:.22},{opacity:0,transform:base+' translateY(12px) scale(.8)'}];
  const animation=card.animate(frames,{duration:opening?540:310,easing:'cubic-bezier(.2,.75,.3,1)'});popupAnimations.set(card,animation);return animation.finished.catch(()=>{});
 }

 function genieFrames(box,dock,opening){
  const dx=dock.x-(box.left+box.width/2),dy=dock.y-(box.top+box.height);
  const skew=Math.max(-12,Math.min(12,Math.atan2(dx,Math.max(80,Math.abs(dy)+box.height*.5))*180/Math.PI*.3));
  const full='polygon(0% 0%,100% 0%,100% 100%,0% 100%)';
  const funnel='polygon(0% 0%,100% 0%,65% 100%,35% 100%)';
  const neck='polygon(0% 0%,100% 0%,56% 100%,44% 100%)';
  const ease='cubic-bezier(0.4,0,0.2,1)';
  const frame=(offset,x,y,sx,sy,rx,sk,clip,opacity=1,blur=0,holdTop=false)=>{
   // Rotate around the center to keep the top behind the perspective camera.
   // Compensate the projected bottom point so the funnel mouth remains anchored.
   const angle=rx*Math.PI/180,half=box.height*sy/2,projection=300/(300-Math.sin(angle)*half);
   if(holdTop)sx*=Math.max(.2,(300+Math.sin(angle)*half)/300);
   const bottomX=Math.tan(sk*Math.PI/180)*half*projection,bottomY=Math.cos(angle)*half*projection;
   const tx=x-bottomX,ty=y+box.height/2-bottomY;
   return {offset,transform:`translate3d(${tx}px,${ty}px,0) perspective(300px) rotateX(${rx}deg) skewX(${sk}deg) scale(${sx},${sy})`,clipPath:clip,opacity,filter:`blur(${blur}px)`,easing:ease};
  };
  if(opening)return [
   frame(0,dx,dy,.02,.02,-30,skew,neck,0,2),
   frame(.25,dx,dy,.15,.6,-30,skew,neck,1),
   frame(.6,dx*.25,dy*.12,.85,1.06,-12,skew*.35,funnel),
   frame(.88,0,0,1.025,1.025,0,0,full),
   frame(1,0,0,1,1,0,0,full)
  ];
  return [
   frame(0,0,0,1,1,0,0,full),
   frame(.35,dx*.15,dy*.08,1,1,-35,skew,funnel,1,0,true),
   frame(.55,dx,dy,.6,1.15,-18,skew*.6,neck),
   frame(.75,dx,dy,.18,.3,-7,skew*.2,neck,.95),
   frame(1,dx,dy,.02,.02,0,0,neck,0,2)
  ];
 }
 function genie(card,launcher,opening){
  popupAnimations.get(card)?.cancel();if(reduced())return Promise.resolve();
  const box=card.getBoundingClientRect(),button=launcher?.getBoundingClientRect();
  const dock={x:button?.width?button.left+button.width/2:innerWidth/2,y:button?.height?button.top+button.height/2:innerHeight-32};
  const parent=card.parentNode,marker=document.createElement('span'),shell=document.createElement('div');
  marker.hidden=true;marker.setAttribute('aria-hidden','true');marker.dataset.noLocalize='';
  const savedStyle=card.getAttribute('style'),savedInert=card.inert;
  shell.className='erva-genie-surface';shell.dataset.direction=opening?'restore':'minimize';
  shell.style.cssText=`position:fixed;left:${box.left}px;top:${box.top}px;width:${box.width}px;height:${box.height}px;z-index:3;transform-origin:50% 50%;will-change:transform,opacity,clip-path,filter;pointer-events:none;`;
  parent.insertBefore(marker,card);parent.append(shell);shell.append(card);
  card.dataset.popupTransition=opening?'opening':'closing';card.inert=true;
  card.style.cssText=`position:absolute;left:0;top:0;bottom:auto;margin:0;width:${box.width}px;height:${box.height}px;max-height:none;box-sizing:border-box;transform:none;translate:none;scale:none;transition:none;animation:none;`;
  let cleaned=false,cancelled=false;
  const cleanup=()=>{if(cleaned)return;cleaned=true;marker.replaceWith(card);if(savedStyle===null)card.removeAttribute('style');else card.setAttribute('style',savedStyle);card.inert=savedInert;delete card.dataset.popupTransition;shell.remove();};
  const animation=shell.animate(genieFrames(box,dock,opening),{duration:500,easing:'linear',fill:'both'});
  popupAnimations.set(card,{cancel(){cancelled=true;animation.cancel();cleanup();}});
  return animation.finished.then(()=>{
   cleanup();
   if(!opening&&launcher&&!reduced())launcher.animate([{transform:'translate3d(0,0,0) scale(1)'},{transform:'translate3d(0,-5px,0) scale(1.12)',offset:.35},{transform:'translate3d(0,0,0) scale(1)'}],{duration:300,easing:'cubic-bezier(.2,.8,.3,1)'});
   if(opening&&!cancelled)card.querySelector('.erva-guide-next')?.focus({preventScroll:true});
  }).catch(cleanup);
 }
 function celebrateVisible(){if(reduced())return;document.querySelectorAll('.erva-portrait-wrap,.erva-gift-stage').forEach(host=>{if(!host.getBoundingClientRect().height)return;host.animate([{transform:'translate3d(0,0,0)'},{transform:'translate3d(0,-12px,0)',offset:.4},{transform:'translate3d(0,0,0)'}],{duration:650,easing:'ease-out'});particles(host);});}
 window.addEventListener('erva-reward-claimed',celebrateVisible);
 window.addEventListener('erva-voice-start',e=>{if(['gift','rank'].includes(e.detail?.key))celebrateVisible();});
 window.ErvaJuice={create,spring,genie,genieFrames,particles,segment};
})();
