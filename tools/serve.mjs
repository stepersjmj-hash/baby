/* ============================================================
   serve.mjs — 개발용 정적 서버 (윈도우 / macOS 동일하게 동작)
   ------------------------------------------------------------
   실행:  node tools/serve.mjs [포트]

   파이썬 대신 노드를 쓰는 이유
     · macOS 12.3 부터 `python` 명령이 없다 (`python3` 뿐). 노드는 양쪽 동일.
     · ES 모듈은 .js 의 Content-Type 이 text/javascript 여야 로드된다.
     · 캐시를 꺼서 "고쳤는데 왜 안 바뀌지?" 를 원천 차단한다.

   시작할 때 아이패드에서 칠 주소(LAN IP)를 찍어 준다.
   ============================================================ */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.argv[2]) || 8123;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.woff2': 'font/woff2', '.mp3': 'audio/mpeg', '.wav': 'audio/wav',
  '.txt': 'text/plain; charset=utf-8', '.md': 'text/plain; charset=utf-8'
};

http.createServer((req, res) => {
  let rel;
  try { rel = decodeURIComponent(new URL(req.url, 'http://x').pathname); }
  catch { res.writeHead(400).end('bad url'); return; }
  if (rel.endsWith('/')) rel += 'index.html';

  const file = path.join(ROOT, rel);
  // 루트 밖으로 빠져나가는 경로 차단
  if (!file.startsWith(ROOT)) { res.writeHead(403).end('forbidden'); return; }

  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('없는 파일: ' + rel); return; }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-store, must-revalidate',
      'Service-Worker-Allowed': '/'
    });
    res.end(buf);
  });
}).listen(PORT, '0.0.0.0', () => {
  const ips = Object.values(os.networkInterfaces()).flat()
    .filter(i => i && i.family === 'IPv4' && !i.internal).map(i => i.address);
  console.log(`\n  이 컴퓨터에서   http://localhost:${PORT}`);
  for (const ip of ips) console.log(`  아이패드에서    http://${ip}:${PORT}`);
  console.log('\n  (같은 와이파이여야 합니다. 사파리에서 열고 공유 → 홈 화면에 추가)\n');
});
