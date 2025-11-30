# ChatGPT 翻訳＆プロンプト変換 (Chrome 拡張)

- **メッセージ翻訳**: アシスタント返信の「Translate」ボタンで、Markdown をコピー→(Gemini またはフォールバック)翻訳→markdown-it + highlight.js + KaTeX で再描画。
- **プロンプト翻訳トグル**: 入力プロンプトを Gemini でターゲット言語に翻訳して送信。元のプロンプトは 3 秒後に最新 user バブルに再表示し、英訳の表示/非表示をトグル。

## 使い方
1. `chrome://extensions` でデベロッパーモードを ON → 「パッケージ化されていない拡張機能を読み込む」でこのフォルダを指定。
2. オプションで Gemini API key / モデル / ソース・ターゲット言語 / プロンプトテンプレを設定。
3. 送信前翻訳を有効にする場合、入力欄付近の「Translate ON/OFF」を ON。

## 主なファイル
- `manifest.json`, `background.js`, `contentScript.js`, `promptHook.js`, `options.html`, `options.js`
- `vendor/`（markdown-it, highlight.js, KaTeX など）

## TODO
- Gemini リトライ・長文対策、エラーハンドリング強化
- Claude / Gemini / カスタムエンドポイント切替の対応
