// Presentation-only localization: canonical game data, save files and player input stay unchanged.
(() => {
 const catalogs=window.GameLocaleCatalog||{en:{},ja:{}},records=new WeakMap(),attributes=new WeakMap();
 const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 const patterns={};for(const lang of ['en','ja']){const words=Object.keys(catalogs[lang]).filter(s=>s.length>=3).sort((a,b)=>b.length-a.length);patterns[lang]=new RegExp('(?<![A-Za-z])(?:'+words.map(escape).join('|')+')(?![A-Za-z])','g');}
 function language(){return window.ErvaLocale?.preferences.subtitle||'en';}
 function text(value){if(value==null)return '';const input=String(value),lang=language(),trim=input.trim(),map=catalogs[lang];if(!trim)return input;
  if(Object.prototype.hasOwnProperty.call(map,trim))return input.replace(trim,map[trim]);
  let result=input;
  if(lang==='ja'){
   result=result.replace(/\bBuild\s+(\d+)/g,'ビルド$1').replace(/\bDAY\s+(\d+)/g,'$1日目').replace(/\bDay\s+(\d+)/g,'$1日目').replace(/\bChapter\s+(\d+)/g,'第$1章').replace(/\bRound\s+(\d+)/g,'第$1ラウンド').replace(/\bLevel\s+(\d+)/g,'レベル$1').replace(/\b(\d+)\s+days?\b/g,'$1日').replace(/\b(\d+)% success\b/g,'成功率$1%').replace(/\b(\d+) days until the boss\b/g,'ボスまであと$1日').replace(/(\d+)日 until the boss/g,'ボスまであと$1日').replace(/\b(\d+)d\s*(\d+)h\b/g,'$1日 $2時間');
  }
  return result.replace(patterns[lang],s=>map[s]);
 }
 const skip='.skill-card-description-text,.event-story-text,script,style,noscript,textarea,input,[contenteditable="true"],[data-no-localize],[data-erva-subtitle],#player-profile-name,.profile-nickname,.profile-uid,#erva-voice-language,#erva-subtitle-language';
 function translateNode(node){const parent=node.parentElement;if(!parent||parent.closest(skip))return;let record=records.get(node);if(!record||node.data!==record.rendered)record={source:node.data,rendered:node.data};const rendered=text(record.source);record.rendered=rendered;records.set(node,record);if(node.data!==rendered)node.data=rendered;}
 const translatedAttributes=['title','aria-label','placeholder','alt','data-slot-label'];
 function translateAttributes(el){if(el.closest(skip))return;let saved=attributes.get(el);if(!saved){saved={};attributes.set(el,saved);}for(const key of translatedAttributes){const current=el.getAttribute(key);if(current==null)continue;let record=saved[key];if(!record||current!==record.rendered)record={source:current,rendered:current};const rendered=text(record.source);saved[key]={source:record.source,rendered};if(current!==rendered)el.setAttribute(key,rendered);}}
 function walk(root){if(root.nodeType===3){translateNode(root);return;}if(root.nodeType!==1||root.closest(skip))return;translateAttributes(root);const walker=document.createTreeWalker(root,NodeFilter.SHOW_ELEMENT|NodeFilter.SHOW_TEXT);let node;while(node=walker.nextNode()){if(node.nodeType===3)translateNode(node);else translateAttributes(node);}}
 // Skill descriptions contain stat-highlight spans; translate the complete sentence before rebuilding highlights.
 const richRecords=new WeakMap();
 function rich(el){let record=richRecords.get(el);if(!record||el.innerHTML!==record.rendered)record={source:el.innerHTML,text:el.textContent,rendered:el.innerHTML};
  const localized=text(record.text);let output=record.source;if(language()==='ja'&&localized!==record.text){output=localized.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/([+−-]?\d+(?:\.\d+)?%?)/g,'<span class="kw-blue">$1</span>');}
  record.rendered=output;richRecords.set(el,record);if(el.innerHTML!==output)el.innerHTML=output;
 }
 const normalWalk=walk;
 walk=function(root){const owner=root.nodeType===3?root.parentElement:root;if(owner?.closest('.skill-card-description-text,.event-story-text')){rich(owner.closest('.skill-card-description-text,.event-story-text'));return;}normalWalk(root);if(root.nodeType===1)root.querySelectorAll('.skill-card-description-text,.event-story-text').forEach(rich);};
 let observer,scheduled=false;const pending=new Set();
 function flush(){scheduled=false;observer?.disconnect();const roots=[...pending];pending.clear();for(const node of roots)if(node.isConnected)walk(node);observe();}
 function observe(){observer?.observe(document.body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:translatedAttributes});}
 function refresh(){document.documentElement.lang=language();pending.add(document.body);if(observer)flush();}
 window.GameLocale={text,language,catalogs,refresh,originalText(el){if(el.nodeType===3)return records.get(el)?.source||el.data;return [...el.childNodes].map(n=>this.originalText(n)).join('');}};
 window.addEventListener('erva-language-change',refresh);
 function init(){observer=new MutationObserver(changes=>{for(const change of changes){if(change.type==='childList')for(const node of change.addedNodes)pending.add(node);else pending.add(change.target);}if(pending.size&&!scheduled){scheduled=true;queueMicrotask(flush);}});refresh();}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
