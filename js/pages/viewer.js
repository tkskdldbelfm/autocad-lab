// 3면도·3D 뷰어 페이지: #/viewer?model=<id>&layout=first&highlight=<partId>&section=A|B&half=1&cut=<mm>
(function () {
  const STAGES = { 0: "입문", 1: "신입", 2: "3년차", 3: "5년차", 4: "10년차" };
  const LEGEND = `<div class="vp-legend" aria-label="선의 종류">
    <span><i></i>외형선(보이는 선, 굵은 실선)</span>
    <span><i class="h"></i>숨은선(가는 파선)</span>
    <span><i class="c"></i>중심선(가는 1점 쇄선)</span>
    <span><i class="y"></i>마우스를 올린 부분</span>
  </div>`;

  ACAD.pages.viewer = {
    title: (ctx) => (ACAD.models[ctx.query.model]?.title || "3면도·3D 뷰어"),
    nav: "viewer",
    mount(el, ctx) {
      const id = ACAD.models[ctx.query.model] && !ACAD.models[ctx.query.model].hidden ? ctx.query.model : "block-basic";
      const model = ACAD.models[id];
      const groups = {};
      for (const m of Object.values(ACAD.models)) {
        if (m.hidden) continue;
        (groups[m.stage] ||= []).push(m);
      }
      const side = Object.keys(groups).sort().map((s) => `<div><h4>${STAGES[s] || s}</h4><div class="vp-models">${groups[s].map((m) =>
        `<a href="${ACAD.link.viewer(m.id)}" aria-current="${m.id === id}">${ACAD.esc(m.title)}<small>${m.kind === "piping" ? "배관" : "기계 부품"}</small></a>`).join("")}</div></div>`).join("");
      const page = ACAD.h(`<div class="page wide">
        <div class="vp">
          <aside class="vp-side">${side}
            <div class="callout tip small"><b>읽는 순서</b>1. 3D에서 모양을 본다. 2. 도면 위를 천천히 움직이며 노란 곳을 따라간다. 3. 3D를 가리고 도면만으로 모양을 떠올려 본다.</div>
          </aside>
          <section>
            <div class="vp-head">
              <div><div class="crumbs"><a href="#/">로드맵</a> · 3면도·3D 뷰어 · ${STAGES[model.stage]}</div>
                <h2>${ACAD.esc(model.title)}</h2><p>${ACAD.esc(model.desc)}</p></div>
              ${LEGEND}
            </div>
            <label class="vp-pick"><span class="small muted">모델</span>
              <select>${Object.keys(groups).sort().map((s) => `<optgroup label="${STAGES[s] || s}">${groups[s].map((m) => `<option value="${m.id}"${m.id === id ? " selected" : ""}>${ACAD.esc(m.title)}</option>`).join("")}</optgroup>`).join("")}</select>
            </label>
            <div class="vp-host"></div>
            ${model.kind === "piping" ? `<div class="callout small">배관 기호와 표기는 이 교재의 범례를 따릅니다. 현장 범례가 있으면 범례가 이깁니다. <a href="${ACAD.link.piping("symbols")}">기호 사전 보기</a></div>` : ""}
          </section>
        </div>
      </div>`);
      el.appendChild(page);
      page.querySelector(".vp-pick select").addEventListener("change", (e) => { location.hash = ACAD.link.viewer(e.target.value); });
      const v = ACAD.Viewer.mount(page.querySelector(".vp-host"), {
        model: id, layout: ctx.query.layout, highlight: ctx.query.highlight ? ctx.query.highlight.split(",") : null,
        glass: ctx.query.glass === "1",
        section: ctx.query.section, half: ctx.query.half === "1", cut: ctx.query.cut,
      });
      return () => v.destroy();
    },
  };
})();
