// Original RPG sound bank with bounded polyphony and a dedicated Erva voice channel.
class AudioManager {
 constructor(){
  this.musicVolume=.48;this.sfxVolume=.78;this.voiceVolume=.9;
  this.muted=localStorage.getItem('capybara_go_muted')==='true';this.bgmMuted=localStorage.getItem('capybara_go_bgm_muted')==='true';this.sfxMuted=localStorage.getItem('capybara_go_sfx_muted')==='true';
  this.voiceBase='assets/audio/erva-fish-v1/';
  this.musicTracks={menu:'assets/audio/music/menu_loop.wav',adventure:'assets/audio/music/adventure_loop.wav',battle:'assets/audio/music/battle_loop.wav'};
  for(let chapter=1;chapter<=6;chapter++)this.musicTracks['chapter'+chapter]='assets/audio/chapters-v1/chapter_'+chapter+'.wav';
  this.bank=window.CapyAudioBank||{};this.sfxFiles={};for(const [k,v]of Object.entries(this.bank))this.sfxFiles[k]=v[0].path;
  this.aliases={buttonClick:'click',uiCancel:'cancel',chest:'chestOpenSmall',hurt:'hit',fireCast:'fire',iceCast:'ice',lightningCast:'lightning',itemPickup:'pickup'};
  this.audioBuffers={};this.loading=new Map();this.active=[];this.lastPlayed=new Map();this.lastVariant=new Map();this.unlocked=false;this.currentTrackName=null;this.currentMusicAudio=null;this.audioCtx=null;this.voice=null;this.voiceToken=0;this.lastVoiceAt=-Infinity;this.voiceChoice={};this.ducked=false;
  const unlock=()=>this.unlockAndWarmup();window.addEventListener('pointerdown',unlock,{passive:true});window.addEventListener('keydown',unlock,{passive:true});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){this.stopVoice();this.stopEffects();this.currentMusicAudio?.pause();}else if(this.unlocked)this.syncMusicVolume();});
  this.initAudioContext();this.preloadKeyBuffers();
 }
 initAudioContext(){try{const AC=window.AudioContext||window.webkitAudioContext;if(!AC||this.audioCtx)return;this.audioCtx=new AC();const ctx=this.audioCtx;this.sfxBus=ctx.createGain();this.voiceBus=ctx.createGain();this.master=ctx.createDynamicsCompressor();this.master.threshold.value=-8;this.master.knee.value=12;this.master.ratio.value=5;this.master.attack.value=.004;this.master.release.value=.12;this.sfxBus.connect(this.master);this.voiceBus.connect(this.master);this.master.connect(ctx.destination);}catch(e){}}
 getAudioContext(){this.initAudioContext();return this.audioCtx;}
 resumeAudioContext(){const c=this.getAudioContext();if(c?.state==='suspended')c.resume().catch(()=>{});}
 unlockAndWarmup(){this.unlocked=true;this.resumeAudioContext();this.syncMusicVolume();}
 async loadBuffer(key,path){if(this.audioBuffers[key])return this.audioBuffers[key];if(this.loading.has(key))return this.loading.get(key);const job=(async()=>{try{const response=await fetch(path);if(!response.ok)return null;const data=await response.arrayBuffer(),ctx=this.getAudioContext();if(!ctx)return null;const buffer=await ctx.decodeAudioData(data);this.audioBuffers[key]=buffer;return buffer;}catch{return null;}finally{this.loading.delete(key);}})();this.loading.set(key,job);return job;}
 preloadKeyBuffers(){for(const name of ['click','confirm','hit','slash','coin','minorWin','bigWin','levelUp','chestOpen'])for(const f of this.bank[name]||[])this.loadBuffer(f.path,f.path);for(const key of Object.keys(window.ErvaVoiceClips||{}))this.loadBuffer('voice:'+key,window.ErvaVoiceClips?.[key]?.path||this.voiceBase+key+'.mp3');}
 stopEffects(){for(const node of [...this.active]){try{node.source.stop();}catch{}}this.active=[];}
 toggleMute(){this.muted=!this.muted;localStorage.setItem('capybara_go_muted',this.muted);if(this.muted){this.stopVoice();this.stopEffects();}this.syncMusicVolume();return this.muted;}
 toggleBgm(){this.bgmMuted=!this.bgmMuted;localStorage.setItem('capybara_go_bgm_muted',this.bgmMuted);this.syncMusicVolume();return !this.bgmMuted;}
 toggleSfx(){this.sfxMuted=!this.sfxMuted;localStorage.setItem('capybara_go_sfx_muted',this.sfxMuted);if(this.sfxMuted){this.stopVoice();this.stopEffects();}return !this.sfxMuted;}
 syncMusicVolume(fadeMs=0){
  if(this._musicFadeFrame&&typeof cancelAnimationFrame==='function')cancelAnimationFrame(this._musicFadeFrame);this._musicFadeFrame=0;
  const audio=this.currentMusicAudio;if(!audio)return;
  const target=Math.max(0,Math.min(1,this.musicVolume*(this.ducked ? .10 : 1)));
  if(this.muted||this.bgmMuted||document.hidden){audio.volume=target;audio.pause();return;}
  if(fadeMs>0&&typeof requestAnimationFrame==='function'){
   const from=Number.isFinite(audio.volume)?audio.volume:target,start=performance.now();
   const step=now=>{if(this.currentMusicAudio!==audio)return;const p=Math.max(0,Math.min(1,(now-start)/fadeMs)),ease=p*p*(3-2*p);audio.volume=from+(target-from)*ease;if(p<1)this._musicFadeFrame=requestAnimationFrame(step);else this._musicFadeFrame=0;};
   this._musicFadeFrame=requestAnimationFrame(step);
  }else audio.volume=target;
  if(this.unlocked&&audio.paused)audio.play().catch(()=>{});
 }
 resolveMusicTrack(name){
  if(name!=='adventure'&&name!=='battle')return name;
  const character=window.Game?.Character||(typeof Character!=='undefined'?Character:null);
  const chapter=Number(character?.activeRun?.chapterId||character?.selectedChapter||1);
  return this.musicTracks['chapter'+chapter]?'chapter'+chapter:'chapter1';
 }
 playMusic(name){
  this.currentMusicMode=name;const track=this.resolveMusicTrack(name);
  if(!this.musicTracks[track])return;
  // Exploration and combat share each chapter's score, without restarting every round.
  if(this.currentTrackName===track&&this.currentMusicAudio){this.syncMusicVolume();return;}
  this.currentMusicAudio?.pause();this.currentTrackName=track;this.currentMusicAudio=new Audio(this.musicTracks[track]);this.currentMusicAudio.loop=true;this.currentMusicAudio.preload='auto';this.syncMusicVolume();
 }

 async playSfx(name){
  if(this.muted||this.sfxMuted||document.hidden)return;name=this.aliases[name]||name;const list=this.bank[name];if(!list)return;
  const now=performance.now(),cooldown=['click','hover','coin','gem'].includes(name)?45:75;if(now-(this.lastPlayed.get(name)??-Infinity)<cooldown)return;this.lastPlayed.set(name,now);
  let index=Math.floor(Math.random()*list.length);if(list.length>1&&index===this.lastVariant.get(name))index=(index+1)%list.length;this.lastVariant.set(name,index);
  this.resumeAudioContext();const audioContext=this.getAudioContext();if(audioContext?.state==='suspended')await audioContext.resume().catch(()=>{});const item=list[index],buffer=await this.loadBuffer(item.path,item.path);if(!buffer||this.muted||this.sfxMuted||document.hidden||performance.now()-now>650)return;
  const ctx=this.getAudioContext();if(!ctx||ctx.state!=='running')return;
  while(this.active.length>=12){const oldest=this.active.shift();try{oldest.source.stop();}catch{}}
  const source=ctx.createBufferSource(),gain=ctx.createGain();source.buffer=buffer;
  const musical=['minorWin','bigWin','fortune','majorFortune','levelUp','victory','defeat','stageClear','fanfare','reward','lootRare','heal','gem','coinFountain','questComplete'];
  source.playbackRate.value=musical.includes(name)?1:1+(Math.random()-.5)*.045;
  gain.gain.value=this.sfxVolume*(['click','hover'].includes(name)?.52:.82);source.connect(gain);gain.connect(this.sfxBus);
  const entry={source,gain};this.active.push(entry);source.onended=()=>{source.disconnect();gain.disconnect();this.active=this.active.filter(x=>x!==entry);};source.start();
 }
 setVoiceDuck(on){this.ducked=on;const ctx=this.audioCtx;if(ctx&&this.sfxBus){this.sfxBus.gain.cancelScheduledValues(ctx.currentTime);this.sfxBus.gain.setTargetAtTime(on ? .45 : 1,ctx.currentTime,on ? .04 : .18);}this.syncMusicVolume(on ? 120 : 500);}
 notifyVoice(type,detail){if(typeof window.dispatchEvent==='function'&&typeof CustomEvent==='function')window.dispatchEvent(new CustomEvent(type,{detail}));}
 stopVoice(){this.voiceToken++;if(this.voice){const old=this.voice,key=this.voiceKey;this.voice=null;this.voiceKey=null;try{old.stop();}catch{}this.notifyVoice('erva-voice-end',{key,cancelled:true});}this.setVoiceDuck(false);}
 voiceLine(group){
  if(window.ErvaLocale?.resolveVoice(group)?.clip)return group;
  const clips=window.ErvaVoiceClips;
  if(clips){if(clips[group])return group;const choices=({greeting:['welcome'],encourage:['laugh','nervous','shy'],chat:['welcome','laugh','nervous','shy'],comfort:['sad'],care:['angry']})[group]||[];if(!choices.length)return null;const next=((this.voiceChoice[group]??-1)+1)%choices.length;this.voiceChoice[group]=next;return choices[next];}
  const last=this.voiceChoice[group]??2;const next=last===1?2:1;this.voiceChoice[group]=next;return group+'_'+next;
 }
 playErvaVoice(group,{priority=false}={}){
  if(this.muted||this.sfxMuted)return null;
  const now=performance.now();if(!priority&&(this.voice||now-this.lastVoiceAt<4500))return null;
  const key=this.voiceLine(group),resolved=window.ErvaLocale?.resolveVoice(key),text=window.ErvaLocale?.text(key,window.ErvaVoiceLines?.[key])||window.ErvaVoiceLines?.[key];if(!text)return null;
  this.lastVoiceAt=now;this.stopVoice();const token=this.voiceToken;
  (async()=>{this.resumeAudioContext();const audioContext=this.getAudioContext();if(audioContext?.state==='suspended')await audioContext.resume().catch(()=>{});let playbackClip=resolved?.clip||window.ErvaVoiceClips?.[key];let buffer=await this.loadBuffer(resolved?.cacheKey||'voice:'+key,resolved?.path||window.ErvaVoiceClips?.[key]?.path||this.voiceBase+key+'.mp3');if(!buffer&&resolved?.language==='ja'&&window.ErvaVoiceClips?.[key]&&token===this.voiceToken){playbackClip=window.ErvaVoiceClips[key];buffer=await this.loadBuffer('voice:'+key,playbackClip.path||this.voiceBase+key+'.mp3');}if(!buffer||token!==this.voiceToken||this.muted||this.sfxMuted||document.hidden)return;const ctx=this.getAudioContext();if(ctx.state!=='running')return;const source=ctx.createBufferSource(),gain=ctx.createGain();source.buffer=buffer;gain.gain.value=this.voiceVolume;source.connect(gain);gain.connect(this.voiceBus);this.voice=source;this.voiceKey=key;this.setVoiceDuck(true);source.onended=()=>{source.disconnect();gain.disconnect();if(this.voice===source){this.voice=null;this.voiceKey=null;this.setVoiceDuck(false);this.notifyVoice('erva-voice-end',{key,cancelled:false});}};const audioStart=ctx.currentTime;source.start();this.notifyVoice('erva-voice-start',{key,text,duration:buffer.duration,audioStart,clip:playbackClip});})();
  return text;
 }
 playFortuneChime(){this.playSfx('fortune');}playMajorFortuneFanfare(){this.playSfx('majorFortune');}playMisfortuneThud(){this.playSfx('misfortune');}playBadLuckThud(){this.playSfx('badLuck');}playMinorWin(){this.playSfx('minorWin');}playBigWin(){this.playSfx('bigWin');}playCoinFountain(){this.playSfx('coinFountain');}playArrowThwack(){this.playSfx('arrowThwack');}playDefeatScreenFanfare(){this.playSfx('defeat');}
 playSynthesizedFallback(name){this.playSfx(name);}
}
const Sound=new AudioManager();
window.testFortuneSound=(type='fortune')=>{Sound.unlockAndWarmup();Sound.playSfx(type==='major'?'majorFortune':type);};
