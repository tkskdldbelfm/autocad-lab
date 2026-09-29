// 은선 처리(Hidden Line Removal). 모델 → 투상 방향별 2D 선(보이는 선 / 숨은선 / 중심선).
// 방법: 폴리곤 인접 관계로 모서리(꺾인 모서리, 경계, 곡면 윤곽)를 뽑고,
// 그 투상 방향으로 오프스크린 깊이 버퍼를 그려 각 모서리의 샘플이 가려졌는지 판정한다.
window.ACAD = window.ACAD || {};

(function () {
  const { V } = ACAD.G3;
  const CREASE_COS = Math.cos((30 * Math.PI) / 180);

  const VIEWS = {
    top: { d: [0, 0, -1], up: [0, 1, 0], name: "평면도", en: "TOP", from: "위에서 내려다본 모양" },
    front: { d: [0, 1, 0], up: [0, 0, 1], name: "정면도", en: "FRONT", from: "앞에서 본 모양" },
    right: { d: [-1, 0, 0], up: [0, 0, 1], name: "우측면도", en: "RIGHT", from: "오른쪽에서 본 모양" },
    left: { d: [1, 0, 0], up: [0, 0, 1], name: "좌측면도", en: "LEFT", from: "왼쪽에서 본 모양" },
    back: { d: [0, -1, 0], up: [0, 0, 1], name: "배면도", en: "BACK", from: "뒤에서 본 모양" },
    bottom: { d: [0, 0, 1], up: [0, -1, 0], name: "저면도", en: "BOTTOM", from: "아래에서 올려다본 모양" },
  };
  for (const k in VIEWS) VIEWS[k].R = V.cross(VIEWS[k].d, VIEWS[k].up);

  // ---------- 준비: 정점 병합, T자 접합 보정, 모서리 목록, 렌더용 삼각형 ----------
  function prepareBody(body, tol) {
    const pos = [], keyMap = new Map();
    const q = (x) => Math.round(x / tol);
    const vid = (p) => {
      const k = q(p[0]) + "," + q(p[1]) + "," + q(p[2]);
      let i = keyMap.get(k);
      if (i === undefined) { i = pos.length; pos.push(p); keyMap.set(k, i); }
      return i;
    };
    let polys = [];
    for (const p of body.polys) {
      const idx = [];
      for (const v of p.v) { const i = vid(v); if (idx[idx.length - 1] !== i) idx.push(i); }
      while (idx.length > 1 && idx[0] === idx[idx.length - 1]) idx.pop();
      if (idx.length >= 3) polys.push({ idx, n: p.n, tag: p.tag });
    }
    if (body.csg) polys = repairTJunctions(polys, pos, tol * 4);

    // 모서리
    const emap = new Map();
    polys.forEach((p, pi) => {
      const L = p.idx.length;
      for (let i = 0; i < L; i++) {
        const a = p.idx[i], b = p.idx[(i + 1) % L];
        if (a === b) continue;
        const k = a < b ? a * 4194304 + b : b * 4194304 + a;
        let e = emap.get(k);
        if (!e) { e = { a: Math.min(a, b), b: Math.max(a, b), p: [] }; emap.set(k, e); }
        e.p.push(pi);
      }
    });
    const edges = [];
    for (const e of emap.values()) {
      let kind = "smooth";
      if (e.p.length === 1) kind = "boundary";
      else if (e.p.length > 2) kind = "crease";
      else if (V.dot(polys[e.p[0]].n, polys[e.p[1]].n) < CREASE_COS) kind = "crease";
      edges.push({ a: e.a, b: e.b, p: e.p, kind });
    }

    // 부드러운 법선(30° 이내 면끼리 평균)
    const vpolys = pos.map(() => []);
    polys.forEach((p, pi) => p.idx.forEach((i) => vpolys[i].push(pi)));
    return { pos, polys, edges, vpolys };
  }

  // 한 폴리곤의 변 위에 다른 정점이 놓여 있으면(T자 접합) 그 정점을 변에 끼워 넣는다.
  function repairTJunctions(polys, pos, tol) {
    const used = new Set();
    polys.forEach((p) => p.idx.forEach((i) => used.add(i)));
    const ids = [...used];
    return polys.map((p) => {
      const out = [];
      const L = p.idx.length;
      for (let i = 0; i < L; i++) {
        const a = p.idx[i], b = p.idx[(i + 1) % L];
        out.push(a);
        const A = pos[a], B = pos[b];
        const AB = V.sub(B, A), len = V.len(AB);
        if (len < tol * 2) continue;
        const dir = V.mul(AB, 1 / len);
        const minx = Math.min(A[0], B[0]) - tol, maxx = Math.max(A[0], B[0]) + tol;
        const miny = Math.min(A[1], B[1]) - tol, maxy = Math.max(A[1], B[1]) + tol;
        const minz = Math.min(A[2], B[2]) - tol, maxz = Math.max(A[2], B[2]) + tol;
        const hits = [];
        for (const k of ids) {
          if (k === a || k === b) continue;
          const P = pos[k];
          if (P[0] < minx || P[0] > maxx || P[1] < miny || P[1] > maxy || P[2] < minz || P[2] > maxz) continue;
          const AP = V.sub(P, A);
          const t = V.dot(AP, dir);
          if (t <= tol || t >= len - tol) continue;
          const perp = V.sub(AP, V.mul(dir, t));
          if (V.len(perp) < tol) hits.push([t, k]);
        }
        hits.sort((x, y) => x[0] - y[0]);
        for (const h of hits) out.push(h[1]);
      }
      return { idx: out, n: p.n, tag: p.tag };
    });
  }

  // 부품별 렌더 삼각형(부드러운 법선 포함)
  function buildGeoms(bodies, partIndex, nParts, tol) {
    const tri = Array.from({ length: nParts }, () => ({ p: [], n: [] }));
    for (const body of bodies) {
      const { pos, polys, vpolys } = body;
      polys.forEach((p) => {
        const pi = partIndex[p.tag];
        if (pi === undefined) return;
        const nrm = p.idx.map((i) => {
          let s = [0, 0, 0];
          for (const qi of vpolys[i]) { const qn = polys[qi].n; if (V.dot(qn, p.n) > CREASE_COS) s = V.add(s, qn); }
          return V.norm(s);
        });
        for (let k = 1; k < p.idx.length - 1; k++) {
          const A = pos[p.idx[0]], B = pos[p.idx[k]], C = pos[p.idx[k + 1]];
          if (V.len(V.cross(V.sub(B, A), V.sub(C, A))) < tol * tol) continue;
          tri[pi].p.push(...A, ...B, ...C);
          tri[pi].n.push(...nrm[0], ...nrm[k], ...nrm[k + 1]);
        }
      });
    }
    const geoms = tri.map((t) => {
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(t.p, 3));
      g.setAttribute("normal", new THREE.Float32BufferAttribute(t.n, 3));
      g.computeBoundingSphere();
      return g;
    });
    return { tri, geoms };
  }

  function prepare(model) {
    if (model._prep) return model._prep;
    const built = model.build(ACAD.G3);
    const parts = built.parts; // { id: { name, info, prio, line, kind, views } }
    // 단면 보기에서 부품을 가리기 어려운 잘린 면(면 단위로 이름 붙인 블록 모델)을 위한 가짜 부품
    parts.__cut = { name: "단면(잘린 면)", info: "자르는 선(A-A, B-B)에서 잘라 낸 자리. 가는 실선을 45°로 촘촘히 그어 해칭한다. 다른 투상도에는 이 면이 없다.", prio: -1, kind: "cut" };
    const partIds = Object.keys(parts);
    const partIndex = Object.fromEntries(partIds.map((id, i) => [id, i]));
    // 경계 상자
    const bb = { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] };
    for (const b of built.bodies) for (const p of b.polys) for (const v of p.v) for (let k = 0; k < 3; k++) {
      if (v[k] < bb.min[k]) bb.min[k] = v[k];
      if (v[k] > bb.max[k]) bb.max[k] = v[k];
    }
    const size = V.len(V.sub(bb.max, bb.min));
    const tol = size * 2e-6 + 1e-6;
    const bodies = built.bodies.map((b) => prepareBody(b, tol));

    const { tri, geoms } = buildGeoms(bodies, partIndex, partIds.length, tol);

    // 부품별 경계 상자(투상 보조선용)
    const pbox = partIds.map(() => ({ min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] }));
    tri.forEach((t, pi) => {
      for (let i = 0; i < t.p.length; i += 3) for (let k = 0; k < 3; k++) {
        const v = t.p[i + k];
        if (v < pbox[pi].min[k]) pbox[pi].min[k] = v;
        if (v > pbox[pi].max[k]) pbox[pi].max[k] = v;
      }
    });

    // 3D용 정적 모서리(꺾임+경계)
    const edgeGeo = partIds.map(() => []);
    for (const body of bodies) {
      for (const e of body.edges) {
        if (e.kind === "smooth") continue;
        const own = edgeOwners(body, e, parts, partIndex);
        if (!own.length) continue;
        edgeGeo[own[0]].push(...body.pos[e.a], ...body.pos[e.b]);
      }
    }

    const prep = {
      model, parts, partIds, partIndex, bodies, geoms, pbox, bb, size, tol, srcBodies: built.bodies, sections: [],
      edgeGeo: edgeGeo.map((a) => { const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(a, 3)); return g; }),
      axes: built.axes || [], labels: built.labels || [], dims: built.dims || [],
      flows: built.flows || [], north: !!built.north, routes: built.routes || {}, extra: built.extra || {},
      views: {},
    };
    model._prep = prep;
    return prep;
  }

  // 모서리의 주인 부품들. 우선순위(prio)가 가장 높은 부품들이 함께 갖는다(같은 순위면 양쪽 면 모두).
  function edgeOwners(body, e, parts, partIndex) {
    if (e.owners) return e.owners;
    let bestPrio = -Infinity, owners = [];
    for (const pi of e.p) {
      const tag = body.polys[pi].tag;
      const idx = partIndex[tag];
      if (idx === undefined) continue;
      const prio = parts[tag].prio ?? 0;
      if (prio > bestPrio) { bestPrio = prio; owners = [idx]; }
      else if (prio === bestPrio && !owners.includes(idx)) owners.push(idx);
    }
    e.owners = owners;
    return owners;
  }

  // ---------- 오프스크린 렌더러(모든 은선 계산이 함께 쓴다) ----------
  let off = null;
  function offscreen() {
    if (off) return off;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 4;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, preserveDrawingBuffer: false });
    renderer.setPixelRatio(1);
    const depthMat = new THREE.ShaderMaterial({
      uniforms: { uNear: { value: 0 }, uFar: { value: 1 } },
      vertexShader: "uniform float uNear; uniform float uFar; varying float vD; void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); gl_Position = projectionMatrix * mv; vD = (-mv.z - uNear) / (uFar - uNear); }",
      fragmentShader: "varying float vD; void main(){ float d = clamp(vD, 0.0, 0.999999); vec3 e = fract(d * vec3(1.0, 255.0, 65025.0)); e.x -= e.y / 255.0; e.y -= e.z / 255.0; gl_FragColor = vec4(e, 1.0); }",
      side: THREE.DoubleSide,
    });
    const idMat = new THREE.ShaderMaterial({
      uniforms: { uId: { value: new THREE.Vector3() } },
      vertexShader: "void main(){ gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
      fragmentShader: "uniform vec3 uId; void main(){ gl_FragColor = vec4(uId, 1.0); }",
      side: THREE.DoubleSide,
    });
    off = { renderer, depthMat, idMat };
    return off;
  }

  function camFor(prep, key) {
    const vw = VIEWS[key];
    const { R, up: U, d } = vw;
    let minR = Infinity, maxR = -Infinity, minU = Infinity, maxU = -Infinity, minD = Infinity, maxD = -Infinity;
    for (let i = 0; i < 8; i++) {
      const c = [i & 1 ? prep.bb.max[0] : prep.bb.min[0], i & 2 ? prep.bb.max[1] : prep.bb.min[1], i & 4 ? prep.bb.max[2] : prep.bb.min[2]];
      const r = V.dot(c, R), u = V.dot(c, U), dd = V.dot(c, d);
      minR = Math.min(minR, r); maxR = Math.max(maxR, r);
      minU = Math.min(minU, u); maxU = Math.max(maxU, u);
      minD = Math.min(minD, dd); maxD = Math.max(maxD, dd);
    }
    const ext = Math.max(maxR - minR, maxU - minU);
    const m = ext * 0.02 + 1e-3;
    minR -= m; maxR += m; minU -= m; maxU += m;
    const dist = Math.max(Math.abs(minD), Math.abs(maxD)) + prep.size;
    const near = minD + dist - m, far = maxD + dist + m;
    return { R, U, d, minR, maxR, minU, maxU, minD, maxD, dist, near, far, m };
  }

  function renderPasses(prep, cam, px) {
    const { renderer, depthMat, idMat } = offscreen();
    const W = Math.max(8, Math.ceil((cam.maxR - cam.minR) / px));
    const H = Math.max(8, Math.ceil((cam.maxU - cam.minU) / px));
    const camera = new THREE.OrthographicCamera(cam.minR, cam.minR + W * px, cam.minU + H * px, cam.minU, cam.near, cam.far);
    camera.position.set(-cam.d[0] * cam.dist, -cam.d[1] * cam.dist, -cam.d[2] * cam.dist);
    camera.up.set(cam.U[0], cam.U[1], cam.U[2]);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();
    camera.updateProjectionMatrix();
    const scene = new THREE.Scene();
    const meshes = prep.geoms.map((g, i) => {
      const m = new THREE.Mesh(g, depthMat);
      m.userData.id = i + 1;
      m.frustumCulled = false;
      scene.add(m);
      return m;
    });
    const rt = new THREE.WebGLRenderTarget(W, H, { depthBuffer: true, stencilBuffer: false, type: THREE.UnsignedByteType, format: THREE.RGBAFormat, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
    renderer.setRenderTarget(rt);
    renderer.setClearColor(0xffffff, 1);
    depthMat.uniforms.uNear.value = cam.near;
    depthMat.uniforms.uFar.value = cam.far;
    renderer.clear();
    renderer.render(scene, camera);
    const dbuf = new Uint8Array(W * H * 4);
    renderer.readRenderTargetPixels(rt, 0, 0, W, H, dbuf);
    const depth = new Float32Array(W * H);
    for (let i = 0; i < W * H; i++) depth[i] = dbuf[i * 4] / 255 + dbuf[i * 4 + 1] / 65025 + dbuf[i * 4 + 2] / 16581375;

    // 부품 id 버퍼
    renderer.setClearColor(0x000000, 1);
    renderer.clear();
    const idScene = new THREE.Scene();
    meshes.forEach((m) => {
      const id = m.userData.id;
      const mat = idMat.clone();
      mat.uniforms.uId.value.set((id & 255) / 255, ((id >> 8) & 255) / 255, 0);
      const mm = new THREE.Mesh(m.geometry, mat);
      mm.frustumCulled = false;
      idScene.add(mm);
    });
    renderer.render(idScene, camera);
    renderer.readRenderTargetPixels(rt, 0, 0, W, H, dbuf);
    const ids = new Uint16Array(W * H);
    for (let i = 0; i < W * H; i++) ids[i] = dbuf[i * 4] + (dbuf[i * 4 + 1] << 8);
    idScene.children.forEach((m) => m.material.dispose());
    renderer.setRenderTarget(null);
    rt.dispose();
    return { W, H, depth, ids };
  }

  // 한 투상 방향의 선 계산
  function view(prep, key) {
    if (prep.views[key]) return prep.views[key];
    const cam = camFor(prep, key);
    const ext = Math.max(cam.maxR - cam.minR, cam.maxU - cam.minU);
    const px = ext / 1100;
    const { W, H, depth, ids } = renderPasses(prep, cam, px);
    const range = cam.far - cam.near;
    const eps = (px * 2.5 + ext * 0.0015) / range;
    const toPix = (r, u) => [(r - cam.minR) / px, (u - cam.minU) / px];
    const bufMax = (x, y) => {
      const xi = Math.floor(x), yi = Math.floor(y);
      let m = -1;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const xx = xi + dx, yy = yi + dy;
        if (xx < 0 || yy < 0 || xx >= W || yy >= H) return 2;
        const v = depth[yy * W + xx];
        if (v > m) m = v;
      }
      return m;
    };
    const segs = { vis: prep.partIds.map(() => []), hid: prep.partIds.map(() => []) };
    const { R, U, d } = cam;
    for (const body of prep.bodies) {
      const { pos, polys, edges } = body;
      for (const e of edges) {
        let use = e.kind !== "smooth";
        if (!use) {
          const s1 = V.dot(polys[e.p[0]].n, d) > 1e-9, s2 = V.dot(polys[e.p[1]].n, d) > 1e-9;
          use = s1 !== s2;
        }
        if (!use) continue;
        const own = edgeOwners(body, e, prep.parts, prep.partIndex);
        if (!own.length) continue;
        if (prep.edgeFilter && !prep.edgeFilter(pos[e.a], pos[e.b])) continue;
        const A = pos[e.a], B = pos[e.b];
        const ra = V.dot(A, R), ua = V.dot(A, U), rb = V.dot(B, R), ub = V.dot(B, U);
        const da = (V.dot(A, d) + cam.dist - cam.near) / range, db = (V.dot(B, d) + cam.dist - cam.near) / range;
        const [xa, ya] = toPix(ra, ua), [xb, yb] = toPix(rb, ub);
        const Lp = Math.hypot(xb - xa, yb - ya);
        if (Lp < 0.25) continue;
        const n = Math.max(2, Math.ceil(Lp / 1.0));
        const flags = new Array(n);
        for (let i = 0; i < n; i++) {
          const t = (i + 0.5) / n;
          const ds = da + (db - da) * t;
          flags[i] = ds <= bufMax(xa + (xb - xa) * t, ya + (yb - ya) * t) + eps;
        }
        // 한두 칸짜리 뒤집힘은 이웃에 맞춘다
        for (let pass = 0; pass < 2; pass++) {
          for (let i = 0; i < n; i++) {
            const l = i > 0 ? flags[i - 1] : flags[i + 1], r = i < n - 1 ? flags[i + 1] : flags[i - 1];
            if (l === r && flags[i] !== l) flags[i] = l;
          }
        }
        let s = 0;
        for (let i = 1; i <= n; i++) {
          if (i === n || flags[i] !== flags[s]) {
            const t0 = s / n, t1 = i / n;
            const seg = [ra + (rb - ra) * t0, ua + (ub - ua) * t0, ra + (rb - ra) * t1, ua + (ub - ua) * t1];
            for (const pi of own) (flags[s] ? segs.vis : segs.hid)[pi].push(seg);
            s = i;
          }
        }
      }
    }
    const out = {
      key, cam, px, W, H, ids,
      vis: segs.vis.map((s) => chain(s, px * 0.6)),
      hid: segs.hid.map((s) => chain(s, px * 0.6)),
      centers: centerLines(prep, cam),
      masks: {},
    };
    prep.views[key] = out;
    return out;
  }

  // 끝점이 맞닿은 선분을 이어 폴리라인으로 만든다(파선 무늬가 끊기지 않게).
  function chain(segs, tol) {
    if (!segs.length) return [];
    const k = (x, y) => Math.round(x / tol) + "," + Math.round(y / tol);
    // 투상하면 겹치는 선분(예: 관통 구멍의 위·아래 원)은 하나만 남긴다
    const seen = new Set();
    segs = segs.filter((s) => {
      const a = k(s[0], s[1]), b = k(s[2], s[3]);
      if (a === b) return false;
      const key = a < b ? a + "|" + b : b + "|" + a;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    const ends = new Map();
    const add = (key, i) => { let a = ends.get(key); if (!a) ends.set(key, (a = [])); a.push(i); };
    segs.forEach((s, i) => { add(k(s[0], s[1]), i); add(k(s[2], s[3]), i); });
    const used = new Uint8Array(segs.length);
    const lines = [];
    const take = (key) => { const a = ends.get(key); if (!a) return -1; for (const i of a) if (!used[i]) return i; return -1; };
    for (let i = 0; i < segs.length; i++) {
      if (used[i]) continue;
      used[i] = 1;
      let pts = [[segs[i][0], segs[i][1]], [segs[i][2], segs[i][3]]];
      for (let dir = 0; dir < 2; dir++) {
        for (;;) {
          const end = pts[pts.length - 1];
          const j = take(k(end[0], end[1]));
          if (j < 0) break;
          used[j] = 1;
          const s = segs[j];
          const fwd = k(s[0], s[1]) === k(end[0], end[1]);
          pts.push(fwd ? [s[2], s[3]] : [s[0], s[1]]);
        }
        pts.reverse();
      }
      if (pts.length >= 2) lines.push(simplify(pts, tol * 0.3));
    }
    return lines;
  }

  // 한 직선 위에 있는 중간점을 뺀다
  function simplify(pts, tol) {
    if (pts.length < 3) return pts;
    const out = [pts[0]];
    for (let i = 1; i < pts.length - 1; i++) {
      const a = out[out.length - 1], b = pts[i], c = pts[i + 1];
      const cr = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
      const L = Math.hypot(c[0] - a[0], c[1] - a[1]) || 1;
      // 한 직선 위라도 방향이 되돌아가는 점(겹친 선을 따라 되돌아온 경우)은 남긴다
      const fwd = (b[0] - a[0]) * (c[0] - b[0]) + (b[1] - a[1]) * (c[1] - b[1]) > 0;
      if (Math.abs(cr) / L > tol || !fwd) out.push(b);
    }
    out.push(pts[pts.length - 1]);
    return out;
  }

  // 중심선: 축 점열을 투상. 끝에서 본 축(점)은 십자, 옆에서 본 축은 연장한 선.
  function centerLines(prep, cam) {
    const out = [];
    const { R, U } = cam;
    for (const ax of prep.axes) {
      if (ax.circle) continue;
      const pi = prep.partIndex[ax.part] ?? -1;
      const P = ax.pts.map((p) => [V.dot(p, R), V.dot(p, U)]);
      let L = 0;
      for (let i = 1; i < P.length; i++) L += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]);
      const ext = Math.max(ax.r * 0.35, prep.size * 0.012);
      if (L < prep.size * 1e-4) {
        if (ax.cross === false) continue;
        const [x, y] = P[0], s = ax.r + ext;
        out.push({ part: pi, pts: [[x - s, y], [x + s, y]] });
        out.push({ part: pi, pts: [[x, y - s], [x, y + s]] });
      } else if (P.length === 2 || ax.straight) {
        if (ax.side === false) continue;
        const a = P[0], b = P[P.length - 1];
        const dx = (b[0] - a[0]) / L, dy = (b[1] - a[1]) / L;
        const e = ax.ext === false ? 0 : ext;
        out.push({ part: pi, pts: [[a[0] - dx * e, a[1] - dy * e], [b[0] + dx * e, b[1] + dy * e]] });
      } else {
        if (ax.side === false) continue;
        out.push({ part: pi, pts: P });
      }
    }
    return out;
  }

  // 부품의 보이는 면 영역을 반투명 노란 마스크 이미지로(평면 좌표 기준, 위가 +U)
  function mask(prep, vw, pi) {
    if (vw.masks[pi]) return vw.masks[pi];
    const c = document.createElement("canvas");
    c.width = vw.W; c.height = vw.H;
    const g = c.getContext("2d");
    const img = g.createImageData(vw.W, vw.H);
    const id = pi + 1;
    let any = false;
    for (let y = 0; y < vw.H; y++) {
      const row = (vw.H - 1 - y) * vw.W;
      for (let x = 0; x < vw.W; x++) {
        if (vw.ids[y * vw.W + x] === id) {
          const o = (row + x) * 4;
          img.data[o] = 255; img.data[o + 1] = 255; img.data[o + 2] = 0; img.data[o + 3] = 150;
          any = true;
        }
      }
    }
    g.putImageData(img, 0, 0);
    vw.masks[pi] = any ? c.toDataURL() : "";
    return vw.masks[pi];
  }

  // (r,u) 위치의 앞쪽 부품 번호(-1 = 없음)
  function pick(vw, r, u) {
    const x = Math.floor((r - vw.cam.minR) / vw.px), y = Math.floor((u - vw.cam.minU) / vw.px);
    if (x < 0 || y < 0 || x >= vw.W || y >= vw.H) return -1;
    return vw.ids[y * vw.W + x] - 1;
  }

  // ---------- 단면 ----------
  // spec = { key:'front'|'right', at: 자르는 위치(front → y 좌표, right → x 좌표), half: 반단면 여부 }
  // 보는 쪽(보는 사람과 자르는 면 사이)의 재료를 없앤다. 반단면이면 그중 투상도 오른쪽 절반(한 사분면)만 없앤다.
  const SEC = { front: { axis: 1, letter: "A" }, right: { axis: 0, letter: "B" } };
  const mkPoly = ACAD.G3.poly;

  function lexLess(a, b) { return a[0] !== b[0] ? a[0] < b[0] : a[1] !== b[1] ? a[1] < b[1] : a[2] < b[2]; }
  // 선분과 평면의 교점. 끝점 순서를 고정해 이웃 폴리곤에서도 똑같은 점이 나오게 한다.
  function crossPt(a, b, sa, sb) {
    if (!lexLess(a, b)) { const t = a; a = b; b = t; const w = sa; sa = sb; sb = w; }
    return V.lerp(a, b, sa / (sa - sb));
  }
  function splitConvex(v, f) {
    const s = v.map(f), n = v.length, pos = [], neg = [];
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      (s[i] >= 0 ? pos : neg).push(v[i]);
      if ((s[i] >= 0) !== (s[j] >= 0)) { const p = crossPt(v[i], v[j], s[i], s[j]); pos.push(p); neg.push(p); }
    }
    return [pos.length >= 3 ? pos : null, neg.length >= 3 ? neg : null];
  }
  function planeSegments(polys, f) {
    const segs = [];
    for (const p of polys) {
      const s = p.v.map(f), pts = [];
      for (let i = 0; i < p.v.length; i++) {
        const j = (i + 1) % p.v.length;
        if ((s[i] >= 0) !== (s[j] >= 0)) pts.push(crossPt(p.v[i], p.v[j], s[i], s[j]));
      }
      for (let i = 0; i + 1 < pts.length; i += 2) segs.push([pts[i], pts[i + 1]]);
    }
    return segs;
  }
  // 교선 조각을 이어 닫힌 고리로. 열린 사슬(두께 없는 면을 길이 방향으로 자른 자리)은 버린다.
  // keepOpen이면 { loops, open } 으로 열린 사슬도 돌려준다(속이 빈 관을 길이 방향으로 자른 자리).
  function chainLoops(segs, tol, keepOpen) {
    const key = (p) => Math.round(p[0] / tol) + "," + Math.round(p[1] / tol) + "," + Math.round(p[2] / tol);
    const at = new Map();
    segs.forEach((sg, i) => { for (const e of [0, 1]) { const k = key(sg[e]); let a = at.get(k); if (!a) at.set(k, (a = [])); a.push(i); } });
    const used = new Uint8Array(segs.length), loops = [], open = [];
    // from 점에서 시작해 쓰지 않은 조각을 따라간다. 출발점으로 돌아오면 true.
    const walk = (from, startKey, out) => {
      let cur = from;
      for (let guard = 0; guard < segs.length + 2; guard++) {
        const kc = key(cur);
        if (kc === startKey) return true;
        out.push(cur);
        const cand = (at.get(kc) || []).find((j) => !used[j]);
        if (cand === undefined) return false;
        used[cand] = 1;
        cur = key(segs[cand][0]) === kc ? segs[cand][1] : segs[cand][0];
      }
      return false;
    };
    for (let i = 0; i < segs.length; i++) {
      if (used[i]) continue;
      used[i] = 1;
      const fwd = [segs[i][0]];
      const closed = walk(segs[i][1], key(segs[i][0]), fwd);
      if (!closed) {
        if (keepOpen) {
          const bwd = [];
          walk(segs[i][0], null, bwd);
          const pts = bwd.slice(1).reverse().concat(fwd);
          if (pts.length >= 2) open.push(pts);
        }
        continue;
      }
      const clean = [];
      for (const p of fwd) if (!clean.length || V.len(V.sub(p, clean[clean.length - 1])) > tol) clean.push(p);
      if (clean.length > 3 && V.len(V.sub(clean[0], clean[clean.length - 1])) <= tol) clean.pop();
      if (clean.length >= 3) loops.push(clean);
    }
    return keepOpen ? { loops, open } : loops;
  }

  function inPoly(pt, poly2) {
    let c = false;
    for (let i = 0, j = poly2.length - 1; i < poly2.length; j = i++) {
      const a = poly2[i], b = poly2[j];
      if ((a[1] > pt[1]) !== (b[1] > pt[1]) && pt[0] < ((b[0] - a[0]) * (pt[1] - a[1])) / (b[1] - a[1]) + a[0]) c = !c;
    }
    return c;
  }
  // 평면 안의 닫힌 고리를 안쪽으로 w만큼 줄인 고리(3D). 너무 얇아 뒤집히면 null.
  function offsetInward(L, w, A, B) {
    const P0 = L[0], x0 = V.dot(P0, A), y0 = V.dot(P0, B);
    const q = L.map((p) => [V.dot(p, A), V.dot(p, B)]);
    const area = (pts) => pts.reduce((s, a, i) => { const b = pts[(i + 1) % pts.length]; return s + a[0] * b[1] - b[0] * a[1]; }, 0) / 2;
    const a0 = area(q), sg = a0 > 0 ? 1 : -1;
    const lines = [];
    for (let i = 0; i < q.length; i++) {
      const a = q[i], b = q[(i + 1) % q.length];
      const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy);
      if (len < 1e-9) continue;
      const nx = (-dy / len) * sg, ny = (dx / len) * sg;
      lines.push({ v: a, p: [a[0] + nx * w, a[1] + ny * w], d: [dx / len, dy / len] });
    }
    if (lines.length < 3) return null;
    const out = [];
    for (let i = 0; i < lines.length; i++) {
      const l1 = lines[(i - 1 + lines.length) % lines.length], l2 = lines[i];
      const cr = l1.d[0] * l2.d[1] - l1.d[1] * l2.d[0];
      let pt = l2.p;
      if (Math.abs(cr) > 1e-6) {
        const t = ((l2.p[0] - l1.p[0]) * l2.d[1] - (l2.p[1] - l1.p[1]) * l2.d[0]) / cr;
        const cand = [l1.p[0] + l1.d[0] * t, l1.p[1] + l1.d[1] * t];
        if (Math.hypot(cand[0] - l2.v[0], cand[1] - l2.v[1]) < w * 4) pt = cand;
      }
      out.push(pt);
    }
    const a1 = area(out);
    if (a1 * a0 <= 0 || Math.abs(a1) >= Math.abs(a0)) return null;
    return out.map(([x, y]) => V.add(P0, V.add(V.mul(A, x - x0), V.mul(B, y - y0))));
  }

  // 속이 빈 관(열린 원통·엘보)을 길이 방향으로 자르면 벽 자리가 열린 사슬 두 줄로 나온다.
  // 각 사슬을 맞은편 사슬 쪽으로 벽 두께만큼 띄워 띠 모양 단면을 만든다.
  function stripTris(chains, wall, A, B) {
    const out = [];
    if (chains.length < 2) return out;
    chains.forEach((c, ci) => {
      const others = chains.filter((_, j) => j !== ci).flat();
      const off = c.map((p) => {
        let best = null, bd = Infinity;
        for (const o of others) { const d = V.len(V.sub(o, p)); if (d < bd) { bd = d; best = o; } }
        const w = Math.min(wall, bd * 0.45);
        return V.add(p, V.mul(V.norm(V.sub(best, p)), w));
      });
      const poly = c.concat(off.slice().reverse());
      const pv = poly.map((p) => new THREE.Vector2(V.dot(p, A), V.dot(p, B)));
      try { THREE.ShapeUtils.triangulateShape(pv, []).forEach((t) => out.push(t.map((i) => poly[i]))); } catch (e) { /* 모양이 꼬이면 건너뛴다 */ }
    });
    return out;
  }

  // 고리들 → 삼각형(3D). A, B = 평면 안의 두 축. wall이 있으면 관 벽(고리 모양)으로 만든다.
  function loopsToTris(loops, A, B, wall) {
    const p2 = (p) => [V.dot(p, A), V.dot(p, B)];
    const tri = (outer, holes) => {
      const cv = outer.map((p) => new THREE.Vector2(...p2(p)));
      const hv = holes.map((h) => h.map((p) => new THREE.Vector2(...p2(p))));
      const all = outer.concat(...holes);
      try { return THREE.ShapeUtils.triangulateShape(cv, hv).map((t) => t.map((i) => all[i])); } catch (e) { return []; }
    };
    const out = [];
    if (wall) {
      for (const L of loops) {
        const cen = V.mul(L.reduce((s, p) => V.add(s, p), [0, 0, 0]), 1 / L.length);
        const ds = L.map((p) => V.len(V.sub(p, cen)));
        const r = ds.reduce((s, x) => s + x, 0) / ds.length;
        if ((Math.max(...ds) - Math.min(...ds)) / r < 0.08) {
          // 관을 가로로 자른 자리: 원 → 고리
          const k = Math.max(0.05, 1 - wall / r);
          out.push(...tri(L, [L.map((p) => V.lerp(cen, p, k))]));
        } else {
          // 속이 찬 관을 길이 방향으로 자른 자리: 안쪽으로 벽 두께만큼 줄인 구멍을 뺀다
          const inner = offsetInward(L, wall, A, B);
          out.push(...tri(L, inner ? [inner] : []));
        }
      }
      return out;
    }
    const L2 = loops.map((L) => L.map(p2));
    const area = L2.map((l) => Math.abs(l.reduce((s, a, i) => { const b = l[(i + 1) % l.length]; return s + a[0] * b[1] - b[0] * a[1]; }, 0) / 2));
    const inside = loops.map((_, i) => loops.map((__, j) => i !== j && area[j] > area[i] && inPoly(L2[i][0], L2[j])));
    const depth = inside.map((row) => row.filter(Boolean).length);
    loops.forEach((L, i) => {
      if (depth[i] % 2) return;
      const holes = loops.filter((_, j) => depth[j] === depth[i] + 1 && inside[j][i]);
      out.push(...tri(L, holes));
    });
    return out;
  }

  function sectionDefault(prep, key) {
    const m = SEC[key] || SEC.front;
    const d = prep.model.section && prep.model.section[m.letter];
    return d != null ? d : (prep.bb.min[m.axis] + prep.bb.max[m.axis]) / 2;
  }
  function sectionRange(prep, key) {
    const m = SEC[key] || SEC.front;
    return [prep.bb.min[m.axis], prep.bb.max[m.axis]];
  }

  function section(prep, spec) {
    const key = spec.key === "right" ? "right" : "front";
    const meta = SEC[key];
    const at = spec.at != null && isFinite(spec.at) ? +spec.at : sectionDefault(prep, key);
    const half = !!spec.half;
    const ck = key + ":" + at.toFixed(3) + ":" + (half ? 1 : 0);
    const cached = prep.sections.find((x) => x.ck === ck);
    if (cached) return cached;
    const vw = VIEWS[key], d = vw.d, R = vw.R, U = vw.up;
    const pt = [0, 0, 0]; pt[meta.axis] = at;
    const c = V.dot(d, pt);
    const rc = V.dot(R, V.mul(V.add(prep.bb.min, prep.bb.max), 0.5));
    const eps = prep.size * 1e-7 + 1e-9;
    const nud = (x) => (Math.abs(x) < eps ? eps : x);
    const f1 = (p) => nud(V.dot(d, p) - c);
    const f2 = (p) => nud(rc - V.dot(R, p));
    const model = prep.model;
    const splits = model.sectionSplits || [];
    const owner = model.sectionOwner;
    const loopTol = prep.size * 1e-5 + 1e-7;
    const hatch = {}, capTri = {};
    const raw = [];
    for (const body of prep.srcBodies) {
      const out = [];
      for (const p of body.polys) {
        const [k1, r1] = splitConvex(p.v, f1);
        if (k1) out.push({ v: k1, n: p.n, tag: p.tag });
        if (half && r1) { const k2 = splitConvex(r1, f2)[0]; if (k2) out.push({ v: k2, n: p.n, tag: p.tag }); }
      }
      if (!out.length) continue;
      const tags = new Set(body.polys.map((q) => q.tag));
      const single = tags.size === 1 ? [...tags][0] : null;
      const wall = single && prep.parts[single] ? prep.parts[single].wall : 0;
      const fallback = single || "__cut";
      const addCaps = (tris, want, onP1) => {
        for (const t of tris) {
          let pieces = [t];
          for (const [ax, val] of splits) {
            const next = [];
            for (const pc of pieces) { const [a, b] = splitConvex(pc, (q) => nud(q[ax] - val)); if (a) next.push(a); if (b) next.push(b); }
            pieces = next;
          }
          for (const pc of pieces) {
            const cen = V.mul(pc.reduce((sm, q) => V.add(sm, q), [0, 0, 0]), 1 / pc.length);
            let tag = owner ? owner(cen) : null;
            if (!tag || prep.partIndex[tag] === undefined) tag = fallback;
            let q = mkPoly(pc, tag);
            if (V.dot(q.n, want) < 0) q = mkPoly(pc.slice().reverse(), tag);
            out.push(q);
            const pi = prep.partIndex[tag];
            (capTri[pi] ||= []).push(q.v);
            if (onP1) (hatch[pi] ||= []).push(q.v.map((v) => [V.dot(v, R), V.dot(v, U)]));
          }
        }
      };
      // 자르는 면 1(보는 방향에 수직)
      const cutTris = (f, A, B) => {
        if (!wall) return loopsToTris(chainLoops(planeSegments(body.polys, f), loopTol), A, B, 0);
        const r = chainLoops(planeSegments(body.polys, f), loopTol, true);
        return loopsToTris(r.loops, A, B, wall).concat(stripTris(r.open, wall, A, B));
      };
      let t1 = cutTris(f1, R, U);
      if (half) t1 = t1.map((t) => splitConvex(t, f2)[1]).filter(Boolean);
      addCaps(t1, V.mul(d, -1), true);
      // 반단면의 자르는 면 2(단면도에서는 선으로만 보인다)
      if (half) {
        const t2 = cutTris(f2, d, U).map((t) => splitConvex(t, f1)[1]).filter(Boolean);
        addCaps(t2, R, false);
      }
      raw.push({ polys: out, csg: body.csg || splits.length > 0 || half });
    }
    const bodies = raw.map((b) => prepareBody(b, prep.tol));
    const { geoms } = buildGeoms(bodies, prep.partIndex, prep.partIds.length, prep.tol);
    // 3D용 모서리(꺾임+경계)
    const edgeArr = prep.partIds.map(() => []);
    for (const body of bodies) for (const e of body.edges) {
      if (e.kind === "smooth") continue;
      const own = edgeOwners(body, e, prep.parts, prep.partIndex);
      if (own.length) edgeArr[own[0]].push(...body.pos[e.a], ...body.pos[e.b]);
    }
    const edgeGeo = edgeArr.map((a) => { const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(a, 3)); return g; });
    const e2 = prep.size * 1e-4;
    const sp = {
      model, parts: prep.parts, partIds: prep.partIds, partIndex: prep.partIndex, bb: prep.bb, size: prep.size, tol: prep.tol,
      axes: prep.axes, bodies, geoms, edgeGeo, views: {}, hatch, capTri, ck,
      key, letter: meta.letter, axis: meta.axis, at, c, rc, d, R, U, half,
      edgeFilter: half ? (A, B) => !(Math.abs(rc - V.dot(R, A)) < e2 && Math.abs(rc - V.dot(R, B)) < e2 && V.dot(d, A) - c < e2 && V.dot(d, B) - c < e2) : null,
    };
    prep.sections.push(sp);
    if (prep.sections.length > 6) { const o = prep.sections.shift(); o.geoms.forEach((g) => g.dispose()); o.edgeGeo.forEach((g) => g.dispose()); }
    return sp;
  }

  // 이 부품의 잘린 면을 해칭하나? KS: 리브·축·볼트 등은 길이 방향으로 자르면 해칭하지 않는다.
  // 배관 모델은 관 벽(wall)만 해칭한다(장치는 윤곽만).
  function hatchable(prep, pi, letter) {
    const p = prep.parts[prep.partIds[pi]];
    if (!p) return false;
    if (p.noHatch && p.noHatch[letter]) return false;
    if (prep.model.kind === "piping") return !!p.wall;
    return true;
  }

  // 잘린 면을 어떻게 칠하나: 'hatch'(45° 해칭) · 'solid'(얇은 단면 — 관 벽은 검게 칠한다) · 'none'(해칭하지 않음)
  function cutStyle(prep, pi, letter) {
    const p = prep.parts[prep.partIds[pi]];
    if (!p) return "none";
    if (p.noHatch && p.noHatch[letter]) return "none";
    if (prep.model.kind === "piping") return p.wall ? "solid" : "none";
    return "hatch";
  }
  // 해칭하지 않는 이유(KS)
  function noHatchReason(prep, pi, letter) {
    const p = prep.parts[prep.partIds[pi]];
    return p && p.noHatch && typeof p.noHatch[letter] === "string" ? p.noHatch[letter] : "";
  }

  let hatchSeq = 0;

  // 한 면만 담은 작은 SVG 문자열(퀴즈 보기용). opt: { mirror, hidden:true, center:true, hlPart, section:{at, half}, hatchAll(틀린 보기: 해칭 규칙 무시) }
  function viewSVG(prep, key, opt = {}) {
    const sp = opt.section ? section(prep, { key, at: opt.section.at, half: opt.section.half }) : null;
    const vw = view(sp || prep, key);
    const { cam } = vw;
    const sx = opt.mirror ? -1 : 1;
    const x0 = opt.mirror ? -cam.maxR : cam.minR, x1 = opt.mirror ? -cam.minR : cam.maxR;
    const pad = (x1 - x0) * 0.08;
    const vb = [x0 - pad, -cam.maxU - pad, x1 - x0 + pad * 2, cam.maxU - cam.minU + pad * 2];
    const u = Math.max(vb[2], vb[3]) / 260;
    const path = (lines) => lines.map((l) => "M" + l.map((p) => (p[0] * sx).toFixed(2) + " " + (-p[1]).toFixed(2)).join("L")).join("");
    let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb.map((v) => v.toFixed(2)).join(" ")}" class="mini-view" style="--u:${u.toFixed(4)}">`;
    if (sp) {
      const id = "mh" + ++hatchSeq, gap = u * 5;
      s += `<defs><pattern id="${id}" patternUnits="userSpaceOnUse" width="${gap.toFixed(3)}" height="${gap.toFixed(3)}" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="${gap.toFixed(3)}" class="hatch-ln"/></pattern></defs>`;
      for (const pi in sp.hatch) {
        const d = sp.hatch[pi].map((t) => "M" + t.map((p) => (p[0] * sx).toFixed(2) + " " + (-p[1]).toFixed(2)).join("L") + "Z").join("");
        const cs = opt.hatchAll && cutStyle(prep, +pi, sp.letter) === "none" ? "hatch" : cutStyle(prep, +pi, sp.letter);
        s += `<path class="cutbg${cs === "solid" ? " solid" : ""}${opt.hlPart === +pi ? " hl" : ""}" d="${d}"/>`;
        if (cs === "hatch") s += `<path class="hatch" d="${d}" fill="url(#${id})"/>`;
      }
    }
    if (opt.hidden !== false && !sp) {
      vw.hid.forEach((ls, pi) => { if (ls.length) s += `<path class="hid${opt.hlPart === pi ? " hl" : ""}" d="${path(ls)}"/>`; });
    }
    if (opt.center !== false) {
      vw.centers.forEach((c) => { s += `<path class="ctr" d="${path([c.pts])}"/>`; });
    }
    vw.vis.forEach((ls, pi) => { if (ls.length) s += `<path class="vis${opt.hlPart === pi && !opt.hlHiddenOnly ? " hl" : ""}" d="${path(ls)}"/>`; });
    return s + "</svg>";
  }

  ACAD.HLR = { VIEWS, SEC, prepare, view, mask, pick, viewSVG, camFor, section, sectionDefault, sectionRange, hatchable, cutStyle, noHatchReason };
})();
