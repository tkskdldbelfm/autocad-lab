// 해시 라우터. 페이지는 ACAD.pages[name] = { title, nav, mount(el, ctx) } 로 등록한다.
// mount는 정리 함수(또는 { destroy })를 돌려줄 수 있다. ctx = { arg, query }
(function () {
  const app = document.getElementById("app");
  let cleanup = null;

  function parse() {
    const raw = location.hash.replace(/^#\/?/, "");
    const [path, qs = ""] = raw.split("?");
    const [name = "", arg = ""] = path.split("/");
    const query = Object.fromEntries(new URLSearchParams(qs));
    return { name: name || "home", arg: decodeURIComponent(arg), query };
  }

  function route() {
    const ctx = parse();
    const page = ACAD.pages[ctx.name] || ACAD.pages.home;
    if (cleanup) {
      try { typeof cleanup === "function" ? cleanup() : cleanup.destroy?.(); } catch (e) { console.error(e); }
      cleanup = null;
    }
    app.innerHTML = "";
    app.dataset.page = ctx.name;
    document.querySelectorAll(".nav a").forEach((a) => {
      a.setAttribute("aria-current", a.dataset.nav === (page.nav || ctx.name) ? "page" : "false");
    });
    try {
      cleanup = page.mount(app, ctx) || null;
    } catch (e) {
      console.error(e);
      app.innerHTML = `<div class="page"><div class="callout warn"><b>이 화면을 여는 중에 오류가 났습니다.</b>${ACAD.esc(e.message)}</div></div>`;
    }
    const t = typeof page.title === "function" ? page.title(ctx) : page.title;
    document.title = t ? `${t} · AutoCAD 러닝랩` : "AutoCAD 러닝랩";
    if (!ctx.query.keepScroll) window.scrollTo(0, 0);
    updatePill();
  }

  function updatePill() {
    const pill = document.querySelector(".progress-pill");
    if (!pill || !ACAD.curriculum) return;
    const total = ACAD.curriculum.reduce((n, s) => n + s.lessons.length, 0);
    pill.textContent = `레슨 ${ACAD.progress.count("lesson:")}/${total} 완료`;
  }

  ACAD.route = route;
  ACAD.bus.on("progress", updatePill);
  window.addEventListener("hashchange", route);
  document.addEventListener("DOMContentLoaded", route);
})();
