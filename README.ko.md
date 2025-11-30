# ChatGPT 번역 & 프롬프트 변환 (Chrome 확장)

- **메시지 번역**: 어시스턴트 답변의 “Translate” 버튼으로 Markdown 복사 → (Gemini 또는 대체) 번역 → markdown-it + highlight.js + KaTeX로 재렌더링.
- **프롬프트 번역 토글**: 보내기 전에 입력 프롬프트를 Gemini로 대상 언어에 번역. 원본 프롬프트는 3초 후 최신 user 버블에 다시 표시되고, 번역본은 표시/숨기기 토글.

## 사용 방법
1. `chrome://extensions` 에서 개발자 모드 ON → “Load unpacked” 로 이 폴더를 선택.
2. 옵션에서 Gemini API key / 모델 / 소스·타겟 언어 / 프롬프트 템플릿 설정.
3. 보내기 전 번역이 필요하면 입력창 근처 “Translate ON/OFF” 를 ON.

## 주요 파일
- `manifest.json`, `background.js`, `contentScript.js`, `promptHook.js`, `options.html`, `options.js`
- `vendor/` (markdown-it, highlight.js, KaTeX 등)

## TODO
- Gemini 재시도/장문 대응, 에러 처리 강화
- Claude / Gemini / 커스텀 엔드포인트 전환 지원
