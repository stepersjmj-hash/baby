/* ============================================================
   make-music.mjs — NAS 노래 목록 생성기 (맥 전용)
   ------------------------------------------------------------
   NAS 의 music 폴더(/Volumes/mjuploads/music)에 올려 둔 노래 파일을
   앱이 읽을 수 있는 목록(list.js)으로 만든다:

     node tools/make-music.mjs

   결과: <NAS>/music/list.js — window.HAICHU_MUSIC = [{name, file}, …]

   ★ 왜 목록 파일이 필요한가 — **브라우저는 남의 서버 폴더를 훑어볼 수
     없다**(보안). 파일 이름을 알 때 가져오는 것만 된다. 영상 보기는
     `1.mp4` 라는 번호 규칙이 있어서 앱이 세어 볼 수 있지만, 노래는
     파일명이 곧 제목이라 규칙이 없다 — 그래서 이름만은 NAS 가 알려 줘야
     한다. 목록을 `<script>` 로 읽으므로 CORS 설정도 필요 없다
     (영상 보기의 list.js·색칠 도안과 같은 요령).

   노래를 더 넣거나 지웠으면 이 한 줄만 다시 돌리면 된다.
   ============================================================ */

import { readdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const SRC = '/Volumes/mjuploads/music';
const EXT = /\.(mp4|m4a|mp3)$/i;          // mp4(노래 영상)·m4a·mp3 다 된다

if (!existsSync(SRC)) {
  console.error(`NAS 가 안 붙어 있다: ${SRC}\n파인더에서 smb://mjj 로 mjuploads 를 연결한 뒤 다시 돌릴 것.`);
  process.exit(1);
}

const songs = readdirSync(SRC)
  .map(f => f.normalize('NFC'))            // 맥은 한글 파일명을 NFD 로 준다
  .filter(f => EXT.test(f) && !f.startsWith('.') && !f.startsWith('_'))
  .sort((a, b) => a.localeCompare(b, 'ko', { numeric: true }))
  .map(f => ({ name: f.replace(EXT, ''), file: f }));

writeFileSync(join(SRC, 'list.js'), `window.HAICHU_MUSIC=${JSON.stringify(songs)};\n`);

console.log(`노래 ${songs.length}곡 → ${SRC}/list.js`);
for (const s of songs) console.log(`  · ${s.name}`);
