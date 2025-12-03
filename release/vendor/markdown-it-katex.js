(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.markdownitKatex = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function isValidDelim(state, pos) {
    const max = state.posMax;
    const prevChar = pos > 0 ? state.src.charCodeAt(pos - 1) : -1;
    const nextChar = pos + 1 <= max ? state.src.charCodeAt(pos + 1) : -1;

    const isAfterSpace = prevChar === 0x20 /* space */ || prevChar === 0x0a /* \n */ || prevChar === 0x09 /* \t */;
    const isBeforeSpace = nextChar === 0x20 || nextChar === 0x0a || nextChar === 0x09;

    if (isBeforeSpace) return false;
    if (isAfterSpace) return false;
    return true;
  }

  function math_inline(state, silent) {
    if (state.src[state.pos] !== '$') return false;

    let start = state.pos + 1;
    let match = start;

    while ((match = state.src.indexOf('$', match)) !== -1) {
      let backslash = 0;
      let pos = match - 1;
      while (pos >= 0 && state.src[pos] === '\\') {
        backslash += 1;
        pos -= 1;
      }
      if (backslash % 2 === 0) {
        break;
      }
      match += 1;
    }

    if (match === -1) return false;
    if (match === start) return false;
    if (!isValidDelim(state, state.pos)) return false;

    const content = state.src.slice(start, match);
    if (!content.trim().length) return false;

    if (!silent) {
      const token = state.push('math_inline', 'math', 0);
      token.markup = '$';
      token.content = content;
    }

    state.pos = match + 1;
    return true;
  }

  function math_block(state, start, end, silent) {
    let pos = state.bMarks[start] + state.tShift[start];
    const max = state.eMarks[start];

    if (pos + 2 > max) return false;
    if (state.src.slice(pos, pos + 2) !== '$$') return false;

    pos += 2;
    let firstLine = state.src.slice(pos, max);

    if (silent) return true;

    let next = start;
    let found = firstLine.trim().endsWith('$$');
    let lastLine = '';

    if (found) {
      firstLine = firstLine.trim().slice(0, -2);
    }

    while (!found) {
      next += 1;
      if (next >= end) break;
      pos = state.bMarks[next] + state.tShift[next];
      const maxPos = state.eMarks[next];
      if (pos < maxPos && state.tShift[next] < state.blkIndent) {
        break;
      }
      const line = state.src.slice(pos, maxPos);
      if (line.trim().endsWith('$$')) {
        found = true;
        lastLine = line.slice(0, line.lastIndexOf('$$'));
      } else {
        firstLine += '\n' + line;
      }
    }

    if (!found) return false;

    const token = state.push('math_block', 'math', 0);
    token.block = true;
    token.content = firstLine + (lastLine ? '\n' + lastLine : '');
    token.map = [start, next + 1];
    token.markup = '$$';

    state.line = next + 1;
    return true;
  }

  function katexPlugin(md, options) {
    const katex = (typeof self !== 'undefined' && self.katex) || (typeof window !== 'undefined' && window.katex);
    const opts = options || {};

    const render = (content, displayMode) => {
      if (!katex || !katex.renderToString) {
        return content;
      }
      try {
        return katex.renderToString(content, { ...opts, displayMode });
      } catch (error) {
        console.warn('[markdown-it-katex] render failed', error);
        return content;
      }
    };

    md.inline.ruler.after('escape', 'math_inline', math_inline);
    md.block.ruler.after('blockquote', 'math_block', math_block, {
      alt: ['paragraph', 'reference', 'blockquote', 'list']
    });

    md.renderer.rules.math_inline = (tokens, idx) => render(tokens[idx].content, false);
    md.renderer.rules.math_block = (tokens, idx) => `<p>${render(tokens[idx].content, true)}</p>`;
  }

  return katexPlugin;
});
