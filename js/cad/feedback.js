// CAD 연습장: 즉각 피드백. 무엇을 그렸는지 말로 풀고, 흔한 실수를 찾고, 명령을 설명한다.
window.ACAD = window.ACAD || {};
(function () {
  const G = ACAD.G;
  const fm = (n) => G.fmt(n, 2);
  const deg = (r) => ((G.deg(r) % 360) + 360) % 360;
  const TYPE_KO = { line: "선(LINE)", circle: "원(CIRCLE)", arc: "호(ARC)", pline: "폴리선(PLINE)", ellipse: "타원(ELLIPSE)", text: "문자(TEXT)", dim: "치수(DIM)", array: "배열(ARRAY)" };

  // ---------- 명령 해설 ----------
  const HELP = {
    LINE: { what: "두 점을 이어 직선을 그립니다. Enter로 끝낼 때까지 선분이 계속 이어지고, 선분 하나하나가 따로 된 객체입니다.", opts: { U: "방금 그린 선분 하나만 취소", C: "첫 점으로 닫고 끝냄" } },
    PLINE: { what: "여러 선분·호가 한 덩어리인 폴리선을 그립니다. 닫힌 폴리선은 면적이 있어 간격띄우기·3D 돌출에 유리합니다.", opts: { A: "호 모드로 바꿈", L: "선 모드로 돌아감(호 모드) / 길이 입력(선 모드)", C: "닫기", CL: "호로 닫기", U: "마지막 점 취소", S: "세 점 호의 두 번째 점" } },
    RECTANG: { what: "대각선 두 구석점으로 직사각형 폴리선을 만듭니다. 두 번째 점은 보통 @가로,세로로 입력합니다.", opts: { D: "길이·폭 숫자로 입력", R: "기울어진 직사각형", F: "모서리 둥글게", C: "모서리 모따기" } },
    CIRCLE: { what: "원을 그립니다. 방법은 여섯 가지: 중심-반지름, 중심-지름, 2점, 3점, 접선-접선-반지름(TTR), 접선-접선-접선(TTT).", opts: { "3P": "원 위의 세 점", "2P": "지름 양 끝 두 점", T: "두 객체에 접하고 반지름을 아는 원(TTR)", D: "반지름 대신 지름 입력", TTT: "세 직선에 모두 접하는 원(리본의 '접선, 접선, 접선')" } },
    ARC: { what: "호를 그립니다. 기본은 3점 호이고, 시작점·중심·끝점 순서로도 그립니다. AutoCAD 호는 반시계 방향으로 그려진다는 것을 기억하세요.", opts: { C: "중심점 먼저", E: "끝점 먼저", A: "사이각(+반시계)", R: "반지름", L: "현의 길이", D: "시작 접선 방향" } },
    POLYGON: { what: "정다각형을 폴리선으로 만듭니다. 원에 내접(I)은 꼭짓점이 원 위에, 외접(C)은 변의 중점이 원 위에 옵니다.", opts: { E: "한 변의 두 끝점으로", I: "원에 내접(꼭짓점까지 = 반지름)", C: "원에 외접(변까지 = 반지름)" } },
    ELLIPSE: { what: "축 두 개로 타원을 만듭니다. 먼저 한 축의 두 끝점, 그다음 다른 축의 절반 길이를 줍니다.", opts: { C: "중심점부터", A: "타원형 호", R: "원을 기울인 각도로", I: "등각원(등각 모드)" } },
    ERASE: { what: "고른 객체를 지웁니다. 먼저 선택하고 Delete 키를 눌러도 됩니다.", opts: {} },
    MOVE: { what: "기준점 → 두 번째 점만큼 객체를 옮깁니다. 기준점은 객체 스냅으로 정확한 점(끝점·중심)을 잡는 게 핵심입니다.", opts: { D: "변위를 숫자로(예: 100,0)" } },
    COPY: { what: "기준점 → 두 번째 점만큼 떨어진 곳에 사본을 만듭니다. Enter 전까지 여러 번 복사합니다.", opts: { A: "같은 간격으로 여러 개 배열 복사", U: "마지막 사본 취소", E: "끝" } },
    MIRROR: { what: "대칭선(두 점)을 기준으로 뒤집은 사본을 만듭니다. 좌우 대칭 도면은 절반만 그리고 MIRROR로 완성합니다.", opts: { Y: "원본 지움", N: "원본 남김" } },
    ROTATE: { what: "기준점을 중심으로 회전합니다. 양수는 반시계 방향입니다. 참조(R)는 '지금 각도 → 원하는 각도'로 돌릴 때 씁니다.", opts: { C: "사본을 회전", R: "참조 각도에서 새 각도로" } },
    SCALE: { what: "기준점을 고정하고 크기를 바꿉니다. 2는 두 배, 0.5는 절반. 참조(R)는 '지금 길이 → 원하는 길이'.", opts: { C: "사본에 적용", R: "참조 길이에서 새 길이로" } },
    OFFSET: { what: "같은 간격의 평행선·동심원을 만듭니다. 거리 → 객체 → 방향(면의 점) 순서입니다. 벽 두께, 창틀, 테두리에 씁니다.", opts: { T: "지정한 점을 지나게", E: "원본 지우기", M: "연속으로 여러 번", U: "취소" } },
    TRIM: { what: "다른 객체와 교차하는 곳을 경계로, 클릭한 부분을 잘라냅니다(빠른 작업 모드: 모든 객체가 경계). Shift를 누른 채 클릭하면 연장합니다.", opts: { T: "경계를 직접 고르는 표준 모드", C: "걸치기 창 안의 조각을 한꺼번에", R: "객체 지우기", U: "마지막 자르기 취소" } },
    EXTEND: { what: "클릭한 끝을 가장 가까운 경계까지 늘입니다. Shift를 누른 채 클릭하면 자릅니다.", opts: { B: "경계를 직접 고름", U: "취소" } },
    FILLET: { what: "두 선의 모서리를 반지름 R 호로 둥글게 합니다. R=0이면 두 선을 정확히 만나게 합니다(모서리 정리).", opts: { R: "반지름 지정", P: "폴리선의 모든 모서리", T: "자르기 여부", M: "여러 번", U: "취소" } },
    CHAMFER: { what: "모서리를 비스듬히 잘라냅니다. 거리(D)는 두 선 위의 거리, 각도(A)는 길이와 각도로 정합니다.", opts: { D: "모따기 거리 두 개", A: "길이 + 각도", P: "폴리선 전체", E: "거리/각도 방법 선택", M: "여러 번" } },
    LENGTHEN: { what: "선·호의 길이를 바꿉니다. 증분(DE)은 더하기, 퍼센트(P)는 비율, 합계(T)는 최종 길이, 동적(DY)은 끌어서. 클릭한 쪽 끝이 움직입니다.", opts: { DE: "지금 길이 + 증분", P: "지금 길이의 %", T: "최종 길이", DY: "마우스로 끌기" } },
    BREAK: { what: "객체를 두 점 사이에서 끊어 틈을 만듭니다. 두 번째 점에 @를 입력하면 틈 없이 한 점에서 끊습니다. 원은 반시계 방향으로 첫 점→둘째 점 구간이 지워집니다.", opts: { F: "첫 번째 점을 다시 지정" } },
    BREAKATPOINT: { what: "한 점에서 틈 없이 둘로 나눕니다.", opts: {} },
    JOIN: { what: "끝점이 맞닿은 선·호·폴리선을 하나로 합칩니다. 같은 직선 위의 선은 한 선, 이어진 것들은 폴리선이 됩니다.", opts: { L: "호를 원으로 닫기" } },
    ALIGN: { what: "근원점 두 개를 대상점 두 개에 맞춰 이동+회전(+축척)을 한 번에 합니다.", opts: { Y: "대상 길이에 맞춰 축척", N: "크기 유지" } },
    STRETCH: { what: "걸치기(오른쪽→왼쪽) 창에 들어간 꼭짓점만 옮겨 늘이거나 줄입니다. 창 안에 통째로 들어간 객체는 이동합니다.", opts: { D: "변위를 숫자로" } },
    ARRAY: { what: "객체를 규칙적으로 여러 개 배치합니다. 직사각형(행·열), 원형(중심 주위), 경로(곡선을 따라). 기본은 연관 배열이라 나중에 개수·간격을 바꿀 수 있습니다.", opts: { R: "직사각형 배열", PO: "원형 배열", PA: "경로 배열", COU: "열·행 개수", S: "간격", COL: "열", I: "항목 수", F: "채울 각도", A: "사이 각도 / 항목 정렬", B: "기준점", ROT: "항목 회전", M: "등분할/길이 분할", AS: "연관 여부", X: "끝", REP: "항목 대치", S2: "원본 편집", RES: "재설정" } },
    EXPLODE: { what: "폴리선·배열·치수를 낱개 객체(선·호·문자)로 풉니다.", opts: {} },
    ZOOM: { what: "화면을 확대·축소합니다. 도면이 안 보이면 Z Enter E Enter(범위)가 가장 먼저 할 일입니다.", opts: { E: "그린 것 전체", A: "한계+그린 것", W: "창으로 지정", P: "이전 화면", O: "고른 객체" } },
    PAN: { what: "화면을 끌어서 옮깁니다. 평소에는 휠 버튼을 누른 채 끄는 게 빠릅니다.", opts: {} },
    U: { what: "마지막 명령 하나를 취소합니다(Ctrl+Z).", opts: {} },
    UNDO: { what: "여러 명령을 한꺼번에 취소합니다.", opts: {} },
    REDO: { what: "방금 U로 취소한 것을 되살립니다(Ctrl+Y).", opts: {} },
    MREDO: { what: "취소한 여러 작업을 한꺼번에 되살립니다.", opts: { A: "전체", L: "마지막" } },
    LIMITS: { what: "도면 한계(작업 영역)를 정합니다. A3는 0,0 ~ 420,297 입니다.", opts: { ON: "한계 밖 입력 막기", OFF: "한계 검사 끄기" } },
    DIST: { what: "두 점 사이 거리·각도·X/Y 증분을 알려 줍니다. 그린 것이 맞는지 확인할 때 씁니다.", opts: {} },
    ID: { what: "점의 좌표를 알려 줍니다.", opts: {} },
    LIST: { what: "고른 객체의 정보(길이, 반지름, 도면층 등)를 명령창에 보여 줍니다.", opts: {} },
    DIMLINEAR: { what: "수평·수직 치수를 넣습니다. 두 점 → 치수선 위치. 첫 점에서 Enter면 선을 골라 바로 잽니다.", opts: { H: "수평 고정", V: "수직 고정", R: "회전", T: "문자 바꾸기" } },
    DIMALIGNED: { what: "기울어진 선과 나란한 치수를 넣습니다.", opts: {} },
    DIMRADIUS: { what: "원·호의 반지름 치수(R)를 넣습니다.", opts: {} },
    DIMDIAMETER: { what: "원·호의 지름 치수(Ø)를 넣습니다.", opts: {} },
    TEXT: { what: "한 줄 문자를 씁니다. 시작점 → 높이 → 각도 → 내용. 빈 줄에서 Enter로 끝냅니다.", opts: {} },
    MATCHPROP: { what: "원본 객체의 도면층·색·선종류를 대상 객체에 복사합니다.", opts: {} },
    OFFSETGAPTYPE: { what: "", opts: {} },
    GRIP: { what: "그립(파란 네모)을 눌러 끝점을 옮기거나(신축) 객체를 옮깁니다. 새 위치를 클릭하거나 좌표를 입력하세요.", opts: { B: "기준점", C: "복사", X: "끝" } },
  };
  const PROMPT_HINTS = [
    [/첫 번째 점|시작점 지정|중심점 지정|구석점|원점 지정|점 지정:/, "클릭하거나 좌표를 입력: 0,0 (절대) · @100,0 (직전 점에서 상대) · @100<30 (상대 극좌표: 거리<각도)"],
    [/다음 점|두 번째 점|다른 구석점|끝점 지정/, "@가로,세로 또는 @거리<각도. 직교(F8)를 켜고 방향만 가리킨 뒤 숫자만 쳐도 됩니다(직접 거리 입력)."],
    [/객체 선택|객체 제거/, "클릭=하나, 왼쪽→오른쪽 끌기=윈도우(완전히 들어간 것), 오른쪽→왼쪽=걸치기(닿기만 해도). Shift+클릭=빼기. 다 골랐으면 Enter."],
    [/반지름/, "숫자를 입력하거나 커서로 거리를 찍으세요."],
    [/거리 지정|길이 지정/, "숫자를 입력하거나 두 점을 찍어 거리를 재도 됩니다."],
    [/각도/, "숫자(도)를 입력하거나 기준점에서 방향을 찍으세요. 양수 = 반시계."],
    [/기준점/, "기준점은 객체 스냅(끝점·중심·교차점)으로 정확한 점을 잡는 것이 핵심입니다."],
    [/자를 객체/, "잘라낼 '부분'을 클릭합니다. 빈 곳에서 끌면 걸치기로 여러 조각을 한 번에 자릅니다."],
    [/연장할 객체/, "늘일 '끝' 가까이를 클릭합니다."],
    [/간격띄우기할 면/, "새 선이 생길 쪽을 클릭합니다."],
    [/기준점:$/, "FROM: 기준이 될 점(예: 모서리 끝점)을 찍으세요."],
    [/<간격띄우기>/, "FROM: 기준점에서 얼마나 떨어진 곳인지 @x,y 로 입력하세요. 예: @30,20"],
    [/중간점의/, "M2P: 두 점을 찍으면 그 한가운데 점이 입력됩니다."],
    [/임시 OTRACK/, "TT: 추적의 기준이 될 점을 찍으세요. 그 점에서 수평·수직 추적선이 나옵니다."],
    [/^명령:$/, "명령어나 단축키를 입력하고 Space. 예: L(선), C(원), REC(사각형), O(간격띄우기), TR(자르기). 빈 상태에서 Space = 방금 명령 반복."],
  ];
  const GENERIC = { 종료: "명령을 끝냄", "명령 취소": "방금 한 동작 하나만 되돌림", 다중: "같은 동작을 연속으로", 닫기: "첫 점과 이어 닫음", 예: "", 아니오: "" };
  function commandInfo(name, promptText, via, raw, reqType) {
    const def = name && ACAD.CadCommands.get(name);
    const h = HELP[name] || {};
    let hint = PROMPT_HINTS.find(([re]) => re.test(promptText || ""));
    if (reqType === "pick" && !/자를 객체|연장할 객체/.test(promptText || "")) hint = [null, "객체 하나를 클릭해 고릅니다(작은 사각형 커서를 선 위에). 옵션은 [ ] 안 글자를 입력하거나 클릭."];
    const opts = [];
    const m = (promptText || "").match(/\[([^\]]+)\]/);
    if (m) for (const o of m[1].split("/")) {
      const k = (o.match(/\(([A-Za-z0-9]+)\)\s*$/) || [])[1];
      if (!k) continue;
      const label = o.replace(/\([A-Za-z0-9]+\)\s*$/, "").trim();
      opts.push({ key: k, label, desc: label in GENERIC ? GENERIC[label] : (h.opts || {})[k] || "" });
    }
    let tip = null;
    if (def && def.alias.length) {
      const a = def.alias[0];
      if (via === "full" && raw && raw.toUpperCase() !== a) tip = `다음엔 ${a} + Space로 더 빨리 시작하세요. (${def.name} = ${a})`;
      if (via === "button") tip = `버튼 대신 명령창에 ${a} + Space를 입력하면 손을 키보드에서 떼지 않아도 됩니다.`;
      if (via === "repeat") tip = `빈 상태에서 Space(또는 Enter)로 방금 명령(${def.name})을 반복했습니다. 같은 명령을 연달아 쓸 때 가장 빠른 방법입니다.`;
    }
    return { name, ko: def ? def.ko : "", alias: def ? def.alias : [], what: h.what || (def ? def.ko : ""), prompt: promptText, hint: hint ? hint[1] : "", opts, tip, stub: def && def.stub };
  }

  // ---------- 모양 인식 ----------
  function polyInfo(pts) {
    const n = pts.length;
    const sides = pts.map((p, i) => G.dist(p, pts[(i + 1) % n]));
    const angs = pts.map((p, i) => {
      const a = pts[(i - 1 + n) % n], b = pts[(i + 1) % n];
      const u = G.unit(G.sub(a, p)), v = G.unit(G.sub(b, p));
      return G.deg(Math.acos(Math.max(-1, Math.min(1, G.dot(u, v)))));
    });
    const eqAll = (arr, tol) => arr.every((x) => Math.abs(x - arr[0]) <= tol * Math.max(1, Math.abs(arr[0])));
    const area = Math.abs(G.polyArea(pts));
    let name, detail = "";
    if (n === 3) {
      if (eqAll(sides, 1e-3)) name = "정삼각형";
      else if (angs.some((a) => Math.abs(a - 90) < 0.05)) name = "직각삼각형";
      else if (sides.some((s, i) => Math.abs(s - sides[(i + 1) % 3]) < 1e-3 * s)) name = "이등변삼각형";
      else name = "삼각형";
      detail = `변 ${sides.map(fm).join(" · ")}`;
    } else if (n === 4 && angs.every((a) => Math.abs(a - 90) < 0.05)) {
      const w = sides[0], h = sides[1];
      name = Math.abs(w - h) < 1e-3 * w ? "정사각형" : "직사각형";
      const ang = deg(G.ang(pts[0], pts[1])) % 90;
      const rot = Math.min(ang, 90 - ang) > 0.01 ? ` · ${fm(ang)}° 기울어짐` : "";
      const horiz = Math.abs(pts[0].y - pts[1].y) < 1e-6 ? [w, h] : [h, w];
      detail = `${fm(horiz[0])} × ${fm(horiz[1])}${rot}`;
    } else if (n >= 5 && eqAll(sides, 1e-3) && eqAll(angs, 1e-3)) {
      name = `정${n}각형`;
      detail = `한 변 ${fm(sides[0])}`;
    } else if (n === 4 && eqAll(sides, 1e-3)) { name = "마름모"; detail = `한 변 ${fm(sides[0])}`; }
    else { name = `${n}각형`; detail = `둘레 ${fm(sides.reduce((s, x) => s + x, 0))}`; }
    const c = pts.reduce((a, p) => ({ x: a.x + p.x / n, y: a.y + p.y / n }), { x: 0, y: 0 });
    return { name, detail, area, sides, angs, center: c, n };
  }
  // 선·호가 끝점으로 이어져 닫힌 고리(선끼리만인 경우 다각형) 찾기
  function findLoops(ents) {
    const tol = 1e-6;
    const pieces = ents.filter((e) => e.type === "line" || e.type === "arc" || (e.type === "pline" && !e.closed));
    const key = (p) => `${Math.round(p.x / 1e-4)}:${Math.round(p.y / 1e-4)}`;
    const nodes = new Map();
    pieces.forEach((e) => {
      const [a, b] = G.endpoints(e);
      if (!a || !b || G.dist(a, b) < tol) return;
      for (const p of [a, b]) { const k = key(p); if (!nodes.has(k)) nodes.set(k, { p, es: [] }); nodes.get(k).es.push(e); }
    });
    const seen = new Set(), loops = [];
    for (const e of pieces) {
      if (seen.has(e.id)) continue;
      // 이 조각에서 출발해 차수 2 노드만 따라 한 바퀴 도는지
      const [a0] = G.endpoints(e);
      if (!a0) continue;
      const chain = [];
      let cur = e, at = G.endpoints(e)[1], ok = true;
      const used = new Set([e.id]);
      chain.push({ e, from: a0, to: at });
      let guard = 0;
      while (guard++ < 500) {
        const node = nodes.get(key(at));
        if (!node || node.es.length !== 2) { ok = false; break; }
        const nx = node.es.find((x) => x !== cur);
        if (nx === e) break;
        if (!nx || used.has(nx.id)) { ok = false; break; }
        const [p, q] = G.endpoints(nx);
        const next = G.dist(p, at) < 1e-3 ? q : p;
        chain.push({ e: nx, from: at, to: next });
        used.add(nx.id);
        cur = nx; at = next;
      }
      if (ok && chain.length >= 2 && G.dist(at, a0) < 1e-3) {
        used.forEach((id) => seen.add(id));
        const allLines = chain.every((c) => c.e.type === "line");
        loops.push({ ids: [...used], pts: chain.map((c) => c.from), allLines, chain });
      }
    }
    return loops;
  }
  function plineAsPoly(e) {
    if (e.type !== "pline" || !e.closed) return null;
    if (e.pts.some((p) => Math.abs(p.b || 0) > 1e-9)) return null;
    // 한 직선 위 연속 꼭짓점 정리
    const pts = e.pts.filter((p, i, arr) => {
      const a = arr[(i - 1 + arr.length) % arr.length], b = arr[(i + 1) % arr.length];
      return Math.abs(G.cross(G.sub(p, a), G.sub(b, p))) > 1e-9 * Math.max(1, G.dist(a, b) ** 2);
    });
    return pts.length >= 3 ? pts : null;
  }

  // ---------- 객체 설명 ----------
  function describe(e, doc) {
    const out = { title: TYPE_KO[e.type] || e.type, lines: [], tags: [], shape: null };
    if (!e) return out;
    switch (e.type) {
      case "line": {
        const L = G.dist(e.a, e.b), a = deg(G.ang(e.a, e.b));
        out.lines.push(`길이 ${fm(L)} · 각도 ${fm(a)}°`, `시작 ${G.fmtPt(e.a)} → 끝 ${G.fmtPt(e.b)}`, `ΔX ${fm(e.b.x - e.a.x)} · ΔY ${fm(e.b.y - e.a.y)}`);
        const m = a % 90;
        if (m < 1e-6 || 90 - m < 1e-6) out.tags.push(Math.abs(e.a.y - e.b.y) < 1e-9 ? "수평선" : "수직선");
        else if (Math.abs(a % 45) < 1e-6) out.tags.push("45° 선");
        break;
      }
      case "circle":
        out.lines.push(`중심 ${G.fmtPt(e.c)}`, `반지름 R${fm(e.r)} · 지름 Ø${fm(e.r * 2)}`, `둘레 ${fm(G.TAU * e.r)} · 면적 ${fm(Math.PI * e.r * e.r)}`);
        break;
      case "arc": {
        const sw = G.ccwSweep(e.a0, e.a1);
        out.lines.push(`중심 ${G.fmtPt(e.c)} · 반지름 R${fm(e.r)}`, `시작 ${fm(deg(e.a0))}° → 끝 ${fm(deg(e.a1))}° (반시계)`, `사이각 ${fm(G.deg(sw))}° · 호 길이 ${fm(e.r * sw)}`);
        if (Math.abs(G.deg(sw) - 90) < 1e-6) out.tags.push("1/4 원");
        if (Math.abs(G.deg(sw) - 180) < 1e-6) out.tags.push("반원");
        break;
      }
      case "pline": {
        const segs = G.plineSegs(e);
        const arcs = segs.filter((g) => g.k === "A").length;
        out.lines.push(`꼭짓점 ${e.pts.length}개 · ${e.closed ? "닫힘" : "열림"} · 길이 ${fm(G.length(e))}${arcs ? ` · 호 ${arcs}개` : ""}`);
        if (e.closed) {
          const poly = plineAsPoly(e);
          if (poly) { const pi = polyInfo(poly); out.shape = pi; out.tags.push(pi.name); out.lines.push(`${pi.name} ${pi.detail} · 면적 ${fm(pi.area)}`); }
          else {
            const radii = [...new Set(segs.filter((g) => g.k === "A").map((g) => fm(g.r)))];
            if (radii.length) out.lines.push(`모서리 호 반지름 R${radii.join(", R")}`);
          }
        }
        break;
      }
      case "ellipse": {
        const a = G.len(e.major), b = a * e.ratio;
        out.lines.push(`중심 ${G.fmtPt(e.c)}`, `장축 ${fm(a * 2)} (반 ${fm(a)}) · 단축 ${fm(b * 2)} (반 ${fm(b)})`, `장축 방향 ${fm(deg(Math.atan2(e.major.y, e.major.x)))}° · 비율 ${G.fmt(e.ratio, 3)}`);
        if (Math.abs(e.ratio - Math.sqrt(1 / 3)) < 1e-3) out.tags.push("등각원");
        break;
      }
      case "text": out.lines.push(`"${e.s}"`, `높이 ${fm(e.h)} · 회전 ${fm(deg(e.rot || 0))}° · 위치 ${G.fmtPt(e.p)}`); break;
      case "dim": { const g = G.dimGeom(e); out.lines.push(`${{ linear: "선형", aligned: "정렬", radius: "반지름", diameter: "지름" }[e.kind]} 치수 = ${g.text ? g.text.s : fm(g.value)}`); break; }
      case "array": {
        const n = G.arrayTransforms(e).length;
        out.lines.push(`${{ rect: "직사각형", polar: "원형", path: "경로" }[e.kind]} 배열 · 항목 ${n}개 · ${e.assoc === false ? "연관 없음" : "연관"}`);
        if (e.kind === "rect") out.lines.push(`${e.p.cols}열 × ${e.p.rows}행 · 간격 ${fm(e.p.dx)} × ${fm(e.p.dy)}`);
        if (e.kind === "polar") out.lines.push(`중심 ${G.fmtPt(G.M.apply(e.M || G.M.id(), e.p.c))} · 채울 각도 ${fm(G.deg(e.p.fill))}° · 항목 회전 ${e.p.rot === false ? "아니오" : "예"}`);
        if (e.kind === "path") out.lines.push(`${e.p.method === "measure" ? "길이 분할" : "등분할"} · 경로 길이 ${fm(G.length(e.p.path))} · 정렬 ${e.p.align === false ? "아니오" : "예"}`);
        break;
      }
    }
    if (doc) {
      const l = doc.layer(e.layer);
      out.lines.push(`도면층 "${e.layer}"${l ? ` · ${ACAD.CadLtypes[l.ltype] ? ACAD.CadLtypes[l.ltype].ko : l.ltype}` : ""}`);
    }
    return out;
  }

  // 방금 만든 객체와 다른 객체의 관계
  function relations(e, ents) {
    const rel = [];
    const others = ents.filter((x) => x.id !== e.id && x._src !== e.id);
    const tol = 1e-4;
    if (e.type === "line") {
      const d = G.unit(G.sub(e.b, e.a));
      let par = 0, perp = 0, touch = 0;
      for (const o of others) {
        if (o.type === "line") {
          const d2 = G.unit(G.sub(o.b, o.a));
          const cr = Math.abs(G.cross(d, d2));
          if (cr < 1e-6) {
            const dist = Math.abs(G.cross(d, G.sub(o.a, e.a)));
            if (dist > tol && par < 2) { rel.push(`평행 ↔ 선 #${o.id} (간격 ${fm(dist)})`); par++; }
          } else if (Math.abs(G.dot(d, d2)) < 1e-6 && perp < 2) { rel.push(`직각 ↔ 선 #${o.id}`); perp++; }
        }
        for (const p of G.endpoints(o)) if (G.dist(p, e.a) < tol || G.dist(p, e.b) < tol) touch++;
      }
      if (touch) rel.push(`끝점이 다른 객체의 끝점 ${touch}곳과 정확히 붙어 있음`);
    }
    if (e.type === "circle" || e.type === "arc") {
      for (const o of others) {
        if ((o.type === "circle" || o.type === "arc") && G.eq(o.c, e.c, tol)) rel.push(`동심(중심이 같음) ↔ ${o.type === "circle" ? "원" : "호"} #${o.id}`);
        else if (o.type === "circle" || o.type === "arc") {
          const dc = G.dist(o.c, e.c);
          if (Math.abs(dc - (o.r + e.r)) < tol) rel.push(`바깥으로 접함 ↔ 원 #${o.id}`);
          else if (Math.abs(dc - Math.abs(o.r - e.r)) < tol) rel.push(`안쪽으로 접함 ↔ 원 #${o.id}`);
        }
        if (o.type === "line") {
          const cl = G.segClosest({ k: "L", a: o.a, b: o.b }, e.c);
          if (Math.abs(cl.d - e.r) < tol && cl.t > 1e-6 && cl.t < 1 - 1e-6) rel.push(`접함 ↔ 선 #${o.id}`);
          if (G.eq(G.mid(o.a, o.b), e.c, tol)) rel.push(`중심 = 선 #${o.id}의 중간점`);
          if (G.eq(o.a, e.c, tol) || G.eq(o.b, e.c, tol)) rel.push(`중심 = 선 #${o.id}의 끝점`);
        }
        if (o.type === "pline" && o.closed) {
          const poly = plineAsPoly(o);
          if (poly) { const pi = polyInfo(poly); if (G.eq(pi.center, e.c, tol) && pi.n === 4) rel.push(`중심 = ${pi.name} #${o.id}의 한가운데`); }
          for (const p of o.pts) if (G.eq(p, e.c, tol)) { rel.push(`중심 = 폴리선 #${o.id}의 꼭짓점`); break; }
        }
      }
      const loops = findLoops(ents);
      for (const lp of loops) if (lp.allLines && lp.pts.length === 4) { const pi = polyInfo(lp.pts); if (pi.name.includes("사각형") && G.eq(pi.center, e.c, tol)) rel.push("중심 = 선으로 그린 사각형의 한가운데"); }
    }
    return rel.slice(0, 5);
  }

  // ---------- 실수 찾기 ----------
  function issues(doc, view) {
    const ents = doc.flat().filter((e) => doc.visible(e));
    const out = [];
    const s = view ? view.s : 1;
    const gapTol = 14 / s;
    const ends = [];
    ents.forEach((e) => { if (e.type === "line" || e.type === "arc" || (e.type === "pline" && !e.closed)) G.endpoints(e).forEach((p, i) => ends.push({ p, e, i })); });
    const seenPairs = new Set();
    for (let i = 0; i < ends.length && out.length < 6; i++)
      for (let j = i + 1; j < ends.length; j++) {
        const A = ends[i], B = ends[j];
        if (A.e === B.e && A.e.type !== "pline") continue;
        const d = G.dist(A.p, B.p);
        if (d > 1e-6 && d < gapTol) {
          const L = Math.min(G.length(A.e), G.length(B.e));
          if (d > L * 0.25) continue;
          // 이미 다른 끝점과 정확히 붙어 있으면 무시
          const exact = ends.some((C) => C !== A && G.dist(C.p, A.p) < 1e-6) && ends.some((C) => C !== B && G.dist(C.p, B.p) < 1e-6);
          if (exact) continue;
          const k = [A.e.id, B.e.id].sort().join("-");
          if (seenPairs.has(k)) continue;
          seenPairs.add(k);
          out.push({ kind: "gap", p: G.mid(A.p, B.p), msg: `끝점 사이가 ${G.fmt(d, 3)} 떨어져 있어 도형이 닫히지 않았습니다. F3 객체 스냅을 켜고 끝점(□)에 붙여 다시 찍거나 FILLET 반지름 0으로 붙이세요.` });
        }
      }
    for (const e of ents) {
      if (e.type !== "line") continue;
      const a = deg(G.ang(e.a, e.b)) % 90;
      const off = Math.min(a, 90 - a);
      if (off > 0.01 && off < 1.5 && G.dist(e.a, e.b) > 5 / s) {
        out.push({ kind: "skew", p: G.mid(e.a, e.b), msg: `선 #${e.id}: ${a < 45 ? "수평" : "수직"}에서 ${G.fmt(off, 2)}° 기울어 있습니다. 눈으로는 맞아 보여도 치수가 틀어집니다. F8(직교)을 켜고 다시 그리세요.` });
        if (out.length > 8) break;
      }
    }
    const sig = (e) => {
      if (e.type === "line") { const [p, q] = [e.a, e.b].sort((u, v) => u.x - v.x || u.y - v.y); return `L${p.x.toFixed(4)},${p.y.toFixed(4)},${q.x.toFixed(4)},${q.y.toFixed(4)}`; }
      if (e.type === "circle") return `C${e.c.x.toFixed(4)},${e.c.y.toFixed(4)},${e.r.toFixed(4)}`;
      return null;
    };
    const sigs = new Map();
    for (const e of ents) {
      const k = sig(e);
      if (!k) continue;
      if (sigs.has(k)) { out.push({ kind: "dup", p: e.type === "line" ? G.mid(e.a, e.b) : e.c, msg: `같은 자리에 똑같은 ${e.type === "line" ? "선" : "원"}이 두 번 겹쳐 있습니다(#${sigs.get(k)}, #${e.id}). 복사·붙여넣기 실수일 때가 많습니다. 하나를 지우세요.` }); }
      else sigs.set(k, e.id);
    }
    return out.slice(0, 8);
  }

  // 요약: 인식된 닫힌 도형들
  function shapes(doc) {
    const ents = doc.flat().filter((e) => doc.visible(e));
    const out = [];
    for (const lp of findLoops(ents)) {
      if (lp.allLines) { const pi = polyInfo(lp.pts); out.push({ text: `선 ${lp.ids.length}개로 된 닫힌 ${pi.name} ${pi.detail}`, center: pi.center, ids: lp.ids }); }
      else out.push({ text: `선·호 ${lp.ids.length}개가 이어진 닫힌 윤곽`, ids: lp.ids });
    }
    for (const e of ents) {
      if (e.type === "pline" && e.closed) { const poly = plineAsPoly(e); if (poly) { const pi = polyInfo(poly); out.push({ text: `닫힌 ${pi.name} ${pi.detail} (폴리선)`, center: pi.center, ids: [e.id] }); } else out.push({ text: "모서리가 둥근 닫힌 폴리선", ids: [e.id] }); }
    }
    return out.slice(0, 8);
  }

  // 화면 주석(방금 그린 것 위에 잠깐 표시)
  function annotations(e) {
    if (!e) return [];
    switch (e.type) {
      case "line": return [{ kind: "len", a: e.a, b: e.b, text: `${fm(G.dist(e.a, e.b))} < ${fm(deg(G.ang(e.a, e.b)))}°` }];
      case "circle": return [{ kind: "radius", c: e.c, r: e.r, text: `R${fm(e.r)} (Ø${fm(e.r * 2)})` }];
      case "arc": return [{ kind: "radius", c: e.c, r: e.r, text: `R${fm(e.r)} · ${fm(G.deg(G.ccwSweep(e.a0, e.a1)))}°` }];
      case "pline": {
        const poly = e.closed && plineAsPoly(e);
        if (poly) {
          const pi = polyInfo(poly);
          const out = [{ kind: "label", p: pi.center, text: `${pi.name} ${pi.detail}` }];
          if (pi.n === 4) { out.push({ kind: "len", a: poly[0], b: poly[1], text: fm(pi.sides[0]) }, { kind: "len", a: poly[1], b: poly[2], text: fm(pi.sides[1]) }); }
          return out;
        }
        const segs = G.plineSegs(e);
        return segs.slice(0, 6).map((g) => (g.k === "L" ? { kind: "len", a: g.a, b: g.b, text: fm(G.dist(g.a, g.b)) } : { kind: "radius", c: g.c, r: g.r, text: `R${fm(g.r)}` }));
      }
      case "ellipse": return [{ kind: "label", p: e.c, text: `타원 ${fm(G.len(e.major) * 2)} × ${fm(G.len(e.major) * e.ratio * 2)}` }];
      case "array": return [{ kind: "label", p: G.M.apply(e.M || G.M.id(), e.base), text: `배열 ${G.arrayTransforms(e).length}개` }];
    }
    return [];
  }

  ACAD.CadFeedback = { TYPE_KO, describe, relations, issues, shapes, annotations, commandInfo, findLoops, polyInfo, plineAsPoly, HELP };
})();
