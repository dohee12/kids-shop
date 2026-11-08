// 목소리 고르기: 브라우저 목소리 목록을 흉내 내어 시험합니다.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_VOICE, koreanVoices, say, setVoice, voiceLabel } from './speech';
import { cleanVoice, defaultStore, loadStore, saveStore } from './shop';

const V = (name: string, lang: string, localService: boolean) => ({ name, lang, localService, default: false, voiceURI: name });
const LIST = [
  V('Microsoft Heami - Korean (Korean)', 'ko-KR', true),
  V('Microsoft Zira - English (United States)', 'en-US', true),
  V('Google 한국의', 'ko-KR', false),
  V('Microsoft SunHi Online (Natural) - Korean (Korea)', 'ko-KR', false),
  V('Microsoft InJoon Online (Natural) - Korean (Korea)', 'ko-KR', false),
];
let spoken: { text: string; voice?: { name: string }; rate: number; pitch: number }[] = [];

beforeEach(() => {
  spoken = [];
  (globalThis as Record<string, unknown>).SpeechSynthesisUtterance = class { voice?: unknown; rate = 1; pitch = 1; lang = ''; constructor(public text: string) {} };
  Object.defineProperty(window, 'speechSynthesis', {
    configurable: true,
    value: { getVoices: () => LIST, cancel() {}, speak: (u: (typeof spoken)[number]) => spoken.push(u) },
  });
});
afterEach(() => {
  setVoice(DEFAULT_VOICE);
  delete (window as unknown as Record<string, unknown>).speechSynthesis;
  delete (globalThis as Record<string, unknown>).SpeechSynthesisUtterance;
});

describe('목소리', () => {
  it('한국어만, 자연스러운 목소리부터 보여 줍니다 (기계음 Heami 는 맨 뒤)', () => {
    expect(koreanVoices().map(v => v.name)).toEqual([
      'Microsoft SunHi Online (Natural) - Korean (Korea)',
      'Microsoft InJoon Online (Natural) - Korean (Korea)',
      'Google 한국의',
      'Microsoft Heami - Korean (Korean)',
    ]);
  });
  it('알아보기 쉬운 이름', () => {
    expect(voiceLabel(LIST[3])).toBe('SunHi · 자연스러운 목소리 (인터넷 필요)');
    expect(voiceLabel(LIST[0])).toBe('Heami · 기기 기본 목소리');
    expect(voiceLabel(LIST[2])).toBe('Google 한국의 · Google 목소리 (인터넷 필요)');
  });
  it('자동이면 가장 자연스러운 목소리로, 기본 빠르기·높낮이로 말합니다', () => {
    say('사과 주세요');
    expect(spoken[0]).toMatchObject({ text: '사과 주세요', rate: 0.9, pitch: 1 });
    expect(spoken[0].voice?.name).toContain('SunHi');
  });
  it('선생님이 고른 목소리·빠르기·높낮이를 씁니다', () => {
    setVoice({ name: 'Google 한국의', rate: 0.7, pitch: 1.2 });
    say('우유 주세요');
    expect(spoken[0]).toMatchObject({ rate: 0.7, pitch: 1.2 });
    expect(spoken[0].voice?.name).toBe('Google 한국의');
  });
  it('고른 목소리가 이 기기에 없으면 자동으로 돌아갑니다', () => {
    setVoice({ name: '다른 기기 목소리', rate: 1, pitch: 1 });
    say('공 주세요');
    expect(spoken[0].voice?.name).toContain('SunHi');
  });
});

describe('목소리 설정 저장', () => {
  it('저장하고 다시 읽습니다', () => {
    saveStore({ ...defaultStore(), voice: { name: 'Google 한국의', rate: 0.75, pitch: 1.1 } });
    expect(loadStore().voice).toEqual({ name: 'Google 한국의', rate: 0.75, pitch: 1.1 });
  });
  it('이상한 값은 범위 안으로', () => {
    expect(cleanVoice({ rate: 9, pitch: -1, name: 3 })).toEqual({ name: '', rate: 1.3, pitch: 0.7 });
    expect(cleanVoice(null)).toEqual(DEFAULT_VOICE);
  });
});
