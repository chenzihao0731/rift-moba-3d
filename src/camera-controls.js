// Use viewport pixels, so camera movement feels the same at every zoom level.
export const CAMERA_PITCH_SINE = 110 / Math.hypot(110, 86);

export function cameraDrag(origin, dx, dy, zoom, viewportHeight) {
  const unitsPerPixel = zoom / viewportHeight;
  return {
    x: origin.x - dx * unitsPerPixel,
    z: origin.z - dy * unitsPerPixel / CAMERA_PITCH_SINE,
  };
}

export function cameraPan(pointer, viewport, keys, zoom, dt) {
  const margin = Math.max(24, Math.min(40, viewport.width * .025));
  const horizontal = keys.has('ARROWRIGHT') ? 1 : keys.has('ARROWLEFT') ? -1
    : pointer.inside && pointer.x > viewport.width - margin ? 1
    : pointer.inside && pointer.x < margin ? -1 : 0;
  const vertical = keys.has('ARROWDOWN') ? 1 : keys.has('ARROWUP') ? -1
    : pointer.inside && pointer.y > viewport.height - margin ? 1
    : pointer.inside && pointer.y < margin ? -1 : 0;
  const diagonal = horizontal && vertical ? Math.SQRT1_2 : 1;
  // 1.65 viewport heights per second: responsive without a delayed easing ramp.
  const step = zoom * 1.65 * dt * diagonal;
  return { x: horizontal * step, z: vertical * step / CAMERA_PITCH_SINE };
}
