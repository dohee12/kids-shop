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
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string } | undefined> & { isFinal: boolean }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void; stop: () => void;
};

const Ctor = (): (new () => RecognitionLike) | undefined => {
  if (typeof window === 'undefined') return undefined;
  const w = window as unknown as Record<string, unknown>;
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition) as (new () => RecognitionLike) | undefined;
};

/** 아이는 말 사이를 길게 쉬므로, 말이 끊긴 뒤 이만큼 조용하면 다 말한 것으로 봅니다. */
export const SILENCE_MS = 1800;
/** 아무 말도 없을 때 기다리는 시간과, 한 번에 듣는 가장 긴 시간 */
export const NO_SPEECH_MS = 7000;
export const MAX_MS = 15000;

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
    // 한 마디에서 끊기지 않게 계속 듣고, 조용해지면 직접 멈춥니다.
    r.continuous = true;

    let finals: string[] = []; // 끝난 마디마다 후보들을 이어 붙인 문장
    let interim = '';
    let error = '';
    let ended = false;
    let silence: ReturnType<typeof setTimeout> | undefined;
    const stop = () => { try { r.stop(); } catch { /* 이미 멈춤 */ } };
    const quietSoon = (ms: number) => { clearTimeout(silence); silence = setTimeout(stop, ms); };
    const longest = setTimeout(stop, MAX_MS);
    quietSoon(NO_SPEECH_MS);

    r.onresult = e => {
      // 결과 목록은 지금까지 들은 것 전체입니다. 매번 처음부터 다시 만듭니다.
      const done: string[][] = [];
      interim = '';
      for (let i = 0; i < e.results.length; i++) {
        const res = e.results[i];
        const alts = Array.from({ length: res.length }, (_, k) => res[k]?.transcript.trim() ?? '').filter(Boolean);
        if (res.isFinal) done.push(alts);
        else interim += (interim ? ' ' : '') + (alts[0] ?? '');
      }
      // 후보 k번째 문장 = 마디마다 k번째 후보(없으면 첫 후보)를 이은 것
      const width = Math.max(1, ...done.map(a => a.length));
      finals = done.length ? Array.from({ length: width }, (_, k) => done.map(a => a[k] ?? a[0]).join(' ')) : [];
      const now = [finals[0], interim].filter(Boolean).join(' ');
      if (now) h.onInterim(now);
      quietSoon(SILENCE_MS);
    };
    r.onerror = e => {
      error = e.error;
      // 조용했거나 우리가 멈춘 것은 오류로 알리지 않습니다.
      if (error !== 'no-speech' && error !== 'aborted') h.onError(error);
    };
    r.onend = () => {
      if (ended) return;
      ended = true;
      clearTimeout(silence); clearTimeout(longest);
      // 멈추는 순간 아직 끝나지 않은 말이 있으면 그것까지 붙여서 넘깁니다.
      const alts = finals.length ? finals.map(f => [f, interim].filter(Boolean).join(' ')) : interim ? [interim] : [];
      if (alts.length || !error || error === 'no-speech' || error === 'aborted') h.onFinal(alts);
      h.onEnd();
    };
    try { r.start(); } catch { clearTimeout(silence); clearTimeout(longest); return null; }
    return { stop };
  },
};
