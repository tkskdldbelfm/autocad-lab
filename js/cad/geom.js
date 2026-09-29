// CAD 연습장: 2D 기하 계산. 엔티티는 평범한 객체이고, 모든 계산은 "기본 조각(seg)"으로 한다.
// seg: { k:'L', a, b } | { k:'A', c, r, a0, sw, rev } (sw>0 반시계, rev=진행 방향이 시계) | { k:'C', c, r }
window.ACAD = window.ACAD || {};
(function () {
  const G = (ACAD.G = {});
  const TAU = Math.PI * 2;
  G.TAU = TAU;
  G.TOL = 1e-6;

  // ---------- 벡터 ----------
  G.v = (x, y) => ({ x, y });
  G.add = (a, b) => ({ x: a.x + b.x, y: a.y + b.y });
  G.sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y });
  G.mul = (a, k) => ({ x: a.x * k, y: a.y * k });
  G.dot = (a, b) => a.x * b.x + a.y * b.y;
  G.cross = (a, b) => a.x * b.y - a.y * b.x;
  G.len = (a) => Math.hypot(a.x, a.y);
  G.dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  G.ang = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);
  G.polar = (p, a, d) => ({ x: p.x + Math.cos(a) * d, y: p.y + Math.sin(a) * d });
  G.unit = (a) => { const l = Math.hypot(a.x, a.y) || 1; return { x: a.x / l, y: a.y / l }; };
  G.lerp = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
  G.mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  G.perp = (a) => ({ x: -a.y, y: a.x });
  G.rot = (p, c, a) => {
    const s = Math.sin(a), co = Math.cos(a), dx = p.x - c.x, dy = p.y - c.y;
    return { x: c.x + dx * co - dy * s, y: c.y + dx * s + dy * co };
  };
  G.eq = (a, b, tol = G.TOL) => Math.abs(a.x - b.x) <= tol && Math.abs(a.y - b.y) <= tol;
  G.nang = (a) => { a %= TAU; if (a < 0) a += TAU; return a; };
  G.deg = (r) => (r * 180) / Math.PI;
  G.rad = (d) => (d * Math.PI) / 180;
  G.ccwSweep = (a0, a1) => { let s = G.nang(a1 - a0); if (s < 1e-12) s = TAU; return s; };
  G.angIn = (a, a0, sw, tol = 1e-9) => { const d = G.nang(a - a0); return d <= sw + tol || d >= TAU - tol; };
  G.clone = (o) => JSON.parse(JSON.stringify(o));
  G.fmt = (n, d = 2) => {
    if (!isFinite(n)) return "-";
    const r = Math.round(n * 10 ** d) / 10 ** d;
    return (Object.is(r, -0) ? 0 : r).toFixed(d).replace(/\.?0+$/, "") || "0";
  };
  G.fmtPt = (p, d = 2) => `(${G.fmt(p.x, d)}, ${G.fmt(p.y, d)})`;
  G.fmtAng = (rad) => `${G.fmt(G.deg(G.nang(rad)), 2)}°`;

  // ---------- 볼록(bulge) 호 ----------
  // p→q 조각의 볼록값 b (양수=반시계). 반환: {c, r, a0, sw, rev}
  G.bulgeArc = (p, q, b) => {
    const chord = G.dist(p, q);
    const theta = 4 * Math.atan(b); // 부호 있는 중심각
    const r = chord / (2 * Math.sin(Math.abs(theta) / 2));
    const m = G.mid(p, q);
    const n = G.perp(G.unit(G.sub(q, p)));
    const off = ((chord / 2) * (1 - b * b)) / (2 * b);
    const c = G.add(m, G.mul(n, off));
    if (theta > 0) return { c, r, a0: G.ang(c, p), sw: theta, rev: false };
    return { c, r, a0: G.ang(c, q), sw: -theta, rev: true };
  };
  G.bulgeFromSweep = (sweepSigned) => Math.tan(sweepSigned / 4);

  // ---------- 조각 ----------
  G.arcStart = (s) => G.polar(s.c, s.rev ? s.a0 + s.sw : s.a0, s.r);
  G.arcEnd = (s) => G.polar(s.c, s.rev ? s.a0 : s.a0 + s.sw, s.r);
  G.segStart = (s) => (s.k === "L" ? s.a : s.k === "A" ? G.arcStart(s) : G.polar(s.c, 0, s.r));
  G.segEnd = (s) => (s.k === "L" ? s.b : s.k === "A" ? G.arcEnd(s) : G.polar(s.c, 0, s.r));
  G.segLen = (s) => (s.k === "L" ? G.dist(s.a, s.b) : s.k === "A" ? s.r * s.sw : TAU * s.r);
  // t∈[0,1] 진행 방향 기준 점
  G.segPoint = (s, t) => {
    if (s.k === "L") return G.lerp(s.a, s.b, t);
    if (s.k === "A") return G.polar(s.c, s.rev ? s.a0 + s.sw * (1 - t) : s.a0 + s.sw * t, s.r);
    return G.polar(s.c, TAU * t, s.r);
  };
  G.segTangent = (s, t) => {
    if (s.k === "L") return G.unit(G.sub(s.b, s.a));
    const a = s.k === "A" ? (s.rev ? s.a0 + s.sw * (1 - t) : s.a0 + s.sw * t) : TAU * t;
    const d = { x: -Math.sin(a), y: Math.cos(a) };
    return s.k === "A" && s.rev ? G.mul(d, -1) : d;
  };
  // 가장 가까운 점 {pt, t, d}
  G.segClosest = (s, p) => {
    if (s.k === "L") {
      const d = G.sub(s.b, s.a);
      const L2 = G.dot(d, d);
      let t = L2 ? G.dot(G.sub(p, s.a), d) / L2 : 0;
      t = Math.max(0, Math.min(1, t));
      const pt = G.lerp(s.a, s.b, t);
      return { pt, t, d: G.dist(p, pt) };
    }
    const a = G.ang(s.c, p);
    if (s.k === "C") {
      const pt = G.polar(s.c, a, s.r);
      return { pt, t: G.nang(a) / TAU, d: G.dist(p, pt) };
    }
    if (G.angIn(a, s.a0, s.sw)) {
      const pt = G.polar(s.c, a, s.r);
      let t = G.nang(a - s.a0) / s.sw;
      if (t > 1) t = G.nang(a - s.a0) > Math.PI ? 0 : 1;
      if (s.rev) t = 1 - t;
      return { pt, t, d: G.dist(p, pt) };
    }
    const p0 = G.segStart(s), p1 = G.segEnd(s);
    return G.dist(p, p0) < G.dist(p, p1) ? { pt: p0, t: 0, d: G.dist(p, p0) } : { pt: p1, t: 1, d: G.dist(p, p1) };
  };
  // 점을 조각의 매개변수로 (점이 조각 위에 있다고 가정)
  G.segParam = (s, p) => {
    if (s.k === "L") {
      const d = G.sub(s.b, s.a); const L2 = G.dot(d, d);
      return L2 ? G.dot(G.sub(p, s.a), d) / L2 : 0;
    }
    const a = G.ang(s.c, p);
    if (s.k === "C") return G.nang(a) / TAU;
    let t = G.nang(a - s.a0) / s.sw;
    if (t > 1 + 1e-9) t = G.nang(a - s.a0) > Math.PI + s.sw / 2 ? 0 : 1;
    return s.rev ? 1 - t : t;
  };
  G.segBBox = (s) => {
    if (s.k === "L") return bboxOf([s.a, s.b]);
    if (s.k === "C") return { x0: s.c.x - s.r, y0: s.c.y - s.r, x1: s.c.x + s.r, y1: s.c.y + s.r };
    const pts = [G.arcStart(s), G.arcEnd(s)];
    for (let q = 0; q < 4; q++) { const a = (q * Math.PI) / 2; if (G.angIn(a, s.a0, s.sw)) pts.push(G.polar(s.c, a, s.r)); }
    return bboxOf(pts);
  };
  function bboxOf(pts) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const p of pts) { if (p.x < x0) x0 = p.x; if (p.y < y0) y0 = p.y; if (p.x > x1) x1 = p.x; if (p.y > y1) y1 = p.y; }
    return { x0, y0, x1, y1 };
  }
  G.bboxOf = bboxOf;
  G.bboxUnion = (a, b) => (!a ? b : !b ? a : { x0: Math.min(a.x0, b.x0), y0: Math.min(a.y0, b.y0), x1: Math.max(a.x1, b.x1), y1: Math.max(a.y1, b.y1) });
  G.bboxInside = (b, r) => b.x0 >= r.x0 - 1e-9 && b.y0 >= r.y0 - 1e-9 && b.x1 <= r.x1 + 1e-9 && b.y1 <= r.y1 + 1e-9;
  G.ptInRect = (p, r) => p.x >= r.x0 && p.x <= r.x1 && p.y >= r.y0 && p.y <= r.y1;
  G.rectOf = (a, b) => ({ x0: Math.min(a.x, b.x), y0: Math.min(a.y, b.y), x1: Math.max(a.x, b.x), y1: Math.max(a.y, b.y) });

  // ---------- 교차 ----------
  // 무한선 여부: ea/eb true면 선을 무한 연장으로 본다. 호/원은 eArc true면 전체 원으로 본다.
  G.intersect = (s1, s2, ext1 = false, ext2 = false) => {
    if (s1.k === "L" && s2.k === "L") return interLL(s1, s2, ext1, ext2);
    if (s1.k === "L") return interLC(s1, s2, ext1, ext2);
    if (s2.k === "L") return interLC(s2, s1, ext2, ext1);
    return interCC(s1, s2, ext1, ext2);
  };
  function interLL(l1, l2, e1, e2) {
    const r = G.sub(l1.b, l1.a), s = G.sub(l2.b, l2.a);
    const den = G.cross(r, s);
    if (Math.abs(den) < 1e-12 * (G.len(r) * G.len(s) || 1)) return [];
    const qp = G.sub(l2.a, l1.a);
    const t = G.cross(qp, s) / den, u = G.cross(qp, r) / den;
    const tol = 1e-9;
    if (!e1 && (t < -tol || t > 1 + tol)) return [];
    if (!e2 && (u < -tol || u > 1 + tol)) return [];
    return [G.lerp(l1.a, l1.b, t)];
  }
  function onArc(s, p, full) { return s.k === "C" || full || G.angIn(G.ang(s.c, p), s.a0, s.sw, 1e-7); }
  function interLC(l, c, eL, eC) {
    const d = G.sub(l.b, l.a), f = G.sub(l.a, c.c);
    const A = G.dot(d, d), B = 2 * G.dot(f, d), C = G.dot(f, f) - c.r * c.r;
    let disc = B * B - 4 * A * C;
    if (A < 1e-18) return [];
    if (disc < -1e-9 * A * c.r * c.r) return [];
    disc = Math.max(0, disc);
    const sq = Math.sqrt(disc);
    const ts = disc < 1e-14 * A ? [-B / (2 * A)] : [(-B - sq) / (2 * A), (-B + sq) / (2 * A)];
    const out = [];
    for (const t of ts) {
      if (!eL && (t < -1e-9 || t > 1 + 1e-9)) continue;
      const p = G.lerp(l.a, l.b, t);
      if (onArc(c, p, eC)) out.push(p);
    }
    return out;
  }
  function interCC(a, b, eA, eB) {
    const d = G.dist(a.c, b.c);
    if (d < 1e-12) return [];
    if (d > a.r + b.r + 1e-9 || d < Math.abs(a.r - b.r) - 1e-9) return [];
    const x = (d * d + a.r * a.r - b.r * b.r) / (2 * d);
    const h2 = a.r * a.r - x * x;
    const h = h2 > 0 ? Math.sqrt(h2) : 0;
    const u = G.unit(G.sub(b.c, a.c));
    const base = G.add(a.c, G.mul(u, x));
    const pts = h < 1e-9 ? [base] : [G.add(base, G.mul(G.perp(u), h)), G.sub(base, G.mul(G.perp(u), h))];
    return pts.filter((p) => onArc(a, p, eA) && onArc(b, p, eB));
  }

  // ---------- 엔티티 → 조각 ----------
  G.plineSegs = (e) => {
    const out = [];
    const n = e.pts.length;
    const m = e.closed ? n : n - 1;
    for (let i = 0; i < m; i++) {
      const p = e.pts[i], q = e.pts[(i + 1) % n];
      const b = p.b || 0;
      if (Math.abs(b) < 1e-9 || G.dist(p, q) < 1e-12) out.push({ k: "L", a: { x: p.x, y: p.y }, b: { x: q.x, y: q.y } });
      else out.push({ k: "A", ...G.bulgeArc(p, q, b) });
    }
    return out;
  };
  G.ellipsePoint = (e, t) => {
    const mj = e.major, mn = { x: -mj.y * e.ratio, y: mj.x * e.ratio };
    return { x: e.c.x + mj.x * Math.cos(t) + mn.x * Math.sin(t), y: e.c.y + mj.y * Math.cos(t) + mn.y * Math.sin(t) };
  };
  G.ellipseSegs = (e, n = 96) => {
    const t0 = e.t0 ?? 0, t1 = e.t1 ?? TAU;
    const sw = e.t0 == null ? TAU : G.ccwSweep(t0, t1);
    const out = [];
    let prev = G.ellipsePoint(e, t0);
    const steps = Math.max(8, Math.round((n * sw) / TAU));
    for (let i = 1; i <= steps; i++) {
      const p = G.ellipsePoint(e, t0 + (sw * i) / steps);
      out.push({ k: "L", a: prev, b: p, approx: true });
      prev = p;
    }
    return out;
  };
  G.textBox = (e) => {
    let w = 0;
    for (const ch of String(e.s || "")) w += /[\u0000-ÿ]/.test(ch) ? 0.62 : 1.0;
    w *= e.h;
    const rot = e.rot || 0;
    const p = e.p, u = { x: Math.cos(rot), y: Math.sin(rot) }, v = { x: -Math.sin(rot), y: Math.cos(rot) };
    const c = [p, G.add(p, G.mul(u, w)), G.add(G.add(p, G.mul(u, w)), G.mul(v, e.h)), G.add(p, G.mul(v, e.h))];
    return c;
  };
  // 치수의 그림 요소(선·문자 위치)
  G.dimGeom = (e) => {
    const out = { lines: [], text: null, arrows: [] };
    if (e.kind === "linear" || e.kind === "aligned") {
      const p1 = e.p1, p2 = e.p2, dp = e.dp;
      let dir;
      if (e.kind === "aligned") dir = G.unit(G.sub(p2, p1));
      else dir = e.rot != null ? { x: Math.cos(e.rot), y: Math.sin(e.rot) } : { x: 1, y: 0 };
      const n = G.perp(dir);
      // 치수선이 지나는 위치: dp를 지나는 dir 방향 직선
      const off = G.dot(G.sub(dp, p1), n);
      const q1 = G.add(p1, G.mul(n, off));
      const off2 = G.dot(G.sub(dp, p2), n);
      const q2 = G.add(p2, G.mul(n, off2));
      const ts = e.ts || 2.5;
      const ext = 1.25 * (ts / 2.5), gap = 0.625 * (ts / 2.5);
      const sgn1 = Math.sign(off) || 1, sgn2 = Math.sign(off2) || 1;
      out.lines.push({ a: G.add(p1, G.mul(n, sgn1 * gap)), b: G.add(q1, G.mul(n, sgn1 * ext)) });
      out.lines.push({ a: G.add(p2, G.mul(n, sgn2 * gap)), b: G.add(q2, G.mul(n, sgn2 * ext)) });
      out.lines.push({ a: q1, b: q2 });
      out.arrows.push({ p: q1, dir: G.unit(G.sub(q1, q2)) }, { p: q2, dir: G.unit(G.sub(q2, q1)) });
      const val = Math.abs(G.dot(G.sub(p2, p1), dir));
      let a = Math.atan2(dir.y, dir.x);
      if (a > Math.PI / 2 + 1e-9 || a <= -Math.PI / 2 + 1e-9) a += Math.PI;
      const tm = G.mid(q1, q2);
      const up = { x: -Math.sin(a), y: Math.cos(a) };
      out.text = { p: G.add(tm, G.mul(up, (e.ts || 2.5) * 0.6)), rot: a, s: e.text ?? G.fmt(val, 2), center: true, h: e.ts || 2.5 };
      out.value = val;
    } else if (e.kind === "radius" || e.kind === "diameter") {
      const a = G.ang(e.c, e.dp);
      const pOn = G.polar(e.c, a, e.r);
      const pOther = G.polar(e.c, a + Math.PI, e.r);
      const start = e.kind === "diameter" ? pOther : e.c;
      const endPt = G.dist(e.c, e.dp) > e.r ? e.dp : pOn;
      out.lines.push({ a: start, b: endPt });
      out.arrows.push({ p: pOn, dir: G.unit(G.sub(pOn, e.c)) });
      if (e.kind === "diameter") out.arrows.push({ p: pOther, dir: G.unit(G.sub(pOther, e.c)) });
      const val = e.kind === "diameter" ? e.r * 2 : e.r;
      let ta = a; if (ta > Math.PI / 2 || ta <= -Math.PI / 2) ta += Math.PI;
      out.text = { p: G.add(endPt, G.mul({ x: -Math.sin(ta), y: Math.cos(ta) }, (e.ts || 2.5) * 0.6)), rot: ta, s: e.text ?? (e.kind === "diameter" ? "Ø" : "R") + G.fmt(val, 2), center: true, h: e.ts || 2.5 };
      out.value = val;
    }
    return out;
  };

  G.segs = (e) => {
    switch (e.type) {
      case "line": return [{ k: "L", a: e.a, b: e.b }];
      case "circle": return [{ k: "C", c: e.c, r: e.r }];
      case "arc": return [{ k: "A", c: e.c, r: e.r, a0: G.nang(e.a0), sw: G.ccwSweep(e.a0, e.a1), rev: false }];
      case "pline": return G.plineSegs(e);
      case "ellipse": return G.ellipseSegs(e);
      case "text": { const b = G.textBox(e); return [0, 1, 2, 3].map((i) => ({ k: "L", a: b[i], b: b[(i + 1) % 4], ghost: true })); }
      case "dim": { const g = G.dimGeom(e); return g.lines.map((l) => ({ k: "L", a: l.a, b: l.b })); }
      case "array": return G.expandArray(e).flatMap(G.segs);
      default: return [];
    }
  };
  G.bbox = (e) => {
    let bb = null;
    for (const s of G.segs(e)) bb = G.bboxUnion(bb, G.segBBox(s));
    if (e.type === "dim") { const g = G.dimGeom(e); if (g.text) bb = G.bboxUnion(bb, bboxOf([g.text.p])); }
    return bb;
  };
  G.hitDist = (e, p) => {
    if (e.type === "text") {
      const box = G.textBox(e);
      if (pointInPoly(p, box)) return 0;
    }
    let d = Infinity;
    for (const s of G.segs(e)) { const r = G.segClosest(s, p); if (r.d < d) d = r.d; }
    return d;
  };
  function pointInPoly(p, poly) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const a = poly[i], b = poly[j];
      if ((a.y > p.y) !== (b.y > p.y) && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
    }
    return inside;
  }
  G.pointInPoly = pointInPoly;
  G.polyArea = (pts) => { let s = 0; for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; s += a.x * b.y - b.x * a.y; } return s / 2; };

  // 사각형 영역과 조각이 걸치는지
  G.segHitsRect = (s, r) => {
    if (G.ptInRect(G.segStart(s), r) || G.ptInRect(G.segEnd(s), r)) return true;
    const c = [{ x: r.x0, y: r.y0 }, { x: r.x1, y: r.y0 }, { x: r.x1, y: r.y1 }, { x: r.x0, y: r.y1 }];
    for (let i = 0; i < 4; i++) if (G.intersect(s, { k: "L", a: c[i], b: c[(i + 1) % 4] }).length) return true;
    if (s.k !== "L" && G.ptInRect(G.segPoint(s, 0.5), r)) return true;
    return false;
  };
  G.entInRect = (e, r) => { const b = G.bbox(e); return !!b && G.bboxInside(b, r); };
  G.entCrossRect = (e, r) => {
    const b = G.bbox(e);
    if (!b) return false;
    if (b.x1 < r.x0 || b.x0 > r.x1 || b.y1 < r.y0 || b.y0 > r.y1) return false;
    if (G.bboxInside(b, r)) return true;
    if (e.type === "text") return true;
    return G.segs(e).some((s) => G.segHitsRect(s, r));
  };
  G.entCrossFence = (e, fence) => {
    const segs = G.segs(e);
    for (let i = 0; i < fence.length - 1; i++) {
      const f = { k: "L", a: fence[i], b: fence[i + 1] };
      if (segs.some((s) => G.intersect(s, f).length)) return true;
    }
    return false;
  };

  // ---------- 변환 행렬 (x' = a x + c y + e, y' = b x + d y + f) ----------
  const M = (G.M = {
    id: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
    tr: (dx, dy) => ({ a: 1, b: 0, c: 0, d: 1, e: dx, f: dy }),
    rot: (c, ang) => {
      const co = Math.cos(ang), s = Math.sin(ang);
      return { a: co, b: s, c: -s, d: co, e: c.x - co * c.x + s * c.y, f: c.y - s * c.x - co * c.y };
    },
    scale: (c, k) => ({ a: k, b: 0, c: 0, d: k, e: c.x - k * c.x, f: c.y - k * c.y }),
    mirror: (p, q) => {
      const t = G.ang(p, q), co = Math.cos(2 * t), s = Math.sin(2 * t);
      const L = { a: co, b: s, c: s, d: -co, e: 0, f: 0 };
      const o = M.apply(L, p);
      L.e = p.x - o.x; L.f = p.y - o.y;
      return L;
    },
    // A∘B (B 먼저)
    mul: (A, B) => ({
      a: A.a * B.a + A.c * B.b, b: A.b * B.a + A.d * B.b,
      c: A.a * B.c + A.c * B.d, d: A.b * B.c + A.d * B.d,
      e: A.a * B.e + A.c * B.f + A.e, f: A.b * B.e + A.d * B.f + A.f,
    }),
    apply: (m, p) => ({ x: m.a * p.x + m.c * p.y + m.e, y: m.b * p.x + m.d * p.y + m.f }),
    vec: (m, v) => ({ x: m.a * v.x + m.c * v.y, y: m.b * v.x + m.d * v.y }),
    det: (m) => m.a * m.d - m.b * m.c,
  });

  G.xform = (e0, m) => {
    const e = G.clone(e0);
    const P = (p) => M.apply(m, p);
    const det = M.det(m), k = Math.sqrt(Math.abs(det)), flip = det < 0;
    switch (e.type) {
      case "line": e.a = P(e0.a); e.b = P(e0.b); break;
      case "circle": e.c = P(e0.c); e.r = e0.r * k; break;
      case "arc": {
        const s = G.polar(e0.c, e0.a0, e0.r), t = G.polar(e0.c, e0.a1, e0.r);
        e.c = P(e0.c); e.r = e0.r * k;
        const s2 = P(s), t2 = P(t);
        if (flip) { e.a0 = G.ang(e.c, t2); e.a1 = G.ang(e.c, s2); } else { e.a0 = G.ang(e.c, s2); e.a1 = G.ang(e.c, t2); }
        break;
      }
      case "pline": e.pts = e0.pts.map((p) => ({ ...P(p), b: flip ? -(p.b || 0) : p.b || 0 })); break;
      case "ellipse": {
        e.c = P(e0.c); e.major = M.vec(m, e0.major);
        if (e0.t0 != null && flip) { e.t0 = -e0.t1; e.t1 = -e0.t0; }
        break;
      }
      case "text": {
        e.p = P(e0.p); e.h = e0.h * k;
        const d = M.vec(m, { x: Math.cos(e0.rot || 0), y: Math.sin(e0.rot || 0) });
        let r = Math.atan2(d.y, d.x);
        if (flip && Math.cos(r) < -1e-9) r += Math.PI;
        e.rot = r;
        break;
      }
      case "dim": {
        for (const key of ["p1", "p2", "dp", "c"]) if (e0[key]) e[key] = P(e0[key]);
        if (e0.r != null) e.r = e0.r * k;
        if (e0.rot != null) { const d = M.vec(m, { x: Math.cos(e0.rot), y: Math.sin(e0.rot) }); e.rot = Math.atan2(d.y, d.x); }
        e.ts = (e0.ts || 2.5) * k;
        break;
      }
      case "array": e.M = M.mul(m, e0.M || M.id()); break;
    }
    return e;
  };

  // ---------- 연관 배열 전개 ----------
  G.arrayTransforms = (e) => {
    const p = e.p, out = [];
    if (e.kind === "rect") {
      const u = { x: Math.cos(p.ang || 0), y: Math.sin(p.ang || 0) }, v = G.perp(u);
      for (let r = 0; r < p.rows; r++)
        for (let c = 0; c < p.cols; c++) out.push(M.tr(u.x * c * p.dx + v.x * r * p.dy, u.y * c * p.dx + v.y * r * p.dy));
    } else if (e.kind === "polar") {
      const n = Math.max(1, p.n);
      const full = Math.abs(Math.abs(p.fill) - TAU) < 1e-9;
      const step = p.step != null ? p.step : full ? p.fill / n : n > 1 ? p.fill / (n - 1) : 0;
      for (let i = 0; i < n; i++) {
        const a = step * i;
        if (p.rot !== false) out.push(M.rot(p.c, a));
        else { const b2 = G.rot(e.base, p.c, a); out.push(M.tr(b2.x - e.base.x, b2.y - e.base.y)); }
      }
    } else if (e.kind === "path") {
      const segs = G.segs(p.path);
      const total = segs.reduce((s, g) => s + G.segLen(g), 0);
      const n = Math.max(1, p.n);
      const closed = p.path.type === "circle" || (p.path.type === "pline" && p.path.closed);
      let spacing = p.method === "measure" ? p.spacing : closed ? total / n : n > 1 ? total / (n - 1) : 0;
      const start = pathAt(segs, 0);
      for (let i = 0; i < n; i++) {
        const s = Math.min(total, i * spacing);
        if (i * spacing > total + 1e-6) break;
        const at = pathAt(segs, s);
        let m = M.tr(at.pt.x - e.base.x, at.pt.y - e.base.y);
        if (p.align !== false) {
          const da = Math.atan2(at.tan.y, at.tan.x) - Math.atan2(start.tan.y, start.tan.x);
          m = M.mul(M.rot(at.pt, da), m);
        }
        out.push(m);
      }
    }
    return out;
  };
  function pathAt(segs, s) {
    let acc = 0;
    for (const g of segs) {
      const L = G.segLen(g);
      if (s <= acc + L + 1e-9) { const t = L ? (s - acc) / L : 0; return { pt: G.segPoint(g, t), tan: G.segTangent(g, t) }; }
      acc += L;
    }
    const g = segs[segs.length - 1];
    return { pt: G.segPoint(g, 1), tan: G.segTangent(g, 1) };
  }
  G.pathAt = pathAt;
  G.expandArray = (e) => {
    const out = [];
    const base = e.M || M.id();
    for (const t of G.arrayTransforms(e)) {
      const m = M.mul(base, t);
      for (const it of e.items) { const x = G.xform(it, m); x.layer = x.layer || e.layer; out.push(x); }
    }
    return out;
  };

  // ---------- 엔티티 매개변수 (자르기/끊기) ----------
  // 선·호: u∈[0,1], 원: u∈[0,1) 각도/2π, 폴리선: u∈[0,n]
  G.paramOf = (e, p) => {
    const segs = G.segs(e);
    let best = null;
    segs.forEach((s, i) => {
      const r = G.segClosest(s, p);
      if (!best || r.d < best.d) best = { d: r.d, u: (e.type === "pline" ? i : 0) + r.t, pt: r.pt };
    });
    return best;
  };
  G.pointAtParam = (e, u) => {
    const segs = G.segs(e);
    if (e.type === "pline") { const i = Math.min(segs.length - 1, Math.floor(u)); return G.segPoint(segs[i], u - i); }
    return G.segPoint(segs[0], u);
  };
  G.paramRange = (e) => (e.type === "pline" ? G.segs(e).length : 1);
  G.isClosed = (e) => e.type === "circle" || (e.type === "ellipse" && e.t0 == null) || (e.type === "pline" && e.closed);

  // 다른 조각들과의 교차 매개변수 목록
  G.cutParams = (e, cutterSegs) => {
    const segs = G.segs(e);
    const out = [];
    segs.forEach((s, i) => {
      for (const c of cutterSegs) {
        for (const p of G.intersect(s, c)) {
          const t = G.segParam(s, p);
          out.push((e.type === "pline" ? i : 0) + Math.max(0, Math.min(1, t)));
        }
      }
    });
    out.sort((a, b) => a - b);
    return out.filter((u, i) => i === 0 || u - out[i - 1] > 1e-9);
  };

  // 매개변수 구간 [u0,u1]만 남긴 엔티티 (원은 u0→u1 반시계 호)
  G.subEntity = (e, u0, u1) => {
    if (e.type === "line") {
      const a = G.lerp(e.a, e.b, u0), b = G.lerp(e.a, e.b, u1);
      if (G.dist(a, b) < 1e-9) return null;
      return { ...G.clone(e), a, b };
    }
    if (e.type === "arc") {
      const sw = G.ccwSweep(e.a0, e.a1);
      const n = { ...G.clone(e), a0: e.a0 + sw * u0, a1: e.a0 + sw * u1 };
      if (sw * (u1 - u0) < 1e-9) return null;
      return n;
    }
    if (e.type === "circle") {
      let a0 = u0 * TAU, a1 = u1 * TAU;
      if (G.nang(a1 - a0) < 1e-9) return null;
      const n = { ...G.clone(e), type: "arc", a0, a1 };
      delete n.tag2;
      return n;
    }
    if (e.type === "pline") {
      const n = e.pts.length, segsN = e.closed ? n : n - 1;
      const pts = [];
      const wrap = u1 < u0; // 닫힌 폴리선에서 끝을 넘어감
      const end = wrap ? u1 + segsN : u1;
      const P = (i) => e.pts[((i % n) + n) % n];
      const i0 = Math.floor(u0 + 1e-12), i1 = Math.min(Math.ceil(end - 1e-12), wrap ? 2 * segsN : segsN);
      for (let i = i0; i < i1; i++) {
        const a = P(i), b = P(i + 1);
        const t0 = Math.max(0, u0 - i), t1 = Math.min(1, end - i);
        if (t1 - t0 < 1e-12) continue;
        const bul = a.b || 0;
        const pa = t0 === 0 ? { x: a.x, y: a.y } : segPointRaw(a, b, bul, t0);
        const nb = Math.abs(bul) < 1e-12 ? 0 : Math.tan(Math.atan(bul) * (t1 - t0));
        if (!pts.length) pts.push({ ...pa, b: nb });
        else pts[pts.length - 1].b = nb;
        const pb = t1 === 1 ? { x: b.x, y: b.y } : segPointRaw(a, b, bul, t1);
        pts.push({ ...pb, b: 0 });
      }
      if (pts.length < 2) return null;
      return { ...G.clone(e), pts, closed: false };
    }
    return null;
  };
  function segPointRaw(a, b, bul, t) {
    if (Math.abs(bul) < 1e-12) return G.lerp(a, b, t);
    const s = { k: "A", ...G.bulgeArc(a, b, bul) };
    return G.segPoint(s, t);
  }

  // ---------- 간격띄우기 ----------
  G.offset = (e, dist, side) => {
    if (e.type === "line") {
      const d = G.unit(G.sub(e.b, e.a)), n = G.perp(d);
      const sg = G.dot(G.sub(side, e.a), n) >= 0 ? 1 : -1;
      const o = G.mul(n, dist * sg);
      return { ...G.clone(e), a: G.add(e.a, o), b: G.add(e.b, o) };
    }
    if (e.type === "circle" || e.type === "arc") {
      const out = G.dist(side, e.c) > e.r;
      const r = e.r + (out ? dist : -dist);
      if (r <= 1e-9) return null;
      return { ...G.clone(e), r };
    }
    if (e.type === "pline") {
      const segs = G.plineSegs(e);
      if (!segs.length) return null;
      // 가장 가까운 조각에서 어느 쪽인지
      let best = null;
      segs.forEach((s, i) => { const r = G.segClosest(s, side); if (!best || r.d < best.d) best = { ...r, i }; });
      const s = segs[best.i];
      const tan = G.segTangent(s, best.t);
      let left = G.cross(tan, G.sub(side, best.pt)) > 0;
      if (Math.abs(G.cross(tan, G.sub(side, best.pt))) < 1e-12 && s.k !== "L") left = G.dist(side, s.c) < s.r ? !s.rev : s.rev;
      const sg = left ? 1 : -1;
      const off = segs.map((g) => {
        if (g.k === "L") { const n = G.perp(G.unit(G.sub(g.b, g.a))); const o = G.mul(n, dist * sg); return { k: "L", a: G.add(g.a, o), b: G.add(g.b, o) }; }
        // 진행 방향 왼쪽 = 반시계 진행이면 중심 쪽
        const towardCenter = g.rev ? sg < 0 : sg > 0;
        const r = g.r + (towardCenter ? -dist : dist);
        if (r <= 1e-9) return null;
        return { ...g, r };
      });
      if (off.some((g) => !g)) return null;
      const n = off.length;
      const verts = [];
      const joinPt = (g1, g2) => {
        if (g1.k === "L" && g2.k === "L") {
          const x = G.intersect(g1, g2, true, true);
          if (x.length) return x[0];
        }
        return G.segStart(g2);
      };
      for (let i = 0; i < n; i++) {
        let p;
        if (i === 0 && !e.closed) p = G.segStart(off[0]);
        else p = joinPt(off[(i - 1 + n) % n], off[i]);
        const orig = e.pts[i];
        verts.push({ x: p.x, y: p.y, b: orig.b || 0 });
      }
      if (!e.closed) { const p = G.segEnd(off[n - 1]); verts.push({ x: p.x, y: p.y, b: 0 }); }
      return { ...G.clone(e), pts: verts };
    }
    if (e.type === "ellipse") return null;
    return null;
  };

  // 끝점들
  G.endpoints = (e) => {
    if (e.type === "line") return [e.a, e.b];
    if (e.type === "arc") return [G.polar(e.c, e.a0, e.r), G.polar(e.c, e.a1, e.r)];
    if (e.type === "pline") return e.closed ? [] : [e.pts[0], e.pts[e.pts.length - 1]];
    if (e.type === "ellipse" && e.t0 != null) return [G.ellipsePoint(e, e.t0), G.ellipsePoint(e, e.t1)];
    return [];
  };
  G.length = (e) => G.segs(e).reduce((s, g) => s + G.segLen(g), 0);

  // 두 선을 모깎기. 선택점 쪽을 남긴다. 반환 {l1, l2, arc} 또는 {error}
  G.filletLines = (L1, pk1, L2, pk2, r) => {
    const s1 = { k: "L", a: L1.a, b: L1.b }, s2 = { k: "L", a: L2.a, b: L2.b };
    const X = G.intersect(s1, s2, true, true);
    if (!X.length) return { error: "평행한 선은 모깎기할 수 없습니다." };
    const I = X[0];
    const keep = (L, pk) => {
      const q = G.segClosest({ k: "L", a: L.a, b: L.b }, pk).pt;
      let u = G.sub(q, I);
      if (G.len(u) < 1e-9) u = G.dist(L.a, I) > G.dist(L.b, I) ? G.sub(L.a, I) : G.sub(L.b, I);
      u = G.unit(u);
      const far = G.dot(G.sub(L.a, I), u) > G.dot(G.sub(L.b, I), u) ? L.a : L.b;
      return { u, far, reach: G.dot(G.sub(far, I), u) };
    };
    const k1 = keep(L1, pk1), k2 = keep(L2, pk2);
    if (r <= 1e-9) {
      return { l1: { ...G.clone(L1), a: I, b: k1.far }, l2: { ...G.clone(L2), a: I, b: k2.far }, arc: null, corner: I };
    }
    const cosPhi = Math.max(-1, Math.min(1, G.dot(k1.u, k2.u)));
    const phi = Math.acos(cosPhi);
    if (phi < 1e-6 || Math.PI - phi < 1e-6) return { error: "두 선이 한 직선 위에 있어 모깎기할 수 없습니다." };
    const t = r / Math.tan(phi / 2);
    if (t > k1.reach + 1e-6 || t > k2.reach + 1e-6) return { error: "반지름이 너무 큽니다. *유효하지 않음*" };
    const T1 = G.add(I, G.mul(k1.u, t)), T2 = G.add(I, G.mul(k2.u, t));
    const w = G.unit(G.add(k1.u, k2.u));
    const C = G.add(I, G.mul(w, r / Math.sin(phi / 2)));
    let a0 = G.ang(C, T1), a1 = G.ang(C, T2);
    if (G.ccwSweep(a0, a1) > Math.PI) [a0, a1] = [a1, a0];
    return {
      l1: G.dist(T1, k1.far) > 1e-9 ? { ...G.clone(L1), a: T1, b: k1.far } : null,
      l2: G.dist(T2, k2.far) > 1e-9 ? { ...G.clone(L2), a: T2, b: k2.far } : null,
      arc: { type: "arc", c: C, r, a0, a1 }, corner: I, T1, T2,
    };
  };
  G.chamferLines = (L1, pk1, L2, pk2, d1, d2, angle) => {
    const base = G.filletLines(L1, pk1, L2, pk2, 0);
    if (base.error) return base;
    const I = base.corner;
    const u1 = G.unit(G.sub(base.l1.b, I)), u2 = G.unit(G.sub(base.l2.b, I));
    const T1 = G.add(I, G.mul(u1, d1));
    let T2;
    if (angle != null) {
      // 첫 번째 선에서 angle만큼 기운 방향으로 두 번째 선과 만나는 점
      const toI = G.mul(u1, -1);
      const sgn = G.cross(u1, u2) > 0 ? 1 : -1;
      const dir = G.rot(toI, { x: 0, y: 0 }, sgn * -angle);
      const hit = G.intersect({ k: "L", a: T1, b: G.add(T1, dir) }, { k: "L", a: I, b: G.add(I, u2) }, true, true);
      if (!hit.length) return { error: "각도가 맞지 않습니다." };
      T2 = hit[0];
    } else T2 = G.add(I, G.mul(u2, d2));
    const r1 = G.dot(G.sub(base.l1.b, I), u1), r2 = G.dot(G.sub(base.l2.b, I), u2);
    if (G.dot(G.sub(T1, I), u1) > r1 + 1e-6 || G.dot(G.sub(T2, I), u2) > r2 + 1e-6) return { error: "모따기 거리가 너무 큽니다." };
    return {
      l1: G.dist(T1, base.l1.b) > 1e-9 ? { ...G.clone(L1), a: T1, b: base.l1.b } : null,
      l2: G.dist(T2, base.l2.b) > 1e-9 ? { ...G.clone(L2), a: T2, b: base.l2.b } : null,
      line: { type: "line", a: T1, b: T2 },
    };
  };
})();
