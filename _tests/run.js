// 데이터·미션 자동 검사. 실행: node _tests/run.js  (브라우저 없이 index.html의 스크립트를 순서대로 읽는다)
// _ 로 시작하는 폴더라 GitHub Pages(Jekyll)에는 올라가지 않는다.
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.join(__dirname, "..");
const noop = () => {};
const dom = new Proxy(function () {}, { get: (t, k) => (k === Symbol.toPrimitive ? () => "" : dom), apply: () => dom, construct: () => dom });
const ctx = { console, document: dom, localStorage: { getItem: () => null, setItem: noop }, addEventListener: noop, location: { hash: "" }, setTimeout: noop, clearTimeout: noop, requestAnimationFrame: noop, navigator: { userAgent: "node" } };
ctx.window = ctx; ctx.self = ctx; ctx.globalThis = ctx;
vm.createContext(ctx);

let failed = 0, passed = 0;
const fail = (msg) => { failed++; console.log("  ✗ " + msg); };
const ok = () => { passed++; };
const section = (t) => console.log("\n■ " + t);

// ---------- 1. 스크립트 읽기 ----------
section("스크립트 읽기 (index.html 순서)");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const files = [...html.matchAll(/<script src="([^"]+)"/g)].map((m) => m[1]);
for (const f of files) {
  try { vm.runInContext(fs.readFileSync(path.join(root, f), "utf8"), ctx, { filename: f }); ok(); }
  catch (e) { fail(`${f}: ${e.message}`); }
}
const A = ctx.ACAD;

// ---------- 2. 레슨 데이터 ----------
section("레슨 데이터");
const lessons = A.allLessons();
const ids = new Set();
for (const l of lessons) {
  if (ids.has(l.id)) fail(`레슨 id 중복: ${l.id}`); else ok();
  ids.add(l.id);
  for (const k of ["title", "summary", "body"]) if (!l[k]) fail(`${l.id}: ${k} 없음`);
  (l.check || []).forEach((q, i) => {
    if (!Array.isArray(q.o) || q.o.length < 2) fail(`${l.id} 문제 ${i + 1}: 보기 부족`);
    else if (!(Number.isInteger(q.a) && q.a >= 0 && q.a < q.o.length)) fail(`${l.id} 문제 ${i + 1}: 정답 번호 ${q.a}가 보기 범위 밖`);
    else if (new Set(q.o).size !== q.o.length) fail(`${l.id} 문제 ${i + 1}: 같은 보기가 두 번`);
    else if (!q.why) fail(`${l.id} 문제 ${i + 1}: 해설(why) 없음`);
    else ok();
  });
}
// 화면에 보이는 정답 위치가 한쪽에 몰리지 않는지(보기 섞기 후)
{
  const pos = [0, 0, 0, 0, 0];
  let n = 0;
  for (const l of lessons) (l.check || []).forEach((q, qi) => { pos[A.quizOptionOrder(l.id, qi, q.o.length).indexOf(q.a)]++; n++; });
  const top = Math.max(...pos) / n;
  if (top > 0.4) fail(`정답이 한 위치에 ${Math.round(top * 100)}% 몰림 (${pos.join("/")})`); else ok();
  console.log(`  화면 정답 위치 분포(1~4번): ${pos.slice(0, 4).join(" / ")} (문제 ${n}개)`);
}
const lec = new Set(lessons.flatMap((l) => [].concat(l.lecture || [])));
for (let i = 1; i <= 35; i++) { const k = String(i).padStart(2, "0"); if (!lec.has(k)) fail(`강의 ${k}에 연결된 레슨 없음`); else ok(); }

// ---------- 3. 실습 링크 ----------
section("레슨 → 실습 링크");
const sheets = new Set((A.reviewSheets || []).map((s) => s.id));
const quizSets = new Set((Array.isArray(A.viewQuizSets) ? A.viewQuizSets : Object.values(A.viewQuizSets || {})).map((s) => s.id));
for (const l of lessons) for (const p of l.practice || []) {
  const id = String(p.id || "").split("&")[0];
  const bad =
    (p.type === "sandbox" && id && !A.mission(id)) ||
    (p.type === "viewer" && id && !A.models[id]) ||
    (p.type === "quiz" && id && !quizSets.has(id)) ||
    (p.type === "review" && id && sheets.size && !sheets.has(id)) ||
    !A.practiceKind[p.type];
  if (bad) fail(`${l.id}: 없는 실습 ${p.type}:${p.id}`); else ok();
}

// ---------- 4. 미션 판정 ----------
section("미션 판정 (빈 도면은 통과하면 안 되고, 모범 답안은 모두 통과해야 한다)");
const K = A.CadCheck;
function context(doc) { return { doc, ents: doc.ents, flat: doc.flat(), history: [], inputs: [], events: {}, t: {}, sel: [], eng: {} }; }
function runSteps(m, doc) { const c = context(doc); return m.steps.map((s) => { try { return !!s.check(c, K); } catch (e) { return "오류: " + e.message; } }); }
const mids = new Set();
for (const base of A.missions) {
  if (mids.has(base.id)) fail(`미션 id 중복: ${base.id}`);
  mids.add(base.id);
  const seeds = base.make ? Array.from({ length: 40 }, (_, i) => i * 7919 + 1) : [0];
  for (const seed of seeds) {
    const m = A.missionInstance(base, seed);
    const tag = base.make ? `${m.id}#${seed}` : m.id;
    const blank = new A.CadDoc();
    if (m.setup) m.setup(A.CadDoc.setupApi(blank));
    const before = runSteps(m, blank);
    const errs = before.filter((r) => typeof r === "string");
    if (errs.length) { fail(`${tag}: 빈 도면 판정 중 ${errs[0]}`); continue; }
    if (!m.solve) { ok(); continue; }
    before.forEach((r, k) => { if (r === true) fail(`${tag} 단계 ${k + 1}: 아무것도 안 그렸는데 통과`); });
    const doc = new A.CadDoc();
    if (m.setup) m.setup(A.CadDoc.setupApi(doc));
    m.solve(A.CadDoc.setupApi(doc), m);
    const after = runSteps(m, doc);
    const bad = after.map((r, k) => (r === true ? null : `단계 ${k + 1}(${m.steps[k].text}) → ${r}`)).filter(Boolean);
    if (bad.length) fail(`${tag}: 모범 답안이 통과하지 못함: ${bad.join(" / ")}`); else ok();
  }
}

// ---------- 5. 3D 참고 모델 ----------
section("3D 따라그리기 참고 모델");
for (const m of A.missions) {
  if (!m.reference) continue;
  const id = m.reference.model;
  if (id === "step-block") { ok(); continue; }
  const model = A.models[id];
  if (!model) { fail(`${m.id}: 모델 ${id} 없음`); continue; }
  try {
    const prep = A.HLR.prepare(model);
    const tris = prep.geoms.reduce((n, g) => n + g.attributes.position.count / 3, 0);
    if (tris < 6) fail(`${m.id}: 모델 ${id} 삼각형 ${tris}개`); else ok();
  } catch (e) { fail(`${m.id}: 모델 ${id} 준비 실패 ${e.message}`); }
}

// ---------- 6. 3면도 정답 ↔ 3D 모델 대조 ----------
// 모범 답안은 정답표(spec)로 그리므로 4번 검사는 정답표 자체가 틀려도 통과한다.
// 그래서 정답표의 선 끝점·원이 실제 모델 꼭짓점을 그 방향으로 투상한 점과 맞는지, 외곽 크기가 같은지 따로 본다.
section("3면도 정답표 ↔ 3D 모델 꼭짓점");
const AXES = { front: [0, 2], top: [0, 1], right: [1, 2] };
for (const m of A.missions) {
  if (!m.spec) continue;
  const prep = A.HLR.prepare(A.models[m.reference.model]);
  const verts = prep.srcBodies.flatMap((b) => b.polys.flatMap((p) => p.v));
  for (const [k, [i, j]] of Object.entries(AXES)) {
    const v = m.spec.views[k];
    const pts = verts.map((q) => [q[i] - prep.bb.min[i], q[j] - prep.bb.min[j]]);
    const has = (x, y) => pts.some(([a, b]) => Math.abs(a - x) < 0.05 && Math.abs(b - y) < 0.05);
    const w = prep.bb.max[i] - prep.bb.min[i], h = prep.bb.max[j] - prep.bb.min[j];
    const all = [...v.vis, ...(v.hid || [])];
    const xs = v.vis.flatMap((s) => [s[0], s[2]]), ys = v.vis.flatMap((s) => [s[1], s[3]]);
    if (Math.abs(Math.max(...xs) - Math.min(...xs) - w) > 0.05 || Math.abs(Math.max(...ys) - Math.min(...ys) - h) > 0.05) fail(`${m.id} ${k}: 외곽 크기가 모델(${w} × ${h})과 다름`);
    else ok();
    for (const s of all) {
      if (!has(s[0], s[1]) || !has(s[2], s[3])) fail(`${m.id} ${k}: 선 (${s.join(", ")})의 끝점이 모델 꼭짓점 투상과 맞지 않음`);
      else if ([s[0], s[2]].some((x) => x < -0.05 || x > w + 0.05) || [s[1], s[3]].some((y) => y < -0.05 || y > h + 0.05)) fail(`${m.id} ${k}: 선 (${s.join(", ")})이 외곽 밖`);
      else ok();
    }
    for (const [cx, cy, r] of v.circ || []) {
      if ([[cx + r, cy], [cx - r, cy], [cx, cy + r], [cx, cy - r]].every(([x, y]) => has(x, y))) ok();
      else fail(`${m.id} ${k}: 원 (${cx}, ${cy}) R${r}이 모델 구멍과 맞지 않음`);
    }
  }
}

// ---------- 7. 실제 명령으로 드릴 풀기 ----------
// 모범 답안은 정답 도형을 직접 그린다. 여기서는 연습장의 실제 명령 제너레이터에 입력을 차례로 넣어
// 학습자가 안내대로 했을 때 판정이 통과하는지 본다. 입력 형식: [요청 종류, 응답]
section("실제 명령으로 드릴 풀기");
function runCommand(doc, name, script) {
  const eng = {};
  const api = {
    eng, doc,
    point: (prompt, o = {}) => ({ type: "point", prompt, ...o }),
    number: (prompt, o = {}) => ({ type: "number", prompt, ...o }),
    select: (prompt = "", o = {}) => ({ type: "select", prompt, ...o }),
    pick: (prompt, o = {}) => ({ type: "pick", prompt, ...o }),
    kw: (prompt, o = {}) => ({ type: "kw", prompt, ...o }),
    text: (prompt, o = {}) => ({ type: "text", prompt, ...o }),
    print: noop, event: noop,
    add: (e) => doc.add(e), replace: (id, e) => doc.replace(id, e), remove: (id) => doc.remove(id), get: (id) => doc.get(id),
  };
  const g = A.CadCommands.get(name).run(api, eng);
  let req = g.next();
  for (const [type, resp] of script) {
    if (req.done) throw new Error(`${name}: 명령이 먼저 끝남(남은 입력 ${type})`);
    if (req.value.type !== type) throw new Error(`${name}: "${req.value.prompt}"에 ${type} 입력을 넣으려 함`);
    req = g.next(resp);
  }
  while (!req.done) req = g.next({ enter: true });
}
const firstId = (doc, fn) => doc.ents.find(fn).id;
const SCENARIOS = {
  "d0-circle": (m, doc) => {
    runCommand(doc, "CIRCLE", [["point", { pt: m.c1 }], ["point", { value: m.r1 }]]);
    runCommand(doc, "CIRCLE", [["point", { kw: "2P" }], ["point", { pt: m.a2 }], ["point", { pt: m.b2 }]]);
    runCommand(doc, "CIRCLE", [["point", { kw: "3P" }], ["point", { pt: { x: m.c3.x + m.r3, y: m.c3.y } }], ["point", { pt: { x: m.c3.x, y: m.c3.y + m.r3 } }], ["point", { pt: { x: m.c3.x - m.r3, y: m.c3.y } }]]);
    const h = firstId(doc, (e) => e.type === "line" && e.a.y === 0 && e.b.y === 0), v = firstId(doc, (e) => e.type === "line" && e.a.x === m.K4.x && e.b.x === m.K4.x);
    runCommand(doc, "CIRCLE", [["point", { kw: "T" }], ["pick", { id: h, pt: { x: m.K4.x + 60, y: 0 } }], ["pick", { id: v, pt: { x: m.K4.x, y: 60 } }], ["number", { value: m.r4 }]]);
  },
  "d1-offset": (m, doc) => {
    const id = firstId(doc, (e) => e.type === "pline");
    runCommand(doc, "OFFSET", [["number", { value: m.t }], ["pick", { id, pt: { x: 0, y: m.H / 2 } }], ["point", { pt: { x: m.W / 2, y: m.H / 2 } }], ["pick", {}]]);
    runCommand(doc, "OFFSET", [["number", { value: m.u }], ["pick", { id, pt: { x: 0, y: m.H / 2 } }], ["point", { pt: { x: -500, y: m.H / 2 } }], ["pick", {}]]);
  },
  "d1-fillet": (m, doc) => {
    const id = firstId(doc, (e) => e.type === "pline");
    runCommand(doc, "FILLET", [["pick", { kw: "R" }], ["number", { value: m.R }], ["pick", { kw: "P" }], ["pick", { id }]]);
    const h = firstId(doc, (e) => e.type === "line" && e.a.y === 0), v = firstId(doc, (e) => e.type === "line" && e.a.x === m.X + m.L);
    runCommand(doc, "FILLET", [["pick", { kw: "R" }], ["number", { value: 0 }], ["pick", { id: h, pt: { x: m.X + 10, y: 0 } }], ["pick", { id: v, pt: { x: m.X + m.L, y: m.L - 10 } }]]);
  },
  "d1-array": (m, doc) => {
    const hole = firstId(doc, (e) => e.type === "circle" && e.r === m.hr);
    runCommand(doc, "ARRAYPOLAR", [["select", { ids: [hole] }], ["point", { pt: { x: 0, y: 0 } }], ["kw", { kw: "I" }], ["number", { value: m.N }], ["kw", { kw: "X" }]]);
    const s = firstId(doc, (e) => e.type === "circle" && e.r === m.sr);
    runCommand(doc, "ARRAYRECT", [["select", { ids: [s] }], ["kw", { kw: "COU" }], ["number", { value: m.cols }], ["number", { value: m.rows }], ["kw", { kw: "S" }], ["number", { value: m.dx }], ["number", { value: m.dy }], ["kw", { kw: "X" }]]);
  },
};
for (const [id, play] of Object.entries(SCENARIOS)) {
  for (let seed = 1; seed <= 12; seed++) {
    const m = A.missionInstance(A.mission(id), seed * 104729);
    const doc = new A.CadDoc();
    if (m.setup) m.setup(A.CadDoc.setupApi(doc));
    try { play(m, doc); } catch (e) { fail(`${id}#${seed}: ${e.message}`); continue; }
    const res = runSteps(m, doc);
    const bad = res.map((r, k) => (r === true ? null : `단계 ${k + 1} → ${r}`)).filter(Boolean);
    if (bad.length) fail(`${id}#${seed}: 실제 명령 결과가 통과하지 못함: ${bad.join(" / ")}`); else ok();
  }
}

console.log(`\n통과 ${passed} · 실패 ${failed}`);
process.exit(failed ? 1 : 0);
