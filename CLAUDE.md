# CLAUDE.md — 아이놀이

3~6세 아이용 아이패드 학습놀이 웹앱(PWA). 애플펜슬 입력이 중심이다.
구현된 콘텐츠는 세 갈래다.
- **색칠하기**
- 궤적 판정 엔진(`core/trace.js`)을 공유하는 일곱:
  **따라 그리기 · 한글 쓰기 · 이름 쓰기 · 숫자 쓰기 · 영어 쓰기 · 미로 찾기 · 점 잇기**
- 끌어다 맞추는 **조각 퍼즐** (짝 맞추기를 교체 — 이전 코드는 git 히스토리에)
- 동그라미 판정(`spot/judge.js`)을 쓰는 **다른 그림 찾기** (직접 그린 장면 8종)

나머지 로드맵은 [docs/기획.md](docs/기획.md)에 있다.

빌드 도구·의존성 없음. 순수 ES 모듈 + 캔버스. 정적 서버로 그냥 띄우면 된다.

## 파일 구성

```
index.html                앱 셸(홈 / 색칠 / 따라 그리기류 / 조각 퍼즐 / 다른 그림 찾기 / 갤러리)
css/app.css               전부. 터치 타겟은 --tap 변수로 통일
manifest.webmanifest      홈 화면 추가용
sw.js                     오프라인 캐시 (네트워크 우선)
js/
  main.js                 화면 전환, 홈 목록(=로드맵), 갤러리, PWA 등록
  core/
    pen.js                애플펜슬/손가락 입력 정규화, 손바닥 인식, 시드 난수
    audio.js              WebAudio 로 효과음 합성 (음원 파일 없음). 도구·활동마다 다른 소리
    store.js              IndexedDB — works(완성작) / drafts(그리다 만 그림) / photos(퍼즐용 사진)
    trace.js              궤적 판정 엔진 — 따라 그리기·한글 획순·숫자·미로·점 잇기 공용
    dragdrop.js           드래그 판정 엔진 — 분류·세어보기·기억력 카드용 (지금은 미사용)
  coloring/
    index.js              색칠 엔진: 레이어, 획 기록, 되돌리기, 내 사진 관리, UI 배선
    brushes.js            붓 종류별 그리기 로직
    fill.js               물감통(플러드 필)
    pages.js              밑그림 8종
    photopage.js          사진 → 외곽선 밑그림 (블러+소벨, 라이브러리 없음)
  trace/                  ← 일곱 활동이 화면·배선을 전부 공유한다
    index.js              공용 러너: 코스 등록, 길·벽·점 그리기, 진행 채우기, 칭찬
    lines.js              선 긋기 22단계 (기본 12 + 심화 10)
    hangul.js             한글 자모 24자 획순
    numbers.js            숫자 획순 — 1~10 · 십 단위 20~100 (낱자를 좁혀 조립)
    english.js            알파벳 A~Z 획순
    names.js              이름 쓰기 — 자모 획을 음절 블록에 조판 (가족 이름 11개)
    maze.js               미로 14개 (씨앗 난수로 생성 + 최단 경로 탐색)
    dots.js               점 잇기 그림 5개
  puzzle/
    index.js              조각 퍼즐: 판·조각 그리기, 드래그, 착 붙기, 내 사진 관리
    pics.js               기본 그림 9장 (하·중·상 각 3) — 이모지 장면
    cut.js                조각 기하: BSP 무작위 분할 + 혹(knob) — 점검과 공용
  spot/
    index.js              다른 그림 찾기: 두 그림판, 동그라미 표시, UI 배선
    scenes.js             장면 8종(우리 집·바닷속·밤하늘·농장·놀이터·생일·기차·겨울) × 난이도 3 = 24문제
    judge.js              동그라미/콕 찍기 판정 — 화면과 자가 점검이 같이 쓴다
assets/icon-*.png         tools/make-icons.mjs 로 생성 (직접 편집하지 말 것)
tools/serve.mjs           개발용 정적 서버 (윈도우/맥 공통, LAN 주소 출력)
tools/make-icons.mjs      아이콘 생성기 (외부 패키지 없이 PNG 직접 인코딩)
tools/selftest.js         색칠하기 자가 점검 (브라우저 콘솔에 붙여넣기)
tools/selftest-trace.js   따라 그리기류 7코스 자가 점검 (진행 기록을 건드리지 않는다)
tools/selftest-puzzle.js  조각 퍼즐 자가 점검 (위와 같음)
tools/selftest-spot.js    다른 그림 찾기 자가 점검 (위와 같음)
tools/pen-log.html        펜 입력 진단 — 앱 로직 없이 받은 좌표만 그대로 잇는다
docs/기획.md              콘텐츠 로드맵 · UX 원칙 · 만드는 순서
```

## 실행

```bash
node tools/serve.mjs
```

`.claude/launch.json` 에 `baby` 로 등록돼 있어 preview_start 로도 뜬다.

파이썬 대신 노드로 서버를 띄우는 이유는 세 가지다. **macOS 12.3 부터 `python` 명령이 없고**
(`python3` 뿐이라 launch.json 이 윈도우/맥에서 갈린다), ES 모듈은 `.js` 의 Content-Type 이
`text/javascript` 여야 로드되며, 개발 중에는 캐시를 꺼야 한다. `tools/serve.mjs` 가 셋 다 해결한다.

**아이패드에서 보기** — 같은 와이파이여야 한다.
서버가 시작할 때 `http://192.168.x.x:8123` 형태로 주소를 찍어 준다.
아이패드 사파리에서 그 주소 → 공유 → **홈 화면에 추가** → 전체 화면 + 오프라인 동작.

## 자가 점검

브라우저 콘솔에서. 색칠 화면에서:

```js
await eval(await (await fetch('/tools/selftest.js')).text())
```

붓 7종 · 물감통 · 되돌리기/다시하기 · 지우개 · 스티커 · 화면 크기 변경 재생을 확인한다.

따라 그리기류(아무 코스나) 화면에서:

```js
await eval(await (await fetch('/tools/selftest-trace.js')).text())
```

7코스 121단계 완주 · 길 밖 판정 · 질러가기 방지 · 획순을 확인한다.

조각 퍼즐 화면에서:

```js
await eval(await (await fetch('/tools/selftest-puzzle.js')).text())
```

9문제 구성(3·5·8조각 각 3) · 빈틈없는 자르기 · 혹/홈 짝 · 붙기 판정을 확인한다.

다른 그림 찾기 화면에서:

```js
await eval(await (await fetch('/tools/selftest-spot.js')).text())
```

24문제 구성 · 두 그림이 다른 곳 말고는 픽셀까지 같음 · 전부 찾아짐 · 문지르기 방지를 확인한다.

넷 다 전부 `OK` 여야 한다. 판정은 전부 엔진을 직접 불러 시험하므로
아이가 모은 별은 지워지지 않는다.

## 아키텍처에서 지킬 것

- **레이어 3장** (`c-paint` / `c-stroke` / `c-lines`)을 CSS 로 겹쳐 두고 GPU 가 합성한다.
  자바스크립트로 매 프레임 합성하지 말 것 — 아이패드에서 눈에 띄게 느려진다.
- **`paint = baseline + recs[]`** 등식을 항상 유지한다. 되돌리기는 recs 하나 빼고 재생.
  획마다 난수 시드를 저장하므로 재생해도 크레용 결까지 똑같이 나온다.
- **좌표는 0~1 정규화**로 저장한다. 화면을 돌리거나 창 크기가 바뀌면 그대로 다시 재생하면 된다.
- **입력점 사이는 `drawSeg()` 가 잘게 나눠 준다. 붓은 긋는 속도를 몰라도 된다.**
  붓이 `seg()` 에서 하는 일은 "이 구간에 잉크를 깐다"뿐이고, **잉크 양은 반드시
  구간 길이에 비례**해야 한다. `line()` 을 쓰면 저절로 그렇게 된다. 개수를 고정해서
  뿌리면(반짝이가 그랬다) 잘게 나눌 때 그만큼 쏟아진다 — `len` 으로 나눠 쓸 것.
- **초기화를 `requestAnimationFrame` 에 의존하지 말 것.** 탭이 백그라운드면 rAF 가 안 돈다.
  크기 확정은 `ResizeObserver`(→ `layout()`)가 담당한다.

## 색칠하기 동작 몇 가지

- **열 때마다 그림이 무작위로 하나 나온다** (직전 그림만 피함). 그리다 만
  그림은 페이지별 draft 로 저장돼 있어 다시 그 그림이 나오면 이어진다.
- **내 사진 밑그림**: 그림 고르기 시트의 📷 카드로 추가한다. 사진을
  `photopage.js` 가 외곽선만 따서(축소→블러→소벨→적응 문턱→굵히기)
  투명 PNG 로 IndexedDB(linework) 에 저장한다. 사진 카드를 2초 길게
  누르면 삭제. 사진 특성상 영역이 완전히 닫히지 않아 물감통이 옆으로
  번질 수 있다 — 감수한다.

## 새 밑그림 추가하기

`js/coloring/pages.js` 의 `PAGES` 에 `{ id, name, draw(c) }` 를 넣는다.
좌표계는 1000×700, 선 굵기·색은 `drawPage()` 가 세팅해 주므로 건드리지 말 것.

**물감통이 새지 않으려면 모든 영역이 닫혀 있어야 한다.** 두 형태가 만나는 곳에는
칸막이 선을 그어라(예: 콘 윗변 `seg(c, 395, 402, 605, 402)`).

추가 후 점검 — 모서리에서 배경을 칠했을 때 안쪽이 남아 있어야 한다:

```js
const P = await import('/js/coloring/pages.js?t='+Date.now());
const F = await import('/js/coloring/fill.js?t='+Date.now());
const W=900,H=630, L=Object.assign(document.createElement('canvas'),{width:W,height:H});
const lc=L.getContext('2d',{willReadFrequently:true});
const Pc=Object.assign(document.createElement('canvas'),{width:W,height:H}).getContext('2d',{willReadFrequently:true});
for (const p of P.PAGES) {
  P.drawPage(p, lc, W, H);
  const m = F.alphaMask(lc, W, H);
  Pc.clearRect(0,0,W,H);
  F.floodFill(Pc, m, W, H, 2, 2, [255,0,0,255]);
  const d = Pc.getImageData(0,0,W,H).data;
  let bg=0; for(let i=3;i<d.length;i+=4) if(d[i]>8) bg++;
  let ink=0; for(let i=0;i<m.length;i++) if(m[i]>150) ink++;
  console.log(p.id, ((W*H-bg-ink)/(W*H)*100).toFixed(1)+'%');  // 4% 미만이면 샌다
}
```

## 조각 퍼즐 그림 추가하기

`js/puzzle/pics.js` 의 `PICS` 에 넣는다. 그림은 그라데이션 배경 + 이모지 몇 개다.
큰 주인공 하나 + 배경 소품 두어 개가 조각을 알아보기 제일 좋다.

```js
P('dino', '공룡', '🦕', 2, ['#d9f2d0', '#f4ffe9'],
  [{ e:'🌋', x:.80, y:.28, s:.26 }, { e:'🦕', x:.50, y:.60, s:.48 }])
```

- `hard` 는 조각 수만 정한다: 1→3 · 2→5 · 3→8 (`cut.js` 의 `PIECES`).
  **자르는 모양은 열 때마다 무작위다** — 가장 큰 조각을 반복해 가르는
  BSP 분할이라 같은 그림도 매번 다르게 잘린다. 모든 변은 92 이상이어야
  하고(집기 쉬움 + 제자리끼리 SNAP 보다 멀어짐), 짧게(72 미만) 맞닿은
  변에는 혹을 생략한다.
- `buildPuzzle(level, seed)` 는 같은 (level, seed) 면 같은 퍼즐이다 —
  자가 점검이 씨앗을 고정해 기하를 검사한다. 화면은 열 때마다 새 씨앗.
- 조각은 **자기 자리 근처(SNAP=48)에서만** 붙는다.
- **내 사진 퍼즐**: 퍼즐 화면 끝의 📷 칩으로 추가한다. 긴 변 1280 으로 줄인
  JPEG 를 IndexedDB(photos) 에 저장하고, 사진마다 상(8조각) 퍼즐 하나가 생긴다.
  사진 칩을 2초 길게 누르면 삭제(확인창). 판 비율(4:3)에 맞춰 가운데를 자른다.
- 추가한 뒤 `tools/selftest-puzzle.js` 로 "자르기 OK / 혹홈 OK" 를 확인한다.

## 다른 그림 찾기 문제 추가하기

`js/spot/scenes.js` 만 고친다. 장면은 캔버스로 직접 그린다 (이모지 아님 —
사용자 요청으로 교체. 이모지 생성기 버전은 git 히스토리 e077dc3).

- **다른 곳 과녁(spots)의 좌표는 draw 코드의 실제 위치와 손으로 맞춘다.**
  어긋나면 자가 점검의 "안 바뀜" 검사가 잡아 준다 (생일 깃발이 그랬다).
- **장면 하나 = base/alt 파라미터 + spots(다른 곳 위치) + draw(c, P).**
  왼쪽은 base, 오른쪽은 고른 항목만 alt 로 바꿔 **같은 코드가 그린다** —
  그래서 두 그림은 바뀐 곳 말고는 픽셀까지 같고, 자가 점검이 그 성질을
  그대로 검사한다 (엉뚱한 픽셀이 다르면 파라미터가 새는 것).
- 장면 좌표계는 그림판 로컬 452×548 (`PANEL.w × PANEL.h`).
- 문제 추가는 `SPOTS` 에 한 줄: `{ id, scene, hard, diffs:[파라미터…] }`.
  난이도별 다른 곳 수는 하2 · 중3 · 상4 로 맞춘다.
- 같은 위치를 공유하는 파라미터(행성 색과 고리처럼)는 **한 문제에 같이
  넣지 말 것** — 판정 과녁이 겹친다.
- 판정은 한 획에 다른 곳 하나만 인정한다 — 화면 전체를 문질러도 소용없다.
- 추가한 뒤 `tools/selftest-spot.js` 로 "픽셀 같음 / 전부 찾아짐" 을 확인한다.

## 소리

음원 파일이 없다. `js/core/audio.js` 가 전부 합성한다 (용량 0, 오프라인 안전).
두 종류를 구분해서 쓴다.

- **짧은 신호음** `tone()` / `hiss()` — 눌렀다, 됐다, 다 했다.
- **이어지는 소리** `voice(name)` — 펜이 닿아 있는 동안 계속 난다.
  `move(속도0~1, 필압0~1)` 로 먹이고 `stop()` 으로 끈다. **반드시 `onEnd` 에서
  꺼야 한다** — 안 끄면 노드가 계속 살아 있다.

**사각거리는 소리는 사인파로 안 나온다.** 크레용·연필·붓·지우개는 전부 백색잡음을
필터에 통과시켜 만든다 (`hiss`, `VOICES[].src === 'noise'`). 2초짜리 잡음 버퍼를
한 번 만들어 돌려 쓴다.

활동마다 다르게 배정돼 있다 — 도구 10종은 각자 고유음, 따라 그리기류는 코스별로
진행음(`STEP`)·완성음(`CHEER`)·이어지는 소리(`COURSES[].voice`)가 갈린다.
**3~6세 UX 원칙대로 틀렸다는 소리는 만들지 않는다.** 잘 가고 있을 때만 울린다.

**읽어 주기** — 한글·숫자·영어는 다 쓰면 이름을 읽어 준다 (ㄱ→"기역",
7→"칠", A→"에이"). 음원 없이 기기 내장 TTS(`say()`, speechSynthesis)를 쓴다.
코스의 `lang` 이 있으면 완성 550ms 뒤 `level.say ?? level.name` 을 읽는다.
자음 이름은 `hangul.js` 의 `SAY` 표에 있다 (모음은 소리 그대로: ㅏ→"아").

**iOS TTS 규칙 (아이패드 실측으로 확정)** — 직접 speak 하지 말고 `say()` 를 쓸 것.
- **소리 권한은 탭(click 핸들러의 동기 흐름)에만 확실히 있다.**
  setTimeout·await 한 번만 지나도 무음. 그리고 **그리기(드래그)의 끝은
  pointerup 이든 touchend 든 권한이 없다** — 진단 페이지 "떼면 읽기" 로 실측.
  빈 발화로 세션을 미리 푸는 꼼수도 기기에 따라 안 풀리거나 큐를 막는다.
- 그래서 읽기는 **단계를 여는 click**(홈 카드·칩·◀▶)에서 한다 — "이 글자를
  써 보자" 안내를 겸한다. click 에서 한 번 소리가 나면 세션이 풀려서
  그 뒤의 비동기 읽기(완성 때 touchend/pointerup)도 나온다.
- utterance 를 변수에 붙잡아 두지 않으면 GC 돼서 소리가 안 난다.
- `cancel()`·rate/pitch 조정·읽는 동안 AudioContext suspend 같은 손질은
  전부 iOS 함정을 밟았다 — `say()` 는 "resume + speak" 그대로만 쓴다.
- 원인 추적은 `tools/pen-log.html` 의 읽기 시험 4종으로 한다
  (터치 안 / 터치 밖 / 효과음과 동시 / 앱 모듈 경로).

소리를 추가하면 홈의 🔊 버튼(음소거)에서도 조용해지는지 확인할 것 —
`tone`/`hiss`/`voice` 를 거치지 않고 직접 노드를 만들면 음소거를 빠져나간다.

## 따라 그리기류 — 단계·코스 추가하기

일곱 활동(선 긋기·한글·이름·숫자·영어·미로·점 잇기)이 화면 하나와 러너 하나를 공유한다.
**HTML 도 CSS 도 건드릴 필요가 없다.**

**단계 추가** — 해당 코스 파일(`lines.js` / `hangul.js` / …)의 배열에 넣는다.
좌표계는 밑그림과 같은 **1000×700**, 작업 영역은 x 140~860 · y 130~570.

```js
{ id:'zig', name:'지그재그', ico:'⚡', from:'🐿️', to:'🌰',
  strokes:[ poly([[160,170],[276,530], ...]) ] }   // 또는 t => ({x,y}) 함수
```

**코스 추가** — 새 파일을 만들고 `js/trace/index.js` 의 `COURSES` 에 한 줄,
`js/main.js` 의 `ACTIVITIES`·`SCREEN_OF` 에 한 줄씩. 끝.

```js
COURSES = { ..., mycourse: { levels: MINE, guide: true, tol: 44, key: 'mycourseDone' } }
```

- `strokes` 가 여러 개면 **획순대로** 그려야 통과한다.
- `guide:false` 면 길을 그려 주지 않는다. 미로(`level.walls`)와
  점 잇기(`level.dots`)가 이걸 쓴다 — 길을 보여 주면 문제가 안 되니까.
- `from`/`to` 는 출발점을 타고 가는 그림과 도착점에서 기다리는 그림.
  글자를 못 읽는 나이라 "무엇을 어디로" 를 그림으로만 알린다.
- **반복 곡선(물결·지그재그)은 이웃 반복이 진행률로 lookahead(16%)보다 멀어야 한다.**
  가까우면 직선으로 질러가도 완주된다. 반주기 간격이 20% 아래로 내려가면 위험하다 —
  큰 물결을 5반주기로 넣었다가 질러가기 검사에 걸려 2주기로 줄였다.
- **경로가 자기 자신에게 가까워지면 `tol` 을 줄인다.** 안 그러면 옆 궤도로 건너뛴다.
  기준: `tol` < 궤도 간격의 절반. 나선이 간격 105 라 `tol: 38`,
  미로는 칸 크기의 0.42 로 자동 계산한다.
- **`arc()` 의 각도 방향을 조심할 것.** y 가 아래로 커지므로 **각이 커지는 쪽이
  화면상 시계 방향**이다. 반대로 주면 숫자 6 이 `ə` 가 되고 5 의 배가 사라진다.
  새 글자를 넣었으면 아래 대조표로 눈으로 확인하는 게 제일 빠르다:

```js
const T = await import('/js/core/trace.js?t='+Date.now());
const { NUMBERS } = await import('/js/trace/numbers.js?t='+Date.now());
const cv = Object.assign(document.createElement('canvas'), {width:950,height:400});
document.body.append(Object.assign(cv, {style:'position:fixed;left:0;top:0;z-index:9999;background:#fff'}));
const c = cv.getContext('2d'); c.fillStyle='#fff'; c.fillRect(0,0,950,400);
NUMBERS.forEach((L,i) => { const ox=(i%5)*190, oy=Math.floor(i/5)*190, s=0.166;
  T.buildLevel(L).paths.forEach((p,k) => { c.beginPath();
    p.forEach((q,j)=> j?c.lineTo(ox+12+q.x*s,oy+q.y*s):c.moveTo(ox+12+q.x*s,oy+q.y*s));
    c.strokeStyle=['#e04a3a','#2b7fe8','#1a9e4b','#b054d8'][k%4];
    c.lineWidth=9; c.lineCap='round'; c.lineJoin='round'; c.stroke(); }); });
```

- 추가한 뒤 `tools/selftest-trace.js` 를 돌려 "완주 OK / 질러가기 OK / 획순 OK" 를 확인한다.

**이름 쓰기(names.js)** — 가족 이름을 음절 블록 세 개로 조판해 따라 쓴다.
- 음절은 `SYL` 표에 자모+상자(블록 안 비율)로 손으로 정의한다. 새 이름을
  넣으려면 `FAMILIES` 에 추가하고, 없는 음절만 `SYL` 에 정의하면 된다.
- 자모 획은 hangul.js 것을 상자에 눌러 넣는다(비균등 스케일).
  ㅣ·ㅡ 처럼 두께 없는 자모는 그 축 가운데 정렬(`place()` 의 40px 규칙).
- 글자의 마지막 획 번호(`sylSay`)에서 그 글자를 읽고(펜 떼는 순간),
  완성하면 📣 전체 듣기가 켜진다. 열 때는 이름을 미리 읽지 않는다
  (완성이 보상) — 안내말(`course.intro`)만 한다.
- 코스 옵션 `full`(전체 듣기 흐름) · `road/fill/icon/badge`(가는 그리기 치수)는
  이름 쓰기가 쓴다. 블록이 작아 기본 굵기(62)면 이웃 획을 덮는다.

**동그라미는 전부 상-좌-하-우(반시계)다** — ㅇ·ㅎ(hangul.js 의 `O()`),
숫자 0(낱자 10 포함), 영어 O 가 같은 방향이다. 새 원을 넣을 때 arc 각도를
줄여 가며(-π/2 → -2.5π) 돌릴 것. 방향이 섞이면 아이가 헷갈린다.

**한글 획순은 통용 필순을 따랐다** (초등 저학년 학습지 기준). 다르게 가르치고 싶으면
`hangul.js` 의 `strokes` 순서만 바꾸면 된다.

## 함정 모음

- **`hidden` 은 클래스의 `display` 에 진다.** 팝오버·시트처럼 `hidden` 으로 여닫는 요소에
  `.popover{display:flex}` 를 걸면 작성자 스타일이 브라우저 기본값 `[hidden]{display:none}` 을
  이겨서 오버레이가 계속 화면을 덮는다. 보이는 증상은 "색칠 화면에서 아무것도 안 눌림".
  `css/app.css` 맨 위 `[hidden]{display:none !important}` 가 이걸 막아 준다 — 지우지 말 것.
- **"펜을 안 뗐는데 점이 줄줄이 생긴다"의 진짜 원인은 입력 간격이다.** 붓은 획을
  `alpha < 1` 로 겹쳐 칠하는데, 예전에는 이벤트로 들어온 점 사이만 이었다. 빠르게 그으면
  그 간격이 붓 굵기만큼 벌어져서 **겹치는 자리(=입력점)만 진해지고 사이는 연하게** 남는다.
  느리게 그으면 안 보이고 빠르게 그을수록 심해져서, 성능 문제나 손바닥 문제로 오해하기 쉽다.
  `drawSeg()` 가 입력점 사이를 붓 굵기의 1/4 간격으로 나눠 그려 해결했다.
  재는 법: 이음매 x 와 그 중간 x 의 잉크량(알파 합)을 비교한다. 고치기 전 11.3%, 후 1.0%.
  **중심선 밝기로는 안 잡힌다** — 가운데는 어차피 포화된다.
- 위 증상을 `pointercancel` 로 오진했던 흔적이 남아 있다. `.stage`/`.tray` 의
  `touch-action:none` 과 `rec.cont`/`rec.a` 이어 붙이기(`resumeFrom`)가 그것인데,
  둘 다 그 자체로는 옳은 방어라 남겨 뒀다. 실측한 아이패드 입력은 깨끗했다
  (한 획에 pointerdown 1, pointercancel 0, 이벤트 최대 공백 21ms).
- **입력 문제인지 그리기 문제인지는 `tools/pen-log.html` 로 가른다.** 앱 로직을 전부 걷어내고
  받은 좌표만 그대로 잇는 페이지다. 여기서 멀쩡하면 원인은 그리기 코드 쪽이다.
- **`tools/selftest.js` 의 전체 지우기 단계는 백그라운드 탭에서 실패한다.** 길게 누르기가
  `requestAnimationFrame` 으로 진행률을 재는데 `document.hidden` 이면 rAF 가 안 돈다.
  헤드리스/미리보기 패널에서 돌릴 땐 rAF 를 `setTimeout` 으로 갈아 끼우고 실행할 것.
- **서비스 워커 캐시.** 파일을 추가·수정하면 `sw.js` 의 `VERSION` 을 올린다.
  안 올려도 네트워크 우선이라 대개 괜찮지만, 오프라인 캐시에 새 파일이 안 들어간다.
  `SHELL` 배열에 새 파일 경로를 넣는 것도 잊지 말 것.
- **아이패드에서 화면이 안 바뀔 때**: 사파리 설정 → 방문 기록·데이터 지우기, 또는
  홈 화면 아이콘 삭제 후 다시 추가.
- **iOS 캔버스는 큰 이모지를 못 찍는다.** `fillText` 의 폰트가 대략 256px 를 넘으면
  Apple Color Emoji 가 소리 없이 안 그려진다 — 데스크톱은 되고 아이패드만 빈다.
  퍼즐 그림이 그랬다 (배경 그라데이션만 나오고 주인공이 빔). `puzzle/pics.js` 의
  `fillEmoji()` 가 120px 로 찍어 확대하는 식으로 우회한다. 캔버스에 이모지를
  150px 이상으로 찍을 일이 생기면 이 함수를 쓸 것.
- **`roundRect` 는 iPadOS 16.4 부터다.** 그 아래 버전에서는 그리다 예외가 나서
  화면이 통째로 빈다 (증상: "퍼즐에서 그림이 안 나와" — 미로 벽·다른 그림 찾기 판도 같다).
  `js/main.js` 맨 위의 폴리필이 막아 준다. 새 코드에서 최신 canvas API 를 쓰기 전에
  iOS 지원 버전을 확인할 것.
- **`setPointerCapture` 는 던진다.** 합성 이벤트나 이미 사라진 포인터에서는 예외가 난다.
  반드시 try/catch (안 하면 획이 아예 시작되지 않는다).
- **판정 엔진은 화면과 분리하고, 배치는 따로 뺀다.** `puzzle/cut.js`(조각 기하)와
  `spot/judge.js` 를 화면과 자가 점검이 같이 쓴다. 안 그러면 점검이 조각 위치를 몰라
  실제 조작을 흉내낼 수 없다.
- **완주한 뒤에도 펜을 떼지 않으면 `feed()` 에 `allDone` 이 계속 돌아온다.**
  그대로 두면 팡파르가 겹쳐 울리고, 더 나쁘게는 자동 넘어가기 타이머가 매번
  다시 시작돼 다음 단계로 영영 안 넘어간다. `feed()` 첫 줄의 `tracer.finished`
  가드가 이걸 막는다 — 지우지 말 것. (소리를 붙이고 나서야 드러난 버그다.
  팡파르가 22번 울려서 알았다.)
- **`getImageData` 는 비싸다.** 밑그림 알파(물감통 벽)는 밑그림을 그릴 때 한 번만 뽑아 캐시한다.
- 아이콘을 바꾸려면 `tools/make-icons.mjs` 를 고치고 `node tools/make-icons.mjs`.

## 커밋 메시지

한국어, 명령형 현재. 예: `색칠하기: 물감통 안티에일리어싱 틈 메우기`, `밑그림 공룡 다시 그림`.
콘텐츠를 추가하면 `docs/기획.md` 의 상태 표와 `js/main.js` 의 `ACTIVITIES` 를 같이 갱신한다.
