// Capy-only atlases sampled by elapsed time, with safe original-sprite fallback.
(() => {
 const base='assets/characters/player/smooth-v2/';
 const config={idle:{frames:240,loop:true},walk:{frames:96,loop:true},attack:{frames:72,loop:false},hurt:{frames:60,loop:false}};
 for(const [name,a]of Object.entries(config)){a.image=new Image();a.image.src=base+name+'.png';}
 const aliases={run:'walk',skill:'idle',sword_slash:'attack',heal:'idle',black_hole:'idle',dragon_roar:'attack',die:'hurt'};
 window.CapySmooth={
  draw(ctx,name,elapsed,x,y,w,h,loop=true,pose=null){
   const a=pose?.kind==='blood'?config.attack:(config[aliases[name]||name]||config.idle);if(!a.image.complete||!a.image.naturalWidth)return false;
   const rate=name==='run'?1.45:1;
   let f=pose?.kind==='blood'?Math.floor(Math.max(0,Math.min(71,pose.frame))):Math.floor(Math.max(0,elapsed)*.12*rate);f=(a.loop&&loop)?f%a.frames:Math.min(a.frames-1,f);
   ctx.save();ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';if(name==='walk'||name==='run'){const phase=elapsed/(name==='run'?430:650)*Math.PI*2;ctx.translate(x+w/2,y+h*120/128);ctx.rotate(Math.sin(phase)*.022);ctx.scale(1+Math.sin(phase*2)*.006,1-Math.sin(phase*2)*.006);ctx.translate(-x-w/2,-y-h*120/128);}
   ctx.drawImage(a.image,(f%12)*128,Math.floor(f/12)*128,128,128,x,y,w,h);ctx.restore();return true;
  }
 };
 const bindings=new Map(),reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
 let raf=0;const timing={};
 const wake=()=>{if(!raf&&!document.hidden)raf=requestAnimationFrame(tick);};
 const resize=typeof ResizeObserver==='function'?new ResizeObserver(entries=>{for(const e of entries){const item=bindings.get(e.target);if(item)item.dirty=true;}wake();}):null;
 const visibility=typeof IntersectionObserver==='function'?new IntersectionObserver(entries=>{for(const e of entries){const item=bindings.get(e.target);if(item){item.visible=e.isIntersecting;item.dirty=true;}}wake();}):null;
 function bind(){
  for(const selector of ['#hero-capy-avatar-img','.talents-capy-hero-img']){
   const img=document.querySelector(selector);if(!img||bindings.has(img))continue;
   const canvas=document.createElement('canvas');canvas.width=384;canvas.height=384;canvas.className='capy-ui-smooth-canvas';canvas.setAttribute('aria-hidden','true');
   img.parentElement.style.position='relative';img.parentElement.append(canvas);bindings.set(img,{canvas,ctx:canvas.getContext('2d'),dirty:true,visible:!visibility,lastSample:-1,lastLayout:0});resize?.observe(img);visibility?.observe(img);
  }
 }
 function tick(now){
  raf=0;if(document.hidden)return;let active=false;
  const dt=window.GameGraphics?window.GameGraphics.frame(timing,now):1/60;
  for(const [img,item]of bindings){
   const {canvas,ctx}=item;
   if(!img.isConnected){resize?.unobserve(img);visibility?.unobserve(img);canvas.remove();bindings.delete(img);continue;}
   if(visibility&&!item.visible)continue;active=true;if(dt===null)continue;
   const equipped=img.classList.contains('equipped-showcase'),ready=config.idle.image.complete&&config.idle.image.naturalWidth>0;
   const display=equipped?'none':'block';if(canvas.style.display!==display)canvas.style.display=display;
   const show=!equipped&&ready;if(img.classList.contains('capy-smooth-source')!==show)img.classList.toggle('capy-smooth-source',show);
   if(equipped||!ready)continue;
   if(item.dirty||now-item.lastLayout>500){
    const r=img.getBoundingClientRect();if(!r.width||!r.height)continue;
    const parent=img.parentElement.getBoundingClientRect();
    for(const [key,value]of Object.entries({left:(r.left-parent.left)+'px',top:(r.top-parent.top+(img.matches('.talents-capy-hero-img')?r.height*8/128:0))+'px',width:r.width+'px',height:r.height+'px'}))if(canvas.style[key]!==value)canvas.style[key]=value;
    item.dirty=false;item.lastLayout=now;
   }
   const sample=reducedMotion.matches?0:Math.floor(now*.12)%240;
   if(sample===item.lastSample)continue;item.lastSample=sample;
   ctx.clearRect(0,0,384,384);CapySmooth.draw(ctx,'idle',reducedMotion.matches?0:now,0,0,384,384);
  }
  if(active)wake();
 }
 document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(raf);raf=0;timing.last=null;timing.next=null;}else wake();});
 window.addEventListener('resize',()=>{for(const item of bindings.values())item.dirty=true;wake();});
 window.addEventListener('graphics-change',wake);
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{bind();wake()});else{bind();wake()}
})();
