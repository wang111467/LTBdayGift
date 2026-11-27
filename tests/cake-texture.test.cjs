const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

// Inspect the image URL assigned by the real loader without needing a WebGL device.
function loadTexture() {
  const window = {};
  class Image { set src(value) { this.url = value; } get src() { return this.url; } }
  vm.runInNewContext(fs.readFileSync(require.resolve('../js/galaxy-cake-assets.js'), 'utf8'), { window, Image, Promise });
  return window;
}

test('cake texture is self-contained when the HTML is opened as a local file', () => {
  const window = loadTexture();
  const url = new URL(window.__cakeSideImage.src, 'file:///birthday/html/BirthdayCake.html');
  assert.equal(url.protocol, 'data:', 'A local-file WebGL texture must not require a separate file-origin image');
  const encoded = window.__cakeSideImage.src.split(',')[1];
  assert.deepEqual(Buffer.from(encoded, 'base64'), fs.readFileSync(require.resolve('../img/galaxy-cake/cake-side.png')));
});

test('cake readiness waits until the embedded image has loaded', async () => {
  const window = loadTexture();
  let ready = false;
  window.__cakeSideReady.then(() => { ready = true; });
  await Promise.resolve();
  assert.equal(ready, false);
  window.__cakeSideImage.onload();
  await window.__cakeSideReady;
  assert.equal(ready, true);
});
