// Thigh-up Erva rig. All arms, hands, costume and face pixels come from the same full-body artwork.
(() => {
 const W=1024,H=960,source=new Image(),rigs=new Map();let layers=null;
 const reducedMotion=typeof matchMedia==='function'?matchMedia('(prefers-reduced-motion: reduce)'):{matches:false};
 let frameId=0;const frameClock={};
 const visibility=typeof IntersectionObserver==='function'?new IntersectionObserver(entries=>{for(const entry of entries){const r=entry.target._ervaRig;if(r){r.intersecting=entry.isIntersecting;r.visible=entry.isIntersecting&&r.visible;}}wake();}):null;
 function wake(){if(!frameId&&!document.hidden)frameId=requestAnimationFrame(tick);}
 const armOutline=[[390,430],[432,459],[423,503],[407,550],[405,596],[391,642],[370,689],[337,724],[295,755],[286,783],[272,810],[240,815],[190,815],[180,740],[180,699],[185,675],[195,644],[220,616],[274,590],[309,568],[343,538],[359,501],[373,463]];
 const native={L:{s:{x:404,y:450},e:{x:370,y:560},w:{x:274,y:722},f:{x:247,y:800}},R:{s:{x:620,y:450},e:{x:654,y:560},w:{x:750,y:722},f:{x:777,y:800}}};
 function path(c,points){c.beginPath();points.forEach((p,i)=>c[i?'lineTo':'moveTo'](p[0],p[1]));c.closePath();}
 function build(){
  const make=()=>{const c=document.createElement('canvas');c.width=1024;c.height=1536;return c;};
  const body=make();body.getContext('2d').drawImage(source,0,0);layers={body};
  for(const side of ['L','R']){const outline=armOutline.map(p=>[side==='L'?p[0]:1024-p[0],p[1]]),layer=make(),c=layer.getContext('2d');c.save();path(c,outline);c.clip();c.drawImage(source,0,0);c.restore();layers[side]=layer;const bc=body.getContext('2d');bc.save();bc.globalCompositeOperation='destination-out';path(bc,outline);bc.fill();bc.restore();}
 }
 // Remove detached matte fragments left behind by the native arm cutout.
 function cleanFragments(canvas){const c=canvas.getContext('2d'),im=c.getImageData(0,0,1024,960),a=im.data,seen=new Uint8Array(1024*960);for(let i=0;i<seen.length;i++){if(seen[i]||a[i*4+3]<12)continue;const queue=[i];seen[i]=1;let minY=960;for(let j=0;j<queue.length;j++){const q=queue[j],x=q%1024,y=(q/1024)|0;minY=Math.min(minY,y);for(const n of [x>0?q-1:-1,x<1023?q+1:-1,y>0?q-1024:-1,y<959?q+1024:-1])if(n>=0&&!seen[n]&&a[n*4+3]>=12){seen[n]=1;queue.push(n);}}if(minY>420&&queue.length<2400)for(const q of queue)a[q*4+3]=0;}c.putImageData(im,0,0);}
 source.onload=()=>{build();cleanFragments(layers.body);prepareMesh(layers.body,192,832,0,H,8,16);prepareMesh(layers.L,176,440,422,820,4,12);prepareMesh(layers.R,584,848,422,820,4,12);wake();};source.src='assets/ui/camp/erva-fullbody-v2.png';
 const clamp=x=>Math.max(0,Math.min(1,x)),mix=(a,b,t)=>a+(b-a)*t;
 const ease=x=>{x=clamp(x);return x*x*(3-2*x);};
 function motion(mood,t,level,seed=0){
  const laugh=mood==='laugh',smug=mood==='smug',confident=['proud','confident'].includes(mood),shy=mood==='shy',nervous=mood==='nervous',sad=mood==='sad',angry=mood==='angry',happy=['happy','excited'].includes(mood),excited=mood==='excited';
  // Slow holds punctuated by conversational accents, with a different rhythm for each recording.
  const accent=Math.pow(Math.max(0,Math.sin(t*2.7+seed)),4)*level;
  const phrase=Math.sin(t*.83+seed),listen=Math.sin(t*.39+seed);
  const look=Math.sin(t*.43+seed),breath=Math.sin(t*1.65+seed),chuckle=Math.max(0,Math.sin(t*11.5+seed))**2*level;
  return {
   tilt:(smug?-.075:confident?-.045:shy?.065:sad?.055:angry?-.025:happy?-.022:0)+Math.sin(t*.91+seed)*.019+phrase*.012*level+accent*(angry?-.022:.014),
   nod:(sad?2.8:confident||smug?-1.5:excited?-1:0)+breath*.5-accent*1.4+(laugh?-chuckle*.85:0),
   body:breath*1.4+(laugh?-chuckle*.35:0),
   sway:Math.sin(t*.7+seed)*1.1+listen*.6*level+(shy?1.2:angry?-1:0),
   joy:laugh?1:0,
   lid:smug?.38:confident?.18:sad?.22:angry?.13:0,
   smile:laugh?1:happy?.8:smug?.65:confident?.35:sad?-.7:angry?-.45:shy?.3:0,
   gazeX:(shy?2.1:smug?-1.3:nervous?Math.sin(t*2)*1.1:look*.65),
   gazeY:sad?1.5:confident?-.5:shy?.8:Math.sin(t*.37+seed)*.25,
   blush:laugh?.20:shy?.5:nervous?.22:happy?.12:0,
   brow:angry?1:sad?-.6:nervous?-.35:0,
   energy:excited?1:happy?.6:angry?.7:laugh?.8:sad?.1:.3,
   laugh,smug,shy,angry,happy,sad
  };
 }
 function spring(state,velocity,target,dt,reduced){
  if(reduced){Object.assign(state,target);return;}
  const steps=Math.max(1,Math.ceil(dt/.008)),h=dt/steps;
  for(let i=0;i<steps;i++)for(const key of Object.keys(target)){
   if(typeof target[key]!=='number')continue;
   const frequency=key==='open'?22:key==='lid'?20:key.endsWith('Hand')?7.5:key.endsWith('Fore')?8.5:key.endsWith('Upper')?9.5:10.5;
   velocity[key]=(velocity[key]||0)+((target[key]-(state[key]||0))*frequency*frequency-1.94*frequency*(velocity[key]||0))*h;
   state[key]=(state[key]||0)+velocity[key]*h;
  }
 }

 const modes={wave:['welcome','guide_welcome','guide_shop','event_travel'],point:['guide_start','guide_gear','guide_camp','guide_risk','guide_gift','event_choices','event_gold','event_risk','event_fight','sidebar_newbie','sidebar_daily','sidebar_wheel','sidebar_achieve','sidebar_pass','sidebar_stats','sidebar_pets','sidebar_shortcuts','sidebar_clean','tip'],present:['gift','event_intro','event_rest','event_chosen'],celebrate:['rank'],heart:['shy','sad','nervous'],laugh:['laugh'],warn:['angry']};
 const modeFor=key=>Object.keys(modes).find(k=>modes[k].includes(key))||'idle';
 const angleMix=(a,b,t)=>a+Math.atan2(Math.sin(b-a),Math.cos(b-a))*t;
 const angle=(a,b)=>Math.atan2(b.y-a.y,b.x-a.x),distance=(a,b)=>Math.hypot(b.x-a.x,b.y-a.y);
 function pose(key,t,level,pointSide='right',down=false){
  const p={mode:modeFor(key),torsoLean:0,palmFacing:0};for(const side of ['L','R']){const n=native[side];p[side+'Upper']=angle(n.s,n.e);p[side+'Fore']=angle(n.e,n.w);p[side+'Hand']=angle(n.w,n.f);}
  const idle={...p},right=(u,f,h)=>{p.RUpper=u;p.RFore=f;p.RHand=h;},mirror=()=>{p.LUpper=Math.PI-p.RUpper;p.LFore=Math.PI-p.RFore;p.LHand=Math.PI-p.RHand;};
  if(p.mode==='wave'||p.mode==='celebrate'){
   const wave=ease((t-.6)/.3)*(1-ease((t-2.4)/.5));right(.35,-1.45,-1.6+Math.sin((t-.6)*6.2)*.14*wave);
   if(p.mode==='celebrate')mirror();else{const settle=ease((t-2.9)/.9);p.RUpper=angleMix(p.RUpper,.95,settle);p.RFore=angleMix(p.RFore,-.42,settle);p.RHand=angleMix(p.RHand,-.45,settle);}
  }
  if(p.mode==='point'){right(down?.85:.75,down?-.12:-.62,down?.22:-.40);p.torsoLean=-.012;if(pointSide==='left'){mirror();p.RUpper=idle.RUpper;p.RFore=idle.RFore;p.RHand=idle.RHand;p.torsoLean=.012;}}
  if(p.mode==='present'){right(.95,-.42,-.45);mirror();}
  if(p.mode==='heart'){right(1,-2.8,-1.2);p.torsoLean=.009;}
  if(p.mode==='laugh'){right(.55,-2.2,-2.1);}
  if(p.mode==='warn'){right(.35,-1.4,-1.4);}
  p.palmFacing=['wave','present','point','celebrate'].includes(p.mode)?1:.35;
  if(p.mode==='idle'){const a=Math.sin(t*.65),b=Math.sin(t*.65-.45);p.RUpper+=a*.035;p.RFore+=b*.065;p.RHand+=Math.sin(t*.65-.8)*.07;p.LFore-=b*.035;p.torsoLean=Math.sin(t*.38)*.009;}
  // Dialogue-specific two-arm staging: introduce, demonstrate, then invite.
  // Angles use the original sleeve/hand meshes; no additional limbs are drawn.
  if(p.mode!=='idle'){
   const names=Object.values(modes).flat(),scene=Math.max(0,names.indexOf(key));
   const variant=scene%4,leadLeft=/gear|camp|pets|rest|daily|shy|sad/.test(key);
   const lead=leadLeft?'L':'R',support=leadLeft?'R':'L';
   const apply=(side,u,f,h,amount)=>{const values=side==='L'?[Math.PI-u,Math.PI-f,Math.PI-h]:[u,f,h];['Upper','Fore','Hand'].forEach((joint,i)=>{p[side+joint]=angleMix(p[side+joint],values[i],amount);});};
   const enter=ease((t-.6-(scene%3)*.12)/.65);
   const demonstrate=ease((t-1.9-(scene%4)*.12)/.8);
   const invite=ease((t-4.0-(scene%3)*.15)/.85);
   const cycle=(1+Math.sin(t*1.25+scene*.8))*.5;
   // The supporting hand lifts from the hip into a visibly open presentation.
   apply(support,1.02,-.36,-.25,enter*(.72+.12*cycle));
   if(p.mode==='point'){
    const pointing=pointSide==='left'?'L':'R';
    const other=pointing==='L'?'R':'L';
    apply(other,variant===0?.65:1.02,variant===1?-1.05:-.35,-.28,demonstrate);
    // Bring the explanation back toward the player between pointing accents.
    apply(pointing,.85,-.65,-.38,invite*.35);
   }else{
    apply(lead,variant===0?.55:variant===1?.85:1.02,variant===2?-1.2:-.5,variant===2?-1.0:-.28,demonstrate);
    apply(support,.95,-.5,-.35,invite*.7);
   }
   // Offset elbows and wrists to prevent a mechanical mirrored gesture.
   p.LFore+=Math.sin(t*1.45+scene*.42)*.055*demonstrate;
   p.RFore+=Math.sin(t*1.45+scene*.42-.8)*.045*demonstrate;
   p.LHand+=Math.sin(t*1.45+scene*.42-.45)*.07*demonstrate;
   p.RHand+=Math.sin(t*1.45+scene*.42-1.2)*.06*demonstrate;
   p.torsoLean+=Math.sin(t*.8+scene)*.012*demonstrate;
  }
  // Anticipation, a clear held silhouette, then a quieter conversational flourish.
  const anticipation=Math.sin(clamp(t/.28)*Math.PI)*.065;
  const phrase=ease((t-2.4)/.65)*(1-ease((t-4.0)/.85));
  const breath=Math.sin(t*1.8),accent=Math.sin(t*2.7)*level;
  if(p.mode!=='idle'){
   const active=pointSide==='left'&&p.mode==='point'?'L':'R';
   p[active+'Upper']+=phrase*.075+breath*.015+accent*.018;
   p[active+'Fore']-=phrase*.16+Math.sin(t*1.8-.35)*.022+accent*.025;
   p[active+'Hand']+=phrase*.12+Math.sin(t*1.8-.7)*.035;
   p.torsoLean+=(p.mode==='heart'?.012:p.mode==='celebrate'?-.014:-.008)*phrase;
  }
  for(const k of Object.keys(p))if(typeof p[k]==='number'){
   const delay=k.endsWith('Hand')?.24:k.endsWith('Fore')?.18:.12;
   const reach=ease((t-delay)/.78);
   p[k]=k==='palmFacing'?mix(idle[k],p[k],reach):angleMix(idle[k],p[k],reach);
   if(k.endsWith('Upper')&&p.mode!=='idle')p[k]+=(k[0]==='L'?-1:1)*anticipation;
  }
  return p;
 }
 // Present the animated native mesh through a display-sized, prefiltered surface.
 // Large textures scaled down directly by the compositor alias fine hair and eye lines.
 const sizeObserver=typeof ResizeObserver==='function'?new ResizeObserver(entries=>{for(const entry of entries){const r=entry.target._ervaRig;if(r){r.cssWidth=entry.contentRect.width;r.cssHeight=entry.contentRect.height;r.presentationDirty=true;}}wake();}):null;
 function present(r){
  const ratio=Math.min(r.resolution,Math.max(.125,Math.min((r.cssWidth||W)/W,(r.cssHeight||H)/H)*Math.max(2,window.devicePixelRatio||1)));
  const width=Math.max(1,Math.round(W*ratio)),height=Math.max(1,Math.round(H*ratio));
  if(r.canvas.width!==width||r.canvas.height!==height||r.sampleWidth!==r.work.width||r.sampleHeight!==r.work.height){
   r.canvas.width=width;r.canvas.height=height;r.downsample=[];let w=r.work.width,h=r.work.height;
   while(Math.floor(w/2)>=width&&Math.floor(h/2)>=height){w=Math.floor(w/2);h=Math.floor(h/2);const layer=document.createElement('canvas');layer.width=w;layer.height=h;r.downsample.push({canvas:layer,c:layer.getContext('2d')});}
   r.sampleWidth=r.work.width;r.sampleHeight=r.work.height;r.canvas.dataset.sampling='progressive';r.canvas.dataset.renderSize=width+'x'+height;
  }
  r.presentationDirty=false;
  let image=r.work;
  for(const layer of r.downsample){const c=layer.c;c.clearRect(0,0,layer.canvas.width,layer.canvas.height);c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';c.drawImage(image,0,0,layer.canvas.width,layer.canvas.height);image=layer.canvas;}
  r.output.clearRect(0,0,width,height);r.output.imageSmoothingEnabled=true;r.output.imageSmoothingQuality='high';r.output.drawImage(image,0,0,width,height);
 }
 function mount(img){
  if(rigs.has(img))return rigs.get(img);
  const canvas=document.createElement('canvas'),work=document.createElement('canvas'),resolution=Math.min(window.GameGraphics?.profile.rigResolution??1.5,Math.max(1,window.devicePixelRatio||1));
  work.width=Math.round(W*resolution);work.height=Math.round(H*resolution);canvas.width=W;canvas.height=H;
  canvas.className='erva-live-rig';canvas.setAttribute('aria-hidden','true');canvas.dataset.framing='thigh-up';img.after(canvas);img.classList.add('erva-rig-source');
  const r={img,canvas,work,resolution,c:work.getContext('2d'),output:canvas.getContext('2d'),downsample:[],presentationDirty:true,mood:img.dataset.base||'neutral',level:0,seed:0,speechTime:0,state:{},velocity:{},started:performance.now(),visible:false,last:0};
  rigs.set(img,r);canvas._ervaRig=r;visibility?.observe(canvas);sizeObserver?.observe(canvas);wake();return r;
 }
 function scan(){document.querySelectorAll('img.erva-actor').forEach(mount);}
 function set(img,state){Object.assign(mount(img),state);}
 function triangle(c,image,cell){
  const [a,b,d]=cell.src,[p,q,r]=cell.dst,{inverse,sx,sy,sw,hh}=cell;
  const aa=((q.x-p.x)*(d.y-a.y)-(r.x-p.x)*(b.y-a.y))*inverse,bb=((q.y-p.y)*(d.y-a.y)-(r.y-p.y)*(b.y-a.y))*inverse,cc=((r.x-p.x)*(b.x-a.x)-(q.x-p.x)*(d.x-a.x))*inverse,dd=((r.y-p.y)*(b.x-a.x)-(q.y-p.y)*(d.x-a.x))*inverse;
  c.save();c.beginPath();const cx=(p.x+q.x+r.x)/3,cy=(p.y+q.y+r.y)/3;
  for(let i=0;i<3;i++){const v=cell.dst[i],dx=v.x-cx,dy=v.y-cy,k=.5/Math.max(1,Math.hypot(dx,dy));if(i)c.lineTo(v.x+dx*k,v.y+dy*k);else c.moveTo(v.x+dx*k,v.y+dy*k);}
  c.closePath();c.clip();c.transform(aa,bb,cc,dd,p.x-aa*a.x-cc*a.y,p.y-bb*a.x-dd*a.y);
  c.drawImage(image,sx,sy,sw,hh,sx,sy,sw,hh);c.restore();
 }
 // Reuse topology and shared vertices; transparent cells cannot contribute any pixels.
 const meshCache=new Map();
 function prepareMesh(image,x0,x1,y0,y1,cols,rows){
  const key=[x0,x1,y0,y1,cols,rows].join(',');let grid=meshCache.get(key);
  if(!grid){const src=[],dst=[],triangles=[],alpha=image.getContext('2d').getImageData(0,0,image.width,H).data;
   for(let row=0;row<=rows;row++)for(let col=0;col<=cols;col++){src.push({x:mix(x0,x1,col/cols),y:mix(y0,y1,row/rows)});dst.push({x:0,y:0});}
   for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
    const a=row*(cols+1)+col,b=a+1,d=a+cols+1,e=d+1;
    const sx=Math.max(0,Math.floor(src[a].x)-2),sy=Math.max(0,Math.floor(src[a].y)-2),right=Math.min(image.width,Math.ceil(src[e].x)+2),bottom=Math.min(H,Math.ceil(src[e].y)+2);let opaque=false;
    for(let y=sy;y<bottom&&!opaque;y++)for(let x=sx;x<right;x++)if(alpha[(y*image.width+x)*4+3]){opaque=true;break;}
    if(!opaque)continue;
    for(const ids of [[a,b,e],[a,e,d]]){const source=ids.map(i=>src[i]),target=ids.map(i=>dst[i]),[p,q,r]=source;triangles.push({src:source,dst:target,inverse:1/((q.x-p.x)*(r.y-p.y)-(r.x-p.x)*(q.y-p.y)),sx,sy,sw:right-sx,hh:bottom-sy});}
   }
   grid={src,dst,triangles};meshCache.set(key,grid);
  }
  return grid;
 }
 function mesh(c,image,x0,x1,y0,y1,cols,rows,warp){
  const grid=prepareMesh(image,x0,x1,y0,y1,cols,rows);
  for(let i=0;i<grid.src.length;i++){const p=grid.src[i],d=warp(p.x,p.y);grid.dst[i].x=d.x;grid.dst[i].y=d.y;}
  for(const cell of grid.triangles)triangle(c,image,cell);
 }
 function rotate(p,root,target,diff){const x=p.x-root.x,y=p.y-root.y;return {x:target.x+x*Math.cos(diff)-y*Math.sin(diff),y:target.y+x*Math.sin(diff)+y*Math.cos(diff)};}
 const endpoint=(p,a,len)=>({x:p.x+Math.cos(a)*len,y:p.y+Math.sin(a)*len});
 function armWarp(side,s,bodyWarp){
  const n=native[side],root=bodyWarp(n.s.x,n.s.y),lean=s.torsoLean||0,u=s[side+'Upper']+lean,f=s[side+'Fore']+lean,h=s[side+'Hand']+lean,elbow=endpoint(root,u,distance(n.s,n.e)),wrist=endpoint(elbow,f,distance(n.e,n.w));
  const ua=u-angle(n.s,n.e),fa=f-angle(n.e,n.w),ha=h-angle(n.w,n.f),cu=Math.cos(ua),su=Math.sin(ua),cf=Math.cos(fa),sf=Math.sin(fa),ch=Math.cos(ha),sh=Math.sin(ha),hc=Math.cos(h),hs=Math.sin(h),palm=clamp(s.palmFacing||0);
  return (x,y)=>{
   const ux=x-n.s.x,uy=y-n.s.y,fx=x-n.e.x,fy=y-n.e.y,hx=x-n.w.x,hy=y-n.w.y;
   const ax=root.x+ux*cu-uy*su,ay=root.y+ux*su+uy*cu,bx=elbow.x+fx*cf-fy*sf,by=elbow.y+fx*sf+fy*cf;
   const dx=hx*ch-hy*sh,dy=hx*sh+hy*ch,facing=ease((y-718)/45)*palm,along=(dx*hc+dy*hs)*(1-facing*.23),across=(-dx*hs+dy*hc)*(1+facing*.30),handX=wrist.x+along*hc-across*hs,handY=wrist.y+along*hs+across*hc;
   const e=ease((y-538)/46),w=ease((y-702)/42),attach=ease((y-430)/34),body=bodyWarp(x,y);
   return {x:mix(body.x,mix(mix(ax,bx,e),handX,w),attach),y:mix(body.y,mix(mix(ay,by,e),handY,w),attach)};
  };
 }
 function face(c,s,t,reduced){
  const cycle=(t+s.gazeX*.2)%5.8,b=!reduced&&cycle>4.6&&cycle<4.78?Math.sin((cycle-4.6)/.18*Math.PI):0;
  for(const [x,y]of [[461,238],[537,232]]){const close=clamp(Math.max(s.lid,b));if(close<.025)continue;c.save();c.beginPath();c.ellipse(x,y,22,18,0,0,Math.PI*2);c.clip();c.fillStyle='#f9d9cc';c.fillRect(x-24,y-20,48,40);if(close<.95){const sy=1-close*.9;c.drawImage(source,x-23,y-18,46,36,x-23,y-18*sy,46,36*sy);}else{c.strokeStyle='#684354';c.lineWidth=2.2;c.lineCap='round';c.beginPath();c.moveTo(x-17,y);c.quadraticCurveTo(x,y+2,x+17,y);c.stroke();}c.restore();}
  const skin=c.createRadialGradient(501,275,3,501,275,17);skin.addColorStop(0,'#fbdbcc');skin.addColorStop(.65,'#fbdbcc');skin.addColorStop(1,'rgba(251,219,204,0)');c.fillStyle=skin;c.fillRect(483,263,36,25);
  const open=clamp(s.open);c.lineCap='round';c.lineWidth=1.45;c.strokeStyle='#ad6d71';
  if(open>.07){const w=6+open*3,h=2+open*6;c.fillStyle='#7b4050';c.beginPath();c.moveTo(501-w,274);c.quadraticCurveTo(501,275.5,501+w,274);c.bezierCurveTo(501+w,275+h,501-w,275+h,501-w,274);c.fill();if(open>.6){c.fillStyle='#e5a0aa';c.beginPath();c.ellipse(501,275+h*.64,w*.45,h*.2,0,0,Math.PI*2);c.fill();}}else{c.beginPath();c.moveTo(493,275);c.quadraticCurveTo(501,278+s.smile*2,509,274);c.stroke();}
 }

 function idleScene(key,t){
  let hash=0;for(const c of key)hash=(hash*31+c.charCodeAt(0))>>>0;
  const phase=(hash%47)*.13,beat=t*(.5+(hash%5)*.035)+phase;
  const cautious=/risk|fight|angry|nervous/.test(key),warm=/gift|pets|rest|shy/.test(key),proud=/gear|stats|rank|achieve/.test(key),playful=/wheel|laugh|shop|welcome/.test(key);
  const hold=(1+Math.sin(beat))*.5;
  return {tilt:Math.sin(beat*.7)*(cautious?.018:.034),nod:Math.sin(beat*1.3)*(proud?1.5:.8),smile:(warm?.45:playful?.38:cautious?-.12:.16)*hold,gazeX:Math.sin(beat*.6)*(cautious?1.8:.9),lid:(proud?.12:cautious?.05:.025)*hold,arm:Math.sin(beat-.6)*(playful?.075:warm?.045:.025),lean:Math.sin(beat*.5)*.009};
 }
 // Keep at least 2x supersampling above the retina presentation size. Tiny
 // portraits no longer rasterize a full-size mesh only to discard most pixels.
 // Geometry, source artwork and final display resolution remain unchanged.
 function rasterResolution(r){
  const ceiling=Math.min(window.GameGraphics?.profile.rigResolution??1.5,Math.max(1,window.devicePixelRatio||1));
  if(!r.cssWidth||!r.cssHeight)return ceiling;
  const display=Math.min(r.cssWidth/W,r.cssHeight/H)*Math.max(2,window.devicePixelRatio||1);
  return Math.min(ceiling,Math.max(.5,Math.ceil(display*2*8)/8));
 }
 function draw(r,now){
  if(!layers)return;const resolution=rasterResolution(r);if(r.resolution!==resolution){r.resolution=resolution;r.work.width=Math.round(W*resolution);r.work.height=Math.round(H*resolution);r.presentationDirty=true;}if(!r.visible){r.visible=true;r.started=now;r.last=now;}
  const reduced=reducedMotion.matches,dt=Math.min(.05,Math.max(.001,(now-r.last)/1000));r.last=now;const t=reduced?0:(now-r.started)/1000,speaking=r.img.dataset.speaking==='true',mood=speaking?r.mood:r.img.dataset.base||r.mood;
  const target=motion(mood,t,r.level,r.seed*.173);
  const sceneKey=r.gestureKey||r.img.dataset.dialogueKey||mood,idleAct=idleScene(sceneKey,t);
  if(!speaking&&!reduced)for(const k of ['tilt','nod','smile','gazeX','lid'])target[k]+=idleAct[k];
  target.open=clamp(r.level*(.86+.14*Math.sin(r.speechTime*16.8)));
  const key=r.gestureKey||r.img.dataset.dialogueKey||'';if(key!==r.lastGesture){r.lastGesture=key;r.gestureAt=now;r.gestureOffset=0;}
  // Keep one continuous gesture clock when the voice ends; never replay the entrance.
  if(speaking)r.gestureOffset=r.speechTime-(now-r.gestureAt)/1000;
  const gestureTime=(now-r.gestureAt)/1000+(r.gestureOffset||0);
  const p=pose(key,reduced?1:speaking?r.speechTime:gestureTime,r.level,r.img.dataset.pointSide||'right',r.img.dataset.pointDown==='true'),idle=pose('',0,0);
  if(!speaking&&!reduced){p.RFore+=idleAct.arm;p.RHand+=idleAct.arm*.65;p.LFore-=idleAct.arm*.4;p.torsoLean+=idleAct.lean;}
  for(const k of Object.keys(p))if(typeof p[k]==='number'){if(r.state[k]===undefined)r.state[k]=idle[k];target[k]=angleMix(r.state[k],p[k],1);}
  spring(r.state,r.velocity,target,dt,reduced);const s=r.state,c=r.c,entry=reduced?1:1-(1-clamp(t/.75))**4;
  c.setTransform(r.resolution,0,0,r.resolution,0,0);c.clearRect(0,0,W,H);c.save();c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';c.globalAlpha=entry;c.translate(s.sway*2,(1-entry)*28);
  const lean=s.torsoLean||0,ct=Math.cos(lean),st=Math.sin(lean),headAngle=s.tilt*.65,ch=Math.cos(headAngle),sh=Math.sin(headAngle);
  const bodyWarp=(x,y)=>{const weight=1-ease((y-300)/112),fall=ease((y-370)/550),bx=x-512,by=y-520;const bodyX=512+bx*ct-by*st+Math.sin(t*1.5-y*.005)*fall*3.2,bodyY=520+bx*st+by*ct+s.body*fall*1.6;const hx=x-510,hy=y-330,headX=510+hx*ch-hy*sh,headY=330+hx*sh+hy*ch+s.nod*1.6;return {x:mix(bodyX,headX,weight),y:mix(bodyY,headY,weight)};};
  mesh(c,layers.body,192,832,0,H,8,16,bodyWarp);
  c.save();c.translate(510,330+s.nod*1.6);c.rotate(headAngle);c.translate(-510,-330);face(c,s,t,reduced);c.restore();
  for(const side of ['L','R'])mesh(c,layers[side],side==='L'?176:584,side==='L'?440:848,422,820,4,12,armWarp(side,s,bodyWarp));
  c.restore();present(r);if(r.canvas.dataset.emotion!==mood)r.canvas.dataset.emotion=mood;if(r.canvas.dataset.gesture!==p.mode)r.canvas.dataset.gesture=p.mode;if(r.canvas.dataset.animation!=='native-fullbody-rig')r.canvas.dataset.animation='native-fullbody-rig';
 }
 function tick(now){
  frameId=0;if(document.hidden)return;let visible=false;
  const drawFrame=!window.GameGraphics||window.GameGraphics.frame(frameClock,now)!==null;
  for(const r of rigs.values()){
   if(!r.img.isConnected){visibility?.unobserve(r.canvas);sizeObserver?.unobserve(r.canvas);r.canvas.remove();rigs.delete(r.img);continue;}
   const b=visibility&&sizeObserver?null:r.canvas.getBoundingClientRect(),shown=visibility?r.intersecting:b.width&&b.height&&b.bottom>=0&&b.top<=innerHeight;
   if(!shown){r.visible=false;continue;}if(!sizeObserver&&b){r.cssWidth=b.width;r.cssHeight=b.height;}visible=true;if(drawFrame)draw(r,now);
  }
  if(visible)wake();
 }
 window.ErvaRig={scan,set,motion,spring,pose,modeFor,idleScene,rigs};
 function init(){scan();new MutationObserver(changes=>{for(const change of changes)for(const node of change.addedNodes){if(node.nodeType!==1)continue;if(node.matches('img.erva-actor'))mount(node);node.querySelectorAll('img.erva-actor').forEach(mount);}}).observe(document.body,{subtree:true,childList:true});document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(frameId);frameId=0;frameClock.last=null;frameClock.next=null;}else wake();});window.addEventListener('graphics-change',wake);wake();}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
