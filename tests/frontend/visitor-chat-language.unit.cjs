'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const I18n = require('../../frontend/hue-i18n.js');
const dictionary = require('../../frontend/hue-i18n-dict.js');

const source = fs.readFileSync(
  path.join(__dirname, '../../frontend/app.js'),
  'utf8'
);
const languageFlow = source.slice(
  source.indexOf('let attractionLoadVersion = 0;'),
  source.indexOf('async function loadAttractionsFromBackend()')
);
const chatRenderer = source.slice(
  source.indexOf('function renderChat()'),
  source.indexOf('function chatMessages()')
);
const initialization = source.slice(
  source.indexOf('syncVisitorNarrationLanguage();'),
  source.indexOf('// The ten curated slugs')
);
const locales = source.slice(
  source.indexOf('const narrationLocales = ['),
  source.indexOf('function narrationLanguage(')
);

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => {
    return `&#${character.charCodeAt(0)};`;
  });
}

function setup(language) {
  const document = new EventTarget();
  const notice = { hidden: false, textContent: '' };
  const input = { value: 'Unsent question', disabled: true };
  const history = [{ speaker: 'assistant', content: 'Existing answer' }];
  const pendingRequest = new Promise(() => {
    // Deliberately unresolved: language changes must leave the request alone.
  });
  const state = {
    page: 'chat',
    audioLanguage: 'vi-VN',
    playing: false,
    chat: history,
    chatBusy: true
  };
  document.querySelector = selector => {
    if (selector === '#chat-language-notice') {
      return notice;
    }
    if (selector === '#modal .hue-heritage-detail') {
      return null;
    }
    assert.fail(`Unexpected DOM access: ${selector}`);
  };
  const api = I18n.create({
    dict: dictionary,
    storage: {
      getItem() {
        return language;
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
    state,
    IS_ADMIN: false,
    attractionApi: {},
    input,
    pendingRequest,
    esc: escapeHtml,
    icon() {
      return '';
    },
    header() {
      return '';
    },
    chatMessages() {
      return '<p>Existing answer</p>';
    },
    render() {
      assert.fail('Language change must not rebuild the Chat page');
    },
    loadAttractionsFromBackend() {
      // Keep LANG08 reload wiring without making network requests.
    }
  });
  vm.runInContext(locales + languageFlow + initialization + chatRenderer, context);
  return { context, api, notice, input, state, history, pendingRequest };
}

for (const language of ['vi', 'en', 'zh', 'ja', 'ko', 'fr', 'de']) {
  test(`LANG10: saved ${language} renders the correct initial Chat notice`, () => {
    const run = setup(language);
    const html = run.context.renderChat();
    const noticeMarkup = html.match(/<p id="chat-language-notice"[^>]*>[\s\S]*?<\/p>/);
    assert.ok(noticeMarkup);
    assert.equal(/\shidden(?:\s|>)/.test(noticeMarkup[0]), ['vi', 'en'].includes(language));
    assert.ok(noticeMarkup[0].includes(escapeHtml(dictionary[language]['chat.languageLimit'])));
    assert.match(html, /Existing answer/);
    assert.match(html, /id="chat-input"[^>]*disabled/);
  });
}

test('LANG10: all seven dictionaries explicitly describe API limits and the vi request code', () => {
  for (const language of I18n.languages) {
    const message = dictionary[language.code]['chat.languageLimit'];
    assert.equal(typeof message, 'string');
    assert.ok(message.length > 30);
    assert.match(message, /vi/);
  }
  assert.match(dictionary.vi['chat.languageLimit'], /tiếng Việt và tiếng Anh/);
  assert.match(dictionary.en['chat.languageLimit'], /Vietnamese and English/);
});

test('LANG10: the real language listener only updates the notice and preserves Chat state', () => {
  const run = setup('en');
  for (const language of ['zh', 'ja', 'ko', 'fr', 'de', 'vi', 'en']) {
    run.api.setCurrentLanguage(language);
    assert.equal(run.notice.hidden, ['vi', 'en'].includes(language));
    assert.equal(run.notice.textContent, dictionary[language]['chat.languageLimit']);
    assert.equal(run.input.value, 'Unsent question');
    assert.equal(run.input.disabled, true);
    assert.equal(run.state.chat, run.history);
    assert.equal(run.state.chat[0].content, 'Existing answer');
    assert.equal(run.state.chatBusy, true);
    assert.equal(run.context.pendingRequest, run.pendingRequest);
  }
});
