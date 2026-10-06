import { equipmentHealingMultiplier } from './equipment-effects.js';

const spell=(id,name,description,cooldown,practiceCooldown,targeting,range,color)=>Object.freeze({id,name,description,cooldown,practiceCooldown,targeting,range,color,icon:`assets/summoner-${id}.png`});
export const SUMMONER_SPELLS=Object.freeze([
  spell('flash','闪现','朝目标方向瞬移最多 20 距离，可以越过地形；被禁锢时无法使用。',300,12,'position',20,'#ffe59a'),
  spell('ignite','引燃','使射程内可见敌方英雄燃烧 5 秒，造成真实伤害并削弱 40% 治疗。',180,12,'enemy',24,'#f77932'),
  spell('heal','治疗','回复自己与附近生命比例最低的一名友军生命，并获得 1 秒加速；治疗受重伤影响。',240,15,'self',26,'#88eda1'),
  spell('ghost','疾跑','10 秒内提高 35% 移动速度，可以与其他加速效果叠加。',210,12,'self',0,'#b5e9ff'),
  spell('barrier','屏障','获得 2.5 秒的独立护盾，护盾值随英雄等级提高，不覆盖其他护盾。',180,12,'self',0,'#f6de81'),
  spell('exhaust','虚弱','使射程内可见敌方英雄减速 30%，其造成的非真实伤害减少 35%，持续 3 秒。',210,12,'enemy',26,'#e2c77e'),
  spell('cleanse','净化','解除眩晕、禁锢、沉默、致盲、魅惑、恐惧、嘲讽、减速、引燃、虚弱与重伤；保留击飞和持续伤害，可在受控时使用。',210,12,'self',0,'#bdeffd'),
  spell('teleport','传送','选择己方防御塔、小兵或守卫，引导 4 秒后传送到目标附近；受到控制、下达新指令或目标失效会中断。',360,20,'ally',350,'#bdacff'),
  spell('smite','惩戒','对射程内可见野怪或敌方小兵造成 600 到 1200 真实伤害；惩戒野怪回复自身生命。',90,8,'enemy',20,'#ffdf8c'),
  spell('clarity','清晰术','回复自己 50% 最大法力及附近友军 25% 最大法力；无蓝或使用能量的英雄无法使用。',180,12,'self',26,'#87d8ff'),
]);
const BY_ID=new Map(SUMMONER_SPELLS.map(s=>[s.id,s]));
export const getSummonerSpell=id=>BY_ID.get(id);
export function normalizeSummoners(value){
  const input=value&&typeof value==='object'?value:{};
  const D=BY_ID.has(input.D)?input.D:'flash';
  let F=BY_ID.has(input.F)?input.F:'ignite';
  if(F===D)F=D==='ignite'?'flash':'ignite';
  return{D,F};
}
export function aiSummonerLoadout(heroId,lane){
  if(lane==='jungle')return{D:'flash',F:'smite'};
  if(['sona','ashe','jinx','caitlyn','missfortune'].includes(heroId))return{D:'flash',F:'heal'};
  if(['morgana','leona','blitzcrank'].includes(heroId))return{D:'flash',F:'exhaust'};
  if(heroId==='malphite')return{D:'flash',F:'barrier'};
  if(['garen','darius','masteryi'].includes(heroId))return{D:'ghost',F:'ignite'};
  return{D:'flash',F:'ignite'};
}

const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const friendly=(g,h,range)=>g.entities.filter(e=>e.alive&&e.kind==='hero'&&e.team===h.team&&distance(h,e)<=range);
const energy=h=>h.heroId==='leesin';
const usesMana=h=>h.maxMana>0&&!energy(h);
const hardControlled=(g,h)=>['stunUntil','airborneUntil','charmUntil','fearUntil','tauntUntil'].some(key=>h[key]>g.time);
const teleportControlled=(g,h)=>hardControlled(g,h)||h.rootUntil>g.time||h.silenceUntil>g.time;
function emit(g,h,key,s,data={}){
  g._event('spell',{source:h.id,hero:h.heroId,key,summoner:s.id,team:h.team,x:h.x,z:h.z,fromX:h.x,fromZ:h.z,toX:h.x,toZ:h.z,color:s.color,radius:5,shape:'circle',...data});
}
function enemyTarget(g,h,s,x,z,targetId){
  const filter=e=>s.id==='smite'?e.kind==='monster'||e.kind==='minion':e.kind==='hero';
  let t=targetId?g.getEntity(targetId):null;
  if(!targetId)t=g.entities.filter(e=>e.alive&&e.team!==h.team&&filter(e)&&g.isVisible(e,h.team)&&distance(e,{x,z})<10+e.radius).sort((a,b)=>distance(a,{x,z})-distance(b,{x,z}))[0];
  return t?.alive&&t.team!==h.team&&filter(t)&&!(t.invulnerableUntil>g.time)&&g.isVisible(t,h.team)&&distance(h,t)<=s.range+(t.radius||0)?t:null;
}
function teleportTarget(g,h,x,z,targetId){
  const valid=t=>t?.alive&&t.team===h.team&&['tower','minion','ward'].includes(t.kind)&&!(t.expiresAt&&t.expiresAt<=g.time);
  if(targetId){const t=g.getEntity(targetId);return valid(t)?t:null;}
  return g.entities.filter(t=>valid(t)&&distance(t,{x,z})<=5+(t.radius||0)).sort((a,b)=>distance(a,{x,z})-distance(b,{x,z}))[0]||null;
}

export function castSummoner(g,h,key,x,z,targetId){
  const s=getSummonerSpell(h.summoners?.[key]);if(!s)return g._fail(h,'请先选择召唤师技能');
  if(!h.alive)return g._fail(h,'英雄阵亡，等待复活');if(g.winner)return false;
  if(h.invulnerableUntil>g.time)return g._fail(h,'不可选中或凝滞期间无法使用召唤师技能');
  if(s.id!=='cleanse'&&hardControlled(g,h))return g._fail(h,'受到控制，暂时无法使用召唤师技能');
  if(['flash','teleport'].includes(s.id)&&h.rootUntil>g.time)return g._fail(h,'被禁锢，无法使用位移召唤师技能');
  if(s.id==='teleport'&&h.silenceUntil>g.time)return g._fail(h,'受到沉默，暂时无法引导传送');
  if((h.cooldowns[key]||0)>0)return g._fail(h,`${s.name}冷却中：${Math.ceil(h.cooldowns[key])} 秒`);
  if(!Number.isFinite(x)||!Number.isFinite(z))return g._fail(h,'请选择有效的技能目标');
  let target;
  if(s.targeting==='enemy'){
    target=enemyTarget(g,h,s,x,z,targetId);
    if(!target)return g._fail(h,s.id==='smite'?'惩戒需要射程内可见的野怪或敌方小兵':`${s.name}需要射程内可见的敌方英雄`);
  }
  if(s.id==='teleport'){
    target=teleportTarget(g,h,x,z,targetId);if(!target||distance(h,target)>s.range)return g._fail(h,'传送需要己方防御塔、小兵或守卫，不能对地面施放');
  }
  if(s.id==='clarity'&&!usesMana(h))return g._fail(h,energy(h)?'清晰术不能恢复能量，请选择其他召唤师技能':'此英雄没有法力，清晰术不适用');
  // Validation above is deliberately pure. Only a valid cast cancels existing
  // orders/channels and spends this keyboard slot's independent cooldown.
  g._cancelRecall(h);g._cancelChannels?.(h);g._breakStealth(h);
  h.cooldowns[key]=g.practice?s.practiceCooldown:s.cooldown;
  if(s.id==='flash'){
    const from={x:h.x,z:h.z};g._dash(h,x,z,s.range);emit(g,h,key,s,{shape:'dash',fromX:from.x,fromZ:from.z,toX:h.x,toZ:h.z,radius:3});
  }else if(s.id==='ignite'){
    target.igniteUntil=g.time+5;target.igniteDamage=(90+20*h.level)/5;target.igniteSource=h.id;target.igniteTick=g.time;target.igniteKey=key;
    emit(g,h,key,s,{shape:'line',target:target.id,x:target.x,z:target.z,toX:target.x,toZ:target.z});
  }else if(s.id==='heal'){
    const ally=friendly(g,h,s.range).filter(e=>e.id!==h.id).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp||distance(a,h)-distance(b,h))[0];
    const recipients=[h,ally].filter(Boolean);for(const t of recipients){const amount=(80+20*h.level)*equipmentHealingMultiplier(t,g.time);t.hp=Math.min(t.maxHp,t.hp+amount);t.healHasteUntil=g.time+1;}
    emit(g,h,key,s,{radius:s.range,target:ally?.id,targets:recipients.map(t=>t.id)});
  }else if(s.id==='ghost'){
    h.ghostUntil=g.time+10;emit(g,h,key,s,{duration:10,radius:5});
  }else if(s.id==='barrier'){
    h.barrierHp=115+25*h.level;h.barrierUntil=g.time+2.5;emit(g,h,key,s,{shape:'shield',duration:2.5});
  }else if(s.id==='exhaust'){
    target.exhaustUntil=g.time+3;if(!g._controlImmune(target)){target.slowUntil=Math.max(target.slowUntil||0,g.time+3);target.slowPower=Math.max(target.slowPower||0,.3);}
    emit(g,h,key,s,{shape:'ring',target:target.id,x:target.x,z:target.z,toX:target.x,toZ:target.z,duration:3});
  }else if(s.id==='cleanse'){
    for(const status of ['stunUntil','rootUntil','silenceUntil','blindUntil','charmUntil','fearUntil','tauntUntil','slowUntil','igniteUntil','exhaustUntil','grievousUntil'])h[status]=0;
    h.stunUntil=h.airborneUntil>g.time?h.airborneUntil:0;h.slowPower=0;h.igniteDamage=0;h.equipmentControls={};
    emit(g,h,key,s,{shape:'shield'});
  }else if(s.id==='teleport'){
    h.summonerChannel={summoner:s.id,key,targetId:target.id,until:g.time+4,x:h.x,z:h.z};h.command=h.isPlayer?{type:'stop'}:{type:'ai'};h._route=null;
    g._event('summoner-channel',{summoner:s.id,source:h.id,hero:h.heroId,team:h.team,target:target.id,x:h.x,z:h.z,toX:target.x,toZ:target.z,duration:4,until:g.time+4,color:s.color});
    emit(g,h,key,s,{shape:'channel',target:target.id,toX:target.x,toZ:target.z,duration:4});
  }else if(s.id==='smite'){
    g._damage(target,Math.min(1200,600+(h.level-1)*40),'true',h,key);
    if(target.kind==='monster')h.hp=Math.min(h.maxHp,h.hp+(70+h.maxHp*.1)*equipmentHealingMultiplier(h,g.time));
    emit(g,h,key,s,{shape:'execute',target:target.id,x:target.x,z:target.z,toX:target.x,toZ:target.z});
  }else if(s.id==='clarity'){
    const recipients=friendly(g,h,s.range).filter(usesMana);for(const t of recipients)t.mana=Math.min(t.maxMana,t.mana+t.maxMana*(t===h?.5:.25));
    emit(g,h,key,s,{radius:s.range,targets:recipients.map(t=>t.id)});
  }
  return true;
}

export function cancelSummonerChannel(g,h){
  const c=h.summonerChannel;if(!c)return;
  h.summonerChannel=null;g._event('summoner-channel-cancel',{summoner:c.summoner,source:h.id,target:c.targetId,team:h.team,x:h.x,z:h.z});
}
export function updateSummoner(g,h){
  if(h.barrierUntil<=g.time){h.barrierHp=0;h.barrierUntil=0;}
  const c=h.summonerChannel;if(!c)return false;
  const target=g.getEntity(c.targetId);
  if(!h.alive||teleportControlled(g,h)||h.invulnerableUntil>g.time||!target?.alive||target.team!==h.team||!['tower','minion','ward'].includes(target.kind)||target.expiresAt&&target.expiresAt<=g.time||distance(h,c)>.1){cancelSummonerChannel(g,h);return false;}
  if(g.time<c.until)return true;
  const from={x:h.x,z:h.z},d=distance(h,target)||1,offset=target.kind==='tower'?5:2.5;
  g._dash(h,target.x+(h.x-target.x)/d*offset,target.z+(h.z-target.z)/d*offset,350);h.summonerChannel=null;
  const s=getSummonerSpell('teleport');emit(g,h,'TELEPORT_FINISH',s,{shape:'dash',target:target.id,fromX:from.x,fromZ:from.z,toX:h.x,toZ:h.z});
  g._event('summoner-channel-complete',{summoner:'teleport',source:h.id,target:target.id,team:h.team,x:h.x,z:h.z});
  if(h.isPlayer)g._event('message',{text:'传送完成'});return false;
}
export function resetSummonerState(g,h){
  cancelSummonerChannel(g,h);for(const key of ['ghostUntil','healHasteUntil','barrierUntil','exhaustUntil'])h[key]=0;h.barrierHp=0;
}
export function summonerMoveMultiplier(g,h){return(h.ghostUntil>g.time?1.35:1)*(h.healHasteUntil>g.time?1.3:1);}
export function summonerDamageAmount(g,source,amount,type){return source?.exhaustUntil>g.time&&type!=='true'?amount*.65:amount;}
export function absorbSummonerBarrier(g,h,amount){
  if(!(h.barrierUntil>g.time)||!(h.barrierHp>0))return amount;const absorbed=Math.min(amount,h.barrierHp);h.barrierHp-=absorbed;return amount-absorbed;
}
export function updateSummonerAI(g,h){
  if(h.isPlayer||!h.alive||h.summonerChannel||g._nearBase(h))return;
  const hp=h.hp/h.maxHp,target=g.getEntity(h.aiTargetId)||g._nearest(h,30,e=>e.kind==='hero'||e.kind==='monster',h.lane==='jungle');
  for(const key of ['D','F']){
    if(h.cooldowns[key]>0)continue;const id=h.summoners?.[key];
    if(id==='cleanse'&&teleportControlled(g,h))g._cast(h,key,h.x,h.z);
    else if(id==='heal'&&(hp<.55||friendly(g,h,26).some(e=>e.hp/e.maxHp<.4)))g._cast(h,key,h.x,h.z);
    else if(id==='barrier'&&hp<.45&&g.time-h.lastDamagedAt<5)g._cast(h,key,h.x,h.z);
    else if(id==='ghost'&&(hp<.35&&g.time-h.lastDamagedAt<6||target?.kind==='hero'&&distance(h,target)>h.attackRange+5))g._cast(h,key,h.x,h.z);
    else if(id==='flash'&&hp<.24&&g.time-h.lastDamagedAt<5&&target?.kind==='hero'&&distance(h,target)<22){const base=h.team==='blue'?{x:-100,z:100}:{x:100,z:-100};g._cast(h,key,base.x,base.z);}
    else if(id==='ignite'&&target?.kind==='hero'&&target.hp/target.maxHp<.4)g._cast(h,key,target.x,target.z,target.id);
    else if(id==='exhaust'&&target?.kind==='hero'&&(hp<.6||distance(h,target)<h.attackRange+4))g._cast(h,key,target.x,target.z,target.id);
    else if(id==='smite'&&target?.kind==='monster'&&(target.hp<=Math.min(1200,600+(h.level-1)*40)||hp<.5))g._cast(h,key,target.x,target.z,target.id);
    else if(id==='clarity'&&usesMana(h)&&h.mana<h.maxMana*.2)g._cast(h,key,h.x,h.z);
  }
}
