/* Cinematic camera, lighting and liquid/impact choreography. Rendered from wall-clock time. */
(() => {
 const P=StageRenderer.prototype,oldLaunch=P.launchMythicV2,oldPlayer=P.renderPlayer;
 const A=window.MythicIllustrated,T=Math.PI*2,C=x=>Math.max(0,Math.min(1,x)),E=x=>{x=C(x);return x*x*(3-2*x);};
 const env=p=>E(p/.12)*(1-E((p-.85)/.15));
 const clock=r=>r._mythicSampleTime??performance.now();
 const reduced=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
 function glow(c,x,y,r,color,alpha=1){if(r<=0||alpha<=0)return;c.save();c.globalAlpha*=C(alpha);const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'transparent');c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);c.restore();}
 function arc(c,x,y,r,color,alpha=1){c.save();c.globalAlpha*=C(alpha);c.beginPath();c.ellipse(x,y,r,r*.28,0,0,T);c.strokeStyle=color;c.lineWidth=2;c.stroke();c.restore();}
 function bolt(c,x,y,length,seed,p,alpha){c.save();c.globalAlpha*=C(alpha);c.strokeStyle='#ffad98';c.lineWidth=1.2;c.beginPath();for(let i=0;i<7;i++){const xx=x-i*length/6,yy=y+Math.sin(i*2.7+seed+p*18)*(i%2?7:3);if(!i)c.moveTo(xx,yy);else c.lineTo(xx,yy);}c.stroke();c.restore();}
 function target(r,f){const e=r.enemyState;return e?{x:e.x+(e.knockback||0),y:r.groundY-35}:{x:f.targetX,y:f.targetY};}
 function demonState(f,now=performance.now()){
  const t=Math.max(0,now-f.startTime),q=f.phases,x0=f.originX,near=f.nearX;let phase,k,x=x0;
  if(t<q.charge){phase='charge';k=C(t/q.charge);}
  else if(t<q.arrive){phase='dash';k=C((t-q.charge)/(q.arrive-q.charge));x=x0+(near-x0)*E(k);}
  else if(t<q.attackEnd){phase='claws';k=C((t-q.arrive)/3000);x=near+Math.sin(k*T*8)*2.2;}
  else if(t<q.returnEnd){phase='return';k=C((t-q.attackEnd)/(q.returnEnd-q.attackEnd));x=near+(x0-near)*E(k);}
  else{phase='tired';k=C((t-q.returnEnd)/(f.duration-q.returnEnd));}
  return {t,phase,k,x};
 }
 function bloodMotion(p){
  const wind=E(p/.34)*(1-E((p-.5)/.08)),swing=E((p-.435)/.065),recover=E((p-.70)/.30);
  // Sample the existing capy attack atlas: wind-up, one fast cut, a held follow-through, then settle.
  const frame=p<.435?16*E(p/.30):p<.50?16+34*swing:p<.70?50:50+21*recover;
  return {wind,swing,recover,frame};
 }
 function bloodGrip(r,c,p,opacity){
  const x=r.playerState.x,y=r.groundY,{wind,swing,recover}=bloodMotion(p),dir=Math.sign((r.enemyState?.x??x+100)-x)||1;
  const lean=dir*(.24*wind-.11*swing*(1-recover)),squash=1-.20*wind;
  // Use the native paw's coordinate system. No extra arm, paw, or skin patch is painted.
  c.save();c.globalAlpha*=opacity;c.translate(x+dir*wind*5,y);c.rotate(lean);c.scale(1+.055*wind,squash);
  c.translate(dir*(-7+Math.sin(swing*Math.PI)*12),-21);c.scale(dir,1);
  const back=.78+Math.PI,forward=-.35,angle=back+(forward-back)*swing+recover*1.13;
  A.sprite(c,'blood-blade',0,0,86,1,angle);c.restore();
 }

 P.renderPlayer=function(){
  const f=this.skillCombatEffects.find(f=>f.cinematicActor),c=this.ctx;
  if(!f)return oldPlayer.call(this);
  const now=clock(this),p=C((now-f.startTime)/f.duration),x=this.playerState.x,y=this.groundY;
  if(f.cinematicActor==='blood'){
   const {wind,swing,recover,frame}=bloodMotion(p),dir=Math.sign((this.enemyState?.x??x+100)-x)||1;
   const lean=dir*(.24*wind-.11*swing*(1-recover)),squash=1-.20*wind;
   c.save();c.translate(x+dir*wind*5,y);c.rotate(lean);c.scale(1+.055*wind,squash);c.translate(-x,-y);
   const previousPose=this._bloodPose;this._bloodPose={kind:'blood',frame};
   try{oldPlayer.call(this);}finally{this._bloodPose=previousPose;c.restore();}
   bloodGrip(this,c,p,env(p));return;

  }
  if(f.cinematicActor==='meteor'){
   const lift=E(p/.28)*(1-E((p-.58)/.25));c.save();c.translate(x,y);c.rotate(-.035*lift+Math.sin(p*T*2)*.008);c.translate(-x,-y);try{oldPlayer.call(this);glow(c,x-2,y-27,9,'#ffc065aa',lift*.75);}finally{c.restore();}return;
  }
  if(!A.ready('demon-ready')||!A.ready('demon-lunge'))return oldPlayer.call(this);
  const d=demonState(f,now),blend=d.phase==='charge'?E(d.k/.65):d.phase==='tired'?1-E(d.k/.2):1;
  c.save();c.globalAlpha*=1-blend;
  if(d.phase==='tired'){c.translate(x,y);c.rotate(-.07*(1-d.k));c.scale(1.02,1-.11*(1-d.k)+Math.sin(d.k*T*3)*.012);c.translate(-x,-y);}
  try{oldPlayer.call(this);}finally{c.restore();}
  if(blend>.001){c.save();c.globalAlpha*=blend;c.translate(d.x,y-((d.phase==='dash'||d.phase==='return')?Math.sin(d.k*Math.PI)*3:0));const attack=d.phase==='claws';const sway=attack?Math.sin(d.k*T*8)*.035:Math.sin(d.t*.004)*.015;c.rotate(sway);const roar=d.phase==='charge'?E((d.k-.2)/.6):0;const ready=d.phase==='charge';if(ready){A.sprite(c,'demon-ready',0,0,110,1-roar,0,true);A.sprite(c,'demon-roar',0,0,110,roar,0,true);}else A.sprite(c,'demon-lunge',0,0,110,1,0,true);
   // Ember crown and a glowing eye accent follow the transformed body's movement.
   glow(c,18,-43,11,'#ff702566',.45);c.restore();
  }
  if(d.phase==='tired'){c.save();c.globalAlpha*=1-E((d.k-.5)/.5);for(let i=0;i<3;i++){const a=(d.k*2+i*.31)%1;c.fillStyle='#b8e6ed';c.beginPath();c.ellipse(x+18+i*5,y-43+a*19,1.2,2.6,.3,0,T);c.fill();}c.strokeStyle='#e9e0c4';c.lineWidth=2;for(let i=0;i<2;i++){const a=(d.k*2+i*.5)%1;c.globalAlpha=(1-a)*.5;c.beginPath();c.arc(x+27+a*13,y-35-a*8,2+a*4,.4,3.8);c.stroke();}c.restore();}
 };
 // The normal equipped weapon must not overlap Blood Blade's held model.
 const oldWeapon=P.drawCommonWeaponOnPlayer;
 P.drawCommonWeaponOnPlayer=function(...args){if(this.skillCombatEffects.some(f=>f.cinematicActor==='blood'))return;return oldWeapon?.apply(this,args);};
 // A readable charge, a fast traveling blade, then a smooth recovery. No extra painted limbs.
 function darkCrescent(c,x,y,scale,alpha,dir=1){
  c.save();c.globalAlpha*=C(alpha);c.translate(x,y);c.scale(dir*scale,scale);c.lineJoin='miter';c.miterLimit=8;
  // Two needle tips converge on a narrow cutting edge; the inner contour stays close to the rim.
  const ink=c.createLinearGradient(10,0,41,0);ink.addColorStop(0,'#100810');ink.addColorStop(.72,'#190914');ink.addColorStop(1,'#b8153c');
  c.beginPath();c.moveTo(-26,-67);c.bezierCurveTo(56,-29,56,29,-26,67);c.bezierCurveTo(39,24,39,-24,-26,-67);c.closePath();c.fillStyle=ink;c.fill();
  c.beginPath();c.moveTo(-26,-67);c.bezierCurveTo(56,-29,56,29,-26,67);c.strokeStyle='#f23a60';c.lineWidth=1.2;c.stroke();
  c.beginPath();c.moveTo(-20,-62);c.bezierCurveTo(49,-25,49,25,-20,62);c.strokeStyle='#ffbac5';c.lineWidth=.65;c.stroke();
  c.restore();
 }
 function launchBlood(r,tx,ty,hit,done,speed,options){
  const startTime=performance.now(),duration=1900/Math.max(.25,speed),originX=r.playerState.x,token={},dir=Math.sign(tx-originX)||1;
  let struck=false,released=false,finished=false;
  const impact=()=>{if(struck)return;struck=true;f.impactPoint=target(r,f);hit?.();(window.Game?.Sound||window.Sound)?.playSfx('hit');};
  if(!options.passive){r._mythicCast=token;r.setPlayerAnim('idle',true);}
  const f={kind:'mythic-cinematic-blood',cinematic:'blood',cinematicActor:'blood',targetX:tx,targetY:ty,originX,startTime,duration,phases:{release:.5,impact:.66},
   update(p){if(p>=.5&&!released){released=true;(window.Game?.Sound||window.Sound)?.playSfx('slash');}if(p>=.66)impact();},
   render(c,time=clock(r)){
    const p=C((time-startTime)/duration),a=env(p),end=f.impactPoint||target(r,f),x0=originX+dir*22,y0=r.groundY-30,charge=E(p/.5),hold=1-E((p-.49)/.07);
    c.save();c.globalAlpha*=a;
    if(p<.56){
     // Fine crimson electricity crawls around the lowered body during the held stance.
     const pulse=reduced()?0:Math.sin(p*70)*.12;
     for(let strand=0;strand<5;strand++){
      const theta=strand*T/5+p*2.5,cx=originX+Math.cos(theta)*24,cy=r.groundY-27+Math.sin(theta)*19;
      c.save();c.globalAlpha*=charge*hold*(.45+pulse);c.strokeStyle=strand%2?'#b81e43':'#f45765';c.lineWidth=.75;c.beginPath();
      for(let j=0;j<6;j++){const xx=cx+Math.cos(theta+1.5)*j*3.3+Math.sin(j*4+strand+p*35)*2.8,yy=cy+Math.sin(theta+1.5)*j*2.8+(j%2?2:-2);if(!j)c.moveTo(xx,yy);else c.lineTo(xx,yy);}c.stroke();c.restore();
     }
     glow(c,x0,y0,20+charge*24,'#ac174944',charge*hold);arc(c,originX,r.groundY+1,17+charge*16,'#8d183c',charge*hold);
     for(let i=0;i<12;i++){const q=(p*2.4+i/12)%1,angle=i*2.399+p*3,rad=(1-E(q))*(36+i%5*8)+5;
      const xx=x0+Math.cos(angle)*rad,yy=y0+Math.sin(angle)*rad*.75;c.globalAlpha=a*hold*(.25+.7*Math.sin(q*Math.PI));c.fillStyle=i%3?'#970f36':'#e54160';c.beginPath();c.ellipse(xx,yy,1+q*1.6,.8+q,angle,0,T);c.fill();}
     // Keep the face clear: the charge is carried by body sparks and the held blade.
    }
    c.globalAlpha=a;
    if(p>=.5&&p<.75){
     const q=C((p-.5)/.16),travel=1-(1-q)**2,x=x0+(end.x-x0)*travel,y=y0+(end.y-y0)*travel-Math.sin(q*Math.PI)*4,fade=1-E((p-.66)/.09);
     for(let j=3;j>0;j--)darkCrescent(c,x-dir*j*5,y,.70+q*.25,.075*fade,dir);
     darkCrescent(c,x,y,.74+E(q)*.25,fade,dir);
     for(let i=0;i<18;i++){const t=C(travel-i*.018),xx=x0+(end.x-x0)*t,yy=y0+(end.y-y0)*t+Math.sin(i*2.4+p*15)*5;c.fillStyle=i%4?'#380b20':'#bd2248';c.globalAlpha=a*fade*(1-i/21);c.beginPath();c.ellipse(xx,yy,3.7-i*.13,1.4,-.15,0,T);c.fill();}
    }
    if(p>=.66){
     const q=C((p-.66)/.34),fade=1-E(q),burst=1-E(q/.17),spread=E(q/.40);
     c.globalAlpha=a*fade;glow(c,end.x,end.y,35+spread*32,'#ab1d4777',fade*.75);
     // One short contact flash, followed by a sharp graphic burst rather than a lingering white wash.
     if(!reduced()&&q<.17){c.save();c.translate(end.x,end.y);c.globalAlpha*=burst;c.fillStyle='#ffe5de';c.beginPath();for(let i=0;i<16;i++){const angle=i*T/16,rad=i%2?4:(i%4?25:39)*( .65+spread);const xx=Math.cos(angle)*rad,yy=Math.sin(angle)*rad;if(!i)c.moveTo(xx,yy);else c.lineTo(xx,yy);}c.closePath();c.fill();c.restore();}
     // Thin expanding pressure ring and directional dark-red shards carry the impact outward.
     c.save();c.globalAlpha*=1-E(q/.58);c.strokeStyle='#c82950';c.lineWidth=2.2*(1-q);c.beginPath();c.ellipse(end.x,end.y,10+spread*45,7+spread*29,-.3,0,T);c.stroke();c.restore();
     for(let j=0;j<3;j++){
      const t=C((q-j*.055)/.68),show=E(t/.1)*(1-E((t-.25)/.75));if(show<=0)continue;
      c.save();c.globalAlpha*=show;c.translate(end.x+(j-1)*6,end.y+(j-1)*3);c.rotate(-.62*dir+j*.18);const length=42+E(t/.3)*17;
      // A filled taper gives both ends true needle points, instead of broad stroke caps.
      const edge=7-j*1.4;
      c.beginPath();c.moveTo(-9,-length);c.bezierCurveTo(12+edge,-20,14+edge,20,-7,length);c.bezierCurveTo(10,19,9,-18,-9,-length);c.closePath();c.fillStyle='#170813';c.fill();
      c.beginPath();c.moveTo(-9,-length);c.bezierCurveTo(12+edge,-20,14+edge,20,-7,length);c.strokeStyle=j===1?'#ee5470':'#bd234a';c.lineWidth=1.05-j*.18;c.lineCap='butt';c.stroke();
      if(j===1){c.beginPath();c.moveTo(-6,-length+7);c.bezierCurveTo(17,-18,19,18,-4,length-8);c.strokeStyle='#ffb4c3';c.lineWidth=.5;c.stroke();}c.restore();
     }
     for(let i=0;i<12;i++){
      const angle=i*2.399,travel=E(q/.7),radius=13+travel*(29+i%4*9),xx=end.x+Math.cos(angle)*radius,yy=end.y+Math.sin(angle)*radius*.7+q*q*12;
      c.save();c.globalAlpha*=1-E((q-.25)/.65);c.translate(xx,yy);c.rotate(angle);c.fillStyle=i%3?'#260b1b':'#c52850';c.beginPath();c.moveTo(7*(1-q),0);c.lineTo(-5,-1.5);c.quadraticCurveTo(-2,0,-7,2);c.closePath();c.fill();c.restore();
     }
     for(let i=0;i<24;i++){const age=C((q-i*.006)/.9),vx=Math.cos(i*2.399)*68,vy=-24-Math.sin(i*1.23)**2*48,xx=end.x+vx*age,yy=end.y+vy*age+age*age*78;
      c.save();c.globalAlpha=a*(1-E((age-.5)/.5));c.fillStyle=i%4?'#290b1c':'#a71f40';c.translate(xx,Math.min(r.groundY+2,yy));c.rotate(Math.atan2(vy+age*156,vx));c.beginPath();c.ellipse(0,0,3-age*1.5,1.2,0,0,T);c.fill();c.restore();}
    }
    c.restore();
   },onComplete(){if(finished)return;finished=true;impact();if(r._mythicCast===token){r._mythicCast=null;r.playerState.offsetY=0;r.setPlayerAnim('idle',true);}done?.();}};
  r.skillCombatEffects.push(f);return f;
 }
 function launchDemon(r,tx,ty,hit,done,speed,options){
  const rate=Math.max(.25,speed),charge=650/rate,arrive=charge+300/rate,attackEnd=arrive+3000,returnEnd=attackEnd+350/rate,duration=returnEnd+900/rate,startTime=performance.now(),originX=r.playerState.x;
  const distance=Math.max(0,Math.abs(tx-originX)-39),nearX=originX+Math.sign(tx-originX||1)*distance,token={};let struck=false;
  const impact=()=>{if(struck)return;struck=true;hit?.();};
  r._mythicCast=token;r.setPlayerAnim('idle',true);
  const f={kind:'mythic-cinematic-demon',cinematic:'demon',cinematicActor:'demon',startTime,duration,originX,nearX,targetX:tx,targetY:ty,phases:{charge,arrive,attackEnd,returnEnd},
   update(){const d=demonState(f,clock(r));if(d.t>=arrive)impact();},render(c,time=clock(r)){
    const d=demonState(f,time),p=C(d.t/duration),end=target(r,f);c.save();c.globalAlpha*=env(p);
    if(d.phase==='charge'){glow(c,originX,r.groundY-40,75,'#d7353f66',E(d.k));arc(c,originX,r.groundY,27+d.k*22,'#e76a60',E(d.k));for(let i=0;i<9;i++){const angle=i*T/9-d.k*2;c.strokeStyle='#d86458';c.lineWidth=1;c.beginPath();c.moveTo(originX+Math.cos(angle)*32,r.groundY+Math.sin(angle)*9);c.lineTo(originX+Math.cos(angle)*43,r.groundY+Math.sin(angle)*13);c.stroke();}}
    if(d.phase==='dash'||d.phase==='return'){const direction=d.phase==='dash'?1:-1;for(let j=3;j>0;j--)A.sprite(c,'demon-lunge',d.x-direction*j*12,r.groundY,110,.13*(1-j*.18),0,true);for(let i=0;i<4;i++)bolt(c,d.x-4,r.groundY-18-i*7,40+i*7,i,d.k,.6);}
    if(d.phase==='claws'){
     const seconds=(d.t-arrive)/1000,cycle=seconds*5,index=Math.floor(cycle),q=cycle-index;


     for(let claw=0;claw<3;claw++){const flip=index%2?-1:1,angle=flip*-.8,cx=end.x+(claw-1)*6,cy=end.y+(claw-1)*6;c.save();c.globalAlpha*=Math.sin(C(q/.8)*Math.PI);c.translate(cx,cy);c.rotate(angle);c.strokeStyle=claw%2?'#ffe0b4':'#ff4a52';c.lineWidth=claw===1?3.5:2.4;c.beginPath();c.moveTo(-20+q*9,-23);c.quadraticCurveTo(7,-5,20-q*2,23);c.stroke();c.restore();}
     if(q<.4)glow(c,end.x,end.y,34,'#ff643a88',(1-q/.4)*.65);
     for(let i=0;i<3;i++)bolt(c,end.x+18,end.y-21+i*17,28,index+i,q,(1-q)*.35);
    }c.restore();
   },onComplete(){impact();if(r._mythicCast===token){r._mythicCast=null;r.playerState.offsetY=0;r.setPlayerAnim('idle',true);}done?.();}};r.skillCombatEffects.push(f);return f;
 }
 P.launchMythicV2=function(kind,x,y,hit,done,speed=1,options={}){
  if(kind==='blood')return launchBlood(this,x,y,hit,done,speed,options);
  if(kind==='demon')return launchDemon(this,x,y,hit,done,speed,options);
  const f=oldLaunch.call(this,kind,x,y,hit,done,speed,options);if(f){f.cinematic=kind;f.targetX=x;f.targetY=y;if(kind==='meteor')f.cinematicActor='meteor';}return f;
 };
 const dragon=P.launchDragonBreath;
 P.launchDragonBreath=function(...args){const before=this.skillCombatEffects.length,result=dragon.apply(this,args);for(const f of this.skillCombatEffects.slice(before)){f.cinematic='dragon';f.targetX=args[2];f.targetY=args[3];}return result;};
 function mood(r,now=clock(r)){
  let strongest=null;for(const f of r.skillCombatEffects){if(!f.cinematic)continue;const p=C((now-f.startTime)/f.duration),a=env(p);if(!strongest||a>strongest.a)strongest={f,p,a};}return strongest;
 }
 P.getMythicCamera=function(){const m=mood(this);if(!m||reduced())return {x:0,y:0};const {f,p,a}=m,t=clock(this)/1000;let strength=0;
  if(f.cinematic==='meteor')strength=3.6*Math.exp(-Math.max(0,p-.61)*15)*(p>=.61?1:0)+.3*E(p/.5);
  else if(f.cinematic==='blood')strength=1.8*Math.exp(-Math.max(0,p-.66)*22)*(p>=.66?1:0);
  else if(f.cinematic==='void')strength=.65*E(p/.4)+1.4*Math.exp(-Math.abs(p-.74)*35);
  else if(f.cinematic==='dragon')strength=1.3*Math.sin(p*Math.PI)**2;
  else if(f.cinematic==='demon'){const d=demonState(f,clock(this));strength=d.phase==='claws'?1.1*(.55+.45*Math.sin((d.t-f.phases.arrive)*.031)**2):d.phase==='dash'?1.5:0;}
  return {x:(Math.sin(t*61)+Math.sin(t*97)*.35)*strength*a,y:Math.sin(t*79+.9)*strength*a*.6};
 };
 P.renderMythicLighting=function(c){const m=mood(this);if(!m)return;const {f,p,a}=m;const palettes={blood:['#310b23',.26],meteor:['#4b0d15',.37],angel:['#ffda79',.16],demon:['#270d24',.34],void:['#170c33',.3],dragon:['#5a2014',.18]},[color,opacity]=palettes[f.cinematic]||['#000',0];c.save();c.globalAlpha=a*opacity;c.fillStyle=color;c.fillRect(0,0,this.width,this.height);if(f.cinematic==='meteor'||f.cinematic==='demon'){c.globalCompositeOperation='soft-light';c.globalAlpha=a*(f.cinematic==='meteor'?.3:.17);c.fillStyle=f.cinematic==='meteor'?'#f3603d':'#ce304d';c.fillRect(0,0,this.width,this.height);}c.restore();
  if(f.cinematic==='angel')glow(c,this.playerState.x,this.groundY-65,this.height*.75,'#ffeab570',a*.75);
  if(f.cinematic==='meteor')glow(c,f.targetX,f.targetY,145,'#ff652e66',a*E((p-.35)/.3));
 };
 P.renderMythicGround=function(c){for(const f of this.skillCombatEffects){if(f.cinematic!=='meteor')continue;const p=C((clock(this)-f.startTime)/f.duration);
   if(p>.18&&p<.61){c.save();for(let stone=0;stone<3;stone++){const travel=C((p-.12-stone*.047)/(.49-stone*.015));if(travel<=0||travel>=1)continue;const mx=f.targetX+(stone-1)*26+(1-travel)*(130+stone*8),my=f.targetY+(stone%2)*8-(1-travel)*(this.groundY+90);for(let drop=0;drop<6;drop++){const age=(p*5+drop/6)%1;c.globalAlpha=.8*(1-age);c.fillStyle=drop%2?'#ffd275':'#ff762c';c.beginPath();c.ellipse(mx+9+age*15+Math.sin(drop*2.4)*7,my-4-age*21,1.5,2.5+age*2,-.5,0,T);c.fill();}}c.restore();}
   if(p<.59)continue;const q=C((p-.59)/.41),x=f.targetX,y=this.groundY,growth=E(q/.38),opacity=1-E((q-.64)/.36);c.save();c.globalAlpha*=opacity;
   glow(c,x,y,65,'#ff6a2677',.6);for(let i=0;i<9;i++){const angle=i*2.39996,length=(32+i%3*15)*growth;c.beginPath();for(let j=0;j<5;j++){const d=length*j/4,xx=x+Math.cos(angle)*d+Math.sin(j*3+i)*3,yy=y+Math.sin(angle)*d*.32;if(j===0)c.moveTo(xx,yy);else c.lineTo(xx,yy);}c.strokeStyle='#542b2b';c.lineWidth=4;c.stroke();c.strokeStyle='#ff8e3b';c.lineWidth=1.6;c.stroke();}
   for(let i=0;i<6;i++){c.fillStyle=i%2?'#f58b31':'#ed5a23';c.beginPath();c.ellipse(x+(i-2.5)*5,y+Math.sin(i)*3,(6+q*5)*growth,2+q*2,0,0,T);c.fill();}
   // Molten ejecta follows capped ballistic trajectories, with no per-frame allocation.
   for(let i=0;i<28;i++){const age=C((q-(i%4)*.012)/.9),vx=Math.cos(i*2.4)*(35+i%5*12),vy=-35-(i%7)*12,xx=x+vx*age,yy=y+vy*age+age*age*115;c.save();c.globalAlpha*=1-E((age-.6)/.4);c.translate(xx,Math.min(y+7,yy));c.rotate(Math.atan2(vy+230*age,vx));c.fillStyle=i%3?'#ffb64c':'#fff0a1';c.beginPath();c.ellipse(0,0,2.1+Math.sin(i)*.4,1.3,0,0,T);c.fill();c.restore();}c.restore();
  }};
 window.MythicCinematics={demonState,mood};
})();
