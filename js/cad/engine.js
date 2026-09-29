// CAD 연습장 엔진: 화면(캔버스), 입력(명령창·마우스·기능키), 스냅, 선택, 명령 실행기.
// 명령은 제너레이터로 쓰고, 요청(point/number/select/pick/kw/text)을 yield 한다.
window.ACAD = window.ACAD || {};
(function () {
  const G = ACAD.G;
  const OSNAP_KO = { END: "끝점", MID: "중간점", CEN: "중심", QUA: "사분점", INT: "교차점", PER: "직교", TAN: "접점", NEA: "근처점", INS: "삽입점" };
  const OVERRIDE = { END: "END", ENDP: "END", MID: "MID", CEN: "CEN", INT: "INT", PER: "PER", TAN: "TAN", QUA: "QUA", NEA: "NEA", INS: "INS", NON: "NON", NONE: "NON" };
  const TOGGLE_KO = { grid: "그리드", snap: "스냅", ortho: "직교", polar: "극좌표", osnap: "객체 스냅", otrack: "객체 스냅 추적", dyn: "동적 입력" };
  const ISO_KO = ["좌측", "상단", "우측"];
  const ISO_AXES = [[90, 150], [30, 150], [30, 90]]; // 등각평면별 축 각도
  const COL = {
    bg: "#000000", grid: "#666666", gridMajor: "#858585", cross: "#ffffff",
    sel: "#4eb3e9", grip: "#1d91d0", hot: "#f2520a", snap: "#ffff00", track: "#2ad0a9",
    win: "rgba(29,145,208,0.22)", winLine: "#4eb3e9", cross2: "rgba(42,208,169,0.20)", crossLine: "#2ad0a9",
    annot: "#4eb3e9", mark: "#f2520a", tipBg: "#e8e8e8", tipText: "#000000",
  };
  const APERTURE = 12, PICKBOX = 6;

  class Engine {
    constructor(root, opts = {}) {
      this.root = root;
      this.opts = opts;
      this.doc = new ACAD.CadDoc();
      this.t = {
        grid: true, snap: false, ortho: false, polar: false, osnap: true, otrack: false, dyn: true,
        iso: opts.mode === "iso", isoplane: 1, polarInc: 90, snapUnit: 10, gridUnit: 10, ltscale: 1,
        modes: new Set(["END", "MID", "CEN", "INT", "QUA"]),
      };
      this.view = { cx: 0, cy: 0, s: 1 };
      this.viewStack = [];
      this.sel = new Set();
      this.prevSel = [];
      this.hover = null;
      this.cmd = null;
      this.req = null;
      this.lastCmd = null;
      this.history = [];
      this.inputs = [];
      this.events = {};
      this.annots = [];
      this.marks = [];
      this.acquired = [];
      this.lastPoint = { x: 0, y: 0 };
      this.mouse = { sx: -1, sy: -1, inside: false, w: { x: 0, y: 0 } };
      this.cur = { pt: { x: 0, y: 0 }, snap: null, track: [], tip: null };
      this.listeners = {};
      this.inHist = -1;
      this._ver = -1;
      this._flat = null;
      this.buildDom();
      this.bind();
      this.resize();
      this.zoomLimits();
      this.idlePrompt();
      this.api = this.makeApi();
    }

    // ---------- 이벤트 ----------
    on(type, fn) { (this.listeners[type] ||= []).push(fn); }
    emit(type, data) { (this.listeners[type] || []).forEach((fn) => { try { fn(data); } catch (e) { console.error(e); } }); }
    event(name, n = 1) { this.events[name] = (this.events[name] || 0) + n; this.emit("event", { name }); }

    // ---------- DOM ----------
    buildDom() {
      const r = this.root;
      r.classList.add("cad-engine");
      r.innerHTML = `
        <div class="cad-stage">
          <canvas class="cad-canvas" aria-label="AutoCAD 모형 공간 연습 캔버스"></canvas>
          <div class="cad-dyn" hidden></div>
          <div class="cad-zoom" role="group" aria-label="화면 이동">
            <button type="button" data-z="in" title="확대(휠 위로)">+</button>
            <button type="button" data-z="out" title="축소(휠 아래로)">−</button>
            <button type="button" data-z="ext" title="줌 범위(Z Enter E Enter, 휠 더블클릭)">범위</button>
          </div>
        </div>
        <div class="cad-cmdline">
          <div class="cad-hist" aria-live="polite"></div>
          <div class="cad-row">
            <span class="cad-caret">&gt;_</span>
            <span class="cad-prompt"></span>
            <input class="cad-input" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="명령 입력">
            <button type="button" class="cad-enter" title="Enter">입력</button>
          </div>
        </div>
        <div class="cad-status">
          <span class="cad-coords"></span>
          <span class="cad-toggles">
            <button type="button" data-t="grid" title="그리드 F7">그리드<kbd>F7</kbd></button>
            <button type="button" data-t="snap" title="스냅 F9">스냅<kbd>F9</kbd></button>
            <button type="button" data-t="ortho" title="직교 F8">직교<kbd>F8</kbd></button>
            <button type="button" data-t="polar" title="극좌표 추적 F10">극좌표<kbd>F10</kbd></button>
            <select class="cad-polarang" title="극좌표 증분 각도" aria-label="극좌표 증분 각도">
              <option value="90">90°</option><option value="45">45°</option><option value="30">30°</option><option value="15">15°</option>
            </select>
            <button type="button" data-t="osnap" title="객체 스냅 F3">객체스냅<kbd>F3</kbd></button>
            <button type="button" class="cad-osnap-set" title="객체 스냅 설정(OS)" aria-label="객체 스냅 설정">▾</button>
            <button type="button" data-t="otrack" title="객체 스냅 추적 F11">추적<kbd>F11</kbd></button>
            <button type="button" data-t="dyn" title="동적 입력 F12">동적입력<kbd>F12</kbd></button>
            <button type="button" data-t="iso" title="등각 모드(ISODRAFT)">등각<kbd>F5</kbd></button>
          </span>
        </div>
        <div class="cad-osnap-panel" hidden>
          <b>객체 스냅 모드 <span class="muted small">(OSNAP)</span></b>
          ${Object.entries(OSNAP_KO).filter(([k]) => k !== "INS").map(([k, v]) => `<label><input type="checkbox" value="${k}"> ${v} <span class="mono tiny">${k}</span></label>`).join("")}
          <button type="button" class="btn small cad-osnap-close">닫기</button>
        </div>`;
      this.stage = r.querySelector(".cad-stage");
      this.canvas = r.querySelector(".cad-canvas");
      this.ctx2 = this.canvas.getContext("2d");
      this.dynEl = r.querySelector(".cad-dyn");
      this.histEl = r.querySelector(".cad-hist");
      this.promptEl = r.querySelector(".cad-prompt");
      this.input = r.querySelector(".cad-input");
      this.coordsEl = r.querySelector(".cad-coords");
      this.osnapPanel = r.querySelector(".cad-osnap-panel");
      this.syncStatus();
    }

    bind() {
      const c = this.canvas;
      const L = (this._L = {});
      L.down = (e) => this.onDown(e);
      L.move = (e) => this.onMove(e);
      L.up = (e) => this.onUp(e);
      L.wheel = (e) => this.onWheel(e);
      L.ctx = (e) => { e.preventDefault(); this.onRight(); };
      L.leave = () => { this.mouse.inside = false; this.dynEl.hidden = true; this.requestRender(); };
      L.key = (e) => this.onKey(e);
      L.inputEv = () => this.updateDyn();
      L.resize = () => this.resize();
      c.addEventListener("pointerdown", L.down);
      c.addEventListener("pointermove", L.move);
      c.addEventListener("pointerup", L.up);
      c.addEventListener("wheel", L.wheel, { passive: false });
      c.addEventListener("contextmenu", L.ctx);
      c.addEventListener("pointerleave", L.leave);
      document.addEventListener("keydown", L.key);
      this.input.addEventListener("input", L.inputEv);
      this.ro = new ResizeObserver(L.resize);
      this.ro.observe(this.stage);
      this.root.querySelector(".cad-zoom").addEventListener("click", (e) => {
        const z = e.target.closest("button")?.dataset.z;
        if (z === "in") this.zoomAt(this.W / 2, this.H / 2, 1.5, true);
        if (z === "out") this.zoomAt(this.W / 2, this.H / 2, 1 / 1.5, true);
        if (z === "ext") { this.zoomExtents(); this.event("zoomE"); }
      });
      this.root.querySelector(".cad-enter").addEventListener("click", () => { this.submitText(this.input.value); this.input.value = ""; this.updateDyn(); });
      this.root.querySelector(".cad-toggles").addEventListener("click", (e) => {
        const b = e.target.closest("button[data-t]");
        if (!b) return;
        if (b.dataset.t === "iso") this.setIso(!this.t.iso);
        else this.toggle(b.dataset.t);
      });
      const pa = this.root.querySelector(".cad-polarang");
      pa.addEventListener("change", () => { this.t.polarInc = +pa.value; this.print(`극좌표 증분 각도 = ${pa.value}°`); if (!this.t.polar) this.toggle("polar"); this.emit("toggle", {}); });
      this.root.querySelector(".cad-osnap-set").addEventListener("click", () => this.showOsnapPanel(this.osnapPanel.hidden));
      this.osnapPanel.addEventListener("change", (e) => {
        const cb = e.target;
        if (cb.checked) this.t.modes.add(cb.value); else this.t.modes.delete(cb.value);
        this.event("osnapModes");
        this.emit("toggle", {});
      });
      this.osnapPanel.querySelector(".cad-osnap-close").addEventListener("click", () => this.showOsnapPanel(false));
      this.promptEl.addEventListener("click", (e) => {
        const b = e.target.closest("[data-kw]");
        if (b) { this.submitText(b.dataset.kw); this.input.focus(); }
      });
    }

    destroy() {
      const c = this.canvas, L = this._L;
      c.removeEventListener("pointerdown", L.down);
      c.removeEventListener("pointermove", L.move);
      c.removeEventListener("pointerup", L.up);
      c.removeEventListener("wheel", L.wheel);
      c.removeEventListener("contextmenu", L.ctx);
      c.removeEventListener("pointerleave", L.leave);
      document.removeEventListener("keydown", L.key);
      this.ro.disconnect();
      if (this._raf) cancelAnimationFrame(this._raf);
      if (this._annTimer) clearTimeout(this._annTimer);
      this.destroyed = true;
      this.listeners = {};
    }

    showOsnapPanel(show) {
      this.osnapPanel.hidden = !show;
      if (show) this.osnapPanel.querySelectorAll("input").forEach((cb) => { cb.checked = this.t.modes.has(cb.value); });
    }

    resize() {
      const r = this.stage.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const W = Math.max(50, Math.round(r.width)), H = Math.max(50, Math.round(r.height));
      const first = !this.W;
      const oldW = this.W, oldH = this.H;
      this.W = W; this.H = H; this.dpr = dpr;
      this.canvas.width = W * dpr; this.canvas.height = H * dpr;
      this.canvas.style.width = W + "px"; this.canvas.style.height = H + "px";
      if (!first && oldW && oldH) { /* 중심 유지 */ }
      this.requestRender();
    }

    // ---------- 좌표 ----------
    w2s(p) { return { x: (p.x - this.view.cx) * this.view.s + this.W / 2, y: this.H / 2 - (p.y - this.view.cy) * this.view.s }; }
    s2w(x, y) { return { x: (x - this.W / 2) / this.view.s + this.view.cx, y: (this.H / 2 - y) / this.view.s + this.view.cy }; }
    pushView() { this.viewStack.push({ ...this.view }); if (this.viewStack.length > 20) this.viewStack.shift(); }
    zoomAt(sx, sy, f, push) {
      if (push) this.pushView();
      const w = this.s2w(sx, sy);
      this.view.s = Math.min(1e6, Math.max(1e-5, this.view.s * f));
      this.view.cx = w.x - (sx - this.W / 2) / this.view.s;
      this.view.cy = w.y + (sy - this.H / 2) / this.view.s;
      this.recompute();
    }
    zoomBox(bb, margin = 0.1, push = true) {
      if (!bb) return;
      if (push) this.pushView();
      const w = Math.max(bb.x1 - bb.x0, 1e-6), h = Math.max(bb.y1 - bb.y0, 1e-6);
      let s = Math.min(this.W / w, this.H / h) * (1 - margin);
      if (!isFinite(s) || s <= 0) s = 1;
      if (bb.x1 - bb.x0 < 1e-6 && bb.y1 - bb.y0 < 1e-6) s = this.view.s;
      this.view = { cx: (bb.x0 + bb.x1) / 2, cy: (bb.y0 + bb.y1) / 2, s };
      this.recompute();
    }
    zoomExtents() { this.zoomBox(this.doc.extents() || this.doc.limits, 0.1); }
    zoomLimits() { this.zoomBox(this.doc.limits, 0.06, false); }
    zoomPrev() { const v = this.viewStack.pop(); if (v) { this.view = v; this.recompute(); return true; } return false; }

    // ---------- 도면 ----------
    flat() {
      if (!this._flat || this._flat.ver !== this.doc.version) this._flat = { ver: this.doc.version, list: this.doc.flat().filter((e) => this.doc.visible(e)) };
      return this._flat.list;
    }
    setDoc(doc) { this.doc = doc; this.api.doc = doc; this.sel.clear(); this.changed(true); this.requestRender(); }

    // ---------- 출력 ----------
    print(msg, cls = "") {
      String(msg).split("\n").forEach((line) => {
        const d = document.createElement("div");
        d.className = "cad-hl " + cls;
        d.textContent = line;
        this.histEl.appendChild(d);
      });
      while (this.histEl.childElementCount > 300) this.histEl.firstElementChild.remove();
      this.histEl.scrollTop = this.histEl.scrollHeight;
    }
    setPrompt(text) {
      this.promptText = text;
      const esc = ACAD.esc(text);
      const html = esc.replace(/\[([^\]]+)\]/, (m, inner) => "[" + inner.split("/").map((opt) => {
        const k = opt.match(/\(([A-Za-z0-9]+)\)\s*$/);
        return k ? `<button type="button" class="cad-kw" data-kw="${k[1]}">${opt}</button>` : opt;
      }).join("/") + "]");
      this.promptEl.innerHTML = html;
      this.emit("prompt", { text, cmd: this.cmd && this.cmd.name, req: this.req });
      this.updateDyn();
    }
    idlePrompt() { this.setPrompt("명령:"); }
    toast(msg) { this.emit("toast", msg); }

    // ---------- 토글 ----------
    toggle(key, val) {
      const nv = val == null ? !this.t[key] : !!val;
      this.t[key] = nv;
      if (key === "ortho" && nv && this.t.polar) { this.t.polar = false; }
      if (key === "polar" && nv && this.t.ortho) { this.t.ortho = false; }
      this.print(`<${TOGGLE_KO[key]} ${nv ? "켜기" : "끄기"}>`, "sys");
      this.event(`toggle:${key}:${nv ? "on" : "off"}`);
      this.syncStatus();
      this.recompute();
      this.emit("toggle", { key, on: nv });
    }
    setIso(on) {
      this.t.iso = on;
      this.print(on ? `등각 모드(ISODRAFT) 켜기 · <등각평면 ${ISO_KO[this.t.isoplane]}>` : "등각 모드 끄기 · 직교 스냅으로 돌아감", "sys");
      this.event(`toggle:iso:${on ? "on" : "off"}`);
      this.syncStatus();
      this.recompute();
      this.emit("toggle", { key: "iso", on });
    }
    cycleIso() {
      if (!this.t.iso) { this.print("F5 등각평면 전환은 등각 모드(ISODRAFT)에서 씁니다.", "sys"); return; }
      this.t.isoplane = (this.t.isoplane + 1) % 3;
      this.print(`<등각평면 ${ISO_KO[this.t.isoplane]}>`, "sys");
      this.event("isoplane");
      this.syncStatus();
      this.recompute();
      this.emit("toggle", { key: "isoplane" });
    }
    syncStatus() {
      this.root.querySelectorAll(".cad-toggles button[data-t]").forEach((b) => {
        const k = b.dataset.t;
        b.setAttribute("aria-pressed", String(!!this.t[k]));
        if (k === "iso") b.innerHTML = this.t.iso ? `등각 ${ISO_KO[this.t.isoplane]}<kbd>F5</kbd>` : `등각<kbd>F5</kbd>`;
      });
      const pa = this.root.querySelector(".cad-polarang");
      if (pa) pa.value = String(this.t.polarInc);
    }

    // ---------- 키보드 ----------
    onKey(e) {
      if (this.destroyed || !this.root.isConnected) return;
      const tgt = e.target;
      const ours = tgt === this.input;
      if (!ours && tgt && tgt.matches && tgt.matches("input, textarea, select, [contenteditable]")) return;
      const k = e.key;
      if (/^F\d{1,2}$/.test(k)) {
        const map = { F2: "hist", F3: "osnap", F5: "iso", F7: "grid", F8: "ortho", F9: "snap", F10: "polar", F11: "otrack", F12: "dyn", F1: "help" };
        const act = map[k];
        if (!act) return;
        e.preventDefault();
        if (act === "hist") this.root.classList.toggle("cad-hist-open");
        else if (act === "iso") this.cycleIso();
        else if (act === "help") this.emit("help");
        else this.toggle(act);
        return;
      }
      if (e.ctrlKey || e.metaKey) {
        const kk = k.toLowerCase();
        if (kk === "z") { e.preventDefault(); this.runCommand("U", "key"); }
        else if (kk === "y") { e.preventDefault(); this.runCommand("REDO", "key"); }
        else if (kk === "a" && !this.input.value) {
          e.preventDefault();
          if (!this.cmd || (this.req && this.req.type === "select")) { this.flatSelectable().forEach((x) => this.sel.add(x.id)); this.selChanged(); this.print(`${this.sel.size}개를 찾음`); }
        }
        return;
      }
      if (e.altKey) return;
      if (k === "Escape") { e.preventDefault(); this.input.value = ""; this.inHist = -1; this.escape(); this.updateDyn(); return; }
      const textMode = this.req && this.req.type === "text";
      if (k === "Enter" || (k === " " && !textMode)) {
        e.preventDefault();
        this.submitText(this.input.value);
        this.input.value = "";
        this.updateDyn();
        return;
      }
      if ((k === "Delete") && !this.input.value) {
        e.preventDefault();
        if (!this.cmd && this.sel.size) this.runCommand("ERASE", "key");
        return;
      }
      if ((k === "ArrowUp" || k === "ArrowDown") && (ours || !this.input.value)) {
        const cmds = this.history.map((h) => h.raw).filter(Boolean);
        if (!cmds.length) return;
        e.preventDefault();
        if (this.inHist < 0) this.inHist = cmds.length;
        this.inHist = Math.max(0, Math.min(cmds.length - 1, this.inHist + (k === "ArrowUp" ? -1 : 1)));
        this.input.value = cmds[this.inHist] || "";
        return;
      }
      if (k === "Tab" && !this.cmd && this.input.value) {
        e.preventDefault();
        const s = this.suggest(this.input.value)[0];
        if (s) this.input.value = s.alias[0] || s.name;
        this.updateDyn();
        return;
      }
      if (!ours && k.length === 1) {
        e.preventDefault();
        this.input.value += k;
        this.input.focus({ preventScroll: true });
        this.updateDyn();
      }
    }

    escape() {
      if (this.gripHot && !this.cmd) { this.gripHot = null; }
      if (this.cmd) { this.cancelCommand(); return; }
      if (this.win) { this.win = null; this.requestRender(); return; }
      if (this.sel.size) { this.sel.clear(); this.selChanged(); }
      this.print("*취소*", "sys");
      this.event("escIdle");
    }

    // ---------- 명령 실행 ----------
    suggest(txt) {
      const t = txt.trim().toUpperCase().replace(/^[_.'-]+/, "");
      if (!t) return [];
      const list = ACAD.CadCommands.list().filter((d) => !d.hidden);
      const scored = [];
      for (const d of list) {
        if (d.alias.some((a) => a === t) || d.name === t) scored.push([0, d]);
        else if (d.alias.some((a) => a.startsWith(t))) scored.push([1, d]);
        else if (d.name.startsWith(t)) scored.push([2, d]);
      }
      return scored.sort((a, b) => a[0] - b[0] || a[1].name.length - b[1].name.length).map((x) => x[1]).slice(0, 6);
    }
    runCommand(name, via = "full", raw = "") {
      const def = ACAD.CadCommands.get(name);
      if (!def) return false;
      if (this.cmd) {
        if (def.transparent && this.req) { def.transparent(this); return true; }
        this.cancelCommand(true);
      }
      this.gripHot = null;
      this.win = null;
      this.inHist = -1;
      this.cmd = { def, name: def.name, gen: def.run(this.api, this), before: this.doc.snapshot(), ver: this.doc.version, via, created: [], pfUsed: false };
      this.history.push({ name: def.name, via, raw, t: Date.now() });
      if (!def.noRepeat) this.lastCmd = def.name;
      this.print(`명령: ${raw || def.name}`, "cmd");
      this.emit("command", { name: def.name, via, raw });
      this.resolve(undefined);
      return true;
    }
    resolve(result) {
      if (!this.cmd) return;
      const c = this.cmd;
      let r;
      try { r = c.gen.next(result); }
      catch (err) { console.error(err); this.print("오류: " + err.message, "err"); if (this.cmd === c) this.endCommand(false); return; }
      if (this.cmd !== c) return;
      if (r.done) { this.endCommand(true); return; }
      this.setRequest(r.value);
      this.changed();
    }
    setRequest(req) {
      this.req = req;
      this.numFirst = null;
      this.preview = null;
      if (req.type === "select") {
        if (req.pickfirst !== false && !this.cmd.pfUsed && this.sel.size) {
          this.cmd.pfUsed = true;
          const ids = [...this.sel].filter((id) => { const e = this.doc.get(id); return e && !this.doc.locked(e) && (!req.filter || req.filter(e)); });
          this.sel.clear();
          if (ids.length) { this.print(`${ids.length}개를 찾음 (먼저 선택한 객체)`); this.prevSel = ids; return this.resolve({ ids }); }
        }
        this.cmd.pfUsed = true;
        this.sel.clear();
        this.selMode = null; this.selRemove = false; this.fence = null;
      }
      this.setPrompt(req.prompt);
      this.recompute();
    }
    endCommand() {
      const c = this.cmd;
      if (!c) return;
      this.cmd = null; this.req = null;
      this.override = null; this.from = null; this.m2p = null; this.tt = false; this.fence = null; this.selMode = null; this.selRemove = false;
      this.acquired = []; this.preview = null; this.numFirst = null; this.win = null;
      if (!c.def.noUndo && this.doc.version !== c.ver) this.doc.pushUndo(c.before, c.name);
      if (!c.def.keepSel) this.sel.clear();
      this.idlePrompt();
      this.emit("commandEnd", { name: c.name, created: c.created, via: c.via });
      this.changed();
      this.selChanged();
      this.recompute();
    }
    cancelCommand(silent) {
      if (!this.cmd) return;
      const c = this.cmd;
      try { c.gen.return(); } catch (e) { /* 무시 */ }
      if (!silent) this.print("*취소*", "sys");
      this.event("cancel");
      if (this.cmd === c) this.endCommand(false);
    }
    changed(force) {
      if (force || this.doc.version !== this._ver) {
        this._ver = this.doc.version;
        this.emit("change", { doc: this.doc });
        this.requestRender();
      }
    }
    selChanged() { this.emit("selection", { ids: [...this.sel] }); this.requestRender(); }

    makeApi() {
      const eng = this;
      return {
        eng, doc: this.doc,
        point: (prompt, o = {}) => ({ type: "point", prompt, ...o }),
        number: (prompt, o = {}) => ({ type: "number", prompt, ...o }),
        select: (prompt = "객체 선택:", o = {}) => ({ type: "select", prompt, ...o }),
        pick: (prompt, o = {}) => ({ type: "pick", prompt, ...o }),
        kw: (prompt, o = {}) => ({ type: "kw", prompt, ...o }),
        text: (prompt, o = {}) => ({ type: "text", prompt, ...o }),
        print: (m, c) => eng.print(m, c),
        add: (e) => { const x = eng.doc.add(e); if (eng.cmd) eng.cmd.created.push(x.id); eng.lastCreated = x.id; return x; },
        replace: (id, e) => { const x = eng.doc.replace(id, e); if (x && eng.cmd) eng.cmd.created.push(id); return x; },
        remove: (id) => eng.doc.remove(id),
        get: (id) => eng.doc.get(id),
        event: (n) => eng.event(n),
      };
    }

    // ---------- 명령창 입력 해석 ----------
    submitText(raw) {
      const txt = String(raw ?? "");
      const t = txt.trim();
      if (this.destroyed) return;
      if (!this.cmd) {
        if (!t) {
          if (this.lastCmd) this.runCommand(this.lastCmd, "repeat", "");
          return;
        }
        const tok = t.toUpperCase().replace(/^[_.'-]+/, "");
        const def = ACAD.CadCommands.find(tok);
        if (def) {
          const via = def.name === tok ? (def.alias.length ? "full" : "alias") : "alias";
          this.runCommand(def.name, via, t);
        } else {
          this.print(`명령: ${t}`, "cmd");
          const sug = this.suggest(t)[0] || ACAD.CadCommands.closest(tok);
          this.print(`알 수 없는 명령 "${t}"입니다.${sug ? ` 혹시 ${sug.name}${sug.alias[0] ? ` (${sug.alias[0]})` : ""} 명령인가요?` : " F1 또는 단축키 표를 참고하세요."}`, "err");
          this.event("unknown");
          this.emit("unknown", { text: t, suggestion: sug && sug.name });
        }
        return;
      }
      const req = this.req;
      if (!req) return;
      this.print(`${this.promptText} ${t}`, "echo");
      if (t) this.inputs.push(t);
      if (this.history.length) this.history[this.history.length - 1].raw ||= "";
      const U = t.toUpperCase();

      // 투명 명령('Z 등)
      if (/^'/.test(t)) {
        const def = ACAD.CadCommands.find(U.slice(1));
        if (def && def.transparent) { def.transparent(this, U.slice(1)); return; }
      }
      // 객체 스냅 재지정·특수 기능
      if ((req.type === "point" || req.type === "number") && t) {
        if (OVERRIDE[U]) {
          this.override = OVERRIDE[U];
          this.print(OVERRIDE[U] === "NON" ? "객체 스냅 없음(한 번)" : `${OSNAP_KO[OVERRIDE[U]]}(${U}) 한 번 사용 — 대상에 커서를 가져가세요`, "sys");
          this.event("override:" + OVERRIDE[U]);
          this.recompute();
          return;
        }
        if (U === "FROM" || U === "FRO") { this.from = { stage: "base" }; this.event("from"); this.setPrompt("기준점:"); return; }
        if (U === "M2P" || U === "MTP") { this.m2p = { stage: 1 }; this.event("m2p"); this.setPrompt("중간점의 첫 번째 점:"); return; }
        if (U === "TT" || U === "TK") { this.tt = true; this.event("tt"); this.setPrompt("임시 OTRACK 점 지정:"); return; }
      }

      switch (req.type) {
        case "point": {
          if (!t) { this.resolve({ enter: true }); return; }
          const kw = this.matchKw(req, U);
          if (kw) { this.resolve({ kw }); return; }
          const pt = this.parseCoord(t);
          if (pt) { this.feedPoint(pt, "typed"); return; }
          if (/^[-+]?\d*\.?\d+(e[-+]?\d+)?$/i.test(t)) {
            const base = this.effectiveBase();
            if (req.acceptNumber) { this.resolve({ value: parseFloat(t) }); return; }
            if (base) {
              let dir = G.sub(this.cur.pt, base);
              if (G.len(dir) < 1e-9) { this.print("커서를 원하는 방향으로 먼저 가져간 뒤 거리를 입력하세요.", "err"); return; }
              dir = G.unit(dir);
              this.event("direct");
              this.feedPoint(G.add(base, G.mul(dir, parseFloat(t))), "direct");
              return;
            }
          }
          if (req.acceptRaw) { this.resolve({ raw: t }); return; }
          this.print("점이 잘못되었거나 옵션 키워드가 필요합니다.", "err");
          this.setPrompt(req.prompt);
          return;
        }
        case "number": {
          if (!t) { this.resolve({ enter: true, value: req.def }); return; }
          const kw = this.matchKw(req, U);
          if (kw) { this.resolve({ kw }); return; }
          if (/^[-+]?\d*\.?\d+(e[-+]?\d+)?$/i.test(t)) { this.resolve({ value: parseFloat(t) }); return; }
          const pt = this.parseCoord(t);
          if (pt) { this.numberFromPoint(pt); return; }
          this.print("숫자, 두 점 또는 옵션 키워드가 필요합니다.", "err");
          this.setPrompt(req.prompt);
          return;
        }
        case "select": this.selectText(U); return;
        case "pick": {
          if (!t) { this.resolve({ enter: true }); return; }
          const kw = this.matchKw(req, U);
          if (kw) { this.resolve({ kw }); return; }
          this.print("객체를 클릭해 선택하거나 옵션을 입력하세요.", "err");
          this.setPrompt(req.prompt);
          return;
        }
        case "kw": {
          if (!t) { if (req.def) this.resolve({ kw: req.def }); else this.resolve({ enter: true }); return; }
          const kw = this.matchKw(req, U);
          if (kw) { this.resolve({ kw }); return; }
          if (req.acceptText) { this.resolve({ text: t }); return; }
          this.print("옵션 키워드가 필요합니다.", "err");
          this.setPrompt(req.prompt);
          return;
        }
        case "text": this.resolve({ text: txt.replace(/^\s+/, "") }); return;
      }
    }
    kwsOf(req) {
      if (req.kws) return req.kws;
      const m = req.prompt.match(/\[([^\]]+)\]/);
      if (!m) return [];
      return m[1].split("/").map((o) => (o.match(/\(([A-Za-z0-9]+)\)\s*$/) || [])[1]).filter(Boolean).map((k) => k.toUpperCase());
    }
    matchKw(req, U) {
      const kws = this.kwsOf(req);
      if (!U) return null;
      if (kws.includes(U)) return U;
      const pre = kws.filter((k) => k.startsWith(U));
      if (pre.length === 1 && U.length >= 1) return pre[0];
      return null;
    }
    parseCoord(t) {
      let s = t.replace(/\s+/g, "");
      let abs = false;
      if (/^[#*]/.test(s)) { abs = true; s = s.slice(1); }
      const num = "[-+]?\\d*\\.?\\d+(?:e[-+]?\\d+)?";
      const base = this.effectiveBase() || this.lastPoint;
      if (s.startsWith("@") && !abs) {
        const r = s.slice(1);
        if (!r) return { ...base };
        let m = r.match(new RegExp(`^(${num})<(${num})$`, "i"));
        if (m) { this.event("coord:relpolar"); return G.polar(base, G.rad(+m[2]), +m[1]); }
        m = r.match(new RegExp(`^(${num}),(${num})(?:,${num})?$`, "i"));
        if (m) { this.event("coord:rel"); return { x: base.x + +m[1], y: base.y + +m[2] }; }
        return null;
      }
      let m = s.match(new RegExp(`^(${num})<(${num})$`, "i"));
      if (m) { this.event("coord:abspolar"); return G.polar({ x: 0, y: 0 }, G.rad(+m[2]), +m[1]); }
      m = s.match(new RegExp(`^(${num}),(${num})(?:,${num})?$`, "i"));
      if (m) { this.event("coord:abs"); return { x: +m[1], y: +m[2] }; }
      return null;
    }
    effectiveBase() {
      if (this.from && this.from.stage === "offset") return this.from.base;
      if (this.m2p && this.m2p.first) return null;
      if (this.req && this.req.base) return this.req.base;
      if (this.numFirst) return this.numFirst;
      return null;
    }
    // 점 하나가 확정됐을 때(클릭·입력). FROM·M2P·TT 처리 후 명령에 넘긴다.
    feedPoint(pt, source) {
      if (this.tt) {
        this.tt = false;
        this.acquired.push({ pt, kind: "TT" });
        this.print(`임시 추적점 ${G.fmtPt(pt)} — 이 점의 수평·수직 추적선을 따라 커서를 움직이세요`, "sys");
        this.setPrompt(this.req.prompt);
        this.recompute();
        return;
      }
      if (this.from) {
        if (this.from.stage === "base") {
          this.from = { stage: "offset", base: pt };
          this.setPrompt("<간격띄우기>:");
          this.recompute();
          return;
        }
        this.from = null;
      }
      if (this.m2p) {
        if (!this.m2p.first) { this.m2p.first = pt; this.setPrompt("중간점의 두 번째 점:"); this.recompute(); return; }
        pt = G.mid(this.m2p.first, pt);
        this.m2p = null;
      }
      this.override = null;
      if (this.req.type === "number") { this.numberFromPoint(pt); return; }
      this.lastPoint = pt;
      this.resolve({ pt, source });
    }
    numberFromPoint(pt) {
      const req = this.req;
      const base = req.base || this.numFirst;
      if (!base) { this.numFirst = pt; this.lastPoint = pt; this.setPrompt("두 번째 점 지정:"); this.recompute(); return; }
      this.numFirst = null;
      this.lastPoint = pt;
      const v = req.angle ? G.deg(G.ang(base, pt)) : G.dist(base, pt);
      this.resolve({ value: v, pt });
    }

    // ---------- 선택 ----------
    flatSelectable() { return this.doc.ents.filter((e) => this.doc.visible(e) && !this.doc.locked(e) && (!this.req || !this.req.filter || this.req.filter(e))); }
    selectText(U) {
      if (!U) {
        if (this.fence) { this.applyFence(); return; }
        const ids = [...this.sel];
        this.prevSel = ids;
        this.sel.clear();
        this.resolve({ ids });
        return;
      }
      const all = this.flatSelectable();
      const addIds = (ids, how) => {
        let n = 0;
        for (const id of ids) { if (this.selRemove) { if (this.sel.delete(id)) n++; } else if (!this.sel.has(id)) { this.sel.add(id); n++; } }
        this.print(`${ids.length}개를 찾음${how ? " (" + how + ")" : ""}${this.selRemove ? `, ${n}개 제거됨` : ""}, 총 ${this.sel.size}개`);
        this.selChanged();
      };
      switch (U) {
        case "ALL": addIds(all.map((e) => e.id), "전체"); this.event("sel:all"); break;
        case "L": { const last = [...this.doc.ents].reverse().find((e) => all.includes(e)); addIds(last ? [last.id] : [], "마지막"); break; }
        case "P": addIds(this.prevSel.filter((id) => this.doc.get(id)), "이전"); this.event("sel:prev"); break;
        case "R": this.selRemove = true; this.event("sel:remove"); this.setPrompt("객체 제거:"); return;
        case "A": this.selRemove = false; this.setPrompt(this.req.prompt); return;
        case "W": case "C": case "WP": case "CP": this.selMode = U[0]; this.setPrompt("첫 번째 구석 지정:"); this.event("sel:" + U); return;
        case "F": this.fence = []; this.event("sel:fence"); this.setPrompt("첫 번째 울타리 점 지정:"); return;
        case "U": return;
        default: this.print("*유효하지 않은 선택* 다음 중 하나가 필요합니다: 점 또는 윈도우(W)/걸치기(C)/울타리(F)/전체(ALL)/최종(L)/이전(P)/제거(R)/추가(A)", "err"); return;
      }
      this.setPrompt(this.selRemove ? "객체 제거:" : this.req.prompt);
    }
    applyFence() {
      const f = this.fence;
      this.fence = null;
      if (f.length >= 2) {
        const ids = this.flatSelectable().filter((e) => G.entCrossFence(e, f)).map((e) => e.id);
        ids.forEach((id) => (this.selRemove ? this.sel.delete(id) : this.sel.add(id)));
        this.print(`${ids.length}개를 찾음 (울타리), 총 ${this.sel.size}개`);
        this.event("fenceSel");
        this.selChanged();
      }
      this.setPrompt(this.req.prompt);
    }
    hitTest(sx, sy, filter) {
      const p = this.s2w(sx, sy);
      const tol = PICKBOX / this.view.s;
      let best = null, bd = Infinity;
      for (const e of this.doc.ents) {
        if (!this.doc.visible(e) || this.doc.locked(e)) continue;
        if (filter && !filter(e)) continue;
        const bb = G.bbox(e);
        if (!bb || p.x < bb.x0 - tol || p.x > bb.x1 + tol || p.y < bb.y0 - tol || p.y > bb.y1 + tol) continue;
        const d = G.hitDist(e, p);
        if (d <= tol && d <= bd + 1e-12) { bd = d; best = e; } // 같은 거리면 나중에 그린 객체
      }
      return best;
    }
    finishWindow(endS, shift) {
      const w = this.win;
      this.win = null;
      const a = w.start, b = this.s2w(endS.x, endS.y);
      const rect = G.rectOf(a, b);
      if (w.forPick) { this.event("crossingSel"); this.resolve({ rect, crossing: true }); return; }
      const crossing = this.selMode ? this.selMode === "C" : endS.x < w.sx;
      this.selMode = null;
      const list = this.flatSelectable();
      const ids = list.filter((e) => (crossing ? G.entCrossRect(e, rect) : G.entInRect(e, rect))).map((e) => e.id);
      const remove = shift || this.selRemove;
      ids.forEach((id) => (remove ? this.sel.delete(id) : this.sel.add(id)));
      this.lastWindow = { rect, crossing };
      if (this.req && this.req.trackWindows) (this.selWindows ||= []).push({ rect, crossing });
      this.event(crossing ? "crossingSel" : "windowSel");
      if (remove && ids.length) this.event("shiftRemove");
      this.print(`${crossing ? "걸치기" : "윈도우"} 선택: ${ids.length}개를 찾음${remove ? " (제거)" : ""}, 총 ${this.sel.size}개`);
      this.emit("window", { crossing, count: ids.length });
      this.selChanged();
      if (this.req && this.req.type === "select") this.setPrompt(this.selRemove ? "객체 제거:" : this.req.prompt);
    }

    // ---------- 마우스 ----------
    evPt(e) { const r = this.canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
    onDown(e) {
      const p = this.evPt(e);
      this.mouse.sx = p.x; this.mouse.sy = p.y; this.mouse.inside = true;
      this.mouse.w = this.s2w(p.x, p.y);
      if (e.button === 1 || (e.button === 0 && (e.altKey || (this.req && this.req.panMode)))) {
        e.preventDefault();
        const now = Date.now();
        if (e.button === 1 && this._lastMid && now - this._lastMid < 350) { this.zoomExtents(); this.event("zoomE"); this._lastMid = 0; return; }
        this._lastMid = now;
        this.pan = { sx: p.x, sy: p.y, cx: this.view.cx, cy: this.view.cy };
        this.canvas.setPointerCapture(e.pointerId);
        return;
      }
      if (e.button !== 0) return;
      this.canvas.setPointerCapture(e.pointerId);
      this.recompute();
      this.downAt = { x: p.x, y: p.y, shift: e.shiftKey };
      this.leftClick(p, e.shiftKey);
    }
    onMove(e) {
      const p = this.evPt(e);
      this.mouse.sx = p.x; this.mouse.sy = p.y; this.mouse.inside = true;
      if (this.pan) {
        this.view.cx = this.pan.cx - (p.x - this.pan.sx) / this.view.s;
        this.view.cy = this.pan.cy + (p.y - this.pan.sy) / this.view.s;
        this.event("pan");
      }
      this.mouse.w = this.s2w(p.x, p.y);
      this.recompute();
    }
    onUp(e) {
      const p = this.evPt(e);
      if (this.pan) { this.pan = null; return; }
      if (e.button !== 0) return;
      if (this.win && this.downAt && Math.hypot(p.x - this.downAt.x, p.y - this.downAt.y) > 6) this.finishWindow(p, this.downAt.shift);
      this.downAt = null;
    }
    onWheel(e) {
      e.preventDefault();
      const p = this.evPt(e);
      const f = Math.pow(1.0018, -e.deltaY);
      const now = Date.now();
      if (!this._lastWheel || now - this._lastWheel > 600) this.pushView();
      this._lastWheel = now;
      this.zoomAt(p.x, p.y, f, false);
      this.event("wheelZoom");
    }
    onRight() {
      if (this.win) { this.win = null; this.requestRender(); return; }
      this.event("rightClick");
      this.submitText("");
    }
    leftClick(p, shift) {
      const req = this.cmd ? this.req : null;
      if (req) {
        switch (req.type) {
          case "point": this.feedPoint(this.cur.pt, "click"); return;
          case "number": this.feedPoint(this.cur.pt, "click"); return;
          case "pick": {
            if (this.win) { this.finishWindow(p, shift); return; }
            const e = this.hitTest(p.x, p.y, req.filter);
            if (e) { this.lastPoint = this.s2w(p.x, p.y); this.resolve({ id: e.id, pt: this.s2w(p.x, p.y), shift }); }
            else if (req.windowFallback) { this.win = { start: this.s2w(p.x, p.y), sx: p.x, sy: p.y, forPick: true }; this.setPrompt("반대 구석 지정:"); }
            else this.print("선택된 객체가 없습니다. 객체 위(작은 사각형 안)를 클릭하세요.", "err");
            return;
          }
          case "select": this.selectClick(p, shift); return;
          default: return;
        }
      }
      // 명령이 없을 때: 그립 → 선택
      const g = shift ? null : this.gripAt(p);
      if (g) { this.startGrip(g); return; }
      this.selectClick(p, shift);
    }
    selectClick(p, shift) {
      if (this.fence) { this.fence.push(this.s2w(p.x, p.y)); this.setPrompt("다음 울타리 점 지정 또는 [명령 취소(U)]:"); this.requestRender(); return; }
      if (this.win) { this.finishWindow(p, shift); return; }
      const e = this.selMode ? null : this.hitTest(p.x, p.y, this.req && this.req.filter);
      if (e) {
        if (shift || this.selRemove) { if (this.sel.delete(e.id)) { this.event("shiftRemove"); this.print("1개 제거됨, 총 " + this.sel.size + "개"); } }
        else if (!this.sel.has(e.id)) { this.sel.add(e.id); if (this.req) this.print(`1개를 찾음, 총 ${this.sel.size}개`); }
        this.event("pickSel");
        this.selChanged();
        return;
      }
      this.win = { start: this.s2w(p.x, p.y), sx: p.x, sy: p.y };
      if (this.req && this.req.type === "select") this.setPrompt("반대 구석 지정:");
      this.requestRender();
    }

    // ---------- 그립 ----------
    gripsOf(e) {
      const g = [];
      const add = (pt, kind, extra) => g.push({ pt, kind, id: e.id, ...extra });
      switch (e.type) {
        case "line": add(e.a, "a"); add(e.b, "b"); add(G.mid(e.a, e.b), "mid"); break;
        case "circle": add(e.c, "move"); [0, 1, 2, 3].forEach((q) => add(G.polar(e.c, (q * Math.PI) / 2, e.r), "rad")); break;
        case "arc": add(e.c, "move"); add(G.polar(e.c, e.a0, e.r), "a0"); add(G.polar(e.c, e.a1, e.r), "a1"); break;
        case "pline": e.pts.forEach((p, i) => add(p, "v", { i })); break;
        case "ellipse": add(e.c, "move"); break;
        case "text": add(e.p, "move"); break;
        case "dim": add(e.dp, "dp"); break;
        case "array": { const b = G.M.apply(e.M || G.M.id(), e.base); add(b, "move"); break; }
      }
      return g;
    }
    gripAt(p) {
      if (!this.sel.size) return null;
      for (const id of this.sel) {
        const e = this.doc.get(id);
        if (!e) continue;
        for (const g of this.gripsOf(e)) { const s = this.w2s(g.pt); if (Math.abs(s.x - p.x) <= 6 && Math.abs(s.y - p.y) <= 6) return g; }
      }
      return null;
    }
    applyGrip(e, g, p) {
      const d = G.sub(p, g.pt);
      switch (g.kind) {
        case "a": return { ...G.clone(e), a: p };
        case "b": return { ...G.clone(e), b: p };
        case "mid": case "move": case "dp": return g.kind === "dp" ? { ...G.clone(e), dp: p } : G.xform(e, G.M.tr(d.x, d.y));
        case "rad": return { ...G.clone(e), r: Math.max(1e-6, G.dist(e.c, p)) };
        case "a0": return { ...G.clone(e), a0: G.ang(e.c, p) };
        case "a1": return { ...G.clone(e), a1: G.ang(e.c, p) };
        case "v": { const n = G.clone(e); n.pts[g.i] = { ...n.pts[g.i], x: p.x, y: p.y }; return n; }
      }
      return e;
    }
    startGrip(g) {
      const eng = this;
      this.gripHot = g;
      const def = {
        name: "GRIP", alias: [], noRepeat: true,
        *run(api) {
          const e = eng.doc.get(g.id);
          if (!e) return;
          const kindKo = g.kind === "move" || g.kind === "mid" ? "이동" : "신축";
          while (true) {
            const r = yield api.point(`** ${kindKo} ** ${kindKo}점 지정 또는 [기준점(B)/복사(C)/명령 취소(U)/종료(X)]:`, { base: g.pt, preview: (p) => [eng.applyGrip(e, g, p)] });
            if (r.pt) { api.replace(g.id, eng.applyGrip(e, g, r.pt)); api.event("grip"); break; }
            if (r.kw === "X" || r.enter) break;
          }
        },
      };
      this.cmd = { def, name: "GRIP", gen: def.run(this.api), before: this.doc.snapshot(), ver: this.doc.version, via: "grip", created: [], pfUsed: true };
      this.history.push({ name: "GRIP", via: "grip", t: Date.now() });
      this.resolve(undefined);
      this.gripHot = null;
      this._gripDef = g;
    }

    // ---------- 스냅 ----------
    recompute() {
      const req = this.cmd ? this.req : null;
      const raw = this.mouse.w;
      const res = { pt: raw, raw, snap: null, track: [], tip: null };
      const wantSnap = req && (req.type === "point" || req.type === "number");
      if (wantSnap && this.hover) { this.hover = null; }
      if (wantSnap && this.mouse.inside) {
        const base = this.effectiveBase();
        const ov = this.override;
        let done = false;
        if (ov !== "NON" && (this.t.osnap || ov)) {
          const s = this.findOsnap(raw, ov ? new Set([ov]) : this.t.modes, base);
          if (s) { res.pt = s.pt; res.snap = s; done = true; this.maybeAcquire(s); }
        }
        if (!done && (this.t.otrack || this.acquired.some((a) => a.kind === "TT")) && this.acquired.length) {
          const tr = this.trackAlign(raw, base);
          if (tr) { res.pt = tr.pt; res.track = tr.lines; res.tip = tr.tip; done = true; }
        }
        if (!done) {
          let pt = raw;
          if (this.t.snap) { pt = this.snapGrid(pt); res.grid = true; }
          if (base && this.t.ortho) { pt = this.orthoProject(base, pt); res.tip = `직교: ${G.fmt(G.dist(base, pt))}`; }
          else if (base && this.t.polar) {
            const pp = this.polarSnap(base, raw);
            if (pp) { pt = pp.pt; res.track = [pp.line]; res.tip = pp.tip; }
          }
          res.pt = pt;
        }
      } else if (!req || req.type === "select" || req.type === "pick") {
        // 명령이 없을 때는 미리 선택(하이라이트)
        const h = this.mouse.inside && !this.pan ? this.hitTest(this.mouse.sx, this.mouse.sy, req && req.filter) : null;
        const hid = h ? h.id : null;
        if (hid !== this.hover) { this.hover = hid; this.emit("hover", { id: hid }); }
      }
      this.cur = res;
      this.updateCoords();
      this.updateDyn();
      this.requestRender();
    }
    updateCoords() {
      const p = this.cur.pt;
      this.coordsEl.textContent = `${G.fmt(p.x, 4)}, ${G.fmt(p.y, 4)}, 0`;
    }
    findOsnap(raw, modes, base) {
      const s = this.view.s;
      const ap = APERTURE / s;
      const cands = [];
      const near = [];
      for (const e of this.flat()) {
        if (e.type === "dim") continue;
        const bb = G.bbox(e);
        if (!bb) continue;
        const pad = ap + (e.type === "circle" || e.type === "arc" ? e.r : 0);
        if (raw.x < bb.x0 - pad || raw.x > bb.x1 + pad || raw.y < bb.y0 - pad || raw.y > bb.y1 + pad) continue;
        near.push(e);
      }
      const push = (pt, kind, score, ent) => { if (modes.has(kind)) cands.push({ pt, kind, d: score ?? G.dist(pt, raw), ent }); };
      const segsNear = [];
      for (const e of near) {
        if (e.type === "text") { push(e.p, "INS", null, e); continue; }
        const segs = G.segs(e);
        let hd = Infinity;
        for (const g of segs) {
          const cl = G.segClosest(g, raw);
          if (cl.d < hd) hd = cl.d;
          if (cl.d <= ap) segsNear.push({ g, e });
          if (!g.approx) {
            if (g.k !== "C") { push(G.segStart(g), "END", null, e); push(G.segEnd(g), "END", null, e); push(G.segPoint(g, 0.5), "MID", null, e); }
            if (g.k !== "L") {
              if (cl.d <= ap) push(g.c, "CEN", cl.d + 2 / s, e);
              push(g.c, "CEN", null, e);
              for (let q = 0; q < 4; q++) { const a = (q * Math.PI) / 2; if (g.k === "C" || G.angIn(a, g.a0, g.sw)) push(G.polar(g.c, a, g.r), "QUA", null, e); }
            }
          }
          if (cl.d <= ap) push(cl.pt, "NEA", cl.d + 4 / s, e);
          if (base && cl.d <= ap) {
            if (g.k === "L") {
              const d = G.sub(g.b, g.a), L2 = G.dot(d, d);
              if (L2 > 0) { const t = G.dot(G.sub(base, g.a), d) / L2; push(G.lerp(g.a, g.b, t), "PER", G.dist(G.lerp(g.a, g.b, t), raw) <= ap ? cl.d + 1 / s : Infinity, e); }
            } else {
              const pp = G.polar(g.c, G.ang(g.c, base), g.r);
              push(pp, "PER", G.dist(pp, raw) <= ap ? G.dist(pp, raw) : Infinity, e);
              const dc = G.dist(base, g.c);
              if (dc > g.r) {
                const a = G.ang(g.c, base), b = Math.acos(g.r / dc);
                for (const sg of [1, -1]) {
                  const tp = G.polar(g.c, a + sg * b, g.r);
                  if (g.k === "C" || G.angIn(G.ang(g.c, tp), g.a0, g.sw)) push(tp, "TAN", G.dist(tp, raw) <= ap * 1.5 ? G.dist(tp, raw) : Infinity, e);
                }
              }
            }
          }
        }
        if (e.type === "ellipse") {
          push(e.c, "CEN", hd <= ap ? hd + 2 / s : null, e);
          for (let q = 0; q < 4; q++) push(G.ellipsePoint(e, (q * Math.PI) / 2), "QUA", null, e);
        }
      }
      if (modes.has("INT")) {
        for (let i = 0; i < segsNear.length; i++)
          for (let j = i + 1; j < segsNear.length; j++) {
            if (segsNear[i].e === segsNear[j].e && segsNear[i].e.type !== "pline") continue;
            const gi = segsNear[i].g, gj = segsNear[j].g;
            for (const x of G.intersect(gi, gj)) {
              // 꼭짓점에서 만나는 경우는 끝점이 대신한다
              if ([gi, gj].some((g) => g.k !== "C" && (G.eq(x, G.segStart(g), 1e-9) || G.eq(x, G.segEnd(g), 1e-9)))) continue;
              push(x, "INT", null, segsNear[i].e);
            }
          }
      }
      let best = null;
      for (const c of cands) {
        if (!(c.d <= ap * 1.0001)) continue;
        if (!best || c.d < best.d - 1e-12 || (Math.abs(c.d - best.d) < 1e-9 && prio(c.kind) < prio(best.kind))) best = c;
      }
      return best;
      function prio(k) { return { INT: 0, END: 1, CEN: 2, MID: 3, QUA: 4, TAN: 5, PER: 6, INS: 7, NEA: 9 }[k] ?? 8; }
    }
    maybeAcquire(s) {
      if (!this.t.otrack) return;
      const key = `${s.kind}:${s.pt.x.toFixed(6)}:${s.pt.y.toFixed(6)}`;
      const now = Date.now();
      if (!this._acq || this._acq.key !== key) { this._acq = { key, t0: now }; clearTimeout(this._acqTimer); this._acqTimer = setTimeout(() => this.recompute(), 450); return; }
      if (now - this._acq.t0 >= 400 && !this.acquired.some((a) => G.eq(a.pt, s.pt, 1e-9))) {
        this.acquired.push({ pt: s.pt, kind: s.kind });
        if (this.acquired.length > 7) this.acquired.shift();
        this.event("acquire");
      }
    }
    trackAlign(raw, base) {
      const s = this.view.s, ap = APERTURE / s;
      const angs = this.t.polar ? polarAngles(this.t.polarInc) : [0, 90];
      const lines = [];
      for (const a of this.acquired) for (const d of angs) {
        const dir = { x: Math.cos(G.rad(d)), y: Math.sin(G.rad(d)) };
        const v = G.sub(raw, a.pt);
        const off = Math.abs(G.cross(dir, v));
        if (off <= ap) lines.push({ p: a.pt, dir, deg: d, off, kind: a.kind });
      }
      if (base && this.t.polar) for (const d of polarAngles(this.t.polarInc)) {
        const dir = { x: Math.cos(G.rad(d)), y: Math.sin(G.rad(d)) };
        const v = G.sub(raw, base);
        if (G.dot(v, dir) > 0 && Math.abs(G.cross(dir, v)) <= ap) lines.push({ p: base, dir, deg: d, off: Math.abs(G.cross(dir, v)), kind: "POLAR" });
      }
      if (!lines.length) return null;
      // 두 추적선 교차
      for (let i = 0; i < lines.length; i++) for (let j = i + 1; j < lines.length; j++) {
        if (G.eq(lines[i].p, lines[j].p, 1e-9)) continue;
        const x = G.intersect({ k: "L", a: lines[i].p, b: G.add(lines[i].p, lines[i].dir) }, { k: "L", a: lines[j].p, b: G.add(lines[j].p, lines[j].dir) }, true, true)[0];
        if (x && G.dist(x, raw) <= ap * 1.5) return { pt: x, lines: [lines[i], lines[j]], tip: "교차 추적" };
      }
      lines.sort((a, b) => a.off - b.off);
      const L = lines[0];
      const t = G.dot(G.sub(raw, L.p), L.dir);
      let dist = t;
      if (this.t.snap) dist = Math.round(t / this.t.snapUnit) * this.t.snapUnit;
      const pt = G.add(L.p, G.mul(L.dir, dist));
      const ang = dist < 0 ? L.deg + 180 : L.deg;
      return { pt, lines: [L], tip: `${L.kind === "POLAR" ? "극좌표" : (OSNAP_KO[L.kind] || "추적점")}: ${G.fmt(Math.abs(dist))} < ${G.fmt(((ang % 360) + 360) % 360)}°` };
    }
    polarSnap(base, raw) {
      const s = this.view.s, ap = APERTURE / s;
      const v = G.sub(raw, base);
      const L = G.len(v);
      if (L < 1e-9) return null;
      let best = null;
      for (const d of polarAngles(this.t.polarInc)) {
        const dir = { x: Math.cos(G.rad(d)), y: Math.sin(G.rad(d)) };
        const along = G.dot(v, dir);
        if (along <= 0) continue;
        const off = Math.abs(G.cross(dir, v));
        if (off <= ap * 1.4 && (!best || off < best.off)) best = { dir, d, along, off };
      }
      if (!best) return null;
      let dist = best.along;
      if (this.t.snap) dist = Math.max(this.t.snapUnit, Math.round(dist / this.t.snapUnit) * this.t.snapUnit);
      return { pt: G.add(base, G.mul(best.dir, dist)), line: { p: base, dir: best.dir, deg: best.d }, tip: `극좌표: ${G.fmt(dist)} < ${best.d}°` };
    }
    orthoProject(base, p) {
      const v = G.sub(p, base);
      if (this.t.iso) {
        let best = null;
        for (const d of ISO_AXES[this.t.isoplane]) {
          const dir = { x: Math.cos(G.rad(d)), y: Math.sin(G.rad(d)) };
          const t = G.dot(v, dir);
          if (!best || Math.abs(t) > Math.abs(best.t)) best = { dir, t };
        }
        return G.add(base, G.mul(best.dir, best.t));
      }
      return Math.abs(v.x) >= Math.abs(v.y) ? { x: p.x, y: base.y } : { x: base.x, y: p.y };
    }
    snapGrid(p) {
      const u = this.t.snapUnit;
      if (this.t.iso) {
        const a = { x: Math.cos(G.rad(30)) * u, y: Math.sin(G.rad(30)) * u }, b = { x: Math.cos(G.rad(150)) * u, y: Math.sin(G.rad(150)) * u };
        const det = a.x * b.y - a.y * b.x;
        const i = Math.round((p.x * b.y - p.y * b.x) / det), j = Math.round((a.x * p.y - a.y * p.x) / det);
        return { x: i * a.x + j * b.x, y: i * a.y + j * b.y };
      }
      return { x: Math.round(p.x / u) * u, y: Math.round(p.y / u) * u };
    }

    // ---------- 동적 입력 ----------
    updateDyn() {
      const el = this.dynEl;
      if (!el) return;
      const buf = this.input.value;
      if (!this.mouse.inside || (!this.t.dyn && !buf)) { el.hidden = true; return; }
      let html = "";
      if (!this.cmd) {
        if (!buf) { el.hidden = true; return; }
        const sug = this.suggest(buf);
        html = `<div class="dyn-in">${ACAD.esc(buf)}<i></i></div>` + (sug.length ? `<ul>${sug.map((d, i) => `<li${i === 0 ? ' class="on"' : ""}><b>${d.name}</b>${d.alias[0] ? ` <span class="mono">${d.alias[0]}</span>` : ""} ${ACAD.esc(d.ko)}</li>`).join("")}</ul>` : `<div class="dyn-sub">일치하는 명령 없음</div>`);
      } else if (this.req) {
        const short = (this.promptText || "").replace(/\s*또는.*$/, "").replace(/\s*\[.*$/, "").replace(/:$/, "");
        const base = this.effectiveBase();
        const p = this.cur.pt;
        let meas;
        if (buf) meas = `<div class="dyn-in">${ACAD.esc(buf)}<i></i></div>`;
        else if (this.req.type === "point" || this.req.type === "number") {
          if (base) meas = `<div class="dyn-fields"><span>${G.fmt(G.dist(base, p))}</span><span>${G.fmt(((G.deg(G.ang(base, p)) % 360) + 360) % 360)}°</span></div>`;
          else meas = `<div class="dyn-fields"><span>${G.fmt(p.x)}</span><span>${G.fmt(p.y)}</span></div>`;
        } else meas = "";
        html = `<div class="dyn-p">${ACAD.esc(short)}</div>${meas}`;
      }
      el.innerHTML = html;
      el.hidden = false;
      const x = Math.min(this.mouse.sx + 20, this.W - el.offsetWidth - 4);
      const y = Math.min(this.mouse.sy + 20, this.H - el.offsetHeight - 4);
      el.style.transform = `translate(${Math.max(4, x)}px, ${Math.max(4, y)}px)`;
    }

    // ---------- 주석(피드백 표시) ----------
    annotate(items, ms = 3500) {
      this.annots = items.map((it) => ({ ...it, until: Date.now() + ms }));
      clearTimeout(this._annTimer);
      this._annTimer = setTimeout(() => { this.annots = []; this.requestRender(); }, ms + 50);
      this.requestRender();
    }
    setMarks(marks) { this.marks = marks || []; this.requestRender(); }

    // ---------- 그리기 ----------
    requestRender() {
      if (this._raf || this.destroyed) return;
      this._raf = requestAnimationFrame(() => { this._raf = 0; this.render(); });
    }
    render() {
      const ctx = this.ctx2, W = this.W, H = this.H, dpr = this.dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = COL.bg;
      ctx.fillRect(0, 0, W, H);
      if (this.t.grid) this.drawGrid(ctx);
      this.drawLimits(ctx);
      const flat = this.flat();
      const hoverSrc = this.hover;
      for (const e of flat) {
        const sid = e._src || e.id;
        this.drawEnt(ctx, e, { hover: sid === hoverSrc && !this.sel.has(sid), sel: this.sel.has(sid) });
      }
      // 미리보기
      const req = this.cmd ? this.req : null;
      if (req && this.mouse.inside) {
        const base = this.effectiveBase();
        const pt = this.cur.pt;
        if (base && req.rubber !== false && (req.type === "point" || req.type === "number")) {
          const a = this.w2s(base), b = this.w2s(pt);
          ctx.save(); ctx.strokeStyle = "#c9c9c9"; ctx.setLineDash([4, 4]); ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); ctx.restore();
        }
        if (req.preview) {
          let pv = null;
          try { pv = req.preview(pt); } catch (e) { pv = null; }
          if (pv) for (const e of [].concat(pv)) if (e) { if (!e.layer) e.layer = this.doc.cur; this.drawEnt(ctx, e, { preview: true }); }
        }
      }
      if (this.m2p && this.m2p.first) this.drawMarker(ctx, this.m2p.first, "END", "#a3a3a3");
      if (this.from && this.from.base) this.drawMarker(ctx, this.from.base, "END", "#a3a3a3");
      // 그립
      if (!this.cmd || (this.cmd && this.cmd.name === "GRIP")) {
        for (const id of this.sel) {
          const e = this.doc.get(id);
          if (!e) continue;
          for (const g of this.gripsOf(e)) {
            const s = this.w2s(g.pt);
            ctx.fillStyle = COL.grip; ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 1;
            ctx.fillRect(s.x - 4, s.y - 4, 8, 8); ctx.strokeRect(s.x - 4.5, s.y - 4.5, 9, 9);
          }
        }
        if (this.cmd && this._gripDef) { const s = this.w2s(this._gripDef.pt); ctx.fillStyle = COL.hot; ctx.fillRect(s.x - 4, s.y - 4, 8, 8); }
      }
      this.drawAnnots(ctx);
      this.drawMarks(ctx);
      // 추적선
      for (const L of this.cur.track || []) this.drawTrack(ctx, L);
      for (const a of this.acquired) { const s = this.w2s(a.pt); ctx.strokeStyle = COL.track; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(s.x - 4, s.y); ctx.lineTo(s.x + 4, s.y); ctx.moveTo(s.x, s.y - 4); ctx.lineTo(s.x, s.y + 4); ctx.stroke(); }
      if (this.cur.snap && this.mouse.inside) {
        this.drawMarker(ctx, this.cur.snap.pt, this.cur.snap.kind, COL.snap);
        const s = this.w2s(this.cur.snap.pt);
        this.drawTip(ctx, s.x + 12, s.y + 22, OSNAP_KO[this.cur.snap.kind]);
      } else if (this.cur.tip && this.mouse.inside) {
        const s = this.w2s(this.cur.pt);
        this.drawTip(ctx, s.x + 14, s.y - 14, this.cur.tip);
      }
      // 선택 창
      if (this.win && this.mouse.inside) {
        const a = this.w2s(this.win.start);
        const bx = this.mouse.sx, by = this.mouse.sy;
        const crossing = this.selMode ? this.selMode === "C" : bx < a.x;
        ctx.save();
        ctx.fillStyle = crossing ? COL.cross2 : COL.win;
        ctx.strokeStyle = crossing ? COL.crossLine : COL.winLine;
        ctx.setLineDash(crossing ? [6, 4] : []);
        ctx.lineWidth = 1;
        ctx.fillRect(Math.min(a.x, bx), Math.min(a.y, by), Math.abs(bx - a.x), Math.abs(by - a.y));
        ctx.strokeRect(Math.min(a.x, bx) + 0.5, Math.min(a.y, by) + 0.5, Math.abs(bx - a.x), Math.abs(by - a.y));
        ctx.restore();
      }
      if (this.fence) {
        const pts = [...this.fence, this.mouse.w].map((p) => this.w2s(p));
        ctx.save(); ctx.strokeStyle = COL.crossLine; ctx.setLineDash([6, 4]); ctx.beginPath();
        pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.stroke(); ctx.restore();
      }
      this.drawUcs(ctx);
      if (this.mouse.inside && !this.pan) this.drawCursor(ctx);
    }
    drawGrid(ctx) {
      const W = this.W, H = this.H, s = this.view.s;
      let g = this.t.gridUnit;
      while (g * s < 10) g *= 5;
      const major = g * 5;
      const a = this.s2w(0, H), b = this.s2w(W, 0);
      if (this.t.iso) {
        const fam = [[90, g * Math.cos(Math.PI / 6)], [30, g * Math.sin(G.rad(120))], [150, g * Math.sin(G.rad(120))]];
        ctx.lineWidth = 1;
        for (const [deg, sp] of fam) {
          const d = { x: Math.cos(G.rad(deg)), y: Math.sin(G.rad(deg)) }, n = G.perp(d);
          const cs = [a, b, { x: a.x, y: b.y }, { x: b.x, y: a.y }].map((p) => G.dot(p, n));
          const k0 = Math.floor(Math.min(...cs) / sp), k1 = Math.ceil(Math.max(...cs) / sp);
          if (k1 - k0 > 600) continue;
          const span = G.dist(a, b);
          for (let k = k0; k <= k1; k++) {
            const o = G.mul(n, k * sp);
            const c = G.add(o, G.mul(d, G.dot(G.mid(a, b), d)));
            const p1 = this.w2s(G.add(c, G.mul(d, -span))), p2 = this.w2s(G.add(c, G.mul(d, span)));
            ctx.strokeStyle = k % 5 === 0 ? COL.gridMajor : COL.grid;
            ctx.globalAlpha = k % 5 === 0 ? 0.45 : 0.22;
            ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
          }
        }
        ctx.globalAlpha = 1;
        return;
      }
      ctx.lineWidth = 1;
      const drawFam = (step, color, alpha) => {
        ctx.strokeStyle = color; ctx.globalAlpha = alpha; ctx.beginPath();
        for (let x = Math.ceil(a.x / step) * step; x <= b.x; x += step) { const sx = Math.round(this.w2s({ x, y: 0 }).x) + 0.5; ctx.moveTo(sx, 0); ctx.lineTo(sx, H); }
        for (let y = Math.ceil(a.y / step) * step; y <= b.y; y += step) { const sy = Math.round(this.w2s({ x: 0, y }).y) + 0.5; ctx.moveTo(0, sy); ctx.lineTo(W, sy); }
        ctx.stroke();
      };
      drawFam(g, COL.grid, 0.22);
      drawFam(major, COL.gridMajor, 0.45);
      ctx.globalAlpha = 1;
    }
    drawLimits(ctx) {
      if (!this.showLimits) return;
      const L = this.doc.limits, a = this.w2s({ x: L.x0, y: L.y0 }), b = this.w2s({ x: L.x1, y: L.y1 });
      ctx.save(); ctx.strokeStyle = "#858585"; ctx.setLineDash([2, 4]); ctx.strokeRect(a.x, b.y, b.x - a.x, a.y - b.y); ctx.restore();
    }
    dashFor(e) {
      const lt = this.doc.ltypeOf(e);
      const pat = ACAD.CadLtypes[lt] && ACAD.CadLtypes[lt].pat;
      if (!pat) return [];
      const k = this.view.s * this.t.ltscale * (e.ltscale || 1);
      const px = pat.map((x) => x * k);
      if (px.reduce((s, x) => s + x, 0) < 3) return [];
      return px.map((x) => Math.max(1, x));
    }
    drawEnt(ctx, e, st = {}) {
      if (e.type === "array") { for (const x of G.expandArray(e)) this.drawEnt(ctx, x, st); return; }
      const col = st.preview ? "#c9c9c9" : this.doc.colorOf(e);
      ctx.save();
      if (st.sel) {
        ctx.strokeStyle = COL.sel; ctx.globalAlpha = 0.35; ctx.lineWidth = 6; ctx.setLineDash([]);
        this.tracePath(ctx, e); ctx.stroke();
        ctx.globalAlpha = 1;
      }
      ctx.strokeStyle = col; ctx.fillStyle = col;
      ctx.lineWidth = st.hover ? 3 : st.sel ? 1.5 : 1;
      ctx.setLineDash(st.sel ? [6, 3] : this.dashFor(e));
      if (e.type === "text") this.drawText(ctx, e, col);
      else if (e.type === "dim") this.drawDim(ctx, e, col, st);
      else { this.tracePath(ctx, e); ctx.stroke(); }
      ctx.restore();
    }
    tracePath(ctx, e) {
      const s = this.view.s;
      ctx.beginPath();
      switch (e.type) {
        case "line": { const a = this.w2s(e.a), b = this.w2s(e.b); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); break; }
        case "circle": { const c = this.w2s(e.c); ctx.moveTo(c.x + e.r * s, c.y); ctx.arc(c.x, c.y, e.r * s, 0, G.TAU); break; }
        case "arc": { const c = this.w2s(e.c); ctx.arc(c.x, c.y, e.r * s, -e.a0, -(e.a0 + G.ccwSweep(e.a0, e.a1)), true); break; }
        case "pline": {
          const segs = G.plineSegs(e);
          segs.forEach((g, i) => {
            if (i === 0) { const p = this.w2s(G.segStart(g)); ctx.moveTo(p.x, p.y); }
            if (g.k === "L") { const b = this.w2s(g.b); ctx.lineTo(b.x, b.y); }
            else { const c = this.w2s(g.c); if (g.rev) ctx.arc(c.x, c.y, g.r * s, -(g.a0 + g.sw), -g.a0, false); else ctx.arc(c.x, c.y, g.r * s, -g.a0, -(g.a0 + g.sw), true); }
          });
          if (e.closed && segs.length) ctx.closePath();
          break;
        }
        case "ellipse": {
          const c = this.w2s(e.c), a = G.len(e.major) * s, rot = Math.atan2(e.major.y, e.major.x);
          if (e.t0 == null) ctx.ellipse(c.x, c.y, a, a * e.ratio, -rot, 0, G.TAU);
          else ctx.ellipse(c.x, c.y, a, a * e.ratio, -rot, -e.t0, -(e.t0 + G.ccwSweep(e.t0, e.t1)), true);
          break;
        }
        case "text": { const b = G.textBox(e).map((p) => this.w2s(p)); b.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.closePath(); break; }
        case "dim": { for (const l of G.dimGeom(e).lines) { const a = this.w2s(l.a), b = this.w2s(l.b); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); } break; }
        case "array": for (const x of G.expandArray(e)) { /* 개별 항목은 flat에서 그림 */ } break;
      }
    }
    drawText(ctx, e, col, override) {
      const t = override || e;
      const px = t.h * this.view.s;
      const p = this.w2s(t.p);
      if (px < 3) { ctx.globalAlpha = 0.6; this.tracePath(ctx, { type: "text", ...t }); ctx.stroke(); return; }
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(-(t.rot || 0));
      ctx.font = `${px}px ${this.fontFam()}`;
      ctx.textAlign = t.center ? "center" : "left";
      ctx.textBaseline = t.center ? "bottom" : "alphabetic";
      ctx.fillStyle = col;
      ctx.setLineDash([]);
      ctx.fillText(t.s, 0, 0);
      ctx.restore();
    }
    drawDim(ctx, e, col, st) {
      const g = G.dimGeom(e);
      ctx.beginPath();
      for (const l of g.lines) { const a = this.w2s(l.a), b = this.w2s(l.b); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); }
      ctx.stroke();
      const size = (e.ts || 2.5) * this.view.s;
      ctx.setLineDash([]);
      for (const ar of g.arrows) {
        const p = this.w2s(ar.p);
        const d = { x: ar.dir.x, y: -ar.dir.y };
        const n = { x: -d.y, y: d.x };
        const back = { x: p.x - d.x * size, y: p.y - d.y * size };
        ctx.beginPath(); ctx.moveTo(p.x, p.y);
        ctx.lineTo(back.x + n.x * size * 0.17, back.y + n.y * size * 0.17);
        ctx.lineTo(back.x - n.x * size * 0.17, back.y - n.y * size * 0.17);
        ctx.closePath(); ctx.fill();
      }
      if (g.text) this.drawText(ctx, e, col, g.text);
    }
    drawMarker(ctx, p, kind, color) {
      const s = this.w2s(p), r = 6;
      ctx.save();
      ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.setLineDash([]);
      ctx.beginPath();
      switch (kind) {
        case "END": ctx.rect(s.x - r, s.y - r, 2 * r, 2 * r); break;
        case "MID": ctx.moveTo(s.x, s.y - r); ctx.lineTo(s.x + r, s.y + r * 0.8); ctx.lineTo(s.x - r, s.y + r * 0.8); ctx.closePath(); break;
        case "CEN": ctx.arc(s.x, s.y, r, 0, G.TAU); break;
        case "QUA": ctx.moveTo(s.x, s.y - r); ctx.lineTo(s.x + r, s.y); ctx.lineTo(s.x, s.y + r); ctx.lineTo(s.x - r, s.y); ctx.closePath(); break;
        case "INT": ctx.moveTo(s.x - r, s.y - r); ctx.lineTo(s.x + r, s.y + r); ctx.moveTo(s.x + r, s.y - r); ctx.lineTo(s.x - r, s.y + r); break;
        case "PER": ctx.moveTo(s.x - r, s.y - r); ctx.lineTo(s.x - r, s.y + r); ctx.lineTo(s.x + r, s.y + r); ctx.moveTo(s.x - r, s.y); ctx.lineTo(s.x, s.y); ctx.lineTo(s.x, s.y + r); break;
        case "TAN": ctx.arc(s.x, s.y, r * 0.8, 0, G.TAU); ctx.moveTo(s.x - r, s.y - r * 0.8); ctx.lineTo(s.x + r, s.y - r * 0.8); break;
        case "NEA": ctx.moveTo(s.x - r, s.y - r); ctx.lineTo(s.x + r, s.y - r); ctx.lineTo(s.x - r, s.y + r); ctx.lineTo(s.x + r, s.y + r); ctx.closePath(); break;
        case "INS": ctx.rect(s.x - r, s.y - r, r, r); ctx.rect(s.x, s.y, r, r); break;
        default: ctx.rect(s.x - r, s.y - r, 2 * r, 2 * r);
      }
      ctx.stroke();
      ctx.restore();
    }
    drawTip(ctx, x, y, text) {
      if (!text) return;
      ctx.save();
      ctx.font = "12px " + this.fontFam();
      const w = ctx.measureText(text).width + 12;
      x = Math.min(x, this.W - w - 4); y = Math.min(Math.max(y, 20), this.H - 4);
      ctx.fillStyle = COL.tipBg; ctx.fillRect(x, y - 16, w, 20);
      ctx.fillStyle = COL.tipText; ctx.fillText(text, x + 6, y - 2);
      ctx.restore();
    }
    drawTrack(ctx, L) {
      const far = 1e5 / this.view.s;
      const a = this.w2s(G.add(L.p, G.mul(L.dir, -far))), b = this.w2s(G.add(L.p, G.mul(L.dir, far)));
      ctx.save(); ctx.strokeStyle = COL.track; ctx.lineWidth = 1; ctx.setLineDash([2, 3]);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); ctx.restore();
    }
    drawAnnots(ctx) {
      if (!this.annots.length) return;
      const now = Date.now();
      ctx.save();
      ctx.font = "12px " + this.fontFam();
      for (const a of this.annots) {
        const left = a.until - now;
        ctx.globalAlpha = Math.max(0, Math.min(1, left / 600));
        ctx.strokeStyle = COL.annot; ctx.fillStyle = COL.annot; ctx.lineWidth = 1; ctx.setLineDash([]);
        if (a.kind === "len") {
          const pa = this.w2s(a.a), pb = this.w2s(a.b);
          const d = G.unit({ x: pb.x - pa.x, y: pb.y - pa.y });
          const n = { x: -d.y * 16, y: d.x * 16 };
          ctx.beginPath();
          ctx.moveTo(pa.x + n.x * 0.3, pa.y + n.y * 0.3); ctx.lineTo(pa.x + n.x * 1.2, pa.y + n.y * 1.2);
          ctx.moveTo(pb.x + n.x * 0.3, pb.y + n.y * 0.3); ctx.lineTo(pb.x + n.x * 1.2, pb.y + n.y * 1.2);
          ctx.moveTo(pa.x + n.x, pa.y + n.y); ctx.lineTo(pb.x + n.x, pb.y + n.y);
          ctx.stroke();
          this.drawLabel(ctx, (pa.x + pb.x) / 2 + n.x * 1.6, (pa.y + pb.y) / 2 + n.y * 1.6, a.text);
        } else if (a.kind === "radius") {
          const c = this.w2s(a.c), p = this.w2s(G.polar(a.c, Math.PI / 4, a.r));
          ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.lineTo(p.x, p.y); ctx.stroke();
          ctx.beginPath(); ctx.arc(c.x, c.y, 3, 0, G.TAU); ctx.fill();
          this.drawLabel(ctx, p.x + 8, p.y - 8, a.text);
        } else if (a.kind === "label") {
          const p = this.w2s(a.p);
          this.drawLabel(ctx, p.x, p.y, a.text);
        } else if (a.kind === "point") {
          const p = this.w2s(a.p);
          ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, G.TAU); ctx.stroke();
          this.drawLabel(ctx, p.x + 8, p.y - 10, a.text);
        }
      }
      ctx.restore();
    }
    drawLabel(ctx, x, y, text) {
      const w = ctx.measureText(text).width + 10;
      ctx.save();
      ctx.fillStyle = "#000000"; ctx.globalAlpha *= 0.85;
      ctx.fillRect(x - w / 2, y - 10, w, 18);
      ctx.restore();
      ctx.save(); ctx.fillStyle = COL.annot; ctx.textAlign = "center"; ctx.fillText(text, x, y + 3); ctx.restore();
    }
    drawMarks(ctx) {
      for (const m of this.marks) {
        const p = this.w2s(m.p);
        ctx.save();
        ctx.strokeStyle = COL.mark; ctx.fillStyle = COL.mark; ctx.lineWidth = 2; ctx.setLineDash([]);
        ctx.beginPath(); ctx.arc(p.x, p.y, 11, 0, G.TAU); ctx.stroke();
        ctx.font = "bold 13px sans-serif"; ctx.textAlign = "center"; ctx.fillText("!", p.x, p.y + 5);
        ctx.restore();
      }
    }
    drawUcs(ctx) {
      const x = 28, y = this.H - 28, L = 36;
      ctx.save(); ctx.lineWidth = 2; ctx.setLineDash([]);
      ctx.strokeStyle = "#f2520a"; ctx.fillStyle = "#f2520a";
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + L, y); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + L + 6, y); ctx.lineTo(x + L - 2, y - 4); ctx.lineTo(x + L - 2, y + 4); ctx.fill();
      ctx.strokeStyle = "#2ad0a9"; ctx.fillStyle = "#2ad0a9";
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - L); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, y - L - 6); ctx.lineTo(x - 4, y - L + 2); ctx.lineTo(x + 4, y - L + 2); ctx.fill();
      ctx.font = "11px sans-serif"; ctx.fillStyle = "#ffffff";
      ctx.fillText("X", x + L + 8, y + 4); ctx.fillText("Y", x - 3, y - L - 10);
      ctx.restore();
    }
    drawCursor(ctx) {
      const x = Math.round(this.mouse.sx) + 0.5, y = Math.round(this.mouse.sy) + 0.5;
      const req = this.cmd ? this.req : null;
      const showCross = !req || req.type === "point" || req.type === "number";
      const showBox = !req || req.type === "select" || req.type === "pick";
      ctx.save();
      ctx.strokeStyle = COL.cross; ctx.lineWidth = 1; ctx.setLineDash([]);
      if (showCross && !(req && req.type === "pick")) {
        const L = Math.max(30, Math.min(this.W, this.H) * 0.12);
        const cp = req && this.cur.grid && !this.cur.snap ? this.w2s(this.cur.pt) : { x, y };
        const cx = Math.round(cp.x) + 0.5, cy = Math.round(cp.y) + 0.5;
        ctx.beginPath();
        if (this.t.iso) {
          for (const d of ISO_AXES[this.t.isoplane]) {
            const dx = Math.cos(G.rad(d)) * L, dy = -Math.sin(G.rad(d)) * L;
            ctx.moveTo(cx - dx, cy - dy); ctx.lineTo(cx + dx, cy + dy);
          }
        } else {
          ctx.moveTo(cx - L, cy); ctx.lineTo(cx - (showBox ? PICKBOX : 0), cy); ctx.moveTo(cx + (showBox ? PICKBOX : 0), cy); ctx.lineTo(cx + L, cy);
          ctx.moveTo(cx, cy - L); ctx.lineTo(cx, cy - (showBox ? PICKBOX : 0)); ctx.moveTo(cx, cy + (showBox ? PICKBOX : 0)); ctx.lineTo(cx, cy + L);
        }
        ctx.stroke();
      }
      if (showBox) ctx.strokeRect(x - PICKBOX, y - PICKBOX, PICKBOX * 2, PICKBOX * 2);
      ctx.restore();
    }

    fontFam() { return this._font || (this._font = getComputedStyle(document.body).fontFamily || "sans-serif"); }

    // 미션 검사용 스냅샷
    context() {
      return { doc: this.doc, ents: this.doc.ents, flat: this.doc.flat(), history: this.history, inputs: this.inputs, events: this.events, t: this.t, sel: [...this.sel], view: this.view, eng: this };
    }
  }
  function polarAngles(inc) { const out = []; for (let a = 0; a < 360 - 1e-9; a += inc) out.push(a); return out; }

  ACAD.CadEngine = Engine;
  ACAD.CadOsnapKo = OSNAP_KO;
})();
