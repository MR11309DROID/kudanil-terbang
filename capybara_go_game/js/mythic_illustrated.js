/* Illustrated Mythics: four authored models; Black Hole delegates to the approved renderer. */
(() => {
 const P=StageRenderer.prototype,previousLaunch=P.launchMythicV2,previousPlayer=P.renderPlayer,TAU=Math.PI*2;
 const clamp=x=>Math.max(0,Math.min(1,x)),smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
 const fade=p=>smooth(p/.13)*(1-smooth((p-.84)/.16));
 const images={};for(const name of ['demon-ready','demon-roar','demon-lunge','angel-open','angel-rise','angel-land','blood-blade','blood-crescent','blood-impact','meteor','meteor-impact','smoke']){const image=new Image();image.src='assets/skills/illustrated-v3/'+name+'.png';images[name]=image;}
 function ready(name){return images[name]?.complete&&images[name].naturalWidth>0;}
 // Images are cropped only from the generated atlas. Metadata preserves each foot anchor.
 function sprite(c,name,x,y,h,alpha=1,angle=0,grounded=false){const img=images[name],m=window.MythicSpriteMeta?.[name];if(!ready(name)||!m)return false;const nominal=name.startsWith('demon-')?302:name.startsWith('angel-')?327:m.height,scale=h/nominal;c.save();c.globalAlpha*=clamp(alpha);c.translate(x,y);c.rotate(angle);c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';let ax=grounded?m.footX:m.width/2,ay=grounded?m.footY:m.height/2;if(name==='meteor'){ax=m.width*.25;ay=m.height*.72;}if(name==='blood-blade'){ax=m.width*.16;ay=m.height*.83;}if(name==='meteor-impact'){ax=m.width*.5;ay=m.height*.88;}// Exclude neighboring atlas-cell fragments while preserving the actual feather tips.
 if(name==='angel-open'||name==='angel-rise'){
  const edge=name==='angel-open'?290:370,cutY=name==='angel-open'?125:200;
  const points=name==='angel-open'?[[0,0],[edge,0],[edge,cutY],[m.width,cutY],[m.width,m.height],[0,m.height]]:[[0,0],[m.width,0],[m.width,cutY],[edge,cutY],[edge,m.height],[0,m.height]];
  c.beginPath();points.forEach(([u,v],i)=>{const x=(u-ax)*scale,y=(v-ay)*scale;if(i)c.lineTo(x,y);else c.moveTo(x,y);});c.closePath();c.clip();
 }
 c.drawImage(img,-ax*scale,-ay*scale,m.width*scale,m.height*scale);c.restore();return true;}
 function halo(c,x,y,r,color,alpha){if(r<=0||alpha<=0)return;c.save();c.globalAlpha*=clamp(alpha);const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'transparent');c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);c.restore();}
 function ring(c,x,y,rx,ry,color,width=2){if(rx<=0||ry<=0)return;c.beginPath();c.ellipse(x,y,rx,ry,0,0,TAU);c.strokeStyle=color;c.lineWidth=width;c.stroke();}
 function sparks(c,x,y,p,count,color,distance=55){c.fillStyle=color;for(let i=0;i<count;i++){const angle=i*2.39996,age=clamp(p),r=distance*age,yy=Math.sin(angle)*r*.6-age*18;c.save();c.globalAlpha*=1-age;c.translate(x+Math.cos(angle)*r,y+yy);c.rotate(angle+age*2);c.fillRect(-1,-3,2,5);c.restore();}}
 function pose(c,kind,p,x,y){
  const names=kind==='demon'?['demon-ready','demon-roar','demon-lunge']:['angel-open','angel-rise','angel-land'];
  const t=p<.52?smooth((p-.22)/.22):smooth((p-.65)/.2),a=p<.52?0:1,b=a+1;
  const drift=kind==='demon'?Math.sin(smooth((p-.42)/.35)*Math.PI)*12:0;
  const lift=kind==='angel'?Math.sin(clamp((p-.13)/.78)*Math.PI)*13:0;
  const breath=Math.sin(p*TAU*1.5)*.7;
  const height=kind==='demon'?102:112;
  sprite(c,names[a],x+drift,y-lift+breath,height,1-t,kind==='demon'?-Math.sin(p*Math.PI)*.025:0,true);
  sprite(c,names[b],x+drift,y-lift+breath,height,t,kind==='demon'?-Math.sin(p*Math.PI)*.025:0,true);
 }
 P.renderPlayer=function(){
  const form=this.skillCombatEffects.find(f=>f.illustratedActor&&(f.illustratedActor==='demon'?['demon-ready','demon-roar','demon-lunge']:['angel-open','angel-rise','angel-land']).every(name=>ready(name)&&window.MythicSpriteMeta?.[name]));
  if(!form)return previousPlayer.call(this);
  const p=clamp(((this._mythicSampleTime??performance.now())-form.startTime)/form.duration),blend=smooth((p-.05)/.14)*(1-smooth((p-.82)/.16));
  if(blend<.001)return previousPlayer.call(this);
  const c=this.ctx;c.save();c.globalAlpha*=1-blend;try{previousPlayer.call(this);}finally{c.restore();}
  c.save();c.globalAlpha*=blend;try{pose(c,form.illustratedActor,p,this.playerState.x,this.groundY);}finally{c.restore();}
 };
 const specs={blood:{duration:1450,hit:.56},angel:{duration:1950,hit:.5},meteor:{duration:2700,hit:.61},demon:{duration:1900,hit:.53}};
 P.launchMythicV2=function(kind,targetX,targetY,onHit,onComplete,speed=1,options={}){
  if(!specs[kind])return previousLaunch.call(this,kind,targetX,targetY,onHit,onComplete,speed,options);
  const r=this,spec=specs[kind],startTime=performance.now(),duration=spec.duration/Math.max(.25,speed),token={},px=this.playerState.x,gy=this.groundY,py=gy-35,tx=targetX??px+125,ty=targetY??py,poseOwner=!options.passive;
  let hit=false;if(poseOwner){this._mythicCast=token;this.setPlayerAnim('idle',true);}
  function impact(){if(hit)return;hit=true;onHit?.();if(kind==='blood'||kind==='meteor')window.Sound?.playSfx(kind==='blood'?'slash':'magicBurst');}
  const fx={kind:'mythic-v3-'+kind,illustratedActor:['demon','angel'].includes(kind)?kind:null,behindPlayer:['demon','angel'].includes(kind),startTime,duration,
   update(p){if(p>=spec.hit)impact();},
   render(c,atTime=performance.now()){
    const p=clamp((atTime-startTime)/duration),a=fade(p);c.save();c.globalAlpha*=a;c.lineCap='round';
    if(kind==='blood'){
     const charge=1-smooth((p-.29)/.16);halo(c,px+5,py,43,'#ad244766',charge*.7);
     if(p<.46){const swing=smooth((p-.14)/.28);sprite(c,'blood-blade',px+22,py-7,64,1-smooth((p-.37)/.09),-.8+swing*1.25);}
     if(p>.25&&p<.8){const q=smooth((p-.25)/.31),x=px+22+(tx-px-22)*q,y=py+(ty-py)*q;for(let i=2;i>=1;i--)sprite(c,'blood-crescent',x-i*10,y,92-i*6,(.16-i*.035)*(1-smooth((p-.63)/.17)),-.06);sprite(c,'blood-crescent',x,y,91,1-smooth((p-.64)/.16),-.06);}
     if(p>.53){const q=clamp((p-.53)/.35);sprite(c,'blood-impact',tx,ty,35+smooth(q/.45)*50,(1-smooth((q-.35)/.65))*.9);sparks(c,tx,ty,q,12,'#ffb6a3',58);}
     if(p>.64){const q=clamp((p-.64)/.36);for(let i=0;i<6;i++){const t=clamp(q+i*.045),x=tx+(px-tx)*t,y=ty+(py-ty)*t-Math.sin(t*Math.PI)*26;halo(c,x,y,3,'#ff6187cc',Math.sin(t*Math.PI));}}
    }else if(kind==='angel'){
     halo(c,px,gy-40,76,'#ffe6a966',.75);const q=smooth((p-.08)/.3);ring(c,px,gy+1,27+q*26,8+q*6,'#ffe8ad',1.7);
     const beam=smooth((p-.24)/.2)*(1-smooth((p-.6)/.2));if(beam>.001){c.save();c.globalAlpha*=beam*.55;const g=c.createLinearGradient(px-29,0,px+29,0);g.addColorStop(0,'#ffebb400');g.addColorStop(.5,'#fff7d7bb');g.addColorStop(1,'#ffebb400');c.fillStyle=g;c.fillRect(px-29,0,58,gy);c.restore();}
     for(let i=0;i<12;i++){const t=(p*.85+i/12)%1,angle=i*2.399;c.save();c.globalAlpha*=Math.sin(t*Math.PI)*.75;c.translate(px+Math.cos(angle)*(23+t*25),gy-t*108);c.rotate(angle+p*2);c.fillStyle=i%2?'#ffedb6':'#fff9e7';c.beginPath();c.moveTo(0,-5);c.quadraticCurveTo(5,0,0,7);c.quadraticCurveTo(-3,1,0,-5);c.fill();c.restore();}
    }else if(kind==='meteor'){
     const charge=1-smooth((p-.32)/.14);halo(c,px,py,40,'#ff8b3955',charge);
     for(let i=0;i<3;i++){const q=clamp((p-.12-i*.047)/(.49-i*.015));if(q<=0||q>=1)continue;const endX=tx+(i-1)*26,endY=ty+(i%2)*8,x=endX+(1-q)*(130+i*8),y=endY-(1-q)*(gy+90);sprite(c,'meteor',x,y,i===1?109:61,.95,-.08+i*.08);}
     if(p>.58){const q=clamp((p-.58)/.42),burst=smooth(q/.23)*(1-smooth((q-.38)/.55));halo(c,tx,ty-10,82,'#ffbf6c99',burst*.6);sprite(c,'meteor-impact',tx,ty+10,74+smooth(q/.4)*49,burst);ring(c,tx,ty+10,10+smooth(q)*88,4+smooth(q)*23,'#ffce7d',2*(1-q)+.3);sparks(c,tx,ty,q,18,'#f9ad65',78);sprite(c,'smoke',tx+q*20,ty-18-q*18,62+q*54,smooth((q-.14)/.22)*(1-q)*.65);}
    }else if(kind==='demon'){
     const charge=smooth(p/.2)*(1-smooth((p-.3)/.18));halo(c,px,py,63,'#ce344866',charge*.8);
     ring(c,px,gy+1,34+smooth(p/.3)*15,11,'#d75b5c',1.7);
     for(let i=0;i<13;i++){const t=(p*1.2+i/13)%1,angle=i*2.4;halo(c,px+Math.cos(angle)*(22+t*18),gy-t*96,1.5,'#ff8d6c',Math.sin(t*Math.PI)*.8);}
     if(p>.42&&p<.7){const q=clamp((p-.42)/.28);sprite(c,'blood-crescent',px+32+q*22,py-3,69,(1-q)*.62,-.15+q*.3);}
    }
    c.restore();
   },onComplete(){impact();if(poseOwner&&r._mythicCast===token){r._mythicCast=null;r.playerState.offsetY=0;r.setPlayerAnim('idle',true);}onComplete?.();}
  };this.skillCombatEffects.push(fx);return fx;
 };
 window.MythicIllustrated={images,pose,ready,sprite};
})();
