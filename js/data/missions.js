// CAD 연습장 미션. 순서는 CAD 기초강의 재생목록(01–35)을 따른다.
// steps[].check(ctx, K)는 도면이 바뀔 때마다 실행된다. K = ACAD.CadCheck
window.ACAD = window.ACAD || {};
(function () {
  const G = ACAD.G;
  const P = (x, y) => ({ x, y });
  const pol = (d, a) => ({ x: d * Math.cos((a * Math.PI) / 180), y: d * Math.sin((a * Math.PI) / 180) });
  const lineLen = (e) => G.dist(e.a, e.b);

  ACAD.missions = [
    // ---------- 입문 ----------
    {
      id: "m0-03", stage: "0", lecture: "03", title: "명령어 입력 방법",
      goal: "명령을 시작·반복·취소하는 세 가지 손동작을 익힙니다. 메뉴를 찾지 말고 키보드로 합니다.",
      view: [-100, -80, 400, 240],
      steps: [
        { text: "명령창에 L 을 치고 Space(또는 Enter)로 선 명령 시작", check: (c, K) => K.used(c, "LINE", "alias") },
        { text: "화면을 클릭해 선분 2개 이상을 잇고 Enter로 끝내기", check: (c, K) => K.lines(c).length >= 2 && (!c.eng.cmd || c.eng.cmd.name !== "LINE") },
        { text: "명령이 없는 상태에서 Space만 눌러 방금 명령 반복", check: (c, K) => c.history.some((h) => h.via === "repeat") },
        { text: "명령 도중 Esc로 취소", check: (c, K) => K.ev(c, "cancel") },
      ],
      hints: ["Space와 Enter는 AutoCAD에서 같은 일을 합니다. 왼손 엄지로 Space를 누르는 습관이 속도를 만듭니다.", "마우스 오른쪽 클릭도 Enter와 같습니다."],
    },
    {
      id: "m0-04", stage: "0", lecture: "04", title: "절대좌표로 삼각형",
      goal: "원점(0,0) 기준 좌표 x,y 를 그대로 입력해 꼭짓점 (0,0) (100,0) (50,80)인 삼각형을 그립니다.",
      view: [-30, -30, 150, 110],
      steps: [
        { text: "L → 0,0 → 100,0 : 밑변", check: (c, K) => K.hasSeg(c, P(0, 0), P(100, 0)) },
        { text: "50,80 : 오른쪽 변", check: (c, K) => K.hasSeg(c, P(100, 0), P(50, 80)) },
        { text: "C(닫기)로 왼쪽 변을 그리고 끝내기", check: (c, K) => K.hasSeg(c, P(50, 80), P(0, 0)) },
        { text: "쉼표 좌표(x,y)를 세 번 이상 입력", check: (c, K) => K.inputs(c, /^#?-?[\d.]+\s*,\s*-?[\d.]+$/) >= 3 },
      ],
      hints: ["이 연습장의 명령창은 입력한 x,y를 절대좌표로 받습니다.", "실제 AutoCAD에서 동적 입력(F12)이 켜져 있으면 두 번째 점부터 x,y가 상대좌표로 해석됩니다. 절대좌표를 확실히 쓰려면 #100,0처럼 #을 붙이세요."],
    },
    {
      id: "m0-05", stage: "0", lecture: "05", title: "객체 선택 방법",
      goal: "윈도우(왼쪽→오른쪽)와 걸치기(오른쪽→왼쪽)의 차이를 눈으로 확인하고, 주황색 '지울것' 도면층 객체만 지웁니다.",
      view: [-60, -110, 280, 130],
      setup(S) {
        S.layer("지울것", "red");
        [0, 50, 100, 150, 200].forEach((x) => S.circle(x, 0, 15));
        S.line(-30, 40, 230, 40);
        S.circle(50, 80, 12, { layer: "지울것" });
        S.circle(150, 80, 12, { layer: "지울것" });
        S.line(-30, -60, 230, -60, { layer: "지울것" });
        S.rect(20, -90, 160, 20);
      },
      steps: [
        { text: "빈 곳에서 왼쪽→오른쪽으로 끌어 윈도우 선택(파란 창: 완전히 들어간 것만)", check: (c, K) => K.ev(c, "windowSel") },
        { text: "오른쪽→왼쪽으로 끌어 걸치기 선택(초록 점선 창: 닿기만 해도)", check: (c, K) => K.ev(c, "crossingSel") },
        { text: "Shift를 누른 채 클릭해 선택에서 하나 빼기", check: (c, K) => K.ev(c, "shiftRemove") },
        { text: "'지울것' 도면층(빨간색) 3개만 지우기(E 또는 Delete)", check: (c, K) => !c.doc.ents.some((e) => e.layer === "지울것") && c.doc.ents.filter((e) => e.layer !== "지울것").length >= 7 },
      ],
      hints: ["선택 도중 명령창에 R을 치면 '제거' 모드, A는 다시 '추가' 모드입니다.", "Esc를 두 번 누르면 선택이 모두 풀립니다."],
    },
    {
      id: "m0-06", stage: "0", lecture: "06", title: "상대좌표 계단",
      goal: "@가로,세로 로 '직전 점에서 얼마나'만 입력해 계단 모양을 닫습니다. 시작점은 아무 곳이나 됩니다.",
      view: [-40, -40, 260, 190],
      steps: [
        { text: "@를 붙인 입력을 네 번 이상 사용", check: (c, K) => K.inputs(c, /^@/) >= 4 },
        { text: "@200,0 → @0,50 → @-50,0 → @0,50 → @-50,0 → @0,50 → @-100,0 → C", check: (c, K) => !!K.hasPoly(c, [P(0, 0), P(200, 0), P(200, 50), P(150, 50), P(150, 100), P(100, 100), P(100, 150), P(0, 150)]) },
      ],
      hints: ["상대좌표의 부호: 오른쪽·위는 +, 왼쪽·아래는 −.", "틀렸으면 U(명령 취소)로 마지막 선분만 되돌리세요."],
    },
    {
      id: "m0-07", stage: "0", lecture: "07", title: "상대극좌표",
      goal: "@거리<각도 로 기울어진 선을 그립니다. 각도는 동쪽이 0°, 반시계가 +입니다.",
      view: [-60, -40, 320, 200],
      steps: [
        { text: "한 변 100 정삼각형: @100<0 → @100<120 → C", check: (c, K) => K.polys(c).some((p) => { if (p.pts.length !== 3) return false; const i = K.polyInfo(p.pts); return i.name === "정삼각형" && K.near(i.sides[0], 100) && p.pts.some((q, j) => Math.abs(q.y - p.pts[(j + 1) % 3].y) < 0.01); }) },
        { text: "한 변 80, 30° 기운 정사각형: @80<30 → @80<120 → @80<210 → C", check: (c, K) => K.polys(c).some((p) => { if (p.pts.length !== 4) return false; const i = K.polyInfo(p.pts); if (i.name !== "정사각형" || !K.near(i.sides[0], 80)) return false; const a = ((G.deg(G.ang(p.pts[0], p.pts[1])) % 90) + 90) % 90; return K.near(a, 30, 0.05) || K.near(a, 60, 0.05); }) },
        { text: "< 가 들어간 입력을 네 번 이상", check: (c, K) => K.inputs(c, /</) >= 4 },
      ],
      hints: ["120°는 왼쪽 위 방향입니다. 정삼각형의 바깥각은 120°씩 늘어납니다.", "각도 0 = 동, 90 = 북, 180 = 서, 270(= -90) = 남."],
    },
    {
      id: "m0-08", stage: "0", lecture: "08", title: "거리값 직접입력",
      goal: "F8(직교)을 켜고, 커서로 방향만 가리킨 뒤 숫자만 입력해 L자 윤곽을 닫습니다. 실무에서 가장 많이 쓰는 방법입니다.",
      view: [-40, -40, 340, 240],
      toggles: { ortho: false },
      steps: [
        { text: "F8로 직교 켜기", check: (c, K) => c.t.ortho || K.ev(c, "toggle:ortho:on") },
        { text: "숫자만 입력(직접 거리)을 세 번 이상", check: (c, K) => K.ev(c, "direct", 3) },
        { text: "300 → 200 → 100 → 100 → 200 → C 로 L자 닫기", check: (c, K) => !!K.hasPoly(c, [P(0, 0), P(300, 0), P(300, 200), P(200, 200), P(200, 100), P(0, 100)]) },
      ],
      hints: ["순서: 오른쪽 300, 위 200, 왼쪽 100, 아래 100, 왼쪽 200, C.", "커서를 원하는 쪽으로 조금 움직인 상태에서 숫자를 쳐야 방향이 맞습니다."],
    },
    {
      id: "m0-09", stage: "0", lecture: "09", title: "그리드·스냅·극좌표 추적",
      goal: "상태선 토글을 켜고 끄며, 스냅으로 딱 떨어지는 점을 찍고 30° 극좌표 추적으로 기울어진 선을 그립니다.",
      view: [-20, -20, 200, 120],
      toggles: { grid: false, snap: false, polar: false },
      steps: [
        { text: "F7 그리드 켜기", check: (c) => c.t.grid },
        { text: "F9 스냅 켜기(간격 10)", check: (c) => c.t.snap },
        { text: "스냅만으로 클릭해 50 × 30 사각형(REC 또는 L)", check: (c, K) => K.rects(c, 50, 30).length > 0 },
        { text: "F10 극좌표 켜고 증분 각도 30°로(상태 막대 목록 또는 POLARANG)", check: (c) => c.t.polar && c.t.polarInc === 30 },
        { text: "극좌표 추적선을 따라 길이 100, 30° 또는 60° 선", check: (c, K) => K.lines(c).some((e) => K.near(lineLen(e), 100, 0.05) && [30, 60, 120, 150, 210, 240, 300, 330].some((a) => K.near(((G.deg(G.ang(e.a, e.b)) % 360) + 360) % 360, a, 0.05))) },
      ],
      hints: ["극좌표 추적 중 초록 점선이 보일 때 숫자 100을 입력하면 그 방향으로 정확히 100입니다.", "직교(F8)와 극좌표(F10)는 동시에 켜지지 않습니다."],
    },
    {
      id: "m0-10", stage: "0", lecture: "10", title: "객체스냅(OSNAP)",
      goal: "끝점(□)·중간점(△)·교차점(×)·중심(○)·사분점(◇) 표시를 보고 정확한 점에 선을 붙입니다.",
      view: [-30, -30, 370, 150],
      setup(S) { S.rect(0, 0, 200, 120); S.circle(300, 60, 40); },
      steps: [
        { text: "사각형 대각선 두 개(끝점→끝점)", check: (c, K) => K.hasSeg(c, P(0, 0), P(200, 120)) && K.hasSeg(c, P(200, 0), P(0, 120)) },
        { text: "네 변의 중간점을 이은 마름모", check: (c, K) => K.hasSeg(c, P(100, 0), P(200, 60)) && K.hasSeg(c, P(200, 60), P(100, 120)) && K.hasSeg(c, P(100, 120), P(0, 60)) && K.hasSeg(c, P(0, 60), P(100, 0)) },
        { text: "대각선 교차점에서 원의 중심까지", check: (c, K) => K.hasSeg(c, P(100, 60), P(300, 60)) },
        { text: "원의 위 사분점에서 사각형 오른쪽 위 모서리까지", check: (c, K) => K.hasSeg(c, P(300, 100), P(200, 120)) },
      ],
      hints: ["원의 중심 표시는 원 둘레에 커서를 댔을 때 나타납니다.", "스냅이 헷갈리면 명령 도중 MID, INT, CEN, QUA를 입력해 그 스냅만 한 번 쓰세요.", "객체 스냅 종류는 상태 막대 '객체스냅 ▾'에서 켭니다."],
    },
    {
      id: "m0-11", stage: "0", lecture: "11", title: "객체스냅의 특별한 기능",
      goal: "FROM(기준점에서 떨어진 곳), M2P(두 점의 중간), 추적(F11·TT)으로 선이 없는 자리를 정확히 찍습니다.",
      view: [-30, -30, 320, 160],
      setup(S) { S.rect(0, 0, 200, 120); },
      steps: [
        { text: "C → FROM → 왼쪽 아래 모서리 → @30,20 에 R10 원", check: (c, K) => !!K.findCircle(c, P(30, 20), 10) && K.ev(c, "from") },
        { text: "C → M2P → 왼쪽 아래·오른쪽 위 모서리 → 사각형 한가운데 R25 원", check: (c, K) => !!K.findCircle(c, P(100, 60), 25) && K.ev(c, "m2p") },
        { text: "추적: 오른쪽 위 모서리에서 오른쪽으로 80 떨어진 곳에 R10 원", check: (c, K) => !!K.findCircle(c, P(280, 120), 10) && (K.ev(c, "acquire") || K.ev(c, "tt") || K.ev(c, "from", 2) || K.ev(c, "direct")) },
      ],
      hints: ["FROM은 명령 도중(점을 물을 때) 입력합니다: C Enter → FROM Enter → 끝점 클릭 → @30,20 Enter.", "F11(객체 스냅 추적)을 켜고 모서리에 커서를 0.5초 올려 두면 작은 +가 생깁니다. 오른쪽으로 끌어 초록 점선이 나오면 80 입력.", "TT(임시 추적점)는 F11 없이 한 번만 추적점을 찍는 방법입니다."],
    },
    {
      id: "m0-12", stage: "0", lecture: "12", title: "객체스냅 예제: 볼트 판",
      goal: "160 × 100 판의 한가운데에 R30 구멍, 네 모서리에서 20씩 들어간 곳에 R10 구멍 네 개를 뚫습니다.",
      view: [-30, -30, 200, 140],
      steps: [
        { text: "160 × 100 사각형(REC → 아무 점 → @160,100)", check: (c, K) => K.rects(c, 160, 100).length > 0 },
        { text: "판 한가운데 R30 원(M2P 또는 추적)", check: (c, K) => K.rects(c, 160, 100).some((r) => K.findCircle(c, P(r.bb.x0 + 80, r.bb.y0 + 50), 30)) },
        { text: "모서리에서 20,20 들어간 R10 원 네 개(FROM 또는 추적)", check: (c, K) => K.rects(c, 160, 100).some((r) => [[20, 20], [140, 20], [140, 80], [20, 80]].every(([x, y]) => K.findCircle(c, P(r.bb.x0 + x, r.bb.y0 + y), 10))) },
      ],
      hints: ["원 하나를 FROM으로 정확히 만든 뒤 COPY로 나머지를 옮겨도 됩니다(신입 단계의 COPY 미리보기).", "오른쪽 패널의 '지금 그린 것'에서 원 중심이 판과 어떤 관계인지 확인하세요."],
    },
    {
      id: "m0-13", stage: "0", lecture: "13", title: "원 그리는 6가지 방법",
      goal: "같은 원이라도 주어진 조건(중심·지름·두 점·세 점·접선)에 따라 방법을 고릅니다.",
      view: [-70, -230, 560, 70],
      setup(S) {
        S.line(0, -200, 200, -200); S.line(0, -200, 0, -50);
        S.line(300, -200, 500, -200); S.line(500, -200, 400, -50); S.line(400, -50, 300, -200);
        S.text(0, -225, 8, "TTR: 두 선에 접하는 R20");
        S.text(300, -225, 8, "TTT: 세 선에 접하는 원");
      },
      steps: [
        { text: "중심·반지름: C → 0,0 → 50", check: (c, K) => !!K.findCircle(c, P(0, 0), 50) },
        { text: "중심·지름: C → 150,0 → D → 80", check: (c, K) => !!K.findCircle(c, P(150, 0), 40) },
        { text: "2점: C → 2P → 250,0 → 350,0", check: (c, K) => !!K.findCircle(c, P(300, 0), 50) && K.ev(c, "circle:2P") },
        { text: "3점: C → 3P → 400,0 → 500,0 → 450,50", check: (c, K) => !!K.findCircle(c, P(450, 0), 50) && K.ev(c, "circle:3P") },
        { text: "접선·접선·반지름: C → T → 왼쪽 두 선 → 20", check: (c, K) => !!K.findCircle(c, P(20, -180), 20) },
        { text: "접선·접선·접선: C → TTT → 삼각형 세 변", check: (c, K) => { const A = P(300, -200), B = P(500, -200), C = P(400, -50); const a = G.dist(B, C), b = G.dist(C, A), cc = G.dist(A, B), s = a + b + cc; const I = P((a * A.x + b * B.x + cc * C.x) / s, (a * A.y + b * B.y + cc * C.y) / s); const r = Math.abs(G.cross(G.sub(B, A), G.sub(C, A))) / s; return !!K.findCircle(c, I, r, { tol: 0.05 }); } },
      ],
      hints: ["TTR은 원이 닿을 쪽 가까이를 클릭해야 원하는 위치에 생깁니다.", "TTT는 리본의 '접선, 접선, 접선'과 같습니다. 실제 AutoCAD 명령창에서는 3P에 TAN 스냅을 세 번 써서 만듭니다."],
    },
    {
      id: "m0-14", stage: "0", lecture: "14", title: "원을 활용한 예제",
      goal: "떨어진 두 원을 TTR 원과 접선으로 잇는 연결 고리 모양을 만듭니다.",
      view: [-80, -80, 280, 190],
      setup(S) { S.circle(0, 0, 40); S.circle(200, 0, 40); },
      steps: [
        { text: "C → T → 두 원의 위쪽 → 80 : 위에서 두 원에 접하는 R80", check: (c, K) => !!K.findCircle(c, P(100, Math.sqrt(120 * 120 - 100 * 100)), 80, { tol: 0.05 }) },
        { text: "두 원의 아래쪽을 잇는 접선(사분점 ◇ 또는 TAN)", check: (c, K) => K.lines(c).some((e) => { const L = { k: "L", a: G.add(e.a, G.mul(G.sub(e.a, e.b), 50)), b: G.add(e.b, G.mul(G.sub(e.b, e.a), 50)) }; return K.near(G.segClosest(L, P(0, 0)).d, 40) && K.near(G.segClosest(L, P(200, 0)).d, 40) && G.mid(e.a, e.b).y < 0; }) },
        { text: "LIST(LI)로 R80 원의 중심 좌표 확인", check: (c, K) => K.ev(c, "list") },
      ],
      hints: ["두 원에 모두 접하려면 R80 원의 중심은 각 원 중심에서 40 + 80 = 120 떨어져야 합니다.", "TRIM으로 R80 원의 아래쪽을 잘라내면 고리 모양이 완성됩니다(다음 강의 미리보기)."],
    },
    {
      id: "m0-15", stage: "0", lecture: "15", title: "호(ARC)",
      goal: "3점, 시작·중심·끝, 시작·끝·반지름 세 방식으로 호를 그리고, 호가 반시계 방향으로 생긴다는 것을 확인합니다.",
      view: [-30, -80, 530, 80],
      steps: [
        { text: "A → 0,0 → 50,50 → 100,0 (3점 호)", check: (c, K) => K.arcs(c).some((a) => K.nearPt(a.c, P(50, 0)) && K.near(a.r, 50) && G.angIn(Math.PI / 2, a.a0, a.sw)) },
        { text: "A → 200,0 → C → 250,0 → 300,0 (시작·중심·끝): 아래쪽 반원이 생김", check: (c, K) => K.arcs(c).some((a) => K.nearPt(a.c, P(250, 0)) && K.near(a.r, 50) && G.angIn(Math.PI * 1.5, a.a0, a.sw)) },
        { text: "A → 400,0 → E → 500,0 → R → 60 (시작·끝·반지름)", check: (c, K) => K.arcs(c).some((a) => K.near(a.r, 60) && ((K.nearPt(a.s, P(400, 0)) && K.nearPt(a.t, P(500, 0))) || (K.nearPt(a.t, P(400, 0)) && K.nearPt(a.s, P(500, 0))))) },
      ],
      hints: ["시작·중심·끝에서 위쪽 반원을 원하면 시작점과 끝점을 바꿔 찍습니다(300,0 → 중심 → 200,0).", "반지름에 음수를 넣으면 큰 호(180° 이상)가 생깁니다."],
    },
    {
      id: "m0-16", stage: "0", lecture: "16", title: "Limits · Zoom · Undo · Redo",
      goal: "화면에서 도면을 잃어버렸을 때 되찾고, 잘못한 작업을 되돌리고 되살립니다.",
      view: [-20, -20, 140, 90],
      setup(S) { S.rect(0, 0, 100, 60); S.circle(3000, 2000, 5); },
      steps: [
        { text: "Z → E : 줌 범위(멀리 있는 작은 원까지 보임)", check: (c, K) => K.ev(c, "zoomE") },
        { text: "Z → W : 창으로 사각형만 크게", check: (c, K) => K.ev(c, "zoomW") },
        { text: "선을 몇 개 그린 뒤 U 두 번(또는 Ctrl+Z)", check: (c, K) => K.ev(c, "undo", 2) },
        { text: "REDO 또는 MREDO로 되살리기", check: (c, K) => K.ev(c, "redo") },
        { text: "LIMITS → 0,0 → 420,297 (A3 한계)", check: (c, K) => K.ev(c, "limits") && K.near(c.doc.limits.x1, 420) && K.near(c.doc.limits.y1, 297) && K.near(c.doc.limits.x0, 0) },
      ],
      hints: ["휠을 두 번 빠르게 누르면(더블클릭) 줌 범위와 같습니다.", "U는 명령 하나를 되돌립니다. REDO는 바로 앞의 U만 되살리고, MREDO는 여러 개를 되살립니다."],
    },
    // ---------- 신입 ----------
    {
      id: "m1-17", stage: "1", lecture: "17", title: "Offset · Trim · Extend",
      goal: "간격띄우기로 평행선을 만들고, 삐져나온 끝은 자르고, 모자란 끝은 늘여 칸을 정리합니다.",
      view: [-30, -80, 330, 180],
      setup(S) { S.line(0, 0, 300, 0); S.line(0, 100, 300, 100); S.line(150, -50, 150, 150); S.line(250, 20, 250, 80); },
      steps: [
        { text: "O → 50 → 가운데 세로선을 왼쪽·오른쪽으로(x = 100, 200)", check: (c, K) => [100, 200].every((x) => K.lines(c).some((e) => K.near(e.a.x, x) && K.near(e.b.x, x))) },
        { text: "TR → 가로선 바깥으로 삐져나온 세로선 끝 여섯 곳 자르기", check: (c, K) => [100, 150, 200].every((x) => { const v = K.lines(c).filter((e) => K.near(e.a.x, x) && K.near(e.b.x, x)); return v.length && v.every((e) => Math.min(e.a.y, e.b.y) >= -0.01 && Math.max(e.a.y, e.b.y) <= 100.01) && K.hasSeg(c, P(x, 0), P(x, 100)); }) },
        { text: "EX → x = 250 짧은 선의 위·아래 끝을 가로선까지", check: (c, K) => K.hasSeg(c, P(250, 0), P(250, 100)) },
      ],
      hints: ["TRIM(빠른 작업): 잘라낼 '조각'을 클릭합니다. 빈 곳에서 끌면 여러 조각을 한 번에 자릅니다.", "TRIM 중 Shift+클릭 = EXTEND, EXTEND 중 Shift+클릭 = TRIM."],
    },
    {
      id: "m1-18", stage: "1", lecture: "18", title: "OTE 예제: 창틀",
      goal: "1200 × 900 창의 틀 두께 50, 가운데 멀리언(세로 칸막이) 두께 50을 간격띄우기와 자르기로 만듭니다.",
      view: [-100, -100, 1300, 1000],
      setup(S) { S.rect(0, 0, 1200, 900, { tag: "frame" }); },
      steps: [
        { text: "O → 50 → 바깥 틀 안쪽으로: 1100 × 800 안쪽 틀", check: (c, K) => K.rects(c, 1100, 800).some((r) => K.near(r.bb.x0, 50) && K.near(r.bb.y0, 50)) },
        { text: "안쪽 틀 위·아래 변 중간점을 잇는 세로선 → O 25로 양쪽", check: (c, K) => [575, 625].every((x) => K.hasSeg(c, P(x, 50), P(x, 850))) },
        { text: "가운데 기준선(x = 600)은 지우기", check: (c, K) => K.ev(c, "erase") && [575, 625].every((x) => K.hasSeg(c, P(x, 50), P(x, 850))) && !K.lines(c).some((e) => K.near(e.a.x, 600) && K.near(e.b.x, 600)) },
      ],
      hints: ["기준선을 그리고 → 간격띄우기 → 기준선 지우기. 실무에서 가장 흔한 순서입니다.", "간격띄우기는 연속으로 됩니다: 객체 선택 → 방향 클릭 → 다른 객체 선택 → ... Enter."],
    },
    {
      id: "m1-20", stage: "1", lecture: "20", title: "Move · Copy",
      goal: "기준점을 객체 스냅으로 정확히 잡아, 원을 사각형 한가운데로 옮기고 네 모서리에 복사합니다.",
      view: [-200, -60, 360, 160],
      setup(S) { S.circle(-150, 50, 20, { tag: "c" }); S.rect(100, 0, 200, 100); },
      steps: [
        { text: "M → 원 → 기준점: 원 중심 → 두 번째 점: 사각형 한가운데(M2P 또는 추적)", check: (c, K) => { const e = K.byTag(c, "c"); return e && K.nearPt(e.c, P(200, 50)); } },
        { text: "CO → 원 → 기준점: 원 중심 → 네 모서리에 연달아 복사", check: (c, K) => [[100, 0], [300, 0], [300, 100], [100, 100]].every(([x, y]) => K.findCircle(c, P(x, y), 20)) },
      ],
      hints: ["COPY는 Enter를 누를 때까지 여러 번 복사합니다.", "COPY의 배열(A) 옵션으로 같은 간격 여러 개도 한 번에 만들 수 있습니다."],
    },
    {
      id: "m1-21", stage: "1", lecture: "21", title: "Mirror(대칭복사)",
      goal: "좌우 대칭 부품은 절반만 그리고 대칭선으로 완성합니다. 원본을 지우는 경우도 해 봅니다.",
      view: [-120, -40, 280, 120],
      setup(S) {
        S.pline([[0, 0], [-80, 0], [-80, 40], [-40, 40], [-40, 80], [0, 80]], false, { tag: "half" });
        S.line(0, -20, 0, 100, { layer: "중심선" });
        S.pline([[200, 0], [240, 20], [200, 40]], true, { tag: "arrow" });
        S.line(220, -20, 220, 60, { layer: "중심선" });
      },
      steps: [
        { text: "MI → 왼쪽 절반 → 중심선 두 끝점 → N(원본 유지)", check: (c, K) => K.plines(c).some((e) => K.ptsMatch(e.pts, [P(0, 0), P(80, 0), P(80, 40), P(40, 40), P(40, 80), P(0, 80)])) && !!K.byTag(c, "half") },
        { text: "MI → 오른쪽 화살표 → x = 220 중심선 → Y(원본 지움): 화살표가 왼쪽을 가리킴", check: (c, K) => { const tri = K.plines(c).filter((e) => e.pts.length === 3 && e.pts.every((p) => p.x >= 199.99 && p.x <= 240.01)); return tri.length === 1 && K.ptsMatch(tri[0].pts, [P(240, 0), P(200, 20), P(240, 40)]); } },
      ],
      hints: ["대칭선은 끝점 스냅으로 중심선 위의 두 점을 찍습니다. 직교(F8)를 켜면 수직 대칭선이 쉽습니다.", "문자는 MIRRTEXT = 0(기본)이면 뒤집히지 않고 읽히는 방향을 유지합니다."],
    },
    {
      id: "m1-22", stage: "1", lecture: "22", title: "Polygon(정다각형)",
      goal: "내접(I)과 외접(C)의 차이를 크기로 확인하고, 한 변 길이로 정오각형을 만듭니다.",
      view: [-80, -80, 320, 90],
      steps: [
        { text: "POL → 6 → 0,0 → I → 50 : 꼭짓점이 R50 원 위", check: (c, K) => K.polys(c).some((p) => p.pts.length === 6 && p.pts.every((q) => K.near(G.dist(q, P(0, 0)), 50))) },
        { text: "POL → 6 → 150,0 → C → 50 : 변이 R50 원에 닿음(더 큼)", check: (c, K) => K.polys(c).some((p) => p.pts.length === 6 && p.pts.every((q) => K.near(G.dist(q, P(150, 0)), 50 / Math.cos(Math.PI / 6), 0.02))) },
        { text: "POL → 5 → E → 두 점(한 변 60)", check: (c, K) => K.polys(c).some((p) => p.pts.length === 5 && K.polyInfo(p.pts).name === "정5각형" && K.near(K.polyInfo(p.pts).sides[0], 60)) },
      ],
      hints: ["볼트 머리(육각)를 그릴 때는 '맞변 거리'를 알기 때문에 외접(C)을 씁니다.", "모서리(E) 두 번째 점은 @60,0 처럼 상대좌표로 주면 정확합니다."],
    },
    {
      id: "m1-23", stage: "1", lecture: "23", title: "Ellipse(타원)",
      goal: "축 끝점 방식과 중심 방식으로 타원을 그리고 LIST로 치수를 확인합니다.",
      view: [-30, -110, 380, 110],
      steps: [
        { text: "EL → 0,0 → 200,0 → 50 : 가로 200 × 세로 100", check: (c, K) => K.ents(c).some((e) => e.type === "ellipse" && K.nearPt(e.c, P(100, 0)) && K.near(G.len(e.major), 100) && K.near(e.ratio, 0.5) && K.near(Math.abs(e.major.y), 0)) },
        { text: "EL → C → 300,0 → @0,80 → 40 : 세로가 긴 타원", check: (c, K) => K.ents(c).some((e) => e.type === "ellipse" && K.nearPt(e.c, P(300, 0)) && K.near(G.len(e.major), 80) && K.near(e.ratio, 0.5) && K.near(Math.abs(e.major.x), 0)) },
        { text: "LI → 타원 선택: 정보 확인", check: (c, K) => K.ev(c, "list") },
      ],
      hints: ["세 번째 입력은 '다른 축의 절반 길이'입니다. 전체 폭이 아닙니다."],
    },
    {
      id: "m1-24", stage: "1", lecture: "24", title: "Fillet(모깎기)",
      goal: "모서리를 반지름으로 둥글게 하고, 반지름 0으로 떨어진 두 선을 모서리로 붙이고, 폴리선 전체를 한 번에 깎습니다.",
      view: [-30, -40, 630, 160],
      setup(S) { S.lrect(0, 0, 200, 120); S.line(300, 0, 380, 0); S.line(400, 20, 400, 120); S.rect(500, 0, 100, 80, { tag: "pl" }); },
      steps: [
        { text: "F → R → 20 → 사각형 네 모서리(M 다중으로 연달아)", check: (c, K) => [[20, 20], [180, 20], [180, 100], [20, 100]].every(([x, y]) => K.arcs(c).some((a) => K.nearPt(a.c, P(x, y)) && K.near(a.r, 20))) },
        { text: "F → R → 0 → 떨어진 두 선을 모서리로", check: (c, K) => K.hasSeg(c, P(300, 0), P(400, 0)) && K.hasSeg(c, P(400, 0), P(400, 120)) },
        { text: "F → R 10 → P → 오른쪽 폴리선: 네 모서리 한 번에", check: (c, K) => K.arcs(c).filter((a) => K.near(a.r, 10) && a.e.type === "pline").length >= 4 },
      ],
      hints: ["모깎기 반지름은 한 번 정하면 다음에도 유지됩니다. 명령창 첫 줄 '현재 설정'을 읽는 습관을 들이세요.", "두 번째 선을 Shift+클릭하면 반지름과 무관하게 모서리(R0)로 붙습니다."],
    },
    {
      id: "m1-25", stage: "1", lecture: "25", title: "Chamfer(모따기)",
      goal: "거리 방식(D)과 각도 방식(A)으로 모서리를 비스듬히 잘라냅니다.",
      view: [-30, -30, 230, 150],
      setup(S) { S.lrect(0, 0, 200, 120); },
      steps: [
        { text: "CHA → D → 20 → 20 → 왼쪽 아래 모서리의 두 선", check: (c, K) => K.hasSeg(c, P(0, 20), P(20, 0)) },
        { text: "CHA → D → 30 → 15 → 오른쪽 아래 모서리", check: (c, K) => K.hasSeg(c, P(170, 0), P(200, 15)) || K.hasSeg(c, P(185, 0), P(200, 30)) },
        { text: "CHA → A → 30 → 45 → 오른쪽 위 모서리", check: (c, K) => K.hasSeg(c, P(200, 90), P(170, 120)) },
      ],
      hints: ["거리1은 첫 번째로 고른 선, 거리2는 두 번째 선에 적용됩니다.", "45° 모따기 C5 = 거리 5, 5 와 같습니다."],
    },
    {
      id: "m1-26", stage: "1", lecture: "26", title: "Rotate(회전) · 참조",
      goal: "각도를 알 때는 숫자로, 모를 때는 참조(R)로 '지금 각도 → 원하는 각도'를 맞춰 돌립니다.",
      view: [-80, -30, 420, 140],
      setup(S) {
        S.rect(0, 0, 100, 40, { tag: "r1" });
        const p0 = P(300, 0), p1 = G.add(p0, pol(100, 23)), p2 = G.add(p0, pol(60, 93));
        S.pline([[p0.x, p0.y], [p1.x, p1.y], [p2.x, p2.y]], true, { tag: "t" });
      },
      steps: [
        { text: "RO → 사각형 → 기준점 0,0 → 45", check: (c, K) => { const e = K.byTag(c, "r1"); return e && e.pts.some((p, i) => { const q = e.pts[(i + 1) % 4]; return K.nearPt(p, P(0, 0)) && K.near(((G.deg(G.ang(p, q)) % 360) + 360) % 360, 45, 0.05) && K.near(G.dist(p, q), 100); }); } },
        { text: "RO → 삼각형 → 기준점: 긴 변 왼쪽 끝 → R → 긴 변 두 끝점 → 0 : 긴 변이 수평", check: (c, K) => { const e = K.byTag(c, "t"); return e && K.ev(c, "rotate:ref") && e.pts.some((p, i) => { const q = e.pts[(i + 1) % 3]; return K.near(G.dist(p, q), 100) && K.near(p.y, q.y); }); } },
        { text: "RO → 아무 객체 → C(복사) 옵션으로 원본을 남기고 회전", check: (c, K) => K.ev(c, "rotate:copy") },
      ],
      hints: ["참조 각도는 숫자 대신 두 점을 찍어도 됩니다: R → 끝점 → 끝점 → 새 각도.", "양수 각도 = 반시계 방향입니다."],
    },
    {
      id: "m1-27", stage: "1", lecture: "27", title: "Scale(확대·축소) · 참조",
      goal: "배율을 알면 숫자로, '이 길이가 100이 되게'처럼 목표 길이만 알면 참조(R)로 크기를 바꿉니다.",
      view: [-60, -60, 260, 70],
      setup(S) { S.circle(0, 0, 25, { tag: "c" }); S.line(100, 0, 173.4, 0, { tag: "l" }); },
      steps: [
        { text: "SC → 원 → 기준점: 원 중심 → 2", check: (c, K) => { const e = K.byTag(c, "c"); return e && K.near(e.r, 50); } },
        { text: "SC → 선 → 기준점: 왼쪽 끝 → R → 선의 두 끝점 → 100", check: (c, K) => { const e = K.byTag(c, "l"); return e && K.near(lineLen(e), 100) && K.ev(c, "scale:ref"); } },
        { text: "SC → 원 → C(복사) → 0.5 : 원본을 남긴 작은 원", check: (c, K) => K.ev(c, "scale:copy") },
      ],
      hints: ["참조 길이 73.4를 숫자로 몰라도 두 끝점을 찍으면 됩니다. 도면을 도면 치수에 맞출 때 자주 씁니다."],
    },
    {
      id: "m1-28", stage: "1", lecture: "28", title: "Lengthen(선 길이 조절)",
      goal: "증분·퍼센트·합계·동적 네 방식으로 선과 호의 길이를 바꿉니다. 클릭한 쪽 끝이 움직입니다.",
      view: [-30, -110, 380, 40],
      setup(S) {
        S.line(0, 0, 100, 0, { tag: "L1" }); S.text(0, 8, 6, "L1 (100)");
        S.line(0, -40, 80, -40, { tag: "L2" }); S.text(0, -32, 6, "L2 (80)");
        S.line(0, -80, 150, -80, { tag: "L3" }); S.text(0, -72, 6, "L3 (150)");
        S.arc(300, -60, 50, 0, 90, { tag: "A" });
      },
      steps: [
        { text: "LEN → DE → 20 → L1 오른쪽 끝 클릭: 120", check: (c, K) => { const e = K.byTag(c, "L1"); return e && K.near(lineLen(e), 120); } },
        { text: "LEN → P → 50 → L2 : 40", check: (c, K) => { const e = K.byTag(c, "L2"); return e && K.near(lineLen(e), 40); } },
        { text: "LEN → T → 200 → L3 : 200", check: (c, K) => { const e = K.byTag(c, "L3"); return e && K.near(lineLen(e), 200); } },
        { text: "LEN → DY → 호의 끝을 끌어 늘이기", check: (c, K) => K.ev(c, "lengthen:DY") },
      ],
      hints: ["LEN에서 객체를 먼저 클릭하면 현재 길이만 알려 줍니다(측정).", "증분에 음수를 넣으면 줄어듭니다."],
    },
    {
      id: "m1-29", stage: "1", lecture: "29", title: "Break(끊기) · Join(결합)",
      goal: "선에 틈을 내고, 원을 호로 끊고, 끊긴 선을 다시 하나로 합칩니다.",
      view: [-30, -230, 530, 70],
      setup(S) {
        S.line(0, 0, 300, 0, { tag: "b1" }); S.circle(450, 0, 50, { tag: "bc" });
        S.line(0, -100, 100, -100, { tag: "j1" }); S.line(100, -100, 250, -100, { tag: "j2" });
        S.line(0, -200, 300, -200, { tag: "p1" });
      },
      steps: [
        { text: "BR → 위 선 → F → 100,0 → 200,0 : 틈 100", check: (c, K) => K.hasSeg(c, P(0, 0), P(100, 0)) && K.hasSeg(c, P(200, 0), P(300, 0)) },
        { text: "BR → 원 : 원이 호가 됨(반시계로 첫 점→둘째 점 구간이 지워짐)", check: (c, K) => K.arcs(c).some((a) => K.nearPt(a.c, P(450, 0)) && K.near(a.r, 50)) && !K.circles(c).some((e) => K.nearPt(e.c, P(450, 0))) },
        { text: "J → 가운데 두 선 : 한 선(0~250)", check: (c, K) => K.hasSeg(c, P(0, -100), P(250, -100)) },
        { text: "아래 선을 150,-200에서 틈 없이 끊기(BR 두 번째 점 @ 또는 BREAKATPOINT)", check: (c, K) => K.hasSeg(c, P(0, -200), P(150, -200)) && K.hasSeg(c, P(150, -200), P(300, -200)) },
      ],
      hints: ["BREAK에서 객체를 클릭한 점이 첫 번째 끊기점이 됩니다. 정확한 점이 필요하면 F로 다시 지정하세요.", "두 번째 끊기점에 @를 입력하면 첫 점과 같은 점 = 틈 없이 끊기."],
    },
    {
      id: "m1-30", stage: "1", lecture: "30", title: "Align(정렬)",
      goal: "기울어진 판을 두 점씩 맞춰 한 번에 이동·회전하고, 축척 옵션으로 크기까지 맞춥니다.",
      view: [-60, -260, 460, 300],
      setup(S) {
        S.line(0, 0, 200, 0); S.line(0, 0, 0, 120);
        const mk = (ox, oy, deg, tag) => { const pts = [[0, 0], [100, 0], [100, 50], [0, 50]].map(([x, y]) => { const r = G.rot(P(x, y), P(0, 0), G.rad(deg)); return [r.x + ox, r.y + oy]; }); S.pline(pts, true, { tag }); };
        mk(300, 150, 37, "p"); mk(300, -200, -20, "q");
        S.line(0, -150, 150, -150);
        S.text(310, 130, 8, "판 P"); S.text(310, -225, 8, "판 Q");
      },
      steps: [
        { text: "AL → 판 P → P의 아래 왼쪽 모서리 → 0,0 → P의 아래 오른쪽 모서리 → 200,0 쪽 → Enter → N", check: (c, K) => { const e = K.byTag(c, "p"); return e && K.ptsMatch(e.pts, [P(0, 0), P(100, 0), P(100, 50), P(0, 50)]); } },
        { text: "AL → 판 Q → 아래 두 모서리를 선 (0,-150)~(150,-150) 양 끝에 → Y(축척)", check: (c, K) => { const e = K.byTag(c, "q"); return e && K.ptsMatch(e.pts, [P(0, -150), P(150, -150), P(150, -75), P(0, -75)]); } },
      ],
      hints: ["근원점과 대상점은 짝입니다: 근원1 → 대상1, 근원2 → 대상2. 순서를 바꾸면 뒤집혀 붙습니다.", "세 번째 근원점은 3D용이라 2D에서는 Enter로 넘깁니다."],
    },
    {
      id: "m1-31", stage: "1", lecture: "31", title: "Stretch(늘이기·줄이기)",
      goal: "걸치기 창에 들어간 꼭짓점만 옮겨 도형을 늘입니다. 창 안에 통째로 들어간 원은 따라 이동합니다.",
      view: [-30, -30, 340, 190],
      setup(S) { S.rect(0, 0, 200, 100, { tag: "r" }); S.circle(180, 50, 10, { tag: "c" }); },
      steps: [
        { text: "S → 오른쪽→왼쪽 창으로 오른쪽 변과 원을 감싸기 → Enter → 기준점 → @100,0", check: (c, K) => { const e = K.byTag(c, "r"), o = K.byTag(c, "c"); if (!e || !o) return false; const bb = G.bboxOf(e.pts); return K.near(bb.x1 - bb.x0, 300) && K.near(o.c.x, 280); } },
        { text: "S → 위쪽 변만 걸치기 → 위로 50", check: (c, K) => { const e = K.byTag(c, "r"); if (!e) return false; const bb = G.bboxOf(e.pts); return K.near(bb.y1 - bb.y0, 150) && K.ev(c, "stretch", 2); } },
      ],
      hints: ["STRETCH는 반드시 오른쪽→왼쪽(걸치기)으로 고릅니다. 클릭으로만 고르면 통째로 이동합니다.", "원은 중심이 창 안에 있으면 이동, 밖에 있으면 그대로입니다."],
    },
    {
      id: "m1-32", stage: "1", lecture: "32", title: "Array(배열): 직사각형·원형·경로",
      goal: "같은 구멍을 규칙적으로 늘어놓는 세 가지 배열을 만듭니다. 배열 도중 명령창 옵션으로 개수와 간격을 바꿉니다.",
      view: [-60, -260, 520, 180],
      setup(S) {
        S.circle(0, 0, 10, { tag: "rc" });
        S.circle(400, 0, 80); S.circle(400, 60, 8, { tag: "pc" });
        S.line(0, -200, 400, -200, { tag: "path" }); S.circle(0, -200, 10, { tag: "pi" });
        S.text(0, -30, 8, "직사각형"); S.text(360, -100, 8, "원형"); S.text(0, -240, 8, "경로");
      },
      steps: [
        { text: "ARRAYRECT → 왼쪽 위 작은 원 → COU → 4 → 3 → S → 50 → 50 → Enter", check: (c, K) => { for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) if (!K.findCircle(c, P(50 * i, 50 * j), 10)) return false; return true; } },
        { text: "ARRAYPOLAR → R8 원 → 중심: 큰 원 중심 → I → 6 → Enter", check: (c, K) => [0, 1, 2, 3, 4, 5].every((k) => K.findCircle(c, G.add(P(400, 0), pol(60, 90 + 60 * k)), 8)) },
        { text: "ARRAYPATH → 아래 원 → 경로: 아래 선 → I → 5 → Enter", check: (c, K) => [0, 100, 200, 300, 400].every((x) => K.findCircle(c, P(x, -200), 10)) },
      ],
      hints: ["배열은 기본이 '연관 배열'이라 하나의 객체입니다. 나중에 ARRAYEDIT로 개수·간격을 바꿀 수 있습니다.", "배열 도중 옵션은 명령창의 [ ] 안 글자를 클릭해도 됩니다."],
    },
    {
      id: "m1-34", stage: "1", lecture: "34", title: "Array 기준점 활용",
      goal: "경로 배열의 기본 기준점은 '경로의 시작점'이라 경로에서 떨어진 객체는 떨어진 채로 따라갑니다. 기준점(B)을 객체 중심으로 바꿔 경로 위에 올립니다.",
      view: [-40, -60, 440, 100],
      setup(S) { S.line(0, 0, 400, 0, { tag: "path" }); S.circle(0, 50, 10, { tag: "item" }); },
      steps: [
        { text: "ARRAYPATH → 원 → 경로: 선 → B → 원 중심 → I → 5 : 원 다섯 개가 선 위에", check: (c, K) => [0, 100, 200, 300, 400].every((x) => K.findCircle(c, P(x, 0), 10)) },
        { text: "ARRAYEDIT → 배열 → I → 9 : 항목 수 바꾸기(연관 배열의 장점)", check: (c, K) => [0, 50, 100, 150, 200, 250, 300, 350, 400].every((x) => K.findCircle(c, P(x, 0), 10)) },
      ],
      hints: ["기준점 없이 먼저 한 번 만들어 보면(U로 취소) 차이가 확실히 보입니다.", "원본 편집(ARRAYEDIT → S)으로 첫 항목을 고치고 ARRAYCLOSE를 입력하면 모든 항목이 같이 바뀝니다(33강)."],
    },
    {
      id: "m1-35", stage: "1", lecture: "35", title: "종합 예제: 플랜지 판",
      goal: "200 × 200 판(모서리 R20), 가운데 Ø100 구멍, 피치원 Ø150 위 Ø18 볼트 구멍 4개, 중심선까지 기초 명령을 모두 써서 완성합니다.",
      view: [-40, -40, 240, 240],
      steps: [
        { text: "REC 200 × 200 → F R20 P 로 네 모서리 둥글게", check: (c, K) => K.ents(c).some((e) => { if (e.type !== "pline" || !e.closed) return false; const bb = G.bbox(e); return K.near(bb.x1 - bb.x0, 200) && K.near(bb.y1 - bb.y0, 200) && G.plineSegs(e).filter((g) => g.k === "A" && K.near(g.r, 20)).length === 4; }) },
        { text: "판 한가운데 Ø100 구멍(C → D → 100)", check: (c, K) => plateCenter(c, K, (ct) => !!K.findCircle(c, ct, 50)) },
        { text: "피치원 Ø150 위 Ø18 볼트 구멍 4개(ARRAYPOLAR 또는 COPY)", check: (c, K) => plateCenter(c, K, (ct) => K.circles(c).filter((e) => K.near(e.r, 9) && K.near(G.dist(e.c, ct), 75)).length >= 4) },
        { text: "중심선 도면층에 판 중심을 지나는 가로·세로 중심선", check: (c, K) => plateCenter(c, K, (ct) => { const cl = K.lines(c, "중심선"); const through = (e) => G.segClosest({ k: "L", a: G.add(e.a, G.mul(G.sub(e.a, e.b), 10)), b: G.add(e.b, G.mul(G.sub(e.b, e.a), 10)) }, ct).d < 0.01; return cl.some((e) => through(e) && K.near(e.a.y, e.b.y)) && cl.some((e) => through(e) && K.near(e.a.x, e.b.x)); }) },
      ],
      hints: ["볼트 구멍 하나를 판 중심에서 @0,75 (FROM)으로 만들고 원형 배열 4개, 채울 각도 360.", "도면층은 LA로 관리자를 열어 '중심선'을 현재로 바꾸거나, 그린 뒤 MA(특성 일치)로 맞춥니다."],
    },
    {
      id: "m1-v1", stage: "1", title: "3D를 보고 정면도·평면도 그리기",
      goal: "오른쪽 위 3D 모델(계단 블록 100 × 60 × 50, 지름 20 관통 구멍)을 3각법으로 그립니다. 정면도를 먼저, 평면도는 정면도 바로 위에 x를 맞춰 그립니다.",
      reference: { model: "step-block" },
      view: [-30, -30, 160, 190],
      layer: "외형선",
      ltscale: 0.3,
      steps: [
        { text: "정면도 외형(외형선 층): 가로 100, 바닥 두께 20, 왼쪽 세움부 40 × 50", check: (c, K) => !!frontOf(c, K) },
        { text: "정면도 숨은선(숨은선 층): 구멍 양쪽 x = 60, 80 위치의 세로 파선 두 개(높이 20)", check: (c, K) => { const F = frontOf(c, K); return !!F && [60, 80].every((x) => K.hasSeg(c, P(F.x + x, F.y), P(F.x + x, F.y + 20), { layer: "숨은선" })); } },
        { text: "평면도(정면도 위): 100 × 60 사각형 + 계단 경계선(x = 40)", check: (c, K) => !!topOf(c, K) },
        { text: "평면도의 구멍: 중심 (70, 30)에 R10 원", check: (c, K) => { const T = topOf(c, K); return !!T && !!K.findCircle(c, P(T.x + 70, T.y + 30), 10); } },
        { text: "3각법 배치: 평면도가 정면도 바로 위, 가로 위치가 같음", check: (c, K) => { const F = frontOf(c, K), T = topOf(c, K); return !!F && !!T && K.near(F.x, T.x) && T.y >= F.y + 50; } },
      ],
      hints: ["3각법(KS 기본)은 평면도가 정면도 위, 우측면도가 정면도 오른쪽입니다.", "구멍은 앞에서 보면 가려지므로 숨은선(파선)입니다. LA에서 '숨은선'을 현재 층으로 바꾸고 그리세요.", "정면도 윤곽: 0,0 → @100,0 → @0,20 → @-60,0 → @0,30 → @-40,0 → C."],
    },
    // ---------- 3년차 ----------
    {
      id: "m2-p1", stage: "2", title: "배관 평면 단선 경로",
      goal: "4\"-CW-1001 배관의 중심선을 평면도에 단선으로 그립니다. 꺾이는 곳은 LR 엘보(반지름 1.5D = 152.4)로 FILLET하고 라인 번호를 씁니다.",
      view: [-500, -800, 5600, 2900],
      layer: "배관",
      textH: 100, dimTs: 100,
      setup(S) { S.text(-300, -500, 100, "N ↑  평면도 (단위 mm)", { layer: "문자" }); },
      steps: [
        { text: "배관 층에서 PL: 0,0 → @3000,0 → @0,2000 → @2000,0", check: (c, K) => K.chain(c, [P(3000, 0), P(0, 2000), P(2000, 0)], { layer: "배관" }) || lineRoute(c, K) },
        { text: "F → R → 152.4 → P(폴리선) : 두 모서리를 LR 엘보로", check: (c, K) => K.arcs(c, "배관").filter((a) => K.near(a.r, 152.4, 0.05)).length >= 2 },
        { text: "DT로 라인 번호 4\"-CW-1001 (높이 100)", check: (c, K) => K.texts(c).some((t) => /CW-?1001/i.test(t.s)) },
      ],
      hints: ["4인치 호칭경에서 롱 래디어스(LR) 엘보 중심 반지름 = 1.5 × 4\" = 6\" = 152.4 mm (ASME B16.9).", "배관 평면도는 보통 12\" 이하를 단선(중심선 하나)으로 그립니다. 회사 표준을 먼저 확인하세요.", "FILLET → P는 폴리선의 모든 모서리를 같은 반지름으로 깎습니다."],
    },
    // ---------- 5년차 ----------
    {
      id: "m3-i1", stage: "3", title: "등각(아이소) 배관 그리기", mode: "iso",
      goal: "등각 모드에서 배관 경로를 30° 축으로 그립니다. 동쪽 = 30°, 북쪽 = 150°, 위 = 90°로 약속합니다(교재 약속).",
      view: [-300, -300, 2000, 2500],
      layer: "배관",
      textH: 60,
      toggles: { iso: false, ortho: true, grid: true },
      steps: [
        { text: "등각 모드 켜기(상태 막대 '등각' 또는 ISODRAFT → T)", check: (c) => c.t.iso },
        { text: "F5로 등각평면 바꾸기(좌측 → 상단 → 우측)", check: (c, K) => K.ev(c, "isoplane") },
        { text: "동쪽 1500 → 위 600 → 북쪽 1000 → 동쪽 800 (직교 켜고 방향 + 숫자)", check: (c, K) => K.chain(c, [pol(1500, 30), pol(600, 90), pol(1000, 150), pol(800, 30)]) },
        { text: "DT로 라인 번호 1001 쓰기", check: (c, K) => K.texts(c).some((t) => /1001/.test(t.s)) },
      ],
      hints: ["등각평면마다 직교가 허락하는 두 축이 다릅니다: 좌측(90°·150°), 상단(30°·150°), 우측(30°·90°). 막히면 F5.", "아이소는 축척이 없고 치수로 길이를 말합니다. 여기서는 길이를 맞춰 그리는 연습만 합니다."],
    },
  ];

  function plateCenter(c, K, fn) {
    for (const e of K.ents(c)) {
      if (e.type !== "pline" || !e.closed) continue;
      const bb = G.bbox(e);
      if (K.near(bb.x1 - bb.x0, 200) && K.near(bb.y1 - bb.y0, 200) && fn(P((bb.x0 + bb.x1) / 2, (bb.y0 + bb.y1) / 2))) return true;
    }
    return false;
  }
  const FRONT = [P(0, 0), P(100, 0), P(100, 20), P(40, 20), P(40, 50), P(0, 50)];
  function frontOf(c, K) {
    const p = K.polys(c, "외형선").find((q) => K.matchPoly(q.pts, FRONT, true));
    if (!p) return null;
    const bb = G.bboxOf(p.pts);
    return { x: bb.x0, y: bb.y0 };
  }
  function topOf(c, K) {
    for (const r of K.rects(c, 100, 60, { layer: "외형선" })) {
      const x = r.bb.x0, y = r.bb.y0;
      if (K.hasSeg(c, P(x + 40, y), P(x + 40, y + 60), { layer: "외형선" })) return { x, y };
    }
    return null;
  }
  function lineRoute(c, K) {
    return K.hasSeg(c, P(0, 0), P(3000, 0), { layer: "배관" }) && K.hasSeg(c, P(3000, 0), P(3000, 2000), { layer: "배관" }) && K.hasSeg(c, P(3000, 2000), P(5000, 2000), { layer: "배관" });
  }
  ACAD.mission = (id) => ACAD.missions.find((m) => m.id === id);
})();
