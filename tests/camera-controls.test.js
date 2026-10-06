import test from 'node:test';
import assert from 'node:assert/strict';
import { cameraDrag, cameraPan, CAMERA_PITCH_SINE } from '../src/camera-controls.js';

test('camera drag keeps the grabbed ground point at the same screen pixel', () => {
  const origin = { x: -25, z: 40 };
  for (const zoom of [35, 63, 115]) {
    const result = cameraDrag(origin, 140, -90, zoom, 900);
    assert.ok(Math.abs((origin.x - result.x) * 900 / zoom - 140) < 1e-9);
    assert.ok(Math.abs((origin.z - result.z) * CAMERA_PITCH_SINE * 900 / zoom + 90) < 1e-9);
  }
});

test('edge camera panning starts within the expanded border and scales with elapsed time', () => {
  const pointer = { x: 1410, y: 450, inside: true }, viewport = { width: 1440, height: 900 };
  const single = cameraPan(pointer, viewport, new Set(), 63, .1);
  assert.ok(single.x > 10);
  assert.equal(single.z, 0);
  const split = cameraPan(pointer, viewport, new Set(), 63, .05);
  assert.equal(single.x, split.x * 2);
});

test('arrow camera panning works without a pointer on the canvas and diagonal speed is normalized', () => {
  const pointer = { x: 500, y: 450, inside: false }, viewport = { width: 1440, height: 900 };
  const idle = cameraPan(pointer, viewport, new Set(), 63, .1);
  assert.deepEqual(idle, { x: 0, z: 0 });
  const diagonal = cameraPan(pointer, viewport, new Set(['ARROWRIGHT', 'ARROWUP']), 63, .1);
  assert.ok(diagonal.x > 0 && diagonal.z < 0);
  assert.ok(Math.abs(Math.hypot(diagonal.x, diagonal.z * CAMERA_PITCH_SINE) - 63 * 1.65 * .1) < 1e-9);
});
