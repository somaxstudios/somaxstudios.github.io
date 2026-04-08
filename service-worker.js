// NOVO service-worker.js - Versão Anti-Cache

// 📦 INSTALAÇÃO
self.addEventListener("install", event => {
  // Instala imediatamente, sem esperar fechar as abas antigas
  self.skipWaiting();
});

// 🔄 ATIVAÇÃO (O Matador de Caches)
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          console.log("Deletando cache antigo do celular do usuário:", key);
          // Deleta TODOS os caches que o Chrome salvou até hoje
          return caches.delete(key);
        })
      );
    })
  );
  // Toma o controle da página imediatamente
  self.clients.claim();
});

// 🌐 FETCH (Sempre Rede, Nunca Cache)
self.addEventListener("fetch", event => {
  // Ignora chamadas de extensão do Chrome
  if (event.request.url.startsWith("chrome-extension://")) {
    return;
  }
  
  // Obriga o navegador a sempre buscar o arquivo direto da internet (GitHub)
  event.respondWith(fetch(event.request));
});
