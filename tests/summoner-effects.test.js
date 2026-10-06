import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { CombatEffects } from '../src/combat-effects.js';

const ids = ['flash', 'ignite', 'heal', 'ghost', 'barrier', 'exhaust', 'cleanse', 'teleport', 'smite', 'clarity'];
function scene(options) {
  const source = { id: 1, alive: true, x: 0, z: 0, facing: 0 }, target = { id: 2, alive: true, x: 12, z: 4 };
  const scene = new THREE.Scene(), fx = new CombatEffects(scene, options);
  fx.setEntityResolver(id => id === source.id ? source : id === target.id ? target : null, entity => !entity.hidden);
  const camera = new THREE.OrthographicCamera(-40, 40, 40, -40, .1, 100);
  return { scene, fx, source, target, update: dt => fx.update(dt, camera, 800) };
}
const spell = summoner => ({ type: 'spell', summoner, key: 'F', source: 1, target: 2, x: 12, z: 4, fromX: 0, fromZ: 0, toX: 12, toZ: 4 });

test('all ten summoner ids produce distinct effects regardless of D or F slot', () => {
  for (const id of ids) {
    const { fx, update } = scene();
    assert.equal(fx.summonerEvent(spell(id)), true);
    assert.ok(fx.effects.length > 0, id);
    if (id !== 'flash') assert.ok(fx.effects.some(effect => effect.group.userData.summoner === id), id);
    assert.equal(fx.summonerEvent({ ...spell('ghost'), summoner: 'unknown' }), false);
    assert.equal(fx.summonerEvent({ ...spell('ghost'), type: 'attack' }), false);
    update(21);
    assert.equal(fx.effects.length, 0, `${id} groups expire`);
    assert.equal(fx.stats.particles, 0, `${id} particles expire`);
  }
});

test('ghost follows movement and sustained particles respect fog visibility and particle caps', () => {
  const { fx, source, update } = scene({ maxParticles: 30 });
  fx.summonerEvent({ ...spell('ghost'), x: 0, z: 0 });
  source.x = 8; source.z = 9; update(.1);
  const wind = fx.effects.find(effect => effect.group.userData.summoner === 'ghost').group;
  assert.equal(wind.position.x, 8); assert.equal(wind.position.z, 9);
  assert.ok(fx.stats.particles > 0);
  source.hidden = true; update(.6); assert.equal(wind.visible, false); assert.equal(fx.stats.particles, 0);
  source.hidden = false;
  for (let i = 0; i < 80; i++) { source.x += .1; update(.05); }
  assert.ok(fx.stats.particles <= 30); assert.equal(fx.effects.length, 1);
});

test('heal and clarity render each indicated ally once without leaking hidden allies', () => {
  for (const summoner of ['heal', 'clarity']) {
    const { fx, target } = scene();
    fx.summonerEvent({ ...spell(summoner), targets: [1, 2, 2] });
    const groups = fx.effects.filter(effect => effect.group.userData.summoner === summoner);
    assert.equal(groups.length, 2);
    fx.clear(); target.hidden = true;
    fx.summonerEvent({ ...spell(summoner), targets: [1, 2] });
    assert.equal(fx.effects.filter(effect => effect.group.userData.summoner === summoner).length, 1);
  }
});

test('teleport channels follow the destination and cancellation immediately removes both circles and disposes materials', () => {
  const { fx, target, update } = scene();
  const start = { ...spell('teleport'), type: 'summoner-channel', x: 0, z: 0, duration: 4 };
  fx.summonerEvent(start);
  assert.equal(fx.summoners.channels.size, 1); assert.equal(fx.effects.length, 2);
  fx.summonerEvent({ ...start, type: 'spell', shape: 'channel' });
  assert.equal(fx.summoners.channels.size, 1); assert.equal(fx.effects.length, 2);
  assert.equal(fx.effects.some(effect => effect.group.userData.phase === 'arrival'), false, 'cast notification must not complete the channel');
  const material = fx.effects[0].group.children[0].material;
  let disposed = 0; material.addEventListener('dispose', () => disposed++);
  target.x = 20; target.z = 8; update(.1);
  const destination = fx.effects.find(effect => effect.group.userData.phase === 'destination').group;
  assert.equal(destination.position.x, 20); assert.equal(destination.position.z, 8);
  fx.summonerEvent({ ...start, type: 'summoner-channel-cancel' });
  assert.equal(fx.summoners.channels.size, 0); assert.equal(fx.effects.length, 0); assert.equal(disposed, 1);
  fx.summonerEvent(start); update(4.3);
  assert.equal(fx.summoners.channels.size, 0); assert.equal(fx.effects.length, 0);
});

test('teleport completion replaces circles once and duplicate completion events do not create more arrivals', () => {
  const { fx, update } = scene();
  fx.summonerEvent({ ...spell('teleport'), type: 'summoner-channel' });
  fx.summonerEvent({ ...spell('teleport'), key: 'TELEPORT_FINISH' });
  assert.equal(fx.summoners.channels.size, 0);
  assert.equal(fx.effects.filter(effect => effect.group.userData.phase === 'arrival').length, 1);
  fx.summonerEvent({ ...spell('teleport'), type: 'summoner-channel-complete' });
  assert.equal(fx.effects.filter(effect => effect.group.userData.phase === 'arrival').length, 1);
  update(2); assert.equal(fx.effects.length, 0);
});

test('repeated casts, channel eviction and clear keep all retained state bounded', () => {
  const { fx, scene: world, update } = scene({ maxEffects: 8, maxParticles: 40 });
  for (let i = 0; i < 120; i++) {
    fx.summonerEvent({ ...spell('teleport'), type: 'summoner-channel', source: i + 10 });
    assert.ok(fx.effects.length <= 8); assert.ok(fx.summoners.channels.size <= 4);
  }
  assert.equal(fx.summoners.channels.size, 4);
  fx.summonerEvent({ ...spell('teleport'), type: 'summoner-channel-cancel', source: 129 });
  assert.equal(fx.summoners.channels.size, 3); assert.equal(fx.effects.length, 6);
  for (let i = 0; i < 120; i++) fx.summonerEvent(spell(ids[i % ids.length]));
  update(.1);
  assert.ok(fx.effects.length <= 8); assert.ok(fx.stats.particles <= 40);
  assert.ok(world.children.length <= 9, 'one bounded particle batch and capped effect groups');
  fx.clear(); assert.equal(fx.summoners.channels.size, 0); assert.equal(world.children.length, 1); assert.equal(fx.effects.length, 0); assert.equal(fx.stats.particles, 0);
});
