// 소리 내기와 알아듣기.
// - 말하기: 브라우저 내장 음성(speechSynthesis). 무료, 키 없음.
// - 알아듣기: 브라우저 음성 인식(SpeechRecognition). 손님 놀이에서 선생님이 마이크를 켰을 때만 씁니다.
//   Chrome·Edge 는 보통 말소리를 글자로 바꾸려고 회사 서버(Google·Microsoft)로 보냅니다. 이 앱은 소리도 글자도 저장하지 않습니다.

/** 선생님이 고른 목소리. name 이 비어 있으면 가장 자연스러운 한국어 목소리를 고릅니다. */
export type VoicePrefs = { name: string; rate: number; pitch: number };
export const DEFAULT_VOICE: VoicePrefs = { name: '', rate: 0.9, pitch: 1 };
let prefs: VoicePrefs = DEFAULT_VOICE;
export const setVoice = (p: VoicePrefs) => { prefs = p; };

const synthOf = () => (typeof window !== 'undefined' ? window.speechSynthesis : undefined);

/** 자연스러운 정도: Edge 의 Natural(신경망) 목소리 > Google > 온라인 > 기기 기본(Heami 처럼 기계음) */
export const voiceScore = (v: Pick<SpeechSynthesisVoice, 'name' | 'localService'>) =>
  (/natural/i.test(v.name) ? 4 : 0) + (/google/i.test(v.name) ? 3 : 0) + (v.localService ? 0 : 1);

// 브라우저는 목소리 목록을 나눠서 채웁니다 (기기 목소리 먼저, 인터넷 목소리는 조금 뒤).
// 잠깐 빈 목록을 돌려줄 때도 있어서, 마지막으로 받은 목록을 기억해 둡니다.
let lastKnown: SpeechSynthesisVoice[] = [];

/** 한국어 목소리, 자연스러운 것부터 */
export function koreanVoices(): SpeechSynthesisVoice[] {
  const synth = synthOf();
  if (!synth) return [];
  const now = synth.getVoices().filter(v => /^ko/i.test(v.lang)).sort((a, b) => voiceScore(b) - voiceScore(a));
  if (now.length) lastKnown = now;
  return now.length ? now : lastKnown;
}

// "자동"일 때 한 번 고른 목소리를 계속 씁니다. 말할 때마다 다시 고르면
// 목록이 늦게 채워지거나 잠깐 비는 순간에 다른 목소리로 바뀌어 들립니다.
let autoName = '';
/** 시험용: 기억해 둔 목소리를 지웁니다. */
export const resetVoiceMemory = () => { autoName = ''; lastKnown = []; last = { text: '', at: 0 }; };

/** 이번에 쓸 목소리: 선생님이 고른 것 → 처음에 자동으로 고른 것 → 가장 자연스러운 것 */
export function pickVoice(p: VoicePrefs = prefs): SpeechSynthesisVoice | undefined {
  const voices = koreanVoices();
  const chosen = p.name ? voices.find(v => v.name === p.name) : undefined;
  if (chosen) return chosen;
  const best = voices[0];
  const kept = voices.find(v => v.name === autoName);
  // 기계음으로 시작했는데 나중에 자연스러운 목소리가 생기면 그때 한 번만 바꿉니다.
  const voice = kept && !(best && voiceScore(kept) < 3 && voiceScore(best) >= 3) ? kept : best;
  if (voice) autoName = voice.name;
  return voice;
}

/** 목록에 보여 줄 이름: "Microsoft SunHi Online (Natural) - Korean (Korea)" → "SunHi · 자연스러운 목소리 (인터넷 필요)" */
export function voiceLabel(v: Pick<SpeechSynthesisVoice, 'name' | 'localService'>): string {
  const base = v.name.replace(/^Microsoft\s+/i, '').replace(/\s*-\s*Korean.*$/i, '').replace(/\s*Online/i, '').replace(/\s*\(Natural\)/i, '').trim();
  const tag = /natural/i.test(v.name) ? '자연스러운 목소리' : /google/i.test(v.name) ? 'Google 목소리' : v.localService ? '기기 기본 목소리' : '온라인 목소리';
  return `${base} · ${tag}${v.localService ? '' : ' (인터넷 필요)'}`;
}

let waiting: ReturnType<typeof setTimeout> | undefined;
let last = { text: '', at: 0 };
/** say() 로 말하는 중인 문장 (손님 주문, 안내). 수 세기는 이 말을 끊지 않습니다. */
let current: SpeechSynthesisUtterance | null = null;
/** 손님 말이 끝나면 이어서 말할 수 세기 (마지막 것 하나만) */
let queuedCount: string | null = null;

function utter(text: string, p: VoicePrefs): SpeechSynthesisUtterance {
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'ko-KR';
  u.rate = p.rate;
  u.pitch = p.pitch;
  const voice = pickVoice(p);
  if (voice) u.voice = voice;
  return u;
}

export function say(text: string, p: VoicePrefs = prefs): void {
  const synth = synthOf();
  if (!synth || typeof SpeechSynthesisUtterance === 'undefined') return;
  // 같은 문장을 눈 깜짝할 사이에 또 부르면(화면이 두 번 그려질 때) 끊고 다시 읽지 않습니다.
  // 끊었다 바로 다시 읽으면 브라우저가 목소리를 바꿔 읽는 일이 있습니다.
  const now = Date.now();
  if (text === last.text && now - last.at < 400) return;
  last = { text, at: now };
  queuedCount = null;
  current = null;
  synth.cancel();
  clearTimeout(waiting);
  waiting = undefined;
  const speak = () => {
    waiting = undefined;
    const u = utter(text, p);
    current = u;
    u.onend = u.onerror = () => {
      if (current !== u) return; // 다른 말에 끊긴 것
      current = null;
      if (queuedCount != null) { const t = queuedCount; queuedCount = null; synth.speak(utter(t, p)); }
    };
    synth.speak(u);
  };
  // 목록이 아직 비어 있으면 브라우저 기본 목소리로 말해 버리므로, 목록이 올 때까지 잠깐(최대 1.5초) 기다립니다.
  if (koreanVoices().length) { speak(); return; }
  const started = Date.now();
  const tryLater = () => {
    if (koreanVoices().length || Date.now() - started > 1500) speak();
    else waiting = setTimeout(tryLater, 100);
  };
  waiting = setTimeout(tryLater, 100);
}

/** 수 세기 ("사과 하나", "둘", "셋"). 앞선 수 세기는 끊고 새 수를 바로 말합니다.
 *  손님 말을 하는 중이면 끊지 않고, 끝난 뒤 마지막 수 하나만 이어서 말합니다. */
export function sayCount(text: string, p: VoicePrefs = prefs): void {
  const synth = synthOf();
  if (!synth || typeof SpeechSynthesisUtterance === 'undefined') return;
  if (waiting !== undefined || (current && (synth.speaking || synth.pending))) { queuedCount = text; return; }
  current = null;
  queuedCount = null;
  last = { text: '', at: 0 };
  synth.cancel();
  synth.speak(utter(text, p));
}

/** 다른 말을 하고 있지 않을 때만 짧게 말합니다 (물건 이름 들려주기처럼 손님 말을 끊으면 안 될 때). */
export function sayIfQuiet(text: string, p: VoicePrefs = prefs): void {
  const synth = synthOf();
  if (synth?.speaking || synth?.pending) return;
  say(text, p);
}

export function hush(): void {
  clearTimeout(waiting);
  waiting = undefined;
  current = null;
  queuedCount = null;
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
