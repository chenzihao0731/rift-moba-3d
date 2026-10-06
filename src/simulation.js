import { Navigation } from './navigation.js';
// The match runs entirely in map coordinates; rendering is deliberately independent.
const P = (x, z) => ({ x, z });
export const LANES = {
  top: [P(-100,100),P(-110,65),P(-112,-60),P(-90,-108),P(65,-110),P(100,-100)],
  mid: [P(-100,100),P(0,0),P(100,-100)],
  bot: [P(-100,100),P(-65,112),P(90,108),P(112,75),P(108,-65),P(100,-100)],
};
export const CHAMPIONS = [
  {id:'ahri',name:'阿狸',title:'九尾妖狐',role:'法师 · 灵活刺客',color:'#67deec',attackRange:20,hp:650,mana:440,attack:55,armor:24,speed:13,skills:[
    {key:'Q',name:'欺诈宝珠',description:'向前投出宝珠：去程造成魔法伤害，回程造成真实伤害。',cost:55,cooldown:7},
    {key:'W',name:'妖异狐火',description:'召唤三团狐火自动追击附近敌人，并短暂提升移动速度。',cost:30,cooldown:9},
    {key:'E',name:'魅惑妖术',description:'发射爱心，魅惑第一个命中的敌人，使其缓慢走向阿狸。',cost:50,cooldown:12},
    {key:'R',name:'灵魄突袭',description:'向鼠标位置突进并发射灵魄弹，10 秒内可连续施放三次。',cost:100,cooldown:95},
  ]},
  {id:'ashe',name:'艾希',title:'寒冰射手',role:'射手 · 远程控制',color:'#8ecdf8',attackRange:24,hp:640,mana:320,attack:62,armor:26,speed:12.5,skills:[
    {key:'Q',name:'射手的专注',description:'6 秒内显著提升攻速，普通攻击射出强化箭束。',cost:50,cooldown:10},
    {key:'W',name:'万箭齐发',description:'射出扇形冰箭，造成物理伤害并减速敌人。',cost:60,cooldown:9},
    {key:'E',name:'鹰击长空',description:'释放猎鹰，揭开目标附近的战争迷雾，持续 7 秒。',cost:0,cooldown:30},
    {key:'R',name:'魔法水晶箭',description:'射出全地图冰箭，撞到敌方英雄时爆炸并长时间眩晕。',cost:100,cooldown:90},
  ]},
  {id:'garen',name:'盖伦',title:'德玛西亚之力',role:'战士 · 近战坦克',color:'#edc979',attackRange:5.8,hp:780,mana:0,attack:68,armor:36,speed:13.5,skills:[
    {key:'Q',name:'致命打击',description:'解除减速并提升移动速度，下次攻击造成额外伤害和沉默。',cost:0,cooldown:8},
    {key:'W',name:'勇气',description:'获得护盾，3 秒内受到的伤害减少 35%。',cost:0,cooldown:18},
    {key:'E',name:'审判',description:'挥剑旋转 3 秒，连续伤害身边敌人；期间仍可移动。',cost:0,cooldown:9},
    {key:'R',name:'德玛西亚正义',description:'以巨剑处决附近敌方英雄，造成随已损失生命提升的真实伤害。',cost:0,cooldown:90},
  ]},
  {id:'lux',name:'拉克丝',title:'光辉女郎',role:'法师 · 远程爆发',color:'#f4dfab',attackRange:20,hp:630,mana:480,attack:54,armor:22,speed:12.8,skills:[
    {key:'Q',name:'光之束缚',description:'发射光球，禁锢路径上的前两个敌人并施加光芒标记。',cost:50,cooldown:10},
    {key:'W',name:'曲光屏障',description:'抛出法杖，为路径上的自己与友军提供护盾。',cost:60,cooldown:12},
    {key:'E',name:'透光奇点',description:'在目标处放置减速光球，再按 E 引爆；5 秒后自动爆炸。',cost:60,cooldown:10},
    {key:'R',name:'终极闪光',description:'发射穿透性的巨大光束，伤害并引爆所有光芒标记。',cost:100,cooldown:60},
  ]},
  {id:'ezreal',name:'伊泽瑞尔',title:'探险家',role:'射手 · 技能游击',color:'#e6bc71',attackRange:21,hp:660,mana:400,attack:61,armor:25,speed:13,skills:[
    {key:'Q',name:'秘术射击',description:'射出能量弹，命中造成物理伤害并缩短其他技能冷却。',cost:28,cooldown:5.5},
    {key:'W',name:'精华跃动',description:'以能量环标记首个英雄或建筑；后续攻击或技能引爆标记。',cost:50,cooldown:10},
    {key:'E',name:'奥术跃迁',description:'闪烁至目标附近，并向最近敌人发射一枚自动追踪弹。',cost:70,cooldown:18},
    {key:'R',name:'精准弹幕',description:'射出贯穿全地图的能量弧，对沿途所有敌人造成魔法伤害。',cost:100,cooldown:90},
  ]},
];
export const ITEMS = [
  {id:'doran-blade',name:'多兰之刃',cost:450,description:'+10 攻击力 · +80 生命 · 3% 生命偷取',icon:'blade',stats:{attack:10,hp:80,lifesteal:.03}},
  {id:'doran-ring',name:'多兰之戒',cost:400,description:'+18 法术强度 · +70 生命 · 法力回复',icon:'ring',stats:{ap:18,hp:70,manaRegen:2}},
  {id:'boots',name:'速度之靴',cost:300,description:'+2 移动速度',icon:'boots',stats:{speed:2}},
  {id:'berserkers',name:'狂战士胫甲',cost:1100,description:'+4 移动速度 · +35% 攻击速度',icon:'boots',stats:{speed:4,attackSpeed:.35}},
  {id:'infinity',name:'无尽之刃',cost:3600,description:'+70 攻击力 · +25% 暴击率 · 强化暴击',icon:'blade',stats:{attack:70,crit:.25,critPower:.35}},
  {id:'rabadon',name:'灭世者的死亡之帽',cost:3600,description:'+100 法术强度 · 总法术强度提升 30%',icon:'hat',stats:{ap:100,apMultiplier:.3}},
  {id:'ludens',name:'卢登的回声',cost:2850,description:'+75 法术强度 · +300 法力 · +15 技能急速',icon:'orb',stats:{ap:75,mana:300,haste:15}},
  {id:'blade-ruined',name:'破败王者之刃',cost:3200,description:'+40 攻击力 · +25% 攻速 · +10% 吸血，攻击附带百分比伤害',icon:'blade',stats:{attack:40,attackSpeed:.25,lifesteal:.1}},
  {id:'sunfire',name:'日炎圣盾',cost:2700,description:'+450 生命 · +45 护甲，灼烧身边敌人',icon:'shield',stats:{hp:450,armor:45}},
  {id:'zhonya',name:'中娅沙漏',cost:3250,description:'+80 法术强度 · +40 护甲，主动：凝滞 2.5 秒',icon:'hourglass',stats:{ap:80,armor:40},active:'stasis'},
  {id:'potion',name:'生命药水',cost:50,description:'主动使用：6 秒内恢复 150 点生命，可叠加购买',icon:'potion',stats:{},active:'heal'},
  {id:'control-ward',name:'控制守卫',cost:75,description:'主动使用：在附近放置持续 150 秒的真视守卫',icon:'ward',stats:{},active:'ward'},
];

const CHAMP = Object.fromEntries(CHAMPIONS.map(c=>[c.id,c]));
const ITEM = Object.fromEntries(ITEMS.map(i=>[i.id,i]));
const SKILL_RANGES = {
  ahri:[45,26,46,18],ashe:[24,52,240,240],garen:[6,0,9,17],lux:[53,43,49,88],ezreal:[53,53,17,240],
};
for(const champion of CHAMPIONS)champion.skills.forEach((skill,index)=>{
  skill.range=SKILL_RANGES[champion.id][index];
  skill.targeting=champion.id==='garen'&&skill.key==='R'?'target':
    (champion.id==='garen'||skill.key==='W'&&champion.id==='ahri'||skill.key==='Q'&&champion.id==='ashe')?'self':
    (champion.id==='lux'&&skill.key==='E'||champion.id==='ashe'&&skill.key==='E')?'ground':'direction';
});
const BASE = {blue:P(-100,100),red:P(100,-100)};
const ENEMY = {blue:'red',red:'blue'};
const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));
const distance = (a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const isStructure = e=>e.kind==='tower'||e.kind==='inhibitor'||e.kind==='nexus';
const lineDistance = (p,a,b)=>{const dx=b.x-a.x,dz=b.z-a.z,d=dx*dx+dz*dz; const t=clamp(((p.x-a.x)*dx+(p.z-a.z)*dz)/(d||1),0,1); return Math.hypot(p.x-a.x-t*dx,p.z-a.z-t*dz);};
const BUFFS = ['slowUntil','stunUntil','rootUntil','silenceUntil','shieldUntil','invulnerableUntil','hasteUntil','qUntil','spinUntil','fortifyUntil','igniteUntil','markedUntil'];
const BUSHES = [P(-72,-12),P(-12,-72),P(72,12),P(12,72),P(-112,-63),P(-71,-109),P(110,59),P(66,110),P(-20,-20),P(20,20)];
export const BUSH_AREAS = BUSHES;
function pathLength(points){let total=0;for(let i=1;i<points.length;i++)total+=distance(points[i-1],points[i]);return total;}
const LANE_LENGTH = Object.fromEntries(Object.entries(LANES).map(([k,p])=>[k,pathLength(p)]));
function pathPoint(lane,t){const points=LANES[lane];let left=clamp(t,0,1)*LANE_LENGTH[lane];for(let i=1;i<points.length;i++){const l=distance(points[i-1],points[i]);if(left<=l)return P(points[i-1].x+(points[i].x-points[i-1].x)*left/l,points[i-1].z+(points[i].z-points[i-1].z)*left/l);left-=l;}return {...points.at(-1)};}

export class Game {
  constructor({hero='ahri',practice=false}={}){this.practice=practice;this.restart(hero);}
  restart(heroId=this.player?.heroId||'ahri'){
    this.time=0;this.winner=null;this.entities=[];this.projectiles=[];this.zones=[];this.reveals=[];this.events=[];this.score={blue:0,red:0};this._id=0;this._wave=0;this._nextWave=5;this._tick=.5;
    this.player=this._hero(CHAMP[heroId]?heroId:'ahri','blue','mid',true);
    const allies=[['garen','top'],['ashe','bot'],['ezreal','bot'],['lux','jungle']];
    for(const [id,lane] of allies)this._hero(id,'blue',lane);
    for(const [id,lane] of [['garen','top'],['ahri','mid'],['ashe','bot'],['ezreal','bot'],['lux','jungle']])this._hero(id,'red',lane);
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
    const h=this._entity({kind:'hero',heroId,team,name:c.name,x:spawnX,z:spawnZ,hp:c.hp,maxHp:c.hp,mana:c.mana,maxMana:c.mana,baseHp:c.hp,baseMana:c.mana,baseAttack:c.attack,baseArmor:c.armor,baseMagicResist:30,baseSpeed:c.speed,attack:c.attack,armor:c.armor,magicResist:30,attackRange:c.attackRange,speed:c.speed,ap:0,haste:0,attackSpeed:.75,crit:0,critPower:0,lifesteal:0,manaRegen:0,level:1,xp:0,xpToNext:120,gold:player?500:450,kills:0,deaths:0,assists:0,cs:0,inventory:[],cooldowns:{Q:0,W:0,E:0,R:0,D:0,F:0,4:0},skillRanks:{Q:1,W:0,E:0,R:0},skillPoints:0,lane,isPlayer:player,radius:1.8,wardCharges:2,wardTimer:0,contributors:{},command:player?{type:'stop'}:{type:'ai'},aiThink:0,aiAggression:.6+Math.random()*.3,spawnX,spawnZ});
    h.skillLevels=h.skillRanks;return h;
  }
  _monster(type,x,z,hp,attack,respawnTime,reward,name){const available=type==='baron'?180:type==='dragon'?35:0;return this._entity({kind:'monster',monsterType:type,team:'neutral',x,z,homeX:x,homeZ:z,hp,maxHp:hp,attack,armor:type==='baron'?50:15,magicResist:15,attackRange:6,speed:6,radius:type==='baron'?5:type==='dragon'?4:2.6,respawnTime,reward,name,alive:available===0||this.practice,respawnAt:available,attackCooldown:0});}
  setPractice(enabled){this.practice=!!enabled;if(enabled&&this.player.gold<5000)this.player.gold=5000;}
  _event(type,data={}){this.events.push({type,time:this.time,...data});if(this.events.length>500)this.events.splice(0,150);}
  getEntity(id){return this.entities.find(e=>e.id===id);}
  moveTo(x,z){if(!this.player.alive)return;this._cancelRecall(this.player);const p={x:clamp(x,-119,119),z:clamp(z,-119,119)},destination=this.navigation?this.navigation.nearestPoint(p):p;this.player._route=null;this.player.command={type:'move',...destination};}
  attackMoveTo(x,z){this.moveTo(x,z);this.player.command.type='attackMove';}
  attackMove(x,z){this.attackMoveTo(x,z);}
  attackTarget(id){const t=this.getEntity(id);if(!this.player.alive||!t?.alive||t.team===this.player.team)return false;this._cancelRecall(this.player);this.player.command={type:'attack',targetId:id};return true;}
  stop(){this._cancelRecall(this.player);this.player.command={type:'stop'};}
  recall(){const h=this.player;if(!h.alive||this.winner)return false;h.command={type:'stop'};h.recallAt=this.time+(this.practice?2:6);this._event('recall',{x:h.x,z:h.z,team:h.team,source:h.id,text:'正在回城'});return true;}
  _cancelRecall(h){h.recallAt=0;}
  _nearBase(h){return distance(h,BASE[h.team])<20;}
  buy(itemId){const h=this.player,item=ITEM[itemId];if(!item)return this._fail(h,'未知装备');if(!h.alive&&!this.practice)return this._fail(h,'英雄阵亡时无法购买装备');if(!this._nearBase(h)&&!this.practice){this._event('message',{text:'请在己方泉水商店内购买装备'});return false;}if(h.gold<item.cost){this._event('message',{text:'金币不足'});return false;}let slot=h.inventory.find(s=>s.id===itemId&&['potion','control-ward'].includes(itemId));if(!slot&&h.inventory.length>=6){this._event('message',{text:'装备栏已满'});return false;}h.gold-=item.cost;if(slot)slot.count=(slot.count||1)+1;else h.inventory.push({id:itemId,count:1,cooldown:0});this._recomputeStats(h);this._event('purchase',{source:h.id,text:`已购买 ${item.name}`,amount:item.cost});return true;}
  _fail(h,text){if(h.isPlayer&&(!this._lastFail||this.time-this._lastFail.at>.5||this._lastFail.text!==text)){this._event('message',{text});this._lastFail={text,at:this.time};}return false;}
  levelSkill(key){return this._learn(this.player,String(key).toUpperCase());}
  _learn(h,key){if(!['Q','W','E','R'].includes(key))return false;if(h.skillPoints<=0)return this._fail(h,'没有可用的技能点');const rank=h.skillLevels[key]||0,max=key==='R'?3:5;if(rank>=max)return this._fail(h,'技能已经升到最高等级');const required=key==='R'?[6,11,16][rank]:rank*2+1;if(h.level<required)return this._fail(h,`此技能升级需要英雄达到 ${required} 级`);h.skillLevels[key]=rank+1;h.skillPoints--;if(h.isPlayer)this._event('message',{text:`${CHAMP[h.heroId].skills.find(s=>s.key===key).name} 升至 ${rank+1} 级`});return true;}
  useItem(index,x=this.player.x,z=this.player.z){const h=this.player,slot=h.inventory[index],item=ITEM[slot?.id];if(!h.alive||!item?.active||slot.cooldown>0)return false;if(item.active==='stasis'){h.invulnerableUntil=this.time+2.5;h.stunUntil=this.time+2.5;slot.cooldown=90;this._event('spell',{x:h.x,z:h.z,source:h.id,hero:h.heroId,key:'ZHONYA',radius:3,color:'#ffd363'});}
    if(item.active==='heal'){h.potionUntil=this.time+6;this._consume(h,index);this._event('message',{text:'生命药水：持续恢复生命'});}
    if(item.active==='ward'){if(distance(h,{x,z})>25){this._event('message',{text:'守卫放置距离过远'});return false;}this._addWard(h,x,z,true);this._consume(h,index);}return true;}
  _consume(h,index){const s=h.inventory[index];if(s.count>1)s.count--;else h.inventory.splice(index,1);}
  _recomputeStats(h){const oldMaxHp=h.maxHp,oldMaxMana=h.maxMana;let stats={hp:0,mana:0,attack:0,armor:0,ap:0,speed:0,haste:0,attackSpeed:0,lifesteal:0,crit:0,critPower:0,manaRegen:0,apMultiplier:0};for(const slot of h.inventory)for(const[k,v]of Object.entries(ITEM[slot.id]?.stats||{}))stats[k]=(stats[k]||0)+v;h.maxHp=h.baseHp+(h.level-1)*85+stats.hp;h.maxMana=h.baseMana? h.baseMana+(h.level-1)*35+stats.mana:0;h.attack=h.baseAttack+(h.level-1)*4+stats.attack+(h.dragonStacks||0)*6;h.armor=h.baseArmor+(h.level-1)*3.5+stats.armor;h.magicResist=h.baseMagicResist+(h.level-1)*1.5;h.ap=(stats.ap+(h.dragonStacks||0)*10)*(1+stats.apMultiplier);h.speed=h.baseSpeed+Math.min(stats.speed,5);h.attackSpeed=.75*(1+(h.level-1)*.025+stats.attackSpeed);for(const key of ['haste','lifesteal','crit','critPower','manaRegen'])h[key]=stats[key];h.hp=Math.min(h.maxHp,h.hp+Math.max(0,h.maxHp-oldMaxHp));h.mana=Math.min(h.maxMana,h.mana+Math.max(0,h.maxMana-oldMaxMana));}
  placeWard(x,z){const h=this.player;if(!h.alive||h.cooldowns[4]>0)return false;if(h.wardCharges<=0){this._event('message',{text:'侦查守卫正在充能'});return false;}if(distance(h,{x,z})>25){const d=distance(h,{x,z});x=h.x+(x-h.x)*25/d;z=h.z+(z-h.z)*25/d;}h.wardCharges--;h.cooldowns[4]=.8;this._addWard(h,x,z,false);return true;}
  _addWard(h,x,z,control){const wards=this.entities.filter(e=>e.kind==='ward'&&e.sourceId===h.id&&e.alive&&!e.control);if(wards.length>=3)wards[0].alive=false;const e=this._entity({kind:'ward',team:h.team,x:clamp(x,-119,119),z:clamp(z,-119,119),hp:3,maxHp:3,radius:1,sourceId:h.id,control,expiresAt:this.time+(control?150:90),visionRange:control?26:23,name:control?'控制守卫':'侦查守卫'});this._event('ward',{x:e.x,z:e.z,source:h.id,team:h.team,text:control?'控制守卫已部署':'侦查守卫已部署',radius:e.visionRange});}
  isVisible(e,team='blue'){
    if(!e?.alive)return e?.kind==='hero'&&e.team===team;
    if(e.team===team||isStructure(e)||this.practice)return true;
    if(e.kind==='ward'&&!e.control)return this.entities.some(v=>v.alive&&v.team===team&&v.kind==='ward'&&v.control&&distance(v,e)<v.visionRange);
    if(this.reveals.some(r=>r.team===team&&r.until>this.time&&distance(r,e)<r.radius))return true;
    const bush=BUSHES.find(b=>distance(b,e)<8);
    return this.entities.some(v=>v.alive&&v.team===team&&(v.kind==='hero'||v.kind==='minion'||v.kind==='tower'||v.kind==='ward')&&distance(v,e)<(v.visionRange||(v.kind==='hero'?31:v.kind==='tower'?31:20))&&(!bush||v.kind==='ward'||distance(v,bush)<10||e.lastDamagedAt>this.time-1.5));
  }
  unitsTeamVisible(e,team='blue'){return this.isVisible(e,team);}
  _enemies(h,range,filter=()=>true){return this.entities.filter(e=>e.alive&&e.team!==h.team&&e.team!=='neutral'&&e.kind!=='ward'&&distance(e,h)<range+e.radius&&filter(e));}
  _nearest(h,range,filter=()=>true,allowNeutral=false){let best=null,score=Infinity;for(const e of this.entities){if(!e.alive||e.id===h.id||e.team===h.team||(!allowNeutral&&e.team==='neutral')||e.kind==='ward'||!filter(e))continue;if(e.team!=='neutral'&&!this.isVisible(e,h.team))continue;const d=distance(h,e);if(d<range+e.radius){let s=d+(isStructure(e)?8:0)+(e.kind==='hero'?-3:0);if(s<score){score=s;best=e;}}}return best;}
  cast(key,x=this.player.x,z=this.player.z,targetId){return this._cast(this.player,String(key).toUpperCase(),x,z,targetId);}
  _cast(h,key,x,z,targetId){
    if(!h.alive)return this._fail(h,'英雄阵亡，等待复活');if(this.winner)return false;if(h.stunUntil>this.time||h.invulnerableUntil>this.time)return this._fail(h,'受到控制，暂时无法施放技能');
    if(key==='4')return h.isPlayer?this.placeWard(x,z):false;
    if(key==='E'&&h.heroId==='lux'&&h.lightZone){this._detonate(h.lightZone);h.lightZone=null;return true;}
    const isRecast=key==='R'&&h.heroId==='ahri'&&h.dashCharges>0&&h.dashUntil>this.time;
    if((h.cooldowns[key]||0)>0&&!isRecast)return this._fail(h,`${key} 冷却中：${Math.ceil(h.cooldowns[key])} 秒`);
    if(h.silenceUntil>this.time&&!['D','F'].includes(key))return this._fail(h,'受到沉默，无法施放技能');
    if(key==='D'){
      this._cancelRecall(h);const from=P(h.x,h.z);this._dash(h,x,z,20);h.cooldowns.D=this.practice?12:300;this._event('spell',{hero:h.heroId,key:'D',source:h.id,team:h.team,x:h.x,z:h.z,fromX:from.x,fromZ:from.z,toX:h.x,toZ:h.z,color:'#ffe59a',radius:3});return true;
    }
    if(key==='F'){const t=this.getEntity(targetId)||this._nearest({x,z,team:h.team},18,e=>e.kind==='hero');if(!t||t.team===h.team||t.kind!=='hero'||distance(h,t)>24)return this._fail(h,'引燃需要射程内的敌方英雄');h.cooldowns.F=this.practice?12:180;t.igniteUntil=this.time+5;t.igniteDamage=(90+20*h.level)/5;t.igniteSource=h.id;t.igniteTick=this.time;this._event('spell',{source:h.id,target:t.id,hero:h.heroId,key,team:h.team,fromX:h.x,fromZ:h.z,toX:t.x,toZ:t.z,x:t.x,z:t.z,color:'#f77932'});return true;}
    const skill=CHAMP[h.heroId].skills.find(s=>s.key===key);if(!skill)return false;
    if(key==='R'&&h.level<6){if(h.isPlayer)this._event('message',{text:'终极技能在英雄达到 6 级后解锁'});return false;}
    if(!h.skillLevels[key])return this._fail(h,`${key} 尚未学习，请点击技能上的 + 号`);
    const cost=isRecast?0:skill.cost;if(h.mana<cost&&!this.practice){if(h.isPlayer)this._event('message',{text:'法力不足'});return false;}
    let target=this.getEntity(targetId);if(!target?.alive||target.team===h.team)target=null;
    if(h.heroId==='garen'&&key==='R'){target=target||this._nearest({x,z,team:h.team},15,e=>e.kind==='hero');if(!target||target.kind!=='hero'||distance(h,target)>17){if(h.isPlayer)this._event('message',{text:'德玛西亚正义需要附近的敌方英雄'});return false;}}
    this._cancelRecall(h);h.mana=Math.max(0,h.mana-cost);if(!isRecast)h.cooldowns[key]=skill.cooldown/(1+h.haste/100);h.lastCastAt=this.time;
    const d=Math.hypot(x-h.x,z-h.z)||1,dir=P((x-h.x)/d,(z-h.z)/d),ap=h.ap+(h.baronUntil>this.time?35:0),rank=h.skillLevels[key]||1;
    const spell={source:h.id,hero:h.heroId,key,team:h.team,x,z,fromX:h.x,fromZ:h.z,toX:x,toZ:z,color:CHAMP[h.heroId].color};
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
    }
    this._event('spell',spell);return true;
  }
  _dash(h,x,z,max){const d=Math.hypot(x-h.x,z-h.z);if(d>.01){const endpoint=P(clamp(h.x+(x-h.x)*Math.min(1,max/d),-119,119),clamp(h.z+(z-h.z)*Math.min(1,max/d),-119,119)),p=this.navigation?this.navigation.nearestPoint(endpoint):endpoint;h.x=p.x;h.z=p.z;}h._route=null;h.facing=Math.atan2(z-h.z,x-h.x);}
  _shield(e,amount,duration){e.shield=Math.max(e.shield||0,amount);e.shieldUntil=this.time+duration;}
  _projectile(h,dir,data){const p={id:++this._id,sourceId:h.id,team:h.team,hero:h.heroId,x:h.x,z:h.z,dx:dir.x,dz:dir.z,traveled:0,hit:new Set(),age:0,speed:40,range:45,radius:1.5,damage:50,damageType:'magic',...data};this.projectiles.push(p);return p;}
  _tracking(h,t,damage,type,skill='attack'){return this._projectile(h,P(0,0),{targetId:t.id,skill,range:150,speed:55,radius:.6,damage,damageType:type});}
  _triggerMark(h,t){if(t.markedBy===h.id&&t.markedUntil>this.time){t.markedUntil=0;const amount=h.heroId==='ezreal'?80+h.level*10+h.ap*.65:20+h.level*10+h.ap*.25;this._damage(t,amount,'magic',h,'mark',true);}}
  _projectiles(dt){
    for(const p of this.projectiles){if(p.dead)continue;p.age+=dt;const source=this.getEntity(p.sourceId);if(!source){p.dead=true;continue;}const old=P(p.x,p.z);
      if(p.targetId){const t=this.getEntity(p.targetId);if(!t?.alive){p.dead=true;continue;}const d=distance(p,t);p.dx=(t.x-p.x)/(d||1);p.dz=(t.z-p.z)/(d||1);if(d<p.speed*dt+t.radius){this._projectileHit(p,t,source);p.dead=true;continue;}}
      if(p.returning){const d=distance(p,source);p.dx=(source.x-p.x)/(d||1);p.dz=(source.z-p.z)/(d||1);if(d<p.speed*dt+1){p.dead=true;continue;}}
      p.x+=p.dx*p.speed*dt;p.z+=p.dz*p.speed*dt;p.traveled+=p.speed*dt;
      if(!p.targetId){const candidates=this.entities.filter(e=>e.alive&&e.team!==p.team&&e.kind!=='ward'&&!p.hit.has(e.id)&&(!isStructure(e)||p.hitStructures)&&(!p.heroesOnly||e.kind==='hero'||(p.hitStructures&&isStructure(e)))&&lineDistance(e,old,p)<p.radius+e.radius).sort((a,b)=>distance(a,old)-distance(b,old));for(const e of candidates){this._projectileHit(p,e,source);p.hit.add(e.id);if(p.falloff)p.damage*=p.falloff;if(!p.pierce||(p.maxHits&&p.hit.size>=p.maxHits)){p.dead=true;break;}}}
      if(p.traveled>=p.range&&!p.returning){if(p.returnTo){p.returning=true;p.damageType='true';p.hit.clear();p.traveled=0;}else p.dead=true;}
      if(p.age>12||Math.abs(p.x)>150||Math.abs(p.z)>150)p.dead=true;
    }
    this.projectiles=this.projectiles.filter(p=>!p.dead);
  }
  _projectileHit(p,t,h){
    if(p.group){t.lastVolley=t.lastVolley||{};if(t.lastVolley[p.group])return;t.lastVolley[p.group]=true;}
    if(p.effect==='essence'){t.markedBy=h.id;t.markedUntil=this.time+6;this._event('spell',{key:'MARK',hero:h.heroId,source:h.id,target:t.id,x:t.x,z:t.z,color:'#f1ca66',radius:3});return;}
    this._damage(t,p.damage,p.damageType,h,p.skill);
    if(!t.alive)return;
    if(p.effect==='charm'){t.charmUntil=this.time+1.5;t.charmSource=h.id;t.slowUntil=this.time+1.5;t.slowPower=.6;}
    if(p.effect==='root'){t.rootUntil=this.time+1.8;t.markedBy=h.id;t.markedUntil=this.time+6;}
    if(p.effect==='slow'||h.heroId==='ashe'){t.slowUntil=this.time+2;t.slowPower=.3;}
    if(p.effect==='iceStun'){t.stunUntil=this.time+clamp(1.5+p.traveled/55,1.5,3.5);for(const e of this._enemies(h,300,e=>!isStructure(e)))if(e.id!==t.id&&distance(e,t)<11){this._damage(e,p.damage*.5,'magic',h,'R');e.slowUntil=this.time+3;e.slowPower=.5;}this._event('spell',{key:'ICE',hero:'ashe',source:h.id,target:t.id,x:t.x,z:t.z,radius:10,color:'#a4e8ff'});}
    if(p.effect==='ezQ'){for(const key of ['Q','W','E','R'])h.cooldowns[key]=Math.max(0,h.cooldowns[key]-1.5);h.ezPassiveUntil=this.time+6;h.ezPassiveStacks=Math.min(5,(h.ezPassiveStacks||0)+1);}
    if(p.skill!=='mark')this._triggerMark(h,t);
    if(p.skill==='attack')this._onAttackHit(h,t,p.damage);
  }
  _onAttackHit(h,t,amount){if(h.kind!=='hero')return;if(h.lifesteal)h.hp=Math.min(h.maxHp,h.hp+amount*h.lifesteal);if(h.heroId==='ashe'){t.slowUntil=this.time+2;t.slowPower=.25;}if(h.inventory.some(i=>i.id==='blade-ruined')&&!isStructure(t))this._damage(t,t.hp*.07,'physical',h,'item',true);}
  _detonate(zone){if(zone.dead)return;zone.dead=true;const h=this.getEntity(zone.sourceId);if(!h)return;for(const t of this._enemies(zone,zone.radius,e=>!isStructure(e))){this._damage(t,zone.damage,'magic',h,'E');t.markedBy=h.id;t.markedUntil=this.time+6;}this._event('spell',{key:'E2',hero:'lux',source:h.id,team:h.team,x:zone.x,z:zone.z,radius:zone.radius,color:'#efd7ff'});if(h.lightZone===zone)h.lightZone=null;}
  _canHitStructure(t,h){if(t.kind==='tower'){if(t.tier===4)return this.entities.some(e=>e.team===t.team&&e.kind==='inhibitor'&&!e.alive);return !this.entities.some(e=>e.alive&&e.team===t.team&&e.kind==='tower'&&e.lane===t.lane&&e.tier<t.tier);}if(t.kind==='inhibitor')return !this.entities.some(e=>e.alive&&e.team===t.team&&e.kind==='tower'&&e.lane===t.lane);if(t.kind==='nexus')return this.entities.some(e=>e.team===t.team&&e.kind==='inhibitor'&&!e.alive)&&!this.entities.some(e=>e.alive&&e.team===t.team&&e.kind==='tower'&&e.tier===4);return true;}
  _damage(t,amount,type,source,key='',skipMark=false){
    if(!t.alive||t.invulnerableUntil>this.time||amount<=0)return 0;if(isStructure(t)&&(!source||!this._canHitStructure(t,source)))return 0;
    if(t.kind==='ward'){if(key!=='attack')return 0;amount=1;}
    if(isStructure(t)){const hasWave=this.entities.some(e=>e.alive&&e.kind==='minion'&&e.team===source.team&&distance(e,t)<29);if(!hasWave)amount*=.18;}
    const resistance=type==='magic'?t.magicResist:type==='physical'?t.armor:0;amount*=100/(100+Math.max(0,resistance||0));if(t.fortifyUntil>this.time)amount*=.65;
    if(t.shield>0&&t.shieldUntil>this.time){const absorbed=Math.min(t.shield,amount);t.shield-=absorbed;amount-=absorbed;}
    t.hp=Math.max(0,t.hp-amount);t.lastDamagedAt=this.time;this._cancelRecall(t);
    if(source){t.lastAttacker=source.id;if(t.kind==='hero'&&source.kind==='hero'){t.contributors=t.contributors||{};t.contributors[source.id]=this.time;for(const tower of this.entities.filter(e=>e.alive&&e.kind==='tower'&&e.team===t.team&&distance(e,source)<e.attackRange))tower.aggroId=source.id;}if(t.kind==='monster')t.aggroId=source.id;}
    this._event('damage',{x:t.x,z:t.z,target:t.id,source:source?.id,amount:Math.round(amount),team:source?.team,key,color:type==='true'?'#ffffff':type==='magic'?'#bb91ff':'#ffce72'});
    if(t.hp<=0)this._die(t,source);return amount;
  }
  _die(t,killer){
    if(!t.alive)return;t.alive=false;t.hp=0;this._event('death',{x:t.x,z:t.z,target:t.id,source:killer?.id,team:t.team,hero:t.heroId,text:t.kind==='hero'?`${t.name} 已阵亡`:t.kind==='tower'?`${t.name} 被摧毁`:t.name||'单位被击败'});
    if(t.kind==='hero'){
      t.deaths++;t.respawnAt=this.time+(this.practice&&t.isPlayer?2:9+t.level*1.6);t.command=t.isPlayer?{type:'stop'}:{type:'ai'};t.recallAt=0;t.lightZone=null;t.spinUntil=0;t.shield=0;
      let h=killer?.kind==='hero'?killer:null;if(!h){const id=Object.entries(t.contributors||{}).filter(([id,at])=>this.time-at<10&&this.getEntity(Number(id))?.kind==='hero').sort((a,b)=>b[1]-a[1])[0]?.[0];h=this.getEntity(Number(id));}
      if(h&&h.team!==t.team){h.kills++;this.score[h.team]++;this._award(h,300,95);this._event('message',{text:`${h.name} 击杀了 ${t.name}`,team:h.team});for(const[id,at]of Object.entries(t.contributors||{})){const ally=this.getEntity(Number(id));if(ally?.kind==='hero'&&ally.id!==h.id&&ally.team===h.team&&this.time-at<10){ally.assists++;this._award(ally,100,55);}}}t.contributors={};
    }else if(t.kind==='minion'){
      if(killer?.kind==='hero'){killer.cs++;this._award(killer,t.minionType==='cannon'?60:t.minionType==='super'?80:t.minionType==='melee'?21:14,0);}
      const xp=t.minionType==='melee'?34:t.minionType==='cannon'?60:22;for(const h of this.entities.filter(e=>e.alive&&e.kind==='hero'&&e.team!==t.team&&distance(e,t)<33))this._award(h,0,xp);
    }else if(t.kind==='tower'||t.kind==='inhibitor'){
      if(killer){for(const h of this.entities.filter(e=>e.kind==='hero'&&e.team===killer.team))this._award(h,t.kind==='tower'?100:35,0);if(killer.kind==='hero')this._award(killer,t.kind==='tower'?150:65,60);}
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
  _level(h){h.level++;h.xpToNext=120+(h.level-1)*65;h.skillPoints++;if(!h.isPlayer||this.practice){const prefer=(h.level===6||h.level===11||h.level===16)?['R','Q','W','E']:h.level===2?['W','Q','E']:h.level===3?['E','Q','W']:['Q','W','E','R'];for(const key of prefer){const rank=h.skillLevels[key],needed=key==='R'?[6,11,16][rank]:rank*2+1;if(rank<(key==='R'?3:5)&&h.level>=needed){this._learn(h,key);break;}}}this._recomputeStats(h);this._event('level',{x:h.x,z:h.z,source:h.id,amount:h.level,text:`${h.name} 升至 ${h.level} 级`,team:h.team});}
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
        if(!route||distance(route.target,goal)>6||this.time>route.until){const path=nav.findPath(e,goal);e._route={points:path.points,index:0,target:goal,until:this.time+1};if(e.isPlayer&&['move','attackMove'].includes(e.command.type)&&distance(path.destination,goal)>.5){e.command.x=path.destination.x;e.command.z=path.destination.z;e._route.target=path.destination;}}
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
    const d=distance(e,target);if(d<=stopDistance)return;let speed=e.speed||10;if(e.slowUntil>this.time)speed*=1-(e.slowPower||.3);if(e.hasteUntil>this.time)speed*=1.35;if(e.baronEmpowered)speed*=1.15;const step=Math.min(d-stopDistance,speed*dt),next=P(clamp(e.x+(target.x-e.x)/d*step,-120,120),clamp(e.z+(target.z-e.z)/d*step,-120,120));if(e.kind==='hero'&&this.navigation&&!this.navigation.segmentClear(e,next)){e._route=null;return;}e.x=next.x;e.z=next.z;e.facing=Math.atan2(target.z-e.z,target.x-e.x);e.moving=true;
  }
  _attack(e,t){
    if(!t?.alive||e.attackCooldown>0||e.stunUntil>this.time||e.invulnerableUntil>this.time||distance(e,t)>e.attackRange+t.radius)return false;
    if(isStructure(t)&&!this._canHitStructure(t,e))return false;
    let speed=e.kind==='hero'?e.attackSpeed:e.kind==='tower'?.8:e.kind==='monster'?.7:.85;
    if(e.kind==='hero'){if(e.heroId==='ashe'&&e.qUntil>this.time)speed*=1.65;if(e.ezPassiveUntil>this.time)speed*=1+(e.ezPassiveStacks||1)*.1;}
    e.attackCooldown=1/speed;e.facing=Math.atan2(t.z-e.z,t.x-e.x);e.lastAttackAt=this.time;let amount=(e.attack||20)+(e.baronUntil>this.time?20:0);if(e.baronEmpowered)amount*=1.5;
    const critical=e.kind==='hero'&&Math.random()<e.crit;if(critical)amount*=1.75+e.critPower;if(e.heroId==='ashe'&&e.qUntil>this.time)amount*=1.28;if(e.heroId==='garen'&&e.qUntil>this.time){amount+=45+e.level*6;e.qUntil=0;t.silenceUntil=this.time+1.4;}
    if(e.kind==='tower'&&t.kind==='hero'){e.focusStacks=e.lastTargetId===t.id?Math.min(4,(e.focusStacks||0)+1):0;amount*=1+e.focusStacks*.25;}e.lastTargetId=t.id;
    this._event('attack',{source:e.id,target:t.id,hero:e.heroId,team:e.team,key:'attack',x:t.x,z:t.z,fromX:e.x,fromZ:e.z,toX:t.x,toZ:t.z,color:critical?'#ffc763':e.team==='blue'?'#55ceea':'#fc6978'});
    if(e.attackRange>8)this._tracking(e,t,amount,'physical');else{this._damage(t,amount,'physical',e,'attack');this._triggerMark(e,t);this._onAttackHit(e,t,amount);}
    if(e.redBuffUntil>this.time&&t.kind==='hero'){t.slowUntil=this.time+2;t.slowPower=.3;this._damage(t,10+e.level*2,'true',e,'red-buff');}
    return true;
  }
  _heroUpdate(h,dt){
    h.spinning=h.spinUntil>this.time;
    for(const key of Object.keys(h.cooldowns))h.cooldowns[key]=Math.max(0,h.cooldowns[key]-dt*(this.practice&&h.isPlayer?3:1));for(const slot of h.inventory)slot.cooldown=Math.max(0,(slot.cooldown||0)-dt*(this.practice?3:1));
    if(!h.alive){if(this.time>=h.respawnAt){h.alive=true;h.hp=h.maxHp;h.mana=h.maxMana;h.x=h.spawnX;h.z=h.spawnZ;h.command=h.isPlayer?{type:'stop'}:{type:'ai'};for(const key of BUFFS)h[key]=0;h.charmUntil=0;this._event('message',{text:`${h.name} 已复活`,team:h.team});}return;}
    h.gold+=dt*1.7;if(h.wardCharges<2){h.wardTimer+=dt;if(h.wardTimer>80){h.wardTimer=0;h.wardCharges++;}}else h.wardTimer=0;
    const fountain=this._nearBase(h),healingPenalty=h.igniteUntil>this.time?.6:1;h.hp=Math.min(h.maxHp,h.hp+dt*(fountain?h.maxHp*.18:1.1+(h.heroId==='garen'&&this.time-h.lastDamagedAt>7?h.maxHp*.012:0))*healingPenalty);h.mana=Math.min(h.maxMana,h.mana+dt*(fountain?h.maxMana*.2:2+h.manaRegen+(h.blueBuffUntil>this.time?9:0)));if(this.practice&&h.isPlayer)h.mana=h.maxMana;
    if(h.potionUntil>this.time)h.hp=Math.min(h.maxHp,h.hp+25*dt*healingPenalty);
    if(h.shieldUntil<this.time)h.shield=0;
    if(h.igniteUntil>this.time&&h.igniteTick<=this.time){h.igniteTick+=1;this._damage(h,h.igniteDamage,'true',this.getEntity(h.igniteSource),'F');if(!h.alive)return;}
    if(h.recallAt){if(this.time>=h.recallAt){h.x=h.spawnX;h.z=h.spawnZ;h.recallAt=0;h.command=h.isPlayer?{type:'stop'}:{type:'ai'};this._event('recall',{source:h.id,x:h.x,z:h.z,team:h.team,text:'回城完成'});}return;}
    if(h.spinUntil>this.time&&h.spinTick<=this.time){h.spinTick+=.35;for(const t of this._enemies(h,9,e=>!isStructure(e)))this._damage(t,h.spinDamage,'physical',h,'E');this._event('spell',{source:h.id,hero:'garen',key:'SPIN',x:h.x,z:h.z,radius:8,team:h.team,color:'#f1d77f'});}
    if(h.inventory.some(i=>i.id==='sunfire')&&this._tick<=0)for(const t of this._enemies(h,7,e=>!isStructure(e)))this._damage(t,12+h.level*2,'magic',h,'sunfire');
    if(h.stunUntil>this.time||h.invulnerableUntil>this.time)return;
    if(h.charmUntil>this.time){const charmer=this.getEntity(h.charmSource);if(charmer)this._walk(h,charmer,dt,3);return;}
    if(!h.isPlayer){this._aiHero(h,dt);return;}
    const cmd=h.command;if(cmd.type==='move'){this._walk(h,cmd,dt);if(distance(h,cmd)<.6)h.command={type:'guard'};}
    else if(cmd.type==='attack'){const t=this.getEntity(cmd.targetId);if(!t?.alive||!this.isVisible(t,h.team)){h.command={type:'guard'};return;}if(distance(h,t)>h.attackRange+t.radius-.5)this._walk(h,t,dt,h.attackRange+t.radius-1);this._attack(h,t);}
    else if(cmd.type==='attackMove'){const t=this._nearest(h,30,e=>e.kind!=='monster');if(t){this._walk(h,t,dt,h.attackRange+t.radius-1);this._attack(h,t);}else{this._walk(h,cmd,dt);if(distance(h,cmd)<.8)h.command={type:'guard'};}}
    else if(cmd.type==='guard'){const t=this._nearest(h,h.attackRange,e=>e.kind!=='monster');if(t)this._attack(h,t);}
  }
  _aiHero(h,dt){
    h.aiThink-=dt;const health=h.hp/h.maxHp;
    if(health<.23&&this.time-h.lastDamagedAt<6){h.retreatUntil=this.time+5;}
    if(h.retreatUntil>this.time||health<.35&&this._nearBase(h)){this._walk(h,BASE[h.team],dt,4);if(this._nearBase(h))h.retreatUntil=0;return;}
    if(health<.42&&this.time-h.lastDamagedAt>6&&!this._nearBase(h)){h.recallAt=this.time+6;h.command={type:'ai'};this._event('recall',{x:h.x,z:h.z,source:h.id,team:h.team});return;}
    if(this.time>(h.aiWardNext||45)&&Math.abs(h.x+h.z)<55&&!this._nearBase(h)&&h.wardCharges>0){h.aiWardNext=this.time+65;h.wardCharges--;this._addWard(h,h.x+4,h.z-4,false);}
    if(this._nearBase(h)&&h.gold>1200&&h.inventory.length<6){const item=(h.heroId==='ahri'||h.heroId==='lux')?'doran-ring':'doran-blade';if(!h.inventory.length){h.inventory.push({id:item,count:1,cooldown:0});h.gold-=ITEM[item].cost;}else if(h.gold>ITEM.ludens.cost&&!h.inventory.some(s=>s.id==='ludens')&&['ahri','lux'].includes(h.heroId)){h.inventory.push({id:'ludens',count:1,cooldown:0});h.gold-=ITEM.ludens.cost;}else if(h.gold>3200&&!h.inventory.some(s=>s.id==='blade-ruined')){h.inventory.push({id:'blade-ruined',count:1,cooldown:0});h.gold-=3200;}this._recomputeStats(h);}
    let target=this.getEntity(h.aiTargetId);
    if(h.aiThink<=0||!target?.alive){h.aiThink=.3+Math.random()*.2;target=this._nearest(h,36,e=>e.kind!=='nexus'||this._canHitStructure(e,h),h.lane==='jungle');h.aiTargetId=target?.id||0;}
    if(target?.alive){
      const hostileTower=this.entities.find(e=>e.alive&&e.kind==='tower'&&e.team===ENEMY[h.team]&&distance(e,h)<e.attackRange+4);const friendlyWave=hostileTower&&this.entities.some(e=>e.alive&&e.kind==='minion'&&e.team===h.team&&distance(e,hostileTower)<24);
      if(hostileTower&&!friendlyWave&&target.kind!=='hero'){const p=pathPoint(h.lane==='jungle'?'mid':h.lane,h.team==='blue'?.22:.78);this._walk(h,p,dt);return;}
      const d=distance(h,target);if(d<h.attackRange-3&&h.heroId!=='garen'&&target.kind==='hero'&&target.attackRange<10){const away=P(h.x+(h.x-target.x)*.8,h.z+(h.z-target.z)*.8);this._walk(h,away,dt);}
      else if(d>h.attackRange+target.radius-.5)this._walk(h,target,dt,h.attackRange+target.radius-1);
      this._attack(h,target);
      if(target.kind==='hero'||target.kind==='monster'||this.practice){
        if(h.heroId==='garen'){if(d<11)this._cast(h,'E',target.x,target.z,target.id);if(d<20)this._cast(h,'Q',target.x,target.z,target.id);if(health<.65)this._cast(h,'W',h.x,h.z);if(target.kind==='hero'&&target.hp/target.maxHp<.38&&d<17)this._cast(h,'R',target.x,target.z,target.id);}
        else{if(d<48)this._cast(h,'Q',target.x,target.z,target.id);if(d<42&&h.heroId!=='ashe')this._cast(h,'E',target.x,target.z,target.id);if(d<36)this._cast(h,'W',target.x,target.z,target.id);if(target.kind==='hero'&&target.hp/target.maxHp<.58&&d<48)this._cast(h,'R',target.x,target.z,target.id);}
      }else if(target.kind==='minion'&&d<45&&h.mana>h.maxMana*.55&&Math.random()<dt*.35)this._cast(h,'Q',target.x,target.z,target.id);
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
    e.baronEmpowered=this.entities.some(h=>h.alive&&h.kind==='hero'&&h.team===e.team&&h.baronUntil>this.time&&distance(h,e)<42);
    if(e.spawnWait>0){e.spawnWait-=dt;return;}if(e.stunUntil>this.time)return;
    if(e.charmUntil>this.time){const charmer=this.getEntity(e.charmSource);if(charmer)this._walk(e,charmer,dt,3);return;}
    let t=this.getEntity(e.targetId);if(!t?.alive||distance(e,t)>29||isStructure(t)&&!this._canHitStructure(t,e))t=null;
    if(!t){const targets=this._enemies(e,23,x=>x.kind!=='monster'&&(!isStructure(x)||this._canHitStructure(x,e)));targets.sort((a,b)=>(a.kind==='minion'?-10:a.kind==='hero'?-5:0)+distance(e,a)-((b.kind==='minion'?-10:b.kind==='hero'?-5:0)+distance(e,b)));t=targets[0];e.targetId=t?.id||0;}
    if(t){if(distance(e,t)>e.attackRange+t.radius-.2)this._walk(e,t,dt,e.attackRange+t.radius-.4);this._attack(e,t);return;}
    const point=e.path[e.pathIndex];if(point){this._walk(e,point,dt,.2);if(distance(e,point)<1)e.pathIndex++;}else{const nexus=this.entities.find(x=>x.kind==='nexus'&&x.team===ENEMY[e.team]&&x.alive);if(nexus)this._attack(e,nexus);}
  }
  _towerUpdate(e){if(e.attackCooldown>0)return;let target=this.getEntity(e.aggroId);if(!target?.alive||distance(e,target)>e.attackRange+target.radius)target=null;if(!target){const near=this._enemies(e,e.attackRange,t=>t.kind==='minion'||t.kind==='hero');near.sort((a,b)=>(a.kind==='minion'?-100:0)+distance(e,a)-((b.kind==='minion'?-100:0)+distance(e,b)));target=near[0];}if(target)this._attack(e,target);}
  _monsterUpdate(e,dt){if(e.charmUntil>this.time){const charmer=this.getEntity(e.charmSource);if(charmer)this._walk(e,charmer,dt,3);return;}if(e.stunUntil>this.time)return;const t=this.getEntity(e.aggroId),home=P(e.homeX,e.homeZ);if(t?.alive&&distance(e,t)<34&&distance(e,home)<25){if(distance(e,t)>e.attackRange+t.radius)this._walk(e,t,dt,e.attackRange+t.radius-.4);this._attack(e,t);}else{e.aggroId=null;if(distance(e,home)>1)this._walk(e,home,dt);if(this.time-e.lastDamagedAt>2)e.hp=Math.min(e.maxHp,e.hp+e.maxHp*.15*dt);}}
  update(dt){
    if(this.winner||!Number.isFinite(dt)||dt<=0)return;dt=Math.min(dt,.1);this.time+=dt;this._tick-=dt;
    if(this.time>=this._nextWave){this._spawnWave();this._nextWave+=26;}
    for(const e of [...this.entities]){
      e.moving=false;e.attackCooldown=Math.max(0,(e.attackCooldown||0)-dt);
      if(e.kind==='hero'){this._heroUpdate(e,dt);continue;}
      if(!e.alive){if((e.kind==='monster'||e.kind==='inhibitor')&&e.respawnAt>0&&this.time>=e.respawnAt){e.alive=true;e.hp=e.maxHp;e.x=e.homeX??e.x;e.z=e.homeZ??e.z;e.respawnAt=0;e.aggroId=null;}continue;}
      if(e.kind==='minion')this._minionUpdate(e,dt);else if(e.kind==='tower')this._towerUpdate(e);else if(e.kind==='monster')this._monsterUpdate(e,dt);else if(e.kind==='ward'&&this.time>e.expiresAt)e.alive=false;
    }
    this._projectiles(dt);
    for(const zone of this.zones){if(zone.dead)continue;if(zone.until<this.time){this._detonate(zone);continue;}for(const e of this._enemies(zone,zone.radius,t=>!isStructure(t))){e.slowUntil=this.time+.25;e.slowPower=.3;}}
    this.zones=this.zones.filter(z=>!z.dead);this.reveals=this.reveals.filter(r=>r.until>this.time);
    if(this._tick<=0)this._tick=.5;
    // Dead soldiers are short lived; retain heroes and objectives for respawn / HUD.
    for(const e of this.entities)if(!e.alive&&!e.deadAt)e.deadAt=this.time;
    this.entities=this.entities.filter(e=>e.alive||!['minion','ward'].includes(e.kind)||this.time-e.deadAt<3);
  }
}
