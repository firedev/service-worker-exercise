const version = 4

let isOnline = true
let isLoggedIn = false

const cacheName = `cache-${version}`
const urlsToCache = {
  loggedOut: [
    '/',
    '/about',
    '/contact',
    '/login',
    '/404',
    '/offline',
    '/css/style.css',
    '/js/blog.js',
    '/js/home.js',
    '/js/login.js',
    '/js/add-post.js',
    '/images/logo.gif',
    '/images/offline.png',
  ]
}

self.addEventListener('install', onInstall)
self.addEventListener('activate', onActivate)
self.addEventListener('message', onMessage)
self.addEventListener('fetch', onFetch)

main().catch(console.error)

async function main() {
  await sendMessage({
    requestStatusUpdate: true
  })
  await cacheLoggedOutFiles()
}

async function sendMessage(msg) {
  const allClients = await clients.matchAll({
    includeUncontrolled: true
  })
  return Promise.all(
    allClients.map(function clientMsg(client) {
      const channel = new MessageChannel()
      channel.port1.onmessage = onMessage
      return client.postMessage(msg, [channel.port2])
    })
  )
}

function onMessage({
  data
}) {
  if (data.statusUpdate) {
    ({
      isOnline,
      isLoggedIn
    } = data.statusUpdate)
    console.log(`Status update ${version}, online: ${isOnline}, loggedin: ${isLoggedIn}`)
  }
}

function onInstall(event) {
  console.log(`worker v${version} is installed`)
  self.skipWaiting()
}

async function onActivate(event) {
  event.waitUntil(handleActivation())
}

async function handleActivation() {
  await clearCaches()
  await clients.claim()
  await cacheLoggedOutFiles(true)
  console.log(`worker v${version} is activated`)
}

async function cacheLoggedOutFiles(forceReload = false) {
  const cache = await caches.open(cacheName)
  return Promise.all(
    urlsToCache.loggedOut.map(async function requestFile(url) {
      try {
        let res
        if (!forceReload) {
          res = await cache.match(url)
          if (res) return res
        }

        let fetchOptions = {
          method: 'GET',
          cache: 'no-cache', // cache busting
          credentials: 'omit', // cookies
        }
        res = await fetch(url, fetchOptions)
        if (res.ok) {
          // clone() is not needed here
          // needed to properly return response to browser
          await cache.put(url, res.clone())
        }
      } catch (error) {}
    })
  )
}

async function clearCaches() {
  const cacheNames = await caches.keys()
  const oldCacheNames = cacheNames.filter(function matchOldCache(cacheName) {
    if (/^cache-\d+$/.test(cacheName)) {
      let [, cacheVersion] = cacheName.match(/^cache-(\d+)$/)
      cacheVersion = (cacheVersion != null) ? Number(cacheVersion) : 0
      return (
        cacheVersion > 0 && cacheVersion != version
      )
    }
  })
  return Promise.all(
    oldCacheNames.map(function deleteCache(cacheName) {
      return caches.delete(cacheName)
    })
  )
}

function onFetch(event) {
  event.respondWith(router(event.request))
}


function notFoundResponse() {
  return new Response('', {
    status: 404,
    statusText: 'Not Found',
  })
}

async function router(req) {
  const url = new URL(req.url)
  const reqURL = url.pathname
  const cache = await caches.open(cacheName)

  // site own URL
  if (url.origin == location.origin) {
    // api?
    if (/^\/api\/.+$/.test(reqURL)) {
      let res
      if (isOnline) {
        try {
          const fetchOptions = {
            method: req.method,
            headers: req.headers,
            credentials: 'same-origin',
            cache: 'no-store',
          }
          res = await fetch(req.url, fetchOptions)
          if (res && res.ok) {
            if (req.method === 'GET') {
              await cache.put(reqURL, res.clone())
            }
            return res;
          }
        } catch (error) {}
      }

      res = await cache.match(reqURL)
      if (res) return res
      return notFoundResponse()
    }
    // page request
    if (req.headers.get('Accept').includes('text/html')) {
      // login-aware
      if (/^\/(?:login|logout|add-post)$/.test(reqURL)) {
        // TODO
      } else {
        // use 'network-and-cache'
        let res
        if (isOnline) {
          try {
            const fetchOptions = {
              method: req.method,
              headers: req.headers,
              cache: 'no-store',
            }
            res = await fetch(req.url, fetchOptions)
            if (res && res.ok) {
              if (!res.headers.get('X-Not-Found')) {
                await cache.put(reqURL, res.clone())
              }
              return res;
            }
          } catch (error) {}
        }
        // fetch failed try cache
        res = await cache.match(reqURL)
        if (res) {
          return res
        }
        // or return offline-friendly page
        return cache.match('/offline')
      }
    } else {
      // cache-first
      let res = await cache.match(reqURL)
      if (res) return res

      if (isOnline) {
        try {
          const fetchOptions = {
            method: req.method,
            headers: req.headers,
            cache: 'no-store',
          }
          res = await fetch(req.url, fetchOptions)
          if (res && res.ok) {
            await cache.put(reqURL, res.clone())
            return res
          }
        } catch (error) {}
      }

      // otherwise - 404
      return notFoundResponse()
    }
  }
  return notFoundResponse()
}
