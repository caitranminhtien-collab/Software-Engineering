'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root=path.resolve(__dirname,'..');
const frontend=fs.readFileSync(path.join(root,'frontend/app.js'),'utf8');
const app=fs.readFileSync(path.join(root,'src/app.ts'),'utf8');
test('M2.8 frontend calls protected GPS suggestion API, only on user action',()=>{
  assert.match(frontend,/function enableGPS\(\)/);
  assert.match(frontend,/requestNearbyGpsSuggestions\(position\)/);
  assert.match(frontend,/fetch\('\/api\/v1\/location-suggestions'/);
  assert.match(frontend,/authorization|Authorization/);
  assert.match(frontend,/accuracy_m:/);
  assert.match(frontend,/sampled_at:/);
});
test('M2.8 GPS panel shows manual selection and does not trigger audio',()=>{
  const panel=frontend.slice(frontend.indexOf('function renderNearbyGpsPanel()'),frontend.indexOf('async function requestNearbyGpsSuggestions'));
  assert.match(panel,/data-detail/);
  assert.doesNotMatch(panel,/playAudio\(|synth\.speak\(/);
  assert.match(panel,/chọn di tích thủ công|chọn thủ công/);
});
test('M2.8 backend retains all core API mounts',()=>{
  for (const route of ['/api/v1/attractions','/api/v1/routes','/api/v1/location-suggestions','/api/v1/chat','/api/v1/visitor-events','/api/v1/staff/analytics']) {
    assert.ok(app.includes(route),`Missing ${route}`);
  }
});
