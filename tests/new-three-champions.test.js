import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, CHAMPIONS } from '../src/simulation.js';
import { extendedRecast, extendedAI } from '../src/champion-abilities.js';

const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
function tick(g,seconds){for(let n=0;n<Math.ceil(seconds/.05);n++)g.update(.05);}
function arena(id,practice=true){
  const g=new Game({hero:id,practice:true}),h=g.player,t=g._hero('lux','red','mid');
  Object.assign(h,{x:0,z:0,crit:0,mana:300});Object.assign(t,{x:12,z:0,hp:10000,maxHp:10000,armor:0,magicResist:0,isPlayer:true,command:{type:'stop'},stunUntil:10000});g.entities=[h,t];g._nextWave=1e6;g.practice=practice;return{g,h,t};
}
function target(g,x,z,kind='hero',hp=10000){const t=kind==='hero'?g._hero('lux','red','mid'):g._entity({kind,team:'red',minionType:'melee',path:[],speed:0});Object.assign(t,{x,z,hp,maxHp:hp,armor:0,magicResist:0,isPlayer:true,command:{type:'stop'},stunUntil:10000});return t;}
function attack(g,h,t){h.attackCooldown=0;assert.ok(g._attack(h,t));tick(g,.4);}
function equip(g,h,...ids){h.inventory=Array.from({length:6},(_,i)=>ids[i]?{id:ids[i],count:1,cooldown:0}:null);g._recomputeStats(h);}

test('27 champions include complete metadata for Twisted Fate, KaiSa and Camille',()=>{
  assert.equal(CHAMPIONS.length,27);for(const id of ['twistedfate','kaisa','camille']){const c=CHAMPIONS.find(c=>c.id===id);assert.ok(c.name&&c.title&&c.passive.description&&c.combo);assert.deepEqual(c.skills.map(s=>s.key),['Q','W','E','R']);assert.ok(c.description.includes(c.passive.description));}
});

test('KaiSa Q fires six missiles, distributes them across nearby visible units and hits isolated targets harder',()=>{
  const{g,h,t}=arena('kaisa');g.cast('Q');assert.equal(g.projectiles.length,6);assert.ok(g.projectiles.every(p=>p.targetId===t.id));tick(g,.4);const solo=10000-t.hp;assert.ok(solo>100);
  const{g:c,h:p,t:a}=arena('kaisa');const b=target(c,14,3);c.cast('Q');assert.equal(c.projectiles.filter(q=>q.targetId===a.id).length,3);assert.equal(c.projectiles.filter(q=>q.targetId===b.id).length,3);tick(c,.4);assert.ok(10000-a.hp<solo);assert.ok(b.hp<10000);assert.equal(a.kaisaPlasma,undefined);
  g.practice=false;t.x=80;const hidden=target(g,10,0);hidden.stealthed=true;h.cooldowns.Q=0;g.projectiles=[];g.cast('Q');assert.equal(g.projectiles.length,0);
});

test('KaiSa actual autos stack five plasma hits, W adds two and expiry restarts the sequence',()=>{
  const{g,h,t}=arena('kaisa');for(let i=0;i<4;i++)attack(g,h,t);assert.equal(t.kaisaPlasma[h.id].stacks,4);attack(g,h,t);assert.equal(t.kaisaPlasma[h.id].stacks,0);assert.ok(g.events.some(e=>e.key==='PLASMA_BURST'));
  h.cooldowns.W=0;g.cast('W',t.x,t.z);tick(g,.3);assert.equal(t.kaisaPlasma[h.id].stacks,2);g.time+=4.1;attack(g,h,t);assert.equal(t.kaisaPlasma[h.id].stacks,1);
  h.blindUntil=g.time+3;h.attackCooldown=0;g._attack(h,t);tick(g,.4);assert.equal(t.kaisaPlasma[h.id].stacks,1);
});

test('KaiSa purchases evolve all three abilities at equipment thresholds and selling stats removes their evolutions',()=>{
  const{g,h,t}=arena('kaisa');for(const id of ['bf-sword','bf-sword','pickaxe','needlessly-large-rod','needlessly-large-rod','runaans'])assert.ok(g.buy(id));assert.equal(h.ext.evolutions.Q,true);assert.equal(h.ext.evolutions.W,true);assert.equal(h.ext.evolutions.E,false);assert.ok(h.ext.evolutionStats.attack>=100);assert.ok(h.ext.evolutionStats.ap>=100);assert.ok(g.sell(0));assert.equal(h.ext.evolutions.Q,false);
  equip(g,h,'phantom-dancer','runaans','rapid-firecannon');assert.equal(h.ext.evolutions.E,true);assert.equal(h.ext.evolutions.Q,false);assert.equal(h.ext.evolutions.W,false);
  equip(g,h,'bf-sword','bf-sword','pickaxe');g.cast('Q');assert.equal(g.projectiles.length,12);equip(g,h,'needlessly-large-rod','needlessly-large-rod');h.cooldowns.W=0;g.cast('W',t.x,t.z);const initial=h.cooldowns.W;tick(g,.3);assert.equal(t.kaisaPlasma[h.id].stacks,3);assert.ok(h.cooldowns.W<initial*.35);
  equip(g,h);assert.deepEqual(h.ext.evolutions,{Q:false,W:false,E:false});assert.deepEqual(h.ext.evolutionStats,{attack:0,ap:0,attackSpeed:0});
});

test('KaiSa E permits fast movement while charging, blocks hero spells and attacks, then grants attack speed and evolved stealth',()=>{
  const{g,h,t}=arena('kaisa',false);equip(g,h,'phantom-dancer','runaans','rapid-firecannon');assert.ok(g.cast('E'));assert.ok(h.stealthed);const mana=h.mana;assert.equal(g.cast('Q'),false);assert.equal(h.mana,mana);assert.equal(h.cooldowns.Q,0);assert.equal(g._attack(h,t),false);
  g.moveTo(30,0);tick(g,.4);assert.ok(h.x>h.speed*.4*1.3);assert.ok(h.stealthed);tick(g,.5);assert.equal(h.stealthed,false);assert.ok(h.kaisaAttackUntil>g.time);h.x=0;h.command={type:'stop'};h.attackCooldown=0;g._attack(h,t);close(h.attackCooldown,1/(h.attackSpeed*1.5));
});

test('KaiSa R requires her own current plasma on a visible hero and never spends resources on invalid or rooted targets',()=>{
  const{g,h,t}=arena('kaisa',false);t.x=50;const mana=h.mana;assert.equal(g.cast('R',t.x,t.z,t.id),false);assert.equal(h.cooldowns.R,0);assert.equal(h.mana,mana);
  t.kaisaPlasma={[h.id]:{stacks:1,until:10}};assert.equal(g.cast('R',t.x,t.z,t.id),false,'fog');g._addWard(h,40,0,false);h.rootUntil=10;assert.equal(g.cast('R',t.x,t.z,t.id),false,'root');h.rootUntil=0;assert.ok(g.cast('R',t.x,t.z,t.id));assert.ok(Math.hypot(h.x-t.x,h.z-t.z)<=7);assert.ok(h.shield>0&&h.shieldUntil>g.time);assert.equal(h.cooldowns.R,80);
  h.cooldowns.R=0;t.kaisaPlasma[h.id].until=0;const after=h.mana;assert.equal(g.cast('R',t.x,t.z,t.id),false);assert.equal(h.mana,after);const minion=target(g,h.x+5,h.z,'minion');minion.kaisaPlasma={[h.id]:{stacks:1,until:10}};assert.equal(g.cast('R',minion.x,minion.z,minion.id),false);
});

test('Twisted Fate Q creates three penetrating cards that hit their distinct forward lanes',()=>{
  const{g,h,t}=arena('twistedfate');t.x=30;const left=target(g,30*Math.cos(.23),-30*Math.sin(.23)),right=target(g,30*Math.cos(.23),30*Math.sin(.23)),behind=target(g,-20,0),second=target(g,42,0);
  assert.ok(g.cast('Q',60,0));assert.equal(g.projectiles.length,3);assert.ok(g.projectiles.every(p=>p.pierce));tick(g,1.1);for(const e of [t,left,right,second])assert.ok(e.hp<10000);assert.equal(behind.hp,10000);
});

test('Twisted Fate W cycles blue red gold and locks one card without extra cost, then a real hit uses its distinct effect',()=>{
  for(const[card,time]of [['blue',0],['red',.6],['gold',1.1]]){
    const{g,h,t}=arena('twistedfate',false);const other=target(g,16,2);t.stunUntil=10000;assert.ok(g.cast('W'));g.time=time;g._heroUpdate(h,0);assert.equal(h.ext.cardChoice,card);const mana=h.mana,cd=h.cooldowns.W;assert.ok(extendedRecast(g,h,'W'));assert.ok(g.cast('W'));assert.equal(h.mana,mana);assert.equal(h.cooldowns.W,cd);assert.equal(h.ext.lockedCard,card);assert.equal(g.cast('W'),false);
    t.stunUntil=0;t.isPlayer=true;attack(g,h,t);assert.equal(h.ext.lockedCard,null);assert.ok(g.events.some(e=>e.key===`CARD_${card.toUpperCase()}`));
    if(card==='blue')assert.ok(h.mana>mana+40);if(card==='red'){assert.ok(other.hp<10000);assert.ok(t.slowUntil>g.time);}if(card==='gold')assert.ok(t.stunUntil>g.time);
  }
});

test('Twisted Fate fourth landed attack adds E damage, blind misses do not advance it and last hits grant only one random gold bonus',()=>{
  const{g,h,t}=arena('twistedfate');for(let i=0;i<3;i++)attack(g,h,t);assert.equal(h.ext.stackedDeck,3);assert.equal(g.events.filter(e=>e.key==='E_HIT').length,0);attack(g,h,t);assert.equal(h.ext.stackedDeck,0);assert.equal(g.events.filter(e=>e.key==='E_HIT').length,1);
  h.blindUntil=g.time+2;attack(g,h,t);assert.equal(h.ext.stackedDeck,0);h.blindUntil=0;const minion=target(g,10,0,'minion',1),gold=h.gold,passiveEvents=g.events.filter(e=>e.key==='LOADED_DICE').length;g._damage(minion,10,'true',h,'Q');const gain=h.gold-gold;assert.ok(gain>=22&&gain<=27);assert.equal(g.events.filter(e=>e.key==='LOADED_DICE').length,passiveEvents+1);g._die(minion,h);assert.equal(h.gold-gold,gain);
});

test('Twisted Fate destiny reveals even globally stealthed heroes to its own team and its gate is a single free recast',()=>{
  const{g,h,t}=arena('twistedfate',false);t.x=100;t.z=-80;t.stealthed=true;assert.equal(g.isVisible(t,h.team),false);assert.ok(g.cast('R'));assert.equal(g.isVisible(t,h.team),true);assert.ok(h.ext.gateReady);const mana=h.mana,cd=h.cooldowns.R;assert.equal(g.cast('R',119,-119),false);assert.equal(h.mana,mana);assert.equal(h.cooldowns.R,cd);assert.ok(h.ext.gateReady);
  assert.ok(g.cast('R',70,-30));assert.equal(h.mana,mana);assert.equal(h.cooldowns.R,cd);assert.equal(h.ext.gateReady,false);assert.equal(g.cast('R',40,0),false);tick(g,1.6);close(h.x,70);close(h.z,-30);assert.ok(g.events.some(e=>e.key==='GATE'));g.time=6.1;assert.equal(g.isVisible(t,'blue'),false);
});

test('Twisted Fate gate respects crowd control and cancels on movement, casting and death while expiry prevents another free gate',()=>{
  for(const cancel of [(g,h)=>g.moveTo(1,1),(g,h)=>g.cast('Q',10,0),(g,h)=>{h.stunUntil=10;},(g,h)=>g._die(h,g.entities[1])]){const{g,h}=arena('twistedfate');g.cast('R');g.cast('R',80,0);cancel(g,h);tick(g,.1);assert.equal(h.ext.channel,null);assert.ok(h.x<20);}
  const{g,h}=arena('twistedfate',false);g.cast('R');h.rootUntil=5;const mana=h.mana;assert.equal(g.cast('R',40,0),false);assert.equal(h.mana,mana);assert.ok(h.ext.gateReady);h.rootUntil=0;g.time=6.1;assert.equal(extendedRecast(g,h,'R'),false);assert.equal(g.cast('R',40,0),false);
});

test('Camille Q requires landed first attack, arms a free second attack and delayed Q2 converts all damage to true',()=>{
  for(const wait of [false,true]){
    const{g,h,t}=arena('camille',false);h.x=7;t.armor=100;assert.ok(g.cast('Q'));const mana=h.mana,cd=h.cooldowns.Q;assert.equal(g.cast('Q'),false);assert.equal(h.mana,mana);attack(g,h,t);assert.equal(h.ext.camilleQStage,1);assert.ok(extendedRecast(g,h,'Q'));assert.ok(g.cast('Q'));close(h.mana,mana+.8);assert.ok(h.cooldowns.Q<cd);if(wait)tick(g,1.2);const before=t.hp;attack(g,h,t);const amount=h.attack*(1.2+h.skillLevels.Q*.05);assert.ok(before-t.hp>amount*(wait?.95:.45));assert.ok(before-t.hp<amount*(wait?1.05:.55));assert.equal(h.ext.camilleQStage,0);assert.equal(h.ext.camilleQArmed,0);
  }
});

test('Camille W outer edge slows and heals from hero damage while the inner cone does neither',()=>{
  const{g,h,t}=arena('camille');h.hp=100;t.x=18;t.stunUntil=10000;const inner=target(g,5,0),behind=target(g,-10,0);g.cast('W',30,0);assert.ok(h.hp>100);assert.ok(t.slowUntil>g.time);assert.equal(inner.slowUntil,undefined);assert.equal(behind.hp,10000);assert.ok(10000-t.hp>10000-inner.hp);
});

test('Camille E requires an actual wall, charges only once and a second directional jump damages and stuns a hero',()=>{
  const{g,h,t}=arena('camille',false);const mana=h.mana;assert.equal(g.cast('E',25,0),false);assert.equal(h.cooldowns.E,0);assert.equal(h.mana,mana);g.setObstacles([{x:20,z:0,r:4}]);assert.ok(g.cast('E',30,0));assert.ok(h.x>10&&h.x<20);assert.ok(g.navigation.pointClear(h));assert.ok(extendedRecast(g,h,'E'));const paid=h.mana,cd=h.cooldowns.E;t.x=h.x+16;t.z=0;t.stunUntil=0;assert.ok(g.cast('E',t.x,t.z));assert.equal(h.mana,paid);assert.equal(h.cooldowns.E,cd);assert.ok(t.hp<10000);assert.ok(t.stunUntil>g.time);assert.equal(extendedRecast(g,h,'E'),false);
  h.cooldowns.E=0;h.x=100;g.cast('E',130,0);assert.ok(h.ext.hookUntil>g.time);g.time+=2.1;assert.equal(extendedRecast(g,h,'E'),false);
});

test('Camille adaptive shield has its own cooldown and a duel confines walking, flashes and knockbacks until expiration',()=>{
  const{g,h,t}=arena('camille');h.x=7;attack(g,h,t);assert.ok(h.shield>0);const cooldown=h.ext.adaptiveShieldAt;h.shield=0;attack(g,h,t);assert.equal(h.shield,0);assert.equal(h.ext.adaptiveShieldAt,cooldown);h.cooldowns.R=0;g.cast('R',t.x,t.z,t.id);const ring=g.zones.find(z=>z.kind==='camille-duel');assert.ok(ring);t.stunUntil=0;t.x=ring.x;t.z=ring.z;
  g._dash(t,80,0,100);assert.ok(Math.hypot(t.x-ring.x,t.z-ring.z)<=ring.radius);g._walk(t,{x:100,z:0},1);assert.ok(Math.hypot(t.x-ring.x,t.z-ring.z)<=ring.radius);t.summoners.D='flash';g._cast(t,'D',-80,0);assert.ok(Math.hypot(t.x-ring.x,t.z-ring.z)<=ring.radius);
  g.time=ring.until+.1;g._dash(t,80,0,100);assert.ok(t.x>40);
});

test('Camille duel ends immediately when its caster leaves or either participant dies and R rejects nonheroes',()=>{
  const{g,h,t}=arena('camille',false),m=target(g,10,0,'minion');const mana=h.mana;assert.equal(g.cast('R',10,0,m.id),false);assert.equal(h.mana,mana);assert.equal(h.cooldowns.R,0);g.cast('R',t.x,t.z,t.id);const ring=g.zones.find(z=>z.kind==='camille-duel');g._dash(h,-60,0,100);g._dash(t,60,0,100);assert.ok(t.x>40);tick(g,.05);assert.equal(ring.dead,true);
  h.x=t.x-5;h.cooldowns.R=0;g.cast('R',t.x,t.z,t.id);const second=g.zones.find(z=>!z.dead&&z.kind==='camille-duel');g._die(t,h);assert.equal(second.dead,true);
});

test('new champion AI uses valid cards, KaiSa plasma tools and Camille terrain combos instead of spending invalid cooldowns',()=>{
  const{g,h,t}=arena('twistedfate');extendedAI(g,h,t);assert.ok(h.ext.cardCycle);g.time=1.1;extendedAI(g,h,t);assert.equal(h.ext.lockedCard,'gold');
  const{g:k,h:p,t:v}=arena('kaisa');extendedAI(k,p,v);assert.ok(k.projectiles.some(q=>q.skill==='Q'));assert.ok(k.projectiles.some(q=>q.skill==='W'));assert.ok(p.kaisaEUntil>k.time);
  const{g:c,h:a,t:b}=arena('camille');b.x=25;extendedAI(c,a,b);assert.equal(a.cooldowns.E,0);c.setObstacles([{x:15,z:0,r:3}]);extendedAI(c,a,b);assert.ok(a.ext.hookUntil>c.time);extendedAI(c,a,b);assert.ok(b.hp<10000);assert.ok(b.stunUntil>c.time);
});

test('recasts safely reject missing state and all temporary card, evolution charging and Camille combo states reset on death',()=>{
  for(const heroId of ['twistedfate','camille','kaisa'])assert.equal(extendedRecast({time:1},{heroId},'Q'),false);
  const{g,h}=arena('twistedfate');g.cast('W');g.cast('W');g.cast('R');g._die(h,g.entities[1]);assert.equal(h.ext.cardCycle,null);assert.equal(h.ext.lockedCard,null);assert.equal(h.ext.gateReady,false);
  const{g:k,h:a}=arena('kaisa');equip(k,a,'phantom-dancer','runaans','rapid-firecannon');k.cast('E');assert.ok(a.stealthed);k._die(a,k.entities[1]);assert.equal(a.kaisaEUntil,0);assert.equal(a.stealthed,false);assert.ok(a.ext.evolutions.E);
  const{g:c,h:b}=arena('camille');c.cast('Q');c.setObstacles([{x:20,z:0,r:4}]);c.cast('E',25,0);c._die(b,c.entities[1]);assert.equal(b.ext.camilleQArmed,0);assert.equal(b.ext.hookUntil,0);assert.equal(b.ext.hookAnchor,null);
});
