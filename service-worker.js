const CACHE='yug-mcq-jungle-paper14-rewrite-v2-6';
const A=['./','./index.html','./style.css','./app.js','./firebase-cloud.js','./data.js','./banner.jpg','./manifest.webmanifest','./icon-192.png','./icon-512.png','./logo-jungle.jpg'];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE).then(c=>c.addAll(A)))});
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;e.respondWith(fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r}).catch(()=>caches.match(e.request)))});
