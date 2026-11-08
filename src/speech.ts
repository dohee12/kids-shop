// 소리 내기와 알아듣기.
// - 말하기: 브라우저 내장 음성(speechSynthesis). 무료, 키 없음.
// - 알아듣기: 브라우저 음성 인식(SpeechRecognition). 손님 놀이에서 선생님이 마이크를 켰을 때만 씁니다.
//   Chrome·Edge 는 보통 말소리를 글자로 바꾸려고 회사 서버(Google·Microsoft)로 보냅니다. 이 앱은 소리도 글자도 저장하지 않습니다.

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

export type ListenHandlers = {
  onInterim: (text: string) => void;
  /** 알아들은 후보 문장들 (가장 그럴듯한 것부터). 못 알아들었으면 빈 배열 */
  onFinal: (alternatives: string[]) => void;
  onError: (code: string) => void;
  onEnd: () => void;
};
export type Listening = { stop: () => void };
export type Recognizer = { available: boolean; start: (h: ListenHandlers) => Listening | null };

type RecognitionLike = {
  lang: string; interimResults: boolean; maxAlternatives: number; continuous: boolean;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void; stop: () => void;
};

const Ctor = (): (new () => RecognitionLike) | undefined => {
  if (typeof window === 'undefined') return undefined;
  const w = window as unknown as Record<string, unknown>;
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition) as (new () => RecognitionLike) | undefined;
};

export const browserRecognizer: Recognizer = {
  get available() { return !!Ctor(); },
  start(h) {
    const C = Ctor();
    if (!C) return null;
    hush(); // 기계 목소리를 아이 말로 알아듣지 않게 먼저 멈춥니다.
    const r = new C();
    r.lang = 'ko-KR';
    r.interimResults = true;
    r.maxAlternatives = 3;
    r.continuous = false;
    let done = false;
    r.onresult = e => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        const alts = Array.from({ length: res.length }, (_, k) => res[k].transcript.trim()).filter(Boolean);
        if (res.isFinal) { done = true; h.onFinal(alts); } else if (alts[0]) h.onInterim(alts[0]);
      }
    };
    r.onerror = e => h.onError(e.error);
    r.onend = () => { if (!done) h.onFinal([]); h.onEnd(); };
    try { r.start(); } catch { return null; }
    return { stop: () => r.stop() };
  },
};
