import test from 'node:test';
import assert from 'node:assert/strict';
import { ITEMS } from '../src/item-data.js';
import { purchaseQuote, smartPurchaseQuote, buySmartEquipment } from '../src/shop.js';

const byId = new Map(ITEMS.map(item => [item.id, item]));
const slot = (id, cooldown = 0) => ({ id, count: 1, cooldown });
const hero = (gold = 0, inventory = []) => ({ gold, alive: true, inventory: Array.from({ length: 6 }, (_, i) => inventory[i] || null) });
const ids = character => character.inventory.map(value => value?.id || null);

test('smart quotes preserve the low-level insufficient-gold API and buy one most expensive affordable ingredient', () => {
  for (const [gold, expected, price] of [[1300, 'bf-sword', 1300], [900, 'pickaxe', 875], [700, 'cloak-of-agility', 600]]) {
    const character = hero(gold), before = structuredClone(character);
    assert.equal(purchaseQuote(character, 'infinity').code, 'insufficient-gold');
    const quote = smartPurchaseQuote(character, 'infinity');
    assert.deepEqual(character, before, 'quoting is pure');
    assert.equal(quote.ok, true); assert.equal(quote.componentPurchase, true);
    assert.equal(quote.itemId, expected); assert.equal(quote.cost, price);
    assert.equal(quote.requestedItemId, 'infinity'); assert.equal(quote.requestedCost, 3600);
    assert.equal(quote.remainingGold, gold - price); assert.equal(quote.fallback.itemId, expected);
    assert.ok(buySmartEquipment(character, 'infinity').ok);
    assert.equal(character.gold, gold - price); assert.equal(character.inventory.filter(Boolean).length, 1);
    assert.equal(character.inventory[0].id, expected);
  }
});

test('the requested complete item always wins when its remaining price is affordable', () => {
  const character = hero(1500, [slot('bf-sword'), slot('pickaxe')]);
  const quote = buySmartEquipment(character, 'infinity');
  assert.equal(quote.itemId, 'infinity'); assert.equal(quote.cost, 1425);
  assert.equal(quote.componentPurchase, false); assert.equal(quote.fallback, null);
  assert.equal(character.gold, 75); assert.deepEqual(ids(character), ['infinity', null, null, null, null, null]);
});

test('an affordable intermediate is ranked by catalog value and upgrades its owned children', () => {
  const character = hero(900, [slot('amplifying-tome'), slot('sapphire-crystal')]);
  const quote = smartPurchaseQuote(character, 'ludens');
  assert.equal(quote.itemId, 'lost-chapter'); assert.equal(quote.fullCost, 1200); assert.equal(quote.cost, 450);
  assert.equal(quote.requestedCost, 2100); assert.equal(quote.requestedDiscount, 750);
  assert.deepEqual(quote.components, [0, 1]);
  assert.ok(buySmartEquipment(character, 'ludens').ok);
  assert.equal(character.gold, 450); assert.deepEqual(ids(character), ['lost-chapter', null, null, null, null, null]);
});

test('exact intermediate ownership closes its branch and never buys redundant children', () => {
  const character = hero(350, [slot('vampiric-scepter'), slot('long-sword'), slot('dagger'), slot('dagger')]);
  const sword = character.inventory[1];
  const quote = buySmartEquipment(character, 'blade-ruined');
  assert.equal(quote.itemId, 'recurve-bow'); assert.equal(quote.cost, 200);
  assert.deepEqual(ids(character), ['vampiric-scepter', 'long-sword', 'recurve-bow', null, null, null]);
  assert.equal(character.inventory[1], sword); assert.equal(character.gold, 150);
  const filled = hero(500, [slot('vampiric-scepter'), slot('recurve-bow'), slot('pickaxe')]);
  const before = structuredClone(filled);
  assert.equal(buySmartEquipment(filled, 'blade-ruined').ok, false, 'only the final combine fee remains');
  assert.deepEqual(filled, before);
});

test('duplicate recipe requirements buy only the still missing occurrence and leave surplus rods intact', () => {
  const character = hero(1200, [slot('needlessly-large-rod')]);
  assert.equal(buySmartEquipment(character, 'rabadon').itemId, 'needlessly-large-rod');
  assert.equal(character.inventory.filter(value => value?.id === 'needlessly-large-rod').length, 2);
  character.gold = 1100;
  const before = structuredClone(character);
  assert.equal(buySmartEquipment(character, 'rabadon').ok, false); assert.deepEqual(character, before);
  character.gold = 1200; character.inventory[4] = slot('needlessly-large-rod');
  assert.equal(buySmartEquipment(character, 'rabadon').itemId, 'rabadon');
  assert.equal(character.inventory[4].id, 'needlessly-large-rod');
});

test('full inventories permit only ingredient upgrades and keep every unrelated fixed hotkey stable', () => {
  const character = hero(450, [slot('amplifying-tome'), slot('sapphire-crystal'), slot('long-sword', 7), slot('boots'), slot('potion'), slot('cloth-armor')]);
  const unchanged = character.inventory.slice();
  const quote = buySmartEquipment(character, 'ludens');
  assert.equal(quote.ok, true); assert.equal(quote.itemId, 'lost-chapter'); assert.equal(quote.slot, 0);
  assert.equal(character.inventory[1], null);
  for (const index of [2, 3, 4, 5]) assert.equal(character.inventory[index], unchanged[index]);
  const blocked = hero(1300, Array.from({ length: 6 }, () => slot('long-sword'))), before = structuredClone(blocked), inventory = blocked.inventory;
  assert.equal(buySmartEquipment(blocked, 'rabadon').ok, false);
  assert.deepEqual(blocked, before); assert.equal(blocked.inventory, inventory);
});

test('unique groups, existing legendary items, distance, invalid gold and unaffordable leaves fail atomically', () => {
  const cases = [
    [hero(1000, [slot('essence-reaver')]), 'trinity-force', {}, 'unique-group'],
    [hero(1000, [slot('steraks')]), 'maw', {}, 'unique-group'],
    [hero(1000, [slot('infinity')]), 'infinity', {}, 'unique-item'],
    [hero(1300), 'infinity', { canShop: false }, 'away-from-shop'],
    [hero(NaN), 'infinity', {}, 'invalid-gold'], [hero(Infinity), 'infinity', {}, 'invalid-gold'],
    [hero(-1), 'infinity', {}, 'invalid-gold'], [hero(249), 'blade-ruined', {}, 'insufficient-gold'],
    [hero(1000), 'missing-equipment', {}, 'unknown-item'],
  ];
  for (const [character, id, options, code] of cases) {
    const before = structuredClone(character), inventory = character.inventory;
    const quote = buySmartEquipment(character, id, options);
    assert.equal(quote.ok, false); assert.equal(quote.code, code); assert.equal(quote.componentPurchase, false);
    assert.deepEqual(character, before); assert.equal(character.inventory, inventory);
  }
});

test('equal-value missing materials use deterministic recipe order', () => {
  for (let i = 0; i < 10; i++) assert.equal(smartPurchaseQuote(hero(400), 'liandry').itemId, 'amplifying-tome');
  const character = hero(400, [slot('amplifying-tome')]);
  assert.equal(buySmartEquipment(character, 'liandry').itemId, 'ruby-crystal');
});

test('nonrecipe consumables preserve stacking rules and never fallback to unrelated equipment', () => {
  const character = hero(50, [slot('potion')]);
  assert.equal(buySmartEquipment(character, 'potion').componentPurchase, false); assert.equal(character.inventory[0].count, 2);
  character.inventory[0].count = 5; character.gold = 500;
  const before = structuredClone(character);
  assert.equal(buySmartEquipment(character, 'potion').code, 'stack-limit'); assert.deepEqual(character, before);
});

test('repeated clicks complete every composite equipment without spending above its catalog price', () => {
  function recipeIds(id, result = new Set()) {
    for (const ingredient of byId.get(id).recipe || []) { result.add(ingredient); recipeIds(ingredient, result); }
    return result;
  }
  for (const requested of ITEMS.filter(item => item.recipe?.length)) {
    const character = hero(), allowed = recipeIds(requested.id);
    let supplied = 0, completed = false;
    for (let step = 0; step < 40 && !completed; step++) {
      character.gold += 250; supplied += 250;
      const before = purchaseQuote(character, requested.id), quote = buySmartEquipment(character, requested.id);
      if (!quote.ok) continue;
      if (quote.componentPurchase) {
        assert.ok(allowed.has(quote.itemId), `${requested.id}: purchase stays in recipe`);
        const after = purchaseQuote(character, requested.id);
        assert.ok(after.discount >= before.discount + quote.cost, `${requested.id}: all spent gold remains credit`);
      } else {
        assert.equal(quote.itemId, requested.id); completed = true;
      }
    }
    assert.equal(completed, true, `${requested.id} eventually completes`);
    assert.equal(supplied - character.gold, requested.cost, `${requested.id} total paid equals catalog price`);
    assert.deepEqual(character.inventory.filter(Boolean).map(value => value.id), [requested.id], `${requested.id} leaves no redundant materials`);
  }
});
