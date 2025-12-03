# ChatGPT 翻译与提示转换（Chrome 扩展）

## 功能
- 消息翻译：点击助手回复的 Translate，复制 Markdown→（Gemini 或回退）翻译→markdown-it + highlight.js + KaTeX 重新渲染。
- 提示翻译开关：发送前用 Gemini 翻译输入提示为目标语言，3 秒后在最后的 user 气泡中显示原文+译文的 Show/Hide 切换。

## 快速设置
1. 在 chrome://extensions 启用开发者模式，Load unpacked 选择此文件夹。
2. 选项中设置 源语言/目标语言。
3. 选项中设置 Gemini API key（需要时可设模型、提示模板）。

## 快速使用
- 助手回复：点击 Translate 直接覆盖为译文。
- 提示：输入栏附近的 Translate ON/OFF 打开后，发送前翻译为目标语言；约 3 秒后在最后 user 气泡显示原文+译文切换。

## 主要文件
- manifest.json, background.js, contentScript.js, promptHook.js, options.html, options.js
- vendor/（markdown-it, highlight.js, KaTeX 等）
- README.md / README.ja.md / README.ko.md

## TODO
- Gemini 重试/长文本处理，错误UI
- 支持 Claude/自定义端点切换
