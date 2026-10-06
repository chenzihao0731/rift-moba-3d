import { EXTENDED_CHAMPIONS, EXTENDED_IDS } from './extended-champions.js';
import { equipmentHealingMultiplier } from './equipment-effects.js';
const DATA=Object.fromEntries(EXTENDED_CHAMPIONS.map(c=>[c.id,c]));
const P=(x,z)=>({x,z}),dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z),clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const structure=e=>['tower','inhibitor','nexus'].includes(e.kind);
const foes=(g,h,r,filter=()=>true)=>g._combatEnemies(h,r,filter);
const allies=(g,h,r)=>g.entities.filter(e=>e.alive&&e.kind==='hero'&&e.team===h.team&&dist(e,h)<r+e.radius);
const magic=(h,rank,base,scaling=.6)=>base+rank*24+h.ap*scaling;
const stun=(g,t,seconds)=>{if(!immune(g,t))t.stunUntil=Math.max(t.stunUntil||0,g.time+seconds);};
const root=(g,t,seconds)=>{if(!immune(g,t))t.rootUntil=Math.max(t.rootUntil||0,g.time+seconds);};
const slow=(g,t,power,seconds)=>{if(!immune(g,t)){t.slowUntil=g.time+seconds;t.slowPower=power;}};
const immune=(g,t)=>t.blackShieldUntil>g.time&&t.shield>0;
const emit=(g,h,key,shape,data={})=>g._event('spell',{source:h.id,hero:h.heroId,key,shape,team:h.team,color:DATA[h.heroId]?.color,x:h.x,z:h.z,fromX:h.x,fromZ:h.z,toX:h.x,toZ:h.z,...data});
function zone(g,h,kind,key,x,z,radius,duration,extra={}){return g._zone('extended',h,{kind,key,x,z,radius,color:DATA[h.heroId]?.color,until:g.time+duration,nextTick:g.time,tickEvery:.5,...extra});}
function relocate(g,e,x,z){const p=g.navigation?g.navigation.nearestPoint(P(clamp(x,-119,119),clamp(z,-119,119))):P(clamp(x,-119,119),clamp(z,-119,119));e.x=p.x;e.z=p.z;e._route=null;}
function push(g,t,h,distance){const length=dist(h,t),direction=length>.01?P((t.x-h.x)/length,(t.z-h.z)/length):h.direction||P(Math.cos(h.facing||0),Math.sin(h.facing||0));relocate(g,t,t.x+direction.x*distance,t.z+direction.z*distance);}
function pull(g,t,h,distance=5){const length=dist(h,t)||1;relocate(g,t,h.x+(t.x-h.x)/length*distance,h.z+(t.z-h.z)/length*distance);}
function coneTargets(g,h,dir,range,angle=.7){return foes(g,h,range).filter(t=>{const dx=t.x-h.x,dz=t.z-h.z,d=Math.hypot(dx,dz)||1;return(dx*dir.x+dz*dir.z)/d>Math.cos(angle);});}
function lineTargets(g,h,dir,range,width){return foes(g,h,range+3).filter(t=>{const x=t.x-h.x,z=t.z-h.z,along=x*dir.x+z*dir.z;return along>0&&along<range+t.radius&&Math.abs(x*dir.z-z*dir.x)<width+t.radius;});}
function projectile(g,h,dir,key,range,damage,extra={}){return g._projectile(h,dir,{skill:key,range,damage,damageType:'magic',speed:42,radius:1.8,effect:`ext:${h.heroId}:${key}`,...extra});}
function hit(g,h,t,amount,key,type='magic'){
  const eligible=t.alive&&!(t.invulnerableUntil>g.time),spellshield=t.spellshieldCooldownUntil;const actual=g._damage(t,amount,type,h,key);
  if(eligible&&t.spellshieldCooldownUntil===spellshield)extendedSpellHit(g,h,t,key);
  return actual;
}
function heal(g,h,amount){h.hp=Math.min(h.maxHp,h.hp+amount*equipmentHealingMultiplier(h,g.time));}
export const isExtended=id=>EXTENDED_IDS.has(id);
export function extendedInit(h){if(!isExtended(h.heroId))return;h.ext={casts:0,attacks:0,annieStacks:0,veigarAp:0,shortFuseAt:0,silver:{},brand:{},hemorrhage:{},manaBarrierAt:0,headshot:0,trapHeadshots:{},channel:null};}
export function extendedRecast(g,h,key){return h.heroId==='leesin'&&key==='Q'&&h.sonicMarkUntil>g.time&&g.getEntity(h.sonicMarkId)?.alive||h.heroId==='ziggs'&&key==='W'&&h.satchel&&!h.satchel.dead;}

// Validation runs before resources or cooldowns change; directional and ground casts
// remain valid without an enemy, while targeted spells require current vision.
export function extendedValidate(g,h,key,x,z,targetId){
  if(!isExtended(h.heroId))return null;
  const skill=DATA[h.heroId].skills.find(s=>s.key===key),recast=extendedRecast(g,h,key);
  if(skill.passive)return{error:`${skill.name}是被动技能：普通攻击自动触发`};
  let target=g.getEntity(targetId);
  if(h.heroId==='leesin'&&key==='Q'&&recast){target=g.getEntity(h.sonicMarkId);if(!target?.alive||!g.isVisible(target,h.team)||dist(h,target)>65)return{error:'回音击需要可见的音波标记目标'};}
  else if(skill.targeting==='target'){
    if(targetId&&(!target?.alive||target.team===h.team||structure(target)||target.kind==='ward'||target.invulnerableUntil>g.time||!g.isVisible(target,h.team)))return{error:'此技能需要可见的敌方单位'};
    target??=g._nearest({x,z,team:h.team},12,t=>!structure(t)&&t.kind!=='ward',true);
    const heroOnly=(['darius','leesin','veigar','caitlyn'].includes(h.heroId)&&key==='R');
    if(!target?.alive||target.team===h.team||structure(target)||target.invulnerableUntil>g.time||heroOnly&&target.kind!=='hero'||!g.isVisible(target,h.team)||dist(h,target)>skill.range+target.radius)return{error:heroOnly?'此技能需要射程内可见的敌方英雄':'此技能需要射程内可见的敌人'};
  }else if(skill.targeting==='ally'){
    if(targetId&&target?.team!==h.team&&h.heroId!=='leesin')return{error:'此技能只能对自己或友军施放'};
    target=target?.alive&&target.team===h.team&&target.kind==='hero'?target:h;
    if(dist(h,target)>skill.range)return{error:'友军距离过远'};
  }
  return{target,recast,cost:recast?0:skill.cost};
}

export function extendedCast(g,h,key,x,z,context,spell){
  if(!isExtended(h.heroId))return false;
  const rank=h.skillLevels[key]||1,target=context.target,range=DATA[h.heroId].skills.find(s=>s.key===key).range;
  const length=Math.hypot(x-h.x,z-h.z),dir=length>.001?P((x-h.x)/length,(z-h.z)/length):P(Math.cos(h.facing||0),Math.sin(h.facing||0));
  const spot=P(h.x+dir.x*Math.min(length,range),h.z+dir.z*Math.min(length,range)),damage=magic(h,rank,35);
  Object.assign(spell,{shape:'circle',x:spot.x,z:spot.z,radius:8});
  const bolt=(extra={})=>{spell.shape='projectile';spell.toX=h.x+dir.x*range;spell.toZ=h.z+dir.z*range;return projectile(g,h,dir,key,range,damage,extra);};
  const aimed=(amount=damage,extra={})=>{spell.shape='projectile';spell.target=target.id;spell.x=target.x;spell.z=target.z;spell.toX=target.x;spell.toZ=target.z;const p=g._tracking(h,target,amount,'magic',key);Object.assign(p,{effect:`ext:${h.heroId}:${key}`,...extra});return p;};
  const circle=(radius,amount=damage,type='magic',center=h)=>{spell.shape='circle';spell.x=center.x;spell.z=center.z;spell.radius=radius;for(const t of foes(g,{...center,team:h.team},radius))hit(g,h,t,amount,key,type);};
  const dashTo=(x,z,max=range)=>{g._dash(h,x,z,max);spell.shape='dash';spell.toX=h.x;spell.toZ=h.z;spell.x=h.x;spell.z=h.z;};
  const shieldAlly=(amount,time=3)=>{g._shield(target||h,amount,time);spell.shape='shield';spell.x=(target||h).x;spell.z=(target||h).z;spell.target=(target||h).id;spell.radius=4;};
  switch(h.heroId){
    case 'annie':{
      const armed=(h.ext.annieStacks||0)>=4&&key!=='E';h.ext.annieStunCast=armed;
      if(key==='Q')aimed(magic(h,rank,45,.8),{annieStun:armed});
      if(key==='W'){spell.shape='cone';spell.radius=22;spell.toX=h.x+dir.x*22;spell.toZ=h.z+dir.z*22;for(const t of coneTargets(g,h,dir,22)){hit(g,h,t,magic(h,rank,55,.85),key);if(armed)stun(g,t,1.5);}}
      if(key==='E'){shieldAlly(magic(h,rank,55,.4));(target||h).hasteUntil=g.time+3;}
      if(key==='R'){
        circle(12,150+rank*75+h.ap*.75,'magic',spot);if(armed)for(const t of foes(g,{...spot,team:h.team},12))stun(g,t,1.5);
        for(const bear of g.entities.filter(e=>e.summonOwner===h.id))bear.alive=false;
        g._entity({kind:'minion',team:h.team,...spot,name:'提伯斯',summonType:'tibbers',summonOwner:h.id,expiresAt:g.time+35,hp:650+rank*250,maxHp:650+rank*250,attack:45+rank*15+h.ap*.2,attackRange:5,speed:15,radius:2.6,armor:30,magicResist:25,path:[],pathIndex:0,minionType:'summon'});spell.shape='summon';
      }
      h.ext.annieStacks=armed?0:Math.min(4,(h.ext.annieStacks||0)+1);break;
    }
    case 'brand':
      if(key==='Q')bolt();
      if(key==='W')zone(g,h,'brand-fire','W',spot.x,spot.z,10,.7,{armedAt:g.time+.6,single:true,damage:magic(h,rank,55,.8)});
      if(key==='E'){spell.shape='circle';spell.x=target.x;spell.z=target.z;spell.radius=10;for(const t of foes(g,{...target,team:h.team},10))hit(g,h,t,magic(h,rank,35,.6),'E');}
      if(key==='R')aimed(110+rank*60+h.ap*.5,{bounces:4,lastBounceId:0});
      break;
    case 'morgana':
      if(key==='Q')bolt({damage:magic(h,rank,65,.9)});
      if(key==='W')zone(g,h,'morgana-pool','W',spot.x,spot.z,11,5,{damage:12+rank*7+h.ap*.15});
      if(key==='E'){shieldAlly(magic(h,rank,75,.7),4);(target||h).blackShieldUntil=g.time+4;}
      if(key==='R'){circle(25,100+rank*60+h.ap*.5);const victims=foes(g,h,25,t=>t.kind==='hero');for(const t of victims)slow(g,t,.35,3);zone(g,h,'morgana-tether','R',h.x,h.z,29,3.1,{armedAt:g.time+3,follow:true,single:true,targets:victims.map(t=>t.id),damage:100+rank*60+h.ap*.5});spell.shape='ring';spell.radius=25;}
      break;
    case 'veigar':
      if(key==='Q')bolt({pierce:true,maxHits:2});
      if(key==='W')zone(g,h,'veigar-meteor','W',spot.x,spot.z,10,.9,{armedAt:g.time+.8,single:true,damage:magic(h,rank,75,1)});
      if(key==='E'){zone(g,h,'veigar-cage','E',spot.x,spot.z,13,3,{armedAt:g.time+.35,hit:new Set()});spell.shape='ring';spell.radius=13;}
      if(key==='R'){spell.shape='execute';spell.x=target.x;spell.z=target.z;hit(g,h,target,(130+rank*80+h.ap*.8)*(1+clamp(1-target.hp/target.maxHp,0,.66)*1.5),'R');}
      break;
    case 'ziggs':
      if(key==='Q')bolt({damage:magic(h,rank,50,.75),effect:'ext:ziggs:Q',explodeAtEnd:true,blastRadius:9});
      if(key==='W'){
        if(context.recast){detonateSatchel(g,h,h.satchel);h.satchel=null;spell.key='W2';}
        else{h.satchel=zone(g,h,'ziggs-satchel','W',spot.x,spot.z,10,4,{armedAt:g.time+.3,manual:true,direction:dir,damage:magic(h,rank,45,.5)});spell.shape='ring';}
      }
      if(key==='E')for(let i=-1;i<=1;i++)zone(g,h,'ziggs-mine','E',spot.x-dir.z*i*6,spot.z+dir.x*i*6,3.5,12,{armedAt:g.time+.5,damage:magic(h,rank,30,.35),trap:true});
      if(key==='R'){zone(g,h,'ziggs-bomb','R',spot.x,spot.z,20,1.1,{armedAt:g.time+1,single:true,damage:200+rank*100+h.ap*.9});spell.radius=20;}
      h.ext.shortFuseAt=Math.max(g.time,(h.ext.shortFuseAt||0)-2);break;
    case 'fizz':
      if(key==='Q'){dashTo(target.x+dir.x*3,target.z+dir.z*3,range+3);hit(g,h,target,magic(h,rank,25,.55)+h.attack*.7,'Q');extendedAttackHit(g,h,target,h.attack);}
      if(key==='W'){h.fizzWUntil=g.time+6;spell.x=h.x;spell.z=h.z;spell.shape='shield';spell.radius=3;}
      if(key==='E'){dashTo(spot.x,spot.z);h.invulnerableUntil=g.time+.7;zone(g,h,'fizz-landing','E',h.x,h.z,11,.8,{armedAt:g.time+.7,single:true,damage:magic(h,rank,55,.8)});}
      if(key==='R')bolt({heroesOnly:true,damage:0,radius:2.6});
      break;
    case 'masteryi':
      if(key==='Q'){const nearby=foes(g,{...target,team:h.team},14).slice(0,4);if(!nearby.includes(target))nearby.unshift(target);for(const t of nearby.slice(0,4))hit(g,h,t,40+rank*25+h.attack*1.1,'Q','physical');dashTo(target.x-2*dir.x,target.z-2*dir.z,range+3);h.invulnerableUntil=g.time+.35;}
      if(key==='W'){h.ext.channel={type:'meditate',until:g.time+3,nextTick:g.time};h.meditateUntil=g.time+3;h.command=h.isPlayer?{type:'stop'}:{type:'ai'};spell.shape='channel';spell.radius=5;}
      if(key==='E'){h.wujuUntil=g.time+5;spell.shape='shield';spell.x=h.x;spell.z=h.z;spell.radius=4;}
      if(key==='R'){h.highlanderUntil=g.time+7;h.slowUntil=0;spell.shape='shield';spell.x=h.x;spell.z=h.z;spell.radius=5;}
      break;
    case 'leesin':
      if(key==='Q'){if(context.recast){dashTo(target.x-2*dir.x,target.z-2*dir.z,65);hit(g,h,target,40+rank*20+h.attack*.8+(target.maxHp-target.hp)*.08,'Q2','physical');h.sonicMarkUntil=0;spell.key='Q2';}else bolt({damage:35+rank*20+h.attack*.9,damageType:'physical'});}
      if(key==='W'){if(target&&target!==h)dashTo(target.x,target.z,range);shieldAlly(magic(h,rank,55,.45));if(target!==h)g._shield(h,magic(h,rank,55,.45),3);}
      if(key==='E'){circle(12,magic(h,rank,40,.6));for(const t of foes(g,h,12)){slow(g,t,.35,3);t.revealedUntil=g.time+3;}}
      if(key==='R'){spell.shape='line';spell.target=target.id;spell.radius=4;const v=P((target.x-h.x)/(dist(h,target)||1),(target.z-h.z)/(dist(h,target)||1)),origin=P(target.x,target.z);hit(g,h,target,100+rank*100+h.attack*1.2,'R','physical');if(!immune(g,target))g._airborne(target,1.1);push(g,target,h,22);spell.toX=target.x;spell.toZ=target.z;for(const t of lineTargets(g,{...origin,team:h.team},v,24,3))if(t.id!==target.id){hit(g,h,t,80+rank*65+h.attack,'R','physical');if(!immune(g,t))g._airborne(t,1);}}
      h.flurryHits=2;h.flurryUntil=g.time+4;break;
    case 'darius':
      if(key==='Q'){spell.radius=12;let heroes=0;for(const t of foes(g,h,12)){const outer=dist(h,t)>6;hit(g,h,t,(40+rank*25+h.attack*.8)*(outer?1:.5),'Q','physical');if(outer&&t.kind==='hero')heroes++;}heal(g,h,(h.maxHp-h.hp)*Math.min(.45,heroes*.15));}
      if(key==='W'){h.dariusWUntil=g.time+6;spell.radius=4;spell.x=h.x;spell.z=h.z;}
      if(key==='E'){spell.shape='cone';spell.radius=16;spell.toX=h.x+dir.x*16;spell.toZ=h.z+dir.z*16;for(const t of coneTargets(g,h,dir,16,.65))if(!immune(g,t)){pull(g,t,h,5);slow(g,t,.5,2);}}
      if(key==='R'){const stacks=target.bleeds?.[h.id]?.stacks||0;spell.shape='execute';spell.target=target.id;spell.x=target.x;spell.z=target.z;hit(g,h,target,(80+rank*70+h.attack*.8)*(1+stacks*.2),'R','true');if(!target.alive)h.cooldowns.R=0;}
      break;
    case 'malphite':
      if(key==='Q'){aimed();h.hasteUntil=g.time+3;}
      if(key==='W'){h.malphiteWUntil=g.time+6;h.fortifyUntil=g.time+3;spell.shape='shield';spell.x=h.x;spell.z=h.z;}
      if(key==='E'){circle(13,magic(h,rank,45,.6)+h.armor*.35);for(const t of foes(g,h,13))t.attackSlowUntil=g.time+3;}
      if(key==='R'){dashTo(spot.x,spot.z);circle(13,160+rank*80+h.ap*.8);for(const t of foes(g,h,13))if(!immune(g,t))g._airborne(t,1.5);spell.shape='dash';spell.toX=h.x;spell.toZ=h.z;}
      break;
    case 'blitzcrank':
      if(key==='Q')bolt({damage:magic(h,rank,55,.7),shape:'hook',radius:2.2});
      if(key==='W'){h.overdriveUntil=g.time+3;h.overdriveSlowAt=g.time+3;spell.x=h.x;spell.z=h.z;spell.shape='shield';}
      if(key==='E'){h.powerFistUntil=g.time+6;h.attackCooldown=0;spell.x=h.x;spell.z=h.z;}
      if(key==='R'){for(const t of foes(g,h,15)){t.shield=0;hit(g,h,t,130+rank*70+h.ap*.8,'R');if(!immune(g,t))t.silenceUntil=g.time+1.5;}spell.radius=15;spell.x=h.x;spell.z=h.z;}
      break;
    case 'leona':
      if(key==='Q'){h.leonaQUntil=g.time+6;h.attackCooldown=0;spell.x=h.x;spell.z=h.z;spell.shape='shield';}
      if(key==='W'){g._shield(h,90+rank*25,3);h.fortifyUntil=g.time+3;zone(g,h,'leona-eclipse','W',h.x,h.z,12,2.1,{armedAt:g.time+2,single:true,follow:true,damage:magic(h,rank,50,.5)});spell.shape='shield';spell.x=h.x;spell.z=h.z;}
      if(key==='E')bolt({heroesOnly:true,radius:2.4});
      if(key==='R')zone(g,h,'leona-solar','R',spot.x,spot.z,13,.7,{armedAt:g.time+.6,single:true,damage:150+rank*80+h.ap*.7});
      break;
    case 'vayne':
      if(key==='Q'){dashTo(spot.x,spot.z);h.vayneQUntil=g.time+5;if(h.finalHourUntil>g.time){h.vayneStealthUntil=g.time+1;h.stealthed=true;h.cooldowns.Q*=.5;}}
      if(key==='E')aimed(30+rank*20+h.attack*.5,{damageType:'physical'});
      if(key==='R'){h.finalHourUntil=g.time+8;spell.shape='shield';spell.x=h.x;spell.z=h.z;}
      break;
    case 'caitlyn':
      if(key==='Q')bolt({damage:35+rank*25+h.attack*1.2,damageType:'physical',pierce:true,falloff:.7,radius:2});
      if(key==='W'){const traps=g.zones.filter(z=>z.sourceId===h.id&&z.kind==='caitlyn-trap'&&!z.dead);if(traps.length>=3)traps[0].dead=true;zone(g,h,'caitlyn-trap','W',spot.x,spot.z,2.5,35,{armedAt:g.time+.6,trap:true});spell.radius=2.5;}
      if(key==='E'){bolt({damage:magic(h,rank,30,.5)});dashTo(h.x-dir.x*10,h.z-dir.z*10,10);}
      if(key==='R'){h.ext.channel={type:'snipe',until:g.time+1,targetId:target.id,damage:150+rank*100+h.attack*1.5};h.command=h.isPlayer?{type:'stop'}:{type:'ai'};spell.shape='channel';spell.target=target.id;spell.toX=target.x;spell.toZ=target.z;}
      break;
    case 'missfortune':
      if(key==='Q')aimed(15+rank*20+h.attack,{damageType:'physical'});
      if(key==='W'){h.strutUntil=g.time+5;spell.shape='shield';spell.x=h.x;spell.z=h.z;}
      if(key==='E')zone(g,h,'mf-rain','E',spot.x,spot.z,11,3,{damage:14+rank*9+h.ap*.15});
      if(key==='R'){h.ext.channel={type:'barrage',until:g.time+3};zone(g,h,'mf-channel','R',h.x,h.z,62,3,{direction:dir,damage:20+rank*13+h.attack*.25,tickEvery:.25});spell.shape='cone';spell.radius=62;spell.toX=h.x+dir.x*62;spell.toZ=h.z+dir.z*62;h.command=h.isPlayer?{type:'stop'}:{type:'ai'};}
      break;
    case 'sona':
      if(key==='Q'){spell.x=h.x;spell.z=h.z;spell.radius=30;const victims=foes(g,h,30).sort((a,b)=>(a.kind==='hero'?-1:1)-(b.kind==='hero'?-1:1)||dist(a,h)-dist(b,h)).slice(0,2);for(const t of victims){const p=g._tracking(h,t,magic(h,rank,30,.55),'magic','Q');p.effect='ext:sona:Q';}for(const a of allies(g,h,25))a.sonaEmpoweredUntil=g.time+5;zone(g,h,'sona-aura','Q',h.x,h.z,25,1,{follow:true});}
      if(key==='W'){heal(g,h,35+rank*20+h.ap*.25);const friend=allies(g,h,25).filter(a=>a.id!==h.id).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp)[0];if(friend)heal(g,friend,35+rank*20+h.ap*.25);for(const a of allies(g,h,25))g._shield(a,35+rank*15+h.ap*.2,3);spell.shape='shield';spell.x=h.x;spell.z=h.z;spell.radius=25;}
      if(key==='E'){for(const a of allies(g,h,25))a.hasteUntil=g.time+3;spell.shape='circle';spell.x=h.x;spell.z=h.z;spell.radius=25;zone(g,h,'sona-aura','E',h.x,h.z,25,3,{follow:true});}
      if(key==='R')bolt({pierce:true,radius:4,damage:120+rank*70+h.ap*.7});
      if(key!=='R'){h.ext.casts=(h.ext.casts||0)+1;if(h.ext.casts>=3){h.ext.casts=0;h.powerChordReady=true;}}break;
  }
  return true;
}

function detonateSatchel(g,h,s){if(!s||s.dead)return;s.dead=true;for(const t of foes(g,s,s.radius)){hit(g,h,t,s.damage,'W');if(!immune(g,t))push(g,t,s,12);}if(dist(h,s)<s.radius)push(g,h,s,12);for(const t of g.entities.filter(t=>t.alive&&t.kind==='tower'&&t.team!==h.team&&dist(t,s)<s.radius+t.radius&&t.hp<t.maxHp*.25&&g._canHitStructure(t,h)))g._damage(t,t.maxHp*10,'true',h,'W');emit(g,h,'W2','circle',{x:s.x,z:s.z,radius:s.radius});}

export function extendedSpellHit(g,h,t,key){
  if(!h?.ext)return;
  if(h.heroId==='brand'&&t.alive){
    const state=t.brandBurns?.[h.id];t.brandBurns??={};const stacks=state?.until>g.time?state.stacks+1:1;t.brandBurns[h.id]={stacks,until:g.time+4};
    g._poison(t,h,8+h.level*1.2+h.ap*.05,4,'BRAND_BURN');
    if(stacks>=3){t.brandBurns[h.id].stacks=0;for(const victim of foes(g,{...t,team:h.team},11))g._damage(victim,50+victim.maxHp*.05+h.ap*.2,'magic',h,'BRAND_EXPLOSION');emit(g,h,'PASSIVE','circle',{x:t.x,z:t.z,radius:11});}
  }
  if(h.heroId==='veigar'){
    const gain=(t.kind==='hero'?1:0)+(!t.alive&&key==='Q'&&t.kind!=='hero'?1:0);if(gain){h.ext.veigarAp+=gain;h.ap+=gain;}
  }
  if(h.heroId==='darius'&&t.alive&&key!=='R')bleed(g,h,t);
  if(h.heroId==='leona'&&t.alive){t.sunlightSource=h.id;t.sunlightUntil=g.time+4;}
}
function bleed(g,h,t){if(structure(t)||t.kind==='ward')return;t.bleeds??={};const previous=t.bleeds[h.id],stacks=previous?.until>g.time?Math.min(5,previous.stacks+1):1;t.bleeds[h.id]={stacks,until:g.time+5};g._poison(t,h,(3+h.level*.7+h.attack*.025)*stacks,5,'HEMORRHAGE');if(stacks===5)h.noxianMightUntil=g.time+5;}

export function extendedProjectileHit(g,p,t,h){
  if(!p.effect?.startsWith('ext:'))return false;
  const [,id,key]=p.effect.split(':');
  if(!h.ext)return true;
  const beforeAlive=t.alive,alreadyBurning=t.brandBurns?.[h.id]?.until>g.time;
  if(id==='ziggs'&&key==='Q'){for(const victim of foes(g,{...t,team:h.team},p.blastRadius||9))hit(g,h,victim,p.damage,'Q');emit(g,h,'Q_HIT','circle',{x:t.x,z:t.z,radius:p.blastRadius||9});return true;}
  if(id==='fizz'&&key==='R'){slow(g,t,.4,1.2);zone(g,h,'fizz-shark','R',t.x,t.z,13,1.1,{armedAt:g.time+1,single:true,targetId:t.id,damage:160+(h.skillLevels.R||1)*85+h.ap*.8});emit(g,h,'R_ATTACH','circle',{x:t.x,z:t.z,radius:4,target:t.id});return true;}
  if(id==='brand'&&key==='Q'&&alreadyBurning)stun(g,t,1.5);
  const spellshield=t.spellshieldCooldownUntil;hit(g,h,t,p.damage,key,p.damageType);if(t.spellshieldCooldownUntil!==spellshield)return true;
  if(id==='annie'&&key==='Q'){
    if(p.annieStun&&t.alive)stun(g,t,1.5);
    if(beforeAlive&&!t.alive){h.mana=Math.min(h.maxMana,h.mana+DATA.annie.skills[0].cost);h.cooldowns.Q*=.5;}
  }
  if(id==='brand'&&key==='R'&&p.bounces>0){
    const next=foes(g,{x:t.x,z:t.z,team:h.team},20,e=>e.id!==t.id).sort((a,b)=>(a.kind==='hero'?-1:1)-(b.kind==='hero'?-1:1)||dist(a,t)-dist(b,t))[0];
    if(next){const bounce=g._tracking(h,next,p.damage,'magic','R');Object.assign(bounce,{x:t.x,z:t.z,effect:'ext:brand:R',bounces:p.bounces-1});emit(g,h,'R_BOUNCE','line',{fromX:t.x,fromZ:t.z,toX:next.x,toZ:next.z,x:next.x,z:next.z,radius:1});}
  }
  if(id==='morgana'&&key==='Q')root(g,t,2.5);
  if(id==='leesin'&&key==='Q'&&t.alive){h.sonicMarkId=t.id;h.sonicMarkUntil=g.time+3;t.revealedUntil=g.time+3;emit(g,h,'Q_MARK','ring',{x:t.x,z:t.z,radius:3,target:t.id});}
  if(id==='malphite'&&key==='Q')slow(g,t,.4,3);
  if(id==='blitzcrank'&&key==='Q'&&t.alive&&!immune(g,t)){pull(g,t,h,5);stun(g,t,.5);emit(g,h,'Q_PULL','hook',{x:t.x,z:t.z,toX:t.x,toZ:t.z,target:t.id,radius:2});}
  if(id==='leona'&&key==='E'&&t.alive){g._dash(h,t.x,t.z,42);root(g,t,.7);emit(g,h,'E_DASH','dash',{x:h.x,z:h.z,toX:h.x,toZ:h.z,target:t.id,radius:3});}
  if(id==='vayne'&&key==='E'&&t.alive){
    const d=dist(h,t)||1,dx=(t.x-h.x)/d,dz=(t.z-h.z)/d,endpoint=P(t.x+dx*18,t.z+dz*18),wall=Math.abs(endpoint.x)>119||Math.abs(endpoint.z)>119||g.navigation&&!g.navigation.segmentClear(t,endpoint);
    if(!immune(g,t)){push(g,t,h,18);if(wall){stun(g,t,1.6);g._damage(t,p.damage,'physical',h,'E_WALL');}}emit(g,h,'E_PUSH','line',{x:t.x,z:t.z,toX:t.x,toZ:t.z,target:t.id,radius:3});
  }
  if(id==='caitlyn'&&key==='E'&&t.alive){slow(g,t,.5,2);h.ext.trapHeadshots[t.id]=g.time+5;}
  if(id==='missfortune'&&key==='Q'){
    const axis=P((t.x-h.x)/(dist(h,t)||1),(t.z-h.z)/(dist(h,t)||1));const next=foes(g,{x:t.x,z:t.z,team:h.team},16,e=>e.id!==t.id).filter(e=>(e.x-t.x)*axis.x+(e.z-t.z)*axis.z>0).sort((a,b)=>dist(a,t)-dist(b,t))[0];
    if(next){const bounce=g._tracking(h,next,p.damage*(t.alive?1:2),'physical','Q_BOUNCE');bounce.x=t.x;bounce.z=t.z;emit(g,h,'Q_BOUNCE','line',{fromX:t.x,fromZ:t.z,toX:next.x,toZ:next.z,x:next.x,z:next.z,radius:1});}
  }
  if(id==='sona'&&key==='R')stun(g,t,1.5);
  return true;
}
export function extendedProjectileEnd(g,p,h){if(p.explodeAtEnd&&!p.dead&&h){const target={x:p.x,z:p.z,hp:1,alive:true,team:p.team==='blue'?'red':'blue'};extendedProjectileHit(g,p,target,h);}}

export function extendedZoneUpdate(g,z){
  if(z.type!=='extended')return false;
  const h=g.getEntity(z.sourceId);if(!h){z.dead=true;return true;}
  if(z.follow){z.x=h.x;z.z=h.z;}if(z.targetId){const t=g.getEntity(z.targetId);if(t?.alive){z.x=t.x;z.z=t.z;}}
  if(z.kind==='ziggs-satchel'){if(z.until<=g.time)detonateSatchel(g,h,z);return true;}
  if(z.armedAt>g.time)return true;
  if(z.kind==='veigar-cage'){
    for(const t of foes(g,z,z.radius+3,e=>e.kind==='hero'))if(Math.abs(dist(t,z)-z.radius)<2.3&&!z.hit.has(t.id)){stun(g,t,1.8);z.hit.add(t.id);emit(g,h,'E_STUN','ring',{x:t.x,z:t.z,radius:3,target:t.id});}
  }else if(z.kind==='ziggs-mine'||z.kind==='caitlyn-trap'){
    const victim=foes(g,z,z.radius,e=>z.kind==='ziggs-mine'||e.kind==='hero')[0];
    if(victim){z.dead=true;if(z.kind==='caitlyn-trap'){root(g,victim,1.5);victim.revealedUntil=g.time+4;h.ext.trapHeadshots[victim.id]=g.time+5;}else{hit(g,h,victim,z.damage,'E');slow(g,victim,.4,2);}emit(g,h,`${z.key}_TRAP`,'circle',{x:z.x,z:z.z,radius:5,target:victim.id});}
  }else if(z.kind==='morgana-tether'){
    for(const id of z.targets){const t=g.getEntity(id);if(t?.alive&&dist(h,t)<z.radius){hit(g,h,t,z.damage,'R');stun(g,t,1.5);}}z.dead=true;emit(g,h,'R_STUN','circle',{radius:25});
  }else if(z.kind==='mf-channel'){
    if(!h.alive||h.ext.channel?.type!=='barrage'){z.dead=true;return true;}
    if(g.time>=z.nextTick){z.nextTick=g.time+z.tickEvery;for(const t of coneTargets(g,h,z.direction,z.radius,.46))hit(g,h,t,z.damage,'R','physical');}
  }else if(z.kind==='sona-aura'){
    // Aura visual persists; the buff has already been assigned to nearby allies.
  }else if(z.single){
    for(const t of foes(g,z,z.radius)){
      let amount=z.damage;if(z.kind==='brand-fire'&&t.brandBurns?.[h.id]?.until>g.time)amount*=1.25;if(z.kind==='ziggs-bomb')amount*=dist(t,z)<9?1.25:.8;
      hit(g,h,t,amount,z.key);
      if(z.kind==='fizz-landing')slow(g,t,.45,2);
      if(z.kind==='fizz-shark'&&!immune(g,t))g._airborne(t,1.2);
      if(z.kind==='leona-solar'){if(dist(t,z)<6)stun(g,t,1.5);else slow(g,t,.65,2);}
    }
    z.dead=true;emit(g,h,`${z.key}_HIT`,z.kind==='fizz-shark'?'summon':'circle',{x:z.x,z:z.z,radius:z.radius});
  }else if(g.time>=z.nextTick){
    z.nextTick=g.time+z.tickEvery;for(const t of foes(g,z,z.radius)){const amount=z.kind==='morgana-pool'?z.damage*(1+1-t.hp/t.maxHp):z.damage;hit(g,h,t,amount,z.key);if(z.kind==='mf-rain')slow(g,t,.45,.7);}
  }
  if(z.until<=g.time)z.dead=true;return true;
}

export function cancelExtendedChannel(g,h){
  if(!h.ext?.channel)return;h.ext.channel=null;h.meditateUntil=0;for(const z of g.zones)if(z.sourceId===h.id&&z.kind==='mf-channel')z.dead=true;
}
export function extendedHeroUpdate(g,h,dt){
  if(!h.ext)return false;
  if(!h.alive){cancelExtendedChannel(g,h);return false;}
  if(h.heroId==='leesin')h.mana=Math.min(h.maxMana,h.mana+8*dt);
  if(h.heroId==='malphite'&&g.time-h.lastDamagedAt>8&&!(h.graniteShieldUntil>g.time)){g._shield(h,h.maxHp*.1,999);h.graniteShieldUntil=g.time+999;}
  if(h.heroId==='blitzcrank'&&h.hp/h.maxHp<.3&&!(h.ext.manaBarrierAt>g.time)){g._shield(h,h.maxMana*.35,5);h.ext.manaBarrierAt=g.time+60;emit(g,h,'PASSIVE','shield',{radius:5});}
  if(h.heroId==='blitzcrank'&&h.overdriveSlowAt&&g.time>=h.overdriveSlowAt){h.slowUntil=g.time+1;h.slowPower=.3;h.overdriveSlowAt=0;}
  if(h.heroId==='vayne'&&h.vayneStealthUntil<=g.time)h.stealthed=false;
  const channel=h.ext.channel;if(!channel)return false;
  if(h.stunUntil>g.time||h.airborneUntil>g.time||h.silenceUntil>g.time){cancelExtendedChannel(g,h);return false;}
  if(channel.type==='meditate'){heal(g,h,(28+(h.skillLevels.W||1)*12+h.ap*.12)*dt);h.meditateUntil=channel.until;}
  if(g.time>=channel.until){
    if(channel.type==='snipe'){const target=g.getEntity(channel.targetId);if(target?.alive){const p=g._tracking(h,target,channel.damage,'physical','R');p.radius=1;p.speed=95;emit(g,h,'R_FIRE','line',{x:target.x,z:target.z,toX:target.x,toZ:target.z,target:target.id,radius:1});}}
    cancelExtendedChannel(g,h);return false;
  }
  return true;
}

export function extendedAttackSpeed(g,h){let multiplier=1;if(h.flurryHits>0&&h.flurryUntil>g.time)multiplier*=1.4;if(h.highlanderUntil>g.time)multiplier*=1.65;if(h.overdriveUntil>g.time)multiplier*=1.45;if(h.strutUntil>g.time)multiplier*=1.6;if(h.attackSlowUntil>g.time)multiplier*=.65;return multiplier;}
export function extendedMoveSpeed(g,h,target){let multiplier=1;if(h.highlanderUntil>g.time){h.slowUntil=0;multiplier*=1.4;}if(h.overdriveUntil>g.time)multiplier*=1.45;if(h.strutUntil>g.time)multiplier*=1.25;if(h.heroId==='vayne'&&foes(g,h,40,e=>e.kind==='hero'&&g.isVisible(e,h.team)).some(t=>(t.x-h.x)*(target.x-h.x)+(t.z-h.z)*(target.z-h.z)>0))multiplier*=1.2;return multiplier;}
export function extendedAttackAmount(g,h,t,amount){
  if(!h.ext)return amount;
  h.ext.attacks++;
  if(h.heroId==='ziggs'&&!(h.ext.shortFuseAt>g.time)){amount+=25+h.level*8+h.ap*.35;h.ext.shortFuseAt=g.time+10;}
  if(h.heroId==='masteryi'&&h.ext.attacks%4===0)amount+=h.attack*.5;
  if(h.heroId==='missfortune'&&h.ext.loveTarget!==t.id){amount+=h.attack*.35;h.ext.loveTarget=t.id;h.cooldowns.W=Math.max(0,h.cooldowns.W-1);}
  if(h.heroId==='caitlyn'){h.ext.headshot++;if(h.ext.headshot>=6||h.ext.trapHeadshots[t.id]>g.time){amount+=h.attack*(.65+h.crit*.5);h.ext.headshot=0;delete h.ext.trapHeadshots[t.id];}}
  if(h.heroId==='vayne'){if(h.finalHourUntil>g.time)amount+=20+(h.skillLevels.R||1)*10;if(h.vayneQUntil>g.time){amount+=h.attack*(.2+(h.skillLevels.Q||1)*.1);h.vayneQUntil=0;}h.vayneStealthUntil=0;h.stealthed=false;}
  if(h.heroId==='darius'&&h.dariusWUntil>g.time){amount*=1.4;h.dariusWUntil=0;slow(g,t,.75,1.5);}
  if(h.heroId==='blitzcrank'&&h.powerFistUntil>g.time)amount*=1.8;
  return amount;
}
export function extendedAttackHit(g,h,t,amount){
  if(!h?.ext)return;
  if(h.heroId==='blitzcrank'&&h.powerFistUntil>g.time){h.powerFistUntil=0;if(!immune(g,t))g._airborne(t,1);}
  if(h.heroId==='fizz'&&!structure(t)){g._poison(t,h,5+h.level+h.ap*.12,3,'FIZZ_BLEED');if(h.fizzWUntil>g.time){h.fizzWUntil=0;g._damage(t,20+(h.skillLevels.W||1)*20+h.ap*.5,'magic',h,'W');if(!t.alive)h.cooldowns.W*=.5;}}
  if(h.heroId==='masteryi'&&h.wujuUntil>g.time&&!structure(t))g._damage(t,15+(h.skillLevels.E||1)*9+h.attack*.15,'true',h,'E');
  if(h.heroId==='leesin'&&h.flurryHits>0&&h.flurryUntil>g.time){h.flurryHits--;h.mana=Math.min(h.maxMana,h.mana+15);}
  if(h.heroId==='darius'&&t.alive)bleed(g,h,t);
  if(h.heroId==='malphite'&&h.malphiteWUntil>g.time){h.malphiteWUntil=0;for(const victim of foes(g,{x:t.x,z:t.z,team:h.team},8))g._damage(victim,25+(h.skillLevels.W||1)*15+h.armor*.35,'magic',h,'W');}
  if(h.heroId==='leona'&&h.leonaQUntil>g.time){h.leonaQUntil=0;g._damage(t,20+(h.skillLevels.Q||1)*15+h.ap*.3,'magic',h,'Q');stun(g,t,1);}
  if(h.heroId==='vayne'&&h.skillLevels.W&&!structure(t)){const state=h.ext.silver[t.id]||{stacks:0,until:0};if(h.ext.lastSilverTarget!==t.id)for(const prior of Object.values(h.ext.silver))prior.stacks=0;state.stacks=state.until>g.time?state.stacks+1:1;state.until=g.time+4;h.ext.silver[t.id]=state;h.ext.lastSilverTarget=t.id;if(state.stacks>=3){state.stacks=0;g._damage(t,Math.max(35,t.maxHp*(.035+h.skillLevels.W*.012)),'true',h,'W');emit(g,h,'W_HIT','ring',{x:t.x,z:t.z,radius:4,target:t.id});}}
  if(h.heroId==='sona'&&h.powerChordReady){h.powerChordReady=false;g._damage(t,20+h.level*8+h.ap*.25,'magic',h,'POWER_CHORD');}
}
export function extendedAnyAttackHit(g,h,t){
  if(t.sunlightUntil>g.time){const source=g.getEntity(t.sunlightSource);t.sunlightUntil=0;g._damage(t,20+(source?.level||1)*5,'magic',source||h,'SUNLIGHT');}
  if(h.sonaEmpoweredUntil>g.time){h.sonaEmpoweredUntil=0;g._damage(t,15+h.level*3,'magic',h,'SONA_AURA');}
}
export function extendedDamageAmount(g,t,source,amount,type,key){
  if(t.heroId==='fizz'&&key==='attack')amount=Math.max(0,amount-8);
  if(t.meditateUntil>g.time)amount*=.4;
  if(t.heroId==='malphite')t.graniteShieldUntil=0;
  return amount;
}
export function extendedAfterDamage(g,h,t,amount,key){if(h?.heroId==='morgana'&&amount>0&&['Q','W','R'].includes(key)&&['hero','monster'].includes(t.kind))heal(g,h,amount*.15);}
export function extendedKill(g,h){if(h?.heroId==='masteryi'){for(const key of ['Q','W','E'])h.cooldowns[key]*=.3;if(h.highlanderUntil>g.time)h.highlanderUntil=g.time+7;}if(h?.heroId==='veigar'){h.ext.veigarAp+=5;h.ap+=5;}}
export function extendedDeath(g,h){if(!h.ext)return;cancelExtendedChannel(g,h);for(const key of ['overdriveSlowAt','sonicMarkUntil','fizzWUntil','wujuUntil','highlanderUntil','flurryUntil','dariusWUntil','noxianMightUntil','malphiteWUntil','overdriveUntil','powerFistUntil','leonaQUntil','finalHourUntil','vayneQUntil','vayneStealthUntil','strutUntil','blackShieldUntil','graniteShieldUntil'])h[key]=0;h.stealthed=false;h.flurryHits=0;h.powerChordReady=false;h.ext.annieStacks=0;h.ext.silver={};h.ext.lastSilverTarget=0;h.ext.trapHeadshots={};h.ext.casts=0;}

export function extendedSummonUpdate(g,e,dt){
  if(!e.summonType)return false;const h=g.getEntity(e.summonOwner);if(!h?.alive||g.time>=e.expiresAt){e.alive=false;return true;}
  const target=g._nearest(e,38,t=>!structure(t),true);if(target){g._walk(e,target,dt,e.attackRange+target.radius-.5);g._attack(e,target);}else g._walk(e,h,dt,7);
  if(!(e.auraTick>g.time)){e.auraTick=g.time+.5;for(const t of foes(g,e,7))g._damage(t,10+(h.skillLevels.R||1)*5+h.ap*.05,'magic',h,'TIBBERS');}return true;
}

export function extendedAI(g,h,t){
  if(!isExtended(h.heroId))return false;const d=dist(h,t),health=h.hp/h.maxHp,rank=h.skillLevels.R;
  const cast=key=>g._cast(h,key,t.x,t.z,t.id);
  if(t.kind==='minion'&&h.mana<h.maxMana*.5)return true;
  switch(h.heroId){
    case 'annie':if(d<30)cast('Q');if(d<22)cast('W');if(health<.75)g._cast(h,'E',h.x,h.z,h.id);if(rank&&t.kind==='hero'&&d<38)cast('R');break;
    case 'brand':if(d<30)cast('E');if(d<48)cast('Q');if(d<42)cast('W');if(rank&&t.kind==='hero'&&d<38)cast('R');break;
    case 'morgana':if(d<54)cast('Q');if(d<44)cast('W');if(health<.8)g._cast(h,'E',h.x,h.z,h.id);if(t.kind==='hero'&&d<25)cast('R');break;
    case 'veigar':if(d<38&&t.kind==='hero')cast('E');if(d<44)cast('W');if(d<48)cast('Q');if(t.kind==='hero'&&d<32&&t.hp/t.maxHp<.55)cast('R');break;
    case 'ziggs':if(d<50)cast('Q');if(d<40)cast('E');if(d<30)cast('W');if(t.kind==='hero'&&d<100)cast('R');break;
    case 'fizz':if(d<65&&t.kind==='hero')cast('R');if(d<22)cast('Q');if(d<10)g._cast(h,'W',h.x,h.z);if(d<20)cast('E');break;
    case 'masteryi':if(d<28)cast('Q');if(d<12)cast('E');if(t.kind==='hero'&&d<30)cast('R');if(health<.45)cast('W');break;
    case 'leesin':if(d<48||extendedRecast(g,h,'Q'))cast('Q');if(health<.7)g._cast(h,'W',h.x,h.z,h.id);if(d<12)cast('E');if(t.kind==='hero'&&d<12)cast('R');break;
    case 'darius':if(d<16)cast('E');if(d<12)cast('Q');if(d<9)cast('W');if(t.kind==='hero'&&d<15&&t.hp/t.maxHp<.45)cast('R');break;
    case 'malphite':if(d<32)cast('Q');if(d<13){cast('W');cast('E');}if(t.kind==='hero'&&d<45)cast('R');break;
    case 'blitzcrank':if(d<52)cast('Q');if(d>12)cast('W');if(d<10){cast('E');cast('R');}break;
    case 'leona':if(d<38)cast('E');if(d<12){cast('Q');cast('W');}if(t.kind==='hero'&&d<58)cast('R');break;
    case 'vayne':if(d<28&&t.kind==='hero')cast('E');if(d<35&&t.kind==='hero')cast('R');if(d<28&&h.cooldowns.Q<=0)g._cast(h,'Q',h.x-(t.x-h.x)*.3,h.z-(t.z-h.z)*.3);break;
    case 'caitlyn':if(d<60)cast('Q');if(d<25)cast('W');if(d<20)cast('E');if(t.kind==='hero'&&d>30&&d<110&&t.hp/t.maxHp<.5)cast('R');break;
    case 'missfortune':if(d<30)cast('Q');if(d<35)cast('W');if(d<44)cast('E');if(t.kind==='hero'&&d<62&&d>15)cast('R');break;
    case 'sona':if(d<30)cast('Q');if(health<.85||allies(g,h,25).some(a=>a.hp/a.maxHp<.7))cast('W');if(d>20)cast('E');if(t.kind==='hero'&&d<48)cast('R');break;
  }
  return true;
}
