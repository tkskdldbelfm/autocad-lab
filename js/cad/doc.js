// CAD 연습장: 도면 데이터(엔티티·도면층), 명령 취소 스택, DXF 내보내기
window.ACAD = window.ACAD || {};
(function () {
  const G = ACAD.G;

  // 도면층 색. 브랜드 토큰 값만 쓴다. aci는 DXF 내보내기용 AutoCAD 색 번호.
  const COLORS = {
    white: { hex: "#ffffff", aci: 7, ko: "흰색(7)" },
    red: { hex: "#f2520a", aci: 1, ko: "빨간색(1)" },
    yellow: { hex: "#ffff00", aci: 2, ko: "노란색(2)" },
    green: { hex: "#2ad0a9", aci: 3, ko: "초록색(3)" },
    cyan: { hex: "#4eb3e9", aci: 4, ko: "하늘색(4)" },
    orange: { hex: "#f09d4f", aci: 30, ko: "주황색(30)" },
    gray: { hex: "#a3a3a3", aci: 8, ko: "회색(8)" },
  };
  // acadiso.lin 기준 패턴(mm)
  const LTYPES = {
    CONTINUOUS: { ko: "실선", pat: null },
    HIDDEN: { ko: "숨은선(파선)", pat: [6.35, 3.175] },
    CENTER: { ko: "중심선(1점 쇄선)", pat: [31.75, 6.35, 6.35, 6.35] },
    PHANTOM: { ko: "가상선(2점 쇄선)", pat: [31.75, 6.35, 6.35, 6.35, 6.35, 6.35] },
  };
  const DEFAULT_LAYERS = [
    { name: "0", color: "white", ltype: "CONTINUOUS" },
    { name: "외형선", color: "white", ltype: "CONTINUOUS" },
    { name: "숨은선", color: "yellow", ltype: "HIDDEN" },
    { name: "중심선", color: "red", ltype: "CENTER" },
    { name: "치수", color: "cyan", ltype: "CONTINUOUS" },
    { name: "문자", color: "green", ltype: "CONTINUOUS" },
    { name: "배관", color: "orange", ltype: "CONTINUOUS" },
  ];

  class Doc {
    constructor() {
      this.ents = [];
      this.nextId = 1;
      this.layers = DEFAULT_LAYERS.map((l) => ({ ...l, on: true, lock: false }));
      this.cur = "0";
      this.limits = { x0: 0, y0: 0, x1: 420, y1: 297 };
      this.version = 0;
      this.undoStack = [];
      this.redoStack = [];
      this.erased = [];
      this.textH = 2.5;
      this.dimTs = 2.5;
    }
    touch() { this.version++; }
    add(e) {
      e.id = this.nextId++;
      if (!e.layer) e.layer = this.cur;
      this.ents.push(e);
      this.touch();
      return e;
    }
    get(id) { return this.ents.find((e) => e.id === id); }
    // 같은 id로 바꿔 넣는다(태그 유지)
    replace(id, ne) {
      const i = this.ents.findIndex((e) => e.id === id);
      if (i < 0) return null;
      const old = this.ents[i];
      ne.id = id;
      if (!ne.layer) ne.layer = old.layer;
      if (old.tag && ne.tag == null) ne.tag = old.tag;
      this.ents[i] = ne;
      this.touch();
      return ne;
    }
    remove(id) {
      const i = this.ents.findIndex((e) => e.id === id);
      if (i < 0) return null;
      const [e] = this.ents.splice(i, 1);
      this.touch();
      return e;
    }
    layer(name) { return this.layers.find((l) => l.name === name); }
    ensureLayer(name, color = "white", ltype = "CONTINUOUS") {
      let l = this.layer(name);
      if (!l) { l = { name, color, ltype, on: true, lock: false }; this.layers.push(l); this.touch(); }
      return l;
    }
    visible(e) { const l = this.layer(e.layer); return !l || l.on; }
    locked(e) { const l = this.layer(e.layer); return !!(l && l.lock); }
    colorOf(e) {
      const c = e.color && e.color !== "bylayer" ? e.color : (this.layer(e.layer) || {}).color || "white";
      return (COLORS[c] || COLORS.white).hex;
    }
    ltypeOf(e) {
      const t = e.ltype && e.ltype !== "bylayer" ? e.ltype : (this.layer(e.layer) || {}).ltype || "CONTINUOUS";
      return t;
    }
    snapshot() {
      return JSON.stringify({ ents: this.ents, nextId: this.nextId, layers: this.layers, cur: this.cur, limits: this.limits });
    }
    restore(s) {
      const o = JSON.parse(s);
      this.ents = o.ents; this.nextId = o.nextId; this.layers = o.layers; this.cur = o.cur; this.limits = o.limits || this.limits;
      this.touch();
    }
    pushUndo(before, label) {
      this.undoStack.push({ snap: before, label });
      if (this.undoStack.length > 200) this.undoStack.shift();
      this.redoStack = [];
    }
    undo() {
      const u = this.undoStack.pop();
      if (!u) return null;
      this.redoStack.push({ snap: this.snapshot(), label: u.label });
      this.restore(u.snap);
      return u.label;
    }
    redo() {
      const r = this.redoStack.pop();
      if (!r) return null;
      this.undoStack.push({ snap: this.snapshot(), label: r.label });
      this.restore(r.snap);
      return r.label;
    }
    // 화면·계산용 평탄화(배열은 항목으로 전개)
    flat() {
      const out = [];
      for (const e of this.ents) {
        if (e.type === "array") for (const x of G.expandArray(e)) { x._src = e.id; out.push(x); }
        else out.push(e);
      }
      return out;
    }
    extents() {
      let bb = null;
      for (const e of this.ents) if (this.visible(e)) bb = G.bboxUnion(bb, G.bbox(e));
      return bb;
    }

    // ---------- DXF(R12, ASCII) ----------
    toDXF() {
      const L = [];
      const w = (code, val) => { L.push(String(code)); L.push(String(val)); };
      const enc = (s) => String(s).replace(/[^\x20-\x7e]/g, (ch) => "\\U+" + ch.codePointAt(0).toString(16).toUpperCase().padStart(4, "0"));
      const num = (n) => (Math.round(n * 1e6) / 1e6).toString();
      w(0, "SECTION"); w(2, "HEADER");
      w(9, "$ACADVER"); w(1, "AC1009");
      w(9, "$INSUNITS"); w(70, 4);
      w(9, "$EXTMIN"); w(10, 0); w(20, 0);
      w(9, "$EXTMAX"); w(10, 420); w(20, 297);
      w(0, "ENDSEC");
      w(0, "SECTION"); w(2, "TABLES");
      w(0, "TABLE"); w(2, "LTYPE"); w(70, 4);
      for (const [name, lt] of Object.entries(LTYPES)) {
        w(0, "LTYPE"); w(2, name); w(70, 0); w(3, lt.ko.replace(/[^\x20-\x7e]/g, "") || name); w(72, 65);
        const pat = lt.pat || [];
        w(73, pat.length); w(40, num(pat.reduce((s, x) => s + x, 0)));
        pat.forEach((x, i) => w(49, num(i % 2 ? -x : x)));
      }
      w(0, "ENDTAB");
      w(0, "TABLE"); w(2, "LAYER"); w(70, this.layers.length);
      for (const l of this.layers) {
        w(0, "LAYER"); w(2, enc(l.name)); w(70, l.lock ? 4 : 0);
        const aci = (COLORS[l.color] || COLORS.white).aci;
        w(62, l.on ? aci : -aci); w(6, l.ltype || "CONTINUOUS");
      }
      w(0, "ENDTAB");
      w(0, "ENDSEC");
      w(0, "SECTION"); w(2, "ENTITIES");
      const emit = (e) => {
        const lay = enc(e.layer || "0");
        const common = () => { w(8, lay); if (e.color && e.color !== "bylayer") w(62, (COLORS[e.color] || COLORS.white).aci); if (e.ltype && e.ltype !== "bylayer") w(6, e.ltype); };
        switch (e.type) {
          case "line": w(0, "LINE"); common(); w(10, num(e.a.x)); w(20, num(e.a.y)); w(30, 0); w(11, num(e.b.x)); w(21, num(e.b.y)); w(31, 0); break;
          case "circle": w(0, "CIRCLE"); common(); w(10, num(e.c.x)); w(20, num(e.c.y)); w(30, 0); w(40, num(e.r)); break;
          case "arc": w(0, "ARC"); common(); w(10, num(e.c.x)); w(20, num(e.c.y)); w(30, 0); w(40, num(e.r)); w(50, num(G.deg(G.nang(e.a0)))); w(51, num(G.deg(G.nang(e.a1)))); break;
          case "pline":
            w(0, "POLYLINE"); common(); w(66, 1); w(10, 0); w(20, 0); w(30, 0); w(70, e.closed ? 1 : 0);
            for (const p of e.pts) { w(0, "VERTEX"); w(8, lay); w(10, num(p.x)); w(20, num(p.y)); w(30, 0); if (p.b) w(42, num(p.b)); }
            w(0, "SEQEND"); w(8, lay);
            break;
          case "ellipse": {
            const segs = G.ellipseSegs(e, 72);
            w(0, "POLYLINE"); common(); w(66, 1); w(10, 0); w(20, 0); w(30, 0); w(70, e.t0 == null ? 1 : 0);
            const pts = e.t0 == null ? segs.map((s) => s.a) : [segs[0].a, ...segs.map((s) => s.b)];
            for (const p of pts) { w(0, "VERTEX"); w(8, lay); w(10, num(p.x)); w(20, num(p.y)); w(30, 0); }
            w(0, "SEQEND"); w(8, lay);
            break;
          }
          case "text":
            w(0, "TEXT"); common(); w(10, num(e.p.x)); w(20, num(e.p.y)); w(30, 0); w(40, num(e.h)); w(1, enc(e.s)); if (e.rot) w(50, num(G.deg(e.rot)));
            break;
          case "dim": {
            const g = G.dimGeom(e);
            for (const l of g.lines) emit({ type: "line", a: l.a, b: l.b, layer: e.layer, color: e.color });
            if (g.text) emit({ type: "text", p: g.text.p, h: g.text.h, s: g.text.s, rot: g.text.rot, layer: e.layer, color: e.color });
            break;
          }
          case "array": for (const x of G.expandArray(e)) emit(x); break;
        }
      };
      for (const e of this.ents) emit(e);
      w(0, "ENDSEC");
      w(0, "EOF");
      return L.join("\r\n");
    }
  }

  ACAD.CadDoc = Doc;
  ACAD.CadColors = COLORS;
  ACAD.CadLtypes = LTYPES;
})();
