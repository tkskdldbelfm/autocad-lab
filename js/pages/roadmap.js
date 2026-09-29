// 로드맵(홈)과 단계 페이지
(function () {
  const { h, esc, link, progress } = ACAD;

  function stageStats(stage) {
    const done = stage.lessons.filter((l) => progress.has("lesson:" + l.id)).length;
    return { done, total: stage.lessons.length, pct: stage.lessons.length ? Math.round((done / stage.lessons.length) * 100) : 0 };
  }

  function nextLesson() {
    return ACAD.allLessons().find((l) => !progress.has("lesson:" + l.id)) || ACAD.allLessons()[0];
  }

  function lectureTag(l) {
    if (!l.lecture) return "";
    const nos = [].concat(l.lecture);
    return `<span class="tag">강의 ${nos.join("·")}</span>`;
  }

  function practiceTags(l) {
    const kinds = [...new Set((l.practice || []).map((p) => p.type))];
    return kinds.map((k) => `<span class="tag ${k === "sandbox" ? "yellow" : "info"}">${ACAD.practiceKind[k]}</span>`).join("");
  }

  // 홈 화면의 작은 그림: 3면도와 3D가 같은 모서리를 가리킨다
  const heroArt = `<svg viewBox="0 0 400 280" aria-hidden="true">
    <g fill="none" stroke="#ffffff" stroke-width="2">
      <rect x="24" y="24" width="120" height="72"/><line x1="84" y1="24" x2="84" y2="96"/>
      <path d="M24 196 H144 V172 H84 V124 H24 Z"/>
      <rect x="172" y="124" width="72" height="72"/><line x1="172" y1="172" x2="244" y2="172"/>
    </g>
    <g stroke="#ffff00" stroke-width="4"><line x1="84" y1="124" x2="84" y2="172"/><line x1="84" y1="24" x2="84" y2="96"/><line x1="172" y1="172" x2="244" y2="172"/></g>
    <g fill="none" stroke="#a3a3a3" stroke-dasharray="3 5"><line x1="84" y1="96" x2="84" y2="124"/><line x1="144" y1="172" x2="172" y2="172"/></g>
    <g transform="translate(300 170)" fill="none" stroke="#ffffff" stroke-width="2">
      <path d="M0 0 L-60 -35 L-60 -95 L-30 -112 L-30 -77 L0 -60 Z"/>
      <path d="M0 0 L60 -35 L60 -60 L30 -77 L0 -60"/>
      <path d="M-30 -112 L0 -130 L30 -112 L30 -77" /><path d="M-30 -112 L0 -95 L0 -60"/><path d="M0 -95 L30 -112"/>
    </g>
    <g transform="translate(300 170)" stroke="#ffff00" stroke-width="4"><line x1="0" y1="-95" x2="0" y2="-60"/></g>
    <text x="24" y="232" fill="#c9c9c9" font-size="12" font-family="Noto Sans KR, sans-serif">평면도 · 정면도 · 우측면도</text>
    <text x="252" y="232" fill="#c9c9c9" font-size="12" font-family="Noto Sans KR, sans-serif">3D</text>
  </svg>`;

  ACAD.pages.home = {
    title: "로드맵",
    nav: "home",
    mount(el) {
      const next = nextLesson();
      const total = ACAD.allLessons().length;
      const doneAll = progress.count("lesson:");
      el.appendChild(h(`<div class="page">
        <section class="hero">
          <div>
            <h1>도면을 읽고, 가볍게 그리고, <em>바로 확인한다</em></h1>
            <p>무거운 CAD를 켜지 않고 브라우저에서 AutoCAD의 기본 명령과 단축키를 연습합니다. 그린 것은 바로 해석해 주고, 3면도와 3D는 마우스를 올리면 서로 같은 곳이 켜집니다. 입문부터 10년차 배관 설계까지 한 길로 이어집니다.</p>
            <div class="actions">
              <a class="btn accent" href="${link.lesson(next.id)}">${doneAll ? "이어서 하기" : "입문부터 시작"} · ${esc(next.id)} ${esc(next.title)}</a>
              <a class="btn ghost" href="${link.sandbox()}">CAD 연습장</a>
              <a class="btn ghost" href="${link.viewer("block-step")}">3면도·3D 뷰어</a>
            </div>
          </div>
          ${heroArt}
        </section>

        <div class="page-head"><div><h2>5단계 로드맵</h2><p>입문·신입은 도면 읽기와 CAD 기본 기능, 3년차부터는 배관 도면을 읽고 구현하는 데 집중합니다. 전체 ${total}개 레슨 중 ${doneAll}개를 마쳤습니다.</p></div></div>
        <div class="track">
          ${ACAD.curriculum.map((s) => {
            const st = stageStats(s);
            return `<a href="${link.stage(s.id)}">
              <span class="lvl">STAGE ${s.id} · ${esc(s.years)}</span>
              <h3>${esc(s.name)}</h3>
              <div class="role">${esc(s.role)}</div>
              <p class="sum">${esc(s.band)}</p>
              <div class="band tiny muted">${st.done}/${st.total} 레슨</div>
              <div class="bar"><i style="width:${st.pct}%"></i></div>
            </a>`;
          }).join("")}
        </div>

        <div class="page-head"><div><h2>연습 도구</h2><p>레슨마다 아래 도구로 바로 연결됩니다. 도구만 따로 열어 자유롭게 써도 됩니다.</p></div></div>
        <div class="grid c3 tools">
          ${[
            ["sandbox", link.sandbox(), "CAD 연습장", "명령행, 단축키, 객체 스냅, 직교, 윈도우·걸침 선택까지 AutoCAD처럼. 그린 것을 바로 말로 풀어 주고 실수를 짚어 줍니다.", "M8 32 L32 8 M8 8 h8 M8 8 v8"],
            ["viewer", link.viewer(), "3면도·3D 뷰어", "평면도·정면도·우측면도와 3D를 나란히. 마우스를 올리면 네 곳에서 같은 부분이 켜집니다. 유리상자 펼치기 포함.", "M6 12 L20 4 L34 12 L34 28 L20 36 L6 28 Z M20 20 L34 12 M20 20 L6 12 M20 20 V36"],
            ["shortcuts", link.shortcuts(), "단축키 훈련", "명령어 별칭 드릴과 기능키(F3·F8·F10…) 드릴. 기록이 남습니다.", "M4 12 h32 v18 h-32 Z M10 18 h4 M18 18 h4 M26 18 h4 M12 24 h16"],
            ["viewquiz", link.quiz(), "도면 퀴즈", "3D를 보고 맞는 면 고르기, 빠진 면 찾기, 숨은선 읽기, 배관 평면·아이소 맞추기.", "M20 6 a14 14 0 1 1 -0.1 0 M16 16 a4 4 0 1 1 6 3 c-2 1 -2 2 -2 4 M20 28 v1"],
            ["piping", link.piping(), "배관 도면 랩", "냉각수 스키드 하나로 P&ID, 평면·입면, 아이소, 3D를 연결해 읽습니다. 3년차부터.", "M4 28 H16 V12 H36 M12 24 h8 v8 h-8 Z"],
            ["review", link.review(), "도면 검토", "오류가 숨은 도면에서 틀린 곳을 클릭해 찾습니다. 신입 도면부터 세트 검토까지.", "M6 6 h22 l6 6 v22 h-28 Z M12 18 l5 5 l10 -10"],
          ].map(([k, href, name, desc, path]) => `<a class="tool" href="${href}">
              <svg class="ico" viewBox="0 0 40 40" fill="none" stroke="#000" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="${path}"/></svg>
              <h3>${name}</h3><p>${desc}</p></a>`).join("")}
        </div>

        <div class="callout"><b>CAD 기초 강의 기준</b>입문·신입 단계의 CAD 기능 레슨은 <a href="${ACAD.playlist}" target="_blank" rel="noopener">CAD 기초강의 재생목록(35강)</a>의 순서를 그대로 따르고, 레슨마다 해당 강의로 연결됩니다. 영상으로 보고, 연습장 미션으로 바로 손에 익히세요.</div>
        <p class="tiny muted">배관 등급 A1A와 CW-SKID-01은 이 교재에서만 쓰는 가상 예제입니다. 두께 계산과 응력 해석은 다루지 않습니다. 현장 표준과 범례가 있으면 그 문서가 이깁니다.</p>
      </div>`));
    },
  };

  ACAD.pages.stage = {
    title: (ctx) => {
      const s = ACAD.curriculum.find((x) => x.id === ctx.arg);
      return s ? `${s.name} 단계` : "단계";
    },
    nav: "home",
    mount(el, ctx) {
      const stage = ACAD.curriculum.find((s) => s.id === ctx.arg) || ACAD.curriculum[0];
      const st = stageStats(stage);
      el.appendChild(h(`<div class="page">
        <div class="crumbs"><a href="#/">로드맵</a> / ${esc(stage.name)}</div>
        <nav class="stage-tabs" aria-label="단계">
          ${ACAD.curriculum.map((s) => `<a href="${link.stage(s.id)}" aria-current="${s.id === stage.id}">${esc(s.name)} <span class="tiny">${esc(s.years)}</span></a>`).join("")}
        </nav>
        <div class="stage-head">
          <div>
            <h1>${esc(stage.name)} · ${esc(stage.role)}</h1>
            <p class="muted" style="margin-top:12px">${esc(stage.summary)}</p>
            <div class="small">${st.done}/${st.total} 레슨 완료</div>
            <div class="bar" style="margin-top:8px"><i style="width:${st.pct}%"></i></div>
          </div>
          <div class="goal"><b>이 단계를 마치면</b>${esc(stage.goal)}</div>
        </div>
        <div class="lesson-list">
          ${stage.lessons.map((l) => `<a class="lesson-row ${progress.has("lesson:" + l.id) ? "done" : ""}" href="${link.lesson(l.id)}">
            <span class="lid">${esc(l.id)}</span>
            <div><h4>${esc(l.title)}</h4><p>${esc(l.summary)}</p></div>
            <div class="meta">${lectureTag(l)}${practiceTags(l)}</div>
          </a>`).join("")}
        </div>
      </div>`));
    },
  };
})();
