// 손님 말은 브라우저 내장 음성으로 읽습니다 (무료, 키 없음). 음성이 없으면 글자만 보입니다.
// 마이크는 쓰지 않습니다. 아이 목소리를 밖으로 보내지 않기 위해서입니다.
export function say(text: string): void {
  const synth = typeof window !== 'undefined' ? window.speechSynthesis : undefined;
  if (!synth || typeof SpeechSynthesisUtterance === 'undefined') return;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'ko-KR';
  u.rate = 0.85;
  u.pitch = 1.15;
  const voice = synth.getVoices().find(v => v.lang.startsWith('ko'));
  if (voice) u.voice = voice;
  synth.speak(u);
}

export function hush(): void {
  if (typeof window !== 'undefined') window.speechSynthesis?.cancel();
}
