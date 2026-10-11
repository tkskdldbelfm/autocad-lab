// 공통 도우미. 모든 모듈은 전역 ACAD 네임스페이스 하나만 쓴다.
window.ACAD = window.ACAD || {};
ACAD.pages = ACAD.pages || {};

// HTML 문자열을 요소로 만든다. 여러 최상위 노드면 DocumentFragment를 돌려준다.
ACAD.h = function (html) {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.childElementCount === 1 ? t.content.firstElementChild : t.content;
};

ACAD.esc = function (s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
};

// localStorage는 막혀 있을 수 있으므로 항상 감싼다.
ACAD.store = {
  prefix: "acadlab:",
  get(key, fallback) {
    try {
      const raw = localStorage.getItem(this.prefix + key);
      return raw == null ? fallback : JSON.parse(raw);
    } catch { return fallback; }
  },
  // 저장에 실패하면 false. 처음 실패할 때 한 번만 화면에 알린다(사생활 보호 모드, 용량 초과 등).
  set(key, value) {
    try { localStorage.setItem(this.prefix + key, JSON.stringify(value)); return true; }
    catch (e) {
      if (!this.failed) { this.failed = true; ACAD.bus.emit("store:fail", { key, error: e }); }
      return false;
    }
  },
};

// 난수. seed가 같으면 같은 순서(반복 드릴 문제, 확인 문제 보기 섞기).
ACAD.rng = function (seed) {
  let a = seed >>> 0 || 1;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (lo, hi) => lo + Math.floor(next() * (hi - lo + 1));
  return { next, int, step: (lo, hi, s) => lo + s * int(0, Math.floor((hi - lo) / s)), pick: (arr) => arr[int(0, arr.length - 1)] };
};
ACAD.newSeed = () => (Math.floor(Math.random() * 2147483646) + 1) >>> 0;
// 글자열 → seed (보기 섞기처럼 늘 같은 결과가 필요할 때)
ACAD.hashSeed = (s) => { let h = 2166136261; for (const ch of String(s)) h = Math.imul(h ^ ch.codePointAt(0), 16777619); return h >>> 0; };

// ---------- 배관 경로(3년차 아이소 드릴·퀴즈 공용) ----------
// 구간 = [방향, 길이(mm)]. 방향 E W N S U D = 동 서 북 남 위 아래. x = 동, y = 북, z = 위.
ACAD.PIPE_DIRS = { E: [1, 0, 0], W: [-1, 0, 0], N: [0, 1, 0], S: [0, -1, 0], U: [0, 0, 1], D: [0, 0, -1] };
ACAD.PIPE_KO = { E: "동", W: "서", N: "북", S: "남", U: "위", D: "아래" };
ACAD.routePts = function (route, o = [0, 0, 0]) {
  const pts = [o.slice()];
  for (const [d, L] of route) { const v = ACAD.PIPE_DIRS[d], p = pts[pts.length - 1]; pts.push([p[0] + v[0] * L, p[1] + v[1] * L, p[2] + v[2] * L]); }
  return pts;
};
// 투상: plan = (x, y), elev = 남쪽에서 북쪽을 보는 입면 (x, z), iso = 북쪽이 오른쪽 위, 동쪽이 오른쪽 아래, 위가 위 (y는 위로 +)
ACAD.routeProj = {
  plan: (p) => [p[0], p[1]],
  elev: (p) => [p[0], p[2]],
  iso: (p) => [(p[0] + p[1]) * Math.cos(Math.PI / 6), (p[1] - p[0]) / 2 + p[2]],
};
ACAD.routeAxis = (d) => ("EW".includes(d) ? "x" : "NS".includes(d) ? "y" : "z");
(function () {
  const OPP = { E: "W", W: "E", N: "S", S: "N", U: "D", D: "U" };
  const SKIP = { plan: "UD", elev: "NS", iso: "" };
  const ptSeg = (p, a, b) => {
    const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy;
    const t = L2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L2)) : 0;
    return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
  };
  const orient = (a, b, c) => Math.sign((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]));
  const segDist = (s, t) => {
    if (orient(s.a, s.b, t.a) * orient(s.a, s.b, t.b) < 0 && orient(t.a, t.b, s.a) * orient(t.a, t.b, s.b) < 0) return 0;
    return Math.min(ptSeg(s.a, t.a, t.b), ptSeg(s.b, t.a, t.b), ptSeg(t.a, s.a, s.b), ptSeg(t.b, s.a, s.b));
  };
  // 투상한 그림이 읽기 쉬운지: 되돌아가는 구간이 없고, 이웃하지 않은 구간끼리 겹치거나 닿지 않는다.
  ACAD.routeReadable = function (route, kind, gap = 150) {
    const pts = ACAD.routePts(route), pr = ACAD.routeProj[kind];
    const segs = [];
    route.forEach(([d], i) => { if (!SKIP[kind].includes(d)) segs.push({ d, a: pr(pts[i]), b: pr(pts[i + 1]) }); });
    for (let i = 1; i < segs.length; i++) if (segs[i].d === OPP[segs[i - 1].d]) return false;
    for (let i = 0; i < segs.length; i++) for (let j = i + 2; j < segs.length; j++) if (segDist(segs[i], segs[j]) < gap) return false;
    return true;
  };
  // 이웃한 구간은 축이 달라야 한다(같은 방향 두 번, 바로 되돌아가기 없음). 동서·남북·위아래 세 축을 모두 쓴다.
  ACAD.routeValid = (route) => route.every(([d], i) => !i || ACAD.routeAxis(d) !== ACAD.routeAxis(route[i - 1][0])) && new Set(route.map(([d]) => ACAD.routeAxis(d))).size === 3;
  // 처음과 끝은 수평 구간. o.ok(route)로 조건을 더할 수 있다.
  ACAD.pipeRoute = function (r, o = {}) {
    const n = o.legs || 4;
    for (let t = 0; t < 400; t++) {
      const route = [];
      for (let i = 0; i < n; i++) {
        let cand = Object.keys(OPP).filter((d) => !i || ACAD.routeAxis(d) !== ACAD.routeAxis(route[i - 1][0]));
        if (i === 0 || i === n - 1) cand = cand.filter((d) => !"UD".includes(d));
        const d = r.pick(cand);
        route.push([d, "UD".includes(d) ? r.step(300, 1500, 100) : r.step(400, 2000, 100)]);
      }
      if (!ACAD.routeValid(route)) continue;
      if (!["plan", "elev", "iso"].every((k) => ACAD.routeReadable(route, k))) continue;
      if (o.ok && !o.ok(route)) continue;
      return route;
    }
    return [["E", 1200], ["U", 600], ["N", 900], ["E", 800]];
  };
})();

// 아주 작은 이벤트 버스
ACAD.bus = {
  map: {},
  on(type, fn) { (this.map[type] ||= new Set()).add(fn); return () => this.map[type].delete(fn); },
  emit(type, data) { (this.map[type] || []).forEach((fn) => { try { fn(data); } catch (e) { console.error(e); } }); },
};

// 진행 상황. id 규칙: 레슨 "lesson:0-04", 미션 "mission:m0-04", 퀴즈 "quiz:<set>", 검토 "review:<sheet>"
ACAD.progress = {
  _set: null,
  load() { if (!this._set) this._set = new Set(ACAD.store.get("done", [])); return this._set; },
  has(id) { return this.load().has(id); },
  mark(id, on = true) {
    const s = this.load();
    const before = s.has(id);
    if (on) s.add(id); else s.delete(id);
    if (before !== on) { ACAD.store.set("done", [...s]); ACAD.bus.emit("progress", { id, on }); }
  },
  count(prefix) { return [...this.load()].filter((id) => id.startsWith(prefix)).length; },
};

// 해시 링크 만들기. 형식: #/페이지/인자?키=값
ACAD.link = {
  home: () => "#/",
  stage: (id) => `#/stage/${id}`,
  lesson: (id) => `#/lesson/${id}`,
  sandbox: (mission) => (mission ? `#/sandbox?mission=${encodeURIComponent(mission)}` : "#/sandbox"),
  // model 뒤에 "&section=B&half=1" 같은 옵션을 붙일 수 있다
  viewer: (model) => {
    if (!model) return "#/viewer";
    const [m, ...rest] = String(model).split("&");
    return `#/viewer?model=${encodeURIComponent(m)}${rest.length ? "&" + rest.join("&") : ""}`;
  },
  quiz: (set) => (set ? `#/viewquiz?set=${encodeURIComponent(set)}` : "#/viewquiz"),
  piping: (focus) => (focus ? `#/piping?focus=${encodeURIComponent(focus)}` : "#/piping"),
  shortcuts: (mode) => (mode ? `#/shortcuts?mode=${encodeURIComponent(mode)}` : "#/shortcuts"),
  review: (sheet) => (sheet ? `#/review?sheet=${encodeURIComponent(sheet)}` : "#/review"),
};

// 레슨의 practice 항목을 링크로 바꾼다. { type, id, label }
ACAD.practiceHref = function (p) {
  const fn = ACAD.link[p.type];
  return fn ? fn(p.id) : "#/";
};

ACAD.practiceKind = { sandbox: "CAD 연습장", viewer: "3면도·3D 뷰어", quiz: "도면 퀴즈", piping: "배관 도면 랩", shortcuts: "단축키 훈련", review: "도면 검토" };
