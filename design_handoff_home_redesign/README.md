# Handoff: 아이놀이 홈 화면 리디자인 (1a "다듬은 버전")

## Overview
아이놀이(3~6세 아이패드 학습놀이 PWA)의 홈 화면 리디자인.
기존 12개 활동을 단일 그리드로 나열하던 것을 **카테고리별 그룹(창작 / 쓰기 준비 / 생각 놀이 / 곧 나와요)** 으로 재구성하고, 이모지 아이콘을 **그룹 색상에 맞춘 커스텀 SVG 라인 아이콘**으로 교체했다. 기존 크림/주황 톤과 카드 언어는 유지.

대상 저장소: `stepersjmj-hash/baby` (main) — 수정 대상 파일은 주로 `index.html`, `css/app.css`, `js/main.js`.

## About the Design Files
이 번들의 `홈 v2.dc.html`은 **HTML로 만든 디자인 레퍼런스**다(프로토타입). 그대로 복사해 쓰는 코드가 아니라, **대상 코드베이스(바닐라 JS + CSS, 빌드 도구 없음)의 기존 패턴으로 재구현**해야 한다. 기존 `buildHome()` (js/main.js) + `css/app.css`의 클래스 방식 그대로 확장하면 된다.

## Fidelity
**High-fidelity.** 색상·타이포·간격·아이콘 모두 최종값. 픽셀 단위로 재현할 것.

## Screens / Views

### 홈 화면 (screen-home)
- **Purpose**: 아이가 활동을 골라 진입하는 첫 화면.
- **배경**: `radial-gradient(120% 90% at 50% 0%, #ffe3b0 0%, #fdf1d6 60%)` (기존과 동일, body에 적용).
- **글꼴**: 기존 스택 유지 (`-apple-system, …, 'Apple SD Gothic Neo', 'Pretendard', 'Malgun Gothic', system-ui, sans-serif`), 색 `#3a2f22`.
- **구조** (세로 flex, 전체 화면):
  1. 헤더 — `display:flex; align-items:center; gap:14px; padding:26px 32px 8px`
  2. 스크롤 영역 — `flex:1; overflow-y:auto; padding:10px 32px 28px; display:flex; flex-direction:column; gap:18px` (그룹 세로 나열)
  3. 푸터 — 기존 install-hint 유지, `padding:0 32px 16px; font-size:13px; opacity:.55; font-weight:600`

#### 헤더
- 제목 블록(세로): h1 "무엇을 하고 놀까?" — 34px / 800 / letter-spacing -0.8px / white-space:nowrap.
  부제 "오늘도 재미있게 놀아 보자!" — 15px / 700 / opacity .5.
- 소리 버튼(우측, margin-left:auto): 흰 원형 56×56, border-radius 999px, shadow `0 4px 14px rgba(120,84,30,.16)`. 내용은 스피커 SVG 라인 아이콘 26×26 (stroke #3a2f22, stroke-width 3.5). 이모지 🔊 사용 금지.
- "내 그림" 버튼: 흰 pill, 높이 56, padding 0 22px, 18px/800, 같은 shadow, 앞에 액자 SVG 아이콘 24×24. `white-space:nowrap; flex-shrink:0` 필수(줄바꿈 방지).

#### 카테고리 그룹 (4개)
각 그룹: 세로 flex gap 10px.
- 그룹 라벨 행: 색 점(10×10 원, 그룹 dot 색) + 라벨 텍스트 15px/800/opacity .55, `white-space:nowrap; flex-shrink:0`.
- 카드 그리드: `display:grid; grid-template-columns:repeat(auto-fill, minmax(180px,1fr)); gap:14px`.

그룹 정의:
| 그룹 | dot (라벨 점·하단 띠) | tint (아이콘 타일 배경) | 아이콘 stroke |
|---|---|---|---|
| 창작 | #ff8a3d | #fff0e0 | #e8762a |
| 쓰기 준비 | #7fd18a | #e9f7ea | #4da55c |
| 생각 놀이 | #7ab8f2 | #e8f1fc | #4d84c4 |
| 곧 나와요 | #c9b88f | #f6efe2 | #a08b5f |

#### 활동 카드
- 흰 배경, border-radius 22px, shadow `0 4px 14px rgba(120,84,30,.14)`, padding `16px 12px 14px`, 세로 flex 중앙 정렬 gap 6px, `position:relative; overflow:hidden`.
- 아이콘 타일: 74×74, border-radius 22px, 배경 = 그룹 tint, 중앙에 46×46 SVG 아이콘.
- 이름: 18px / 800. 설명: 12px / 700 / opacity .55.
- 하단 색 띠: 카드 맨 아래 절대배치, 높이 5px, 배경 = 그룹 dot, opacity .55.
- 눌림 상태(:active): `transform:scale(.96)`, transition `transform .12s ease` (기존 .card 패턴).
- 잠금 카드(모양 분류): opacity .5 + 배지 "곧 나와요" (11px/800, 배경 #efe3cb, pill, padding 3px 10px).

#### 카드 목록 (그룹 순서대로)
- 창작: 색칠하기 "펜으로 자유롭게" · 내 사진 색칠 "내 사진이 밑그림으로"
- 쓰기 준비: 따라 그리기 "점선 따라 쓱쓱" · 한글 쓰기 "ㄱ ㄴ ㄷ 획순" · 이름 쓰기 "우리 가족 이름" · 숫자 쓰기 "1부터 100까지" · 영어 쓰기 "A B C 획순"
- 생각 놀이: 미로 찾기 "길을 그어 탈출" · 점 잇기 "이으면 그림이!" · 조각 퍼즐 "맞추면 그림 완성!" · 세어보기 "몇 개일까?" · 다른 그림 찾기 "눈썰미 대결"
- 곧 나와요: 모양 분류 "끌어다 담기" (locked)

주의: 기존 ACTIVITIES의 `coloring`/`photo` 진입 id 매핑은 유지하되, "내 사진 색칠"은 현재 색칠하기 내부 기능(coloring/photopage.js)이므로 홈 카드로 승격 시 진입 배선이 필요하다 — 구현 시 판단.

## Icons (SVG, 이모지 대체)
공통 포맷: `viewBox="0 0 48 48" fill="none" stroke="<그룹 stroke색>" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"`. 프로토타입에서는 data URI + background-image로 썼지만, 실제 구현은 인라인 `<svg>` 권장.

| 활동 | 아이콘 내용 (path) |
|---|---|
| 색칠하기 | 붓: `M37 9c2 2 3 5 1 7L23 31l-6-6L32 10c2-2 3-3 5-1z` + `M17 26c-3 1-5 3-6 6-1 3-2 4-4 5 4 2 9 1 12-2 2-2 2-5 1-7z` |
| 내 사진 색칠 | 카메라: rect(6,15,36,25,r5) + circle(24,27,7) + `M17 15l3-5h8l3 5` |
| 따라 그리기 | 점선 물결: `M6 32c6-12 12 10 18-2s6-8 18-8` (stroke-dasharray 6 5) |
| 한글 쓰기 | 글자 "가" (text 24px/800, x18 y30, fill=stroke색) + 연필 `M30 38l9-9 4 4-9 9-5 1z` + 점선 `M8 41h14` (dasharray 4 4) |
| 이름 쓰기 | 명찰: rect(6,13,36,23,r6) + circle(16,24,4) + `M25 20h11M25 28h7` |
| 숫자 쓰기 | 글자 "12" + 연필 + 점선 (한글 쓰기와 동일 구성) |
| 영어 쓰기 | 글자 "Ab" + 연필 + 점선 (동일 구성) |
| 미로 찾기 | 나선: `M24 25c0-3 5-3 5 0 0 4-10 4-10 0 0-8 15-8 15 0 0 10-20 10-20 0 0-13 25-13 25 0` |
| 점 잇기 | circle(10,36,3.5)+circle(24,12,3.5)+circle(38,32,3.5) + 점선 `M12 32l10-16m4 1l10 12` (dasharray 4 4) |
| 조각 퍼즐 | 퍼즐 조각: `M10 15h9a5 5 0 1 1 10 0h9v8a5 5 0 1 0 0 10v8h-9a5 5 0 1 0-10 0h-9v-8a5 5 0 1 1 0-10z` |
| 세어보기 | 과일 2개: circle(14,31,7)+circle(32,31,7) + 꼭지 `M14 24v-7m18 7v-7m-18 0c2-2 4-2 6 0m10 0c2-2 4-2 6 0` |
| 다른 그림 찾기 | 돋보기: circle(20,20,11) + `M29 29l11 11` |
| 모양 분류 | rect(8,8,13,13,r3) + circle(35,14,7) + 삼각형 `M17 40l7-11 7 11z` |
| 소리 (헤더) | `M8 19v10h7l9 8V11l-9 8H8z` + `M30 18c3 3 3 9 0 12` + `M35 14c5 5 5 15 0 20` (stroke-width 3.5) |
| 내 그림 (헤더) | rect(5,9,38,30,r6) + circle(16,19,3.5) + `M9 35l9-9 8 8 7-8 10 11` (stroke-width 3.5) |

## Interactions & Behavior
- 카드 탭: 기존과 동일 — `sfx.tap()` → `show(id)` → `ACTIVITY_APPS[id].enter(id)`. locked 카드는 toast "아직 준비 중이에요" (이모지 없이).
- 소리 버튼: 기존 토글 로직 유지. 음소거 시 스피커 아이콘을 소거선 버전으로 교체하고 opacity .45 (`.chip-icon.is-off` 패턴). 이모지 🔇/🔊 대신 SVG 두 상태.
- 카드 :active scale(.96). 별도 hover 상태 불필요(터치 기기).
- 스크롤: 그룹 나열 영역만 세로 스크롤 (`-webkit-overflow-scrolling:touch`).
- **줄바꿈 금지**: h1, 그룹 라벨, "내 그림" 버튼에 `white-space:nowrap` (+flex 안에서는 `flex-shrink:0`) — 없으면 min-content로 수축해 글자가 세로로 깨진다(프로토타입에서 실제 발생).

## State Management
새 상태 없음. 기존 `isMuted()` / ACTIVITIES ready 플래그 재사용. ACTIVITIES 배열에 `group` 필드를 추가하고 buildHome()에서 그룹별로 묶어 렌더하는 방식을 권장.

## Design Tokens
- 색: 배경 그라디언트 #ffe3b0→#fdf1d6 · 잉크 #3a2f22 · 카드 #fff · 배지 #efe3cb · 그룹 색은 위 표 참고 · 기존 --accent #ff8a3d는 창작 그룹 dot과 동일.
- 그림자: 카드 `0 4px 14px rgba(120,84,30,.14)`, 헤더 버튼 `0 4px 14px rgba(120,84,30,.16)`.
- radius: 카드 22 · 아이콘 타일 22 · pill 999.
- 타이포: h1 34/800 · 부제 15/700 · 그룹 라벨 15/800 · 카드명 18/800 · 카드 설명 12/700 · 배지 11/800.
- 간격: 화면 좌우 32 · 그룹 간 18 · 카드 gap 14 · 카드 min 폭 180 · 터치 타겟 ≥56px (기존 --tap 68 원칙 준수).

## Assets
외부 에셋 없음. 모든 아이콘은 위 표의 인라인 SVG로 생성 (저장소의 이모지 사용을 전면 대체).

## Files
- `홈 v2.dc.html` — 최종 홈 화면 디자인 (이 번들에 포함)
- `현재 UI.dc.html` — 기존 UI 재현본 (비교용, 포함)
- 저장소 참조: `index.html` (screen-home 마크업), `css/app.css` (.home-head/.grid/.card/.chip), `js/main.js` (ACTIVITIES, buildHome)
