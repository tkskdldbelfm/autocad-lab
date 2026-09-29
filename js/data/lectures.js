// CAD 기초강의 재생목록(35강). 입문·신입 단계의 CAD 기능 순서는 이 목록을 기준으로 한다.
window.ACAD = window.ACAD || {};

ACAD.playlist = "https://www.youtube.com/playlist?list=PLiNT4faujDKPDU2-fNWF90ixqRbEaK3fX";

ACAD.lectures = [
  ["01", "fkF8-mPSwXs", "화면구성 및 환경설정", "18:34"],
  ["02", "2-c6GUZPnng", "CAD파일의 종류", "16:26"],
  ["03", "HfOTStgL-eI", "명령어 입력 방법", "20:11"],
  ["04", "SSOHDVA0-nw", "좌표입력방법", ""],
  ["05", "N3X5rA_IGeI", "객체 선택방법", "20:15"],
  ["06", "o0dwT0tPxZE", "상대좌표 연습", "19:16"],
  ["07", "4bIN7ZWt8EI", "상대극좌표 연습", "19:14"],
  ["08", "1u3UstXGBlc", "거리값 직접입력", "18:54"],
  ["09", "29HKNVdiS88", "상태선(그리드, 스냅, 각도추적선)", "19:15"],
  ["10", "4xAYE_9pqa8", "객체스냅(OSNAP)", "16:46"],
  ["11", "Vu3XGVKTvw4", "객체스냅의 특별한 기능", "15:15"],
  ["12", "0TB-Fjxdw70", "객체스냅 예제연습", "11:28"],
  ["13", "IMivf9RqpxY", "Circle(C) 원 그리는 6가지 방법", "18:10"],
  ["14", "os55vATlr2U", "Circle(C) 원을 활용한 예제", "16:26"],
  ["15", "vBqTEcLXJrs", "ARC(A) 호 설명과 예제", "20:09"],
  ["16", "RPF8Ko2_5jg", "Limits, Zoom, Undo, Redo, Mredo", "15:09"],
  ["17", "b_zzO6k3nYQ", "Offset, Trim, Extend", "17:17"],
  ["18", "Y73e_0psCkc", "Offset, Trim, Extend 예제", "10:54"],
  ["19", "E0irs3qoEio", "Offset, Trim, Extend 예제2", "6:44"],
  ["20", "AXgNXv1rvQQ", "Move(이동), Copy(복사)", "7:47"],
  ["21", "mLgCKeFCHss", "Mirror(대칭복사)", "6:55"],
  ["22", "XFF8Q0Hd4To", "Polygon(정다각형)", "6:56"],
  ["23", "Fva33SyhSmY", "Ellipse(타원)", "11:03"],
  ["24", "ffOwOJRKS0k", "Fillet(모깎기, 둥근모서리)", "14:19"],
  ["25", "P838SGhH_FE", "Chamfer(모따기, 각진모서리)", "7:09"],
  ["26", "BsY_6zWTKB8", "Rotate(회전)", "6:40"],
  ["27", "9DeI25Q2SLo", "Scale(확대, 축소)", "5:44"],
  ["28", "pqitC3JS_co", "Lengthen(선길이조절)", "11:21"],
  ["29", "4C6T5P08KS0", "Break(선끊기), Join(선연결)", "6:36"],
  ["30", "2E4SXvKJp4A", "Align(정렬)", "5:16"],
  ["31", "XfztwOA30BY", "Stretch(늘이기/줄이기)", "11:13"],
  ["32", "KQwyZIfMX_o", "Array(배열) 직각·원형·경로배열", "12:20"],
  ["33", "Fcb20ONyXrU", "ARRAY 편집 옵션(원본편집, 항목대치, 배열재설정)", "9:35"],
  ["34", "8MW2hM9zJkc", "ARRAY 예제 기준점 변경 활용", "9:29"],
  ["35", "aO21iiWOiV0", "CAD예제 및 복습, 기초강의를 마치며", ""],
].map(([no, vid, title, len]) => ({
  no, vid, title, len,
  url: `https://www.youtube.com/watch?v=${vid}&list=PLiNT4faujDKPDU2-fNWF90ixqRbEaK3fX`,
  thumb: `https://i.ytimg.com/vi/${vid}/mqdefault.jpg`,
}));

ACAD.lecture = (no) => ACAD.lectures.find((l) => l.no === String(no).padStart(2, "0"));
