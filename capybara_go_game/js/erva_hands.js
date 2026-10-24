// Contextual two-bone arm animation. Atlas pieces retain Erva's illustrated costume.
(() => {
 const images={},dir='assets/ui/camp/erva-arm-rig-v1/';
 for(const name of ['upper','forearm','wave','point','present','rest']){images[name]=new Image();images[name].src=dir+name+'.png?v=hands73c';}
 const groups={
  wave:['welcome','guide_welcome','guide_shop','event_travel'],
  point:['guide_start','guide_gear','guide_camp','guide_risk','guide_gift','event_choices','event_gold','event_risk','event_fight','sidebar_newbie','sidebar_daily','sidebar_wheel','sidebar_achieve','sidebar_pass','sidebar_stats','sidebar_pets','sidebar_shortcuts','sidebar_clean','tip'],
  present:['gift','event_intro','event_rest','event_chosen'],
  celebrate:['rank'],heart:['shy','sad','nervous'],laugh:['laugh'],warn:['angry']
 };
 const gestureFor=key=>Object.keys(groups).find(mode=>groups[mode].includes(key))||'idle';
 const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
 const angleMix=(a,b,t)=>a+Math.atan2(Math.sin(b-a),Math.cos(b-a))*t;
 function pose(key,t,level,side='right',down=false){
  const requested=gestureFor(key),mode=requested==='wave'&&t>3.6?'present':requested;
  const idle={armLUpper:1.95,armLFore:-.38,armLWrist:-.38,armRUpper:Math.PI-1.95,armRFore:Math.PI+.38,armRWrist:Math.PI+.38,torsoLean:0};
  const p={...idle,leftHand:'rest',rightHand:'rest',mode};
  const right=(u,f,w,hand)=>{p.armRUpper=u;p.armRFore=f;p.armRWrist=w;p.rightHand=hand;};
  const mirrorRight=()=>{p.armLUpper=Math.PI-p.armRUpper;p.armLFore=Math.PI-p.armRFore;p.armLWrist=Math.PI-p.armRWrist;p.leftHand=p.rightHand;};
  const emphasis=Math.max(0,Math.min(1,level))*.045;
  if(requested==='wave'){
   const waveWindow=smooth((t-.65)/.35)*(1-smooth((t-2.4)/.4));
   right(-.72,-1.5+Math.sin(t*4.7)*.035*waveWindow,-1.55+Math.sin((t-.65)*6.4)*.18*waveWindow,'wave');
   // Settle the greeting into a held explaining pose, without snapping the arm or wrist.
   const settle=smooth((t-2.8)/.8);
   p.armRUpper=angleMix(p.armRUpper,.50,settle);p.armRFore=angleMix(p.armRFore,-.48,settle);p.armRWrist=angleMix(p.armRWrist,-.6,settle);
   if(settle>.6)p.rightHand='present';p.torsoLean=-.012*(1-settle);
  }
  if(mode==='point'){
   right(down?.23:-.17,down?.04:-.42,down?.15:-.40,'point');p.armRFore-=emphasis;p.armRWrist-=emphasis*.5;p.torsoLean=-.018;
   if(side==='left'){mirrorRight();right(idle.armRUpper,idle.armRFore,idle.armRWrist,'rest');p.torsoLean=.018;}
  }
  if(mode==='present'&&requested!=='wave'){
   right(.50,-.48-emphasis,-.60,'present');mirrorRight();p.armLFore+=.04;p.armLWrist+=.10;
  }
  if(mode==='celebrate'){right(-.8,-1.3,-1.25+Math.sin(t*3)*emphasis,'wave');mirrorRight();}
  if(mode==='heart'){right(1.95,-2.3,-2.5,'present');p.torsoLean=.012;}
  if(mode==='laugh'){right(-1.1,-2.7,-2.3,'present');p.torsoLean=.008;}
  if(mode==='warn'){right(-.75,-1.8,-1.75-emphasis,'point');p.torsoLean=-.014;}
  // Preparation, reach, then hold. Gestures share the recording's audio clock.
  const reach=smooth((t-.10)/.65);
  for(const k of Object.keys(idle))p[k]=angleMix(idle[k],p[k],reach);
  if(reach<.55){p.leftHand='rest';p.rightHand='rest';}
  return p;
 }
 function part(c,name,root,tip,mirror=false){
  const im=images[name],m=window.ErvaArmMeta?.[name];if(!im?.complete||!im.naturalWidth||!m)return;
  const sx=m.tip.x-m.root.x,sy=m.tip.y-m.root.y,dx=tip.x-root.x,dy=tip.y-root.y;
  const scale=Math.hypot(dx,dy)/Math.hypot(sx,sy);
  c.save();c.translate(root.x,root.y);c.rotate(Math.atan2(dy,dx));c.scale(scale,(mirror?-1:1)*scale*(name==='upper'?2.15:name==='forearm'?1.85:1.15));c.rotate(-Math.atan2(sy,sx));c.drawImage(im,-m.root.x,-m.root.y);c.restore();
 }
 const end=(p,angle,length)=>({x:p.x+Math.cos(angle)*length,y:p.y+Math.sin(angle)*length});
 function draw(c,state,hands,attach){
  c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';
  if(!window.ErvaArmMeta||!Object.values(images).every(im=>im.complete&&im.naturalWidth))return;
  for(const side of ['L','R']){
   const left=side==='L',origin={x:left?113:207,y:268},shoulder=attach?attach(origin.x,origin.y):origin;
   const lean=state.torsoLean||0;
   const elbow=end(shoulder,state['arm'+side+'Upper']+lean,31),wrist=end(elbow,state['arm'+side+'Fore']+lean,29);
   const hand=left?hands.leftHand:hands.rightHand,tip=end(wrist,state['arm'+side+'Wrist']+lean,32);
   part(c,'upper',shoulder,elbow,left);
   // The cuff overlaps the wrist so animated joins never reveal a gap.
   part(c,hand,wrist,tip,!left);part(c,'forearm',elbow,wrist,left);
  }
 }
 window.ErvaHands={gestureFor,pose,draw,groups,ready:()=>Object.values(images).every(im=>im.complete&&im.naturalWidth)};
})();
