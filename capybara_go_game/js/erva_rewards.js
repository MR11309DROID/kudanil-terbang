(function(root){
 function collect(character){
  const gifts=[];
  for(const milestone of [10,20]){
   const info=character.getTalentProgress();
   if(!(milestone===10?info.canClaimM10:info.canRankUp))continue;
   const gold=character.gold,gems=character.gems;
   const result=character.claimTalentMilestone(milestone);
   if(result?.success)gifts.push({milestone,rank:character.getTalentProgress().tierName,gold:character.gold-gold,gems:character.gems-gems});
  }
  if(gifts.length&&typeof window==='object')window.dispatchEvent(new CustomEvent('erva-reward-claimed'));
  return gifts;
 }
 if(typeof module==='object'&&module.exports)module.exports=collect;else root.collectErvaGifts=collect;
})(typeof window==='object'?window:this);
