let cacheName = "fill";
let filesToCache = [
    "/",
    "/index.html",
    "/index.js",
    "/index.css"
];

self.addEventListener("install", async (e) => {
    await e.waitUntil(
        await (await caches.open(cacheName)).addAll(filesToCache)
    );
});

self.addEventListener("fetch", async (e) => {
    // cache first
    let response = await caches.match(e.request);
    if(response) {
        return response;
    }

    try{
        // network second
        response = await fetch(e.request);
        
        await (await caches.open(cacheName)).put(e.request, response.clone());

        return response;
    }catch{
        return new Response("Network error happend", {
            status: 408,
            headers: {
                "Content-Type": "text/plain"
            }
        });
    }
});
