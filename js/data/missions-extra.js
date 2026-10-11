// CAD 연습장 추가 미션: 반복 드릴(숫자가 매번 바뀜)과 3D 따라그리기(3면도).
// 드릴은 make(r)가 숫자를 정해 goal·steps·setup을 돌려준다. r = ACAD.rng(seed) (util.js).
// solve(S, m)는 모범 답안을 그린다. 화면에서는 쓰지 않고 _tests/run.js가 판정 함수를 검증할 때 쓴다.
window.ACAD = window.ACAD || {};
(function () {
  const G = ACAD.G;
  const P = (x, y) => ({ x, y });
  const pol = (d, a) => ({ x: d * Math.cos((a * Math.PI) / 180), y: d * Math.sin((a * Math.PI) / 180) });
  const f = (n) => String(Math.round(n * 100) / 100);

  ACAD.missionInstance = (m, seed) => (m && m.make ? Object.assign({}, m, m.make(ACAD.rng(seed)), { seed }) : m);

  // ======================================================================
  // 반복 드릴
  // ======================================================================
  const drills = [
    {
      id: "d0-abs", stage: "0", after: "m0-04", title: "반복 드릴: 절대좌표 사각형",
      hints: ["이 연습장은 x,y를 절대좌표로 받습니다. 실제 AutoCAD에서 동적 입력(F12)이 켜져 있으면 # 을 붙여 #x,y 로 입력하세요.", "숫자와 쉼표만 칩니다. 공백을 넣지 마세요."],
      make(r) {
        const p = [P(r.step(0, 40, 10), r.step(0, 30, 10)), P(r.step(130, 200, 10), r.step(0, 40, 10)), P(r.step(140, 200, 10), r.step(90, 130, 10)), P(r.step(0, 60, 10), r.step(80, 130, 10))];
        const s = (q) => `${q.x},${q.y}`;
        return {
          p,
          goal: `네 꼭짓점 ${p.map(s).join(" ")} 를 절대좌표로 입력해 사각형을 닫습니다.`,
          view: [-30, -30, 230, 160],
          steps: [
            { text: `L → ${s(p[0])} → ${s(p[1])}`, check: (c, K) => K.hasSeg(c, p[0], p[1]) },
            { text: `→ ${s(p[2])}`, check: (c, K) => K.hasSeg(c, p[1], p[2]) },
            { text: `→ ${s(p[3])}`, check: (c, K) => K.hasSeg(c, p[2], p[3]) },
            { text: "C(닫기)로 마지막 변을 그리고 끝내기", check: (c, K) => K.hasSeg(c, p[3], p[0]) },
          ],
        };
      },
      solve(S, m) { S.pline(m.p.map((q) => [q.x, q.y]), true); },
    },
    {
      id: "d0-rel", stage: "0", after: "m0-06", title: "반복 드릴: 상대좌표 계단",
      hints: ["@가로,세로 는 '직전 점에서 얼마나'입니다. 왼쪽·아래로 갈 때는 음수.", "시작점은 아무 곳이나 클릭해도 됩니다. 모양과 크기만 맞으면 통과."],
      make(r) {
        const W = r.step(140, 240, 10), h1 = r.step(30, 70, 10), a1 = r.step(40, W - 40, 10), h2 = r.step(30, 70, 10);
        const v = [P(W, 0), P(0, h1), P(-a1, 0), P(0, h2), P(-(W - a1), 0)];
        const pts = [P(0, 0)];
        v.forEach((d) => pts.push(G.add(pts[pts.length - 1], d)));
        pts.pop();
        const s = (d) => `@${d.x},${d.y}`;
        return {
          v, pts,
          goal: `시작점 아무 곳 → ${v.map(s).join(" → ")} → C 로 계단 모양을 닫습니다.`,
          view: [-40, -40, 280, 190],
          steps: [
            { text: `L → 아무 점 → ${s(v[0])} → ${s(v[1])} → ${s(v[2])}`, check: (c, K) => K.chain(c, v.slice(0, 3)) },
            { text: `→ ${s(v[3])} → ${s(v[4])} → C`, check: (c, K) => !!K.hasPoly(c, pts) },
          ],
        };
      },
      solve(S, m) { S.pline(m.pts.map((q) => [q.x + 17, q.y + 9]), true); },
    },
    {
      id: "d0-polar", stage: "0", after: "m0-07", title: "반복 드릴: 상대극좌표 삼각형",
      hints: ["@길이<각도. 각도는 동쪽(오른쪽)이 0°, 시계 반대 방향이 +.", "세 번째 변은 C(닫기)로 그리면 길이를 계산할 필요가 없습니다."],
      make(r) {
        const L1 = r.step(80, 160, 10), a1 = r.pick([0, 15, 30, 45]), L2 = r.step(60, 120, 10), a2 = a1 + r.pick([60, 75, 90, 105, 120, 135]);
        const v1 = pol(L1, a1), v2 = pol(L2, a2);
        return {
          v1, v2,
          goal: `시작점 아무 곳 → @${L1}<${a1} → @${L2}<${a2} → C 로 삼각형을 닫습니다.`,
          view: [-80, -40, 220, 200],
          steps: [
            { text: `L → 아무 점 → @${L1}<${a1}`, check: (c, K) => K.chain(c, [v1]) },
            { text: `→ @${L2}<${a2}`, check: (c, K) => K.chain(c, [v1, v2]) },
            { text: "→ C(닫기)", check: (c, K) => !!K.hasPoly(c, [P(0, 0), v1, G.add(v1, v2)]) },
          ],
        };
      },
      solve(S, m) { const o = P(5, 5), a = G.add(o, m.v1), b = G.add(a, m.v2); S.pline([[o.x, o.y], [a.x, a.y], [b.x, b.y]], true); },
    },
    {
      id: "d0-circle", stage: "0", after: "m0-13", title: "반복 드릴: 원 네 가지",
      hints: ["C 다음 2P: 지름 양 끝점, 3P: 원 위의 세 점, T(TTR): 접할 두 객체 + 반지름.", "TTR은 접할 선을 고를 때 접점이 생길 쪽 가까이를 클릭하세요."],
      make(r) {
        const c1 = P(r.step(40, 80, 10), r.step(40, 80, 10)), r1 = r.step(20, 40, 5);
        const a2 = P(r.step(170, 190, 10), r.step(40, 80, 10)), d2 = r.step(50, 90, 10), b2 = P(a2.x + d2, a2.y);
        const c3 = P(r.step(380, 420, 10), r.step(50, 70, 10)), r3 = r.step(30, 50, 10);
        const q3 = [P(c3.x + r3, c3.y), P(c3.x, c3.y + r3), P(c3.x - r3, c3.y)];
        const r4 = r.step(20, 45, 5), K4 = P(500, 0);
        const s = (q) => `${q.x},${q.y}`;
        return {
          c1, r1, a2, b2, c3, r3, r4, K4,
          goal: "중심·반지름, 2P, 3P, TTR 네 가지 방법으로 원을 하나씩 그립니다. 오른쪽 ㄴ자 모서리 선은 미리 그려 둔 것입니다.",
          view: [-10, -40, 680, 200],
          setup(S) { S.line(K4.x, K4.y, K4.x + 160, K4.y); S.line(K4.x, K4.y, K4.x, K4.y + 140); },
          steps: [
            { text: `C → ${s(c1)} → 반지름 ${r1}`, check: (c, K) => !!K.findCircle(c, c1, r1) },
            { text: `C → 2P → ${s(a2)} → ${s(b2)} (지름 양 끝)`, check: (c, K) => !!K.findCircle(c, P((a2.x + b2.x) / 2, a2.y), d2 / 2) },
            { text: `C → 3P → ${q3.map(s).join(" → ")}`, check: (c, K) => !!K.findCircle(c, c3, r3) },
            { text: `C → T → ㄴ자의 가로선 → 세로선 → 반지름 ${r4}`, check: (c, K) => !!K.findCircle(c, P(K4.x + r4, K4.y + r4), r4) },
          ],
        };
      },
      solve(S, m) { S.circle(m.c1.x, m.c1.y, m.r1); S.circle((m.a2.x + m.b2.x) / 2, m.a2.y, (m.b2.x - m.a2.x) / 2); S.circle(m.c3.x, m.c3.y, m.r3); S.circle(m.K4.x + m.r4, m.K4.y + m.r4, m.r4); },
    },
    {
      id: "d1-offset", stage: "1", after: "m1-17", title: "반복 드릴: 간격띄우기 안팎",
      hints: ["O → 거리 → 객체 클릭 → 띄울 쪽 클릭. 같은 거리로 계속 띄울 수 있습니다.", "닫힌 폴리선은 한 번에 통째로 띄워집니다."],
      make(r) {
        const W = r.step(140, 220, 10), H = r.step(80, 140, 10), t = r.step(5, 25, 5), u = r.step(10, 30, 5);
        return {
          W, H, t, u,
          goal: `미리 그린 ${W} × ${H} 판의 안쪽으로 ${t}, 바깥쪽으로 ${u} 간격띄우기 합니다.`,
          view: [-50, -50, W + 50, H + 50],
          setup(S) { S.rect(0, 0, W, H); },
          steps: [
            { text: `O → ${t} → 판 클릭 → 안쪽 클릭`, check: (c, K) => K.rects(c, W - 2 * t, H - 2 * t).some((q) => K.near(q.bb.x0, t) && K.near(q.bb.y0, t)) },
            { text: `O → ${u} → 판 클릭 → 바깥쪽 클릭`, check: (c, K) => K.rects(c, W + 2 * u, H + 2 * u).some((q) => K.near(q.bb.x0, -u) && K.near(q.bb.y0, -u)) },
          ],
        };
      },
      solve(S, m) { S.rect(m.t, m.t, m.W - 2 * m.t, m.H - 2 * m.t); S.rect(-m.u, -m.u, m.W + 2 * m.u, m.H + 2 * m.u); },
    },
    {
      id: "d1-fillet", stage: "1", after: "m1-24", title: "반복 드릴: 모깎기 R과 R0",
      hints: ["F → R → 반지름 → P(폴리선)이면 네 모서리를 한 번에 둥글게 합니다.", "반지름 0으로 모깎기하면 떨어진 두 선이 모서리에서 정확히 만납니다(연장·자르기 동시)."],
      make(r) {
        const W = r.step(120, 180, 10), H = r.step(70, 110, 10), R = r.step(8, 20, 2);
        const X = W + 60, gx = r.step(10, 30, 5), gy = r.step(10, 30, 5), L = r.step(70, 110, 10);
        return {
          W, H, R, X, gx, gy, L,
          goal: `왼쪽 ${W} × ${H} 판의 네 모서리를 R${R}로 둥글게 하고, 오른쪽 떨어진 두 선은 R0으로 모서리를 맞춥니다.`,
          view: [-30, -40, X + L + 60, Math.max(H, L) + 30],
          setup(S) { S.rect(0, 0, W, H); S.line(X, 0, X + L - gx, 0); S.line(X + L, gy, X + L, L); },
          steps: [
            { text: `F → R → ${R} → P → 판 클릭(네 모서리)`, check: (c, K) => K.arcs(c).filter((a) => K.near(a.r, R) && a.c.x > 0 && a.c.x < W).length >= 4 },
            { text: "F → R → 0 → 아래 가로선 → 오른쪽 세로선", check: (c, K) => K.covers(c, P(X, 0), P(X + L, 0)) && K.covers(c, P(X + L, 0), P(X + L, L)) },
          ],
        };
      },
      solve(S, m) {
        const pl = ACAD.CadCommandHelpers.rectPl(P(0, 0), P(m.W, m.H), { fillet: m.R });
        S.pline(pl.pts.map((q) => [q.x, q.y, q.b]), true);
        S.line(m.X, 0, m.X + m.L, 0); S.line(m.X + m.L, 0, m.X + m.L, m.L);
      },
    },
    {
      id: "d1-array", stage: "1", after: "m1-32", title: "반복 드릴: 원형·직사각형 배열",
      hints: ["ARRAYPOLAR(원형 배열): 객체 → 중심점 → 항목 수 → 채울 각도 360.", "ARRAYRECT(직사각형 배열): 객체 → 열 수·행 수 → 열 간격·행 간격. 간격은 중심 사이 거리입니다."],
      make(r) {
        const R = r.step(60, 90, 10), pc = r.step(40, R - 15, 5), hr = r.pick([4, 5, 6]), N = r.pick([4, 5, 6, 8]);
        const sx = R + 70, cols = r.int(3, 5), rows = r.int(2, 3), dx = r.step(20, 40, 5), dy = r.step(20, 40, 5), sr = 5;
        const sy = -R + 10;
        return {
          R, pc, hr, N, sx, sy, cols, rows, dx, dy, sr,
          goal: `왼쪽 원판(R${R})의 피치원 R${pc} 위에 R${hr} 구멍 ${N}개를 고르게, 오른쪽 R${sr} 원은 ${cols}열 × ${rows}행(간격 ${dx} × ${dy})으로 배열합니다.`,
          view: [-R - 20, -R - 20, sx + cols * dx + 30, R + 20],
          setup(S) {
            S.circle(0, 0, R);
            S.line(-R - 10, 0, R + 10, 0, { layer: "중심선" }); S.line(0, -R - 10, 0, R + 10, { layer: "중심선" });
            S.circle(0, pc, hr);
            S.circle(sx, sy, sr);
          },
          steps: [
            {
              text: `ARRAYPOLAR → 위쪽 구멍 → 중심 0,0 → 항목 ${N} → 360°`,
              check: (c, K) => {
                const holes = K.circles(c).filter((e) => K.near(e.r, hr) && K.near(G.dist(e.c, P(0, 0)), pc));
                return holes.some((h) => { const a0 = G.ang(P(0, 0), h.c); return Array.from({ length: N }, (_, k) => G.polar(P(0, 0), a0 + (k * 2 * Math.PI) / N, pc)).every((q) => holes.some((e) => K.nearPt(e.c, q))); });
              },
            },
            {
              text: `ARRAYRECT → 오른쪽 작은 원 → 열 ${cols} · 행 ${rows} → 간격 ${dx}, ${dy}`,
              check: (c, K) => { for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) if (!K.findCircle(c, P(sx + i * dx, sy + j * dy), sr)) return false; return true; },
            },
          ],
        };
      },
      solve(S, m) {
        for (let k = 1; k < m.N; k++) { const q = G.polar(P(0, 0), Math.PI / 2 + (k * 2 * Math.PI) / m.N, m.pc); S.circle(q.x, q.y, m.hr); }
        for (let i = 0; i < m.cols; i++) for (let j = 0; j < m.rows; j++) if (i || j) S.circle(m.sx + i * m.dx, m.sy + j * m.dy, m.sr);
      },
    },
    // ---------- 보충 드릴 ----------
    {
      id: "d0-ortho", stage: "0", after: "m0-08", title: "반복 드릴: 직교 거리 입력 ㄷ형 채널",
      hints: ["F8(직교)을 켜면 커서가 가로·세로로만 움직입니다. 커서로 방향을 가리키고 숫자만 치세요.", "안쪽 깊이는 높이에서 두께를 뺀 값입니다. 머릿속으로 미리 계산해 두면 손이 멈추지 않습니다."],
      make(r) {
        const W = r.step(100, 180, 10), H = r.step(60, 100, 10), t = r.step(10, 20, 5);
        const pts = [P(0, 0), P(W, 0), P(W, H), P(W - t, H), P(W - t, t), P(t, t), P(t, H), P(0, H)];
        const arrow = [`→ ${W}`, `↑ ${H}`, `← ${t}`, `↓ ${H - t}`, `← ${W - 2 * t}`, `↑ ${H - t}`, `← ${t}`];
        return {
          W, H, t, pts,
          goal: `F8(직교)을 켜고 방향은 커서로, 길이는 숫자로만 입력해 가로 ${W}, 높이 ${H}, 두께 ${t}인 ㄷ형 채널을 닫습니다. 좌표(@)는 쓰지 않습니다.`,
          view: [-30, -30, W + 30, H + 30],
          steps: [
            { text: `L → 아무 점 → ${arrow.slice(0, 3).join(" → ")}`, check: (c, K) => K.chain(c, [P(W, 0), P(0, H), P(-t, 0)]) },
            { text: `→ ${arrow.slice(3).join(" → ")} → C`, check: (c, K) => !!K.hasPoly(c, pts) },
          ],
        };
      },
      solve(S, m) { S.pline(m.pts.map((q) => [q.x + 11, q.y + 7]), true); },
    },
    {
      id: "d0-osnap", stage: "0", after: "m0-12", title: "반복 드릴: 객체스냅 골라 잡기",
      hints: ["점을 물을 때 END·MID·CEN·QUA·PER를 직접 쳐서 그 스냅만 한 번 쓸 수 있습니다(스냅 재지정).", "FROM은 점을 물을 때 입력합니다: FROM → 기준점 클릭 → @x,y."],
      make(r) {
        const W = r.step(100, 160, 10), H = r.step(60, 100, 10), R = r.step(15, 30, 5);
        const cx = W + R + r.step(40, 70, 10), cy = r.step(R, H - 10, 5);
        const fx = r.step(15, 30, 5), fy = r.step(15, 30, 5);
        return {
          W, H, R, cx, cy, fx, fy,
          goal: `미리 그린 ${W} × ${H} 사각형과 R${R} 원 사이에 선 세 개와 작은 원 하나를 객체스냅으로 정확히 잡아 그립니다.`,
          view: [-30, -30, cx + R + 30, H + 30],
          setup(S) { S.rect(0, 0, W, H); S.circle(cx, cy, R); },
          steps: [
            { text: "L → 사각형 왼쪽 위 끝점(END) → 원 중심(CEN)", check: (c, K) => K.hasSeg(c, P(0, H), P(cx, cy)) },
            { text: "L → 사각형 아래 변 중간점(MID) → 원 아래 사분점(QUA)", check: (c, K) => K.hasSeg(c, P(W / 2, 0), P(cx, cy - R)) },
            { text: "L → 원 중심(CEN) → 사각형 오른쪽 변에 직교(PER)", check: (c, K) => K.hasSeg(c, P(cx, cy), P(W, cy)) },
            { text: `C → FROM → 사각형 오른쪽 아래 끝점 → @-${fx},${fy} → 반지름 5`, check: (c, K) => !!K.findCircle(c, P(W - fx, fy), 5) },
          ],
        };
      },
      solve(S, m) { S.line(0, m.H, m.cx, m.cy); S.line(m.W / 2, 0, m.cx, m.cy - m.R); S.line(m.cx, m.cy, m.W, m.cy); S.circle(m.W - m.fx, m.fy, 5); },
    },
    {
      id: "d1-trim", stage: "1", after: "m1-18", title: "반복 드릴: 자르기로 우물 정(井) 정리",
      hints: ["TR → Enter로 바로 자를 부분을 클릭합니다(빠른 작업 모드: 모든 객체가 절단 모서리).", "튀어나온 끝 가까이를 클릭하세요. 교차점 안쪽을 클릭하면 사각형 변이 잘립니다. 잘못 잘랐으면 U."],
      make(r) {
        const W = r.step(100, 160, 10), H = r.step(60, 100, 10), o = r.step(15, 30, 5);
        const inside = (K, s, lo, hi, k) => Math.min(s.a[k], s.b[k]) >= lo - K.TOL && Math.max(s.a[k], s.b[k]) <= hi + K.TOL;
        return {
          W, H, o,
          goal: `우물 정(井) 자로 겹친 선 네 개에서 튀어나온 끝 여덟 개를 자르기(TR)로 정리해 ${W} × ${H} 사각형만 남깁니다.`,
          view: [-o - 30, -o - 30, W + o + 30, H + o + 30],
          setup(S) { S.line(-o, 0, W + o, 0); S.line(-o, H, W + o, H); S.line(0, -o, 0, H + o); S.line(W, -o, W, H + o); },
          steps: [
            {
              text: "TR → 가로선 두 개의 양쪽 끝 4곳 클릭",
              check: (c, K) => [0, H].every((y) => K.covers(c, P(0, y), P(W, y)) && K.lineSegs(c).filter((s) => K.near(s.a.y, y) && K.near(s.b.y, y)).every((s) => inside(K, s, 0, W, "x"))),
            },
            {
              text: "세로선 두 개의 위아래 끝 4곳 클릭",
              check: (c, K) => [0, W].every((x) => K.covers(c, P(x, 0), P(x, H)) && K.lineSegs(c).filter((s) => K.near(s.a.x, x) && K.near(s.b.x, x)).every((s) => inside(K, s, 0, H, "y"))),
            },
          ],
        };
      },
      solve(S, m) { S.erase(() => true); S.lrect(0, 0, m.W, m.H); },
    },
    {
      id: "d1-mirror", stage: "1", after: "m1-21", title: "반복 드릴: 대칭 복사로 반쪽 완성",
      hints: ["대칭선의 두 점은 중심선 위아래 끝점을 객체스냅(END)으로 잡습니다.", "마지막 질문 '원본 객체를 지우시겠습니까?'에는 Enter(아니오).", "JOIN은 끝점이 정확히 맞닿아야 이어집니다. 대칭선을 끝점 스냅으로 잡았다면 저절로 맞닿습니다."],
      make(r) {
        const H = r.step(60, 100, 10), w1 = r.step(30, 60, 5), h1 = r.step(15, 30, 5), w2 = r.step(15, w1 - 10, 5);
        const half = [P(0, H), P(-w1, H), P(-w1, H - h1), P(-w2, H - h1), P(-w2, 0), P(0, 0)];
        const mir = half.map((q) => P(-q.x, q.y));
        const full = [...half.slice(1, 5), ...mir.slice(1, 5).reverse()];
        return {
          H, w1, h1, w2, half, mir, full,
          goal: `중심선 왼쪽에 그려 둔 반쪽 윤곽(최대 폭 ${w1}, 높이 ${H})을 대칭(MI)으로 복사해 좌우 대칭 윤곽 하나를 완성합니다.`,
          view: [-w1 - 30, -30, w1 + 30, H + 30],
          setup(S) { S.pline(half.map((q) => [q.x, q.y])); S.line(0, -10, 0, H + 10, { layer: "중심선" }); },
          steps: [
            { text: "MI → 반쪽 윤곽 선택 → 중심선의 두 끝점 → Enter(원본 유지)", check: (c, K) => mir.slice(1).every((q, i) => K.covers(c, mir[i], q)) },
            { text: "J → 원본과 사본 선택 → 닫힌 폴리선 하나로 결합", check: (c, K) => !!K.hasPoly(c, full, { translate: false }) },
          ],
        };
      },
      solve(S, m) { S.erase((e) => e.type === "pline"); S.pline(m.full.map((q) => [q.x, q.y]), true); },
    },
    {
      id: "d1-rotate", stage: "1", after: "m1-26", title: "반복 드릴: 회전 각도와 참조",
      hints: ["ROTATE의 각도는 시계 반대 방향이 +입니다. 시계 방향으로 돌리려면 음수.", "참조(R): 지금 각도를 먼저 입력하고 새 각도를 입력합니다. 기운 각도를 몰라도 객체스냅으로 두 점을 찍어 잴 수 있습니다."],
      make(r) {
        const W = r.step(60, 100, 10), H = r.step(20, 40, 5), th = r.pick([15, 30, 45, 60, -30, -45, 120]);
        const X = W + 90, L = r.step(60, 100, 10), al = r.pick([17, 23, 37, 52, 68]);
        const rect = [P(0, 0), P(W, 0), P(W, H), P(0, H)].map((q) => G.polar(P(0, 0), G.ang(P(0, 0), q) + (th * Math.PI) / 180, G.dist(P(0, 0), q)));
        const tip = G.add(P(X, 0), pol(L, al));
        return {
          W, H, th, X, L, al, rect, tip,
          goal: `왼쪽 ${W} × ${H} 판을 왼쪽 아래 모서리 기준으로 ${th}° 돌리고, 오른쪽에 ${al}° 기운 선은 참조(R)로 수평이 되게 돌립니다.`,
          view: [-W - 20, -W - 20, X + L + 30, W + 30],
          setup(S) { S.rect(0, 0, W, H); S.line(X, 0, tip.x, tip.y); },
          steps: [
            { text: `RO → 판 선택 → 기준점: 왼쪽 아래 모서리 → ${th}`, check: (c, K) => !!K.hasPoly(c, rect, { translate: false }) },
            { text: `RO → 기운 선 선택 → 기준점: 왼쪽 끝점 → R → ${al} → 0`, check: (c, K) => K.hasSeg(c, P(X, 0), P(X + L, 0)) },
          ],
        };
      },
      solve(S, m) { S.pline(m.rect.map((q) => [q.x, q.y]), true); S.line(m.X, 0, m.X + m.L, 0); },
    },
  ];
  ACAD.DRILL_GOAL = 5;

  // ======================================================================
  // 3D 따라그리기: 3면도(제3각법). 오른쪽 위 3D는 3면도·3D 뷰어의 같은 모델이다.
  // 각 투상도는 왼쪽 아래 모서리를 (0,0)으로 둔 좌표로 적는다.
  //   정면도 (x, z) · 평면도 (x, y: 뒤가 위) · 우측면도 (y: 뒤가 오른쪽, z)
  // ======================================================================
  const loop = (pts) => pts.map((p, i) => [p[0], p[1], pts[(i + 1) % pts.length][0], pts[(i + 1) % pts.length][1]]);
  const rectL = (w, h) => loop([[0, 0], [w, 0], [w, h], [0, h]]);
  const VIEW_KO = { front: "정면도", top: "평면도", right: "우측면도" };

  // 외형선 끝점마다 그 점을 원점으로 두고 spec의 외형선이 모두 덮이는지 본다(더 길게 그린 선도 인정).
  function findView(c, K, spec) {
    const segs = K.lineSegs(c, "외형선");
    const tried = [];
    for (const s of segs) for (const o of [s.a, s.b]) {
      if (tried.some((q) => K.nearPt(q, o))) continue;
      tried.push(o);
      const at = (x, y) => P(o.x + x, o.y + y);
      if (spec.vis.every(([x1, y1, x2, y2]) => K.covers(c, at(x1, y1), at(x2, y2), { layer: "외형선" })) &&
        (spec.circ || []).every(([x, y, rr]) => !!K.findCircle(c, at(x, y), rr, { layer: "외형선" }))) return o;
    }
    return null;
  }
  function hiddenOk(c, K, o, spec) {
    return !!o && (spec.hid || []).every(([x1, y1, x2, y2]) => K.covers(c, P(o.x + x1, o.y + y1), P(o.x + x2, o.y + y2), { layer: "숨은선" }));
  }
  function view3d(def) {
    const { id, stage, after, model, title, size, views, desc, hints } = def;
    const [W, D, H] = size; // 가로(x) · 깊이(y) · 높이(z)
    const hasHid = ["front", "top", "right"].filter((k) => (views[k].hid || []).length);
    const steps = ["front", "top", "right"].map((k) => ({
      text: `${VIEW_KO[k]}${k === "front" ? `(가로 ${W}, 높이 ${H})` : k === "top" ? `(가로 ${W}, 깊이 ${D})` : `(깊이 ${D}, 높이 ${H})`}: 외형선 층에 보이는 선 모두${(views[k].circ || []).length ? " + 원" : ""}`,
      check: (c, K) => !!findView(c, K, views[k]),
    }));
    if (hasHid.length) {
      steps.push({
        text: `숨은선 층에 ${hasHid.map((k) => VIEW_KO[k]).join("·")}의 숨은선(파선)`,
        check: (c, K) => hasHid.every((k) => hiddenOk(c, K, findView(c, K, views[k]), views[k])),
      });
    }
    steps.push({
      text: "제3각법 배치: 평면도는 정면도 바로 위(가로 위치 같게), 우측면도는 정면도 바로 오른쪽(높이 같게)",
      check: (c, K) => {
        const F = findView(c, K, views.front), T = findView(c, K, views.top), R = findView(c, K, views.right);
        return !!(F && T && R) && K.near(F.x, T.x) && T.y >= F.y + H - K.TOL && K.near(F.y, R.y) && R.x >= F.x + W - K.TOL;
      },
    });
    return {
      id, stage, after, title, reference: { model }, layer: "외형선", ltscale: 0.3, spec: { size, views },
      goal: `오른쪽 위 3D 모델(${desc})을 보고 정면도·평면도·우측면도를 그립니다. 빨간 화살표 방향에서 본 모양이 정면도입니다.`,
      view: [-30, -30, W + D + 60, H + D + 60],
      steps,
      hints: ["투상도 사이는 20~30 정도 띄우세요. 평면도는 정면도와 가로 위치를, 우측면도는 정면도와 높이를 맞춥니다.", "3D를 끌어서 돌려 보고, 3면도·3D 뷰어에서 같은 모델을 열어 답을 확인할 수 있습니다.", ...(hints || [])],
      solve(S) {
        const gap = 30;
        const at = { front: [0, 0], top: [0, H + gap], right: [W + gap, 0] };
        for (const k of ["front", "top", "right"]) {
          const [ox, oy] = at[k], v = views[k];
          v.vis.forEach(([x1, y1, x2, y2]) => S.line(ox + x1, oy + y1, ox + x2, oy + y2, { layer: "외형선" }));
          (v.hid || []).forEach(([x1, y1, x2, y2]) => S.line(ox + x1, oy + y1, ox + x2, oy + y2, { layer: "숨은선" }));
          (v.circ || []).forEach(([x, y, rr]) => S.circle(ox + x, oy + y, rr, { layer: "외형선" }));
        }
      },
    };
  }
  const views3d = [
    view3d({
      id: "m0-v1", stage: "0", after: "m0-16", model: "block-basic", title: "3D 따라그리기 1: 직육면체", size: [80, 50, 40], desc: "직육면체 80 × 50 × 40",
      views: { front: { vis: rectL(80, 40) }, top: { vis: rectL(80, 50) }, right: { vis: rectL(50, 40) } },
      hints: ["직육면체는 세 투상도가 모두 사각형입니다. 크기만 다릅니다: 정면 = 가로×높이, 평면 = 가로×깊이, 우측면 = 깊이×높이."],
    }),
    view3d({
      id: "m0-v2", stage: "0", after: "m0-v1", model: "block-step", title: "3D 따라그리기 2: 계단 블록", size: [100, 60, 50], desc: "계단 블록 100 × 60 × 50, 낮은 단 높이 25",
      views: {
        front: { vis: loop([[0, 0], [100, 0], [100, 25], [50, 25], [50, 50], [0, 50]]) },
        top: { vis: [...rectL(100, 60), [50, 0, 50, 60]] },
        right: { vis: [...rectL(60, 50), [0, 25, 60, 25]] },
      },
      hints: ["평면도 가운데 세로선(x = 50)은 단 벽면입니다. 수직인 면은 위에서 보면 선 하나가 됩니다.", "우측면도의 가로선(높이 25)은 낮은 단의 모서리입니다. 앞에 있어 실선입니다."],
    }),
    view3d({
      id: "m1-v2", stage: "1", after: "m1-v1", model: "block-slot", title: "3D 따라그리기 5: 홈 블록(숨은선)", size: [90, 60, 40], desc: "홈 블록 90 × 60 × 40, 홈 폭 30 · 깊이 20",
      views: {
        front: { vis: loop([[0, 0], [90, 0], [90, 40], [60, 40], [60, 20], [30, 20], [30, 40], [0, 40]]) },
        top: { vis: [...rectL(90, 60), [30, 0, 30, 60], [60, 0, 60, 60]] },
        right: { vis: rectL(60, 40), hid: [[0, 20, 60, 20]] },
      },
      hints: ["우측면도에서 홈 바닥(높이 20)은 오른쪽 벽에 가려 숨은선입니다. LA로 '숨은선'을 현재 층으로 바꾸고 그리세요."],
    }),
    view3d({
      id: "m1-v3", stage: "1", after: "m1-v2", model: "block-hole", title: "3D 따라그리기 6: 구멍 뚫린 판", size: [100, 60, 20], desc: "판 100 × 60 × 20, 가운데 Ø24 관통 구멍",
      views: {
        front: { vis: rectL(100, 20), hid: [[38, 0, 38, 20], [62, 0, 62, 20]] },
        top: { vis: rectL(100, 60), circ: [[50, 30, 12]] },
        right: { vis: rectL(60, 20), hid: [[18, 0, 18, 20], [42, 0, 42, 20]] },
      },
      hints: ["구멍은 평면도에서만 원으로 보입니다. 정면도·우측면도에서는 구멍 벽 두 줄이 숨은선입니다(중심 ± 반지름 12).", "실제 도면에서는 구멍마다 중심선(십자)도 넣습니다. 이 미션은 판정하지 않지만 '중심선' 층에 그려 보세요."],
    }),
    view3d({
      id: "m1-v4", stage: "1", after: "m1-v3", model: "wedge-block", title: "3D 따라그리기 7: 경사면 블록", size: [80, 50, 50], desc: "경사면 블록 80 × 50 × 50, 경사면은 높이 20 → 50",
      views: {
        front: { vis: loop([[0, 0], [80, 0], [80, 20], [40, 50], [0, 50]]) },
        top: { vis: [...rectL(80, 50), [40, 0, 40, 50]] },
        right: { vis: [...rectL(50, 50), [0, 20, 50, 20]] },
      },
      hints: ["경사면은 정면도에서만 비스듬한 선입니다. 평면도·우측면도에서는 사각형(띠)으로 보입니다.", "비스듬한 선은 끝점 좌표로 그리세요: 정면도 원점에서 @40,30 방향."],
    }),
    // ---------- 보충: 입문 ----------
    view3d({
      id: "m0-v3", stage: "0", after: "m0-v2", model: "block-notch", title: "3D 따라그리기 3: 모서리 따낸 블록", size: [80, 50, 40], desc: "블록 80 × 50 × 40, 앞쪽 오른쪽 위를 30 × 25 × 20 따냄",
      views: {
        front: { vis: [...rectL(80, 40), [50, 20, 80, 20], [50, 20, 50, 40]] },
        top: { vis: [...rectL(80, 50), [50, 0, 50, 25], [50, 25, 80, 25]] },
        right: { vis: [...rectL(50, 40), [0, 20, 25, 20], [25, 20, 25, 40]] },
      },
      hints: ["상자법: 세 투상도 모두 바깥 사각형을 먼저 그리고, 따낸 자리를 ㄱ자 선으로 더합니다. 따낸 자리 뒤에도 재료가 있어 바깥 윤곽은 그대로 사각형입니다.", "우측면도의 왼쪽이 앞입니다. 따낸 자리가 앞쪽이니 우측면도에서는 왼쪽 위에 ㄱ자가 생깁니다."],
    }),
    view3d({
      id: "m0-v4", stage: "0", after: "m0-v3", model: "block-tee", title: "3D 따라그리기 4: T자 블록", size: [90, 50, 50], desc: "T자 블록 90 × 50 × 50, 바닥판 높이 20, 기둥 폭 30",
      views: {
        front: { vis: loop([[0, 0], [90, 0], [90, 20], [60, 20], [60, 50], [30, 50], [30, 20], [0, 20]]) },
        top: { vis: [...rectL(90, 50), [30, 0, 30, 50], [60, 0, 60, 50]] },
        right: { vis: [...rectL(50, 50), [0, 20, 50, 20]] },
      },
      hints: ["정면도는 대칭입니다. 오른쪽 절반을 그리고 MIRROR로 복사하면 빠릅니다(신입 단계 강의 21).", "평면도의 세로선 두 줄은 정면도 기둥의 양옆 선을 위로 그대로 올린 것입니다."],
    }),
    // ---------- 보충: 신입 ----------
    view3d({
      id: "m1-v5", stage: "1", after: "m1-v4", model: "plate-boss", title: "3D 따라그리기 8: 보스 달린 판", size: [90, 60, 40], desc: "판 90 × 60 × 15 위에 Ø30 × 25 원기둥",
      views: {
        front: { vis: [...rectL(90, 15), [30, 15, 30, 40], [30, 40, 60, 40], [60, 40, 60, 15]] },
        top: { vis: rectL(90, 60), circ: [[45, 30, 15]] },
        right: { vis: [...rectL(60, 15), [15, 15, 15, 40], [15, 40, 45, 40], [45, 40, 45, 15]] },
      },
      hints: ["원기둥은 축 방향(평면도)에서만 원입니다. 정면도·우측면도에서는 폭 30(지름)의 사각형입니다.", "평면도의 원 중심은 M2P(사각형 대각 두 끝점의 중간)로 잡으면 계산이 필요 없습니다.", "실제 도면에서는 원기둥에도 중심선을 넣습니다. 이 미션은 판정하지 않지만 '중심선' 층에 그려 보세요."],
    }),
    view3d({
      id: "m1-v6", stage: "1", after: "m1-v5", model: "step-hole", title: "3D 따라그리기 9: 구멍 뚫린 계단 블록", size: [100, 60, 50], desc: "계단 블록 100 × 60 × 50, 낮은 단에 Ø20 관통 구멍",
      views: {
        front: { vis: loop([[0, 0], [100, 0], [100, 25], [50, 25], [50, 50], [0, 50]]), hid: [[65, 0, 65, 25], [85, 0, 85, 25]] },
        top: { vis: [...rectL(100, 60), [50, 0, 50, 60]], circ: [[75, 30, 10]] },
        right: { vis: [...rectL(60, 50), [0, 25, 60, 25]], hid: [[20, 0, 20, 25], [40, 0, 40, 25]] },
      },
      hints: ["파선은 낮은 단 두께(높이 0~25)까지만 그립니다. 구멍이 높은 단까지 가지 않기 때문입니다.", "평면도 원의 왼쪽·오른쪽 끝(x = 65, 85)을 아래로 내리면 정면도 파선, 앞·뒤 끝(y = 20, 40)을 옮기면 우측면도 파선입니다."],
    }),
    view3d({
      id: "m1-v7", stage: "1", after: "m1-v6", model: "block-vgroove", title: "3D 따라그리기 10: V홈 블록", size: [80, 50, 40], desc: "블록 80 × 50 × 40, 윗면에 폭 30 · 깊이 15 V홈",
      views: {
        front: { vis: loop([[0, 0], [80, 0], [80, 40], [55, 40], [40, 25], [25, 40], [0, 40]]) },
        top: { vis: [...rectL(80, 50), [25, 0, 25, 50], [40, 0, 40, 50], [55, 0, 55, 50]] },
        right: { vis: rectL(50, 40), hid: [[0, 25, 50, 25]] },
      },
      hints: ["V홈의 비스듬한 선은 상대극좌표로: 홈 가장자리에서 @21.21<-45 처럼 그리거나, 골 끝점을 좌표로 잡으세요.", "평면도에는 홈 가장자리 두 줄과 골 한 줄, 모두 세 줄이 생깁니다. 위에서는 가리는 것이 없어 모두 실선입니다.", "우측면도에서 오른쪽 벽이 홈을 다 가립니다. 골만 파선 한 줄로 남습니다."],
    }),
  ];

  // 관련 미션 바로 뒤에 끼워 넣어 '다음 미션' 흐름이 자연스럽게 한다
  for (const m of [...drills, ...views3d]) {
    const i = ACAD.missions.findIndex((x) => x.id === m.after);
    if (i < 0) ACAD.missions.push(m);
    else ACAD.missions.splice(i + 1, 0, m);
  }
})();
