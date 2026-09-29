// 신입: 도면 읽기 + CAD 기초강의 17–35
ACAD.addLessons("1", [
  {
    id: "1-D1", title: "도면 양식, 표제란, 척도",
    summary: "선을 보기 전에 종이 크기, 표제란, 척도, 투상법 기호, 개정란부터 읽습니다.",
    body: `
      <h3>종이 크기 (A 계열)</h3>
      <table class="tbl">
        <tr><th>크기</th><th>mm</th><th>주로 쓰는 곳</th></tr>
        <tr><td>A0</td><td>841 × 1189</td><td>대형 배치도</td></tr>
        <tr><td>A1</td><td>594 × 841</td><td>배관 평면도, 조립도</td></tr>
        <tr><td>A2</td><td>420 × 594</td><td>부분 평면도</td></tr>
        <tr><td>A3</td><td>297 × 420</td><td>아이소, 부품도, 검토용 출력</td></tr>
        <tr><td>A4</td><td>210 × 297</td><td>상세도, 목록</td></tr>
      </table>
      <p>한 단계 작아질 때마다 긴 변이 반으로 접힙니다. A1을 반으로 접으면 A2입니다.</p>
      <h3>표제란에서 먼저 찾을 것</h3>
      <ul>
        <li>도면 번호, 도면 이름, 시트 번호 — 어느 도면인지</li>
        <li>개정 번호와 개정란 — 최신인지</li>
        <li>작성·검토·승인자, 날짜 — 누가 책임지는지 (ISO 7200이 기본 칸을 정합니다)</li>
        <li>척도와 단위, 투상법 기호 — 어떻게 읽을지</li>
      </ul>
      <h3>척도</h3>
      <p><b>1:1</b> 현척, <b>1:2</b> 축척(작게), <b>2:1</b> 배척(크게), <b>NS</b>는 비례가 아님(Not to Scale). 도면에 적힌 치수는 척도와 상관없이 <b>실제 치수</b>입니다. 자로 재서 읽지 않습니다.</p>
      <div class="callout tip"><b>CAD에서 척도는</b>모형 공간에는 항상 1:1로 그리고, 배치 탭의 뷰포트에서 1:50 같은 축척을 정합니다. 척도에 맞춰 객체 크기를 줄이면 안 됩니다.</div>`,
    points: ["표제란이 먼저", "치수는 늘 실제 치수", "모형은 1:1, 축척은 뷰포트"],
    commands: ["LAYOUT", "MVIEW"],
    practice: [{ type: "review", id: "r1", label: "표제란·척도 오류 찾기" }],
    check: [
      { q: "1:50 도면에 치수 3000이 적혀 있습니다. 실제 길이는?", o: ["60", "3000", "150000", "척도를 곱해야 안다"], a: 1, why: "도면의 치수는 척도와 관계없이 실제 치수입니다." },
      { q: "A1 용지를 반으로 접으면?", o: ["A0", "A2", "A3", "B1"], a: 1, why: "A 계열은 한 단계 커질 때 두 배, 작아질 때 반입니다." },
    ],
  },
  {
    id: "1-17", lecture: "17", title: "Offset, Trim, Extend",
    summary: "간격띄우기로 평행선을 만들고, 자르기로 넘친 부분을 잘라내고, 연장으로 모자란 선을 늘입니다.",
    body: `
      <h3>OFFSET (O) — 간격띄우기</h3>
      <p>거리를 입력하고, 객체를 고르고, 어느 쪽으로 띄울지 클릭합니다. 벽 두께, 배관 외경, 판 두께처럼 <b>같은 간격의 평행선</b>은 전부 이 명령으로 만듭니다.</p>
      <ul>
        <li><span class="mono">T</span>(통과점): 거리 대신 지나갈 점을 찍음</li>
        <li><span class="mono">E</span>(지우기): 원본을 지움 · <span class="mono">L</span>(도면층): 새 선을 현재 레이어에</li>
      </ul>
      <h3>TRIM (TR) · EXTEND (EX)</h3>
      <p>최신 AutoCAD는 <b>빠른 모드</b>가 기본입니다. 명령을 시작하고 잘라낼 부분을 그냥 클릭하거나 끌어서 지나가면, 다른 모든 객체가 경계가 됩니다. 옛 방식(경계를 먼저 고르는 <b>표준 모드</b>)은 <span class="mono">O</span>(모드) 옵션으로 바꿉니다.</p>
      <p>TRIM 중에 <kbd>Shift</kbd>를 누르고 고르면 반대로 연장되고, EXTEND 중에 Shift를 누르면 잘립니다.</p>
      <div class="callout tip"><b>순서</b>간격띄우기로 선을 넉넉히 만든다 → 자르기·연장으로 모서리를 정리한다. 도면의 70%는 이 세 명령으로 그립니다.</div>`,
    points: ["평행선은 OFFSET", "빠른 모드: 자를 곳만 클릭", "Shift로 자르기↔연장 전환"],
    commands: ["OFFSET", "TRIM", "EXTEND"],
    practice: [{ type: "sandbox", id: "m1-17", label: "간격띄우기·자르기·연장" }],
    check: [
      { q: "TRIM 중에 Shift를 누른 채 선을 고르면?", o: ["선이 지워진다", "그 선이 연장된다", "명령이 취소된다", "복사된다"], a: 1, why: "TRIM과 EXTEND는 Shift로 서로 바뀝니다." },
    ],
  },
  {
    id: "1-18", lecture: ["18", "19"], title: "Offset, Trim, Extend 예제",
    summary: "창틀, 벽체 같은 예제를 간격띄우기 → 자르기 → 연장 순서로 완성합니다.",
    body: `
      <p>예제 두 개(강의 18, 19)를 같은 순서로 풉니다.</p>
      <ol>
        <li>기준이 되는 외곽선이나 중심선 하나를 정확히 그린다.</li>
        <li>필요한 간격을 모두 OFFSET으로 만든다. 이때는 선이 넘쳐도 괜찮다.</li>
        <li>TRIM 빠른 모드로 넘친 부분을 끌어서 한 번에 지운다.</li>
        <li>짧은 선은 EXTEND로 늘인다.</li>
        <li>연습장의 피드백 창에서 끝점이 떨어진 곳이 없는지 본다.</li>
      </ol>
      <div class="callout warn"><b>자주 하는 실수</b>잘라야 할 곳을 ERASE로 지우고 다시 그리기. 그러면 끝점이 어긋납니다. 모서리는 TRIM이나 FILLET R0로 정리하세요.</div>`,
    points: ["넉넉히 띄우고 한 번에 자른다", "모서리 정리는 TRIM이나 FILLET R0"],
    commands: ["OFFSET", "TRIM", "EXTEND"],
    practice: [{ type: "sandbox", id: "m1-18", label: "창틀 예제" }],
    check: [
      { q: "두 선이 모서리에서 조금씩 넘쳐 있습니다. 가장 빠른 정리 방법은?", o: ["지우고 다시 그린다", "FILLET 반지름 0 또는 TRIM", "ZOOM", "SCALE"], a: 1, why: "FILLET R0는 두 선을 정확한 모서리로 맞춥니다." },
    ],
  },
  {
    id: "1-20", lecture: "20", title: "Move(이동), Copy(복사)",
    summary: "기준점과 두 번째 점, 또는 변위(@)로 정확한 거리만큼 옮기거나 복사합니다.",
    body: `
      <p>MOVE(M)와 COPY(CO/CP)는 묻는 순서가 같습니다: 객체 선택 → <b>기준점</b> → <b>두 번째 점</b>.</p>
      <ul>
        <li>기준점은 아무 데나 찍지 말고 객체의 끝점·중심처럼 <b>의미 있는 점</b>을 스냅으로 잡습니다.</li>
        <li>두 번째 점은 <span class="mono">@200,0</span> 같은 상대좌표나, 직교를 켜고 거리 직접입력으로 줍니다.</li>
        <li>기준점을 물을 때 <span class="mono">D</span>(변위)를 쓰면 <span class="mono">200,0</span>처럼 이동량만 바로 입력합니다.</li>
        <li>COPY는 끝낼 때까지 계속 복사합니다. <span class="mono">A</span>(배열) 옵션으로 같은 간격 여러 개도 됩니다.</li>
      </ul>`,
    points: ["기준점은 스냅으로", "두 번째 점은 @나 직접입력", "COPY는 여러 번 계속"],
    commands: ["MOVE", "COPY"],
    practice: [{ type: "sandbox", id: "m1-20", label: "정확한 거리로 이동·복사" }],
    check: [
      { q: "원을 오른쪽으로 정확히 150 옮기는 입력은?", o: ["M → 원 → 중심 → @150,0", "M → 원 → 아무 점 → 150,0 절대", "Z → 150", "SC → 150"], a: 0, why: "기준점을 잡고 두 번째 점을 상대좌표로 주면 정확히 150만큼 이동합니다." },
    ],
  },
  {
    id: "1-21", lecture: "21", title: "Mirror(대칭복사)",
    summary: "대칭선 두 점으로 반쪽을 뒤집어 복사하고, 원본을 남길지 정합니다.",
    body: `
      <p>대칭인 부품은 반만 그리고 MIRROR(MI)로 나머지를 만듭니다. 대칭선은 보통 중심선의 두 끝점이나, 직교를 켠 수직·수평선입니다.</p>
      <ol>
        <li>객체 선택</li>
        <li>대칭선의 첫 점, 둘째 점</li>
        <li>원본 객체를 지울까요? <span class="mono">N</span>(남김) / <span class="mono">Y</span>(지움)</li>
      </ol>
      <div class="callout tip"><b>문자는 뒤집히지 않게</b>시스템 변수 MIRRTEXT가 0(기본)이면 문자는 거울상이 되지 않고 읽을 수 있는 방향으로 복사됩니다.</div>`,
    points: ["반만 그리고 대칭", "대칭선 두 점", "원본 유지 N"],
    commands: ["MIRROR"],
    practice: [{ type: "sandbox", id: "m1-21", label: "대칭으로 부품 완성" }],
    check: [
      { q: "MIRROR에서 원본을 남기려면 마지막 질문에 무엇을 답합니까?", o: ["Y", "N", "C", "E"], a: 1, why: "원본을 지울지 묻는 질문에 N(아니오)이면 원본이 남습니다." },
    ],
  },
  {
    id: "1-22", lecture: "22", title: "Polygon(정다각형)",
    summary: "변의 수와 내접·외접, 또는 한 변의 길이로 정다각형을 그립니다.",
    body: `
      <p>POLYGON(POL)은 변의 수 → 중심 → <b>내접(I)</b>인지 <b>외접(C)</b>인지 → 반지름 순으로 묻습니다.</p>
      <ul>
        <li><b>내접(I)</b>: 원 안에 들어가는 다각형. 반지름 = 중심에서 <b>꼭짓점</b>까지.</li>
        <li><b>외접(C)</b>: 원 밖을 감싸는 다각형. 반지름 = 중심에서 <b>변의 중간</b>까지.</li>
        <li><b>모서리(E)</b>: 한 변의 두 끝점으로 그리기.</li>
      </ul>
      <div class="callout tip"><b>볼트 머리·너트</b>육각 볼트는 보통 "마주 보는 변 사이 거리(대변 거리)"로 치수를 줍니다. 대변 거리 24라면 외접(C), 반지름 12로 그리면 됩니다.</div>`,
    points: ["I = 꼭짓점까지", "C = 변 중간까지", "대변 거리는 외접"],
    commands: ["POLYGON"],
    practice: [{ type: "sandbox", id: "m1-22", label: "육각형·오각형" }],
    check: [
      { q: "대변 거리 30인 육각 너트를 그리려면?", o: ["내접 I, 반지름 15", "외접 C, 반지름 15", "외접 C, 반지름 30", "내접 I, 반지름 30"], a: 1, why: "대변 거리의 절반이 중심에서 변 중간까지이므로 외접, 반지름 15입니다." },
    ],
  },
  {
    id: "1-23", lecture: "23", title: "Ellipse(타원)",
    summary: "축의 끝점이나 중심으로 타원과 타원 호를 그리고, 등각 도면에서 쓰는 등각원을 미리 봅니다.",
    body: `
      <ul>
        <li><b>축 끝점</b>(기본): 한 축의 양 끝 → 다른 축의 반 길이.</li>
        <li><b>중심(C)</b>: 중심 → 한 축의 끝 → 다른 축의 반 길이.</li>
        <li><b>호(A)</b>: 타원을 정한 뒤 시작·끝 각도로 일부만.</li>
      </ul>
      <p>원을 비스듬히 보면 타원이 됩니다. 그래서 등각 도면에서 구멍과 배관 단면은 타원으로 그립니다. 등각 스냅 모드에서는 ELLIPSE에 <b>등각원(I)</b> 옵션이 생깁니다. 5년차의 아이소 작성에서 씁니다.</p>`,
    points: ["긴 축·짧은 축의 반 길이", "등각에서는 원이 타원", "등각원 I 옵션"],
    commands: ["ELLIPSE"],
    practice: [{ type: "sandbox", id: "m1-23", label: "타원과 타원 호" }],
    check: [
      { q: "타원의 두 번째 질문 '다른 축의 거리'에 넣는 값은?", o: ["그 축의 전체 길이", "그 축의 절반 길이", "둘레", "넓이"], a: 1, why: "중심에서 축 끝까지, 즉 반 길이를 입력합니다." },
    ],
  },
  {
    id: "1-24", lecture: "24", title: "Fillet(모깎기, 둥근모서리)",
    summary: "반지름을 정하고 두 객체를 고르면 모서리가 둥글게 이어집니다. 반지름 0이면 정확한 모서리가 됩니다.",
    body: `
      <ol>
        <li><span class="mono">F</span> → <span class="mono">R</span> → 반지름 입력</li>
        <li>첫 번째 객체, 두 번째 객체 클릭 (남길 쪽을 클릭)</li>
      </ol>
      <ul>
        <li><span class="mono">P</span>(폴리선): 폴리선의 모든 모서리를 한 번에</li>
        <li><span class="mono">M</span>(다중): 끝내지 않고 계속</li>
        <li><span class="mono">T</span>(자르기): 원래 선을 자를지 남길지</li>
        <li>두 번째 객체를 고를 때 <kbd>Shift</kbd>를 누르면 반지름 0처럼 날카로운 모서리</li>
      </ul>
      <div class="callout tip"><b>배관에서</b>배관 중심선의 꺾이는 곳을 FILLET으로 둥글게 하면 엘보의 중심선이 됩니다. 4" 롱 레디우스 엘보는 반지름 152.4(= 1.5 × 4인치)입니다. 3년차에서 다시 나옵니다.</div>`,
    points: ["R 먼저 정한다", "남길 쪽을 클릭", "R0 = 정확한 모서리"],
    commands: ["FILLET"],
    practice: [{ type: "sandbox", id: "m1-24", label: "모깎기 R10, R0" }],
    check: [
      { q: "두 선을 둥글게 하지 않고 정확한 모서리로 만나게 하려면?", o: ["FILLET 반지름 0", "CHAMFER 거리 10", "EXTEND만", "JOIN"], a: 0, why: "반지름 0의 모깎기는 두 선을 연장·자르기해 정확한 모서리로 맞춥니다." },
    ],
  },
  {
    id: "1-25", lecture: "25", title: "Chamfer(모따기, 각진모서리)",
    summary: "두 거리, 또는 거리와 각도로 모서리를 비스듬히 잘라냅니다.",
    body: `
      <ul>
        <li><span class="mono">CHA</span> → <span class="mono">D</span>(거리) → 첫 번째 거리 → 두 번째 거리 → 두 선 클릭</li>
        <li><span class="mono">A</span>(각도): 첫 번째 선에서의 거리와 각도</li>
        <li>거리가 같으면 45° 모따기. 도면에서는 <b>C5</b>처럼 적습니다(45°, 5mm).</li>
      </ul>
      <p>첫 번째 거리는 <b>처음 클릭한 선</b>에 적용됩니다. 거리가 다를 때는 클릭 순서를 확인하세요.</p>`,
    points: ["D: 거리 두 개", "A: 거리와 각도", "C5 = 45° 5mm"],
    commands: ["CHAMFER"],
    practice: [{ type: "sandbox", id: "m1-25", label: "모따기 C10, 10×20" }],
    check: [
      { q: "도면에 C3로 적힌 모서리는?", o: ["반지름 3", "45° 모따기 3mm", "3개의 모서리", "두께 3"], a: 1, why: "C는 45° 모따기, 숫자는 모따기 길이입니다." },
    ],
  },
  {
    id: "1-26", lecture: "26", title: "Rotate(회전)",
    summary: "기준점을 중심으로 각도만큼 돌리고, 참조(R)로 '지금 각도'에서 '원하는 각도'로 맞춥니다.",
    body: `
      <ul>
        <li><span class="mono">RO</span> → 객체 → 기준점 → 각도. <b>+는 반시계</b>, −는 시계.</li>
        <li><span class="mono">C</span>(복사): 원본을 남기고 돌린 사본을 만듦.</li>
        <li><span class="mono">R</span>(참조): 지금 각도를 모를 때. 참조 각도(두 점 클릭) → 새 각도 입력(또는 점 클릭).</li>
      </ul>
      <div class="callout tip"><b>참조가 필요한 순간</b>비스듬히 놓인 부품을 수평으로 눕히고 싶은데 지금 몇 도인지 모를 때, 참조 옵션으로 그 부품의 모서리 두 점을 찍고 새 각도 0을 입력하면 됩니다.</div>`,
    points: ["+ 반시계", "C 복사", "R 참조로 맞추기"],
    commands: ["ROTATE"],
    practice: [{ type: "sandbox", id: "m1-26", label: "참조 회전으로 수평 맞추기" }],
    check: [
      { q: "ROTATE에서 −30을 입력하면?", o: ["반시계 30°", "시계 30°", "30배 확대", "오류"], a: 1, why: "각도는 반시계가 +, 시계가 −입니다." },
    ],
  },
  {
    id: "1-27", lecture: "27", title: "Scale(확대, 축소)",
    summary: "비율로 크기를 바꾸고, 참조(R)로 '이 길이를 저 길이로' 맞춥니다.",
    body: `
      <ul>
        <li><span class="mono">SC</span> → 객체 → 기준점 → 비율 (2 = 두 배, 0.5 = 절반)</li>
        <li><span class="mono">R</span>(참조): 참조 길이(두 점) → 새 길이. 예: 지금 73.2인 선을 100으로.</li>
        <li><span class="mono">C</span>(복사): 원본 남기기</li>
      </ul>
      <div class="callout warn"><b>도면 척도와 헷갈리지 말 것</b>1:50 도면을 만들려고 객체를 0.02배로 줄이면 안 됩니다. 모형은 1:1, 척도는 배치 뷰포트에서 정합니다. SCALE은 <b>실제 크기가 바뀐 설계</b>일 때만 씁니다. 스캔한 그림이나 받은 도면의 크기를 맞출 때 참조 옵션이 유용합니다.</div>`,
    points: ["비율 2 = 두 배", "R 참조: 이 길이 → 저 길이", "도면 척도용으로 쓰지 않는다"],
    commands: ["SCALE"],
    practice: [{ type: "sandbox", id: "m1-27", label: "참조 축척으로 길이 맞추기" }],
    check: [
      { q: "길이를 모르는 선을 정확히 100으로 만들려면?", o: ["SCALE → R → 선의 두 끝점 → 100", "ZOOM 100", "SCALE 100", "LENGTHEN P 100"], a: 0, why: "참조 옵션은 지금 길이를 두 점으로 재고 새 길이를 입력받아 비율을 계산합니다." },
    ],
  },
  {
    id: "1-28", lecture: "28", title: "Lengthen(선길이조절)",
    summary: "증분, 퍼센트, 합계, 동적 네 가지 방법으로 선과 호의 길이를 바꿉니다.",
    body: `
      <table class="tbl">
        <tr><th>옵션</th><th>뜻</th><th>예</th></tr>
        <tr><td class="mono">DE</td><td>증분: 지금 길이에 더하거나 뺌</td><td>DE → 20 → 선 끝 클릭 = 20 늘림</td></tr>
        <tr><td class="mono">P</td><td>퍼센트</td><td>P → 150 = 1.5배 길이</td></tr>
        <tr><td class="mono">T</td><td>합계: 최종 길이</td><td>T → 500 = 500이 되게</td></tr>
        <tr><td class="mono">DY</td><td>동적: 끌어서</td><td>스냅과 함께</td></tr>
      </table>
      <p><b>클릭한 쪽 끝</b>이 늘거나 줄어듭니다. 반대쪽 끝은 그대로입니다. 중심선을 외형보다 조금씩 길게 빼는 작업에 자주 씁니다.</p>`,
    points: ["클릭한 끝이 변한다", "T = 최종 길이", "중심선 빼기에 편함"],
    commands: ["LENGTHEN"],
    practice: [{ type: "sandbox", id: "m1-28", label: "중심선 길이 맞추기" }],
    check: [
      { q: "LENGTHEN DE에 −10을 주고 선의 오른쪽 끝을 클릭하면?", o: ["오른쪽 끝이 10 줄어든다", "왼쪽 끝이 10 줄어든다", "양쪽 5씩", "10 늘어난다"], a: 0, why: "음수 증분은 줄어들고, 클릭한 쪽 끝이 변합니다." },
    ],
  },
  {
    id: "1-29", lecture: "29", title: "Break(선끊기), Join(선연결)",
    summary: "선의 일부를 끊어 내거나 한 점에서 둘로 나누고, 나뉜 선을 다시 하나로 잇습니다.",
    body: `
      <h3>BREAK (BR)</h3>
      <ul>
        <li>기본: 객체를 클릭한 점이 첫 번째 끊는 점, 다음 클릭이 두 번째 점. 그 사이가 사라집니다.</li>
        <li><span class="mono">F</span>: 첫 번째 점을 다시 지정(객체를 고른 점과 끊을 점이 다를 때).</li>
        <li>한 점에서 둘로 나누기: 두 번째 점에 <span class="mono">@</span> 또는 리본의 "점에서 끊기".</li>
        <li>원은 첫 점에서 두 번째 점까지 <b>반시계</b> 방향 부분이 지워집니다.</li>
      </ul>
      <h3>JOIN (J)</h3>
      <ul>
        <li>같은 직선 위의 선들, 같은 원 위의 호들, 끝이 맞닿은 선·호·폴리선을 하나로.</li>
        <li>호 하나를 고르고 <span class="mono">L</span>(닫기)를 하면 원이 됩니다.</li>
        <li>끝점이 떨어져 있으면 합쳐지지 않습니다. 연습장 피드백 창이 떨어진 틈을 알려 줍니다.</li>
      </ul>`,
    points: ["BREAK: 두 점 사이 삭제", "원은 반시계로 끊김", "JOIN은 끝이 맞닿아야"],
    commands: ["BREAK", "JOIN"],
    practice: [{ type: "sandbox", id: "m1-29", label: "끊고 다시 잇기" }],
    check: [
      { q: "JOIN이 두 선을 합치지 못했습니다. 가장 흔한 원인은?", o: ["레이어 색이 달라서", "끝점이 조금 떨어져 있거나 같은 직선 위가 아니어서", "ZOOM이 작아서", "직교가 켜져서"], a: 1, why: "JOIN은 끝이 맞닿거나 같은 직선·원 위에 있어야 합쳐집니다." },
    ],
  },
  {
    id: "1-30", lecture: "30", title: "Align(정렬)",
    summary: "원본 점과 대상 점을 짝지어 한 번에 이동·회전(필요하면 축척까지) 합니다.",
    body: `
      <ol>
        <li><span class="mono">AL</span> → 객체 선택</li>
        <li>첫 번째 원본 점 → 첫 번째 대상 점</li>
        <li>두 번째 원본 점 → 두 번째 대상 점 → Enter</li>
        <li>"정렬점을 기준으로 객체에 축척을 적용합니까?" <span class="mono">N</span> = 크기 유지, <span class="mono">Y</span> = 두 점 거리에 맞게 크기까지 맞춤</li>
      </ol>
      <p>MOVE와 ROTATE를 따로 하면 각도를 알아야 하지만, ALIGN은 점만 찍으면 됩니다. 비스듬한 벽에 장치를 붙이거나, 받은 도면 조각을 기준선에 맞출 때 좋습니다.</p>`,
    points: ["점 두 쌍으로 이동+회전", "축척 Y면 크기까지 맞춤"],
    commands: ["ALIGN"],
    practice: [{ type: "sandbox", id: "m1-30", label: "기울어진 면에 부품 붙이기" }],
    check: [
      { q: "ALIGN에서 축척을 Y로 하면?", o: ["크기가 그대로", "원본 점 사이 거리가 대상 점 사이 거리가 되도록 크기도 바뀜", "복사된다", "대칭된다"], a: 1, why: "축척 적용을 고르면 두 점 거리를 맞추도록 확대·축소합니다." },
    ],
  },
  {
    id: "1-31", lecture: "31", title: "Stretch(늘이기/줄이기)",
    summary: "걸침 선택 안에 든 꼭짓점만 옮겨서 도형을 늘이거나 줄입니다.",
    body: `
      <div data-figure="stretch"></div>
      <ul>
        <li>반드시 <b>걸침(오→왼)</b>으로 선택합니다. 창 안에 든 꼭짓점만 움직이고 밖의 꼭짓점은 제자리입니다.</li>
        <li>창 안에 <b>완전히</b> 들어간 객체는 통째로 이동합니다.</li>
        <li>원은 늘어나지 않습니다. 중심이 창 안이면 이동만 합니다.</li>
        <li>기준점 → 두 번째 점(@나 거리 직접입력)으로 얼마나 늘일지 정합니다.</li>
      </ul>
      <p>치수가 바뀐 설계 변경(판 길이 200 → 250)을 할 때, 지우고 다시 그리지 않고 STRETCH로 50만 늘이면 구멍 위치와 치수가 함께 따라옵니다.</p>`,
    points: ["걸침으로만", "창 안 꼭짓점만 이동", "설계 변경에 최고"],
    commands: ["STRETCH"],
    practice: [{ type: "sandbox", id: "m1-31", label: "판 길이 200 → 250" }],
    check: [
      { q: "STRETCH에서 윈도우(왼→오)로만 골랐더니 도형이 통째로 움직였습니다. 왜?", o: ["버그", "창 안에 완전히 든 객체는 이동하기 때문", "직교가 켜져서", "레이어가 잠겨서"], a: 1, why: "완전히 포함된 객체는 이동합니다. 늘이려면 걸침으로 꼭짓점 일부만 잡아야 합니다." },
    ],
  },
  {
    id: "1-32", lecture: "32", title: "Array(배열): 직사각형 · 원형 · 경로",
    summary: "같은 객체를 행·열로, 원 둘레로, 경로를 따라 일정하게 늘어놓습니다.",
    body: `
      <table class="tbl">
        <tr><th>명령</th><th>정할 것</th><th>예</th></tr>
        <tr><td class="mono">ARRAYRECT</td><td>행 수, 열 수, 행 간격, 열 간격</td><td>볼트 구멍 2×3, 타일</td></tr>
        <tr><td class="mono">ARRAYPOLAR</td><td>중심점, 항목 수, 채울 각도, 항목 회전 여부</td><td>플랜지 볼트 구멍 8개</td></tr>
        <tr><td class="mono">ARRAYPATH</td><td>경로 곡선, 간격 또는 등분</td><td>곡선 난간, 배관 서포트</td></tr>
      </table>
      <p><span class="mono">AR</span>을 치면 세 가지 중 고르라고 묻습니다. 만들어진 배열은 기본적으로 <b>연관 배열</b>(한 덩어리)이라, 클릭하면 리본에서 개수·간격을 바로 바꿀 수 있습니다.</p>
      <div class="callout tip"><b>플랜지 볼트 구멍</b>ASME B16.5 Class 150 4" 플랜지는 볼트 구멍이 8개입니다. 원형 배열 8개, 360°로 한 번에 그립니다.</div>`,
    points: ["직사각형: 행·열·간격", "원형: 중심·개수·각도", "연관 배열은 나중에 수정 가능"],
    commands: ["ARRAY", "ARRAYRECT", "ARRAYPOLAR", "ARRAYPATH"],
    practice: [{ type: "sandbox", id: "m1-32", label: "직사각형·원형·경로 배열" }],
    check: [
      { q: "플랜지 둘레에 볼트 구멍 8개를 같은 간격으로 놓으려면?", o: ["ARRAYRECT 8열", "ARRAYPOLAR 항목 8, 360°", "COPY 8번", "OFFSET 8번"], a: 1, why: "원형 배열은 중심 둘레에 같은 각도 간격으로 배치합니다." },
    ],
  },
  {
    id: "1-33", lecture: "33", title: "ARRAY 편집: 원본 편집, 항목 대치, 배열 재설정",
    summary: "연관 배열을 ARRAYEDIT로 고칩니다. 원본을 고치면 모든 항목이 같이 바뀝니다.",
    body: `
      <ul>
        <li><b>원본 편집(Source)</b>: 배열 속 한 항목을 편집 상태로 열어 고치면 모든 항목에 반영.</li>
        <li><b>항목 대치(Replace)</b>: 일부 항목을 다른 객체(예: 구멍 → 탭 구멍)로 바꿈.</li>
        <li><b>배열 재설정(Reset)</b>: 지우거나 옮긴 개별 항목, 대치한 항목을 원래대로.</li>
        <li><kbd>Ctrl</kbd>+클릭: 배열 속 항목 하나만 골라 지우거나 옮기기.</li>
        <li>연관을 끊으려면 EXPLODE(X). 그 뒤로는 낱개 객체입니다.</li>
      </ul>
      <p>AutoCAD에서 배열을 만들 때 <span class="mono">AS</span>(연관) 옵션을 아니오로 하면 처음부터 낱개로 만들어집니다.</p>`,
    points: ["원본 편집 = 전부 바뀜", "Ctrl+클릭 = 항목 하나", "EXPLODE = 연관 끊기"],
    commands: ["ARRAYEDIT", "EXPLODE"],
    practice: [{ type: "sandbox", id: "m1-32", label: "배열 만들고 개수·간격 바꾸기" }],
    check: [
      { q: "연관 배열의 구멍 20개 모양을 한 번에 바꾸려면?", o: ["하나씩 고친다", "ARRAYEDIT 원본 편집", "EXPLODE 후 복사", "SCALE"], a: 1, why: "원본을 편집하면 연관된 모든 항목에 반영됩니다." },
    ],
  },
  {
    id: "1-34", lecture: "34", title: "ARRAY 예제: 기준점 변경 활용",
    summary: "배열의 기준점(B)을 바꿔 항목이 놓이는 위치와 회전을 원하는 대로 맞춥니다.",
    body: `
      <p>배열 항목은 <b>기준점</b>을 기준으로 놓입니다. 기본 기준점은 선택한 객체의 중심 근처라, 원형 배열에서 항목이 원하는 반지름에 놓이지 않거나 경로 배열에서 경로에서 떠 버릴 수 있습니다.</p>
      <ol>
        <li>배열을 만드는 중에 <span class="mono">B</span>(기준점) 옵션</li>
        <li>항목의 실제로 닿아야 할 점(예: 서포트의 밑면 중간점)을 스냅으로 지정</li>
        <li>경로 배열이면 그 점이 경로 위를 따라갑니다</li>
      </ol>`,
    points: ["항목은 기준점으로 놓인다", "B 옵션으로 닿을 점 지정"],
    commands: ["ARRAYPATH", "ARRAYPOLAR"],
    practice: [{ type: "sandbox", id: "m1-34", label: "기준점을 바꿔 경로 배열" }],
    check: [
      { q: "경로 배열의 항목이 경로에서 떠 있습니다. 먼저 바꿀 것은?", o: ["항목 수", "기준점(B)", "레이어", "선 종류"], a: 1, why: "기준점이 경로 위를 따라가므로 닿아야 할 점을 기준점으로 지정합니다." },
    ],
  },
  {
    id: "1-35", lecture: "35", title: "CAD 예제 및 복습",
    summary: "기초강의 전 과정을 한 예제로 묶어 복습합니다. 명령을 고르는 순서가 속도를 정합니다.",
    body: `
      <p>도면 하나를 보고 명령 순서를 먼저 계획하세요.</p>
      <ol>
        <li>기준선(중심선) 먼저 — LINE, 직교, 거리 직접입력</li>
        <li>외곽 — OFFSET, TRIM, FILLET</li>
        <li>원과 구멍 — CIRCLE, 객체 스냅(CEN, INT), FROM</li>
        <li>반복 — MIRROR, ARRAY</li>
        <li>정리 — LENGTHEN으로 중심선, 레이어 확인</li>
        <li>확인 — LIST, DIST, 연습장 피드백 창의 실수 감지</li>
      </ol>
      <div class="callout yellow"><b>여기까지 끝내면</b>강의 1–35의 기능으로 기계 부품도 대부분을 그릴 수 있습니다. 다음 레슨들에서 치수, 숨은선, 단면, 3면도 작도를 배워 "읽고 그리는" 사람이 됩니다.</div>`,
    points: ["순서를 먼저 계획", "기준선 → 외곽 → 원 → 반복 → 정리 → 확인"],
    commands: ["LINE", "OFFSET", "TRIM", "FILLET", "CIRCLE", "MIRROR", "ARRAY"],
    practice: [{ type: "sandbox", id: "m1-35", label: "종합 예제" }, { type: "shortcuts", id: "drill", label: "단축키 드릴로 속도 점검" }],
    check: [
      { q: "대칭 부품을 가장 빨리 그리는 순서는?", o: ["전부 그리고 확인", "중심선 → 반쪽 → MIRROR", "원부터", "치수부터"], a: 1, why: "대칭 기준(중심선)을 먼저 두고 반만 그린 뒤 대칭 복사합니다." },
    ],
  },
  {
    id: "1-D2", title: "치수 읽기와 기입",
    summary: "치수선·치수보조선·치수 문자의 구성, Ø·R·t·C 같은 기호, 중복하지 않는 배치 원칙을 익힙니다.",
    body: `
      <h3>치수의 구성</h3>
      <p>치수보조선(형상에서 끌어낸 선) → 치수선(화살표 사이) → 치수 문자. 모두 가는 실선입니다. 단위 mm는 적지 않습니다.</p>
      <h3>치수 앞의 기호</h3>
      <table class="tbl">
        <tr><th>기호</th><th>뜻</th><th>예</th></tr>
        <tr><td>Ø</td><td>지름</td><td>Ø20</td></tr>
        <tr><td>R</td><td>반지름</td><td>R10</td></tr>
        <tr><td>SØ, SR</td><td>구의 지름, 반지름</td><td>SR15</td></tr>
        <tr><td>□</td><td>정사각형 한 변</td><td>□30</td></tr>
        <tr><td>t</td><td>판 두께</td><td>t6</td></tr>
        <tr><td>C</td><td>45° 모따기</td><td>C2</td></tr>
        <tr><td>4-Ø10</td><td>같은 구멍 4개</td><td>볼트 구멍</td></tr>
      </table>
      <h3>배치 원칙</h3>
      <ul>
        <li>같은 치수를 두 번 적지 않는다(중복 금지).</li>
        <li>계산하지 않고 읽을 수 있게 필요한 치수를 모두 적는다.</li>
        <li>되도록 정면도에 모으고, 기준면에서부터 잰다.</li>
        <li>숨은선에는 치수를 달지 않는다.</li>
      </ul>
      <h3>AutoCAD 치수 명령</h3>
      <p>DIMLINEAR(DLI) 수평·수직, DIMALIGNED(DAL) 비스듬한 길이, DIMRADIUS(DRA)·DIMDIAMETER(DDI) 원·호, 치수 스타일은 DIMSTYLE(D). 글자 크기를 치수마다 바꾸지 말고 스타일에서 한 번에 바꿉니다.</p>`,
    points: ["Ø 지름, R 반지름, t 두께", "중복 금지, 계산 없이 읽히게", "스타일로 한 번에"],
    commands: ["DIMLINEAR", "DIMALIGNED", "DIMRADIUS", "DIMDIAMETER", "DIMSTYLE"],
    practice: [{ type: "viewer", id: "bracket-l", label: "L 브래킷에서 치수 보기" }, { type: "sandbox", id: "", label: "자유 모드에서 DLI로 치수 달기" }],
    check: [
      { q: "'4-Ø10'의 뜻은?", o: ["지름 4인 구멍 10개", "지름 10인 구멍 4개", "반지름 10, 깊이 4", "두께 4"], a: 1, why: "개수-지름 순입니다." },
      { q: "치수를 달면 안 되는 곳은?", o: ["외형선", "숨은선", "중심선 사이", "원"], a: 1, why: "숨은선으로 치수를 읽게 하지 않습니다. 보이는 면(또는 단면)에서 답니다." },
    ],
  },
  {
    id: "1-D3", title: "숨은선, 중심선, 단면도",
    summary: "보이지 않는 속을 숨은선으로 보여 줄지, 잘라서 단면으로 보여 줄지 판단하고 읽습니다.",
    body: `
      <p>구멍 하나라면 숨은선으로 충분합니다. 속이 복잡해 파선이 겹치기 시작하면 <b>잘라서 보여 주는 단면도</b>가 더 읽기 쉽습니다.</p>
      <h3>단면의 종류</h3>
      <ul>
        <li><b>온단면(전단면)</b>: 중심을 따라 통째로 자름.</li>
        <li><b>한쪽 단면(반단면)</b>: 대칭 부품의 1/4만 잘라 겉과 속을 같이 보여 줌.</li>
        <li><b>부분 단면</b>: 필요한 곳만 파단선으로 잘라 보여 줌.</li>
        <li><b>회전 단면</b>: 축·암의 단면 모양을 그 자리에 90° 돌려 그림.</li>
      </ul>
      <div data-figure="viewer:bearing-block?section=B"></div>
      <h3>단면도 읽는 법</h3>
      <ul>
        <li><b>절단선</b>(가는 1점 쇄선, 끝과 꺾인 곳은 굵게)과 화살표가 <b>보는 방향</b>을 알려 줍니다. "A-A"처럼 이름이 붙습니다.</li>
        <li>잘린 면에는 <b>해칭</b>(가는 실선, 보통 45°)을 넣습니다. 해칭이 없는 곳은 잘리지 않은 뒤쪽이 보이는 것입니다.</li>
        <li>축, 핀, 볼트, 리브는 길이 방향으로 자르지 않는 것이 원칙입니다(잘라도 해칭하지 않음).</li>
      </ul>
      <p>AutoCAD의 해칭은 HATCH(H). 경계가 닫혀 있어야 채워집니다.</p>
      <div class="callout yellow"><b>뷰어에서 해 보기</b>L 브래킷을 단면 B-B로 자르면 리브가 길이 방향으로 잘리는데도 해칭되지 않습니다. 플랜지 축을 단면 A-A로 자르면 축만 해칭이 빠집니다. 잘린 면에 마우스를 올리면 이유가 나옵니다.</div>`,
    points: ["파선이 겹치면 단면", "화살표 = 보는 방향", "해칭 = 잘린 면"],
    commands: ["HATCH"],
    practice: [
      { type: "viewer", id: "bearing-block&section=B", label: "베어링 블록 — 온단면 B-B" },
      { type: "viewer", id: "bearing-block&section=A&half=1", label: "베어링 블록 — 한쪽 단면 A-A" },
      { type: "viewer", id: "bracket-l&section=B", label: "L 브래킷 — 리브는 해칭하지 않는다" },
      { type: "viewer", id: "shaft-flange&section=A", label: "플랜지 축 — 축은 해칭하지 않는다" },
      { type: "quiz", id: "section", label: "단면도 읽기 퀴즈" },
      { type: "quiz", id: "hidden", label: "숨은선·중심선 읽기 퀴즈" },
    ],
    check: [
      { q: "단면도에서 해칭이 없는 영역은?", o: ["잘린 면", "잘리지 않은 뒤쪽이 보이는 부분", "숨은선", "오류"], a: 1, why: "해칭은 절단면에만 넣습니다." },
    ],
  },
  {
    id: "1-D4", title: "3D를 보고 3면도 그리기",
    summary: "정면을 정하고, 외형을 잡고, 폭·높이·깊이를 투상선으로 옮겨 세 면을 서로 맞게 그립니다.",
    body: `
      <ol>
        <li><b>정면 정하기</b>: 특징이 가장 잘 보이고 숨은선이 적은 방향.</li>
        <li><b>전체 크기</b>: 폭 × 깊이 × 높이를 먼저 적어 둔다.</li>
        <li><b>정면도</b>를 먼저 그린다(폭 × 높이).</li>
        <li><b>평면도</b>는 정면도 위에, 폭을 수직 투상선으로 올려 맞춘다(폭 × 깊이).</li>
        <li><b>우측면도</b>는 정면도 오른쪽에, 높이를 수평 투상선으로 맞추고 깊이는 평면도에서 45° 보조선으로 옮긴다.</li>
        <li>안 보이는 모서리를 숨은선으로, 구멍과 대칭에 중심선을 넣는다.</li>
      </ol>
      <div data-figure="alignRule"></div>
      <div class="callout tip"><b>CAD에서는</b>투상선 대신 XLINE(XL)이나 객체 스냅 추적(F11)으로 높이·폭을 맞춥니다. 연습장 미션에서는 3D 참고 모델을 옆에 띄워 두고 그립니다.</div>`,
    points: ["정면도 먼저", "투상선으로 맞춘다", "마지막에 숨은선·중심선"],
    commands: ["XLINE", "F11", "LAYER"],
    practice: [{ type: "sandbox", id: "m1-v1", label: "3D 보고 정면도·평면도 그리기" }, { type: "quiz", id: "missing", label: "빠진 한 면 고르기" }],
    check: [
      { q: "우측면도의 가로(깊이)는 어느 도면에서 옮겨 옵니까?", o: ["정면도의 가로", "평면도의 세로", "정면도의 세로", "배치도"], a: 1, why: "깊이는 평면도의 세로 방향과 우측면도의 가로 방향이 같습니다." },
    ],
  },
  {
    id: "1-D5", title: "레이어, 블록, 출력 기본",
    summary: "실무 도면의 세 가지 뼈대: 레이어로 정리하고, 반복 기호는 블록으로, 종이는 배치에서 냅니다.",
    body: `
      <h3>레이어 LAYER (LA)</h3>
      <ul>
        <li>레이어마다 이름·색·선 종류·선 가중치를 정합니다. 객체는 "ByLayer"로 두어 레이어를 따르게 합니다.</li>
        <li><b>끄기</b>: 안 보이지만 계산에는 남음 · <b>동결</b>: 계산에서도 빠짐(현재 레이어는 동결 불가) · <b>잠금</b>: 보이지만 고칠 수 없음</li>
        <li>현재 레이어를 먼저 바꾸고 그리는 습관. 잘못 그렸으면 특성(Ctrl+1)이나 MATCHPROP(MA)으로 옮깁니다.</li>
      </ul>
      <h3>블록 BLOCK (B) · INSERT (I)</h3>
      <p>밸브, 볼트, 표제란처럼 반복되는 모양은 블록으로 만들어 넣습니다. 정의를 한 번 고치면(BEDIT) 모든 삽입이 같이 바뀝니다. 복사한 선 묶음은 그렇지 않습니다.</p>
      <h3>출력 PLOT (Ctrl+P)</h3>
      <ul>
        <li>배치 탭 → 뷰포트(MV) → 뷰포트 축척 설정 → <b>축척 잠금</b></li>
        <li>플롯 스타일(CTB)이 색별로 출력 굵기를 정하는 회사가 많습니다.</li>
        <li>PDF로 먼저 뽑아 표제란이 잘리지 않았는지 확인합니다.</li>
      </ul>`,
    points: ["ByLayer로 그린다", "반복 모양은 블록", "축척은 뷰포트에서 잠근다"],
    commands: ["LAYER", "MATCHPROP", "PROPERTIES", "BLOCK", "INSERT", "BEDIT", "PLOT"],
    practice: [{ type: "sandbox", id: "", label: "레이어 나눠 그리기 (자유 모드)" }],
    check: [
      { q: "밸브 모양 20개를 한 번에 바꾸려면 처음에 어떻게 넣었어야 합니까?", o: ["COPY로 복사", "블록으로 삽입", "ARRAY 후 EXPLODE", "그룹 없이"], a: 1, why: "블록 정의를 고치면 모든 삽입에 반영됩니다." },
    ],
  },
  {
    id: "1-D6", title: "플랜트 도면의 종류 한눈에",
    summary: "PFD, P&ID, 배치도, 배관 평면·입면도, 아이소가 각각 어떤 질문에 답하는지 구분합니다. 3년차의 준비 운동입니다.",
    body: `
      <div data-figure="pidVsIso"></div>
      <table class="tbl">
        <tr><th>도면</th><th>답하는 질문</th><th>축척</th></tr>
        <tr><td>PFD (공정 흐름도)</td><td>어떤 장치에서 무엇이 얼마나 흐르나 (유량, 온도, 압력)</td><td>없음</td></tr>
        <tr><td>P&amp;ID (배관·계장도)</td><td>무엇이 무엇에 연결되고, 어떤 밸브·계기가 있나. 라인 번호</td><td>없음</td></tr>
        <tr><td>배치도 (Plot plan / Equipment layout)</td><td>장치가 어디에 놓이나</td><td>있음</td></tr>
        <tr><td>배관 평면도 · 입면도</td><td>배관이 어디로, 몇 높이로 지나가나</td><td>있음</td></tr>
        <tr><td>아이소 (Isometric)</td><td>한 라인을 정확히 몇 mm로, 어떤 부품으로 만드나 (제작·시공용)</td><td>없음 (치수가 진실)</td></tr>
        <tr><td>스풀도 · 서포트 상세도</td><td>공장에서 만들 조각, 받침의 모양</td><td>대개 없음</td></tr>
      </table>
      <p>같은 냉각수 스키드(CW-SKID-01)가 도면마다 어떻게 달라 보이는지 배관 도면 랩에서 확인하세요.</p>`,
    points: ["P&ID = 연결", "평면·입면 = 위치와 높이", "아이소 = 한 라인의 제작 정보"],
    commands: [],
    practice: [{ type: "piping", id: "overview", label: "배관 도면 랩 — 같은 배관, 다른 도면" }],
    check: [
      { q: "밸브가 몇 개, 어떤 종류인지 연결 관계로 확인하려면 어느 도면?", o: ["배치도", "P&ID", "아이소", "구조도"], a: 1, why: "P&ID는 연결과 밸브·계기를 보여 줍니다. 위치와 치수는 없습니다." },
    ],
  },
]);
