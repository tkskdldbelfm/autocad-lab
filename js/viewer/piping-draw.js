// 배관 도면 그리기: P&ID(축척 없음), 등각 아이소메트릭(ISO), 기호 사전.
// 모든 그림은 SVG 문자열. 마우스 연동은 data-key(P&ID) / data-part(아이소)로 한다.
window.ACAD = window.ACAD || {};

(function () {
  const esc = (s) => ACAD.esc(s);
  const r1 = (v) => Math.round(v * 10) / 10;

  // ---------------------------------------------------------------- 밸브 기호(가로 h / 세로 v)
  function valveSym(cx, cy, dir, type, s = 12) {
    const w = s * 0.75;
    const tri = dir === "h"
      ? [[cx - s, cy - w, cx - s, cy + w, cx, cy], [cx + s, cy - w, cx + s, cy + w, cx, cy]]
      : [[cx - w, cy - s, cx + w, cy - s, cx, cy], [cx - w, cy + s, cx + w, cy + s, cx, cy]];
    const poly = (t, fill) => `<path class="vl${fill ? " fill" : ""}" d="M${t[0]} ${t[1]}L${t[2]} ${t[3]}L${t[4]} ${t[5]}Z"/>`;
    let o = poly(tri[0], false) + poly(tri[1], type === "check");
    if (type === "globe") o += `<circle class="vl fill" cx="${cx}" cy="${cy}" r="${s * 0.32}"/>`;
    if (type === "ball") o += `<circle class="vl" cx="${cx}" cy="${cy}" r="${s * 0.42}"/>`;
    if (type === "gate" || type === "globe") {
      o += dir === "h" ? `<path class="vl" d="M${cx} ${cy}L${cx} ${cy - s * 1.1}M${cx - s * 0.5} ${cy - s * 1.1}L${cx + s * 0.5} ${cy - s * 1.1}"/>`
        : `<path class="vl" d="M${cx} ${cy}L${cx + s * 1.1} ${cy}M${cx + s * 1.1} ${cy - s * 0.5}L${cx + s * 1.1} ${cy + s * 0.5}"/>`;
    }
    return o;
  }
  function arrowAt(x, y, ang, s = 9) {
    const c = Math.cos(ang), n = Math.sin(ang);
    return `<path class="arrow" d="M${r1(x + c * s)} ${r1(y + n * s)}L${r1(x - c * s * 0.6 - n * s * 0.6)} ${r1(y - n * s * 0.6 + c * s * 0.6)}L${r1(x - c * s * 0.6 + n * s * 0.6)} ${r1(y - n * s * 0.6 - c * s * 0.6)}Z"/>`;
  }

  // ---------------------------------------------------------------- P&ID
  function pid() {
    const L = (key, d, extra = "", small) => `<g class="sym" data-key="${key}"><path class="glow" d="${d}"/><path class="ln-path${small ? " small" : ""}" d="${d}"/>${extra}<path class="hit" d="${d}"/></g>`;
    const V = (key, x, y, dir, type, label, lx, ly, anchor = "start") => `<g class="sym" data-key="${key}">
      <circle class="glow" cx="${x}" cy="${y}" r="16"/>${valveSym(x, y, dir, type)}
      <text class="tx m" x="${lx}" y="${ly}" text-anchor="${anchor}">${label}</text><circle class="hit" cx="${x}" cy="${y}" r="18"/></g>`;
    const d1001 = "M170 354L170 170L520 170L520 230";
    const d1002 = "M660 230L660 190L800 190";
    const d1003 = "M840 420L840 470L706 470";
    return `<svg class="pid" viewBox="0 0 1000 560" role="img" aria-label="CW-SKID-01 P&ID">
      <rect class="frame" x="8" y="8" width="984" height="544"/>
      <text class="tx b" x="24" y="36">P&amp;ID · 냉각수 스키드 CW-SKID-01</text>
      <text class="tx" x="24" y="58" fill="#666666" style="font-size:15px">축척 없음. 무엇이 무엇에 연결되는지, 어떤 밸브와 계기가 어디에 붙는지를 본다.</text>

      <!-- 흡입(스키드 밖) -->
      <path class="ln-path" d="M40 390L134 390"/>${arrowAt(100, 390, 0)}
      <text class="tx" x="40" y="376">CW 리턴</text>

      ${L("line:1001", d1001, arrowAt(170, 220, -Math.PI / 2) + arrowAt(440, 170, 0) + arrowAt(520, 205, Math.PI / 2))}
      ${L("line:1002", d1002, arrowAt(740, 190, 0))}
      ${L("line:1003", d1003, arrowAt(780, 470, Math.PI), true)}
      <path class="ln-path small" d="M700 462L700 478M706 462L706 478M694 459L694 481" />
      <text class="tx" x="690" y="500" text-anchor="end">드레인(맹플랜지)</text>

      <text class="tx m" x="296" y="158" text-anchor="middle">4"-CW-1001-A1A-CS</text>
      <text class="tx m" x="730" y="182" text-anchor="middle">3"-CW-1002-A1A-CS</text>
      <text class="tx m" x="772" y="492" text-anchor="middle">1"-CW-1003-A1A-CS</text>

      <!-- 장치 -->
      <g class="sym" data-key="P-101">
        <circle class="glow" cx="170" cy="390" r="40"/>
        <circle class="eqs" cx="170" cy="390" r="36"/>
        <path class="eqs" d="M150 420L136 440L204 440L190 420" fill="none"/>
        <path class="ln-path" d="M170 390L170 354" style="stroke-width:1.4"/>
        <text class="tx b" x="170" y="468" text-anchor="middle">P-101</text>
        <text class="tx" x="170" y="486" text-anchor="middle">냉각수 펌프</text>
        <circle class="hit" cx="170" cy="390" r="38"/>
      </g>
      <g class="sym" data-key="E-201">
        <rect class="glow" x="476" y="226" width="228" height="68" rx="34"/>
        <rect class="eqs" x="480" y="230" width="220" height="60" rx="30"/>
        <path class="eqs" d="M500 260L540 260L550 248L570 272L590 248L610 272L630 248L650 272L660 260L680 260" fill="none" style="stroke-width:1.2"/>
        <text class="tx b" x="590" y="318" text-anchor="middle">E-201</text>
        <text class="tx" x="590" y="336" text-anchor="middle">열교환기</text>
        <rect class="hit" x="480" y="230" width="220" height="60"/>
      </g>
      <g class="sym" data-key="TK-301">
        <rect class="glow" x="796" y="126" width="88" height="298" rx="40"/>
        <rect class="eqs" x="800" y="130" width="80" height="290" rx="36"/>
        <text class="tx b" x="896" y="270">TK-301</text>
        <text class="tx" x="896" y="288">팽창 탱크</text>
        <rect class="hit" x="800" y="130" width="80" height="290"/>
      </g>

      ${V("V-102", 170, 290, "v", "check", "V-102 체크", 184, 294)}
      ${V("V-101", 215, 170, "h", "gate", "V-101", 215, 200, "middle")}
      ${V("V-103", 770, 470, "h", "gate", "V-103 NC", 770, 450, "middle")}

      <g class="sym" data-key="PI-101">
        <path class="glow" d="M400 170L400 128"/><circle class="glow" cx="400" cy="110" r="20"/>
        <path class="ln-path small" d="M400 170L400 128" style="stroke-width:1.2"/>
        <circle class="bub" cx="400" cy="110" r="18"/>
        <text class="tx b" x="400" y="108" text-anchor="middle" style="font-size:11px">PI</text>
        <text class="tx" x="400" y="121" text-anchor="middle" style="font-size:10px">101</text>
        <circle class="hit" cx="400" cy="110" r="20"/>
      </g>

      <g transform="translate(300 500)">
        <rect class="frame" x="0" y="0" width="330" height="44"/>
        <text class="tx" x="8" y="18">CW-SKID-01 · P&amp;ID · REV 0</text>
        <text class="tx" x="8" y="36" fill="#666666">교재용. 배관 등급 A1A는 가상 등급이다.</text>
      </g>
    </svg>`;
  }

  // P&ID 키 ↔ 3D 부품
  function pidKeyOfPart(prep, partId) {
    const p = prep.parts[partId];
    if (!p) return null;
    if (p.kind === "valve" || p.kind === "equipment" || p.kind === "instrument") return partId;
    if (partId === "1001-BR") return "PI-101";
    if (p.line) return "line:" + p.line;
    return null;
  }

  // ---------------------------------------------------------------- 아이소메트릭
  const C30 = Math.cos(Math.PI / 6), S30 = 0.5;
  // 북 = 오른쪽 위, 동 = 오른쪽 아래, 위 = 위
  const isoDir = (d) => [(d[0] + d[1]) * C30, (d[0] - d[1]) * S30 - d[2]];

  function iso(prep, lineId, opt = {}) {
    const route = prep.routes[lineId];
    const { V } = ACAD.G3;
    const pts = route.pts;
    const n = pts.length;
    const segL = [], segD = [], cum = [0];
    for (let i = 0; i < n - 1; i++) {
      const v = V.sub(pts[i + 1], pts[i]);
      segL.push(V.len(v)); segD.push(V.norm(v)); cum.push(cum[i] + V.len(v));
    }
    // 축척 없음: 긴 구간은 줄이고 짧은 구간은 늘려 읽기 좋게 그린다(치수가 진짜 길이).
    const drawn = segL.map((l) => Math.max(90, Math.min(260, l * 0.2)));
    const S = [[0, 0]];
    for (let i = 0; i < n - 1; i++) {
      const d = isoDir(segD[i]);
      S.push([S[i][0] + d[0] * drawn[i], S[i][1] + d[1] * drawn[i]]);
    }
    // 판 안에 맞추기
    const xs = S.map((p) => p[0]), ys = S.map((p) => p[1]);
    const bw = Math.max(...xs) - Math.min(...xs), bh = Math.max(...ys) - Math.min(...ys);
    const AW = 560, AH = 380;
    const k = Math.min(AW / Math.max(bw, 1), AH / Math.max(bh, 1), 1.4);
    const ox = 90 + (AW - bw * k) / 2 - Math.min(...xs) * k, oy = 120 + (AH - bh * k) / 2 - Math.min(...ys) * k;
    const P = S.map((p) => [p[0] * k + ox, p[1] * k + oy]);
    const at = (s) => {
      let i = 0;
      while (i < n - 2 && s > cum[i + 1]) i++;
      const t = Math.max(0, Math.min(1, (s - cum[i]) / segL[i]));
      return [P[i][0] + (P[i + 1][0] - P[i][0]) * t, P[i][1] + (P[i + 1][1] - P[i][1]) * t, i];
    };
    const segScreenDir = (i) => { const a = P[i], b = P[i + 1]; const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; return [(b[0] - a[0]) / l, (b[1] - a[1]) / l]; };
    let o = `<svg class="iso" viewBox="0 0 760 600" role="img" aria-label="${esc(route.name)} 아이소메트릭">
      <rect class="frame" x="6" y="6" width="748" height="588"/>
      <text class="tx b" x="20" y="32">ISO · ${esc(route.name)}</text>
      <text class="tx" x="20" y="50" fill="#666666">축척 없음(NTS). 길이는 그림이 아니라 치수로 읽는다. 치수 mm, 작업점(WP) 기준.</text>`;
    // 북쪽 표시
    {
      const nx = 690, ny = 96, d = isoDir([0, 1, 0]);
      o += `<g><path class="dl" d="M${nx - d[0] * 26} ${ny - d[1] * 26}L${nx + d[0] * 26} ${ny + d[1] * 26}"/>${arrowAt(nx + d[0] * 26, ny + d[1] * 26, Math.atan2(d[1], d[0]), 8)}<text class="tx b" x="${nx + d[0] * 40}" y="${ny + d[1] * 40 + 4}" text-anchor="middle">N</text></g>`;
    }
    // 배관 토막(마우스 대상)
    const comps = route.comps;
    const pieces = comps.filter((c) => c.type === "pipe" || c.type === "flange" || c.type === "blind");
    const runD = "M" + P.map((p) => r1(p[0]) + " " + r1(p[1])).join("L");
    o += `<path class="run" d="${runD}"/>`;
    const tagOf = {};
    for (const c of pieces) {
      const a = at(c.s), b = at(c.s + c.len);
      tagOf[c.tag] = 1;
      o += `<g class="sym" data-part="${c.tag}"><path class="glow" d="M${r1(a[0])} ${r1(a[1])}L${r1(b[0])} ${r1(b[1])}"/><path d="M${r1(a[0])} ${r1(a[1])}L${r1(b[0])} ${r1(b[1])}" stroke="transparent" stroke-width="14"/></g>`;
    }
    // 엘보(모서리)
    for (const c of comps.filter((c) => c.type === "elbow")) {
      const p = P[c.at];
      o += `<g class="sym" data-part="${c.tag}"><circle class="glow" cx="${r1(p[0])}" cy="${r1(p[1])}" r="10"/><circle cx="${r1(p[0])}" cy="${r1(p[1])}" r="12" fill="transparent"/></g>`;
    }
    // 플랜지 표시(‖)
    const tick = (s, gapPx = 3) => {
      const a = at(s);
      const d = segScreenDir(a[2]);
      const nrm = [-d[1], d[0]];
      const L = 9;
      return [-gapPx, gapPx].map((g) => `M${r1(a[0] + d[0] * g - nrm[0] * L)} ${r1(a[1] + d[1] * g - nrm[1] * L)}L${r1(a[0] + d[0] * g + nrm[0] * L)} ${r1(a[1] + d[1] * g + nrm[1] * L)}`).join("");
    };
    let ticks = "";
    for (const c of comps) {
      if (c.type === "flange") ticks += tick(c.end ? c.s + c.len : c.s);
      if (c.type === "gate" || c.type === "check" || c.type === "globe" || c.type === "ball") { ticks += tick(c.s + 2) + tick(c.s + c.len - 2); }
    }
    o += `<path class="dl" d="${ticks}" style="stroke-width:1.6"/>`;
    // 밸브
    for (const c of comps.filter((c) => ["gate", "check", "globe", "ball"].includes(c.type))) {
      const a = at(c.s + c.len / 2);
      const d = segScreenDir(a[2]);
      const ang = Math.atan2(d[1], d[0]);
      const s = 11, w = 8;
      const ca = Math.cos(ang), sa = Math.sin(ang);
      const pt = (u, v) => `${r1(a[0] + ca * u - sa * v)} ${r1(a[1] + sa * u + ca * v)}`;
      o += `<g class="sym" data-part="${c.tag}"><circle class="glow" cx="${r1(a[0])}" cy="${r1(a[1])}" r="16"/>
        <path class="vlv" d="M${pt(-s, -w)}L${pt(-s, w)}L${pt(0, 0)}Z"/><path class="vlv" d="M${pt(s, -w)}L${pt(s, w)}L${pt(0, 0)}Z" ${c.type === "check" ? 'style="fill:#000"' : ""}/>
        ${c.type === "gate" ? `<path class="vlv" d="M${pt(0, 0)}L${r1(a[0])} ${r1(a[1] - 18)}M${r1(a[0] - 6)} ${r1(a[1] - 18)}L${r1(a[0] + 6)} ${r1(a[1] - 18)}"/>` : ""}
        <text class="tx b" x="${r1(a[0] + 18)}" y="${r1(a[1] + 26)}">${esc(c.tag)}</text></g>`;
    }
    // 용접: 공장 용접 ● / 현장 용접 FW
    for (const w of route.welds) {
      const a = at(w.s);
      if (w.kind === "field") {
        o += `<g><circle class="fw" cx="${r1(a[0])}" cy="${r1(a[1])}" r="6"/><path class="dl" d="M${r1(a[0])} ${r1(a[1] - 6)}L${r1(a[0] + 8)} ${r1(a[1] - 24)}L${r1(a[0] + 22)} ${r1(a[1] - 24)}"/><text class="tx b" x="${r1(a[0] + 24)}" y="${r1(a[1] - 20)}">FW</text></g>`;
      } else o += `<circle class="weld" cx="${r1(a[0])}" cy="${r1(a[1])}" r="3.6"/>`;
    }
    // 치수(작업점~작업점). 이웃 구간과 반대쪽으로 띄운다.
    for (let i = 0; i < n - 1; i++) {
      const a = P[i], b = P[i + 1];
      const d = segScreenDir(i);
      const cands = [[0, 0, 1], [0, 0, -1], [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0]]
        .filter((c) => Math.abs(c[0] * segD[i][0] + c[1] * segD[i][1] + c[2] * segD[i][2]) < 0.5)
        .map((c) => { const v = isoDir(c); const l = Math.hypot(v[0], v[1]); return [v[0] / l, v[1] / l]; });
      const nb = [];
      if (i > 0) { const q = segScreenDir(i - 1); nb.push([-q[0], -q[1]]); }
      if (i < n - 2) nb.push(segScreenDir(i + 1));
      let off = cands[0], best = Infinity;
      for (const c of cands) {
        const score = nb.length ? Math.max(...nb.map((q) => c[0] * q[0] + c[1] * q[1])) : -c[1];
        if (score < best - 1e-6) { best = score; off = c; }
      }
      const g = 40;
      const A = [a[0] + off[0] * g, a[1] + off[1] * g], B = [b[0] + off[0] * g, b[1] + off[1] * g];
      const ang = Math.atan2(d[1], d[0]);
      let ta = (ang * 180) / Math.PI;
      if (ta > 90) ta -= 180;
      if (ta < -90) ta += 180;
      const m = [(A[0] + B[0]) / 2 + off[0] * 10, (A[1] + B[1]) / 2 + off[1] * 10];
      o += `<g class="dim"><path class="dl" d="M${r1(a[0] + off[0] * 8)} ${r1(a[1] + off[1] * 8)}L${r1(A[0] + off[0] * 5)} ${r1(A[1] + off[1] * 5)}M${r1(b[0] + off[0] * 8)} ${r1(b[1] + off[1] * 8)}L${r1(B[0] + off[0] * 5)} ${r1(B[1] + off[1] * 5)}M${r1(A[0])} ${r1(A[1])}L${r1(B[0])} ${r1(B[1])}"/>
        ${arrowAt(A[0], A[1], ang + Math.PI, 6)}${arrowAt(B[0], B[1], ang, 6)}
        <text class="dt" transform="translate(${r1(m[0])} ${r1(m[1])}) rotate(${r1(ta)})" y="4">${Math.round(segL[i])}</text></g>`;
    }
    // 끝 연결과 EL
    const endLabel = (p, lines, dx, anchor) => `<text class="tx" x="${r1(p[0] + dx)}" y="${r1(p[1] + 4)}" text-anchor="${anchor}">${lines.map((t, i) => `<tspan x="${r1(p[0] + dx)}" dy="${i ? 15 : 0}">${esc(t)}</tspan>`).join("")}</text>`;
    const conn = opt.conn || {};
    o += endLabel(P[0], conn.start || [`시작 WP EL+${Math.round(pts[0][2])}`], -14, "end");
    o += endLabel(P[n - 1], conn.end || [`끝 WP EL+${Math.round(pts[n - 1][2])}`], 14, "start");
    for (let i = 0; i < n - 1; i++) {
      if (Math.abs(segD[i][2]) > 0.1) continue;
      const m = [(P[i][0] + P[i + 1][0]) / 2, (P[i][1] + P[i + 1][1]) / 2];
      o += `<text class="tx" x="${r1(m[0])}" y="${r1(m[1] + 22)}" text-anchor="middle" fill="#666666">CL EL+${Math.round(pts[i][2])}</text>`;
    }
    // 흐름 화살표
    for (let i = 0; i < n - 1; i++) {
      const d = segScreenDir(i);
      const m = [(P[i][0] * 0.3 + P[i + 1][0] * 0.7), (P[i][1] * 0.3 + P[i + 1][1] * 0.7)];
      o += arrowAt(m[0], m[1], Math.atan2(d[1], d[0]), 7);
    }
    // 자재 목록 번호 풍선
    const bom = bomOf(prep, lineId);
    bom.forEach((it) => {
      const c = comps.find((x) => it.tags.includes(x.tag));
      if (!c) return;
      const s = c.type === "elbow" ? c.s : c.s + (c.len || 0) / 2;
      const a = at(s);
      const bx = a[0] + (it.no % 2 ? 34 : -34), by = a[1] + (it.no % 3 === 0 ? 40 : -40);
      o += `<g class="sym" data-part="${it.tags[0]}" data-bom="${it.no}"><path class="dl" d="M${r1(a[0])} ${r1(a[1])}L${r1(bx)} ${r1(by)}"/><circle class="bomno" cx="${r1(bx)}" cy="${r1(by)}" r="10"/><text class="tx b" x="${r1(bx)}" y="${r1(by + 4)}" text-anchor="middle">${it.no}</text></g>`;
    });
    // 스풀 표기
    const fw = route.welds.filter((w) => w.kind === "field");
    if (fw.length) {
      const cuts = [0, ...fw.map((w) => w.s), route.length];
      for (let i = 0; i < cuts.length - 1; i++) {
        const a = at((cuts[i] + cuts[i + 1]) / 2 + 60);
        const d = segScreenDir(a[2]);
        const nx = d[1], ny = -d[0];
        const sg = ny > 0 ? 1 : -1;
        o += `<text class="tx" x="${r1(a[0] + nx * 26 * sg)}" y="${r1(a[1] + ny * 26 * sg + 4)}" text-anchor="middle" style="font-style:italic">SPOOL ${esc(lineId)}-0${i + 1}</text>`;
      }
    }
    o += `<g transform="translate(20 540)"><rect class="frame" x="0" y="0" width="720" height="44"/>
      <text class="tx" x="10" y="18">${esc(route.name)} · ISO 1/1 · REV 0 · 축척 없음</text>
      <text class="tx" x="10" y="36" fill="#666666">● 공장 용접(shop weld)  ○FW 현장 용접(field weld)  ‖ 플랜지 결합  숫자 풍선 = 자재 목록 번호</text></g>`;
    o += "</svg>";
    return { svg: o, bom };
  }

  // 자재 목록(BOM). 부품 태그 → 품목 번호
  function bomOf(prep, lineId) {
    const route = prep.routes[lineId];
    const size = route.nps === 0.5 ? '½"' : `${route.nps}"`;
    const comps = route.comps;
    const items = [];
    const add = (desc, spec, qty, unit, tags) => { if (qty > 0) items.push({ no: items.length + 1, desc, spec, qty, unit, tags }); };
    const pipes = comps.filter((c) => c.type === "pipe");
    const pipeLen = pipes.reduce((s, c) => s + c.len, 0) / 1000;
    add(`배관 ${size}`, "SCH40 탄소강 무계목관(예: ASTM A106 Gr.B), BE", Math.round(pipeLen * 100) / 100, "m", pipes.map((c) => c.tag));
    const el = comps.filter((c) => c.type === "elbow");
    add(`90° 엘보 LR ${size}`, "맞대기 용접, ASME B16.9, SCH40", el.length, "EA", el.map((c) => c.tag));
    const fl = comps.filter((c) => c.type === "flange");
    const valves = comps.filter((c) => ["gate", "check", "globe", "ball"].includes(c.type));
    add(`WN 플랜지 ${size}`, "Class 150 RF, ASME B16.5, SCH40 보어", fl.length + valves.length * 2, "EA", fl.map((c) => c.tag));
    const bl = comps.filter((c) => c.type === "blind");
    add(`맹플랜지 ${size}`, "Class 150 RF, ASME B16.5", bl.length, "EA", bl.map((c) => c.tag));
    for (const v of valves) {
      const nm = { gate: "게이트 밸브", check: "스윙 체크 밸브", globe: "글로브 밸브", ball: "볼 밸브" }[v.type];
      add(`${nm} ${size}`, `Class 150 RF 플랜지형 · ${v.tag}`, 1, "EA", [v.tag]);
    }
    const joints = fl.length + valves.length * 2;
    add(`개스킷 ${size}`, "Class 150, 두께 3 mm (현장 등급표 기준)", joints, "EA", []);
    add(`스터드 볼트·너트 ${size}`, "Class 150 플랜지 1조분", joints, "SET", []);
    if (lineId === "1001") add('계기 연결 ½"', "PI-101용 분기(소켓 용접) 1식", 1, "SET", ["1001-BR"]);
    return items;
  }

  function bomTable(bom) {
    return `<table class="tbl bom"><thead><tr><th>번호</th><th>품목</th><th>규격</th><th>수량</th></tr></thead><tbody>
      ${bom.map((it) => `<tr data-bom="${it.no}" data-tags="${it.tags.join(",")}"><td>${it.no}</td><td>${esc(it.desc)}</td><td class="small">${esc(it.spec)}</td><td>${it.qty} ${it.unit}</td></tr>`).join("")}
    </tbody></table>`;
  }

  // ---------------------------------------------------------------- 기호 사전
  const SYMBOLS = [
    { id: "single", title: "단선과 복선", svg: `<path class="t" d="M20 36L220 36M20 64L220 64"/><path class="h" d="M20 50L220 50" style="stroke-dasharray:12 3 2 3"/><text x="226" y="54">복선</text><path class="s" d="M20 96L220 96" style="stroke-width:3.4"/><text x="226" y="100">단선</text>`,
      text: "복선은 관의 바깥지름을 두 선으로, 단선은 중심선 자리에 굵은 선 하나로 그린다. 많은 회사가 작은 관(예: 12\" 이하)은 단선, 큰 관은 복선으로 그리지만 기준은 회사 표준을 따른다.", model: "pipe-elbow-up" },
    { id: "elbow-up", title: "엘보 — 위로(보는 사람 쪽)", svg: `<path class="s" d="M24 60L118 60" style="stroke-width:3.4"/><circle class="t" cx="140" cy="60" r="22" style="stroke-width:2.2"/><text x="176" y="64">관이 원 테두리에서 멈춤</text>`,
      text: "평면도에서 위로 올라가는 관은 원이다. 올라온 관이 엘보를 가리므로 수평관 선이 원의 테두리에서 멈춘다.", model: "pipe-elbow-up" },
    { id: "elbow-down", title: "엘보 — 아래로(보는 사람 반대쪽)", svg: `<path class="s" d="M24 60L140 60" style="stroke-width:3.4"/><circle class="t" cx="140" cy="60" r="22" style="stroke-width:2.2"/><text x="176" y="64">관이 원 중심까지 들어감</text>`,
      text: "아래로 내려가는 관은 엘보 밑에 숨으므로 수평관 선이 원의 중심까지 들어간다. 원을 반원으로 그리는 회사도 있다. 범례를 확인한다.", model: "pipe-elbow-down" },
    { id: "tee-up", title: "티 — 위로 분기", svg: `<path class="s" d="M20 60L118 60M162 60L240 60" style="stroke-width:3.4"/><circle class="t" cx="140" cy="60" r="22" style="stroke-width:2.2"/>`,
      text: "주관 위로 분기가 올라오면 분기의 원이 주관을 가려 주관 선이 원에서 끊긴다.", model: "pipe-tee-valve" },
    { id: "tee-down", title: "티 — 아래로 분기", svg: `<path class="s" d="M20 60L240 60" style="stroke-width:3.4"/><circle class="t" cx="140" cy="60" r="22" style="stroke-width:2.2"/>`,
      text: "분기가 아래로 내려가면 주관이 위에 있어 선이 원을 가로질러 이어진다." },
    { id: "reducer", title: "리듀서 — 동심 / 편심", svg: `<path class="t" d="M16 34L70 34L110 48L150 48M16 86L70 86L110 72L150 72M70 34L70 86M110 48L110 72"/><path class="h" d="M10 60L156 60" style="stroke-dasharray:12 3 2 3"/><path class="t" d="M170 34L210 34L250 58L290 58M170 86L290 86M210 34L210 86M250 58L250 86"/><text x="64" y="108">동심</text><text x="206" y="108">편심(FOB)</text>`,
      text: "동심 리듀서는 중심선을 유지하고, 편심 리듀서는 한쪽 면을 평평하게 맞춘다. 수평관에서 바닥을 맞추면 FOB(관 바닥 평탄), 위를 맞추면 FOT라고 적는다.", model: "pipe-tee-valve" },
    { id: "flange", title: "플랜지 결합", svg: `<path class="s" d="M20 60L112 60M128 60L240 60" style="stroke-width:3.4"/><path class="s" d="M112 40L112 80M128 40L128 80" style="stroke-width:2.2"/>`,
      text: "두 장의 플랜지를 볼트로 조인 자리. 개스킷과 볼트 1조가 함께 자재 목록에 올라간다." },
    { id: "valves", title: "밸브 — 게이트 / 글로브 / 체크 / 볼", svg: `<g transform="translate(0 6)">
      <path class="w" d="M14 44L14 68L34 56Z M54 44L54 68L34 56Z"/><text x="16" y="96">게이트</text>
      <path class="w" d="M74 44L74 68L94 56Z M114 44L114 68L94 56Z"/><circle class="f" cx="94" cy="56" r="4.5"/><text x="76" y="96">글로브</text>
      <path class="w" d="M134 44L134 68L154 56Z"/><path class="f" d="M174 44L174 68L154 56Z"/><text x="140" y="96">체크</text>
      <path class="w" d="M194 44L194 68L214 56Z M234 44L234 68L214 56Z"/><circle class="w" cx="214" cy="56" r="6"/><text x="204" y="96">볼</text></g>`,
      text: "P&ID의 흔한 밸브 기호. 체크 밸브는 흐름 방향이 정해져 있다(이 교재는 하류 쪽 삼각형을 칠함). 회사마다 기호가 조금씩 다르므로 도면의 범례가 이긴다." },
    { id: "shoe", title: "파이프 슈 서포트", svg: `<path class="s" d="M20 40L240 40" style="stroke-width:3.4"/><rect class="t" x="110" y="44" width="40" height="14"/><path class="t" d="M122 58L122 100M138 58L138 100M100 100L160 100"/><text x="170" y="80">입면: 슈 + 기둥</text>`,
      text: "관 밑에 붙는 받침. 평면도와 등각도에 같은 위치·같은 개수로 둔다. P&ID에는 나오지 않는다." },
    { id: "weld", title: "용접 — 공장 / 현장", svg: `<path class="s" d="M20 60L240 60" style="stroke-width:3.4"/><circle class="f" cx="80" cy="60" r="5"/><circle class="w" cx="170" cy="60" r="7"/><path class="t" d="M170 53L180 32L200 32"/><text x="203" y="36">FW</text><text x="56" y="88">공장 용접</text><text x="146" y="88">현장 용접</text>`,
      text: "공장 용접(●)은 스풀 안에서 끝나고, 현장 용접(FW)이 스풀과 스풀을 나눈다. 스풀 번호는 FW를 경계로 매긴다." },
    { id: "inst", title: "계기 원(ISA 5.1)", svg: `<circle class="w" cx="50" cy="56" r="20"/><text x="42" y="60" style="fill:#000">PI</text><text x="22" y="100">현장</text>
      <circle class="w" cx="130" cy="56" r="20"/><path class="t" d="M110 56L150 56"/><text x="104" y="100">중앙 제어실</text>
      <circle class="w" cx="210" cy="56" r="20"/><path class="h" d="M190 56L230 56"/><text x="186" y="100">접근 어려움</text>`,
      text: "첫 글자는 측정 변수(P 압력, T 온도, F 유량, L 레벨), 다음 글자는 기능(I 지시, T 전송, C 조절). 원 안의 가로선은 설치 위치를 말한다." },
    { id: "el", title: "높이 표기 — CL / TOP / BOP", svg: `<circle class="t" cx="80" cy="60" r="30"/><path class="h" d="M30 60L200 60" style="stroke-dasharray:12 3 2 3"/><path class="t" d="M110 30L200 30M110 90L200 90"/><text x="204" y="34">TOP</text><text x="204" y="64">CL</text><text x="204" y="94">BOP</text>`,
      text: "CL은 관 중심, TOP은 관 윗면, BOP는 관 밑면 높이다. BOP = CL − 바깥지름/2. 서포트 높이는 BOP로, 배관 경로는 CL로 말하는 경우가 많다." },
  ];

  ACAD.PipeDraw = { pid, pidKeyOfPart, iso, bomOf, bomTable, SYMBOLS, valveSym };
})();
