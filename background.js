const DEFAULT_ENDPOINT = 'https://libretranslate.de/translate';
const DEFAULT_TARGET_LANG = 'ja';
const DEFAULT_SOURCE_LANG = 'auto';
const SAMPLE_URL = chrome.runtime.getURL('sample.md');
const DEFAULT_GEMINI_MODEL = 'gemini-flash-latest';
const DEFAULT_PROMPT =
  `Translate the following Markdown from {sourceLang} to {targetLang}. Return Markdown only.\n` +
  `Keep code fences, lists, tables intact. Do not translate or alter inline/block code.\n` +
  `Math/LaTeX must remain math: preserve $...$, $$...$$, \\(...\\), \\[...\\].\n` +
  `If you see bare bracketed math like [ ... ] or ( ... ) that appears to be math, wrap it in $$ ... $$ (block) or $ ... $ (inline) as appropriate instead of leaving raw brackets.\n` +
  `Do NOT put math inside code fences or inline backticks unless it was already code; math should render, not be shown as code.\n` +
  `Translate ALL text; do not omit or summarize any part of the input.\n` +
  `Do not drop backslashes; assume the input escapes are correct.\n\n` +
  `{markdown}`;

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'translate-markdown') {
    translateMarkdown(message.markdown || '')
      .then((translated) => sendResponse({ ok: true, translated }))
      .catch((error) => {
        console.error('[translator] translation failed', error);
        sendResponse({ ok: false, error: error?.message || String(error) });
      });
    return true; // keep the message channel open for async response
  }
  if (message?.type === 'translate-markdown-gemini') {
    translateWithGemini(message.markdown || '', message)
      .then((translated) => sendResponse({ ok: true, translated }))
      .catch((error) => {
        console.error('[translator] gemini translation failed', error);
        sendResponse({ ok: false, error: error?.message || String(error) });
      });
    return true;
  }
  return undefined;
});

async function translateMarkdown(markdown) {
  const { endpoint, apiKey, targetLang, sourceLang } = await readSettings();

  const url = (endpoint || DEFAULT_ENDPOINT).trim();
  const target = (targetLang || DEFAULT_TARGET_LANG).trim() || DEFAULT_TARGET_LANG;

  const payload = {
    q: markdown,
    source: sourceLang || 'auto',
    target,
    format: 'text'
  };

  if (apiKey) {
    payload.api_key = apiKey;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`Translation request failed (${response.status})`);
  }

  const data = await response.json();
  const translated =
    data.translatedText ||
    data.translation ||
    data.result ||
    data.text ||
    (Array.isArray(data) && data[0]?.translations?.[0]?.text);

  if (!translated) {
    throw new Error('Translator did not return translatedText');
  }

  return translated;
}

function readSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(
      [
        'endpoint',
        'apiKey',
        'targetLang',
        'sourceLang',
        'geminiKey',
        'geminiModel',
        'promptTemplate'
      ],
      (items) =>
        resolve(items || {})
    );
  });
}

async function fetchSample() {
  const response = await fetch(SAMPLE_URL);
  if (!response.ok) throw new Error(`Failed to load sample.md (${response.status})`);
  return response.text();
}

async function translateWithGemini(markdown, overrides = {}) {
  const { geminiKey, geminiModel, targetLang, sourceLang, promptTemplate } = await readSettings();
  if (!geminiKey) throw new Error('Gemini API key is not set in Options');
  const model = (geminiModel || DEFAULT_GEMINI_MODEL).trim() || DEFAULT_GEMINI_MODEL;
  const target = (overrides.targetLang || targetLang || DEFAULT_TARGET_LANG).trim() || DEFAULT_TARGET_LANG;
  const source = (overrides.sourceLang || sourceLang || DEFAULT_SOURCE_LANG).trim() || DEFAULT_SOURCE_LANG;
  const promptText = buildPrompt(promptTemplate || DEFAULT_PROMPT, {
    sourceLang: source,
    targetLang: target,
    markdown
  });
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model
  )}:generateContent?key=${encodeURIComponent(geminiKey)}`;

  const prompt = [
    {
      role: 'user',
      parts: [
        {
          text: promptText
        }
      ]
    }
  ];

  const body = {
    contents: prompt,
    generationConfig: {
      temperature: 0.2,
      responseMimeType: 'text/plain'
    }
  };

  const resp = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!resp.ok) {
    const errText = await resp.text().catch(() => '');
    throw new Error(`Gemini request failed (${resp.status}) ${errText}`);
  }
  const data = await resp.json();
  const text =
    data?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') ||
    data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Gemini did not return text');
  return text;
}

function buildPrompt(template, vars) {
  return template
    .replaceAll('{sourceLang}', vars.sourceLang || '')
    .replaceAll('{targetLang}', vars.targetLang || '')
    .replaceAll('{markdown}', vars.markdown || '');
}
