// 3면도·3D 뷰어 모델 라이브러리. 단위 mm, X = 오른쪽(동), Y = 뒤(북), Z = 위.
// build(G) → { bodies:[{polys, csg}], parts:{ id:{ name, info, prio, views, line, kind } }, axes, labels, dims, flows, north, routes }
// prio: 모서리를 어느 부품이 가질지(구멍·홈처럼 높은 쪽이 가져간다).
window.ACAD = window.ACAD || {};
ACAD.models = ACAD.models || {};

(function () {
  const M = ACAD.models;
  const def = (id, meta, build) => { M[id] = Object.assign({ id, build }, meta); };
  const tagAll = (polys, tag) => polys.map((p) => Object.assign(p, { tag }));

  // ======================================================================
  // 입문·신입: 기계 부품
  // ======================================================================

  def("block-basic", {
    title: "직육면체 블록", stage: "0", kind: "part",
    desc: "가장 단순한 입체. 여섯 면 가운데 세 면이 평면도·정면도·우측면도가 된다.",
    look: [
      "윗면에 마우스를 올리면 평면도 전체가 노랗게 칠해진다. 면 하나 = 투상도 하나.",
      "같은 윗면이 정면도와 우측면도에서는 맨 위의 가로선 한 줄로 줄어든다.",
      "정면도의 가로 길이 = 평면도의 가로 길이, 정면도의 높이 = 우측면도의 높이. 이것이 3면도의 줄 맞춤이다.",
    ],
  }, (G) => {
    const W = 80, D = 50, H = 40;
    const tags = ["left", "right", "front", "back", "bottom", "top"];
    const polys = G.box([0, 0, 0], [W, D, H]).map((p, i) => Object.assign(p, { tag: tags[i] }));
    return {
      bodies: [{ polys }],
      parts: {
        top: { name: "윗면", info: "위를 향한 면. 위에서 내려다보면 이 면만 보인다.", views: { top: "평면도 전체(80×50 사각형)", front: "맨 위 가로선 한 줄", right: "맨 위 가로선 한 줄" } },
        front: { name: "앞면(정면)", info: "앞을 향한 면. 정면도는 이 면을 정면에서 본 모양이다.", views: { top: "맨 아래 가로선 한 줄", front: "정면도 전체(80×40 사각형)", right: "맨 왼쪽 세로선 한 줄" } },
        right: { name: "오른쪽 면", info: "오른쪽을 향한 면. 우측면도는 이 면을 본 모양이다.", views: { top: "맨 오른쪽 세로선", front: "맨 오른쪽 세로선", right: "우측면도 전체(50×40 사각형)" } },
        left: { name: "왼쪽 면", info: "세 투상도 어디에서도 면으로 보이지 않는다. 좌측면도가 있어야 면으로 보인다.", views: { top: "맨 왼쪽 세로선", front: "맨 왼쪽 세로선", right: "보이지 않음(반대편)" } },
        back: { name: "뒷면", info: "배면도에서만 면으로 보인다.", views: { top: "맨 위 가로선", front: "보이지 않음(반대편)", right: "맨 오른쪽 세로선" } },
        bottom: { name: "밑면", info: "저면도에서만 면으로 보인다.", views: { top: "보이지 않음(반대편)", front: "맨 아래 가로선", right: "맨 아래 가로선" } },
      },
    };
  });

  def("block-step", {
    title: "계단 블록", stage: "0", kind: "part",
    desc: "높이가 두 단인 L자 블록. 면이 선으로, 선이 점으로 보이는 순간을 익힌다.",
    look: [
      "정면도에 L자 모양이 그대로 나온다. 모양의 특징이 가장 잘 보이는 쪽을 정면으로 고른다.",
      "평면도 가운데 세로선 한 줄은 '단 벽면'이다. 수직인 면을 위에서 보면 선이 된다.",
      "우측면도의 가운데 가로선은 낮은 단의 모서리다. 앞에 있어 실선으로 보인다.",
    ],
  }, (G) => {
    const prof = [[0, 0], [100, 0], [100, 25], [50, 25], [50, 50], [0, 50]];
    const wall = ["bottom", "right", "step", "riser", "top", "left"];
    const polys = G.extrude(prof, [], [0, 60, 0], [1, 0, 0], [0, 0, 1], [0, -1, 0], 60, {
      wallTag: (i) => wall[i], capTags: ["back", "front"],
    });
    return {
      bodies: [{ polys }],
      parts: {
        top: { name: "높은 윗면", info: "높이 50인 윗면(왼쪽 절반).", views: { top: "평면도 왼쪽 사각형", front: "정면도 왼쪽 맨 위 가로선", right: "우측면도 맨 위 가로선" } },
        step: { name: "낮은 윗면", info: "높이 25인 윗면(오른쪽 절반).", views: { top: "평면도 오른쪽 사각형", front: "정면도 오른쪽, 높이 25의 가로선", right: "우측면도 가운데 가로선" } },
        riser: { name: "단 벽면", info: "두 윗면 사이의 수직 벽(x = 50). 오른쪽을 향한다.", views: { top: "가운데 세로선 한 줄(면이 선으로 보인다)", front: "가운데 짧은 세로선", right: "우측면도 위쪽 띠(높이 25~50)" } },
        front: { name: "앞면(L자)", info: "L자 모양의 앞면. 정면도가 이 면이다.", views: { top: "평면도 맨 아래 가로선", front: "정면도 전체(L자)", right: "우측면도 맨 왼쪽 세로선" } },
        right: { name: "오른쪽 면(낮은 쪽)", info: "x = 100의 낮은 오른쪽 면.", views: { top: "평면도 맨 오른쪽 세로선", front: "정면도 오른쪽 짧은 세로선", right: "우측면도 아래쪽 띠(높이 0~25)" } },
        left: { name: "왼쪽 면", info: "높이 50 전체의 왼쪽 면.", views: { top: "맨 왼쪽 세로선", front: "맨 왼쪽 세로선", right: "보이지 않음" } },
        back: { name: "뒷면(L자)", info: "앞면과 같은 L자. 배면도에서 좌우가 뒤집혀 보인다.", views: { top: "맨 위 가로선", front: "보이지 않음", right: "맨 오른쪽 세로선" } },
        bottom: { name: "밑면", info: "바닥.", views: { top: "보이지 않음", front: "맨 아래 가로선", right: "맨 아래 가로선" } },
      },
      dims: [
        { view: "front", a: [50, 0, 50], b: [100, 0, 50], dir: "h", off: 14 },
        { view: "front", a: [100, 0, 0], b: [100, 0, 25], dir: "v", off: 14 },
      ],
    };
  });

  def("block-slot", {
    title: "홈 블록", stage: "1", kind: "part",
    desc: "위쪽에 U자 홈이 파인 블록. 우측면도에서 홈 바닥이 숨은선(파선)으로 나온다.",
    look: [
      "정면도에서 U자 홈의 모양이 보인다. 홈의 폭과 깊이는 정면도에서 읽는다.",
      "우측면도의 파선은 홈 바닥이다. 오른쪽 벽에 가려 있어 숨은선으로 그린다.",
      "평면도의 두 세로선 사이 띠가 홈 바닥이다. 위에서는 가리는 것이 없어 실선이다.",
    ],
  }, (G) => {
    const prof = [[0, 0], [90, 0], [90, 40], [60, 40], [60, 20], [30, 20], [30, 40], [0, 40]];
    const wall = ["bottom", "right", "top", "slot", "slot", "slot", "top", "left"];
    const polys = G.extrude(prof, [], [0, 60, 0], [1, 0, 0], [0, 0, 1], [0, -1, 0], 60, {
      wallTag: (i) => wall[i], capTags: ["back", "front"],
    });
    return {
      bodies: [{ polys }],
      parts: {
        slot: { name: "U자 홈", prio: 1, info: "폭 30, 깊이 20의 홈. 앞에서 뒤까지 관통한다.", views: { top: "두 세로선 사이의 띠(홈 바닥이 보인다)", front: "위쪽의 U자 모양", right: "높이 20의 가로 파선(오른쪽 벽에 가려짐)" } },
        top: { name: "윗면(홈 양쪽)", info: "홈 양옆의 윗면 두 조각.", views: { top: "홈 양쪽의 두 사각형", front: "맨 위 가로선 두 토막", right: "맨 위 가로선" } },
        front: { name: "앞면(U자)", info: "U자 모양의 앞면.", views: { top: "맨 아래 가로선", front: "정면도 전체", right: "맨 왼쪽 세로선" } },
        right: { name: "오른쪽 면", info: "오른쪽 벽의 바깥면.", views: { top: "맨 오른쪽 세로선", front: "맨 오른쪽 세로선", right: "우측면도 전체(홈은 이 면 뒤에 숨는다)" } },
        left: { name: "왼쪽 면", info: "왼쪽 바깥면.", views: {} },
        back: { name: "뒷면", info: "뒷면.", views: {} },
        bottom: { name: "밑면", info: "바닥.", views: {} },
      },
      dims: [
        { view: "front", a: [30, 0, 40], b: [60, 0, 40], dir: "h", off: 12 },
        { view: "front", a: [90, 0, 20], b: [90, 0, 40], dir: "v", off: 12 },
      ],
    };
  });

  def("block-hole", {
    title: "구멍 뚫린 판", stage: "1", kind: "part",
    desc: "가운데에 지름 24 관통 구멍이 있는 판. 숨은선과 중심선을 처음 만나는 모델.",
    look: [
      "평면도에서 구멍은 원 하나와 중심선 십자로 그린다.",
      "정면도·우측면도의 두 파선은 구멍의 벽이다. 판 안에 숨어 있어 숨은선이다.",
      "원이 보이는 쪽(평면도)에 지름 치수 Ø24를 넣는다. 파선에는 치수를 넣지 않는다.",
    ],
  }, (G) => {
    const polys = G.extrude([[0, 0], [100, 0], [100, 60], [0, 60]], [G.circle2(50, 30, 12, 32)],
      [0, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1], 20, {
        wallTag: (i) => ["front", "right", "back", "left"][i], holeTags: ["hole"], capTags: ["bottom", "top"],
      });
    return {
      bodies: [{ polys }],
      parts: {
        hole: { name: "관통 구멍 Ø24", prio: 1, info: "판을 위아래로 뚫은 지름 24 구멍.", views: { top: "지름 24 원 + 중심선 십자", front: "세로 파선 두 줄 + 세로 중심선", right: "세로 파선 두 줄 + 세로 중심선" } },
        top: { name: "윗면", info: "구멍이 뚫린 윗면.", views: { top: "평면도 전체(원 바깥)", front: "맨 위 가로선", right: "맨 위 가로선" } },
        front: { name: "앞면", info: "앞면. 구멍은 이 면 뒤에 숨는다.", views: { top: "맨 아래 가로선", front: "정면도 전체", right: "맨 왼쪽 세로선" } },
        right: { name: "오른쪽 면", info: "오른쪽 면.", views: { top: "맨 오른쪽 세로선", front: "맨 오른쪽 세로선", right: "우측면도 전체" } },
        back: { name: "뒷면", info: "뒷면.", views: {} },
        left: { name: "왼쪽 면", info: "왼쪽 면.", views: {} },
        bottom: { name: "밑면", info: "밑면.", views: {} },
      },
      axes: [{ part: "hole", pts: [[50, 30, 0], [50, 30, 20]], r: 12 }],
      dims: [
        { view: "top", type: "dia", c: [50, 30, 20], r: 12, ang: 45 },
        { view: "top", a: [0, 0, 20], b: [50, 30, 20], dir: "h", off: -18 },
      ],
    };
  });

  def("wedge-block", {
    title: "경사면 블록", stage: "1", kind: "part",
    desc: "한 모서리를 비스듬히 잘라 낸 블록. 경사면은 한 투상도에서만 선으로 보인다.",
    look: [
      "정면도에서 경사면은 비스듬한 선 한 줄이다. 경사면에 나란히 보는 방향이라 면이 선으로 보인다.",
      "평면도와 우측면도에서 경사면은 사각형으로 보이지만 실제 크기보다 짧다.",
      "경사면의 실제 크기는 경사면에 수직으로 본 보조 투상도가 있어야 알 수 있다.",
    ],
  }, (G) => {
    const prof = [[0, 0], [80, 0], [80, 20], [40, 50], [0, 50]];
    const wall = ["bottom", "right", "slope", "top", "left"];
    const polys = G.extrude(prof, [], [0, 50, 0], [1, 0, 0], [0, 0, 1], [0, -1, 0], 50, {
      wallTag: (i) => wall[i], capTags: ["back", "front"],
    });
    return {
      bodies: [{ polys }],
      parts: {
        slope: { name: "경사면", info: "높이 20에서 50까지 기울어진 면. 길이 50(40×30 직각삼각형의 빗변).", views: { top: "오른쪽 사각형(가로 40 — 실제 50보다 짧다)", front: "비스듬한 선 한 줄", right: "가운데 띠(높이 20~50)" } },
        top: { name: "윗면", info: "높이 50의 평평한 윗면.", views: { top: "왼쪽 사각형", front: "맨 위 가로선(왼쪽 40)", right: "맨 위 가로선" } },
        front: { name: "앞면", info: "오각형 앞면.", views: { top: "맨 아래 가로선", front: "정면도 전체(오각형)", right: "맨 왼쪽 세로선" } },
        right: { name: "오른쪽 면", info: "높이 20의 낮은 오른쪽 면.", views: { top: "맨 오른쪽 세로선", front: "오른쪽 짧은 세로선", right: "아래쪽 띠(높이 0~20)" } },
        left: { name: "왼쪽 면", info: "왼쪽 면.", views: {} },
        back: { name: "뒷면", info: "뒷면.", views: {} },
        bottom: { name: "밑면", info: "밑면.", views: {} },
      },
      dims: [{ view: "front", a: [80, 0, 0], b: [80, 0, 20], dir: "v", off: 12 }, { view: "front", a: [40, 0, 50], b: [80, 0, 50], dir: "h", off: 12 }],
    };
  });

  def("bracket-l", {
    title: "L 브래킷", stage: "1", kind: "part",
    // 단면: A-A는 바닥 구멍 중심(y=22), B-B는 리브·세움판 구멍 중심(x=50)
    section: { A: 22, B: 50 },
    sectionSplits: [[2, 12], [1, 48]],
    sectionOwner: (c) => (c[1] >= 48 ? "upright" : c[2] < 12 ? "base" : "rib"),
    desc: "바닥판과 세움판, 보강 리브, 방향이 다른 구멍 세 개. 한 부품을 세 투상도에서 쫓아가는 연습.",
    look: [
      "바닥 구멍 두 개는 평면도에서 원, 정면도에서 파선이다. 세움판 구멍은 그 반대다.",
      "리브(삼각 보강판)는 우측면도에서 삼각형 모양으로 보인다.",
      "구멍마다 중심선이 있다. 중심선이 긴 쪽이 구멍의 축 방향이다.",
    ],
  }, (G) => {
    const prof = [[0, 0], [60, 0], [60, 70], [48, 70], [48, 12], [0, 12]];
    const wall = ["base", "upright", "upright", "upright", "base", "base"];
    const L = G.extrude(prof, [], [0, 0, 0], [0, 1, 0], [0, 0, 1], [1, 0, 0], 100, {
      wallTag: (i) => wall[i], capTagFn: (c) => (c[1] < 12 && c[0] < 48 ? "base" : "upright"),
    });
    const rib = G.extrude([[16, 11], [49, 11], [49, 34]], [], [45, 0, 0], [0, 1, 0], [0, 0, 1], [1, 0, 0], 10, { tag: "rib" });
    const h1 = G.cyl([25, 22, -1], [25, 22, 13], 6, { tag: "hole-base" });
    const h2 = G.cyl([75, 22, -1], [75, 22, 13], 6, { tag: "hole-base" });
    const h3 = G.cyl([50, 47, 45], [50, 61, 45], 8, { tag: "hole-up" });
    const polys = G.csg.subtractAll(G.csg.union(L, rib), [h1, h2, h3]);
    return {
      bodies: [{ polys, csg: true }],
      parts: {
        base: { name: "바닥판", info: "100×48, 두께 12의 바닥판.", views: { top: "평면도 아래쪽 넓은 사각형", front: "정면도 아래 띠(두께 12)", right: "L자의 가로 다리" } },
        upright: { name: "세움판", info: "높이 70, 두께 12의 세운 판.", views: { top: "평면도 위쪽 좁은 띠", front: "정면도 전체 높이의 사각형", right: "L자의 세로 다리" } },
        rib: { name: "보강 리브", prio: 1, noHatch: { B: "리브를 두께 방향이 아니라 길이 방향(판과 나란히)으로 자르면 해칭하지 않는다(KS). 해칭하면 속이 꽉 찬 덩어리처럼 잘못 읽힌다." }, info: "바닥판과 세움판을 잇는 삼각 보강판(두께 10).", views: { top: "가운데 좁은 띠", front: "가운데 세로선 두 줄", right: "삼각형" } },
        "hole-base": { name: "바닥 구멍 Ø12 ×2", prio: 2, info: "바닥판을 위아래로 뚫은 볼트 구멍 두 개.", views: { top: "원 두 개 + 십자 중심선", front: "파선 두 쌍", right: "파선(두 구멍이 겹쳐 한 쌍)" } },
        "hole-up": { name: "세움판 구멍 Ø16", prio: 2, info: "세움판을 앞뒤로 뚫은 구멍.", views: { top: "파선 한 쌍", front: "원 + 십자 중심선", right: "파선 한 쌍" } },
      },
      axes: [
        { part: "hole-base", pts: [[25, 22, 0], [25, 22, 12]], r: 6 },
        { part: "hole-base", pts: [[75, 22, 0], [75, 22, 12]], r: 6 },
        { part: "hole-up", pts: [[50, 48, 45], [50, 60, 45]], r: 8 },
      ],
      dims: [
        { view: "top", a: [25, 22, 12], b: [75, 22, 12], dir: "h", off: -72 },
        { view: "front", type: "dia", c: [50, 48, 45], r: 8, ang: 45 },
      ],
    };
  });

  def("shaft-flange", {
    title: "플랜지 축", stage: "1", kind: "part",
    // 단면: A-A는 축 중심을 지나는 면(y=0), B-B는 플랜지 두께 가운데(x=7.5)
    section: { A: 0, B: 7.5 },
    sectionSplits: [[0, 15], [0, 35]],
    sectionOwner: (c) => (c[0] < 15 ? "flange" : c[0] < 35 ? "hub" : "shaft"),
    desc: "플랜지·보스·축이 한 줄로 이어진 회전체. 중심선 하나가 도면 전체를 꿰뚫는다.",
    look: [
      "회전체는 축 방향에서 본 면(우측면도)에서만 원으로 보인다. 나머지는 사각형의 조합이다.",
      "볼트 구멍 네 개는 우측면도에서 원, 정면도와 평면도에서는 플랜지 안의 파선이다.",
      "볼트 구멍 중심을 잇는 원(PCD)도 1점 쇄선으로 그린다.",
    ],
  }, (G) => {
    const flange = G.cyl([0, 0, 0], [15, 0, 0], 50, { tag: "flange" });
    const hub = G.cyl([14, 0, 0], [35, 0, 0], 30, { tag: "hub" });
    const shaft = G.cyl([34, 0, 0], [150, 0, 0], 20, { tag: "shaft" });
    let polys = G.csg.union(G.csg.union(flange, hub), shaft);
    const bolts = [[0, 38], [38, 0], [0, -38], [-38, 0]];
    polys = G.csg.subtractAll(polys, bolts.map(([y, z]) => G.cyl([-1, y, z], [16, y, z], 6, { tag: "bolt" })));
    polys = G.csg.subtract(polys, G.box([100, -6, 15], [141, 6, 22], "key"));
    return {
      bodies: [{ polys, csg: true }],
      parts: {
        flange: { name: "플랜지 Ø100", info: "두께 15의 원판. 볼트로 다른 부품에 붙는다.", views: { top: "왼쪽의 높은 사각형", front: "왼쪽의 높은 사각형", right: "가장 큰 원" } },
        hub: { name: "보스 Ø60", info: "플랜지와 축 사이의 굵은 부분.", views: { top: "가운데 사각형", front: "가운데 사각형", right: "중간 원(축에 가려 일부만 보임)" } },
        shaft: { name: "축 Ø40", noHatch: { A: "축·핀·볼트처럼 속이 꽉 찬 긴 부품은 길이 방향으로 잘라도 해칭하지 않는다(KS). 잘라 봐도 새로 알 것이 없기 때문이다." }, info: "길이 115의 축.", views: { top: "긴 사각형 + 가로 중심선", front: "긴 사각형 + 가로 중심선", right: "가장 작은 원 + 십자 중심선" } },
        bolt: { name: "볼트 구멍 Ø12 ×4", prio: 2, info: "PCD 76 위에 90° 간격으로 뚫은 구멍.", views: { top: "플랜지 안의 파선", front: "플랜지 안의 파선", right: "작은 원 네 개 + PCD 원" } },
        key: { name: "키 홈", prio: 2, info: "축 윗면의 폭 12, 깊이 5 홈. 풀리나 기어를 돌리는 키가 들어간다.", views: { top: "축 위의 긴 사각형", front: "축 윗선의 오목한 부분", right: "작은 원 위쪽의 홈 모양(숨은선)" } },
      },
      axes: [
        { part: "shaft", pts: [[0, 0, 0], [150, 0, 0]], r: 50 },
        ...bolts.map(([y, z]) => ({ part: "bolt", pts: [[0, y, z], [15, y, z]], r: 6 })),
        { part: "bolt", circle: true, c: [0, 0, 0], r: 38, n: [1, 0, 0] },
      ],
      dims: [{ view: "right", type: "dia", c: [150, 0, 0], r: 50, ang: 30 }],
    };
  });

  def("bearing-block", {
    title: "베어링 블록", stage: "1", kind: "part",
    // 단면: A-A는 설치·주유 구멍 중심(y=25), B-B는 축 구멍 중심(x=60)
    section: { A: 25, B: 60 },
    sectionSplits: [[2, 20]],
    sectionOwner: (c) => (c[2] < 20 ? "base" : "boss"),
    desc: "받침·보스·축 구멍·설치 구멍·주유 구멍. 투상도 읽기의 종합 문제.",
    look: [
      "정면도에서 축 구멍은 원, 설치 구멍과 주유 구멍은 파선이다.",
      "평면도에서 주유 구멍은 원으로, 축 구멍은 파선 두 줄로 나온다.",
      "보스의 둥근 윗부분은 우측면도에서 윤곽선(실선)으로만 나타난다.",
    ],
  }, (G) => {
    const base = G.box([0, 0, 0], [120, 50, 20], "base");
    const boss = G.extrude([[25, 19], [95, 19], ...G.arc2(60, 60, 35, 0, Math.PI, 24)], [], [0, 45, 0], [1, 0, 0], [0, 0, 1], [0, -1, 0], 40, { tag: "boss" });
    let polys = G.csg.union(base, boss);
    polys = G.csg.subtractAll(polys, [
      G.cyl([60, -1, 60], [60, 51, 60], 20, { tag: "bore" }),
      G.cyl([15, 25, -1], [15, 25, 21], 7, { tag: "mount" }),
      G.cyl([105, 25, -1], [105, 25, 21], 7, { tag: "mount" }),
      G.cyl([60, 25, 76], [60, 25, 97], 3, { tag: "oil" }),
    ]);
    return {
      bodies: [{ polys, csg: true }],
      parts: {
        base: { name: "받침", info: "120×50, 두께 20의 받침.", views: { top: "평면도 전체 사각형", front: "아래 띠(두께 20)", right: "아래 띠" } },
        boss: { name: "보스", info: "축을 감싸는 몸통. 윗부분이 반원(R35)이다.", views: { top: "가운데 사각형(폭 70)", front: "반원 지붕을 가진 모양", right: "받침 위의 좁은 사각형(두께 40)" } },
        bore: { name: "축 구멍 Ø40", prio: 2, info: "앞뒤로 관통하는 축 구멍.", views: { top: "파선 두 줄", front: "원 + 십자 중심선", right: "파선 두 줄" } },
        mount: { name: "설치 구멍 Ø14 ×2", prio: 2, info: "바닥에 고정하는 볼트 구멍.", views: { top: "원 두 개", front: "파선 두 쌍", right: "파선 한 쌍(겹침)" } },
        oil: { name: "주유 구멍 Ø6", prio: 2, info: "보스 꼭대기에서 축 구멍까지 뚫은 기름 구멍.", views: { top: "작은 원", front: "위쪽 짧은 파선 두 줄", right: "위쪽 짧은 파선 두 줄" } },
      },
      axes: [
        { part: "bore", pts: [[60, 0, 60], [60, 50, 60]], r: 20 },
        { part: "mount", pts: [[15, 25, 0], [15, 25, 20]], r: 7 },
        { part: "mount", pts: [[105, 25, 0], [105, 25, 20]], r: 7 },
        { part: "oil", pts: [[60, 25, 80], [60, 25, 95]], r: 3 },
      ],
      dims: [
        { view: "front", type: "dia", c: [60, 0, 60], r: 20, ang: 40 },
        { view: "front", a: [15, 0, 0], b: [105, 0, 0], dir: "h", off: -44 },
        { view: "front", a: [120, 0, 0], b: [120, 0, 60], dir: "v", off: 14 },
      ],
    };
  });

  // ======================================================================
  // 3년차~: 배관
  // ======================================================================
  const IN = 25.4;
  // 호칭경별 외경과 ASME B16.5 Class 150 플랜지(외경, 두께, WN 허브 길이) 근사값. 게이트·체크 밸브 면간거리(B16.10).
  const NPS = {
    0.5: { od: 21.3, wt: 2.77, fod: 88.9, ft: 11.2, hub: 47.8, gate: 108, check: 108 },
    1: { od: 33.4, wt: 3.38, fod: 108, ft: 14.2, hub: 55.6, gate: 127, check: 165 },
    3: { od: 88.9, wt: 5.49, fod: 190.5, ft: 23.9, hub: 69.9, gate: 203, check: 241 },
    4: { od: 114.3, wt: 6.02, fod: 228.6, ft: 23.9, hub: 76.2, gate: 229, check: 292 },
    6: { od: 168.3, wt: 7.11, fod: 279.4, ft: 25.4, hub: 88.9, gate: 267, check: 356 },
  };
  ACAD.NPS = NPS;
  const lrR = (nps) => 1.5 * nps * IN; // 장반경(LR) 90° 엘보 중심~끝면 거리

  function Kit(G) {
    const { V } = G;
    const k = { bodies: [], parts: {}, axes: [], labels: [], flows: [], routes: {}, dims: [] };
    k.part = (id, d) => { if (!k.parts[id]) k.parts[id] = Object.assign({ prio: 0 }, d); return id; };
    k.add = (polys, tag, csg) => { k.bodies.push({ polys: tag ? tagAll(polys, tag) : polys, csg: !!csg }); };
    k.label = (views, at, text, o = {}) => k.labels.push(Object.assign({ views, at, text }, o));

    // 관 한 토막(열린 원통). 끝의 원이 접합선으로 그려진다.
    k.pipe = (tag, A, B, r) => {
      if (V.len(V.sub(B, A)) < 0.5) return;
      k.add(G.cyl(A, B, r, { caps: false, segs: 32 }), tag);
      k.axes.push({ part: tag, pts: [A, B], r, ext: false });
    };
    // 용접목 플랜지: 면이 P에 있고 dir 쪽으로 허브가 가늘어진다.
    k.flange = (tag, P, dir, s, opt = {}) => {
      const t = opt.t ?? s.ft, hub = opt.hub ?? s.hub;
      k.add(G.cyl(P, V.add(P, V.mul(dir, t)), s.fod / 2), tag);
      if (hub > t) k.add(G.cyl(V.add(P, V.mul(dir, t)), V.add(P, V.mul(dir, hub)), s.od / 2 + s.od * 0.12, { r1: s.od / 2, caps: false }), tag);
      k.axes.push({ part: tag, pts: [P, V.add(P, V.mul(dir, hub))], r: s.fod / 2, ext: false, cross: false });
    };
    k.elbow = (tag, P, a, b, R, r) => {
      const C = V.add(V.sub(P, V.mul(a, R)), V.mul(b, R));
      k.add(G.torusArc(C, V.mul(b, -1), a, R, r, Math.PI / 2, { segsU: 12, segsV: 32 }), tag);
      const pts = [];
      for (let i = 0; i <= 12; i++) {
        const t = (i / 12) * (Math.PI / 2);
        pts.push(V.add(C, V.add(V.mul(b, -R * Math.cos(t)), V.mul(a, R * Math.sin(t)))));
      }
      k.axes.push({ part: tag, pts, r, cross: false });
    };
    // 플랜지형 밸브. P부터 dir로 전체 길이 = 면간거리 + 양쪽 배관 플랜지 두께.
    k.valve = (tag, type, P, dir, s, stem) => {
      const ft = s.ft, ff = type === "check" ? s.check : s.gate;
      const at = (d) => V.add(P, V.mul(dir, d));
      const rf = s.fod / 2;
      k.add(G.cyl(at(0), at(ft * 2), rf), tag);
      k.add(G.cyl(at(ff), at(ff + ft * 2), rf), tag);
      const mid = at(ft + ff / 2);
      if (type === "gate" || type === "globe") {
        if (type === "gate") k.add(G.cyl(at(ft * 2), at(ff), rf * 0.62), tag);
        else k.add(G.sphere(mid, rf * 0.78, { slices: 32, stacks: 16 }), tag);
        const top = V.add(mid, V.mul(stem, s.fod * (type === "gate" ? 1.25 : 1.0)));
        k.add(G.cyl(mid, top, rf * 0.42), tag);
        const stemTop = V.add(top, V.mul(stem, s.fod * 0.55));
        k.add(G.cyl(top, stemTop, Math.max(4, s.od * 0.09)), tag);
        const [u, w] = V.basis(stem);
        const R = s.fod * 0.42;
        k.add(G.torusArc(stemTop, u, w, R, Math.max(4, s.od * 0.07), Math.PI * 2, { segsU: 32, segsV: 12 }), tag);
        k.add(G.box(V.sub(stemTop, [R * 0.06 + 2, R * 0.06 + 2, R * 0.06 + 2]), V.add(stemTop, [R * 0.06 + 2, R * 0.06 + 2, R * 0.06 + 2])), tag);
      } else if (type === "check") {
        k.add(G.cyl(at(ft * 2), at(ff), rf * 0.7), tag);
        k.add(G.cyl(mid, V.add(mid, V.mul(stem, rf * 0.95)), rf * 0.5), tag);
      } else if (type === "ball") {
        k.add(G.sphere(mid, rf * 0.75, { slices: 32, stacks: 16 }), tag);
        const top = V.add(mid, V.mul(stem, s.fod * 0.62));
        k.add(G.cyl(mid, top, Math.max(4, s.od * 0.12)), tag);
        k.add(G.box(V.sub(top, [4, 4, 4]), V.add(V.add(top, V.mul(dir, s.fod * 1.6)), [4, 4, 4])), tag);
      }
      k.axes.push({ part: tag, pts: [at(0), at(ff + ft * 2)], r: s.od / 2, ext: false, cross: false });
      return ff + ft * 2;
    };

    // 라인 경로를 부품으로 만든다.
    // spec = { id, nps, pts, name, comps:[{seg, at, type:'gate'|'check'|'globe'|'ball', tag, name, stem}], start:'flange'|null, end:'flange'|'blind'|null, fw:[{seg, at}] }
    k.line = (spec) => {
      const s = NPS[spec.nps], r = s.od / 2, R = lrR(spec.nps);
      const L = spec.id, size = `${spec.nps === 0.5 ? "½" : spec.nps}"`;
      const pts = spec.pts, n = pts.length;
      const route = { id: L, nps: spec.nps, od: s.od, R, pts, comps: [], welds: [], name: spec.name };
      k.routes[L] = route;
      let np = 0, ne = 0, nf = 0;
      const pipeTag = () => k.part(`${L}-P${++np}`, { name: `${size} 배관 토막 ${np}`, info: `${spec.name}의 직관(SCH40 탄소강). 도면에서는 접합선(용접선) 사이의 한 토막.`, line: L, kind: "pipe", wall: s.wt });
      const flTag = (why) => k.part(`${L}-F${++nf}`, { name: `${size} WN 플랜지`, info: `용접목(WN) 플랜지 ASME B16.5 Class 150. ${why}`, line: L, kind: "flange" });
      let dist = 0;
      for (let i = 0; i < n - 1; i++) {
        const A = pts[i], B = pts[i + 1];
        const segLen = V.len(V.sub(B, A));
        const dir = V.norm(V.sub(B, A));
        const s0 = i > 0 ? R : 0, s1 = i < n - 2 ? segLen - R : segLen;
        const occ = [];
        if (i === 0 && spec.start === "flange") {
          const tag = flTag("장치 노즐 플랜지와 볼트로 결합한다.");
          k.flange(tag, A, dir, s);
          occ.push([0, s.hub]);
          route.comps.push({ type: "flange", tag, s: dist, len: s.hub });
          route.welds.push({ s: dist + s.hub, kind: "shop" });
        }
        if (i === n - 2 && spec.end) {
          const tag = flTag(spec.end === "blind" ? "끝을 막는 맹플랜지와 결합한다." : "장치 노즐 플랜지와 볼트로 결합한다.");
          k.flange(tag, B, V.mul(dir, -1), s);
          occ.push([segLen - s.hub, segLen]);
          route.comps.push({ type: "flange", tag, s: dist + segLen - s.hub, len: s.hub, end: true });
          route.welds.push({ s: dist + segLen - s.hub, kind: "shop" });
          if (spec.end === "blind") {
            const bt = k.part(`${L}-BL`, { name: `${size} 맹플랜지`, info: "배관 끝을 막는 판 플랜지. 드레인을 열 때 떼어 낸다.", line: L, kind: "flange" });
            k.add(G.cyl(B, V.add(B, V.mul(dir, s.ft)), s.fod / 2), bt);
            route.comps.push({ type: "blind", tag: bt, s: dist + segLen, len: s.ft });
          }
        }
        for (const c of spec.comps || []) {
          if (c.seg !== i) continue;
          const tag = k.part(c.tag, { name: c.name, info: c.info, line: L, kind: "valve", valve: c.type });
          const len = k.valve(tag, c.type, V.add(A, V.mul(dir, c.at)), dir, s, c.stem || [0, 0, 1]);
          occ.push([c.at, c.at + len]);
          route.comps.push({ type: c.type, tag, s: dist + c.at, len });
          route.welds.push({ s: dist + c.at, kind: "shop" }, { s: dist + c.at + len, kind: "shop" });
        }
        occ.sort((a, b) => a[0] - b[0]);
        let cur = s0;
        const fws = (spec.fw || []).filter((f) => f.seg === i).map((f) => f.at);
        const fill = (a, b) => {
          if (b - a < 0.5) return;
          const cuts = [a, ...fws.filter((x) => x > a && x < b), b];
          for (let j = 0; j < cuts.length - 1; j++) {
            const tag = pipeTag();
            k.pipe(tag, V.add(A, V.mul(dir, cuts[j])), V.add(A, V.mul(dir, cuts[j + 1])), r);
            route.comps.push({ type: "pipe", tag, s: dist + cuts[j], len: cuts[j + 1] - cuts[j] });
          }
        };
        for (const [a, b] of occ) { fill(cur, a); cur = Math.max(cur, b); }
        fill(cur, s1);
        fws.forEach((x) => route.welds.push({ s: dist + x, kind: "field" }));
        if (i < n - 2) {
          const tag = k.part(`${L}-E${++ne}`, { name: `${size} 90° 엘보(LR)`, info: `장반경 엘보. 중심에서 끝면까지 ${R.toFixed(1)} mm (1.5 × 호칭경). 맞대기 용접(BW).`, line: L, kind: "elbow", wall: s.wt });
          const b = V.norm(V.sub(pts[i + 2], B));
          k.elbow(tag, B, dir, b, R, r);
          route.comps.push({ type: "elbow", tag, s: dist + segLen, at: i + 1 });
          route.welds.push({ s: dist + segLen - R, kind: "shop" }, { s: dist + segLen + R, kind: "shop" });
        }
        dist += segLen;
      }
      route.length = dist;
      // 흐름 화살표: 각 직관 구간 가운데
      for (let i = 0; i < n - 1; i++) k.flows.push({ part: `${L}-P1`, line: L, at: V.lerp(pts[i], pts[i + 1], 0.5), dir: V.norm(V.sub(pts[i + 1], pts[i])) });
      return route;
    };
    return k;
  }
  ACAD.pipingKit = Kit;

  def("pipe-elbow-up", {
    title: "위로 꺾이는 엘보", stage: "2", kind: "piping",
    desc: "수평 배관이 90° 엘보에서 위로 꺾인다. 평면도에서 수직관은 원으로 보인다.",
    look: [
      "평면도에서 위로 올라가는 관은 원이다. 수평관 선이 원의 테두리에서 멈춘다(관이 보는 사람 쪽으로 온다).",
      "정면도에서는 L자로 보인다. 엘보의 굽은 모양과 중심선이 함께 보인다.",
      "관과 엘보, 관과 플랜지 사이의 선은 용접선(접합선)이다. 스풀과 자재를 셀 때 이 선을 센다.",
    ],
  }, (G) => {
    const k = Kit(G);
    k.line({ id: "E1", nps: 4, name: "예제 라인", pts: [[0, 0, 0], [700, 0, 0], [700, 0, 600]], start: "flange", end: "flange" });
    k.label(["front"], [350, 0, 0], "CL EL+0", { dy: 18 });
    k.label(["front"], [700, 0, 600], "FACE EL+600", { dx: 14, anchor: "start" });
    return k;
  });

  def("pipe-elbow-down", {
    title: "아래로 꺾이는 엘보", stage: "2", kind: "piping", hidden: true,
    desc: "수평 배관이 90° 엘보에서 아래로 꺾인다. 평면도에서 수평관 선이 원의 중심까지 들어간다.",
    look: ["평면도에서 엘보가 위에 있어 수직관의 원 일부를 가린다.", "정면도에서는 뒤집힌 L자다.", "위로/아래로 꺾임은 평면도만으로 구분해야 할 때가 많다."],
  }, (G) => {
    const k = Kit(G);
    k.line({ id: "E2", nps: 4, name: "예제 라인", pts: [[0, 0, 600], [700, 0, 600], [700, 0, 0]], start: "flange", end: "flange" });
    return k;
  });

  def("pipe-tee-valve", {
    title: "티 분기와 밸브", stage: "2", kind: "piping",
    desc: "4\" 주관에서 티로 위쪽 분기, 분기에 게이트 밸브. 주관 끝은 동심 리듀서로 3\"로 줄어든다.",
    look: [
      "평면도에서 위로 올라가는 분기는 주관 위의 원이다. 원이 주관 선을 끊고 위에 놓인다.",
      "동심 리듀서는 정면도에서 사다리꼴, 우측면도에서 두 개의 원으로 보인다.",
      "플랜지 두 장이 맞붙은 자리(볼트 결합)는 두꺼운 원판으로 보인다.",
    ],
  }, (G) => {
    const k = Kit(G);
    const { V } = G;
    const s4 = NPS[4], s3 = NPS[3], r4 = s4.od / 2, r3 = s3.od / 2;
    const T = [500, 0, 0], C = 105; // 4" 동경 티 중심~끝면
    const L = "T1";
    k.part("T1-F1", { name: '4" WN 플랜지', info: "주관 시작 플랜지.", line: L, kind: "flange" });
    k.flange("T1-F1", [0, 0, 0], [1, 0, 0], s4);
    k.part("T1-P1", { wall: s4.wt, name: '4" 주관 토막', info: "플랜지와 티 사이 직관.", line: L, kind: "pipe" });
    k.pipe("T1-P1", [s4.hub, 0, 0], [T[0] - C, 0, 0], r4);
    k.part("T1-TEE", { wall: s4.wt, name: '4" 동경 티', prio: 1, info: "주관(런)과 분기(브랜치)가 같은 4\"인 티. 중심~끝면 105 mm. 가지가 만나는 곡선이 상관선이다.", line: L, kind: "tee" });
    const run = G.cyl([T[0] - C, 0, 0], [T[0] + C, 0, 0], r4, { tag: "T1-TEE" });
    const br = G.cyl([T[0], 0, 0], [T[0], 0, C], r4, { tag: "T1-TEE" });
    k.bodies.push({ polys: G.csg.union(run, br), csg: true });
    k.axes.push({ part: "T1-TEE", pts: [[T[0] - C, 0, 0], [T[0] + C, 0, 0]], r: r4, ext: false, cross: false }, { part: "T1-TEE", pts: [T, [T[0], 0, C]], r: r4, ext: false });
    k.part("T1-P2", { wall: s4.wt, name: '4" 주관 토막', info: "티와 리듀서 사이 직관.", line: L, kind: "pipe" });
    k.pipe("T1-P2", [T[0] + C, 0, 0], [850, 0, 0], r4);
    k.part("T1-RED", { wall: s4.wt, name: '4"×3" 동심 리듀서', info: "중심선이 같은 채로 지름을 줄이는 이음쇠(길이 102). 수평관에서 바닥을 맞추려면 편심 리듀서를 쓴다.", line: L, kind: "reducer" });
    k.add(G.cyl([850, 0, 0], [952, 0, 0], r4, { r1: r3, caps: false }), "T1-RED");
    k.axes.push({ part: "T1-RED", pts: [[850, 0, 0], [952, 0, 0]], r: r4, ext: false, cross: false });
    k.part("T1-P3", { wall: s3.wt, name: '3" 배관 토막', info: "리듀서 뒤의 3\" 직관.", line: L, kind: "pipe" });
    k.pipe("T1-P3", [952, 0, 0], [1300 - s3.hub, 0, 0], r3);
    k.part("T1-F2", { name: '3" WN 플랜지', info: "주관 끝 플랜지.", line: L, kind: "flange" });
    k.flange("T1-F2", [1300, 0, 0], [-1, 0, 0], s3);
    // 분기
    k.part("T1-P4", { wall: s4.wt, name: '4" 분기관', info: "티에서 밸브까지 올라가는 관.", line: L, kind: "pipe" });
    k.pipe("T1-P4", [T[0], 0, C], [T[0], 0, 220], r4);
    k.part("V-1", { name: '4" 게이트 밸브', info: "분기 차단용 게이트 밸브(면간거리 229). 수직 분기에 달려 핸들이 옆(동쪽)을 향한다.", line: L, kind: "valve", valve: "gate" });
    const vl = k.valve("V-1", "gate", [T[0], 0, 220], [0, 0, 1], s4, [1, 0, 0]);
    k.part("T1-P5", { wall: s4.wt, name: '4" 분기관', info: "밸브 위의 짧은 관.", line: L, kind: "pipe" });
    k.pipe("T1-P5", [T[0], 0, 220 + vl], [T[0], 0, 820 - s4.hub], r4);
    k.part("T1-F3", { name: '4" WN 플랜지', info: "분기 끝 플랜지.", line: L, kind: "flange" });
    k.flange("T1-F3", [T[0], 0, 820], [0, 0, -1], s4);
    k.flows.push({ part: "T1-P1", at: [250, 0, 0], dir: [1, 0, 0] }, { part: "T1-P4", at: [T[0], 0, 170], dir: [0, 0, 1] });
    return k;
  });

  // ---------- 냉각수 스키드 CW-SKID-01 ----------
  def("cw-skid", {
    title: "냉각수 스키드 CW-SKID-01", stage: "3", kind: "piping",
    desc: "P-101 펌프 → E-201 열교환기 → TK-301 팽창 탱크. 라인 1001(4\"), 1002(3\"), 1003(1\" 드레인).",
    look: [
      "배관에 마우스를 올리면 그 토막이, 클릭하면 라인 전체가 세 도면과 3D에서 함께 켜진다.",
      "평면도의 원은 수직관이다. 1001은 펌프에서 올라가고(원 위로 선이 멈춤) 열교환기로 내려간다.",
      "정면도의 EL 표기가 높이의 기준이다. 평면도에는 높이가 없으니 EL 글자로 읽는다.",
    ],
    north: true, autoDims: false,
  }, (G) => {
    const k = Kit(G);
    const { V } = G;
    const eq = (id, name, info) => k.part(id, { name, info, kind: "equipment" });
    // 스키드 베이스
    k.part("SKID", { name: "스키드 베이스", info: "4000×2000, 높이 200의 철골 받침. 윗면 TOS EL+200이 장치 설치 기준면이다.", kind: "structure" });
    k.add(G.box([0, 0, 0], [4000, 2000, 200]), "SKID");

    // P-101 냉각수 펌프(끝흡입형, 축은 X 방향, 축 중심 EL+500)
    eq("P-101", "P-101 냉각수 펌프", "끝흡입 원심 펌프. 흡입은 +X 방향 6\" 노즐, 토출은 위쪽 4\" 노즐(플랜지 면 EL+800).");
    k.add(G.box([100, 820, 200], [1150, 1180, 280]), "P-101");
    k.add(G.box([200, 880, 280], [600, 1120, 360]), "P-101");
    k.add(G.cyl([150, 1000, 500], [650, 1000, 500], 150), "P-101");
    k.add(G.cyl([110, 1000, 500], [150, 1000, 500], 130), "P-101");
    k.add(G.box([650, 930, 430], [760, 1070, 570]), "P-101");
    k.add(G.cyl([760, 1000, 500], [860, 1000, 500], 90), "P-101");
    k.add(G.box([780, 920, 280], [840, 1080, 420]), "P-101");
    k.add(G.cyl([860, 1000, 500], [1000, 1000, 500], 210), "P-101");
    k.add(G.box([880, 900, 280], [980, 1100, 300]), "P-101");
    k.add(G.cyl([930, 1000, 690], [930, 1000, 776], 57.15, { caps: false }), "P-101");
    k.add(G.cyl([930, 1000, 776], [930, 1000, 800], 114.3), "P-101");
    k.add(G.cyl([1000, 1000, 500], [1100, 1000, 500], 84.15), "P-101");
    k.add(G.cyl([1100, 1000, 500], [1126, 1000, 500], 139.7), "P-101");
    k.axes.push({ part: "P-101", pts: [[110, 1000, 500], [1126, 1000, 500]], r: 150, cross: false }, { part: "P-101", pts: [[930, 1000, 690], [930, 1000, 800]], r: 57, ext: false });

    // E-201 열교환기(수평 셸, 축 EL+900)
    eq("E-201", "E-201 열교환기", "수평 셸 앤드 튜브 열교환기. 입구 N1(4\") x=2150, 출구 N2(3\") x=2850, 둘 다 위쪽. 노즐 면 EL+1324.");
    k.add(G.cyl([1910, 1000, 900], [3090, 1000, 900], 250), "E-201");
    k.add(G.cyl([1870, 1000, 900], [1910, 1000, 900], 280), "E-201");
    k.add(G.cyl([3090, 1000, 900], [3130, 1000, 900], 280), "E-201");
    k.add(G.cyl([1790, 1000, 900], [1870, 1000, 900], 250, { r1: 250 }), "E-201");
    k.add(G.cyl([3130, 1000, 900], [3210, 1000, 900], 250), "E-201");
    k.add(G.box([2230, 800, 200], [2270, 1200, 700]), "E-201");
    k.add(G.box([2730, 800, 200], [2770, 1200, 700]), "E-201");
    k.add(G.cyl([2150, 1000, 1100], [2150, 1000, 1300], 57.15, { caps: false }), "E-201");
    k.add(G.cyl([2150, 1000, 1300], [2150, 1000, 1324], 114.3), "E-201");
    k.add(G.cyl([2850, 1000, 1100], [2850, 1000, 1300], 44.45, { caps: false }), "E-201");
    k.add(G.cyl([2850, 1000, 1300], [2850, 1000, 1324], 95.25), "E-201");
    k.axes.push({ part: "E-201", pts: [[1790, 1000, 900], [3210, 1000, 900]], r: 250, cross: false });

    // TK-301 팽창 탱크(수직, 중심 x=3550, y=1400)
    eq("TK-301", "TK-301 팽창 탱크", "수직 원통 탱크 Ø700. 옆 노즐 N3(3\", EL+1600)으로 1002가 들어오고, 바닥 노즐 N4(1\")로 1003 드레인이 나간다.");
    k.add(G.cyl([3550, 1400, 500], [3550, 1400, 1800], 350), "TK-301");
    k.add(G.cyl([3550, 1400, 1800], [3550, 1400, 1940], 350, { r1: 70 }), "TK-301");
    for (const a of [45, 135, 225, 315]) {
      const x = 3550 + 280 * Math.cos((a * Math.PI) / 180), y = 1400 + 280 * Math.sin((a * Math.PI) / 180);
      k.add(G.box([x - 40, y - 40, 200], [x + 40, y + 40, 520]), "TK-301");
    }
    k.add(G.cyl([3230, 1400, 1600], [3100, 1400, 1600], 44.45, { caps: false }), "TK-301");
    k.add(G.cyl([3100, 1400, 1600], [3076, 1400, 1600], 95.25), "TK-301");
    k.add(G.cyl([3550, 1400, 520], [3550, 1400, 440], 16.7, { caps: false }), "TK-301");
    k.add(G.cyl([3550, 1400, 440], [3550, 1400, 426], 54), "TK-301");
    k.axes.push({ part: "TK-301", pts: [[3550, 1400, 500], [3550, 1400, 1940]], r: 350 });

    // 라인
    const r1001 = k.line({
      id: "1001", nps: 4, name: '4"-CW-1001-A1A-CS', start: "flange", end: "flange",
      pts: [[930, 1000, 800], [930, 1000, 1600], [2150, 1000, 1600], [2150, 1000, 1324]],
      comps: [
        { seg: 0, at: 170, type: "check", tag: "V-102", name: '4" 스윙 체크 밸브 V-102', info: "펌프가 멈췄을 때 역류를 막는다. 면간거리 292. 흐름 방향이 정해져 있다.", stem: [0, -1, 0] },
        { seg: 1, at: 250, type: "gate", tag: "V-101", name: '4" 게이트 밸브 V-101', info: "토출 차단 밸브. 면간거리 229. 핸들이 위를 향한다." },
      ],
      fw: [{ seg: 1, at: 1000 }],
    });
    const r1002 = k.line({
      id: "1002", nps: 3, name: '3"-CW-1002-A1A-CS', start: "flange", end: "flange",
      pts: [[2850, 1000, 1324], [2850, 1000, 1600], [2850, 1400, 1600], [3076, 1400, 1600]],
    });
    const r1003 = k.line({
      id: "1003", nps: 1, name: '1"-CW-1003-A1A-CS', start: "flange", end: "blind",
      pts: [[3550, 1400, 426], [3550, 1400, 300], [3550, 700, 300]],
      comps: [{ seg: 1, at: 330, type: "gate", tag: "V-103", name: '1" 게이트 밸브 V-103', info: "드레인 밸브. 평소에는 닫혀 있다(NC).", stem: [0, 0, 1] }],
    });
    for (const [id, route] of [["1001", r1001], ["1002", r1002], ["1003", r1003]]) route.line = id;

    // PI-101 압력계(1001 수평부 x=1830 위쪽 ½" 분기)
    k.part("1001-BR", { wall: NPS[0.5].wt, name: '½" 계기 분기관', info: "압력계를 달기 위한 작은 분기. 계기 연결은 P&ID의 계기 선과 짝을 이룬다.", line: "1001", kind: "pipe" });
    k.pipe("1001-BR", [1830, 1000, 1600 + 57.15], [1830, 1000, 1800], 10.65);
    k.part("PI-101", { name: "PI-101 압력계", info: "현장 지시 압력계(P = 압력, I = 지시). 계기 원 안에 가로선이 없으면 현장 설치 계기다.", kind: "instrument" });
    k.add(G.cyl([1830, 1015, 1850], [1830, 985, 1850], 50), "PI-101");
    k.axes.push({ part: "PI-101", pts: [[1830, 1015, 1850], [1830, 985, 1850]], r: 50, side: false });

    // 서포트(파이프 슈 + 기둥)
    k.part("S-1", { name: "S-1 파이프 슈 서포트", info: "1001 수평부를 받치는 슈와 기둥. 슈 윗면 = 관 밑(BOP) EL+1542.9. 위치와 개수를 평면도와 등각도가 같게 둔다.", kind: "support" });
    k.add(G.box([1550, 925, 1442.85], [1850, 1075, 1542.85]), "S-1");
    k.add(G.box([1625, 950, 200], [1775, 1050, 1442.85]), "S-1");
    k.part("S-2", { name: "S-2 파이프 슈 서포트", info: "1002 북쪽 구간을 받친다. BOP EL+1555.6.", kind: "support" });
    k.add(G.box([2775, 1050, 1455.55], [2925, 1350, 1555.55]), "S-2");
    k.add(G.box([2800, 1150, 200], [2900, 1250, 1455.55]), "S-2");

    // 주석(dx, dy = 화면 단위 오프셋)
    const L = k.label;
    L(["top"], [550, 1200, 0], "P-101", { cls: "eq", dy: -6 });
    L(["top"], [2500, 1260, 0], "E-201", { cls: "eq", dy: -6 });
    L(["top"], [3550, 1760, 0], "TK-301", { cls: "eq", dy: -6 });
    L(["front"], [480, 0, 660], "P-101", { cls: "eq", dy: -8 });
    L(["front"], [2500, 0, 650], "E-201", { cls: "eq", dy: 18 });
    L(["front", "right"], [3550, 1400, 1950], "TK-301", { cls: "eq", dy: -8 });
    L(["top"], [1640, 1000, 1600], '4"-CW-1001', { cls: "ln", dy: -12, part: "1001-P2" });
    L(["top"], [2850, 1300, 1600], '3"-CW-1002', { cls: "ln", dx: -12, dy: -4, anchor: "end", part: "1002-P2" });
    L(["top"], [3550, 820, 300], '1"-CW-1003', { cls: "ln", dx: 12, dy: 4, anchor: "start", part: "1003-P2" });
    L(["front"], [1640, 0, 1600], "CL EL+1600", { cls: "el", dy: -12 });
    L(["front"], [2960, 0, 1600], "CL EL+1600", { cls: "el", dy: -12 });
    L(["front"], [3550, 0, 300], "CL EL+300", { cls: "el", dx: 14, dy: 16, anchor: "start" });
    L(["front"], [1625, 0, 1100], "S-1 BOP EL+1542.9", { cls: "el", dx: -6, anchor: "end" });
    L(["front"], [0, 0, 200], "TOS EL+200", { cls: "el", dx: -6, dy: 4, anchor: "end" });
    L(["front"], [930, 0, 800], "FACE EL+800", { cls: "el", dx: -14, dy: 4, anchor: "end" });
    L(["right"], [0, 1000, 1600], "1001 CL EL+1600", { cls: "el", dx: -14, dy: 4, anchor: "end" });
    L(["right"], [0, 1000, 300], "1003 CL EL+300", { cls: "el", dy: 16 });
    k.dims.push(
      { view: "top", a: [0, 2000, 0], b: [4000, 2000, 0], dir: "h", off: 30 },
      { view: "top", a: [0, 0, 0], b: [0, 2000, 0], dir: "v", off: -30 },
      { view: "top", a: [930, 2000, 0], b: [2150, 2000, 0], dir: "h", off: 12 },
      { view: "top", a: [2150, 2000, 0], b: [2850, 2000, 0], dir: "h", off: 12 },
      { view: "front", a: [0, 0, 0], b: [0, 0, 1600], dir: "v", off: -30 },
    );
    k.north = true;
    return k;
  });
})();
