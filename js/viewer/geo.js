// ACAD.G3 — 3D 형상 도구(2D CAD의 ACAD.G와 다름): 벡터, 기본 입체(폴리곤), CSG(BSP 방식, csg.js의 알고리즘을 옮김).
// 좌표계는 CAD와 같다. X = 오른쪽(동), Y = 뒤(북), Z = 위. 단위 mm.
// 폴리곤 = { v: [[x,y,z],...], n: [nx,ny,nz], w: 평면상수, tag: 부품 id }. 바깥에서 볼 때 반시계.
window.ACAD = window.ACAD || {};

(function () {
  const V = {
    add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
    sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
    mul: (a, s) => [a[0] * s, a[1] * s, a[2] * s],
    dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
    cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
    len: (a) => Math.hypot(a[0], a[1], a[2]),
    norm: (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; },
    lerp: (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t],
    // 축 a에 수직인 두 단위벡터. 주축에 맞춰 원 꼭짓점이 사분점에 오게 한다.
    basis(a) {
      a = V.norm(a);
      const h = Math.abs(a[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
      const u = V.norm(V.sub(h, V.mul(a, V.dot(h, a))));
      return [u, V.cross(a, u)];
    },
  };

  function poly(v, tag) {
    // 법선은 가장 큰 삼각형 쪽으로 구해 수치 오차를 줄인다(Newell 방식).
    let nx = 0, ny = 0, nz = 0;
    for (let i = 0; i < v.length; i++) {
      const a = v[i], b = v[(i + 1) % v.length];
      nx += (a[1] - b[1]) * (a[2] + b[2]);
      ny += (a[2] - b[2]) * (a[0] + b[0]);
      nz += (a[0] - b[0]) * (a[1] + b[1]);
    }
    const n = V.norm([nx, ny, nz]);
    return { v, n, w: V.dot(n, v[0]), tag };
  }

  // ---------- 기본 입체 ----------
  function box(min, max, tag) {
    const c = (i) => [i & 1 ? max[0] : min[0], i & 2 ? max[1] : min[1], i & 4 ? max[2] : min[2]];
    return [[0, 4, 6, 2], [1, 3, 7, 5], [0, 1, 5, 4], [2, 6, 7, 3], [0, 2, 3, 1], [4, 5, 7, 6]]
      .map((f) => poly(f.map(c), tag));
  }

  // 원기둥(또는 원뿔대). caps=false면 양끝이 열린 관이 된다.
  function cyl(p0, p1, r0, opt = {}) {
    const r1 = opt.r1 ?? r0;
    const segs = opt.segs || 32;
    const a = V.sub(p1, p0);
    const [u, w] = V.basis(a);
    const ring = (p, r) => Array.from({ length: segs }, (_, i) => {
      const t = (i / segs) * Math.PI * 2;
      return V.add(p, V.add(V.mul(u, r * Math.cos(t)), V.mul(w, r * Math.sin(t))));
    });
    const b = ring(p0, r0), t = ring(p1, r1);
    const out = [];
    for (let i = 0; i < segs; i++) {
      const j = (i + 1) % segs;
      out.push(poly([b[i], b[j], t[j], t[i]], opt.tag));
    }
    if (opt.caps !== false) {
      out.push(poly(b.slice().reverse(), opt.capTag || opt.tag));
      out.push(poly(t, opt.capTag || opt.tag));
    }
    return out;
  }

  // 관(속이 빈 원통). 두께가 있어 끝면이 도넛 모양으로 보인다.
  function tube(p0, p1, ro, ri, opt = {}) {
    const segs = opt.segs || 32;
    const a = V.sub(p1, p0);
    const [u, w] = V.basis(a);
    const ring = (p, r) => Array.from({ length: segs }, (_, i) => {
      const t = (i / segs) * Math.PI * 2;
      return V.add(p, V.add(V.mul(u, r * Math.cos(t)), V.mul(w, r * Math.sin(t))));
    });
    const bo = ring(p0, ro), to = ring(p1, ro), bi = ring(p0, ri), ti = ring(p1, ri);
    const out = [];
    for (let i = 0; i < segs; i++) {
      const j = (i + 1) % segs;
      out.push(poly([bo[i], bo[j], to[j], to[i]], opt.tag));
      out.push(poly([bi[j], bi[i], ti[i], ti[j]], opt.tag));
      out.push(poly([bo[j], bo[i], bi[i], bi[j]], opt.tag));
      out.push(poly([to[i], to[j], ti[j], ti[i]], opt.tag));
    }
    return out;
  }

  // 원환의 일부(엘보). C = 굽힘 중심, e1 = 시작 방향(중심→관 중심), e2 = e1에 수직인 굽힘 방향.
  function torusArc(C, e1, e2, R, r, angle, opt = {}) {
    const su = opt.segsU || Math.max(6, Math.round((angle / (Math.PI / 2)) * 12));
    const sv = opt.segsV || 24;
    const n = V.cross(e1, e2);
    const P = [];
    for (let s = 0; s <= su; s++) {
      const phi = (angle * s) / su;
      const wv = V.add(V.mul(e1, Math.cos(phi)), V.mul(e2, Math.sin(phi)));
      const Q = V.add(C, V.mul(wv, R));
      const row = [];
      for (let k = 0; k < sv; k++) {
        const psi = (k / sv) * Math.PI * 2;
        row.push(V.add(Q, V.add(V.mul(wv, r * Math.cos(psi)), V.mul(n, r * Math.sin(psi)))));
      }
      P.push(row);
    }
    const out = [];
    for (let s = 0; s < su; s++) {
      for (let k = 0; k < sv; k++) {
        const k1 = (k + 1) % sv;
        out.push(poly([P[s][k], P[s + 1][k], P[s + 1][k1], P[s][k1]], opt.tag));
      }
    }
    return out;
  }

  function sphere(c, r, opt = {}) {
    const sl = opt.slices || 24, st = opt.stacks || 12;
    const pt = (i, j) => {
      const th = (i / sl) * Math.PI * 2, ph = (j / st) * Math.PI;
      return [c[0] + r * Math.sin(ph) * Math.cos(th), c[1] + r * Math.sin(ph) * Math.sin(th), c[2] + r * Math.cos(ph)];
    };
    const out = [];
    for (let i = 0; i < sl; i++) {
      for (let j = 0; j < st; j++) {
        const v = [];
        v.push(pt(i, j));
        if (j > 0) v.push(pt(i + 1, j));
        if (j < st - 1) v.push(pt(i + 1, j + 1));
        v.push(pt(i, j + 1));
        out.push(poly(v.reverse(), opt.tag));
      }
    }
    return out;
  }

  // 2D 윤곽을 밀어낸다. prof, holes: [[u,v],...]. o = 원점, U/Vv/W = 축, depth = W 방향 두께.
  function extrude(prof, holes, o, U, Vv, W, depth, opt = {}) {
    const area = (p) => p.reduce((s, a, i) => { const b = p[(i + 1) % p.length]; return s + a[0] * b[1] - b[0] * a[1]; }, 0) / 2;
    const P = area(prof) < 0 ? prof.slice().reverse() : prof.slice();
    const H = (holes || []).map((h) => (area(h) > 0 ? h.slice().reverse() : h.slice()));
    const at = (p, w) => V.add(o, V.add(V.mul(U, p[0]), V.add(V.mul(Vv, p[1]), V.mul(W, w))));
    const out = [];
    const contour = P.map((p) => new THREE.Vector2(p[0], p[1]));
    const hv = H.map((h) => h.map((p) => new THREE.Vector2(p[0], p[1])));
    const all = P.concat(...H);
    const tris = THREE.ShapeUtils.triangulateShape(contour, hv);
    // 끝면 태그: capTagFn(무게중심 [u,v], 0=바닥 w=0 / 1=위 w=depth) > capTags[0|1] > capTag > tag
    const capTag = (a, b, c, which) => {
      if (opt.capTagFn) return opt.capTagFn([(all[a][0] + all[b][0] + all[c][0]) / 3, (all[a][1] + all[b][1] + all[c][1]) / 3], which);
      if (opt.capTags) return opt.capTags[which];
      return opt.capTag || opt.tag;
    };
    const face = (pts, tag, sign) => {
      let p = poly(pts, tag);
      if (V.dot(p.n, W) * sign < 0) p = poly(pts.slice().reverse(), tag);
      out.push(p);
    };
    for (const [a, b, c] of tris) {
      face([at(all[a], depth), at(all[b], depth), at(all[c], depth)], capTag(a, b, c, 1), 1);
      face([at(all[c], 0), at(all[b], 0), at(all[a], 0)], capTag(a, b, c, 0), -1);
    }
    const wall = (loop, tagFn) => {
      for (let i = 0; i < loop.length; i++) {
        const a = loop[i], b = loop[(i + 1) % loop.length];
        const pts = [at(a, 0), at(b, 0), at(b, depth), at(a, depth)];
        let p = poly(pts, tagFn(i));
        // 2D 바깥 법선(반시계 윤곽 기준 (dy,-dx))과 방향을 맞춘다. 구멍은 시계 방향이라 자동으로 안쪽을 향한다.
        const want = V.sub(V.mul(U, b[1] - a[1]), V.mul(Vv, b[0] - a[0]));
        if (V.dot(p.n, want) < 0) p = poly(pts.slice().reverse(), tagFn(i));
        out.push(p);
      }
    };
    wall(P, (i) => (opt.wallTag ? opt.wallTag(i, P) : opt.tag));
    H.forEach((h, k) => wall(h, () => (opt.holeTags ? opt.holeTags[k] : opt.tag)));
    return out;
  }

  // 원호 점열(2D). a0→a1 (라디안), n등분.
  function arc2(cx, cy, r, a0, a1, n) {
    return Array.from({ length: n + 1 }, (_, i) => {
      const t = a0 + ((a1 - a0) * i) / n;
      return [cx + r * Math.cos(t), cy + r * Math.sin(t)];
    });
  }
  function circle2(cx, cy, r, n = 32) {
    return Array.from({ length: n }, (_, i) => {
      const t = (i / n) * Math.PI * 2;
      return [cx + r * Math.cos(t), cy + r * Math.sin(t)];
    });
  }

  // ---------- CSG ----------
  const EPS = 1e-4;
  const COPLANAR = 0, FRONT = 1, BACK = 2, SPANNING = 3;

  function flipPoly(p) { return { v: p.v.slice().reverse(), n: V.mul(p.n, -1), w: -p.w, tag: p.tag }; }

  function splitPolygon(pl, p, cf, cb, f, b) {
    let type = 0;
    const types = new Array(p.v.length);
    for (let i = 0; i < p.v.length; i++) {
      const t = V.dot(pl.n, p.v[i]) - pl.w;
      const ty = t < -EPS ? BACK : t > EPS ? FRONT : COPLANAR;
      type |= ty; types[i] = ty;
    }
    if (type === COPLANAR) (V.dot(pl.n, p.n) > 0 ? cf : cb).push(p);
    else if (type === FRONT) f.push(p);
    else if (type === BACK) b.push(p);
    else {
      const fv = [], bv = [];
      const n = p.v.length;
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        const ti = types[i], tj = types[j], vi = p.v[i], vj = p.v[j];
        if (ti !== BACK) fv.push(vi);
        if (ti !== FRONT) bv.push(vi);
        if ((ti | tj) === SPANNING) {
          const t = (pl.w - V.dot(pl.n, vi)) / V.dot(pl.n, V.sub(vj, vi));
          const v = V.lerp(vi, vj, t);
          fv.push(v); bv.push(v);
        }
      }
      if (fv.length >= 3) f.push({ v: fv, n: p.n, w: p.w, tag: p.tag });
      if (bv.length >= 3) b.push({ v: bv, n: p.n, w: p.w, tag: p.tag });
    }
  }

  class Node {
    constructor(polys) { this.plane = null; this.front = null; this.back = null; this.polys = []; if (polys) this.build(polys); }
    invert() {
      this.polys = this.polys.map(flipPoly);
      if (this.plane) this.plane = { n: V.mul(this.plane.n, -1), w: -this.plane.w };
      if (this.front) this.front.invert();
      if (this.back) this.back.invert();
      const t = this.front; this.front = this.back; this.back = t;
    }
    clipPolygons(polys) {
      if (!this.plane) return polys.slice();
      let f = [], b = [];
      for (const p of polys) splitPolygon(this.plane, p, f, b, f, b);
      if (this.front) f = this.front.clipPolygons(f);
      b = this.back ? this.back.clipPolygons(b) : [];
      return f.concat(b);
    }
    clipTo(bsp) {
      this.polys = bsp.clipPolygons(this.polys);
      if (this.front) this.front.clipTo(bsp);
      if (this.back) this.back.clipTo(bsp);
    }
    all() {
      let p = this.polys.slice();
      if (this.front) p = p.concat(this.front.all());
      if (this.back) p = p.concat(this.back.all());
      return p;
    }
    build(polys) {
      if (!polys.length) return;
      if (!this.plane) this.plane = { n: polys[0].n, w: polys[0].w };
      const f = [], b = [];
      for (const p of polys) splitPolygon(this.plane, p, this.polys, this.polys, f, b);
      if (f.length) { if (!this.front) this.front = new Node(); this.front.build(f); }
      if (b.length) { if (!this.back) this.back = new Node(); this.back.build(b); }
    }
  }

  const csg = {
    union(a, b) {
      const A = new Node(a), B = new Node(b);
      A.clipTo(B); B.clipTo(A); B.invert(); B.clipTo(A); B.invert();
      A.build(B.all());
      return A.all();
    },
    subtract(a, b) {
      const A = new Node(a), B = new Node(b);
      A.invert(); A.clipTo(B); B.clipTo(A); B.invert(); B.clipTo(A); B.invert();
      A.build(B.all()); A.invert();
      return A.all();
    },
    intersect(a, b) {
      const A = new Node(a), B = new Node(b);
      A.invert(); B.clipTo(A); B.invert(); A.clipTo(B); B.clipTo(A);
      A.build(B.all()); A.invert();
      return A.all();
    },
  };

  // 여러 도구를 차례로 빼기/더하기
  csg.subtractAll = (a, list) => list.reduce((acc, t) => csg.subtract(acc, t), a);
  csg.unionAll = (list) => list.reduce((acc, t) => (acc ? csg.union(acc, t) : t), null);

  ACAD.G3 = { V, poly, box, cyl, tube, torusArc, sphere, extrude, arc2, circle2, csg };
})();
