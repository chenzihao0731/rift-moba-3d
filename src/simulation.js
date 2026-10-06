import { CHAMPIONS } from './champions.js';
import { ITEMS } from './item-data.js';
import { purchaseQuote, buyEquipment, sellQuote, sellEquipment } from './shop.js';
export { CHAMPIONS, ITEMS };
import { Navigation } from './navigation.js';
import { isExtended, extendedInit, extendedRecast, extendedValidate, extendedCast, extendedProjectileHit, extendedProjectileEnd, extendedZoneUpdate, cancelExtendedChannel, extendedHeroUpdate, extendedAttackSpeed, extendedMoveSpeed, extendedAttackAmount, extendedAttackHit, extendedAnyAttackHit, extendedDamageAmount, extendedAfterDamage, extendedKill, extendedDeath, extendedSummonUpdate, extendedAI } from './champion-abilities.js';
import { recomputeEquipmentStats, equipmentOnCast, equipmentOnAttack, equipmentDamage, equipmentStatusUpdate, equipmentUpdate, equipmentHealingMultiplier, useEquipment } from './equipment-effects.js';
import { SUMMONER_SPELLS, getSummonerSpell, normalizeSummoners, aiSummonerLoadout, castSummoner, cancelSummonerChannel, updateSummoner, resetSummonerState, summonerMoveMultiplier, summonerDamageAmount, absorbSummonerBarrier, updateSummonerAI } from './summoner-spells.js';
export { SUMMONER_SPELLS, getSummonerSpell, normalizeSummoners };
// The match runs entirely in map coordinates; rendering is deliberately independent.
const P = (x, z) => ({ x, z });
export const LANES = {
  top: [P(-100,100),P(-110,65),P(-112,-60),P(-90,-108),P(65,-110),P(100,-100)],
  mid: [P(-100,100),P(0,0),P(100,-100)],
  bot: [P(-100,100),P(-65,112),P(90,108),P(112,75),P(108,-65),P(100,-100)],
};

const CHAMP = Object.fromEntries(CHAMPIONS.map(c=>[c.id,c]));
const ITEM = Object.fromEntries(ITEMS.map(i=>[i.id,i]));
const BASE = {blue:P(-100,100),red:P(100,-100)};
const ENEMY = {blue:'red',red:'blue'};
const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));
const distance = (a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const isStructure = e=>e.kind==='tower'||e.kind==='inhibitor'||e.kind==='nexus';
const lineDistance = (p,a,b)=>{const dx=b.x-a.x,dz=b.z-a.z,d=dx*dx+dz*dz; const t=clamp(((p.x-a.x)*dx+(p.z-a.z)*dz)/(d||1),0,1); return Math.hypot(p.x-a.x-t*dx,p.z-a.z-t*dz);};
const segmentsCross=(a,b,c,d)=>{const cross=(u,v,w)=>(v.x-u.x)*(w.z-u.z)-(v.z-u.z)*(w.x-u.x),ab1=cross(a,b,c),ab2=cross(a,b,d),cd1=cross(c,d,a),cd2=cross(c,d,b);return ab1*ab2<=0&&cd1*cd2<=0&&Math.max(a.x,b.x)>=Math.min(c.x,d.x)&&Math.max(c.x,d.x)>=Math.min(a.x,b.x)&&Math.max(a.z,b.z)>=Math.min(c.z,d.z)&&Math.max(c.z,d.z)>=Math.min(a.z,b.z);};
const BUFFS = ['slowUntil','stunUntil','rootUntil','silenceUntil','shieldUntil','invulnerableUntil','hasteUntil','qUntil','spinUntil','fortifyUntil','igniteUntil','markedUntil','airborneUntil','blindUntil','poisonUntil','excitedUntil'];
const BUSHES = [P(-72,-12),P(-12,-72),P(72,12),P(12,72),P(-112,-63),P(-71,-109),P(110,59),P(66,110),P(-20,-20),P(20,20)];
export const BUSH_AREAS = BUSHES;
function pathLength(points){let total=0;for(let i=1;i<points.length;i++)total+=distance(points[i-1],points[i]);return total;}
const LANE_LENGTH = Object.fromEntries(Object.entries(LANES).map(([k,p])=>[k,pathLength(p)]));
function pathPoint(lane,t){const points=LANES[lane];let left=clamp(t,0,1)*LANE_LENGTH[lane];for(let i=1;i<points.length;i++){const l=distance(points[i-1],points[i]);if(left<=l)return P(points[i-1].x+(points[i].x-points[i-1].x)*left/l,points[i-1].z+(points[i].z-points[i-1].z)*left/l);left-=l;}return {...points.at(-1)};}

export class Game {
  constructor({hero='ahri',practice=false,summoners}={}){this.practice=practice;this.summoners=normalizeSummoners(summoners);this.restart(hero);}
  restart(heroId=this.player?.heroId||'ahri',summoners=this.player?.summoners||this.summoners){
    this.summoners=normalizeSummoners(summoners);
    this.time=0;this.winner=null;this.entities=[];this.projectiles=[];this.zones=[];this.reveals=[];this.events=[];this.score={blue:0,red:0};this._id=0;this._wave=0;this._nextWave=5;this._tick=.5;
    this.player=this._hero(CHAMP[heroId]?heroId:'ahri','blue','mid',true);
    const pools={top:['garen','yasuo','darius','malphite'],mid:['ahri','lux','annie','brand','morgana','veigar','ziggs','fizz'],carry:['ashe','ezreal','jinx','vayne','caitlyn','missfortune'],support:['lux','leona','blitzcrank','sona','morgana'],jungle:['teemo','masteryi','leesin','fizz']};
    for(const team of ['blue','red']){
      const selected=new Set(team==='blue'?[this.player.heroId]:[]);
      for(const [role,lane] of [['top','top'],...(team==='red'?[['mid','mid']]:[]),['carry','bot'],['support','bot'],['jungle','jungle']]){
        const candidates=pools[role].filter(id=>!selected.has(id)),id=candidates[Math.floor(Math.random()*candidates.length)];selected.add(id);this._hero(id,team,lane);
      }
    }
    for(const team of ['blue','red']){
      for(const lane of ['top','mid','bot']){
        for(const tier of [1,2,3]){const t=team==='blue'?({1:.34,2:.22,3:.1}[tier]):1-({1:.34,2:.22,3:.1}[tier]);const p=pathPoint(lane,t);this._entity({kind:'tower',team,...p,hp:1450+tier*260,maxHp:1450+tier*260,attack:95,armor:40,magicResist:40,attackRange:25,radius:3.1,lane,tier,attackCooldown:0,name:`${team==='blue'?'蓝':'红'}方${{top:'上路',mid:'中路',bot:'下路'}[lane]}${{1:'外塔',2:'二塔',3:'高地塔'}[tier]}`});}
        const p=pathPoint(lane,team==='blue'?.052:.948);this._entity({kind:'inhibitor',team,...p,hp:1500,maxHp:1500,armor:20,magicResist:20,radius:3,lane,name:'召唤水晶',respawnAt:0});
      }
      const base=BASE[team],sign=team==='blue'?1:-1;
      for(let n=0;n<2;n++)this._entity({kind:'tower',team,x:base.x+sign*(n?14:5),z:base.z-sign*(n?5:14),hp:1800,maxHp:1800,attack:110,armor:45,magicResist:40,attackRange:24,radius:3.1,tier:4,lane:'nexus',attackCooldown:0,name:'枢纽防御塔'});
      this._entity({kind:'nexus',team,x:base.x,z:base.z,hp:2600,maxHp:2600,armor:20,magicResist:20,radius:5,name:team==='blue'?'蓝方水晶枢纽':'红方水晶枢纽'});
    }
    this._monster('dragon',48,48,2500,65,120,300,'山脉巨龙');
    this._monster('baron',-48,-48,5000,95,180,500,'纳什男爵');
    this._monster('blue',-62,8,850,35,65,100,'苍蓝雕纹魔像');
    this._monster('red',-12,62,850,35,65,100,'绯红印记树怪');
    this._monster('blue',62,-8,850,35,65,100,'苍蓝雕纹魔像');
    this._monster('red',12,-62,850,35,65,100,'绯红印记树怪');
    this._monster('wolves',-77,47,540,27,45,60,'暗影狼');this._monster('wolves',77,-47,540,27,45,60,'暗影狼');
    this._monster('raptors',-40,58,500,25,45,65,'锋喙鸟');this._monster('raptors',40,-58,500,25,45,65,'锋喙鸟');
    if(this.practice){this.player.gold=10000;for(let i=1;i<6;i++)this._level(this.player);this.player.hp=this.player.maxHp;this.player.mana=this.player.maxMana;}
    this.events.length=0;
    this._event('message',{text:'欢迎来到召唤师峡谷 · 右键移动 / 攻击，Q W E R 施放技能'});
  }
  setObstacles(circles=[]){this.navigation=new Navigation([...circles,...Object.values(BASE).map(p=>({...p,r:7.2}))]);for(const e of this.entities)e._route=null;}
  get gold(){return this.player.gold;}get kills(){return this.player.kills;}get deaths(){return this.player.deaths;}get assists(){return this.player.assists;}get cs(){return this.player.cs;}
  _entity(data){const e={id:++this._id,x:0,z:0,hp:1,maxHp:1,mana:0,maxMana:0,alive:true,radius:1,armor:0,magicResist:0,attackCooldown:0,shield:0,lastDamagedAt:-100,...data};this.entities.push(e);return e;}
  _hero(heroId,team,lane,player=false){
    const c=CHAMP[heroId],base=BASE[team],sign=team==='blue'?1:-1,index=this.entities.filter(e=>e.kind==='hero'&&e.team===team).length;
    const offsets=[[-8,8],[-13,3],[-3,13],[-13,10],[-10,13]][index%5],spawnX=base.x+offsets[0]*sign,spawnZ=base.z+offsets[1]*sign;
    const h=this._entity({kind:'hero',heroId,team,name:c.name,x:spawnX,z:spawnZ,hp:c.hp,maxHp:c.hp,mana:c.mana,maxMana:c.mana,baseHp:c.hp,baseMana:c.mana,baseAttack:c.attack,baseArmor:c.armor,baseMagicResist:30,baseSpeed:c.speed,attack:c.attack,armor:c.armor,magicResist:30,attackRange:c.attackRange,speed:c.speed,ap:0,haste:0,attackSpeed:.75,crit:0,critPower:0,lifesteal:0,manaRegen:0,level:1,xp:0,xpToNext:120,gold:player?500:450,kills:0,deaths:0,assists:0,cs:0,inventory:Array(6).fill(null),cooldowns:{Q:0,W:0,E:0,R:0,D:0,F:0,4:0},skillRanks:{Q:1,W:0,E:0,R:0},skillPoints:0,lane,isPlayer:player,radius:1.8,wardCharges:2,wardTimer:0,contributors:{},command:player?{type:'stop'}:{type:'ai'},aiThink:0,aiAggression:.6+Math.random()*.3,spawnX,spawnZ,flow:0,qStacks:0,dashLocks:{},shroomCharges:0,shroomRecharge:0,rocketMode:false,minigunStacks:0});
    h.skillLevels=h.skillRanks;h.summoners=normalizeSummoners(player?this.summoners:aiSummonerLoadout(heroId,lane));extendedInit(h);return h;
  }
  _monster(type,x,z,hp,attack,respawnTime,reward,name){const available=type==='baron'?180:type==='dragon'?35:0;return this._entity({kind:'monster',monsterType:type,team:'neutral',x,z,homeX:x,homeZ:z,hp,maxHp:hp,attack,armor:type==='baron'?50:15,magicResist:15,attackRange:6,speed:6,radius:type==='baron'?5:type==='dragon'?4:2.6,respawnTime,reward,name,alive:available===0||this.practice,respawnAt:available,attackCooldown:0});}
  setPractice(enabled){this.practice=!!enabled;if(enabled&&this.player.gold<5000)this.player.gold=5000;}
  _event(type,data={}){this.events.push({type,time:this.time,...data});if(this.events.length>500)this.events.splice(0,150);}
  getEntity(id){return this.entities.find(e=>e.id===id);}
  moveTo(x,z){if(!this.player.alive)return;this._cancelRecall(this.player);this._cancelChannels(this.player);const p={x:clamp(x,-119,119),z:clamp(z,-119,119)},destination=this.navigation?this.navigation.nearestPoint(p):p;this.player._route=null;this.player.command={type:'move',...destination};}
  attackMoveTo(x,z,targetId){
    if(!this.player.alive)return false;
    // Clicking an enemy is an explicit attack, including neutral camps and revealed wards.
    if(targetId&&this.attackTarget(targetId))return true;
    this.moveTo(x,z);this.player.command={...this.player.command,type:'attackMove',cursorX:clamp(x,-119,119),cursorZ:clamp(z,-119,119),targetId:0};return true;
  }
  attackMove(x,z,targetId){return this.attackMoveTo(x,z,targetId);}
  attackTarget(id){const t=this.getEntity(id);if(!this.player.alive||!this._canAttackTarget(this.player,t))return false;this._cancelRecall(this.player);this._cancelChannels(this.player);this.player._route=null;this.player.command={type:'attack',targetId:id};return true;}
  stop(){this._cancelRecall(this.player);this._cancelChannels(this.player);this.player._route=null;this.player.command={type:'stop'};}
  recall(){const h=this.player;if(!h.alive||this.winner)return false;this._cancelChannels(h);h.command={type:'stop'};h.recallAt=this.time+(this.practice?2:6);this._event('recall',{x:h.x,z:h.z,team:h.team,source:h.id,text:'正在回城'});return true;}
  _cancelRecall(h){h.recallAt=0;}
  _cancelChannels(h){cancelExtendedChannel(this,h);cancelSummonerChannel(this,h);}
  _nearBase(h){return distance(h,BASE[h.team])<20;}
  canShop(h=this.player){return this.practice||!h.alive||this._nearBase(h);}
  quoteBuy(itemId){return purchaseQuote(this.player,itemId,{canShop:this.canShop()});}
  quoteSell(index){return sellQuote(this.player,index,{canShop:this.canShop()});}
  buy(itemId){const h=this.player,quote=buyEquipment(h,itemId,{canShop:this.canShop()});if(!quote.ok)return this._fail(h,quote.reason);this._recomputeStats(h);this._event('purchase',{source:h.id,text:`已购买 ${quote.item.name}`,amount:quote.cost});return true;}
  sell(index){const h=this.player,quote=sellEquipment(h,index,{canShop:this.canShop()});if(!quote.ok)return this._fail(h,quote.reason);this._recomputeStats(h);this._event('sale',{source:h.id,text:`已出售 ${quote.item.name} · 返还 ${quote.refund} 金币`,amount:quote.refund});return true;}
  _fail(h,text){if(h.isPlayer&&(!this._lastFail||this.time-this._lastFail.at>.5||this._lastFail.text!==text)){this._event('message',{text});this._lastFail={text,at:this.time};}return false;}
  levelSkill(key){return this._learn(this.player,String(key).toUpperCase());}
  _learn(h,key){if(!['Q','W','E','R'].includes(key))return false;if(h.skillPoints<=0)return this._fail(h,'没有可用的技能点');const rank=h.skillLevels[key]||0,max=key==='R'?3:5;if(rank>=max)return this._fail(h,'技能已经升到最高等级');const required=key==='R'?[6,11,16][rank]:rank*2+1;if(h.level<required)return this._fail(h,`此技能升级需要英雄达到 ${required} 级`);h.skillLevels[key]=rank+1;h.skillPoints--;if(h.heroId==='teemo'&&key==='R'&&!rank)h.shroomCharges=3;if(h.isPlayer)this._event('message',{text:`${CHAMP[h.heroId].skills.find(s=>s.key===key).name} 升至 ${rank+1} 级`});return true;}
  useItem(index,x=this.player.x,z=this.player.z){const h=this.player,slot=h.inventory[index],item=ITEM[slot?.id];if(!h.alive||!item?.active||slot.cooldown>0)return false;if(item.active==='stasis'){h.invulnerableUntil=this.time+2.5;h.stunUntil=this.time+2.5;slot.cooldown=90;this._event('spell',{x:h.x,z:h.z,source:h.id,hero:h.heroId,key:'ZHONYA',radius:3,color:'#ffd363'});}
    if(item.active==='heal'){h.potionUntil=this.time+6;this._consume(h,index);this._event('message',{text:'生命药水：持续恢复生命'});}
    if(item.active==='ward'){if(distance(h,{x,z})>25){this._event('message',{text:'守卫放置距离过远'});return false;}this._addWard(h,x,z,true);this._consume(h,index);}if(!['stasis','heal','ward'].includes(item.active)){const used=useEquipment(this,h,slot,item,x,z);if(used)this._cancelChannels(h);return used;}this._cancelChannels(h);return true;}
  _consume(h,index){const s=h.inventory[index];if(s.count>1)s.count--;else h.inventory[index]=null;}
  _recomputeStats(h){let stats={hp:0,mana:0,attack:0,armor:0,ap:0,speed:0,haste:0,attackSpeed:0,lifesteal:0,crit:0,critPower:0,manaRegen:0,apMultiplier:0};for(const slot of h.inventory)for(const[k,v]of Object.entries(ITEM[slot?.id]?.stats||{}))stats[k]=(stats[k]||0)+v;h.maxHp=h.baseHp+(h.level-1)*85+stats.hp;h.maxMana=h.baseMana? h.baseMana+(h.level-1)*35+stats.mana:0;h.attack=h.baseAttack+(h.level-1)*4+stats.attack+(h.dragonStacks||0)*6;h.armor=h.baseArmor+(h.level-1)*3.5+stats.armor;h.magicResist=h.baseMagicResist+(h.level-1)*1.5;h.ap=(stats.ap+(h.dragonStacks||0)*10+(h.ext?.veigarAp||0))*(1+stats.apMultiplier);h.speed=h.baseSpeed+Math.min(stats.speed,5);h.attackSpeed=.75*(1+(h.level-1)*.025+stats.attackSpeed);for(const key of ['haste','lifesteal','crit','critPower','manaRegen'])h[key]=stats[key];h.hp=Math.min(h.maxHp,h.hp);h.mana=Math.min(h.maxMana,h.mana);if(h.heroId==='yasuo')h.crit=Math.min(1,h.crit*2);h.attackRange=CHAMP[h.heroId].attackRange+(h.heroId==='jinx'&&h.rocketMode?6+(h.skillLevels.Q||1):0);recomputeEquipmentStats(h,stats,this.time);}
  placeWard(x,z){const h=this.player;if(!h.alive||h.cooldowns[4]>0)return false;if(h.wardCharges<=0){this._event('message',{text:'侦查守卫正在充能'});return false;}if(distance(h,{x,z})>25){const d=distance(h,{x,z});x=h.x+(x-h.x)*25/d;z=h.z+(z-h.z)*25/d;}this._cancelChannels(h);h.wardCharges--;h.cooldowns[4]=.8;this._addWard(h,x,z,false);return true;}
  _addWard(h,x,z,control){const wards=this.entities.filter(e=>e.kind==='ward'&&e.sourceId===h.id&&e.alive&&!e.control);if(wards.length>=3)wards[0].alive=false;const e=this._entity({kind:'ward',team:h.team,x:clamp(x,-119,119),z:clamp(z,-119,119),hp:3,maxHp:3,radius:1,sourceId:h.id,control,expiresAt:this.time+(control?150:90),visionRange:control?26:23,name:control?'控制守卫':'侦查守卫'});this._event('ward',{x:e.x,z:e.z,source:h.id,team:h.team,text:control?'控制守卫已部署':'侦查守卫已部署',radius:e.visionRange});}
  isVisible(e,team='blue'){
    if(!e?.alive)return e?.kind==='hero'&&e.team===team;
    if(e.team===team||isStructure(e)||this.practice)return true;
    if(e.kind==='hero'&&e.stealthed&&!this.entities.some(v=>v.alive&&v.team===team&&v.kind==='ward'&&v.control&&distance(v,e)<v.visionRange))return false;
    if(e.kind==='ward'&&!e.control)return this.entities.some(v=>v.alive&&v.team===team&&v.kind==='ward'&&v.control&&distance(v,e)<v.visionRange);
    if(e.revealedUntil>this.time||this.reveals.some(r=>r.team===team&&r.until>this.time&&distance(r,e)<r.radius))return true;
    const bush=BUSHES.find(b=>distance(b,e)<8);
    return this.entities.some(v=>v.alive&&v.team===team&&(v.kind==='hero'||v.kind==='minion'||v.kind==='tower'||v.kind==='ward')&&distance(v,e)<(v.visionRange||(v.kind==='hero'?31:v.kind==='tower'?31:20))&&(!bush||v.kind==='ward'||distance(v,bush)<10||e.lastDamagedAt>this.time-1.5));
  }
  unitsTeamVisible(e,team='blue'){return this.isVisible(e,team);}
  isZoneVisible(zone,team='blue'){if(zone.dead)return false;if(zone.team===team||this.practice||zone.revealedUntil>this.time)return true;if(zone.type!=='teemo-mushroom')return this.isVisible({alive:true,kind:'zone',team:zone.team,x:zone.x,z:zone.z},team);return this.entities.some(e=>e.alive&&e.kind==='ward'&&e.team===team&&e.control&&distance(e,zone)<e.visionRange);}
  _canAttackTarget(h,t,allowNeutral=true,allowWard=true){return !!(t?.alive&&t.id!==h.id&&t.team!==h.team&&(allowNeutral||t.team!=='neutral')&&(allowWard||t.kind!=='ward')&&this.isVisible(t,h.team)&&!(t.invulnerableUntil>this.time)&&(!isStructure(t)||this._canHitStructure(t,h)));}
  _attackMoveTarget(h,cursor){
    let target=null,best=Infinity;
    for(const e of this.entities){
      // Ground attack-move acquires locally; it never walks off toward a distant enemy or camp.
      if(!this._canAttackTarget(h,e,false,false)||distance(h,e)>h.attackRange+e.radius)continue;
      const score=distance(cursor,e);if(score<best){best=score;target=e;}
    }
    return target;
  }
  _enemies(h,range,filter=()=>true){return this.entities.filter(e=>e.alive&&e.team!==h.team&&e.team!=='neutral'&&e.kind!=='ward'&&distance(e,h)<range+e.radius&&filter(e));}
  _nearest(h,range,filter=()=>true,allowNeutral=false){let best=null,score=Infinity;for(const e of this.entities){if(!e.alive||e.id===h.id||e.team===h.team||(!allowNeutral&&e.team==='neutral')||e.kind==='ward'||!filter(e))continue;if(e.team!=='neutral'&&!this.isVisible(e,h.team))continue;const d=distance(h,e);if(d<range+e.radius){let s=d+(isStructure(e)?8:0)+(e.kind==='hero'?-3:0);if(s<score){score=s;best=e;}}}return best;}
  _combatEnemies(h,range,filter=()=>true){return this.entities.filter(e=>e.alive&&e.team!==h.team&&e.kind!=='ward'&&!isStructure(e)&&distance(h,e)<range+e.radius&&filter(e));}
  _zone(type,h,data){const kind={'yasuo-wall':'windwall','teemo-mushroom':'mushroom','jinx-chompers':'chompers',lux:'light'}[type];const zone={id:++this._id,type,kind,hero:h.heroId,team:h.team,sourceId:h.id,...data};this.zones.push(zone);return zone;}
  _controlImmune(t){return t.blackShieldUntil>this.time&&t.shield>0;}
  _airborne(t,duration){if(this._controlImmune(t))return;t.airborneUntil=this.time+duration;t.stunUntil=Math.max(t.stunUntil||0,t.airborneUntil);}
  _poison(t,h,dps,duration,key='POISON'){const prior=t.poisons?.[h.id];t.poisons??={};t.poisons[h.id]={until:this.time+duration,dps:Math.max(prior?.dps||0,dps),nextTick:prior?.nextTick||this.time+.5,key};t.poisonUntil=Math.max(t.poisonUntil||0,this.time+duration);}
  _statusUpdate(e){equipmentStatusUpdate(this,e);if(!e.alive)return;for(const[id,poison]of Object.entries(e.poisons||{})){if(poison.until<this.time){delete e.poisons[id];continue;}if(poison.nextTick<=this.time){poison.nextTick+=.5;this._damage(e,poison.dps*.5,'magic',this.getEntity(Number(id)),poison.key);if(!e.alive)return;}}}
  _breakStealth(h){if(h.heroId==='teemo'){if(h.stealthed)h.ambushUntil=this.time+3;h.stealthed=false;h.stealthStill=0;}h.lastActionAt=this.time;}
  _excite(h){if(h?.heroId!=='jinx'||!h.alive)return;h.excitedUntil=this.time+6;this._event('spell',{hero:'jinx',key:'EXCITED',source:h.id,team:h.team,x:h.x,z:h.z,radius:5,color:'#f4a2d4'});}
  cast(key,x=this.player.x,z=this.player.z,targetId){return this._cast(this.player,String(key).toUpperCase(),x,z,targetId);}
  _cast(h,key,x,z,targetId){
    if(!h.alive)return this._fail(h,'英雄阵亡，等待复活');if(this.winner)return false;if(['D','F'].includes(key))return castSummoner(this,h,key,x,z,targetId);if(h.stunUntil>this.time||h.airborneUntil>this.time||h.invulnerableUntil>this.time)return this._fail(h,'受到控制，暂时无法施放技能');
    if(key==='4')return h.isPlayer?this.placeWard(x,z):false;
    if(key==='E'&&h.heroId==='lux'&&h.lightZone){this._cancelChannels(h);this._detonate(h.lightZone);h.lightZone=null;return true;}
    const isRecast=key==='R'&&h.heroId==='ahri'&&h.dashCharges>0&&h.dashUntil>this.time||extendedRecast(this,h,key);
    if((h.cooldowns[key]||0)>0&&!isRecast)return this._fail(h,`${key} 冷却中：${Math.ceil(h.cooldowns[key])} 秒`);
    if(h.silenceUntil>this.time&&!['D','F'].includes(key))return this._fail(h,'受到沉默，无法施放技能');
    const skill=CHAMP[h.heroId].skills.find(s=>s.key===key);if(!skill)return false;
    if(key==='R'&&h.level<6){if(h.isPlayer)this._event('message',{text:'终极技能在英雄达到 6 级后解锁'});return false;}
    if(!h.skillLevels[key])return this._fail(h,`${key} 尚未学习，请点击技能上的 + 号`);
    if(h.heroId==='teemo'&&key==='E')return this._fail(h,'毒性射击是被动技能：普通攻击自动施毒');
    if(h.heroId==='teemo'&&key==='R'&&h.shroomCharges<=0)return this._fail(h,'蘑菇充能不足，等待补充');
    const extended=extendedValidate(this,h,key,x,z,targetId);if(extended?.error)return this._fail(h,extended.error);
    const cost=extended?.cost??(isRecast?0:skill.cost);if(h.mana<cost&&!this.practice){if(h.isPlayer)this._event('message',{text:'法力不足'});return false;}
    let target=this.getEntity(targetId);if(!target?.alive||target.team===h.team)target=null;
    if(h.heroId==='teemo'&&key==='Q'){target=target||this._nearest({x,z,team:h.team},10,e=>!isStructure(e),true);if(!target||isStructure(target)||distance(h,target)>30+target.radius||!this.isVisible(target,h.team))return this._fail(h,'致盲吹箭需要射程内的可见敌人');}
    if(h.heroId==='yasuo'&&key==='E'){target=target||this._nearest({x,z,team:h.team},10,e=>!isStructure(e),true);if(!target||isStructure(target)||distance(h,target)>18+target.radius||!this.isVisible(target,h.team))return this._fail(h,'踏前斩需要附近的可见敌人');if((h.dashLocks[target.id]||0)>this.time)return this._fail(h,'这个目标暂时不能再次穿越');}
    if(h.heroId==='yasuo'&&key==='R'){if(target&&!this.isVisible(target,h.team))return this._fail(h,'狂风绝息斩需要可见的击飞目标');if(!target||target.kind!=='hero'||!(target.airborneUntil>this.time))target=this._nearest(h,62,e=>e.kind==='hero'&&e.airborneUntil>this.time);if(!target||distance(h,target)>62||!(target.airborneUntil>this.time)||!this.isVisible(target,h.team))return this._fail(h,'狂风绝息斩需要被击飞的敌方英雄');}
    if(h.heroId==='garen'&&key==='R'){target=target||this._nearest({x,z,team:h.team},15,e=>e.kind==='hero');if(!target||target.kind!=='hero'||distance(h,target)>17){if(h.isPlayer)this._event('message',{text:'德玛西亚正义需要附近的敌方英雄'});return false;}}
    this._cancelRecall(h);this._cancelChannels(h);this._breakStealth(h);h.mana=Math.max(0,h.mana-cost);if(!isRecast)h.cooldowns[key]=skill.cooldown/(1+h.haste/100);h.lastCastAt=this.time;if(h.heroId==='yasuo'&&key==='Q')h.cooldowns.Q=Math.max(1.1,skill.cooldown/(1+(h.attackSpeed/.75-1)*1.1));
    const d=Math.hypot(x-h.x,z-h.z)||1,dir=P((x-h.x)/d,(z-h.z)/d),ap=h.ap+(h.baronUntil>this.time?35:0),rank=h.skillLevels[key]||1;
    const spell={source:h.id,hero:h.heroId,key,team:h.team,x,z,fromX:h.x,fromZ:h.z,toX:x,toZ:z,color:CHAMP[h.heroId].color};
    if(extended){extendedCast(this,h,key,x,z,extended,spell);equipmentOnCast(this,h,key);this._event('spell',spell);return true;}
    if(h.heroId==='ahri'){
      if(key==='Q'){this._projectile(h,dir,{skill:'Q',range:45,speed:42,radius:2.2,damage:55+rank*20+ap*.45,damageType:'magic',pierce:true,returnTo:h.id});spell.toX=h.x+dir.x*45;spell.toZ=h.z+dir.z*45;}
      if(key==='W'){h.hasteUntil=this.time+2;const targets=this._enemies(h,26).sort((a,b)=>(a.kind==='hero'?-10:0)+distance(h,a)-((b.kind==='hero'?-10:0)+distance(h,b)));for(let i=0;i<3&&targets.length;i++)this._tracking(h,targets[i%targets.length],35+rank*13+ap*.3,'magic','W');spell.radius=8;}
      if(key==='E')this._projectile(h,dir,{skill:'E',range:46,speed:38,radius:2,damage:60+rank*20+ap*.6,damageType:'magic',effect:'charm'});
      if(key==='R'){if(!isRecast){h.dashCharges=3;h.dashUntil=this.time+10;}h.dashCharges--;this._dash(h,x,z,18);const targets=this._enemies(h,29).sort((a,b)=>(a.kind==='hero'?-10:0)+distance(h,a)-((b.kind==='hero'?-10:0)+distance(h,b))).slice(0,3);for(const t of targets)this._tracking(h,t,70+rank*35+ap*.35,'magic','R');spell.toX=h.x;spell.toZ=h.z;spell.radius=4;}
    }else if(h.heroId==='ashe'){
      if(key==='Q'){h.qUntil=this.time+6;spell.radius=4;}
      if(key==='W'){const group=`${h.id}-${this.time}`,angle=Math.atan2(dir.z,dir.x);for(let i=-4;i<=4;i++)this._projectile(h,P(Math.cos(angle+i*.115),Math.sin(angle+i*.115)),{skill:'W',range:52,speed:46,radius:1,damage:20+rank*15+h.attack,damageType:'physical',effect:'slow',group});spell.radius=22;}
      if(key==='E'){const spot=P(clamp(x,-119,119),clamp(z,-119,119));this.reveals.push({...spot,team:h.team,radius:36,until:this.time+7});spell.x=spot.x;spell.z=spot.z;spell.radius=36;}
      if(key==='R')this._projectile(h,dir,{skill:'R',range:240,speed:44,radius:3.5,damage:175+rank*75+ap,damageType:'magic',effect:'iceStun',heroesOnly:true});
    }else if(h.heroId==='garen'){
      if(key==='Q'){h.qUntil=this.time+5;h.hasteUntil=this.time+3;h.slowUntil=0;spell.radius=4;}
      if(key==='W'){this._shield(h,70+rank*25+h.maxHp*.1,3);h.fortifyUntil=this.time+3;spell.radius=5;}
      if(key==='E'){h.spinUntil=this.time+3;h.spinTick=this.time;h.spinDamage=12+rank*6+h.attack*.25;spell.radius=9;}
      if(key==='R'){spell.target=target.id;spell.x=target.x;spell.z=target.z;spell.radius=6;this._damage(target,110+rank*70+(target.maxHp-target.hp)*(.2+rank*.05),'true',h,'R');}
    }else if(h.heroId==='lux'){
      if(key==='Q')this._projectile(h,dir,{skill:'Q',range:53,speed:34,radius:2.2,damage:60+rank*25+ap*.7,damageType:'magic',effect:'root',pierce:true,maxHits:2});
      if(key==='W'){const end=P(h.x+dir.x*43,h.z+dir.z*43);for(const ally of this.entities.filter(e=>e.alive&&e.team===h.team&&e.kind==='hero'&&lineDistance(e,h,end)<6))this._shield(ally,70+rank*20+ap*.35,4);spell.toX=end.x;spell.toZ=end.z;}
      if(key==='E'){const spot=P(h.x+dir.x*Math.min(d,49),h.z+dir.z*Math.min(d,49));const zone={...spot,radius:11.5,sourceId:h.id,team:h.team,damage:70+rank*30+ap*.75,until:this.time+5,type:'lux'};this.zones.push(zone);h.lightZone=zone;spell.x=spot.x;spell.z=spot.z;spell.radius=11.5;}
      if(key==='R'){const end=P(h.x+dir.x*88,h.z+dir.z*88);spell.toX=end.x;spell.toZ=end.z;spell.radius=5;for(const e of this._enemies(h,95,e=>!isStructure(e)))if(lineDistance(e,h,end)<5+e.radius){this._damage(e,180+rank*100+ap*1.1,'magic',h,'R');this._triggerMark(h,e);}}
    }else if(h.heroId==='ezreal'){
      if(key==='Q')this._projectile(h,dir,{skill:'Q',range:53,speed:58,radius:1.6,damage:25+rank*20+h.attack*1.2+ap*.15,damageType:'physical',effect:'ezQ'});
      if(key==='W')this._projectile(h,dir,{skill:'W',range:53,speed:42,radius:2,damage:0,damageType:'magic',effect:'essence',heroesOnly:true,hitStructures:true});
      if(key==='E'){this._dash(h,x,z,17);const t=this._nearest(h,28,e=>e.kind==='hero'||e.kind==='minion'||e.kind==='monster',true);if(t)this._tracking(h,t,55+rank*25+ap*.65,'magic','E');spell.toX=h.x;spell.toZ=h.z;spell.radius=4;}
      if(key==='R')this._projectile(h,dir,{skill:'R',range:240,speed:50,radius:5,damage:220+rank*100+h.attack*.7+ap*.9,damageType:'magic',pierce:true,falloff:.93});
    }else if(h.heroId==='yasuo'){
      if(key==='Q'){
        if(h.qStackUntil<=this.time)h.qStacks=0;
        const damage=25+rank*18+h.attack*1.05,tornado=h.qStacks>=2,spinning=h.dashComboUntil>this.time;
        // One E grants one circular Q. A following Q requires another dash.
        h.dashComboUntil=0;h.facing=Math.atan2(dir.z,dir.x);
        if(tornado)h.qStacks=0;
        if(tornado&&!spinning){this._projectile(h,dir,{skill:'Q3',shape:'tornado',range:47,speed:32,radius:3,damage,damageType:'physical',pierce:true,effect:'tornado'});spell.key='Q3';spell.shape='tornado';spell.toX=h.x+dir.x*47;spell.toZ=h.z+dir.z*47;spell.radius=3;}
        else{
          const end=P(h.x+dir.x*18,h.z+dir.z*18),radius=spinning?9:1.25;let hit=false;
          spell.key=spinning?(tornado?'EQ3':'EQ'):'Q';spell.shape=spinning?(tornado?'spin-knockup':'spin'):'thrust';spell.x=h.x;spell.z=h.z;
          for(const t of this._combatEnemies(h,spinning?radius:22)){
            const dx=t.x-h.x,dz=t.z-h.z,along=dx*dir.x+dz*dir.z,across=Math.abs(dx*dir.z-dz*dir.x);
            const collides=spinning?distance(h,t)<radius+t.radius:along>0&&along<=18+t.radius&&across<radius+t.radius;
            if(!collides)continue;
            this._damage(t,damage,'physical',h,spell.key);hit=true;
            if(tornado&&t.alive){this._airborne(t,1.2);this._event('spell',{hero:'yasuo',key:'AIRBORNE',source:h.id,target:t.id,team:h.team,x:t.x,z:t.z,radius:4,color:'#b0e2f2'});}
          }
          if(hit&&!tornado){h.qStacks=Math.min(2,h.qStacks+1);h.qStackUntil=this.time+7;}
          spell.toX=spinning?h.x:end.x;spell.toZ=spinning?h.z:end.z;spell.radius=radius;
        }
      }
      if(key==='W'){const center=P(h.x+dir.x*8,h.z+dir.z*8),half=9+rank;this._zone('yasuo-wall',h,{...center,fromX:center.x-dir.z*half,fromZ:center.z+dir.x*half,toX:center.x+dir.z*half,toZ:center.z-dir.x*half,radius:1.5,until:this.time+4});spell.x=center.x;spell.z=center.z;spell.toX=center.x-dir.z*half;spell.toZ=center.z+dir.x*half;spell.radius=half;}
      if(key==='E'){const length=distance(h,target)||1,dx=(target.x-h.x)/length,dz=(target.z-h.z)/length;this._dash(h,target.x+dx*5,target.z+dz*5,23);h.dashLocks[target.id]=this.time+8;h.dashComboUntil=this.time+.45;this._damage(target,35+rank*20+ap*.6,'magic',h,'E');spell.target=target.id;spell.toX=h.x;spell.toZ=h.z;spell.x=h.x;spell.z=h.z;}
      if(key==='R'){const victims=this._combatEnemies({x:target.x,z:target.z,team:h.team},13,t=>t.kind==='hero'&&t.airborneUntil>this.time);if(!victims.includes(target))victims.push(target);this._dash(h,target.x-2*dir.x,target.z-2*dir.z,62);for(const t of victims){this._airborne(t,1.1);this._damage(t,130+rank*80+h.attack*1.2,'physical',h,'R');}h.flow=100;h.armorPenUntil=this.time+10;spell.target=target.id;spell.x=target.x;spell.z=target.z;spell.toX=h.x;spell.toZ=h.z;spell.radius=13;}
    }else if(h.heroId==='teemo'){
      if(key==='Q')this._tracking(h,target,40+rank*35+ap*.8,'magic','Q').effect='blind';
      if(key==='W'){h.teemoRunUntil=this.time+3;spell.x=h.x;spell.z=h.z;spell.radius=4;}
      if(key==='R'){const point=P(h.x+dir.x*Math.min(d,25),h.z+dir.z*Math.min(d,25)),spot=this.navigation?this.navigation.nearestPoint(point):point;const existing=this.zones.filter(zone=>zone.type==='teemo-mushroom'&&zone.sourceId===h.id&&!zone.dead);if(existing.length>=8)existing[0].dead=true;h.shroomCharges--;this._zone('teemo-mushroom',h,{...spot,radius:4.5,damage:40+rank*25+ap*.25,poisonDps:30+rank*20+ap*.15,armedAt:this.time+.8,until:this.time+180});spell.x=spot.x;spell.z=spot.z;spell.toX=spot.x;spell.toZ=spot.z;spell.radius=4.5;}
    }else if(h.heroId==='jinx'){
      if(key==='Q'){h.rocketMode=!h.rocketMode;h.attackRange=CHAMP.jinx.attackRange+(h.rocketMode?6+rank:0);h.minigunStacks=0;spell.x=h.x;spell.z=h.z;spell.toX=h.x;spell.toZ=h.z;spell.radius=h.rocketMode?5:3;spell.rocket=h.rocketMode;}
      if(key==='W')this._projectile(h,dir,{skill:'W',range:62,speed:51,radius:1.5,damage:25+rank*25+h.attack*1.45,damageType:'physical',effect:'zap'});
      if(key==='E'){const spot=P(h.x+dir.x*Math.min(d,30),h.z+dir.z*Math.min(d,30));for(let i=-1;i<=1;i++){const point=P(spot.x-dir.z*i*5,spot.z+dir.x*i*5),safe=this.navigation?this.navigation.nearestPoint(point):point;this._zone('jinx-chompers',h,{...safe,radius:2.7,damage:45+rank*25+ap,armedAt:this.time+.7,until:this.time+5});}spell.x=spot.x;spell.z=spot.z;spell.toX=spot.x;spell.toZ=spot.z;spell.radius=8;}
      if(key==='R')this._projectile(h,dir,{skill:'R',range:270,speed:42,radius:3,damage:110+rank*90+h.attack*1.1,missingRatio:.15+rank*.05,damageType:'physical',heroesOnly:true,effect:'jinxRocket'});
    }
    equipmentOnCast(this,h,key);this._event('spell',spell);return true;
  }
  _dash(h,x,z,max){const d=Math.hypot(x-h.x,z-h.z);if(d>.01){const endpoint=P(clamp(h.x+(x-h.x)*Math.min(1,max/d),-119,119),clamp(h.z+(z-h.z)*Math.min(1,max/d),-119,119)),p=this.navigation?this.navigation.nearestPoint(endpoint):endpoint;h.x=p.x;h.z=p.z;}h._route=null;h.facing=Math.atan2(z-h.z,x-h.x);}
  _shield(e,amount,duration){e.shield=Math.max(e.shield||0,amount);e.shieldUntil=this.time+duration;}
  _projectile(h,dir,data){const p={id:++this._id,sourceId:h.id,team:h.team,hero:h.heroId,x:h.x,z:h.z,dx:dir.x,dz:dir.z,traveled:0,hit:new Set(),age:0,speed:40,range:45,radius:1.5,damage:50,damageType:'magic',...data};this.projectiles.push(p);return p;}
  _tracking(h,t,damage,type,skill='attack'){return this._projectile(h,P(0,0),{targetId:t.id,skill,range:150,speed:55,radius:.6,damage,damageType:type});}
  _triggerMark(h,t){if(t.markedBy===h.id&&t.markedUntil>this.time){t.markedUntil=0;const amount=h.heroId==='ezreal'?80+h.level*10+h.ap*.65:20+h.level*10+h.ap*.25;this._damage(t,amount,'magic',h,'mark',true);}}
  _projectiles(dt){
    for(const p of this.projectiles){if(p.dead)continue;p.age+=dt;const source=this.getEntity(p.sourceId);if(!source){p.dead=true;continue;}const old=P(p.x,p.z);let trackingHit=null;
      if(p.targetId){const t=this.getEntity(p.targetId);if(!t?.alive){p.dead=true;continue;}const d=distance(p,t);p.dx=(t.x-p.x)/(d||1);p.dz=(t.z-p.z)/(d||1);if(d<p.speed*dt+t.radius)trackingHit=t;}
      if(p.returning){const d=distance(p,source);p.dx=(source.x-p.x)/(d||1);p.dz=(source.z-p.z)/(d||1);if(d<p.speed*dt+1){p.dead=true;continue;}}
      if(p.effect==='jinxRocket')p.speed=Math.min(76,42+p.traveled*.2);
      p.x+=p.dx*p.speed*dt;p.z+=p.dz*p.speed*dt;p.traveled+=p.speed*dt;
      const wall=source.kind!=='tower'&&this.zones.find(zone=>!zone.dead&&zone.type==='yasuo-wall'&&zone.team!==p.team&&zone.until>this.time&&(segmentsCross(old,p,P(zone.fromX,zone.fromZ),P(zone.toX,zone.toZ))||lineDistance(p,P(zone.fromX,zone.fromZ),P(zone.toX,zone.toZ))<zone.radius));
      if(wall){p.dead=true;this._event('spell',{hero:'yasuo',key:'WALL_BLOCK',source:wall.sourceId,team:wall.team,x:p.x,z:p.z,radius:2,color:'#9cd7e7'});continue;}
      if(trackingHit){this._projectileHit(p,trackingHit,source);p.dead=true;continue;}
      if(!p.targetId){const candidates=this.entities.filter(e=>e.alive&&e.team!==p.team&&e.kind!=='ward'&&!p.hit.has(e.id)&&(!isStructure(e)||p.hitStructures)&&(!p.heroesOnly||e.kind==='hero'||(p.hitStructures&&isStructure(e)))&&lineDistance(e,old,p)<p.radius+e.radius).sort((a,b)=>distance(a,old)-distance(b,old));for(const e of candidates){this._projectileHit(p,e,source);p.hit.add(e.id);if(p.falloff)p.damage*=p.falloff;if(!p.pierce||(p.maxHits&&p.hit.size>=p.maxHits)){p.dead=true;break;}}}
      if(p.traveled>=p.range&&!p.returning){if(p.returnTo){p.returning=true;p.damageType='true';p.hit.clear();p.traveled=0;}else{extendedProjectileEnd(this,p,source);p.dead=true;}}
      if(p.age>12||Math.abs(p.x)>150||Math.abs(p.z)>150)p.dead=true;
    }
    this.projectiles=this.projectiles.filter(p=>!p.dead);
  }
  _projectileHit(p,t,h){
    if(!t.alive||t.invulnerableUntil>this.time)return;
    if(p.group){t.lastVolley=t.lastVolley||{};if(t.lastVolley[p.group])return;t.lastVolley[p.group]=true;}
    if(p.effect==='essence'){t.markedBy=h.id;t.markedUntil=this.time+6;this._event('spell',{key:'MARK',hero:h.heroId,source:h.id,target:t.id,x:t.x,z:t.z,color:'#f1ca66',radius:3});return;}
    if(p.skill==='attack'&&(p.blindMiss||h.blindUntil>this.time)){if(h.isPlayer)this._event('message',{x:t.x,z:t.z,source:h.id,target:t.id,text:'致盲中 · 普通攻击未命中'});return;}
    if(extendedProjectileHit(this,p,t,h))return;
    if(p.effect==='jinxRocket'){const scale=.25+.75*clamp(p.traveled/65,0,1);for(const victim of this._combatEnemies({x:t.x,z:t.z,team:h.team},13)){const amount=(p.damage*scale+(victim.maxHp-victim.hp)*p.missingRatio)*(victim.id===t.id?1:.8);this._damage(victim,amount,'physical',h,'R');}this._event('spell',{hero:'jinx',key:'ROCKET_HIT',source:h.id,target:t.id,team:h.team,x:t.x,z:t.z,radius:13,color:'#f6ae70'});return;}
    const spellshield=t.spellshieldCooldownUntil;this._damage(t,p.damage,p.damageType,h,p.skill);if(t.spellshieldCooldownUntil!==spellshield)return;
    if(p.rocket){for(const victim of this._combatEnemies({x:t.x,z:t.z,team:h.team},7,e=>e.id!==t.id))this._damage(victim,p.damage*.8,'physical',h,'ROCKET_ATTACK');this._event('spell',{hero:'jinx',key:'EXPLOSION',source:h.id,target:t.id,team:h.team,x:t.x,z:t.z,radius:7,color:'#e9ae77'});}
    if(p.skill==='attack')this._onAttackHit(h,t,p.damage);
    if(!t.alive)return;const immune=this._controlImmune(t);
    if(p.effect==='charm'&&!immune){t.charmUntil=this.time+1.5;t.charmSource=h.id;t.slowUntil=this.time+1.5;t.slowPower=.6;}
    if(p.effect==='root'){if(!immune)t.rootUntil=this.time+1.8;t.markedBy=h.id;t.markedUntil=this.time+6;}
    if((p.effect==='slow'||h.heroId==='ashe')&&!immune){t.slowUntil=this.time+2;t.slowPower=.3;}
    if(p.effect==='blind'&&!immune)t.blindUntil=this.time+1.6+(h.skillLevels.Q||1)*.2;
    if(p.effect==='tornado'){this._airborne(t,1.2);this._event('spell',{hero:'yasuo',key:'AIRBORNE',source:h.id,target:t.id,team:h.team,x:t.x,z:t.z,radius:4,color:'#b0e2f2'});}
    if(p.effect==='zap'){if(!immune){t.slowUntil=this.time+2;t.slowPower=.5;}t.revealedUntil=this.time+2;}
    if(p.effect==='iceStun'){if(!immune)t.stunUntil=this.time+clamp(1.5+p.traveled/55,1.5,3.5);for(const e of this._enemies(h,300,e=>!isStructure(e)))if(e.id!==t.id&&distance(e,t)<11){this._damage(e,p.damage*.5,'magic',h,'R');if(!this._controlImmune(e)){e.slowUntil=this.time+3;e.slowPower=.5;}}this._event('spell',{key:'ICE',hero:'ashe',source:h.id,target:t.id,x:t.x,z:t.z,radius:10,color:'#a4e8ff'});}
    if(p.effect==='ezQ'){for(const key of ['Q','W','E','R'])h.cooldowns[key]=Math.max(0,h.cooldowns[key]-1.5);h.ezPassiveUntil=this.time+6;h.ezPassiveStacks=Math.min(5,(h.ezPassiveStacks||0)+1);}
    if(p.skill!=='mark')this._triggerMark(h,t);
  }
  _onAttackHit(h,t,amount){if(h.kind!=='hero')return;if(h.lifesteal)h.hp=Math.min(h.maxHp,h.hp+amount*h.lifesteal*equipmentHealingMultiplier(h,this.time));if(h.heroId==='ashe'&&!this._controlImmune(t)){t.slowUntil=this.time+2;t.slowPower=.25;}if(h.heroId==='teemo'&&h.skillLevels.E&&!isStructure(t)&&t.alive){const rank=h.skillLevels.E;this._damage(t,8+rank*8+h.ap*.3,'magic',h,'E');this._poison(t,h,5+rank*5+h.ap*.1,4,'E_POISON');}extendedAnyAttackHit(this,h,t);extendedAttackHit(this,h,t,amount);equipmentOnAttack(this,h,t);}
  _detonate(zone){if(zone.dead)return;zone.dead=true;const h=this.getEntity(zone.sourceId);if(!h)return;for(const t of this._enemies(zone,zone.radius,e=>!isStructure(e))){this._damage(t,zone.damage,'magic',h,'E');t.markedBy=h.id;t.markedUntil=this.time+6;}this._event('spell',{key:'E2',hero:'lux',source:h.id,team:h.team,x:zone.x,z:zone.z,radius:zone.radius,color:'#efd7ff'});if(h.lightZone===zone)h.lightZone=null;}
  _canHitStructure(t,h){if(t.kind==='tower'){if(t.tier===4)return this.entities.some(e=>e.team===t.team&&e.kind==='inhibitor'&&!e.alive);return !this.entities.some(e=>e.alive&&e.team===t.team&&e.kind==='tower'&&e.lane===t.lane&&e.tier<t.tier);}if(t.kind==='inhibitor')return !this.entities.some(e=>e.alive&&e.team===t.team&&e.kind==='tower'&&e.lane===t.lane);if(t.kind==='nexus')return this.entities.some(e=>e.team===t.team&&e.kind==='inhibitor'&&!e.alive)&&!this.entities.some(e=>e.alive&&e.team===t.team&&e.kind==='tower'&&e.tier===4);return true;}
  _damage(t,amount,type,source,key='',skipMark=false){
    if(!t.alive||t.invulnerableUntil>this.time||amount<=0)return 0;if(isStructure(t)&&(!source||!this._canHitStructure(t,source)))return 0;
    amount=summonerDamageAmount(this,source,amount,type);amount=extendedDamageAmount(this,t,source,amount,type,key);amount=equipmentDamage(this,t,source,amount,type,key);if(amount<=0)return 0;
    if(t.heroId==='yasuo'&&t.flow>=100&&source?.kind==='hero'){t.flow=0;this._shield(t,75+t.level*14,1.5);this._event('spell',{hero:'yasuo',key:'FLOW',source:t.id,team:t.team,x:t.x,z:t.z,radius:4,color:'#b4deed'});}
    if(t.kind==='ward'){if(key!=='attack')return 0;amount=1;}
    if(isStructure(t)){const hasWave=this.entities.some(e=>e.alive&&e.kind==='minion'&&e.team===source.team&&distance(e,t)<29);if(!hasWave)amount*=.18;}
    let resistance=type==='magic'?t.magicResist:type==='physical'?t.armor:0;if(type==='physical'&&source?.heroId==='yasuo'&&source.armorPenUntil>this.time)resistance*=.6;amount*=100/(100+Math.max(0,resistance||0));if(t.fortifyUntil>this.time)amount*=.65;
    amount=absorbSummonerBarrier(this,t,amount);if(t.shield>0&&t.shieldUntil>this.time){const absorbed=Math.min(t.shield,amount);t.shield-=absorbed;amount-=absorbed;}
    t.hp=Math.max(0,t.hp-amount);t.lastDamagedAt=this.time;this._cancelRecall(t);
    if(t.heroId==='teemo')this._breakStealth(t);
    if(source){t.lastAttacker=source.id;if(t.kind==='hero'&&source.kind==='hero'){t.contributors=t.contributors||{};t.contributors[source.id]=this.time;for(const tower of this.entities.filter(e=>e.alive&&e.kind==='tower'&&e.team===t.team&&distance(e,source)<e.attackRange))tower.aggroId=source.id;}if(t.kind==='monster')t.aggroId=source.id;}
    this._event('damage',{x:t.x,z:t.z,target:t.id,source:source?.id,amount:Math.round(amount),team:source?.team,key,color:type==='true'?'#ffffff':type==='magic'?'#bb91ff':'#ffce72'});
    extendedAfterDamage(this,source,t,amount,key);
    if(t.hp<=0)this._die(t,source);return amount;
  }
  _die(t,killer){
    if(!t.alive)return;t.alive=false;t.hp=0;this._event('death',{x:t.x,z:t.z,target:t.id,source:killer?.id,team:t.team,hero:t.heroId,text:t.kind==='hero'?`${t.name} 已阵亡`:t.kind==='tower'?`${t.name} 被摧毁`:t.name||'单位被击败'});
    if(t.kind==='hero'){
      resetSummonerState(this,t);
      extendedDeath(this,t);
      t.deaths++;t.respawnAt=this.time+(this.practice&&t.isPlayer?2:9+t.level*1.6);t.command=t.isPlayer?{type:'stop'}:{type:'ai'};t.recallAt=0;t.lightZone=null;t.spinUntil=0;t.shield=0;
      if(t.heroId==='yasuo'){t.dashComboUntil=0;t.qStacks=0;t.qStackUntil=0;t.flow=0;t.dashLocks={};t.armorPenUntil=0;}
      let h=killer?.kind==='hero'?killer:null;if(!h){const id=Object.entries(t.contributors||{}).filter(([id,at])=>this.time-at<10&&this.getEntity(Number(id))?.kind==='hero').sort((a,b)=>b[1]-a[1])[0]?.[0];h=this.getEntity(Number(id));}
      if(h&&h.team!==t.team){h.kills++;this.score[h.team]++;this._award(h,300,95);this._excite(h);extendedKill(this,h);this._event('message',{text:`${h.name} 击杀了 ${t.name}`,team:h.team});for(const[id,at]of Object.entries(t.contributors||{})){const ally=this.getEntity(Number(id));if(ally?.kind==='hero'&&ally.id!==h.id&&ally.team===h.team&&this.time-at<10){ally.assists++;this._award(ally,100,55);this._excite(ally);extendedKill(this,ally);}}}t.contributors={};
    }else if(t.kind==='minion'){
      if(killer?.kind==='hero'){killer.cs++;this._award(killer,t.minionType==='cannon'?60:t.minionType==='super'?80:t.minionType==='melee'?21:14,0);}
      const xp=t.minionType==='melee'?34:t.minionType==='cannon'?60:22;for(const h of this.entities.filter(e=>e.alive&&e.kind==='hero'&&e.team!==t.team&&distance(e,t)<33))this._award(h,0,xp);
    }else if(t.kind==='tower'||t.kind==='inhibitor'){
      if(killer){for(const h of this.entities.filter(e=>e.kind==='hero'&&e.team===killer.team)){this._award(h,t.kind==='tower'?100:35,0);if(h.heroId==='jinx'&&distance(h,t)<45)this._excite(h);}if(killer.kind==='hero')this._award(killer,t.kind==='tower'?150:65,60);}
      if(t.kind==='inhibitor'){t.respawnAt=this.time+180;this._event('message',{text:`${t.team==='blue'?'蓝':'红'}方${{top:'上路',mid:'中路',bot:'下路'}[t.lane]}水晶被击碎 · 超级士兵即将出击`});}
    }else if(t.kind==='monster'){
      t.respawnAt=this.time+t.respawnTime;
      if(killer?.kind==='hero'){this._award(killer,t.reward,t.monsterType==='baron'?250:t.monsterType==='dragon'?160:85);killer.cs++;
        if(t.monsterType==='dragon'||t.monsterType==='baron'){for(const h of this.entities.filter(e=>e.kind==='hero'&&e.team===killer.team)){this._award(h,100,80);if(t.monsterType==='baron')h.baronUntil=this.time+100;else{h.dragonStacks=(h.dragonStacks||0)+1;h.attack+=6;h.ap+=10;}}this._event('message',{text:`${killer.team==='blue'?'蓝':'红'}方击杀 ${t.name} · 全队获得强化`,team:killer.team});}
        if(t.monsterType==='blue')killer.blueBuffUntil=this.time+90;if(t.monsterType==='red')killer.redBuffUntil=this.time+90;
      }
    }else if(t.kind==='nexus'){this.winner=ENEMY[t.team];this._event('victory',{team:this.winner,text:this.winner==='blue'?'胜利':'失败',x:t.x,z:t.z});}
  }
  _award(h,gold,xp){h.gold+=gold;if(gold&&h.isPlayer)this._event('gold',{x:h.x,z:h.z,source:h.id,amount:gold});if(h.level>=18)return;h.xp+=xp;while(h.xp>=h.xpToNext&&h.level<18){h.xp-=h.xpToNext;this._level(h);}}
  _level(h){h.level++;h.xpToNext=120+(h.level-1)*65;h.skillPoints++;if(!h.isPlayer||this.practice){const prefer=(h.level===6||h.level===11||h.level===16)?['R','Q','W','E']:h.level===2?['W','Q','E']:h.level===3?['E','Q','W']:['Q','W','E','R'];for(const key of prefer){const rank=h.skillLevels[key],needed=key==='R'?[6,11,16][rank]:rank*2+1;if(rank<(key==='R'?3:5)&&h.level>=needed){this._learn(h,key);break;}}}this._recomputeStats(h);h.hp=Math.min(h.maxHp,h.hp+85);h.mana=Math.min(h.maxMana,h.mana+(h.baseMana?35:0));this._event('level',{x:h.x,z:h.z,source:h.id,amount:h.level,text:`${h.name} 升至 ${h.level} 级`,team:h.team});}
  _spawnWave(){
    this._wave++;for(const team of ['blue','red'])for(const lane of ['top','mid','bot']){
      const path=team==='blue'?LANES[lane]:[...LANES[lane]].reverse(),start=path[0];const types=['melee','melee','melee','ranged','ranged','ranged'];if(this._wave%3===0)types.push('cannon');if(this.entities.some(e=>e.kind==='inhibitor'&&e.team===ENEMY[team]&&e.lane===lane&&!e.alive))types.push('super');
      for(let i=0;i<types.length;i++){const type=types[i],bonus=Math.floor(this.time/90),hp=({melee:260,ranged:185,cannon:560,super:1000}[type])+bonus*35;this._entity({kind:'minion',team,lane,minionType:type,name:type==='super'?'超级士兵':type==='cannon'?'炮车':type==='ranged'?'远程士兵':'近战士兵',x:start.x+(i%2?1.2:-1.2),z:start.z+(i%2?1.2:-1.2),hp,maxHp:hp,attack:({melee:19,ranged:23,cannon:38,super:80}[type])+bonus*3,armor:type==='super'?40:5,magicResist:0,attackRange:type==='ranged'||type==='cannon'?16:4.2,speed:type==='super'?10:10.8,radius:type==='super'?2.4:type==='cannon'?1.9:1.2,path,pathIndex:1,spawnWait:i*.38,attackCooldown:Math.random()*.5});}
    }
    if(this._wave===1)this._event('message',{text:'第一波兵线已出发 · 最后一击获取金币'});
  }
  _walk(e,target,dt,stopDistance=.4){
    if(e.rootUntil>this.time||e.stunUntil>this.time||e.invulnerableUntil>this.time)return;
    if(distance(e,target)<=stopDistance)return;
    if(e.kind==='hero'&&this.navigation){
      const nav=this.navigation,goal=nav.nearestPoint(target);if(!nav.pointClear(e)){const point=nav.nearestPoint(e);e.x=point.x;e.z=point.z;e._route=null;}
      if(nav.segmentClear(e,goal)){target=goal;e._route=null;}
      else{
        const route=e._route;
        if(!route||distance(route.target,goal)>6||this.time>route.until){const path=nav.findPath(e,goal);e._route={points:path.points,index:0,target:goal,until:this.time+1};if(e.isPlayer&&target===e.command&&['move','attackMove'].includes(e.command.type)&&distance(path.destination,goal)>.5){e.command.x=path.destination.x;e.command.z=path.destination.z;e._route.target=path.destination;}}
        const current=e._route;if(!current.points.length)return;
        while(current.index<current.points.length-1&&distance(e,current.points[current.index])<.7)current.index++;
        // Advance to a later waypoint whenever there is an unobstructed shortcut.
        for(let i=current.points.length-1;i>current.index;i--)if(nav.segmentClear(e,current.points[i])){current.index=i;break;}
        target=current.points[current.index];if(current.index<current.points.length-1)stopDistance=.15;
      }
    }else if(e.kind==='hero')for(const nexus of this.entities.filter(n=>n.alive&&n.kind==='nexus')){
      if(target.id===nexus.id||distance(target,nexus)<7)continue;
      const length=distance(e,target),dx=(target.x-e.x)/(length||1),dz=(target.z-e.z)/(length||1),along=(nexus.x-e.x)*dx+(nexus.z-e.z)*dz;
      if(along>0&&along<Math.min(length,20)&&lineDistance(nexus,e,target)<7.6){const px=-dz,pz=dx,side=(e.x-nexus.x)*px+(e.z-nexus.z)*pz>=0?1:-1;target=P(nexus.x+px*10*side,nexus.z+pz*10*side);stopDistance=.4;break;}
    }
    const d=distance(e,target);if(d<=stopDistance)return;let speed=(e.speed||10)*extendedMoveSpeed(this,e,target)*summonerMoveMultiplier(this,e);if(e.slowUntil>this.time)speed*=1-(e.slowPower||.3)*(1-(e.slowResist||0));if(e.hasteUntil>this.time)speed*=1.35;if(e.baronEmpowered)speed*=1.15;if(e.excitedUntil>this.time)speed*=1.65;if(e.heroId==='teemo'){if(e.teemoRunUntil>this.time)speed*=1.4;else if(e.skillLevels.W&&this.time-e.lastDamagedAt>5)speed*=1.1+e.skillLevels.W*.015;}const step=Math.min(d-stopDistance,speed*dt),next=P(clamp(e.x+(target.x-e.x)/d*step,-120,120),clamp(e.z+(target.z-e.z)/d*step,-120,120));if(e.kind==='hero'&&this.navigation&&!this.navigation.segmentClear(e,next)){e._route=null;return;}e.x=next.x;e.z=next.z;e.facing=Math.atan2(target.z-e.z,target.x-e.x);e.moving=true;if(e.heroId==='yasuo')e.flow=Math.min(100,(e.flow||0)+step*3.5);
  }
  _attack(e,t){
    if(!t?.alive||t.invulnerableUntil>this.time||e.attackCooldown>0||e.stunUntil>this.time||e.airborneUntil>this.time||e.invulnerableUntil>this.time||distance(e,t)>e.attackRange+t.radius)return false;
    if(['hero','minion','tower'].includes(e.kind)&&!this.isVisible(t,e.team))return false;
    if(isStructure(t)&&!this._canHitStructure(t,e))return false;
    let speed=e.kind==='hero'?e.attackSpeed:e.kind==='tower'?.8:e.kind==='monster'?.7:.85;
    if(e.kind==='hero'){speed*=extendedAttackSpeed(this,e);if(e.heroId==='ashe'&&e.qUntil>this.time)speed*=1.65;if(e.ezPassiveUntil>this.time)speed*=1+(e.ezPassiveStacks||1)*.1;}
    if(e.excitedUntil>this.time)speed*=1.65;if(e.ambushUntil>this.time)speed*=1.4;
    if(e.heroId==='jinx'){if(e.rocketMode&&e.mana<20){e.rocketMode=false;e.attackRange=CHAMP.jinx.attackRange;}if(e.rocketMode){e.mana-=20;speed*=.9;}else{e.minigunStacks=Math.min(3,(e.minigunStacks||0)+1);e.minigunUntil=this.time+3;speed*=1+e.minigunStacks*(.1+(e.skillLevels.Q||1)*.025);}}
    e.attackCooldown=1/speed;e.facing=Math.atan2(t.z-e.z,t.x-e.x);e.lastAttackAt=this.time;let amount=(e.attack||20)+(e.baronUntil>this.time?20:0);if(e.baronEmpowered)amount*=1.5;
    const critical=e.kind==='hero'&&Math.random()<e.crit;if(critical)amount*=(1.75+e.critPower)*(e.heroId==='yasuo'?.9:1);if(e.heroId==='jinx'&&e.rocketMode)amount*=1.1;if(e.heroId==='ashe'&&e.qUntil>this.time)amount*=1.28;if(e.heroId==='garen'&&e.qUntil>this.time){amount+=45+e.level*6;e.qUntil=0;if(!this._controlImmune(t))t.silenceUntil=this.time+1.4;}
    if(e.kind==='tower'&&t.kind==='hero'){e.focusStacks=e.lastTargetId===t.id?Math.min(4,(e.focusStacks||0)+1):0;amount*=1+e.focusStacks*.25;}e.lastTargetId=t.id;
    if(e.kind==='hero')amount=extendedAttackAmount(this,e,t,amount);
    this._breakStealth(e);this._event('attack',{source:e.id,target:t.id,hero:e.heroId,team:e.team,key:'attack',rocket:e.heroId==='jinx'&&e.rocketMode,x:t.x,z:t.z,fromX:e.x,fromZ:e.z,toX:t.x,toZ:t.z,color:critical?'#ffc763':e.team==='blue'?'#55ceea':'#fc6978'});
    if(e.attackRange>8){const p=this._tracking(e,t,amount,'physical');p.blindMiss=e.blindUntil>this.time;if(e.heroId==='jinx'&&e.rocketMode){p.rocket=true;p.radius=1;p.speed=42;}}
    else if(e.blindUntil>this.time){if(e.isPlayer)this._event('message',{text:'致盲中 · 普通攻击未命中'});}
    else{this._damage(t,amount,'physical',this.getEntity(e.summonOwner)||e,'attack');this._triggerMark(e,t);this._onAttackHit(e,t,amount);}
    if(e.redBuffUntil>this.time&&t.kind==='hero'){if(!this._controlImmune(t)){t.slowUntil=this.time+2;t.slowPower=.3;}this._damage(t,10+e.level*2,'true',e,'red-buff');}
    return true;
  }
  _heroUpdate(h,dt){
    h.spinning=h.spinUntil>this.time;
    if(h.heroId==='yasuo'&&h.qStackUntil<this.time)h.qStacks=0;
    if(h.heroId==='jinx'&&h.minigunUntil<this.time)h.minigunStacks=0;
    if(h.heroId==='teemo'){
      const moved=Math.hypot(h.x-(h._stillX??h.x),h.z-(h._stillZ??h.z))>.025,bush=BUSHES.some(b=>distance(h,b)<8);
      if(moved&&!bush){this._breakStealth(h);}else if(this.time-(h.lastActionAt||0)>.1&&this.time-h.lastDamagedAt>2){h.stealthStill=(h.stealthStill||0)+dt;if(h.stealthStill>2)h.stealthed=true;}
      h._stillX=h.x;h._stillZ=h.z;
      if(h.skillLevels.R&&h.shroomCharges<3){h.shroomRecharge+=dt*(this.practice&&h.isPlayer?3:1);const recharge=28-h.skillLevels.R*4;if(h.shroomRecharge>=recharge){h.shroomRecharge-=recharge;h.shroomCharges++;}}else h.shroomRecharge=0;
    }
    for(const key of Object.keys(h.cooldowns))h.cooldowns[key]=Math.max(0,h.cooldowns[key]-dt*(this.practice&&h.isPlayer?3:1));for(const slot of h.inventory)if(slot)slot.cooldown=Math.max(0,(slot.cooldown||0)-dt*(this.practice?3:1));
    if(!h.alive){if(this.time>=h.respawnAt){h.alive=true;h.hp=h.maxHp;h.mana=h.maxMana;h.x=h.spawnX;h.z=h.spawnZ;h.command=h.isPlayer?{type:'stop'}:{type:'ai'};for(const key of BUFFS)h[key]=0;h.charmUntil=0;h.poisons={};h.stealthed=false;h.stealthStill=0;this._event('message',{text:`${h.name} 已复活`,team:h.team});}return;}
    h.gold+=dt*1.7;if(h.wardCharges<2){h.wardTimer+=dt;if(h.wardTimer>80){h.wardTimer=0;h.wardCharges++;}}else h.wardTimer=0;
    const fountain=this._nearBase(h),healingPenalty=equipmentHealingMultiplier(h,this.time);h.hp=Math.min(h.maxHp,h.hp+dt*(fountain?h.maxHp*.18:1.1+(h.heroId==='garen'&&this.time-h.lastDamagedAt>7?h.maxHp*.012:0))*healingPenalty);h.mana=Math.min(h.maxMana,h.mana+dt*(fountain?h.maxMana*.2:2+h.manaRegen+(h.blueBuffUntil>this.time?9:0)));if(this.practice&&h.isPlayer)h.mana=h.maxMana;
    if(h.potionUntil>this.time)h.hp=Math.min(h.maxHp,h.hp+25*dt*healingPenalty);
    if(h.shieldUntil<this.time)h.shield=0;
    if(h.igniteUntil>this.time&&h.igniteTick<=this.time){h.igniteTick+=1;this._damage(h,h.igniteDamage,'true',this.getEntity(h.igniteSource),h.igniteKey||'F');if(!h.alive)return;}
    equipmentUpdate(this,h,dt);if(!h.alive)return;updateSummonerAI(this,h);if(updateSummoner(this,h))return;if(extendedHeroUpdate(this,h,dt))return;
    if(h.recallAt){if(this.time>=h.recallAt){h.x=h.spawnX;h.z=h.spawnZ;h.recallAt=0;h.command=h.isPlayer?{type:'stop'}:{type:'ai'};this._event('recall',{source:h.id,x:h.x,z:h.z,team:h.team,text:'回城完成'});}return;}
    if(h.spinUntil>this.time&&h.spinTick<=this.time){h.spinTick+=.35;for(const t of this._enemies(h,9,e=>!isStructure(e)))this._damage(t,h.spinDamage,'physical',h,'E');this._event('spell',{source:h.id,hero:'garen',key:'SPIN',x:h.x,z:h.z,radius:8,team:h.team,color:'#f1d77f'});}
    if(h.stunUntil>this.time||h.invulnerableUntil>this.time)return;
    if(h.charmUntil>this.time){const charmer=this.getEntity(h.charmSource);if(charmer)this._walk(h,charmer,dt,3);return;}
    if(!h.isPlayer){this._aiHero(h,dt);return;}
    const cmd=h.command;if(cmd.type==='move'){this._walk(h,cmd,dt);if(distance(h,cmd)<.6)h.command={type:'guard'};}
    else if(cmd.type==='attack'){const t=this.getEntity(cmd.targetId);if(!this._canAttackTarget(h,t)){h.command={type:'guard'};return;}if(distance(h,t)>h.attackRange+t.radius-.5)this._walk(h,t,dt,h.attackRange+t.radius-1);this._attack(h,t);}
    else if(cmd.type==='attackMove'){
      let t=this.getEntity(cmd.targetId);
      // Keep the chosen target through the attack cooldown; a small tolerance avoids boundary jitter.
      if(!this._canAttackTarget(h,t,false,false)||distance(h,t)>h.attackRange+t.radius+1)t=null;
      if(!t)t=this._attackMoveTarget(h,{x:cmd.cursorX??cmd.x,z:cmd.cursorZ??cmd.z});
      cmd.targetId=t?.id||0;
      if(t){if(distance(h,t)>h.attackRange+t.radius)this._walk(h,t,dt,h.attackRange+t.radius-.2);this._attack(h,t);}
      else this._walk(h,cmd,dt);
    }
    else if(cmd.type==='guard'){const t=this._nearest(h,h.attackRange,e=>e.kind!=='monster');if(t)this._attack(h,t);}
  }
  _aiHero(h,dt){
    h.aiThink-=dt;const health=h.hp/h.maxHp;
    if(health<.23&&this.time-h.lastDamagedAt<6){h.retreatUntil=this.time+5;}
    if(h.retreatUntil>this.time||health<.35&&this._nearBase(h)){this._walk(h,BASE[h.team],dt,4);if(this._nearBase(h))h.retreatUntil=0;return;}
    if(health<.42&&this.time-h.lastDamagedAt>6&&!this._nearBase(h)){h.recallAt=this.time+6;h.command={type:'ai'};this._event('recall',{x:h.x,z:h.z,source:h.id,team:h.team});return;}
    if(this.time>(h.aiWardNext||45)&&Math.abs(h.x+h.z)<55&&!this._nearBase(h)&&h.wardCharges>0){h.aiWardNext=this.time+65;h.wardCharges--;this._addWard(h,h.x+4,h.z-4,false);}
    if(this._nearBase(h)&&h.gold>1200&&h.inventory.some(s=>!s)){const mage=['ahri','lux','teemo','annie','brand','morgana','veigar','ziggs','fizz','sona'].includes(h.heroId);let item=!h.inventory.some(Boolean)?(mage?'doran-ring':'doran-blade'):mage&&!h.inventory.some(s=>s?.id==='ludens')?'ludens':!h.inventory.some(s=>s?.id==='blade-ruined')?'blade-ruined':null;if(item&&buyEquipment(h,item,{canShop:true}).ok)this._recomputeStats(h);}
    let target=this.getEntity(h.aiTargetId);if(target&&!this.isVisible(target,h.team))target=null;
    if(h.aiThink<=0||!target?.alive){h.aiThink=.3+Math.random()*.2;target=this._nearest(h,36,e=>e.kind!=='nexus'||this._canHitStructure(e,h),h.lane==='jungle');h.aiTargetId=target?.id||0;}
    if(target?.alive){
      const hostileTower=this.entities.find(e=>e.alive&&e.kind==='tower'&&e.team===ENEMY[h.team]&&distance(e,h)<e.attackRange+4);const friendlyWave=hostileTower&&this.entities.some(e=>e.alive&&e.kind==='minion'&&e.team===h.team&&distance(e,hostileTower)<24);
      if(hostileTower&&!friendlyWave&&target.kind!=='hero'){const p=pathPoint(h.lane==='jungle'?'mid':h.lane,h.team==='blue'?.22:.78);this._walk(h,p,dt);return;}
      const d=distance(h,target);if(d<h.attackRange-3&&h.attackRange>10&&target.kind==='hero'&&target.attackRange<10){const away=P(h.x+(h.x-target.x)*.8,h.z+(h.z-target.z)*.8);this._walk(h,away,dt);}
      else if(d>h.attackRange+target.radius-.5)this._walk(h,target,dt,h.attackRange+target.radius-1);
      this._attack(h,target);
      if(target.kind==='hero'||target.kind==='monster'||this.practice){
        if(extendedAI(this,h,target)){}
        else if(h.heroId==='garen'){if(d<11)this._cast(h,'E',target.x,target.z,target.id);if(d<20)this._cast(h,'Q',target.x,target.z,target.id);if(health<.65)this._cast(h,'W',h.x,h.z);if(target.kind==='hero'&&target.hp/target.maxHp<.38&&d<17)this._cast(h,'R',target.x,target.z,target.id);}
        else if(h.heroId==='yasuo'){if(d<(h.qStacks>=2?47:20))this._cast(h,'Q',target.x,target.z,target.id);if(d<20&&d>8&&!((h.dashLocks[target.id]||0)>this.time))this._cast(h,'E',target.x,target.z,target.id);if(this.projectiles.some(p=>p.team!==h.team&&distance(p,h)<26))this._cast(h,'W',target.x,target.z,target.id);if(target.airborneUntil>this.time)this._cast(h,'R',target.x,target.z,target.id);}
        else if(h.heroId==='teemo'){if(d<31)this._cast(h,'Q',target.x,target.z,target.id);if(d>17||health<.5)this._cast(h,'W',h.x,h.z);if(h.skillLevels.R&&this.time>(h.aiShroomNext||0)&&d<31){if(this._cast(h,'R',target.x,target.z,target.id))h.aiShroomNext=this.time+5;}}
        else if(h.heroId==='jinx'){const clustered=this._combatEnemies({x:target.x,z:target.z,team:h.team},10).length>=2,wantRocket=d>24||clustered;if(wantRocket!==h.rocketMode&&h.mana>70)this._cast(h,'Q',h.x,h.z);if(d<60)this._cast(h,'W',target.x,target.z,target.id);if(target.kind==='hero'&&d<28)this._cast(h,'E',target.x,target.z,target.id);if(target.kind==='hero'&&target.hp/target.maxHp<.55&&d>15)this._cast(h,'R',target.x,target.z,target.id);}
        else{if(d<48)this._cast(h,'Q',target.x,target.z,target.id);if(d<42&&h.heroId!=='ashe')this._cast(h,'E',target.x,target.z,target.id);if(d<36)this._cast(h,'W',target.x,target.z,target.id);if(target.kind==='hero'&&target.hp/target.maxHp<.58&&d<48)this._cast(h,'R',target.x,target.z,target.id);}
      }else if(target.kind==='minion'){
        if(isExtended(h.heroId)){if(Math.random()<dt*.5)extendedAI(this,h,target);}
        else if(h.heroId==='yasuo'&&d<(h.qStacks>=2?47:20))this._cast(h,'Q',target.x,target.z,target.id);
        else if(h.heroId==='jinx'){const crowded=this.entities.filter(e=>e.alive&&e.kind==='minion'&&e.team!==h.team&&distance(e,target)<8).length>=3;if(crowded!==h.rocketMode&&h.mana>h.maxMana*.4)this._cast(h,'Q',h.x,h.z);}
        else if(d<45&&h.mana>h.maxMana*.55&&Math.random()<dt*.35)this._cast(h,'Q',target.x,target.z,target.id);
      }
      return;
    }
    if(h.lane==='jungle'){
      let camp=this.getEntity(h.campId);if(!camp?.alive){const camps=this.entities.filter(e=>e.alive&&e.kind==='monster'&&e.monsterType!=='baron'&&e.monsterType!=='dragon'&&(h.team==='blue'?e.x<0:e.x>0)).sort((a,b)=>distance(h,a)-distance(h,b));camp=camps[0];h.campId=camp?.id;}
      if(camp){this._walk(h,camp,dt,h.attackRange);if(distance(h,camp)<h.attackRange+camp.radius)this._attack(h,camp);return;}
    }
    const lane=h.lane==='jungle'?'mid':h.lane;const friendly=this.entities.filter(e=>e.alive&&e.kind==='minion'&&e.team===h.team&&e.lane===lane);const enemyStructures=this.entities.filter(e=>e.alive&&isStructure(e)&&e.team!==h.team&&e.team!=='neutral'&&this._canHitStructure(e,h)&&(e.lane===lane||e.kind==='nexus'||e.lane==='nexus')).sort((a,b)=>distance(h,a)-distance(h,b));
    if(friendly.length){const wave=friendly.sort((a,b)=>distance(a,BASE[ENEMY[h.team]])-distance(b,BASE[ENEMY[h.team]]))[0];const tower=enemyStructures.find(e=>e.kind==='tower');if(tower&&distance(wave,tower)<30)this._walk(h,tower,dt,h.attackRange+3);else this._walk(h,wave,dt,8);}
    else this._walk(h,pathPoint(lane,h.team==='blue'?.31:.69),dt,3);
  }
  _minionUpdate(e,dt){
    if(extendedSummonUpdate(this,e,dt))return;
    e.baronEmpowered=this.entities.some(h=>h.alive&&h.kind==='hero'&&h.team===e.team&&h.baronUntil>this.time&&distance(h,e)<42);
    if(e.spawnWait>0){e.spawnWait-=dt;return;}if(e.stunUntil>this.time)return;
    if(e.charmUntil>this.time){const charmer=this.getEntity(e.charmSource);if(charmer)this._walk(e,charmer,dt,3);return;}
    let t=this.getEntity(e.targetId);if(!t?.alive||distance(e,t)>29||!this.isVisible(t,e.team)||isStructure(t)&&!this._canHitStructure(t,e))t=null;
    if(!t){const targets=this._enemies(e,23,x=>x.kind!=='monster'&&this.isVisible(x,e.team)&&(!isStructure(x)||this._canHitStructure(x,e)));targets.sort((a,b)=>(a.kind==='minion'?-10:a.kind==='hero'?-5:0)+distance(e,a)-((b.kind==='minion'?-10:b.kind==='hero'?-5:0)+distance(e,b)));t=targets[0];e.targetId=t?.id||0;}
    if(t){if(distance(e,t)>e.attackRange+t.radius-.2)this._walk(e,t,dt,e.attackRange+t.radius-.4);this._attack(e,t);return;}
    const point=e.path[e.pathIndex];if(point){this._walk(e,point,dt,.2);if(distance(e,point)<1)e.pathIndex++;}else{const nexus=this.entities.find(x=>x.kind==='nexus'&&x.team===ENEMY[e.team]&&x.alive);if(nexus)this._attack(e,nexus);}
  }
  _towerUpdate(e){if(e.attackCooldown>0)return;let target=this.getEntity(e.aggroId);if(!target?.alive||distance(e,target)>e.attackRange+target.radius||!this.isVisible(target,e.team)){target=null;e.aggroId=0;}if(!target){const near=this._enemies(e,e.attackRange,t=>(t.kind==='minion'||t.kind==='hero')&&this.isVisible(t,e.team));near.sort((a,b)=>(a.kind==='minion'?-100:0)+distance(e,a)-((b.kind==='minion'?-100:0)+distance(e,b)));target=near[0];}if(target)this._attack(e,target);}
  _monsterUpdate(e,dt){if(e.charmUntil>this.time){const charmer=this.getEntity(e.charmSource);if(charmer)this._walk(e,charmer,dt,3);return;}if(e.stunUntil>this.time)return;const t=this.getEntity(e.aggroId),home=P(e.homeX,e.homeZ);if(t?.alive&&distance(e,t)<34&&distance(e,home)<25){if(distance(e,t)>e.attackRange+t.radius)this._walk(e,t,dt,e.attackRange+t.radius-.4);this._attack(e,t);}else{e.aggroId=null;if(distance(e,home)>1)this._walk(e,home,dt);if(this.time-e.lastDamagedAt>2)e.hp=Math.min(e.maxHp,e.hp+e.maxHp*.15*dt);}}
  update(dt){
    if(this.winner||!Number.isFinite(dt)||dt<=0)return;dt=Math.min(dt,.1);this.time+=dt;this._tick-=dt;
    if(this.time>=this._nextWave){this._spawnWave();this._nextWave+=26;}
    for(const e of [...this.entities]){
      e.moving=false;e.attackCooldown=Math.max(0,(e.attackCooldown||0)-dt);
      if(e.alive){this._statusUpdate(e);if(!e.alive)continue;}
      if(e.kind==='hero'){this._heroUpdate(e,dt);continue;}
      if(!e.alive){if((e.kind==='monster'||e.kind==='inhibitor')&&e.respawnAt>0&&this.time>=e.respawnAt){e.alive=true;e.hp=e.maxHp;e.x=e.homeX??e.x;e.z=e.homeZ??e.z;e.respawnAt=0;e.aggroId=null;}continue;}
      if(e.kind==='minion')this._minionUpdate(e,dt);else if(e.kind==='tower')this._towerUpdate(e);else if(e.kind==='monster')this._monsterUpdate(e,dt);else if(e.kind==='ward'&&this.time>e.expiresAt)e.alive=false;
    }
    this._projectiles(dt);
    for(const zone of this.zones){
      if(zone.dead)continue;if(extendedZoneUpdate(this,zone))continue;if(zone.until<this.time){if(zone.type==='lux')this._detonate(zone);else zone.dead=true;continue;}
      if(zone.type==='yasuo-wall')continue;
      if(zone.type==='teemo-mushroom'||zone.type==='jinx-chompers'){
        if(zone.armedAt>this.time)continue;const h=this.getEntity(zone.sourceId);if(!h)continue;const target=this._combatEnemies(zone,zone.radius,e=>zone.type==='teemo-mushroom'||e.kind==='hero')[0];if(!target)continue;
        zone.dead=true;zone.triggered=true;zone.revealedUntil=this.time+1;
        if(zone.type==='teemo-mushroom'){for(const victim of this._combatEnemies(zone,11)){this._damage(victim,zone.damage,'magic',h,'R');this._poison(victim,h,zone.poisonDps,4,'R_POISON');if(!this._controlImmune(victim)){victim.slowUntil=this.time+4;victim.slowPower=.45;}victim.revealedUntil=this.time+4;}this._event('spell',{hero:'teemo',key:'MUSHROOM',source:h.id,target:target.id,team:h.team,x:zone.x,z:zone.z,radius:11,color:'#a3d663'});}
        else{if(!this._controlImmune(target))target.rootUntil=this.time+1.5;this._damage(target,zone.damage,'magic',h,'E');this._event('spell',{hero:'jinx',key:'TRAP',source:h.id,target:target.id,team:h.team,x:zone.x,z:zone.z,radius:4,color:'#f0a1d6'});}
        continue;
      }
      for(const e of this._enemies(zone,zone.radius,t=>!isStructure(t))){if(!this._controlImmune(e)){e.slowUntil=this.time+.25;e.slowPower=.3;}}
    }
    this.zones=this.zones.filter(z=>!z.dead);this.reveals=this.reveals.filter(r=>r.until>this.time);
    if(this._tick<=0)this._tick=.5;
    // Dead soldiers are short lived; retain heroes and objectives for respawn / HUD.
    for(const e of this.entities)if(!e.alive&&!e.deadAt)e.deadAt=this.time;
    this.entities=this.entities.filter(e=>e.alive||!['minion','ward'].includes(e.kind)||this.time-e.deadAt<3);
  }
}
