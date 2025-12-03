# ChatGPT 翻訳＆プロンプト変換 (Chrome 拡張)

## 何ができるか
- アシスタント返信を翻訳（各返信の Translate ボタン）。markdown-it + highlight.js + KaTeX で再描画。
- プロンプト翻訳（入力欄付近の Translate ON/OFF）。Gemini で翻訳して送信し、元の文と訳文を最後の user バブルに Show/Hide トグルで表示。

## かんたん設定
1. chrome://extensions でデベロッパーモードを ON → 「Load unpacked」でこのフォルダを読み込み。
2. オプションで ソース/ターゲット言語 を設定。
3. オプションで Gemini API key（必要ならモデル・プロンプトテンプレ）を設定。

## かんたん使い方
- アシスタント返信: Translate を押すと訳文で上書き。
- プロンプト: 入力欄近くの Translate ON/OFF を ON にすると、送信前にターゲット言語へ翻訳。約3秒後、最後の user バブルに原文＋訳文トグルを表示。

## 主なファイル
- manifest.json, background.js, contentScript.js, promptHook.js, options.html, options.js
- vendor/（markdown-it, highlight.js, KaTeX など）
- README.md / README.zh.md / README.ko.md

## TODO
- Gemini のリトライ/長文対策、エラーUI強化
- Claude/カスタムエンドポイント切替
