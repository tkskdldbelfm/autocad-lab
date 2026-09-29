// 도면 검토: 오류가 숨은 도면에서 틀린 곳을 클릭해 찾는다.
(function () {
  const { h, esc, link, progress, store } = ACAD;

  // ---- 작도 도우미 ----
  const ST = {
    vis: 'stroke="#000" stroke-width="2.4" fill="none" stroke-linejoin="round"',
    pipe: 'stroke="#000" stroke-width="4" fill="none" stroke-linejoin="round"',
    thin: 'stroke="#000" stroke-width="1" fill="none"',
    hid: 'stroke="#000" stroke-width="1.3" stroke-dasharray="8 5" fill="none"',
    cen: 'stroke="#000" stroke-width="1" stroke-dasharray="22 4 3 4" fill="none"',
    grid: 'stroke="#858585" stroke-width="1" stroke-dasharray="22 4 3 4" fill="none"',
  };
  const L = (x1, y1, x2, y2, s = "vis") => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" ${ST[s]}/>`;
  const P = (d, s = "vis") => `<path d="${d}" ${ST[s]}/>`;
  const T = (x, y, t, o = {}) =>
    `<text x="${x}" y="${y}" font-size="${o.size || 14}" text-anchor="${o.anchor || "middle"}" font-weight="${o.bold ? 700 : 400}" fill="${o.fill || "#000"}" ${o.rot ? `transform="rotate(${o.rot} ${x} ${y})"` : ""} font-family="Noto Sans KR, Malgun Gothic, sans-serif">${t}</text>`;
  const defs = `<defs><marker id="rv-ar" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="9" markerHeight="9" orient="auto-start-reverse"><path d="M0 2 L10 5 L0 8 z" fill="#000"/></marker>
    <pattern id="rv-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" stroke="#666" stroke-width="1.5"/></pattern></defs>`;
  const dimH = (x1, x2, y, yRef, label) =>
    L(x1, yRef + (y > yRef ? 4 : -4), x1, y + (y > yRef ? 6 : -6), "thin") + L(x2, yRef + (y > yRef ? 4 : -4), x2, y + (y > yRef ? 6 : -6), "thin") +
    `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="#000" stroke-width="1" marker-start="url(#rv-ar)" marker-end="url(#rv-ar)"/>` + T((x1 + x2) / 2, y - 6, label);
  const dimV = (y1, y2, x, xRef, label) =>
    L(xRef + (x > xRef ? 4 : -4), y1, x + (x > xRef ? 6 : -6), y1, "thin") + L(xRef + (x > xRef ? 4 : -4), y2, x + (x > xRef ? 6 : -6), y2, "thin") +
    `<line x1="${x}" y1="${y1}" x2="${x}" y2="${y2}" stroke="#000" stroke-width="1" marker-start="url(#rv-ar)" marker-end="url(#rv-ar)"/>` + T(x - 8, (y1 + y2) / 2, label, { rot: -90 });
  const gate = (x, y, vertical = false) => vertical
    ? `<path d="M${x - 9} ${y - 12} L${x + 9} ${y - 12} L${x - 9} ${y + 12} L${x + 9} ${y + 12} Z" fill="#fff" stroke="#000" stroke-width="2"/>`
    : `<path d="M${x - 12} ${y - 9} L${x - 12} ${y + 9} L${x + 12} ${y - 9} L${x + 12} ${y + 9} Z" fill="#fff" stroke="#000" stroke-width="2"/>`;
  const check = (x, y) => `<path d="M${x - 12} ${y - 9} L${x - 12} ${y + 9} L${x + 12} ${y - 9} L${x + 12} ${y + 9} Z" fill="#fff" stroke="#000" stroke-width="2"/><path d="M${x} ${y} L${x + 12} ${y - 9} L${x + 12} ${y + 9} Z" fill="#000"/>`;
  const frame = (w, hgt) => `<rect x="12" y="12" width="${w - 24}" height="${hgt - 24}" fill="#fff" stroke="#000" stroke-width="3"/>`;
  const cell = (x, y, w, hh, label, value, o = {}) =>
    `<rect x="${x}" y="${y}" width="${w}" height="${hh}" fill="none" stroke="#000" stroke-width="1.5"/>` +
    T(x + 6, y + 14, label, { size: 11, anchor: "start", fill: "#666" }) + T(x + 6, y + hh - 9, value, { size: o.size || 16, anchor: "start", bold: o.bold });

  // ---- 시트 ----
  const sheets = [
    {
      id: "r1", stage: "1", level: "신입", title: "부품도 검토: 계단 블록 PT-001",
      intro: "제3각법 부품도입니다. 3면도끼리 치수가 맞는지, 선 종류가 맞는지, 표제란이 채워졌는지 보세요. 오류 5개.",
      hint: "치수 일치(폭·높이·깊이) → 선 종류(숨은선·중심선) → 중복 치수 → 표제란 순서로 보세요.",
      w: 1200, h: 800,
      svg() {
        return frame(1200, 800) +
          // 정면도
          P("M200 520 H400 V480 H300 V420 H200 Z") + L(334, 480, 334, 520, "hid") + L(366, 480, 366, 520, "hid") + L(350, 466, 350, 534, "cen") +
          // 평면도 (중심선 누락)
          P("M200 180 H400 V300 H200 Z") + L(300, 180, 300, 300) + `<circle cx="350" cy="240" r="16" ${ST.vis}/>` +
          // 우측면도 (숨은선을 실선으로 그린 오류)
          P("M480 420 H600 V520 H480 Z") + L(480, 480, 600, 480) + L(524, 480, 524, 520) + L(556, 480, 556, 520) + L(540, 466, 540, 534, "cen") +
          // 치수
          dimH(200, 400, 568, 520, "100") + dimV(420, 520, 160, 200, "50") + dimV(480, 520, 440, 400, "20") +
          dimV(180, 300, 160, 200, "60") + dimH(200, 400, 146, 180, "120") + dimV(420, 520, 648, 600, "50") +
          L(361, 229, 420, 196, "thin") + L(420, 196, 468, 196, "thin") + T(444, 190, "Ø16") +
          T(300, 330, "평면도", { size: 12, fill: "#666" }) + T(300, 610, "정면도", { size: 12, fill: "#666" }) + T(540, 610, "우측면도", { size: 12, fill: "#666" }) +
          // 표제란
          cell(760, 620, 400, 44, "도면명", "계단 블록", { bold: true }) +
          cell(760, 664, 200, 44, "도면 번호", "PT-001") + cell(960, 664, 200, 44, "척도", "") +
          cell(760, 708, 200, 60, "투상법", "제3각법") + cell(960, 708, 100, 60, "개정", "0") + cell(1060, 708, 100, 60, "작성", "김신입", { size: 14 }) +
          `<g transform="translate(900 740)" fill="none" stroke="#000" stroke-width="1.5"><path d="M-22 -8 L-8 -12 L-8 12 L-22 8 Z"/><circle cx="12" cy="0" r="12"/><circle cx="12" cy="0" r="5"/></g>` +
          T(60, 60, "기계 부품도 · 단위 mm", { anchor: "start", size: 13, fill: "#666" });
      },
      errors: [
        { x: 300, y: 140, r: 44, label: "평면도 폭 치수 120 ≠ 정면도 폭 100", why: "평면도와 정면도는 폭이 같아야 합니다. 그림 폭도 100입니다. 게다가 폭 치수는 정면도에 이미 있으니 한쪽은 지웁니다." },
        { x: 540, y: 500, r: 40, label: "우측면도의 구멍 윤곽이 실선", why: "우측면도에서 구멍은 보이지 않으므로 숨은선(파선)이어야 합니다." },
        { x: 350, y: 240, r: 36, label: "평면도 구멍에 중심선 없음", why: "원(구멍)에는 가로·세로 중심선을 그립니다. 정면도·우측면도에는 있는데 평면도에만 빠졌습니다." },
        { x: 648, y: 470, r: 40, label: "높이 50 중복 치수", why: "높이 50은 정면도에 이미 있습니다. 같은 치수를 두 번 적지 않습니다." },
        { x: 1060, y: 686, r: 44, label: "표제란 척도 칸이 비어 있음", why: "척도(예: 1:2) 또는 NS를 적어야 합니다. 표제란은 선보다 먼저 읽는 곳입니다." },
      ],
    },
    {
      id: "r2", stage: "3", level: "3년차 · 5년차", title: "배관 평면도 검토: CW-PL-001",
      intro: "냉각수 스키드 배관 평면도(단선)입니다. 왼쪽 아래 라인 리스트와 대조하고, 간섭·흐름·높이·치수·연결 표시를 보세요. 오류 6개.",
      hint: "라인 리스트 대조 → 흐름 방향 → EL로 포켓 찾기 → 기둥과 겹침 → 치수 합 → 매치라인 순서로 보세요.",
      w: 1200, h: 800,
      svg() {
        const cols = [["A", 150], ["B", 560], ["C", 980]], rows = [["1", 140], ["2", 460]];
        let s = frame(1200, 800);
        cols.forEach(([n, x]) => { s += L(x, 86, x, 620, "grid") + `<circle cx="${x}" cy="66" r="18" fill="#fff" stroke="#000" stroke-width="1.5"/>` + T(x, 71, n, { bold: true }); });
        rows.forEach(([n, y]) => { s += L(96, y, 1090, y, "grid") + `<circle cx="72" cy="${y}" r="18" fill="#fff" stroke="#000" stroke-width="1.5"/>` + T(72, y + 5, n, { bold: true }); });
        cols.forEach(([, x]) => rows.forEach(([, y]) => { s += `<rect x="${x - 12}" y="${y - 12}" width="24" height="24" fill="url(#rv-hatch)" stroke="#000" stroke-width="1.5"/>`; }));
        // 장치
        s += `<rect x="200" y="430" width="90" height="60" fill="#f5f5f0" stroke="#000" stroke-width="2"/>` + T(245, 520, "P-101", { bold: true });
        s += `<rect x="520" y="430" width="0" height="0"/>`;
        s += `<rect x="680" y="436" width="160" height="48" rx="24" fill="#f5f5f0" stroke="#000" stroke-width="2"/>` + T(760, 516, "E-201", { bold: true });
        s += `<circle cx="1040" cy="300" r="50" fill="#f5f5f0" stroke="#000" stroke-width="2"/>` + T(1040, 305, "TK-301", { bold: true });
        // 1001: 기둥 B2를 관통 (오류)
        s += L(290, 460, 680, 460, "pipe") + gate(430, 460) + `<path d="M500 460 l-14 -7 v14 z" fill="#000"/>`;
        s += T(360, 446, "4\"-CW-1001-A1A-CS", { size: 13, bold: true }) + T(620, 446, "EL 101200", { size: 12 });
        // 1002: 크기 오류, 흐름 반대, 포켓
        s += P("M840 460 H940 V300 H990", "pipe");
        s += `<path d="M872 460 l14 -7 v14 z" fill="#000"/>`;
        s += `<circle cx="940" cy="430" r="7" fill="#fff" stroke="#000" stroke-width="2"/><circle cx="940" cy="330" r="7" fill="#fff" stroke="#000" stroke-width="2"/>`;
        s += T(915, 380, "4\"-CW-1002-A1A-CS", { size: 13, bold: true, rot: -90 });
        s += T(890, 486, "EL 101200", { size: 12 }) + T(1000, 384, "EL 100600", { size: 12 }) + T(1010, 250, "EL 101200", { size: 12 });
        // 1003
        s += L(1040, 350, 1040, 580, "pipe") + gate(1040, 500, true) + T(1066, 470, "1\"-CW-1003-A1A-CS", { size: 12, bold: true, rot: 90 }) + T(1040, 604, "EL 100300", { size: 12 });
        // 치수 사슬 (합계 오류)
        s += dimH(290, 430, 560, 470, "700") + dimH(430, 680, 560, 470, "1250") + dimH(290, 680, 600, 470, "2150");
        // 매치라인 (도면 번호 없음)
        s += L(1120, 60, 1120, 640, "cen") + T(1140, 350, "MATCH LINE · 도면 번호 ―", { size: 13, bold: true, rot: 90 });
        // 북쪽
        s += `<g transform="translate(1060 110)"><circle r="22" fill="none" stroke="#000" stroke-width="1.5"/><path d="M0 -30 L8 6 L0 0 L-8 6 Z" fill="#000"/></g>` + T(1060, 150, "PN", { size: 12, bold: true });
        // 라인 리스트
        s += `<rect x="40" y="652" width="360" height="116" fill="#fff" stroke="#000" stroke-width="1.5"/>` + T(52, 674, "라인 리스트 (P&amp;ID 기준)", { anchor: "start", bold: true, size: 13 });
        [["1001", "4\"", "P-101 → E-201"], ["1002", "3\"", "E-201 → TK-301"], ["1003", "1\"", "TK-301 드레인"]].forEach(([n, sz, r], i) => {
          s += T(52, 700 + i * 22, n, { anchor: "start", size: 13 }) + T(120, 700 + i * 22, sz, { anchor: "start", size: 13, bold: true }) + T(170, 700 + i * 22, r, { anchor: "start", size: 13 });
        });
        s += cell(820, 680, 340, 44, "도면", "배관 평면도 CW-PL-001", { bold: true, size: 15 }) + cell(820, 724, 170, 44, "개정", "1") + cell(990, 724, 170, 44, "척도", "1:25");
        s += T(440, 700, "○ 위치에서 배관이 위/아래로 꺾임 (교재 범례)", { anchor: "start", size: 12, fill: "#666" });
        return s;
      },
      errors: [
        { x: 915, y: 380, r: 30, label: "라인 1002 크기 4\" ≠ 라인 리스트 3\"", why: "라인 리스트와 P&ID에서 1002는 3\"입니다. 라인 번호의 호칭경이 틀리면 자재가 통째로 틀립니다." },
        { x: 878, y: 460, r: 30, label: "1002 흐름 화살표가 반대 (서쪽)", why: "냉각수는 열교환기에서 탱크로 갑니다. 화살표는 동쪽(탱크 쪽)이어야 합니다." },
        { x: 1000, y: 380, r: 30, label: "EL 100600 구간 포켓에 드레인 없음", why: "EL 101200 → 100600 → 101200으로 내려갔다 올라오는 U자 포켓입니다. 액체가 고이는 저점에는 드레인이 필요합니다. 포켓을 없애도록 경로를 바꾸는 것이 먼저입니다." },
        { x: 560, y: 460, r: 34, label: "라인 1001이 기둥 B-2를 관통", why: "배관 중심선이 기둥 위를 지나갑니다. 하드 간섭입니다. 경로나 높이를 바꾸고 치수·아이소를 같이 고칩니다." },
        { x: 485, y: 594, r: 34, label: "치수 합 700 + 1250 = 1950 ≠ 2150", why: "부분 치수의 합이 전체 치수와 다릅니다. 어느 쪽이 맞는지 모델이나 설계 근거로 확인합니다." },
        { x: 1140, y: 350, r: 44, label: "매치라인에 이어지는 도면 번호 없음", why: "매치라인에는 연결되는 도면 번호를 적어야 다음 도면을 찾을 수 있습니다." },
      ],
    },
    {
      id: "r3", stage: "4", level: "10년차", title: "세트 검토: P&ID ↔ 아이소 1001 ↔ BOM",
      intro: "P&ID 발췌와 라인 1001 아이소, 부품 목록, 참조 도면을 함께 봅니다. 기준 목록(P&ID)을 뽑고 아이소에서 하나씩 지워 나가세요. 오류 5개.",
      hint: "P&ID의 밸브·드레인 목록 → 아이소 표제의 라인 번호 → BOM 수량(플랜지 이음 수) → 참조 도면 개정 순서로 보세요.",
      w: 1200, h: 800,
      svg() {
        let s = frame(1200, 800);
        s += L(580, 30, 580, 770, "thin");
        // P&ID
        s += T(40, 60, "P&amp;ID 발췌 · CW-PID-001 Rev 1", { anchor: "start", bold: true, size: 15 });
        s += `<circle cx="110" cy="420" r="32" fill="#fff" stroke="#000" stroke-width="2"/><path d="M110 388 L142 420" stroke="#000" stroke-width="2"/>` + T(110, 480, "P-101", { bold: true });
        s += L(142, 420, 480, 420, "vis") + check(200, 420) + gate(290, 420);
        s += L(240, 420, 240, 500, "thin") + gate(240, 470, true) + T(262, 520, "¾\" 드레인", { size: 12, anchor: "start" });
        s += L(370, 420, 370, 372, "thin") + `<circle cx="370" cy="350" r="22" fill="#fff" stroke="#000" stroke-width="1.5"/>` + T(370, 346, "PI", { size: 12, bold: true }) + T(370, 362, "101", { size: 11 });
        s += `<path d="M430 420 l-14 -7 v14 z" fill="#000"/>`;
        s += `<rect x="480" y="380" width="70" height="80" fill="#f5f5f0" stroke="#000" stroke-width="2"/>` + T(515, 480, "E-201", { bold: true });
        s += T(170, 404, "4\"-CW-1001-A1A-CS", { size: 12, bold: true, anchor: "start" });
        s += `<rect x="40" y="600" width="510" height="72" fill="none" stroke="#000" stroke-width="1"/>` + T(52, 620, "범례", { anchor: "start", size: 12, bold: true }) +
          gate(80, 648) + T(100, 653, "게이트", { anchor: "start", size: 12 }) + check(200, 648) + T(220, 653, "체크", { anchor: "start", size: 12 }) +
          `<circle cx="310" cy="648" r="12" fill="#fff" stroke="#000"/>` + T(330, 653, "현장 계기", { anchor: "start", size: 12 });
        s += `<rect x="40" y="690" width="510" height="72" fill="none" stroke="#000" stroke-width="1"/>` + T(52, 710, "발행 목록 (현재)", { anchor: "start", size: 12, bold: true }) +
          T(52, 732, "CW-PID-001 Rev 1 · CW-PL-001 Rev 1 · ISO-1001 Rev 1", { anchor: "start", size: 13 });
        // 아이소
        s += `<rect x="600" y="30" width="570" height="48" fill="#f5f5f0" stroke="#000" stroke-width="1.5"/>` + T(616, 61, "ISOMETRIC · 3\"-CW-1001-A1A-CS · Rev 1", { anchor: "start", bold: true, size: 16 });
        s += `<rect x="600" y="88" width="300" height="52" fill="none" stroke="#000" stroke-width="1"/>` + T(610, 108, "참조 도면", { anchor: "start", size: 11, fill: "#666" }) + T(610, 130, "CW-PID-001 Rev 1 · CW-PL-001 Rev 0", { anchor: "start", size: 13 });
        const O = [700, 600], A = [700, 480], B = [907.8, 360], C = [1011.7, 420];
        s += P(`M${O} L${A} L${B} L${C}`, "pipe");
        s += L(686, 600, 714, 600, "vis") + L(686, 606, 714, 606, "vis") + T(700, 630, "P-101 N1", { size: 12 });
        s += `<g transform="translate(783 432) rotate(-30)">${gate(0, 0)}</g>` + T(770, 412, "①", { size: 12 });
        s += `<g transform="translate(${C[0]} ${C[1]}) rotate(30)">${L(-3, -14, -3, 14)}${L(3, -14, 3, 14)}</g>` + T(1060, 430, "E-201 N1", { size: 12, anchor: "start" });
        s += `<circle cx="${A[0]}" cy="${A[1]}" r="4" fill="#000"/><circle cx="${B[0]}" cy="${B[1]}" r="4" fill="#000"/>` + T(850, 380, "FW", { size: 12, bold: true });
        s += T(680, 544, "600", { size: 13, rot: -90 }) + T(820, 404, "2000", { size: 13, rot: -30 }) + T(972, 376, "1000", { size: 13, rot: 30 });
        s += `<g transform="translate(1110 180)"><path d="M0 0 L26 -15" stroke="#000" stroke-width="2" marker-end="url(#rv-ar)"/></g>` + T(1146, 162, "N", { bold: true });
        // BOM
        const bom = [["1", "PIPE 4\" SCH40 A106-B", "3.3 m"], ["2", "ELBOW 90 LR 4\" SCH40", "2"], ["3", "FLANGE WN 4\" CL150", "4"], ["4", "GATE VALVE 4\" CL150", "1"], ["5", "GASKET 4\" CL150", "3"], ["6", "BOLT SET 4\" CL150", "4"]];
        s += `<rect x="600" y="636" width="570" height="136" fill="#fff" stroke="#000" stroke-width="1.5"/>` + T(612, 654, "BOM", { anchor: "start", bold: true, size: 13 });
        bom.forEach(([n, d, q], i) => { const y = 674 + i * 17; s += T(614, y, n, { anchor: "start", size: 12 }) + T(640, y, d, { anchor: "start", size: 12 }) + T(1150, y, q, { anchor: "end", size: 12, bold: true }); });
        return s;
      },
      errors: [
        { x: 700, y: 560, r: 34, label: "P&ID의 체크 밸브가 아이소에 없음", why: "P&ID에는 펌프 토출 바로 뒤에 체크 밸브가 있습니다. 아이소·BOM 모두 빠졌습니다. 체크 밸브 양쪽 플랜지 이음도 같이 늘어납니다." },
        { x: 870, y: 56, r: 40, label: "아이소 표제의 크기 3\" ≠ P&ID 4\"", why: "라인 1001은 4\"입니다. BOM은 4\"로 적혀 있어 표제만 틀렸지만, 표제가 틀린 아이소는 다른 라인으로 오인됩니다." },
        { x: 1140, y: 742, r: 30, label: "가스켓 3개 ≠ 플랜지 이음 4곳", why: "펌프 노즐, 게이트 밸브 양쪽, 열교환기 노즐로 이음이 4곳입니다. 플랜지 4, 볼트 세트 4인데 가스켓만 3입니다." },
        { x: 820, y: 130, r: 36, label: "참조 평면도가 Rev 0 (현재 Rev 1)", why: "발행 목록의 최신 평면도는 Rev 1입니다. 옛 개정을 참조해 그린 아이소는 경로가 다를 수 있으니 다시 대조합니다." },
        { x: 730, y: 470, r: 30, label: "P&ID의 ¾\" 드레인이 아이소에 없음", why: "체크 밸브와 게이트 밸브 사이의 드레인이 빠졌습니다. 기준 목록에서 지워지지 않고 남는 항목이 누락입니다." },
      ],
    },
  ];

  function mount(el, ctx) {
    const sheet = sheets.find((s) => s.id === ctx.query.sheet) || sheets[0];
    const found = new Set();
    let misses = 0, revealed = false;
    const best = store.get("review-best", {});

    const page = h(`<div class="page wide" style="max-width:1440px;margin:0 auto">
      <div class="page-head">
        <div>
          <h1>도면 검토</h1>
          <p>틀린 곳이라고 생각되는 자리를 도면 위에서 클릭하세요. 맞히면 초록 동그라미와 설명이 남습니다.</p>
        </div>
        <nav class="stage-tabs" style="margin:0">${sheets.map((s) => `<a href="${link.review(s.id)}" aria-current="${s.id === sheet.id}">${esc(s.level)} · ${esc(s.id.toUpperCase())}${progress.has("review:" + s.id) ? " ✓" : ""}</a>`).join("")}</nav>
      </div>
      <div class="review-layout">
        <div>
          <h3 style="margin-bottom:8px">${esc(sheet.title)}</h3>
          <p class="muted small">${esc(sheet.intro)}</p>
          <div class="review-sheet"><svg viewBox="0 0 ${sheet.w} ${sheet.h}" role="img" aria-label="${esc(sheet.title)}">${defs}${sheet.svg()}<g class="marks"></g></svg></div>
        </div>
        <aside class="card" style="padding:16px;position:sticky;top:72px">
          <div style="display:flex;justify-content:space-between;align-items:baseline"><h4>찾은 오류</h4><b class="score"></b></div>
          <div class="bar" style="margin:8px 0 16px"><i class="score-bar" style="width:0"></i></div>
          <ol class="review-list small" style="padding-left:20px;margin:0 0 16px"></ol>
          <p class="tiny muted miss-line"></p>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button type="button" class="btn small hint-btn">힌트</button>
            <button type="button" class="btn small reveal-btn">정답 보기</button>
            <button type="button" class="btn small ghost reset-btn">다시 하기</button>
          </div>
          <div class="callout tip hint-box small" hidden><b>검토 순서</b>${esc(sheet.hint)}</div>
          <p class="tiny muted" style="margin-top:16px">연결 레슨: ${sheet.id === "r1" ? `<a href="${link.lesson("1-D2")}">1-D2 치수</a>, <a href="${link.lesson("1-D1")}">1-D1 표제란</a>` : sheet.id === "r2" ? `<a href="${link.lesson("3-07")}">3-07 간섭</a>, <a href="${link.lesson("2-07")}">2-07 높이 표기</a>` : `<a href="${link.lesson("4-02")}">4-02 세트 불일치</a>`}</p>
        </aside>
      </div>
    </div>`);
    el.appendChild(page);

    const svg = page.querySelector("svg");
    const marks = svg.querySelector(".marks");
    const list = page.querySelector(".review-list");

    function draw() {
      marks.innerHTML = sheet.errors.map((e, i) => {
        if (found.has(i)) return `<circle cx="${e.x}" cy="${e.y}" r="${e.r}" fill="rgba(42,208,169,0.18)" stroke="#21a183" stroke-width="3"/><circle cx="${e.x + e.r * 0.7}" cy="${e.y - e.r * 0.7}" r="13" fill="#21a183"/><text x="${e.x + e.r * 0.7}" y="${e.y - e.r * 0.7 + 5}" font-size="14" font-weight="700" text-anchor="middle" fill="#000">${i + 1}</text>`;
        if (revealed) return `<circle cx="${e.x}" cy="${e.y}" r="${e.r}" fill="rgba(242,82,10,0.12)" stroke="#d34621" stroke-width="3" stroke-dasharray="8 5"/><text x="${e.x + e.r * 0.7}" y="${e.y - e.r * 0.7 + 5}" font-size="14" font-weight="700" text-anchor="middle" fill="#d34621">${i + 1}</text>`;
        return "";
      }).join("") + (marks.dataset.miss || "");
      list.innerHTML = sheet.errors.map((e, i) => {
        if (found.has(i)) return `<li class="found" value="${i + 1}"><b>${esc(e.label)}</b><br><span class="muted">${esc(e.why)}</span></li>`;
        if (revealed) return `<li class="missed" value="${i + 1}"><b>${esc(e.label)}</b><br><span class="muted">${esc(e.why)}</span></li>`;
        return "";
      }).join("") || `<li class="muted" style="list-style:none;margin-left:-20px">아직 찾은 오류가 없습니다.</li>`;
      page.querySelector(".score").textContent = `${found.size} / ${sheet.errors.length}`;
      page.querySelector(".score-bar").style.width = `${(found.size / sheet.errors.length) * 100}%`;
      page.querySelector(".miss-line").textContent = misses ? `빗나간 클릭 ${misses}번` : "";
      if (found.size === sheet.errors.length && !revealed) {
        progress.mark("review:" + sheet.id, true);
        const prevBest = best[sheet.id];
        if (prevBest == null || misses < prevBest) { best[sheet.id] = misses; store.set("review-best", best); }
        page.querySelector(".miss-line").textContent = `모두 찾았습니다. 빗나간 클릭 ${misses}번${best[sheet.id] != null ? ` (최고 기록 ${best[sheet.id]}번)` : ""}.`;
      }
    }

    svg.addEventListener("click", (ev) => {
      if (revealed) return;
      const pt = svg.createSVGPoint();
      pt.x = ev.clientX; pt.y = ev.clientY;
      const p = pt.matrixTransform(svg.getScreenCTM().inverse());
      let hit = -1, bestD = Infinity;
      sheet.errors.forEach((e, i) => {
        if (found.has(i)) return;
        const d = Math.hypot(p.x - e.x, p.y - e.y);
        if (d <= e.r && d < bestD) { bestD = d; hit = i; }
      });
      if (hit >= 0) found.add(hit);
      else {
        misses++;
        marks.dataset.miss = (marks.dataset.miss || "") + `<g stroke="#d34621" stroke-width="2.5"><line x1="${p.x - 7}" y1="${p.y - 7}" x2="${p.x + 7}" y2="${p.y + 7}"/><line x1="${p.x + 7}" y1="${p.y - 7}" x2="${p.x - 7}" y2="${p.y + 7}"/></g>`;
      }
      draw();
    });
    page.querySelector(".hint-btn").addEventListener("click", () => { page.querySelector(".hint-box").hidden = false; });
    page.querySelector(".reveal-btn").addEventListener("click", () => { revealed = true; draw(); });
    page.querySelector(".reset-btn").addEventListener("click", () => { found.clear(); misses = 0; revealed = false; marks.dataset.miss = ""; draw(); });
    draw();
  }

  ACAD.reviewSheets = sheets;
  ACAD.pages.review = { title: "도면 검토", nav: "review", mount };
})();
