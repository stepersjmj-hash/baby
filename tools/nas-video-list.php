<?php
/* ============================================================
   nas-video-list.php — 영상 폴더 목록을 앱에 알려 준다
   ------------------------------------------------------------
   이 파일을 NAS 의 video 폴더에 **list.php** 라는 이름으로 둔다:

     <NAS>/mjimage/upload/video/list.php   ← 이 파일
     <NAS>/mjimage/upload/video/한글용사/1.mp4 …
     <NAS>/mjimage/upload/video/뽀로로/1.mp4 …

   그러면 폴더만 만들면 앱 목록에 나온다 — 손으로 적을 것이 없다.

   앱은 이걸 <script> 로 부른다. fetch 가 아니라 script 라서 CORS 헤더가
   필요 없다 (js/video/index.js 참고). list.php 가 없으면 list.js 를
   찾으므로, PHP 를 못 쓰는 환경에서는 list.js 를 손으로 두면 된다.

   Synology: 제어판 → 웹 서비스(Web Station)에서 PHP 를 켜 두어야 한다.
   ============================================================ */

header('Content-Type: application/javascript; charset=utf-8');
header('Cache-Control: no-store');

$names = [];
foreach (scandir(__DIR__) as $f) {
    if ($f === '.' || $f === '..' || $f[0] === '.' || $f === '@eaDir') continue;
    if (!is_dir(__DIR__ . '/' . $f)) continue;
    // 1.mp4 가 있는 폴더만 = 실제 시리즈
    if (!is_file(__DIR__ . '/' . $f . '/1.mp4')) continue;

    // 편수도 같이 세어 준다 (앱이 안 세도 되니 그만큼 빨리 뜬다)
    $n = 0;
    while (is_file(__DIR__ . '/' . $f . '/' . ($n + 1) . '.mp4')) $n++;
    $names[] = ['name' => $f, 'count' => $n];
}
usort($names, fn($a, $b) => strcmp($a['name'], $b['name']));

echo 'window.HAICHU_VIDEOS = ' .
     json_encode($names, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . ';';
