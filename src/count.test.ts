// 담을 때 수를 소리 내어 세어 주기: 말 만들기와 소리 순서(손님 말을 끊지 않기)를 시험합니다.
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import App from './App';
import { addSay, ITEMS, removeSay, tallyWord } from './game';
import { hush, say, sayCount } from './speech';

type U = { text: string; onend?: () => void; onerror?: () => void };
let spoken: string[] = [];
let playing: U | null = null;
let queue: U[] = [];
const synth = {
  get speaking() { return playing != null; },
  get pending() { return queue.length > 0; },
  getVoices: () => [{ name: 'Google 한국의', lang: 'ko-KR', localService: false, default: false, voiceURI: 'g' }],
  cancel() { const p = playing; playing = null; queue = []; p?.onerror?.(); },
  speak(u: U) { spoken.push(u.text); if (playing) queue.push(u); else playing = u; },
};
/** 지금 말하는 문장을 끝까지 말합니다 */
const finish = () => { const p = playing; playing = queue.shift() ?? null; p?.onend?.(); };

beforeEach(() => {
  spoken = []; playing = null; queue = [];
  (globalThis as Record<string, unknown>).SpeechSynthesisUtterance = class { voice?: unknown; rate = 1; pitch = 1; lang = ''; onend?: () => void; onerror?: () => void; constructor(public text: string) {} };
  Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: synth });
});
afterEach(() => {
  hush();
  delete (window as unknown as Record<string, unknown>).speechSynthesis;
  delete (globalThis as Record<string, unknown>).SpeechSynthesisUtterance;
});

const apple = ITEMS.find(i => i.id === 'apple')!;

describe('세는 말', () => {
  it('처음엔 이름과 함께, 이어서 같은 물건이면 수와 세는 말만', () => {
    expect(tallyWord(1)).toBe('하나');
    expect(tallyWord(7)).toBe('일곱');
    expect(tallyWord(12)).toBe('12');
    expect(addSay(apple, 1, false)).toBe('사과 한 개');
    expect(addSay(apple, 2, true)).toBe('두 개');
    expect(addSay(apple, 3, false)).toBe('사과 세 개');
    expect(removeSay(apple, 2)).toBe('사과 두 개');
    const cola = { id: 'm-cola', name: '콜라', aisle: 'm2', shelf: '음료', unit: '잔' };
    expect(addSay(cola, 1, false)).toBe('콜라 한 잔');
    expect(addSay(cola, 2, true)).toBe('두 잔');
    expect(removeSay(apple, 0)).toBe('사과는 다 뺐어요');
  });
});

describe('수 세기 소리', () => {
  it('앞선 수 세기는 끊고 새 수를 바로 말합니다', () => {
    sayCount('사과 하나');
    sayCount('둘');
    expect(spoken).toEqual(['사과 하나', '둘']);
    expect(playing?.text).toBe('둘');
  });

  it('손님 말은 끊지 않고, 끝나면 마지막 수 하나만 이어서 말합니다', () => {
    say('안녕하세요! 사과 세 개 주세요.');
    sayCount('사과 하나');
    sayCount('둘');
    expect(spoken).toEqual(['안녕하세요! 사과 세 개 주세요.']);
    finish();
    expect(spoken).toEqual(['안녕하세요! 사과 세 개 주세요.', '둘']);
  });

  it('손님 말이 다른 말로 바뀌면 기다리던 수는 버립니다', () => {
    say('안녕하세요! 우유 두 개 주세요.');
    sayCount('사과 하나');
    say('고마워요!');
    finish();
    expect(spoken).toEqual(['안녕하세요! 우유 두 개 주세요.', '고마워요!']);
  });
});

describe('점원 놀이에서 세어 주기', () => {
  it('담을 때마다 "사과 한 개", "두 개", 빼면 남은 수', async () => {
    const user = userEvent.setup();
    render(createElement(App, { rng: () => 0 }));
    await user.click(screen.getByRole('button', { name: '놀러 가기 →' }));
    finish(); // 손님 주문이 끝남
    await user.click(screen.getByRole('button', { name: '사과 담기' }));
    await user.click(screen.getByRole('button', { name: '사과 담기' }));
    await user.click(screen.getByRole('button', { name: '바나나 담기' }));
    await user.click(screen.getByRole('button', { name: '사과 담기' }));
    await user.click(screen.getByRole('button', { name: '사과 하나 빼기' }));
    expect(spoken.slice(-5)).toEqual(['사과 한 개', '두 개', '바나나 한 개', '사과 세 개', '사과 두 개']);
  });
});
