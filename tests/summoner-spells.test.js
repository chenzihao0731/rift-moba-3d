import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/simulation.js';
import { SUMMONER_SPELLS, getSummonerSpell, normalizeSummoners } from '../src/summoner-spells.js';

const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
function tick(game,seconds){for(let i=0;i<Math.ceil(seconds/.05);i++)game.update(.05);}
function arena(id='flash',other='ignite',hero='ahri',practice=true){
  const game=new Game({hero,practice,summoners:{D:id,F:other}}),h=game.player;
  const target=game._hero('lux','red','mid');Object.assign(target,{x:10,z:0,hp:10000,maxHp:10000,armor:0,magicResist:0,isPlayer:true,command:{type:'stop'},stunUntil:10000});
  game.entities=[h,target];game._nextWave=1e6;h.x=h.z=0;h.armor=h.magicResist=0;
  return{game,h,target};
}
function ally(game,id,x=2,z=0){const a=game._hero(id,'blue','mid');a.x=x;a.z=z;a.isPlayer=true;a.command={type:'stop'};return a;}
function anchor(game,kind='ward',x=80,z=20){return game._entity({kind,team:'blue',x,z,hp:100,maxHp:100,expiresAt:kind==='ward'?1000:0,attackRange:0,attack:0,stunUntil:10000,speed:0,path:[]});}

test('ten summoner spells publish complete metadata and invalid or duplicate selections normalize to different skills',()=>{
  assert.equal(SUMMONER_SPELLS.length,10);assert.equal(new Set(SUMMONER_SPELLS.map(s=>s.id)).size,10);
  for(const s of SUMMONER_SPELLS){assert.equal(getSummonerSpell(s.id),s);assert.ok(s.name&&s.description&&s.color);assert.ok(s.cooldown>s.practiceCooldown&&s.range>=0);assert.ok(['self','ally','enemy','position'].includes(s.targeting));assert.equal(s.icon,`assets/summoner-${s.id}.png`);}
  assert.equal(getSummonerSpell('bad'),undefined);assert.deepEqual(normalizeSummoners(),{D:'flash',F:'ignite'});
  assert.deepEqual(normalizeSummoners({D:'ignite',F:'bad'}),{D:'ignite',F:'flash'});assert.deepEqual(normalizeSummoners({D:'heal',F:'heal'}),{D:'heal',F:'ignite'});
  const input={D:'teleport',F:'smite'};assert.deepEqual(normalizeSummoners(input),input);assert.deepEqual(input,{D:'teleport',F:'smite'});
});

test('Game keeps backward-compatible D flash and F ignite, preserves selections on restart and supports swapping their hotkeys',()=>{
  const game=new Game();assert.deepEqual(game.player.summoners,{D:'flash',F:'ignite'});
  const{game:g,h,target}=arena('ignite','flash');assert.ok(g.cast('D',target.x,target.z,target.id));assert.ok(target.igniteUntil>g.time);assert.equal(h.cooldowns.D,12);assert.equal(h.cooldowns.F,0);assert.ok(g.cast('F',20,0));assert.ok(h.x>0);
  g.restart();assert.deepEqual(g.player.summoners,{D:'ignite',F:'flash'});assert.equal(g.player.cooldowns.D,0);g.restart('sona',{D:'heal',F:'exhaust'});assert.deepEqual(g.player.summoners,{D:'heal',F:'exhaust'});
  assert.ok(g.entities.filter(e=>e.kind==='hero'&&e.lane==='jungle').every(e=>e.summoners.F==='smite'));
});

test('normal and practice cooldowns are independent of hero haste, mana, skill level and the other summoner slot',()=>{
  for(const practice of [false,true]){const{game,h}=arena('ghost','barrier','ahri',practice);h.haste=100;h.mana=0;assert.ok(game.cast('D'));assert.equal(h.cooldowns.D,practice?12:210);assert.equal(h.cooldowns.F,0);assert.ok(game.cast('F'));assert.equal(h.cooldowns.F,practice?12:180);assert.equal(h.mana,0);assert.equal(game.cast('D'),false);}
});

test('Flash clamps its distance, crosses terrain, rejects root and invalid positions without spending cooldown',()=>{
  const{game,h}=arena();game.setObstacles([{x:10,z:0,r:4}]);assert.ok(game.cast('D',100,0));close(h.x,20);
  h.x=0;h.cooldowns.D=0;h.rootUntil=10;assert.equal(game.cast('D',20,0),false);assert.equal(h.cooldowns.D,0);assert.equal(h.x,0);
  h.rootUntil=0;assert.equal(game.cast('D',NaN,0),false);assert.equal(h.cooldowns.D,0);h.silenceUntil=10;assert.ok(game.cast('D',-15,0));
});

test('dead, stunned and stasis heroes cannot use ordinary summoner spells, while cleanse can release control',()=>{
  const{game,h}=arena('ghost','cleanse');h.alive=false;assert.equal(game.cast('D'),false);assert.equal(game.cast('F'),false);h.alive=true;h.stunUntil=10;assert.equal(game.cast('D'),false);assert.equal(h.cooldowns.D,0);assert.ok(game.cast('F'));assert.equal(h.stunUntil,0);
  h.cooldowns.F=0;h.stunUntil=h.invulnerableUntil=10;assert.equal(game.cast('F'),false);assert.equal(h.cooldowns.F,0);game.winner='blue';assert.equal(game.cast('D'),false);
});

test('enemy summoners reject wrong, hidden, distant, dead and invulnerable targets atomically',()=>{
  for(const id of ['ignite','exhaust','smite']){
    const{game,h,target}=arena(id,'flash');game.practice=false;const friend=ally(game,'lux');
    for(const t of [friend,target]){target.x=t===target?100:10;assert.equal(game.cast('D',t.x,t.z,t.id),false,id);assert.equal(h.cooldowns.D,0);}
    target.x=10;target.stealthed=true;assert.equal(game.cast('D',10,0,target.id),false);target.stealthed=false;target.alive=false;assert.equal(game.cast('D',10,0,target.id),false);target.alive=true;target.invulnerableUntil=10;assert.equal(game.cast('D',10,0,target.id),false);assert.equal(h.cooldowns.D,0);
  }
});

test('Ignite deals its exact five-second true damage, grants healing reduction and retains the chosen hotkey in combat events',()=>{
  const{game,h,target}=arena('ignite','flash');target.stunUntil=10000;target.invulnerableUntil=0;target.armor=target.magicResist=500;assert.ok(game.cast('D',10,0,target.id));const total=90+20*h.level;
  tick(game,5.1);const damage=game.events.filter(e=>e.type==='damage'&&e.target===target.id&&e.key==='D');assert.equal(damage.length,5);assert.equal(damage.reduce((n,e)=>n+e.amount,0),total);assert.ok(game.events.some(e=>e.type==='spell'&&e.summoner==='ignite'&&e.key==='D'));
});

test('Heal affects only self and the weakest nearby ally, respects each target grievous wounds and grants brief speed',()=>{
  const{game,h}=arena('heal','flash');const low=ally(game,'lux'),high=ally(game,'garen',5),far=ally(game,'sona',50);h.hp=100;low.hp=20;high.hp=high.maxHp*.8;far.hp=1;h.igniteUntil=low.grievousUntil=10;
  const amount=(80+20*h.level)*.6,highHp=high.hp;assert.ok(game.cast('D'));close(h.hp,100+amount);close(low.hp,20+amount);assert.equal(high.hp,highHp);assert.equal(far.hp,1);assert.ok(h.healHasteUntil>game.time);assert.equal(low.healHasteUntil,h.healHasteUntil);
  h.x=0;game._walk(h,{x:100,z:0},.1);close(h.x,h.speed*.1*1.3);game.time=2;h.x=0;game._walk(h,{x:100,z:0},.1);close(h.x,h.speed*.1);
});

test('Ghost stacks with equipment speed and respects slow resistance without permanently changing base speed',()=>{
  const{game,h}=arena('ghost','flash');h.inventory[0]={id:'boots',count:1,cooldown:0};game._recomputeStats(h);const speed=h.speed;h.slowUntil=20;h.slowPower=.5;h.slowResist=.2;assert.ok(game.cast('D'));
  game._walk(h,{x:100,z:0},.1);close(h.x,speed*.1*1.35*.6);assert.equal(h.speed,speed);game.time=11;h.x=0;game._walk(h,{x:100,z:0},.1);close(h.x,speed*.1*.6);
});

test('Barrier absorbs damage independently, expires without erasing other shields and resets on death',()=>{
  const{game,h,target}=arena('barrier','flash');game._shield(h,100,10);assert.ok(game.cast('D'));const amount=115+25*h.level,hp=h.hp;
  assert.equal(game._damage(h,50,'true',target,'test'),0);assert.equal(h.barrierHp,amount-50);assert.equal(h.shield,100);assert.equal(h.hp,hp);
  game.time=3;game._heroUpdate(h,.01);assert.equal(h.barrierHp,0);assert.equal(h.shield,100);assert.equal(game._damage(h,150,'true',target,'test'),50);h.cooldowns.D=0;game.cast('D');game._die(h,target);assert.equal(h.barrierHp,0);assert.equal(h.barrierUntil,0);
});

test('Exhaust reduces physical, magic and equipment damage from its target, preserves true damage and expires',()=>{
  const{game,h,target}=arena('exhaust','flash');assert.ok(game.cast('D',10,0,target.id));assert.equal(target.exhaustUntil,3);assert.ok(target.slowPower>=.3);h.hp=h.maxHp=10000;
  close(game._damage(h,100,'physical',target,'attack'),65);close(game._damage(h,100,'magic',target,'Q'),65);close(game._damage(h,100,'magic',target,'item:proc'),65);close(game._damage(h,100,'true',target,'R'),100);
  game.time=3.1;close(game._damage(h,100,'physical',target,'attack'),100);
});

test('Cleanse releases removable controls and summoner debuffs under control, retains airborne and sustained poison',()=>{
  const{game,h}=arena('cleanse','flash');for(const key of ['stunUntil','rootUntil','silenceUntil','blindUntil','charmUntil','fearUntil','tauntUntil','slowUntil','igniteUntil','exhaustUntil','grievousUntil'])h[key]=20;h.airborneUntil=2;h.poisons={99:{dps:10,until:10,nextTick:1}};
  assert.ok(game.cast('D'));assert.equal(h.stunUntil,2);assert.equal(h.airborneUntil,2);for(const key of ['rootUntil','silenceUntil','blindUntil','charmUntil','slowUntil','igniteUntil','exhaustUntil','grievousUntil'])assert.equal(h[key],0);assert.ok(h.poisons[99]);assert.equal(game.cast('F',20,0),false);
});

test('Teleport accepts allied tower, minion and ward anchors, follows moving anchors and lands safely after four seconds',()=>{
  for(const kind of ['tower','minion','ward']){
    const{game,h}=arena('teleport','flash');const a=anchor(game,kind);assert.ok(game.cast('D',a.x,a.z,a.id));assert.ok(h.summonerChannel);assert.equal(h.cooldowns.D,20);tick(game,3.8);assert.equal(h.x,0);a.x=90;tick(game,.3);assert.equal(h.summonerChannel,null);assert.ok(Math.hypot(h.x-a.x,h.z-a.z)<6);assert.ok(game.events.some(e=>e.type==='summoner-channel-complete'));assert.ok(game.events.some(e=>e.summoner==='teleport'&&e.key==='TELEPORT_FINISH'));
  }
});

test('Teleport rejects terrain, allied heroes and hostile or dead anchors without replacing an existing valid channel',()=>{
  const{game,h,target}=arena('teleport','flash'),friend=ally(game,'lux'),a=anchor(game);assert.equal(game.cast('D',100,100),false);assert.equal(game.cast('D',friend.x,friend.z,friend.id),false);assert.equal(game.cast('D',target.x,target.z,target.id),false);a.alive=false;assert.equal(game.cast('D',a.x,a.z,a.id),false);assert.equal(h.cooldowns.D,0);
  a.alive=true;game.cast('D',a.x,a.z,a.id);const c=h.summonerChannel;assert.equal(game.cast('Q',target.x,target.z,999999),true);assert.equal(h.summonerChannel,null);h.cooldowns.D=0;game.cast('D',a.x,a.z,a.id);const channel=h.summonerChannel;assert.equal(game.cast('D',100,100),false);assert.equal(h.summonerChannel,channel);assert.notEqual(c,channel);
});

test('Teleport is interrupted by commands, new casts, control, invalid anchors and death while plain damage keeps its channel',()=>{
  for(const cancel of [(g,h,a)=>g.moveTo(1,0),(g,h,a)=>g.stop(),(g,h,a)=>g.attackTarget(g.entities[1].id),(g,h,a)=>g.recall(),(g,h,a)=>g.cast('F',10,0),(g,h,a)=>{h.rootUntil=20;},(g,h,a)=>{a.alive=false;},(g,h,a)=>g._die(h,g.entities[1])]){
    const{game,h}=arena('teleport','flash'),a=anchor(game);game.cast('D',a.x,a.z,a.id);cancel(game,h,a);tick(game,.1);assert.equal(h.summonerChannel,null);assert.ok(game.events.some(e=>e.type==='summoner-channel-cancel'));
  }
  const{game,h,target}=arena('teleport','flash'),a=anchor(game);game.cast('D',a.x,a.z,a.id);game._damage(h,10,'true',target,'test');tick(game,.1);assert.ok(h.summonerChannel);
});

test('Smite damages neutral camps and enemy soldiers through resistance, heals on camps and awards real last-hit rewards',()=>{
  const{game,h}=arena('smite','flash');const monster=game._monster('blue',10,0,500,0,50,100,'训练野怪');monster.armor=monster.magicResist=1000;h.hp=100;h.igniteUntil=10;const gold=h.gold;assert.ok(game.cast('D',monster.x,monster.z,monster.id));assert.equal(monster.alive,false);assert.equal(h.cs,1);assert.ok(h.gold>=gold+100);close(h.hp,100+(70+h.maxHp*.1)*.6);
  h.cooldowns.D=0;const m=game._entity({kind:'minion',team:'red',x:8,z:0,hp:10,maxHp:10,minionType:'melee',armor:500});const hp=h.hp;assert.ok(game.cast('D',m.x,m.z,m.id));assert.equal(m.alive,false);assert.equal(h.cs,2);assert.equal(h.hp,hp);
});

test('Clarity restores only allied mana resources and rejects energy or mana-free heroes without cooldown',()=>{
  const{game,h}=arena('clarity','flash');const friend=ally(game,'lux'),lee=ally(game,'leesin',4),far=ally(game,'sona',50);h.mana=friend.mana=lee.mana=far.mana=0;
  assert.ok(game.cast('D'));close(h.mana,h.maxMana*.5);close(friend.mana,friend.maxMana*.25);assert.equal(lee.mana,0);assert.equal(far.mana,0);
  for(const hero of ['leesin','yasuo']){const{game:g,h:p}=arena('clarity','flash',hero);assert.equal(g.cast('D'),false);assert.equal(p.cooldowns.D,0);assert.ok(g.events.some(e=>e.type==='message'&&/能量|法力/.test(e.text)));}
});

test('AI chooses role-appropriate summoners and uses recovery, retreat, offense and objective secure without repeated casts',()=>{
  const game=new Game({practice:true});game.entities=[];game._nextWave=1e6;
  const healer=game._hero('sona','blue','bot');healer.x=0;healer.z=0;healer.hp=100;game._heroUpdate(healer,.05);assert.equal(healer.summoners.F,'heal');assert.ok(healer.cooldowns.F>0);const cd=healer.cooldowns.F;game._heroUpdate(healer,.05);assert.ok(healer.cooldowns.F<cd);
  const tank=game._hero('malphite','blue','top');tank.x=0;tank.z=0;tank.hp=100;tank.lastDamagedAt=game.time;game._heroUpdate(tank,.05);assert.equal(tank.summoners.F,'barrier');assert.ok(tank.barrierHp>0);
  const runner=game._hero('darius','blue','top');runner.x=0;runner.z=0;runner.hp=100;runner.lastDamagedAt=game.time;game._heroUpdate(runner,.05);assert.equal(runner.summoners.D,'ghost');assert.ok(runner.ghostUntil>game.time);
  const mage=game._hero('brand','blue','mid'),foe=game._hero('lux','red','mid');mage.x=0;mage.z=0;foe.x=10;foe.z=0;foe.hp=100;foe.isPlayer=true;foe.command={type:'stop'};mage.aiTargetId=foe.id;game._heroUpdate(mage,.05);assert.ok(foe.igniteUntil>game.time);
  const jungler=game._hero('leesin','blue','jungle');jungler.x=0;jungler.z=0;const camp=game._monster('blue',8,0,100,0,50,100,'野怪');jungler.aiTargetId=camp.id;game._heroUpdate(jungler,.05);assert.equal(jungler.summoners.F,'smite');assert.equal(camp.alive,false);assert.ok(jungler.cooldowns.F>0);
});
