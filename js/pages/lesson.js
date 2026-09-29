// 레슨 상세 페이지
(function () {
  const { h, esc, link, progress } = ACAD;

  function shortcutChip(cmd) {
    const s = (ACAD.shortcuts || []).find((x) => x.cmd === cmd);
    if (!s) return `<span class="cmd-chip"><kbd>${esc(cmd)}</kbd></span>`;
    const keys = s.keys ? [s.keys] : s.alias && s.alias.length ? s.alias : [];
    const label = s.keys ? s.ko : `${s.cmd}${s.ko ? " · " + s.ko : ""}`;
    return `<span class="cmd-chip" title="${esc(s.desc || "")}">${keys.map((k) => `<kbd>${esc(k)}</kbd>`).join("")}<span>${esc(label)}</span></span>`;
  }

  function lectureCards(l) {
    if (!l.lecture) return "";
    return [].concat(l.lecture).map((no) => {
      const lec = ACAD.lecture(no);
      if (!lec) return "";
      return `<a class="practice-link" href="${lec.url}" target="_blank" rel="noopener">
        <img src="${lec.thumb}" alt="" width="96" height="54" style="border-radius:4px;object-fit:cover;flex:none" onerror="this.remove()">
        <span><span class="k">CAD 기초강의 ${lec.no}${lec.len ? " · " + lec.len : ""} ↗</span>${esc(lec.title)}</span>
      </a>`;
    }).join("");
  }

  function renderFigures(root, cleanups) {
    root.querySelectorAll("[data-figure]").forEach((slot) => {
      const key = slot.dataset.figure;
      if (key.startsWith("viewer:")) {
        // viewer:<모델>[?section=A|B&half=1&cut=<mm>]
        const [model, qs = ""] = key.slice(7).split("?");
        const q = Object.fromEntries(new URLSearchParams(qs));
        const big = link.viewer(model) + (qs ? "&" + qs : "");
        const cap = q.section ? "해칭한 면이 잘린 자리입니다. 도구 막대에서 단면 A-A / B-B, 한쪽 단면, 자르는 위치를 바꿔 보세요." : "마우스를 선이나 면에 올리면 네 화면에서 같은 곳이 켜집니다.";
        const fig = h(`<figure><div class="lesson-viewer"></div><figcaption>${cap} <a href="${big}">크게 열기</a></figcaption></figure>`);
        slot.replaceWith(fig);
        const box = fig.querySelector(".lesson-viewer");
        if (ACAD.Viewer && ACAD.models && ACAD.models[model]) {
          try {
            const v = ACAD.Viewer.mount(box, { model, compact: true, section: q.section, half: q.half === "1", cut: q.cut });
            if (v) cleanups.push(() => v.destroy && v.destroy());
          } catch (e) {
            console.error(e);
            box.innerHTML = `<a class="btn" href="${big}">3면도·3D 뷰어에서 보기</a>`;
          }
        } else {
          box.innerHTML = `<a class="btn" href="${big}">3면도·3D 뷰어에서 보기</a>`;
        }
      } else if (ACAD.figures && ACAD.figures[key]) {
        slot.replaceWith(h(`<figure>${ACAD.figures[key]()}</figure>`));
      } else {
        slot.remove();
      }
    });
  }

  function renderQuiz(root, lesson) {
    const box = root.querySelector(".quiz");
    if (!box || !lesson.check || !lesson.check.length) return;
    const answered = new Map();
    box.innerHTML = `<h3>확인 문제</h3><p class="muted small">모두 맞히면 이 레슨이 완료로 표시됩니다.</p>` +
      lesson.check.map((c, qi) => `<div class="quiz-q" data-q="${qi}">
        <p>${qi + 1}. ${esc(c.q)}</p>
        <div class="quiz-opts">${c.o.map((o, oi) => `<button type="button" data-o="${oi}">${esc(o)}</button>`).join("")}</div>
        <div class="quiz-why" hidden></div>
      </div>`).join("");
    box.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-o]");
      if (!btn) return;
      const qEl = btn.closest(".quiz-q");
      const qi = +qEl.dataset.q, oi = +btn.dataset.o, c = lesson.check[qi];
      qEl.querySelectorAll("button").forEach((b) => b.classList.remove("right", "wrong"));
      const right = oi === c.a;
      btn.classList.add(right ? "right" : "wrong");
      if (!right) qEl.querySelector(`button[data-o="${c.a}"]`).classList.add("right");
      const why = qEl.querySelector(".quiz-why");
      why.hidden = false;
      why.innerHTML = `<b>${right ? "맞았습니다." : "다시 보세요."}</b> ${esc(c.why || "")}`;
      if (!answered.has(qi)) answered.set(qi, right);
      if (answered.size === lesson.check.length && [...answered.values()].every(Boolean)) {
        progress.mark("lesson:" + lesson.id, true);
        const t = root.querySelector(".done-toggle input");
        if (t) t.checked = true;
      }
    });
  }

  ACAD.pages.lesson = {
    title: (ctx) => {
      const f = ACAD.findLesson(ctx.arg);
      return f ? `${f.lesson.id} ${f.lesson.title}` : "레슨";
    },
    nav: "home",
    mount(el, ctx) {
      const found = ACAD.findLesson(ctx.arg);
      if (!found) {
        el.appendChild(h(`<div class="page"><div class="empty">레슨을 찾을 수 없습니다. <a href="#/">로드맵으로</a></div></div>`));
        return;
      }
      const { stage, lesson } = found;
      const all = ACAD.allLessons();
      const idx = all.indexOf(lesson);
      const prev = all[idx - 1], next = all[idx + 1];
      const cleanups = [];
      const doneId = "lesson:" + lesson.id;

      const page = h(`<div class="page">
        <div class="crumbs"><a href="#/">로드맵</a> / <a href="${link.stage(stage.id)}">${esc(stage.name)}</a> / ${esc(lesson.id)}</div>
        <div class="page-head" style="margin-bottom:32px">
          <div>
            <h1>${esc(lesson.title)}</h1>
            <p>${esc(lesson.summary)}</p>
          </div>
        </div>
        <div class="lesson-layout">
          <article class="lesson-body">
            ${lesson.body}
            <div class="quiz"></div>
          </article>
          <aside class="lesson-side">
            ${lesson.lecture ? `<div class="card"><h4>강의 영상</h4>${lectureCards(lesson)}</div>` : ""}
            ${(lesson.practice || []).length ? `<div class="card"><h4>바로 연습</h4>
              ${lesson.practice.map((p) => `<a class="practice-link" href="${ACAD.practiceHref(p)}"><span><span class="k">${ACAD.practiceKind[p.type] || ""}</span>${esc(p.label)}</span></a>`).join("")}
            </div>` : ""}
            ${(lesson.points || []).length ? `<div class="card flat"><h4>한 줄 요약</h4><ul class="small" style="margin:0;padding-left:20px">${lesson.points.map((p) => `<li>${esc(p)}</li>`).join("")}</ul></div>` : ""}
            ${(lesson.commands || []).length ? `<div class="card"><h4>명령 · 단축키</h4><div class="cmd-chips">${lesson.commands.map(shortcutChip).join("")}</div></div>` : ""}
            <label class="done-toggle card"><input type="checkbox" ${progress.has(doneId) ? "checked" : ""}> 이 레슨을 마쳤습니다</label>
          </aside>
        </div>
        <nav class="pager">
          ${prev ? `<a href="${link.lesson(prev.id)}"><small>← 이전 ${esc(prev.id)}</small>${esc(prev.title)}</a>` : "<span></span>"}
          ${next ? `<a href="${link.lesson(next.id)}" style="text-align:right"><small>다음 ${esc(next.id)} →</small>${esc(next.title)}</a>` : "<span></span>"}
        </nav>
      </div>`);
      el.appendChild(page);
      renderFigures(page, cleanups);
      renderQuiz(page, lesson);
      page.querySelector(".done-toggle input").addEventListener("change", (e) => progress.mark(doneId, e.target.checked));
      return () => cleanups.forEach((fn) => { try { fn(); } catch (e) { console.error(e); } });
    },
  };
})();
