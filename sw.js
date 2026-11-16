// 오프라인 지원: 네트워크 우선, 실패하면 캐시.
// 앱 파일은 매번 서버에 "바뀌었나요?"를 물어봄(cache: 'no-cache') — GitHub Pages 의 10분 저장 표시 때문에
// 홈 화면 앱이 예전 화면을 계속 보여 주는 일을 막음.
const CACHE = 'family-home-v22';
const SHARED = new URL('../our-family/stickers-shared.js', self.location).pathname; // 우리가족 앱과 같이 쓰는 스티커 파일
const POKE = new URL('../our-family/poke', self.location).pathname; // 포켓몬 방(poke-room.js)과 포켓몬 그림(poke/)도 같이 씀
const PING = new URL('../our-family/ping/', self.location).pathname; // 💖 아린 방 티니핑 그림
const OK_ORIGINS = ['https://www.gstatic.com', 'https://fonts.googleapis.com', 'https://fonts.gstatic.com'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['./', 'index.html', 'manifest.webmanifest', 'favicon.png', 'icon-180.png', 'icon-192.png', 'icon-512.png', 'firebase-config.js',
    'avatar-family.png', 'avatar-mom.png', 'avatar-dad.png', 'avatar-davin.png', 'avatar-arin.png', '../our-family/stickers-shared.js', '../our-family/poke-room.js'])));
  self.skipWaiting();
});
self.addEventListener('activate', (e) => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k.startsWith('family-home-v') && k !== CACHE) await caches.delete(k);
  await self.clients.claim();
})()));
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || (u.origin !== location.origin && !OK_ORIGINS.includes(u.origin))) return;
  const own = u.origin === location.origin;
  if (own && u.pathname !== SHARED && !u.pathname.startsWith(POKE) && !u.pathname.startsWith(PING) && !u.pathname.startsWith(new URL('./', self.registration.scope).pathname)) return; // 다른 앱(우리가족 등)은 건드리지 않음 (공통 스티커 파일만 예외)
  const net = (own ? fetch(u.href, { cache: 'no-cache' }) : fetch(e.request)).then((r) => {
    if (r.ok) { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {}); }
    return r;
  });
  e.waitUntil(net.catch(() => {}));
  e.respondWith((async () => {
    const first = await Promise.race([net.catch(() => null), new Promise((res) => setTimeout(() => res('slow'), 3000))]);
    if (first && first !== 'slow') return first;
    const saved = await caches.match(e.request, { ignoreSearch: own });
    return saved || net;
  })());
});
