# CLAUDE.md — 아이놀이

3~6세 아이용 아이패드 학습놀이 웹앱(PWA). 애플펜슬 입력이 중심이다.
현재 구현된 콘텐츠는 **색칠하기** 하나이고, 나머지 로드맵은 [docs/기획.md](docs/기획.md)에 있다.

빌드 도구·의존성 없음. 순수 ES 모듈 + 캔버스. 정적 서버로 그냥 띄우면 된다.

## 파일 구성

```
index.html                앱 셸(홈 / 색칠 / 갤러리 세 화면이 한 문서 안에)
css/app.css               전부. 터치 타겟은 --tap 변수로 통일
manifest.webmanifest      홈 화면 추가용
sw.js                     오프라인 캐시 (네트워크 우선)
js/
  main.js                 화면 전환, 홈 목록(=로드맵), 갤러리, PWA 등록
  core/
    pen.js                애플펜슬/손가락 입력 정규화, 손바닥 인식, 시드 난수
    audio.js              WebAudio 로 효과음 합성 (음원 파일 없음)
    store.js              IndexedDB — works(완성작) / drafts(그리다 만 그림)
  coloring/
    index.js              색칠 엔진: 레이어, 획 기록, 되돌리기, UI 배선
    brushes.js            붓 종류별 그리기 로직
    fill.js               물감통(플러드 필)
    pages.js              밑그림 8종
assets/icon-*.png         tools/make-icons.mjs 로 생성 (직접 편집하지 말 것)
tools/serve.mjs           개발용 정적 서버 (윈도우/맥 공통, LAN 주소 출력)
tools/make-icons.mjs      아이콘 생성기 (외부 패키지 없이 PNG 직접 인코딩)
tools/selftest.js         브라우저 콘솔에 붙여넣는 자가 점검
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

브라우저 콘솔에서:

```js
await eval(await (await fetch('/tools/selftest.js')).text())
```

붓 7종 · 물감통 · 되돌리기/다시하기 · 지우개 · 스티커 · 화면 크기 변경 재생을 확인한다.
전부 `OK` 여야 한다.

## 아키텍처에서 지킬 것

- **레이어 3장** (`c-paint` / `c-stroke` / `c-lines`)을 CSS 로 겹쳐 두고 GPU 가 합성한다.
  자바스크립트로 매 프레임 합성하지 말 것 — 아이패드에서 눈에 띄게 느려진다.
- **`paint = baseline + recs[]`** 등식을 항상 유지한다. 되돌리기는 recs 하나 빼고 재생.
  획마다 난수 시드를 저장하므로 재생해도 크레용 결까지 똑같이 나온다.
- **좌표는 0~1 정규화**로 저장한다. 화면을 돌리거나 창 크기가 바뀌면 그대로 다시 재생하면 된다.
- **초기화를 `requestAnimationFrame` 에 의존하지 말 것.** 탭이 백그라운드면 rAF 가 안 돈다.
  크기 확정은 `ResizeObserver`(→ `layout()`)가 담당한다.

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

## 함정 모음

- **서비스 워커 캐시.** 파일을 추가·수정하면 `sw.js` 의 `VERSION` 을 올린다.
  안 올려도 네트워크 우선이라 대개 괜찮지만, 오프라인 캐시에 새 파일이 안 들어간다.
  `SHELL` 배열에 새 파일 경로를 넣는 것도 잊지 말 것.
- **아이패드에서 화면이 안 바뀔 때**: 사파리 설정 → 방문 기록·데이터 지우기, 또는
  홈 화면 아이콘 삭제 후 다시 추가.
- **`setPointerCapture` 는 던진다.** 합성 이벤트나 이미 사라진 포인터에서는 예외가 난다.
  반드시 try/catch (안 하면 획이 아예 시작되지 않는다).
- **`getImageData` 는 비싸다.** 밑그림 알파(물감통 벽)는 밑그림을 그릴 때 한 번만 뽑아 캐시한다.
- 아이콘을 바꾸려면 `tools/make-icons.mjs` 를 고치고 `node tools/make-icons.mjs`.

## 커밋 메시지

한국어, 명령형 현재. 예: `색칠하기: 물감통 안티에일리어싱 틈 메우기`, `밑그림 공룡 다시 그림`.
콘텐츠를 추가하면 `docs/기획.md` 의 상태 표와 `js/main.js` 의 `ACTIVITIES` 를 같이 갱신한다.
