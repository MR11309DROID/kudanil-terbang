// Rendering preferences only: combat, rewards and tutorial state are unaffected.
(() => {
 const key='capybara_graphics_v1';
 const presets=Object.freeze({high:{scale:1,particles:1,foreground:true,sunbeams:true,rigResolution:1.5},balanced:{scale:.85,particles:.65,foreground:true,sunbeams:true,rigResolution:1},low:{scale:.7,particles:.35,foreground:false,sunbeams:false,rigResolution:1}});
 let saved={};try{saved=JSON.parse(localStorage.getItem(key)||'{}')||{};}catch{}
 const settings={quality:presets[saved.quality]?saved.quality:'high',fps:['display','60','120','144'].includes(saved.fps)?saved.fps:'display'};let revision=0;
 function apply(){document.documentElement.dataset.graphics=settings.quality;}
 function set(name,value){if(name==='quality'&&!presets[value]||name==='fps'&&!['display','60','120','144'].includes(value)||!['quality','fps'].includes(name))return false;settings[name]=value;revision++;try{localStorage.setItem(key,JSON.stringify(settings));}catch{}apply();window.dispatchEvent(new CustomEvent('graphics-change',{detail:{...settings}}));return true;}
 // Deadlines retain their fractional remainder (120 FPS on 144 Hz must not fall to 72).
 function frame(state,now){if(document.hidden){state.last=null;state.next=null;return null;}if(state.revision!==revision){state.revision=revision;state.last=null;state.next=null;}const interval=settings.fps==='display'?0:1000/Number(settings.fps);if(interval&&state.next!=null&&now+.15<state.next)return null;const dt=state.last==null?1/60:Math.max(0,Math.min(.05,(now-state.last)/1000));state.last=now;if(interval){const next=state.next??now;state.next=next+Math.max(1,Math.floor((now-next)/interval)+1)*interval;}return dt;}
 window.GameGraphics={settings,presets,set,frame,get profile(){return presets[settings.quality];}};apply();
 function init(){const quality=document.getElementById('graphics-quality'),fps=document.getElementById('graphics-fps');if(!quality||!fps)return;quality.value=settings.quality;fps.value=settings.fps;quality.addEventListener('change',()=>set('quality',quality.value));fps.addEventListener('change',()=>set('fps',fps.value));
 const labels={en:{quality:'Graphics',detail:'High keeps the full artwork and effects. Lower presets reduce render resolution and decorative particles.',high:'High',balanced:'Balanced',low:'Low',fps:'Frame rate',fpsDetail:'Match your screen, or set a limit. Higher FPS needs a capable device.',display:'Match display'},ja:{quality:'画質',detail:'高画質はすべての描画と演出を維持。低い設定では描画解像度と装飾パーティクルを軽減します。',high:'高画質',balanced:'標準',low:'軽量',fps:'フレームレート',fpsDetail:'画面に合わせるか上限を選択。実際のFPSは画面と端末の性能によって異なります。',display:'画面に合わせる'}};
 const sync=()=>{const t=labels[window.ErvaLocale?.preferences.subtitle]||labels.en;quality.setAttribute('aria-label',t.quality);fps.setAttribute('aria-label',t.fps);for(const el of document.querySelectorAll('[data-graphics-text]'))el.textContent=t[el.dataset.graphicsText];};window.addEventListener('erva-language-change',sync);sync();}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
