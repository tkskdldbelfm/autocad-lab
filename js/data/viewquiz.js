// 도면 퀴즈 문제. 보기 그림은 뷰어와 같은 은선 처리 엔진으로 그 자리에서 만든다.
// 문제 종류
//  pick   : 3D(또는 주어진 투상도)를 보고 맞는 투상도 고르기. options = [{ model, view, mirror, hidden }], 첫 번째가 정답
//  part   : 한 투상도에서 굵게 표시한 선이 3D의 어느 부분인지 고르기. options = 부품 id 목록, 첫 번째가 정답
//  text   : 글 보기. options 첫 번째가 정답. figure = SVG 문자열(선택)
//  iso    : 단선 평면도·입면도를 보고 맞는 아이소 고르기. route = 방향 목록, options = 경로 목록(첫 번째가 정답)
window.ACAD = window.ACAD || {};

(function () {
  const V = { top: "평면도", front: "정면도", right: "우측면도" };
  ACAD.viewQuizSets = [
    {
      id: "basic", stage: "1", title: "3D → 투상도",
      desc: "3D를 돌려 보고 맞는 정면도·평면도·우측면도를 고른다.",
      questions: [
        { type: "pick", model: "block-step", view: "front", stim: "3d",
          options: [{ model: "block-step", view: "front" }, { model: "block-step", view: "front", mirror: true }, { model: "block-step", view: "right" }, { model: "block-step", view: "top" }],
          why: "정면도는 앞(−Y 쪽)에서 본 모양이다. 좌우가 뒤집힌 L자는 뒤에서 본 배면도다.", check: { part: "front" } },
        { type: "pick", model: "block-slot", view: "top", stim: "3d",
          options: [{ model: "block-slot", view: "top" }, { model: "block-slot", view: "front" }, { model: "block-slot", view: "right" }, { model: "block-basic", view: "top" }],
          why: "위에서 보면 홈 바닥이 두 세로선 사이의 띠로 보인다. U자는 정면도, 파선이 있는 사각형은 우측면도다.", check: { part: "slot" } },
        { type: "pick", model: "wedge-block", view: "right", stim: "3d",
          options: [{ model: "wedge-block", view: "right" }, { model: "wedge-block", view: "left" }, { model: "wedge-block", view: "front" }, { model: "wedge-block", view: "top" }],
          why: "오른쪽에서 보면 경사면이 보이는 쪽에 있어 높이 20의 선이 실선이다. 왼쪽에서 보면 같은 선이 가려져 파선이 된다(좌측면도).", check: { part: "slope" } },
        { type: "pick", model: "bracket-l", view: "front", stim: "3d",
          options: [{ model: "bracket-l", view: "front" }, { model: "bracket-l", view: "right" }, { model: "bracket-l", view: "top" }, { model: "bracket-l", view: "back" }],
          why: "정면에서 보면 세움판 구멍이 원으로, 바닥 구멍이 파선으로 보인다. 배면도에서는 리브가 세움판에 가려 파선이 된다.", check: { part: "hole-up" } },
        { type: "pick", model: "bearing-block", view: "top", stim: "3d",
          options: [{ model: "bearing-block", view: "top" }, { model: "bearing-block", view: "bottom" }, { model: "bearing-block", view: "front" }, { model: "block-hole", view: "top" }],
          why: "위에서 보면 주유 구멍이 가운데 작은 원으로 보이고 축 구멍은 파선 두 줄이다. 저면도에는 주유 구멍 원이 없다.", check: { part: "oil" } },
        { type: "pick", model: "shaft-flange", view: "right", stim: "3d",
          options: [{ model: "shaft-flange", view: "right" }, { model: "shaft-flange", view: "left" }, { model: "shaft-flange", view: "front" }, { model: "shaft-flange", view: "top" }],
          why: "축 끝(오른쪽)에서 보면 축·보스·플랜지가 모두 원으로 겹친다. 왼쪽(플랜지 쪽)에서 보면 축과 보스는 플랜지에 가려 파선이 된다.", check: { part: "shaft" } },
      ],
    },
    {
      id: "missing", stage: "1", title: "빠진 한 면",
      desc: "두 투상도를 보고 나머지 한 면을 고른다. 3D 없이 머릿속에서 모양을 세운다.",
      questions: [
        { type: "pick", model: "block-step", view: "right", stim: { views: ["front", "top"] },
          options: [{ model: "block-step", view: "right" }, { model: "block-basic", view: "right" }, { model: "block-slot", view: "right" }, { model: "block-step", view: "left" }],
          why: "정면도의 낮은 단(높이 25)이 오른쪽에 있으니, 오른쪽에서 보면 그 단의 모서리가 실선 가로선으로 보인다.", check: { part: "step" } },
        { type: "pick", model: "block-slot", view: "top", stim: { views: ["front", "right"] },
          options: [{ model: "block-slot", view: "top" }, { model: "block-basic", view: "top" }, { model: "block-step", view: "top" }, { model: "block-hole", view: "top" }],
          why: "정면도의 U자 홈이 앞에서 뒤까지 이어진다(우측면도의 파선이 끝까지 간다). 그래서 평면도에는 홈 폭만큼 떨어진 세로선 두 줄이 생긴다.", check: { part: "slot" } },
        { type: "pick", model: "wedge-block", view: "front", stim: { views: ["top", "right"] },
          options: [{ model: "wedge-block", view: "front" }, { model: "wedge-block", view: "front", mirror: true }, { model: "block-step", view: "front" }, { model: "block-basic", view: "front" }],
          why: "평면도와 우측면도 모두 가운데 선이 있지만 계단이 아니다. 우측면도의 선(높이 20)과 평면도의 선(x = 40)을 이으면 비스듬한 면이 나온다.", check: { part: "slope" } },
        { type: "pick", model: "block-hole", view: "right", stim: { views: ["top", "front"] },
          options: [{ model: "block-hole", view: "right" }, { model: "block-hole", view: "right", hidden: false }, { model: "block-basic", view: "right" }, { model: "block-slot", view: "right" }],
          why: "구멍은 판을 관통하므로 우측면도에도 파선 두 줄과 중심선이 있어야 한다. 파선을 빼먹은 보기가 가장 흔한 실수다.", check: { part: "hole" } },
        { type: "pick", model: "bracket-l", view: "right", stim: { views: ["top", "front"] },
          options: [{ model: "bracket-l", view: "right" }, { model: "bracket-l", view: "left" }, { model: "bracket-l", view: "right", mirror: true }, { model: "block-step", view: "front" }],
          why: "평면도에서 세움판이 뒤(위쪽)에 있으니 우측면도에서 L자의 세로 다리는 오른쪽(뒤)에 온다. 리브는 앞에서 보이므로 실선이다.", check: { part: "rib" } },
        { type: "pick", model: "bearing-block", view: "top", stim: { views: ["front", "right"] },
          options: [{ model: "bearing-block", view: "top" }, { model: "bearing-block", view: "bottom" }, { model: "bracket-l", view: "top" }, { model: "block-hole", view: "top" }],
          why: "정면도의 작은 파선(주유 구멍)이 꼭대기에서 시작하므로 평면도에서는 작은 원으로 보인다.", check: { part: "oil" } },
      ],
    },
    {
      id: "hidden", stage: "1", title: "숨은선·중심선",
      desc: "굵게 표시한 선이 3D의 어느 부분인지 찾는다.",
      questions: [
        { type: "part", model: "block-hole", view: "front", part: "hole", options: ["hole", "top", "back", "bottom"],
          why: "세로 파선 두 줄은 판 안에 숨은 구멍의 벽이다. 파선 사이의 1점 쇄선은 구멍의 중심선이다." },
        { type: "part", model: "block-slot", view: "right", part: "slot", options: ["slot", "top", "right", "bottom"],
          why: "높이 20의 가로 파선은 홈 바닥이다. 오른쪽 벽이 앞을 막고 있어 숨은선이다." },
        { type: "part", model: "bracket-l", view: "front", part: "hole-base", options: ["hole-base", "hole-up", "rib", "upright"],
          why: "바닥판 두께(12) 안에서만 보이는 짧은 파선은 바닥판의 볼트 구멍이다." },
        { type: "part", model: "bearing-block", view: "top", part: "bore", options: ["bore", "mount", "oil", "boss"],
          why: "평면도에서 앞뒤로 길게 이어진 두 파선은 앞뒤로 관통한 축 구멍(Ø40)의 벽이다." },
        { type: "part", model: "shaft-flange", view: "top", part: "bolt", options: ["bolt", "key", "hub", "shaft"],
          why: "플랜지 두께(15) 안의 짧은 파선은 볼트 구멍이다. 키 홈은 축 위에서 실선으로 보인다." },
        { type: "text", prompt: "1점 쇄선(긴 선-짧은 선이 번갈아 나오는 가는 선)은 무엇을 나타내나?",
          options: ["구멍이나 원통의 중심(축)", "보이지 않는 모서리", "움직이는 부품의 다른 위치(가상선)", "치수를 재는 기준선"],
          why: "가는 1점 쇄선은 중심선이다. 보이지 않는 모서리는 파선(숨은선), 가상선은 가는 2점 쇄선이다." },
      ],
    },
    {
      id: "section", stage: "1", title: "단면도 읽기",
      desc: "잘라서 본 그림(단면도)을 고른다. 해칭할 곳과 하지 않을 곳을 가린다.",
      questions: [
        { type: "pick", model: "block-hole", view: "front", stim: "3d",
          prompt: "구멍 뚫린 판을 <b>구멍 중심(Y = 30)에서 잘라 앞에서 본 단면도 A-A</b>는 어느 것인가?",
          options: [{ model: "block-hole", view: "front", section: { at: 30 } }, { model: "block-hole", view: "front" }, { model: "block-basic", view: "front", section: {} }, { model: "block-slot", view: "front", section: {} }],
          why: "잘린 판은 45° 해칭, 구멍 자리는 잘린 재료가 없으니 흰 틈으로 남는다. 파선이 있는 그림은 자르지 않은 정면도다.", check: { part: "hole", section: "A" } },
        { type: "pick", model: "bearing-block", view: "right", stim: "3d",
          prompt: "베어링 블록을 <b>축 구멍 중심(X = 60)에서 잘라 오른쪽에서 본 단면도 B-B</b>는 어느 것인가?",
          options: [{ model: "bearing-block", view: "right", section: { at: 60 } }, { model: "bearing-block", view: "right" }, { model: "bearing-block", view: "front", section: { at: 25 } }, { model: "bracket-l", view: "right", section: { at: 50 } }],
          why: "축 구멍과 주유 구멍이 길이 방향으로 잘려 해칭 사이의 빈 띠로 보인다. 단면도에는 숨은선을 그리지 않는다.", check: { part: "bore", section: "B" } },
        { type: "pick", model: "shaft-flange", view: "front", stim: "3d",
          prompt: "플랜지 축을 <b>축 중심(Y = 0)에서 잘라 앞에서 본 단면도 A-A</b>로 KS 규칙에 맞는 것은?",
          options: [{ model: "shaft-flange", view: "front", section: { at: 0 } }, { model: "shaft-flange", view: "front", section: { at: 0 }, hatchAll: true }, { model: "shaft-flange", view: "front" }, { model: "shaft-flange", view: "top" }],
          why: "플랜지와 보스는 해칭하지만, 속이 꽉 찬 축은 길이 방향으로 잘라도 해칭하지 않는다. 축까지 해칭한 보기는 규칙 위반이다.", check: { part: "shaft", section: "A" } },
        { type: "pick", model: "bracket-l", view: "right", stim: "3d",
          prompt: "L 브래킷을 <b>리브 가운데(X = 50)에서 잘라 오른쪽에서 본 단면도 B-B</b>로 KS 규칙에 맞는 것은?",
          options: [{ model: "bracket-l", view: "right", section: { at: 50 } }, { model: "bracket-l", view: "right", section: { at: 50 }, hatchAll: true }, { model: "bracket-l", view: "right" }, { model: "bracket-l", view: "left" }],
          why: "리브를 판과 나란히(길이 방향으로) 자르면 해칭하지 않고 외형선만 그린다. 해칭하면 속이 꽉 찬 덩어리처럼 잘못 읽힌다.", check: { part: "rib", section: "B" } },
        { type: "pick", model: "bearing-block", view: "front", stim: "3d",
          prompt: "베어링 블록의 <b>한쪽 단면도(반단면) A-A</b>는 어느 것인가?",
          options: [{ model: "bearing-block", view: "front", section: { at: 25, half: true } }, { model: "bearing-block", view: "front", section: { at: 25 } }, { model: "bearing-block", view: "front" }, { model: "bearing-block", view: "top" }],
          why: "한쪽 단면은 대칭인 부품의 4분의 1만 잘라, 중심선 한쪽은 겉모양, 다른 쪽은 속(해칭)을 한 그림에 보여 준다. 전체가 해칭된 것은 온단면이다.", check: { part: "boss", section: "A", half: true } },
      ],
    },
    {
      id: "boxcut", stage: "1", title: "보충: 따낸 자리·원기둥·구멍",
      desc: "입문·신입 보충 모델로 3면도를 고른다. 바깥 상자에서 무엇이 빠지고 더해졌는지 본다.",
      questions: [
        { type: "pick", model: "block-notch", view: "front", stim: "3d",
          options: [{ model: "block-notch", view: "front" }, { model: "block-notch", view: "front", mirror: true }, { model: "block-notch", view: "right" }, { model: "block-step", view: "front" }],
          why: "따낸 자리는 앞쪽 오른쪽 위에 있다. 정면도에서는 오른쪽 위 ㄱ자 선이다. 뒤에 재료가 남아 있어 바깥 윤곽은 사각형 그대로다. 계단 블록처럼 윤곽이 꺾이지 않는다.", check: { part: "notch" } },
        { type: "pick", model: "block-notch", view: "right", stim: { views: ["front", "top"] },
          options: [{ model: "block-notch", view: "right" }, { model: "block-notch", view: "left" }, { model: "block-notch", view: "right", mirror: true }, { model: "block-basic", view: "right" }],
          why: "평면도에서 따낸 자리가 앞쪽(아래)에 있으니 우측면도에서는 왼쪽(앞)에 ㄱ자가 생긴다. 왼쪽에서 본 좌측면도에서는 같은 자리가 가려져 파선이 된다.", check: { part: "notch" } },
        { type: "pick", model: "block-tee", view: "top", stim: "3d",
          options: [{ model: "block-tee", view: "top" }, { model: "block-vgroove", view: "top" }, { model: "block-step", view: "top" }, { model: "block-tee", view: "right" }],
          why: "기둥의 양옆 벽(x = 30, 60)이 위에서 세로선 두 줄로 보인다. 세 줄이면 V홈(가장자리 둘 + 골), 한 줄이면 계단 블록이다.", check: { part: "web" } },
        { type: "pick", model: "plate-boss", view: "front", stim: "3d",
          options: [{ model: "plate-boss", view: "front" }, { model: "plate-boss", view: "top" }, { model: "step-hole", view: "front" }, { model: "block-hole", view: "front" }],
          why: "원기둥을 옆에서 보면 사각형이다. 정면도에서 보스는 판 위의 30 × 25 사각형이고, 원은 축 방향인 평면도에만 나온다.", check: { part: "boss" } },
        { type: "pick", model: "step-hole", view: "right", stim: { views: ["front", "top"] },
          options: [{ model: "step-hole", view: "right" }, { model: "step-hole", view: "right", hidden: false }, { model: "block-step", view: "right" }, { model: "step-hole", view: "left" }],
          why: "평면도의 원이 구멍이고, 정면도의 파선이 높이 25까지만 있다. 그래서 우측면도에도 높이 25까지의 파선 두 줄이 있어야 한다. 파선을 빼먹은 보기가 가장 흔한 실수다.", check: { part: "hole" } },
        { type: "pick", model: "block-vgroove", view: "right", stim: { views: ["front", "top"] },
          options: [{ model: "block-vgroove", view: "right" }, { model: "block-vgroove", view: "right", hidden: false }, { model: "block-slot", view: "right" }, { model: "block-vgroove", view: "front" }],
          why: "오른쪽 벽이 V홈을 모두 가린다. 골(높이 25)만 가로 파선 한 줄로 남는다. 홈 블록의 파선은 높이 20이고, 사각형의 비율도 다르다.", check: { part: "groove" } },
        { type: "part", model: "step-hole", view: "front", part: "hole", options: ["hole", "riser", "step", "right"],
          why: "낮은 단 두께(높이 25) 안의 세로 파선 두 줄은 위아래로 뚫린 구멍의 벽이다. 단 벽면은 높이 25~50의 실선이다." },
        { type: "part", model: "block-vgroove", view: "top", part: "groove", options: ["groove", "top", "front", "right"],
          why: "평면도 가운데의 세로선 세 줄은 V홈의 두 가장자리와 골이다. 위에서는 가리는 것이 없어 모두 실선이다." },
        { type: "text", prompt: "원기둥을 축에 수직인 방향(옆)에서 본 투상도의 모양은?",
          options: ["사각형(폭 = 지름)", "원", "타원", "삼각형"],
          why: "원기둥은 축 방향에서만 원이다. 옆에서 보면 폭이 지름, 높이가 길이인 사각형이고 가운데에 중심선이 들어간다." },
      ],
    },
    {
      id: "piping", stage: "2", title: "배관 도면 읽기",
      desc: "평면도의 원, 단선 평면·입면과 아이소, 라인 번호와 EL을 읽는다.",
      questions: [
        { type: "pickplan", model: "pipe-elbow-up", prompt: "평면도의 원(수직관)은 위로 올라가나, 아래로 내려가나?",
          options: ["위로 올라간다(보는 사람 쪽)", "아래로 내려간다"],
          why: "수평관 선이 원 테두리에서 멈춘다. 올라온 관(과 플랜지)이 엘보를 가리기 때문이다." },
        { type: "pickplan", model: "pipe-elbow-down", prompt: "이번 평면도의 원은?",
          options: ["아래로 내려간다", "위로 올라간다(보는 사람 쪽)"],
          why: "엘보가 원 위를 덮어 수평관 선이 원 중심까지 들어간다. 내려가는 관은 엘보 밑에 숨는다." },
        { type: "iso", prompt: "단선 평면도와 입면도(남쪽에서 북쪽을 보며)를 보고 맞는 아이소를 고르시오.",
          route: [["E", 1000], ["U", 600], ["N", 800]],
          options: [[["E", 1000], ["U", 600], ["N", 800]], [["E", 1000], ["U", 600], ["S", 800]], [["E", 1000], ["D", 600], ["N", 800]], [["N", 1000], ["U", 600], ["E", 800]]],
          why: "평면도에서 동쪽으로 간 뒤 원(수직관)이 있고 북쪽으로 간다. 입면도에서 그 수직관이 위로 올라간다. 아이소에서 북쪽은 오른쪽 위다." },
        { type: "iso", prompt: "이번에는 어느 아이소가 맞을까?",
          route: [["N", 800], ["E", 600], ["D", 500], ["E", 400]],
          options: [[["N", 800], ["E", 600], ["D", 500], ["E", 400]], [["N", 800], ["E", 600], ["U", 500], ["E", 400]], [["S", 800], ["E", 600], ["D", 500], ["E", 400]], [["N", 800], ["W", 600], ["D", 500], ["W", 400]]],
          why: "평면도에서 북쪽 → 동쪽, 입면도에서 두 번째 동쪽 구간이 낮다. 그 사이의 수직관은 아래로 내려간다." },
        { type: "text", prompt: '라인 번호 4"-CW-1001-A1A-CS에서 A1A는 무엇인가?',
          options: ["배관 등급(재질·두께·플랜지 등급을 정한 표)", "재질", "유체 기호", "호칭경"],
          why: "A1A는 배관 등급(piping class)이다. 이 교재의 A1A는 탄소강, SCH40, Class 150으로 정한 가상 등급이다. CS가 재질, CW가 유체, 4\"가 호칭경이다." },
        { type: "text", prompt: '4" 관(바깥지름 114.3)의 CL이 EL+1600이다. BOP(관 밑)는?',
          options: ["EL+1542.9", "EL+1657.1", "EL+1485.7", "EL+1600"],
          why: "BOP = CL − 바깥지름/2 = 1600 − 57.15 = 1542.85. 서포트 슈 윗면 높이가 이 값이다." },
        { type: "text", prompt: "P&ID만 보고는 알 수 없는 것은?",
          options: ["배관이 지나가는 실제 높이", "라인 번호", "밸브 종류", "계기 태그"],
          why: "P&ID는 축척이 없는 연결도다. 높이와 위치는 평면도·입면도·아이소에서 읽는다." },
      ],
    },
    {
      id: "isodrill", stage: "2", title: "보충: 단선 ↔ 아이소 반복",
      desc: "풀 때마다 새 배관 경로가 나온다. 평면·입면을 아이소로 합치고, 아이소 치수로 높이를 계산한다.",
      count: 8,
      gen: (seed) => isoSet(seed),
      tip: `<p>1. 평면도에서 동서남북 순서를, 입면도에서 위·아래를 읽어 방향 순서를 적는다(예: 동 → 위 → 북).</p><p>2. 아이소에서 북쪽은 오른쪽 위, 동쪽은 오른쪽 아래, 위는 위다. 검은 점이 시작점이다.</p><p>3. 높이: 올라간 구간은 더하고 내려간 구간은 뺀다. 수평 구간의 길이는 높이와 상관없다.</p>`,
    },
    {
      id: "pipecalc", stage: "2", title: "보충: 배관 숫자 계산",
      desc: "외경, TOP·BOP, 서포트 높이, 엘보 치수, 기울기, 간격처럼 도면을 읽다가 바로 해야 하는 계산.",
      tip: `<p>외경표: 2" 60.3 · 3" 88.9 · 4" 114.3 · 6" 168.3 · 8" 219.1</p><p>TOP = CL + 외경/2, BOP = CL − 외경/2</p><p>LR 엘보 중심~끝 = 1.5 × 호칭(인치) × 25.4, SR = 1.0 × 호칭 × 25.4</p><p>기울기 1/100 = 길이 100마다 1 낮아짐</p>`,
      questions: [
        { type: "text", prompt: '6" 배관의 바깥지름(OD)은?',
          options: ["168.3", "152.4", "150.0", "165.1"],
          why: "외경은 호칭마다 표로 정해져 있다. 6\" = DN150 = OD 168.3mm. 152.4는 6 × 25.4로 호칭을 그대로 계산한 값이라 틀린다." },
        { type: "text", prompt: '6" 관의 CL이 EL+3500이다. 관 윗면(TOP)은?',
          options: ["EL+3584.2", "EL+3415.9", "EL+3576.2", "EL+3668.3"],
          why: "TOP = CL + 외경/2 = 3500 + 168.3/2 = 3584.15. 3415.9는 BOP, 3576.2는 호칭 6\"(152.4)의 절반을 더한 값이다." },
        { type: "text", prompt: '파이프 랙 빔 윗면(TOS)이 EL+6000, 서포트 슈 높이가 100이다. 슈 위에 놓인 4" 관의 CL은?',
          options: ["EL+6157.2", "EL+6100.0", "EL+6057.2", "EL+6214.3"],
          why: "관 밑면 BOP = TOS + 슈 = 6100. CL = BOP + 외경/2 = 6100 + 57.15 = 6157.15. 6100은 BOP이고, 6057.2는 슈를 빼먹은 값이다." },
        { type: "text", prompt: '4" 롱 래디어스(LR) 90° 엘보의 중심에서 끝면까지 거리는?',
          options: ["152.4", "101.6", "114.3", "228.6"],
          why: "ASME B16.9 LR 엘보는 1.5 × 호칭: 1.5 × 4\" = 6\" = 152.4mm. 101.6은 숏 래디어스(SR, 1.0 × 호칭)다." },
        { type: "text", prompt: '6" 숏 래디어스(SR) 90° 엘보의 중심에서 끝면까지 거리는?',
          options: ["152.4", "228.6", "168.3", "76.2"],
          why: "SR 엘보는 1.0 × 호칭: 6\" = 152.4mm. 228.6은 LR(1.5 × 6\")이다. 외경 168.3과 헷갈리지 않는다." },
        { type: "text", prompt: "드레인 쪽으로 1/100 기울기를 준 수평 길이 6000의 배관. 양 끝의 높이 차는?",
          options: ["60", "6", "600", "100"],
          why: "1/100은 100 갈 때 1 낮아진다는 뜻이다. 6000 × 1/100 = 60mm." },
        { type: "text", prompt: "아이소 치수가 동 1500 → 북 800 → 동 1200 → 남 300이다. 끝점은 시작점에서 평면으로 어디인가?",
          options: ["동 2700, 북 500", "동 2700, 북 1100", "동 1500, 북 500", "동 2700, 남 500"],
          why: "같은 축끼리 더한다. 동서: 1500 + 1200 = 동 2700. 남북: 800 − 300 = 북 500." },
        { type: "text", prompt: "시작 EL+1200에서 위 900 → 동 1500 → 아래 400 → 북 600으로 간다. 끝점의 EL은?",
          options: ["EL+1700", "EL+2500", "EL+700", "EL+3200"],
          why: "수평 구간은 높이를 바꾸지 않는다. 1200 + 900 − 400 = 1700. 2500은 아래 400도 더한 값이다." },
        { type: "text", prompt: "4\"와 6\" 관의 CL 간격이 300이다(보온 없음). 두 관 바깥면 사이의 빈 간격은?",
          options: ["158.7", "300.0", "141.3", "185.7"],
          why: "빈 간격 = CL 간격 − 두 관의 반지름 = 300 − 57.15 − 84.15 = 158.7mm. 평면도에서 배관이 단선이면 이 계산으로 실제 간격을 확인한다." },
        { type: "text", prompt: "펌프 흡입측 수평 배관의 편심 리듀서는 보통 어떻게 둡니까?",
          options: ["평평한 면을 위로(FOT): 공기가 고이지 않게", "평평한 면을 아래로(FOB): 관 밑면 높이를 맞추려고", "동심 리듀서만 쓴다", "방향은 상관없다"],
          why: "흡입측에 공기 주머니가 생기면 펌프에 문제가 생긴다. 그래서 윗면을 평평하게(FOT) 둔다. 파이프 랙 위에서는 관 밑면(BOP)을 맞추려고 FOB를 흔히 쓴다." },
      ],
    },
  ];

  // ---------- 3년차 보충: 풀 때마다 새로 만드는 아이소 문제 (보기 0번이 정답, 화면에서 섞는다) ----------
  function isoSet(seed) {
    const r = ACAD.rng(seed * 7919 + 17), KO = ACAD.PIPE_KO, qs = [];
    const seq = (rt) => rt.map(([d]) => KO[d]).join(" → ");
    for (let k = 0; k < 6; k++) {
      const route = ACAD.pipeRoute(r, { legs: k < 2 ? 3 : r.pick([4, 5]) });
      qs.push({
        type: "iso", prompt: "단선 평면도와 입면도(남쪽에서 북쪽을 보며)를 보고 맞는 아이소를 고르시오.",
        route, options: [route, ...isoWrong(route, r)],
        why: `방향 순서는 ${seq(route)}. 평면도에서 동서남북을, 입면도에서 위·아래를 읽어 합친다. 아이소에서 북쪽은 오른쪽 위, 동쪽은 오른쪽 아래다.`,
      });
    }
    for (let k = 0; k < 2; k++) {
      const el0 = r.step(800, 2500, 100);
      const zs = (rt) => ACAD.routePts(rt).map((p) => p[2]);
      const route = ACAD.pipeRoute(r, { legs: r.pick([4, 5]), ok: (rt) => { const z = zs(rt); return z[z.length - 1] !== 0 && Math.min(...z) + el0 >= 300; } });
      const vs = route.filter(([d]) => "UD".includes(d)).map(([d, L]) => (d === "U" ? L : -L));
      const net = vs.reduce((a, b) => a + b, 0), abs = vs.reduce((a, b) => a + Math.abs(b), 0);
      const ans = el0 + net, lastH = route[route.length - 1][1];
      // 흔한 실수: 부호 반대, 모두 더하기, 높이를 안 바꾸기, 수평 길이를 섞기
      const wrong = [...new Set([el0 - net, el0 + abs, el0 - abs, el0 + net - 2 * vs[0], el0, ans + lastH, ans - lastH, ans + route[0][1]])].filter((v) => v !== ans && v >= 0).slice(0, 3);
      for (let k = 1; wrong.length < 3; k++) if (!wrong.includes(ans + 100 * k)) wrong.push(ans + 100 * k);
      qs.push({
        type: "isoel", route, el0,
        prompt: `아이소의 시작점(검은 점) 높이가 EL+${el0}이다. 끝점의 EL은?`,
        options: [ans, ...wrong].map((v) => `EL+${v}`),
        why: `수평 구간은 높이를 바꾸지 않는다. 올라간 구간은 더하고 내려간 구간은 뺀다: ${el0} ${vs.map((v) => (v > 0 ? "+ " + v : "− " + -v)).join(" ")} = EL+${ans}.`,
      });
    }
    return qs;
  }
  // 틀린 보기: 한 구간 뒤집기, 남북·동서 뒤집기, 축 바꾸기. 평면도나 입면도 중 하나는 반드시 달라진다.
  function isoWrong(route, r) {
    const OPP = { E: "W", W: "E", N: "S", S: "N", U: "D", D: "U" }, SW = { E: "N", N: "E", W: "S", S: "W" };
    const key = (rt) => rt.map(([d]) => d).join("");
    const H = [], V = [];
    route.forEach(([d], i) => ("UD".includes(d) ? V : H).push(i));
    const flip = (i, map) => route.map(([d, L], j) => [j === i && map[d] ? map[d] : d, L]);
    const makers = [
      () => flip(r.pick(V), OPP),
      () => flip(r.pick(H), OPP),
      () => route.map(([d, L]) => ["NS".includes(d) ? OPP[d] : d, L]),
      () => route.map(([d, L]) => ["EW".includes(d) ? OPP[d] : d, L]),
      () => flip(r.pick(H), SW),
      () => route.map(([d, L]) => [OPP[d], L]),
    ];
    const seen = new Set([key(route)]), out = [];
    for (let t = 0; out.length < 3 && t < 80; t++) {
      const rt = makers[t < 3 ? t : r.int(0, makers.length - 1)]();
      if (!ACAD.routeValid(rt) || !ACAD.routeReadable(rt, "iso", 100) || seen.has(key(rt))) continue;
      seen.add(key(rt));
      out.push(rt);
    }
    return out;
  }
  ACAD.viewQuizViewName = V;
})();
