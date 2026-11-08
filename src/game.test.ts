import { describe, expect, it } from 'vitest';
import { CUSTOMERS, ITEMS, judge, judgeSpoken, makeOrder, orderText, parseSpoken, type Order } from './game';

const item = (id: string) => ITEMS.find(x => x.id === id)!;
const order = (...lines: [string, number][]): Order => ({ customer: CUSTOMERS[0], lines: lines.map(([id, count]) => ({ item: item(id), count })) });

describe('주문 문장', () => {
  it('한 가지', () => expect(orderText(order(['milk', 2]))).toBe('우유 두 개 주세요.'));
  it('두 가지', () => expect(orderText(order(['milk', 1], ['apple', 2]))).toBe('우유 한 개랑 사과 두 개 주세요.'));
});

describe('주문 만들기', () => {
  it('나이·놀이별 가짓수와 개수를 지킵니다', () => {
    for (let i = 0; i < 300; i++) {
      const c3 = makeOrder('clerk', '3');
      expect(c3.lines).toHaveLength(1);
      expect(c3.lines[0].count).toBeLessThanOrEqual(3);
      expect(c3.lines[0].item.aisle).toBe('food');
      const c5 = makeOrder('clerk', '5');
      expect(c5.lines.length).toBeGreaterThanOrEqual(1);
      expect(c5.lines.length).toBeLessThanOrEqual(2);
      const c7 = makeOrder('clerk', '7');
      expect(c7.lines).toHaveLength(2);
      expect(c7.lines[0].item).not.toBe(c7.lines[1].item);
      expect(makeOrder('customer', '3').lines[0].count).toBeLessThanOrEqual(2);
    }
  });
  it('바로 앞 손님과 다른 손님이 옵니다', () => {
    const first = makeOrder('clerk', '5');
    for (let i = 0; i < 50; i++) expect(makeOrder('clerk', '5', Math.random, first).customer).not.toBe(first.customer);
  });
});

describe('점원 놀이: 장바구니 보기', () => {
  const o = order(['milk', 1], ['apple', 2]);
  it('맞으면 칭찬', () => expect(judge(o, { milk: 1, apple: 2 })).toMatchObject({ ok: true, say: '고마워요! 우유 한 개, 사과 두 개 맞아요.' }));
  it('비었으면', () => expect(judge(o, {})).toMatchObject({ ok: false, kind: 'empty' }));
  it('안 시킨 물건은 받침에 맞춰', () => {
    expect(judge(o, { ball: 1 }).say).toBe('공은 안 시켰어요. 우유랑 사과를 찾아볼까요?');
    expect(judge(o, { soap: 1 }).say).toBe('비누는 안 시켰어요. 우유랑 사과를 찾아볼까요?');
  });
  it('모자라거나 많으면', () => {
    expect(judge(o, { milk: 1, apple: 1 }).say).toBe('사과가 한 개 있어요. 한 개 더 주세요.');
    expect(judge(o, { milk: 3, apple: 2 }).say).toBe('우유가 조금 많아요. 두 개 빼 볼까요?');
  });
});

describe('손님 놀이: 말 알아듣기', () => {
  const n = (text: string) => Object.fromEntries(parseSpoken(text));
  it('물건과 개수', () => {
    expect(n('우유 한 개랑 사과 두 개 주세요')).toEqual({ milk: 1, apple: 2 });
    expect(n('사과 2개 주세요')).toEqual({ apple: 2 });
    expect(n('사과 둘이랑 우유 하나요')).toEqual({ apple: 2, milk: 1 });
    expect(n('곰인형 세개 주세요')).toEqual({ bear: 3 });
  });
  it('개수를 안 말하면 null', () => expect(n('바나나 주세요')).toEqual({ banana: null }));
  it('다른 이름과 띄어쓰기', () => {
    expect(n('계란 네 개요')).toEqual({ egg: 4 });
    expect(n('곰 인형 하나')).toEqual({ bear: 1 });
    expect(n('식빵 주세요')).toEqual({ bread: null });
  });
  it('"주세요"의 "세"를 개수로 읽지 않습니다', () => expect(n('공 주세요')).toEqual({ ball: null }));

  // 아이들이 실제로 할 법한 말과, 음성 인식이 흔히 내놓는 표기
  const cases: [string, Record<string, number | null>][] = [
    ['우유를 두 개 주세요', { milk: 2 }],
    ['우유 두개 주세요.', { milk: 2 }],
    ['우유가 두 개요', { milk: 2 }],
    ['우유도 하나 주세요', { milk: 1 }],
    ['우유 좀 두 개 주세요', { milk: 2 }],
    ['사과 둘이요', { apple: 2 }],
    ['사과 하나랑 우유 둘', { apple: 1, milk: 2 }],
    ['사과 하나하고 우유 두 개', { apple: 1, milk: 2 }],
    ['두 개 우유 주세요', { milk: 2 }],
    ['우유 두 개 사과 한 개', { milk: 2, apple: 1 }],
    ['우유 2개랑 사과 1개 주세요', { milk: 2, apple: 1 }],
    ['우유 두 개 우유 두 개 주세요', { milk: 2 }],
    ['우유 세 개 아니 두 개', { milk: 2 }],
    ['식빵 한 봉지 주세요', { bread: 1 }],
    ['바나나 다섯 개', { banana: 5 }],
    ['사과네요', { apple: null }],
    ['치솔 두 개 주세요', { toothbrush: 2 }],
    ['곰돌이 하나', { bear: 1 }],
    ['곰돌이 인형 세 개', { bear: 3 }],
    ['레고 네 개요', { block: 4 }],
    ['티슈 하나', { tissue: 1 }],
    ['쥬스 두 병 주세요', { juice: 2 }],
    ['선생님 저 공 하나 주세요', { ball: 1 }],
    ['네 우유 두 개요', { milk: 2 }],
  ];
  for (const [text, want] of cases) it(`"${text}"`, () => expect(n(text)).toEqual(want));
});

describe('손님 놀이: 점원이 할 말', () => {
  const o = order(['milk', 1], ['apple', 2]);
  it('맞으면', () => expect(judgeSpoken(o, '우유 한 개랑 사과 두 개 주세요', '5')).toMatchObject({ ok: true, say: '네! 우유 한 개, 사과 두 개 드릴게요.' }));
  it('"주세요"가 없으면 맞다고 하고 살짝 알려 줍니다 (3~4세는 빼고)', () => {
    expect(judgeSpoken(o, '우유 하나 사과 둘', '5').say).toContain('"주세요"도 붙여 볼까요?');
    expect(judgeSpoken(o, '우유 하나 사과 둘', '3').say).not.toContain('주세요"도');
  });
  it('한 개짜리는 개수를 안 말해도 됩니다', () => expect(judgeSpoken(order(['milk', 1]), '우유 주세요', '3').ok).toBe(true));
  it('여러 개인데 개수를 안 말하면', () => expect(judgeSpoken(o, '우유 하나랑 사과 주세요', '5').say).toBe('사과는 몇 개일까요? 그림을 세어 보고 말해 봐요.'));
  it('하나를 빠뜨리면', () => expect(judgeSpoken(o, '사과 두 개 주세요', '5').say).toBe('우유도 말해 볼까요?'));
  it('개수가 틀리면 답을 말하지 않고 다시 세게 합니다', () => expect(judgeSpoken(o, '우유 한 개 사과 세 개', '5').say).toBe('사과를 다시 세어 볼까요? 하나, 둘, 셋.'));
  it('그림에 없는 물건', () => expect(judgeSpoken(o, '바나나 주세요', '5').say).toBe('바나나는 그림에 없어요. 그림을 다시 볼까요?'));
  it('물건 이름이 없으면', () => expect(judgeSpoken(o, '음 이거요', '5').kind).toBe('nothing'));
});
