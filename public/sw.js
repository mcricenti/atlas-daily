// Offline support: keep a copy of everything the app has loaded.
// Pages: try the network first so updates show up; files: use the saved copy, refresh it in the background.
const CACHE = 'atlas-daily-v1'

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(['./', 'geo/states-10m.json', 'geo/countries-50m.json'])),
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  const sameSite = url.origin === self.location.origin
  const fonts = url.host === 'fonts.googleapis.com' || url.host === 'fonts.gstatic.com'
  if (!sameSite && !fonts) return

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone()
          caches.open(CACHE).then((c) => c.put('./', copy))
          return res
        })
        .catch(() => caches.match('./')),
    )
    return
  }

  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(req)
      const fresh = fetch(req)
        .then((res) => {
          if (res.ok || res.type === 'opaque') cache.put(req, res.clone())
          return res
        })
        .catch(() => cached)
      return cached ?? fresh
    }),
  )
})
