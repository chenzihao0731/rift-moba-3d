import test from 'node:test';
import assert from 'node:assert/strict';
import { ITEMS } from '../src/item-data.js';
import { purchaseQuote, buyEquipment, sellQuote, sellEquipment } from '../src/shop.js';

const itemById = new Map(ITEMS.map(item => [item.id, item]));
const slot = (id, count = 1) => ({ id, count, cooldown: 0 });
function hero(gold = 10000, inventory = []) {
  return { gold, alive: true, inventory: Array.from({ length: 6 }, (_, i) => inventory[i] || null) };
}

test('all equipment recipes resolve to priced components without circular dependencies', () => {
  function recipeCost(item, path = new Set()) {
    assert.ok(!path.has(item.id), `no recipe cycle at ${item.id}`);
    const next = new Set(path); next.add(item.id);
    let cost = 0;
    for (const id of item.recipe || []) {
      const ingredient = itemById.get(id);
      assert.ok(ingredient, `${item.id} component ${id} must exist`);
      assert.ok(ingredient.component || ingredient.id === 'boots');
      recipeCost(ingredient, next);
      cost += ingredient.cost;
    }
    assert.ok(cost <= item.cost, `${item.id} must have a nonnegative combine cost`);
  }
  for (const item of ITEMS) {
    recipeCost(item);
    if (item.category === 'legendary' || item.id === 'berserkers') {
      assert.ok(item.recipe.length > 0);
      assert.equal(item.unique, true);
    }
  }
});

test('quotes are pure and failed purchases leave gold and every slot unchanged', () => {
  const cases = [
    [hero(99, [slot('amplifying-tome')]), 'ludens', {}, 'insufficient-gold'],
    [hero(), 'long-sword', { canShop: false }, 'away-from-shop'],
    [hero(10000, Array.from({ length: 6 }, () => slot('long-sword'))), 'ruby-crystal', {}, 'inventory-full'],
    [hero(), 'does-not-exist', {}, 'unknown-item'],
  ];
  for (const [character, id, options, code] of cases) {
    const before = structuredClone(character), inventory = character.inventory;
    const quote = purchaseQuote(character, id, options);
    assert.equal(quote.ok, false);
    assert.equal(quote.code, code);
    assert.ok(quote.reason);
    assert.deepEqual(character, before);
    assert.equal(buyEquipment(character, id, options).ok, false);
    assert.deepEqual(character, before);
    assert.equal(character.inventory, inventory, 'failure must preserve the original inventory object');
  }
});

test('a dead champion can buy and vacant slots preserve all unrelated hotkeys', () => {
  const character = hero(500, [slot('long-sword'), null, slot('boots')]);
  character.alive = false;
  const oldSword = character.inventory[0], oldBoots = character.inventory[2];
  const result = buyEquipment(character, 'ruby-crystal');
  assert.equal(result.ok, true);
  assert.equal(result.slot, 1);
  assert.equal(character.gold, 100);
  assert.equal(character.inventory.length, 6);
  assert.equal(character.inventory[0], oldSword);
  assert.equal(character.inventory[2], oldBoots);
  assert.equal(character.inventory[1].id, 'ruby-crystal');
  assert.equal(character.inventory[3], null);
});

test('full inventory upgrades in the consumed component slot and keeps unrelated items stable', () => {
  const character = hero(2700, [slot('boots'), slot('long-sword'), slot('bf-sword'), slot('potion', 2), slot('cloth-armor'), slot('pickaxe')]);
  const untouched = character.inventory.map(value => value);
  const quote = purchaseQuote(character, 'infinity');
  assert.equal(quote.ok, true);
  assert.equal(quote.cost, 1425);
  assert.equal(quote.discount, 2175);
  assert.deepEqual(quote.components, [2, 5]);
  assert.deepEqual(quote.ownedComponents.map(value => value.id), ['bf-sword', 'pickaxe']);
  const result = buyEquipment(character, 'infinity');
  assert.equal(result.slot, 2);
  assert.equal(character.gold, 1275);
  assert.equal(character.inventory[2].id, 'infinity');
  assert.equal(character.inventory[5], null);
  for (const index of [0, 1, 3, 4]) assert.equal(character.inventory[index], untouched[index]);
});

test('repeated recipe components consume each owned slot once and only up to recipe quantities', () => {
  const character = hero(3000, [slot('needlessly-large-rod')]);
  let quote = purchaseQuote(character, 'rabadon');
  assert.equal(quote.discount, 1200);
  assert.deepEqual(quote.components, [0]);
  character.inventory[1] = slot('needlessly-large-rod');
  character.inventory[2] = slot('needlessly-large-rod');
  quote = purchaseQuote(character, 'rabadon');
  assert.equal(quote.discount, 2400);
  assert.equal(quote.cost, 1200);
  assert.deepEqual(quote.components, [0, 1]);
  buyEquipment(character, 'rabadon');
  assert.equal(character.inventory[0].id, 'rabadon');
  assert.equal(character.inventory[1], null);
  assert.equal(character.inventory[2].id, 'needlessly-large-rod', 'third rod is unrelated to this recipe');
});

test('nested recipes deduct owned leaf components without reusing duplicate ingredients', () => {
  const character = hero(2500, [slot('long-sword'), slot('dagger'), slot('dagger'), slot('pickaxe')]);
  const quote = purchaseQuote(character, 'blade-ruined');
  assert.equal(quote.discount, 1725);
  assert.equal(quote.cost, 1475);
  assert.deepEqual(quote.components, [0, 1, 2, 3]);
  assert.equal(buyEquipment(character, 'blade-ruined').ok, true);
  assert.equal(character.gold, 1025);
  assert.deepEqual(character.inventory.map(value => value?.id || null), ['blade-ruined', null, null, null, null, null]);
});

test('an owned intermediate wins over its children and never double-counts the same recipe branch', () => {
  const character = hero(2000, [slot('lost-chapter'), slot('amplifying-tome'), slot('sapphire-crystal'), slot('blasting-wand')]);
  const quote = purchaseQuote(character, 'ludens');
  assert.equal(quote.discount, 2050);
  assert.equal(quote.cost, 800);
  assert.deepEqual(quote.components, [0, 3]);
  buyEquipment(character, 'ludens');
  assert.equal(character.inventory[0].id, 'ludens');
  assert.equal(character.inventory[1].id, 'amplifying-tome');
  assert.equal(character.inventory[2].id, 'sapphire-crystal');
});

test('only one pair of boots is allowed while a full inventory can upgrade existing boots', () => {
  const character = hero(3000, [slot('boots'), slot('dagger'), slot('dagger'), slot('potion'), slot('long-sword'), slot('ruby-crystal')]);
  assert.equal(purchaseQuote(character, 'boots').code, 'unique-group');
  const quote = purchaseQuote(character, 'berserkers');
  assert.equal(quote.ok, true);
  assert.equal(quote.cost, 300);
  assert.deepEqual(quote.components, [0, 1, 2]);
  assert.equal(buyEquipment(character, 'berserkers').ok, true);
  const before = structuredClone(character);
  assert.equal(buyEquipment(character, 'boots').code, 'unique-group');
  assert.equal(buyEquipment(character, 'berserkers').code, 'unique-item');
  assert.deepEqual(character, before);
});

test('legendary equipment is unique and a failed duplicate purchase is atomic', () => {
  const character = hero(8000, [slot('rabadon'), slot('needlessly-large-rod')]);
  const before = structuredClone(character);
  const result = buyEquipment(character, 'rabadon');
  assert.equal(result.ok, false);
  assert.equal(result.code, 'unique-item');
  assert.deepEqual(character, before);
});

test('consumables stack at stable slots in a full inventory and enforce total stack caps', () => {
  for (const [id, limit] of [['potion', 5], ['control-ward', 2]]) {
    const character = hero(1000, [slot('boots'), slot('long-sword'), slot('ruby-crystal'), slot(id, limit - 1), slot('dagger'), slot('cloth-armor')]);
    const quote = purchaseQuote(character, id);
    assert.equal(quote.ok, true);
    assert.equal(quote.slot, 3);
    assert.equal(quote.stackLimit, limit);
    assert.equal(buyEquipment(character, id).ok, true);
    assert.equal(character.inventory[3].count, limit);
    const before = structuredClone(character);
    assert.equal(buyEquipment(character, id).code, 'stack-limit');
    assert.deepEqual(character, before);
  }
});

test('selling refunds 70% equipment and 40% starters or consumables, one stack unit at a time', () => {
  const character = hero(0, [slot('infinity'), slot('doran-blade'), slot('potion', 3), slot('control-ward', 2), slot('pickaxe')]);
  const stablePickaxe = character.inventory[4];
  assert.equal(sellQuote(character, 0).refund, 2520);
  assert.equal(sellEquipment(character, 0).ok, true);
  assert.equal(character.gold, 2520);
  assert.equal(character.inventory[0], null);
  assert.equal(sellEquipment(character, 1).refund, 180);
  assert.equal(sellEquipment(character, 2).refund, 20);
  assert.equal(character.inventory[2].count, 2);
  assert.equal(sellEquipment(character, 3).refund, 30);
  assert.equal(character.inventory[3].count, 1);
  assert.equal(character.gold, 2750);
  assert.equal(character.inventory[4], stablePickaxe);
  assert.equal(sellQuote(character, 4).refund, 612, 'fractional refunds round down');
});

test('invalid or remote sales are pure failures and deleting a final unit leaves a null slot', () => {
  const character = hero(0, [null, slot('potion'), null, slot('long-sword')]);
  const before = structuredClone(character), inventory = character.inventory;
  for (const index of [-1, 0, 6, .5]) assert.equal(sellEquipment(character, index).ok, false);
  assert.equal(sellEquipment(character, 3, { canShop: false }).code, 'away-from-shop');
  assert.deepEqual(character, before);
  assert.equal(character.inventory, inventory);
  assert.equal(sellEquipment(character, 1).ok, true);
  assert.equal(character.inventory[1], null);
  assert.equal(character.inventory[3].id, 'long-sword');
});

test('buying components then upgrading spends exactly full price and selling cannot create gold', () => {
  const character = hero(10000);
  for (const id of ['long-sword', 'dagger', 'dagger', 'pickaxe', 'blade-ruined']) assert.equal(buyEquipment(character, id).ok, true);
  assert.equal(character.gold, 10000 - itemById.get('blade-ruined').cost);
  assert.equal(character.inventory.filter(Boolean).length, 1);
  assert.equal(sellEquipment(character, 0).refund, 2240);
  assert.equal(character.gold, 9040);
  assert.equal(character.inventory.filter(Boolean).length, 0);
});
