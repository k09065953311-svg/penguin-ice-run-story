// ペンギン・アイスラン ストーリー: オフラインでも遊べるようにする簡易サービスワーカー
// ゲームを更新したら、下の CACHE_NAME の数字を上げてください(古いキャッシュが消えます)。
const CACHE_NAME = 'penguin-story-v3';
const ASSETS = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  // ランキング(Firebase)やフォントなど、他のサイトへの通信にはさわらない(古い順位が出るのを防ぐ)
  if (new URL(event.request.url).origin !== self.location.origin) return;
  // 通信できるときは最新を取りに行き、できないときだけキャッシュを使う(更新がすぐ届く)
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(event.request))
  );
});
