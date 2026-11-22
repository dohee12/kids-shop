import { describe, expect, it } from 'vitest';
import { easier, harder, makeOrder } from './game';
import { EMPTY, hasStamp, isOpen, loadProgress, nextShop, pickTreasure, PROGRESS_KEY, saveProgress, stampCount, treasureOf, withStamp } from './progress';
import { BUILTIN } from './themes';

const shops = BUILTIN;

describe('마을 보물', () => {
  it('처음엔 첫 가게만 열려 있고, 보물을 찾으면 다음 가게가 열립니다', () => {
    const p0 = EMPTY;
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
    expect(isOpen(shops, EMPTY, 5, true)).toBe(true);
    expect(isOpen(shops, EMPTY, 2, false, 'bakery')).toBe(true);
  });
  it('보물을 다 찾으면 다음 가게가 없습니다', () => {
    const all = shops.reduce((p, s) => withStamp(p, s.id), EMPTY);
    expect(nextShop(shops, all, false)).toBeNull();
    expect(stampCount(shops, all)).toBe(shops.length);
  });
  it('같은 가게 보물은 한 번만 (처음 찾은 보물을 그대로 둡니다)', () => {
    const p = withStamp(withStamp(EMPTY, 'super', 'apple'), 'super', 'milk');
    expect(p).toEqual({ cleared: ['super'], treasures: { super: 'apple' } });
  });
  it('보물상자에서는 그 가게 물건이 하나 나오고, 찾은 보물을 기억합니다', () => {
    const fruit = shops.find(s => s.id === 'fruit')!;
    const names = new Set(fruit.items.map(i => i.id));
    for (const r of [0, 0.5, 0.9999]) expect(names.has(pickTreasure(fruit, () => r)!.id)).toBe(true);
    const got = pickTreasure(fruit, () => 0.9999)!;
    expect(treasureOf(fruit, withStamp(EMPTY, 'fruit', got.id))?.id).toBe(got.id);
    // 기록이 없거나 지워진 물건이면 가게 첫 물건
    expect(treasureOf(fruit, { cleared: ['fruit'], treasures: { fruit: 'gone' } })?.id).toBe(fruit.items.filter(i => !i.hidden)[0].id);
  });
  it('저장하고 다시 읽습니다. 망가진 값이면 처음부터', () => {
    saveProgress({ cleared: ['super', 'fruit'], treasures: { fruit: 'apple' } });
    expect(loadProgress().treasures).toEqual({ fruit: 'apple' });
    expect(hasStamp(loadProgress(), 'fruit')).toBe(true);
    localStorage.setItem(PROGRESS_KEY, '{망가짐');
    expect(loadProgress()).toEqual(EMPTY);
    localStorage.setItem(PROGRESS_KEY, JSON.stringify({ cleared: ['a', 3, 'a'], treasures: { a: 'x', b: 4 } }));
    expect(loadProgress()).toEqual({ cleared: ['a'], treasures: { a: 'x' } });
    // 보물 기록이 없던 옛 저장 값도 읽습니다
    localStorage.setItem(PROGRESS_KEY, JSON.stringify({ cleared: ['super'] }));
    expect(loadProgress()).toEqual({ cleared: ['super'], treasures: {} });
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
