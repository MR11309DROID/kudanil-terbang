/* Mythic choreography, reference palette and silhouettes; continuous elapsed-time geometry. */
(() => {
 const P=StageRenderer.prototype,TAU=Math.PI*2;
 const clamp=x=>Math.max(0,Math.min(1,x)),ease=x=>{x=clamp(x);return x*x*(3-2*x);};
 const envelope=p=>ease(p/.16)*(1-ease((p-.78)/.22));
 function ellipse(c,x,y,rx,ry,color,width=2,rot=0){if(rx<=0||ry<=0)return;c.beginPath();c.ellipse(x,y,rx,ry,rot,0,TAU);c.strokeStyle=color;c.lineWidth=width;c.stroke();}
 function glow(c,x,y,r,color){if(r<=0)return;const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'transparent');c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);}
 function star(c,x,y,r,color){c.fillStyle=color;c.beginPath();c.moveTo(x,y-r);c.quadraticCurveTo(x+1,y-1,x+r,y);c.quadraticCurveTo(x+1,y+1,x,y+r);c.quadraticCurveTo(x-1,y+1,x-r,y);c.quadraticCurveTo(x-1,y-1,x,y-r);c.fill();}
 function crescent(c,x,y,r,angle,color,weight=1){c.save();c.translate(x,y);c.rotate(angle);c.fillStyle=color;c.beginPath();c.moveTo(-r*.72,-r*.75);c.bezierCurveTo(r*.98,-r*.76,r*1.2,r*.25,-r*.48,r*.9);c.bezierCurveTo(r*.4,r*.12,r*.28,-r*.35,-r*.72,-r*.75);c.fill();c.strokeStyle='#fff3df';c.lineWidth=weight;c.beginPath();c.moveTo(-r*.62,-r*.7);c.bezierCurveTo(r*.83,-r*.65,r*.99,r*.23,-r*.42,r*.83);c.stroke();c.restore();}
 function feathers(c,x,y,p,alpha){c.save();c.translate(x,y);c.globalAlpha*=alpha;const spread=ease(p/.32);for(const side of [-1,1]){c.save();c.scale(side,1);c.rotate(-.12-Math.sin(p*TAU)*.07);for(let i=6;i>=0;i--){const reach=(34+i*6)*spread;c.fillStyle=i%2?'#fff5ca':'#ffd76b';c.strokeStyle='#df9a38';c.lineWidth=.8;c.beginPath();c.moveTo(0,7);c.bezierCurveTo(reach*.25,-15,reach*.7,-12-i*4,reach,-18-i*5);c.quadraticCurveTo(reach-5,-5-i*4,12+i*2,12-i*2);c.quadraticCurveTo(3,20,0,7);c.fill();c.stroke();}c.restore();}ellipse(c,0,-53,19,5,'#fff0ad',3);c.restore();}
 function horns(c,x,y,p){c.save();c.translate(x,y);c.scale(ease(p/.25),ease(p/.25));for(const side of [-1,1]){c.save();c.scale(side,1);c.fillStyle='#692038';c.strokeStyle='#ff7054';c.lineWidth=1.8;c.beginPath();c.moveTo(7,0);c.bezierCurveTo(24,-7,22,-22,13,-30);c.quadraticCurveTo(17,-13,3,-8);c.closePath();c.fill();c.stroke();c.restore();}c.restore();}
 function batWings(c,x,y,p){c.save();c.translate(x,y);for(const side of [-1,1]){c.save();c.scale(side,1);c.rotate(Math.sin(p*TAU*1.5)*.08);c.fillStyle='#401b2b';c.strokeStyle='#ec5755';c.lineWidth=1.8;c.beginPath();c.moveTo(0,8);c.quadraticCurveTo(28,-32,56,-25);c.lineTo(43,-6);c.quadraticCurveTo(33,-15,31,4);c.quadraticCurveTo(20,-4,19,17);c.lineTo(0,23);c.closePath();c.fill();c.stroke();c.beginPath();c.moveTo(0,8);c.lineTo(43,-18);c.moveTo(0,8);c.lineTo(31,4);c.stroke();c.restore();}c.restore();}
 const originalPlayer=P.renderPlayer;
 P.renderPlayer=function(){
  const form=this.skillCombatEffects.find(f=>f.kind==='mythic-v2-demon');
  if(!form)return originalPlayer.call(this);
  const p=clamp((performance.now()-form.startTime)/form.duration),strength=ease((p-.12)/.18)*(1-ease((p-.72)/.22));
  this.ctx.save();this.ctx.filter='brightness('+(1-strength*.53)+') sepia('+strength*.6+') saturate('+(1+strength*.6)+')';
  try{return originalPlayer.call(this);}finally{this.ctx.restore();}
 };
 const config={blood:{duration:1250,hit:.51,color:'#ed3c64'},void:{duration:1950,hit:.73,color:'#af71ff'},angel:{duration:1650,hit:.55,color:'#ffe69a'},meteor:{duration:1750,hit:.6,color:'#ff9648'},demon:{duration:1550,hit:.53,color:'#f24f59'}};
 P.launchMythicV2=function(kind,targetX,targetY,onHit,onComplete,speed=1,options={}){
  const spec=config[kind];if(!spec)return;const r=this,startTime=performance.now(),duration=spec.duration/Math.max(.25,speed),px=r.playerState.x,py=r.groundY-32,tx=Number.isFinite(targetX)?targetX:px,ty=Number.isFinite(targetY)?targetY:py;
  let hit=false;const token={};const pose=!options.passive;
  if(pose){r._mythicCast=token;r.setPlayerAnim('idle',true);}
  const impact=()=>{if(hit)return;hit=true;if(onHit)onHit();if(kind==='meteor'||kind==='blood')window.Sound?.playSfx(kind==='meteor'?'magicBurst':'slash');};
  const fx={kind:'mythic-v2-'+kind,behindPlayer:kind==='angel'||kind==='demon',startTime,duration,update(progress){if(progress>=spec.hit)impact();if(pose&&r._mythicCast===token){r.playerState.offsetY=kind==='angel'?-ease(progress/.35)*(1-ease((progress-.65)/.3))*9:-Math.sin(clamp(progress/.5)*Math.PI)*2;}},render(c,atTime=performance.now()){
   const p=clamp((atTime-startTime)/duration),a=envelope(p);c.save();c.globalAlpha=a;c.lineCap='round';c.lineJoin='round';
   if(kind==='void'){
    const travel=ease((p-.15)/.22),x=px+24+(tx-px-24)*travel,y=py+(ty-py)*travel-12*Math.sin(travel*Math.PI),collapse=1-ease((p-.65)/.14),rad=(9+35*ease((p-.2)/.25))*ease(p/.13)*collapse;
    glow(c,x,y,rad*2.4,'#a660f377');
    c.save();c.translate(x,y);c.rotate(-.3);for(let i=0;i<5;i++){const rotation=p*9+i*.65;c.save();c.scale(1,.48);c.rotate(rotation);c.beginPath();c.arc(0,0,rad*(1.1+i*.12),0,Math.PI*1.45);c.strokeStyle=['#eac9ff','#bd72fa','#8146cf','#f8eaff','#b586ee'][i];c.lineWidth=4-i*.55;c.stroke();c.restore();}
    for(let i=0;i<26;i++){const phase=(p*2+i/26)%1,ang=i*2.399+p*7,d=rad*(2.6-1.8*phase);c.save();c.translate(Math.cos(ang)*d,Math.sin(ang)*d*.68);c.rotate(ang+phase*3);c.globalAlpha=a*Math.sin(phase*Math.PI);c.fillStyle=i%3?'#79678f':'#e1b1ff';c.beginPath();c.moveTo(-3,-2);c.lineTo(2,-4);c.lineTo(4,2);c.lineTo(-1,4);c.closePath();c.fill();c.restore();}
    if(rad>.1){c.beginPath();c.ellipse(0,0,rad*.79,rad*.72,0,0,TAU);c.fillStyle='#0c071b';c.fill();ellipse(c,0,0,rad*.8,rad*.73,'#f1d5ff',2);}c.restore();
    if(p>.7){const q=clamp((p-.7)/.3);glow(c,tx,ty,38*(1-q),'#ead3ffcc');ellipse(c,tx,ty,12+q*85,8+q*48,'#d6aaff',2.5*(1-q)+.2);for(let i=0;i<10;i++){const ang=i*TAU/10;star(c,tx+Math.cos(ang)*q*72,ty+Math.sin(ang)*q*48,3*(1-q),'#e8ceff');}}
   }else if(kind==='blood'){
    const charge=1-ease((p-.32)/.15);glow(c,px,py,43,'#a5234b55');for(let i=0;i<12;i++){const ang=i*2.4-p*9,d=35*(1-(p*2+i/12)%1);star(c,px+Math.cos(ang)*d,py+Math.sin(ang)*d,2*charge,'#fa6384');}
    const q=ease((p-.24)/.3),x=px+20+(tx-px-20)*q,y=py+(ty-py)*q;
    if(p>.2&&p<.77){for(let i=3;i>=0;i--){c.save();c.globalAlpha=a*(1-i*.22);crescent(c,x-i*11,y,32+i*2,-.35+p*.6,i?'#a71c45':'#ff456b',1.4);c.restore();}}
    if(p>.5){const b=clamp((p-.5)/.4);for(let i=0;i<2;i++){c.save();c.globalAlpha=a*(1-b);crescent(c,tx,ty,35+b*22,i?2.3:-.8,'#ff6d79',2);c.restore();}for(let i=0;i<14;i++){const ang=i*2.4,d=10+b*48;star(c,tx+Math.cos(ang)*d,ty+Math.sin(ang)*d*.7,2*(1-b),'#ffc6b6');}for(let i=0;i<8;i++){const t=clamp((p-.56)/.44+i*.035),x=tx+(px-tx)*t,y=ty+(py-ty)*t-Math.sin(t*Math.PI)*28;glow(c,x,y,3,'#fa6784bb');}}
   }else if(kind==='angel'){
    glow(c,px,py,82,'#ffdf7466');feathers(c,px,py-6,p,a);const beam=ease((p-.3)/.15)*(1-ease((p-.66)/.17));if(beam>.01){const g=c.createLinearGradient(px-24,0,px+24,0);g.addColorStop(0,'#fff4bd00');g.addColorStop(.5,'#fff4bd99');g.addColorStop(1,'#fff4bd00');c.globalAlpha=a*beam;c.fillStyle=g;c.fillRect(px-24,0,48,r.groundY);c.globalAlpha=a;}ellipse(c,px,r.groundY,45+Math.sin(p*Math.PI)*7,12,'#ffe6a4',2);for(let i=0;i<18;i++){const t=(p+i/18)%1,ang=i*2.4,x=px+Math.cos(ang)*(27+t*24),y=r.groundY-t*110;c.save();c.translate(x,y);c.rotate(ang+p*3);c.globalAlpha=a*Math.sin(t*Math.PI);c.fillStyle=i%2?'#ffe5a3':'#fff8db';c.beginPath();c.ellipse(0,0,2,6,0,0,TAU);c.fill();c.restore();}
   }else if(kind==='meteor'){
    glow(c,px,py,38,'#ff9a3444');ellipse(c,px,py-48,25,7,'#ffb35e',2,-.2);
    for(let i=0;i<4;i++){const t=clamp((p-.13-i*.045)/(.46-i*.015)),ex=tx+(i-1.5)*19,ey=ty+10+(i%2)*4,x=ex+(1-t)*(105+i*12),y=ey-(1-t)*(r.groundY+70);if(t<=0||t>=1)continue;c.save();c.translate(x,y);c.rotate(-.58);const radius=i===1?17:7;const g=c.createLinearGradient(0,0,0,-80);g.addColorStop(0,'#ffd478');g.addColorStop(.25,'#ff6a25aa');g.addColorStop(1,'#ea3d2200');c.fillStyle=g;c.beginPath();c.moveTo(-radius,0);c.quadraticCurveTo(-10,-40,5,-85);c.quadraticCurveTo(6,-35,radius,0);c.closePath();c.fill();glow(c,0,0,radius*2.3,'#ff812499');c.fillStyle='#713325';c.strokeStyle='#ffdb8f';c.lineWidth=2;c.beginPath();for(let j=0;j<7;j++){const ang=j*TAU/7,rr=radius*(j%2?.85:1.1);c.lineTo(Math.cos(ang)*rr,Math.sin(ang)*rr);}c.closePath();c.fill();c.stroke();c.restore();}
    if(p>.57){const q=clamp((p-.57)/.43);glow(c,tx,ty,70*(1-q),'#ffcb63aa');ellipse(c,tx,ty+10,12+q*91,5+q*28,'#ffcf77',3*(1-q)+.3);for(let i=0;i<20;i++){const ang=i*2.4,x=tx+Math.cos(ang)*q*80,y=ty-Math.sin(i*1.3)**2*Math.sin(q*Math.PI)*65+q*24;c.fillStyle=i%2?'#a35038':'#ffbd63';c.save();c.translate(x,y);c.rotate(q*8+i);c.globalAlpha=a*(1-q);c.fillRect(-2,-2,4+i%3,4);c.restore();}for(let i=0;i<6;i++){c.globalAlpha=a*.22*(1-q);c.fillStyle='#6b4141';c.beginPath();c.arc(tx+(i-2.5)*15*q,ty-10-q*(18+i*6),8+q*17,0,TAU);c.fill();}}
   }else if(kind==='demon'){
    glow(c,px,py,70,'#c62b4355');batWings(c,px-3,py-5,p);horns(c,px+4,py-25,p);for(let i=0;i<15;i++){const q=(p*1.6+i/15)%1,x=px+Math.sin(i*2.4+q*3)*(24+q*12),y=r.groundY-q*94;star(c,x,y,2.5*Math.sin(q*Math.PI),'#ef605f');}ellipse(c,px,r.groundY,38+ease(p/.3)*13,12,'#c93250',2);if(p>.35&&p<.85){const q=ease((p-.35)/.45);crescent(c,px+(tx-px)*q,py+(ty-py)*q,37,-.5+q*.8,'#dc3153',1.5);}c.save();c.globalAlpha=a*.6;c.strokeStyle='#ff9375';c.lineWidth=2;c.beginPath();c.moveTo(px-25,r.groundY+2);c.lineTo(px-8,r.groundY+4);c.lineTo(px+2,r.groundY-1);c.lineTo(px+21,r.groundY+6);c.stroke();c.restore();
   }
   c.restore();
  },onComplete(){impact();if(pose&&r._mythicCast===token){r._mythicCast=null;r.playerState.offsetY=0;r.setPlayerAnim('idle',true);}if(onComplete)onComplete();}};
  this.skillCombatEffects.push(fx);return fx;
 };
 P.launchBlackHole=function(x,y,hit,done,speed){return this.launchMythicV2('void',x,y-20,hit,done,speed);};
 P.launchMeteorStrike=function(x,y,hit,done,speed){return this.launchMythicV2('meteor',x,y-12,hit,done,speed);};
 P.launchBloodBlade=function(hit,done,speed){return this.launchMythicV2('blood',this.enemyState?.x??this.playerState.x+100,this.groundY-38,hit,done,speed);};
 P.launchAngelBlessing=function(done,speed=1,passive=false){return this.launchMythicV2('angel',this.playerState.x,this.groundY-32,null,done,speed,{passive});};
 P.launchDemonForm=function(done,speed=1,passive=false){return this.launchMythicV2('demon',this.enemyState?.x??this.playerState.x+100,this.groundY-38,null,done,speed,{passive});};
})();
