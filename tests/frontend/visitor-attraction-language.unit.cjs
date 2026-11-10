'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const I18n = require('../../frontend/hue-i18n.js');

const source = fs.readFileSync(
  path.join(__dirname, '../../frontend/app.js'),
  'utf8'
);
const loader = source.slice(
  source.indexOf('let attractionLoadVersion = 0;'),
  source.indexOf('async function loadStaffAttractions()')
);
const refresh = source.slice(
  source.indexOf('function refreshVisitorAttractionDetail()'),
  source.indexOf('function detail(id, recordView = true)')
);

function setup(savedLanguage = 'vi', responder) {
  const document = new EventTarget();
  const modal = { hidden: false };
  const detailElement = { innerHTML: '' };
  document.querySelector = () => detailElement;
  const calls = [];
  const displayed = [];
  const renders = [];
  const places = [];
  const state = {
    trackId: 'second',
    mapId: 'second',
    page: 'explore',
    playing: false
  };
  const api = I18n.create({
    storage: {
      getItem() {
        return savedLanguage;
      },
      setItem() {}
    },
    doc: document,
    win: { CustomEvent }
  });
  api.init();
  const context = vm.createContext({
    window: { HueI18n: api },
    document,
    IS_ADMIN: false,
    places,
    state,
    attractionApi: {},
    heritageGalleryState: { slug: 'second', index: 0 },
    $(selector) {
      assert.equal(selector, '#modal');
      return modal;
    },
    detail(id, recordView) {
      displayed.push({ id, recordView });
    },
    render() {
      renders.push(places.map(place => place.name));
    },
    narrationLanguage() {
      return 'vi';
    },
    apiItems(payload) {
      return payload.data;
    },
    validHuePoint() {
      return true;
    },
    cleanApiText(value) {
      return String(value ?? '');
    },
    publishedImageMedia() {
      return [];
    },
    publishedAudioMedia() {
      return [];
    },
    async fetchJson(url) {
      calls.push(url);
      const parsed = new URL(url, 'http://fixture.invalid');
      const language = parsed.searchParams.get('language');
      if (responder) {
        await responder(parsed);
      }
      const actual = language === 'fr' ? 'vi' : language;
      const rows = ['first', 'second'].map((slug, index) => ({
        id: index + 1,
        slug,
        name: `${actual}-${slug}`,
        description: `${actual}-description-${slug}`,
        latitude: 16.4,
        longitude: 107.6,
        requested_language: language,
        content_language: actual,
        fallback_used: language !== actual,
        media: []
      }));
      if (parsed.pathname === '/api/v1/attractions') {
        return { data: rows, pagination: { total_pages: 1 } };
      }
      return { data: rows[Number(parsed.pathname.split('/').pop()) - 1] };
    },
    console
  });
  vm.runInContext(loader + refresh, context);
  return { api, context, places, calls, displayed, renders, modal, detailElement, state };
}

async function settle(run) {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (run.context.attractionApi.status === 'ready') {
      return;
    }
    await new Promise(resolve => setImmediate(resolve));
  }
  assert.fail('Language reload did not complete');
}

test('LANG08: initial load uses persisted i18n language for list and detail', async () => {
  const run = setup('en');
  await run.context.loadAttractionsFromBackend();
  assert.match(run.calls[0], /language=en/);
  assert.ok(run.calls.includes('/api/v1/attractions/2?language=en'));
  assert.equal(run.places.find(item => item.id === 'second').name, 'en-second');
  assert.equal(run.places[0].localizedNarrations.vi.description.startsWith('vi-'), true);
});

test('LANG08: real i18n vi -> en event reloads and retains open attraction', async () => {
  const run = setup();
  await run.context.loadAttractionsFromBackend();
  run.api.setCurrentLanguage('en');
  await settle(run);
  assert.equal(run.places.find(item => item.id === 'second').intro, 'en-description-second');
  assert.equal(run.displayed.at(-1).id, 'second');
  assert.equal(run.displayed.at(-1).recordView, false);
  assert.equal(run.state.mapId, 'second');
});

test('LANG08: Vietnamese fallback uses API metadata and shows explicit notice', async () => {
  const run = setup('fr');
  await run.context.loadAttractionsFromBackend();
  assert.equal(run.places[0].name, 'vi-first');
  assert.match(run.places[0].languageNotice, /role="status"/);
  assert.match(run.places[0].languageNotice, /tiếng Việt dự phòng/);
  assert.equal(run.context.attractionLanguageNotice({
    requested_language: 'en',
    content_language: 'en',
    fallback_used: false
  }), '');
});

test('LANG08: late old detail cannot overwrite latest language or open attraction', async () => {
  let release;
  let started;
  const delayed = new Promise(resolve => {
    release = resolve;
  });
  const entered = new Promise(resolve => {
    started = resolve;
  });
  const run = setup('en', async url => {
    if (url.pathname === '/api/v1/attractions/1'
        && url.searchParams.get('language') === 'en') {
      started();
      await delayed;
    }
  });
  const oldLoad = run.context.loadAttractionsFromBackend();
  await entered;
  run.api.setCurrentLanguage('fr');
  run.api.setCurrentLanguage('de');
  await settle(run);
  release();
  await oldLoad;
  assert.equal(run.places.find(item => item.id === 'second').name, 'de-second');
  assert.equal(run.displayed.at(-1).id, 'second');
  assert.equal(run.context.attractionApi.status, 'ready');
});

test('LANG08: failed Vietnamese detail keeps translated content and valid cached narration', async () => {
  let failVietnamese = false;
  const run = setup('vi', async url => {
    if (failVietnamese && url.pathname !== '/api/v1/attractions'
        && url.searchParams.get('language') === 'vi') {
      throw new Error('Synthetic Vietnamese detail failure');
    }
  });
  await run.context.loadAttractionsFromBackend();
  const narration = run.places.find(place => place.id === 'second').localizedNarrations.vi;
  failVietnamese = true;
  run.api.setCurrentLanguage('en');
  await settle(run);
  const selected = run.places.find(place => place.id === 'second');
  assert.equal(selected.name, 'en-second');
  assert.equal(selected.intro, 'en-description-second');
  assert.equal(selected.localizedNarrations.vi, narration);
  assert.equal(run.displayed.at(-1).id, 'second');
  assert.equal(run.context.attractionApi.status, 'ready');
});

test('LANG08: failed Vietnamese detail without cache does not invent narration or block content', async () => {
  const run = setup('en', async url => {
    if (url.searchParams.get('language') === 'vi') {
      throw new Error('Synthetic Vietnamese detail failure');
    }
  });
  await run.context.loadAttractionsFromBackend();
  assert.equal(run.context.attractionApi.status, 'ready');
  assert.equal(run.places[0].name, 'en-first');
  assert.equal(run.places[0].localizedNarrations.vi, undefined);
});

function installPlayback(run) {
  const spoken = [];
  const synth = {
    cancelCalls: 0,
    cancel() {
      this.cancelCalls++;
    },
    speak(utterance) {
      spoken.push(utterance);
    }
  };
  Object.assign(run.context, {
    speechSynthesisSafe() {
      return synth;
    },
    SpeechSynthesisUtterance: class {
      constructor(text) {
        this.text = text;
      }
    },
    byId(id) {
      return run.places.find(place => place.id === id);
    },
    publishedNarration(place) {
      return place.localizedNarrations.vi;
    },
    hueTtsSelectedVoice() {
      return { lang: 'vi-VN' };
    },
    hueTtsPrefs: { rate: 0.9 },
    hueGpsTour: {},
    trackEvent() {},
    updateDock() {},
    setInterval() {
      return 1;
    },
    clearInterval() {},
    timer: null,
    audioStarted: 0
  });
  run.state.audioLanguage = 'vi-VN';
  run.context.document.querySelectorAll = () => [];
  vm.runInContext(source.slice(
    source.indexOf('function playAudio()'),
    source.indexOf('function updateDock()')
  ), run.context);
  vm.runInContext(source.slice(
    source.indexOf('function stopAudio(update = true)'),
    source.indexOf('function speechSynthesisSafe()')
  ), run.context);
  return { synth, spoken };
}

for (const page of ['audio', 'explore']) {
  test(`LANG08: language reload preserves speech and renders latest content on end (${page})`, async () => {
    const run = setup();
    await run.context.loadAttractionsFromBackend();
    const { synth, spoken } = installPlayback(run);
    run.state.page = page;
    run.context.playAudio();
    const utterance = run.state.utterance;
    const renderCount = run.renders.length;
    const detailCount = run.displayed.length;
    run.api.setCurrentLanguage('en');
    await settle(run);
    assert.equal(run.renders.length, renderCount);
    assert.equal(run.displayed.length, detailCount);
    assert.equal(run.state.playing, true);
    assert.equal(run.state.utterance, utterance);
    assert.equal(utterance.text, 'vi-description-second');
    assert.equal(utterance.lang, 'vi-VN');
    assert.equal(synth.cancelCalls, 1);
    assert.equal(spoken.length, 1);
    utterance.onend();
    assert.equal(run.state.playing, false);
    assert.ok(run.renders.at(-1).includes('en-second'));
    assert.equal(run.renders.length, renderCount + 1);
    assert.equal(run.displayed.at(-1).id, 'second');
  });
}

test('LANG08: manual stop also flushes pending language content', async () => {
  const run = setup();
  await run.context.loadAttractionsFromBackend();
  installPlayback(run);
  run.context.playAudio();
  const renderCount = run.renders.length;
  run.api.setCurrentLanguage('en');
  await settle(run);
  run.context.stopAudio();
  assert.equal(run.state.playing, false);
  assert.equal(run.renders.length, renderCount + 1);
  assert.ok(run.renders.at(-1).includes('en-second'));
  assert.equal(run.displayed.at(-1).id, 'second');
});
