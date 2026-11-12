/* حسابداری شخصی مسعود — سرویس‌ورکر (کار بدون اینترنت)
   اگر فایل index.html را عوض کردی، عدد نسخه را اینجا بالا ببر تا گوشی نسخه‌ی جدید را بگیرد. */
const VERSION = "v33";
const CACHE = "hesab-" + VERSION;
const APP = ["./", "./index.html", "./manifest.json", "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png"];
const EXTERNAL = [
  "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js",
  "https://fonts.googleapis.com/css2?family=Lalezar&family=Vazirmatn:wght@400;600&display=swap"
];

self.addEventListener("install", (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await c.addAll(APP);
    self.skipWaiting();
    // کتابخانه‌ی اکسل و فونت‌ها: تلاش می‌کنیم ذخیره شوند؛ اگر اینترنت یا دسترسی به آن‌ها نبود، مشکلی ایجاد نمی‌شود
    EXTERNAL.forEach((u) => {
      const ctl = new AbortController();
      setTimeout(() => ctl.abort(), 8000);
      fetch(new Request(u, { mode: "no-cors" }), { signal: ctl.signal }).then((r) => c.put(u, r)).catch(() => {});
    });
  })());
});

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith("hesab-") && k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    // فایل‌های خود برنامه: اول اینترنت (برای به‌روزرسانی)، اگر نبود از حافظه
    e.respondWith((async () => {
      const c = await caches.open(CACHE);
      try {
        const r = await fetch(req);
        if (r && r.ok) c.put(req, r.clone());
        return r;
      } catch (err) {
        const hit = await c.match(req, { ignoreSearch: true });
        if (hit) return hit;
        if (req.mode === "navigate") return (await c.match("./index.html")) || (await c.match("./"));
        return Response.error();
      }
    })());
    return;
  }
  // فونت و کتابخانه‌ی اکسل: اول از حافظه
  if (/fonts\.(googleapis|gstatic)\.com$|cdnjs\.cloudflare\.com$/.test(url.hostname)) {
    e.respondWith((async () => {
      const c = await caches.open(CACHE);
      const hit = await c.match(req, { ignoreVary: true });
      if (hit) return hit;
      try {
        const r = await fetch(req);
        if (r && (r.ok || r.type === "opaque")) c.put(req, r.clone());
        return r;
      } catch (err) {
        return Response.error();
      }
    })());
  }
});
