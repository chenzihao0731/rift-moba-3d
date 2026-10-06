import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, CHAMPIONS } from '../src/simulation.js';

function tick(game,seconds){for(let i=0;i<Math.ceil(seconds/.05);i++)game.update(.05);}
function arena(hero){
  const game=new Game({hero,practice:true}),player=game.player,target=game.entities.find(e=>e.kind==='hero'&&e.team==='red');
  game.entities=[player,target];game._nextWave=100000;player.x=0;player.z=0;
  target.x=12;target.z=0;target.hp=target.maxHp=10000;target.armor=target.magicResist=0;target.speed=0;target.stunUntil=10000;
  return{game,player,target};
}

test('all eight champions publish complete aim metadata and new passives',()=>{
  assert.equal(CHAMPIONS.length,8);
  for(const id of ['yasuo','teemo','jinx']){
    const champion=CHAMPIONS.find(c=>c.id===id);assert.ok(champion.passive?.description);
    assert.deepEqual(champion.skills.map(s=>s.key),['Q','W','E','R']);
    for(const skill of champion.skills){assert.ok(Number.isFinite(skill.range));assert.ok(['self','target','ground','direction'].includes(skill.targeting));}
  }
  assert.equal(CHAMPIONS.find(c=>c.id==='teemo').skills.find(s=>s.key==='E').passive,true);
});

test('Yasuo stacks successful Q strikes, launches the third tornado and ult requires airborne heroes',()=>{
  const{game,player,target}=arena('yasuo');
  assert.equal(game.cast('R',target.x,target.z,target.id),false);
  assert.equal(player.cooldowns.R,0);
  for(let i=0;i<2;i++){player.cooldowns.Q=0;assert.ok(game.cast('Q',target.x,target.z));assert.equal(player.qStacks,i+1);}
  player.cooldowns.Q=0;assert.ok(game.cast('Q',target.x,target.z));
  assert.equal(player.qStacks,0);assert.ok(game.projectiles.some(p=>p.hero==='yasuo'&&p.skill==='Q3'));
  tick(game,.4);assert.ok(target.airborneUntil>game.time);
  const hp=target.hp;assert.ok(game.cast('R',target.x,target.z,target.id));assert.ok(target.hp<hp-200);
  assert.ok(Math.hypot(player.x-target.x,player.z-target.z)<4);
  assert.ok(target.airborneUntil>game.time);assert.equal(player.flow,100);
});

test('Yasuo wind wall removes hostile spells and auto attacks but cannot block turret attacks',()=>{
  const{game,player,target}=arena('yasuo');target.x=24;
  assert.ok(game.cast('W',target.x,0));const wall=game.zones[0];
  assert.equal(wall.kind,'windwall');assert.ok(Number.isInteger(wall.id));
  const hp=player.hp;
  game._projectile(target,{x:-1,z:0},{skill:'Q',speed:40,range:50,damage:300,damageType:'true'});
  game._tracking(target,player,300,'true');tick(game,.6);
  assert.ok(player.hp>=hp);assert.equal(game.projectiles.length,0);
  assert.ok(game.events.some(e=>e.key==='WALL_BLOCK'));
  const tower=game._entity({kind:'tower',team:'red',x:24,z:0,hp:1000,maxHp:1000,attackRange:0,attackCooldown:100});
  game._tracking(tower,player,100,'true');tick(game,.6);assert.ok(player.hp<hp-80);
});

test('Yasuo dash locks each target independently, movement generates shields and items double crit',()=>{
  const{game,player,target}=arena('yasuo');
  assert.ok(game.cast('E',target.x,target.z,target.id));assert.ok(player.x>target.x);
  player.cooldowns.E=0;assert.equal(game.cast('E',target.x,target.z,target.id),false);
  const other=game._entity({kind:'minion',team:'red',x:22,z:4,hp:500,maxHp:500,radius:1,stunUntil:10000});
  assert.ok(game.cast('E',other.x,other.z,other.id));
  game.moveTo(65,10);tick(game,3);assert.equal(player.flow,100);
  const hp=player.hp;game._damage(player,100,'true',target);assert.equal(player.flow,0);assert.equal(player.hp,hp);assert.ok(player.shield>0);
  assert.ok(game.buy('cloak-of-agility'));assert.equal(player.crit,.3);
});

test('Teemo blind causes melee and ranged auto attacks to miss, with Q damage still applied',()=>{
  const{game,player,target}=arena('teemo');
  const hp=target.hp;assert.ok(game.cast('Q',target.x,target.z,target.id));tick(game,.3);
  assert.ok(target.hp<hp-70);assert.ok(target.blindUntil>game.time);
  target.stunUntil=0;target.isPlayer=true;target.command={type:'stop'};target.attackRange=6;target.x=3;target.attackCooldown=0;
  const initial=player.hp;assert.ok(game._attack(target,player));assert.equal(player.hp,initial);
  target.attackRange=24;target.attackCooldown=0;target.x=12;assert.ok(game._attack(target,player));tick(game,.4);
  assert.ok(player.hp>=initial);
});

test('Teemo learns poison as a passive: attacks add magic damage and sustained poison, W speeds movement',()=>{
  const{game,player,target}=arena('teemo');
  assert.equal(game.cast('E',0,0),false);assert.equal(player.cooldowns.E,0);
  game.attackTarget(target.id);tick(game,.35);game.stop();
  assert.ok(target.poisonUntil>game.time);assert.ok(game.events.some(e=>e.key==='E'));
  const hp=target.hp;tick(game,1.5);assert.ok(target.hp<hp-10);
  player.x=0;player.z=0;assert.ok(game.cast('W',0,0));game.moveTo(100,0);tick(game,1);
  assert.ok(player.x>player.speed*1.3);
});

test('Teemo mushrooms use charges, stay hidden without true sight, detonate on enemies and regenerate',()=>{
  const{game,player,target}=arena('teemo');target.x=70;game.practice=false;
  assert.equal(player.shroomCharges,3);
  for(const x of [8,16,24]){player.cooldowns.R=0;assert.ok(game.cast('R',x,0));}
  assert.equal(player.shroomCharges,0);assert.equal(game.zones.length,3);
  player.cooldowns.R=0;assert.equal(game.cast('R',20,0),false);
  const mushroom=game.zones[0];assert.equal(mushroom.kind,'mushroom');assert.equal(game.isZoneVisible(mushroom,'red'),false);
  game._addWard(target,8,0,false);assert.equal(game.isZoneVisible(mushroom,'red'),false);
  game._addWard(target,8,0,true);assert.equal(game.isZoneVisible(mushroom,'red'),true);
  tick(game,.9);target.x=8;target.z=0;const hp=target.hp;tick(game,.1);
  assert.equal(mushroom.dead,true);assert.ok(target.hp<hp);assert.ok(target.poisonUntil>game.time);assert.ok(target.slowUntil>game.time);
  assert.ok(game.events.some(e=>e.key==='MUSHROOM'&&e.target===target.id));
  tick(game,24);assert.ok(player.shroomCharges>=1);
});

test('Teemo stealth hides him from ordinary sight, breaks on attack and rewards an ambush',()=>{
  const{game,player,target}=arena('teemo');game.practice=false;
  tick(game,2.3);assert.equal(player.stealthed,true);assert.equal(game.isVisible(player,'red'),false);
  game._addWard(target,0,0,true);assert.equal(game.isVisible(player,'red'),true);
  assert.ok(game.attackTarget(target.id));tick(game,.1);
  assert.equal(player.stealthed,false);assert.ok(player.ambushUntil>game.time);
});

test('Jinx weapon swap changes range and mana, rockets splash while minigun stacks attack speed',()=>{
  const{game,player,target}=arena('jinx');target.x=25;
  const other=game._entity({kind:'minion',team:'red',x:27,z:2,hp:1000,maxHp:1000,armor:0,radius:1,stunUntil:10000});
  const originalRange=player.attackRange;assert.ok(game.cast('Q'));assert.equal(player.rocketMode,true);assert.ok(player.attackRange>originalRange);
  const mana=player.mana;assert.ok(game._attack(player,target));assert.equal(player.mana,mana-20);
  tick(game,.65);assert.ok(other.hp<other.maxHp);assert.ok(game.events.some(e=>e.key==='EXPLOSION'));
  player.cooldowns.Q=0;assert.ok(game.cast('Q'));target.x=12;
  let initialCooldown=0;
  for(let i=0;i<3;i++){player.attackCooldown=0;assert.ok(game._attack(player,target));if(i===0)initialCooldown=player.attackCooldown;}
  assert.equal(player.minigunStacks,3);assert.ok(player.attackCooldown<initialCooldown);
  player.cooldowns.Q=0;assert.ok(game.cast('Q'));player.mana=5;player.attackCooldown=0;assert.ok(game._attack(player,target));assert.equal(player.rocketMode,false);assert.equal(player.attackRange,originalRange);
});

test('Jinx W slows and reveals, three armed chompers root only heroes and obey fog visibility',()=>{
  const{game,player,target}=arena('jinx');
  assert.ok(game.cast('W',target.x,0));tick(game,.3);assert.ok(target.slowUntil>game.time);assert.ok(target.revealedUntil>game.time);
  target.x=60;assert.ok(game.cast('E',20,0));const traps=game.zones.filter(z=>z.type==='jinx-chompers');assert.equal(traps.length,3);
  const minion=game._entity({kind:'minion',team:'red',x:20,z:0,hp:500,maxHp:500,radius:1,stunUntil:10000});
  tick(game,.8);assert.equal(traps.filter(z=>z.dead).length,0,'minions must not trigger chompers');
  target.x=20;target.z=0;tick(game,.1);assert.ok(target.rootUntil>game.time);assert.ok(traps.some(z=>z.dead));
  assert.ok(game.events.some(e=>e.key==='TRAP'));
  game.practice=false;const far=game._zone('jinx-chompers',target,{x:100,z:-100,radius:2.7,until:game.time+5});assert.equal(game.isZoneVisible(far),false);
});

test('Jinx ultimate ignores minions, explodes on heroes with travel and missing-health scaling, and kills excite her',()=>{
  const{game,player,target}=arena('jinx');target.x=80;target.hp=700;
  const minion=game._entity({kind:'minion',team:'red',x:25,z:0,hp:500,maxHp:500,radius:1,stunUntil:10000});
  assert.ok(game.cast('R',target.x,0));tick(game,2);
  assert.equal(minion.hp,minion.maxHp,'rocket must fly through distant minions');
  assert.equal(target.alive,false);assert.ok(player.excitedUntil>game.time);
  assert.ok(game.events.some(e=>e.key==='ROCKET_HIT'));assert.ok(game.events.some(e=>e.key==='EXCITED'));
  game.moveTo(100,0);tick(game,1);assert.ok(player.x>player.speed*1.5);
});

test('stable inventory slots survive use and equipment recomputation never gives free healing',()=>{
  const{game,player}=arena('yasuo');assert.equal(player.inventory.length,6);assert.ok(player.inventory.every(s=>s===null));
  assert.ok(game.buy('potion'));assert.ok(game.buy('long-sword'));const sword=player.inventory[1];
  assert.ok(game.useItem(0));assert.equal(player.inventory[0],null);assert.equal(player.inventory[1],sword);assert.equal(player.inventory.length,6);
  player.hp=100;assert.ok(game.buy('ruby-crystal'));assert.equal(player.hp,100);assert.ok(game.sell(0));assert.equal(player.hp,100);
});

test('hidden Teemo cannot be acquired or retained by enemy minions and towers',()=>{
  const{game,player}=arena('teemo');game.practice=false;game.entities=[player];
  player.stealthed=true;player.stealthStill=3;
  const minion=game._entity({kind:'minion',team:'red',x:3,z:0,hp:100,maxHp:100,radius:1,attack:30,attackRange:5,speed:0,path:[],pathIndex:0,minionType:'melee'});
  const tower=game._entity({kind:'tower',team:'red',x:10,z:0,hp:1000,maxHp:1000,attack:100,attackRange:24,radius:3,aggroId:player.id});
  minion.targetId=player.id;
  const hp=player.hp;tick(game,.2);
  assert.equal(game.isVisible(player,'red'),false);assert.equal(player.stealthed,true);
  assert.ok(player.hp>=hp);assert.equal(minion.targetId,0);assert.equal(tower.aggroId,0);
  assert.equal(game.events.some(e=>e.type==='attack'&&e.target===player.id),false);
  game._addWard({id:999,team:'red'},0,0,true);tick(game,.2);
  assert.ok(game.events.some(e=>e.type==='attack'&&e.target===player.id),'true sight allows acquisition again');
});

test('Yasuo rejects explicit airborne targets hidden by fog without spending R cooldown',()=>{
  const{game,player,target}=arena('yasuo');game.practice=false;target.x=45;target.airborneUntil=10;
  assert.equal(game.isVisible(target),false);assert.equal(game.cast('R',target.x,0,target.id),false);
  assert.equal(player.cooldowns.R,0);assert.equal(player.x,0);
  game._addWard(player,24,0,false);assert.equal(game.isVisible(target),true);
  assert.equal(game.cast('R',target.x,0,target.id),true);
});

test('normal Teemo only receives mushroom charges when R is learned',()=>{
  const game=new Game({hero:'teemo'}),player=game.player;
  for(let i=0;i<5;i++)game._level(player);
  assert.equal(player.level,6);assert.equal(player.skillLevels.R,0);assert.equal(player.shroomCharges,0);
  assert.equal(game.cast('R',player.x+4,player.z),false);
  assert.equal(game.levelSkill('R'),true);assert.equal(player.shroomCharges,3);
  assert.equal(game.cast('R',player.x+4,player.z),true);
});
