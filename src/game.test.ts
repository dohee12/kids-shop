import { describe, expect, it } from 'vitest';
import { FRUITS, judge, makeOrder, orderText, type Order } from './game';

const f = (id: string) => FRUITS.find(x => x.id === id)!;
const order = (...lines: [string, number][]): Order => ({ customer: { name: '곰돌이', emoji: '🐻' }, lines: lines.map(([id, count]) => ({ fruit: f(id), count })) });

describe('주문 문장', () => {
  it('한 가지', () => expect(orderText(order(['apple', 2]))).toBe('사과 두 개 주세요.'));
  it('두 가지', () => expect(orderText(order(['apple', 1], ['tangerine', 2]))).toBe('사과 한 개랑 귤 두 개 주세요.'));
});

describe('주문 만들기', () => {
  it('단계별 개수와 가짓수를 지킵니다', () => {
    for (let i = 0; i < 200; i++) {
      const e = makeOrder('easy');
      expect(e.lines).toHaveLength(1);
      expect(e.lines[0].count).toBeGreaterThanOrEqual(1);
      expect(e.lines[0].count).toBeLessThanOrEqual(3);
      expect(makeOrder('normal').lines[0].count).toBeLessThanOrEqual(5);
      const h = makeOrder('hard');
      expect(h.lines).toHaveLength(2);
      expect(h.lines[0].fruit).not.toBe(h.lines[1].fruit);
    }
  });
  it('바로 앞 손님과 다른 손님이 옵니다', () => {
    const first = makeOrder('easy');
    for (let i = 0; i < 50; i++) expect(makeOrder('easy', Math.random, first).customer).not.toBe(first.customer);
  });
});

describe('맞았는지 보기', () => {
  const o = order(['apple', 2]);
  it('맞으면 칭찬', () => expect(judge(o, { apple: 2 })).toEqual({ ok: true, say: '고마워요! 사과 두 개 맞아요.' }));
  it('비었으면 담으라고', () => expect(judge(o, {})).toMatchObject({ ok: false, kind: 'empty' }));
  it('다른 과일이면 받침에 맞춰 알려 줍니다', () => {
    expect(judge(o, { tangerine: 1 })).toEqual({ ok: false, kind: 'wrong-fruit', say: '귤은 안 시켰어요. 사과를 찾아볼까요?' });
    expect(judge(o, { apple: 2, banana: 1 })).toMatchObject({ kind: 'wrong-fruit', say: '바나나는 안 시켰어요. 사과를 찾아볼까요?' });
  });
  it('모자라면 몇 개 더인지', () => expect(judge(o, { apple: 1 })).toEqual({ ok: false, kind: 'too-few', say: '사과가 한 개 있어요. 한 개 더 주세요.' }));
  it('많으면 몇 개 빼는지', () => expect(judge(order(['tangerine', 1]), { tangerine: 3 })).toEqual({ ok: false, kind: 'too-many', say: '귤이 조금 많아요. 두 개 빼 볼까요?' }));
  it('두 가지 주문은 둘 다 맞아야', () => {
    const two = order(['apple', 1], ['grape', 2]);
    expect(judge(two, { apple: 1 })).toMatchObject({ kind: 'too-few', say: '포도가 없어요. 두 개 더 주세요.' });
    expect(judge(two, { apple: 1, grape: 2 }).ok).toBe(true);
  });
});
