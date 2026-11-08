// 꼬마 슈퍼마켓 놀이 규칙. 화면·소리와 떨어진 순수 함수만 둡니다.
// 놀이 두 가지:
//  - 점원 놀이: 손님(AI)이 주문을 말하면 아이가 물건을 눌러 담아 건넵니다 (듣기·수 세기).
//  - 손님 놀이: 점원(AI)이 물건 그림을 보여 주면 아이가 말로 주문합니다 (말하기).
// 아이 정보는 저장하지 않습니다.

export type Item = { id: string; name: string; aisle: 'food' | 'toy'; shelf: string; aliases?: string[] };

export const AISLES = [
  { id: 'food', label: '1번 통로 · 먹거리' },
  { id: 'toy', label: '2번 통로 · 장난감·생활' },
] as const;

export const ITEMS: Item[] = [
  { id: 'apple', name: '사과', aisle: 'food', shelf: '과일·채소·달걀' },
  { id: 'banana', name: '바나나', aisle: 'food', shelf: '과일·채소·달걀' },
  { id: 'carrot', name: '당근', aisle: 'food', shelf: '과일·채소·달걀' },
  { id: 'egg', name: '달걀', aisle: 'food', shelf: '과일·채소·달걀', aliases: ['계란'] },
  { id: 'milk', name: '우유', aisle: 'food', shelf: '우유·빵·간식' },
  { id: 'bread', name: '식빵', aisle: 'food', shelf: '우유·빵·간식', aliases: ['빵'] },
  { id: 'cookie', name: '쿠키', aisle: 'food', shelf: '우유·빵·간식', aliases: ['과자'] },
  { id: 'juice', name: '주스', aisle: 'food', shelf: '우유·빵·간식', aliases: ['쥬스'] },
  { id: 'ball', name: '공', aisle: 'toy', shelf: '장난감·문구' },
  { id: 'crayon', name: '크레파스', aisle: 'toy', shelf: '장난감·문구', aliases: ['크레용'] },
  { id: 'bear', name: '곰인형', aisle: 'toy', shelf: '장난감·문구', aliases: ['곰돌이인형', '인형'] },
  { id: 'block', name: '블록', aisle: 'toy', shelf: '장난감·문구', aliases: ['블럭'] },
  { id: 'toothbrush', name: '칫솔', aisle: 'toy', shelf: '생활용품' },
  { id: 'soap', name: '비누', aisle: 'toy', shelf: '생활용품' },
  { id: 'tissue', name: '휴지', aisle: 'toy', shelf: '생활용품', aliases: ['화장지'] },
  { id: 'towel', name: '수건', aisle: 'toy', shelf: '생활용품' },
];

export const CUSTOMERS = [
  { id: 'rabbit', name: '토끼' },
  { id: 'bear', name: '곰' },
  { id: 'cat', name: '고양이' },
  { id: 'dog', name: '강아지' },
  { id: 'penguin', name: '펭귄' },
] as const;
export type Customer = (typeof CUSTOMERS)[number];

export type Age = '3' | '5' | '7';
export type Mode = 'clerk' | 'customer';

export const AGES: { id: Age; label: string; detail: string }[] = [
  { id: '3', label: '3~4세', detail: '한 가지 · 조금' },
  { id: '5', label: '5~6세', detail: '한두 가지' },
  { id: '7', label: '7세', detail: '두 가지 · 더 많이' },
];

/** 나이와 놀이에 따라 가짓수와 개수 범위를 정합니다. 말하기(손님 놀이)는 조금 더 쉽게 둡니다. */
const RULES: Record<Mode, Record<Age, { kinds: number[]; max: number; aisles: Item['aisle'][] }>> = {
  clerk: {
    '3': { kinds: [1], max: 3, aisles: ['food'] },
    '5': { kinds: [1, 2], max: 4, aisles: ['food', 'toy'] },
    '7': { kinds: [2], max: 5, aisles: ['food', 'toy'] },
  },
  customer: {
    '3': { kinds: [1], max: 2, aisles: ['food', 'toy'] },
    '5': { kinds: [1, 2], max: 3, aisles: ['food', 'toy'] },
    '7': { kinds: [2], max: 5, aisles: ['food', 'toy'] },
  },
};
export const aislesFor = (mode: Mode, age: Age) => RULES[mode][age].aisles;

export type Line = { item: Item; count: number };
export type Order = { customer: Customer; lines: Line[] };
/** 아이가 고른 것: 물건 id → 개수 */
export type Tray = Record<string, number>;

const COUNT = ['', '한', '두', '세', '네', '다섯', '여섯', '일곱', '여덟', '아홉', '열'];
export const countWord = (n: number) => COUNT[n] ?? String(n);

const hasBatchim = (word: string) => {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  return code >= 0 && code <= 11171 && code % 28 !== 0;
};
/** 받침이 있으면 a, 없으면 b ("공은" / "우유는") */
export const josa = (word: string, a: string, b: string) => word + (hasBatchim(word) ? a : b);

export function makeOrder(mode: Mode, age: Age, rng: () => number = Math.random, previous?: Order): Order {
  const rule = RULES[mode][age];
  for (let tries = 0; ; tries++) {
    const pool = ITEMS.filter(i => rule.aisles.includes(i.aisle));
    const kinds = rule.kinds[Math.floor(rng() * rule.kinds.length)];
    const lines: Line[] = [];
    for (let i = 0; i < kinds; i++) {
      const item = pool.splice(Math.floor(rng() * pool.length), 1)[0];
      lines.push({ item, count: 1 + Math.floor(rng() * rule.max) });
    }
    const others = CUSTOMERS.filter(c => c !== previous?.customer);
    const customer = others[Math.floor(rng() * others.length)];
    const order = { customer, lines };
    if (!previous || tries >= 5 || orderText(order) !== orderText(previous)) return order;
  }
}

/** "우유 한 개 주세요." / "우유 한 개랑 사과 두 개 주세요." */
export const orderText = (order: Order) => `${orderList(order, '랑 ')} 주세요.`;
const orderList = (order: Order, sep: string) => order.lines.map(l => `${l.item.name} ${countWord(l.count)} 개`).join(sep);
const names = (order: Order) => order.lines.map(l => l.item.name).join('랑 ');

export type Verdict = { ok: boolean; say: string; kind: string };

/** 점원 놀이: 쟁반을 보고 손님이 할 말. 틀려도 혼내지 않고 고칠 점만 알려 줍니다. */
export function judge(order: Order, tray: Tray): Verdict {
  const total = Object.values(tray).reduce((a, b) => a + b, 0);
  if (total === 0) return { ok: false, kind: 'empty', say: '장바구니가 비어 있어요. 물건을 눌러서 담아 주세요.' };
  const extra = ITEMS.find(i => (tray[i.id] ?? 0) > 0 && !order.lines.some(l => l.item.id === i.id));
  if (extra) return { ok: false, kind: 'wrong-item', say: `${josa(extra.name, '은', '는')} 안 시켰어요. ${josa(names(order), '을', '를')} 찾아볼까요?` };
  for (const l of order.lines) {
    const have = tray[l.item.id] ?? 0;
    const subj = josa(l.item.name, '이', '가');
    if (have < l.count) return { ok: false, kind: 'too-few', say: `${have ? `${subj} ${countWord(have)} 개 있어요.` : `${subj} 없어요.`} ${countWord(l.count - have)} 개 더 주세요.` };
    if (have > l.count) return { ok: false, kind: 'too-many', say: `${subj} 조금 많아요. ${countWord(have - l.count)} 개 빼 볼까요?` };
  }
  return { ok: true, kind: 'ok', say: `고마워요! ${orderList(order, ', ')} 맞아요.` };
}

// ── 손님 놀이: 아이가 말한 문장 알아듣기 ──

const NUM: Record<string, number> = { 하나: 1, 한: 1, 둘: 2, 두: 2, 셋: 3, 세: 3, 석: 3, 넷: 4, 네: 4, 다섯: 5, 여섯: 6, 일곱: 7, 여덟: 8, 아홉: 9, 열: 10 };
const NUM_RE = /^(\d+|하나|한|둘|두|셋|세|석|넷|네|다섯|여섯|일곱|여덟|아홉|열)/;
const norm = (s: string) => s.replace(/[\s.,!?~]/g, '');

/** 말한 문장에서 물건과 개수를 찾습니다. 개수를 말하지 않았으면 null. */
export function parseSpoken(text: string, items: readonly Item[] = ITEMS): Map<string, number | null> {
  const said = norm(text);
  const hits: { id: string; start: number; end: number }[] = [];
  for (const item of items) {
    for (const word of [item.name, ...(item.aliases ?? [])].map(norm)) {
      for (let at = said.indexOf(word); at >= 0; at = said.indexOf(word, at + 1)) hits.push({ id: item.id, start: at, end: at + word.length });
    }
  }
  // 겹치면 긴 낱말을 남깁니다 ("곰인형" 안의 "인형").
  hits.sort((a, b) => a.start - b.start || b.end - a.end);
  const kept = hits.filter((h, i) => !hits.slice(0, i).some(k => k.start <= h.start && h.end <= k.end && k !== h));
  const found = new Map<string, number | null>();
  kept.forEach((h, i) => {
    const seg = said.slice(h.end, kept[i + 1]?.start ?? said.length);
    const m = seg.match(NUM_RE);
    const n = m ? (NUM[m[1]] ?? Number(m[1])) : null;
    const before = found.get(h.id);
    found.set(h.id, n == null ? (before ?? null) : (before ?? 0) + n);
  });
  return found;
}

/** 손님 놀이: 아이 말을 듣고 점원이 할 말. 정답 개수를 대신 말하지 않고 다시 세어 보게 합니다. */
export function judgeSpoken(order: Order, text: string, age: Age): Verdict {
  const said = parseSpoken(text);
  if (said.size === 0) return { ok: false, kind: 'nothing', say: '어떤 물건을 드릴까요? 그림을 보고 이름을 말해 봐요.' };
  const extra = [...said.keys()].find(id => !order.lines.some(l => l.item.id === id));
  if (extra) {
    const name = ITEMS.find(i => i.id === extra)!.name;
    return { ok: false, kind: 'wrong-item', say: `${josa(name, '은', '는')} 그림에 없어요. 그림을 다시 볼까요?` };
  }
  const missing = order.lines.find(l => !said.has(l.item.id));
  if (missing) return { ok: false, kind: 'missing', say: `${missing.item.name}도 말해 볼까요?` };
  for (const l of order.lines) {
    const n = said.get(l.item.id);
    if (n == null && l.count > 1) return { ok: false, kind: 'no-count', say: `${josa(l.item.name, '은', '는')} 몇 개일까요? 그림을 세어 보고 말해 봐요.` };
    if (n != null && n !== l.count) return { ok: false, kind: 'wrong-count', say: `${josa(l.item.name, '을', '를')} 다시 세어 볼까요? 하나, 둘, 셋.` };
  }
  const polite = /주세요|줘요|주실래요|주시겠어요|부탁/.test(norm(text));
  const tip = !polite && age !== '3' ? ' 다음에는 끝에 "주세요"도 붙여 볼까요?' : '';
  return { ok: true, kind: 'ok', say: `네! ${orderList(order, ', ')} 드릴게요.${tip}` };
}
