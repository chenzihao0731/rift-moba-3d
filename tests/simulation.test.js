import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, CHAMPIONS } from '../src/simulation.js';
import { Navigation } from '../src/navigation.js';

function tick(game, seconds) {
  for (let i = 0; i < Math.ceil(seconds / .05); i++) game.update(.05);
}

// Isolate one stationary opponent so collisions and ability effects stay deterministic.
function duel(hero) {
  const game = new Game({ hero, practice: true });
  const player = game.player;
  const target = game.entities.find(e => e.kind === 'hero' && e.team === 'red');
  game.entities = [player, target];
  player.x = 0; player.z = 0;
  target.heroId = 'garen'; target.ext = null; target.shield = 0;
  target.x = 10; target.z = 0;
  target.hp = target.maxHp = 10000;
  target.armor = target.magicResist = 0;
  target.stunUntil = 1000;
  return { game, player, target };
}

for (const hero of CHAMPIONS.filter(h => ['ahri','ashe','garen','lux','ezreal'].includes(h.id))) {
  test(`${hero.name}: Q W E R produce damage and distinct champion effects`, () => {
    const { game, player, target } = duel(hero.id);
    assert.equal(player.level, 6);
    assert.deepEqual(player.skillLevels, { Q: 3, W: 1, E: 1, R: 1 });
    for (const key of ['Q', 'W', 'E', 'R']) {
      assert.equal(game.cast(key, target.x, target.z, target.id), true, key);
      tick(game, .75);
      if (hero.id === 'ashe' && key === 'W') assert.ok(target.slowUntil > game.time);
    }
    if (hero.id === 'lux') {
      assert.ok(game.zones.length > 0);
      assert.ok(game.cast('E', target.x, target.z));
      assert.equal(player.lightZone, null);
    }
    tick(game, 2);
    assert.ok(target.hp < 9850, 'skills must actually damage the opponent');
    assert.ok(game.events.some(e => e.type === 'damage' && e.source === player.id));
    if (hero.id === 'ahri') {
      assert.equal(player.dashCharges, 2);
      assert.ok(player.x > 0);
      assert.equal(game.cast('R', 25, 0), true);
      assert.equal(player.dashCharges, 1);
    } else if (hero.id === 'ashe') {
      assert.ok(player.qUntil > 0);
      assert.ok(game.reveals.some(r => r.team === 'blue'));
      assert.ok(game.events.some(e => e.hero === 'ashe' && e.key === 'ICE'));
    } else if (hero.id === 'garen') {
      assert.ok(player.fortifyUntil > 0);
      assert.ok(game.events.some(e => e.key === 'SPIN'));
    } else if (hero.id === 'lux') {
      assert.ok(target.rootUntil > 0);
      assert.ok(game.events.some(e => e.key === 'E2'));
      assert.ok(game.events.some(e => e.key === 'R' && e.toX > 50));
    } else if (hero.id === 'ezreal') {
      assert.ok(player.x > 0, 'E must blink the player');
      assert.ok(player.ezPassiveStacks > 0, 'Q must grant passive attack speed');
      assert.ok(game.events.some(e => e.key === 'mark'), 'E must detonate W');
    }
  });
}

test('normal matches unlock skills through earned experience and allocated points', () => {
  const game = new Game({ hero: 'ashe' });
  assert.equal(game.cast('W', 0, 0), false);
  game._award(game.player, 0, 120);
  assert.equal(game.player.level, 2);
  assert.equal(game.player.skillPoints, 1);
  assert.equal(game.levelSkill('R'), false);
  assert.equal(game.levelSkill('W'), true);
  assert.equal(game.player.skillLevels.W, 1);
  assert.equal(game.player.skillPoints, 0);
});

test('only the last hit grants creep score and minion gold', () => {
  const { game, player } = duel('ashe');
  const minion = game._entity({ kind: 'minion', team: 'red', x: 5, z: 0,
    hp: 1, maxHp: 1, armor: 0, radius: 1, minionType: 'melee', speed: 0,
    attack: 0, attackRange: 0, path: [], pathIndex: 0 });
  const gold = player.gold;
  assert.ok(game.attackTarget(minion.id));
  tick(game, .5);
  assert.equal(player.cs, 1);
  assert.equal(minion.alive, false);
  assert.ok(player.gold >= gold + 21);
  const other = game._entity({ kind: 'minion', team: 'red', x: 5, z: 0,
    hp: 1, maxHp: 1, armor: 0, radius: 1, minionType: 'melee', path: [], pathIndex: 0 });
  const ally = game._hero('lux', 'blue', 'mid');
  game._damage(other, 5, 'true', ally, 'attack');
  assert.equal(player.cs, 1, 'nearby shared XP must not award a last hit');
});

test('attack-move honors a clicked enemy and explicitly attacks a neutral camp', () => {
  const { game, player, target } = duel('ashe');
  target.x = 40;
  assert.equal(game.attackMove(40, 0, target.id), true);
  assert.deepEqual(player.command, { type: 'attack', targetId: target.id });
  const monster = game._monster('wolves', 10, 0, 1000, 0, 45, 60, '暗影狼');
  assert.equal(game.attackMoveTo(10, 0, monster.id), true);
  assert.deepEqual(player.command, { type: 'attack', targetId: monster.id });
  tick(game, .5);
  assert.ok(monster.hp < monster.maxHp);
  assert.equal(monster.aggroId, player.id);
});

test('ground attack-move selects the in-range enemy closest to the cursor and holds it through cooldown', () => {
  const { game, player, target } = duel('ashe');
  const minion = game._entity({ kind: 'minion', team: 'red', x: 20, z: 0,
    hp: 1000, maxHp: 1000, radius: 1.2, stunUntil: 1000 });
  player.attackCooldown = 2;
  game.attackMove(60, 0);
  tick(game, .05);
  assert.equal(player.command.targetId, minion.id, 'the cursor-facing minion wins over a closer hero');
  target.x = 23;
  minion.x = 18;
  tick(game, .2);
  assert.equal(player.command.targetId, minion.id, 'changing distances must not switch a valid current target');
  assert.equal(player.x, 0, 'an in-range target must not pull the champion forward between attacks');
  assert.equal(player.z, 0);
});

test('attack-move resumes its original destination when the local target dies or leaves range', () => {
  const { game, player, target } = duel('ashe');
  player.attackCooldown = 2;
  game.attackMove(60, 0);
  tick(game, .05);
  assert.equal(player.command.targetId, target.id);
  game._die(target, player);
  tick(game, .05);
  assert.equal(player.command.type, 'attackMove');
  assert.equal(player.command.targetId, 0);
  assert.equal(player.command.x, 60);
  assert.ok(player.x > 0);
  target.alive = true; target.hp = target.maxHp; target.x = 15;
  tick(game, .05);
  assert.equal(player.command.targetId, target.id);
  target.x = -40;
  const before = player.x;
  tick(game, .05);
  assert.equal(player.command.targetId, 0);
  assert.ok(player.x > before, 'a retreating enemy must not turn the player away from the stored destination');
});

test('attack-move drops targets that disappear into an unwarded brush', () => {
  const { game, player, target } = duel('ashe');
  game.practice = false;
  player.x = -20; player.z = 0;
  target.x = -20; target.z = -16;
  player.attackCooldown = 2;
  game._addWard(player, -20, -10, false);
  const ward = game.entities.find(e => e.kind === 'ward');
  assert.equal(game.isVisible(target), true);
  game.attackMove(-20, -40);
  tick(game, .05);
  assert.equal(player.command.targetId, target.id);
  ward.alive = false;
  assert.equal(game.isVisible(target), false);
  tick(game, .05);
  assert.equal(player.command.targetId, 0);
  assert.equal(player.command.z, -40);
  assert.ok(player.z < 0);
  assert.equal(game.attackTarget(target.id), false, 'an explicit attack also needs current vision');
});

test('melee ground attack-move does not chase enemies outside actual attack range or aggro neutral camps', () => {
  const { game, player, target } = duel('garen');
  target.x = 20;
  const monster = game._monster('wolves', 4, 0, 1000, 0, 45, 60, '暗影狼');
  game.attackMove(0, 60);
  tick(game, .5);
  assert.equal(player.command.targetId, 0);
  assert.equal(player.x, 0);
  assert.ok(player.z > 5, 'Garen must continue toward the ground destination rather than chase a distant hero');
  assert.equal(monster.aggroId, null);
  assert.equal(monster.hp, monster.maxHp);
  assert.equal(game.events.some(e => e.type === 'attack' && e.source === player.id), false);
});

test('ground attack-move skips protected structures and explicit attacks require revealed wards', () => {
  const { game, player } = duel('ashe');
  game.entities = [player];
  const outer = game._entity({ kind: 'tower', team: 'red', x: 80, z: 0, hp: 1000, maxHp: 1000,
    lane: 'mid', tier: 1, radius: 3 });
  const inner = game._entity({ kind: 'tower', team: 'red', x: 10, z: 0, hp: 1000, maxHp: 1000,
    lane: 'mid', tier: 2, radius: 3 });
  player.attackCooldown = 2;
  assert.equal(game.attackTarget(inner.id), false);
  game.attackMove(60, 0);
  tick(game, .05);
  assert.equal(player.command.targetId, 0);
  assert.ok(player.x > 0);
  outer.alive = false;
  tick(game, .05);
  assert.equal(player.command.targetId, inner.id);
  game.practice = false;
  const ward = game._entity({ kind: 'ward', team: 'red', x: 5, z: 0, hp: 3, maxHp: 3,
    radius: 1, control: false, expiresAt: 90 });
  assert.equal(game.attackTarget(ward.id), false);
  game._addWard(player, 5, 0, true);
  assert.equal(game.attackMove(5, 0, ward.id), true);
  assert.deepEqual(player.command, { type: 'attack', targetId: ward.id });
});

test('stop and movement replace attack-move without retaining its acquired target', () => {
  const { game, player, target } = duel('ashe');
  player.attackCooldown = 2;
  game.attackMove(60, 0);
  tick(game, .05);
  assert.equal(player.command.targetId, target.id);
  game.stop();
  tick(game, .1);
  assert.deepEqual(player.command, { type: 'stop' });
  assert.equal(player.x, 0);
  game.attackMove(60, 0);
  tick(game, .05);
  game.moveTo(0, 60);
  tick(game, .1);
  assert.equal(player.command.type, 'move');
  assert.equal(player.command.targetId, undefined);
  assert.equal(player.x, 0);
  assert.ok(player.z > 0);
});

test('wards consume charges, reveal fog and expose stealth wards with true sight', () => {
  const game = new Game();
  const player = game.player;
  player.x = 0; player.z = 0;
  const enemy = game.entities.find(e => e.kind === 'hero' && e.team === 'red');
  enemy.x = 45; enemy.z = 0;
  game.entities = [player, enemy];
  assert.equal(game.isVisible(enemy), false);
  assert.equal(game.placeWard(24, 0), true);
  assert.equal(player.wardCharges, 1);
  assert.equal(game.isVisible(enemy), true);
  game._addWard(enemy, 30, 0, false);
  // _addWard returns no public object; select the created entity for the vision test.
  const hidden = game.entities.find(e => e.kind === 'ward' && e.team === 'red');
  assert.equal(game.isVisible(hidden), false);
  game._addWard(player, 24, 0, true);
  assert.equal(game.isVisible(hidden), true);
  const blueWard = game.entities.find(e => e.kind === 'ward' && !e.control && e.team === 'blue');
  tick(game, 90.1);
  assert.equal(blueWard.alive, false);
});

test('outer towers gate inner towers and structures resist damage without a wave', () => {
  const game = new Game({ practice: true });
  const player = game.player;
  const outer = game.entities.find(e => e.kind === 'tower' && e.team === 'red' && e.lane === 'mid' && e.tier === 1);
  const inner = game.entities.find(e => e.kind === 'tower' && e.team === 'red' && e.lane === 'mid' && e.tier === 2);
  assert.equal(game._damage(inner, 100, 'true', player), 0);
  assert.equal(game._damage(outer, 100, 'true', player), 18);
  game._entity({ kind: 'minion', team: 'blue', x: outer.x + 2, z: outer.z,
    hp: 100, maxHp: 100, minionType: 'melee', path: [], pathIndex: 0 });
  assert.equal(game._damage(outer, 100, 'true', player), 100);
  game._damage(outer, 999999, 'true', player);
  assert.ok(game._damage(inner, 100, 'true', player) > 0);
});

test('equipment updates combat stats, consumables stack and stasis prevents damage', () => {
  const { game, player, target } = duel('lux');
  const initialAttack = player.attack, initialHp = player.maxHp;
  assert.ok(game.buy('doran-blade'));
  assert.equal(player.attack, initialAttack + 10);
  assert.equal(player.maxHp, initialHp + 80);
  assert.ok(game.buy('potion')); assert.ok(game.buy('potion'));
  const potionIndex = player.inventory.findIndex(i => i?.id === 'potion');
  assert.equal(player.inventory[potionIndex].count, 2);
  player.hp -= 200;
  assert.ok(game.useItem(potionIndex));
  assert.equal(player.inventory[potionIndex].count, 1);
  const wounded = player.hp; tick(game, 1);
  assert.ok(player.hp > wounded + 20);
  assert.ok(game.buy('zhonya'));
  const slot = player.inventory.findIndex(i => i?.id === 'zhonya');
  assert.ok(game.useItem(slot));
  assert.equal(game._damage(player, 500, 'true', target), 0);
  assert.equal(game.useItem(slot), false);
  tick(game, 2.6);
  assert.equal(game._damage(player, 50, 'true', target), 50);
});

test('recall is interrupted by movement and damage; death respawns at the fountain', () => {
  const { game, player, target } = duel('ahri');
  assert.ok(game.recall());
  game.moveTo(20, 0);
  assert.equal(player.recallAt, 0);
  assert.ok(game.recall());
  game._damage(player, 10, 'true', target);
  assert.equal(player.recallAt, 0);
  assert.ok(game.recall()); tick(game, 2.1);
  assert.equal(player.x, -108); assert.equal(player.z, 108);
  game._die(player, target);
  assert.equal(player.alive, false);
  assert.equal(game.score.red, 1);
  tick(game, 2.1);
  assert.equal(player.alive, true);
  assert.equal(player.hp, player.maxHp);
  assert.equal(player.x, -108); assert.equal(player.z, 108);
});

test('tower executions do not grant a kill unless an enemy hero recently contributed', () => {
  const game = new Game({ practice: true });
  const player = game.player;
  const tower = game.entities.find(e => e.kind === 'tower' && e.team === 'red');
  const enemy = game.entities.find(e => e.kind === 'hero' && e.team === 'red');
  game._damage(player, 999999, 'true', tower);
  assert.equal(player.deaths, 1);
  assert.equal(game.score.red, 0);
  assert.ok(Number.isFinite(tower.hp));
  tick(game, 2.1);
  game._damage(player, 10, 'true', enemy);
  game._damage(player, 999999, 'true', tower);
  assert.equal(game.score.red, 1);
  assert.equal(enemy.kills, 1);
});

test('enemy nexus is protected until an inhibitor and both nexus towers are destroyed', () => {
  const game = new Game({ practice: true });
  const player = game.player;
  const nexus = game.entities.find(e => e.kind === 'nexus' && e.team === 'red');
  assert.equal(game._damage(nexus, 999999, 'true', player), 0);
  for (const tier of [1, 2, 3]) {
    const tower = game.entities.find(e => e.kind === 'tower' && e.team === 'red' && e.lane === 'mid' && e.tier === tier);
    game._damage(tower, 999999, 'true', player);
    assert.equal(tower.alive, false);
  }
  const inhibitor = game.entities.find(e => e.kind === 'inhibitor' && e.team === 'red' && e.lane === 'mid');
  game._damage(inhibitor, 999999, 'true', player);
  assert.equal(game._damage(nexus, 100, 'true', player), 0);
  for (const tower of game.entities.filter(e => e.kind === 'tower' && e.team === 'red' && e.tier === 4)) {
    game._damage(tower, 999999, 'true', player);
    assert.equal(tower.alive, false);
  }
  game._damage(nexus, 999999, 'true', player);
  assert.equal(game.winner, 'blue');
  assert.ok(game.events.some(e => e.type === 'victory' && e.team === 'blue'));
  const endedTime = game.time;
  tick(game, 1);
  assert.equal(game.time, endedTime);
});

test('navigation finds a clear detour around a wall and never cuts across obstacle circles', () => {
  const wall = Array.from({ length: 9 }, (_, i) => ({ x: 0, z: (i - 4) * 5, r: 3 }));
  const navigation = new Navigation(wall);
  const start = { x: -25, z: 0 }, goal = { x: 25, z: 0 };
  assert.equal(navigation.segmentClear(start, goal), false);
  const route = navigation.findPath(start, goal);
  assert.ok(route.points.some(p => Math.abs(p.z) >= 24));
  let previous = start;
  for (const point of route.points) {
    assert.ok(navigation.segmentClear(previous, point), 'every smoothed edge must clear terrain');
    previous = point;
  }
  assert.deepEqual(route.destination, goal);
  const { game, player } = duel('ahri');
  game.entities = [player]; player.x = -25; player.z = 0;
  game.setObstacles(wall);
  game.moveTo(goal.x, goal.z);
  let farthestZ = 0;
  for (let i = 0; i < 240; i++) {
    game.update(.05);
    farthestZ = Math.max(farthestZ, Math.abs(player.z));
    assert.ok(game.navigation.pointClear(player), 'walking must never clip an obstacle');
  }
  assert.ok(farthestZ > 23);
  assert.ok(Math.hypot(player.x - goal.x, player.z - goal.z) < 1);
});

test('blocked destinations snap to walkable ground; flash crosses walls and lands safely', () => {
  const { game, player } = duel('ezreal');
  game.entities = [player]; player.x = -12; player.z = 0;
  game.setObstacles([{ x: 0, z: 0, r: 5 }]);
  game.moveTo(0, 0);
  assert.ok(game.navigation.pointClear(player.command));
  assert.notDeepEqual({ x: player.command.x, z: player.command.z }, { x: 0, z: 0 });
  assert.equal(game.cast('D', 0, 0), true);
  assert.ok(game.navigation.pointClear(player));
  player.x = -12; player.z = 0; player.cooldowns.D = 0;
  assert.equal(game.cast('D', 12, 0), true);
  assert.ok(player.x > 5, 'flash should cross the wall');
  assert.ok(game.navigation.pointClear(player));
});
