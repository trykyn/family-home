// 오프라인 · 빠른 시작: 저장해 둔 것을 바로 보여 주고(기다리지 않음), 뒤에서 서버에 새 것이 있는지 받아 둠.
// 앱 화면(html · js)이 바뀌었으면 화면에 알려서, 아무도 안 만질 때 조용히 새로 고침 (GitHub Pages 10분 저장 표시 때문에 cache: 'no-cache').
const CACHE = 'family-home-v39';
const OF = (p) => new URL('../our-family/' + p, self.location).pathname;
const SHARED = [OF('stickers-shared.js'), OF('poke-room.js'), OF('mission-board.js'), OF('piggy-bank.js')]; // 우리가족 앱과 같이 쓰는 파일
const POKE = OF('poke/'), PING = OF('ping/'); // 포켓몬 · 티니핑 그림
const OK_ORIGINS = ['https://www.gstatic.com', 'https://fonts.googleapis.com', 'https://fonts.gstatic.com'];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await c.addAll(['./', 'index.html', 'manifest.webmanifest', 'favicon.png', 'icon-180.png', 'icon-192.png', 'icon-512.png', 'firebase-config.js',
      'avatar-family.png', 'avatar-mom.png', 'avatar-dad.png', 'avatar-davin.png', 'avatar-arin.png', ...SHARED].map((u) => new Request(u, { cache: 'reload' })));
    // 예전 저장소의 나머지(파이어베이스 · 글꼴 · 포켓몬/티니핑 그림)는 옮겨 옴 → 새 버전이 깔린 직후 인터넷 없이 켜도 로그인 · 그림이 됨
    for (const k of await caches.keys()) {
      if (!k.startsWith('family-home-v') || k === CACHE) continue;
      const old = await caches.open(k);
      for (const req of await old.keys()) if (!(await c.match(req))) { const r = await old.match(req); if (r) await c.put(req, r).catch(() => {}); }
    }
  })());
  self.skipWaiting();
});
self.addEventListener('activate', (e) => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k.startsWith('family-home-v') && k !== CACHE) await caches.delete(k);
  await self.clients.claim();
})()));
let told = 0;
function tellUpdated() { // 여러 파일이 한꺼번에 바뀌어도 한 번만
  if (Date.now() - told < 5000) return;
  told = Date.now();
  self.clients.matchAll({ type: 'window' }).then((cs) => cs.forEach((c) => c.postMessage('family-home-updated')));
}
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || (u.origin !== location.origin && !OK_ORIGINS.includes(u.origin))) return;
  const own = u.origin === location.origin;
  if (own && !SHARED.includes(u.pathname) && !u.pathname.startsWith(POKE) && !u.pathname.startsWith(PING) && !u.pathname.startsWith(new URL('./', self.registration.scope).pathname)) return; // 다른 앱(우리가족 등)은 건드리지 않음 (같이 쓰는 파일만 예외)
  const code = own && /(\/|\.html|\.js)$/.test(u.pathname); // 앱 화면 파일: 바뀌었는지 비교
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const saved = await cache.match(e.request, { ignoreSearch: own });
    const before = saved && code ? saved.clone().text() : null; // 화면에 넘기기 전에 미리 읽어 둠 (넘긴 뒤엔 못 읽음)
    const net = (own ? fetch(u.href, { cache: 'no-cache' }) : fetch(e.request)).then(async (r) => {
      if (r.ok) {
        if (before) { const [a, b] = await Promise.all([before, r.clone().text()]); if (a !== b) tellUpdated(); }
        await cache.put(e.request, r.clone());
      }
      return r;
    });
    if (saved) { e.waitUntil(net.catch(() => {})); return saved; } // 저장해 둔 것 바로 (인터넷이 느려도 기다리지 않음)
    return net;
  })());
});
