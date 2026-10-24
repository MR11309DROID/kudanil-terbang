// Account rewards: pure synchronous transactions, shared by UI and regression tests.
(() => {
 const MAX_PLAY_MS=240*60000;
 const playRewards=[
  {minute:5,gems:50},{minute:10,gems:75},{minute:15,gems:100,rare:1},
  {minute:30,gems:125,rare:1},{minute:45,gems:150},{minute:60,gems:200,rare:2},
  {minute:90,gems:250,rare:1},{minute:120,gems:300,rare:2},
  {minute:180,gems:400,rare:2},{minute:240,gems:500,mythic:1}
 ];
 const prizes=[
  {type:'gems',value:20,weight:90},{type:'gold',value:500,weight:120},
  {type:'goldTokens',value:1,weight:55},{type:'gems',value:50,weight:65},
  {type:'keys',value:1,weight:85},{type:'gold',value:1500,weight:75},
  {type:'gems',value:100,weight:30},{type:'goldTokens',value:3,weight:20},
  {type:'mount',value:1,weight:2},{type:'goldTokens',value:5,weight:8},
  {type:'goldTokens',value:2,weight:30},{type:'goldTokens',value:1,weight:40},
  {type:'gold',value:1000,weight:100},{type:'gems',value:30,weight:90},
  {type:'keys',value:2,weight:55},{type:'gold',value:300,weight:115}
 ];
 const milestones=[10,50,100,200,500];
 const mounts=[
  {id:'mount_01',name:'Mount 01',nameJa:'マウント01',cost:100,duplicateTokens:30},
  {id:'mount_02',name:'Mount 02',nameJa:'マウント02',cost:120,duplicateTokens:30},
  {id:'mount_03',name:'Mount 03',nameJa:'マウント03',cost:150,duplicateTokens:30}
 ];
 const quests=[
  {id:'check_in',target:1,coins:2,en:'Visit the game',ja:'ゲームにログイン'},
  {id:'play_10m',target:600000,coins:3,en:'Play for 10 minutes',ja:'10分プレイする'},
  {id:'begin_run',target:1,coins:2,en:'Start an adventure',ja:'冒険を1回始める'},
  {id:'win_battles',target:5,coins:3,en:'Win 5 battles',ja:'バトルに5回勝利する'},
  {id:'defeat_boss',target:1,coins:5,en:'Defeat a boss',ja:'ボスを1体倒す'}
 ];
 const integer=(x,fallback=0)=>Number.isFinite(Number(x))?Math.max(0,Math.floor(Number(x))):fallback;
 class LiveEvents {
  constructor(hero,data,random=Math.random,clock=()=>new Date()){
   this.hero=hero;this.data=data;this.random=random;this.clock=clock;
   const s=hero.liveEvents||{},g=s.gacha||{};
   this.state=hero.liveEvents={version:1,playMs:Math.min(MAX_PLAY_MS,integer(s.playMs)),playClaims:Array.isArray(s.playClaims)?[...new Set(s.playClaims.filter(m=>playRewards.some(r=>r.minute===m)))]:[],stars:s.stars&&typeof s.stars==='object'?s.stars:{},starPaid:Array.isArray(s.starPaid)?s.starPaid:[],journeyClaims:Array.isArray(s.journeyClaims)?s.journeyClaims:[],gacha:{coins:integer(g.coins),draws:integer(g.draws),pity:Math.min(499,integer(g.pity)),starterClaimed:!!g.starterClaimed,category:['weapon','armor','accessory'].includes(g.category)?g.category:'weapon',milestones:Array.isArray(g.milestones)?g.milestones:[],lastResults:Array.isArray(g.lastResults)?g.lastResults.slice(-10):[]}};
   const m=s.mounts||{};this.state.version=2;
   this.state.gacha.goldTokens=integer(g.goldTokens);
   this.state.gacha.featuredMount=mounts.some(m=>m.id===g.featuredMount)?g.featuredMount:mounts[0].id;
   this.state.mounts={owned:Array.isArray(m.owned)?[...new Set(m.owned.filter(id=>mounts.some(m=>m.id===id)))]:[],equipped:null};
   if(this.state.mounts.owned.includes(m.equipped))this.state.mounts.equipped=m.equipped;
   const daily=s.quests||{};this.state.quests={day:typeof daily.day==='string'?daily.day:'',progress:daily.progress&&typeof daily.progress==='object'?daily.progress:{},claimed:Array.isArray(daily.claimed)?daily.claimed:[]};
   this.ensureQuestDay();
  }
  dayKey(date=this.clock()){return [date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-');}
  save(){this.hero.save();if(typeof CustomEvent==='function')window.dispatchEvent?.(new CustomEvent('account-rewards-change'));}
  creditPlaytime(ms){const delta=Number(ms);if(!Number.isFinite(delta)||delta<=0)return;const elapsed=Math.min(2000,delta);this.state.playMs=Math.min(MAX_PLAY_MS,this.state.playMs+elapsed);this.advanceQuest('play_10m',elapsed);}
  get playRewards(){return playRewards;}
  get prizes(){return prizes;}
  get milestones(){return milestones;}
  get mountCatalog(){return mounts;}
  ensureQuestDay(){const today=this.dayKey();if(this.state.quests.day!==today)this.state.quests={day:today,progress:{check_in:1},claimed:[]};else this.state.quests.progress.check_in=1;return this.state.quests;}
  advanceQuest(id,amount=1){const def=quests.find(q=>q.id===id);if(!def||!Number.isFinite(amount)||amount<=0)return;const q=this.ensureQuestDay();q.progress[id]=Math.min(def.target,integer(q.progress[id])+amount);}
  dailyQuests(){const q=this.ensureQuestDay();return quests.map(def=>({...def,progress:Math.min(def.target,integer(q.progress[def.id])),claimed:q.claimed.includes(def.id)}));}
  claimQuest(id){const def=this.dailyQuests().find(q=>q.id===id);if(!def||def.claimed||def.progress<def.target)return null;this.state.quests.claimed.push(id);const reward=this.grant({coins:def.coins});this.save();return reward;}
  selectMount(id){if(!mounts.some(m=>m.id===id))return false;this.state.gacha.featuredMount=id;this.save();return true;}
  equipMount(id){if(id!==null&&!this.state.mounts.owned.includes(id))return false;this.state.mounts.equipped=id;this.save();return true;}
  exchangeMount(id){const mount=mounts.find(m=>m.id===id);if(!mount||this.state.mounts.owned.includes(id)||this.state.gacha.goldTokens<mount.cost)return null;this.state.gacha.goldTokens-=mount.cost;const reward=this.grant({mount:1,mountIds:[id]});this.save();return reward;}
  availablePlayRewards(){return playRewards.filter(r=>this.state.playMs>=r.minute*60000&&!this.state.playClaims.includes(r.minute));}
  gear(rarity,category){
   let pool=this.data.equipmentTemplates.filter(t=>t.rarity===rarity);
   if(category)pool=pool.filter(t=>category==='weapon'?t.slot==='weapon':category==='armor'?['armor','helmet','boots'].includes(t.slot):['ring','amulet'].includes(t.slot));
   if(!pool.length)throw Error('No reward equipment available');
   const template=pool[Math.min(pool.length-1,Math.floor(this.random()*pool.length))];
   return this.hero.createItemFromTemplate(template.id,1);
  }
  prepare(reward,category){
   const items=[];for(const rarity of ['rare','mythic'])for(let i=0;i<(reward[rarity]||0);i++)items.push(this.gear(rarity,rarity==='mythic'?category:null));
   return {...reward,items};
  }
  grant(reward){
   const h=this.hero;h.gems=(h.gems||0)+(reward.gems||0);h.gold=(h.gold||0)+(reward.gold||0);h.keys=(h.keys||0)+(reward.keys||0);
   if(h.stats&&reward.gold)h.stats.totalGoldEarned=(h.stats.totalGoldEarned||0)+reward.gold;
   this.state.gacha.coins+=reward.coins||0;
   this.state.gacha.goldTokens+=reward.goldTokens||0;
   for(const id of reward.mountIds||[])if(!this.state.mounts.owned.includes(id))this.state.mounts.owned.push(id);
   h.inventory=h.inventory||[];h.inventory.push(...(reward.items||[]));
   return reward;
  }
  claimPlaytime(minute){
   const r=playRewards.find(r=>r.minute===minute);
   if(!r||this.state.playMs<minute*60000||this.state.playClaims.includes(minute))return null;
   const reward=this.prepare(r);this.state.playClaims.push(minute);this.grant(reward);this.save();return reward;
  }
  dailyInfo(){
   const d=this.hero.dailyLogin||{},today=this.dayKey(),yesterdayDate=new Date(this.clock());yesterdayDate.setDate(yesterdayDate.getDate()-1);
   const yesterday=this.dayKey(yesterdayDate),claimed=d.lastLoginDate===today;
   const day=claimed?Math.max(1,Math.min(7,integer(d.streak,1))):d.lastLoginDate===yesterday?integer(d.streak)%7+1:1;
   const past=(claimed||d.lastLoginDate===yesterday)&&day!==1?(d.claimedDays||[]):[];
   return {today,day,claimed,past,claimable:!claimed,reward:this.data.dailyLoginRewards[day-1]};
  }
  claimDaily(){
   const info=this.dailyInfo();if(!info.claimable)return null;
   const reward=this.prepare(info.reward);this.hero.dailyLogin={lastLoginDate:info.today,streak:info.day,claimedDays:[...new Set([...(info.day===1?[]:info.past),info.day])]};
   this.grant(reward);this.save();return reward;
  }
  recordClear(run){
   const chapter=integer(run.chapterId),valid=this.data.chapters.some(c=>c.id===chapter);
   if(!valid)return {stars:0,gems:0};
   const stars=1+(!run.reviveUsed?1:0)+(run.maxHp>0&&run.currentHp>=run.maxHp*.5?1:0);
   this.state.stars[chapter]=Math.max(integer(this.state.stars[chapter]),stars);
   let gems=0;if(stars===3&&!this.state.starPaid.includes(chapter)){this.state.starPaid.push(chapter);this.hero.gems=(this.hero.gems||0)+100;gems=100;}
   return {stars,gems};
  }
  journeyRewards(chapter){
   const best=this.hero.longestSurvived?.[chapter]||0;
   return [15,30,45,60].map((day,i)=>({day,gold:(i+1)*300,gems:(i+2)*10,rare:i>1?1:0,ready:best>=day,claimed:this.state.journeyClaims.includes(chapter+':'+day)}));
  }
  claimJourney(chapter,day){
   if(!this.data.chapters.some(c=>c.id===chapter))return null;
   const r=this.journeyRewards(chapter).find(r=>r.day===day);if(!r||!r.ready||r.claimed)return null;
   const reward=this.prepare(r);this.state.journeyClaims.push(chapter+':'+day);this.grant(reward);this.save();return reward;
  }
  // Legacy entry points cannot grant extra coins or sell them for gems.
  claimStarterCoins(){return false;}
  buyCoins(){return false;}
  chooseCategory(){return false;}
  draw(count){
   const g=this.state.gacha;if(![1,10].includes(count)||g.coins<count)return null;
   const sum=prizes.reduce((a,r)=>a+r.weight,0),results=[],owned=new Set(this.state.mounts.owned);let pity=g.pity;
   // Resolve every item before charging: a missing catalog entry cannot consume coins.
   for(let i=0;i<count;i++){
    let index=8;if(pity<499){let roll=this.random()*sum;index=prizes.findIndex(r=>(roll-=r.weight)<0);if(index<0)index=prizes.length-1;}
    const prize=prizes[index];let reward;
    if(prize.type==='mount'){
     const mount=mounts.find(m=>m.id===g.featuredMount)||mounts[0];
     if(owned.has(mount.id))reward={goldTokens:mount.duplicateTokens,duplicateMount:mount.id,items:[]};
     else{reward={mount:1,mountIds:[mount.id],items:[]};owned.add(mount.id);}
    }else reward=this.prepare({[prize.type]:prize.value});
    results.push({index,...reward});pity=prize.type==='mount'?0:pity+1;
   }
   g.coins-=count;g.draws+=count;g.pity=pity;for(const reward of results)this.grant(reward);g.lastResults=results;this.save();return results;
  }
  claimGachaMilestone(at){
   const g=this.state.gacha;if(!milestones.includes(at)||g.draws<at||g.milestones.includes(at))return null;
   const r={goldTokens:({10:1,50:5,100:10,200:20,500:50})[at]};
   const reward=this.prepare(r);g.milestones.push(at);this.grant(reward);this.save();return reward;
  }
  claimPass(track,level){
   if(!['free','premium'].includes(track))return null;
   const bp=this.hero.battlePass,tier=this.data.battlePassTracks[track].find(t=>t.level===level),key=track==='free'?'claimedFree':'claimedPremium';
   if(!bp||!tier||bp.level<level||track==='premium'&&!bp.isPremium||(bp[key]||[]).includes(level))return null;
   const reward=this.prepare(tier.reward);bp[key]=[...(bp[key]||[]),level];this.grant(reward);this.save();return reward;
  }
 }
 window.LiveEvents93=LiveEvents;
 if(window.Character&&typeof GameData!=='undefined'){
  const h=window.Character,events=new LiveEvents(h,GameData);window.AccountRewards=events;
  // Mark daily activity before the original methods save their authoritative state.
  const start=h.startRun.bind(h);h.startRun=function(...args){events.ensureQuestDay();const result=start(...args);if(result){events.advanceQuest('begin_run');events.save();}return result;};
  const track=h.trackStat.bind(h);h.trackStat=function(stat,amount=1){events.ensureQuestDay();if(stat==='totalBattlesWon')events.advanceQuest('win_battles',amount);if(stat==='totalBossesDefeated')events.advanceQuest('defeat_boss',amount);return track(stat,amount);};
  const save=h.save.bind(h);h.save=function(...args){events.ensureQuestDay();return save(...args);};
  h.checkDailyLogin=()=>events.claimDaily();
  const end=h.endRun.bind(h);h.endRun=function(victory=false){const stars=victory&&this.activeRun?events.recordClear(this.activeRun):null;const result=end(victory);if(result&&stars)Object.assign(result,{stars:stars.stars,starGems:stars.gems});return result;};
 }
})();
