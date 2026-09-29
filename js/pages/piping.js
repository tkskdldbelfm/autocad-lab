// 배관 도면 랩: #/piping?focus=overview|pid|plan|elev|iso|symbols|1001|1002|1003
(function () {
  const esc = (s) => ACAD.esc(s);
  const TABS = [
    ["overview", "개요"], ["pid", "P&ID ↔ 3D"], ["plan", "평면·입면"], ["elev", "입면 두 방향"],
    ["iso", "아이소"], ["symbols", "기호 사전"], ["1001", "라인 1001"], ["1002", "라인 1002"], ["1003", "라인 1003"],
  ];
  const LINES = {
    "1001": { from: "P-101 토출 노즐(FACE EL+800)", to: "E-201 입구 N1(FACE EL+1324)", size: '4"', what: "펌프에서 올라가 체크 밸브 V-102를 지나고, EL+1600 수평 구간에서 게이트 밸브 V-101과 압력계 PI-101을 지난 뒤 열교환기로 내려간다.", conn: { start: ["P-101 토출 노즐", "FACE EL+800"], end: ["E-201 N1", "FACE EL+1324"] } },
    "1002": { from: "E-201 출구 N2(FACE EL+1324)", to: "TK-301 옆 노즐 N3(FACE, CL EL+1600)", size: '3"', what: "열교환기 위로 올라가 EL+1600에서 북쪽으로 꺾인 뒤, 다시 동쪽으로 꺾여 탱크 옆 노즐에 들어간다. 엘보 두 개 가운데 첫째는 수직면(위→북), 둘째는 수평면(북→동) 안에서 꺾인다. 평면도에서 둘째 엘보의 모양이 그대로 보이는 이유다.", conn: { start: ["E-201 N2", "FACE EL+1324"], end: ["TK-301 N3", "CL EL+1600"] } },
    "1003": { from: "TK-301 바닥 노즐 N4(FACE EL+426)", to: "드레인 맹플랜지", size: '1"', what: "탱크 바닥에서 내려와 EL+300에서 남쪽으로 꺾이고, 평소 닫힌(NC) 게이트 밸브 V-103을 지나 맹플랜지로 끝난다. 평면도에서는 수직부가 탱크에 가려 숨은선이다.", conn: { start: ["TK-301 N4", "FACE EL+426"], end: ["맹플랜지", "CL EL+300"] } },
  };

  function resolve(prep, key) {
    const s = new Set();
    if (!key) return s;
    if (key.startsWith("line:")) {
      const L = key.slice(5);
      prep.partIds.forEach((id, i) => { if (prep.parts[id].line === L) s.add(i); });
    } else if (key === "PI-101") {
      s.add(prep.partIndex["PI-101"]); s.add(prep.partIndex["1001-BR"]);
    } else if (prep.partIndex[key] !== undefined) s.add(prep.partIndex[key]);
    return s;
  }

  ACAD.pages.piping = {
    title: "배관 도면 랩",
    nav: "piping",
    mount(el, ctx) {
      const focus = TABS.some((t) => t[0] === ctx.query.focus) ? ctx.query.focus : "overview";
      const prep = ACAD.HLR.prepare(ACAD.models["cw-skid"]);
      const page = ACAD.h(`<div class="page wide"><div style="max-width:1400px;margin:0 auto">
        <div class="page-head" style="margin-bottom:16px"><div>
          <div class="crumbs"><a href="#/">로드맵</a> · 배관 도면 랩 · 3년차~10년차</div>
          <h1 style="font-size:28px;line-height:36px">배관 도면 랩 · CW-SKID-01</h1>
          <p>같은 냉각수 스키드를 P&amp;ID, 평면도, 입면도, 아이소, 3D로 나란히 놓고 읽습니다. 어느 도면에 마우스를 올려도 같은 배관이 다른 도면과 3D에서 함께 켜집니다.</p>
        </div></div>
        <nav class="pl-tabs" aria-label="배관 도면 랩 탭">${TABS.map(([id, t]) => `<a href="${ACAD.link.piping(id)}" aria-current="${id === focus}">${t}</a>`).join("")}</nav>
        <div class="pl-body"></div>
        <p class="small muted" style="margin-top:24px">배관 등급 A1A는 이 교재에서만 쓰는 가상 등급(탄소강, SCH40, ASME B16.5 Class 150 플랜지)이다. 기호와 표기는 이 교재의 범례를 따르며, 현장 범례가 있으면 범례가 이긴다. 두께 계산과 응력 해석은 다루지 않는다.</p>
      </div></div>`);
      el.appendChild(page);
      const body = page.querySelector(".pl-body");
      const cleanups = [];
      const views = { overview, pid, plan, elev, iso, symbols };
      (views[focus] || lineFocus)(body, prep, focus, cleanups);
      return () => cleanups.forEach((f) => { try { f(); } catch (e) { console.error(e); } });
    },
  };

  // ---------------------------------------------------------------- 개요
  function overview(body, prep, _f, cleanups) {
    body.appendChild(ACAD.h(`<div class="pl-grid">
      <div>
        <h3 style="margin-bottom:8px">스키드 한 대, 도면 다섯 장</h3>
        <p>냉각수는 <b>P-101 펌프</b>에서 나와 <b>E-201 열교환기</b>를 지나 <b>TK-301 팽창 탱크</b>로 간다. 탱크 바닥에는 드레인이 있다. 이 흐름 하나를 도면마다 다른 질문으로 나누어 그린다.</p>
        <table class="tbl" style="margin:16px 0">
          <thead><tr><th>도면</th><th>답하는 질문</th><th>축척</th></tr></thead>
          <tbody>
            <tr><td><a href="${ACAD.link.piping("pid")}">P&amp;ID</a></td><td>무엇이 무엇에 연결되나. 밸브·계기·라인 번호</td><td>없음</td></tr>
            <tr><td><a href="${ACAD.link.piping("plan")}">평면도</a></td><td>관이 어디로 지나가나(동서·남북 위치)</td><td>있음(1:20 등)</td></tr>
            <tr><td><a href="${ACAD.link.piping("elev")}">입면도</a></td><td>관이 얼마나 높이 지나가나(EL)</td><td>있음</td></tr>
            <tr><td><a href="${ACAD.link.piping("iso")}">아이소</a></td><td>한 라인을 만들려면 무엇을 몇 개, 몇 mm로</td><td>없음(치수가 진짜)</td></tr>
            <tr><td>3D 모델</td><td>위 네 도면의 원천(Plant 3D 같은 도구에서)</td><td>1:1</td></tr>
          </tbody>
        </table>
        <h3 style="margin:24px 0 8px">라인 세 개</h3>
        <table class="tbl"><thead><tr><th>라인 번호</th><th>시작 → 끝</th></tr></thead><tbody>
          ${Object.entries(LINES).map(([id, l]) => `<tr><td class="mono"><a href="${ACAD.link.piping(id)}">${esc(prep.routes[id].name)}</a></td><td>${esc(l.from)} → ${esc(l.to)}</td></tr>`).join("")}
        </tbody></table>
        <div class="callout tip"><b>읽는 순서(현장 습관)</b>표제란과 범례 → P&amp;ID에서 라인 번호와 밸브 → 평면도에서 경로 → 입면도에서 높이 → 아이소에서 치수와 자재. 도면끼리 다르면 개정 번호가 높은 쪽, 그다음 P&amp;ID가 기준이다(회사 절차 우선).</div>
      </div>
      <div><div class="pl-3d"></div><p class="small muted" style="margin-top:8px">3D에 마우스를 올리면 부품 이름이 아래에 나온다. 드래그로 돌려 보자.</p><div class="pl-info small"></div></div>
    </div>`));
    const box = body.querySelector(".pl-3d");
    const info = body.querySelector(".pl-info");
    const t = ACAD.Viewer.create3D(box, prep, {
      onHover(pi) {
        t.hl(pi >= 0 ? new Set([pi]) : new Set());
        const p = pi >= 0 ? prep.parts[prep.partIds[pi]] : null;
        info.innerHTML = p ? `<b>${esc(p.name)}</b> — ${esc(p.info || "")}` : "";
      },
    });
    cleanups.push(() => t.destroy());
  }

  // ---------------------------------------------------------------- P&ID ↔ 3D
  function pid(body, prep, _f, cleanups) {
    body.appendChild(ACAD.h(`<div>
      <div class="pl-grid">
        <div class="pl-sheet">${ACAD.PipeDraw.pid()}</div>
        <div><div class="pl-3d"></div></div>
      </div>
      <div class="pl-info vw-info" style="margin-top:12px"></div>
      <div class="grid c3" style="margin-top:16px">
        <div class="callout"><b>P&amp;ID는 지도가 아니라 회로도</b>펌프와 열교환기의 실제 거리, 관의 높이는 P&amp;ID에 없다. 선의 길이와 꺾임도 뜻이 없다. 연결 순서와 밸브·계기만 믿는다.</div>
        <div class="callout"><b>P&amp;ID에 없는 것</b>서포트(S-1, S-2), 스키드 철골, 엘보 개수, 플랜지 위치. 3D에서 이것들에 마우스를 올려 보면 P&amp;ID에서 아무것도 켜지지 않는다.</div>
        <div class="callout"><b>ISO 10628</b>배관·계장도는 공정 흐름도를 바탕으로 설비·배관·측정·제어를 보여 준다. 설비 이름, 호칭경, 압력 등급, 재질, 라인 번호, 계기 식별을 읽는다.</div>
      </div>
    </div>`));
    const svg = body.querySelector(".pid");
    const info = body.querySelector(".pl-info");
    const syms = [...svg.querySelectorAll(".sym")];
    let t;
    const light = (key, set, from) => {
      syms.forEach((g) => g.classList.toggle("hl", !!key && g.dataset.key === key));
      t.hl(set);
      if (!key && from === "3d-none") return;
      describe(key, from);
    };
    const describe = (key, extraPart) => {
      if (!key) {
        info.innerHTML = extraPart && extraPart.startsWith("nopid:") ? `<b>${esc(extraPart.slice(6))}</b> — P&amp;ID에는 나오지 않는다. 평면도·입면도·아이소에서 찾는다.` : `<span class="muted">P&amp;ID의 기호나 선, 또는 3D의 부품에 마우스를 올려 보세요.</span>`;
        return;
      }
      if (key.startsWith("line:")) {
        const id = key.slice(5), r = prep.routes[id], l = LINES[id];
        info.innerHTML = `<b class="mono">${esc(r.name)}</b> — ${esc(l.from)} → ${esc(l.to)}. <a href="${ACAD.link.piping(id)}">라인 자세히</a>`;
      } else {
        const p = prep.parts[key];
        info.innerHTML = p ? `<b>${esc(p.name)}</b> — ${esc(p.info || "")}` : esc(key);
      }
    };
    t = ACAD.Viewer.create3D(body.querySelector(".pl-3d"), prep, {
      onHover(pi) {
        if (pi < 0) { light(null, new Set(), null); return; }
        const pid = prep.partIds[pi];
        const key = ACAD.PipeDraw.pidKeyOfPart(prep, pid);
        if (!key) { syms.forEach((g) => g.classList.remove("hl")); t.hl(new Set([pi])); describe(null, "nopid:" + prep.parts[pid].name); return; }
        light(key, resolve(prep, key));
      },
    });
    svg.addEventListener("pointerover", (e) => {
      const g = e.target.closest(".sym");
      if (!g) return;
      light(g.dataset.key, resolve(prep, g.dataset.key));
    });
    svg.addEventListener("pointerleave", () => light(null, new Set()));
    describe(null);
    cleanups.push(() => t.destroy());
  }

  // ---------------------------------------------------------------- 평면·입면
  function plan(body, prep, _f, cleanups) {
    body.appendChild(ACAD.h(`<div>
      <div class="grid c3" style="margin-bottom:16px">
        <div class="callout"><b>평면도에는 높이가 없다</b>높이는 EL 글자와 입면도로 읽는다. 평면도의 원은 수직관이다.</div>
        <div class="callout"><b>원을 읽는 법</b>수평관 선이 원 테두리에서 멈추면 관이 위로(보는 쪽으로) 오고, 원 중심까지 들어가면 아래로 간다. <a href="${ACAD.link.piping("symbols")}">기호 사전</a></div>
        <div class="callout"><b>평면과 입면은 세로로 줄이 맞는다</b>평면도의 x 위치를 아래로 내리면 입면도의 같은 x가 된다. 부품에 마우스를 올려 파란 보조선을 따라가 보자.</div>
      </div>
      <div class="pl-host"></div>
    </div>`));
    const v = ACAD.Viewer.mount(body.querySelector(".pl-host"), {
      model: "cw-skid", sheetViews: ["top", "front"], tall: true,
      viewTitles: { top: "평면도 PLAN", front: "입면도 ELEVATION — 남쪽에서 북쪽을 보며" },
    });
    cleanups.push(() => v.destroy());
  }

  function elev(body, prep, _f, cleanups) {
    body.appendChild(ACAD.h(`<div>
      <div class="grid c2" style="margin-bottom:16px">
        <div class="callout"><b>입면 방향을 먼저 읽는다</b>"LOOKING NORTH"는 남쪽에 서서 북쪽을 본 그림이다. 같은 스키드도 보는 방향에 따라 장치 순서가 바뀐다.</div>
        <div class="callout"><b>EL 읽기</b>CL은 관 중심, BOP는 관 밑. 서포트 S-1의 슈 윗면은 1001의 BOP(EL+1542.9)다. 4" 관 바깥지름 114.3의 절반만큼 CL보다 낮다.</div>
      </div>
      <div class="pl-host"></div>
    </div>`));
    const v = ACAD.Viewer.mount(body.querySelector(".pl-host"), {
      model: "cw-skid", sheetViews: ["front", "right"],
      viewTitles: { front: "입면도 A — LOOKING NORTH(정면도)", right: "입면도 B — LOOKING WEST(우측면도)" },
    });
    cleanups.push(() => v.destroy());
  }

  // ---------------------------------------------------------------- 아이소
  function iso(body, prep, focus, cleanups, lineId) {
    lineId = lineId || "1001";
    const wrap = ACAD.h(`<div>
      ${focus === "iso" ? `<div class="pl-lines" role="group" aria-label="라인 고르기">${Object.keys(LINES).map((id) => `<button type="button" data-line="${id}" aria-pressed="${id === lineId}">${esc(prep.routes[id].name)}</button>`).join("")}</div>` : ""}
      <div class="pl-grid">
        <div><div class="pl-sheet iso-host"></div></div>
        <div>
          <div class="pl-3d" style="height:320px"></div>
          <h4 style="margin:16px 0 8px">자재 목록(BOM)</h4>
          <div class="bom-host"></div>
        </div>
      </div>
      <div class="grid c3" style="margin-top:16px">
        <div class="callout"><b>아이소 한 장 = 라인 하나</b>시작과 끝은 장치 노즐이나 다른 라인과의 경계다. 축척이 없으니 자로 재지 않고 치수를 읽는다.</div>
        <div class="callout"><b>방향은 북쪽 화살표로</b>오른쪽 위가 북쪽, 오른쪽 아래가 동쪽, 위가 위다. 평면도의 북쪽과 같아야 한다.</div>
        <div class="callout"><b>스풀은 FW에서 나뉜다</b>공장에서 만들어 오는 조각이 스풀이다. 현장 용접(FW) 자리를 기준으로 스풀 번호를 붙인다.</div>
      </div>
    </div>`);
    body.appendChild(wrap);
    const isoHost = wrap.querySelector(".iso-host"), bomHost = wrap.querySelector(".bom-host");
    const t = ACAD.Viewer.create3D(wrap.querySelector(".pl-3d"), prep, {
      onHover(pi) { light(pi >= 0 ? prep.partIds[pi] : null, "3d"); },
    });
    cleanups.push(() => t.destroy());
    let bom = [];
    const light = (partId) => {
      const set = new Set();
      const p = partId ? prep.parts[partId] : null;
      if (p && p.line === lineId) set.add(prep.partIndex[partId]);
      if (partId === "1001-BR" && lineId === "1001") set.add(prep.partIndex["PI-101"]);
      isoHost.querySelectorAll(".sym").forEach((g) => g.classList.toggle("hl", !!partId && g.dataset.part === partId));
      const it = partId ? bom.find((b) => b.tags.includes(partId)) : null;
      bomHost.querySelectorAll("tr[data-bom]").forEach((tr) => tr.classList.toggle("hl", !!it && +tr.dataset.bom === it.no));
      t.hl(set);
    };
    const draw = () => {
      const r = ACAD.PipeDraw.iso(prep, lineId, { conn: LINES[lineId].conn });
      bom = r.bom;
      isoHost.innerHTML = r.svg;
      bomHost.innerHTML = ACAD.PipeDraw.bomTable(bom);
      light(null);
    };
    isoHost.addEventListener("pointerover", (e) => { const g = e.target.closest(".sym"); light(g ? g.dataset.part : null); });
    isoHost.addEventListener("pointerleave", () => light(null));
    bomHost.addEventListener("pointerover", (e) => {
      const tr = e.target.closest("tr[data-bom]");
      if (!tr) return;
      const tags = tr.dataset.tags ? tr.dataset.tags.split(",") : [];
      const set = new Set(tags.map((x) => prep.partIndex[x]).filter((x) => x !== undefined));
      isoHost.querySelectorAll(".sym").forEach((g) => g.classList.toggle("hl", tags.includes(g.dataset.part)));
      bomHost.querySelectorAll("tr[data-bom]").forEach((x) => x.classList.toggle("hl", x === tr));
      t.hl(set);
    });
    bomHost.addEventListener("pointerleave", () => light(null));
    wrap.querySelectorAll("[data-line]").forEach((b) => b.addEventListener("click", () => {
      lineId = b.dataset.line;
      wrap.querySelectorAll("[data-line]").forEach((x) => x.setAttribute("aria-pressed", x === b));
      draw();
    }));
    draw();
  }

  // ---------------------------------------------------------------- 기호 사전
  function symbols(body) {
    body.appendChild(ACAD.h(`<div>
      <p style="max-width:820px">평면도의 기호는 3D 모양을 위에서 본 결과다. 아래 기호가 왜 그렇게 생겼는지 3D로 확인해 보자. 이 교재의 범례이며, 회사마다 조금씩 다르다. 현장 범례가 있으면 범례가 이긴다.</p>
      <div class="sym-grid">${ACAD.PipeDraw.SYMBOLS.map((s) => `<article class="sym-card">
        <svg viewBox="0 0 300 120" role="img" aria-label="${esc(s.title)}">${s.svg}</svg>
        <h4>${esc(s.title)}</h4><p>${esc(s.text)}</p>
        ${s.model ? `<p style="margin-top:8px"><a href="${ACAD.link.viewer(s.model)}">3D로 확인 →</a></p>` : ""}
      </article>`).join("")}</div>
    </div>`));
  }

  // ---------------------------------------------------------------- 라인 집중
  function lineFocus(body, prep, id, cleanups) {
    const r = prep.routes[id], l = LINES[id];
    const parts = r.name.split("-");
    const labels = ["호칭경", "유체(CW 냉각수)", "라인 번호", "배관 등급(가상)", "재질(탄소강)"];
    const valves = r.comps.filter((c) => ["gate", "check", "globe", "ball"].includes(c.type)).map((c) => prep.parts[c.tag].name);
    body.appendChild(ACAD.h(`<div>
      <div class="pl-grid" style="margin-bottom:16px">
        <div>
          <h3>${esc(r.name)}</h3>
          <div class="lnbreak">${parts.map((p, i) => `<span><b>${esc(p)}</b><small>${labels[i] || ""}</small></span>`).join("")}</div>
          <p class="small muted">칸의 순서와 뜻은 회사마다 다르다. 라인 번호 규칙은 프로젝트의 배관 사양서 첫 장에 있다.</p>
          <p>${esc(l.what)}</p>
        </div>
        <table class="tbl">
          <tr><th>시작</th><td>${esc(l.from)}</td></tr>
          <tr><th>끝</th><td>${esc(l.to)}</td></tr>
          <tr><th>호칭경·외경</th><td>${l.size} · OD ${r.od} mm · LR 엘보 R ${r.R.toFixed(1)}</td></tr>
          <tr><th>작업점 길이 합</th><td>${Math.round(r.length)} mm</td></tr>
          <tr><th>밸브</th><td>${valves.length ? valves.map(esc).join(", ") : "없음"}</td></tr>
          <tr><th>등급 A1A</th><td>탄소강, SCH40, ASME B16.5 Class 150 플랜지(교재용 가상 등급)</td></tr>
        </table>
      </div>
      <div class="pl-host"></div>
      <h3 style="margin:32px 0 12px">이 라인의 아이소</h3>
      <div class="iso-wrap"></div>
    </div>`));
    const v = ACAD.Viewer.mount(body.querySelector(".pl-host"), {
      model: "cw-skid", sheetViews: ["top", "front"], tall: true,
      viewTitles: { top: "평면도 PLAN", front: "입면도 — LOOKING NORTH" },
    });
    v.select("line:" + id);
    cleanups.push(() => v.destroy());
    iso(body.querySelector(".iso-wrap"), prep, "line", cleanups, id);
  }
})();
