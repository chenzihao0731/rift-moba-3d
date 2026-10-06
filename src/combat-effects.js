import * as THREE from 'three';

// One bounded particle batch, plus short lived groups built from shared geometry.
// Only materials belonging to a temporary group are disposed when it expires.
export class CombatEffects {
  constructor(scene, { maxParticles = 2200, maxEffects = 64 } = {}) {
    this.scene = scene;
    this.maxParticles = maxParticles;
    this.maxEffects = maxEffects;
    this.effects = [];
    this.particles = Array(maxParticles).fill(null);
    this.nextParticle = 0;
    this.geometries = new Map([
      ['ring', new THREE.RingGeometry(.93, 1, 56)],
      ['arc', new THREE.RingGeometry(.8, 1, 36, 1, 0, Math.PI * 1.35)],
      ['sphere', new THREE.SphereGeometry(1, 10, 8)],
      ['cylinder', new THREE.CylinderGeometry(1, 1, 1, 10, 1, true)],
      ['box', new THREE.BoxGeometry(1, 1, 1)],
      ['crystal', new THREE.OctahedronGeometry(1)],
    ]);
    const thrustGeometry = new THREE.BufferGeometry();
    thrustGeometry.setAttribute('position', new THREE.Float32BufferAttribute([
      -.08, 0, 0, -.5, 0, .16, 0, 0, 1, .5, 0, .16, .08, 0, 0,
    ], 3));
    thrustGeometry.setIndex([0, 1, 2, 0, 2, 4, 4, 2, 3]);
    thrustGeometry.computeVertexNormals();
    this.geometries.set('thrust', thrustGeometry);
    this.positions = new Float32Array(maxParticles * 3);
    this.colors = new Float32Array(maxParticles * 3);
    this.sizes = new Float32Array(maxParticles);
    this.alphas = new Float32Array(maxParticles);
    this.particleGeometry = new THREE.BufferGeometry();
    for (const [key, value, size] of [['position', this.positions, 3], ['color', this.colors, 3], ['size', this.sizes, 1], ['alpha', this.alphas, 1]]) {
      this.particleGeometry.setAttribute(key, new THREE.BufferAttribute(value, size).setUsage(THREE.DynamicDrawUsage));
    }
    this.particleMaterial = new THREE.ShaderMaterial({
      uniforms: { pointScale: { value: 6 } },
      vertexShader: `attribute float size; attribute float alpha; attribute vec3 color;
        varying vec3 vColor; varying float vAlpha; uniform float pointScale;
        void main(){vColor=color;vAlpha=alpha;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);gl_PointSize=clamp(size*pointScale,1.0,40.0);}`,
      fragmentShader: `varying vec3 vColor; varying float vAlpha;
        void main(){float r=length(gl_PointCoord-vec2(.5))*2.0;if(r>1.0)discard;
        float glow=pow(1.0-r,1.7);gl_FragColor=vec4(vColor,glow*vAlpha);}`,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    this.points = new THREE.Points(this.particleGeometry, this.particleMaterial);
    this.points.name = 'combat-particle-batch';
    this.points.frustumCulled = false;
    this.points.renderOrder = 4;
    this.particleGeometry.setDrawRange(0, 0);
    scene.add(this.points);
    this.color = new THREE.Color();
  }

  mesh(group, shape, color, opacity = .8) {
    const material = new THREE.MeshBasicMaterial({ color, opacity, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
    const mesh = new THREE.Mesh(this.geometries.get(shape), material);
    mesh.userData.opacity = opacity;
    mesh.renderOrder = 3;
    group.add(mesh);
    return mesh;
  }

  add(group, duration, animate) {
    if (this.effects.length >= this.maxEffects) this.remove(this.effects.shift());
    const effect = { group, age: 0, duration, animate };
    this.scene.add(group);
    this.effects.push(effect);
    animate?.(group, 0, 0);
    return effect;
  }

  remove(effect) {
    this.scene.remove(effect.group);
    effect.group.traverse(object => { if (object.isMesh) object.material.dispose(); });
  }

  ring(x, z, color, radius = 2, duration = .65) {
    const group = new THREE.Group();
    group.position.set(x, .28, z);
    const ring = this.mesh(group, 'ring', color, .88);
    ring.rotation.x = -Math.PI / 2;
    const echo = this.mesh(group, 'ring', color, .36);
    echo.rotation.x = -Math.PI / 2;
    echo.position.y = .045;
    this.add(group, duration, (_, t) => {
      ring.scale.setScalar(radius * (.65 + t * 1.4));
      echo.scale.setScalar(radius * (.25 + t * 1.4));
    });
  }

  rune(x, z, color, radius = 5, duration = .8) {
    const group = new THREE.Group();
    group.position.set(x, .3, z);
    for (const r of [1, .77]) {
      const ring = this.mesh(group, 'ring', color, r === 1 ? .85 : .4);
      ring.rotation.x = -Math.PI / 2;
      ring.scale.setScalar(radius * r);
    }
    for (let i = 0; i < 8; i++) {
      const angle = i * Math.PI / 4;
      const rune = this.mesh(group, 'box', color, .78);
      rune.position.set(Math.sin(angle) * radius * .88, 0, Math.cos(angle) * radius * .88);
      rune.scale.set(.16, .055, radius * .18);
      rune.rotation.y = angle + Math.PI / 4;
    }
    this.add(group, duration, (_, t) => { group.rotation.y = t * .65; group.scale.setScalar(.85 + Math.sin(t * Math.PI) * .18); });
  }

  beam(from, to, color, radius = .3, duration = .55, layers = false) {
    const delta = to.clone().sub(from), length = delta.length();
    if (length < .01) return;
    const group = new THREE.Group();
    group.position.copy(from).addScaledVector(delta, .5);
    group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
    const profiles = layers ? [[radius * 2.8, color, .15], [radius * 1.6, color, .4], [radius, color, .75], [radius * .3, 0xfffbee, .98]] : [[radius, color, .85]];
    for (const [r, tint, opacity] of profiles) {
      const beam = this.mesh(group, 'cylinder', tint, opacity);
      beam.scale.set(r, length, r);
    }
    this.add(group, duration, (_, t) => { group.scale.set(1 + Math.sin(t * Math.PI) * .15, 1, 1 + Math.sin(t * Math.PI) * .15); });
    if (layers) this.lineBurst(from, to, color, 48, 1.2, .8);
  }

  slash(x, z, color, radius = 4, angle = 0, duration = .35) {
    const group = new THREE.Group();
    group.position.set(x, 1.35, z);
    group.rotation.y = angle;
    for (let i = 0; i < 3; i++) {
      const arc = this.mesh(group, 'arc', i === 0 ? 0xfff4d3 : color, .7 - i * .2);
      arc.rotation.x = -Math.PI / 2 + i * .12;
      arc.scale.setScalar(radius * (1 - i * .1));
      arc.position.y = i * .15;
    }
    this.add(group, duration, (_, t) => { group.rotation.y = angle - t * Math.PI * 1.4; group.scale.setScalar(.7 + t * .6); });
    this.burst(x, 1.2, z, color, 14, 5, .45);
  }

  thrust(from, to, color = 0xa2f4e7, width = .8, duration = .32) {
    const dx = to.x - from.x, dz = to.z - from.z, length = Math.hypot(dx, dz);
    if (length < .01) return;
    const group = new THREE.Group();
    group.name = 'yasuo-q-thrust';
    group.userData.shape = 'thrust';
    group.userData.from = { x: from.x, z: from.z };
    group.userData.to = { x: to.x, z: to.z };
    group.position.copy(from);
    group.rotation.y = Math.atan2(dx, dz);
    for (const [w, tint, opacity] of [[width, color, .48], [width * .3, 0xf1fff8, .95]]) {
      const blade = this.mesh(group, 'thrust', tint, opacity);
      blade.scale.set(w, 1, length);
    }
    const upright = this.mesh(group, 'thrust', color, .3);
    upright.rotation.z = Math.PI / 2;
    upright.scale.set(width * .35, 1, length);
    this.add(group, duration, (_, t) => {
      // This trace starts at the sword hand and only extends toward the aimed point.
      group.scale.z = Math.min(1, .16 + t / .28);
    });
    this.lineBurst(from, to, color, 18, .1, duration * .85);
  }

  swordSpin(x, z, color = 0xa2f4e7, radius = 9, knockup = false) {
    const group = new THREE.Group();
    group.name = knockup ? 'yasuo-eq3-spin' : 'yasuo-eq-spin';
    group.userData.shape = knockup ? 'spin-knockup' : 'spin';
    group.position.set(x, 1.3, z);
    for (let i = 0; i < 2; i++) {
      const arc = this.mesh(group, 'arc', i ? color : 0xeafff5, i ? .45 : .85);
      arc.rotation.x = -Math.PI / 2;
      arc.rotation.z = i * Math.PI;
      arc.scale.setScalar(radius);
      arc.position.y = i * .18;
    }
    const perimeter = this.mesh(group, 'ring', color, .42);
    perimeter.rotation.x = -Math.PI / 2;
    perimeter.scale.setScalar(radius);
    perimeter.position.y = -.9;
    if (knockup) {
      for (let i = 0; i < 3; i++) {
        const wind = this.mesh(group, 'arc', 0xaaf8ff, .35 - i * .07);
        wind.rotation.x = -Math.PI / 2 + .13;
        wind.rotation.z = i * Math.PI / 2;
        wind.scale.setScalar(radius * (1 - i * .17));
        wind.position.y = .8 + i * 1.2;
      }
    }
    this.add(group, knockup ? .72 : .5, (_, t) => {
      group.rotation.y = t * Math.PI * 2;
      group.scale.setScalar(.75 + Math.min(1, t * 4) * .25);
      if (knockup) group.position.y = 1.3 + t * 1.8;
    });
    for (let i = 0; i < (knockup ? 40 : 22); i++) {
      const angle = i * 2.39996, r = radius * (.78 + Math.random() * .2);
      this.particle(x + Math.sin(angle) * r, .7, z + Math.cos(angle) * r, color, Math.cos(angle) * 2, knockup ? 4 + Math.random() * 4 : .5, -Math.sin(angle) * 2, .55, knockup ? .75 : .45);
    }
  }

  crystals(x, z, color, radius = 5, duration = .85) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    for (let i = 0; i < 9; i++) {
      const angle = i * 2.39996, r = radius * (.4 + (i % 3) * .2);
      const crystal = this.mesh(group, 'crystal', i % 3 === 0 ? 0xf4ffff : color, .8);
      crystal.position.set(Math.cos(angle) * r, .8, Math.sin(angle) * r);
      crystal.scale.set(.5, 1.5 + (i % 3) * .65, .5);
      crystal.rotation.z = Math.sin(angle) * .3;
    }
    this.add(group, duration, (_, t) => { group.position.y = Math.sin(t * Math.PI) * 1.2; group.scale.setScalar(.6 + Math.sin(t * Math.PI) * .4); });
    this.ring(x, z, color, radius, duration);
    this.burst(x, 1.5, z, color, 55, 11, duration);
  }

  bolt(from, to, color, size = .4, duration = .3) {
    const group = new THREE.Group(), orb = this.mesh(group, 'sphere', color, .9);
    orb.scale.setScalar(size);
    this.add(group, duration, (_, t) => group.position.lerpVectors(from, to, t));
  }

  particle(x, y, z, color, vx, vy, vz, size = .6, life = .6, gravity = 0) {
    this.color.set(color);
    this.particles[this.nextParticle] = { x, y, z, vx, vy, vz, size, life, age: 0, gravity, r: this.color.r, g: this.color.g, b: this.color.b };
    this.nextParticle = (this.nextParticle + 1) % this.maxParticles;
  }

  burst(x, y, z, color, count = 24, speed = 7, life = .65, gravity = 0) {
    for (let i = 0; i < Math.min(count, 100); i++) {
      const angle = Math.random() * Math.PI * 2, incline = Math.random() * .8 + .2, velocity = speed * (.3 + Math.random() * .7);
      this.particle(x, y, z, color, Math.cos(angle) * velocity, incline * velocity, Math.sin(angle) * velocity, .3 + Math.random() * .65, life * (.6 + Math.random() * .4), gravity);
    }
  }

  lineBurst(from, to, color, count = 28, spread = .7, life = .6) {
    for (let i = 0; i < Math.min(count, 70); i++) {
      const t = i / Math.max(1, count - 1);
      this.particle(THREE.MathUtils.lerp(from.x, to.x, t), THREE.MathUtils.lerp(from.y, to.y, t), THREE.MathUtils.lerp(from.z, to.z, t), color, (Math.random() - .5) * spread * 6, Math.random() * spread * 5, (Math.random() - .5) * spread * 6, .4 + Math.random() * .6, life);
    }
  }

  trail(x, y, z, color, size = .6, count = 3, life = .4) {
    for (let i = 0; i < count; i++) this.particle(x + (Math.random() - .5) * size, y + (Math.random() - .5) * size, z + (Math.random() - .5) * size, color, (Math.random() - .5) * .9, .6, (Math.random() - .5) * .9, size * (.55 + Math.random() * .6), life);
  }

  update(dt, camera, height) {
    if (dt > 0) {
      for (let i = this.effects.length - 1; i >= 0; i--) {
        const effect = this.effects[i];
        effect.age += dt;
        if (effect.age >= effect.duration) { this.remove(effect); this.effects.splice(i, 1); continue; }
        const t = effect.age / effect.duration;
        effect.animate?.(effect.group, t, dt);
        effect.group.traverse(object => { if (object.isMesh) object.material.opacity = object.userData.opacity * Math.pow(1 - t, .7); });
      }
    }
    let count = 0;
    for (let i = 0; i < this.maxParticles; i++) {
      const particle = this.particles[i];
      if (!particle) continue;
      particle.age += dt;
      if (particle.age >= particle.life) { this.particles[i] = null; continue; }
      particle.x += particle.vx * dt; particle.y += particle.vy * dt; particle.z += particle.vz * dt; particle.vy -= particle.gravity * dt;
      this.positions[count * 3] = particle.x; this.positions[count * 3 + 1] = particle.y; this.positions[count * 3 + 2] = particle.z;
      this.colors[count * 3] = particle.r; this.colors[count * 3 + 1] = particle.g; this.colors[count * 3 + 2] = particle.b;
      this.sizes[count] = particle.size * (1 - particle.age / particle.life * .55);
      this.alphas[count] = Math.pow(1 - particle.age / particle.life, .7);
      count++;
    }
    this.particleCount = count;
    this.particleGeometry.setDrawRange(0, count);
    for (const attribute of Object.values(this.particleGeometry.attributes)) attribute.needsUpdate = true;
    this.particleMaterial.uniforms.pointScale.value = height / Math.max(1, camera.top - camera.bottom);
  }

  clear() {
    this.effects.forEach(effect => this.remove(effect));
    this.effects.length = 0;
    this.particles.fill(null);
    this.particleCount = 0;
    this.particleGeometry.setDrawRange(0, 0);
  }

  get stats() { return { effects: this.effects.length, effectLimit: this.maxEffects, particles: this.particleCount || 0, particleLimit: this.maxParticles, particleBatches: 1 }; }
}
