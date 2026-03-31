const CACHE_NAME = "catalogo-somax-v2";

// Arquivos essenciais (App Shell)
const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./favicon.ico",

  // JS
  "./js/app.js",

  // Ícones PWA
  "./image/icon-192.png",
  "./image/icon-512.png"
];

// 📦 INSTALAÇÃO
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log("Cacheando arquivos essenciais...");
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// 🔄 ATIVAÇÃO (limpa cache antigo)
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => {
            console.log("Removendo cache antigo:", key);
            return caches.delete(key);
          })
      );
    })
  );
  self.clients.claim();
});

// 🌐 FETCH (estratégia inteligente)
self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {

      // Se já estiver em cache → retorna
      if (cachedResponse) {
        return cachedResponse;
      }

      // Senão → busca da rede
      return fetch(event.request)
        .then(networkResponse => {

          // Salva no cache dinamicamente
          return caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });

        })
        .catch(() => {
          // Fallback offline (opcional)
          if (event.request.mode === "navigate") {
            return caches.match("./index.html");
          }
        });

    })
  );
});
