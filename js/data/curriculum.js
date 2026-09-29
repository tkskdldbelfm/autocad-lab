// 커리큘럼 뼈대. 단계별 레슨은 lessons-<단계>.js 가 ACAD.addLessons 로 채운다.
// 레슨 형식:
// { id, title, lecture?: "04" | ["18","19"], summary, body: html, points: [..], commands: ["LINE", "F8"],
//   figure?: { viewer: "block-step" } | { svg: "lineTypes" }, practice: [{ type, id, label }],
//   check: [{ q, o: [..], a: 정답 인덱스, why }] }
window.ACAD = window.ACAD || {};

ACAD.curriculum = [
  {
    id: "0", name: "입문", years: "0년", role: "CAD를 켜고 정확하게 그리는 사람",
    band: "도면 보는 법 + CAD 기초 (강의 01–16)",
    summary: "도면이 무엇을 약속하는 그림인지, 3면도가 어떻게 생기는지 먼저 봅니다. 그다음 AutoCAD 화면, 명령 입력, 좌표, 객체 선택, 객체 스냅, 원과 호, 화면 제어를 강의 순서대로 손에 익힙니다.",
    goal: "치수가 주어지면 좌표와 객체 스냅만으로 그대로 그린다. 3D를 보고 평면도·정면도·우측면도가 어느 방향에서 본 모습인지 말한다.",
    lessons: [],
  },
  {
    id: "1", name: "신입", years: "0–1년", role: "도면을 읽고 고치는 사람",
    band: "도면 읽기 + CAD 편집 기능 (강의 17–35)",
    summary: "간격띄우기·자르기부터 배열까지 편집 명령을 강의 순서대로 익히고, 치수·숨은선·단면을 읽는 법과 3D를 보고 3면도를 그리는 법을 배웁니다. 마지막에 플랜트 도면의 종류를 한눈에 봅니다.",
    goal: "남이 그린 도면을 편집 명령으로 빠르게 고치고, 3D 형상을 보고 3면도를 그린다. 도면 종류마다 답하는 질문을 구분한다.",
    lessons: [],
  },
  {
    id: "2", name: "3년차", years: "3년", role: "배관 도면을 읽는 사람",
    band: "배관 도면 읽기 딥다이브",
    summary: "배관의 크기와 부품, 밸브·계기 기호, 라인 번호와 배관 등급을 익히고 P&ID·평면도·입면도·아이소를 서로 대조해 한 라인을 머릿속 3D로 복원합니다.",
    goal: "P&ID, 평면도, 입면도, 아이소를 대조해 한 라인의 경로·높이·부품을 빠짐없이 말한다.",
    lessons: [],
  },
  {
    id: "3", name: "5년차", years: "5년", role: "배관 도면을 구현하는 사람",
    band: "도면 구현: 경로·평면·아이소·물량·개정",
    summary: "구조 도면 위에 배관 경로를 잡고, 평면·단면·아이소를 AutoCAD로 직접 작성하고, 서포트·물량·간섭·개정까지 한 구역을 닫습니다.",
    goal: "한 구역의 배관을 경로 결정부터 발행 세트까지 혼자 낸다. 설계 변경 한 건이 모든 도면과 물량에 같은 내용으로 남는다.",
    lessons: [],
  },
  {
    id: "4", name: "10년차", years: "10년", role: "도면 세트를 책임지는 사람",
    band: "검토 · CAD 표준 · 3D 전환 · 코칭",
    summary: "남의 도면에서 오류를 찾아내는 검토 방법, CAD 표준과 발행 체계, 3D 모델 기반 설계로의 전환, 타 분야 인터페이스와 후배 코칭을 다룹니다.",
    goal: "도면 세트의 품질을 책임진다. 오류를 체계적으로 찾고, 표준과 템플릿으로 팀 전체의 도면을 같은 모양으로 만든다.",
    lessons: [],
  },
];

ACAD.addLessons = function (stageId, lessons) {
  const stage = ACAD.curriculum.find((s) => s.id === stageId);
  lessons.forEach((l) => { l.stage = stageId; stage.lessons.push(l); });
};

ACAD.findLesson = function (id) {
  for (const s of ACAD.curriculum) {
    const i = s.lessons.findIndex((l) => l.id === id);
    if (i >= 0) return { stage: s, lesson: s.lessons[i], index: i };
  }
  return null;
};

ACAD.allLessons = () => ACAD.curriculum.flatMap((s) => s.lessons);
