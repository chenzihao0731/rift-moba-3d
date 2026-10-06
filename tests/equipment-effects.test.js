import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, ITEMS } from '../src/simulation.js';
import { equipmentHealingMultiplier } from '../src/equipment-effects.js';

const byId = new Map(ITEMS.map(item => [item.id, item]));
const close = (actual, expected, message) => assert.ok(Math.abs(actual - expected) < 1e-7, `${message || 'value'}: ${actual} != ${expected}`);
function arena(hero = 'garen') {
  const game = new Game({ hero, practice: true }), player = game.player;
  game.entities = [player]; game._nextWave = 1e6;
  player.x = player.z = 0;
  const target = game._hero('lux', 'red', 'mid');
  Object.assign(target, { x: 3, z: 0, hp: 10000, maxHp: 10000, armor: 0, magicResist: 0, speed: 0, stunUntil: 100000 });
  return { game, player, target };
}
function equip(game, hero, ...ids) {
  hero.inventory = Array.from({ length: 6 }, (_, i) => ids[i] ? { id: ids[i], count: 1, cooldown: 0 } : null);
  game._recomputeStats(hero);
}
function hit(game, player, target) {
  player.attackCooldown = 0;
  assert.equal(game._attack(player, target), true);
}
function tick(game, seconds) { for (let i = 0; i < Math.ceil(seconds / .05); i++) game.update(.05); }

test('expanded catalog supports atomic upgrades within every unique equipment family', () => {
  assert.ok(ITEMS.length >= 65);
  for (const [component, upgrade, conflict] of [
    ['sheen', 'trinity-force', 'lich-bane'], ['tiamat', 'titanic-hydra', 'ravenous-hydra'],
    ['hexdrinker', 'maw', 'steraks'], ['last-whisper', 'lord-dominik', 'mortal-reminder'],
    ['blighting-jewel', 'void-staff', 'blighting-jewel'], ['boots', 'mercury-treads', 'sorcerer-shoes'],
  ]) {
    const { game, player } = arena(); player.gold = 30000;
    assert.equal(game.buy(component), true);
    assert.equal(game.buy(upgrade), true);
    assert.deepEqual(player.inventory.filter(Boolean).map(slot => slot.id), [upgrade]);
    const before = structuredClone({ gold: player.gold, inventory: player.inventory });
    assert.equal(game.quoteBuy(conflict).code, 'unique-group');
    assert.equal(game.buy(conflict), false);
    assert.deepEqual({ gold: player.gold, inventory: player.inventory }, before);
  }
});

test('purchasing and selling MR, penetration, range and regen gear immediately changes real Game stats', () => {
  const { game, player } = arena('ashe'); player.gold = 30000;
  const original = { magicResist: player.magicResist, attackRange: player.attackRange };
  for (const id of ['wits-end', 'lord-dominik', 'rapid-firecannon', 'rejuvenation-bead']) assert.ok(game.buy(id));
  assert.equal(player.magicResist, original.magicResist + 50);
  assert.equal(player.armorPen, .35); assert.equal(player.hpRegen, 3);
  assert.ok(player.attackRange > original.attackRange);
  const hp = player.hp; assert.ok(game.sell(0)); assert.equal(player.hp, hp);
  assert.equal(game.events.find(event => event.type === 'sale').amount, 1960, '70% of 2800 must not lose a gold to floating point rounding');
  assert.equal(player.magicResist, original.magicResist);
  for (const index of [1, 2, 3]) assert.ok(game.sell(index));
  assert.equal(player.armorPen, 0); assert.equal(player.hpRegen, 0); assert.equal(player.attackRange, original.attackRange);
});

test('Sheen arms only on successful spells and an auto consumes exactly one proc with its cooldown', () => {
  const { game, player, target } = arena(); equip(game, player, 'sheen');
  player.cooldowns.Q = 1;
  assert.equal(game.cast('Q', target.x, target.z), false); assert.ok(!player.spellbladeReadyUntil);
  player.cooldowns.Q = 0; assert.ok(game.cast('Q', target.x, target.z));
  hit(game, player, target);
  assert.equal(game.events.filter(event => event.key === 'item:spellblade').length, 1);
  assert.equal(player.spellbladeReadyUntil, 0); assert.equal(player.spellbladeCooldownUntil, 1.5);
  player.cooldowns.W = 0; assert.ok(game.cast('W', player.x, player.z)); hit(game, player, target);
  assert.equal(game.events.filter(event => event.key === 'item:spellblade').length, 1);
  game.time = 1.6; player.cooldowns.Q = 0; assert.ok(game.cast('Q', target.x, target.z)); hit(game, player, target);
  assert.equal(game.events.filter(event => event.key === 'item:spellblade').length, 2);
  player.cooldowns.Q = 0; game.time = 3.2; assert.ok(game.cast('Q', target.x, target.z)); assert.ok(game.sell(0));
  assert.equal(player.spellbladeReadyUntil, 0);
});

test('Kraken third-hit true damage executes through actual autos and resets when sold', () => {
  const { game, player, target } = arena(); equip(game, player, 'kraken-slayer');
  hit(game, player, target); hit(game, player, target);
  assert.equal(game.events.filter(event => event.key === 'item:kraken').length, 0);
  hit(game, player, target);
  const proc = game.events.filter(event => event.key === 'item:kraken');
  assert.equal(proc.length, 1); assert.equal(proc[0].amount, Math.round(40 + player.attack * .3));
  assert.equal(player.krakenHits, 0); hit(game, player, target); assert.equal(player.krakenHits, 1);
  assert.ok(game.sell(0)); assert.equal(player.krakenHits, 0);
});

test('Hydra cleave hits nearby hostiles while excluding its primary target, allies and structures', () => {
  const { game, player, target } = arena(); equip(game, player, 'titanic-hydra');
  const nearby = game._entity({ kind: 'monster', team: 'neutral', x: 3, z: 4, hp: 1000, maxHp: 1000, armor: 0 });
  const ally = game._entity({ kind: 'hero', team: 'blue', x: 4, z: 2, hp: 1000, maxHp: 1000 });
  const tower = game._entity({ kind: 'tower', team: 'red', x: 3, z: 4, hp: 1000, maxHp: 1000, tier: 1, lane: 'top' });
  const far = game._entity({ kind: 'monster', team: 'neutral', x: 30, z: 0, hp: 1000, maxHp: 1000 });
  hit(game, player, target);
  close(nearby.hp, 1000 - player.attack * .3 - player.maxHp * .02);
  assert.equal(ally.hp, 1000); assert.equal(tower.hp, 1000); assert.equal(far.hp, 1000);
  assert.deepEqual(game.events.filter(event => event.key === 'item:cleave').map(event => event.target), [nearby.id]);
});

test('physical and magic penetration modify effective resistance without applying resistance twice', () => {
  const { game, player, target } = arena(); equip(game, player, 'lord-dominik'); target.armor = 100;
  close(game._damage(target, 100, 'physical', player, 'Q'), 100 / 1.65);
  equip(game, player, 'void-staff', 'sorcerer-shoes'); target.magicResist = 100;
  close(game._damage(target, 100, 'magic', player, 'Q'), 100 / 1.45);
  close(game._damage(target, 100, 'true', player, 'R'), 100);
});

test('Black Cleaver damage builds six stacks and expired shred stops increasing damage', () => {
  const { game, player, target } = arena(); equip(game, player, 'black-cleaver'); target.armor = 100;
  const first = game._damage(target, 100, 'physical', player, 'attack');
  const second = game._damage(target, 100, 'physical', player, 'attack');
  assert.ok(second > first);
  for (let i = 0; i < 10; i++) game._damage(target, 1, 'physical', player, 'attack');
  assert.equal(target.armorShredStacks, 6);
  game.time = 7;
  close(game._damage(target, 100, 'physical', player, 'attack'), first);
  assert.equal(target.armorShredStacks, 1);
});

test('Thornmail reflection does not recursively reflect and its grievous wounds reduce healing', () => {
  const { game, player, target } = arena(); equip(game, player, 'thornmail'); equip(game, target, 'thornmail');
  player.magicResist = target.magicResist = 0;
  const before = player.hp;
  game._damage(target, 100, 'physical', player, 'attack');
  close(player.hp, before - 10 - target.armor * .1);
  assert.equal(game.events.filter(event => event.key === 'item:thorns').length, 1);
  assert.equal(equipmentHealingMultiplier(player, game.time), .6);
  assert.equal(equipmentHealingMultiplier(player, game.time + 3.1), 1);
});

test('Banshee blocks one magic spell before offensive item statuses and respects its cooldown', () => {
  const { game, player, target } = arena(); equip(game, player, 'liandry', 'rylai'); equip(game, target, 'banshee');
  target.hp = target.maxHp; target.magicResist = 0;
  assert.equal(game._damage(target, 100, 'magic', player, 'Q'), 0);
  assert.equal(target.hp, target.maxHp); assert.ok(!target.equipmentBurns); assert.ok(!target.slowUntil);
  assert.equal(target.spellshieldCooldownUntil, 30);
  assert.equal(game._damage(target, 100, 'magic', player, 'Q'), 100);
  assert.equal(target.slowPower, .2); assert.ok(target.equipmentBurns[player.id]);
  game.time = 31; const before = target.hp;
  assert.equal(game._damage(target, 100, 'magic', player, 'Q'), 0); assert.equal(target.hp, before);
});

test('Liandry executes its three-second DOT through the global status loop without recursively refreshing', () => {
  const { game, player, target } = arena(); equip(game, player, 'liandry');
  game._damage(target, 1, 'magic', player, 'Q');
  tick(game, 3.2);
  const ticks = game.events.filter(event => event.key === 'item:liandry');
  assert.equal(ticks.length, 6); assert.equal(ticks.reduce((sum, event) => sum + event.amount, 0), 600);
  assert.deepEqual(target.equipmentBurns, {});
});

test('lifeline shields trigger before fatal damage once and do not trigger through an adequate existing shield', () => {
  const { game, player, target } = arena(); equip(game, player, 'steraks');
  player.maxHp = 1000; player.hp = 400; player.armor = 0;
  close(game._damage(player, 200, 'physical', target, 'Q'), 0);
  assert.equal(player.hp, 400); assert.equal(player.shield, 150); assert.equal(player.lifelineCooldownUntil, 90);
  close(game._damage(player, 300, 'physical', target, 'Q'), 150);
  assert.equal(player.hp, 250); assert.equal(game.events.filter(event => event.key === 'ITEM_LIFELINE').length, 1);
  game.time = 91; player.hp = 400; game._shield(player, 500, 5);
  game._damage(player, 200, 'physical', target, 'Q');
  assert.equal(player.lifelineCooldownUntil, 90, 'an already sufficient shield should not spend the cooldown');
});

test('item regeneration is counted once while channeling recall and Warmog waits six seconds after damage', () => {
  const { game, player, target } = arena('ahri'); equip(game, player, 'rejuvenation-bead');
  player.hp = 100; game.recall(); game._heroUpdate(player, 1);
  close(player.hp, 104.1, 'one second of base plus item regen');
  equip(game, player, 'warmogs'); player.hp = 100; player.recallAt = 1000;
  game._damage(player, 1, 'true', target, 'Q');
  game.time = 5.9; let before = player.hp; game._heroUpdate(player, 1); close(player.hp - before, 7.1);
  game.time = 6; before = player.hp; game._heroUpdate(player, 1); close(player.hp - before, 7.1 + player.maxHp * .05);
});

test('tenacity shortens new controls once, preserves knockups and does not shorten stasis', () => {
  const { game, player } = arena(); equip(game, player, 'mercury-treads');
  player.stunUntil = 10; player.rootUntil = 10; game._heroUpdate(player, .01);
  close(player.stunUntil, 7); close(player.rootUntil, 7);
  for (let i = 0; i < 10; i++) { game.time += .01; game._heroUpdate(player, .01); }
  close(player.stunUntil, 7); close(player.rootUntil, 7);
  player.stunUntil = 0; game._airborne(player, 2); const landing = player.airborneUntil;
  game._heroUpdate(player, .01); assert.equal(player.stunUntil, landing); assert.equal(player.airborneUntil, landing);
  player.invulnerableUntil = game.time + 2.5; player.stunUntil = player.invulnerableUntil;
  game._heroUpdate(player, .01); assert.equal(player.stunUntil, player.invulnerableUntil);
});

test('QSS active cleanses removable controls but retains airborne and consumes a real slot cooldown', () => {
  const { game, player } = arena(); equip(game, player, 'quicksilver-sash');
  Object.assign(player, { rootUntil: 5, silenceUntil: 5, blindUntil: 5, charmUntil: 5, slowUntil: 5, slowPower: .5 });
  game._airborne(player, 2); assert.ok(game.useItem(0));
  for (const key of ['rootUntil', 'silenceUntil', 'blindUntil', 'charmUntil', 'slowUntil']) assert.equal(player[key], 0);
  assert.equal(player.airborneUntil, 2); assert.equal(player.stunUntil, 2); assert.equal(player.inventory[0].cooldown, 90);
  assert.equal(game.useItem(0), false);
});

test('Locket and Redemption apply their active power once to nearby allies and never to enemies', () => {
  const { game, player, target } = arena(); equip(game, player, 'locket', 'redemption');
  const ally = game._hero('lux', 'blue', 'mid'); Object.assign(ally, { x: 5, z: 0, hp: 100 });
  const far = game._hero('ashe', 'blue', 'bot'); Object.assign(far, { x: 80, z: 0, hp: 100 });
  player.hp = 100; target.shield = 0;
  assert.ok(game.useItem(0)); close(player.shield, (200 + player.level * 10) * 1.1);
  close(ally.shield, player.shield); assert.equal(far.shield, 0); assert.equal(target.shield, 0);
  player.grievousUntil = 5; const allyHp = ally.hp;
  assert.ok(game.useItem(1, 0, 0));
  close(player.hp, 100 + (250 + player.level * 15) * 1.1 * .6);
  close(ally.hp, allyHp + (250 + player.level * 15) * 1.1); assert.equal(far.hp, 100);
});

test('invalid Redemption or dash targets fail without spending cooldown or changing the hero', () => {
  const { game, player } = arena(); equip(game, player, 'redemption', 'rocketbelt');
  player.hp = 100;
  assert.equal(game.useItem(0, 100, 0), false); assert.equal(player.hp, 100); assert.equal(player.inventory[0].cooldown, 0);
  player.rootUntil = 5; const x = player.x, z = player.z;
  assert.equal(game.useItem(1, 20, 0), false); assert.equal(player.x, x); assert.equal(player.z, z); assert.equal(player.inventory[1].cooldown, 0);
  player.rootUntil = 0; assert.ok(game.useItem(1, 20, 0)); assert.ok(player.x > x); assert.equal(player.inventory[1].cooldown, 60);
});

test('Mikael selects the pointed ally and rejects far targets while Shurelya and Randuin affect their teams', () => {
  const { game, player, target } = arena(); equip(game, player, 'mikaels', 'shurelya', 'randuins');
  const ally = game._hero('lux', 'blue', 'mid'); Object.assign(ally, { x: 12, z: 0, hp: 100, rootUntil: 5 });
  assert.equal(game.useItem(0, 100, 0), false); assert.equal(player.inventory[0].cooldown, 0);
  assert.ok(game.useItem(0, 12, 0)); assert.equal(ally.rootUntil, 0); assert.ok(ally.hp > 100); assert.equal(player.inventory[0].cooldown, 90);
  assert.ok(game.useItem(1)); assert.equal(player.hasteUntil, 4); assert.equal(ally.hasteUntil, 4); assert.ok(!target.hasteUntil);
  assert.ok(game.useItem(2)); assert.equal(target.slowPower, .55); assert.equal(target.slowUntil, 2); assert.ok(!ally.slowUntil);
});

test('Sunfire damages only nearby enemies on its half-second cadence even while recalling', () => {
  const { game, player, target } = arena(); equip(game, player, 'sunfire');
  player.recallAt = 100; const hp = target.hp;
  game._heroUpdate(player, .05); close(target.hp, hp - (20 + player.level * 2) * .5);
  for (let i = 0; i < 8; i++) { game.time += .05; game._heroUpdate(player, .05); }
  assert.equal(game.events.filter(event => event.key === 'item:immolate').length, 1);
  game.time = .5; game._heroUpdate(player, .05); assert.equal(game.events.filter(event => event.key === 'item:immolate').length, 2);
});
