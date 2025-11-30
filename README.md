# ChatGPT Translator / Prompt Injector (Chrome Extension)

This extension does two things on ChatGPT:

1) **Translate** button on assistant messages  
   - Grabs Markdown via the native copy button, translates (Gemini if API key is set; otherwise fallback endpoint), renders with markdown-it + highlight.js + KaTeX, and replaces the assistant message.
2) **Prompt injection hook** (optional toggle)  
   - Hooks `/backend-api/` requests in the page, sends the user prompt to Gemini to translate it to English, replaces the outgoing prompt, and logs the injected prompt.  
   - Keeps the original prompt: after 3s, the latest user bubble is re-rendered with the original text and a toggle to show/hide the English version.

## Setup

1. Load the folder as an unpacked extension in Chrome (`chrome://extensions`, enable Developer mode, “Load unpacked”).
2. Open Options: set Gemini API key, target/source languages, model (`gemini-flash-latest` default), prompt template if needed, and Debug mode if you want Export/Gemini log buttons on messages.
3. Ensure `promptHook.js` is allowed as a web accessible resource (already configured in `manifest.json`).

## Usage

- **Translate button**: on each assistant turn, click “Translate” to replace the message with translated HTML. Debug mode adds “Export log” / “Gemini log.”
- **Prompt injection toggle**: near the composer’s audio controls there’s an “Inject ON/OFF” pill (localStorage-backed).  
  - ON: user prompt is translated to English (Gemini) before sending; original prompt is kept and shown in the last user bubble with a Show EN/Hide EN toggle (3s delay).  
  - OFF: no injection.

## Notes

- Markdown rendering: `markdown-it` + `highlight.js` + KaTeX; code blocks get copy buttons.
- Injection bridge: page script (`promptHook.js`) posts to content script, which calls background Gemini translate and returns the result.
- Paths of interest:  
  - `contentScript.js` (UI + render logic + bridge + toggle)  
  - `promptHook.js` (page-level fetch hook for prompt injection)  
  - `background.js` (Gemini translate endpoint)  
  - `options.html` / `options.js` (settings UI)
