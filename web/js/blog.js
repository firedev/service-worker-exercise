(function Blog(global) {
  let offlineIcon
  let isLoggedIn = /isLoggedIn=1/.test(document.cookie.toString() || '')
  let isOnline = 'onLine' in navigator ? navigator.onLine : true

  // const usingSW = ('serviceWorker' in navigator)
  let swRegistration;
  let serviceWorker;

  function isBlogOnline() {
    return isOnline
  }

  global.isBlogOnline = isBlogOnline

  function sendSWMessage(msg, target) {
    if (target) {
      target.postMessage(msg)
    } else if (serviceWorker) {
      serviceWorker.postMessage(msg)
    } else if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage(msg)
    } else {
      // eslint-disable-next-line no-console
      console.warn(msg, 'is discarded')
    }
  }

  function sendStatusUpdate(target) {
    sendSWMessage({
      statusUpdate: {
        isOnline,
        isLoggedIn,
      },
    }, target)
  }

  function onSWMessage(event) {
    const {
      data,
    } = event
    if (data.requestStatusUpdate) {
      sendStatusUpdate(event.ports && event.ports[0])
    } else if (data === 'force-logout') {
      document.cookie = 'isLoggedIn='
      isLoggedIn = false
      sendStatusUpdate()
    }
  }

  async function initServiceWorker() {
    swRegistration = await navigator.serviceWorker.register('/sw.js', {
      updateViaCache: 'none',
    })

    serviceWorker = swRegistration.installing || swRegistration.waiting || swRegistration.active
    sendStatusUpdate(serviceWorker)

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      serviceWorker = navigator.serviceWorker.controller
      sendStatusUpdate(serviceWorker)
    })
    navigator.serviceWorker.addEventListener('message', onSWMessage)
  }

  function updateIcon(status) {
    isOnline = status
    if (isOnline) {
      offlineIcon.classList.add('hidden')
      sendStatusUpdate(serviceWorker)
    } else {
      offlineIcon.classList.remove('hidden')
      sendStatusUpdate(serviceWorker)
    }
  }

  function ready() {
    offlineIcon = document.getElementById('connectivity-status')
    updateIcon(isOnline)
    window.addEventListener('online', () => {
      updateIcon(true)
    })
    window.addEventListener('offline', () => {
      updateIcon(false)
    })
    sendStatusUpdate()
  }

  // eslint-disable-next-line no-console
  initServiceWorker().catch(console.error)
  document.addEventListener('DOMContentLoaded', ready, false)
}(window))
