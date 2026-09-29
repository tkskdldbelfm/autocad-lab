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
  set(key, value) {
    try { localStorage.setItem(this.prefix + key, JSON.stringify(value)); } catch { /* 저장 불가 환경 */ }
  },
};

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
