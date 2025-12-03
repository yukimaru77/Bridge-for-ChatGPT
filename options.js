const form = document.getElementById('settings');
const targetLangInput = document.getElementById('targetLang');
const geminiKeyInput = document.getElementById('geminiKey');
const geminiModelInput = document.getElementById('geminiModel');
const debugModeInput = document.getElementById('debugMode');
const promptTemplateInput = document.getElementById('promptTemplate');

chrome.storage.sync.get(
  [
    'targetLang',
    'geminiKey',
    'geminiModel',
    'debugMode',
    'promptTemplate'
  ],
  (items) => {
    if (items.targetLang) targetLangInput.value = items.targetLang;
    if (items.geminiKey) geminiKeyInput.value = items.geminiKey;
    if (items.geminiModel) geminiModelInput.value = items.geminiModel;
    debugModeInput.checked = Boolean(items.debugMode);
    promptTemplateInput.value =
      items.promptTemplate ||
      `Translate the following Markdown from {sourceLang} to {targetLang}. Return Markdown only.
Keep code fences, lists, tables intact. Do not translate or alter inline/block code.
Math/LaTeX must remain math: preserve $...$, $$...$$, \\(...\\), \\[...\\].
If you see bare bracketed math like [ ... ] or ( ... ) that appears to be math, wrap it in $$ ... $$ (block) or $ ... $ (inline) as appropriate instead of leaving raw brackets.
Do NOT put math inside code fences or inline backticks unless it was already code; math should render, not be shown as code.
Translate ALL text; do not omit or summarize any part of the input.
Do not drop backslashes; assume the input escapes are correct.

{markdown}`;
  }
);

form.addEventListener('submit', (event) => {
  event.preventDefault();
  chrome.storage.sync.set(
    {
      targetLang: targetLangInput.value.trim(),
      geminiKey: geminiKeyInput.value.trim(),
      geminiModel: geminiModelInput.value.trim(),
      debugMode: debugModeInput.checked,
      promptTemplate: promptTemplateInput.value || ''
    },
    () => {
      const button = form.querySelector('button');
      const previous = button.textContent;
      button.textContent = 'Saved';
      setTimeout(() => (button.textContent = previous), 1200);
    }
  );
});
