import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, CHAMPIONS } from '../src/simulation.js';
import { EXTENDED_IDS } from '../src/extended-champions.js';

function tick(game,seconds){for(let i=0;i<Math.ceil(seconds/.05);i++)game.update(.05);}
function arena(hero){
  const game=new Game({hero,practice:true}),h=game.player,t=game._hero('garen','red','mid');
  game.entities=[h,t];game._nextWave=1e6;h.x=h.z=0;t.x=10;t.z=0;t.hp=t.maxHp=10000;t.armor=t.magicResist=0;t.stunUntil=10000;t.isPlayer=true;t.command={type:'stop'};
  const friend=game._hero('garen','blue','mid');friend.x=2;friend.z=2;friend.stunUntil=10000;game.entities.push(friend);
  return{game,h,t,friend};
}
function enemy(game,x,z,hp=10000,kind='hero'){
  const t=kind==='hero'?game._hero('garen','red','mid'):game._entity({kind,team:'red',name:'训练小兵',minionType:'melee',attack:0,attackRange:4,path:[],speed:0});
  t.x=x;t.z=z;t.hp=t.maxHp=hp;t.armor=t.magicResist=0;t.stunUntil=10000;t.isPlayer=true;t.command={type:'stop'};return t;
}

test('nineteen additional champions have complete playable metadata and distinct skills',()=>{
  assert.equal(EXTENDED_IDS.size,19);assert.equal(CHAMPIONS.length,27);
  for(const c of CHAMPIONS.filter(c=>EXTENDED_IDS.has(c.id))){
    assert.ok(c.name&&c.title&&c.role&&c.passive.description&&c.description&&c.combo);
    assert.deepEqual(c.skills.map(s=>s.key),['Q','W','E','R']);
    for(const s of c.skills){assert.ok(Number.isFinite(s.range));assert.ok(['self','target','ally','ground','direction'].includes(s.targeting));}
  }
});

for(const id of [...EXTENDED_IDS].filter(id=>!['twistedfate','kaisa','camille'].includes(id))){
  test(`${id}: all learned active skills run through live combat and generate their effects`,()=>{
    for(const key of ['Q','W','E','R']){
      const{game,h,t,friend}=arena(id),skill=CHAMPIONS.find(c=>c.id===id).skills.find(s=>s.key===key);
      const aim=skill.targeting==='ally'?friend:t,before=h.mana;
      if(skill.passive){assert.equal(game.cast(key,t.x,t.z,t.id),false);assert.equal(h.cooldowns[key],0);assert.equal(h.mana,before);continue;}
      assert.equal(game.cast(key,aim.x,aim.z,aim.id),true,`${id} ${key}`);
      assert.ok(game.events.some(e=>e.type==='spell'&&e.hero===id&&e.key===key));
      tick(game,3.5);
      assert.ok(Number.isFinite(h.hp)&&Number.isFinite(h.mana)&&Number.isFinite(t.hp));
    }
    const{game,h,t}=arena(id);assert.ok(game.cast('Q',t.x,t.z,t.id));tick(game,.7);
    if(['vayne','leona'].includes(id)){h.x=t.x-3;h.z=t.z;game._attack(h,t);tick(game,.5);}
    assert.ok(t.hp<10000,`${id} Q must deal damage or empower a damaging attack`);
  });
}

test('targeted new skills reject distant, allied and invisible units before consuming resources',()=>{
  for(const[id,key]of [['annie','Q'],['brand','E'],['fizz','Q'],['masteryi','Q'],['darius','R'],['malphite','Q'],['vayne','E'],['veigar','R'],['caitlyn','R'],['missfortune','Q']]){
    const{game,h,t,friend}=arena(id);game.practice=false;h.mana=1000;t.x=115;
    assert.equal(game.cast(key,t.x,t.z,t.id),false,id);assert.equal(h.mana,1000);assert.equal(h.cooldowns[key],0);
    assert.equal(game.cast(key,friend.x,friend.z,friend.id),false,id);assert.equal(h.mana,1000);assert.equal(h.cooldowns[key],0);
    t.x=10;t.stealthed=true;assert.equal(game.cast(key,t.x,t.z,t.id),false,id);assert.equal(h.mana,1000);assert.equal(h.cooldowns[key],0);
  }
});

test('Annie primes her stun with four casts, refunds Q last hits and commands a damaging Tibbers',()=>{
  const{game,h,t}=arena('annie');for(let i=0;i<4;i++){h.cooldowns.E=0;game.cast('E',h.x,h.z,h.id);}assert.equal(h.ext.annieStacks,4);
  t.stunUntil=0;game.cast('Q',t.x,t.z,t.id);tick(game,.3);assert.ok(t.stunUntil>game.time);assert.equal(h.ext.annieStacks,0);
  const creep=enemy(game,10,0,20,'minion');h.cooldowns.Q=0;h.mana=500;game.practice=false;game.cast('Q',creep.x,creep.z,creep.id);tick(game,.3);assert.equal(creep.alive,false);assert.ok(h.mana>480);
  game.cast('R',t.x,t.z,t.id);const bear=game.entities.find(e=>e.summonType==='tibbers');assert.ok(bear);const hp=t.hp;tick(game,1);assert.ok(t.hp<hp);game.time=bear.expiresAt+.1;game._minionUpdate(bear,.1);assert.equal(bear.alive,false);
});

test('Brand burns, stuns burning enemies, detonates three hits and bounces R between enemies',()=>{
  const{game,h,t}=arena('brand');const other=enemy(game,15,0);t.stunUntil=0;
  game.cast('E',t.x,t.z,t.id);assert.equal(t.brandBurns[h.id].stacks,1);game.cast('Q',t.x,t.z,t.id);tick(game,.3);assert.ok(t.stunUntil>game.time);
  game.cast('W',t.x,t.z);tick(game,.7);assert.ok(game.events.some(e=>e.key==='PASSIVE'));game.cast('R',t.x,t.z,t.id);tick(game,2);
  assert.ok(game.events.filter(e=>e.key==='R_BOUNCE').length>=3);assert.ok(other.hp<10000);assert.ok(t.poisonUntil>0);
});

test('Morgana binds, heals from spell damage, shields allies from control and breaks distant tethers',()=>{
  const{game,h,t,friend}=arena('morgana');h.hp=h.maxHp-200;game.cast('Q',t.x,t.z);tick(game,.3);assert.ok(t.rootUntil>game.time);assert.ok(h.hp>h.maxHp-200);
  game.cast('E',friend.x,friend.z,friend.id);assert.ok(friend.blackShieldUntil>game.time);game._airborne(friend,2);assert.ok(!(friend.airborneUntil>game.time));
  t.stunUntil=0;game.cast('R',t.x,t.z);t.x=60;tick(game,3.1);assert.ok(!(t.stunUntil>game.time));
});

test('Veigar gains lasting AP from hits, Q kills and hero kills without duplicate execute rewards',()=>{
  const{game,h,t}=arena('veigar');game.cast('Q',t.x,t.z);tick(game,.3);assert.equal(h.ext.veigarAp,1);
  const creep=enemy(game,15,0,10,'minion');h.cooldowns.Q=0;game.cast('Q',15,0);tick(game,.4);assert.equal(creep.alive,false);assert.equal(h.ext.veigarAp,3);
  t.hp=10;game.cast('R',t.x,t.z,t.id);assert.equal(h.ext.veigarAp,9);game._recomputeStats(h);assert.equal(h.ap,9);
});

test('Veigar cage controls only its perimeter after arming and W lands after its delay',()=>{
  const{game,h,t}=arena('veigar');t.x=23;t.stunUntil=0;game.cast('E',10,0);const c=game.zones.find(z=>z.kind==='veigar-cage');assert.ok(c);tick(game,.2);assert.ok(!(t.stunUntil>game.time));tick(game,.2);assert.ok(t.stunUntil>game.time);
  const hp=t.hp;game.cast('W',t.x,t.z);tick(game,.5);assert.equal(t.hp,hp);tick(game,.4);assert.ok(t.hp<hp);
});

test('Ziggs satchel recasts without new mana or cooldown and his bomb mines and ranged Q explode',()=>{
  const{game,h,t}=arena('ziggs');game.practice=false;h.mana=1000;game.cast('W',t.x,t.z);const mana=h.mana,cd=h.cooldowns.W;assert.equal(game.cast('W',t.x,t.z),true);assert.equal(h.mana,mana);assert.equal(h.cooldowns.W,cd);assert.ok(t.x>10);
  t.x=10;game.cast('E',t.x,t.z);tick(game,.6);assert.ok(game.events.some(e=>e.key==='E_TRAP'));game.cast('R',t.x,t.z);const hp=t.hp;tick(game,1.2);assert.ok(t.hp<hp);
  const distant=enemy(game,52,0);game.entities=[h,distant];h.cooldowns.Q=0;game.cast('Q',70,0);tick(game,1.5);assert.ok(distant.hp<10000);
});

test('Fizz dodges damage during E, lands with splash damage and attaches a delayed shark',()=>{
  const{game,h,t}=arena('fizz');game.cast('E',t.x,t.z);const hp=h.hp;assert.equal(game._damage(h,200,'true',t),0);assert.equal(h.hp,hp);tick(game,.8);assert.ok(t.hp<10000);
  h.cooldowns.R=0;game.cast('R',t.x+15,t.z);t.x=h.x+15;tick(game,.5);assert.ok(game.zones.some(z=>z.kind==='fizz-shark'));const before=t.hp;tick(game,1.2);assert.ok(t.hp<before);assert.ok(t.airborneUntil>game.time);
});

test('Master Yi meditates with damage reduction, cancels on movement and resets spells on takedown',()=>{
  const{game,h,t}=arena('masteryi');h.hp=h.maxHp-300;game.cast('W',h.x,h.z);assert.ok(h.ext.channel);const before=h.hp;assert.equal(game._damage(h,100,'true',t),40);tick(game,.5);assert.ok(h.hp>before-40);game.moveTo(30,0);assert.equal(h.ext.channel,null);
  h.cooldowns.Q=10;h.cooldowns.W=10;h.cooldowns.E=10;game.cast('R',h.x,h.z);t.hp=1;game._damage(t,10,'true',h,'attack');assert.equal(h.cooldowns.Q,3);assert.ok(h.highlanderUntil>game.time);
  h.x=8;h.cooldowns.E=0;game.cast('E',h.x,h.z);const other=enemy(game,10,0);game._attack(h,other);assert.ok(game.events.some(e=>e.key==='E'&&e.type==='damage'&&e.source===h.id));
});

test('Lee Sin marks Q, recasts with no energy, gains flurry energy and kicks through secondary enemies',()=>{
  const{game,h,t}=arena('leesin');game.practice=false;h.mana=200;game.cast('Q',t.x,t.z);tick(game,.3);assert.equal(h.sonicMarkId,t.id);const mana=h.mana;assert.ok(game.cast('Q',t.x,t.z,t.id));assert.equal(h.mana,mana);assert.ok(h.x>0);assert.equal(h.sonicMarkUntil,0);
  const other=enemy(game,19,0);t.stunUntil=0;game.cast('R',t.x,t.z,t.id);assert.ok(t.x>10);assert.ok(other.hp<10000);assert.ok(other.airborneUntil>game.time);
});

test('Darius stacks bleed, heals on the axe edge, pulls a cone and resets a successful execute',()=>{
  const{game,h,t}=arena('darius');h.hp=h.maxHp-300;game.cast('Q',t.x,t.z);assert.ok(h.hp>h.maxHp-300);assert.equal(t.bleeds[h.id].stacks,1);
  h.x=7;for(let i=0;i<4;i++){h.attackCooldown=0;game._attack(h,t);}assert.equal(t.bleeds[h.id].stacks,5);assert.ok(h.noxianMightUntil>game.time);h.x=0;game.cast('E',t.x,t.z);assert.ok(t.x<10);t.hp=1;game.cast('R',t.x,t.z,t.id);assert.equal(h.cooldowns.R,0);
});

test('Malphite regenerates granite shield, slows attacks and knocks up around his ultimate landing',()=>{
  const{game,h,t}=arena('malphite');game._heroUpdate(h,.1);assert.ok(h.shield>0);game._damage(h,500,'true',t);assert.equal(h.graniteShieldUntil,0);game.time=9;game._heroUpdate(h,.1);assert.ok(h.shield>0);
  game.cast('E',t.x,t.z);assert.ok(t.attackSlowUntil>game.time);t.stunUntil=0;game.cast('R',t.x,t.z);assert.ok(h.x>0);assert.ok(t.airborneUntil>game.time);
});

test('Blitzcrank hooks the first enemy, uppercuts on hit and removes shields with R',()=>{
  const{game,h,t}=arena('blitzcrank');t.x=30;game.cast('Q',t.x,t.z);tick(game,.7);assert.ok(t.x<8);game.cast('E',t.x,t.z);h.attackCooldown=0;game._attack(h,t);assert.ok(t.airborneUntil>game.time);
  t.shield=1000;t.shieldUntil=100;game.cast('R',h.x,h.z);assert.equal(t.shield,0);assert.ok(t.silenceUntil>game.time);
});

test('Leona dashes to heroes, marks sunlight for ally hits and center-stuns with solar flare',()=>{
  const{game,h,t,friend}=arena('leona');t.x=30;game.cast('E',t.x,t.z);tick(game,.7);assert.ok(h.x>20);assert.ok(t.sunlightUntil>game.time);friend.x=t.x-2;friend.z=t.z;friend.stunUntil=0;game._attack(friend,t);assert.ok(game.events.some(e=>e.key==='SUNLIGHT'));
  t.stunUntil=0;game.cast('R',t.x,t.z);tick(game,.7);assert.ok(t.stunUntil>game.time);
});

test('Vayne applies third-hit true damage and ultimate tumble stealth; condemn stuns into a wall',()=>{
  const{game,h,t}=arena('vayne');for(let i=0;i<3;i++){h.attackCooldown=0;game._attack(h,t);tick(game,.25);}assert.ok(game.events.some(e=>e.key==='W_HIT'));game.cast('R',h.x,h.z);game.cast('Q',5,0);assert.equal(h.stealthed,true);tick(game,1.1);assert.equal(h.stealthed,false);
  h.x=92;t.x=112;t.stunUntil=0;game.cast('E',t.x,t.z,t.id);tick(game,.5);assert.ok(t.stunUntil>game.time);assert.ok(t.x<=119);
});

test('Caitlyn arms traps, grants headshots and completes or interrupts aimed R channels',()=>{
  const{game,h,t}=arena('caitlyn');game.cast('W',t.x,t.z);tick(game,.7);assert.ok(t.rootUntil>game.time);assert.ok(h.ext.trapHeadshots[t.id]>game.time);game._attack(h,t);assert.equal(h.ext.headshot,0);
  t.x=60;const hp=t.hp;game.cast('R',t.x,t.z,t.id);tick(game,1.8);assert.ok(t.hp<hp);h.cooldowns.R=0;game.cast('R',t.x,t.z,t.id);game.moveTo(5,5);const before=t.hp;tick(game,1.5);assert.ok(t.hp>=before);
});

test('Miss Fortune bounces Q behind the first target and stops her cone barrage when moved',()=>{
  const{game,h,t}=arena('missfortune');const other=enemy(game,18,0);game.cast('Q',t.x,t.z,t.id);tick(game,.5);assert.ok(other.hp<10000);assert.ok(game.events.some(e=>e.key==='Q_BOUNCE'));
  game.cast('R',t.x,t.z);tick(game,.6);assert.ok(h.ext.channel);assert.ok(game.events.filter(e=>e.type==='damage'&&e.key==='R').length>=2);game.moveTo(-10,0);const hp=t.hp;tick(game,.7);assert.equal(h.ext.channel,null);assert.ok(t.hp>=hp);
});

test('Sona heals and shields wounded allies, primes a power chord and stuns with a piercing R',()=>{
  const{game,h,t,friend}=arena('sona');h.hp-=100;friend.hp-=100;game.cast('W',h.x,h.z);assert.ok(friend.hp>friend.maxHp-100);assert.ok(friend.shield>0);game.cast('E',h.x,h.z);game.cast('Q',t.x,t.z);assert.equal(h.powerChordReady,true);game._attack(h,t);tick(game,.4);assert.ok(game.events.some(e=>e.key==='POWER_CHORD'));assert.equal(h.powerChordReady,false);
  t.stunUntil=0;game.cast('R',t.x,t.z);tick(game,.3);assert.ok(t.stunUntil>game.time);
});

test('new hero invulnerability and black shields reject hostile control while normal attacks retain kill effects',()=>{
  const{game,h,t}=arena('morgana');t.heroId='lux';t.stunUntil=0;game.cast('E',h.x,h.z,h.id);
  const bolt=game._projectile(t,{x:-1,z:0},{skill:'Q',effect:'root',damage:10});game._projectileHit(bolt,h,t);assert.ok(!(h.rootUntil>game.time));
  h.invulnerableUntil=game.time+2;const hp=h.hp;game._projectileHit({...bolt,effect:'charm'},h,t);assert.equal(h.hp,hp);assert.ok(!(h.charmUntil>game.time));
  const{game:yi,h:owner,t:victim}=arena('masteryi');victim.invulnerableUntil=10;const mana=owner.mana;assert.equal(yi.cast('Q',victim.x,victim.z,victim.id),false);assert.equal(owner.mana,mana);assert.equal(owner.cooldowns.Q,0);
  const{game:sona,h:musician,t:creep}=arena('sona');musician.powerChordReady=true;creep.hp=1;sona._attack(musician,creep);tick(sona,.3);assert.equal(creep.alive,false);assert.equal(musician.powerChordReady,false);
});

test('new hero controls receive equipment tenacity once and a blocked Banshee spell cannot root',()=>{
  const{game,h,t}=arena('morgana');t.stunUntil=0;t.inventory[0]={id:'mercury-treads',count:1,cooldown:0};game._recomputeStats(t);
  game.cast('Q',t.x,t.z);tick(game,.3);const left=t.rootUntil-game.time;assert.ok(left>1.4&&left<1.8,`root duration ${left}`);const until=t.rootUntil;tick(game,.2);assert.equal(t.rootUntil,until);
  t.rootUntil=0;t.inventory[0]={id:'banshee',count:1,cooldown:0};game._recomputeStats(t);h.cooldowns.Q=0;const before=t.hp;game.cast('Q',t.x,t.z);tick(game,.3);assert.ok(t.spellshieldCooldownUntil>game.time);assert.ok(!(t.rootUntil>game.time));assert.ok(t.hp>=before);
});

test('random rosters remain five versus five, unique within each team and include expanded AI champions',()=>{
  const seen=new Set();for(let i=0;i<30;i++){const game=new Game({hero:'annie'});for(const team of ['blue','red']){const heroes=game.entities.filter(e=>e.kind==='hero'&&e.team===team);assert.equal(heroes.length,5);assert.equal(new Set(heroes.map(h=>h.heroId)).size,5);heroes.forEach(h=>seen.add(h.heroId));}}
  assert.ok([...seen].filter(id=>EXTENDED_IDS.has(id)).length>=12);
});
