// CAD 연습장: 3D 미리보기. 닫힌 윤곽을 돌출해 "내가 그린 것이 부품으로 어떻게 되는지" 바로 보여 준다.
window.ACAD = window.ACAD || {};
(function () {
  const G = ACAD.G;

  class Orbit3D {
    constructor(el, opts = {}) {
      this.el = el;
      this.ok = typeof THREE !== "undefined";
      if (!this.ok) { el.innerHTML = `<div class="cad3d-empty">3D 미리보기를 쓸 수 없습니다(three.js 없음).</div>`; return; }
      try {
        this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
      } catch (e) { this.ok = false; el.innerHTML = `<div class="cad3d-empty">이 브라우저에서 WebGL을 쓸 수 없습니다.</div>`; return; }
      this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
      this.renderer.setClearColor(opts.bg || 0xf5f5f0, 1);
      el.appendChild(this.renderer.domElement);
      this.scene = new THREE.Scene();
      this.camera = new THREE.PerspectiveCamera(35, 1, 0.1, 1e7);
      this.scene.add(new THREE.HemisphereLight(0xffffff, 0x858585, 1.1));
      const d = new THREE.DirectionalLight(0xffffff, 1.4);
      d.position.set(1, 2, 1.5);
      this.scene.add(d);
      this.dir = d;
      this.root = new THREE.Group();
      this.scene.add(this.root);
      this.theta = opts.theta ?? Math.PI / 4;
      this.phi = opts.phi ?? 0.95;
      this.dist = 100;
      this.target = new THREE.Vector3();
      const L = (this._L = {});
      L.down = (e) => { this.drag = { x: e.clientX, y: e.clientY, t: this.theta, p: this.phi }; this.renderer.domElement.setPointerCapture(e.pointerId); };
      L.move = (e) => {
        if (!this.drag) return;
        this.theta = this.drag.t - (e.clientX - this.drag.x) * 0.01;
        this.phi = Math.max(0.05, Math.min(Math.PI - 0.05, this.drag.p - (e.clientY - this.drag.y) * 0.01));
        this.render();
      };
      L.up = () => { this.drag = null; };
      L.wheel = (e) => { e.preventDefault(); this.dist *= Math.pow(1.0015, e.deltaY); this.render(); };
      const c = this.renderer.domElement;
      c.addEventListener("pointerdown", L.down);
      c.addEventListener("pointermove", L.move);
      c.addEventListener("pointerup", L.up);
      c.addEventListener("wheel", L.wheel, { passive: false });
      this.ro = new ResizeObserver(() => this.resize());
      this.ro.observe(el);
      this.resize();
    }
    resize() {
      if (!this.ok) return;
      const r = this.el.getBoundingClientRect();
      const w = Math.max(10, Math.round(r.width)), h = Math.max(10, Math.round(r.height));
      this.renderer.setSize(w, h, false);
      this.renderer.domElement.style.width = w + "px";
      this.renderer.domElement.style.height = h + "px";
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.render();
    }
    clear() {
      if (!this.ok) return;
      this.root.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) [].concat(o.material).forEach((m) => m.dispose()); });
      this.scene.remove(this.root);
      this.root = new THREE.Group();
      this.scene.add(this.root);
    }
    fit() {
      if (!this.ok) return;
      const box = new THREE.Box3().setFromObject(this.root);
      if (box.isEmpty()) { this.render(); return; }
      const s = box.getBoundingSphere(new THREE.Sphere());
      this.target.copy(s.center);
      this.dist = (s.radius / Math.sin(G.rad(this.camera.fov / 2))) * 1.15;
      this.render();
    }
    render() {
      if (!this.ok || this.gone) return;
      const t = this.target, d = this.dist;
      this.camera.position.set(t.x + d * Math.sin(this.phi) * Math.cos(this.theta), t.y + d * Math.cos(this.phi), t.z + d * Math.sin(this.phi) * Math.sin(this.theta));
      this.camera.near = d / 100; this.camera.far = d * 100;
      this.camera.updateProjectionMatrix();
      this.camera.lookAt(t);
      this.dir.position.copy(this.camera.position).add(new THREE.Vector3(d * 0.3, d * 0.8, 0));
      this.renderer.render(this.scene, this.camera);
    }
    destroy() {
      if (!this.ok) return;
      this.gone = true;
      const c = this.renderer.domElement, L = this._L;
      c.removeEventListener("pointerdown", L.down);
      c.removeEventListener("pointermove", L.move);
      c.removeEventListener("pointerup", L.up);
      c.removeEventListener("wheel", L.wheel);
      this.ro.disconnect();
      this.clear();
      this.renderer.dispose();
      try { this.renderer.forceContextLoss(); } catch (e) { /* 무시 */ }
      c.remove();
    }
    addMesh(geo, color = 0xd5d5cb) {
      const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: 0.75, metalness: 0.05, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 }));
      this.root.add(m);
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 25), new THREE.LineBasicMaterial({ color: 0x000000 }));
      m.add(edges);
      return m;
    }
  }

  // ---------- 윤곽 → THREE.Path ----------
  function pathFromPline(e, P) {
    const segs = G.plineSegs(e);
    const s0 = G.segStart(segs[0]);
    P.moveTo(s0.x, s0.y);
    for (const g of segs) {
      if (g.k === "L") P.lineTo(g.b.x, g.b.y);
      else if (g.rev) P.absarc(g.c.x, g.c.y, g.r, g.a0 + g.sw, g.a0, true);
      else P.absarc(g.c.x, g.c.y, g.r, g.a0, g.a0 + g.sw, false);
    }
    return P;
  }
  function pathFromChain(chain, P) {
    P.moveTo(chain[0].from.x, chain[0].from.y);
    for (const c of chain) {
      const e = c.e;
      if (e.type === "line") P.lineTo(c.to.x, c.to.y);
      else if (e.type === "arc") {
        const s = G.polar(e.c, e.a0, e.r);
        const sw = G.ccwSweep(e.a0, e.a1);
        if (G.dist(s, c.from) < 1e-3) P.absarc(e.c.x, e.c.y, e.r, e.a0, e.a0 + sw, false);
        else P.absarc(e.c.x, e.c.y, e.r, e.a0 + sw, e.a0, true);
      } else if (e.type === "pline") {
        const fwd = G.dist(e.pts[0], c.from) < 1e-3;
        const segs = G.plineSegs(e);
        const list = fwd ? segs : [...segs].reverse();
        for (const g of list) {
          const end = fwd ? G.segEnd(g) : G.segStart(g);
          if (g.k === "L") P.lineTo(end.x, end.y);
          else {
            const ccw = fwd ? !g.rev : g.rev;
            if (ccw) P.absarc(g.c.x, g.c.y, g.r, G.ang(g.c, fwd ? G.segStart(g) : G.segEnd(g)), G.ang(g.c, fwd ? G.segStart(g) : G.segEnd(g)) + g.sw, false);
            else P.absarc(g.c.x, g.c.y, g.r, G.ang(g.c, fwd ? G.segStart(g) : G.segEnd(g)), G.ang(g.c, fwd ? G.segStart(g) : G.segEnd(g)) - g.sw, true);
          }
        }
      }
    }
    return P;
  }
  function loopsOf(doc) {
    const ents = doc.flat().filter((e) => doc.visible(e) && e.type !== "text" && e.type !== "dim");
    const out = [];
    const sample = (mk) => { const p = mk(new THREE.Path()); return p.getPoints(24).map((v) => ({ x: v.x, y: v.y })); };
    for (const e of ents) {
      if (e.type === "circle") out.push({ mk: (P) => { P.absarc(e.c.x, e.c.y, e.r, 0, G.TAU, false); return P; }, ids: [e.id] });
      else if (e.type === "ellipse" && e.t0 == null) out.push({ mk: (P) => { P.absellipse(e.c.x, e.c.y, G.len(e.major), G.len(e.major) * e.ratio, 0, G.TAU, false, Math.atan2(e.major.y, e.major.x)); return P; }, ids: [e.id] });
      else if (e.type === "pline" && e.closed && e.pts.length >= 2) out.push({ mk: (P) => pathFromPline(e, P), ids: [e.id] });
    }
    for (const lp of ACAD.CadFeedback.findLoops(ents)) out.push({ mk: (P) => pathFromChain(lp.chain, P), ids: lp.ids });
    for (const l of out) {
      l.pts = sample(l.mk);
      l.area = Math.abs(G.polyArea(l.pts));
      l.bb = G.bboxOf(l.pts);
    }
    return out.filter((l) => l.area > 1e-9);
  }

  class Preview3D extends Orbit3D {
    constructor(el) { super(el, { bg: 0xf5f5f0 }); this.info = { solids: 0, holes: 0 }; }
    update(doc) {
      if (!this.ok) return this.info;
      this.clear();
      const loops = loopsOf(doc).sort((a, b) => b.area - a.area);
      loops.forEach((l, i) => {
        l.parent = null; l.depth = 0;
        for (let j = i - 1; j >= 0; j--) {
          const o = loops[j];
          if (o.area > l.area && G.pointInPoly(l.pts[0], o.pts) && G.pointInPoly(l.pts[Math.floor(l.pts.length / 2)], o.pts)) { l.parent = o; l.depth = o.depth + 1; break; }
        }
      });
      let bb = null;
      loops.forEach((l) => (bb = G.bboxUnion(bb, l.bb)));
      const size = bb ? Math.max(bb.x1 - bb.x0, bb.y1 - bb.y0) : 1;
      const depth = this.depthFor ? this.depthFor(size) : Math.max(size * 0.12, 1e-3);
      let solids = 0, holes = 0;
      for (const l of loops) {
        if (l.depth % 2 !== 0) continue;
        const shape = l.mk(new THREE.Shape());
        for (const h of loops) if (h.parent === l) { shape.holes.push(h.mk(new THREE.Path())); holes++; }
        const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 40 });
        geo.rotateX(-Math.PI / 2);
        this.addMesh(geo);
        solids++;
      }
      // 열린 선은 바닥에 가는 선으로
      const ents = doc.flat().filter((e) => doc.visible(e));
      const loopIds = new Set(loops.flatMap((l) => l.ids));
      const pts = [];
      for (const e of ents) {
        if (loopIds.has(e.id) || e.type === "text" || e.type === "dim") continue;
        for (const g of G.segs(e)) {
          const n = g.k === "L" ? 1 : 24;
          for (let i = 0; i < n; i++) {
            const a = G.segPoint(g, i / n), b = G.segPoint(g, (i + 1) / n);
            pts.push(a.x, 0, -a.y, b.x, 0, -b.y);
          }
        }
      }
      if (pts.length) {
        const g = new THREE.BufferGeometry();
        g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
        this.root.add(new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0x666666 })));
      }
      const sig = JSON.stringify(bb && [bb.x0, bb.y0, bb.x1, bb.y1].map((v) => Math.round(v)));
      if (sig !== this._sig) { this._sig = sig; this.fit(); } else this.render();
      this.info = { solids, holes, open: pts.length > 0, depth };
      return this.info;
    }
  }

  // 미션 참고용 3D 모델(계단 블록 등)
  function stepBlock(view) {
    // 계단 블록: 바닥판 100×60×20(지름 20 관통 구멍, 중심 x70 y30) + 왼쪽 세움부 40×60×30
    const base = new THREE.Shape();
    base.moveTo(0, 0); base.lineTo(100, 0); base.lineTo(100, 60); base.lineTo(0, 60); base.lineTo(0, 0);
    const hole = new THREE.Path(); hole.absarc(70, 30, 10, 0, G.TAU, true);
    base.holes.push(hole);
    const g1 = new THREE.ExtrudeGeometry(base, { depth: 20, bevelEnabled: false, curveSegments: 40 });
    const up = new THREE.Shape();
    up.moveTo(0, 0); up.lineTo(40, 0); up.lineTo(40, 60); up.lineTo(0, 60); up.lineTo(0, 0);
    const g2 = new THREE.ExtrudeGeometry(up, { depth: 30, bevelEnabled: false });
    g2.translate(0, 0, 20);
    // CAD 좌표(x: 가로, y: 깊이, z: 높이) → THREE(x, z=깊이 반대, y=높이)
    for (const g of [g1, g2]) { g.rotateX(-Math.PI / 2); view.addMesh(g, 0xd5d5cb); }
    // 정면 화살표
    const arrow = new THREE.ArrowHelper(new THREE.Vector3(0, 0, -1), new THREE.Vector3(50, 25, 55), 40, 0xf2520a, 10, 8);
    view.root.add(arrow);
  }
  const REF = { "step-block": stepBlock };
  function reference(el, id) {
    const v = new Orbit3D(el, { bg: 0xf5f5f0, theta: 1.05, phi: 1.0 });
    if (!v.ok) return v;
    (REF[id] || stepBlock)(v);
    v.fit();
    return v;
  }

  ACAD.CadPreview3D = Preview3D;
  ACAD.CadOrbit3D = Orbit3D;
  ACAD.CadReference3D = reference;
})();
