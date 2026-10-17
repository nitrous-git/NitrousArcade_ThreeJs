// Exact continuous circle-versus-convex-polygon sweep: offset faces + rounded vertices.
// Vertices must be counterclockwise. All quantities are in logical world units.
const EPS = 1e-8;
export function rectangle(x, y, width, height, angle = 0) {
  const c = Math.cos(angle), s = Math.sin(angle);
  return [[-width / 2, -height / 2], [width / 2, -height / 2],
    [width / 2, height / 2], [-width / 2, height / 2]]
    .map(([dx, dy]) => ({ x: x + dx * c - dy * s, y: y + dx * s + dy * c }));
}
export function regularPolygon(x, y, radius, sides = 6, angle = 0) {
  return Array.from({ length: sides }, (_, i) => ({
    x: x + radius * Math.cos(angle + i * Math.PI * 2 / sides),
    y: y + radius * Math.sin(angle + i * Math.PI * 2 / sides),
  }));
}
export function bounds(vertices) {
  return { minX: Math.min(...vertices.map(v => v.x)), maxX: Math.max(...vertices.map(v => v.x)),
    minY: Math.min(...vertices.map(v => v.y)), maxY: Math.max(...vertices.map(v => v.y)) };
}
export function circleTouchesPolygon(x, y, radius, vertices) {
  let inside = true, distance2 = Infinity;
  for (let i = 0; i < vertices.length; i++) {
    const a = vertices[i], b = vertices[(i + 1) % vertices.length];
    const dx = b.x - a.x, dy = b.y - a.y;
    if (dx * (y - a.y) - dy * (x - a.x) < 0) inside = false;
    const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / (dx * dx + dy * dy)));
    distance2 = Math.min(distance2, (x - a.x - dx * t) ** 2 + (y - a.y - dy * t) ** 2);
  }
  return inside || distance2 <= radius * radius;
}
export function sweepCircle(x, y, vx, vy, radius, vertices, maxTime) {
  let hit = null;
  const consider = (t, nx, ny) => {
    if (t >= -EPS && t <= maxTime + EPS && vx * nx + vy * ny < -EPS && (!hit || t < hit.t)) {
      hit = { t: Math.max(0, t), nx, ny };
    }
  };
  const speed2 = vx * vx + vy * vy;
  if (speed2 < EPS) return null;
  for (let i = 0; i < vertices.length; i++) {
    const a = vertices[i], b = vertices[(i + 1) % vertices.length];
    const dx = b.x - a.x, dy = b.y - a.y, length = Math.hypot(dx, dy);
    const nx = dy / length, ny = -dx / length;
    const distance = (x - a.x) * nx + (y - a.y) * ny;
    const approach = vx * nx + vy * ny;
    if (approach < -EPS) {
      const t = (radius - distance) / approach;
      const along = ((x + vx * t - a.x) * dx + (y + vy * t - a.y) * dy) / (length * length);
      if (along >= -EPS && along <= 1 + EPS) consider(t, nx, ny);
    }
    const ox = x - a.x, oy = y - a.y;
    const q = ox * vx + oy * vy, c = ox * ox + oy * oy - radius * radius;
    const discriminant = q * q - speed2 * c;
    if (discriminant >= 0) {
      const t = (-q - Math.sqrt(discriminant)) / speed2;
      const cx = ox + vx * t, cy = oy + vy * t, len = Math.hypot(cx, cy);
      if (len > EPS) consider(t, cx / len, cy / len);
    }
  }
  return hit;
}
export function sweptBoundsOverlap(ball, box, dt, radius) {
  const x = ball.x + ball.vx * dt, y = ball.y + ball.vy * dt;
  return Math.max(ball.x, x) + radius >= box.minX && Math.min(ball.x, x) - radius <= box.maxX
    && Math.max(ball.y, y) + radius >= box.minY && Math.min(ball.y, y) - radius <= box.maxY;
}
