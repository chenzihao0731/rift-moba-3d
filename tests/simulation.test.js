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
  target.x = 10; target.z = 0;
  target.hp = target.maxHp = 10000;
  target.armor = target.magicResist = 0;
  target.stunUntil = 1000;
  return { game, player, target };
}

for (const hero of CHAMPIONS) {
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
  const potionIndex = player.inventory.findIndex(i => i.id === 'potion');
  assert.equal(player.inventory[potionIndex].count, 2);
  player.hp -= 200;
  assert.ok(game.useItem(potionIndex));
  assert.equal(player.inventory[potionIndex].count, 1);
  const wounded = player.hp; tick(game, 1);
  assert.ok(player.hp > wounded + 20);
  assert.ok(game.buy('zhonya'));
  const slot = player.inventory.findIndex(i => i.id === 'zhonya');
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
