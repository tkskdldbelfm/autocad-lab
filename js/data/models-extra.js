// 3면도·3D 뷰어 보충 모델(입문·신입 3D 따라그리기용). 형식은 models.js와 같다.
// 단위 mm, X = 오른쪽(동), Y = 뒤(북), Z = 위.
window.ACAD = window.ACAD || {};
ACAD.models = ACAD.models || {};

(function () {
  const M = ACAD.models;
  const def = (id, meta, build) => { M[id] = Object.assign({ id, build }, meta); };
  const BOX_TAGS = ["left", "right", "front", "back", "bottom", "top"];
  const taggedBox = (min, max) => (G) => G.box(min, max).map((p, i) => Object.assign(p, { tag: BOX_TAGS[i] }));

  def("block-notch", {
    title: "모서리 따낸 블록", stage: "0", kind: "part",
    desc: "직육면체의 앞쪽 오른쪽 윗모서리를 사각으로 따낸 블록. 따낸 자리가 세 투상도 모두에 선으로 나온다.",
    look: [
      "정면도에서 따낸 자리는 ㄱ자 선 두 줄이다. 바닥(높이 20)과 옆벽(x = 50)이 정면에서 선으로 보인다.",
      "평면도에서는 앞쪽 오른쪽 모서리에 ㄱ자 선이 생긴다. 깊이 25까지 따냈다는 것을 평면도에서 읽는다.",
      "우측면도에서는 왼쪽(앞) 위에 ㄱ자 선이 생긴다. 우측면도의 왼쪽이 앞, 오른쪽이 뒤다.",
    ],
  }, (G) => {
    const polys = G.csg.subtract(taggedBox([0, 0, 0], [80, 50, 40])(G), G.box([50, -1, 20], [81, 25, 41], "notch"));
    return {
      bodies: [{ polys, csg: true }],
      parts: {
        notch: { name: "따낸 자리", prio: 1, info: "가로 30, 깊이 25, 높이 20만큼 잘라 낸 자리. 바닥·옆벽·뒷벽 세 면이 새로 생긴다.", views: { top: "앞쪽 오른쪽의 ㄱ자 선(x = 50, y = 25)", front: "오른쪽 위의 ㄱ자 선(높이 20, x = 50)", right: "왼쪽 위의 ㄱ자 선(높이 20, 깊이 25)" } },
        top: { name: "윗면", info: "높이 40의 윗면. 따낸 자리만큼 ㄱ자로 줄었다.", views: { top: "ㄱ자 선 바깥의 넓은 면", front: "맨 위 가로선", right: "맨 위 가로선" } },
        front: { name: "앞면", info: "따낸 자리 때문에 ㄱ자 모양이 된 앞면.", views: { top: "맨 아래 가로선", front: "정면도의 ㄱ자 선 바깥", right: "맨 왼쪽 세로선" } },
        right: { name: "오른쪽 면", info: "따낸 자리 때문에 ㄱ자 모양이 된 오른쪽 면.", views: { top: "맨 오른쪽 세로선", front: "맨 오른쪽 세로선", right: "우측면도의 ㄱ자 선 바깥" } },
        left: { name: "왼쪽 면", info: "왼쪽 면.", views: {} },
        back: { name: "뒷면", info: "뒷면.", views: {} },
        bottom: { name: "밑면", info: "밑면.", views: {} },
      },
      dims: [
        { view: "front", a: [50, 0, 40], b: [80, 0, 40], dir: "h", off: 12 },
        { view: "front", a: [80, 0, 20], b: [80, 0, 40], dir: "v", off: 12 },
      ],
    };
  });

  def("block-tee", {
    title: "T자 블록", stage: "0", kind: "part",
    desc: "바닥판 가운데에 기둥이 선 뒤집힌 T자 블록. 좌우 대칭이라 중심선이 기준이 된다.",
    look: [
      "정면도에 뒤집힌 T자가 그대로 나온다. 좌우 대칭이니 가운데(x = 45)에 세로 중심선을 넣는다.",
      "평면도의 세로선 두 줄(x = 30, 60)은 기둥의 양옆 벽이다. 수직인 면은 위에서 선으로 보인다.",
      "우측면도의 높이 20 가로선은 바닥판의 윗모서리다. 기둥 왼쪽의 같은 모서리는 그 선과 겹친다.",
    ],
  }, (G) => {
    const prof = [[0, 0], [90, 0], [90, 20], [60, 20], [60, 50], [30, 50], [30, 20], [0, 20]];
    const wall = ["bottom", "right", "flange", "web", "top", "web", "flange", "left"];
    const polys = G.extrude(prof, [], [0, 50, 0], [1, 0, 0], [0, 0, 1], [0, -1, 0], 50, {
      wallTag: (i) => wall[i], capTags: ["back", "front"],
    });
    return {
      bodies: [{ polys }],
      parts: {
        web: { name: "기둥", prio: 1, info: "폭 30, 높이 30의 기둥. 바닥판 가운데에 앞뒤로 길게 서 있다.", views: { top: "가운데 세로선 두 줄 사이의 띠", front: "T자의 세로 막대", right: "높이 20 위쪽의 넓은 면" } },
        flange: { name: "바닥판 윗면", info: "기둥 양쪽의 높이 20 윗면 두 조각.", views: { top: "양쪽의 두 사각형", front: "높이 20의 가로선 두 토막", right: "높이 20의 가로선" } },
        top: { name: "기둥 윗면", info: "높이 50의 윗면.", views: { top: "가운데 띠", front: "맨 위 가로선(x 30~60)", right: "맨 위 가로선" } },
        front: { name: "앞면(T자)", info: "뒤집힌 T자 모양의 앞면.", views: { top: "맨 아래 가로선", front: "정면도 전체", right: "맨 왼쪽 세로선" } },
        right: { name: "오른쪽 면", info: "바닥판의 오른쪽 면(높이 20).", views: { top: "맨 오른쪽 세로선", front: "오른쪽 짧은 세로선", right: "아래쪽 띠(높이 0~20)" } },
        left: { name: "왼쪽 면", info: "왼쪽 면.", views: {} },
        back: { name: "뒷면", info: "뒷면.", views: {} },
        bottom: { name: "밑면", info: "밑면.", views: {} },
      },
      dims: [
        { view: "front", a: [60, 0, 20], b: [90, 0, 20], dir: "h", off: 12 },
        { view: "front", a: [90, 0, 0], b: [90, 0, 20], dir: "v", off: 12 },
      ],
    };
  });

  def("plate-boss", {
    title: "보스 달린 판", stage: "1", kind: "part",
    desc: "판 위에 원기둥(보스)이 선 부품. 원기둥은 축 방향에서만 원이고 나머지 두 면에서는 사각형이다.",
    look: [
      "평면도에서 보스는 원 하나와 중심선 십자다. 원기둥의 축이 위아래라 위에서 볼 때만 원이다.",
      "정면도와 우측면도에서 보스는 판 위의 사각형이다. 사각형 가운데에 세로 중심선을 넣는다.",
      "보스 사각형의 가로 = 지름 30. 정면도와 우측면도의 보스 폭이 같아야 원기둥이다.",
    ],
  }, (G) => {
    const plate = taggedBox([0, 0, 0], [90, 60, 15])(G);
    const boss = G.extrude(G.circle2(45, 30, 15, 32), [], [0, 0, 14], [1, 0, 0], [0, 1, 0], [0, 0, 1], 26, { tag: "boss" });
    const polys = G.csg.union(plate, boss);
    return {
      bodies: [{ polys, csg: true }],
      parts: {
        boss: { name: "보스 Ø30", prio: 1, info: "판 위에 선 지름 30, 높이 25의 원기둥.", views: { top: "지름 30 원 + 중심선 십자", front: "판 위의 30 × 25 사각형 + 세로 중심선", right: "판 위의 30 × 25 사각형 + 세로 중심선" } },
        top: { name: "판 윗면", info: "높이 15의 윗면. 가운데에 보스가 선다.", views: { top: "원 바깥의 사각형", front: "높이 15의 가로선", right: "높이 15의 가로선" } },
        front: { name: "앞면", info: "판의 앞면(90 × 15).", views: { top: "맨 아래 가로선", front: "아래쪽 띠", right: "맨 왼쪽 세로선" } },
        right: { name: "오른쪽 면", info: "판의 오른쪽 면(60 × 15).", views: { top: "맨 오른쪽 세로선", front: "맨 오른쪽 세로선", right: "아래쪽 띠" } },
        left: { name: "왼쪽 면", info: "왼쪽 면.", views: {} },
        back: { name: "뒷면", info: "뒷면.", views: {} },
        bottom: { name: "밑면", info: "밑면.", views: {} },
      },
      axes: [{ part: "boss", pts: [[45, 30, 15], [45, 30, 40]], r: 15 }],
      dims: [{ view: "top", type: "dia", c: [45, 30, 40], r: 15, ang: 45 }, { view: "front", a: [60, 0, 15], b: [60, 0, 40], dir: "v", off: 40 }],
    };
  });

  def("step-hole", {
    title: "구멍 뚫린 계단 블록", stage: "1", kind: "part",
    desc: "계단 블록의 낮은 단에 지름 20 구멍을 위아래로 뚫었다. 외형과 숨은선을 함께 그리는 종합 연습.",
    look: [
      "구멍은 평면도에서만 원이다. 정면도와 우측면도에서는 낮은 단 높이(25)까지만 파선 두 줄로 나온다.",
      "파선의 길이 = 구멍의 깊이. 높은 단까지 파선을 올리면 높은 단도 뚫린 것으로 읽힌다.",
      "우측면도의 파선 위치(깊이 20, 40)는 평면도에서 구멍의 앞뒤 끝(y = 20, 40)을 옮겨 온 것이다.",
    ],
  }, (G) => {
    const prof = [[0, 0], [100, 0], [100, 25], [50, 25], [50, 50], [0, 50]];
    const wall = ["bottom", "right", "step", "riser", "top", "left"];
    const body = G.extrude(prof, [], [0, 60, 0], [1, 0, 0], [0, 0, 1], [0, -1, 0], 60, {
      wallTag: (i) => wall[i], capTags: ["back", "front"],
    });
    const hole = G.extrude(G.circle2(75, 30, 10, 32), [], [0, 0, -1], [1, 0, 0], [0, 1, 0], [0, 0, 1], 27, { tag: "hole" });
    const polys = G.csg.subtract(body, hole);
    return {
      bodies: [{ polys, csg: true }],
      parts: {
        hole: { name: "관통 구멍 Ø20", prio: 1, info: "낮은 단(두께 25)을 위아래로 뚫은 지름 20 구멍.", views: { top: "지름 20 원 + 중심선 십자", front: "높이 25까지의 세로 파선 두 줄", right: "높이 25까지의 세로 파선 두 줄" } },
        step: { name: "낮은 윗면", info: "높이 25인 윗면. 구멍이 뚫려 있다.", views: { top: "오른쪽 사각형(원 바깥)", front: "높이 25의 가로선", right: "가운데 가로선" } },
        top: { name: "높은 윗면", info: "높이 50인 윗면.", views: { top: "왼쪽 사각형", front: "왼쪽 맨 위 가로선", right: "맨 위 가로선" } },
        riser: { name: "단 벽면", info: "두 윗면 사이의 수직 벽(x = 50).", views: { top: "가운데 세로선", front: "가운데 짧은 세로선", right: "위쪽 띠(높이 25~50)" } },
        front: { name: "앞면(L자)", info: "L자 모양의 앞면.", views: { top: "맨 아래 가로선", front: "정면도 전체", right: "맨 왼쪽 세로선" } },
        right: { name: "오른쪽 면(낮은 쪽)", info: "x = 100의 낮은 오른쪽 면.", views: { top: "맨 오른쪽 세로선", front: "오른쪽 짧은 세로선", right: "아래쪽 띠(높이 0~25)" } },
        left: { name: "왼쪽 면", info: "왼쪽 면.", views: {} },
        back: { name: "뒷면", info: "뒷면.", views: {} },
        bottom: { name: "밑면", info: "밑면.", views: {} },
      },
      axes: [{ part: "hole", pts: [[75, 30, 0], [75, 30, 25]], r: 10 }],
      dims: [{ view: "top", type: "dia", c: [75, 30, 25], r: 10, ang: 45 }],
    };
  });

  def("block-vgroove", {
    title: "V홈 블록", stage: "1", kind: "part",
    desc: "윗면에 45° V홈이 파인 블록. 우측면도에서 홈의 골이 숨은선 한 줄로 나온다.",
    look: [
      "정면도에서 V홈의 모양(폭 30, 깊이 15)이 그대로 보인다. 경사면은 정면에서 선으로 보인다.",
      "평면도의 세로선 세 줄은 홈의 양쪽 가장자리(x = 25, 55)와 골(x = 40)이다.",
      "우측면도에서는 오른쪽 벽이 홈을 모두 가린다. 골(높이 25)만 가로 파선 한 줄로 남는다.",
    ],
  }, (G) => {
    const prof = [[0, 0], [80, 0], [80, 40], [55, 40], [40, 25], [25, 40], [0, 40]];
    const wall = ["bottom", "right", "top", "groove", "groove", "top", "left"];
    const polys = G.extrude(prof, [], [0, 50, 0], [1, 0, 0], [0, 0, 1], [0, -1, 0], 50, {
      wallTag: (i) => wall[i], capTags: ["back", "front"],
    });
    return {
      bodies: [{ polys }],
      parts: {
        groove: { name: "V홈", prio: 1, info: "폭 30, 깊이 15, 양쪽 45° 경사의 홈. 앞에서 뒤까지 이어진다.", views: { top: "세로선 세 줄(가장자리 둘 + 골)", front: "위쪽의 V자", right: "높이 25의 가로 파선(골)" } },
        top: { name: "윗면(홈 양쪽)", info: "홈 양옆의 윗면 두 조각.", views: { top: "양쪽의 두 사각형", front: "맨 위 가로선 두 토막", right: "맨 위 가로선" } },
        front: { name: "앞면", info: "V자로 파인 앞면.", views: { top: "맨 아래 가로선", front: "정면도 전체", right: "맨 왼쪽 세로선" } },
        right: { name: "오른쪽 면", info: "오른쪽 면. 홈은 이 면 뒤에 숨는다.", views: { top: "맨 오른쪽 세로선", front: "맨 오른쪽 세로선", right: "우측면도 전체" } },
        left: { name: "왼쪽 면", info: "왼쪽 면.", views: {} },
        back: { name: "뒷면", info: "뒷면.", views: {} },
        bottom: { name: "밑면", info: "밑면.", views: {} },
      },
      dims: [
        { view: "front", a: [55, 0, 40], b: [80, 0, 40], dir: "h", off: 12 },
        { view: "front", a: [80, 0, 25], b: [80, 0, 40], dir: "v", off: 12 },
      ],
    };
  });
})();
