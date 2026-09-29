// CAD 연습장 페이지: 미션 패널 + 캔버스(엔진) + "지금 그린 것" 피드백 패널
window.ACAD = window.ACAD || {};
(function () {
  const G = () => ACAD.G;
  const STAGE_KO = { 0: "입문", 1: "신입", 2: "3년차", 3: "5년차", 4: "10년차" };
  const RIBBON = [
    ["그리기", [["LINE", "선"], ["PLINE", "폴리선"], ["RECTANG", "사각형"], ["CIRCLE", "원"], ["ARC", "호"], ["POLYGON", "폴리곤"], ["ELLIPSE", "타원"]]],
    ["수정", [["MOVE", "이동"], ["COPY", "복사"], ["ROTATE", "회전"], ["MIRROR", "대칭"], ["SCALE", "축척"], ["OFFSET", "간격띄우기"], ["TRIM", "자르기"], ["EXTEND", "연장"], ["FILLET", "모깎기"], ["CHAMFER", "모따기"], ["LENGTHEN", "길이"], ["BREAK", "끊기"], ["JOIN", "결합"], ["ALIGN", "정렬"], ["STRETCH", "신축"], ["ARRAY", "배열"], ["EXPLODE", "분해"], ["ERASE", "지우기"]]],
    ["주석", [["DIMLINEAR", "선형"], ["DIMALIGNED", "정렬"], ["DIMRADIUS", "반지름"], ["DIMDIAMETER", "지름"], ["TEXT", "문자"]]],
    ["조회", [["DIST", "거리"], ["LIST", "정보"], ["ID", "좌표"], ["LAYER", "도면층"]]],
  ];

  function mount(el, ctx) {
    const mission = ctx.query.mission ? ACAD.mission(ctx.query.mission) : null;
    const saveKey = "sbx:" + (mission ? mission.id : "free");
    el.innerHTML = `
      <div class="page wide sbx">
        <div class="sbx-grid">
          <aside class="sbx-left" aria-label="미션"></aside>
          <section class="sbx-main">
            <div class="sbx-ribbon" role="toolbar" aria-label="명령 리본">
              ${RIBBON.map(([g, items]) => `<div class="rb-group"><span class="rb-title">${g}</span><div class="rb-btns">${items.map(([c, ko]) => { const d = ACAD.CadCommands.get(c); return `<button type="button" data-cmd="${c}" title="${c}${d.alias[0] ? " (" + d.alias[0] + ")" : ""}"><span>${ko}</span>${d.alias[0] ? `<kbd>${d.alias[0]}</kbd>` : ""}</button>`; }).join("")}</div></div>`).join("")}
              <div class="rb-group"><span class="rb-title">도면층</span><div class="rb-btns"><select class="rb-layer" aria-label="현재 도면층(객체를 선택한 상태면 그 객체의 도면층을 바꿈)"></select></div></div>
              <div class="rb-group"><span class="rb-title">파일</span><div class="rb-btns">
                <button type="button" data-act="undo" title="명령 취소 Ctrl+Z"><span>취소</span><kbd>U</kbd></button>
                <button type="button" data-act="redo" title="복구 Ctrl+Y"><span>복구</span></button>
                <button type="button" data-act="dxf" title="DXF로 저장해 실제 AutoCAD에서 열기"><span>DXF 저장</span></button>
                <button type="button" data-act="reset" title="처음 상태로"><span>초기화</span></button>
              </div></div>
            </div>
            <div class="sbx-engine"></div>
          </section>
          <aside class="sbx-right" aria-label="즉각 피드백">
            <div class="fb-card fb-cmd"></div>
            <div class="fb-card fb-focus"></div>
            <div class="fb-card fb-issues"></div>
            <div class="fb-card fb-3d">
              <div class="fb-h"><b>3D 미리보기</b><label class="small"><input type="checkbox" class="fb-3d-on" checked> 켜기</label></div>
              <div class="fb-3d-view"></div>
              <p class="fb-3d-info small muted"></p>
            </div>
            <div class="fb-card fb-shapes"></div>
          </aside>
        </div>
        <div class="sbx-modal" hidden></div>
      </div>`;
    const $ = (s) => el.querySelector(s);
    const left = $(".sbx-left"), engEl = $(".sbx-engine");
    const eng = new ACAD.CadEngine(engEl, { mode: mission && mission.mode });
    ACAD.sandboxEngine = eng; // 디버그·테스트용
    let prev3d = null, ref3d = null;
    const timers = [];
    const stepDone = new Set();
    let passed = mission ? ACAD.progress.has("mission:" + mission.id) : false;
    let focus = null; // { id, why }
    let lastTip = null;

    // ---------- 미션 적용 ----------
    function S(doc) {
      const add = (e, o = {}) => { e.layer = o.layer || "0"; if (o.tag) e.tag = o.tag; doc.add(e); return e; };
      return {
        layer: (name, color = "white", lt = "CONTINUOUS") => doc.ensureLayer(name, color, lt),
        line: (x1, y1, x2, y2, o) => add({ type: "line", a: { x: x1, y: y1 }, b: { x: x2, y: y2 } }, o),
        lrect: (x, y, w, h, o) => { add({ type: "line", a: { x, y }, b: { x: x + w, y } }, o); add({ type: "line", a: { x: x + w, y }, b: { x: x + w, y: y + h } }, o); add({ type: "line", a: { x: x + w, y: y + h }, b: { x, y: y + h } }, o); add({ type: "line", a: { x, y: y + h }, b: { x, y } }, o); },
        rect: (x, y, w, h, o) => add({ type: "pline", pts: [[x, y], [x + w, y], [x + w, y + h], [x, y + h]].map(([a, b]) => ({ x: a, y: b, b: 0 })), closed: true }, o),
        pline: (pts, closed, o) => add({ type: "pline", pts: pts.map(([a, b, bb]) => ({ x: a, y: b, b: bb || 0 })), closed: !!closed }, o),
        circle: (x, y, r, o) => add({ type: "circle", c: { x, y }, r }, o),
        arc: (x, y, r, d0, d1, o) => add({ type: "arc", c: { x, y }, r, a0: (d0 * Math.PI) / 180, a1: (d1 * Math.PI) / 180 }, o),
        text: (x, y, h, s, o) => add({ type: "text", p: { x, y }, h, s, rot: 0 }, { layer: "문자", ...o }),
      };
    }
    function freshDoc() {
      const doc = new ACAD.CadDoc();
      if (mission && mission.setup) mission.setup(S(doc));
      if (mission && mission.layer) doc.cur = mission.layer;
      if (mission && mission.textH) { doc.textH = mission.textH; doc.textHSet = true; }
      if (mission && mission.dimTs) { doc.dimTs = mission.dimTs; doc.dimTsSet = true; }
      doc.undoStack = []; doc.redoStack = [];
      return doc;
    }
    function applyMission(restore) {
      let doc = freshDoc();
      const saved = restore ? ACAD.store.get(saveKey, null) : null;
      if (saved && saved.snap) {
        try { doc.restore(saved.snap); (saved.done || []).forEach((i) => stepDone.add(i)); } catch (e) { doc = freshDoc(); }
      }
      eng.setDoc(doc);
      eng.history.length = 0; eng.inputs.length = 0; for (const k in eng.events) delete eng.events[k];
      const tg = { grid: true, snap: false, ortho: false, polar: false, osnap: true, otrack: false, dyn: true, ...(mission && mission.toggles) };
      Object.assign(eng.t, tg, { iso: !!(mission && mission.mode === "iso" && tg.iso), ltscale: (mission && mission.ltscale) || 1, polarInc: 90 });
      eng.syncStatus();
      const v = mission && mission.view;
      if (v) eng.zoomBox({ x0: v[0], y0: v[1], x1: v[2], y1: v[3] }, 0.04, false);
      else eng.zoomLimits();
      eng.print(mission ? `미션: ${mission.title} — 왼쪽 단계를 따라 해 보세요.` : "자유 연습: 명령어를 입력하고 Space. 예) L, C, REC", "sys");
      if (saved && saved.snap) eng.print("이전에 그리던 도면을 불러왔습니다. 처음부터 하려면 '초기화'.", "sys");
      syncLayers();
      update(true);
    }

    // ---------- 왼쪽: 미션 ----------
    function renderLeft() {
      if (!mission) {
        const groups = {};
        ACAD.missions.forEach((m) => (groups[m.stage] ||= []).push(m));
        left.innerHTML = `
          <div class="sbx-head"><h2>CAD 연습장</h2><p class="small muted">무거운 AutoCAD를 켜지 않고 기본 명령과 단축키를 연습합니다. 미션을 고르거나 그냥 자유롭게 그려 보세요.</p></div>
          ${Object.entries(groups).map(([st, list]) => `
            <details class="ms-group" ${st === "0" || st === "1" ? "open" : ""}>
              <summary><b>${STAGE_KO[st]}</b> <span class="muted small">${list.filter((m) => ACAD.progress.has("mission:" + m.id)).length}/${list.length}</span></summary>
              <ol class="ms-list">${list.map((m) => `<li><a href="${ACAD.link.sandbox(m.id)}" class="${ACAD.progress.has("mission:" + m.id) ? "done" : ""}"><span class="mono tiny">${m.lecture ? "강의 " + m.lecture : m.id}</span> ${ACAD.esc(m.title)}</a></li>`).join("")}</ol>
            </details>`).join("")}`;
        return;
      }
      const lec = mission.lecture && ACAD.lecture && ACAD.lecture(mission.lecture);
      const i = ACAD.missions.indexOf(mission);
      const next = ACAD.missions[i + 1];
      left.innerHTML = `
        <div class="sbx-head">
          <div class="crumbs"><a href="${ACAD.link.sandbox()}">CAD 연습장</a> · <span class="tag">${STAGE_KO[mission.stage]}</span></div>
          <h2>${ACAD.esc(mission.title)}</h2>
          <p class="small">${ACAD.esc(mission.goal)}</p>
          ${lec ? `<a class="lec-link" href="${lec.url}" target="_blank" rel="noopener"><img src="${lec.thumb}" alt="" loading="lazy" width="96" height="54"><span><b>CAD 기초강의 ${lec.no}</b><br><span class="small">${ACAD.esc(lec.title)} ↗</span></span></a>` : ""}
        </div>
        ${mission.reference ? `<div class="ms-ref"><div class="ms-ref-view"></div><p class="tiny muted">끌어서 돌려 보세요. 빨간 화살표 = 정면(정면도를 보는 방향)</p></div>` : ""}
        <ol class="ms-steps">${mission.steps.map((s, k) => `<li data-k="${k}" class="${stepDone.has(k) ? "ok" : ""}"><i aria-hidden="true"></i><span>${ACAD.esc(s.text)}</span></li>`).join("")}</ol>
        <div class="ms-pass" ${passed && stepDone.size === mission.steps.length ? "" : "hidden"}>
          <b>미션 완료</b><p class="small">잘했습니다. 오른쪽 '지금 그린 것'에서 결과를 다시 확인해 보세요.</p>
          ${next ? `<a class="btn accent small" href="${ACAD.link.sandbox(next.id)}">다음 미션: ${ACAD.esc(next.title)}</a>` : `<a class="btn small" href="${ACAD.link.sandbox()}">미션 목록</a>`}
        </div>
        ${mission.hints && mission.hints.length ? `<details class="ms-hints"><summary>힌트 ${mission.hints.length}개</summary><ul>${mission.hints.map((h) => `<li>${ACAD.esc(h)}</li>`).join("")}</ul></details>` : ""}
        <div class="ms-nav">
          ${i > 0 ? `<a class="btn ghost small" href="${ACAD.link.sandbox(ACAD.missions[i - 1].id)}">← 이전</a>` : "<span></span>"}
          ${next ? `<a class="btn ghost small" href="${ACAD.link.sandbox(next.id)}">다음 →</a>` : ""}
        </div>`;
      if (mission.reference && ACAD.CadReference3D) {
        if (ref3d) ref3d.destroy();
        ref3d = ACAD.CadReference3D(left.querySelector(".ms-ref-view"), mission.reference.model);
      }
    }
    function checkMission() {
      if (!mission) return;
      const c = eng.context();
      const K = ACAD.CadCheck;
      let changed = false;
      mission.steps.forEach((s, k) => {
        if (stepDone.has(k)) return;
        let ok = false;
        try { ok = !!s.check(c, K); } catch (e) { ok = false; }
        if (ok) { stepDone.add(k); changed = true; eng.print(`✓ 단계 ${k + 1} 완료: ${s.text}`, "ok"); }
      });
      if (changed) {
        left.querySelectorAll(".ms-steps li").forEach((li) => li.classList.toggle("ok", stepDone.has(+li.dataset.k)));
        if (stepDone.size === mission.steps.length) {
          const first = !ACAD.progress.has("mission:" + mission.id);
          passed = true;
          ACAD.progress.mark("mission:" + mission.id);
          left.querySelector(".ms-pass").hidden = false;
          celebrate(first);
        }
        save();
      }
    }
    function celebrate(first) {
      const t = document.createElement("div");
      t.className = "sbx-toast";
      t.innerHTML = `<b>미션 완료</b><span>${ACAD.esc(mission.title)}${first ? "" : " (다시 완료)"}</span>`;
      engEl.querySelector(".cad-stage").appendChild(t);
      timers.push(setTimeout(() => t.remove(), 3200));
    }
    let saveT = 0;
    function save() {
      clearTimeout(saveT);
      saveT = setTimeout(() => ACAD.store.set(saveKey, { snap: eng.doc.snapshot(), done: [...stepDone] }), 600);
    }

    // ---------- 오른쪽: 피드백 ----------
    const F = ACAD.CadFeedback;
    function renderCmd() {
      const box = $(".fb-cmd");
      const c = eng.cmd;
      if (!c) {
        box.innerHTML = `<div class="fb-h"><b>명령 해설</b><span class="tag">대기 중</span></div>
          <p class="small">${ACAD.esc(F.commandInfo(null, "명령:").hint)}</p>
          ${lastTip ? `<div class="fb-tip small">${ACAD.esc(lastTip)}</div>` : ""}`;
        return;
      }
      const info = F.commandInfo(c.name, eng.promptText, c.via, (eng.history[eng.history.length - 1] || {}).raw, eng.req && eng.req.type);
      if (info.tip) lastTip = info.tip;
      box.innerHTML = `
        <div class="fb-h"><b>${ACAD.esc(c.name === "GRIP" ? "그립 편집" : c.name)}</b>${info.ko ? `<span class="small">${ACAD.esc(info.ko)}</span>` : ""}${info.alias[0] ? `<kbd>${info.alias[0]}</kbd>` : ""}</div>
        <p class="small">${ACAD.esc(info.what)}</p>
        <div class="fb-prompt mono small">${ACAD.esc(eng.promptText || "")}</div>
        ${info.hint ? `<p class="small muted">${ACAD.esc(info.hint)}</p>` : ""}
        ${info.opts.length ? `<ul class="fb-opts">${info.opts.map((o) => `<li><button type="button" class="kbd" data-kw="${o.key}">${o.key}</button> ${ACAD.esc(o.label)}${o.desc ? ` <span class="muted">— ${ACAD.esc(o.desc)}</span>` : ""}</li>`).join("")}</ul>` : ""}
        ${info.tip ? `<div class="fb-tip small">${ACAD.esc(info.tip)}</div>` : ""}`;
    }
    function renderFocus() {
      const box = $(".fb-focus");
      let e = null, why = "";
      const selIds = [...eng.sel];
      if (eng.hover && !eng.cmd) { e = eng.doc.get(eng.hover); why = "커서 아래"; }
      else if (selIds.length === 1) { e = eng.doc.get(selIds[0]); why = "선택한 객체"; }
      else if (selIds.length > 1) {
        const counts = {};
        selIds.forEach((id) => { const x = eng.doc.get(id); if (x) counts[x.type] = (counts[x.type] || 0) + 1; });
        box.innerHTML = `<div class="fb-h"><b>지금 그린 것</b><span class="tag info">선택 ${selIds.length}개</span></div><p class="small">${Object.entries(counts).map(([t, n]) => `${(F.TYPE_KO[t] || t)} ${n}개`).join(" · ")}</p><p class="small muted">명령을 입력하면 이 선택에 바로 적용됩니다(먼저 선택 → 명령).</p>`;
        return;
      }
      if (!e && focus) { e = eng.doc.get(focus.id); why = focus.why; }
      if (!e) {
        box.innerHTML = `<div class="fb-h"><b>지금 그린 것</b></div><p class="small muted">무언가를 그리거나 객체에 커서를 올리면, 그것이 무엇인지(길이·각도·모양·다른 객체와의 관계)를 여기서 말로 풀어 줍니다.</p>`;
        return;
      }
      const d = F.describe(e, eng.doc);
      const rel = F.relations(e, eng.flat());
      box.innerHTML = `
        <div class="fb-h"><b>지금 그린 것</b><span class="tag info">${why}</span></div>
        <p class="fb-title">${ACAD.esc(d.title)} <span class="mono tiny muted">#${e.id}</span> ${d.tags.map((t) => `<span class="tag yellow">${ACAD.esc(t)}</span>`).join(" ")}</p>
        <ul class="fb-lines">${d.lines.map((l) => `<li>${ACAD.esc(l)}</li>`).join("")}</ul>
        ${rel.length ? `<p class="small"><b>관계</b></p><ul class="fb-lines">${rel.map((r) => `<li>${ACAD.esc(r)}</li>`).join("")}</ul>` : ""}`;
    }
    function renderIssues() {
      const box = $(".fb-issues");
      const list = F.issues(eng.doc, eng.view);
      eng.setMarks(list.map((i) => ({ p: i.p })));
      box.hidden = !list.length;
      box.innerHTML = list.length ? `<div class="fb-h"><b>확인할 점</b><span class="tag">${list.length}</span></div>
        <ul class="fb-issue-list">${list.map((i, k) => `<li><button type="button" data-k="${k}" title="이 위치로 확대">!</button><span>${ACAD.esc(i.msg)}</span></li>`).join("")}</ul>` : "";
      box._list = list;
    }
    function renderShapes() {
      const box = $(".fb-shapes");
      const sh = F.shapes(eng.doc);
      const n = eng.doc.ents.length;
      const counts = {};
      eng.doc.ents.forEach((x) => (counts[x.type] = (counts[x.type] || 0) + 1));
      box.innerHTML = `<div class="fb-h"><b>도면 요약</b><span class="small muted">객체 ${n}개</span></div>
        <p class="small">${Object.entries(counts).map(([t, c]) => `${(F.TYPE_KO[t] || t)} ${c}`).join(" · ") || "아직 아무것도 없습니다."}</p>
        ${sh.length ? `<ul class="fb-lines">${sh.map((s) => `<li>${ACAD.esc(s.text)}</li>`).join("")}</ul>` : ""}`;
    }
    let lastPrevVer = -1, prevT = 0, lastIso = null;
    function render3d(force) {
      if (lastIso !== eng.t.iso) { lastIso = eng.t.iso; force = true; lastPrevVer = -1; }
      if (!$(".fb-3d-on").checked) { if (prev3d) { prev3d.destroy(); prev3d = null; } $(".fb-3d-view").hidden = true; $(".fb-3d-info").textContent = "꺼져 있습니다."; return; }
      if (eng.t.iso) { if (prev3d) { prev3d.destroy(); prev3d = null; } $(".fb-3d-view").hidden = true; $(".fb-3d-info").textContent = "등각(아이소) 그림은 입체처럼 보이게 그린 2D 도면이라 돌출하지 않습니다. 등각 모드를 끄면 다시 켜집니다."; return; }
      $(".fb-3d-view").hidden = false;
      if (!prev3d) { prev3d = new ACAD.CadPreview3D($(".fb-3d-view")); lastPrevVer = -1; }
      if (!force && lastPrevVer === eng.doc.version) return;
      clearTimeout(prevT);
      prevT = setTimeout(() => {
        if (!prev3d) return;
        lastPrevVer = eng.doc.version;
        const info = prev3d.update(eng.doc);
        $(".fb-3d-info").textContent = info.solids
          ? `닫힌 윤곽 → 입체 ${info.solids}개${info.holes ? `, 구멍 ${info.holes}개` : ""} (두께 ${G().fmt(info.depth)}로 돌출).${info.open ? " 열린 선은 바닥에 회색으로 표시." : ""}`
          : info.open ? "열린 선만 있습니다. 끝점이 맞닿아 닫힌 도형(사각형·원·닫힌 폴리선)이 되면 입체로 돌출됩니다." : "닫힌 도형을 그리면 두께를 준 입체로 보여 줍니다.";
      }, 180);
    }
    let upT = 0;
    function update(now) {
      clearTimeout(upT);
      const run = () => { renderCmd(); renderFocus(); renderIssues(); renderShapes(); render3d(); checkMission(); };
      if (now) run(); else upT = setTimeout(run, 40);
    }

    // ---------- 도면층 ----------
    function syncLayers() {
      const sel = $(".rb-layer");
      sel.innerHTML = eng.doc.layers.map((l) => `<option value="${ACAD.esc(l.name)}"${l.name === eng.doc.cur ? " selected" : ""}>■ ${ACAD.esc(l.name)}</option>`).join("");
      sel.style.setProperty("--lc", (ACAD.CadColors[(eng.doc.layer(eng.doc.cur) || {}).color] || ACAD.CadColors.white).hex);
    }
    function layerPanel() {
      const m = $(".sbx-modal");
      const colors = Object.entries(ACAD.CadColors), lts = Object.entries(ACAD.CadLtypes);
      const draw = () => {
        m.innerHTML = `<div class="sbx-dialog" role="dialog" aria-label="도면층 특성 관리자">
          <div class="fb-h"><b>도면층 특성 관리자</b><span class="small muted">LAYER (LA)</span></div>
          <table class="tbl"><thead><tr><th>현재</th><th>이름</th><th>켜기</th><th>잠금</th><th>색</th><th>선종류</th></tr></thead><tbody>
          ${eng.doc.layers.map((l, i) => `<tr data-i="${i}">
            <td><input type="radio" name="curlayer" ${l.name === eng.doc.cur ? "checked" : ""} aria-label="${ACAD.esc(l.name)}을 현재 도면층으로"></td>
            <td>${ACAD.esc(l.name)}</td>
            <td><input type="checkbox" data-f="on" ${l.on ? "checked" : ""} aria-label="켜기"></td>
            <td><input type="checkbox" data-f="lock" ${l.lock ? "checked" : ""} aria-label="잠금"></td>
            <td><select data-f="color">${colors.map(([k, c]) => `<option value="${k}" ${k === l.color ? "selected" : ""}>${c.ko}</option>`).join("")}</select></td>
            <td><select data-f="ltype">${lts.map(([k, t]) => `<option value="${k}" ${k === l.ltype ? "selected" : ""}>${k} ${t.ko}</option>`).join("")}</select></td></tr>`).join("")}
          </tbody></table>
          <div class="dlg-row"><input type="text" class="dlg-new" placeholder="새 도면층 이름" aria-label="새 도면층 이름"><button type="button" class="btn small dlg-add">새 도면층</button>
          ${eng.sel.size ? `<button type="button" class="btn small dlg-move">선택한 ${eng.sel.size}개를 현재 도면층으로</button>` : ""}
          <span style="flex:1"></span><button type="button" class="btn primary small dlg-close">닫기</button></div>
          <p class="tiny muted">도면층을 끄면 그 층의 객체가 안 보이고, 잠그면 선택·수정이 안 됩니다. 현재 도면층에 새 객체가 그려집니다.</p>
        </div>`;
      };
      draw();
      m.hidden = false;
      m.onchange = (e) => {
        const tr = e.target.closest("tr");
        if (!tr) return;
        const l = eng.doc.layers[+tr.dataset.i];
        if (e.target.name === "curlayer") { eng.doc.cur = l.name; eng.event("layer:cur"); }
        else if (e.target.dataset.f === "on") { l.on = e.target.checked; if (!l.on && l.name === eng.doc.cur) eng.print("현재 도면층을 껐습니다. 새로 그린 객체가 보이지 않습니다.", "err"); }
        else if (e.target.dataset.f === "lock") l.lock = e.target.checked;
        else if (e.target.dataset.f) l[e.target.dataset.f] = e.target.value;
        eng.doc.touch(); eng.changed(); syncLayers();
      };
      m.onclick = (e) => {
        if (e.target === m || e.target.closest(".dlg-close")) { m.hidden = true; return; }
        if (e.target.closest(".dlg-add")) {
          const name = m.querySelector(".dlg-new").value.trim();
          if (name && !eng.doc.layer(name)) { eng.doc.ensureLayer(name); syncLayers(); draw(); }
        }
        if (e.target.closest(".dlg-move")) { moveSelToLayer(eng.doc.cur); draw(); }
      };
    }
    function moveSelToLayer(name) {
      const before = eng.doc.snapshot();
      let n = 0;
      eng.sel.forEach((id) => { const e = eng.doc.get(id); if (e) { e.layer = name; n++; } });
      if (n) { eng.doc.touch(); eng.doc.pushUndo(before, "도면층 변경"); eng.print(`${n}개 객체를 "${name}" 도면층으로 옮겼습니다.`, "sys"); eng.event("layer:move"); eng.changed(); }
    }

    function showHelp() {
      const m = $(".sbx-modal");
      m.innerHTML = `<div class="sbx-dialog" role="dialog" aria-label="도움말">
        <div class="fb-h"><b>연습장 사용법</b><span class="small muted">F1</span></div>
        <table class="tbl"><tbody>
          <tr><th>명령</th><td>아무 곳에서나 글자를 치면 명령창으로 들어갑니다. Space 또는 Enter로 실행. 빈 상태에서 Space = 방금 명령 반복. Esc = 취소.</td></tr>
          <tr><th>좌표</th><td><span class="mono">100,50</span> 절대 · <span class="mono">@100,0</span> 상대 · <span class="mono">@100&lt;30</span> 상대 극좌표 · 방향을 가리키고 <span class="mono">100</span> = 직접 거리</td></tr>
          <tr><th>스냅 한 번</th><td>점을 물을 때 <span class="mono">END MID CEN INT QUA PER TAN NEA</span>, 특수 <span class="mono">FROM M2P TT</span></td></tr>
          <tr><th>기능키</th><td><kbd>F3</kbd> 객체 스냅 · <kbd>F7</kbd> 그리드 · <kbd>F8</kbd> 직교 · <kbd>F9</kbd> 스냅 · <kbd>F10</kbd> 극좌표 · <kbd>F11</kbd> 추적 · <kbd>F12</kbd> 동적 입력 · <kbd>F5</kbd> 등각평면 · <kbd>F2</kbd> 명령 기록</td></tr>
          <tr><th>마우스</th><td>휠 = 커서 기준 줌 · 휠 누르고 끌기(또는 Alt+끌기) = 이동 · 휠 더블클릭 = 줌 범위 · 오른쪽 클릭 = Enter</td></tr>
          <tr><th>선택</th><td>클릭 · 왼쪽→오른쪽 윈도우 · 오른쪽→왼쪽 걸치기 · Shift+클릭 빼기 · Ctrl+A 전체 · Delete 지우기 · 파란 그립을 눌러 신축</td></tr>
        </tbody></table>
        <p class="tiny muted">브라우저가 가로채는 키(F11 전체 화면, F12 개발자 도구 등)는 아래 상태 막대 버튼을 누르세요.</p>
        <div class="dlg-row"><span style="flex:1"></span><button type="button" class="btn primary small dlg-close">닫기</button></div></div>`;
      m.hidden = false;
      m.onchange = null;
      m.onclick = (e) => { if (e.target === m || e.target.closest(".dlg-close")) m.hidden = true; };
    }

    // ---------- 연결 ----------
    eng.on("change", () => { update(); save(); });
    eng.on("prompt", () => update());
    eng.on("selection", () => update());
    eng.on("hover", () => renderFocus());
    eng.on("toggle", () => update());
    eng.on("event", () => update());
    eng.on("layerPanel", layerPanel);
    eng.on("help", showHelp);
    eng.on("command", () => { lastTip = null; });
    eng.on("commandEnd", (d) => {
      const created = d.created.filter((id) => eng.doc.get(id));
      const last = created[created.length - 1];
      if (last) {
        focus = { id: last, why: "방금 만든 객체" };
        const e = eng.doc.get(last);
        const ann = [];
        created.slice(-4).forEach((id) => ann.push(...F.annotations(eng.doc.get(id))));
        if (ann.length) eng.annotate(ann.slice(0, 8));
        if (e) eng.print(`→ ${F.describe(e).title}: ${F.describe(e).lines[0] || ""}`, "fb");
      }
      syncLayers();
      update();
    });
    eng.on("unknown", () => update());

    $(".sbx-ribbon").addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      if (b.dataset.cmd) { eng.runCommand(b.dataset.cmd, "button"); eng.input.focus({ preventScroll: true }); return; }
      if (b.dataset.act === "undo") eng.runCommand("U", "button");
      if (b.dataset.act === "redo") eng.runCommand("REDO", "button");
      if (b.dataset.act === "dxf") {
        const blob = new Blob([eng.doc.toDXF()], { type: "application/dxf" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `${mission ? mission.id : "practice"}.dxf`;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 2000);
        eng.print("DXF(R12)로 저장했습니다. 실제 AutoCAD에서 열어 비교해 보세요.", "sys");
      }
      if (b.dataset.act === "reset") {
        if (eng.cmd) eng.cancelCommand(true);
        stepDone.clear(); focus = null;
        ACAD.store.set(saveKey, null);
        renderLeft();
        applyMission(false);
      }
    });
    $(".rb-layer").addEventListener("change", (e) => {
      const name = e.target.value;
      if (eng.sel.size && !eng.cmd) { moveSelToLayer(name); eng.sel.clear(); eng.selChanged(); syncLayers(); return; }
      eng.doc.cur = name;
      eng.print(`현재 도면층: "${name}"`, "sys");
      eng.event("layer:cur");
      syncLayers();
    });
    $(".fb-cmd").addEventListener("click", (e) => { const b = e.target.closest("[data-kw]"); if (b) { eng.submitText(b.dataset.kw); eng.input.focus({ preventScroll: true }); } });
    $(".fb-issues").addEventListener("click", (e) => {
      const b = e.target.closest("button[data-k]");
      if (!b) return;
      const it = $(".fb-issues")._list[+b.dataset.k];
      const r = 30 / eng.view.s;
      eng.zoomBox({ x0: it.p.x - r * 4, y0: it.p.y - r * 3, x1: it.p.x + r * 4, y1: it.p.y + r * 3 }, 0);
    });
    $(".fb-3d-on").addEventListener("change", () => render3d(true));

    renderLeft();
    applyMission(true);
    // 첫 화면에서 키보드 입력이 바로 명령창으로 가도록
    setTimeout(() => { try { eng.input.focus({ preventScroll: true }); } catch (e) { /* 무시 */ } }, 0);

    return () => {
      clearTimeout(upT); clearTimeout(prevT); clearTimeout(saveT);
      timers.forEach(clearTimeout);
      ACAD.store.set(saveKey, { snap: eng.doc.snapshot(), done: [...stepDone] });
      eng.destroy();
      if (ACAD.sandboxEngine === eng) ACAD.sandboxEngine = null;
      if (prev3d) prev3d.destroy();
      if (ref3d) ref3d.destroy();
    };
  }

  ACAD.pages.sandbox = {
    title: (ctx) => { const m = ctx.query.mission && ACAD.mission(ctx.query.mission); return m ? `${m.title} · CAD 연습장` : "CAD 연습장"; },
    nav: "sandbox",
    mount,
  };
})();
