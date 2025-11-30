# ChatGPT 翻译与提示转换（Chrome 扩展）

- **消息翻译**：在助手回复上点击 “Translate”，复制 Markdown →（Gemini 或回退）翻译 → 用 markdown-it + highlight.js + KaTeX 重新渲染。
- **提示翻译开关**：发送前将输入提示用 Gemini 翻译为目标语言。原始提示会在 3 秒后显示在最新的 user 气泡中，并可切换显示/隐藏译文。

## 用法
1. 在 `chrome://extensions` 启用开发者模式，点击 “Load unpacked” 选择此文件夹。
2. 选项中设置 Gemini API key / 模型 / 源语言 / 目标语言 / 提示模板。
3. 如需发送前翻译，启用输入栏附近的 “Translate ON/OFF”。

## 主要文件
- `manifest.json`, `background.js`, `contentScript.js`, `promptHook.js`, `options.html`, `options.js`
- `vendor/`（markdown-it, highlight.js, KaTeX 等）

## TODO
- Gemini 重试与长文本处理、错误处理增强
- 支持 Claude / Gemini / 自定义端点切换
