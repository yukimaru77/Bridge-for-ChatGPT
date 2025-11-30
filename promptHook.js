(function () {
  const origFetch = window.fetch;
  const pending = new Map();
  let counter = 1;

  window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    const data = event.data;
    if (!data || data.type !== 'gpt-translate-res' || !data.id) return;
    const entry = pending.get(data.id);
    if (!entry) return;
    pending.delete(data.id);
    if (data.ok) entry.resolve(data.text || '');
    else entry.reject(new Error(data.error || 'translate failed'));
  });

  function translateToEnglish(text) {
    return new Promise((resolve, reject) => {
      const id = `tx-${Date.now()}-${counter++}`;
      pending.set(id, { resolve, reject });
      window.postMessage({ type: 'gpt-translate-req', id, text }, '*');
      setTimeout(() => {
        if (pending.has(id)) {
          pending.delete(id);
          reject(new Error('translate timeout'));
        }
      }, 5000);
    });
  }

  window.fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : input.url;
    if (url && url.includes('/backend-api/') && init?.body) {
      try {
        const req = JSON.parse(init.body);
        const msg = req.messages?.[0]?.content?.parts?.[0];
        const enabled = localStorage.getItem('gpt_inject_toggle') !== 'off';
        if (enabled && typeof msg === 'string') {
          console.log('[Prompt Translate][original]:', msg);
          const translated = await translateToEnglish(msg);
          req.messages[0].content.parts[0] = translated;
          console.log('[Prompt Translate][translated]:', translated);
          init.body = JSON.stringify(req);
      window.postMessage({ type: 'gpt-render-original', text: msg, translated }, '*');
    } else if (!enabled) {
      console.log('[Prompt Translate]: skipped (toggle off)');
    }
  } catch (e) {
    console.warn('parse failed', e);
      }
    }
    return origFetch(input, init);
  };
  console.log('[hook] prompt translate enabled (page script)');
})();
