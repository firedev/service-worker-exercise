;
(function Blog() {
  'use strict'

  var offlineIcon
  var isLoggedIn = /isLoggedIn=1/.test(document.cookie.toString() || '')
  var isOnline = 'onLine' in navigator ? navigator.onLine : true

  document.addEventListener("DOMContentLoaded", ready, false)

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
    offlineIcon.style.display = isOnline ? 'none' : 'block'
  }
})()
