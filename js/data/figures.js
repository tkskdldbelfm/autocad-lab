// 레슨 본문에 들어가는 작은 SVG 도해. 선은 검정, 강조는 Twilight, 면 강조는 Hello Yellow 200.
window.ACAD = window.ACAD || {};

(function () {
  const INK = "#000000", MUTED = "#666666", TW = "#136b9a", TWL = "#1d91d0", YEL = "#fdfda1", MOR = "#21a183", DUSK = "#d34621";
  const txt = (x, y, s, o = {}) =>
    `<text x="${x}" y="${y}" font-size="${o.size || 13}" fill="${o.fill || INK}" text-anchor="${o.anchor || "start"}" font-weight="${o.bold ? 700 : 400}" font-family="Noto Sans KR, Malgun Gothic, sans-serif">${s}</text>`;
  const arrowDefs = `<defs>
    <marker id="fa" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0 1 L10 5 L0 9 z" fill="${INK}"/></marker>
    <marker id="fb" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0 1 L10 5 L0 9 z" fill="${TW}"/></marker>
  </defs>`;

  const F = {};

  F.lineTypes = () => {
    const rows = [
      ["굵은 실선", "외형선 — 보이는 모서리", "", 3],
      ["가는 실선", "치수선 · 치수보조선 · 지시선 · 해칭", "", 1],
      ["가는 파선", "숨은선 — 안 보이는 모서리", "10 5", 1.4],
      ["가는 1점 쇄선", "중심선 · 기준선 · 피치선", "22 4 3 4", 1],
      ["가는 2점 쇄선", "가상선 — 움직인 위치, 인접 부품", "22 4 3 4 3 4", 1],
    ];
    return `<svg viewBox="0 0 640 ${rows.length * 48 + 8}" role="img" aria-label="선의 종류">
      ${rows.map(([n, use, dash, w], i) => {
        const y = 28 + i * 48;
        return `<line x1="16" y1="${y}" x2="220" y2="${y}" stroke="${INK}" stroke-width="${w}" ${dash ? `stroke-dasharray="${dash}"` : ""}/>
          ${txt(240, y - 4, n, { bold: true })}${txt(240, y + 14, use, { fill: MUTED, size: 12 })}`;
      }).join("")}
    </svg>`;
  };

  F.coords = () => `<svg viewBox="0 0 640 350" role="img" aria-label="좌표 입력 방식">
    ${arrowDefs}
    <line x1="40" y1="260" x2="600" y2="260" stroke="${MUTED}" marker-end="url(#fa)"/>
    <line x1="40" y1="260" x2="40" y2="20" stroke="${MUTED}" marker-end="url(#fa)"/>
    ${txt(592, 284, "X", { fill: MUTED })}${txt(24, 28, "Y", { fill: MUTED })}${txt(28, 282, "0,0", { fill: MUTED, size: 12 })}
    <circle cx="140" cy="200" r="4" fill="${INK}"/>${txt(96, 222, "A (100,60)", { size: 12 })}
    <line x1="140" y1="200" x2="340" y2="200" stroke="${TW}" stroke-width="2" marker-end="url(#fb)"/>
    <line x1="340" y1="200" x2="340" y2="120" stroke="${TW}" stroke-width="2" marker-end="url(#fb)"/>
    ${txt(200, 192, "@200,0", { fill: TW, bold: true })}${txt(348, 164, "@0,80", { fill: TW, bold: true })}
    <circle cx="340" cy="120" r="4" fill="${INK}"/>
    <line x1="340" y1="120" x2="480" y2="39" stroke="${DUSK}" stroke-width="2" marker-end="url(#fa)"/>
    <path d="M 400 120 A 60 60 0 0 0 392 90" fill="none" stroke="${DUSK}"/>
    <line x1="340" y1="120" x2="420" y2="120" stroke="${DUSK}" stroke-dasharray="4 4"/>
    ${txt(408, 108, "30°", { fill: DUSK, size: 12 })}${txt(430, 58, "@160&lt;30", { fill: DUSK, bold: true })}
    ${txt(40, 306, "절대좌표 x,y — 원점(0,0)에서 잰 위치", { size: 12 })}
    ${txt(40, 324, "상대좌표 @dx,dy — 직전 점에서 잰 거리", { size: 12, fill: TW })}
    ${txt(40, 342, "상대극좌표 @길이&lt;각도 — 직전 점에서 길이와 방향", { size: 12, fill: DUSK })}
  </svg>`;

  F.angles = () => `<svg viewBox="0 0 640 240" role="img" aria-label="AutoCAD 각도 기준">
    ${arrowDefs}
    <circle cx="160" cy="120" r="90" fill="none" stroke="${MUTED}" stroke-dasharray="3 4"/>
    ${[0, 90, 180, 270].map((a) => {
      const r = (a * Math.PI) / 180, x = 160 + 90 * Math.cos(r), y = 120 - 90 * Math.sin(r);
      return `<line x1="160" y1="120" x2="${x}" y2="${y}" stroke="${INK}" marker-end="url(#fa)"/>${txt(160 + 112 * Math.cos(r), 124 - 110 * Math.sin(r), a + "°", { anchor: "middle", bold: true })}`;
    }).join("")}
    <path d="M 210 120 A 50 50 0 0 0 160 70" fill="none" stroke="${TW}" stroke-width="2" marker-end="url(#fb)"/>
    ${txt(196, 84, "+", { fill: TW, bold: true, size: 16 })}
    ${txt(320, 80, "0° = 오른쪽(동쪽, X+ 방향)", { bold: true })}
    ${txt(320, 104, "반시계 방향이 + 각도")}
    ${txt(320, 128, "시계 방향은 − 각도 (예: @100&lt;-90 = 아래로 100)")}
    ${txt(320, 160, "도면 위쪽이 늘 90°. 북쪽 표시와는 따로 봅니다.", { fill: MUTED, size: 12 })}
  </svg>`;

  F.windowCrossing = () => {
    const shapes = (ox, fillSel) => `
      <rect x="${ox + 30}" y="60" width="60" height="50" fill="${fillSel[0] ? YEL : "none"}" stroke="${INK}" stroke-width="2"/>
      <circle cx="${ox + 150}" cy="90" r="28" fill="${fillSel[1] ? YEL : "none"}" stroke="${INK}" stroke-width="2"/>
      <line x1="${ox + 200}" y1="40" x2="${ox + 270}" y2="140" stroke="${fillSel[2] ? TWL : INK}" stroke-width="${fillSel[2] ? 4 : 2}"/>`;
    return `<svg viewBox="0 0 640 230" role="img" aria-label="윈도우 선택과 걸침 선택">
      ${shapes(0, [1, 1, 0])}
      <rect x="16" y="44" width="200" height="84" fill="rgba(29,145,208,0.12)" stroke="${TWL}" stroke-width="1.5"/>
      ${txt(16, 164, "윈도우: 왼쪽 → 오른쪽으로 끌기", { bold: true })}
      ${txt(16, 184, "실선 파란 상자. 완전히 들어온 것만 선택", { size: 12, fill: MUTED })}
      ${txt(16, 202, "→ 사각형, 원 선택 / 사선은 제외", { size: 12, fill: TW })}
      ${shapes(330, [1, 1, 1])}
      <rect x="346" y="44" width="200" height="84" fill="rgba(42,208,169,0.14)" stroke="${MOR}" stroke-width="1.5" stroke-dasharray="6 4"/>
      ${txt(346, 164, "걸침(크로싱): 오른쪽 → 왼쪽으로 끌기", { bold: true })}
      ${txt(346, 184, "점선 초록 상자. 조금이라도 걸치면 선택", { size: 12, fill: MUTED })}
      ${txt(346, 202, "→ 사각형, 원, 사선까지 모두 선택", { size: 12, fill: TW })}
    </svg>`;
  };

  F.osnapMarkers = () => {
    const items = [
      ["끝점 END", (x, y) => `<rect x="${x - 7}" y="${y - 7}" width="14" height="14" fill="none" stroke="${TW}" stroke-width="2"/>`],
      ["중간점 MID", (x, y) => `<path d="M${x - 8} ${y + 6} L${x} ${y - 8} L${x + 8} ${y + 6} Z" fill="none" stroke="${TW}" stroke-width="2"/>`],
      ["중심 CEN", (x, y) => `<circle cx="${x}" cy="${y}" r="8" fill="none" stroke="${TW}" stroke-width="2"/>`],
      ["사분점 QUA", (x, y) => `<path d="M${x} ${y - 9} L${x + 9} ${y} L${x} ${y + 9} L${x - 9} ${y} Z" fill="none" stroke="${TW}" stroke-width="2"/>`],
      ["교차점 INT", (x, y) => `<path d="M${x - 7} ${y - 7} L${x + 7} ${y + 7} M${x + 7} ${y - 7} L${x - 7} ${y + 7}" stroke="${TW}" stroke-width="2.5"/>`],
      ["직교 PER", (x, y) => `<path d="M${x - 8} ${y + 7} L${x + 8} ${y + 7} M${x - 8} ${y + 7} L${x - 8} ${y - 8} M${x - 8} ${y} L${x} ${y} L${x} ${y + 7}" fill="none" stroke="${TW}" stroke-width="2"/>`],
      ["접점 TAN", (x, y) => `<circle cx="${x}" cy="${y}" r="7" fill="none" stroke="${TW}" stroke-width="2"/><line x1="${x - 9}" y1="${y - 8}" x2="${x + 9}" y2="${y - 8}" stroke="${TW}" stroke-width="2"/>`],
      ["근처점 NEA", (x, y) => `<path d="M${x - 7} ${y - 7} L${x + 7} ${y - 7} L${x - 7} ${y + 7} L${x + 7} ${y + 7} Z" fill="none" stroke="${TW}" stroke-width="2"/>`],
    ];
    return `<svg viewBox="0 0 640 120" role="img" aria-label="객체 스냅 표식">
      ${items.map(([n, m], i) => { const x = 40 + i * 78; return `${m(x, 40)}${txt(x, 84, n.split(" ")[0], { anchor: "middle", size: 12, bold: true })}${txt(x, 102, n.split(" ")[1], { anchor: "middle", size: 11, fill: MUTED })}`; }).join("")}
    </svg>`;
  };

  F.thirdAngle = () => `<svg viewBox="0 0 640 320" role="img" aria-label="제3각법 배치">
    ${[["평면도", 180, 20], ["정면도", 180, 130], ["우측면도", 330, 130], ["좌측면도", 30, 130], ["저면도", 180, 240]].map(([n, x, y], i) =>
      `<rect x="${x}" y="${y}" width="130" height="80" fill="${i < 3 ? YEL : "none"}" stroke="${INK}" stroke-width="${i < 3 ? 2 : 1}" ${i < 3 ? "" : 'stroke-dasharray="5 4"'}/>${txt(x + 65, y + 45, n, { anchor: "middle", bold: i < 3, fill: i < 3 ? INK : MUTED })}`
    ).join("")}
    ${txt(480, 60, "제3각법 (KS 기계제도 원칙)", { bold: true })}
    ${txt(480, 84, "본 쪽에 그 그림을 둔다", { size: 12 })}
    ${txt(480, 104, "위에서 본 것 → 위에", { size: 12, fill: MUTED })}
    ${txt(480, 124, "오른쪽에서 본 것 → 오른쪽에", { size: 12, fill: MUTED })}
    ${txt(480, 160, "노란 세 장이 '3면도'", { size: 12, fill: TW, bold: true })}
    ${txt(480, 200, "제1각법은 반대: 평면도가", { size: 12 })}
    ${txt(480, 220, "정면도 아래, 우측면도가 왼쪽", { size: 12 })}
  </svg>`;

  F.alignRule = () => `<svg viewBox="0 0 640 300" role="img" aria-label="3면도 치수 일치 규칙">
    <rect x="60" y="20" width="200" height="80" fill="none" stroke="${INK}" stroke-width="2"/>${txt(160, 64, "평면도", { anchor: "middle", bold: true })}
    <rect x="60" y="160" width="200" height="110" fill="none" stroke="${INK}" stroke-width="2"/>${txt(160, 220, "정면도", { anchor: "middle", bold: true })}
    <rect x="320" y="160" width="80" height="110" fill="none" stroke="${INK}" stroke-width="2"/>${txt(360, 220, "우측면도", { anchor: "middle", bold: true, size: 12 })}
    <line x1="60" y1="100" x2="60" y2="160" stroke="${TW}" stroke-dasharray="4 4"/><line x1="260" y1="100" x2="260" y2="160" stroke="${TW}" stroke-dasharray="4 4"/>
    ${txt(160, 136, "폭(가로)이 같다", { anchor: "middle", fill: TW, bold: true, size: 12 })}
    <line x1="260" y1="160" x2="320" y2="160" stroke="${DUSK}" stroke-dasharray="4 4"/><line x1="260" y1="270" x2="320" y2="270" stroke="${DUSK}" stroke-dasharray="4 4"/>
    ${txt(290, 292, "높이가 같다", { anchor: "middle", fill: DUSK, bold: true, size: 12 })}
    <path d="M 260 20 L 360 20 A 0 0 0 0 1 360 20 L 360 160" fill="none" stroke="${MOR}" stroke-dasharray="4 4"/>
    <path d="M 260 100 L 320 100 L 320 160" fill="none" stroke="${MOR}" stroke-dasharray="4 4"/>
    <line x1="320" y1="100" x2="400" y2="20" stroke="${MOR}"/>
    ${txt(420, 60, "깊이가 같다 (평면도 세로 = 우측면도 가로)", { fill: MOR, bold: true, size: 12 })}
    ${txt(420, 90, "45° 보조선으로 옮기면 정확합니다", { size: 12, fill: MUTED })}
  </svg>`;

  F.lineNumber = () => {
    const parts = [["4\"", "호칭경", "NPS 4 = DN100"], ["CW", "유체 기호", "냉각수"], ["1001", "라인 번호", "고유 번호"], ["A1A", "배관 등급", "재질·등급·스케줄 묶음"], ["CS", "재질", "탄소강"]];
    let x = 20;
    return `<svg viewBox="0 0 640 150" role="img" aria-label="라인 번호 분해">
      ${parts.map(([v, n, d], i) => {
        const w = 104, cx = x + w / 2; const out = `<rect x="${x}" y="20" width="${w}" height="44" fill="${i === 2 ? YEL : "#f5f5f0"}" stroke="${INK}"/>${txt(cx, 48, v, { anchor: "middle", bold: true, size: 18 })}${txt(cx, 88, n, { anchor: "middle", bold: true, size: 12 })}${txt(cx, 106, d, { anchor: "middle", size: 11, fill: MUTED })}`;
        x += w + 20; return out + (i < 4 ? txt(x - 10, 48, "-", { anchor: "middle", size: 18 }) : "");
      }).join("")}
      ${txt(20, 138, "칸의 순서와 기호는 프로젝트마다 다릅니다. 라인 번호 규칙서(Line designation)를 먼저 찾으세요.", { size: 12, fill: MUTED })}
    </svg>`;
  };

  F.elevation = () => `<svg viewBox="0 0 640 260" role="img" aria-label="배관 높이 표기">
    <line x1="20" y1="230" x2="620" y2="230" stroke="${INK}" stroke-width="2"/>
    ${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map((i) => `<line x1="${24 + i * 38}" y1="230" x2="${12 + i * 38}" y2="242" stroke="${INK}"/>`).join("")}
    ${txt(24, 252, "바닥 EL 100000 (FFL)", { size: 11, fill: MUTED })}
    <rect x="120" y="96" width="360" height="48" fill="#f5f5f0" stroke="${INK}" stroke-width="2"/>
    <line x1="100" y1="120" x2="500" y2="120" stroke="${INK}" stroke-dasharray="22 4 3 4"/>
    <line x1="480" y1="96" x2="560" y2="96" stroke="${TW}"/><line x1="480" y1="144" x2="560" y2="144" stroke="${TW}"/><line x1="500" y1="120" x2="560" y2="120" stroke="${TW}"/>
    ${txt(566, 100, "TOP EL 101257", { size: 12, fill: TW, bold: true })}
    ${txt(566, 124, "CL EL 101200", { size: 12, fill: TW, bold: true })}
    ${txt(566, 148, "BOP EL 101143", { size: 12, fill: TW, bold: true })}
    ${txt(140, 84, "4\" 배관 (OD 114.3)", { size: 12 })}
    <line x1="300" y1="144" x2="300" y2="230" stroke="${MUTED}" stroke-dasharray="4 4"/>${txt(308, 196, "받침 높이는 BOP로 잽니다", { size: 12, fill: MUTED })}
    ${txt(20, 24, "CL = 관 중심, TOP = 관 윗면, BOP = 관 밑면. 바닥을 100000으로 두면 음수 높이가 생기지 않습니다(프로젝트 규칙에 따름).", { size: 12 })}
  </svg>`;

  F.isoAxes = () => `<svg viewBox="0 0 640 240" role="img" aria-label="등각 축">
    ${arrowDefs}
    <line x1="200" y1="140" x2="200" y2="30" stroke="${INK}" stroke-width="2" marker-end="url(#fa)"/>${txt(208, 40, "위 (Up)", { bold: true })}
    <line x1="200" y1="140" x2="330" y2="215" stroke="${INK}" stroke-width="2" marker-end="url(#fa)"/>${txt(300, 234, "동 (E) 330°", { bold: true })}
    <line x1="200" y1="140" x2="70" y2="215" stroke="${INK}" stroke-width="2" marker-end="url(#fa)"/>${txt(40, 234, "남 (S) 210°", { bold: true })}
    <line x1="200" y1="140" x2="330" y2="65" stroke="${MUTED}" stroke-dasharray="5 4"/>${txt(300, 60, "북 (N) 30°", { fill: MUTED })}
    <path d="M 250 140 A 50 50 0 0 0 243 115" fill="none" stroke="${TW}"/><line x1="200" y1="140" x2="260" y2="140" stroke="${TW}" stroke-dasharray="3 3"/>${txt(264, 132, "30°", { fill: TW, size: 12 })}
    ${txt(400, 80, "수직은 수직 그대로", { bold: true })}
    ${txt(400, 104, "수평 방향은 30° 기울인 두 축", { size: 13 })}
    ${txt(400, 128, "길이는 재지 않고 치수로 읽는다", { size: 13 })}
    ${txt(400, 160, "북쪽 방향은 도면마다 표시를 확인", { size: 12, fill: MUTED })}
  </svg>`;

  F.fileTypes = () => `<svg viewBox="0 0 640 150" role="img" aria-label="CAD 파일 흐름">
    ${arrowDefs}
    ${[["DWT", "템플릿", 20], ["DWG", "작업 도면", 180], ["BAK", "직전 저장본", 340], ["DXF · PDF", "교환 · 배포", 490]].map(([a, b, x], i) =>
      `<rect x="${x}" y="30" width="130" height="60" fill="${i === 1 ? YEL : "#f5f5f0"}" stroke="${INK}" stroke-width="${i === 1 ? 2 : 1}"/>${txt(x + 65, 58, a, { anchor: "middle", bold: true, size: 16 })}${txt(x + 65, 78, b, { anchor: "middle", size: 12, fill: MUTED })}`).join("")}
    <line x1="150" y1="60" x2="178" y2="60" stroke="${INK}" marker-end="url(#fa)"/>
    <line x1="310" y1="60" x2="338" y2="60" stroke="${INK}" marker-end="url(#fa)"/>
    <path d="M 310 80 C 400 130, 440 130, 488 80" fill="none" stroke="${INK}" marker-end="url(#fa)"/>
    ${txt(20, 130, "새 도면은 DWT에서 시작 → DWG에 저장할 때마다 이전 판이 BAK로 남음 → 밖으로 보낼 땐 DXF·PDF", { size: 12 })}
  </svg>`;

  F.stretch = () => `<svg viewBox="0 0 640 180" role="img" aria-label="신축 명령">
    <rect x="30" y="50" width="200" height="80" fill="none" stroke="${INK}" stroke-width="2"/>
    <rect x="180" y="30" width="90" height="120" fill="rgba(42,208,169,0.14)" stroke="${MOR}" stroke-dasharray="6 4"/>
    ${txt(30, 170, "걸침 창에 든 꼭짓점만 움직인다", { size: 12 })}
    <path d="M 290 90 L 330 90" stroke="${INK}" stroke-width="2" marker-end="url(#fa)"/>${arrowDefs}
    <rect x="360" y="50" width="260" height="80" fill="none" stroke="${INK}" stroke-width="2"/>
    <circle cx="560" cy="50" r="4" fill="${TW}"/><circle cx="560" cy="130" r="4" fill="${TW}"/>
    ${txt(360, 170, "오른쪽 두 꼭짓점만 이동 → 가로가 늘어남", { size: 12, fill: TW })}
  </svg>`;

  F.pidVsIso = () => `<svg viewBox="0 0 640 200" role="img" aria-label="도면 종류별 질문">
    ${[["PFD", "무엇을 얼마나?"], ["P&ID", "무엇이 무엇에 연결?"], ["배치도", "장치는 어디에?"], ["평면·입면", "배관은 어디로, 몇 높이로?"], ["아이소", "한 라인을 몇 mm로, 무슨 부품으로?"]].map(([n, q], i) => {
      const x = 16 + i * 124;
      return `<rect x="${x}" y="30" width="112" height="70" fill="${i === 1 || i === 4 ? YEL : "#f5f5f0"}" stroke="${INK}"/>${txt(x + 56, 72, n, { anchor: "middle", bold: true, size: 15 })}${txt(x + 56, 124, q.length > 10 ? q.slice(0, 9) : q, { anchor: "middle", size: 11 })}${q.length > 10 ? txt(x + 56, 140, q.slice(9), { anchor: "middle", size: 11 }) : ""}`;
    }).join("")}
    ${txt(16, 180, "축척이 있는 도면: 배치도, 평면·입면. 축척이 없는 도면: PFD, P&ID, 아이소.", { size: 12, fill: MUTED })}
  </svg>`;

  ACAD.figures = F;
})();
