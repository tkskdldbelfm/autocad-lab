# AutoCAD 러닝랩

무거운 CAD를 켜지 않고 브라우저에서 도면 읽기와 AutoCAD 기본 기능·단축키를 익히는 교육용 웹앱입니다. 입문부터 10년차 배관 설계까지 5단계로 이어집니다.

## 실행

`index.html`을 더블클릭하면 됩니다. 빌드도 서버도 필요 없습니다(three.js는 `vendor/`에 들어 있어 오프라인에서도 동작합니다). 강의 영상 썸네일과 한글 웹폰트만 인터넷이 있을 때 불러옵니다.

진행 상황(완료한 레슨·미션, 퀴즈 기록)은 브라우저의 localStorage에 저장됩니다. 브라우저나 PC를 바꾸면 새로 시작합니다.

## 구성

| 화면 | 주소 | 내용 |
| --- | --- | --- |
| 로드맵 | `#/` | 5단계(입문·신입·3년차·5년차·10년차)와 도구 목록 |
| 단계 / 레슨 | `#/stage/0`, `#/lesson/0-04` | 레슨 본문, 강의 영상, 바로 연습, 명령·단축키, 확인 문제 |
| 3면도·3D 뷰어 | `#/viewer?model=block-step` | 평면도·정면도·우측면도·3D 연동 하이라이트, 유리상자 펼치기, 제1각법/제3각법, 단면 보기(`&section=A\|B&half=1&cut=<mm>`) |
| CAD 연습장 | `#/sandbox?mission=m0-06` | 웹 CAD(명령행·단축키·객체 스냅·직교·선택), 즉시 피드백, 미션 자동 채점 |
| 단축키 훈련 | `#/shortcuts?mode=drill` | 참고표, 명령어 드릴, 기능키 드릴 |
| 도면 퀴즈 | `#/viewquiz?set=basic` | 맞는 면 고르기, 빠진 면, 숨은선, 단면도 읽기, 배관 |
| 배관 도면 랩 | `#/piping?focus=pid` | 냉각수 스키드 CW-SKID-01의 P&ID·평면·입면·아이소·3D 연결 |
| 도면 검토 | `#/review?sheet=r2` | 오류가 숨은 도면에서 틀린 곳 클릭해 찾기 |

### 단계 기준

- **입문·신입**: 도면 보는 법 + CAD 기본 기능. CAD 기능 레슨은 [CAD 기초강의 재생목록(35강)](https://www.youtube.com/playlist?list=PLiNT4faujDKPDU2-fNWF90ixqRbEaK3fX) 순서를 그대로 따릅니다(입문 01–16, 신입 17–35). 레슨마다 해당 강의 영상과 연습장 미션이 연결됩니다.
- **3년차**: 배관 도면 읽기(크기·부품·기호·라인 번호·P&ID·평면·입면·아이소·스풀).
- **5년차**: 배관 도면 구현(경로 원칙·외부참조·평면/단면 작성·등각 아이소 작도·서포트·물량·간섭·개정).
- **10년차**: 검토·CAD 표준·발행·3D 전환·인터페이스·코드 지도·코칭.

## 파일

```
index.html            화면 틀과 스크립트 순서
css/tokens.css        색·간격·모서리 디자인 토큰
css/app.css           공통 스타일 / cad.css 연습장 / viewer.css 뷰어
vendor/three.min.js   three.js r158 (UMD)
js/core/              util.js(네임스페이스·저장·링크), app.js(해시 라우터)
js/data/              curriculum.js + lessons-0..4.js(레슨), lectures.js(35강),
                      figures.js(레슨 도해), missions.js, shortcuts.js, models.js, viewquiz.js
js/pages/             화면별 코드
js/cad/               웹 CAD 엔진
js/viewer/            3면도·3D 엔진
```

## 내용 고치기

- **레슨 추가·수정**: `js/data/lessons-<단계>.js`. `practice`의 `type`은 `sandbox | viewer | quiz | piping | shortcuts | review`, `id`는 미션·모델·퀴즈 세트·탭 id입니다. 본문에 `<div data-figure="coords"></div>`(figures.js의 도해)나 `<div data-figure="viewer:block-step"></div>`(3D 뷰어 삽입)를 넣을 수 있습니다.
- **미션**: `js/data/missions.js`. 단계별 `check(ctx)`가 그린 객체를 채점합니다.
- **3D 모델**: `js/data/models.js`. 부품마다 id와 설명을 주면 3면도와 하이라이트가 자동으로 따라옵니다.
- **도면 검토 시트**: `js/pages/review.js`의 `sheets`. 오류 위치(x, y, r)와 설명을 적습니다.

### 단면 보기

뷰어 도구 막대의 **단면 A-A / B-B**로 자르고, **한쪽 단면**과 **자르는 위치** 슬라이더로 바꿉니다.

- 잘린 면은 45° 해칭, 단면도에는 숨은선을 그리지 않습니다.
- 평면도에 절단선(1점 쇄선, 끝 굵게, 보는 방향 화살표와 글자)이 그려지고, 3D는 같은 면으로 잘려 잘린 면이 칠해집니다.
- KS 규칙대로 리브·축을 길이 방향으로 자르면 해칭하지 않고(마우스를 올리면 이유 표시), 배관의 얇은 관 벽은 검게 칠합니다.
- 모델별 기본 자르는 위치·잘린 면의 주인 부품은 `models.js`의 `section`, `sectionSplits`, `sectionOwner`, 부품의 `noHatch`, `wall`로 정합니다.

## 알아 둘 점

- 배관 등급 A1A와 CW-SKID-01은 이 교재 전용 가상 예제입니다. 두께 계산과 응력 해석은 다루지 않습니다.
- 기호 모양과 도면 규칙은 회사·프로젝트마다 다릅니다. 현장 표준과 범례가 있으면 그 문서가 이깁니다.
- 연습장은 AutoCAD의 기본 2D 기능을 가볍게 흉내 낸 것입니다. 실제 AutoCAD와 세부 동작이 다를 수 있습니다.
- 단면 보기에서 배관 플랜지·밸브는 속이 찬 단순 형상이라 잘린 면을 해칭 없이 윤곽만 보여 줍니다. 관을 길이 방향으로 자르면 토막 끝에 벽 두께만 한 짧은 띠가 생깁니다.
