# Handoff: 하이츄 — 홈+서브 화면 리디자인 (v2)

## 이번 업데이트 요약 (옵시디언용)

### 2026-08-21 업데이트
- **도구 트레이 아이콘 확정: 2a "말랑 채움"** — 도구 10종(크레용·색연필·붓·마커·무지개·반짝이·꽃·물감통·스티커·지우개)을 도구별 제 색을 입힌 면(SVG) 아이콘으로 전면 교체. 이모지 사용 금지.
- **버튼 눌림/선택 효과 통일** — 이동·리프트 없이 `배경 #fff3df + 테두리 2px #ff8a3d`만으로 표시 (트레이·단계 칩·손잡이 카드 공통).
- **손잡이 설정 추가 (홈)** — 헤더에 설정(톱니) 버튼 → 오버레이에서 왼손/오른손 선택. `localStorage['haichu.hand']`에 저장.
- **손잡이별 레이아웃 반전** — 쥐는 손 **반대쪽**에 버튼 배치: 오른손잡이 → 버튼 왼쪽·오른쪽 하단은 빈 공간(팜 레스트), 왼손잡이 → 좌우 반전.
- **서브 화면 하단 트레이 재배치** — 버튼을 한쪽으로 몰고 반대쪽은 터치 요소 없는 "손 쉼터"로 비움. 구현 시 해당 영역은 palm rejection(터치 무시) 권장.

## Overview
하이츄(3~6세 아이패드 학습놀이 PWA)의 홈 + 서브 화면(색칠하기·따라 그리기 러너·조각 퍼즐) 리디자인.
대상 저장소: `stepersjmj-hash/baby` (main) — 바닐라 JS + CSS, 빌드 도구 없음. 주 수정 파일: `index.html`, `css/app.css`, `js/main.js`, `js/coloring/*`, `js/trace/*`.

## About the Design Files
동봉된 `.dc.html`은 HTML 디자인 레퍼런스(프로토타입)다. 복사해 쓰는 코드가 아니라 기존 코드베이스 패턴(클래스 CSS + buildHome() 등)으로 재구현할 것.

## Fidelity
High-fidelity. 색·타이포·간격·SVG path 모두 최종값.

## 공통 디자인 토큰
- 배경: `radial-gradient(120% 90% at 50% 0%, #ffe3b0 0%, #fdf1d6 60%)` · 잉크 `#3a2f22` · 카드/트레이 `#fff` · 버튼 타일 `#f6efe2`
- **선택/눌림 상태 (공통 규칙)**: `background:#fff3df; border:2px solid #ff8a3d` — transform·그림자 변화 없음
- 그룹 색: 창작 `#ff8a3d` / 쓰기 준비 `#7fd18a` / 생각 놀이 `#7ab8f2` / 곧 나와요 `#c9b88f`
- 아이콘 타일 tint: `#fff0e0` / `#e9f7ea` / `#e8f1fc` / `#f6efe2`, 라인 아이콘 stroke: `#e8762a` / `#4da55c` / `#4d84c4` / `#a08b5f`
- 그림자: 카드 `0 4px 14px rgba(120,84,30,.14)` · 헤더 버튼 `.16`
- radius: 카드 22 · 타일 16~22 · pill 999 · 터치 타겟 ≥56px
- 글꼴: 기존 스택 유지 (`-apple-system, …, 'Apple SD Gothic Neo', 'Pretendard', 'Malgun Gothic', system-ui, sans-serif`)

## 홈 화면 (screen-home)
구조: 헤더 / 카테고리 그룹 스크롤 영역 / 푸터(install-hint).

### 헤더
- 제목 "무엇을 하고 놀까?" 34px/800/-0.8px + 부제 "오늘도 재미있게 놀아 보자!" 15px/700/op .5 — 모두 `white-space:nowrap`
- 버튼 3개(모두 흰 원형/pill 56px, shadow .16): **설정(톱니 SVG)** · 소리(스피커 SVG) · 내 그림(액자 SVG + 텍스트, `flex-shrink:0`)
- **손잡이 반전**: 오른손(기본) → `flex-direction:row-reverse` (버튼 왼쪽, 제목 오른쪽 `text-align:right`) / 왼손 → `row` (버튼 오른쪽)

### 카테고리 그룹
- 그룹 라벨: 색 점 10px 원 + 15px/800/op .55 텍스트, `white-space:nowrap; flex-shrink:0`
- 카드 그리드: `repeat(auto-fill, minmax(180px,1fr))`, gap 14
- 카드: 흰 배경 r22, 아이콘 타일 74×74 r22(그룹 tint) + 46×46 SVG, 이름 18/800, 설명 12/700 op .55, 하단 5px 그룹색 띠 op .55, :active `scale(.96)`
- 잠금 카드: op .5 + 배지 "곧 나와요" (11/800, bg #efe3cb)

### 카드 목록
- 창작: 색칠하기 · 내 사진 색칠
- 쓰기 준비: 따라 그리기 · 한글 쓰기 · 이름 쓰기 · 숫자 쓰기 · 영어 쓰기
- 생각 놀이: 미로 찾기 · 점 잇기 · 조각 퍼즐 · 세어보기 · 다른 그림 찾기
- 곧 나와요: 모양 분류 (locked)

### 설정 오버레이 (신규)
- 딤: `rgba(58,47,34,.45)`, 바깥 탭으로 닫힘
- 패널: `#fffdf7`, r28, shadow `0 24px 60px rgba(58,47,34,.35)`, padding 32/36, 폭 560 (max 90vw)
- 제목 "설정" 26/800 + 닫기 ✕ (48px 원형, bg #f6efe2)
- 질문 "어느 손으로 그려요?" 16/800 op .6
- 왼손/오른손 카드 2개 (flex:1, r22, padding 20 12 16): 손 SVG 52px (왼손은 `scaleX(-1)`) + 라벨 20/800 + 설명 13/700 op .55 ("버튼이 오른쪽/왼쪽으로 가요")
- 선택 상태: `bg #fff3df + border 3px #ff8a3d`, 비선택: `bg #f6efe2 + border transparent`
- 하단 안내: "쥐는 손 반대쪽에 버튼을 모아, 손바닥이 닿아도 눌리지 않아요." 13/700 op .45

### 손잡이 로직
```js
// 저장
localStorage.setItem('haichu.hand', 'left' | 'right'); // 기본 'right'
// 규칙: 버튼은 쥐는 손 반대쪽
// right → 헤더 row-reverse(버튼 왼쪽) · 서브 트레이 버튼 왼쪽 정렬, 오른쪽 팜 레스트
// left  → 헤더 row(버튼 오른쪽) · 서브 트레이 버튼 오른쪽 정렬, 왼쪽 팜 레스트
```
> **[구현 시 변경 · 2026-08-21] 홈 헤더는 반대로 간다.**
> 위 규칙(오른손 → 헤더 버튼 왼쪽)은 **서브 화면에만** 적용했다.
> 홈은 그리는 화면이 아니라 손바닥을 얹을 일이 없는데, 버튼만 반대쪽 끝으로
> 보내면 손을 뻗어야 해서 오히려 불편하다는 사용자 피드백 → **홈은 쥐는 손 쪽**
> (오른손 → 버튼 오른쪽). 서브 화면의 팜 레스트 규칙은 명세 그대로 유지.
> 설정 카드 문구도 "버튼이 ○쪽으로 가요" → "○쪽에 손을 얹어요" 로 바꿨다
> (두 화면의 버튼 위치가 반대라 한쪽에는 거짓말이 되므로).

body에 `data-hand="left|right"` 어트리뷰트를 걸고 CSS로 분기하는 방식 권장. 팜 레스트 영역은 `pointer-events:none` 또는 touchstart 무시로 palm rejection.

## 서브 화면 공통 레이아웃 (색칠하기 / 따라 그리기 러너 / 조각 퍼즐)
- 3단: 상단 트레이(흰 배경, border-bottom #e9dcc4) / 종이 스테이지 / 하단 트레이(흰 배경, border-top #e9dcc4)
- 종이: `#fffdf7`, r14, shadow `0 10px 30px rgba(120,84,30,.22)`, 상단 마스킹테이프 스트립 `repeating-linear-gradient(90deg, transparent 0 26px, rgba(150,120,80,.20) 26px 44px)` 높이 16
- 하단 트레이 버튼: 68×68 r20 타일(bg #f6efe2) + 32×32 SVG 아이콘. 그룹 간 세로 구분선 `2px × 44px #e9dcc4`
- **손잡이 배치**: 버튼 전체를 쥐는 손 반대쪽으로 몰고, 나머지는 `flex:1` 빈 공간(팜 레스트)

### 색칠하기
- 상단: 도구 트레이 10종 (58×68, r16, 세로 아이콘 32px + 라벨 10/800 op .55) + 우측에 굵기 3개(52×52, 점 12/22/34px) + 현재 색 표시(68px 원)
- 하단: 홈 · 되돌리기 · 다시하기(비활성 op .3) | 구분선 | 쓸어내기(채움 게이지) · 저장 · "다른 그림" pill
- **도구 아이콘 = 2a 말랑 채움** (viewBox 0 0 48 48, 면 채움):

| 도구 | SVG 내용 |
|---|---|
| 크레용 | `<path d="M19 17h10v21a5 5 0 0 1-10 0z" fill="#ff5a5a"/><path d="M19 17l5-9 5 9z" fill="#e03131"/><rect x="19" y="26" width="10" height="6" fill="#ffd3d3"/>` |
| 색연필 | `<path d="M30 8l10 10-18 18-14 4 4-14z" fill="#ffc94d"/><path d="M12 26l10 10-14 4z" fill="#f2d9b0"/><path d="M9 39l3-1-2-2z" fill="#5a4b34"/><path d="M30 8l10 10 3-3c2-2 2-5 0-7s-5-2-7 0z" fill="#ff8fc4"/>` |
| 붓 | `<path d="M36 7c3 2 4 6 1 9L24 29l-7-7L30 9c2-2 4-3 6-2z" fill="#4a90ff"/><path d="M17 22c-4 1-6 4-7 8-1 3-1 4-4 6 5 2 10 1 13-2 3-3 3-8-2-12z" fill="#f7a45c"/>` |
| 마커 | `<rect x="18" y="14" width="12" height="22" rx="3" fill="#6b6b6b"/><path d="M20 14l2-8h4l2 8z" fill="#3f3f3f"/><path d="M20 36l4 6 4-6z" fill="#3f3f3f"/><rect x="18" y="22" width="12" height="6" fill="#9a9a9a"/>` |
| 무지개 | `<g fill="none" stroke-linecap="round"><path d="M9 37a15 15 0 0 1 30 0" stroke="#ff5a5a" stroke-width="5"/><path d="M15 37a9 9 0 0 1 18 0" stroke="#ffc94d" stroke-width="5"/><path d="M21 37a3 3 0 0 1 6 0" stroke="#4fd06b" stroke-width="5"/></g>` |
| 반짝이 | `<path d="M21 6l3.5 9.5L34 19l-9.5 3.5L21 32l-3.5-9.5L8 19l9.5-3.5z" fill="#ffd166"/><path d="M36 26l2 5.5 5.5 1.5L38 35l-2 5.5L34 35l-5.5-2 5.5-1.5z" fill="#ffe6a3"/>` |
| 꽃 | `<g fill="#ff8fc4"><circle cx="24" cy="12" r="7"/><circle cx="35.5" cy="20.5" r="7"/><circle cx="31" cy="34" r="7"/><circle cx="17" cy="34" r="7"/><circle cx="12.5" cy="20.5" r="7"/></g><circle cx="24" cy="24" r="6" fill="#ffd166"/>` |
| 물감통 | `<path d="M10 16h28l-3 24a4 4 0 0 1-4 4H17a4 4 0 0 1-4-4z" fill="#46cfe0"/><ellipse cx="24" cy="16" rx="14" ry="5" fill="#2fb3c4"/><path d="M13 12a11 9 0 0 1 22 0" stroke="#2fb3c4" stroke-width="4" fill="none" stroke-linecap="round"/>` |
| 스티커 | `<path d="M24 6l5.5 11.2L42 19l-9 8.8 2 12.2L24 34.2 13 40l2-12.2L6 19l12.5-1.8z" fill="#ffd166" stroke="#f0b429" stroke-width="2" stroke-linejoin="round"/>` |
| 지우개 | `<rect x="8" y="17" width="32" height="17" rx="8.5" fill="#e8e14d"/><g fill="#cfc93a"><circle cx="16" cy="24" r="2"/><circle cx="26" cy="29" r="2"/><circle cx="33" cy="23" r="2"/><circle cx="21" cy="21" r="1.5"/></g>` |

### 따라 그리기 러너 (한글·숫자·영어·선긋기 공용)
- 상단: 단계 칩 (64×68 r16) — 글자 26/800 + 이름 10/800 + 난이도 색 띠 3px (쉬움 #7fd18a / 보통 #ffc94d / 어려움 #ff8a6b) + 완료 별 배지(우상단 18px)
- 스테이지: 넓은 가이드 트랙 `#f0e7d3` 58px + 점선 중심선 `#cbb896` (dasharray 7 17) + 무지개 진행(#ff6f3d→#ffb02e→#ffe14d 42px) + 시작점 번호 원(#ff8a3d 24px r) + 현재 위치 연필 마커 + 끝점 별
- 하단: 홈 · 되돌리기 · 읽어주기 | 구분선 | 이전(비활성 op .3) · 현재 글자 19/800 · 다음

### 조각 퍼즐 (미로·점잇기·세어보기·찾기 공용)
- 상단: 단계 칩 (64×68) — 그림 썸네일 38×28 r8 + 이름 + 완료 별
- 스테이지: 3×2 보드 (gap 8, r12) — 채워진 칸은 그라디언트, 빈 칸은 `3px dashed #cbb896 + bg #f6efe2`; 아래에 흩어진 조각 2개 (rotate ±5~7°, shadow)
- 하단: 홈 · 되돌리기 | 구분선 | 이전 · 제목 · 다음

## 헤더/하단 공통 SVG 아이콘 (stroke #5a4b34 또는 #3a2f22, w3.5, round)
- 설정(톱니): `<circle cx="24" cy="24" r="6.5"/><path d="M24 4l2.6 5.4 5.9-1 2.1 5.6 5.9 1-1 5.9L44 24l-4.5 3.1 1 5.9-5.9 1-2.1 5.6-5.9-1L24 44l-2.6-5.4-5.9 1-2.1-5.6-5.9-1 1-5.9L4 24l4.5-3.1-1-5.9 5.9-1 2.1-5.6 5.9 1z"/>`
- 소리: `M8 19v10h7l9 8V11l-9 8H8z` + `M30 18c3 3 3 9 0 12` + `M35 14c5 5 5 15 0 20`
- 내 그림: rect(5,9,38,30,r6) + circle(16,19,3.5) + `M9 35l9-9 8 8 7-8 10 11`
- 홈: `M8 22L24 8l16 14v16a3 3 0 0 1-3 3H11a3 3 0 0 1-3-3z` + `M19 41V29h10v12`
- 되돌리기: `M14 19h16a9 9 0 1 1 0 18h-7` + `M20 11l-8 8 8 8` (다시하기는 미러)
- 쓸어내기: `M33 6L23 24` + `M23 24c-7-2-13 3-14 10l17 6c4-4 4-11-3-16z` + `M17 32l-2 6m8-4l-2 6`
- 저장: rect(8,8,32,32,r6) + `M24 16v14m-6-5l6 6 6-6`
- 읽어주기: `M38 8v26l-20-6h-6a4 4 0 0 1-4-4v-6a4 4 0 0 1 4-4h6z` + `M18 30l4 11`
- 이전/다음: `M30 10L16 24l14 14` / `M18 10l14 14-14 14` (w4.5)
- 손(설정 오버레이): `M17 22V10a3 3 0 0 1 6 0v10m0-8a3 3 0 0 1 6 0v10m0-7a3 3 0 0 1 6 0v11c0 9-5 15-13 15-6 0-9-3-12-9l-4-8c-1-2 0-4 2-5s4 0 5 2l4 6` (왼손 = scaleX(-1), w3)
- 별 배지: `M24 4l6.2 12.5L44 18.5l-10 9.7 2.4 13.7L24 35.4 11.6 41.9 14 28.2 4 18.5l13.8-2z` fill #ffd166 stroke #e0a93e
- 홈 카드용 그룹색 라인 아이콘 path는 `홈 v2.dc.html` 로직 참고 (그대로 옮기면 됨)

## Interactions
- 카드/버튼 탭: 기존 `sfx.tap()` → 진입 로직 유지. locked 카드는 toast "아직 준비 중이에요"
- 선택 표시: 위 공통 규칙 (bg #fff3df + border #ff8a3d, 무이동)
- 소리 토글: 음소거 시 소거선 스피커 + op .45
- 줄바꿈 금지: h1·그룹 라벨·"내 그림"에 `white-space:nowrap` (+`flex-shrink:0`) — 없으면 세로로 깨짐 (실측)

## State
- `haichu.hand` (localStorage, 'left'|'right', 기본 'right') — 신규
- 기존 isMuted() / ACTIVITIES ready 플래그 재사용. ACTIVITIES에 `group` 필드 추가 후 buildHome()에서 그룹별 렌더 권장

## Files
- `홈 v2.dc.html` — 홈 (설정 오버레이·손잡이 반전 포함)
- `서브화면 v2.dc.html` — 색칠하기 / 따라 그리기 러너 / 조각 퍼즐
- `현재 UI.dc.html` — 기존 UI 재현본 (비교용)
