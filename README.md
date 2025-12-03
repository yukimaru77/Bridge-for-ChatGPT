# Bridge for ChatGPT — Translate & Prompt

## What it does
- Translate assistant messages (button on each assistant turn). Renders with markdown-it + highlight.js + KaTeX.
- Translate outgoing prompts (toggle near the composer). Rewrites the prompt via Gemini, keeps the original, and shows a Show/Hide translated toggle in the last user bubble.

## Quick setup
1. Load unpacked in Chrome: `chrome://extensions` → Developer mode → Load unpacked → this folder.
2. Options: set **Source/Target language**.
3. Options: set **Gemini API key** (model optional) and (if needed) prompt template.

## Quick use
- Assistant messages: click **Translate** to overwrite the message with translated HTML.
- Prompts: toggle **Translate ON/OFF** near the composer. ON = prompt is translated to target language before sending; original + translated toggle appears in the last user bubble after ~3s.

## Files
- manifest.json, background.js, contentScript.js, promptHook.js, options.html, options.js
- vendor/ (markdown-it, highlight.js, KaTeX, etc.)
- README.ja.md, README.zh.md, README.ko.md

## TODO
- Gemini retry/fallback and long-output handling; clearer error UI.
- Provider selection: add Claude/custom endpoint.
