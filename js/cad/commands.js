// CAD 연습장 명령. 각 명령은 제너레이터이고 엔진에 요청을 yield 한다.
// 프롬프트 문구는 한국어판 AutoCAD 표기를 따른다. [ ] 안의 (영문) 키워드는 자동으로 인식된다.
window.ACAD = window.ACAD || {};
(function () {
  const G = ACAD.G, M = G.M;
  const REG = new Map(), ALIAS = new Map();
  const f4 = (n) => (Math.round(n * 10000) / 10000).toFixed(4);

  function def(name, alias, ko, run, extra = {}) {
    const d = { name, alias, ko, run, ...extra };
    REG.set(name, d);
    alias.forEach((a) => ALIAS.set(a, name));
    return d;
  }
  ACAD.CadCommands = {
    get: (n) => REG.get(n) || REG.get(ALIAS.get(n)),
    find: (tok) => REG.get(tok) || REG.get(ALIAS.get(tok)),
    list: () => [...REG.values()],
    closest(tok) {
      let best = null, bd = 3;
      for (const d of REG.values()) {
        if (d.hidden) continue;
        for (const w of [d.name, ...d.alias]) { const x = lev(tok, w); if (x < bd) { bd = x; best = d; } }
      }
      return best;
    },
  };
  function lev(a, b) {
    const m = a.length, n = b.length, d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
    for (let j = 1; j <= n; j++) d[0][j] = j;
    for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return d[m][n];
  }

  const CURVE = (e) => ["line", "arc", "circle", "pline"].includes(e.type);
  const OPEN_CURVE = (e) => e.type === "line" || e.type === "arc" || (e.type === "pline" && !e.closed);

  function* getSel(api, prompt = "객체 선택:", opts) {
    const r = yield api.select(prompt, opts);
    const ids = (r && r.ids) || [];
    if (!ids.length) api.print("선택된 객체가 없습니다.");
    return ids;
  }
  const moved = (api, ids, m) => ids.map((id) => api.get(id)).filter(Boolean).map((e) => G.xform(e, m));
  const cloneFor = (e) => { const c = G.clone(e); delete c.id; delete c.tag; return c; };

  // ================= 그리기 =================
  def("LINE", ["L"], "선", function* (api) {
    let r = yield api.point("첫 번째 점 지정:");
    if (!r.pt) return;
    const first = r.pt;
    let p = first;
    const made = [];
    while (true) {
      const pr = made.length >= 2 ? "다음 점 지정 또는 [닫기(C)/명령 취소(U)]:" : "다음 점 지정 또는 [명령 취소(U)]:";
      r = yield api.point(pr, { base: p, rubber: false, preview: (q) => ({ type: "line", a: p, b: q }) });
      if (r.pt) {
        if (G.dist(p, r.pt) < 1e-9) { api.print("같은 점을 두 번 찍어 길이 0인 선은 만들지 않았습니다."); continue; }
        made.push(api.add({ type: "line", a: p, b: r.pt }));
        p = r.pt;
        continue;
      }
      if (r.kw === "U") {
        const e = made.pop();
        if (e) { api.remove(e.id); p = e.a; api.event("lineUndo"); } else api.print("더 이상 취소할 선분이 없습니다.");
        continue;
      }
      if (r.kw === "C") {
        if (made.length >= 2) { api.add({ type: "line", a: p, b: first }); api.event("lineClose"); }
        return;
      }
      return;
    }
  });

  def("PLINE", ["PL"], "폴리선", function* (api, eng) {
    let r = yield api.point("시작점 지정:");
    if (!r.pt) return;
    api.print("현재의 선 폭은 0.0000임");
    const pts = [{ x: r.pt.x, y: r.pt.y, b: 0 }];
    let mode = "L";
    const endTan = () => {
      if (pts.length < 2) return 0;
      const a = pts[pts.length - 2], b = pts[pts.length - 1];
      const ch = G.ang(a, b), th = 4 * Math.atan(a.b || 0);
      return ch + th / 2;
    };
    const tanBulge = (p, q) => {
      let th = 2 * (G.ang(p, q) - endTan());
      th = Math.atan2(Math.sin(th), Math.cos(th));
      return Math.tan(th / 4);
    };
    const temp = (q, bul) => ({ type: "pline", pts: [...pts.slice(0, -1), { ...pts[pts.length - 1], b: bul }, { x: q.x, y: q.y, b: 0 }], closed: false });
    let closed = false;
    loop: while (true) {
      const p = pts[pts.length - 1];
      if (mode === "L") {
        const pr = pts.length >= 3 ? "다음 점 지정 또는 [호(A)/닫기(C)/반폭(H)/길이(L)/명령 취소(U)/폭(W)]:" : "다음 점 지정 또는 [호(A)/반폭(H)/길이(L)/명령 취소(U)/폭(W)]:";
        r = yield api.point(pr, { base: p, rubber: false, preview: (q) => temp(q, 0) });
        if (r.pt) { if (G.dist(p, r.pt) > 1e-9) { p.b = 0; pts.push({ x: r.pt.x, y: r.pt.y, b: 0 }); } continue; }
        switch (r.kw) {
          case "A": mode = "A"; continue;
          case "C": if (pts.length >= 3) { closed = true; pts[pts.length - 1].b = 0; break loop; } continue;
          case "U": if (pts.length > 1) pts.pop(); continue;
          case "L": {
            const n = yield api.number("선의 길이 지정:", { base: p });
            if (n.value != null) { const a = pts.length >= 2 ? endTan() : 0; const q = G.polar(p, a, n.value); pts.push({ x: q.x, y: q.y, b: 0 }); }
            continue;
          }
          case "W": case "H": api.print("이 연습장은 폭 0 폴리선만 그립니다."); continue;
          default: break loop;
        }
      } else {
        r = yield api.point("호의 끝점 지정 또는 [각도(A)/중심(CE)/닫기(CL)/방향(D)/반폭(H)/선(L)/반지름(R)/두 번째 점(S)/명령 취소(U)/폭(W)]:", { base: p, rubber: false, preview: (q) => temp(q, tanBulge(p, q)) });
        if (r.pt) { if (G.dist(p, r.pt) > 1e-9) { p.b = tanBulge(p, r.pt); pts.push({ x: r.pt.x, y: r.pt.y, b: 0 }); } continue; }
        switch (r.kw) {
          case "L": mode = "L"; continue;
          case "CL": if (pts.length >= 2) { const q = pts[0]; pts[pts.length - 1].b = tanBulge(p, q); closed = true; break loop; } continue;
          case "U": if (pts.length > 1) pts.pop(); continue;
          case "S": {
            const s = yield api.point("호의 두 번째 점 지정:", { base: p });
            if (!s.pt) continue;
            const e = yield api.point("호의 끝점 지정:", { base: s.pt, preview: (q) => { const c = arc3(p, s.pt, q); return c ? temp(q, c.bulge) : null; } });
            if (!e.pt) continue;
            const c = arc3(p, s.pt, e.pt);
            if (c) { p.b = c.bulge; pts.push({ x: e.pt.x, y: e.pt.y, b: 0 }); }
            continue;
          }
          case "W": case "H": api.print("이 연습장은 폭 0 폴리선만 그립니다."); continue;
          case "A": case "CE": case "D": case "R": api.print("이 옵션은 연습장에서 생략했습니다. 끝점을 찍거나 두 번째 점(S)을 쓰세요."); continue;
          default: break loop;
        }
      }
    }
    if (pts.length >= 2) api.add({ type: "pline", pts, closed });
  });
  // 세 점을 지나는 호의 볼록값
  function arc3(p1, p2, p3) {
    const c = circum(p1, p2, p3);
    if (!c) return null;
    const ccw = G.cross(G.sub(p2, p1), G.sub(p3, p2)) > 0;
    let sw = G.ccwSweep(G.ang(c.c, p1), G.ang(c.c, p3));
    if (!ccw) sw = -(G.TAU - sw);
    return { ...c, bulge: Math.tan(sw / 4), ccw };
  }
  function circum(a, b, c) {
    const d = 2 * (a.x * (b.y - c.y) + b.x * (c.y - a.y) + c.x * (a.y - b.y));
    if (Math.abs(d) < 1e-12) return null;
    const a2 = a.x * a.x + a.y * a.y, b2 = b.x * b.x + b.y * b.y, c2 = c.x * c.x + c.y * c.y;
    const x = (a2 * (b.y - c.y) + b2 * (c.y - a.y) + c2 * (a.y - b.y)) / d;
    const y = (a2 * (c.x - b.x) + b2 * (a.x - c.x) + c2 * (b.x - a.x)) / d;
    const cc = { x, y };
    return { c: cc, r: G.dist(cc, a) };
  }

  function rectPl(p1, p2, o = {}) {
    const rot = o.rot || 0;
    const u = { x: Math.cos(rot), y: Math.sin(rot) }, v = G.perp(u);
    const d = G.sub(p2, p1);
    const w = G.dot(d, u), h = G.dot(d, v);
    const P = (x, y) => G.add(p1, G.add(G.mul(u, x), G.mul(v, y)));
    const f = o.fillet || 0, c1 = o.cham1 || 0, c2 = o.cham2 ?? c1;
    const sx = Math.sign(w) || 1, sy = Math.sign(h) || 1;
    const ccw = sx * sy > 0;
    let pts;
    const k = f || c1;
    if (k && Math.abs(w) > 2 * Math.max(f, c1) && Math.abs(h) > 2 * Math.max(f, c2 || f)) {
      const kx = (f || c1) * sx, ky = (f || c2) * sy;
      const b = f ? (ccw ? 1 : -1) * Math.tan(Math.PI / 8) : 0;
      pts = [
        { ...P(kx, 0), b: 0 }, { ...P(w - kx, 0), b }, { ...P(w, ky), b: 0 }, { ...P(w, h - ky), b },
        { ...P(w - kx, h), b: 0 }, { ...P(kx, h), b }, { ...P(0, h - ky), b: 0 }, { ...P(0, ky), b },
      ];
    } else pts = [P(0, 0), P(w, 0), P(w, h), P(0, h)].map((p) => ({ ...p, b: 0 }));
    return { type: "pline", pts, closed: true };
  }
  def("RECTANG", ["REC", "RECTANGLE"], "직사각형", function* (api, eng) {
    const o = (eng.rectOpt ||= { fillet: 0, cham1: 0, cham2: 0 });
    if (o.fillet) api.print(`현재 직사각형 모드: 모깎기=${f4(o.fillet)}`);
    else if (o.cham1) api.print(`현재 직사각형 모드: 모따기=${f4(o.cham1)} x ${f4(o.cham2)}`);
    let r;
    while (true) {
      r = yield api.point("첫 번째 구석점 지정 또는 [모따기(C)/고도(E)/모깎기(F)/두께(T)/폭(W)]:");
      if (r.kw === "F") { const n = yield api.number(`직사각형의 모깎기 반지름 지정 <${f4(o.fillet)}>:`, { def: o.fillet }); o.fillet = n.value ?? o.fillet; o.cham1 = 0; continue; }
      if (r.kw === "C") {
        const a = yield api.number(`직사각형의 첫 번째 모따기 거리 지정 <${f4(o.cham1)}>:`, { def: o.cham1 });
        const b = yield api.number(`직사각형의 두 번째 모따기 거리 지정 <${f4(a.value ?? o.cham1)}>:`, { def: a.value ?? o.cham1 });
        o.cham1 = a.value ?? 0; o.cham2 = b.value ?? o.cham1; o.fillet = 0; continue;
      }
      if (r.kw) { api.print("고도·두께·폭은 3D·출력용 옵션이라 연습장에서는 생략합니다."); continue; }
      break;
    }
    if (!r.pt) return;
    const p1 = r.pt;
    let opt = { ...o, rot: 0 };
    while (true) {
      r = yield api.point("다른 구석점 지정 또는 [영역(A)/치수(D)/회전(R)]:", { base: p1, rubber: false, preview: (q) => rectPl(p1, q, opt) });
      if (r.pt) { api.add(rectPl(p1, r.pt, opt)); return; }
      if (r.kw === "D") {
        const L = yield api.number(`직사각형의 길이 지정 <${f4(eng.recL || 10)}>:`, { def: eng.recL || 10 });
        const W = yield api.number(`직사각형의 폭 지정 <${f4(eng.recW || 10)}>:`, { def: eng.recW || 10 });
        eng.recL = L.value ?? 10; eng.recW = W.value ?? 10;
        const q = yield api.point("다른 구석점 지정 또는 [영역(A)/치수(D)/회전(R)]:", { base: p1, rubber: false, preview: (c) => rectPl(p1, corner(c), opt) });
        const corner = (c) => { const u = { x: Math.cos(opt.rot), y: Math.sin(opt.rot) }, v = G.perp(u), d = G.sub(c, p1); return G.add(p1, G.add(G.mul(u, (Math.sign(G.dot(d, u)) || 1) * eng.recL), G.mul(v, (Math.sign(G.dot(d, v)) || 1) * eng.recW))); };
        api.add(rectPl(p1, q.pt ? corner(q.pt) : G.add(p1, { x: eng.recL, y: eng.recW }), opt));
        return;
      }
      if (r.kw === "R") { const a = yield api.number("회전 각도 지정 또는 [점 선택(P)] <0>:", { base: p1, angle: true, def: 0 }); opt.rot = G.rad(a.value || 0); continue; }
      if (r.kw === "A") { api.print("영역(A) 옵션은 생략했습니다. 치수(D)를 쓰세요."); continue; }
      return;
    }
  });

  // 두 곡선에 접하고 반지름 r인 원(TTR)
  function ttr(e1, p1, e2, p2, r) {
    const off = (e, sgnList) => {
      const out = [];
      if (e.type === "line") {
        const n = G.perp(G.unit(G.sub(e.b, e.a)));
        for (const s of [1, -1]) { const o = G.mul(n, r * s); out.push({ k: "L", a: G.add(e.a, o), b: G.add(e.b, o), ext: true }); }
      } else if (e.type === "circle" || e.type === "arc") {
        out.push({ k: "C", c: e.c, r: e.r + r });
        if (e.r - r > 1e-9) out.push({ k: "C", c: e.c, r: e.r - r });
        if (r - e.r > 1e-9) out.push({ k: "C", c: e.c, r: r - e.r });
      }
      return out;
    };
    const tp = (e, c) => (e.type === "line" ? G.segClosest({ k: "L", a: G.add(e.a, G.mul(G.sub(e.a, e.b), 1e6)), b: G.add(e.b, G.mul(G.sub(e.b, e.a), 1e6)) }, c).pt : G.polar(e.c, G.ang(e.c, c), e.r));
    let best = null;
    for (const a of off(e1)) for (const b of off(e2)) {
      for (const c of G.intersect(a, b, true, true)) {
        const score = G.dist(tp(e1, c), p1) + G.dist(tp(e2, c), p2);
        if (!best || score < best.score) best = { c, score };
      }
    }
    return best && best.c;
  }
  // 세 직선에 접하는 원(TTT)
  function ttt(ls, picks) {
    const nl = ls.map((l) => { const n = G.perp(G.unit(G.sub(l.b, l.a))); return { n, d: G.dot(n, l.a) }; });
    let best = null;
    for (const s1 of [1, -1]) for (const s2 of [1, -1]) for (const s3 of [1, -1]) {
      const s = [s1, s2, s3];
      // n·c - s r = d
      const A = nl.map((L, i) => [L.n.x, L.n.y, -s[i]]), B = nl.map((L) => L.d);
      const x = solve3(A, B);
      if (!x || x[2] <= 1e-9) continue;
      const c = { x: x[0], y: x[1] };
      const score = ls.reduce((acc, l, i) => { const n = nl[i].n; const t = G.sub(c, G.mul(n, G.dot(n, c) - nl[i].d)); return acc + G.dist(t, picks[i]); }, 0);
      if (!best || score < best.score) best = { c, r: x[2], score };
    }
    return best;
  }
  function solve3(A, B) {
    const m = A.map((r, i) => [...r, B[i]]);
    for (let c = 0; c < 3; c++) {
      let p = c;
      for (let r = c + 1; r < 3; r++) if (Math.abs(m[r][c]) > Math.abs(m[p][c])) p = r;
      if (Math.abs(m[p][c]) < 1e-12) return null;
      [m[c], m[p]] = [m[p], m[c]];
      for (let r = 0; r < 3; r++) if (r !== c) { const f = m[r][c] / m[c][c]; for (let k = c; k < 4; k++) m[r][k] -= f * m[c][k]; }
    }
    return [m[0][3] / m[0][0], m[1][3] / m[1][1], m[2][3] / m[2][2]];
  }

  def("CIRCLE", ["C"], "원", function* (api, eng) {
    const r = yield api.point("원에 대한 중심점 지정 또는 [3점(3P)/2점(2P)/Ttr - 접선 접선 반지름(T)]:", { kws: ["3P", "2P", "T", "TTT"] });
    const lastR = eng.lastCircleR || 10;
    if (r.pt) {
      const c = r.pt;
      const q = yield api.point(`원의 반지름 지정 또는 [지름(D)] <${f4(lastR)}>:`, { base: c, acceptNumber: true, preview: (p) => ({ type: "circle", c, r: G.dist(c, p) }) });
      let rad;
      if (q.kw === "D") {
        const d = yield api.point(`원의 지름을 지정함 <${f4(lastR * 2)}>:`, { base: c, acceptNumber: true, preview: (p) => ({ type: "circle", c, r: G.dist(c, p) / 2 }) });
        rad = d.value != null ? d.value / 2 : d.pt ? G.dist(c, d.pt) / 2 : d.enter ? lastR : null;
        api.event("circle:D");
      } else rad = q.value != null ? q.value : q.pt ? G.dist(c, q.pt) : q.enter ? lastR : null;
      if (rad > 1e-9) { eng.lastCircleR = rad; api.add({ type: "circle", c, r: rad }); api.event("circle:CR"); }
      return;
    }
    if (r.kw === "3P" || r.kw === "TTT") {
      if (r.kw === "TTT") {
        api.print("접선, 접선, 접선: 원이 닿을 세 직선을 차례로 클릭하세요.");
        const ls = [], pk = [];
        for (const n of ["첫 번째", "두 번째", "세 번째"]) {
          const p = yield api.pick(`원의 ${n} 접점에 대한 객체 위의 점 지정:`, { filter: (e) => e.type === "line" });
          if (!p.id) return;
          ls.push(api.get(p.id)); pk.push(p.pt);
        }
        const s = ttt(ls, pk);
        if (!s) { api.print("세 선에 접하는 원이 없습니다."); return; }
        api.add({ type: "circle", c: s.c, r: s.r }); api.event("circle:TTT");
        return;
      }
      const a = yield api.point("원 위의 첫 번째 점 지정:");
      if (!a.pt) return;
      const b = yield api.point("원 위의 두 번째 점 지정:", { base: a.pt });
      if (!b.pt) return;
      const c = yield api.point("원 위의 세 번째 점 지정:", { base: b.pt, rubber: false, preview: (p) => { const cc = circum(a.pt, b.pt, p); return cc && { type: "circle", ...cc }; } });
      if (!c.pt) return;
      const cc = circum(a.pt, b.pt, c.pt);
      if (!cc) { api.print("세 점이 한 직선 위에 있어 원을 만들 수 없습니다."); return; }
      api.add({ type: "circle", ...cc }); api.event("circle:3P");
      return;
    }
    if (r.kw === "2P") {
      const a = yield api.point("원 지름의 첫 번째 끝점을 지정:");
      if (!a.pt) return;
      const b = yield api.point("원 지름의 두 번째 끝점을 지정:", { base: a.pt, preview: (p) => ({ type: "circle", c: G.mid(a.pt, p), r: G.dist(a.pt, p) / 2 }) });
      if (!b.pt) return;
      api.add({ type: "circle", c: G.mid(a.pt, b.pt), r: G.dist(a.pt, b.pt) / 2 }); api.event("circle:2P");
      return;
    }
    if (r.kw === "T") {
      const p1 = yield api.pick("원의 첫 번째 접점에 대한 객체 위의 점 지정:", { filter: (e) => ["line", "circle", "arc"].includes(e.type) });
      if (!p1.id) return;
      const p2 = yield api.pick("원의 두 번째 접점에 대한 객체 위의 점 지정:", { filter: (e) => ["line", "circle", "arc"].includes(e.type) });
      if (!p2.id) return;
      const n = yield api.number(`원의 반지름 지정 <${f4(lastR)}>:`, { def: lastR });
      const rad = n.value ?? lastR;
      const c = ttr(api.get(p1.id), p1.pt, api.get(p2.id), p2.pt, rad);
      if (!c) { api.print("원이 존재하지 않습니다."); return; }
      eng.lastCircleR = rad;
      api.add({ type: "circle", c, r: rad }); api.event("circle:TTR");
    }
  });

  function arcFrom(c, s, e, ccw = true) {
    const a = G.ang(c, s), b = G.ang(c, e), r = G.dist(c, s);
    return ccw ? { type: "arc", c, r, a0: a, a1: b } : { type: "arc", c, r, a0: b, a1: a };
  }
  function arcByAngle(c, s, deg) {
    const r = G.dist(c, s), a = G.ang(c, s), th = G.rad(deg);
    return th >= 0 ? { type: "arc", c, r, a0: a, a1: a + th } : { type: "arc", c, r, a0: a + th, a1: a };
  }
  function arcSER(s, e, R) {
    const ch = G.dist(s, e);
    if (Math.abs(R) < ch / 2 - 1e-9) return null;
    const h = Math.sqrt(Math.max(0, R * R - (ch * ch) / 4));
    const n = G.perp(G.unit(G.sub(e, s)));
    const c = G.add(G.mid(s, e), G.mul(n, R > 0 ? h : -h));
    return arcFrom(c, s, e, true);
  }
  function arcSEA(s, e, deg) {
    const th = G.rad(deg), ch = G.dist(s, e);
    if (Math.abs(Math.sin(th / 2)) < 1e-9) return null;
    const R = ch / 2 / Math.sin(Math.abs(th) / 2);
    const h = Math.sqrt(Math.max(0, R * R - (ch * ch) / 4));
    const n = G.perp(G.unit(G.sub(e, s)));
    const big = Math.abs(th) > Math.PI;
    const side = (th > 0 ? 1 : -1) * (big ? -1 : 1);
    const c = G.add(G.mid(s, e), G.mul(n, side * h));
    return th > 0 ? arcFrom(c, s, e, true) : arcFrom(c, s, e, false);
  }
  def("ARC", ["A"], "호", function* (api) {
    const r = yield api.point("호의 시작점 지정 또는 [중심(C)]:");
    const ends = function* (c, s) {
      const e = yield api.point("호의 끝점 지정(Ctrl 키를 누른 채로 방향 전환) 또는 [각도(A)/현의 길이(L)]:", { base: c, preview: (p) => arcFrom(c, s, p) });
      if (e.pt) { api.add(arcFrom(c, s, e.pt)); api.event("arc:SCE"); return; }
      if (e.kw === "A") { const a = yield api.number("사이각 지정(Ctrl 키를 누른 채로 방향 전환):", { base: c, angle: true }); if (a.value != null) { api.add(arcByAngle(c, s, a.value)); api.event("arc:SCA"); } return; }
      if (e.kw === "L") {
        const L = yield api.number("현의 길이 지정:", { base: s });
        const R = G.dist(c, s);
        if (L.value != null && L.value <= 2 * R) { api.add(arcByAngle(c, s, G.deg(2 * Math.asin(L.value / (2 * R))))); api.event("arc:SCL"); }
      }
    };
    if (r.kw === "C") {
      const c = yield api.point("호의 중심점 지정:");
      if (!c.pt) return;
      const s = yield api.point("호의 시작점 지정:", { base: c.pt });
      if (!s.pt) return;
      yield* ends(c.pt, s.pt);
      return;
    }
    if (!r.pt) return;
    const s = r.pt;
    const r2 = yield api.point("호의 두 번째 점 지정 또는 [중심(C)/끝(E)]:", { base: s });
    if (r2.pt) {
      const p2 = r2.pt;
      const r3 = yield api.point("호의 끝점 지정:", { base: p2, rubber: false, preview: (p) => { const cc = arc3(s, p2, p); return cc && arcFrom(cc.c, s, p, cc.ccw); } });
      if (!r3.pt) return;
      const cc = arc3(s, p2, r3.pt);
      if (!cc) { api.print("세 점이 한 직선 위에 있어 호를 만들 수 없습니다."); return; }
      api.add(arcFrom(cc.c, s, r3.pt, cc.ccw)); api.event("arc:3P");
      return;
    }
    if (r2.kw === "C") {
      const c = yield api.point("호의 중심점 지정:", { base: s });
      if (!c.pt) return;
      yield* ends(c.pt, s);
      return;
    }
    if (r2.kw === "E") {
      const e = yield api.point("호의 끝점 지정:", { base: s });
      if (!e.pt) return;
      const r4 = yield api.point("호의 중심점 지정(Ctrl 키를 누른 채로 방향 전환) 또는 [각도(A)/방향(D)/반지름(R)]:", { base: e.pt, preview: (p) => arcFrom(p, s, e.pt) });
      if (r4.pt) { api.add(arcFrom(r4.pt, s, e.pt)); api.event("arc:SEC"); return; }
      if (r4.kw === "R") {
        const R = yield api.number("호의 반지름 지정(Ctrl 키를 누른 채로 방향 전환):", { base: e.pt });
        const a = R.value != null && arcSER(s, e.pt, R.value);
        if (a) { api.add(a); api.event("arc:SER"); } else api.print("반지름이 두 점 사이 거리의 절반보다 작습니다.");
        return;
      }
      if (r4.kw === "A") {
        const A = yield api.number("사이각 지정(Ctrl 키를 누른 채로 방향 전환):", { base: s, angle: true });
        const a = A.value != null && arcSEA(s, e.pt, A.value);
        if (a) { api.add(a); api.event("arc:SEA"); }
        return;
      }
      if (r4.kw === "D") {
        const d = yield api.point("호의 시작점에 대한 접선 방향 지정(Ctrl 키를 누른 채로 방향 전환):", { base: s });
        if (!d.pt) return;
        const t = G.ang(s, d.pt);
        let th = 2 * (G.ang(s, e.pt) - t);
        th = Math.atan2(Math.sin(th), Math.cos(th));
        const a = arcSEA(s, e.pt, G.deg(th));
        if (a) { api.add(a); api.event("arc:SED"); }
      }
    }
  });

  function polygonPts(c, R, n, a0) {
    const pts = [];
    for (let i = 0; i < n; i++) { const p = G.polar(c, a0 + (i * G.TAU) / n, R); pts.push({ x: p.x, y: p.y, b: 0 }); }
    return { type: "pline", pts, closed: true };
  }
  def("POLYGON", ["POL"], "폴리곤(정다각형)", function* (api, eng) {
    const n0 = eng.polyN || 4;
    const nn = yield api.number(`면의 수 입력 <${n0}>:`, { def: n0 });
    const n = Math.round(nn.value ?? n0);
    if (!(n >= 3 && n <= 1024)) { api.print("면의 수는 3에서 1024 사이여야 합니다."); return; }
    eng.polyN = n;
    const r = yield api.point("다각형의 중심을 지정 또는 [모서리(E)]:");
    if (r.kw === "E") {
      const a = yield api.point("모서리의 첫 번째 끝점 지정:");
      if (!a.pt) return;
      const mk = (b) => {
        const side = G.dist(a.pt, b), R = side / (2 * Math.sin(Math.PI / n));
        const mid = G.mid(a.pt, b), ap = side / (2 * Math.tan(Math.PI / n));
        const c = G.add(mid, G.mul(G.perp(G.unit(G.sub(b, a.pt))), ap));
        return polygonPts(c, R, n, G.ang(c, a.pt));
      };
      const b = yield api.point("모서리의 두 번째 끝점 지정:", { base: a.pt, preview: mk });
      if (b.pt) { api.add(mk(b.pt)); api.event("polygon:E"); }
      return;
    }
    if (!r.pt) return;
    const c = r.pt;
    const m = yield api.kw(`옵션을 입력 [원에 내접(I)/원에 외접(C)] <${eng.polyMode || "I"}>:`, { def: eng.polyMode || "I" });
    const mode = m.kw === "C" ? "C" : "I";
    eng.polyMode = mode;
    const mk = (p, typed) => {
      const d = typed != null ? typed : G.dist(c, p);
      const R = mode === "I" ? d : d / Math.cos(Math.PI / n);
      let a0;
      if (typed != null) a0 = G.rad(270) - Math.PI / n;
      else a0 = mode === "I" ? G.ang(c, p) : G.ang(c, p) + Math.PI / n;
      return polygonPts(c, R, n, a0);
    };
    const q = yield api.point("원의 반지름 지정:", { base: c, acceptNumber: true, preview: (p) => mk(p) });
    if (q.value != null) api.add(mk(null, q.value));
    else if (q.pt) api.add(mk(q.pt));
    else return;
    api.event("polygon:" + mode);
  });

  function normEllipse(c, major, ratio) {
    if (ratio > 1) { const m2 = G.mul(G.perp(major), ratio); return { type: "ellipse", c, major: m2, ratio: 1 / ratio }; }
    return { type: "ellipse", c, major, ratio: Math.max(1e-6, ratio) };
  }
  def("ELLIPSE", ["EL"], "타원", function* (api, eng) {
    const iso = eng.t.iso;
    const r = yield api.point(`타원의 축 끝점 지정 또는 [호(A)/중심(C)${iso ? "/등각원(I)" : ""}]:`);
    let c, major;
    if (r.kw === "I" && iso) {
      const cc = yield api.point("등각원의 중심 지정:");
      if (!cc.pt) return;
      const plane = eng.t.isoplane;
      const ang = [G.rad(120), 0, G.rad(60)][plane];
      const mk = (rad) => ({ type: "ellipse", c: cc.pt, major: G.polar({ x: 0, y: 0 }, ang, rad * Math.sqrt(1.5)), ratio: Math.sqrt(1 / 3) });
      const q = yield api.point("등각원의 반지름 지정 또는 [지름(D)]:", { base: cc.pt, acceptNumber: true, preview: (p) => mk(G.dist(cc.pt, p)) });
      let rad = q.value != null ? q.value : q.pt ? G.dist(cc.pt, q.pt) : null;
      if (q.kw === "D") { const d = yield api.number("등각원의 지름 지정:", { base: cc.pt }); rad = d.value != null ? d.value / 2 : null; }
      if (rad > 0) { api.add(mk(rad)); api.event("ellipse:iso"); }
      return;
    }
    let arcMode = false;
    let first = r;
    if (r.kw === "A") { arcMode = true; first = yield api.point("타원형 호의 축 끝점 지정 또는 [중심(C)]:"); }
    if (first.kw === "C") {
      const cc = yield api.point("타원의 중심 지정:");
      if (!cc.pt) return;
      c = cc.pt;
      const e = yield api.point("축의 끝점 지정:", { base: c });
      if (!e.pt) return;
      major = G.sub(e.pt, c);
      api.event("ellipse:C");
    } else if (first.pt) {
      const e2 = yield api.point("축의 다른 끝점 지정:", { base: first.pt });
      if (!e2.pt) return;
      c = G.mid(first.pt, e2.pt);
      major = G.sub(e2.pt, c);
      api.event("ellipse:axis");
    } else return;
    const L = G.len(major);
    const q = yield api.point("다른 축으로 거리를 지정 또는 [회전(R)]:", { base: c, acceptNumber: true, preview: (p) => normEllipse(c, major, G.dist(c, p) / L) });
    let el;
    if (q.kw === "R") { const a = yield api.number("장축 주위로 회전 지정:", { base: c, angle: true }); el = normEllipse(c, major, Math.cos(G.rad(a.value || 0))); }
    else if (q.value != null) el = normEllipse(c, major, q.value / L);
    else if (q.pt) el = normEllipse(c, major, G.dist(c, q.pt) / L);
    else return;
    if (arcMode) {
      const toParam = (p) => { const u = G.unit(el.major), v = G.perp(u), d = G.sub(p, el.c); return Math.atan2(G.dot(d, v) / el.ratio, G.dot(d, u)); };
      const s = yield api.point("시작 각도 지정 또는 [매개변수(P)]:", { base: c });
      if (!s.pt) return;
      const t0 = toParam(s.pt);
      const e = yield api.point("끝 각도 지정 또는 [매개변수(P)/사이각(I)]:", { base: c, preview: (p) => ({ ...el, t0, t1: toParam(p) }) });
      if (!e.pt) return;
      el.t0 = t0; el.t1 = toParam(e.pt);
      api.event("ellipse:arc");
    }
    api.add(el);
  });

  // ================= 수정 =================
  def("ERASE", ["E"], "지우기", function* (api) {
    const ids = yield* getSel(api);
    const gone = ids.map((id) => api.remove(id)).filter(Boolean);
    api.doc.erased = gone;
    if (gone.length) api.print(`${gone.length}개 객체를 지웠습니다. 되살리려면 OOPS 또는 U.`);
    api.event("erase");
  });
  def("OOPS", [], "지운 객체 복원", function* (api) {
    const g = api.doc.erased || [];
    if (!g.length) { api.print("OOPS로 복원할 객체가 없습니다."); return; }
    g.forEach((e) => { const c = G.clone(e); delete c.id; api.add(c); });
    api.doc.erased = [];
    api.print(`${g.length}개 객체를 복원했습니다.`);
  });

  function* baseSecond(api, ids, pr1, pr2, previewFn) {
    const r = yield api.point(pr1);
    if (r.kw === "D" || r.enter) {
      const d = yield api.point("변위 지정 <0.0000, 0.0000, 0.0000>:", { acceptNumber: false });
      if (!d.pt) return null;
      return { d: d.pt };
    }
    if (!r.pt) return null;
    const base = r.pt;
    const r2 = yield api.point(pr2, { base, preview: (q) => previewFn(G.sub(q, base)) });
    if (r2.pt) return { base, d: G.sub(r2.pt, base) };
    if (r2.enter) return { base, d: base };
    return null;
  }
  def("MOVE", ["M"], "이동", function* (api) {
    const ids = yield* getSel(api);
    if (!ids.length) return;
    const res = yield* baseSecond(api, ids, "기준점 지정 또는 [변위(D)] <변위>:", "두 번째 점 지정 또는 <첫 번째 점을 변위로 사용>:", (d) => moved(api, ids, M.tr(d.x, d.y)));
    if (!res) return;
    ids.forEach((id) => { const e = api.get(id); if (e) api.replace(id, G.xform(e, M.tr(res.d.x, res.d.y))); });
    api.event("move");
  });
  def("COPY", ["CO", "CP"], "복사", function* (api) {
    const ids = yield* getSel(api);
    if (!ids.length) return;
    api.print("현재 설정: 복사 모드 = 다중(M)");
    const r = yield api.point("기준점 지정 또는 [변위(D)/모드(O)] <변위>:");
    let base;
    if (r.kw === "D" || r.enter) {
      const d = yield api.point("변위 지정 <0.0000, 0.0000, 0.0000>:");
      if (d.pt) { ids.forEach((id) => api.add(cloneFor(G.xform(api.get(id), M.tr(d.pt.x, d.pt.y))))); api.event("copy"); }
      return;
    }
    if (r.kw === "O") { api.print("이 연습장은 다중 복사 모드만 씁니다."); }
    if (!r.pt) return;
    base = r.pt;
    const sets = [];
    let first = true;
    while (true) {
      const pr = first ? "두 번째 점 지정 또는 [배열(A)] <첫 번째 점을 변위로 사용>:" : "두 번째 점 지정 또는 [배열(A)/종료(E)/명령 취소(U)] <종료>:";
      const q = yield api.point(pr, { base, preview: (p) => moved(api, ids, M.tr(p.x - base.x, p.y - base.y)) });
      if (q.pt) { sets.push(ids.map((id) => api.add(cloneFor(G.xform(api.get(id), M.tr(q.pt.x - base.x, q.pt.y - base.y)))).id)); api.event("copy"); first = false; continue; }
      if (q.kw === "U") { const s = sets.pop(); if (s) s.forEach((id) => api.remove(id)); continue; }
      if (q.kw === "A") {
        const n = yield api.number("배열할 항목 수 입력:", { def: 2 });
        const cnt = Math.max(2, Math.round(n.value || 2));
        const s = yield api.point("두 번째 점 지정 또는 [맞춤(F)]:", { base, preview: (p) => { const out = []; for (let i = 1; i < cnt; i++) out.push(...moved(api, ids, M.tr((p.x - base.x) * i, (p.y - base.y) * i))); return out; } });
        let fit = false, pt = s.pt;
        if (s.kw === "F") { const f = yield api.point("두 번째 점 지정 또는 [배열(A)]:", { base }); pt = f.pt; fit = true; }
        if (pt) {
          const d = G.sub(pt, base), step = fit ? G.mul(d, 1 / (cnt - 1)) : d;
          const made = [];
          for (let i = 1; i < cnt; i++) ids.forEach((id) => made.push(api.add(cloneFor(G.xform(api.get(id), M.tr(step.x * i, step.y * i)))).id));
          sets.push(made); api.event("copy:array");
        }
        first = false;
        continue;
      }
      if (q.enter && first) { ids.forEach((id) => api.add(cloneFor(G.xform(api.get(id), M.tr(base.x, base.y))))); }
      return;
    }
  });
  def("MIRROR", ["MI"], "대칭", function* (api) {
    const ids = yield* getSel(api);
    if (!ids.length) return;
    const a = yield api.point("대칭선의 첫 번째 점 지정:");
    if (!a.pt) return;
    const b = yield api.point("대칭선의 두 번째 점 지정:", { base: a.pt, preview: (q) => (G.dist(a.pt, q) > 1e-9 ? moved(api, ids, M.mirror(a.pt, q)) : null) });
    if (!b.pt || G.dist(a.pt, b.pt) < 1e-9) return;
    const k = yield api.kw("원본 객체를 지우시겠습니까? [예(Y)/아니오(N)] <아니오>:", { def: "N" });
    const m = M.mirror(a.pt, b.pt);
    if (k.kw === "Y") { ids.forEach((id) => api.replace(id, G.xform(api.get(id), m))); api.event("mirror:erase"); }
    else { ids.forEach((id) => api.add(cloneFor(G.xform(api.get(id), m)))); api.event("mirror:keep"); }
  });
  def("ROTATE", ["RO"], "회전", function* (api) {
    const ids = yield* getSel(api);
    if (!ids.length) return;
    api.print("현재 UCS에서 양의 각도: 측정 방향=시계 반대 방향  기준 방향=0");
    const b = yield api.point("기준점 지정:");
    if (!b.pt) return;
    const base = b.pt;
    let copy = false;
    while (true) {
      const r = yield api.number("회전 각도 지정 또는 [복사(C)/참조(R)] <0>:", { base, angle: true, def: 0, preview: (p) => moved(api, ids, M.rot(base, G.ang(base, p))) });
      if (r.kw === "C") { copy = true; api.print("선택한 객체의 사본을 회전합니다."); continue; }
      let deg;
      if (r.kw === "R") {
        const ref = yield api.number("참조 각도를 지정 <0>:", { angle: true, def: 0 });
        const refDeg = ref.value || 0;
        const nw = yield api.number("새 각도 지정 또는 [점(P)] <0>:", { base, angle: true, def: 0, preview: (p) => moved(api, ids, M.rot(base, G.ang(base, p) - G.rad(refDeg))) });
        let nd = nw.value || 0;
        if (nw.kw === "P") {
          const p1 = yield api.number("첫 번째 점 지정:", { angle: true });
          nd = p1.value || 0;
        }
        deg = nd - refDeg;
        api.event("rotate:ref");
      } else deg = r.value || 0;
      const m = M.rot(base, G.rad(deg));
      if (copy) ids.forEach((id) => api.add(cloneFor(G.xform(api.get(id), m))));
      else ids.forEach((id) => api.replace(id, G.xform(api.get(id), m)));
      api.event(copy ? "rotate:copy" : "rotate");
      return;
    }
  });
  def("SCALE", ["SC"], "축척", function* (api) {
    const ids = yield* getSel(api);
    if (!ids.length) return;
    const b = yield api.point("기준점 지정:");
    if (!b.pt) return;
    const base = b.pt;
    let copy = false;
    while (true) {
      const r = yield api.number("축척 비율 지정 또는 [복사(C)/참조(R)]:", { base, preview: (p) => moved(api, ids, M.scale(base, Math.max(1e-6, G.dist(base, p)))) });
      if (r.kw === "C") { copy = true; api.print("선택한 객체의 사본에 축척을 적용합니다."); continue; }
      let k;
      if (r.kw === "R") {
        const ref = yield api.number("참조 길이 지정 <1.0000>:", { def: 1 });
        const rl = ref.value || 1;
        const nw = yield api.number("새 길이 지정 또는 [점(P)] <1.0000>:", { base, def: 1, preview: (p) => moved(api, ids, M.scale(base, Math.max(1e-6, G.dist(base, p) / rl))) });
        let nl = nw.value || 1;
        if (nw.kw === "P") { const q = yield api.number("첫 번째 점 지정:"); nl = q.value || 1; }
        k = nl / rl;
        api.event("scale:ref");
      } else k = r.value;
      if (!(k > 0)) { api.print("축척 비율은 0보다 커야 합니다."); return; }
      const m = M.scale(base, k);
      if (copy) ids.forEach((id) => api.add(cloneFor(G.xform(api.get(id), m))));
      else ids.forEach((id) => api.replace(id, G.xform(api.get(id), m)));
      api.event(copy ? "scale:copy" : "scale");
      return;
    }
  });

  def("OFFSET", ["O"], "간격띄우기", function* (api, eng) {
    const st = (eng.offOpt ||= { d: null, erase: false });
    api.print(`현재 설정: 원본 지우기=${st.erase ? "예" : "아니오"}  도면층=원본  OFFSETGAPTYPE=0`);
    let dist = st.d, through = st.d == null;
    while (true) {
      const r = yield api.number(`간격띄우기 거리 지정 또는 [통과점(T)/지우기(E)/도면층(L)] <${st.d == null ? "통과점" : f4(st.d)}>:`, { def: st.d });
      if (r.kw === "T") { through = true; st.d = null; break; }
      if (r.kw === "E") { const k = yield api.kw("간격띄우기 후 원본 객체를 지우시겠습니까? [예(Y)/아니오(N)] <아니오>:", { def: "N" }); st.erase = k.kw === "Y"; continue; }
      if (r.kw === "L") { yield api.kw("간격띄우기 객체의 도면층 옵션 입력 [현재(C)/원본(S)] <원본>:", { def: "S" }); continue; }
      if (r.value != null) { if (r.value <= 0) { api.print("값은 0보다 커야 합니다."); continue; } dist = r.value; st.d = dist; through = false; break; }
      if (r.enter) break;
      return;
    }
    const made = [];
    const can = (e) => ["line", "circle", "arc", "pline"].includes(e.type);
    while (true) {
      const p = yield api.pick("간격띄우기할 객체 선택 또는 [종료(E)/명령 취소(U)] <종료>:", { filter: can });
      if (p.kw === "U") { const x = made.pop(); if (x) api.remove(x); continue; }
      if (!p.id) return;
      let src = api.get(p.id);
      let multi = false;
      while (true) {
        const pr = through ? "통과점 지정 또는 [종료(E)/다중(M)/명령 취소(U)] <종료>:" : "간격띄우기할 면의 점 지정 또는 [종료(E)/다중(M)/명령 취소(U)] <종료>:";
        const s = yield api.point(pr, { preview: (q) => { const d = through ? G.hitDist(src, q) : dist; return d > 1e-9 ? G.offset(src, d, q) : null; } });
        if (s.kw === "M") { multi = true; continue; }
        if (s.kw === "U") { const x = made.pop(); if (x) api.remove(x); continue; }
        if (s.kw === "E") return;
        if (!s.pt) break;
        const d = through ? G.hitDist(src, s.pt) : dist;
        const o = G.offset(src, d, s.pt);
        if (!o) { api.print("그 거리로는 간격띄우기할 수 없습니다(반지름이 0 이하가 됨)."); break; }
        const c = cloneFor(o);
        c.layer = src.layer;
        const added = api.add(c);
        made.push(added.id);
        api.event("offset");
        if (st.erase && !multi) api.remove(src.id);
        if (!multi) break;
        src = added;
      }
    }
  });

  // --- 자르기·연장 ---
  function cutterSegsFor(api, target, edgeIds) {
    const ents = edgeIds ? edgeIds.map((id) => api.get(id)).filter(Boolean) : api.eng.flat();
    const out = [];
    for (const e of ents) {
      if (e.id === target.id || e._src === target.id) continue;
      if (e.type === "text") continue;
      out.push(...G.segs(e));
    }
    return out;
  }
  function trimOne(api, e, pk, edgeIds) {
    if (e.type === "ellipse") { api.print("타원 자르기는 이 연습장에서 지원하지 않습니다."); return false; }
    const params = G.cutParams(e, cutterSegsFor(api, e, edgeIds));
    const u = G.paramOf(e, pk).u;
    const range = G.paramRange(e);
    const closed = G.isClosed(e);
    const inner = params.filter((x) => (closed ? true : x > 1e-9 && x < range - 1e-9));
    if (!inner.length) {
      if (!edgeIds) { api.remove(e.id); api.print("교차하는 경계가 없어 객체 전체를 지웠습니다(빠른 작업 모드)."); return true; }
      api.print("객체가 절단 모서리와 교차하지 않습니다.");
      return false;
    }
    if (closed) {
      const ps = e.type === "circle" ? inner.map((x) => x % 1) : inner;
      if (ps.length < 2) { api.print("닫힌 객체는 두 곳 이상에서 잘려야 자를 수 있습니다."); return false; }
      const sorted = [...ps].sort((a, b) => a - b);
      const R = e.type === "circle" ? 1 : range;
      let lo = sorted.filter((x) => x < u).pop();
      let hi = sorted.find((x) => x > u);
      if (lo == null) lo = sorted[sorted.length - 1];
      if (hi == null) hi = sorted[0];
      const piece = G.subEntity(e, hi % R, lo % R);
      if (!piece) return false;
      api.replace(e.id, piece);
      return true;
    }
    const lo = inner.filter((x) => x < u).pop();
    const hi = inner.find((x) => x > u);
    const a = lo != null ? G.subEntity(e, 0, lo) : null;
    const b = hi != null ? G.subEntity(e, hi, range) : null;
    if (a && b) { api.replace(e.id, a); const c = cloneFor(b); c.layer = e.layer; if (e.tag) c.tag = e.tag + "b"; api.add(c); }
    else if (a) api.replace(e.id, a);
    else if (b) api.replace(e.id, b);
    else api.remove(e.id);
    return true;
  }
  function trimInRect(api, rect) {
    let n = 0;
    for (const e of api.eng.flatSelectable().filter((x) => CURVE(x) && G.entCrossRect(x, rect))) {
      const params = G.cutParams(e, cutterSegsFor(api, e));
      const range = e.type === "circle" ? 1 : G.paramRange(e);
      const cuts = [0, ...params.filter((x) => x > 1e-9 && x < range - 1e-9), range];
      const keep = [];
      for (let i = 0; i < cuts.length - 1; i++) {
        const mid = G.pointAtParam(e, (cuts[i] + cuts[i + 1]) / 2);
        if (!G.ptInRect(mid, rect)) keep.push([cuts[i], cuts[i + 1]]);
      }
      if (keep.length === cuts.length - 1) continue;
      n++;
      if (!keep.length) { api.remove(e.id); continue; }
      const pieces = keep.map(([a, b]) => G.subEntity(e, a, b)).filter(Boolean);
      api.replace(e.id, pieces[0]);
      pieces.slice(1).forEach((p) => { const c = cloneFor(p); c.layer = e.layer; api.add(c); });
    }
    return n;
  }
  function extendOne(api, e, pk, edgeIds) {
    const segs = cutterSegsFor(api, e, edgeIds);
    if (e.type === "line") {
      const atB = G.dist(pk, e.b) < G.dist(pk, e.a);
      const L = { k: "L", a: e.a, b: e.b };
      let best = null;
      for (const s of segs) for (const p of G.intersect(L, s, true, false)) {
        const t = G.segParam(L, p);
        if (atB ? t > 1 + 1e-9 : t < -1e-9) { const d = atB ? t - 1 : -t; if (!best || d < best.d) best = { p, d }; }
      }
      if (!best) { api.print("경계 모서리와 만나지 않습니다."); return false; }
      api.replace(e.id, { ...G.clone(e), [atB ? "b" : "a"]: best.p });
      return true;
    }
    if (e.type === "arc") {
      const pa0 = G.polar(e.c, e.a0, e.r), pa1 = G.polar(e.c, e.a1, e.r);
      const atEnd = G.dist(pk, pa1) < G.dist(pk, pa0);
      const circ = { k: "C", c: e.c, r: e.r };
      let best = null;
      const sw = G.ccwSweep(e.a0, e.a1);
      for (const s of segs) for (const p of G.intersect(circ, s, false, false)) {
        const a = G.ang(e.c, p);
        const d = atEnd ? G.nang(a - e.a1) : G.nang(e.a0 - a);
        if (d > 1e-9 && d < G.TAU - sw - 1e-9 && (!best || d < best.d)) best = { a, d };
      }
      if (!best) { api.print("경계 모서리와 만나지 않습니다."); return false; }
      api.replace(e.id, { ...G.clone(e), [atEnd ? "a1" : "a0"]: best.a });
      return true;
    }
    if (e.type === "pline" && !e.closed) {
      const n = e.pts.length;
      const atEnd = G.dist(pk, e.pts[n - 1]) < G.dist(pk, e.pts[0]);
      const i0 = atEnd ? n - 2 : 0;
      if (Math.abs(e.pts[i0].b || 0) > 1e-9) { api.print("호로 끝나는 폴리선은 연장하지 않습니다."); return false; }
      const L = atEnd ? { k: "L", a: e.pts[n - 2], b: e.pts[n - 1] } : { k: "L", a: e.pts[1], b: e.pts[0] };
      let best = null;
      for (const s of segs) for (const p of G.intersect(L, s, true, false)) {
        const t = G.segParam(L, p);
        if (t > 1 + 1e-9 && (!best || t < best.t)) best = { p, t };
      }
      if (!best) { api.print("경계 모서리와 만나지 않습니다."); return false; }
      const ne = G.clone(e);
      const idx = atEnd ? n - 1 : 0;
      ne.pts[idx] = { ...ne.pts[idx], x: best.p.x, y: best.p.y };
      api.replace(e.id, ne);
      return true;
    }
    api.print("이 객체는 연장할 수 없습니다.");
    return false;
  }
  function* trimExtend(api, eng, isTrim) {
    api.print("현재 설정: 투영=UCS, 모서리=없음, 모드=빠른 작업");
    let edges = null;
    const stack = [];
    while (true) {
      const pr = isTrim
        ? "자를 객체 선택 또는 Shift 키를 누른 채 선택하여 연장 또는 [절단 모서리(T)/걸치기(C)/모드(O)/프로젝트(P)/지우기(R)/명령 취소(U)]:"
        : "연장할 객체 선택 또는 Shift 키를 누른 채 선택하여 자르기 또는 [경계 모서리(B)/걸치기(C)/모드(O)/프로젝트(P)/명령 취소(U)]:";
      const r = yield api.pick(pr, { filter: CURVE, windowFallback: true, kws: ["T", "B", "C", "O", "P", "R", "U"] });
      if (r.kw === "U") { const s = stack.pop(); if (s) api.doc.restore(s); else api.print("명령 취소할 것이 없습니다."); continue; }
      if (r.kw === "T" || r.kw === "B") {
        const s = yield api.select(`${isTrim ? "절단 모서리" : "경계 모서리"} 선택 ...\n객체 선택 또는 <모두 선택>:`, { pickfirst: false });
        edges = s.ids && s.ids.length ? s.ids : null;
        api.print(edges ? `모서리 ${edges.length}개로 표준 모드` : "모든 객체를 모서리로 사용합니다.");
        continue;
      }
      if (r.kw === "R") { const s = yield api.select("지울 객체 선택:", { pickfirst: false }); (s.ids || []).forEach((id) => api.remove(id)); continue; }
      if (r.kw === "O" || r.kw === "P") { api.print("이 연습장은 빠른 작업 모드와 UCS 투영만 씁니다."); continue; }
      if (r.kw === "C") {
        const a = yield api.point("첫 번째 구석 지정:");
        if (!a.pt) continue;
        const b = yield api.point("반대 구석 지정:", { base: a.pt, rubber: false, preview: (q) => rectPl(a.pt, q) });
        if (!b.pt) continue;
        stack.push(api.doc.snapshot());
        const n = trimInRect(api, G.rectOf(a.pt, b.pt));
        api.print(`${n}개 객체를 잘랐습니다.`);
        if (n) api.event("trim");
        continue;
      }
      if (r.rect) {
        stack.push(api.doc.snapshot());
        if (isTrim) { const n = trimInRect(api, r.rect); if (n) api.event("trim"); api.print(`${n}개 객체를 잘랐습니다.`); }
        continue;
      }
      if (!r.id) return;
      const e = api.get(r.id);
      if (!e) continue;
      stack.push(api.doc.snapshot());
      const doTrim = isTrim !== !!r.shift;
      const ok = doTrim ? trimOne(api, e, r.pt, edges) : extendOne(api, e, r.pt, edges);
      if (ok) api.event(doTrim ? "trim" : "extend"); else stack.pop();
    }
  }
  def("TRIM", ["TR"], "자르기", function* (api, eng) { yield* trimExtend(api, eng, true); });
  def("EXTEND", ["EX"], "연장", function* (api, eng) { yield* trimExtend(api, eng, false); });

  // --- 모깎기·모따기 ---
  function filletPline(e, R, cham) {
    const n = e.pts.length;
    const segsN = e.closed ? n : n - 1;
    if (segsN < 2) return null;
    const out = [];
    let count = 0;
    const P = (i) => e.pts[(i + n) % n];
    for (let i = 0; i < n; i++) {
      const v = P(i);
      const interior = e.closed || (i > 0 && i < n - 1);
      const inB = P(i - 1).b || 0, outB = v.b || 0;
      if (!interior || Math.abs(inB) > 1e-9 || Math.abs(outB) > 1e-9) { out.push({ ...v }); continue; }
      const a = P(i - 1), b = P(i + 1);
      const din = G.unit(G.sub(v, a)), dout = G.unit(G.sub(b, v));
      const turn = G.cross(din, dout);
      const cosT = G.dot(din, dout);
      if (Math.abs(turn) < 1e-9) { out.push({ ...v }); continue; }
      const phi = Math.acos(Math.max(-1, Math.min(1, -cosT)));
      let t1, t2;
      if (cham) { t1 = cham[0]; t2 = cham[1]; }
      else { t1 = t2 = R / Math.tan(phi / 2); }
      const lin = G.dist(a, v) * (e.closed || i - 1 > 0 ? 0.5 : 1), lout = G.dist(v, b) * (e.closed || i + 1 < n - 1 ? 0.5 : 1);
      if (t1 > lin + 1e-9 || t2 > lout + 1e-9) { out.push({ ...v }); continue; }
      const T1 = G.sub(v, G.mul(din, t1)), T2 = G.add(v, G.mul(dout, t2));
      const bul = cham ? 0 : Math.sign(turn) * Math.tan((Math.PI - phi) / 4);
      out.push({ x: T1.x, y: T1.y, b: bul });
      out.push({ x: T2.x, y: T2.y, b: 0 });
      count++;
    }
    return { pl: { ...G.clone(e), pts: out }, count };
  }
  def("FILLET", ["F"], "모깎기", function* (api, eng) {
    const st = (eng.filletOpt ||= { r: 0, trim: true });
    api.print(`현재 설정: 모드 = ${st.trim ? "자르기" : "자르지 않기"}, 반지름 = ${f4(st.r)}`);
    let multi = false;
    const stack = [];
    const can = (e) => e.type === "line" || e.type === "pline";
    while (true) {
      const r = yield api.pick("첫 번째 객체 선택 또는 [명령 취소(U)/폴리선(P)/반지름(R)/자르기(T)/다중(M)]:", { filter: can });
      if (r.kw === "R") { const n = yield api.number(`모깎기 반지름 지정 <${f4(st.r)}>:`, { def: st.r }); if (n.value != null && n.value >= 0) st.r = n.value; continue; }
      if (r.kw === "T") { const k = yield api.kw("자르기 모드 옵션 입력 [자르기(T)/자르지 않기(N)] <자르기>:", { def: "T" }); st.trim = k.kw !== "N"; continue; }
      if (r.kw === "M") { multi = true; continue; }
      if (r.kw === "U") { const s = stack.pop(); if (s) api.doc.restore(s); continue; }
      if (r.kw === "P") {
        const p = yield api.pick("2D 폴리선 선택 또는 [반지름(R)]:", { filter: (e) => e.type === "pline" });
        if (!p.id) continue;
        const res = filletPline(api.get(p.id), st.r);
        if (res) { stack.push(api.doc.snapshot()); api.replace(p.id, res.pl); api.print(`${res.count} 선이 모깎기됨`); if (res.count) api.event("fillet:P"); }
        if (!multi) return;
        continue;
      }
      if (!r.id) return;
      const e1 = api.get(r.id);
      const r2 = yield api.pick("두 번째 객체 선택 또는 Shift 키를 누른 채 선택하여 구석 적용 또는 [반지름(R)]:", { filter: can });
      if (r2.kw === "R") { const n = yield api.number(`모깎기 반지름 지정 <${f4(st.r)}>:`, { def: st.r }); if (n.value != null) st.r = n.value; if (!multi) return; continue; }
      if (!r2.id) return;
      const e2 = api.get(r2.id);
      const R = r2.shift ? 0 : st.r;
      if (e1.type === "pline" || e2.type === "pline") {
        if (e1.id === e2.id) {
          // 같은 폴리선의 인접한 두 선분
          const u1 = Math.floor(G.paramOf(e1, r.pt).u), u2 = Math.floor(G.paramOf(e1, r2.pt).u);
          const n = e1.pts.length;
          let v = null;
          if (Math.abs(u1 - u2) === 1) v = Math.max(u1, u2);
          else if (e1.closed && Math.abs(u1 - u2) === n - 1) v = 0;
          if (v == null) { api.print("인접한 두 선분을 고르세요."); if (!multi) return; continue; }
          const sub = { ...G.clone(e1), pts: e1.pts, closed: e1.closed };
          const res = filletOneVertex(sub, v, R);
          if (res) { stack.push(api.doc.snapshot()); api.replace(e1.id, res); api.event("fillet"); } else api.print("반지름이 너무 큽니다.");
        } else api.print("폴리선은 폴리선(P) 옵션으로 모깎기하세요.");
        if (!multi) return;
        continue;
      }
      if (e1.id === e2.id) { api.print("같은 선은 모깎기할 수 없습니다."); continue; }
      const res = G.filletLines(e1, r.pt, e2, r2.pt, R);
      if (res.error) { api.print(res.error); if (!multi) return; continue; }
      stack.push(api.doc.snapshot());
      if (st.trim) {
        if (res.l1) api.replace(e1.id, res.l1); else api.remove(e1.id);
        if (res.l2) api.replace(e2.id, res.l2); else api.remove(e2.id);
      }
      if (res.arc) { res.arc.layer = e1.layer; api.add(res.arc); }
      api.event(R > 0 ? "fillet" : "fillet:0");
      if (!multi) return;
    }
  });
  function filletOneVertex(e, v, R) {
    const one = { ...G.clone(e) };
    const res = filletPline({ ...one, pts: one.pts.map((p, i) => ({ ...p, _k: i === v })) }, R);
    if (!res) return null;
    // 다른 꼭짓점은 되돌림: 간단히 선택 꼭짓점만 적용
    const out = [];
    const n = e.pts.length;
    const P = (i) => e.pts[(i + n) % n];
    for (let i = 0; i < n; i++) {
      if (i !== v) { out.push({ x: P(i).x, y: P(i).y, b: P(i).b || 0 }); continue; }
      const a = P(i - 1), c = P(i + 1), p = P(i);
      const din = G.unit(G.sub(p, a)), dout = G.unit(G.sub(c, p));
      const turn = G.cross(din, dout);
      const phi = Math.acos(Math.max(-1, Math.min(1, -G.dot(din, dout))));
      const t = R / Math.tan(phi / 2);
      if (t > G.dist(a, p) + 1e-9 || t > G.dist(p, c) + 1e-9) return null;
      if (R <= 1e-9) { out.push({ x: p.x, y: p.y, b: 0 }); continue; }
      const T1 = G.sub(p, G.mul(din, t)), T2 = G.add(p, G.mul(dout, t));
      out.push({ x: T1.x, y: T1.y, b: Math.sign(turn) * Math.tan((Math.PI - phi) / 4) });
      out.push({ x: T2.x, y: T2.y, b: 0 });
    }
    return { ...G.clone(e), pts: out };
  }
  def("CHAMFER", ["CHA"], "모따기", function* (api, eng) {
    const st = (eng.chamOpt ||= { d1: 0, d2: 0, len: 0, ang: 0, method: "D", trim: true });
    api.print(`(자르기 모드) 현재 모따기 거리1 = ${f4(st.d1)}, 거리2 = ${f4(st.d2)}`);
    let multi = false;
    const can = (e) => e.type === "line" || e.type === "pline";
    while (true) {
      const r = yield api.pick("첫 번째 선 선택 또는 [명령 취소(U)/폴리선(P)/거리(D)/각도(A)/자르기(T)/메서드(E)/다중(M)]:", { filter: can });
      if (r.kw === "D") {
        const a = yield api.number(`첫 번째 모따기 거리 지정 <${f4(st.d1)}>:`, { def: st.d1 });
        st.d1 = a.value ?? st.d1;
        const b = yield api.number(`두 번째 모따기 거리 지정 <${f4(st.d1)}>:`, { def: st.d1 });
        st.d2 = b.value ?? st.d1;
        st.method = "D";
        continue;
      }
      if (r.kw === "A") {
        const a = yield api.number(`첫 번째 선의 모따기 길이 지정 <${f4(st.len)}>:`, { def: st.len });
        st.len = a.value ?? st.len;
        const b = yield api.number(`첫 번째 선으로부터 모따기 각도 지정 <${G.fmt(st.ang)}>:`, { def: st.ang, angle: true });
        st.ang = b.value ?? st.ang;
        st.method = "A";
        continue;
      }
      if (r.kw === "E") { const k = yield api.kw(`자르기 방법 입력 [거리(D)/각도(A)] <${st.method === "A" ? "각도" : "거리"}>:`, { def: st.method }); st.method = k.kw === "A" ? "A" : "D"; continue; }
      if (r.kw === "T") { const k = yield api.kw("자르기 모드 옵션 입력 [자르기(T)/자르지 않기(N)] <자르기>:", { def: "T" }); st.trim = k.kw !== "N"; continue; }
      if (r.kw === "M") { multi = true; continue; }
      if (r.kw === "P") {
        const p = yield api.pick("2D 폴리선 선택:", { filter: (e) => e.type === "pline" });
        if (!p.id) continue;
        const res = filletPline(api.get(p.id), 0, [st.d1, st.d2]);
        if (res) { api.replace(p.id, res.pl); api.print(`${res.count} 선이 모따기됨`); api.event("chamfer:P"); }
        if (!multi) return;
        continue;
      }
      if (!r.id) return;
      const e1 = api.get(r.id);
      const r2 = yield api.pick("두 번째 선 선택 또는 Shift 키를 누른 채 선택하여 구석 적용 또는 [거리(D)/각도(A)/메서드(M)]:", { filter: (e) => e.type === "line" });
      if (!r2.id) return;
      const e2 = api.get(r2.id);
      if (e1.type !== "line") { api.print("선 두 개를 고르거나 폴리선(P) 옵션을 쓰세요."); return; }
      const res = r2.shift ? G.filletLines(e1, r.pt, e2, r2.pt, 0)
        : st.method === "A" ? G.chamferLines(e1, r.pt, e2, r2.pt, st.len, 0, G.rad(st.ang)) : G.chamferLines(e1, r.pt, e2, r2.pt, st.d1, st.d2);
      if (res.error) { api.print(res.error); if (!multi) return; continue; }
      if (st.trim) {
        if (res.l1) api.replace(e1.id, res.l1); else api.remove(e1.id);
        if (res.l2) api.replace(e2.id, res.l2); else api.remove(e2.id);
      }
      if (res.line) { res.line.layer = e1.layer; api.add(res.line); }
      api.event(st.method === "A" ? "chamfer:A" : "chamfer");
      if (!multi) return;
    }
  });

  // --- 길이 조정 ---
  function lengthenTo(e, pk, mode, val) {
    if (e.type === "line") {
      const L = G.dist(e.a, e.b);
      const atB = G.dist(pk, e.b) <= G.dist(pk, e.a);
      let nl = mode === "DE" ? L + val : mode === "P" ? (L * val) / 100 : val;
      if (nl <= 1e-9) return null;
      const dir = atB ? G.unit(G.sub(e.b, e.a)) : G.unit(G.sub(e.a, e.b));
      const fixed = atB ? e.a : e.b;
      return { ...G.clone(e), [atB ? "b" : "a"]: G.add(fixed, G.mul(dir, nl)) };
    }
    if (e.type === "arc") {
      const sw = G.ccwSweep(e.a0, e.a1), L = e.r * sw;
      const pa1 = G.polar(e.c, e.a1, e.r), pa0 = G.polar(e.c, e.a0, e.r);
      const atEnd = G.dist(pk, pa1) <= G.dist(pk, pa0);
      let nl = mode === "DE" ? L + val : mode === "P" ? (L * val) / 100 : val;
      const nsw = nl / e.r;
      if (nsw <= 1e-9 || nsw >= G.TAU) return null;
      return atEnd ? { ...G.clone(e), a1: e.a0 + nsw } : { ...G.clone(e), a0: e.a1 - nsw };
    }
    return null;
  }
  def("LENGTHEN", ["LEN"], "길이 조정", function* (api, eng) {
    const st = (eng.lenOpt ||= { mode: "T", DE: 0, P: 100, T: 1 });
    const can = (e) => e.type === "line" || e.type === "arc";
    let chosen = false;
    while (!chosen) {
      const r = yield api.pick(`측정할 객체 선택 또는 [증분(DE)/퍼센트(P)/합계(T)/동적(DY)] <${{ DE: "증분(DE)", P: "퍼센트(P)", T: "합계(T)", DY: "동적(DY)" }[st.mode]}>:`, { filter: can, kws: ["DE", "P", "T", "DY"] });
      if (r.id) { const e = api.get(r.id); api.print(`현재 길이: ${f4(G.length(e))}${e.type === "arc" ? `, 사이각: ${G.fmt(G.deg(G.ccwSweep(e.a0, e.a1)))}` : ""}`); api.event("lengthen:measure"); continue; }
      if (r.kw === "DE") { const n = yield api.number(`증분 길이 또는 [각도(A)] 입력 <${f4(st.DE)}>:`, { def: st.DE }); st.DE = n.value ?? st.DE; st.mode = "DE"; chosen = true; }
      else if (r.kw === "P") { const n = yield api.number(`퍼센트 길이 입력 <${f4(st.P)}>:`, { def: st.P }); st.P = n.value ?? st.P; st.mode = "P"; chosen = true; }
      else if (r.kw === "T") { const n = yield api.number(`전체 길이 또는 [각도(A)] 지정 <${f4(st.T)}>:`, { def: st.T }); st.T = n.value ?? st.T; st.mode = "T"; chosen = true; }
      else if (r.kw === "DY") { st.mode = "DY"; chosen = true; }
      else if (r.enter) chosen = true;
      else return;
    }
    const stack = [];
    while (true) {
      const r = yield api.pick("변경할 객체 선택 또는 [명령 취소(U)]:", { filter: can });
      if (r.kw === "U") { const s = stack.pop(); if (s) api.doc.restore(s); continue; }
      if (!r.id) return;
      const e = api.get(r.id);
      let ne;
      if (st.mode === "DY") {
        const q = yield api.point("새 끝점 지정:", { preview: (p) => lengthenDyn(e, r.pt, p) });
        if (!q.pt) continue;
        ne = lengthenDyn(e, r.pt, q.pt);
      } else ne = lengthenTo(e, r.pt, st.mode, st[st.mode]);
      if (!ne) { api.print("길이가 0 이하가 되어 바꿀 수 없습니다."); continue; }
      stack.push(api.doc.snapshot());
      api.replace(e.id, ne);
      api.event("lengthen:" + st.mode);
    }
  });
  function lengthenDyn(e, pk, p) {
    if (e.type === "line") {
      const atB = G.dist(pk, e.b) <= G.dist(pk, e.a);
      const fixed = atB ? e.a : e.b, dir = atB ? G.unit(G.sub(e.b, e.a)) : G.unit(G.sub(e.a, e.b));
      const t = G.dot(G.sub(p, fixed), dir);
      if (t <= 1e-9) return null;
      return { ...G.clone(e), [atB ? "b" : "a"]: G.add(fixed, G.mul(dir, t)) };
    }
    if (e.type === "arc") {
      const pa1 = G.polar(e.c, e.a1, e.r), pa0 = G.polar(e.c, e.a0, e.r);
      const atEnd = G.dist(pk, pa1) <= G.dist(pk, pa0);
      return atEnd ? { ...G.clone(e), a1: G.ang(e.c, p) } : { ...G.clone(e), a0: G.ang(e.c, p) };
    }
    return null;
  }

  // --- 끊기·결합 ---
  function breakEnt(api, e, p1, p2) {
    const u1 = G.paramOf(e, p1).u, u2 = G.paramOf(e, p2).u;
    const R = G.paramRange(e);
    if (e.type === "circle") {
      if (Math.abs(u1 - u2) < 1e-9) { api.print("원은 한 점에서 끊을 수 없습니다. 두 점을 지정하세요."); return false; }
      api.replace(e.id, G.subEntity(e, u2, u1));
      return true;
    }
    if (e.type === "pline" && e.closed) {
      if (Math.abs(u1 - u2) < 1e-9) { api.print("닫힌 폴리선은 두 점을 지정해 끊으세요."); return false; }
      api.replace(e.id, G.subEntity(e, u2, u1));
      return true;
    }
    const lo = Math.min(u1, u2), hi = Math.max(u1, u2);
    const a = lo > 1e-9 ? G.subEntity(e, 0, lo) : null;
    const b = hi < R - 1e-9 ? G.subEntity(e, hi, R) : null;
    if (a && b) { api.replace(e.id, a); const c = cloneFor(b); c.layer = e.layer; api.add(c); }
    else if (a) api.replace(e.id, a);
    else if (b) api.replace(e.id, b);
    else api.remove(e.id);
    return true;
  }
  def("BREAK", ["BR"], "끊기", function* (api, eng) {
    const r = yield api.pick("객체 선택:", { filter: CURVE });
    if (!r.id) return;
    const e = api.get(r.id);
    let p1 = G.paramOf(e, r.pt).pt;
    eng.lastPoint = p1;
    const r2 = yield api.point("두 번째 끊기점 지정 또는 [첫 번째 점(F)]:");
    let p2;
    if (r2.kw === "F") {
      const a = yield api.point("첫 번째 끊기점 지정:");
      if (!a.pt) return;
      p1 = a.pt;
      const b = yield api.point("두 번째 끊기점 지정:", { base: a.pt });
      if (!b.pt) return;
      p2 = b.pt;
      api.event("break:F");
    } else if (r2.pt) p2 = r2.pt;
    else return;
    if (breakEnt(api, e, p1, p2)) api.event(G.dist(G.paramOf(e, p1).pt, G.paramOf(e, p2).pt) < 1e-6 ? "break:point" : "break");
  });
  def("BREAKATPOINT", [], "점에서 끊기", function* (api) {
    const r = yield api.pick("객체 선택:", { filter: OPEN_CURVE });
    if (!r.id) return;
    const e = api.get(r.id);
    const p = yield api.point("끊기점 지정:");
    if (!p.pt) return;
    if (breakEnt(api, e, p.pt, p.pt)) api.event("break:point");
  });

  function toPlinePiece(e) {
    if (e.type === "line") return [{ x: e.a.x, y: e.a.y, b: 0 }, { x: e.b.x, y: e.b.y, b: 0 }];
    if (e.type === "arc") { const s = G.polar(e.c, e.a0, e.r), t = G.polar(e.c, e.a1, e.r); return [{ x: s.x, y: s.y, b: Math.tan(G.ccwSweep(e.a0, e.a1) / 4) }, { x: t.x, y: t.y, b: 0 }]; }
    if (e.type === "pline" && !e.closed) return e.pts.map((p) => ({ x: p.x, y: p.y, b: p.b || 0 }));
    return null;
  }
  function revPiece(pts) {
    const n = pts.length, out = [];
    for (let j = 0; j < n; j++) {
      const p = pts[n - 1 - j];
      const bSrc = j < n - 1 ? -(pts[n - 2 - j].b || 0) : 0;
      out.push({ x: p.x, y: p.y, b: bSrc });
    }
    return out;
  }
  def("JOIN", ["J"], "결합", function* (api) {
    const ids = yield* getSel(api, "한 번에 결합할 원본 객체 또는 여러 객체 선택:");
    if (!ids.length) return;
    const ents = ids.map((id) => api.get(id)).filter(Boolean);
    const tol = 1e-4;
    if (ents.length === 1 && ents[0].type === "arc") {
      const k = yield api.kw("결합할 객체가 하나입니다. 호를 원으로 닫으려면 [닫기(L)] 입력 <종료>:", { def: "X", kws: ["L", "X"] });
      if (k.kw === "L") { const a = ents[0]; api.replace(a.id, { type: "circle", c: a.c, r: a.r, layer: a.layer }); api.print("호를 원으로 변환했습니다."); api.event("join"); }
      return;
    }
    if (ents.length < 2) { api.print("결합하려면 객체를 두 개 이상 고르세요."); return; }
    // 1) 모두 한 직선 위의 선
    if (ents.every((e) => e.type === "line")) {
      const d = G.unit(G.sub(ents[0].b, ents[0].a)), o = ents[0].a;
      const col = ents.every((e) => Math.abs(G.cross(d, G.sub(e.a, o))) < tol && Math.abs(G.cross(d, G.sub(e.b, o))) < tol);
      if (col) {
        const iv = ents.map((e) => { const a = G.dot(G.sub(e.a, o), d), b = G.dot(G.sub(e.b, o), d); return [Math.min(a, b), Math.max(a, b)]; }).sort((x, y) => x[0] - y[0]);
        let hi = iv[0][1], gap = false;
        for (const [a, b] of iv.slice(1)) { if (a > hi + tol) gap = true; hi = Math.max(hi, b); }
        const lo = iv[0][0];
        if (gap) api.print("사이가 떨어진 선도 한 줄로 이었습니다(AutoCAD도 같은 직선 위의 선은 간격을 메워 결합합니다).");
        api.replace(ents[0].id, { ...G.clone(ents[0]), a: G.add(o, G.mul(d, lo)), b: G.add(o, G.mul(d, hi)) });
        ents.slice(1).forEach((e) => api.remove(e.id));
        api.print(`${ents.length}개의 선이 1개의 선으로 결합되었습니다`);
        api.event("join");
        return;
      }
    }
    // 2) 같은 원 위의 호
    if (ents.every((e) => e.type === "arc") && ents.every((e) => G.eq(e.c, ents[0].c, tol) && Math.abs(e.r - ents[0].r) < tol)) {
      let a0 = ents[0].a0, a1 = ents[0].a1, rest = ents.slice(1), progress = true;
      while (rest.length && progress) {
        progress = false;
        rest = rest.filter((e) => {
          if (Math.abs(G.nang(e.a0 - a1)) < 1e-6 || Math.abs(G.nang(e.a0 - a1) - G.TAU) < 1e-6) { a1 = e.a1; progress = true; return false; }
          if (Math.abs(G.nang(a0 - e.a1)) < 1e-6 || Math.abs(G.nang(a0 - e.a1) - G.TAU) < 1e-6) { a0 = e.a0; progress = true; return false; }
          return true;
        });
      }
      if (!rest.length) {
        const full = Math.abs(G.nang(a1 - a0)) < 1e-6;
        api.replace(ents[0].id, full ? { type: "circle", c: ents[0].c, r: ents[0].r } : { ...G.clone(ents[0]), a0, a1 });
        ents.slice(1).forEach((e) => api.remove(e.id));
        api.print(`${ents.length}개의 호가 ${full ? "원" : "1개의 호"}로 결합되었습니다`);
        api.event("join");
        return;
      }
    }
    // 3) 끝점이 이어진 것들 → 폴리선
    const pieces = ents.map((e) => ({ e, pts: toPlinePiece(e) })).filter((p) => p.pts);
    if (pieces.length < 2) { api.print("결합할 수 있는 객체가 아닙니다."); return; }
    let chain = pieces.shift().pts, used = [ents.find((e) => toPlinePiece(e))];
    let grew = true;
    while (grew) {
      grew = false;
      for (let i = 0; i < pieces.length; i++) {
        const p = pieces[i].pts, head = chain[0], tail = chain[chain.length - 1];
        if (G.eq(tail, p[0], tol)) chain = [...chain.slice(0, -1), { ...tail, b: p[0].b }, ...p.slice(1)];
        else if (G.eq(tail, p[p.length - 1], tol)) { const r = revPiece(p); chain = [...chain.slice(0, -1), { ...tail, b: r[0].b }, ...r.slice(1)]; }
        else if (G.eq(head, p[p.length - 1], tol)) chain = [...p.slice(0, -1), { ...p[p.length - 1], b: head.b }, ...chain.slice(1)];
        else if (G.eq(head, p[0], tol)) { const r = revPiece(p); chain = [...r.slice(0, -1), { ...r[r.length - 1], b: head.b }, ...chain.slice(1)]; }
        else continue;
        used.push(pieces[i].e);
        pieces.splice(i, 1);
        grew = true;
        break;
      }
    }
    if (used.length < 2) { api.print("끝점이 맞닿은 객체가 없어 결합하지 못했습니다. 객체 스냅(끝점)으로 붙여 그렸는지 확인하세요."); api.event("join:fail"); return; }
    let closed = false;
    if (G.eq(chain[0], chain[chain.length - 1], tol) && chain.length > 2) { chain.pop(); closed = true; }
    api.replace(used[0].id, { type: "pline", pts: chain, closed, layer: used[0].layer });
    used.slice(1).forEach((e) => api.remove(e.id));
    api.print(`${used.length}개 객체가 1개의 폴리선으로 결합되었습니다${pieces.length ? ` (${pieces.length}개는 떨어져 있어 제외)` : ""}`);
    api.event("join");
  });

  def("ALIGN", ["AL"], "정렬", function* (api) {
    const ids = yield* getSel(api);
    if (!ids.length) return;
    const s1 = yield api.point("첫 번째 근원점 지정:");
    if (!s1.pt) return;
    const d1 = yield api.point("첫 번째 대상점 지정:", { base: s1.pt });
    if (!d1.pt) return;
    const s2 = yield api.point("두 번째 근원점 지정 또는 <계속>:");
    if (!s2.pt) { ids.forEach((id) => api.replace(id, G.xform(api.get(id), M.tr(d1.pt.x - s1.pt.x, d1.pt.y - s1.pt.y)))); api.event("align"); return; }
    const d2 = yield api.point("두 번째 대상점 지정:", { base: s2.pt });
    if (!d2.pt) return;
    yield api.point("세 번째 근원점 지정 또는 <계속>:");
    const k = yield api.kw("정렬점을 기준으로 객체에 축척을 적용합니까? [예(Y)/아니오(N)] <아니오>:", { def: "N" });
    const th = G.ang(d1.pt, d2.pt) - G.ang(s1.pt, s2.pt);
    const sc = k.kw === "Y" ? G.dist(d1.pt, d2.pt) / Math.max(1e-12, G.dist(s1.pt, s2.pt)) : 1;
    const m = M.mul(M.tr(d1.pt.x, d1.pt.y), M.mul(M.rot({ x: 0, y: 0 }, th), M.mul(M.scale({ x: 0, y: 0 }, sc), M.tr(-s1.pt.x, -s1.pt.y))));
    ids.forEach((id) => api.replace(id, G.xform(api.get(id), m)));
    api.event(k.kw === "Y" ? "align:scale" : "align");
  });

  function stretchEnt(e, rects, d) {
    const inside = (p) => rects.some((r) => G.ptInRect(p, r));
    const mv = (p) => (inside(p) ? { ...p, x: p.x + d.x, y: p.y + d.y } : p);
    const all = (pts) => pts.every(inside);
    switch (e.type) {
      case "line": return { ...G.clone(e), a: mv(e.a), b: mv(e.b) };
      case "pline": return { ...G.clone(e), pts: e.pts.map((p) => ({ ...mv(p), b: p.b || 0 })) };
      case "arc": { const ends = G.endpoints(e); return all(ends) ? G.xform(e, M.tr(d.x, d.y)) : e; }
      case "circle": case "ellipse": return inside(e.c) ? G.xform(e, M.tr(d.x, d.y)) : e;
      case "text": return inside(e.p) ? G.xform(e, M.tr(d.x, d.y)) : e;
      case "dim": { const n = G.clone(e); for (const k of ["p1", "p2", "dp", "c"]) if (n[k] && inside(n[k])) n[k] = mv(n[k]); return n; }
      case "array": return inside(G.M.apply(e.M || G.M.id(), e.base)) ? G.xform(e, M.tr(d.x, d.y)) : e;
    }
    return e;
  }
  def("STRETCH", ["S"], "신축", function* (api, eng) {
    api.print("걸침 윈도우 또는 걸침 폴리곤으로 신축할 객체 선택...");
    eng.selWindows = [];
    const r = yield api.select("객체 선택:", { pickfirst: false, trackWindows: true });
    const ids = r.ids || [];
    const rects = (eng.selWindows || []).map((w) => w.rect);
    if (!ids.length) { api.print("선택된 객체가 없습니다."); return; }
    if (!rects.length) api.print("걸치기 창 없이 고른 객체는 통째로 이동합니다. 신축하려면 오른쪽→왼쪽으로 끌어 걸치기로 고르세요.");
    const apply = (d) => ids.map((id) => api.get(id)).filter(Boolean).map((e) => (rects.length ? stretchEnt(e, rects, d) : G.xform(e, M.tr(d.x, d.y))));
    const res = yield* baseSecond(api, ids, "기준점 지정 또는 [변위(D)] <변위>:", "두 번째 점 지정 또는 <첫 번째 점을 변위로 사용>:", apply);
    if (!res) return;
    const out = apply(res.d);
    ids.forEach((id, i) => api.replace(id, out[i]));
    api.event(rects.length ? "stretch" : "stretch:move");
  });

  // --- 배열 ---
  function bboxOfEnts(ents) { let bb = null; for (const e of ents) bb = G.bboxUnion(bb, G.bbox(e)); return bb; }
  function* arrayEditLoop(api, eng, arrId, isNew) {
    const up = (fn) => { const a = G.clone(api.get(arrId)); fn(a); api.replace(arrId, a); };
    while (true) {
      const a = api.get(arrId);
      if (!a) return;
      const p = a.p;
      let pr;
      if (a.kind === "rect") pr = "그립을 선택하여 배열을 편집하거나 [연관(AS)/기준점(B)/개수(COU)/간격두기(S)/열(COL)/행(R)/레벨(L)/종료(X)]<종료>:";
      else if (a.kind === "polar") pr = "그립을 선택하여 배열을 편집하거나 [연관(AS)/기준점(B)/항목(I)/사이의 각도(A)/채울 각도(F)/행(ROW)/레벨(L)/항목 회전(ROT)/종료(X)]<종료>:";
      else pr = "그립을 선택하여 배열을 편집하거나 [연관(AS)/메서드(M)/기준점(B)/접선 방향(T)/항목(I)/행(R)/레벨(L)/항목 정렬(A)/Z 방향(Z)/종료(X)]<종료>:";
      if (!isNew) pr = pr.replace("[연관(AS)/", "[원본(S)/대치(REP)/재설정(RES)/");
      const r = yield api.kw(pr, { def: "X" });
      const k = r.kw;
      if (!k || k === "X") return;
      if (k === "AS") { const q = yield api.kw("연관 배열 작성 [예(Y)/아니오(N)] <예>:", { def: "Y" }); up((x) => { x.assoc = q.kw !== "N"; }); continue; }
      if (k === "B") {
        const q = yield api.point(`기준점 지정 또는 [키 점(K)] <${a.kind === "path" ? "경로 곡선의 끝점" : "중심"}>:`);
        if (q.pt) { const inv = G.M.inv(a.M || G.M.id()); up((x) => { x.base = G.M.apply(inv, q.pt); }); api.event("array:base"); }
        continue;
      }
      if (a.kind === "rect") {
        if (k === "COU") {
          const c = yield api.number(`열 수 입력 또는 [표현식(E)] <${p.cols}>:`, { def: p.cols });
          const rr = yield api.number(`행 수 입력 또는 [표현식(E)] <${p.rows}>:`, { def: p.rows });
          up((x) => { x.p.cols = Math.max(1, Math.round(c.value ?? p.cols)); x.p.rows = Math.max(1, Math.round(rr.value ?? p.rows)); });
          api.event("array:count");
          continue;
        }
        if (k === "S") {
          const c = yield api.number(`열 사이의 거리 지정 또는 [단위 셀(U)] <${f4(p.dx)}>:`, { def: p.dx });
          const rr = yield api.number(`행 사이의 거리 지정 <${f4(p.dy)}>:`, { def: p.dy });
          up((x) => { x.p.dx = c.value ?? p.dx; x.p.dy = rr.value ?? p.dy; });
          api.event("array:spacing");
          continue;
        }
        if (k === "COL") {
          const c = yield api.number(`열 수 입력 또는 [표현식(E)] <${p.cols}>:`, { def: p.cols });
          const d = yield api.number(`열 사이의 거리 지정 또는 [전체(T)/표현식(E)] <${f4(p.dx)}>:`, { def: p.dx });
          up((x) => { x.p.cols = Math.max(1, Math.round(c.value ?? p.cols)); x.p.dx = d.value ?? p.dx; });
          continue;
        }
        if (k === "R") {
          const c = yield api.number(`행 수 입력 또는 [표현식(E)] <${p.rows}>:`, { def: p.rows });
          const d = yield api.number(`행 사이의 거리 지정 또는 [전체(T)/표현식(E)] <${f4(p.dy)}>:`, { def: p.dy });
          up((x) => { x.p.rows = Math.max(1, Math.round(c.value ?? p.rows)); x.p.dy = d.value ?? p.dy; });
          continue;
        }
      }
      if (a.kind === "polar") {
        if (k === "I") { const n = yield api.number(`배열의 항목 수 입력 또는 [표현식(E)] <${p.n}>:`, { def: p.n }); up((x) => { x.p.n = Math.max(1, Math.round(n.value ?? p.n)); }); api.event("array:count"); continue; }
        if (k === "A") {
          const cur = p.step != null ? G.deg(p.step) : G.deg(Math.abs(Math.abs(p.fill) - G.TAU) < 1e-9 ? p.fill / p.n : p.fill / Math.max(1, p.n - 1));
          const n = yield api.number(`항목 사이의 각도 지정 또는 [표현식(EX)] <${G.fmt(cur)}>:`, { def: cur });
          up((x) => { x.p.step = G.rad(n.value ?? cur); x.p.fill = x.p.step * Math.max(1, x.p.n - 1); });
          continue;
        }
        if (k === "F") { const n = yield api.number(`채울 각도 지정(+=ccw, -=cw) 또는 [표현식(EX)] <${G.fmt(G.deg(p.fill))}>:`, { def: G.deg(p.fill) }); up((x) => { x.p.fill = G.rad(n.value ?? G.deg(p.fill)); delete x.p.step; }); continue; }
        if (k === "ROT") { const q = yield api.kw("배열 항목 회전? [예(Y)/아니오(N)] <예>:", { def: "Y" }); up((x) => { x.p.rot = q.kw !== "N"; }); continue; }
      }
      if (a.kind === "path") {
        if (k === "M") { const q = yield api.kw(`경로 메서드 입력 [등분할(D)/길이 분할(M)] <${p.method === "measure" ? "길이 분할" : "등분할"}>:`, { def: p.method === "measure" ? "M" : "D" }); up((x) => { x.p.method = q.kw === "M" ? "measure" : "divide"; if (x.p.method === "measure" && !x.p.spacing) x.p.spacing = G.length(x.p.path) / Math.max(1, x.p.n - 1); }); continue; }
        if (k === "I") {
          if (p.method === "measure") {
            const d = yield api.number(`경로를 따라 항목 사이의 거리 지정 또는 [표현식(E)] <${f4(p.spacing)}>:`, { def: p.spacing });
            const sp = d.value ?? p.spacing;
            const max = Math.floor(G.length(p.path) / sp + 1e-9) + 1;
            const n = yield api.number(`항목 수 지정 또는 [전체 경로 채우기(F)/표현식(E)] <${max}>:`, { def: max });
            up((x) => { x.p.spacing = sp; x.p.n = Math.min(max, Math.max(1, Math.round(n.value ?? max))); });
          } else {
            const n = yield api.number(`경로를 따라 배열할 항목 수 입력 또는 [표현식(E)] <${p.n}>:`, { def: p.n });
            up((x) => { x.p.n = Math.max(1, Math.round(n.value ?? p.n)); });
          }
          api.event("array:count");
          continue;
        }
        if (k === "A") { const q = yield api.kw("배열된 항목을 경로에 정렬하시겠습니까? [예(Y)/아니오(N)] <예>:", { def: "Y" }); up((x) => { x.p.align = q.kw !== "N"; }); continue; }
      }
      if (k === "REP") {
        const s = yield api.select("대체 객체 선택:", { pickfirst: false });
        if (!s.ids || !s.ids.length) continue;
        const q = yield api.point("대체 객체의 기준점 지정 또는 [키 점(K)] <중심>:");
        const repl = s.ids.map((id) => api.get(id)).filter(Boolean);
        const bb = bboxOfEnts(repl);
        const bp = q.pt || { x: (bb.x0 + bb.x1) / 2, y: (bb.y0 + bb.y1) / 2 };
        // 원본 항목 기준점(배열 로컬)에 맞춰 옮겨 넣는다
        const target = a.srcBase || a.base;
        up((x) => { x.items = repl.map((e) => { const c = cloneFor(G.xform(e, M.tr(target.x - bp.x, target.y - bp.y))); delete c._src; return c; }); });
        api.print("배열의 모든 항목을 대체 객체로 바꿨습니다(원본 대치).");
        api.event("array:replace");
        continue;
      }
      if (k === "S") {
        api.print("원본 편집: 배열의 첫 번째 항목을 편집 상태로 꺼냈습니다. 고치거나 새 객체를 더한 뒤 ARRAYCLOSE를 입력하면 모든 항목에 반영됩니다.");
        const items = a.items.map((it) => { const c = cloneFor(G.xform(it, a.M || G.M.id())); c._arrEdit = a.id; return c; });
        eng.arrayEdit = { id: a.id, startId: api.doc.nextId };
        items.forEach((c) => api.add(c));
        api.event("array:source");
        return;
      }
      if (k === "RES") { api.print("배열 재설정: 개별 항목을 지우거나 대치한 기록이 없어서 바뀐 것이 없습니다."); api.event("array:reset"); continue; }
      api.print("이 옵션은 연습장에서 생략했습니다.");
    }
  }
  function* finishArray(api, arrId) {
    const a = api.get(arrId);
    if (a && a.assoc === false) {
      const items = G.expandArray(a).map((x) => { const c = cloneFor(x); delete c._src; return c; });
      api.remove(arrId);
      items.forEach((c) => api.add(c));
      api.print(`연관 없음: 항목 ${items.length}개를 개별 객체로 만들었습니다.`);
    } else if (a) api.print(`연관 배열이 만들어졌습니다(항목 ${G.arrayTransforms(a).length}개). 나중에 ARRAYEDIT로 개수·간격·원본을 바꿀 수 있습니다.`);
    yield* [];
  }
  function* makeArray(api, eng, kind, ids) {
    if (!ids) ids = yield* getSel(api);
    if (!ids.length) return;
    const items = ids.map((id) => api.get(id)).filter(Boolean).map((e) => cloneFor(e));
    const bb = bboxOfEnts(items);
    const w = Math.max(bb.x1 - bb.x0, 1), h = Math.max(bb.y1 - bb.y0, 1);
    const center = { x: (bb.x0 + bb.x1) / 2, y: (bb.y0 + bb.y1) / 2 };
    let arr;
    if (kind === "rect") {
      api.print("유형 = 직사각형  연관 = 예");
      arr = { type: "array", kind: "rect", items, base: center, srcBase: center, p: { cols: 4, rows: 3, dx: w * 1.5, dy: h * 1.5, ang: 0 }, M: G.M.id(), assoc: true };
    } else if (kind === "polar") {
      api.print("유형 = 원형  연관 = 예");
      let base = center;
      let c = yield api.point("배열의 중심점 지정 또는 [기준점(B)/회전축(A)]:");
      if (c.kw === "B") { const b = yield api.point("기준점 지정 또는 [키 점(K)] <중심>:"); if (b.pt) base = b.pt; c = yield api.point("배열의 중심점 지정 또는 [기준점(B)/회전축(A)]:"); }
      if (!c.pt) return;
      arr = { type: "array", kind: "polar", items, base, srcBase: base, p: { c: c.pt, n: 6, fill: G.TAU, rot: true }, M: G.M.id(), assoc: true };
    } else {
      api.print("유형 = 경로  연관 = 예");
      const pk = yield api.pick("경로 곡선 선택:", { filter: (e) => ["line", "arc", "pline", "circle"].includes(e.type) && !ids.includes(e.id) });
      if (!pk.id) return;
      const path = cloneFor(api.get(pk.id));
      const start = G.segStart(G.segs(path)[0]);
      const L = G.length(path);
      const n = Math.max(2, Math.min(30, Math.floor(L / (Math.max(w, h) * 1.5)) + 1));
      arr = { type: "array", kind: "path", items, base: start, srcBase: center, p: { path, n, method: "divide", align: true, spacing: L / Math.max(1, n - 1) }, M: G.M.id(), assoc: true };
    }
    ids.forEach((id) => api.remove(id));
    arr.layer = items[0].layer;
    const added = api.add(arr);
    api.event("array:" + kind);
    yield* arrayEditLoop(api, eng, added.id, true);
    yield* finishArray(api, added.id);
  }
  def("ARRAY", ["AR"], "배열", function* (api, eng) {
    const ids = yield* getSel(api);
    if (!ids.length) return;
    const k = yield api.kw("배열 유형 입력 [직사각형(R)/경로(PA)/원형(PO)] <직사각형>:", { def: "R" });
    const kind = k.kw === "PA" ? "path" : k.kw === "PO" ? "polar" : "rect";
    yield* makeArray(api, eng, kind, ids);
  });
  def("ARRAYRECT", [], "직사각형 배열", function* (api, eng) { yield* makeArray(api, eng, "rect"); });
  def("ARRAYPOLAR", [], "원형 배열", function* (api, eng) { yield* makeArray(api, eng, "polar"); });
  def("ARRAYPATH", [], "경로 배열", function* (api, eng) { yield* makeArray(api, eng, "path"); });
  def("ARRAYEDIT", [], "배열 편집", function* (api, eng) {
    const r = yield api.pick("배열 선택:", { filter: (e) => e.type === "array" });
    if (!r.id) return;
    yield* arrayEditLoop(api, eng, r.id, false);
  });
  def("ARRAYCLOSE", [], "배열 편집 저장", function* (api, eng) {
    const st = eng.arrayEdit;
    if (!st) { api.print("원본 편집 중인 배열이 없습니다. ARRAYEDIT → 원본(S)으로 시작하세요."); return; }
    const a = api.get(st.id);
    const k = yield api.kw("변경 사항을 배열에 저장 [저장(S)/취소(D)] <저장>:", { def: "S" });
    const editing = api.doc.ents.filter((e) => e._arrEdit === st.id || e.id >= st.startId);
    if (a && k.kw !== "D") {
      const inv = G.M.inv(a.M || G.M.id());
      const items = editing.map((e) => { const c = cloneFor(G.xform(e, inv)); delete c._arrEdit; return c; });
      if (items.length) { const n = G.clone(a); n.items = items; api.replace(a.id, n); }
      api.print("원본을 저장해 배열의 모든 항목에 반영했습니다.");
      api.event("array:sourceSave");
    }
    editing.forEach((e) => api.remove(e.id));
    eng.arrayEdit = null;
  });
  G.M.inv = (m) => {
    const det = m.a * m.d - m.b * m.c;
    const a = m.d / det, b = -m.b / det, c = -m.c / det, d = m.a / det;
    return { a, b, c, d, e: -(a * m.e + c * m.f), f: -(b * m.e + d * m.f) };
  };

  def("EXPLODE", ["X"], "분해", function* (api) {
    const ids = yield* getSel(api);
    let n = 0;
    for (const id of ids) {
      const e = api.get(id);
      let parts = null;
      if (e.type === "pline") parts = G.plineSegs(e).map((g) => (g.k === "L" ? { type: "line", a: g.a, b: g.b } : { type: "arc", c: g.c, r: g.r, a0: g.a0, a1: g.a0 + g.sw }));
      else if (e.type === "array") parts = G.expandArray(e).map((x) => { const c = cloneFor(x); delete c._src; return c; });
      else if (e.type === "dim") { const g = G.dimGeom(e); parts = [...g.lines.map((l) => ({ type: "line", a: l.a, b: l.b })), { type: "text", ...g.text }]; }
      if (!parts) continue;
      api.remove(id);
      parts.forEach((p) => { p.layer = p.layer || e.layer; api.add(p); });
      n++;
    }
    api.print(n ? `${n}개 객체를 분해했습니다.` : "분해할 수 있는 객체(폴리선·배열·치수)가 없습니다.");
    if (n) api.event("explode");
  });

  def("MATCHPROP", ["MA"], "특성 일치", function* (api) {
    const s = yield api.pick("원본 객체를 선택하십시오:");
    if (!s.id) return;
    const src = api.get(s.id);
    api.print("현재 활성 설정: 색상 도면층 선종류");
    while (true) {
      const t = yield api.pick("대상 객체를 선택 또는 [설정(S)]:");
      if (!t.id) return;
      const e = G.clone(api.get(t.id));
      e.layer = src.layer; e.color = src.color; e.ltype = src.ltype;
      api.replace(t.id, e);
      api.event("matchprop");
    }
  });

  // ================= 화면·조회 =================
  def("ZOOM", ["Z"], "줌", function* (api, eng) {
    const r = yield api.point("윈도우 구석을 지정, 축척 비율 (nX 또는 nXP) 입력 또는 [전체(A)/중심(C)/동적(D)/범위(E)/이전(P)/축척(S)/윈도우(W)/객체(O)] <실시간>:", { acceptRaw: true, rubber: false });
    if (r.kw === "E") { eng.zoomExtents(); api.event("zoomE"); return; }
    if (r.kw === "A") { eng.zoomBox(G.bboxUnion(eng.doc.extents(), eng.doc.limits), 0.06); api.event("zoomA"); return; }
    if (r.kw === "P") { if (!eng.zoomPrev()) api.print("이전 뷰가 저장되어 있지 않습니다."); api.event("zoomP"); return; }
    if (r.raw && /^[\d.]+x(p)?$/i.test(r.raw)) { const k = parseFloat(r.raw); eng.zoomAt(eng.W / 2, eng.H / 2, k, true); api.event("zoomS"); return; }
    if (r.kw === "W" || r.pt) {
      let a = r.pt;
      if (!a) { const q = yield api.point("첫 번째 구석 지정:", { rubber: false }); a = q.pt; }
      if (!a) return;
      const b = yield api.point("반대 구석 지정:", { base: a, rubber: false, preview: (q) => ({ ...rectPl(a, q), layer: "0" }) });
      if (!b.pt) return;
      eng.zoomBox(G.rectOf(a, b.pt), 0);
      api.event("zoomW");
      return;
    }
    if (r.kw === "O") {
      const s = yield api.select("객체 선택:", { pickfirst: true });
      const bb = bboxOfEnts((s.ids || []).map((id) => api.get(id)).filter(Boolean));
      if (bb) eng.zoomBox(bb, 0.1);
      api.event("zoomO");
      return;
    }
    if (r.kw === "C" || r.kw === "S" || r.kw === "D") { api.print("이 옵션은 생략했습니다. 범위(E)·윈도우(W)·이전(P)을 쓰세요."); return; }
    api.print("실시간 줌: 마우스 휠을 굴리면 커서 위치를 중심으로 확대·축소됩니다.");
  }, { noUndo: true });
  def("PAN", ["P"], "초점이동", function* (api) {
    api.print("왼쪽 버튼을 누른 채 끌면 화면이 이동합니다. 평소에는 휠(가운데 버튼)을 누른 채 끌면 됩니다.");
    yield api.point("Esc 또는 Enter 키를 눌러 종료하거나 마우스 오른쪽 버튼을 클릭합니다.", { panMode: true, rubber: false });
  }, { noUndo: true });
  def("U", [], "명령 취소(한 단계)", function* (api, eng) {
    const l = api.doc.undo();
    api.print(l ? `명령 취소: ${l}` : "명령 취소할 것이 없습니다.");
    if (l) api.event("undo");
    yield* [];
  }, { noUndo: true });
  def("UNDO", [], "명령 취소(여러 단계)", function* (api) {
    const r = yield api.number("취소할 작업의 수 또는 [자동(A)/조정(C)/시작(BE)/끝(E)/표식(M)/뒤(B)] 입력 <1>:", { def: 1 });
    if (r.kw) { api.print("이 연습장은 숫자 입력만 씁니다."); return; }
    const n = Math.max(1, Math.round(r.value || 1));
    const done = [];
    for (let i = 0; i < n; i++) { const l = api.doc.undo(); if (!l) break; done.push(l); api.event("undo"); }
    api.print(done.length ? `명령 취소: ${done.join(", ")}` : "명령 취소할 것이 없습니다.");
  }, { noUndo: true });
  def("REDO", [], "명령 복구", function* (api) {
    const l = api.doc.redo();
    api.print(l ? `명령 복구: ${l}` : "복구할 것이 없습니다(REDO는 U 바로 뒤에 씁니다).");
    if (l) api.event("redo");
    yield* [];
  }, { noUndo: true });
  def("MREDO", [], "여러 번 복구", function* (api) {
    const r = yield api.number("작업 수 입력 또는 [전체(A)/마지막(L)]:", { def: 1 });
    const n = r.kw === "A" ? 999 : r.kw === "L" ? 1 : Math.max(1, Math.round(r.value || 1));
    const done = [];
    for (let i = 0; i < n; i++) { const l = api.doc.redo(); if (!l) break; done.push(l); }
    api.print(done.length ? `명령 복구: ${done.join(", ")}` : "복구할 것이 없습니다.");
    if (done.length) { api.event("redo"); api.event("mredo"); }
  }, { noUndo: true });
  def("LIMITS", [], "도면 한계", function* (api, eng) {
    const L = api.doc.limits;
    api.print("모형 공간 한계 재설정:");
    const a = yield api.point(`왼쪽 아래 구석 지정 또는 [켜기(ON)/끄기(OFF)] <${f4(L.x0)},${f4(L.y0)}>:`, { kws: ["ON", "OFF"], rubber: false });
    if (a.kw) { api.print(`한계 검사 ${a.kw === "ON" ? "켜기" : "끄기"}`); return; }
    const p0 = a.pt || { x: L.x0, y: L.y0 };
    const b = yield api.point(`오른쪽 위 구석 지정 <${f4(L.x1)},${f4(L.y1)}>:`, { rubber: false });
    const p1 = b.pt || { x: L.x1, y: L.y1 };
    api.doc.limits = G.rectOf(p0, p1);
    api.doc.touch();
    eng.showLimits = true;
    api.print("한계가 점선으로 보입니다. Z Enter A Enter로 한계 전체를 화면에 맞춰 보세요.");
    api.event("limits");
  });
  def("DIST", ["DI"], "거리", function* (api) {
    const a = yield api.point("첫 번째 점 지정:");
    if (!a.pt) return;
    const b = yield api.point("두 번째 점 또는 [다중 점(M)] 지정:", { base: a.pt });
    if (!b.pt) return;
    const d = G.sub(b.pt, a.pt);
    api.print(`거리 = ${f4(G.len(d))},  XY 평면에서의 각도 = ${G.fmt(((G.deg(Math.atan2(d.y, d.x)) % 360) + 360) % 360)},  XY 평면으로부터의 각도 = 0\nX증분 = ${f4(d.x)},  Y증분 = ${f4(d.y)},  Z증분 = 0.0000`);
    api.event("dist");
  }, { noUndo: true });
  def("ID", [], "점 좌표", function* (api) {
    const a = yield api.point("점 지정:");
    if (a.pt) { api.print(`X = ${f4(a.pt.x)}     Y = ${f4(a.pt.y)}     Z = 0.0000`); api.event("id"); }
  }, { noUndo: true });
  def("LIST", ["LI"], "객체 정보", function* (api) {
    const ids = yield* getSel(api);
    for (const id of ids) {
      const e = api.get(id);
      const d = ACAD.CadFeedback ? ACAD.CadFeedback.describe(e, api.doc) : { title: e.type, lines: [] };
      api.print(`${d.title}  도면층: "${e.layer}"`);
      d.lines.forEach((l) => api.print("   " + l));
    }
    if (ids.length) api.event("list");
  }, { noUndo: true });
  def("LAYER", ["LA"], "도면층 관리", function* (api, eng) { eng.emit("layerPanel"); api.print("도면층 특성 관리자를 열었습니다."); yield* []; }, { noUndo: true });
  def("OSNAP", ["OS", "DSETTINGS", "DS", "SE"], "제도 설정(객체 스냅)", function* (api, eng) { eng.showOsnapPanel(true); api.print("객체 스냅 설정을 열었습니다. 쓸 스냅을 체크하세요."); yield* []; }, { noUndo: true });
  def("REGEN", ["RE"], "재생성", function* (api, eng) { eng.requestRender(); api.print("모형 재생성 중."); yield* []; }, { noUndo: true });
  def("POLARANG", [], "극좌표 증분 각도", function* (api, eng) {
    const r = yield api.number(`POLARANG에 대한 새 값 입력 <${eng.t.polarInc}>:`, { def: eng.t.polarInc });
    const v = r.value ?? eng.t.polarInc;
    if (v > 0 && v <= 90) { eng.t.polarInc = v; eng.syncStatus(); eng.event("polarang"); api.print(`극좌표 증분 각도 = ${v}°`); }
  }, { noUndo: true });
  def("LTSCALE", ["LTS"], "선종류 축척", function* (api, eng) {
    const r = yield api.number(`새 선종류 축척 비율 입력 <${f4(eng.t.ltscale)}>:`, { def: eng.t.ltscale });
    if (r.value > 0) { eng.t.ltscale = r.value; api.print("모형 재생성 중."); eng.requestRender(); eng.event("ltscale"); }
  }, { noUndo: true });
  def("GRID", [], "그리드", function* (api, eng) {
    const r = yield api.number(`그리드 간격두기(X) 지정 또는 [켜기(ON)/끄기(OFF)/스냅(S)/주(M)/가변(D)/한계(L)/따름(F)/종횡비(A)] <${f4(eng.t.gridUnit)}>:`, { def: eng.t.gridUnit, kws: ["ON", "OFF", "S", "M", "D", "L", "F", "A"] });
    if (r.kw === "ON" || r.kw === "OFF") eng.toggle("grid", r.kw === "ON");
    else if (r.kw === "S") { eng.t.gridUnit = eng.t.snapUnit; eng.requestRender(); }
    else if (r.value > 0) { eng.t.gridUnit = r.value; if (!eng.t.grid) eng.toggle("grid", true); eng.requestRender(); }
  }, { noUndo: true });
  def("SNAP", ["SN"], "스냅", function* (api, eng) {
    const r = yield api.number(`스냅 간격두기 지정 또는 [켜기(ON)/끄기(OFF)/종횡비(A)/기존(L)/스타일(S)/유형(T)] <${f4(eng.t.snapUnit)}>:`, { def: eng.t.snapUnit, kws: ["ON", "OFF", "A", "L", "S", "T"] });
    if (r.kw === "ON" || r.kw === "OFF") eng.toggle("snap", r.kw === "ON");
    else if (r.kw === "S") { const k = yield api.kw(`스냅 그리드 스타일 입력 [표준(S)/등각투영(I)] <${eng.t.iso ? "I" : "S"}>:`, { def: eng.t.iso ? "I" : "S" }); eng.setIso(k.kw === "I"); }
    else if (r.value > 0) { eng.t.snapUnit = r.value; if (!eng.t.snap) eng.toggle("snap", true); }
  }, { noUndo: true });
  def("ISODRAFT", [], "등각 제도", function* (api, eng) {
    const r = yield api.kw(`옵션 입력 [직교(O)/등각평면 좌측(L)/등각평면 상단(T)/등각평면 우측(R)] <${eng.t.iso ? "직교" : "상단"}>:`, { def: eng.t.iso ? "O" : "T" });
    if (r.kw === "O") { eng.setIso(false); return; }
    eng.t.isoplane = { L: 0, T: 1, R: 2 }[r.kw] ?? 1;
    eng.setIso(true);
  }, { noUndo: true });
  def("SNAPSTYL", [], "스냅 스타일", function* (api, eng) {
    const r = yield api.number(`SNAPSTYL에 대한 새 값 입력 <${eng.t.iso ? 1 : 0}>:`, { def: eng.t.iso ? 1 : 0 });
    eng.setIso((r.value ?? 0) === 1);
  }, { noUndo: true });

  // ================= 주석 =================
  function annoSize(eng, key) {
    if (eng.doc[key + "Set"]) return eng.doc[key];
    const w = eng.W / eng.view.s;
    const raw = w / 70;
    const p = Math.pow(10, Math.floor(Math.log10(raw)));
    const n = [1, 2, 2.5, 5, 10].map((k) => k * p).find((v) => v >= raw * 0.8) || raw;
    return n;
  }
  function* dimPlace(api, eng, base) {
    let rot = null, text = null;
    while (true) {
      const r = yield api.point("치수선의 위치 지정 또는 [여러 줄 문자(M)/문자(T)/각도(A)/수평(H)/수직(V)/회전(R)]:", { rubber: false, preview: (p) => ({ ...base(p, rot), text }) });
      if (r.pt) return { ...base(r.pt, rot), text };
      if (r.kw === "H") rot = 0;
      else if (r.kw === "V") rot = Math.PI / 2;
      else if (r.kw === "R") { const a = yield api.number("치수선의 각도 지정 <0>:", { angle: true, def: 0 }); rot = G.rad(a.value || 0); }
      else if (r.kw === "T" || r.kw === "M") { const t = yield api.text("치수 문자를 입력:"); text = t.text || null; }
      else if (r.kw === "A") api.print("문자 각도 옵션은 생략했습니다.");
      else return null;
    }
  }
  def("DIMLINEAR", ["DLI", "DIMLIN"], "선형 치수", function* (api, eng) {
    let r = yield api.point("첫 번째 치수보조선 원점 지정 또는 <객체 선택>:");
    let p1, p2;
    if (r.enter) {
      const s = yield api.pick("치수기입할 객체 선택:", { filter: (e) => e.type === "line" });
      if (!s.id) return;
      const e = api.get(s.id); p1 = e.a; p2 = e.b;
    } else if (r.pt) {
      p1 = r.pt;
      const q = yield api.point("두 번째 치수보조선 원점 지정:", { base: p1 });
      if (!q.pt) return;
      p2 = q.pt;
    } else return;
    const ts = annoSize(eng, "dimTs");
    const d = yield* dimPlace(api, eng, (p, rot) => {
      let rr = rot;
      if (rr == null) {
        const bb = G.rectOf(p1, p2);
        rr = p.x >= bb.x0 && p.x <= bb.x1 ? 0 : p.y >= bb.y0 && p.y <= bb.y1 ? Math.PI / 2 : Math.abs(p.x - (bb.x0 + bb.x1) / 2) > Math.abs(p.y - (bb.y0 + bb.y1) / 2) ? Math.PI / 2 : 0;
      }
      return { type: "dim", kind: "linear", p1, p2, dp: p, rot: rr, ts };
    });
    if (!d) return;
    const e = api.add(d);
    api.print(`치수 문자 = ${G.fmt(G.dimGeom(e).value, 2)}`);
    api.event("dim:linear");
  });
  def("DIMALIGNED", ["DAL", "DIMALI"], "정렬 치수", function* (api, eng) {
    const r = yield api.point("첫 번째 치수보조선 원점 지정 또는 <객체 선택>:");
    let p1, p2;
    if (r.enter) { const s = yield api.pick("치수기입할 객체 선택:", { filter: (e) => e.type === "line" }); if (!s.id) return; const e = api.get(s.id); p1 = e.a; p2 = e.b; }
    else if (r.pt) { p1 = r.pt; const q = yield api.point("두 번째 치수보조선 원점 지정:", { base: p1 }); if (!q.pt) return; p2 = q.pt; }
    else return;
    const ts = annoSize(eng, "dimTs");
    const d = yield* dimPlace(api, eng, (p) => ({ type: "dim", kind: "aligned", p1, p2, dp: p, ts }));
    if (!d) return;
    const e = api.add(d);
    api.print(`치수 문자 = ${G.fmt(G.dimGeom(e).value, 2)}`);
    api.event("dim:aligned");
  });
  function* dimRad(api, eng, kind) {
    const s = yield api.pick("호 또는 원 선택:", { filter: (e) => e.type === "circle" || e.type === "arc" });
    if (!s.id) return;
    const c = api.get(s.id);
    const ts = annoSize(eng, "dimTs");
    api.print(`치수 문자 = ${G.fmt(kind === "diameter" ? c.r * 2 : c.r, 2)}`);
    const r = yield api.point("치수선의 위치 지정 또는 [여러 줄 문자(M)/문자(T)/각도(A)]:", { rubber: false, preview: (p) => ({ type: "dim", kind, c: c.c, r: c.r, dp: p, ts }) });
    if (!r.pt) return;
    api.add({ type: "dim", kind, c: c.c, r: c.r, dp: r.pt, ts });
    api.event("dim:" + kind);
  }
  def("DIMRADIUS", ["DRA", "DIMRAD"], "반지름 치수", function* (api, eng) { yield* dimRad(api, eng, "radius"); });
  def("DIMDIAMETER", ["DDI", "DIMDIA"], "지름 치수", function* (api, eng) { yield* dimRad(api, eng, "diameter"); });
  def("TEXT", ["DT", "DTEXT"], "문자(단일 행)", function* (api, eng) {
    const h0 = annoSize(eng, "textH");
    api.print(`현재 문자 스타일: "Standard"  문자 높이: ${f4(h0)}  주석: 아니오  자리맞추기: 왼쪽`);
    const r = yield api.point("문자의 시작점 지정 또는 [자리맞추기(J)/스타일(S)]:");
    if (r.kw) { api.print("자리맞추기·스타일은 생략했습니다. 왼쪽 아래 기준으로 씁니다."); }
    if (!r.pt) return;
    const h = yield api.number(`높이 지정 <${f4(h0)}>:`, { base: r.pt, def: h0 });
    const H = h.value ?? h0;
    const a = yield api.number("문자의 회전 각도 지정 <0>:", { base: r.pt, angle: true, def: 0 });
    const rot = G.rad(a.value || 0);
    let p = r.pt;
    while (true) {
      const t = yield api.text("문자 입력 (빈 줄에서 Enter로 끝):");
      if (!t.text) return;
      api.add({ type: "text", p, h: H, s: t.text, rot });
      api.event("text");
      p = G.polar(p, rot - Math.PI / 2, H * 1.667);
    }
  });

  // 도면 요소·기타 단축키 표에만 있는 명령(연습장에서는 안내만)
  for (const [name, alias, ko, hint] of [
    ["HATCH", ["H"], "해치", "해치는 이 연습장에서 지원하지 않습니다. 실제 AutoCAD에서 닫힌 경계 안을 클릭해 채웁니다."],
    ["BLOCK", ["B"], "블록 정의", "블록 만들기는 실제 AutoCAD에서 연습하세요. 여러 객체를 이름 붙은 하나로 묶습니다."],
    ["INSERT", ["I"], "블록 삽입", "블록 삽입은 실제 AutoCAD에서 연습하세요."],
    ["PROPERTIES", ["PR", "PROPS", "CH", "MO"], "특성", "특성 팔레트(Ctrl+1)는 이 연습장에서 오른쪽 '지금 그린 것' 패널이 대신합니다."],
    ["XREF", ["XR"], "외부 참조", "외부 참조는 실제 AutoCAD에서 연습하세요."],
    ["PLOT", ["PRINT"], "출력", "출력(Ctrl+P)은 실제 AutoCAD에서 합니다. 이 연습장은 DXF 내보내기를 지원합니다."],
    ["DIMSTYLE", ["D", "DST"], "치수 스타일", "치수 스타일 관리자는 생략했습니다. 치수 크기는 화면 크기에 맞춰 자동으로 정합니다."],
    ["STYLE", ["ST"], "문자 스타일", "문자 스타일 관리자는 생략했습니다."],
    ["MTEXT", ["T", "MT"], "여러 줄 문자", "여러 줄 문자는 생략했습니다. DT(단일 행 문자)를 쓰세요."],
  ]) def(name, alias, ko, function* (api) { api.print(hint); yield* []; }, { noUndo: true, stub: true });

  ACAD.CadCommandHelpers = { rectPl, circum, arc3, polygonPts };
})();
