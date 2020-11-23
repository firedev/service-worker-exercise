'use strict'

const version = 2

var isOnline = true
var isLoggedIn = false

self.addEventListener('install', onInstall)
self.addEventListener('activate', onActivate)
self.addEventListener('message', onMessage)

main().catch(console.error)

async function main() {
  await sendMessage({
    requestStatusUpdate: true
  })
}

async function sendMessage(msg) {
  var allClients = await clients.matchAll({
    includeUncontrolled: true
  })
  return Promise.all(
    allClients.map(function clientMsg(client) {
      var channel = new MessageChannel()
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
  await clients.claim()
  console.log(`worker v${version} is activated`)
}
