// 단축키 훈련: 참고표 · 명령어 드릴 · 기능키 드릴
window.ACAD = window.ACAD || {};
(function () {
  const STAGE = { "": "전체", 0: "입문", 1: "신입" };
  const GROUPS = ["그리기", "수정", "조회·화면", "도면 요소", "상태 토글"];
  const SKIP_KEYS = new Set(["F11", "F12"]); // 브라우저가 가로채는 키

  function mount(el, ctx) {
    const mode = ["ref", "drill", "keys"].includes(ctx.query.mode) ? ctx.query.mode : "ref";
    el.innerHTML = `<div class="page">
      <div class="page-head"><div><h1>단축키 훈련</h1><p>AutoCAD는 손이 키보드에 있을 때 빠릅니다. 표로 익히고, 드릴로 손에 붙이세요. 기본 별칭은 acad.pgp 기준입니다.</p></div></div>
      <nav class="sk-tabs" aria-label="훈련 방식">
        <a href="${ACAD.link.shortcuts("ref")}" aria-current="${mode === "ref"}">참고표</a>
        <a href="${ACAD.link.shortcuts("drill")}" aria-current="${mode === "drill"}">명령어 드릴</a>
        <a href="${ACAD.link.shortcuts("keys")}" aria-current="${mode === "keys"}">기능키 드릴</a>
      </nav>
      <div class="sk-body"></div></div>`;
    const body = el.querySelector(".sk-body");
    if (mode === "ref") return ref(body);
    return drill(body, mode);
  }

  function lecLink(no) {
    const l = no && ACAD.lecture && ACAD.lecture(no);
    return l ? `<a href="${l.url}" target="_blank" rel="noopener" title="${ACAD.esc(l.title)}">강의 ${l.no}</a>` : "";
  }
  function ref(body) {
    const st = ACAD.store.get("sk:ref", { q: "", g: "", s: "" });
    body.innerHTML = `
      <div class="sk-filters">
        <input type="search" class="sk-q-in" placeholder="명령·단축키·뜻 검색 (예: 모깎기, F, TR)" value="${ACAD.esc(st.q)}" aria-label="검색">
        <select class="sk-g" aria-label="분류"><option value="">분류 전체</option>${GROUPS.map((g) => `<option ${g === st.g ? "selected" : ""}>${g}</option>`).join("")}</select>
        <select class="sk-s" aria-label="단계">${Object.entries(STAGE).map(([k, v]) => `<option value="${k}" ${k === st.s ? "selected" : ""}>${v}</option>`).join("")}</select>
        <span class="small muted sk-count"></span>
      </div>
      <table class="tbl sk-table"><thead><tr><th>단축키</th><th>명령</th><th>뜻</th><th class="sk-desc">쓰는 법</th><th>강의</th></tr></thead><tbody></tbody></table>
      <p class="small muted" style="margin-top:16px">연습장에서 명령을 전체 이름으로 치거나 버튼을 누르면, 오른쪽 패널이 단축키를 알려 줍니다. 회사마다 acad.pgp를 바꿔 쓰기도 하니 현장 설정을 확인하세요.</p>`;
    const tb = body.querySelector("tbody");
    const draw = () => {
      const q = body.querySelector(".sk-q-in").value.trim().toLowerCase();
      const g = body.querySelector(".sk-g").value, s = body.querySelector(".sk-s").value;
      ACAD.store.set("sk:ref", { q, g, s });
      const rows = ACAD.shortcuts.filter((x) => (!g || x.group === g) && (!s || x.stage === s) && (!q || [x.cmd, ...x.alias, x.ko, x.desc, x.drill].join(" ").toLowerCase().includes(q)));
      body.querySelector(".sk-count").textContent = `${rows.length}개`;
      tb.innerHTML = rows.map((x) => `<tr>
        <td>${x.alias.length ? x.alias.map((a) => `<kbd>${a}</kbd>`).join("") : x.keys ? `<kbd>${ACAD.esc(x.cmd === "SPACE" ? "Space" : x.cmd)}</kbd>` : `<span class="muted small">(전체 이름)</span>`}</td>
        <td class="mono">${x.keys ? "" : x.cmd}</td><td>${ACAD.esc(x.ko)}</td><td class="sk-desc small">${ACAD.esc(x.desc || x.drill)}</td><td class="small">${lecLink(x.lecture)}</td></tr>`).join("");
    };
    body.addEventListener("input", draw);
    body.addEventListener("change", draw);
    draw();
  }

  function keyName(e) {
    if (e.key === " ") return " ";
    let k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (e.ctrlKey || e.metaKey) {
      if (["Control", "Meta"].includes(e.key)) return null;
      return "Ctrl+" + k;
    }
    if (["Shift", "Alt", "Control", "Meta"].includes(e.key)) return null;
    return k;
  }
  const showKey = (k) => (k === " " ? "Space" : k === "Escape" ? "Esc" : k.replace(/^Ctrl\+(.)$/, (m, c) => "Ctrl+" + c.toUpperCase()));

  function drill(body, mode) {
    const isKeys = mode === "keys";
    const cfg = ACAD.store.get("sk:cfg:" + mode, { stage: "", n: 20 });
    const miss = ACAD.store.get("sk:miss", {});
    let pool = [], q = null, idx = 0, right = 0, wrong = 0, streak = 0, bestStreak = 0, t0 = 0, qT0 = 0, missed = [], running = false, locked = false, tick = 0;
    const key = `sk:best:${mode}:${cfg.stage || "all"}`;

    body.innerHTML = `
      <div class="sk-drill">
        <div class="sk-controls">
          <select class="sk-stage" aria-label="단계">${Object.entries(STAGE).map(([k, v]) => `<option value="${k}" ${k === cfg.stage ? "selected" : ""}>${v}</option>`).join("")}</select>
          <select class="sk-n" aria-label="문제 수">${[10, 20, 30].map((n) => `<option value="${n}" ${n === cfg.n ? "selected" : ""}>${n}문제</option>`).join("")}</select>
          <button type="button" class="btn primary sk-start">시작</button>
        </div>
        <div class="sk-board">
          <div class="sk-sub sk-meta">${isKeys ? "하고 싶은 일을 보고 해당 키를 실제로 누르세요." : "하고 싶은 일을 보고 단축키를 입력한 뒤 Enter 또는 Space."}</div>
          <div class="sk-q" aria-live="polite">시작을 누르세요</div>
          ${isKeys ? `<div class="sk-keycap" aria-hidden="true">?</div>` : `<input class="sk-input" type="text" autocomplete="off" autocapitalize="characters" spellcheck="false" aria-label="단축키 입력" disabled>`}
          <div class="sk-feedback" aria-live="polite"></div>
          <div class="sk-timer"><i style="width:0%"></i></div>
        </div>
        <div class="sk-stats">
          <div>정답<b class="st-right">0</b></div><div>오답<b class="st-wrong">0</b></div><div>연속<b class="st-streak">0</b></div><div>시간<b class="st-time">0.0초</b></div><div>최고 기록<b class="st-best">-</b></div>
        </div>
        <div class="sk-result"></div>
        ${isKeys ? `<p class="small muted">F11(전체 화면)·F12(개발자 도구)는 브라우저가 먼저 가로채서 드릴에서 뺐습니다. 실제 AutoCAD에서 F11은 객체 스냅 추적, F12는 동적 입력입니다.</p>` : `<p class="small muted">틀린 명령은 다음 드릴에서 더 자주 나옵니다. 전체 이름(예: FILLET)을 쳐도 정답이지만 단축키를 알려 드립니다.</p>`}
      </div>`;
    const $ = (s) => body.querySelector(s);
    const best = () => ACAD.store.get(key, null);
    const showBest = () => { const b = best(); $(".st-best").textContent = b ? `${b.right}/${b.n} · ${b.time.toFixed(1)}초` : "-"; };
    showBest();

    function buildPool() {
      const st = $(".sk-stage").value;
      let list = ACAD.shortcuts.filter((s) => (isKeys ? !!s.keys && !SKIP_KEYS.has(s.cmd) && s.cmd !== "U" : s.alias.length > 0) && (!st || s.stage === st));
      const n = Math.min(+$(".sk-n").value, Math.max(list.length, 1) * 2);
      // 가중치: 틀린 적이 많을수록, 앞 강의일수록 조금 더 자주
      const w = (s) => 1 + 2 * (miss[s.cmd] || 0) + (s.lecture ? (36 - +s.lecture) / 70 : 0);
      const out = [];
      let last = null;
      for (let i = 0; i < n; i++) {
        const cand = list.filter((s) => s !== last);
        const tot = cand.reduce((a, s) => a + w(s), 0);
        let r = Math.random() * tot, pick = cand[0];
        for (const s of cand) { r -= w(s); if (r <= 0) { pick = s; break; } }
        out.push(pick); last = pick;
      }
      return out;
    }
    function start() {
      cfg.stage = $(".sk-stage").value; cfg.n = +$(".sk-n").value;
      ACAD.store.set("sk:cfg:" + mode, cfg);
      pool = buildPool();
      idx = 0; right = 0; wrong = 0; streak = 0; bestStreak = 0; missed = []; running = true;
      t0 = performance.now();
      $(".sk-result").innerHTML = "";
      $(".sk-start").textContent = "다시 시작";
      if (!isKeys) { const inp = $(".sk-input"); inp.disabled = false; inp.value = ""; inp.focus(); }
      else if (document.activeElement) document.activeElement.blur();
      clearInterval(tick);
      tick = setInterval(() => { if (running) $(".st-time").textContent = ((performance.now() - t0) / 1000).toFixed(1) + "초"; }, 100);
      next();
    }
    function next() {
      if (idx >= pool.length) return finish();
      q = pool[idx];
      locked = false;
      qT0 = performance.now();
      $(".sk-q").textContent = q.drill || q.ko;
      $(".sk-meta").textContent = `${idx + 1} / ${pool.length} · ${q.group}${q.lecture ? ` · 강의 ${q.lecture}` : ""}`;
      $(".sk-feedback").innerHTML = "";
      $(".sk-timer i").style.width = `${(idx / pool.length) * 100}%`;
      if (isKeys) { const k = $(".sk-keycap"); k.textContent = "?"; k.className = "sk-keycap"; }
      else { const inp = $(".sk-input"); inp.value = ""; inp.className = "sk-input"; inp.focus(); }
    }
    function judge(ok, shown) {
      locked = true;
      if (ok) { right++; streak++; bestStreak = Math.max(bestStreak, streak); if (miss[q.cmd]) miss[q.cmd] = Math.max(0, miss[q.cmd] - 1); }
      else { wrong++; streak = 0; miss[q.cmd] = (miss[q.cmd] || 0) + 1; missed.push({ q, got: shown }); }
      ACAD.store.set("sk:miss", miss);
      $(".st-right").textContent = right; $(".st-wrong").textContent = wrong; $(".st-streak").textContent = streak;
      const ans = isKeys ? showKey(q.keys) : q.alias.join(" 또는 ");
      $(".sk-feedback").innerHTML = ok
        ? `<span class="ok">정답</span> ${ACAD.esc(q.cmd)}${q.alias.length ? ` = ${ACAD.esc(ans)}` : ""} · ${ACAD.esc(q.ko)}`
        : `<span class="no">정답은 ${ACAD.esc(ans)}</span> — ${ACAD.esc(q.ko)}${q.desc ? ` · ${ACAD.esc(q.desc)}` : ""}`;
      idx++;
      setTimeout(next, ok ? 450 : 1500);
    }
    function finish() {
      running = false;
      clearInterval(tick);
      const time = (performance.now() - t0) / 1000;
      if (!isKeys) $(".sk-input").disabled = true;
      $(".sk-q").textContent = `끝! ${pool.length}문제 중 ${right}개 정답`;
      $(".sk-meta").textContent = `최장 연속 ${bestStreak}개 · ${time.toFixed(1)}초`;
      $(".sk-timer i").style.width = "100%";
      const b = best();
      if (!b || right > b.right || (right === b.right && time < b.time)) { ACAD.store.set(key, { right, n: pool.length, time }); $(".sk-feedback").innerHTML = `<span class="ok">새 최고 기록</span>`; }
      showBest();
      const uniq = [...new Map(missed.map((m) => [m.q.cmd, m])).values()];
      $(".sk-result").innerHTML = uniq.length ? `<h3>다시 볼 것 ${uniq.length}개</h3><table class="tbl"><thead><tr><th>하고 싶은 일</th><th>정답</th><th>입력한 것</th><th>강의</th></tr></thead><tbody>${uniq.map((m) => `<tr><td>${ACAD.esc(m.q.drill)}</td><td>${isKeys ? `<kbd>${ACAD.esc(showKey(m.q.keys))}</kbd>` : m.q.alias.map((a) => `<kbd>${a}</kbd>`).join("")} <span class="mono small">${m.q.keys ? "" : m.q.cmd}</span></td><td class="mono">${ACAD.esc(m.got || "")}</td><td class="small">${lecLink(m.q.lecture)}</td></tr>`).join("")}</tbody></table>
        <p class="small" style="margin-top:12px"><a href="${ACAD.link.sandbox()}">CAD 연습장</a>에서 직접 써 보면 더 빨리 붙습니다.</p>` : `<p class="small">틀린 것이 없습니다. 이제 <a href="${ACAD.link.sandbox()}">CAD 연습장</a> 미션에서 실제로 써 보세요.</p>`;
      if (right === pool.length) ACAD.progress.mark(`quiz:shortcuts-${mode}`);
    }

    $(".sk-start").addEventListener("click", start);
    let onKey;
    if (isKeys) {
      onKey = (e) => {
        if (!running || locked) return;
        if (e.target.closest && e.target.closest("select, button") && e.key === "Enter") return;
        const k = keyName(e);
        if (!k) return;
        e.preventDefault();
        const cap = $(".sk-keycap");
        cap.textContent = showKey(k);
        const ok = k.toLowerCase() === q.keys.toLowerCase();
        cap.className = "sk-keycap " + (ok ? "right" : "wrong");
        judge(ok, showKey(k));
      };
      document.addEventListener("keydown", onKey);
    } else {
      const inp = $(".sk-input");
      inp.addEventListener("keydown", (e) => {
        if (!running || locked) { if (e.key === "Enter" || e.key === " ") e.preventDefault(); return; }
        if (e.key !== "Enter" && e.key !== " ") return;
        e.preventDefault();
        const v = inp.value.trim().toUpperCase();
        if (!v) return;
        const def = ACAD.CadCommands && ACAD.CadCommands.find(v);
        const byAlias = q.alias.includes(v);
        const byName = v === q.cmd || (def && def.name === q.cmd);
        inp.className = "sk-input " + (byAlias || byName ? "right" : "wrong");
        if (byName && !byAlias) {
          judge(true, v);
          $(".sk-feedback").innerHTML += ` <span class="small muted">(전체 이름도 되지만 ${q.alias[0]}가 더 빠릅니다)</span>`;
        } else judge(byAlias, v);
      });
    }
    return () => { clearInterval(tick); running = false; if (onKey) document.removeEventListener("keydown", onKey); };
  }

  ACAD.pages.shortcuts = { title: "단축키 훈련", nav: "shortcuts", mount };
})();
