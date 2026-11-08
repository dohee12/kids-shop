// 브라우저 음성 인식이 실제로 보내는 신호 순서를 흉내 내어 browserRecognizer 를 시험합니다.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MAX_MS, NO_SPEECH_MS, SILENCE_MS, browserRecognizer, type ListenHandlers } from './speech';

type Seg = { alts: string[]; final: boolean };

class FakeRec {
  static last: FakeRec;
  lang = ''; interimResults = false; maxAlternatives = 1; continuous = false;
  onresult: ((e: unknown) => void) | null = null;
  onerror: ((e: { error: string }) => void) | null = null;
  onend: (() => void) | null = null;
  started = false; stopped = 0;
  segs: Seg[] = [];
  constructor() { FakeRec.last = this; }
  start() { this.started = true; }
  stop() { this.stopped++; setTimeout(() => this.onend?.(), 10); }
  /** 결과 목록 전체를 보냅니다 (브라우저처럼 누적) */
  emit(segs: Seg[]) {
    this.segs = segs;
    const results = segs.map(s => Object.assign(s.alts.map(t => ({ transcript: t })), { isFinal: s.final }));
    this.onresult?.({ resultIndex: 0, results });
  }
}

function handlers() {
  const log = { interim: [] as string[], finals: [] as string[][], errors: [] as string[], ends: 0 };
  const h: ListenHandlers = {
    onInterim: t => log.interim.push(t),
    onFinal: a => log.finals.push(a),
    onError: c => log.errors.push(c),
    onEnd: () => log.ends++,
  };
  return { h, log };
}

beforeEach(() => {
  vi.useFakeTimers();
  (window as unknown as Record<string, unknown>).SpeechRecognition = FakeRec;
});
afterEach(() => {
  vi.useRealTimers();
  delete (window as unknown as Record<string, unknown>).SpeechRecognition;
});

describe('브라우저 음성 인식 다루기', () => {
  it('한국어·계속 듣기·후보 3개로 켭니다', () => {
    const { h } = handlers();
    browserRecognizer.start(h);
    const r = FakeRec.last;
    expect([r.lang, r.continuous, r.interimResults, r.maxAlternatives, r.started]).toEqual(['ko-KR', true, true, 3, true]);
  });

  it('쉬어 가며 말해도 끝까지 이어 붙입니다 ("우유를" … "두 개 주세요")', () => {
    const { h, log } = handlers();
    browserRecognizer.start(h);
    const r = FakeRec.last;
    r.emit([{ alts: ['우유를'], final: false }]);
    r.emit([{ alts: ['우유를'], final: true }]);
    vi.advanceTimersByTime(SILENCE_MS - 200); // 아직 조용하지 않음
    r.emit([{ alts: ['우유를'], final: true }, { alts: ['두 개'], final: false }]);
    r.emit([{ alts: ['우유를'], final: true }, { alts: ['두 개 주세요', '두 개 주세여'], final: true }]);
    expect(r.stopped).toBe(0);
    vi.advanceTimersByTime(SILENCE_MS + 20);
    expect(r.stopped).toBe(1);
    expect(log.finals).toEqual([['우유를 두 개 주세요', '우유를 두 개 주세여']]);
    expect(log.interim.at(-1)).toBe('우유를 두 개 주세요');
    expect(log.ends).toBe(1);
  });

  it('"다 말했어요"를 누른 순간 끝나지 않은 말도 버리지 않습니다', () => {
    const { h, log } = handlers();
    const l = browserRecognizer.start(h)!;
    FakeRec.last.emit([{ alts: ['사과 두 개'], final: false }]);
    l.stop();
    vi.advanceTimersByTime(20);
    expect(log.finals).toEqual([['사과 두 개']]);
  });

  it('아무 말도 없으면 기다리다 멈추고 빈 결과를 줍니다', () => {
    const { h, log } = handlers();
    browserRecognizer.start(h);
    vi.advanceTimersByTime(NO_SPEECH_MS + 20);
    expect(log.finals).toEqual([[]]);
    expect(log.errors).toEqual([]);
  });

  it('no-speech 는 오류로 알리지 않고 빈 결과만 줍니다', () => {
    const { h, log } = handlers();
    browserRecognizer.start(h);
    const r = FakeRec.last;
    r.onerror?.({ error: 'no-speech' });
    r.onend?.();
    expect(log.errors).toEqual([]);
    expect(log.finals).toEqual([[]]);
  });

  it('마이크가 막히면 오류만 알리고 "못 들었어요"로 덮지 않습니다', () => {
    const { h, log } = handlers();
    browserRecognizer.start(h);
    const r = FakeRec.last;
    r.onerror?.({ error: 'not-allowed' });
    r.onend?.();
    expect(log.errors).toEqual(['not-allowed']);
    expect(log.finals).toEqual([]);
    expect(log.ends).toBe(1);
  });

  it('끝 신호가 두 번 와도 한 번만 넘깁니다', () => {
    const { h, log } = handlers();
    browserRecognizer.start(h);
    const r = FakeRec.last;
    r.emit([{ alts: ['공 주세요'], final: true }]);
    r.onend?.(); r.onend?.();
    expect(log.finals).toHaveLength(1);
    expect(log.ends).toBe(1);
  });

  it('계속 말해도 가장 긴 시간이 지나면 멈춥니다', () => {
    const { h } = handlers();
    browserRecognizer.start(h);
    const r = FakeRec.last;
    for (let t = 0; t < MAX_MS; t += 1000) { r.emit([{ alts: ['음'], final: false }]); vi.advanceTimersByTime(1000); }
    expect(r.stopped).toBeGreaterThanOrEqual(1);
  });

  it('음성 인식이 없는 브라우저', () => {
    delete (window as unknown as Record<string, unknown>).SpeechRecognition;
    expect(browserRecognizer.available).toBe(false);
    expect(browserRecognizer.start(handlers().h)).toBeNull();
  });
});
