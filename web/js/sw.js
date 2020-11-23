'use strict'

const version = 1;

self.addEventListener('install', onInstall)
self.addEventListener('activate', onActivate)

main().catch(console.error)

async function main() {
  console.log(`worker v${version} is starting`)
}

async function onInstall(event) {
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
