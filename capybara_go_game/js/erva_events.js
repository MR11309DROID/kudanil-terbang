(function(root){
 function bindUpgradeReactions(ui,react){
  if(ui._ervaUpgradeReactionsBound)return;
  ui._ervaUpgradeReactionsBound=true;
  const original=ui.upgradeCoreStat;
  ui.upgradeCoreStat=function(...args){const result=original.apply(this,args);if(result?.attempted===true&&result.success===false)react('laugh',{resumeStation:true});return result;};
 }
 if(typeof module==='object'&&module.exports)module.exports=bindUpgradeReactions;else root.bindErvaUpgradeReactions=bindUpgradeReactions;
})(typeof window==='object'?window:this);
