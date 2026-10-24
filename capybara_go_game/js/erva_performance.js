// Expression cues follow the decoded recording's audio clock, never a fixed frame counter.
class ErvaPerformance {
 constructor(){
  this.frame=0;this.active=null;this.level=0;
  this.onStart=e=>this.start(e.detail);this.onEnd=()=>this.end();
  window.addEventListener('erva-voice-start',this.onStart);window.addEventListener('erva-voice-end',this.onEnd);
 }
 asset(mood,portrait=false){return 'assets/ui/camp/erva-fish-'+(portrait?'portrait-':'')+mood+'.png';}
 actors(){return document.querySelectorAll('img.erva-actor');}
 moodAt(clip,seconds){let mood=clip?.emotion||'neutral';for(const cue of clip?.cues||[]){if(seconds<cue.at)break;mood=cue.emotion;}return mood;}
 paint(mood){for(const actor of this.actors()){if(actor.dataset.emotion!==mood)actor.dataset.emotion=mood;window.ErvaRig?.set(actor,{mood,level:this.level});const scene=actor.closest('[data-erva-scene]');if(scene&&scene.getAttribute('data-emotion')!==mood)scene.setAttribute('data-emotion',mood);}}
 start(detail){
  cancelAnimationFrame(this.frame);this.active=detail;this.level=0;this.previous=performance.now();
  for(const actor of this.actors())actor.dataset.speaking='true';
  const tick=now=>{
   if(!this.active)return;
   const elapsed=detail.silent?(now-detail.startedAt)/1000:Math.max(0,(window.Game?.Sound||Sound).audioCtx.currentTime-detail.audioStart);
   if(elapsed>=detail.duration+.05){this.end();return;}
   this.paint(this.moodAt(detail.clip,elapsed));
   const levels=detail.clip?.levels||[],step=detail.clip?.levelStep||.04,index=Math.floor(elapsed/step),fraction=elapsed/step-index;
   const amplitude=(levels[index]||0)*(1-fraction)+(levels[index+1]||0)*fraction;
   const delta=Math.min(.1,(now-this.previous)/1000);this.previous=now;this.level+=(Math.min(1,amplitude/.11)-this.level)*(1-Math.exp(-delta*14));
   const seed=[...(detail.key||'erva')].reduce((a,ch)=>a+ch.charCodeAt(0),0);
   for(const actor of this.actors())window.ErvaRig?.set(actor,{mood:this.moodAt(detail.clip,elapsed),level:this.level,seed,speechTime:elapsed,gestureKey:detail.key});
   this.frame=requestAnimationFrame(tick);
  };this.frame=requestAnimationFrame(tick);
 }
 preview(key){const clip=window.ErvaLocale?.resolveVoice(key)?.clip||window.ErvaVoiceClips?.[key];if(clip)this.start({key,clip,duration:clip.duration,silent:true,startedAt:performance.now()});}
 end(){cancelAnimationFrame(this.frame);this.frame=0;this.active=null;for(const actor of this.actors()){actor.dataset.speaking='false';actor.style.removeProperty('transform');const mood=actor.dataset.base||'neutral';window.ErvaRig?.set(actor,{mood,level:0,gestureKey:''});actor.dataset.emotion=mood;actor.closest('[data-erva-scene]')?.setAttribute('data-emotion',mood);}}
}
window.ErvaPerformance=ErvaPerformance;
