import * as THREE from 'three';

const IDS = new Set(['flash', 'ignite', 'heal', 'ghost', 'barrier', 'exhaust', 'cleanse', 'teleport', 'smite', 'clarity']);
const CHANNEL_TYPES = new Set(['summoner-channel', 'summoner-channel-cancel', 'summoner-channel-complete']);
const V = (x, y, z) => new THREE.Vector3(x, y, z);

// Summoner visuals use the same capped effect and particle pools as champion spells.
// The only retained lookup is a bounded set of currently active teleport circles.
export class SummonerEffects {
  constructor(fx) {
    this.fx = fx;
    this.channels = new Map();
    this.resolve = () => null;
    this.visible = () => true;
  }

  setEntityResolver(resolve, visible) {
    this.resolve = resolve || (() => null);
    this.visible = visible || (() => true);
  }

  group(id, phase, entityId, x, z) {
    const group = new THREE.Group();
    group.name = `summoner-${id}-${phase}`;
    group.userData.summoner = id;
    group.userData.phase = phase;
    group.userData.source = entityId;
    group.position.set(x, .25, z);
    return group;
  }

  follow(group, entityId, fallback) {
    const entity = this.resolve(entityId) || fallback;
    if (entity) {
      group.position.x = entity.x; group.position.z = entity.z;
      group.visible = entity.alive !== false && this.visible(entity);
    }
    return entity;
  }

  flat(group, color, radius, y = 0, opacity = .7, shape = 'ring') {
    const ring = this.fx.mesh(group, shape, color, opacity);
    ring.rotation.x = -Math.PI / 2;
    ring.scale.setScalar(radius); ring.position.y = y;
    return ring;
  }

  segment(group, from, to, color, width = .2, opacity = .8) {
    const delta = to.clone().sub(from), segment = this.fx.mesh(group, 'cylinder', color, opacity);
    segment.position.copy(from).add(to).multiplyScalar(.5);
    segment.quaternion.setFromUnitVectors(V(0, 1, 0), delta.clone().normalize());
    segment.scale.set(width, delta.length(), width);
    return segment;
  }

  stopChannel(source, canceled = false) {
    const effects = this.channels.get(source);
    this.channels.delete(source);
    for (const effect of effects || []) {
      if (canceled && effect.group.visible) this.fx.burst(effect.group.position.x, .4, effect.group.position.z, 0xbda8ff, 12, 3, .35);
      const index = this.fx.effects.indexOf(effect);
      if (index >= 0) { this.fx.effects.splice(index, 1); this.fx.remove(effect); }
    }
  }

  removed(effect) {
    for (const [source, effects] of this.channels) {
      effects.delete(effect);
      if (!effects.size) this.channels.delete(source);
    }
  }

  event(event, source, target) {
    const id = event.summoner;
    if (!IDS.has(id) || event.type !== 'spell' && !CHANNEL_TYPES.has(event.type)) return false;
    source ||= this.resolve(event.source); target ||= this.resolve(event.target);
    const x = event.x ?? event.toX ?? source?.x ?? 0, z = event.z ?? event.toZ ?? source?.z ?? 0;
    const from = V(event.fromX ?? source?.x ?? x, 2.5, event.fromZ ?? source?.z ?? z);
    const to = V(event.toX ?? x, 2.5, event.toZ ?? z);
    if (event.type === 'summoner-channel-cancel' || event.type === 'summoner-channel-complete') {
      this.stopChannel(event.source, event.type.endsWith('cancel')); return true;
    }
    if (event.type === 'summoner-channel') {
      this.teleportChannel(event, source, target); return true;
    }
    // The simulator also emits a spell notification when the channel starts.
    // That notification is not the completed teleport and must retain the circles.
    if (id === 'teleport' && event.shape === 'channel') return true;
    if (id === 'flash') {
      this.fx.rune(from.x, from.z, 0xffe5a7, 2, .4);
      this.fx.rune(to.x, to.z, 0xffefb0, 3, .7);
      this.fx.lineBurst(from, to, 0xffd36b, 32, 1, .5);
      this.fx.burst(to.x, 1.4, to.z, 0xffefb2, 36, 10, .6);
    } else if (id === 'ignite') this.ignite(event, target, x, z);
    else if (id === 'heal') {
      this.heal(event.source, source, from.x, from.z);
      const healed = [...new Set([...(event.targets || []), event.target].filter(Boolean))];
      for (const targetId of healed) if (targetId !== event.source) {
        const ally = this.resolve(targetId) || (targetId === event.target ? target : null);
        if (ally && this.visible(ally)) this.heal(targetId, ally, ally.x, ally.z);
      }
    } else if (id === 'ghost') this.ghost(event.source, source, x, z, event.duration || 10);
    else if (id === 'barrier') this.barrier(event.source, source, x, z, event.duration || 2.5);
    else if (id === 'exhaust') this.exhaust(event.target, target, x, z, event.duration || 3);
    else if (id === 'cleanse') this.cleanse(event.source, source, x, z);
    else if (id === 'teleport') {
      this.stopChannel(event.source);
      this.teleportArrival(event, source, to.x, to.z);
    } else if (id === 'smite') this.smite(event.target, x, z);
    else if (id === 'clarity') {
      this.clarity(event.source, source, x, z);
      for (const targetId of new Set(event.targets || [])) if (targetId !== event.source) {
        const ally = this.resolve(targetId);
        if (ally && this.visible(ally)) this.clarity(targetId, ally, ally.x, ally.z);
      }
    }
    return true;
  }

  heal(entityId, entity, x, z) {
    const fx = this.fx, group = this.group('heal', 'bloom', entityId, x, z);
    const halo = this.flat(group, 0x70ffa6, 3.4, 0, .75);
    const ring = this.flat(group, 0xcaffcc, 2, .25, .45);
    for (const [sx, sy] of [[.32, 2.1], [1.5, .32]]) {
      const cross = fx.mesh(group, 'box', 0xddffce, .95);
      cross.position.y = 4.7; cross.scale.set(sx, sy, .25);
    }
    for (let i = 0; i < 7; i++) {
      const a = i * Math.PI * 2 / 7, leaf = fx.mesh(group, 'crystal', 0x73ffc8, .6);
      leaf.position.set(Math.cos(a) * 2.6, 1 + i % 3, Math.sin(a) * 2.6);
      leaf.scale.set(.15, .6, .15); leaf.rotation.z = a;
    }
    const rise = group.children.slice(2).map(child => ({ child, y: child.position.y }));
    fx.add(group, 1.4, (_, t) => {
      this.follow(group, entityId, entity);
      halo.scale.setScalar(2.4 + Math.sin(t * Math.PI) * 1.3);
      ring.position.y = .25 + t * 2.5;
      rise.forEach(({ child, y }) => { child.position.y = y + t * 1.4; });
    });
    for (let i = 0; i < 40; i++) {
      const a = i * 2.39996, r = 1 + Math.random() * 2;
      fx.particle(x + Math.cos(a) * r, .4, z + Math.sin(a) * r, i % 3 ? 0x8cffbd : 0xf1ffcf, -Math.cos(a) * .6, 3 + Math.random() * 4, -Math.sin(a) * .6, .5, 1.3);
    }
  }

  ghost(entityId, entity, x, z, duration) {
    const fx = this.fx, group = this.group('ghost', 'wind', entityId, x, z);
    const winds = [];
    for (let i = 0; i < 3; i++) {
      const wind = this.flat(group, i === 1 ? 0xf0ffff : 0x7cfff5, 2.2 + i * .4, .15 + i * .7, .42, 'arc');
      wind.rotation.z = i * Math.PI / 2; winds.push(wind);
    }
    let emission = 0, previous = { x, z };
    fx.add(group, Math.min(20, duration), (_, t, dt) => {
      const hero = this.follow(group, entityId, entity);
      winds.forEach((wind, i) => { wind.rotation.z = t * 20 * (i % 2 ? -1 : 1) + i * 2; wind.scale.setScalar(2.3 + Math.sin(t * 35 + i) * .35); });
      if (dt && group.visible) {
        emission += dt;
        if (emission >= .06) {
          emission %= .06;
          const dx = group.position.x - previous.x, dz = group.position.z - previous.z, length = Math.hypot(dx, dz);
          const angle = length > .02 ? Math.atan2(dz, dx) : hero?.facing || 0;
          for (const side of [-1, 1]) fx.particle(group.position.x - Math.cos(angle) * 1.8 + Math.sin(angle) * side, .5, group.position.z - Math.sin(angle) * 1.8 - Math.cos(angle) * side, side > 0 ? 0xebffff : 0x6effeb, -Math.cos(angle) * 4, .2, -Math.sin(angle) * 4, .8, .5);
          previous = { x: group.position.x, z: group.position.z };
        }
      }
    });
  }

  barrier(entityId, entity, x, z, duration) {
    const fx = this.fx, group = this.group('barrier', 'shell', entityId, x, z);
    const shell = fx.mesh(group, 'shield-sphere', 0xffd363, .2);
    shell.position.y = 2.2; shell.scale.set(3.5, 4, 3.5);
    const rings = [];
    for (let i = 0; i < 3; i++) {
      const ring = fx.mesh(group, 'ring', i === 0 ? 0xffefbb : 0xffc547, i ? .35 : .7);
      ring.position.y = 2.2; ring.scale.setScalar(3.55); ring.rotation.set(i * Math.PI / 3, i * Math.PI / 3, .2); rings.push(ring);
    }
    const floor = this.flat(group, 0xffd15d, 3, 0, .6);
    fx.add(group, Math.min(6, duration), (_, t) => {
      this.follow(group, entityId, entity);
      rings.forEach((ring, i) => { ring.rotation.y = t * Math.PI * 1.8 + i * Math.PI / 3; });
      const pulse = 1 + Math.sin(t * 22) * .04; shell.scale.set(3.5 * pulse, 4 * pulse, 3.5 * pulse);
      floor.scale.setScalar(3 + Math.sin(t * 16) * .18);
    });
    fx.burst(x, 2, z, 0xffe593, 28, 5, .6);
  }

  exhaust(entityId, entity, x, z, duration) {
    const fx = this.fx, group = this.group('exhaust', 'shackles', entityId, x, z);
    this.flat(group, 0x935eff, 3.8, 0, .65);
    const collars = [this.flat(group, 0xd4a5ff, 2.5, .8, .8), this.flat(group, 0xa178ff, 1.9, 2, .65)];
    for (let arm = 0; arm < 3; arm++) {
      const angle = arm * Math.PI * 2 / 3;
      for (let i = 0; i < 6; i++) {
        const distance = 2 + i * .38, link = fx.mesh(group, 'chain-link', 0xb18bff, .8);
        link.position.set(Math.cos(angle) * distance, 1.5 - i * .21, Math.sin(angle) * distance);
        link.scale.setScalar(.27); link.rotation.set(i % 2 * Math.PI / 2, angle, Math.PI / 4);
      }
    }
    const weight = fx.mesh(group, 'crystal', 0xf1d8ff, .75);
    weight.position.y = 5; weight.scale.set(.6, 1.1, .6);
    fx.add(group, Math.min(8, duration), (_, t) => {
      this.follow(group, entityId, entity);
      collars.forEach((ring, i) => { ring.rotation.z = (i ? -1 : 1) * t * Math.PI; });
      weight.position.y = 4.8 + Math.sin(t * 15) * .3;
    });
  }

  cleanse(entityId, entity, x, z) {
    const fx = this.fx, group = this.group('cleanse', 'purge', entityId, x, z);
    const shell = fx.mesh(group, 'shield-sphere', 0xceffff, .32); shell.position.y = 2;
    const rings = [this.flat(group, 0xecffff, 1.5, .4, .9), this.flat(group, 0x77ddff, 1.4, 2, .55)];
    fx.add(group, .75, (_, t) => {
      this.follow(group, entityId, entity);
      shell.scale.setScalar(1.2 + t * 4); rings.forEach((ring, i) => { ring.scale.setScalar(1.4 + t * (i ? 6 : 8)); ring.position.y = i * 2 + t; });
    });
    fx.burst(x, 2.5, z, 0xe6ffff, 65, 14, .7);
    fx.burst(x, 1, z, 0x6adeff, 30, 11, .85);
  }

  teleportCircle(event, entity, x, z, destination) {
    const fx = this.fx, group = this.group('teleport', destination ? 'destination' : 'channel', event.source, x, z);
    const outer = this.flat(group, destination ? 0xbc9aff : 0x88dcff, destination ? 5 : 3.5, 0, .8);
    const inner = this.flat(group, 0xffdc92, destination ? 3.6 : 2.5, .1, .6, 'arc');
    for (let i = 0; i < 10; i++) {
      const a = i * Math.PI / 5, glyph = fx.mesh(group, 'box', 0xdce5ff, .75);
      glyph.position.set(Math.cos(a) * (destination ? 4.3 : 3), .05, Math.sin(a) * (destination ? 4.3 : 3));
      glyph.scale.set(.22, .06, .55); glyph.rotation.y = -a;
    }
    const column = fx.mesh(group, 'cylinder', destination ? 0xb194ff : 0x90d9ff, .13);
    column.scale.set(destination ? 2 : 1.5, 20, destination ? 2 : 1.5); column.position.y = 10;
    let emission = 0;
    const effect = fx.add(group, Math.min(10, event.duration || 4) + .2, (_, t, dt) => {
      if (destination) this.follow(group, event.target, entity);
      else this.follow(group, event.source, entity);
      outer.rotation.z = t * Math.PI * 3; inner.rotation.z = -t * Math.PI * 5;
      inner.position.y = .1 + Math.sin(t * Math.PI) * 1.6;
      column.scale.x = column.scale.z = (destination ? 2 : 1.5) * (.8 + t * .3);
      if (dt && group.visible) { emission += dt; if (emission >= .09) { emission %= .09; const a = t * 24; fx.particle(group.position.x + Math.cos(a) * 2.5, .5, group.position.z + Math.sin(a) * 2.5, destination ? 0xd1b6ff : 0xaff4ff, 0, 6 + t * 7, 0, .75, .7); } }
    });
    return effect;
  }

  teleportChannel(event, source, target) {
    this.stopChannel(event.source);
    // Register after adding both circles: pool eviction can remove earlier groups
    // during add(), so an empty in-progress entry must not be mistaken for an expiry.
    const effects = [
      this.teleportCircle(event, source, event.x ?? source?.x ?? 0, event.z ?? source?.z ?? 0, false),
      this.teleportCircle(event, target, event.toX ?? target?.x ?? 0, event.toZ ?? target?.z ?? 0, true),
    ].filter(effect => this.fx.effects.includes(effect));
    if (effects.length) this.channels.set(event.source, new Set(effects));
  }

  teleportArrival(event, source, x, z) {
    const fx = this.fx, group = this.group('teleport', 'arrival', event.source, x, z);
    const circle = this.flat(group, 0xc5adff, 5, 0, .9);
    const inner = this.flat(group, 0xffe6a8, 3.5, .1, .75);
    this.segment(group, V(0, .4, 0), V(0, 22, 0), 0xbfaaff, 1.1, .3);
    this.segment(group, V(0, .4, 0), V(0, 22, 0), 0xf1efff, .28, .9);
    fx.add(group, 1.1, (_, t) => { circle.scale.setScalar(4 + t * 3); inner.scale.setScalar(3 + t * 2); group.scale.y = 1 - t * .8; });
    fx.burst(x, .5, z, 0xccb3ff, 70, 13, .9, 6);
    fx.burst(x, 2.5, z, 0xfff1c9, 25, 9, .65);
  }

  smite(entityId, x, z) {
    const fx = this.fx, group = this.group('smite', 'strike', entityId, x, z);
    const vertices = [V(.8, 25, 0), V(-1, 18, .25), V(.8, 12, -.15), V(-.5, 6, .25), V(0, .5, 0)];
    for (let i = 1; i < vertices.length; i++) {
      this.segment(group, vertices[i - 1], vertices[i], 0x78cfff, .65, .35);
      this.segment(group, vertices[i - 1], vertices[i], 0xffe593, .18, .96);
    }
    const ground = this.flat(group, 0xffd36e, 3.4, .1, .85);
    fx.add(group, .7, (_, t) => { group.scale.y = .8 + Math.min(1, t * 6) * .2; ground.scale.setScalar(2.4 + t * 5); });
    fx.burst(x, .5, z, 0x8bddff, 42, 14, .7, 9);
    fx.burst(x, 1, z, 0xffe8a8, 35, 10, .65);
  }

  clarity(entityId, entity, x, z) {
    const fx = this.fx, group = this.group('clarity', 'flow', entityId, x, z);
    const rings = [];
    for (let i = 0; i < 3; i++) rings.push(this.flat(group, i === 1 ? 0xdbfcff : 0x64bcff, 4 - i * .8, .2 + i * 1.1, .65, i ? 'arc' : 'ring'));
    const core = fx.mesh(group, 'crystal', 0xd2edff, .8); core.position.y = 3.8; core.scale.set(.45, .8, .45);
    fx.add(group, 1.5, (_, t) => { this.follow(group, entityId, entity); rings.forEach((ring, i) => { ring.scale.setScalar((4 - i * .8) * (1 - t * .7)); ring.rotation.z = t * 5 * (i % 2 ? -1 : 1); ring.position.y = .2 + i + t * 1.5; }); core.rotation.y = t * 6; });
    for (let i = 0; i < 50; i++) {
      const a = i * 2.39996, r = 3 + Math.random() * 3, life = .6 + Math.random() * .45;
      fx.particle(x + Math.cos(a) * r, .6 + Math.random(), z + Math.sin(a) * r, i % 3 ? 0x79c8ff : 0xdcffff, -Math.cos(a) * r / life, 2, -Math.sin(a) * r / life, .6, life);
    }
  }

  ignite(event, entity, x, z) {
    const fx = this.fx, group = this.group('ignite', 'flame', event.target, x, z);
    this.flat(group, 0xff7a36, 2.5, 0, .55);
    const flames = [];
    for (let i = 0; i < 6; i++) {
      const flame = fx.mesh(group, 'crystal', i % 2 ? 0xffd975 : 0xff793d, .62), a = i * Math.PI / 3;
      flame.position.set(Math.cos(a) * 1.7, 1.4, Math.sin(a) * 1.7); flame.scale.set(.35, 1.1, .35); flames.push(flame);
    }
    fx.add(group, 1.1, (_, t) => { this.follow(group, event.target, entity); flames.forEach((flame, i) => { flame.position.y = 1.2 + Math.sin(t * 18 + i) * .7 + t; flame.scale.y = .7 + Math.abs(Math.sin(t * 15 + i)) * .7; }); });
    fx.burst(x, .5, z, 0xff843b, 42, 6, .85); fx.burst(x, 1.5, z, 0xffe28c, 18, 4, .65);
  }
}
