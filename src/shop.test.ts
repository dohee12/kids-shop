import { describe, expect, it } from 'vitest';
import { SUPER, judgeSpoken, makeOrder, orderText, parseSpoken, shownItems, type Shop } from './game';
import {
  STORE_KEY, blocking, checkShop, defaultStore, exportText, fromPaste, importText, loadStore, sanitizeShop, saveStore,
} from './shop';
import { BUILTIN } from './themes';

const fruit = BUILTIN.find(s => s.id === 'fruit')!;
const zero = () => 0;

describe('저장하고 다시 읽기', () => {
  it('처음에는 기본 주제 열 개, 슈퍼마켓이 골라져 있습니다', () => {
    const s = loadStore();
    expect(s.current).toBe('super');
    expect(s.shops.map(x => x.name)).toEqual(['꼬마 슈퍼마켓', '꼬마 과일가게', '꼬마 빵집', '꼬마 문구점', '꼬마 분식집', '꼬마 꽃집', '꼬마 아이스크림 가게', '꼬마 옷가게', '꼬마 병원', '꼬마 키오스크']);
  });
  it('저장한 것을 그대로 읽습니다', () => {
    const s = defaultStore();
    s.shops[0].name = '우리 반 가게';
    s.current = 'bakery';
    expect(saveStore(s)).toBe(true);
    const back = loadStore();
    expect(back.current).toBe('bakery');
    expect(back.shops[0].name).toBe('우리 반 가게');
  });
  it('저장된 것이 망가졌으면 기본으로 시작합니다', () => {
    localStorage.setItem(STORE_KEY, '{망가짐');
    expect(loadStore().current).toBe('super');
  });
  it('저장된 것에 없는 기본 주제는 뒤에 붙여 줍니다', () => {
    localStorage.setItem(STORE_KEY, JSON.stringify({ current: 'super', shops: [SUPER] }));
    expect(loadStore().shops).toHaveLength(10);
  });
});

describe('들어온 값 다듬기', () => {
  const base = { id: 'x', name: '가게', aisles: [{ id: 'a', label: '통로' }], customers: ['rabbit'], rounds: 5 };
  it('위험하거나 이상한 그림은 버립니다', () => {
    const s = sanitizeShop({ ...base, items: [
      { id: '1', name: '가', aisle: 'a', pic: 'javascript:alert(1)' },
      { id: '2', name: '나', aisle: 'a', pic: 'data:text/html;base64,PHNjcmlwdD4=' },
      { id: '3', name: '다', aisle: 'a', pic: 'data:image/png;base64,iVBORw0KGgo=' },
      { id: '4', name: '라', aisle: 'a', pic: 'apple' },
    ] })!;
    expect(s.items.map(i => i.pic)).toEqual(['', '', 'data:image/png;base64,iVBORw0KGgo=', 'apple']);
  });
  it('모르는 세는 말·통로·손님·손님 수를 바로잡습니다', () => {
    const s = sanitizeShop({ ...base, customers: ['dragon'], rounds: 99, items: [{ id: '1', name: '가', aisle: '없음', unit: '마리' }] })!;
    expect(s.items[0]).toMatchObject({ unit: '개', aisle: 'a' });
    expect(s.customers).toHaveLength(5);
    expect(s.rounds).toBe(5);
  });
  it('모양이 틀리면 null', () => {
    expect(sanitizeShop(null)).toBeNull();
    expect(sanitizeShop({ name: 'id 없음' })).toBeNull();
  });
});

describe('저장 전 확인', () => {
  const shop = (patch: Partial<Shop>): Shop => ({ ...structuredClone(fruit), ...patch });
  it('기본 주제는 문제가 없습니다', () => { for (const s of BUILTIN) expect(checkShop(s)).toEqual([]); });
  it('이름이 비었거나 겹치면 막습니다', () => {
    const items = structuredClone(fruit.items);
    items[0].name = '';
    expect(blocking(checkShop(shop({ items })))).toHaveLength(1);
    items[0].name = '딸기';
    expect(checkShop(shop({ items }))[0]).toContain('딸기');
  });
  it('다르게 부르는 말이 다른 물건 이름과 겹쳐도 알려 줍니다', () => {
    const items = structuredClone(fruit.items);
    items[1].aliases = ['사과'];
    expect(checkShop(shop({ items }))[0]).toContain('사과');
  });
  it('보이는 물건이 없으면 막고, 하나뿐이면 알려만 줍니다', () => {
    expect(blocking(checkShop(shop({ items: fruit.items.map(i => ({ ...i, hidden: true })) })))).toHaveLength(1);
    const one = checkShop(shop({ items: fruit.items.slice(0, 1) }));
    expect(one).toHaveLength(1);
    expect(blocking(one)).toEqual([]);
  });
});

describe('표에서 붙여 넣기', () => {
  it('탭으로 나뉜 줄을 물건으로 바꾸고, 있던 물건은 그림을 지킵니다', () => {
    const { items, skipped } = fromPaste('이름\t진열 칸\t세는 말\n사과\t빨간 과일\t개\n딸기\t빨간 과일\t개\t딸기요/스트로베리\n포도\t큰 과일\t송이\n\n', fruit);
    expect(skipped).toBe(0);
    expect(items.map(i => i.name)).toEqual(['사과', '딸기', '포도']);
    expect(items[0]).toMatchObject({ id: 'f-apple', pic: 'apple' });
    expect(items[1].aliases).toEqual(['딸기요', '스트로베리']);
    expect(items[2].unit).toBe('송이');
  });
  it('새 물건은 이름으로 그림을 짐작하고, 모르면 상자 그림', () => {
    const { items } = fromPaste('우유\n도넛\n망고', fruit);
    expect(items.map(i => i.pic)).toEqual(['milk', '🍩', '📦']);
    expect(new Set(items.map(i => i.id)).size).toBe(3);
  });
  it('쉼표로 쓴 줄도 읽고, 겹치는 이름은 뺍니다', () => {
    const { items, skipped } = fromPaste('수박, 큰 과일, 통\n수박, 큰 과일, 개', fruit);
    expect(items).toHaveLength(1);
    expect(items[0].unit).toBe('통');
    expect(skipped).toBe(1);
  });
});

describe('파일로 옮기기', () => {
  it('내보낸 파일을 불러오면 새 주제로 들어옵니다', () => {
    const got = importText(exportText(fruit), ['fruit'])!;
    expect(got.id).not.toBe('fruit');
    expect(got.name).toBe('꼬마 과일가게');
    expect(got.items).toHaveLength(fruit.items.length);
  });
  it('다른 파일은 거절합니다', () => {
    expect(importText('{"hello":1}', [])).toBeNull();
    expect(importText('글자', [])).toBeNull();
  });
});

describe('다른 주제로 놀기', () => {
  it('세는 말이 주문 문장에 들어갑니다', () => {
    const grape = fruit.items.find(i => i.name === '포도')!;
    expect(orderText({ customer: { id: 'cat', name: '고양이' }, lines: [{ item: grape, count: 2 }] })).toBe('포도 두 송이 주세요.');
  });
  it('"포도 두 송이 주세요"를 알아듣습니다', () => {
    const grape = fruit.items.find(i => i.name === '포도')!;
    const order = { customer: { id: 'cat', name: '고양이' } as const, lines: [{ item: grape, count: 2 }] };
    expect(judgeSpoken(order, '포도 두 송이 주세요', '5', fruit.items).ok).toBe(true);
    expect(judgeSpoken(order, '포도 두 개 주세요', '5', fruit.items).ok).toBe(true);
    expect(judgeSpoken(order, '포도 주세요', '5', fruit.items).say).toBe('포도는 몇 송이일까요? 그림을 세어 보고 말해 봐요.');
    expect(Object.fromEntries(parseSpoken('귤 하나랑 밀감 둘', fruit.items))).toEqual({ 'f-tangerine': 2 });
  });
  it('숨긴 물건과 고르지 않은 손님은 나오지 않습니다', () => {
    const shop: Shop = { ...structuredClone(fruit), customers: ['penguin'] };
    shop.items.forEach((i, k) => { i.hidden = k !== 2; });
    for (let t = 0; t < 30; t++) {
      const o = makeOrder('clerk', '5', Math.random, undefined, shop);
      expect(o.customer.id).toBe('penguin');
      expect(o.lines.map(l => l.item.name)).toEqual([shownItems(shop)[0].name]);
    }
  });
  it('물건이 하나뿐이어도 7세 주문이 멈추지 않습니다', () => {
    const shop: Shop = { ...structuredClone(fruit), items: fruit.items.slice(0, 1) };
    expect(makeOrder('customer', '7', zero, undefined, shop).lines).toHaveLength(1);
  });
  it('3~4세 점원 놀이는 물건이 있는 첫 통로만 씁니다', () => {
    const shop: Shop = structuredClone(BUILTIN.find(s => s.id === 'stationery')!);
    shop.items = shop.items.filter(i => i.aisle !== 's1');
    const o = makeOrder('clerk', '3', zero, undefined, shop);
    expect(o.lines[0].item.aisle).toBe('s2');
  });
});
