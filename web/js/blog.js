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

    navigator.serviceWorker.addEventListener("controllerchange", function onControllerChange() {
      serviceWorker = navigator.serviceWorker.controller
    })
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
  }

  function updateIcon(status) {
    isOnline = status
    if (isOnline) {
      offlineIcon.classList.add("hidden")
    } else {
      offlineIcon.classList.remove("hidden")
    }
  }
})()
