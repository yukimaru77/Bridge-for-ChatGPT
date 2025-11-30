// Injects a Translate button into ChatGPT assistant turns, pulls Markdown, sends it
// to the background translator, and replaces the message with translated HTML.

const ARTICLE_SELECTOR = 'article[data-turn="assistant"]';
const TOOLBAR_CLASS = 'gpt-translate-toolbar';
const BUTTON_CLASS = 'gpt-translate-button';
const NOTE_CLASS = 'gpt-translate-note';
const DEBUG_BOX_CLASS = 'gpt-translate-debug';
const COMPOSER_ACTIONS_SELECTOR = '.ms-auto.flex.items-center.gap-1\\.5, .flex.items-center.gap-2';
let md;
let hljsAvailable = false;
let katexAutoRenderAvailable = false;
let debugModeEnabled = false;
const ChatgptLikeMarkdownRenderer = {
  render(markdown) {
    initMarkdownIt();
    const wrapper = document.createElement('div');
    wrapper.className = 'gpt-render-root';
    const html = md ? md.render(markdown) : escapeHtml(markdown).replace(/\n/g, '<br />');
    wrapper.innerHTML = html;
    applyMath(wrapper);
    decorateCodeBlocks(wrapper);
    return wrapper;
  },
  appendToMessage(messageNode, markdown) {
    const el = this.render(markdown);
    messageNode.appendChild(el);
    return el;
  }
};
// Expose for debugging/embedding if needed.
if (typeof window !== 'undefined') {
  window.ChatgptLikeMarkdownRenderer = ChatgptLikeMarkdownRenderer;
}

start();

function start() {
  injectStyles();
  initHelpers();
  initMarkdownIt();
  injectPagePromptHook(); // run as early as possible in page context
  loadDebugMode().then(() => {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', scanAndObserve, { once: true });
    } else {
      scanAndObserve();
    }
    setupInjectToggle();
  });
}

function findComposerActions() {
  const audioButton =
    document.querySelector('button[aria-label="音声モードを開始する"]') ||
    document.querySelector('button[aria-label="音声入力ボタン"]');
  if (audioButton) {
    const byFlex = audioButton.closest('div.flex.items-center.gap-2');
    if (byFlex) return byFlex;
    const byMs = audioButton.closest('div.ms-auto.flex.items-center.gap-1\\.5');
    if (byMs) return byMs;
  }
  const candidates = Array.from(document.querySelectorAll('div.flex.items-center'));
  for (const node of candidates) {
    if (node.querySelector('button[aria-label="音声入力ボタン"], button[aria-label="音声モードを開始する"]')) {
      return node;
    }
  }
  return null;
}

function initMarkdownIt() {
  if (!md && typeof window !== 'undefined' && window.markdownit) {
    const utils = window.markdownit().utils;
    md = window.markdownit({
      html: false,
      linkify: true,
      breaks: true,
      typographer: false,
      langPrefix: 'hljs language-',
      highlight: (str, lang) => {
        if (hljsAvailable) {
          if (lang && window.hljs.getLanguage(lang)) {
            return window.hljs.highlight(str, { language: lang }).value;
          }
          try {
            return window.hljs.highlightAuto(str).value;
          } catch (error) {
            console.warn('[translator] highlight auto failed', error);
          }
        }
        return utils.escapeHtml(str);
      }
    });
    if (typeof window.markdownitKatex === 'function') {
      md.use(window.markdownitKatex);
    }
  }
}

function initHelpers() {
  hljsAvailable = typeof window !== 'undefined' && Boolean(window.hljs?.highlight);
  katexAutoRenderAvailable =
    typeof window !== 'undefined' && typeof window.renderMathInElement === 'function';
}

function scanAndObserve() {
  document.querySelectorAll(ARTICLE_SELECTOR).forEach(prepareArticle);

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (!(node instanceof HTMLElement)) continue;
        if (node.matches?.(ARTICLE_SELECTOR)) {
          prepareArticle(node);
        } else {
          node.querySelectorAll?.(ARTICLE_SELECTOR).forEach(prepareArticle);
        }
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

function prepareArticle(article) {
  if (article.dataset.gptTranslateReady === '1') return;
  article.dataset.gptTranslateReady = '1';

  const stylePosition = getComputedStyle(article).position;
  if (stylePosition === 'static') {
    article.style.position = 'relative';
  }

  const toolbar = buildToolbar(article);
  article.appendChild(toolbar);
}

function buildToolbar(article) {
  const toolbar = document.createElement('div');
  toolbar.className = TOOLBAR_CLASS;

  const button = document.createElement('button');
  button.type = 'button';
  button.className = BUTTON_CLASS;
  button.textContent = 'Translate';
  button.addEventListener('click', () => handleTranslate(article, button, toolbar));

  const note = document.createElement('span');
  note.className = NOTE_CLASS;
  note.textContent = '-> Japanese';

  toolbar.appendChild(button);
  toolbar.appendChild(note);

  if (debugModeEnabled) {
    const logButton = document.createElement('button');
    logButton.type = 'button';
    logButton.className = BUTTON_CLASS;
    logButton.textContent = 'Export log';
    logButton.addEventListener('click', () => handleExport(article, logButton));

    const geminiButton = document.createElement('button');
    geminiButton.type = 'button';
    geminiButton.className = BUTTON_CLASS;
    geminiButton.textContent = 'Gemini log';
    geminiButton.addEventListener('click', () => handleGeminiLog(article, geminiButton));

    toolbar.appendChild(logButton);
    toolbar.appendChild(geminiButton);
  }
  return toolbar;
}

async function handleTranslate(article, button, toolbar) {
  if (button.disabled) return;

  const target = findMessageBody(article);
  const markdown = (await copyAndReadClipboardMarkdown(article)) || extractMarkdown(target).trim();
  if (!markdown) return;

  const settings = await readSettings();
  const debugMode = Boolean(settings.useSample);
  const useGemini = Boolean(settings.geminiKey);

  button.disabled = true;
  const originalText = button.textContent;
  button.textContent = 'Translating...';

  try {
    // Try to copy the last assistant turn via ChatGPT's native copy button for debugging.
    tryCopyLastAssistantMarkdown();

    const result = await chrome.runtime.sendMessage(
      useGemini
        ? { type: 'translate-markdown-gemini', markdown }
        : { type: 'translate-markdown', markdown }
    );

    if (!result?.ok) {
      throw new Error(result?.error || 'Unknown translation error');
    }

    const translatedMd = String(result.translated || '').trim();
    target.dataset.gptLastMarkdown = translatedMd;
    console.log('[translator] translated markdown:', translatedMd);
    replaceBodyWithRendered(target, translatedMd);

    // Re-attach the toolbar in case the target replacement removed it.
    if (!article.contains(toolbar)) {
      article.appendChild(toolbar);
    }

    if (debugMode) {
      const finalHtml = target.innerHTML;
      upsertDebugBox(article, finalHtml);
      downloadHtml(finalHtml);
    }

    button.textContent = 'Translated';
  } catch (error) {
    console.error('[translator]', error);
    button.textContent = 'Retry';
  } finally {
    button.disabled = false;
    setTimeout(() => {
      if (button.textContent === 'Translated') {
        button.textContent = originalText;
      }
    }, 1500);
  }
}

async function handleExport(article, button) {
  if (button.disabled) return;
  const markdown = await copyAndReadClipboardMarkdown(article);
  if (!markdown) return;

  button.disabled = true;
  const original = button.textContent;
  button.textContent = 'Logging...';

  try {
    console.log('[translator] export markdown:', markdown);
    downloadFile('exported-markdown.md', markdown, 'text/markdown');
    try {
      await navigator.clipboard.writeText(markdown);
      button.textContent = 'Copied';
    } catch {
      button.textContent = 'Logged';
    }
  } finally {
    setTimeout(() => {
      button.disabled = false;
      button.textContent = original;
    }, 1200);
  }
}

async function handleGeminiLog(article, button) {
  if (button.disabled) return;
  const markdown = await copyAndReadClipboardMarkdown(article);
  if (!markdown) return;

  button.disabled = true;
  const original = button.textContent;
  button.textContent = 'Gemini...';

  try {
    const result = await chrome.runtime.sendMessage({
      type: 'translate-markdown-gemini',
      markdown
    });
    if (!result?.ok) throw new Error(result?.error || 'Gemini failed');
    console.log('[translator] gemini translated markdown:', result.translated);
    try {
      await navigator.clipboard.writeText(result.translated);
      button.textContent = 'Copied';
    } catch {
      button.textContent = 'Logged';
    }
  } catch (error) {
    console.error('[translator] gemini log error', error);
    button.textContent = 'Failed';
  } finally {
    setTimeout(() => {
      button.disabled = false;
      button.textContent = original;
    }, 1400);
  }
}

function findMessageBody(article) {
  return (
    article.querySelector('[data-message-author-role="assistant"] .markdown') ||
    article.querySelector('[data-message-author-role="assistant"]') ||
    article.querySelector('.markdown') ||
    article.querySelector('div[class*="markdown"]') ||
    article.querySelector('div[data-testid*="conversation-turn"]') ||
    article.firstElementChild ||
    article
  );
}

function extractMarkdown(target) {
  const clone = target.cloneNode(true);
  clone.querySelectorAll?.(`.${TOOLBAR_CLASS}`).forEach((el) => el.remove());
  return nodeToMarkdown(clone).replace(/\n{3,}/g, '\n\n').trim();
}

async function copyAndReadClipboardMarkdown(article) {
  try {
    const ok = clickCopyButtonOfArticle(article);
    if (!ok) return '';
    await new Promise((r) => setTimeout(r, 400));
    const text = await navigator.clipboard.readText();
    return text || '';
  } catch (error) {
    console.warn('[translator] clipboard read failed', error);
    return '';
  }
}

function nodeToMarkdown(node) {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent || '';
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return '';

  const tag = node.tagName.toLowerCase();
  const children = () => Array.from(node.childNodes).map(nodeToMarkdown).join('');

  switch (tag) {
    case 'br':
      return '\n';
    case 'p':
      return `${children()}\n\n`;
    case 'strong':
      return `**${children()}**`;
    case 'em':
      return `*${children()}*`;
    case 'code': {
      const text = node.textContent || '';
      if (node.parentElement?.tagName.toLowerCase() === 'pre') return text;
      return `\`${text}\``;
    }
    case 'pre': {
      const code = node.querySelector('code');
      const language = code?.className?.match?.(/language-([\w-]+)/)?.[1] || '';
      const codeText = code?.textContent || node.textContent || '';
      return `\`\`\`${language}\n${codeText}\n\`\`\`\n\n`;
    }
    case 'ul':
      return `${Array.from(node.children).map((li) => `- ${nodeToMarkdown(li).trim()}`).join('\n')}\n\n`;
    case 'ol':
      return `${Array.from(node.children)
        .map((li, index) => `${index + 1}. ${nodeToMarkdown(li).trim()}`)
        .join('\n')}\n\n`;
    case 'li':
      return children();
    case 'a': {
      const href = node.getAttribute('href') || '';
      return `[${children()}](${href})`;
    }
    case 'img': {
      const alt = node.getAttribute('alt') || '';
      const src = node.getAttribute('src') || '';
      return `![${alt}](${src})`;
    }
    case 'h1':
    case 'h2':
    case 'h3':
    case 'h4':
    case 'h5':
    case 'h6': {
      const level = Number(tag.replace('h', '')) || 1;
      return `${'#'.repeat(level)} ${children()}\n\n`;
    }
    default:
      return children();
  }
}

function markdownToHtml(markdown) {
  initMarkdownIt();
  if (md) {
    try {
      return md.render(markdown);
    } catch (error) {
      console.error('[translator] markdown-it render failed', error);
    }
  }
  return escapeHtml(markdown).replace(/\n/g, '<br />');
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function injectStyles() {
  if (!document.head) {
    document.addEventListener('DOMContentLoaded', injectStyles, { once: true });
    return;
  }
  if (document.head.querySelector('#gpt-translate-style')) return;

  const style = document.createElement('style');
  style.id = 'gpt-translate-style';
  style.textContent = `
    .${TOOLBAR_CLASS} {
      position: absolute;
      bottom: 8px;
      right: 8px;
      display: flex;
      align-items: center;
      gap: 8px;
      background: rgba(0, 0, 0, 0.04);
      padding: 6px 10px;
      border-radius: 9999px;
      backdrop-filter: blur(6px);
      z-index: 5;
    }
    .${BUTTON_CLASS} {
      background: #10a37f;
      color: #fff;
      border: none;
      border-radius: 6px;
      padding: 6px 10px;
      font-size: 12px;
      cursor: pointer;
    }
    .${BUTTON_CLASS}:disabled {
      opacity: 0.6;
      cursor: progress;
    }
    .${NOTE_CLASS} {
      color: #6b7280;
      font-size: 12px;
    }
    .${DEBUG_BOX_CLASS} {
      margin-top: 12px;
      border: 1px dashed #9ca3af;
      padding: 10px;
      border-radius: 8px;
      background: #f3f4f6;
      color: #111827;
      font-size: 12px;
      line-height: 1.4;
      overflow-x: auto;
      white-space: pre;
    }
    .gpt-render-root {
      width: 100%;
    }
    .gpt-code-block {
      background: #0f172a;
      color: #e2e8f0;
      border-radius: 12px;
      overflow: hidden;
      margin: 12px 0;
      border: 1px solid rgba(255,255,255,0.05);
      box-shadow: 0 4px 12px rgba(0,0,0,0.12);
    }
    .gpt-code-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 12px;
      background: rgba(255,255,255,0.04);
      color: #cbd5e1;
      font-family: ui-monospace, SFMono-Regular, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      font-size: 12px;
      line-height: 1.2;
      border-bottom: 1px solid rgba(255,255,255,0.06);
    }
    .gpt-code-lang {
      text-transform: lowercase;
      opacity: 0.8;
    }
    .gpt-code-copy {
      display: inline-flex;
      gap: 6px;
      align-items: center;
      background: rgba(255,255,255,0.08);
      color: #e2e8f0;
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 6px;
      padding: 5px 8px;
      font-size: 11px;
      cursor: pointer;
      transition: background 120ms ease, border-color 120ms ease;
    }
    .gpt-code-copy:hover {
      background: rgba(255,255,255,0.14);
      border-color: rgba(255,255,255,0.18);
    }
    .gpt-code-copy:active {
      background: rgba(255,255,255,0.2);
      border-color: rgba(255,255,255,0.26);
    }
    .gpt-code-body {
      position: relative;
      overflow: auto;
      padding: 12px;
      background: #0b1224;
    }
    .gpt-code-body pre {
      background: transparent !important;
      padding: 0;
      margin: 0;
      border: none;
      box-shadow: none;
      color: inherit;
      white-space: pre;
    }
    .gpt-math-block {
      background: transparent;
      color: inherit;
      padding: 8px 0;
      margin: 12px 0;
      border: none;
      box-shadow: none;
      overflow-x: auto;
    }
    .gpt-inject-toggle {
      height: 32px;
      min-width: 32px;
      padding: 0 10px;
      border-radius: 9999px;
      border: 1px solid rgba(0,0,0,0.12);
      background: #0f172a;
      color: #fff;
      font-size: 11px;
      font-weight: 700;
      cursor: pointer;
      transition: opacity 120ms ease, transform 120ms ease;
    }
    .gpt-inject-toggle:hover { opacity: 0.9; }
    .gpt-inject-toggle:active { transform: translateY(1px); }
    .gpt-translate-toggle {
      margin-top: 8px;
      height: 26px;
      padding: 0 10px;
      border-radius: 8px;
      border: 1px solid rgba(0,0,0,0.12);
      background: #e5e7eb;
      color: #111827;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
    }
    .gpt-translated-wrapper {
      margin-top: 6px;
      border: 1px dashed #111827;
      padding: 8px;
      border-radius: 8px;
      background: #0f172a;
      color: #e5e7eb;
    }
    .gpt-original-box {
      margin-bottom: 4px;
    }
    .gpt-translated-box {
      margin-top: 6px;
    }
  `;
  document.head.appendChild(style);
}

async function loadDebugMode() {
  try {
    const settings = await readSettings();
    debugModeEnabled = Boolean(settings.debugMode);
  } catch {
    debugModeEnabled = false;
  }
}

function readSettings() {
  return new Promise((resolve) => {
    const api = typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync;
    if (!api) {
      resolve({});
      return;
    }
    api.get(['useSample', 'geminiKey', 'geminiModel', 'debugMode'], (items) => resolve(items || {}));
  });
}

function upsertDebugBox(article, html) {
  const existing = article.querySelector(`.${DEBUG_BOX_CLASS}`);
  const box = existing || document.createElement('div');
  box.className = DEBUG_BOX_CLASS;
  box.textContent = html;
  if (!existing) {
    article.appendChild(box);
  }
}

function downloadHtml(html) {
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'translated.html';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function downloadFile(filename, text, mime) {
  const blob = new Blob([text], { type: mime || 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function tryCopyLastAssistantMarkdown() {
  try {
    const ok = clickCopyButtonOfArticle();
    if (!ok) return;
    await new Promise((r) => setTimeout(r, 300));
    const text = await navigator.clipboard.readText();
    console.log('[translator] copied assistant markdown:', text);
  } catch (error) {
    console.warn('[translator] copy-from-ui failed', error);
  }
}

function clickCopyButtonOfArticle(article) {
  const targetArticle = article || null;
  const inArticle =
    targetArticle?.querySelector?.('button[data-testid="copy-turn-action-button"]');
  if (inArticle) {
    inArticle.click();
    return true;
  }
  // Fallback to last assistant turn if none provided.
  const turns = document.querySelectorAll('article[data-testid^="conversation-turn-"]');
  const articles = Array.from(turns).reverse();
  const lastAssistant = articles.find((a) => a.querySelector('[data-message-author-role="assistant"]'));
  if (!lastAssistant) {
    console.warn('[translator] assistant turn not found');
    return false;
  }
  const copyBtn = lastAssistant.querySelector('button[data-testid="copy-turn-action-button"]');
  if (!copyBtn) {
    console.warn('[translator] assistant copy button not found');
    return false;
  }
  copyBtn.click();
  return true;
}

function applyMath(container) {
  if (!katexAutoRenderAvailable) return;
  try {
    window.renderMathInElement(container, {
      delimiters: [
        { left: '$$', right: '$$', display: true },
        { left: '\\[', right: '\\]', display: true },
        { left: '$', right: '$', display: false },
        { left: '\\(', right: '\\)', display: false }
      ]
    });
  } catch (error) {
    console.warn('[translator] KaTeX render failed', error);
  }
}

function replaceBodyWithRendered(target, markdown) {
  const rendered = ChatgptLikeMarkdownRenderer.render(markdown);
  target.innerHTML = '';
  target.appendChild(rendered);
}

function injectPagePromptHook() {
  if (window.__gpt_prompt_hooked) return;
  window.__gpt_prompt_hooked = true;
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('promptHook.js');
  script.onload = () => script.remove();
  script.onerror = (e) => console.warn('[translator] prompt hook load failed', e);
  (document.documentElement || document.head || document.body).appendChild(script);
}

// Bridge: page -> background (Gemini) -> page
window.addEventListener('message', async (event) => {
  if (event.source !== window) return;
  const data = event.data;
  if (!data || data.type !== 'gpt-translate-req' || !data.id || typeof data.text !== 'string') return;
  try {
    const resp = await chrome.runtime.sendMessage({
      type: 'translate-markdown-gemini',
      markdown: data.text,
      targetLang: 'en',
      sourceLang: 'auto'
    });
    window.postMessage(
      { type: 'gpt-translate-res', id: data.id, ok: Boolean(resp?.ok), text: resp?.translated || '', error: resp?.error },
      '*'
    );
  } catch (error) {
    window.postMessage(
      { type: 'gpt-translate-res', id: data.id, ok: false, error: error?.message || String(error) },
      '*'
    );
  }
});

// Receive original prompt (before EN translation) and render into last user turn after delay.
window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  const data = event.data;
  if (!data || data.type !== 'gpt-render-original' || typeof data.text !== 'string') return;
  renderOriginalAfterDelay(data.text, data.translated || '');
});

function setupInjectToggle() {
  insertInjectToggle();
  const observer = new MutationObserver(() => insertInjectToggle());
  observer.observe(document.body, { childList: true, subtree: true });
}

function insertInjectToggle() {
  const container = findComposerActions();
  if (!container) return;
  if (container.querySelector('.gpt-inject-toggle')) return;

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'gpt-inject-toggle';
  btn.textContent = isInjectionEnabled() ? 'Inject ON' : 'Inject OFF';
  btn.title = 'Toggle prompt injection';
  btn.addEventListener('click', () => {
    const next = !isInjectionEnabled();
    localStorage.setItem('gpt_inject_toggle', next ? 'on' : 'off');
    btn.textContent = next ? 'Inject ON' : 'Inject OFF';
    console.log('[translator] prompt injection', next ? 'enabled' : 'disabled');
  });

  container.appendChild(btn);
}

function findComposerActions() {
  const audioButton =
    document.querySelector('button[aria-label*="Voice"]') ||
    document.querySelector('button[aria-label*="音声"]') ||
    document.querySelector('button.composer-btn') ||
    document.querySelector('button[style*="vt-composer-speech-button"]');
  if (audioButton) {
    const byFlex = audioButton.closest('div.flex.items-center.gap-2');
    if (byFlex) return byFlex;
    const byMs = audioButton.closest('div.ms-auto.flex.items-center.gap-1\\.5');
    if (byMs) return byMs;
  }
  const candidates = Array.from(document.querySelectorAll('div.flex.items-center'));
  for (const node of candidates) {
    if (
      node.querySelector(
        'button[aria-label*="Voice"], button[aria-label*="音声"], button.composer-btn, button[style*="vt-composer-speech-button"]'
      )
    ) {
      return node;
    }
  }
  return null;
}

function isInjectionEnabled() {
  return localStorage.getItem('gpt_inject_toggle') !== 'off';
}

function renderOriginalAfterDelay(originalMd, translatedMd) {
  setTimeout(() => {
    try {
      const lastUser = findLastUserArticle();
      if (!lastUser) {
        console.warn('[translator] no user article found to render original');
        return;
      }
      // Prefer the user bubble container
      let target =
        lastUser.querySelector('.user-message-bubble-color') ||
        lastUser.querySelector('[data-message-author-role="user"] .user-message-bubble-color') ||
        lastUser.querySelector('[data-message-author-role="user"] .markdown:not(.sr-only)') ||
        lastUser.querySelector('[data-message-author-role="user"] div[class*="markdown"]:not(.sr-only)') ||
        lastUser.querySelector('.markdown:not(.sr-only)') ||
        lastUser.querySelector('div[class*="markdown"]:not(.sr-only)') ||
        lastUser.querySelector('[data-message-author-role="user"]') ||
        lastUser.firstElementChild ||
        lastUser;
      if (target && target.classList.contains('sr-only') && target.parentElement) {
        const alt =
          target.parentElement.querySelector('.user-message-bubble-color') ||
          target.parentElement.querySelector('.markdown:not(.sr-only)') ||
          target.parentElement.querySelector('div:not(.sr-only)');
        if (alt) target = alt;
      }
      console.log('[translator] will render original into:', target?.tagName, target?.className);
      console.log('[translator] original markdown:', originalMd);
      const originalRendered = ChatgptLikeMarkdownRenderer.render(originalMd);
      const translatedRendered = translatedMd
        ? ChatgptLikeMarkdownRenderer.render(translatedMd)
        : null;

      target.innerHTML = '';
      const originalBox = document.createElement('div');
      originalBox.className = 'gpt-original-box';
      originalBox.appendChild(originalRendered);

      if (translatedRendered) {
        const toggle = document.createElement('button');
        toggle.type = 'button';
        toggle.className = 'gpt-translate-toggle';
        toggle.textContent = 'Show EN';
        const translatedBox = document.createElement('div');
        translatedBox.className = 'gpt-translated-box';
        translatedBox.style.display = 'none';
        translatedBox.appendChild(translatedRendered);

        toggle.addEventListener('click', () => {
          const showing = translatedBox.style.display !== 'none';
          translatedBox.style.display = showing ? 'none' : 'block';
          originalBox.style.display = showing ? 'block' : 'none';
          toggle.textContent = showing ? 'Show EN' : 'Hide EN';
        });

        const wrapper = document.createElement('div');
        wrapper.className = 'gpt-translated-wrapper';
        wrapper.appendChild(toggle);
        wrapper.appendChild(translatedBox);
        target.appendChild(originalBox);
        target.appendChild(wrapper);
      } else {
        target.appendChild(originalBox);
      }

      console.log('[translator] rendered original markdown into last user turn');
    } catch (error) {
      console.warn('[translator] render original failed', error);
    }
  }, 3000);
}

function findLastUserArticle() {
  const selectors = [
    'article[data-turn="user"]',
    'article[data-message-author-role="user"]',
    'article[data-testid^="conversation-turn-"][data-message-author-role="user"]'
  ];
  for (const sel of selectors) {
    const nodes = Array.from(document.querySelectorAll(sel));
    if (nodes.length) return nodes[nodes.length - 1];
  }
  // Fallback: last article containing a user role div
  const articles = Array.from(document.querySelectorAll('article'));
  const filtered = articles.filter((a) =>
    a.querySelector('[data-message-author-role="user"]')
  );
  return filtered[filtered.length - 1] || null;
}

// Override decorateCodeBlocks with math handling and copy buttons.
function decorateCodeBlocks(container) {
  const blocks = container.querySelectorAll('pre > code');
  blocks.forEach((code) => {
    const pre = code.parentElement;
    if (!pre || pre.dataset.gptCopyReady === '1') return;
    pre.dataset.gptCopyReady = '1';

    const lang = (code.className.match(/language-([\w-]+)/) || [])[1] || 'text';

    // Render math code fences as KaTeX blocks instead of code widgets.
    if (['math', 'latex', 'tex'].includes(lang.toLowerCase()) && window.katex) {
      const mathBlock = document.createElement('div');
      mathBlock.className = 'gpt-math-block';
      try {
        window.katex.render(code.textContent || '', mathBlock, { displayMode: true });
        pre.replaceWith(mathBlock);
      } catch (error) {
        console.warn('[translator] katex block render failed', error);
      }
      return;
    }

    const outer = document.createElement('div');
    outer.className = 'gpt-code-block';

    const header = document.createElement('div');
    header.className = 'gpt-code-header';
    const langLabel = document.createElement('span');
    langLabel.textContent = lang;
    langLabel.className = 'gpt-code-lang';

    const copy = document.createElement('button');
    copy.type = 'button';
    copy.className = 'gpt-code-copy';
    copy.setAttribute('aria-label', 'Copy code');
    copy.textContent = 'Copy';

    copy.addEventListener('click', async () => {
      const text = code.textContent || '';
      try {
        await navigator.clipboard.writeText(text);
        copy.textContent = 'Copied';
        setTimeout(() => (copy.textContent = 'Copy'), 1200);
      } catch {
        copy.textContent = 'Failed';
        setTimeout(() => (copy.textContent = 'Copy'), 1200);
      }
    });

    header.appendChild(langLabel);
    header.appendChild(copy);

    const body = document.createElement('div');
    body.className = 'gpt-code-body';

    outer.appendChild(header);
    outer.appendChild(body);

    const parent = pre.parentElement;
    parent.replaceChild(outer, pre);
    body.appendChild(pre);
  });
}
