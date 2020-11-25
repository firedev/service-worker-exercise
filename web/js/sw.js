/* eslint-disable prefer-arrow-callback */
const version = 6

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
  ],
}
async function safeRequest(reqURL, req, options, {
  cacheResponse,
  checkCacheFirst,
  checkCacheLast,
  useRequestDirectly,
} = {
  cacheResponse: false,
  checkCacheFirst: false,
  checkCacheLast: false,
  useRequestDirectly: false,
}) {
  const cache = await caches.open(cacheName);
  if (checkCacheFirst) {
    const cacheRes = await cache.match(reqURL);
    if (cacheRes) {
      return cacheRes;
    }
  }

  if (isOnline) {
    try {
      const res = useRequestDirectly ?
        await fetch(req, options) :
        await fetch(req.url, options);

      if (res && (res.ok || res.type === 'opaqueredirect')) {
        if (cacheResponse) {
          await cache.put(reqURL, res.clone());
        }
        return res;
      }
    } catch (err) {}
  }

  if (checkCacheLast) {
    const res = await cache.match(reqURL);
    if (res) {
      return res;
    }
  }
}

async function cacheLoggedOutFiles(forceReload = false) {
  const cache = await caches.open(cacheName);

  return Promise.all(
    urlsToCache.loggedOut.map(async function requestFile(url) {
      try {
        if (!forceReload) {
          const cacheRes = await cache.match(url);
          if (cacheRes) {
            return;
          }
        }

        const fetchOptions = {
          method: 'GET',
          cache: 'no-store',
          credentials: 'omit',
        };
        const res = await fetch(url, fetchOptions);
        if (res.ok) {
          cache.put(url, res);
        }
      } catch (err) {}
    }),
  );
}

function delay(ms) {
  return new Promise(function c(res) {
    setTimeout(res, ms);
  });
}

async function sendMessage(msg) {
  // eslint-disable-next-line no-undef
  const allClients = await clients.matchAll({
    includeUncontrolled: true,
  })
  return Promise.all(
    allClients.map(function clientMsg(client) {
      const channel = new MessageChannel()
      channel.port1.onmessage = onMessage
      return client.postMessage(msg, [channel.port2])
    }),
  )
}

async function main() {
  await sendMessage({
    requestStatusUpdate: true,
  })
  await cacheLoggedOutFiles()
}

function onMessage({
  data,
}) {
  if (data.statusUpdate) {
    ({
      isOnline,
      isLoggedIn,
    } = data.statusUpdate)
    // eslint-disable-next-line no-console
    console.log(`Status update ${version}, online: ${isOnline}, loggedin: ${isLoggedIn}`)
  }
}

function onInstall() {
  // eslint-disable-next-line no-console
  console.log(`worker v${version} is installed`)
  this.skipWaiting()
}

async function handleActivation() {
  await clearCaches()
  // eslint-disable-next-line no-undef
  await clients.claim()
  await cacheLoggedOutFiles(true)
  // eslint-disable-next-line no-console
  console.log(`worker v${version} is activated`)
}

async function onActivate(event) {
  event.waitUntil(handleActivation())
}

async function clearCaches() {
  const cacheNames = await caches.keys()
  const oldCacheNames = cacheNames.filter(function matchOldCache(cache) {
    if (/^cache-\d+$/.test(cache)) {
      let [, cacheVersion] = cache.match(/^cache-(\d+)$/)
      cacheVersion = (cacheVersion != null) ? Number(cacheVersion) : 0
      return (
        cacheVersion > 0 && cacheVersion !== version
      )
    }
    return false
  })
  return Promise.all(
    oldCacheNames.map(function deleteCache(cache) {
      return caches.delete(cache)
    }),
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
  const url = new URL(req.url);
  const reqURL = url.pathname;
  const cache = await caches.open(cacheName);

  // request for site's own URL?
  // eslint-disable-next-line no-restricted-globals
  if (url.origin === location.origin) {
    // are we making an API request?
    if (/^\/api\/.+$/.test(reqURL)) {
      const fetchOptions = {
        credentials: 'same-origin',
        cache: 'no-store',
      };
      const res = await safeRequest(reqURL, req, fetchOptions, {
        cacheResponse: false,
        checkCacheFirst: false,
        checkCacheLast: true,
        useRequestDirectly: true,
      });
      if (res) {
        if (req.method === 'GET') {
          await cache.put(reqURL, res.clone());
        }
        return res;
      }

      return notFoundResponse();
    }
    // are we requesting a page?
    if (req.headers.get('Accept').includes('text/html')) {
      // login-aware requests?
      if (/^\/(?:login|logout|add-post)$/.test(reqURL)) {
        if (reqURL === '/login') {
          if (isOnline) {
            const fetchOptions = {
              method: req.method,
              headers: req.headers,
              credentials: 'same-origin',
              cache: 'no-store',
              redirect: 'manual',
            };
            const res = await safeRequest(reqURL, req, fetchOptions);
            if (res) {
              if (res.type === 'opaqueredirect') {
                return Response.redirect('/add-post', 307);
              }
              return res;
            }
            if (isLoggedIn) {
              return Response.redirect('/add-post', 307);
            }
            const cacheRes = await cache.match('/login');
            if (cacheRes) {
              return cacheRes;
            }
            return Response.redirect('/', 307);
          }
          if (isLoggedIn) {
            return Response.redirect('/add-post', 307);
          }
          const res = await cache.match('/login');
          if (res) {
            return res;
          }
          return cache.match('/offline');
        }
        if (reqURL === '/logout') {
          if (isOnline) {
            const fetchOptions = {
              method: req.method,
              headers: req.headers,
              credentials: 'same-origin',
              cache: 'no-store',
              redirect: 'manual',
            };
            const res = await safeRequest(reqURL, req, fetchOptions);
            if (res) {
              if (res.type === 'opaqueredirect') {
                return Response.redirect('/', 307);
              }
              return res;
            }
            if (isLoggedIn) {
              isLoggedIn = false;
              await sendMessage('force-logout');
              await delay(100);
            }
            return Response.redirect('/', 307);
          }
          if (isLoggedIn) {
            isLoggedIn = false;
            await sendMessage('force-logout');
            await delay(100);
            return Response.redirect('/', 307);
          }
          return Response.redirect('/', 307);
        }
        if (reqURL === '/add-post') {
          if (isOnline) {
            const fetchOptions = {
              method: req.method,
              headers: req.headers,
              credentials: 'same-origin',
              cache: 'no-store',
            };
            const res = await safeRequest(reqURL, req, fetchOptions, {
              cacheResponse: true,
            });
            if (res) {
              return res;
            }
            const cachedRes = await cache.match(
              isLoggedIn ? '/add-post' : '/login',
            );
            if (cachedRes) {
              return cachedRes;
            }
            return Response.redirect('/', 307);
          }
          if (isLoggedIn) {
            const res = await cache.match('/add-post');
            if (res) {
              return res;
            }
            return cache.match('/offline');
          }
          const res = await cache.match('/login');
          if (res) {
            return res;
          }
          return cache.match('/offline');
        }
      }
      // otherwise, just use "network-and-cache"
      else {
        const fetchOptions = {
          method: req.method,
          headers: req.headers,
          cache: 'no-store',
        };
        const res = await safeRequest(reqURL, req, fetchOptions, {
          cacheResponse: false,
          checkCacheFirst: false,
          checkCacheLast: true,
        });
        if (res) {
          if (!res.headers.get('X-Not-Found')) {
            await cache.put(reqURL, res.clone());
          }
          return res;
        }

        // otherwise, return an offline-friendly page
        return cache.match('/offline');
      }
    }
    // all other files use "cache-first"
    else {
      const fetchOptions = {
        method: req.method,
        headers: req.headers,
        cache: 'no-store',
      };
      const res = await safeRequest(reqURL, req, fetchOptions, {
        cacheResponse: true,
        checkCacheFirst: true,
      });
      if (res) {
        return res;
      }

      // otherwise, force a network-level 404 response
      return notFoundResponse();
    }
  }
}

this.addEventListener('install', onInstall)
this.addEventListener('activate', onActivate)
this.addEventListener('message', onMessage)
this.addEventListener('fetch', onFetch)

// eslint-disable-next-line no-console
main().catch(console.error)
