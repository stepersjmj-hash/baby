/* ============================================================
   make-voice.mjs — 음성 팩 생성기 (맥 전용)
   ------------------------------------------------------------
   앱이 읽는 모든 문구를 데이터 모듈에서 자동으로 모아, macOS 의
   고품질 음성(유나/Samantha)으로 클립을 만든다:

     node tools/make-voice.mjs          # 없는 클립만 생성
     node tools/make-voice.mjs --force  # 전부 다시 생성

   결과: assets/voice/<문구>.m4a + manifest.json ("lang|문구" → 파일).
   앱(core/audio.js 의 say)은 매니페스트에 있으면 클립을 재생하고,
   없으면 기기 TTS 로 돌아간다.

   더 자연스러운 목소리로 바꾸려면: Airy Studio 같은 서비스에서 그
   문구를 생성해 받아서 **같은 파일명으로 덮어쓰면 끝** (m4a/mp3 뒤
   확장자만 지키면 된다 — mp3 로 바꿨다면 매니페스트도 같이 고칠 것).
   ============================================================ */

import { execFileSync } from 'node:child_process';
import { mkdirSync, existsSync, writeFileSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'assets', 'voice');
mkdirSync(OUT, { recursive: true });
const FORCE = process.argv.includes('--force');

const { HANGUL } = await import('../js/trace/hangul.js');
const { NUMBERS } = await import('../js/trace/numbers.js');
const { ENGLISH } = await import('../js/trace/english.js');
const { NAMES } = await import('../js/trace/names.js');
const { LEVELS, buildCount, COUNT_SAY, GAE } = await import('../js/count/levels.js');

/* ── 문구 모으기: say() 에 들어가는 텍스트와 정확히 같아야 한다 ── */
const KO = new Set(), EN = new Set();
for (const L of HANGUL) KO.add(L.say);                       // 기역 … 이
for (const L of NUMBERS) KO.add(L.name);                     // 1 … 100 (유나가 "칠"로 읽는다)
for (const L of ENGLISH) EN.add(L.name);                     // A … Z
for (const L of NAMES) {                                     // 이름 + 음절
  KO.add(L.say);
  for (const ch of Object.values(L.sylSay)) KO.add(ch);
}
KO.add('이름을 써 보자');                                     // 이름 쓰기 안내말
for (const L of LEVELS) {                                    // 세어보기
  KO.add(L.ask);
  const b = buildCount(L);                                   // 정답 문구는 씨앗으로 고정돼 있다
  KO.add(`${L.name.replace(/만$/, '')} ${GAE[b.answer - 1]}!`);
}
for (const w of COUNT_SAY) KO.add(w);

/* ── 파일명: 읽을 수 있게 문구 그대로 (특수문자만 -) ── */
const slug = (text, lang) =>
  (lang === 'en-US' ? 'en-' : '') +
  text.replace(/[^0-9A-Za-z가-힣]+/g, '-').replace(/^-|-$/g, '');

const jobs = [
  ...[...KO].map(t => ({ text: t, lang: 'ko-KR', voice: 'Yuna' })),
  ...[...EN].map(t => ({ text: t, lang: 'en-US', voice: 'Samantha' }))
];

/* ── 교체 파일(assets/voice-src/) ────────────────────────────
   TTS 사이트(Airy 등)에서 받은 wav/mp3 를 문구 이름으로 넣어 두면
   유나 대신 그 소리로 변환해 쓴다. 파일명은 문구 그대로면 된다:
     기역.wav · 주하이.wav · 사과가 몇 개일까.wav · en-A.wav
   (특수문자·공백은 알아서 맞춰 본다) */
import { readdirSync, statSync } from 'node:fs';
const SRC = join(ROOT, 'assets', 'voice-src');
const overrides = new Map();
if (existsSync(SRC))
  for (const f of readdirSync(SRC)) {
    // macOS 는 한글 파일명을 자소 분해(NFD)로 저장한다 — NFC 로 되돌려야 문구와 맞는다
    const mch = f.normalize('NFC').match(/^(.+)\.(wav|mp3|m4a|aiff|aif)$/i);
    if (mch) overrides.set(mch[1].replace(/[^0-9A-Za-z가-힣]+/g, '-').replace(/^-|-$/g, ''), join(SRC, f));
  }

const manifest = {};
let made = 0, kept = 0, swapped = 0;
for (const { text, lang, voice } of jobs) {
  const base = slug(text, lang);
  const file = base + '.m4a';
  manifest[`${lang}|${text}`] = file;
  const out = join(OUT, file);
  const ov = overrides.get(base);
  if (ov) {                                   // 교체 파일이 더 새로우면 변환해 덮어쓴다
    if (!existsSync(out) || statSync(ov).mtimeMs > statSync(out).mtimeMs || FORCE) {
      execFileSync('afconvert', ['-f', 'm4af', '-d', 'aac', '-b', '64000', ov, out]);
      swapped++;
    } else kept++;
    continue;
  }
  if (!FORCE && existsSync(out)) { kept++; continue; }
  const tmp = join(OUT, '_tmp.aiff');
  // -r 150: 아이가 따라 말할 수 있게 살짝 천천히
  execFileSync('say', ['-v', voice, '-r', '150', '-o', tmp, text]);
  execFileSync('afconvert', ['-f', 'm4af', '-d', 'aac', '-b', '64000', tmp, out]);
  rmSync(tmp, { force: true });
  made++;
}
writeFileSync(join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 1));
console.log(`클립 ${made}개 생성, 교체 ${swapped}개, ${kept}개 유지, 총 ${jobs.length}개 → assets/voice/`);
if (overrides.size) {
  const used = [...overrides.keys()].filter(k => jobs.some(j => slug(j.text, j.lang) === k));
  const unused = [...overrides.keys()].filter(k => !used.includes(k));
  if (unused.length) console.log('⚠ 문구와 안 맞는 교체 파일:', unused.join(', '));
}
