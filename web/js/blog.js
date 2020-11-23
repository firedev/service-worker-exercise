;
(function Blog() {
  'use strict'

  var offlineIcon
  var isLoggedIn = /isLoggedIn=1/.test(document.cookie.toString() || '')
  var isOnline = 'onLine' in navigator ? navigator.onLine : true


  var usingSW = ("serviceWorker" in navigator)
  var swRegistration;
  var serviceWorker;

  initServiceWorker().catch(console.error)

  document.addEventListener("DOMContentLoaded", ready, false)

  async function initServiceWorker() {
    swRegistration = await navigator.serviceWorker.register("/sw.js", {
      updateViaCache: "none",
    })

    serviceWorker = swRegistration.installing || swRegistration.waiting || swRegistration.active
    sendStatusUpdate(serviceWorker)

    navigator.serviceWorker.addEventListener('controllerchange', function onControllerChange() {
      serviceWorker = navigator.serviceWorker.controller
      sendStatusUpdate(serviceWorker)
    })
    navigator.serviceWorker.addEventListener('message', onSWMessage)
  }

  function onSWMessage(event) {
    const {
      data
    } = event
    if (data.requestStatusUpdate) {
      sendStatusUpdate(event.ports && event.ports[0])
    }
  }

  function sendStatusUpdate(target) {
    sendSWMessage({
      statusUpdate: {
        isOnline,
        isLoggedIn
      }
    }, target)
  }

  function sendSWMessage(msg, target) {
    if (target) {
      target.postMessage(msg)
    } else if (serviceWorker) {
      serviceWorker.postMessage(msg)
    } else {
      navigator.serviceWorker.controller.postMessage(msg)
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

  function updateIcon(status) {
    isOnline = status
    if (isOnline) {
      offlineIcon.classList.add("hidden")
      sendStatusUpdate(serviceWorker)
    } else {
      offlineIcon.classList.remove("hidden")
      sendStatusUpdate(serviceWorker)
    }
  }
})()
