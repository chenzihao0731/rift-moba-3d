import { ITEMS } from './item-data.js';

const ITEM = new Map(ITEMS.map(item => [item.id, item]));
export const INVENTORY_SIZE = 6;
const inventoryOf = hero => Array.from({ length: INVENTORY_SIZE }, (_, index) => hero?.inventory?.[index] || null);
const countOf = slot => Math.max(1, Math.floor(slot?.count || 1));
const bitCount = mask => { let count = 0; for (; mask; mask &= mask - 1) count++; return count; };
const failure = (quote, code, reason) => ({ ...quote, ok: false, code, reason });

// There are only six slots. Match every possible disjoint subset of a recipe tree,
// so an owned intermediate item wins over its children without consuming either twice.
function componentOptions(itemId, inventory, ancestry = new Set()) {
  const options = new Set([0]), item = ITEM.get(itemId);
  if (!item || ancestry.has(itemId)) return options;
  inventory.forEach((slot, index) => { if (slot?.id === itemId) options.add(1 << index); });
  if (item.recipe?.length) {
    const nextAncestry = new Set(ancestry); nextAncestry.add(itemId);
    let children = new Set([0]);
    for (const ingredient of item.recipe) {
      const matching = componentOptions(ingredient, inventory, nextAncestry), combined = new Set();
      for (const left of children) for (const right of matching) if (!(left & right)) combined.add(left | right);
      children = combined;
    }
    for (const mask of children) options.add(mask);
  }
  return options;
}

function ownedComponents(item, inventory) {
  let options = new Set([0]);
  for (const ingredient of item.recipe || []) {
    const matching = componentOptions(ingredient, inventory), combined = new Set();
    for (const left of options) for (const right of matching) if (!(left & right)) combined.add(left | right);
    options = combined;
  }
  let bestMask = 0, bestCredit = 0;
  for (const mask of options) {
    const credit = inventory.reduce((sum, slot, index) => sum + (mask & (1 << index) ? ITEM.get(slot.id).cost : 0), 0);
    if (credit > item.cost) continue;
    if (credit > bestCredit || credit === bestCredit && bitCount(mask) > bitCount(bestMask)) { bestMask = mask; bestCredit = credit; }
  }
  const components = [];
  inventory.forEach((slot, index) => { if (bestMask & (1 << index)) components.push(index); });
  return { components, discount: bestCredit };
}

export function purchaseQuote(hero, itemId, { canShop = true } = {}) {
  const item = ITEM.get(itemId), inventory = inventoryOf(hero);
  if (!item) return failure({ item: null, itemId, cost: 0, fullCost: 0, discount: 0, components: [], ownedComponents: [], slot: null }, 'unknown-item', '未知装备');
  const matched = ownedComponents(item, inventory);
  const count = inventory.reduce((sum, slot) => sum + (slot?.id === itemId ? countOf(slot) : 0), 0);
  const stackLimit = item.stackLimit || 1;
  const stackSlot = item.stackLimit ? inventory.findIndex(slot => slot?.id === itemId) : -1;
  // Upgrades replace the first consumed component, preserving every unrelated hotkey.
  const slot = stackSlot >= 0 ? stackSlot : matched.components[0] ?? inventory.findIndex(value => !value);
  const cost = item.cost - matched.discount;
  const quote = { ok: true, code: 'available', reason: '', item, itemId, cost, fullCost: item.cost,
    discount: matched.discount, components: matched.components,
    ownedComponents: matched.components.map(index => ({ slot: index, id: inventory[index].id, item: ITEM.get(inventory[index].id), value: ITEM.get(inventory[index].id).cost })),
    slot: slot >= 0 ? slot : null, stack: stackSlot >= 0, count, maxStack: stackLimit, stackLimit,
    missingGold: Math.max(0, cost - (Number.isFinite(hero?.gold) ? hero.gold : 0)) };
  if (!canShop) return failure(quote, 'away-from-shop', '请在己方泉水商店内购买装备');
  if (item.unique && inventory.some(value => value?.id === itemId)) return failure(quote, 'unique-item', '已经拥有这件唯一装备');
  if (item.uniqueGroup && inventory.some((value, index) => value && !matched.components.includes(index) && ITEM.get(value.id)?.uniqueGroup === item.uniqueGroup)) return failure(quote, 'unique-group', item.uniqueGroup === 'boots' ? '只能装备一双鞋，请升级已有鞋子' : `已拥有同类唯一装备，请通过已有散件升级`);
  if (item.stackLimit && count >= stackLimit) return failure(quote, 'stack-limit', `${item.name}最多携带 ${stackLimit} 个`);
  if (slot < 0) return failure(quote, 'inventory-full', '装备栏已满，请先出售装备');
  if (quote.missingGold > 0 || !Number.isFinite(hero?.gold)) return failure(quote, 'insufficient-gold', '金币不足');
  return quote;
}

export function buyEquipment(hero, itemId, options) {
  const quote = purchaseQuote(hero, itemId, options);
  if (!quote.ok) return quote;
  applyPurchase(hero, quote);
  return quote;
}

function applyPurchase(hero, quote) {
  const inventory = inventoryOf(hero);
  for (const index of quote.components) inventory[index] = null;
  inventory[quote.slot] = quote.stack ? { ...inventory[quote.slot], count: countOf(inventory[quote.slot]) + 1 }
    : { id: quote.itemId, count: 1, cooldown: 0 };
  hero.gold -= quote.cost;
  hero.inventory = inventory;
}

// Retain one deterministic assignment for every disjoint slot subset. An exact
// intermediate terminates its branch; its children are never counted a second time.
function recipePlans(itemId, inventory, ancestry = new Set()) {
  const item = ITEM.get(itemId), plans = new Map([[0, { itemId, exact: false, children: [] }]]);
  if (!item || ancestry.has(itemId)) return plans;
  inventory.forEach((slot, index) => {
    if (slot?.id === itemId) plans.set(1 << index, { itemId, exact: true, children: [] });
  });
  if (item.recipe?.length) {
    const next = new Set(ancestry); next.add(itemId);
    let children = new Map([[0, []]]);
    for (const ingredient of item.recipe) {
      const matching = recipePlans(ingredient, inventory, next), combined = new Map();
      for (const [leftMask, left] of children) for (const [rightMask, right] of matching) {
        const mask = leftMask | rightMask;
        if (!(leftMask & rightMask) && !combined.has(mask)) combined.set(mask, [...left, right]);
      }
      children = combined;
    }
    for (const [mask, branches] of children) if (mask === 0 || !plans.has(mask)) plans.set(mask, { itemId, exact: false, children: branches });
  }
  return plans;
}

function missingMaterials(item, inventory, components) {
  const mask = components.reduce((value, index) => value | 1 << index, 0);
  const plan = recipePlans(item.id, inventory).get(mask);
  const candidates = new Set();
  function visit(node, root = false) {
    if (!node || node.exact) return;
    if (!root) candidates.add(node.itemId);
    for (const child of node.children) visit(child);
  }
  visit(plan, true);
  return [...candidates];
}

function requestedFields(quote, requested, componentPurchase = false, gold) {
  return { ...quote, requestedItem: requested.item, requestedItemId: requested.itemId,
    requestedCost: requested.cost, requestedFullCost: requested.fullCost,
    requestedDiscount: requested.discount, requestedComponents: requested.components,
    requestedMissingGold: requested.missingGold, componentPurchase,
    remainingGold: Number.isFinite(gold) ? gold - (quote.ok ? quote.cost : 0) : null,
    fallback: componentPurchase ? { itemId: quote.itemId, name: quote.item.name, cost: quote.cost, fullCost: quote.fullCost, reason: 'insufficient-gold' } : null };
}

// A click always makes at most one transaction. Complete the requested item first;
// otherwise invest in the most expensive unmet ingredient the player can legally
// buy now, including upgrading an intermediate with its already owned components.
export function smartPurchaseQuote(hero, itemId, options = {}) {
  const requested = purchaseQuote(hero, itemId, options);
  const wrap = quote => requestedFields(quote, requested, false, hero?.gold);
  if (!Number.isFinite(hero?.gold) || hero.gold < 0) return wrap(failure(requested, 'invalid-gold', '金币状态无效'));
  if (requested.ok || !requested.item?.recipe?.length) return wrap(requested);
  if (!['insufficient-gold', 'inventory-full'].includes(requested.code) || requested.missingGold <= 0) return wrap(requested);
  const candidates = [];
  for (const ingredient of missingMaterials(requested.item, inventoryOf(hero), requested.components)) {
    const quote = purchaseQuote(hero, ingredient, options);
    if (!quote.ok) continue;
    const projected = { ...hero, inventory: inventoryOf(hero) };
    applyPurchase(projected, quote);
    const next = purchaseQuote(projected, itemId, options);
    // Do not spend on a duplicate or on a branch that displaces another fulfilled
    // branch. Every gold spent here must remain credit toward the requested item.
    if (next.discount + 1e-8 < requested.discount + quote.cost || !next.components.includes(quote.slot)) continue;
    candidates.push(quote);
  }
  candidates.sort((a, b) => b.fullCost - a.fullCost || b.cost - a.cost);
  return candidates.length ? requestedFields(candidates[0], requested, true, hero.gold) : wrap(requested);
}

export function buySmartEquipment(hero, itemId, options = {}) {
  const quote = smartPurchaseQuote(hero, itemId, options);
  if (quote.ok) applyPurchase(hero, quote);
  return quote;
}

export function sellQuote(hero, index, { canShop = true } = {}) {
  const slot = Number.isInteger(index) && index >= 0 && index < INVENTORY_SIZE ? inventoryOf(hero)[index] : null;
  const item = ITEM.get(slot?.id), quote = { ok: true, code: 'available', reason: '', item: item || null,
    itemId: item?.id || null, slot: index, refund: item ? Math.floor(item.cost * (item.sellRate ?? .7) + 1e-8) : 0,
    count: slot ? countOf(slot) : 0, remainingCount: slot ? countOf(slot) - 1 : 0 };
  if (!item) return failure(quote, 'empty-slot', '此装备栏为空');
  if (!canShop) return failure(quote, 'away-from-shop', '请在己方泉水商店内出售装备');
  if (!Number.isFinite(hero?.gold)) return failure(quote, 'invalid-gold', '金币状态无效');
  return quote;
}

export function sellEquipment(hero, index, options) {
  const quote = sellQuote(hero, index, options);
  if (!quote.ok) return quote;
  const inventory = inventoryOf(hero);
  inventory[index] = quote.remainingCount > 0 ? { ...inventory[index], count: quote.remainingCount } : null;
  hero.gold += quote.refund;
  hero.inventory = inventory;
  return quote;
}
