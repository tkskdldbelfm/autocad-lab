// 도면 퀴즈: #/viewquiz?set=basic|missing|hidden|section|piping
(function () {
  const esc = (s) => ACAD.esc(s);
  const H = () => ACAD.HLR;
  const VN = { top: "평면도", front: "정면도", right: "우측면도", left: "좌측면도", back: "배면도", bottom: "저면도" };
  const DIRS = { E: [1, 0, 0], W: [-1, 0, 0], N: [0, 1, 0], S: [0, -1, 0], U: [0, 0, 1], D: [0, 0, -1] };

  function shuffle(a, seed) {
    const r = a.slice();
    let s = seed || 1;
    for (let i = r.length - 1; i > 0; i--) {
      s = (s * 9301 + 49297) % 233280;
      const j = Math.floor((s / 233280) * (i + 1));
      [r[i], r[j]] = [r[j], r[i]];
    }
    return r;
  }

  function viewThumb(o, hlPart) {
    const prep = H().prepare(ACAD.models[o.model]);
    const hl = hlPart != null ? prep.partIndex[hlPart] : undefined;
    return H().viewSVG(prep, o.view, { mirror: o.mirror, hidden: o.hidden, hlPart: hl, hlHiddenOnly: true, section: o.section || null, hatchAll: o.hatchAll });
  }

  // ---------- 단선 배관 그림(퀴즈용) ----------
  function routePts(route) {
    const pts = [[0, 0, 0]];
    for (const [d, L] of route) { const v = DIRS[d]; const p = pts[pts.length - 1]; pts.push([p[0] + v[0] * L, p[1] + v[1] * L, p[2] + v[2] * L]); }
    return pts;
  }
  // 평면(x,y) 또는 입면(x,z). 보는 방향으로 가는 구간은 원: 보는 쪽으로 오면 선이 원 테두리에서, 멀어지면 원 중심까지.
  function singleLine(route, kind) {
    const pts = routePts(route);
    const pr = kind === "plan" ? (p) => [p[0], -p[1]] : (p) => [p[0], -p[2]];
    const towardViewer = kind === "plan" ? (d) => d === "U" : (d) => d === "S";
    const awayViewer = kind === "plan" ? (d) => d === "D" : (d) => d === "N";
    const P = pts.map(pr);
    const xs = P.map((p) => p[0]), ys = P.map((p) => p[1]);
    const pad = 220;
    const x0 = Math.min(...xs) - pad, y0 = Math.min(...ys) - pad, w = Math.max(...xs) - Math.min(...xs) + pad * 2, h = Math.max(...ys) - Math.min(...ys) + pad * 2;
    const R = 70;
    let d = "", circles = "";
    for (let i = 0; i < route.length; i++) {
      const [dir] = route[i];
      const a = P[i], b = P[i + 1];
      if (towardViewer(dir) || awayViewer(dir)) {
        circles += `<circle cx="${a[0]}" cy="${a[1]}" r="${R}" class="t"/>`;
        continue;
      }
      let A = a.slice(), B = b.slice();
      const len = Math.hypot(B[0] - A[0], B[1] - A[1]) || 1, ux = (B[0] - A[0]) / len, uy = (B[1] - A[1]) / len;
      // 이 구간이 수직관보다 아래(먼 쪽)에 있으면 수직관의 원에 가려 선이 원 테두리에서 멈춘다.
      // 끝 쪽: 다음 구간이 보는 쪽으로 오면(평면 U) 이 구간이 아래. 시작 쪽: 앞 구간이 멀어지는 쪽이었으면(평면 D) 이 구간이 아래.
      if (i > 0 && awayViewer(route[i - 1][0])) { A = [A[0] + ux * R, A[1] + uy * R]; }
      if (i < route.length - 1 && towardViewer(route[i + 1][0])) { B = [B[0] - ux * R, B[1] - uy * R]; }
      d += `M${A[0]} ${A[1]}L${B[0]} ${B[1]}`;
    }
    const lbl = kind === "plan" ? "단선 평면도" : "단선 입면도(남쪽에서 북쪽을 보며)";
    const north = kind === "plan" ? `<g transform="translate(${x0 + w - 110} ${y0 + 120})"><path d="M0 60L0 -60" class="t"/><path d="M0 -80L-18 -40L18 -40Z" class="f"/><text x="30" y="-40" style="font-size:64px">N</text></g>` : "";
    return `<svg viewBox="${x0} ${y0} ${w} ${h}" class="sl"><path d="${d}" class="s"/>${circles}${north}</svg><figcaption>${lbl}</figcaption>`;
  }
  function isoLine(route) {
    const pts = routePts(route);
    const c30 = Math.cos(Math.PI / 6);
    const P = pts.map((p) => [(p[0] + p[1]) * c30, (p[0] - p[1]) * 0.5 - p[2]]);
    const xs = P.map((p) => p[0]), ys = P.map((p) => p[1]);
    const pad = 200;
    const x0 = Math.min(...xs) - pad, y0 = Math.min(...ys) - pad, w = Math.max(...xs) - Math.min(...xs) + pad * 2 + 320, h = Math.max(...ys) - Math.min(...ys) + pad * 2;
    const nd = [c30, -0.5];
    const nx = x0 + w - 170, ny = y0 + 170;
    return `<svg viewBox="${x0} ${y0} ${w} ${h}" class="sl"><path d="M${P.map((p) => p[0] + " " + p[1]).join("L")}" class="s"/>
      <circle cx="${P[0][0]}" cy="${P[0][1]}" r="26" class="f"/>
      <path d="M${nx - nd[0] * 90} ${ny - nd[1] * 90}L${nx + nd[0] * 90} ${ny + nd[1] * 90}" class="t" style="stroke-width:8"/><path d="M${nx + nd[0] * 110} ${ny + nd[1] * 110}L${nx + nd[0] * 60 - nd[1] * 28} ${ny + nd[1] * 60 + nd[0] * 28}L${nx + nd[0] * 60 + nd[1] * 28} ${ny + nd[1] * 60 - nd[0] * 28}Z" class="f"/>
      <text x="${nx + nd[0] * 120}" y="${ny + nd[1] * 120 - 10}" style="font-size:72px">N</text></svg>`;
  }

  ACAD.pages.viewquiz = {
    title: "도면 퀴즈",
    nav: "viewquiz",
    mount(el, ctx) {
      const sets = ACAD.viewQuizSets;
      const set = sets.find((s) => s.id === ctx.query.set) || sets[0];
      const best = ACAD.store.get("quizbest", {});
      const page = ACAD.h(`<div class="page">
        <div class="page-head"><div>
          <div class="crumbs"><a href="#/">로드맵</a> · 도면 퀴즈</div>
          <h1>도면 퀴즈</h1>
          <p>모든 보기 그림은 3면도 뷰어와 같은 엔진으로 그 자리에서 그린 것입니다. 틀리면 설명을 읽고 3D로 확인해 보세요. 80% 이상이면 세트 완료로 기록됩니다.</p>
        </div></div>
        <div class="qz-sets">${sets.map((s) => `<a href="${ACAD.link.quiz(s.id)}" aria-current="${s.id === set.id}">
          <b>${esc(s.title)}</b><small>${esc(s.desc)}</small><br>
          <span class="tag${ACAD.progress.has("quiz:" + s.id) ? " ok" : ""}" style="margin-top:8px">${best[s.id] != null ? `최고 ${best[s.id]}%` : `${s.questions.length}문제`}</span></a>`).join("")}</div>
        <div class="qz-host"></div>
      </div>`);
      el.appendChild(page);
      const host = page.querySelector(".qz-host");
      let idx = 0, score = 0, answers = [], mini = null, seed = Date.now() % 1000;
      const killMini = () => { if (mini) { mini.destroy(); mini = null; } };

      function render() {
        killMini();
        if (idx >= set.questions.length) return finish();
        const q = set.questions[idx];
        const order = shuffle(q.options.map((_, i) => i), seed + idx * 7);
        const dots = set.questions.map((_, i) => `<i class="${answers[i] === true ? "ok" : answers[i] === false ? "no" : ""}${i === idx ? " cur" : ""}"></i>`).join("");
        let prompt = q.prompt, stim = "", opts = "", textOpts = false;
        if (q.type === "pick") {
          const tv = VN[q.view];
          prompt = q.prompt || (q.stim === "3d" ? `이 물체의 <b>${tv}</b>는 어느 것인가? (3D를 돌려 보세요)` : `두 투상도를 보고 <b>${tv}</b>를 고르시오. (제3각법)`);
          if (q.stim === "3d") stim = `<figure><div class="qz-3d"></div><figcaption>처음 화면에서 앞면은 왼쪽 아래를 향한다. 드래그로 돌려 보자.</figcaption></figure>`;
          else stim = q.stim.views.map((v) => `<figure>${viewThumb({ model: q.model, view: v })}<figcaption>${VN[v]}</figcaption></figure>`).join("");
          opts = order.map((i, k) => `<button type="button" data-i="${i}"><span class="k">${"ABCD"[k]}</span>${viewThumb(q.options[i])}</button>`).join("");
        } else if (q.type === "part") {
          const prep = H().prepare(ACAD.models[q.model]);
          prompt = `${VN[q.view]}에서 <b>굵게 표시한 선</b>은 3D의 어느 부분인가?`;
          stim = `<figure>${viewThumb({ model: q.model, view: q.view }, q.part)}<figcaption>${esc(ACAD.models[q.model].title)} · ${VN[q.view]}</figcaption></figure>`;
          opts = order.map((i, k) => `<button type="button" data-i="${i}"><span class="k">${"ABCD"[k]}</span>${esc(prep.parts[q.options[i]].name)}</button>`).join("");
          textOpts = true;
        } else if (q.type === "pickplan") {
          stim = `<figure>${viewThumb({ model: q.model, view: "top" })}<figcaption>평면도(복선)</figcaption></figure>`;
          opts = order.map((i, k) => `<button type="button" data-i="${i}"><span class="k">${"AB"[k]}</span>${esc(q.options[i])}</button>`).join("");
          textOpts = true;
        } else if (q.type === "iso") {
          stim = `<figure class="qz-fig">${singleLine(q.route, "plan")}</figure><figure class="qz-fig">${singleLine(q.route, "elev")}</figure>`;
          opts = order.map((i, k) => `<button type="button" data-i="${i}" class="qz-fig"><span class="k">${"ABCD"[k]}</span>${isoLine(q.options[i])}</button>`).join("");
        } else {
          opts = order.map((i, k) => `<button type="button" data-i="${i}"><span class="k">${"ABCD"[k]}</span>${esc(q.options[i])}</button>`).join("");
          textOpts = true;
        }
        host.innerHTML = `<div class="qz"><div class="qz-card">
            <div class="small muted">${esc(set.title)} · ${idx + 1} / ${set.questions.length}</div>
            <div class="qz-dots">${dots}</div>
            <div class="qz-q">${prompt}</div>
            ${stim ? `<div class="qz-stim">${stim}</div>` : ""}
            <div class="qz-opts${textOpts ? " text" : ""}">${opts}</div>
            <div class="qz-fb" aria-live="polite"></div>
          </div>
          <aside class="card flat small">
            <h4>이렇게 풀기</h4>
            ${set.id === "section" ? `<p>1. 자르는 면의 위치와 보는 방향(화살표)을 먼저 정한다.</p><p>2. 자르는 면에 닿은 재료만 45° 해칭. 구멍 자리는 흰 틈으로 남는다.</p><p>3. 단면도에는 숨은선을 그리지 않는다. 파선이 보이면 자르지 않은 그림이다.</p><p>4. 리브·축·볼트를 길이 방향으로 자르면 해칭하지 않는다(KS).</p>`
              : set.id === "piping" ? `<p>평면도의 원은 수직관이다. 선이 원 테두리에서 멈추면 보는 쪽으로 올라오고, 원 중심까지 들어가면 멀어진다.</p><p>아이소에서 북쪽은 오른쪽 위, 동쪽은 오른쪽 아래, 위는 위다.</p>`
              : `<p>1. 보는 방향을 정한다(정면 = 앞에서, 평면 = 위에서, 우측면 = 오른쪽에서).</p><p>2. 그 방향에서 가장 앞에 있는 면의 윤곽을 실선으로 떠올린다.</p><p>3. 뒤에 숨은 모서리는 파선, 구멍의 축은 1점 쇄선.</p><p>4. 제3각법에서 평면도는 정면도 위, 우측면도는 오른쪽에 놓인다.</p>`}
          </aside></div>`;
        if (q.type === "pick" && q.stim === "3d") mini = ACAD.Viewer.mini3d(host.querySelector(".qz-3d"), q.model, {});
        host.querySelectorAll(".qz-opts button").forEach((b) => b.addEventListener("click", () => answer(+b.dataset.i)));
      }

      function answer(i) {
        const q = set.questions[idx];
        const ok = i === 0;
        answers[idx] = ok;
        if (ok) score++;
        host.querySelectorAll(".qz-opts button").forEach((b) => {
          b.disabled = true;
          if (+b.dataset.i === 0) b.classList.add("right");
          else if (+b.dataset.i === i) b.classList.add("wrong");
        });
        const model = q.model || null;
        const part = q.part || q.check?.part;
        const secQ = q.check?.section ? `&section=${q.check.section}${q.check.half ? "&half=1" : ""}` : "";
        const checkLink = model ? `<a class="btn small" href="${ACAD.link.viewer(model)}${part ? "&highlight=" + encodeURIComponent(part) : ""}${secQ}">3D로 확인</a>` : "";
        host.querySelector(".qz-fb").innerHTML = `<div class="callout ${ok ? "tip" : "warn"}"><b>${ok ? "맞았습니다." : "아쉽습니다. 초록색 테두리가 정답입니다."}</b>${esc(q.why)}</div>
          <div class="qz-nav">${checkLink}<button type="button" class="btn primary small" data-next>${idx + 1 < set.questions.length ? "다음 문제" : "결과 보기"}</button></div>`;
        host.querySelector("[data-next]").addEventListener("click", () => { idx++; render(); });
        if (["part", "pickplan"].includes(q.type) && model) {
          const box = document.createElement("figure");
          box.innerHTML = `<div class="qz-3d"></div><figcaption>3D에서 노란 부분이 정답 부분</figcaption>`;
          host.querySelector(".qz-stim").appendChild(box);
          const hl = q.type === "part" ? [q.part] : Object.keys(H().prepare(ACAD.models[model]).parts).filter((id) => /-P2$|-E1$|-P3$/.test(id));
          killMini();
          mini = ACAD.Viewer.mini3d(box.querySelector(".qz-3d"), model, { highlight: hl });
        }
      }

      function finish() {
        const pct = Math.round((score / set.questions.length) * 100);
        const b = ACAD.store.get("quizbest", {});
        if (b[set.id] == null || pct > b[set.id]) { b[set.id] = pct; ACAD.store.set("quizbest", b); }
        if (pct >= 80) ACAD.progress.mark("quiz:" + set.id, true);
        const next = sets[(sets.indexOf(set) + 1) % sets.length];
        host.innerHTML = `<div class="qz-card">
          <div class="small muted">${esc(set.title)} 결과</div>
          <div class="qz-score">${score} / ${set.questions.length} · ${pct}%</div>
          <div class="qz-dots">${answers.map((a) => `<i class="${a ? "ok" : "no"}"></i>`).join("")}</div>
          <p>${pct >= 80 ? "세트 완료로 기록했습니다." : "80% 이상이면 세트 완료로 기록됩니다. 틀린 문제의 설명을 다시 보고 도전해 보세요."} 최고 기록 ${b[set.id]}%.</p>
          <div class="qz-nav"><button type="button" class="btn primary" data-retry>다시 풀기</button><a class="btn" href="${ACAD.link.quiz(next.id)}">다음 세트: ${esc(next.title)}</a><a class="btn ghost" href="${ACAD.link.viewer()}">3면도 뷰어로</a></div>
        </div>`;
        host.querySelector("[data-retry]").addEventListener("click", () => { idx = 0; score = 0; answers = []; seed++; render(); });
      }

      render();
      return () => killMini();
    },
  };
})();
