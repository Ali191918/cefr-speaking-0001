// Oddiy xizmat ishchisi: ilovani o'rnatish uchun kerak, keshlamaydi.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});
