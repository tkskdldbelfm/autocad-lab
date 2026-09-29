// CAD 연습장: 미션 검사 도우미. 모든 비교는 순서·시작점과 무관하게, 허용오차 0.01로 한다.
window.ACAD = window.ACAD || {};
(function () {
  const G = ACAD.G;
  const TOL = 0.01;
  const P = (x, y) => ({ x, y });
  const near = (a, b, t = TOL) => Math.abs(a - b) <= t;
  const nearPt = (a, b, t = TOL) => G.dist(a, b) <= t;

  const K = {
    P, near, nearPt, TOL,
    ents: (ctx) => ctx.flat.filter((e) => ctx.doc.visible(e)),
    // 선 조각: 선 + 폴리선의 직선 구간
    lineSegs(ctx, layer) {
      const out = [];
      for (const e of K.ents(ctx)) {
        if (layer && e.layer !== layer) continue;
        if (e.type === "line") out.push({ a: e.a, b: e.b, e });
        else if (e.type === "pline") for (const g of G.plineSegs(e)) if (g.k === "L") out.push({ a: g.a, b: g.b, e });
      }
      return out;
    },
    hasSeg(ctx, a, b, o = {}) {
      const t = o.tol ?? TOL;
      return K.lineSegs(ctx, o.layer).some((s) => (nearPt(s.a, a, t) && nearPt(s.b, b, t)) || (nearPt(s.a, b, t) && nearPt(s.b, a, t)));
    },
    // a~b 구간을 덮는 직선(더 긴 선 포함)
    covers(ctx, a, b, o = {}) {
      return K.lineSegs(ctx, o.layer).some((s) => {
        const L = { k: "L", a: s.a, b: s.b };
        return G.segClosest(L, a).d <= TOL && G.segClosest(L, b).d <= TOL;
      });
    },
    lines: (ctx, layer) => K.ents(ctx).filter((e) => e.type === "line" && (!layer || e.layer === layer)),
    circles: (ctx, layer) => K.ents(ctx).filter((e) => e.type === "circle" && (!layer || e.layer === layer)),
    findCircle(ctx, c, r, o = {}) {
      const t = o.tol ?? TOL;
      return K.circles(ctx, o.layer).find((e) => nearPt(e.c, c, t) && near(e.r, r, t));
    },
    countCircles(ctx, r, o = {}) { return K.circles(ctx, o.layer).filter((e) => near(e.r, r, o.tol ?? TOL)).length; },
    // 호: 호 객체 + 폴리선의 호 구간 (c, r, a0, sw)
    arcs(ctx, layer) {
      const out = [];
      for (const e of K.ents(ctx)) {
        if (layer && e.layer !== layer) continue;
        if (e.type === "arc") out.push({ c: e.c, r: e.r, a0: G.nang(e.a0), sw: G.ccwSweep(e.a0, e.a1), e, s: G.polar(e.c, e.a0, e.r), t: G.polar(e.c, e.a1, e.r) });
        else if (e.type === "pline") for (const g of G.plineSegs(e)) if (g.k === "A") out.push({ c: g.c, r: g.r, a0: g.a0, sw: g.sw, e, s: G.segStart(g), t: G.segEnd(g) });
      }
      return out;
    },
    // 닫힌 다각형(선 고리 + 직선만 있는 닫힌 폴리선). 한 직선 위 꼭짓점은 정리.
    polys(ctx, layer) {
      const ents = K.ents(ctx).filter((e) => !layer || e.layer === layer);
      const out = [];
      for (const lp of ACAD.CadFeedback.findLoops(ents)) if (lp.allLines) out.push({ pts: clean(lp.pts), ids: lp.ids });
      for (const e of ents) if (e.type === "pline" && e.closed) { const p = ACAD.CadFeedback.plineAsPoly(e); if (p) out.push({ pts: clean(p), ids: [e.id], e }); }
      return out;
    },
    // target과 같은 모양이 있는지. translate: 위치 무관
    hasPoly(ctx, target, o = {}) { return K.polys(ctx, o.layer).find((p) => matchPoly(p.pts, target, o.translate !== false)); },
    rects(ctx, w, h, o = {}) {
      return K.polys(ctx, o.layer).filter((p) => {
        if (p.pts.length !== 4) return false;
        const bb = G.bboxOf(p.pts);
        const axis = p.pts.every((q) => (near(q.x, bb.x0) || near(q.x, bb.x1)) && (near(q.y, bb.y0) || near(q.y, bb.y1)));
        return axis && near(bb.x1 - bb.x0, w, o.tol ?? TOL) && near(bb.y1 - bb.y0, h, o.tol ?? TOL);
      }).map((p) => ({ ...p, bb: G.bboxOf(p.pts) }));
    },
    plines: (ctx) => K.ents(ctx).filter((e) => e.type === "pline"),
    byTag: (ctx, tag) => ctx.doc.ents.find((e) => e.tag === tag),
    ptsMatch(pts, target, t = TOL) {
      if (pts.length !== target.length) return false;
      return target.every((q) => pts.some((p) => nearPt(p, q, t)));
    },
    used: (ctx, name, via) => ctx.history.some((h) => h.name === name && (!via || h.via === via)),
    ev: (ctx, name, n = 1) => (ctx.events[name] || 0) >= n,
    inputs: (ctx, re) => ctx.inputs.filter((s) => re.test(s)).length,
    texts: (ctx) => K.ents(ctx).filter((e) => e.type === "text"),
    polyInfo: (pts) => ACAD.CadFeedback.polyInfo(pts),
    // 연속된 벡터 경로가 선 조각으로 있는지 (방향 무관)
    chain(ctx, vecs, o = {}) {
      const segs = K.lineSegs(ctx, o.layer);
      const has = (a, b) => segs.some((s) => (nearPt(s.a, a, 0.05) && nearPt(s.b, b, 0.05)) || (nearPt(s.a, b, 0.05) && nearPt(s.b, a, 0.05)));
      for (const s of segs) for (const [p0] of [[s.a], [s.b]]) {
        let p = p0, ok = true;
        for (const v of vecs) { const q = G.add(p, v); if (!has(p, q)) { ok = false; break; } p = q; }
        if (ok) return true;
      }
      return false;
    },
  };
  function clean(pts) {
    let arr = pts.slice();
    let changed = true;
    while (changed && arr.length > 3) {
      changed = false;
      for (let i = 0; i < arr.length; i++) {
        const a = arr[(i - 1 + arr.length) % arr.length], p = arr[i], b = arr[(i + 1) % arr.length];
        if (Math.abs(G.cross(G.unit(G.sub(p, a)), G.unit(G.sub(b, p)))) < 1e-9 && G.dot(G.sub(p, a), G.sub(b, p)) > 0) { arr.splice(i, 1); changed = true; break; }
      }
    }
    return arr;
  }
  function matchPoly(pts, target, translate) {
    const n = target.length;
    if (pts.length !== n) return false;
    for (const dir of [1, -1]) for (let k = 0; k < n; k++) {
      const at = (i) => pts[(((k + dir * i) % n) + n) % n];
      const d = translate ? G.sub(at(0), target[0]) : { x: 0, y: 0 };
      let ok = true;
      for (let i = 0; i < n; i++) if (!nearPt(G.sub(at(i), d), target[i])) { ok = false; break; }
      if (ok) return true;
    }
    return false;
  }
  K.matchPoly = matchPoly;
  K.clean = clean;
  ACAD.CadCheck = K;
})();
