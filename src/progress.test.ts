import { describe, expect, it } from 'vitest';
import { easier, harder, makeOrder } from './game';
import { hasStamp, isOpen, loadProgress, nextShop, PROGRESS_KEY, saveProgress, stampCount, withStamp } from './progress';
import { BUILTIN } from './themes';

const shops = BUILTIN;

describe('마을 도장', () => {
  it('처음엔 첫 가게만 열려 있고, 도장을 받으면 다음 가게가 열립니다', () => {
    const p0 = { cleared: [] };
    expect(isOpen(shops, p0, 0, false)).toBe(true);
    expect(isOpen(shops, p0, 1, false)).toBe(false);
    expect(nextShop(shops, p0, false)?.id).toBe('super');
    const p1 = withStamp(p0, 'super');
    expect(isOpen(shops, p1, 1, false)).toBe(true);
    expect(isOpen(shops, p1, 2, false)).toBe(false);
    expect(nextShop(shops, p1, false)?.id).toBe('fruit');
    expect(stampCount(shops, p1)).toBe(1);
  });
  it('모두 열어 두기, 선생님이 고른 가게는 늘 열려 있습니다', () => {
    expect(isOpen(shops, { cleared: [] }, 5, true)).toBe(true);
    expect(isOpen(shops, { cleared: [] }, 2, false, 'bakery')).toBe(true);
  });
  it('도장을 다 받으면 다음 가게가 없습니다', () => {
    const all = shops.reduce((p, s) => withStamp(p, s.id), { cleared: [] as string[] });
    expect(nextShop(shops, all, false)).toBeNull();
    expect(stampCount(shops, all)).toBe(shops.length);
  });
  it('같은 가게 도장은 한 번만', () => expect(withStamp(withStamp({ cleared: [] }, 'super'), 'super').cleared).toEqual(['super']));
  it('저장하고 다시 읽습니다. 망가진 값이면 처음부터', () => {
    saveProgress({ cleared: ['super', 'fruit'] });
    expect(hasStamp(loadProgress(), 'fruit')).toBe(true);
    localStorage.setItem(PROGRESS_KEY, '{망가짐');
    expect(loadProgress()).toEqual({ cleared: [] });
    localStorage.setItem(PROGRESS_KEY, JSON.stringify({ cleared: ['a', 3, 'a'] }));
    expect(loadProgress()).toEqual({ cleared: ['a'] });
  });
});

describe('쉬운 단계', () => {
  it('처음 해요: 한 가지, 한 개, 첫 통로', () => {
    for (let i = 0; i < 100; i++) {
      const o = makeOrder('clerk', '1');
      expect(o.lines).toHaveLength(1);
      expect(o.lines[0].count).toBe(1);
      expect(o.lines[0].item.aisle).toBe('food');
      expect(makeOrder('customer', '1').lines[0].count).toBe(1);
    }
  });
  it('한 단계씩 내리고, 고른 단계를 넘지 않게 올립니다', () => {
    expect(easier('7')).toBe('5');
    expect(easier('1')).toBe('1');
    expect(harder('3', '7')).toBe('5');
    expect(harder('5', '5')).toBe('5');
  });
});
