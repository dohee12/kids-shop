import { describe, expect, it } from 'vitest';
import { CUSTOMERS, judge, judgeSpoken, makeOrder, orderText, type Order } from './game';
import { BUILTIN } from './themes';

const shop = (id: string) => BUILTIN.find(s => s.id === id)!;
const item = (shopId: string, id: string) => shop(shopId).items.find(i => i.id === id)!;
const order = (shopId: string, lines: [string, number][]): Order =>
  ({ customer: CUSTOMERS[0], lines: lines.map(([id, count]) => ({ item: item(shopId, id), count })) });

describe('새 역할놀이 가게', () => {
  it('분식집·꽃집·아이스크림 가게·옷가게가 들어 있습니다', () => {
    expect(BUILTIN.map(s => s.name)).toEqual(expect.arrayContaining(['꼬마 분식집', '꼬마 꽃집', '꼬마 아이스크림 가게', '꼬마 옷가게']));
  });

  it('가게마다 세는 말이 주문 문장에 나옵니다', () => {
    expect(orderText(order('snack', [['k-ramen', 2], ['k-drink', 1]]))).toBe('라면 두 그릇이랑 음료수 한 잔 주세요.');
    expect(orderText(order('flower', [['p-bouquet', 1]]))).toBe('꽃다발 한 다발 주세요.');
    expect(orderText(order('clothes', [['c-socks', 3], ['c-tshirt', 2]]))).toBe('양말 세 켤레랑 티셔츠 두 벌 주세요.');
  });

  it('손님 놀이: 새 세는 말로 말해도 알아듣습니다', () => {
    const o = order('clothes', [['c-socks', 2], ['c-shoes', 1]]);
    expect(judgeSpoken(o, '양말 두 켤레랑 신발 한 켤레 주세요', '7', shop('clothes').items).ok).toBe(true);
    expect(judgeSpoken(o, '양말 세 켤레랑 운동화 한 켤레 주세요', '7', shop('clothes').items).kind).toBe('wrong-count');
    const s = order('snack', [['k-fishcake', 3]]);
    expect(judgeSpoken(s, '오뎅 세 개 주세요', '5', shop('snack').items).ok).toBe(true);
    const ice = order('icecream', [['i-bingsu', 2]]);
    expect(judgeSpoken(ice, '빙수 두 그릇 주세요', '5', shop('icecream').items).ok).toBe(true);
  });

  it('점원 놀이: 켤레를 세어 주는 말이 자연스럽습니다', () => {
    const o = order('clothes', [['c-gloves', 3]]);
    const v = judge(o, { 'c-gloves': 1 }, shop('clothes').items);
    expect(v.say).toContain('장갑을 같이 세어 볼까요? 하나. 한 켤레예요.');
    expect(v.say).toContain('두 켤레 더 담아 볼까요?');
  });

  it('새 가게에서도 나이별 주문이 만들어집니다', () => {
    for (const id of ['snack', 'flower', 'icecream', 'clothes']) {
      for (const age of ['3', '5', '7'] as const) {
        const o = makeOrder('clerk', age, Math.random, undefined, shop(id));
        expect(o.lines.length).toBeGreaterThan(0);
        expect(o.lines.every(l => shop(id).items.includes(l.item))).toBe(true);
      }
    }
  });
});
