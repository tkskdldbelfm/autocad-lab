// 3면도·3D 뷰어 컴포넌트.
// ACAD.Viewer.mount(el, { model, layout:'third'|'first', compact, views:['top','front','right','iso'], highlight, onHover, annotate, glass,
//   section:'A'|'B', half:true, cut:<자르는 위치 mm> })
//   → { destroy(), highlight(ids|null), select(ids|null), setLayout(l), prep }
// 평면도·정면도·우측면도는 한 장의 SVG 도면(같은 척도), 3D는 WebGL. 어느 쪽에서든 마우스를 올리면 같은 부품이 모두 켜진다.
window.ACAD = window.ACAD || {};

(function () {
  const { V } = ACAD.G3;
  const H = ACAD.HLR;
  const NS = "http://www.w3.org/2000/svg";
  const SHEET_VIEWS = ["top", "front", "right"];
  const C = {
    part: 0xe4e4db, equipment: 0xd5d5cb, pipe: 0xc9c9c9, flange: 0xa3a3a3, valve: 0x858585, elbow: 0xc9c9c9,
    tee: 0xc9c9c9, reducer: 0xc9c9c9, support: 0xe8e8e8, structure: 0xe4e4db, instrument: 0x858585,
    hl: 0xffff00, bg: 0xf5f5f0, dir: 0x1d91d0,
    cut: 0xfec681, cutSolid: 0x000000, cutNone: 0xffffff,
  };
  const f2 = (v) => (Math.round(v * 100) / 100).toString();
  let hatchSeq = 0;

  // ---------------------------------------------------------------- 도면(SVG)
  function sheetLayout(prep, layout, views, sp, minGap) {
    views = views && views.length ? views : SHEET_VIEWS;
    const vw = {};
    views.forEach((k) => (vw[k] = sp && sp.key === k ? H.view(sp, k) : H.view(prep, k)));
    const exts = views.map((k) => Math.max(vw[k].cam.maxR - vw[k].cam.minR, vw[k].cam.maxU - vw[k].cam.minU));
    const ext = Math.max(...exts);
    const gap = Math.max(ext * 0.27 + prep.size * 0.02, minGap || 0);
    const place = {};
    const base = vw.front ? "front" : views[0];
    place[base] = { ox: 0, oy: 0 };
    const f = vw[base].cam;
    if (vw.top && base !== "top") {
      const t = vw.top.cam;
      place.top = layout === "first" ? { ox: 0, oy: f.minU - gap - t.maxU } : { ox: 0, oy: f.maxU + gap - t.minU };
    }
    if (vw.right && base !== "right") {
      const r = vw.right.cam;
      place.right = layout === "first" ? { ox: f.minR - gap - r.maxR, oy: 0 } : { ox: f.maxR + gap - r.minR, oy: 0 };
    }
    const reg = {};
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const k of views) {
      const c = vw[k].cam, p = place[k];
      reg[k] = { x0: c.minR + p.ox, x1: c.maxR + p.ox, y0: c.minU + p.oy, y1: c.maxU + p.oy };
      x0 = Math.min(x0, reg[k].x0); x1 = Math.max(x1, reg[k].x1);
      y0 = Math.min(y0, reg[k].y0); y1 = Math.max(y1, reg[k].y1);
    }
    return { vw, place, reg, gap, views, full: views.length === 3, ext: { x0, x1, y0, y1 } };
  }

  function el(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) if (attrs[k] != null) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }

  function buildSheet(prep, layout, opt) {
    const sp = opt.sp || null;
    // u = 화면 1px에 해당하는 도면 길이. 글자와 선 굵기가 화면 크기와 상관없이 같아 보이게 한다.
    // 여백은 도면 길이(gap)와 화면 px(u) 두 가지로 잡아야 작은 화면에서도 글자가 잘리지 않는다.
    // 투상도 사이 간격도 치수·제목·절단선 글자가 들어갈 만큼(화면 px 기준) 넓힌다.
    const titleOff = (opt.dims === false ? 24 : 66) + (sp ? 20 : 0);
    const needPx = titleOff + 22;
    const pxW = Math.max(240, opt.pxW || 900), pxH = Math.max(240, opt.pxH || 700);
    let L, u = 0, box;
    for (let pass = 0; pass < 3; pass++) {
      L = sheetLayout(prep, layout, opt.views, sp, needPx * u);
      const e = L.ext, g0 = L.gap;
      u = Math.max((e.x1 - e.x0) / pxW, (e.y1 - e.y0) / pxH);
      for (let i = 0; i < 3; i++) {
        box = { x0: e.x0 - g0 * 0.35 - 44 * u, x1: e.x1 + g0 * 0.35 + 28 * u, y0: e.y0 - g0 * 0.35 - (titleOff + 18) * u, y1: e.y1 + g0 * 0.3 + 24 * u };
        u = Math.max((box.x1 - box.x0) / pxW, (box.y1 - box.y0) / pxH);
      }
      if (L.gap >= needPx * u * 0.98) break;
    }
    const VIEWS_ = L.views;
    const { place, vw, reg, ext, gap } = L;
    L.box = box;
    const W = box.x1 - box.x0, Hh = box.y1 - box.y0;
    const svg = el("svg", { viewBox: `${f2(box.x0)} ${f2(-box.y1)} ${f2(W)} ${f2(Hh)}`, class: "vw-svg", role: "img", "aria-label": "평면도, 정면도, 우측면도" });
    svg.style.setProperty("--u", u.toFixed(5));
    const P = (k, r, uu) => [r + place[k].ox, -(uu + place[k].oy)];
    const pathOf = (k, lines) => lines.map((l) => "M" + l.map((p) => { const q = P(k, p[0], p[1]); return f2(q[0]) + " " + f2(q[1]); }).join("L")).join("");

    el("rect", { x: f2(box.x0 + u * 4), y: f2(-box.y1 + u * 4), width: f2(W - u * 8), height: f2(Hh - u * 8), class: "frame" }, svg);
    const gRegions = el("g", { class: "regions" }, svg);
    const gCut = el("g", { class: "cuts" }, svg);
    const gMasks = el("g", { class: "masks" }, svg);
    const gGuides = el("g", { class: "guides" }, svg);
    const gLines = el("g", { class: "lines" }, svg);
    const gAnn = el("g", { class: "ann" }, svg);
    const gDims = el("g", { class: "dims" }, svg);
    const gHits = el("g", { class: "hits" }, svg);

    for (const k of VIEWS_) {
      const g = reg[k];
      el("rect", { x: f2(g.x0), y: f2(-g.y1), width: f2(g.x1 - g.x0), height: f2(g.y1 - g.y0), class: "region", "data-view": k }, gRegions);
      const t = el("text", { x: f2((g.x0 + g.x1) / 2), y: f2(-g.y0 + u * titleOff), class: "vtitle", "data-view": k }, gAnn);
      t.textContent = sp && sp.key === k
        ? `${sp.half ? "한쪽 단면도" : "단면도"} ${sp.letter}-${sp.letter}`
        : (opt.titles && opt.titles[k]) || `${H.VIEWS[k].name} (${H.VIEWS[k].en})`;
    }

    // 부품별 선. 큰 부품을 먼저 그려 작은 부품이 위에 오게 한다.
    const order = prep.partIds.map((_, i) => i).sort((a, b) => {
      const sa = V.len(V.sub(prep.pbox[a].max, prep.pbox[a].min)), sb = V.len(V.sub(prep.pbox[b].max, prep.pbox[b].min));
      return sb - sa;
    });
    const groups = [];
    for (const pi of order) {
      const g = el("g", { class: "pt", "data-pi": pi }, gLines);
      groups[pi] = g;
      let hid = "", vis = "", ctr = "";
      for (const k of VIEWS_) {
        if (!(sp && sp.key === k)) hid += pathOf(k, vw[k].hid[pi]); // 단면도에는 숨은선을 그리지 않는다
        vis += pathOf(k, vw[k].vis[pi]);
        for (const c of vw[k].centers) if (c.part === pi) ctr += pathOf(k, [c.pts]);
      }
      for (const k of VIEWS_) {
        for (const ax of prep.axes) {
          if (!ax.circle || prep.partIndex[ax.part] !== pi) continue;
          if (Math.abs(V.dot(ax.n, H.VIEWS[k].d)) < 0.99) continue;
          const pts = [];
          const [a, b] = V.basis(ax.n);
          for (let i = 0; i <= 72; i++) {
            const t = (i / 72) * Math.PI * 2;
            const p = V.add(ax.c, V.add(V.mul(a, ax.r * Math.cos(t)), V.mul(b, ax.r * Math.sin(t))));
            pts.push([V.dot(p, H.VIEWS[k].R), V.dot(p, H.VIEWS[k].up)]);
          }
          ctr += pathOf(k, [pts]);
        }
      }
      if (ctr) el("path", { d: ctr, class: "ctr" }, g);
      if (hid) {
        el("path", { d: hid, class: "hid" }, g);
        el("path", { d: hid, class: "hitp", "data-pi": pi }, gHits);
      }
      if (vis) el("path", { d: vis, class: "vis" }, g);
    }

    // 단면: 잘린 면(해칭·검게 칠함·해칭 없음)
    if (sp && place[sp.key]) {
      const k = sp.key, hg = 5 * u, pid = "vwh" + ++hatchSeq;
      const defs = el("defs", {}, svg);
      const pat = el("pattern", { id: pid, patternUnits: "userSpaceOnUse", width: f2(hg), height: f2(hg), patternTransform: "rotate(45)" }, defs);
      el("line", { x1: 0, y1: 0, x2: 0, y2: f2(hg), class: "hatch-ln" }, pat);
      for (const pi in sp.hatch) {
        const d = sp.hatch[pi].map((t) => "M" + t.map((q) => { const w = P(k, q[0], q[1]); return f2(w[0]) + " " + f2(w[1]); }).join("L") + "Z").join("");
        const cs = H.cutStyle(prep, +pi, sp.letter);
        const g = el("g", { class: "cut cs-" + cs, "data-pi": pi }, gCut);
        el("path", { d, class: "cutbg", "data-pi": pi }, g);
        if (cs === "hatch") el("path", { d, class: "hatch", fill: `url(#${pid})` }, g);
      }
    }

    // 치수
    const dimG = (cls) => el("g", { class: cls }, gDims);
    const arrow = (g, x, y, ang) => {
      const a = 9 * u, w = 2.6 * u;
      const c = Math.cos(ang), s = Math.sin(ang);
      el("path", { d: `M${f2(x)} ${f2(y)}L${f2(x - a * c + w * s)} ${f2(y - a * s - w * c)}L${f2(x - a * c - w * s)} ${f2(y - a * s + w * c)}Z`, class: "arr" }, g);
    };
    const linDim = (p1, p2, dir, off, text) => {
      const g = dimG("dim");
      const ov = 3 * u;
      if (dir === "h") {
        const yd = Math.min(p1[1], p2[1]) - off * u;
        const ydd = off < 0 ? Math.max(p1[1], p2[1]) - off * u : yd;
        const y = off < 0 ? ydd : yd;
        const sgn = y < p1[1] ? -1 : 1;
        el("path", { d: `M${f2(p1[0])} ${f2(p1[1] + sgn * 2 * u)}L${f2(p1[0])} ${f2(y + sgn * ov)}M${f2(p2[0])} ${f2(p2[1] + sgn * 2 * u)}L${f2(p2[0])} ${f2(y + sgn * ov)}M${f2(p1[0])} ${f2(y)}L${f2(p2[0])} ${f2(y)}`, class: "dl" }, g);
        const xa = Math.min(p1[0], p2[0]), xb = Math.max(p1[0], p2[0]);
        arrow(g, xa, y, Math.PI); arrow(g, xb, y, 0);
        const t = el("text", { x: f2((xa + xb) / 2), y: f2(y - 3 * u), class: "dt" }, g);
        t.textContent = text ?? Math.round(xb - xa);
      } else {
        const x = off >= 0 ? Math.max(p1[0], p2[0]) + off * u : Math.min(p1[0], p2[0]) + off * u;
        const sgn = x > p1[0] ? 1 : -1;
        el("path", { d: `M${f2(p1[0] + sgn * 2 * u)} ${f2(p1[1])}L${f2(x + sgn * ov)} ${f2(p1[1])}M${f2(p2[0] + sgn * 2 * u)} ${f2(p2[1])}L${f2(x + sgn * ov)} ${f2(p2[1])}M${f2(x)} ${f2(p1[1])}L${f2(x)} ${f2(p2[1])}`, class: "dl" }, g);
        const ya = Math.min(p1[1], p2[1]), yb = Math.max(p1[1], p2[1]);
        arrow(g, x, ya, -Math.PI / 2); arrow(g, x, yb, Math.PI / 2);
        const t = el("text", { x: f2(x - 3 * u), y: f2((ya + yb) / 2), class: "dt", transform: `rotate(-90 ${f2(x - 3 * u)} ${f2((ya + yb) / 2)})` }, g);
        t.textContent = text ?? Math.round(yb - ya);
      }
    };
    const proj = (k, p) => P(k, V.dot(p, H.VIEWS[k].R), V.dot(p, H.VIEWS[k].up));
    if (opt.dims !== false) {
      const bb = prep.bb;
      if (prep.model.autoDims !== false && place.front && place.top) {
        const fr = reg.front, tr = reg.top;
        const fm = vw.front.cam.m, tm = vw.top.cam.m;
        linDim([fr.x0 + fm, -(fr.y0 + fm)], [fr.x1 - fm, -(fr.y0 + fm)], "h", -26, Math.round(bb.max[0] - bb.min[0]));
        linDim([fr.x0 + fm, -(fr.y0 + fm)], [fr.x0 + fm, -(fr.y1 - fm)], "v", -26, Math.round(bb.max[2] - bb.min[2]));
        linDim([tr.x0 + tm, -(tr.y0 + tm)], [tr.x0 + tm, -(tr.y1 - tm)], "v", -26, Math.round(bb.max[1] - bb.min[1]));
      }
      for (const d of prep.dims) {
        if (!place[d.view]) continue;
        if (d.type === "dia") {
          const g = dimG("dim");
          const c = proj(d.view, d.c);
          const R = d.r, a = ((d.ang ?? 45) * Math.PI) / 180;
          const ex = c[0] + R * Math.cos(a), ey = c[1] - R * Math.sin(a);
          const lx = ex + 24 * u * Math.cos(a), ly = ey - 24 * u * Math.sin(a);
          const sx = lx + 14 * u * (Math.cos(a) >= 0 ? 1 : -1);
          el("path", { d: `M${f2(ex)} ${f2(ey)}L${f2(lx)} ${f2(ly)}L${f2(sx)} ${f2(ly)}`, class: "dl" }, g);
          arrow(g, ex, ey, Math.atan2(ey - ly, ex - lx));
          const t = el("text", { x: f2(sx + (Math.cos(a) >= 0 ? 2 : -2) * u), y: f2(ly + 3.5 * u), class: "dt", "text-anchor": Math.cos(a) >= 0 ? "start" : "end" }, g);
          t.textContent = d.text || `Ø${Math.round(R * 2)}`;
        } else {
          linDim(proj(d.view, d.a), proj(d.view, d.b), d.dir, d.off, d.text);
        }
      }
    }

    // 배관 주석(라인 번호, EL, 장치 태그), 흐름 화살표, 북쪽 표시
    for (const lb of prep.labels) {
      for (const k of lb.views) {
        if (!place[k]) continue;
        const p = proj(k, lb.at);
        const t = el("text", { x: f2(p[0] + (lb.dx || 0) * u), y: f2(p[1] + (lb.dy || 0) * u), class: "lbl " + (lb.cls || ""), "text-anchor": lb.anchor || "middle", "data-pi": lb.part ? prep.partIndex[lb.part] : (prep.partIndex[lb.text] ?? null) }, gAnn);
        t.textContent = lb.text;
      }
    }
    for (const fl of prep.flows) {
      for (const k of VIEWS_) {
        const R = H.VIEWS[k].R, U = H.VIEWS[k].up;
        const d2 = [V.dot(fl.dir, R), V.dot(fl.dir, U)];
        if (Math.hypot(d2[0], d2[1]) < 0.5) continue;
        const p = proj(k, fl.at);
        const ang = Math.atan2(-d2[1], d2[0]);
        const g = el("g", { class: "flow" }, gAnn);
        arrow(g, p[0] + Math.cos(ang) * 8 * u, p[1] + Math.sin(ang) * 8 * u, ang);
        g.firstChild.setAttribute("transform", `translate(0 0)`);
      }
    }
    if (prep.north && place.top && L.full) {
      const g = el("g", { class: "north" }, gAnn);
      const x = reg.top.x1 + L.gap * 0.35, y = -reg.top.y1 + L.gap * 0.2, s = L.gap * 0.18;
      el("circle", { cx: f2(x), cy: f2(y), r: f2(s) }, g);
      el("path", { d: `M${f2(x)} ${f2(y - s * 1.25)}L${f2(x + s * 0.35)} ${f2(y + s * 0.4)}L${f2(x)} ${f2(y + s * 0.1)}L${f2(x - s * 0.35)} ${f2(y + s * 0.4)}Z` }, g);
      const t = el("text", { x: f2(x), y: f2(y - s * 1.45) }, g);
      t.textContent = "N";
    }

    // 자르는 선(절단선): 가는 1점 쇄선, 끝과 꺾인 곳은 굵게, 화살표 = 보는 방향, 글자 = 단면 이름
    if (sp) {
      const k = place.top ? "top" : sp.key === "right" && place.front ? "front" : null;
      if (k) {
        const bb = prep.bb, E = 14 * u, zc = (bb.min[2] + bb.max[2]) / 2, yc = (bb.min[1] + bb.max[1]) / 2;
        let path3, arrowsAt;
        if (sp.key === "front") {
          const y = sp.at;
          path3 = sp.half ? [[bb.max[0] + E, y, zc], [sp.rc, y, zc], [sp.rc, bb.min[1] - E, zc]] : [[bb.min[0] - E, y, zc], [bb.max[0] + E, y, zc]];
        } else if (k === "top") {
          const x = sp.at;
          path3 = sp.half ? [[x, bb.max[1] + E, zc], [x, sp.rc, zc], [bb.max[0] + E, sp.rc, zc]] : [[x, bb.min[1] - E, zc], [x, bb.max[1] + E, zc]];
        } else {
          const x = sp.at;
          path3 = [[x, yc, bb.min[2] - E], [x, yc, bb.max[2] + E]];
        }
        arrowsAt = sp.half && k === "top" ? [0] : [0, path3.length - 1];
        const pts = path3.map((p3) => proj(k, p3));
        const vd = H.VIEWS[k];
        const dv = [V.dot(sp.d, vd.R), -V.dot(sp.d, vd.up)]; // SVG 방향(아래가 +)
        const g = el("g", { class: "cutplane" }, gAnn);
        el("path", { d: "M" + pts.map((q) => f2(q[0]) + " " + f2(q[1])).join("L"), class: "cutln" }, g);
        const thick = [];
        const seg = (a, b, len) => { const dx = b[0] - a[0], dy = b[1] - a[1], L2 = Math.hypot(dx, dy) || 1; return `M${f2(a[0])} ${f2(a[1])}L${f2(a[0] + (dx / L2) * len)} ${f2(a[1] + (dy / L2) * len)}`; };
        thick.push(seg(pts[0], pts[1], 12 * u), seg(pts[pts.length - 1], pts[pts.length - 2], 12 * u));
        for (let i = 1; i < pts.length - 1; i++) thick.push(seg(pts[i], pts[i - 1], 7 * u), seg(pts[i], pts[i + 1], 7 * u));
        el("path", { d: thick.join(""), class: "cutln-thick" }, g);
        for (const i of arrowsAt) {
          const a = pts[i], tip = [a[0] + dv[0] * 20 * u, a[1] + dv[1] * 20 * u];
          el("path", { d: `M${f2(a[0])} ${f2(a[1])}L${f2(tip[0])} ${f2(tip[1])}`, class: "cutln-arrow" }, g);
          arrow(g, tip[0], tip[1], Math.atan2(dv[1], dv[0]));
          const t = el("text", { x: f2(tip[0] + dv[0] * 11 * u), y: f2(tip[1] + dv[1] * 11 * u + 4.5 * u), class: "cutln-t" }, g);
          t.textContent = sp.letter;
        }
      }
    }

    // 투상법 기호(잘린 원뿔). 제3각법은 원이 오른쪽, 제1각법은 원이 왼쪽.
    {
      const g = el("g", { class: "psym" }, gAnn);
      const s = 11 * u, x = box.x1 - 84 * u, y = -box.y1 + 34 * u;
      const cone = (cx) => el("path", { d: `M${f2(cx - s)} ${f2(y - s * 0.9)}L${f2(cx + s)} ${f2(y - s * 0.45)}L${f2(cx + s)} ${f2(y + s * 0.45)}L${f2(cx - s)} ${f2(y + s * 0.9)}Z` }, g);
      const circ = (cx) => { el("circle", { cx: f2(cx), cy: f2(y), r: f2(s * 0.9) }, g); el("circle", { cx: f2(cx), cy: f2(y), r: f2(s * 0.45) }, g); };
      if (layout === "first") { circ(x); cone(x + s * 3.2); } else { cone(x); circ(x + s * 3.2); }
      const t = el("text", { x: f2(x + s * 1.6), y: f2(y + s * 2.6), class: "psym-t" }, g);
      t.textContent = layout === "first" ? "제1각법" : "제3각법";
    }

    return { svg, L, u, groups, gMasks, gGuides, P };
  }

  // 투상 보조선: 부품의 경계 상자 모서리를 세 투상도 사이로 잇는다(3각법이면 45° 선으로 평면도→우측면도).
  function drawGuides(sh, prep, pi) {
    const g = sh.gGuides;
    g.innerHTML = "";
    if (pi < 0 || !sh.L.full) return;
    const { reg, place } = sh.L;
    const b = prep.pbox[pi];
    const u = sh.u;
    const lines = [];
    const topSide = place.top.oy > 0; // 3각법: 평면도가 위
    const rightSide = place.right.ox > 0;
    // X: 정면도 ↔ 평면도(세로선)
    for (const x of [b.min[0], b.max[0]]) {
      const yf = topSide ? reg.front.y1 : reg.front.y0, yt = topSide ? reg.top.y0 : reg.top.y1;
      lines.push(`M${f2(x)} ${f2(-yf)}L${f2(x)} ${f2(-yt)}`);
    }
    // Z: 정면도 ↔ 우측면도(가로선)
    for (const z of [b.min[2], b.max[2]]) {
      const xf = rightSide ? reg.front.x1 : reg.front.x0, xr = rightSide ? reg.right.x0 : reg.right.x1;
      lines.push(`M${f2(xf)} ${f2(-z)}L${f2(xr)} ${f2(-z)}`);
    }
    // Y: 평면도 → 45° → 우측면도
    for (const y of [b.min[1], b.max[1]]) {
      const yt = y + place.top.oy, xr = y + place.right.ox;
      const xs = rightSide ? reg.top.x1 : reg.top.x0;
      const ye = topSide ? reg.right.y1 : reg.right.y0;
      lines.push(`M${f2(xs)} ${f2(-yt)}L${f2(xr)} ${f2(-yt)}L${f2(xr)} ${f2(-ye)}`);
    }
    // 45° 기준선: 모델 전체 깊이(Y) 범위의 꺾임점을 잇는다
    {
      const ym = prep.size * 0.04;
      const ya = prep.bb.min[1] - ym, yb = prep.bb.max[1] + ym;
      const p1 = [ya + place.right.ox, ya + place.top.oy], p2 = [yb + place.right.ox, yb + place.top.oy];
      lines.push(`M${f2(p1[0])} ${f2(-p1[1])}L${f2(p2[0])} ${f2(-p2[1])}`);
    }
    el("path", { d: lines.join(""), class: "guide" }, g);
  }

  // ---------------------------------------------------------------- 3D
  function Orbit(camera, dom, target, onChange) {
    const st = { theta: 0, phi: 1, radius: 1, target: target.clone() };
    const sync = () => {
      const s = Math.sin(st.phi);
      camera.position.set(st.target.x + st.radius * s * Math.cos(st.theta), st.target.y + st.radius * s * Math.sin(st.theta), st.target.z + st.radius * Math.cos(st.phi));
      camera.up.set(0, 0, 1);
      camera.lookAt(st.target);
      onChange();
    };
    const setFromDir = (dir, radius, tgt) => {
      if (tgt) st.target.copy(tgt);
      const d = new THREE.Vector3(...dir).normalize();
      st.radius = radius ?? st.radius;
      st.phi = Math.acos(Math.max(-0.999, Math.min(0.999, d.z)));
      st.theta = Math.atan2(d.y, d.x);
      sync();
    };
    let drag = null;
    const down = (e) => {
      drag = { x: e.clientX, y: e.clientY, pan: e.button === 1 || e.button === 2 || e.shiftKey, moved: false };
      dom.setPointerCapture?.(e.pointerId);
    };
    const move = (e) => {
      if (!drag) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (Math.abs(dx) + Math.abs(dy) > 2) drag.moved = true;
      drag.x = e.clientX; drag.y = e.clientY;
      if (drag.pan) {
        const h = dom.clientHeight || 1;
        const scale = (2 * st.radius * Math.tan((camera.fov * Math.PI) / 360)) / h;
        const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
        const up = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
        st.target.addScaledVector(right, -dx * scale).addScaledVector(up, dy * scale);
      } else {
        st.theta -= dx * 0.008;
        st.phi = Math.max(0.02, Math.min(Math.PI - 0.02, st.phi - dy * 0.008));
      }
      api.userMoved = true;
      sync();
    };
    const up = (e) => { if (drag) api.lastDragMoved = drag.moved; drag = null; dom.releasePointerCapture?.(e.pointerId); };
    const wheel = (e) => { e.preventDefault(); st.radius *= Math.pow(1.0015, e.deltaY); api.userMoved = true; sync(); };
    const ctx = (e) => e.preventDefault();
    dom.addEventListener("pointerdown", down);
    dom.addEventListener("pointermove", move);
    dom.addEventListener("pointerup", up);
    dom.addEventListener("pointercancel", up);
    dom.addEventListener("wheel", wheel, { passive: false });
    dom.addEventListener("contextmenu", ctx);
    const api = {
      st, sync, setFromDir, userMoved: false, lastDragMoved: false,
      dragging: () => !!drag,
      dispose() {
        dom.removeEventListener("pointerdown", down); dom.removeEventListener("pointermove", move);
        dom.removeEventListener("pointerup", up); dom.removeEventListener("pointercancel", up);
        dom.removeEventListener("wheel", wheel); dom.removeEventListener("contextmenu", ctx);
      },
    };
    return api;
  }

  function create3D(box, prep, opts = {}) {
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.setClearColor(C.bg, 1);
    box.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, prep.size * 0.01, prep.size * 20);
    scene.add(new THREE.HemisphereLight(0xffffff, 0xd5d5cb, 1.6));
    const sun = new THREE.DirectionalLight(0xffffff, 1.6);
    scene.add(sun);
    const c = new THREE.Vector3(...V.mul(V.add(prep.bb.min, prep.bb.max), 0.5));
    const rad = prep.size / 2;

    const meshes = [], edges = [], mats = [];
    prep.geoms.forEach((g, i) => {
      const part = prep.parts[prep.partIds[i]];
      const base = new THREE.Color(C[part.kind] ?? C.part);
      const m = new THREE.MeshStandardMaterial({ color: base.clone(), roughness: 0.75, metalness: 0.05, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
      m.userData.base = base;
      const mesh = new THREE.Mesh(g, m);
      mesh.userData.pi = i;
      scene.add(mesh);
      meshes.push(mesh); mats.push(m);
      const lm = new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.55 });
      const ln = new THREE.LineSegments(prep.edgeGeo[i], lm);
      scene.add(ln);
      edges.push(ln);
    });

    // 보는 방향 표시(화살표 + 투상면)
    const dirGroup = new THREE.Group();
    dirGroup.visible = false;
    scene.add(dirGroup);
    const arrowMat = new THREE.MeshBasicMaterial({ color: C.dir });
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(rad * 0.025, rad * 0.025, rad * 0.7, 16), arrowMat);
    const head = new THREE.Mesh(new THREE.ConeGeometry(rad * 0.07, rad * 0.2, 20), arrowMat);
    const planeMesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: 0xbfe4f7, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false }));
    const planeEdge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(1, 1)), new THREE.LineBasicMaterial({ color: C.dir }));
    dirGroup.add(shaft, head, planeMesh, planeEdge);
    const dirLabel = document.createElement("div");
    dirLabel.className = "vw-dirlabel";
    box.appendChild(dirLabel);

    let need = true, raf = 0, dead = false;
    const invalidate = () => { need = true; if (!raf && !dead) raf = requestAnimationFrame(frame); };
    const orbit = Orbit(camera, renderer.domElement, c, invalidate);
    const iso = [1, -1.25, 0.95];
    const fitDist = rad / Math.sin((camera.fov * Math.PI) / 360) * 1.08;
    orbit.setFromDir(opts.dir || iso, fitDist, c);

    let glass = null, anim = null;
    function frame(time) {
      raf = 0;
      if (anim) anim(time);
      if (!need && !anim) return;
      need = false;
      sun.position.copy(camera.position).add(new THREE.Vector3(rad, -rad * 0.5, rad * 2));
      renderer.render(scene, camera);
      if (dirGroup.visible) placeDirLabel();
      if (anim) raf = requestAnimationFrame(frame);
    }

    const resize = () => {
      const w = box.clientWidth || 300, h = box.clientHeight || 240;
      renderer.setSize(w, h, false);
      renderer.domElement.style.width = "100%";
      renderer.domElement.style.height = "100%";
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      invalidate();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(box);
    resize();

    // 단면: 잘라 낸 입체로 바꾸고, 잘린 면(뚜껑)을 따로 칠한다
    const capGroup = new THREE.Group();
    scene.add(capGroup);
    let caps = [], secPlane = null;
    const clearCaps = () => {
      caps.forEach((m) => { m.geometry.dispose(); m.material.dispose(); });
      caps = [];
      capGroup.clear();
      if (secPlane) { secPlane.geometry.dispose(); secPlane.material.dispose(); scene.remove(secPlane); secPlane = null; }
    };
    const setSection = (sp) => {
      clearCaps();
      meshes.forEach((m, i) => { m.geometry = sp ? sp.geoms[i] : prep.geoms[i]; });
      edges.forEach((e, i) => { e.geometry = sp ? sp.edgeGeo[i] : prep.edgeGeo[i]; });
      if (sp) {
        for (const pi in sp.capTri) {
          const arr = [];
          for (const poly of sp.capTri[pi]) for (let k = 1; k < poly.length - 1; k++) arr.push(...poly[0], ...poly[k], ...poly[k + 1]);
          const g = new THREE.BufferGeometry();
          g.setAttribute("position", new THREE.Float32BufferAttribute(arr, 3));
          g.computeVertexNormals();
          g.computeBoundingSphere();
          const cs = H.cutStyle(prep, +pi, sp.letter);
          const base = new THREE.Color(cs === "hatch" ? C.cut : cs === "solid" ? C.cutSolid : C.cutNone);
          const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: base.clone(), side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
          m.material.userData.base = base;
          m.userData.pi = +pi;
          capGroup.add(m);
          caps.push(m);
        }
        // 자르는 면의 윤곽(엷은 파란 사각형)
        const bb = prep.bb, mg = prep.size * 0.08, pts = [];
        const q = (a, b) => { const p = [0, 0, 0]; p[sp.axis] = sp.at; const o = [0, 1, 2].filter((x) => x !== sp.axis); p[o[0]] = a; p[o[1]] = b; return p; };
        const o = [0, 1, 2].filter((x) => x !== sp.axis);
        const a0 = bb.min[o[0]] - mg, a1 = bb.max[o[0]] + mg, b0 = bb.min[o[1]] - mg, b1 = bb.max[o[1]] + mg;
        [[a0, b0, a1, b0], [a1, b0, a1, b1], [a1, b1, a0, b1], [a0, b1, a0, b0]].forEach(([x0, y0, x1, y1]) => pts.push(...q(x0, y0), ...q(x1, y1)));
        const g = new THREE.BufferGeometry();
        g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
        secPlane = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: C.dir, transparent: true, opacity: 0.7 }));
        scene.add(secPlane);
      }
      hl(hlSet);
    };

    // 선택·강조
    let hlSet = new Set();
    const hl = (set) => {
      hlSet = set;
      meshes.forEach((m, i) => {
        const on = set.has(i);
        m.material.color.copy(on ? new THREE.Color(C.hl) : m.material.userData.base);
        m.material.emissive.setHex(on ? 0x333300 : 0x000000);
        edges[i].material.opacity = on ? 1 : set.size ? 0.3 : 0.55;
      });
      caps.forEach((m) => m.material.color.copy(set.has(m.userData.pi) ? new THREE.Color(C.hl) : m.material.userData.base));
      invalidate();
    };

    // 보는 방향
    let dirKey = null;
    const showDir = (key, layout) => {
      dirKey = key;
      if (!key) { dirGroup.visible = false; dirLabel.style.display = "none"; invalidate(); return; }
      const vw = H.VIEWS[key];
      const d = new THREE.Vector3(...vw.d);
      const start = c.clone().addScaledVector(d, -rad * 2.1);
      const mid = c.clone().addScaledVector(d, -rad * 1.55);
      shaft.position.copy(mid);
      shaft.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d);
      head.position.copy(c.clone().addScaledVector(d, -rad * 1.12));
      head.quaternion.copy(shaft.quaternion);
      // 투상면: 제3각법은 물체 앞(보는 사람과 물체 사이), 제1각법은 물체 뒤
      const planeAt = layout === "first" ? c.clone().addScaledVector(d, rad * 1.05) : c.clone().addScaledVector(d, -rad * 0.98);
      [planeMesh, planeEdge].forEach((p) => {
        p.position.copy(planeAt);
        p.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), d);
        p.scale.set(rad * 2, rad * 2, 1);
      });
      dirGroup.visible = true;
      dirLabel.dataset.start = start.toArray().join(",");
      dirLabel.innerHTML = `<b>${vw.name}</b> = ${vw.from}<br><small>파란 면이 투상면(${layout === "first" ? "물체 뒤 — 제1각법" : "물체 앞 — 제3각법"})</small>`;
      dirLabel.style.display = "block";
      invalidate();
    };
    function placeDirLabel() {
      const p = new THREE.Vector3(...dirLabel.dataset.start.split(",").map(Number)).project(camera);
      const w = box.clientWidth, h = box.clientHeight;
      const x = Math.max(8, Math.min(w - 180, ((p.x + 1) / 2) * w - 60));
      const y = Math.max(8, Math.min(h - 56, ((1 - p.y) / 2) * h - 20));
      dirLabel.style.transform = `translate(${x}px, ${y}px)`;
    }

    // 3D에서 고르기
    const ray = new THREE.Raycaster();
    const pickAt = (e) => {
      const r = renderer.domElement.getBoundingClientRect();
      const m = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(m, camera);
      const hit = ray.intersectObjects(meshes.filter((x) => x.visible).concat(caps), false)[0];
      return hit ? hit.object.userData.pi : -1;
    };
    const onMove = (e) => { if (orbit.dragging()) return; opts.onHover?.(pickAt(e), e); };
    const onLeave = () => opts.onHover?.(-1);
    const onClick = (e) => { if (orbit.lastDragMoved) return; opts.onClick?.(pickAt(e), e); };
    renderer.domElement.addEventListener("pointermove", onMove);
    renderer.domElement.addEventListener("pointerleave", onLeave);
    renderer.domElement.addEventListener("click", onClick);

    const setShade = (mode) => {
      meshes.forEach((m) => { m.material.wireframe = false; m.material.transparent = mode === "wire"; m.material.opacity = mode === "wire" ? 0.12 : 1; m.material.depthWrite = mode !== "wire"; m.material.needsUpdate = true; });
      invalidate();
    };
    const presets = {
      iso: () => orbit.setFromDir(iso, fitDist, c),
      front: () => orbit.setFromDir([0, -1, 0.0001], fitDist, c),
      top: () => orbit.setFromDir([0.0001, -0.0001, 1], fitDist, c),
      right: () => orbit.setFromDir([1, 0, 0.0001], fitDist, c),
    };

    // 유리상자
    const setGlass = (on, layout) => {
      if (glass) { scene.remove(glass.group); glass.dispose(); glass = null; }
      anim = null;
      if (on) { glass = makeGlass(prep, layout); scene.add(glass.group); glass.set(0); orbit.setFromDir([1, -1.6, 0.8], fitDist * 1.9, c); }
      else presets.iso();
      invalidate();
    };
    const glassT = (t) => {
      if (!glass) return;
      glass.set(t);
      if (!orbit.userMoved) {
        const k = Math.max(0, Math.min(1, (t - 0.25) / 0.75));
        const e = k * k * (3 - 2 * k);
        const a = new THREE.Vector3(1, -1.6, 0.8).normalize(), b = new THREE.Vector3(0.0001, -1, 0.0001);
        const d = a.lerp(b, e);
        const tgt = c.clone().lerp(glass.center, e);
        orbit.setFromDir([d.x, d.y, d.z], fitDist * (1.9 + e * 0.35), tgt);
      }
      invalidate();
    };
    const playGlass = (onT) => {
      if (!glass) return;
      orbit.userMoved = false;
      const t0 = performance.now();
      anim = (now) => {
        const t = Math.min(1, (now - t0) / 3200);
        glassT(t);
        onT?.(t);
        if (t >= 1) anim = null;
      };
      invalidate();
    };

    return {
      renderer, camera, hl, showDir, setShade, presets, setGlass, glassT, playGlass, invalidate, resize, setSection,
      get dirKey() { return dirKey; },
      destroy() {
        dead = true;
        cancelAnimationFrame(raf);
        ro.disconnect();
        orbit.dispose();
        renderer.domElement.removeEventListener("pointermove", onMove);
        renderer.domElement.removeEventListener("pointerleave", onLeave);
        renderer.domElement.removeEventListener("click", onClick);
        if (glass) glass.dispose();
        clearCaps();
        mats.forEach((m) => m.dispose());
        edges.forEach((e) => e.material.dispose());
        shaft.geometry.dispose(); head.geometry.dispose(); arrowMat.dispose();
        planeMesh.geometry.dispose(); planeMesh.material.dispose(); planeEdge.geometry.dispose(); planeEdge.material.dispose();
        renderer.dispose();
        renderer.forceContextLoss?.();
        renderer.domElement.remove();
        dirLabel.remove();
      },
    };
  }

  // 유리상자: 물체를 감싼 상자의 세 면에 투상도를 비추고, 그 면을 펼쳐 한 장의 도면으로 만든다.
  function makeGlass(prep, layout) {
    const bb = prep.bb, m = prep.size * 0.14;
    const x0 = bb.min[0] - m, x1 = bb.max[0] + m, y0 = bb.min[1] - m, y1 = bb.max[1] + m, z0 = bb.min[2] - m, z1 = bb.max[2] + m;
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, cz = (z0 + z1) / 2;
    const first = layout === "first";
    const group = new THREE.Group();
    const disposables = [];
    const boxGeo = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0);
    const boxEdges = new THREE.LineSegments(new THREE.EdgesGeometry(boxGeo), new THREE.LineDashedMaterial({ color: 0x666666, dashSize: prep.size * 0.03, gapSize: prep.size * 0.02 }));
    boxEdges.computeLineDistances();
    boxEdges.position.set(cx, cy, cz);
    group.add(boxEdges);
    disposables.push(boxGeo, boxEdges.geometry, boxEdges.material);

    const texFor = (key, a0, a1, b0, b1) => {
      const vw = H.view(prep, key);
      const W = 1024, Hh = Math.round((1024 * (b1 - b0)) / (a1 - a0));
      const cv = document.createElement("canvas");
      cv.width = W; cv.height = Math.max(64, Hh);
      const g = cv.getContext("2d");
      g.fillStyle = "rgba(255,255,255,0.82)";
      g.fillRect(0, 0, cv.width, cv.height);
      g.strokeStyle = "#1d91d0"; g.lineWidth = 6; g.strokeRect(3, 3, cv.width - 6, cv.height - 6);
      const X = (r) => ((r - a0) / (a1 - a0)) * cv.width, Y = (u) => (1 - (u - b0) / (b1 - b0)) * cv.height;
      const stroke = (lines, w, dash, color) => {
        g.lineWidth = w; g.setLineDash(dash); g.strokeStyle = color;
        g.beginPath();
        for (const ls of lines) for (const l of ls) { l.forEach((p, i) => (i ? g.lineTo(X(p[0]), Y(p[1])) : g.moveTo(X(p[0]), Y(p[1])))); }
        g.stroke();
      };
      stroke(vw.hid, 3, [14, 9], "#666666");
      stroke(vw.vis, 5, [], "#000000");
      g.setLineDash([]);
      g.fillStyle = "#000000";
      g.font = "bold 88px sans-serif";
      g.fillStyle = "#136b9a";
      g.fillText(H.VIEWS[key].name, 32, 112);
      const tex = new THREE.CanvasTexture(cv);
      tex.colorSpace = THREE.SRGBColorSpace;
      disposables.push(tex);
      return tex;
    };
    const plane = (tex, U, Vv, N, w, h, local) => {
      const geo = new THREE.PlaneGeometry(w, h);
      geo.applyMatrix4(new THREE.Matrix4().makeBasis(new THREE.Vector3(...U), new THREE.Vector3(...Vv), new THREE.Vector3(...N)));
      geo.translate(...local);
      const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide, depthWrite: false });
      disposables.push(geo, mat);
      return new THREE.Mesh(geo, mat);
    };
    // 정면 투상면(3각: 앞 y0 / 1각: 뒤 y1) — 고정
    const fy = first ? y1 : y0;
    const front = plane(texFor("front", x0, x1, z0, z1), [1, 0, 0], [0, 0, 1], [0, -1, 0], x1 - x0, z1 - z0, [cx, fy, cz]);
    group.add(front);
    // 평면 투상면(3각: 위 z1 / 1각: 아래 z0) — 정면 투상면과 만나는 모서리가 경첩
    const tz = first ? z0 : z1, hy = first ? y1 : y0;
    const topPivot = new THREE.Group();
    topPivot.position.set(0, hy, tz);
    topPivot.add(plane(texFor("top", x0, x1, y0, y1), [1, 0, 0], [0, 1, 0], [0, 0, 1], x1 - x0, y1 - y0, [cx, cy - hy, 0]));
    group.add(topPivot);
    // 우측면 투상면(3각: 오른쪽 x1 / 1각: 왼쪽 x0)
    const rx = first ? x0 : x1;
    const rightPivot = new THREE.Group();
    rightPivot.position.set(rx, hy, 0);
    rightPivot.add(plane(texFor("right", y0, y1, z0, z1), [0, 1, 0], [0, 0, 1], [1, 0, 0], y1 - y0, z1 - z0, [0, cy - hy, cz]));
    group.add(rightPivot);
    // 펼친 뒤의 가운데(카메라 목표)
    const dy = y1 - y0;
    const center = first
      ? new THREE.Vector3(cx - dy / 2, fy, cz - dy / 2)
      : new THREE.Vector3(cx + dy / 2, fy, cz + dy / 2);
    return {
      group, center,
      set(t) {
        const a = t * (Math.PI / 2);
        topPivot.rotation.x = a;
        rightPivot.rotation.z = -a;
      },
      dispose() { disposables.forEach((d) => d.dispose()); },
    };
  }

  // ---------------------------------------------------------------- 컴포넌트
  function mount(host, opts = {}) {
    const model = ACAD.models[opts.model] || ACAD.models["block-step"];
    const prep = H.prepare(model);
    const compact = !!opts.compact;
    const show3d = !opts.views || opts.views.includes("iso");
    const st = {
      layout: opts.layout === "first" ? "first" : "third",
      hidden: opts.hidden !== false, center: true, dims: opts.dims ?? !compact, guides: true, shade: "shade",
      hover: -1, ext: new Set(), sel: new Set(), glass: false,
      sec: opts.section ? { key: opts.section === "B" || opts.section === "right" ? "right" : "front", half: !!opts.half, at: opts.cut != null && opts.cut !== "" && isFinite(opts.cut) ? +opts.cut : null } : null,
      sheetViews: opts.sheetViews || (opts.views && opts.views.some((v) => SHEET_VIEWS.includes(v)) ? opts.views.filter((v) => SHEET_VIEWS.includes(v)) : SHEET_VIEWS),
    };
    const root = ACAD.h(`<div class="vw${compact ? " compact" : ""}${show3d ? "" : " no3d"}${opts.tall ? " tall" : ""}">
      <div class="vw-bar">
        <div class="seg" role="group" aria-label="투상법">
          <button type="button" data-layout="third">제3각법</button><button type="button" data-layout="first">제1각법</button>
        </div>
        <label class="tg"><input type="checkbox" data-t="hidden"> 숨은선</label>
        <label class="tg"><input type="checkbox" data-t="center"> 중심선</label>
        <div class="seg" role="group" aria-label="단면"><button type="button" data-sec="">단면 없음</button><button type="button" data-sec="front">단면 A-A</button><button type="button" data-sec="right">단면 B-B</button></div>
        <label class="tg"><input type="checkbox" data-half> 한쪽 단면</label>
        <label class="tg sec-pos" hidden>자르는 위치 <input type="range" class="sec-range" step="0.5" aria-label="자르는 위치"><span class="mono tiny sec-val"></span></label>
        ${compact ? "" : `<label class="tg"><input type="checkbox" data-t="dims"> 치수</label>
        <label class="tg"><input type="checkbox" data-t="guides"> 투상 보조선</label>`}
        ${show3d ? `<span class="sp"></span>
        ${compact ? "" : `<div class="seg" role="group" aria-label="3D 표시"><button type="button" data-shade="shade">음영</button><button type="button" data-shade="wire">투명</button></div>`}
        <button type="button" class="btn small" data-act="glass">유리상자 펼치기</button>` : ""}
      </div>
      <div class="vw-main">
        <div class="vw-sheet"><div class="vw-tip" hidden></div></div>
        ${show3d ? `<div class="vw-3d-wrap">
          <div class="vw-3d"></div>
          <div class="vw-3d-bar">
            <button type="button" data-cam="iso">등각</button><button type="button" data-cam="front">정면</button><button type="button" data-cam="top">위</button><button type="button" data-cam="right">오른쪽</button>
            <span class="hint">드래그 회전 · 휠 확대 · 오른쪽 드래그 이동</span>
          </div>
          <div class="vw-glass" hidden>
            <button type="button" class="btn small primary" data-act="play">▶ 펼치기</button>
            <input type="range" min="0" max="1000" value="0" aria-label="펼침 정도">
            <span class="gl-note"></span>
          </div>
        </div>` : ""}
      </div>
      <div class="vw-info" aria-live="polite"></div>
    </div>`);
    host.appendChild(root);
    const sheetBox = root.querySelector(".vw-sheet");
    const tip = root.querySelector(".vw-tip");
    const info = root.querySelector(".vw-info");
    let sheet = null, lastW = 0;
    const masks = new Map();
    const sheetRO = new ResizeObserver(() => {
      const w = sheetBox.clientWidth;
      if (sheet && w && lastW && Math.abs(w - lastW) / lastW > 0.15) renderSheet();
    });
    sheetRO.observe(sheetBox);

    const three = show3d ? create3D(root.querySelector(".vw-3d"), prep, {
      onHover: (pi) => setHover(pi, "3d"),
      onClick: (pi) => click(pi),
    }) : null;

    function renderSheet() {
      if (sheet) sheet.svg.remove();
      masks.clear();
      lastW = sheetBox.clientWidth || 900;
      const sp = curSP();
      sheet = buildSheet(prep, st.layout, { views: st.sheetViews, titles: opts.viewTitles, dims: !compact, pxW: lastW, pxH: opts.tall ? 100000 : window.innerHeight * (compact ? 0.6 : 0.72), sp });
      if (three && three._sp !== sp) { three.setSection(sp); three._sp = sp; }
      sheetBox.insertBefore(sheet.svg, tip);
      applyToggles();
      bindSheet();
      applyHL();
    }
    function curSP() {
      if (!st.sec) return null;
      const sp = H.section(prep, { key: st.sec.key, at: st.sec.at, half: st.sec.half });
      st.sec.at = sp.at;
      return sp;
    }
    function applyToggles() {
      const s = sheet.svg.classList;
      root.querySelectorAll("[data-sec]").forEach((b) => b.setAttribute("aria-pressed", (st.sec ? st.sec.key : "") === b.dataset.sec));
      const hc = root.querySelector("[data-half]");
      hc.checked = !!(st.sec && st.sec.half);
      hc.disabled = !st.sec;
      const pos = root.querySelector(".sec-pos");
      pos.hidden = !st.sec;
      if (st.sec) {
        const [a, b] = H.sectionRange(prep, st.sec.key);
        const rg = pos.querySelector("input");
        const m = (b - a) * 0.02;
        rg.min = (a + m).toFixed(1); rg.max = (b - m).toFixed(1); rg.value = st.sec.at;
        pos.querySelector(".sec-val").textContent = `${st.sec.key === "front" ? "Y" : "X"} = ${Math.round(st.sec.at * 10) / 10}`;
      }
      s.toggle("no-hid", !st.hidden); s.toggle("no-ctr", !st.center); s.toggle("no-dims", !st.dims); s.toggle("no-guides", !st.guides);
      root.querySelectorAll("[data-layout]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.layout === st.layout));
      root.querySelectorAll("[data-shade]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.shade === st.shade));
      root.querySelectorAll("[data-t]").forEach((c) => (c.checked = !!st[c.dataset.t]));
    }

    const hlSet = () => {
      const s = new Set([...st.sel, ...st.ext]);
      if (st.hover >= 0) s.add(st.hover);
      return s;
    };
    function applyHL() {
      if (!sheet) return;
      const set = hlSet();
      sheet.svg.classList.toggle("has-hl", set.size > 0);
      sheet.groups.forEach((g, i) => g && g.classList.toggle("hl", set.has(i)));
      sheet.svg.querySelectorAll(".lbl[data-pi]").forEach((t) => t.classList.toggle("hl", set.has(+t.dataset.pi)));
      sheet.svg.querySelectorAll(".cut[data-pi]").forEach((g) => g.classList.toggle("hl", set.has(+g.dataset.pi)));
      // 마스크
      for (const [key, img] of masks) img.style.display = set.has(+key.split(":")[1]) ? "" : "none";
      for (const pi of set) {
        for (const k of sheet.L.views) {
          const key = k + ":" + pi;
          if (masks.has(key)) continue;
          const vw = sheet.L.vw[k];
          const url = H.mask(prep, vw, pi);
          if (!url) { masks.set(key, document.createElementNS(NS, "g")); continue; }
          const c = vw.cam, p = sheet.L.place[k];
          const img = el("image", { href: url, x: f2(c.minR + p.ox), y: f2(-(c.minU + vw.H * vw.px + p.oy)), width: f2(vw.W * vw.px), height: f2(vw.H * vw.px), preserveAspectRatio: "none", class: "mask" }, sheet.gMasks);
          masks.set(key, img);
        }
      }
      drawGuides(sheet, prep, st.guides ? (st.hover >= 0 ? st.hover : set.size === 1 ? [...set][0] : -1) : -1);
      three?.hl(set);
      renderInfo(set);
    }

    function partLabel(pi) {
      const p = prep.parts[prep.partIds[pi]];
      return p ? p.name : "";
    }
    function renderInfo(set) {
      const pi = st.hover >= 0 ? st.hover : set.size ? [...set][0] : -1;
      const secNote = st.sec ? (() => {
        const L = st.sec.key === "front" ? "A" : "B";
        const where = st.sec.key === "front" ? "정면도" : "우측면도";
        return `<div class="vw-secnote"><b>${st.sec.half ? "한쪽 단면도" : "단면도"} ${L}-${L}</b> 평면도의 자르는 선 ${L}-${L}에서 잘라 화살표 방향으로 본 그림이 ${where} 자리에 옵니다. 잘린 면은 가는 실선을 45°로 그어 해칭하고, 단면도에는 숨은선을 그리지 않습니다.${st.sec.half ? " 한쪽 단면은 대칭인 부품의 4분의 1만 잘라 겉모양과 속을 한 그림에 보여 줍니다(중심선이 경계)." : ""}${prep.model.kind === "piping" ? " 관 벽처럼 얇은 단면은 해칭 대신 검게 칠합니다." : ""}</div>`;
      })() : "";
      if (pi < 0) {
        if (secNote) { info.innerHTML = secNote; return; }
        info.innerHTML = compact
          ? `<span class="muted small">도면이나 3D의 한 부분에 마우스를 올려 보세요. 같은 부분이 세 투상도와 3D에서 함께 노랗게 켜집니다.</span>`
          : `<div class="vw-look"><b>이 모델에서 볼 것</b><ol>${(model.look || []).map((t) => `<li>${ACAD.esc(t)}</li>`).join("")}</ol></div>`;
        return;
      }
      const id = prep.partIds[pi], p = prep.parts[id];
      const lineTxt = p.line && prep.routes[p.line] ? `<span class="tag">${ACAD.esc(prep.routes[p.line].name || p.line)}</span>` : "";
      const views = p.views ? SHEET_VIEWS.filter((k) => p.views[k]).map((k) => `<li><b>${H.VIEWS[k].name}</b> ${ACAD.esc(p.views[k])}</li>`).join("") : "";
      info.innerHTML = `<div class="vw-part"><div class="nm"><span class="sw"></span><b>${ACAD.esc(p.name)}</b> ${lineTxt}</div>
        <p>${ACAD.esc(p.info || "")}</p>${views ? `<ul class="vw-views">${views}</ul>` : ""}
        ${p.line && !compact ? `<p class="small muted">클릭하면 라인 ${ACAD.esc(p.line)} 전체가 켜집니다.</p>` : ""}
        ${st.sec && H.noHatchReason(prep, pi, st.sec.key === "front" ? "A" : "B") ? `<p class="vw-nohatch"><b>여기는 해칭하지 않습니다.</b> ${ACAD.esc(H.noHatchReason(prep, pi, st.sec.key === "front" ? "A" : "B"))}</p>` : ""}</div>`;
    }

    function setHover(pi, src, e) {
      if (st.hover === pi) return;
      st.hover = pi;
      applyHL();
      opts.onHover?.(pi >= 0 ? prep.partIds[pi] : null, src);
      if (src !== "sheet") tip.hidden = true;
      void e;
    }
    function click(pi) {
      if (pi < 0) { st.sel.clear(); applyHL(); opts.onSelect?.(null); return; }
      const p = prep.parts[prep.partIds[pi]];
      st.sel.clear();
      if (p.line) prep.partIds.forEach((id, i) => { if (prep.parts[id].line === p.line) st.sel.add(i); });
      else st.sel.add(pi);
      applyHL();
      opts.onSelect?.(p.line ? "line:" + p.line : prep.partIds[pi]);
    }

    function bindSheet() {
      const svg = sheet.svg;
      const toSheet = (e) => {
        const m = svg.getScreenCTM();
        if (!m) return null;
        const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
        return [pt.x, -pt.y];
      };
      const viewAt = (p) => {
        for (const k of sheet.L.views) {
          const r = sheet.L.reg[k];
          if (p[0] >= r.x0 && p[0] <= r.x1 && p[1] >= r.y0 && p[1] <= r.y1) return k;
        }
        return null;
      };
      svg.addEventListener("pointermove", (e) => {
        const p = toSheet(e);
        if (!p) return;
        const k = viewAt(p);
        three?.showDir(k, st.layout);
        let pi = -1;
        const t = e.target;
        if (t.dataset && t.dataset.pi != null && t.dataset.pi !== "") pi = +t.dataset.pi;
        else if (k) {
          const pl = sheet.L.place[k];
          pi = H.pick(sheet.L.vw[k], p[0] - pl.ox, p[1] - pl.oy);
        }
        setHover(pi, "sheet");
        if (pi >= 0) {
          const r = sheetBox.getBoundingClientRect();
          tip.hidden = false;
          tip.textContent = partLabel(pi);
          tip.style.transform = `translate(${Math.min(r.width - 160, e.clientX - r.left + 14)}px, ${e.clientY - r.top + 16}px)`;
        } else tip.hidden = true;
      });
      svg.addEventListener("pointerleave", () => { setHover(-1, "sheet"); tip.hidden = true; three?.showDir(null); });
      svg.addEventListener("click", () => click(st.hover));
    }

    // 도구 막대
    root.querySelector(".vw-bar").addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      if (b.dataset.layout) { st.layout = b.dataset.layout; renderSheet(); if (st.glass) three.setGlass(true, st.layout); updateGlassNote(); }
      if (b.dataset.shade) { st.shade = b.dataset.shade; three?.setShade(st.shade); applyToggles(); }
      if (b.dataset.sec != null) {
        const key = b.dataset.sec;
        st.sec = key ? { key, half: st.sec ? st.sec.half : false, at: st.sec && st.sec.key === key ? st.sec.at : null } : null;
        renderSheet();
        opts.onSection?.(st.sec);
      }
      if (b.dataset.act === "glass") {
        st.glass = !st.glass;
        b.classList.toggle("primary", st.glass);
        b.textContent = st.glass ? "유리상자 닫기" : "유리상자 펼치기";
        root.querySelector(".vw-glass").hidden = !st.glass;
        three.setGlass(st.glass, st.layout);
        range.value = 0;
        updateGlassNote();
      }
    });
    let secTimer = 0;
    root.querySelector(".vw-bar").addEventListener("input", (e) => {
      if (!e.target.classList.contains("sec-range") || !st.sec) return;
      st.sec.at = +e.target.value;
      root.querySelector(".sec-val").textContent = `${st.sec.key === "front" ? "Y" : "X"} = ${st.sec.at}`;
      clearTimeout(secTimer);
      secTimer = setTimeout(renderSheet, 140);
    });
    root.querySelector(".vw-bar").addEventListener("change", (e) => {
      if (e.target.matches("[data-half]")) { if (st.sec) { st.sec.half = e.target.checked; renderSheet(); } return; }
      const c = e.target.closest("[data-t]");
      if (!c) return;
      st[c.dataset.t] = c.checked;
      applyToggles();
      if (c.dataset.t === "guides") applyHL();
    });
    const range = root.querySelector(".vw-glass input");
    const updateGlassNote = () => {
      const n = root.querySelector(".gl-note");
      if (n) n.textContent = st.layout === "first"
        ? "제1각법: 물체 뒤의 면에 비친 그림을 펼친다. 평면도가 정면도 아래, 우측면도가 왼쪽에 온다."
        : "제3각법: 물체 앞의 유리면에 비친 그림을 펼친다. 평면도가 정면도 위, 우측면도가 오른쪽에 온다.";
    };
    if (three) {
      root.querySelector(".vw-3d-bar").addEventListener("click", (e) => {
        const b = e.target.closest("[data-cam]");
        if (b) three.presets[b.dataset.cam]();
      });
      range.addEventListener("input", () => three.glassT(range.value / 1000));
      root.querySelector('[data-act="play"]').addEventListener("click", () => three.playGlass((t) => (range.value = Math.round(t * 1000))));
    }

    renderSheet();
    if (opts.highlight) api().highlight(opts.highlight);
    if (opts.glass && three) root.querySelector('[data-act="glass"]').click();

    function resolve(ids) {
      const out = new Set();
      if (!ids) return out;
      for (const id of [].concat(ids)) {
        if (typeof id === "string" && id.startsWith("line:")) {
          const L = id.slice(5);
          prep.partIds.forEach((pid, i) => { if (prep.parts[pid].line === L) out.add(i); });
        } else if (prep.partIndex[id] !== undefined) out.add(prep.partIndex[id]);
      }
      return out;
    }
    function api() {
      return {
        prep,
        highlight(ids) { st.ext = resolve(ids); applyHL(); },
        select(ids) { st.sel = resolve(ids); applyHL(); },
        setLayout(l) { st.layout = l; renderSheet(); },
        setSection(key, half, at) { st.sec = key ? { key: key === "B" || key === "right" ? "right" : "front", half: !!half, at: at ?? null } : null; renderSheet(); },
        destroy() { clearTimeout(secTimer); sheetRO.disconnect(); three?.destroy(); root.remove(); },
      };
    }
    return api();
  }

  // 퀴즈용 작은 3D(도면 없이). opts: { highlight:[ids], dir }
  function mini3d(host, modelId, opts = {}) {
    const prep = H.prepare(ACAD.models[modelId]);
    const wrap = ACAD.h(`<div class="vw-mini3d"></div>`);
    host.appendChild(wrap);
    const t = create3D(wrap, prep, { dir: opts.dir });
    if (opts.highlight) t.hl(new Set([].concat(opts.highlight).map((id) => prep.partIndex[id]).filter((i) => i !== undefined)));
    return { destroy() { t.destroy(); wrap.remove(); } };
  }

  ACAD.Viewer = { mount, mini3d, create3D };
})();
