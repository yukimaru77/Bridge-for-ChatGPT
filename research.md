ChatGPT風Markdown表示の実装方法とUI再現のポイント
ChatGPT Web UIのHTML構造とCSSクラス
ChatGPTの公式Web UIは、チャットメッセージごとに特定のHTML構造と多数のCSSクラスが付与されています。各メッセージは通常、全幅の<div>要素内にユーザ/アシスタントのアバター表示と、Markdownレンダリングされた内容が含まれています。例えば、メッセージ内容のコンテナにはTailwind CSS由来のユーティリティクラスが付与されており、ライトモードではbg-gray-50（薄いグレー背景）、ダークモードではdark:bg-[#444654]（濃いグレー背景）といったクラスで背景色が切り替わります[1]。テキスト色についてもtext-gray-700（ライトモード時の文字色）やdark:text-gray-300（ダークモード時）などが使われ、フォントや間隔もユーティリティクラスで調整されています[2]。コードブロックの場合、上部にコピーボタン付きのヘッダが付加されており、この部分にはtext-gray-200 bg-gray-800 text-xs font-sans px-4 py-2 rounded-t-md flex justify-betweenといったクラスが適用され、濃いグレーの背景色に小さめの等幅フォントで表示されます[3]。このようにChatGPT UIはTailwind CSSのユーティリティクラスを駆使してスタイル設定されており、HTML要素に付与されたクラス名を見るとレイアウトや配色の構造が把握できます。
また、ChatGPTのメッセージ一覧は特殊なスクロールコンテナ内でレンダリングされており、各メッセージ要素はその子要素として順番に並びます。実際、開発者ツールで見ると各メッセージは<div class="flex ...">内に順に配置されており、JSライブラリのクラス名（例：react-scroll-to-bottom--XXXXX）を持つコンテナの直下にメッセージ<div>が積み重ねられています[4]。例えばある有志のスクリプトでは、この構造を利用し、CSSだけで:nth-childセレクタを使って奇数番目・偶数番目のメッセージ背景に異なる色を当てる例が示されています（偶数行に#52575A、奇数行に#3B3F41の背景色を適用）[4]。このようにChatGPTのDOM構造は「スクロールコンテナ ＞ 連続するメッセージ<div>」という形になっており、それぞれに固有のクラス属性が付与されスタイルが当たっています。
ChatGPT風UIを再現するオープンソースプロジェクト
ChatGPTに似たUIを再現するプロジェクトやライブラリも多数公開されています。代表的なものの一つがChatbot UIと呼ばれるオープンソースプロジェクトで、Next.jsとTailwind CSSで実装されたChatGPTクローンのフロントエンドです[5]。Chatbot UIはOpenAIのAPIを使って自前のChatGPTインターフェースを構築できるもので、サイドバーの会話履歴やチャット画面レイアウト、配色など公式UIに近い体験を提供します。
また、assistant-ui（@assistant-ui/react）というライブラリも注目されています。これはReact向けの埋め込み可能なチャットUIコンポーネント集で、デフォルトでChatGPTライクなデザインを再現できます[6][7]。assistant-uiの公式サイトでは「ChatGPT Clone」のサンプルが公開されており、ChatGPT特有の緑色のアクセントカラー（※OpenAIグリーン: #10a37f）や左側のサイドバー＋右側のチャットエリアといったレイアウト構造、メッセージのスタイリングまで忠実に模倣されています[8]。ドキュメントによると、このクローンを作る際のポイントは「1. カラースキームをChatGPT風（緑を基調とした配色）に設定」「2. サイドバー＋メインチャットエリアのレイアウトを実装」「3. メッセージバブルや入力欄、ボタンのスタイルを調整」「4. ダークモード対応を行う」とされています[9]。実際にassistant-uiを使えば、コンポーネントに用意されたクラスやスタイル指定を適用するだけでChatGPT風のUIコンポーネントを組み込めます。その他にも、GeeksforGeeksが紹介する「ChatGPT風チャットボットUIの作り方」では、HTML/CSS/JSでシンプルなChatGPT風テンプレートを構築する手順を解説しています[10]。このようなオープンソースの例やテンプレートを参考にすることで、ChatGPTライクなUIを一から設計する手間を省き、既存コードをベースにカスタマイズすることが可能です。
Chrome拡張機能でChatGPT UIに統合する方法
ChatGPTのWeb UIに機能拡張を統合するには、ブラウザ拡張のコンテンツスクリプトを用いてChatGPTのページに要素を挿入し、スタイルを合わせ込む手法が用いられます。主な実装アプローチとしては次の2つがあります：
•	Shadow DOMを利用する方法：拡張機能でページに新たなDOM要素（例：<div id="my-extension-root">）を追加し、そこにShadow DOMをアタッチして自前のUIを差し込む方法です。Shadow DOMを使うことで拡張機能側のHTML/CSSがホストページ（ChatGPT側）のスタイルと干渉しないようカプセル化できます[11]。Reactなどを用いる場合、このShadow DOM内にポータル経由でコンポーネントをレンダリングすることで、ChatGPTのDOM構造とは独立した拡張UIを実現できます[12][13]。Shadow DOM内では自前のCSSを適用する必要がありますが、ChatGPTの見た目に合わせるために必要なスタイルをShadow DOM内に記述することで、ホストと統合されたルック＆フィールを再現できます。
•	ChatGPTページに直接DOMをインジェクトする方法（クラス継承）：Shadow DOMを使わず、ChatGPTの既存DOMツリー内に直接要素を挿入する方法です。この場合、ChatGPTが持つ既存のCSSクラスを再利用することでスタイルを統一できます。例えば、拡張機能が生成したHTML要素にChatGPTと同じクラス名（例えばメッセージ用のw-full border-b bg-gray-50 dark:bg-[#444654]等）を付与すれば、ChatGPT本体のスタイルシートによって自動的に同様の見た目が適用されます[1]。実際にChrome拡張「ChatGPT UI Preview」では、ChatGPTのチャット画面にコード実行結果のプレビュー用パネルを差し込みつつ、ChatGPTのUIに溶け込むデザインで表示する工夫がされています[14]。この拡張はChatGPTのコードブロック下にプレビューを埋め込む際、既存のチャット画面とシームレスに統合されるようスタイルを調整しており、「ChatGPTインターフェースと完璧に調和するモダンなデザイン」と説明されています[14]。クラスをそのまま利用する方法は、ChatGPT側のHTML構造やクラス名が変更されると影響を受けるリスクはありますが、最小限のCSS追加で見た目を揃えられる利点があります。
Chrome拡張のコンテンツスクリプトでは、上記いずれの方法でもページ読み込み後にdocument.createElementなどで要素を生成し、document.querySelector()等で適切な親要素（例えばチャットログのコンテナ）を取得して挿入する処理を行います。Shadow DOM方式では上記に加えてelement.attachShadow({mode: ...})でshadow rootを作成し、内部にスタイルとHTMLを組み立てます[13]。クラス継承方式では、挿入する要素に対して必要なクラス名を付け、必要に応じて追加のスタイルシートを<style>タグで注入することもあります。いずれの手法でもChatGPTの既存UIを崩さずに拡張UIを埋め込むことが重要であり、そのためにShadow DOMによるカプセル化や、クラス名の活用によるスタイル統一が役立ちます。
CSSだけでChatGPT風の見た目にする方法はあるか？
CSSのみでもChatGPT風のスタイルを再現することは可能です。上記のようにChatGPTのUIデザインは主に特定の色、余白、タイポグラフィの組み合わせで構成されているため、それらを独自CSSで模倣できます。例えば、ユーザとアシスタントのメッセージ背景にそれぞれ異なる色調のグレーを当てる、全体の背景色や文字色をChatGPTのライト/ダークテーマに揃える、コードブロック部分は濃いグレーの背景にモノスペースフォント・角丸枠で囲む、といったルールをCSSで定義すれば、マークアップが同じでなくとも見た目を近づけられます。実際、ChatGPTのUI改善を目的としたユーザーCSSも公開されており、例えば「Purple ChatGPT Theme」ではChatGPTの配色を紫系統に変えるスタイルシートが提供されています[15]。これらはChatGPT公式のHTMLに対しCSSだけでテーマ変更を行うものですが、同様に自前のHTMLに適用すればChatGPT風テーマを表現できます。
具体的な手順としては、まずMarkdownをHTMLに変換するレンダラー（例：Markedやmarkdown-itなど）を利用して、ユーザ発言やアシスタント応答の内容をHTML化します。その際、可能であれば各要素にChatGPTが出力時に用いるクラス名を付与します（例えば段落やリストには適宜余白をつけるprose系クラスや、インラインコードには背景色を付けるクラス等）。しかしクラス名が不明な場合でも、自前でCSSを用意してタグセレクタにスタイル指定すれば問題ありません。ChatGPTのスタイル再現で重要なのは以下の点です：
•	配色と背景：ライトモードでは背景色は白またはごく薄い灰色、ダークモードでは#444654のような濃いグレーが基調です[1]。文字色はそれに対応して黒〜灰色系（ダークモードでは明るい灰色）になります[2]。コードブロックは背景がさらに暗く（#343541や#202123に近い色）、文字は明示的に明るい色に設定されています。これらの色コードやトーンをCSS変数として定義しておくとテーマ切替も容易です。
•	タイポグラフィ：ChatGPTではサンセリフ体の基本フォントを使用し、コードブロック内は等幅フォントに切り替えています[3]。また、全体のフォントサイズは約14px前後のtext-base程度、コード内はさらに小さくtext-xs程度に設定されています[3]。行間や段落間のスペースもTailwindのproseクラス相当のスタイル（例えば段落下部に適度なマージン）が適用されています。
•	レイアウトと余白：メッセージ間には適度な間隔があり、コンテンツは左右に余白を持って配置されています。ChatGPTクローン実装では各メッセージ要素にpadding: 10px程度の内側余白を付与し、境界に細いボーダー線または色の違いで区切りを付けることが多いです[1]。公式UIでも細かな余白指定がなされていますが、CSSのみで再現する場合は見た目を見比べながら適宜調整するとよいでしょう。
以上の設定を自前のCSSに落とし込めば、JavaScriptを使わずともMarkdownで記述された内容をChatGPT風のスタイルで表示できます。実際に、ブラウザ拡張でCSSを追加する手法（ユーザーCSS拡張を使ってChatGPTの見た目を変更するなど）も広く行われており[16]、必要なCSSさえ用意できれば任意のHTMLをChatGPT風に装飾することは十分可能です。ポイントは、ChatGPTのUIを構成するデザイン要素（色・フォント・余白・配置）を正確に把握し、それをCSSルールに落とし込むことです。Tailwind CSSを利用できる環境であれば、Tailwindの設定をChatGPTに寄せてクラス指定することで迅速に再現でき、そうでない場合でも上記の要素を一つ一つ手動でCSS指定することでほぼ同等のスタイルを得られるでしょう。
まとめとして、ChatGPTライクなスタイル付きHTMLをMarkdownから生成するには：(1) MarkdownをHTMLに変換し、(2) ChatGPTのHTML構造やクラスを参考に適切なタグ構造・クラス名を付与する、(3) 不足するスタイルはCSSで補完する、という手順になります。既存のオープンソースUIやブラウザ拡張の実例[8][14]を参考にしつつ、必要に応じてShadow DOMやCSSカスタマイズ手法を組み合わせれば、ブラウザ上で公式ChatGPTと調和した見た目の拡張UIを実現できるでしょう。
参考資料・リソース:
•	ChatGPT公式UIのカスタムCSS例（OpenAI Communityフォーラム）[17][3]
•	Chatbot UI (Mckay Wrigley) - オープンソースのChatGPTクローン[5]
•	assistant-ui (@assistant-ui/react) ライブラリとChatGPTクローンの解説[8][9]
•	Chrome拡張 ChatGPT UI Preview の説明（コードプレビュー埋め込み拡張）[14]
•	Shadow DOMを用いたChrome拡張UI実装方法（Medium解説）[11]
•	GeeksforGeeks: 「HTML/CSS/JSでChatGPT風チャットボットを構築する方法」[10]
________________________________________
[1] [2] [3] [16] [17] Customize your interface for ChatGPT web -> custom CSS inside - ChatGPT - OpenAI Developer Community
https://community.openai.com/t/customize-your-interface-for-chatgpt-web-custom-css-inside/315446
[4] Save chatGPT conversation as HTML file - DEV Community
https://dev.to/jcubic/save-chatgpt-as-html-file-dhh
[5] GitHub - OpenOrca/openchat-ui: An open source ChatGPT UI. (for OpenChat models)
https://github.com/OpenOrca/openchat-ui
[6] Hello, assistant-ui
https://www.assistant-ui.com/blog/2024-07-29-hello
[7] @assistant-ui/react - npm
https://www.npmjs.com/package/@assistant-ui/react
[8] [9] ChatGPT Clone | assistant-ui
https://www.assistant-ui.com/examples/chatgpt
[10] Create ChatGPT Template using HTML CSS & JavaScript - GeeksforGeeks
https://www.geeksforgeeks.org/javascript/create-chatgpt-template-using-html-css-javascript/
[11] [12] [13] Develop Chrome Extensions using React, Typescript, and Shadow DOM | by Samuel Kollát | Outreach Prague | Medium
https://medium.com/outreach-prague/develop-chrome-extensions-using-react-typescript-and-shadow-dom-1e112935a735
[14] ChatGPT UI Preview - Chrome Web Store
https://chromewebstore.google.com/detail/chatgpt-ui-preview/ankmfiodijaemlgdckgamhchillmegdo?hl=en-US
[15] GitHub - Jiyath5516F/Purple-ChatGPT-Theme: A Purple theme for Chat GPT.
https://github.com/Jiyath5516F/Purple-ChatGPT-Theme
