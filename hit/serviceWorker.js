let cacheName = "hit";
let filesToCache = [
    "/games/hit/",
    "/games/hit/index.html",
    "/games/hit/index.js",
    "/games/hit/index.css"
];

self.addEventListener("install", (event) => {
    event.waitUntil(caches.open(cacheName).then((cache) => cache.addAll(filesToCache)));
});

self.addEventListener("fetch", (event) => {
    event.respondWith(
        fetch(event.request).then((response) => {
            let copy = response.clone();
            caches.open(cacheName)
            .then((cache) => {
                cache.put(event.request, copy);
            });
            return response;
        }).catch(() => {
            return caches.match(event.request).then((response) => {
                return response;
            })
        })
    );
});
