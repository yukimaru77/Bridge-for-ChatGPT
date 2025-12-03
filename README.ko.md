# ChatGPT 번역 & 프롬프트 변환 (Chrome 확장)

## 기능
- 메시지 번역: 어시스턴트 답변의 Translate 버튼으로 Markdown 복사→(Gemini 또는 대체) 번역→markdown-it + highlight.js + KaTeX로 재렌더링.
- 프롬프트 번역 토글: 보내기 전에 입력 프롬프트를 Gemini로 대상 언어에 번역하고, 약 3초 후 마지막 user 버블에 원문+번역문 토글을 표시.

## 간단 설정
1. chrome://extensions 에서 개발자 모드 ON → Load unpacked 로 이 폴더를 선택.
2. 옵션에서 소스/타겟 언어 설정.
3. 옵션에서 Gemini API key 설정(필요 시 모델/프롬프트 템플릿도 설정).

## 간단 사용
- 어시스턴트 답변: Translate 를 누르면 바로 번역본으로 덮어쓰기.
- 프롬프트: 입력창 근처 Translate ON/OFF 를 ON 하면, 전송 전에 대상 언어로 번역; 약 3초 후 마지막 user 버블에 원문+번역문 토글 표시.

## 주요 파일
- manifest.json, background.js, contentScript.js, promptHook.js, options.html, options.js
- vendor/ (markdown-it, highlight.js, KaTeX 등)
- README.md / README.ja.md / README.zh.md

## TODO
- Gemini 재시도/장문 대응, 에러 UI 개선
- Claude/커스텀 엔드포인트 전환 지원
