import { ITEMS } from './item-data.js';

const byId = new Map(ITEMS.map(item => [item.id, item]));
const owned = hero => (hero?.inventory || []).map(slot => byId.get(slot?.id)).filter(Boolean);
const has = (hero, id) => (hero?.inventory || []).some(slot => slot?.id === id);
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const structure = target => ['tower', 'inhibitor', 'nexus', 'ward'].includes(target?.kind);
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const enemies = (game, hero, point, range) => game.entities.filter(target => target.alive && target.team !== hero.team && !structure(target) && distance(target, point) <= range + (target.radius || 0) && game.isVisible(target, hero.team));
const allies = (game, hero, point, range) => game.entities.filter(target => target.alive && target.kind === 'hero' && target.team === hero.team && distance(target, point) <= range);
const damage = (game, target, amount, type, source, key) => game._damage(target, amount, type, source, `item:${key}`, true);
const event = (game, hero, key, data = {}) => game._event('spell', { source: hero.id, hero: hero.heroId, team: hero.team, key: `ITEM_${key.toUpperCase()}`, x: hero.x, z: hero.z, radius: 5, color: '#dfc57f', ...data });
const power = hero => 1 + (hero.healShieldPower || 0);

// Call after the simulator has assigned its existing base stats. The supplied stats
// are the sums of item.stats; selling gear therefore removes these values immediately.
export function recomputeEquipmentStats(hero, stats = {}, time = 0) {
  hero.magicResist = (hero.baseMagicResist || 30) + ((hero.level || 1) - 1) * 1.5 + (stats.magicResist || 0);
  for (const key of ['hpRegen', 'healShieldPower', 'lethality', 'magicPen']) hero[key] = stats[key] || 0;
  for (const key of ['armorPen', 'magicPenPercent', 'tenacity', 'slowResist', 'attackReduction']) hero[key] = clamp(stats[key] || 0, 0, key === 'attackReduction' ? .5 : .8);
  if (hero.attackRange > 8) hero.attackRange += stats.attackRange || 0;
  if (!owned(hero).some(item => item.passive?.startsWith('spellblade'))) hero.spellbladeReadyUntil = 0;
  if (!has(hero, 'kraken-slayer')) hero.krakenHits = 0;
  return hero;
}

export function equipmentHealingMultiplier(hero, time) {
  return hero.igniteUntil > time || hero.grievousUntil > time ? .6 : 1;
}

export function equipmentOnCast(game, hero, key) {
  if (!/^[QWER]$/.test(key) || (hero.spellbladeCooldownUntil || 0) > game.time) return;
  if (owned(hero).some(item => item.passive?.startsWith('spellblade'))) hero.spellbladeReadyUntil = game.time + 10;
}

export function equipmentOnAttack(game, hero, target) {
  if (hero.kind !== 'hero' || !target || target.kind === 'ward') return;
  const items = owned(hero), time = game.time;
  const spellblade = items.find(item => item.passive?.startsWith('spellblade'));
  if (spellblade && hero.spellbladeReadyUntil > time && !(hero.spellbladeCooldownUntil > time)) {
    hero.spellbladeReadyUntil = 0; hero.spellbladeCooldownUntil = time + 1.5;
    const base = hero.baseAttack || 50, magic = spellblade.passive === 'spellblade-magic';
    const amount = magic ? base * .75 + (hero.ap || 0) * .4 : base * (spellblade.passive === 'spellblade-trinity' ? 2 : 1);
    damage(game, target, amount, magic ? 'magic' : 'physical', hero, 'spellblade');
    if (spellblade.passive === 'spellblade-mana') hero.mana = Math.min(hero.maxMana, hero.mana + 30);
    event(game, hero, 'spellblade', { x: target.x, z: target.z, target: target.id, radius: 3 });
  }
  if (structure(target)) return;
  if (has(hero, 'blade-ruined')) damage(game, target, Math.min(target.kind === 'monster' ? 120 : Infinity, target.hp * .07), 'physical', hero, 'ruined');
  if (has(hero, 'nashors-tooth')) damage(game, target, 20 + (hero.ap || 0) * .2, 'magic', hero, 'nashor');
  if (has(hero, 'wits-end')) damage(game, target, 40, 'magic', hero, 'wits');
  if (has(hero, 'kraken-slayer')) {
    hero.krakenHits = (hero.krakenHits || 0) + 1;
    if (hero.krakenHits >= 3) { hero.krakenHits = 0; damage(game, target, 40 + hero.attack * .3, 'true', hero, 'kraken'); event(game, hero, 'kraken', { x: target.x, z: target.z, target: target.id }); }
  }
  const cleave = items.find(item => item.passive === 'cleave' || item.passive === 'cleave-health');
  if (cleave) {
    const amount = cleave.passive === 'cleave-health' ? hero.attack * .3 + hero.maxHp * .02 : hero.attack * (cleave.id === 'ravenous-hydra' ? .6 : .35);
    for (const victim of enemies(game, hero, target, 7)) if (victim.id !== target.id) damage(game, victim, amount, 'physical', hero, 'cleave');
  }
  if (has(hero, 'runaans') && hero.attackRange > 8) {
    const targets = enemies(game, hero, hero, hero.attackRange).filter(victim => victim.id !== target.id).sort((a, b) => distance(a, target) - distance(b, target)).slice(0, 2);
    for (const victim of targets) game._tracking(hero, victim, hero.attack * .4, 'physical', 'item:hurricane');
  }
}

function effectiveResistance(target, source, type, time) {
  if (type === 'true') return { base: 0, effective: 0 };
  let base = Math.max(0, type === 'magic' ? target.magicResist || 0 : target.armor || 0);
  // Match the simulator's existing Yasuo armor penetration before the item ratio.
  if (type === 'physical' && source?.heroId === 'yasuo' && source.armorPenUntil > time) base *= .6;
  let effective = base;
  if (type === 'physical') {
    if (target.armorShredUntil > time) effective *= 1 - Math.min(.3, (target.armorShredStacks || 0) * .05);
    effective = effective * (1 - (source?.armorPen || 0)) - (source?.lethality || 0);
  } else effective = effective * (1 - (source?.magicPenPercent || 0)) - (source?.magicPen || 0);
  return { base, effective: Math.max(0, effective) };
}

// Return adjusted RAW damage. Call once after damage eligibility/structure gates and
// before the simulator's normal resistance and shield calculation. item: keys cannot
// trigger skill passives recursively, while their damage still benefits from penetration.
export function equipmentDamage(game, target, source, amount, type, key = '') {
  if (!target?.alive || !(amount > 0) || target.kind === 'ward') return amount;
  const time = game.time, proc = key.startsWith('item:'), skill = !proc && key !== 'attack' && key !== 'ROCKET_ATTACK';
  if (target.kind === 'hero' && !proc && skill && type === 'magic' && has(target, 'banshee') && !(target.spellshieldCooldownUntil > time)) {
    target.spellshieldCooldownUntil = time + 30; event(game, target, 'spellshield'); return 0;
  }
  if (key === 'attack' || key === 'ROCKET_ATTACK') amount *= 1 - (target.attackReduction || 0);
  const { base, effective } = effectiveResistance(target, source, type, time);
  if (type !== 'true') amount *= (100 + base) / (100 + effective);
  if (source?.kind === 'hero' && !proc && !structure(target)) {
    const items = owned(source);
    if (items.some(item => item.passive === 'grievous-magic' && type === 'magic' || item.passive === 'grievous-physical' && type === 'physical')) target.grievousUntil = time + 3;
    if (type === 'physical' && has(source, 'black-cleaver')) { target.armorShredStacks = Math.min(6, (target.armorShredUntil > time ? target.armorShredStacks || 0 : 0) + 1); target.armorShredUntil = time + 6; }
    if (type === 'magic' && skill && has(source, 'rylai')) { target.slowUntil = Math.max(target.slowUntil || 0, time + 1); target.slowPower = Math.max(target.slowPower || 0, .2); }
    if (type === 'magic' && skill && has(source, 'liandry')) {
      target.equipmentBurns ||= {};
      const previous = target.equipmentBurns[source.id];
      target.equipmentBurns[source.id] = { sourceId: source.id, until: time + 3, nextTick: previous?.nextTick ?? time + .5, damage: Math.min(target.kind === 'monster' ? 100 : Infinity, target.maxHp * .01) };
    }
  }
  if (target.kind === 'hero') {
    const lifeline = owned(target).find(item => ['lifeline', 'lifeline-magic', 'lifeline-mana'].includes(item.passive) && (item.passive !== 'lifeline-magic' || type === 'magic'));
    const existingShield = target.shieldUntil > time ? target.shield || 0 : 0;
    const reduced = amount * (type === 'true' ? 1 : 100 / (100 + base)) * (target.fortifyUntil > time ? .65 : 1);
    if (lifeline && !(target.lifelineCooldownUntil > time) && target.hp - Math.max(0, reduced - existingShield) < target.maxHp * .3) {
      target.lifelineCooldownUntil = time + 90;
      const shield = lifeline.passive === 'lifeline-mana' ? 200 + target.maxMana * .2 : lifeline.id === 'steraks' ? 350 : lifeline.id === 'maw' ? 300 : 150;
      game._shield(target, existingShield + shield, 4); event(game, target, 'lifeline');
    }
    if (key === 'attack' && source?.alive && !structure(source)) {
      const thorns = owned(target).filter(item => item.passive === 'thorns');
      if (thorns.length) { source.grievousUntil = time + 3; damage(game, source, 10 + (thorns.some(item => item.id === 'thornmail') ? target.armor * .1 : 0), 'magic', target, 'thorns'); }
    }
  }
  return amount;
}

// Call for every alive entity alongside the game's other damage-over-time statuses.
export function equipmentStatusUpdate(game, entity) {
  for (const [id, burn] of Object.entries(entity.equipmentBurns || {})) {
    // Process due ticks before expiring; fractional frame times may pass the exact
    // three-second boundary between updates, but the final tick must still happen.
    while (burn.nextTick <= Math.min(game.time, burn.until) + 1e-8) {
      burn.nextTick += .5; const source = game.getEntity(burn.sourceId);
      if (source) damage(game, entity, burn.damage, 'magic', source, 'liandry');
      if (!entity.alive) break;
    }
    if (burn.until < game.time || !entity.alive) delete entity.equipmentBurns[id];
  }
}

// Call each living hero update, including while channeling recall or crowd-controlled.
export function equipmentUpdate(game, hero, dt) {
  if (!hero.alive || !(dt > 0)) return;
  const multiplier = equipmentHealingMultiplier(hero, game.time);
  if (hero.hpRegen) hero.hp = Math.min(hero.maxHp, hero.hp + hero.hpRegen * dt * multiplier);
  if (has(hero, 'warmogs') && game.time - hero.lastDamagedAt >= 6) hero.hp = Math.min(hero.maxHp, hero.hp + hero.maxHp * .05 * dt * multiplier);
  if (has(hero, 'sunfire') && !(hero.immolateNextTick > game.time)) {
    hero.immolateNextTick = game.time + .5;
    for (const target of enemies(game, hero, hero, 7)) damage(game, target, (20 + hero.level * 2) * .5, 'magic', hero, 'immolate');
  }
  // Shorten a newly applied control once, never compound duration on each frame.
  if (hero.tenacity) {
    hero.equipmentControls ||= {};
    for (const key of ['stunUntil', 'rootUntil', 'silenceUntil', 'blindUntil', 'charmUntil', 'fearUntil', 'tauntUntil', 'slowUntil']) {
      const until = hero[key] || 0;
      if (until > game.time && until !== hero.equipmentControls[key]) {
        if (key === 'stunUntil' && hero.invulnerableUntil > game.time) continue;
        const shortened = game.time + (until - game.time) * (1 - hero.tenacity);
        hero[key] = key === 'stunUntil' ? Math.max(shortened, hero.airborneUntil || 0) : shortened;
        hero.equipmentControls[key] = hero[key];
      }
    }
  }
}

const cleanse = (game, target) => {
  for (const key of ['stunUntil','rootUntil','silenceUntil','blindUntil','charmUntil','fearUntil','tauntUntil','slowUntil']) target[key] = 0;
  // Knockups remain uncleanseable and must still prevent walking until landing.
  target.stunUntil = target.airborneUntil > game.time ? target.airborneUntil : 0;
  target.slowPower = 0;
};
const heal = (game, source, target, amount) => { target.hp = Math.min(target.maxHp, target.hp + amount * power(source) * equipmentHealingMultiplier(target, game.time)); };

// Existing potion/ward/stasis actions remain with Game.useItem. A true return means
// one new active succeeded and consumed its cooldown; false means unknown/invalid.
export function useEquipment(game, hero, slot, item, x = hero.x, z = hero.z) {
  if (!hero.alive || !slot || !item?.active || slot.cooldown > 0) return false;
  const active = item.active, point = { x, z };
  if (!['cleanse','mikael','locket','redemption','shurelya','randuin','rocketbelt','galeforce'].includes(active)) return false;
  if (active === 'redemption' && distance(hero, point) > 70) return game._fail(hero, '救赎的目标距离过远');
  let target;
  if (active === 'mikael') { target = allies(game, hero, hero, 30).sort((a,b) => distance(a,point) - distance(b,point))[0]; if (!target || distance(target, point) > 10) return game._fail(hero, '请指定附近的友方英雄'); }
  if (active === 'cleanse') { cleanse(game, hero); slot.cooldown = 90; }
  if (active === 'mikael') { cleanse(game, target); heal(game, hero, target, 200); slot.cooldown = 90; }
  if (active === 'locket') { for (const ally of allies(game, hero, hero, 25)) game._shield(ally, (200 + hero.level * 10) * power(hero), 3); slot.cooldown = 90; }
  if (active === 'redemption') { for (const ally of allies(game, hero, point, 18)) heal(game, hero, ally, 250 + hero.level * 15); slot.cooldown = 90; }
  if (active === 'shurelya') { for (const ally of allies(game, hero, hero, 25)) ally.hasteUntil = Math.max(ally.hasteUntil || 0, game.time + 4); slot.cooldown = 75; }
  if (active === 'randuin') { for (const victim of enemies(game, hero, hero, 18)) { victim.slowUntil = Math.max(victim.slowUntil || 0, game.time + 2); victim.slowPower = Math.max(victim.slowPower || 0, .55); } slot.cooldown = 60; }
  if (active === 'rocketbelt' || active === 'galeforce') {
    if (hero.rootUntil > game.time || hero.stunUntil > game.time || hero.airborneUntil > game.time || hero.invulnerableUntil > game.time) return game._fail(hero, '受到控制，暂时无法使用位移装备');
    game._dash(hero, x, z, active === 'rocketbelt' ? 18 : 16); hero.command = { type: 'stop' };
    const targets = enemies(game, hero, hero, 22).sort((a,b) => distance(a,hero) - distance(b,hero));
    if (active === 'rocketbelt') for (const victim of targets) damage(game, victim, 100 + hero.ap * .15, 'magic', hero, 'rocketbelt');
    else if (targets[0]) game._tracking(hero, targets[0], 150 + hero.attack * .3, 'magic', 'item:galeforce');
    slot.cooldown = active === 'rocketbelt' ? 60 : 90;
  }
  game._cancelRecall?.(hero); event(game, hero, active, { x: active === 'redemption' ? x : target?.x ?? hero.x, z: active === 'redemption' ? z : target?.z ?? hero.z, radius: active === 'redemption' ? 18 : 8 });
  return true;
}
