// 꼬마 가게 놀이 규칙. 화면·소리와 떨어진 순수 함수만 둡니다.
// 놀이 두 가지:
//  - 점원 놀이: 손님(AI)이 주문을 말하면 아이가 물건을 눌러 담아 건넵니다 (듣기·수 세기).
//  - 손님 놀이: 점원(AI)이 물건 그림을 보여 주면 아이가 말로 주문합니다 (말하기).
// 가게(주제)는 선생님이 바꿀 수 있습니다. 아이 정보는 저장하지 않습니다.

/** 물건 세는 말. 말 알아듣기에서도 이 낱말들을 개수 단위로 봅니다. */
export const UNITS = ['개', '병', '봉지', '송이', '자루', '장', '통', '조각', '권'] as const;

/** pic: 직접 그린 그림 id, 이모지, 또는 사진(data:image/…) */
export type Item = { id: string; name: string; aisle: string; shelf: string; unit?: string; aliases?: string[]; pic?: string; hidden?: boolean };
export type Aisle = { id: string; label: string };
/** 선생님이 고칠 수 있는 놀이 주제 하나 */
export type Shop = { id: string; name: string; greeting: string; aisles: Aisle[]; items: Item[]; customers: string[]; rounds: number };

export const AISLES: Aisle[] = [
  { id: 'food', label: '1번 통로 · 먹거리' },
  { id: 'toy', label: '2번 통로 · 장난감·생활' },
];

export const ITEMS: Item[] = ([
  { id: 'apple', name: '사과', aisle: 'food', shelf: '과일·채소·달걀' },
  { id: 'banana', name: '바나나', aisle: 'food', shelf: '과일·채소·달걀' },
  { id: 'carrot', name: '당근', aisle: 'food', shelf: '과일·채소·달걀' },
  { id: 'egg', name: '달걀', aisle: 'food', shelf: '과일·채소·달걀', aliases: ['계란', '달걀이', '닭알'] },
  { id: 'milk', name: '우유', aisle: 'food', shelf: '우유·빵·간식' },
  { id: 'bread', name: '식빵', aisle: 'food', shelf: '우유·빵·간식', aliases: ['빵'] },
  { id: 'cookie', name: '쿠키', aisle: 'food', shelf: '우유·빵·간식', aliases: ['과자'] },
  { id: 'juice', name: '주스', aisle: 'food', shelf: '우유·빵·간식', aliases: ['쥬스'] },
  { id: 'ball', name: '공', aisle: 'toy', shelf: '장난감·문구' },
  { id: 'crayon', name: '크레파스', aisle: 'toy', shelf: '장난감·문구', aliases: ['크레용', '크레파쓰', '그레파스'] },
  { id: 'bear', name: '곰인형', aisle: 'toy', shelf: '장난감·문구', aliases: ['곰돌이인형', '곰돌이', '인형', '곰인영'] },
  { id: 'block', name: '블록', aisle: 'toy', shelf: '장난감·문구', aliases: ['블럭', '레고'] },
  { id: 'toothbrush', name: '칫솔', aisle: 'toy', shelf: '생활용품', aliases: ['치솔', '칫솔이'] },
  { id: 'soap', name: '비누', aisle: 'toy', shelf: '생활용품' },
  { id: 'tissue', name: '휴지', aisle: 'toy', shelf: '생활용품', aliases: ['화장지', '티슈'] },
  { id: 'towel', name: '수건', aisle: 'toy', shelf: '생활용품', aliases: ['타월', '타올'] },
] as Item[]).map(i => ({ ...i, pic: i.id, unit: '개' }));

export const CUSTOMERS = [
  { id: 'rabbit', name: '토끼' },
  { id: 'bear', name: '곰' },
  { id: 'cat', name: '고양이' },
  { id: 'dog', name: '강아지' },
  { id: 'penguin', name: '펭귄' },
] as const;
export type Customer = (typeof CUSTOMERS)[number];

export const DEFAULT_GREETING = '어서 오세요! 무엇을 드릴까요? 그림을 보고 말해 보세요.';
export const SUPER: Shop = {
  id: 'super', name: '꼬마 슈퍼마켓', greeting: DEFAULT_GREETING,
  aisles: AISLES, items: ITEMS, customers: CUSTOMERS.map(c => c.id), rounds: 5,
};
/** 아이 화면에 나오는 물건 (숨긴 것과 이름 없는 것은 뺍니다) */
export const shownItems = (shop: Shop) => shop.items.filter(i => !i.hidden && i.name.trim());
export const unitOf = (i: Item) => i.unit || '개';

export type Age = '3' | '5' | '7';
export type Mode = 'clerk' | 'customer';

export const AGES: { id: Age; label: string; detail: string }[] = [
  { id: '3', label: '3~4세', detail: '한 가지 · 조금' },
  { id: '5', label: '5~6세', detail: '한두 가지' },
  { id: '7', label: '7세', detail: '두 가지 · 더 많이' },
];

/** 나이와 놀이에 따라 가짓수와 개수 범위를 정합니다. 말하기(손님 놀이)는 조금 더 쉽게 둡니다.
 *  firstOnly: 3~4세 점원 놀이는 첫 번째 통로만 씁니다 (찾을 곳을 줄여서). */
const RULES: Record<Mode, Record<Age, { kinds: number[]; max: number; firstOnly: boolean }>> = {
  clerk: {
    '3': { kinds: [1], max: 3, firstOnly: true },
    '5': { kinds: [1, 2], max: 4, firstOnly: false },
    '7': { kinds: [2], max: 5, firstOnly: false },
  },
  customer: {
    '3': { kinds: [1], max: 2, firstOnly: false },
    '5': { kinds: [1, 2], max: 3, firstOnly: false },
    '7': { kinds: [2], max: 5, firstOnly: false },
  },
};

/** 물건이 하나라도 있는 통로만, 순서대로 */
export function aislesFor(mode: Mode, age: Age, shop: Shop = SUPER): string[] {
  const items = shownItems(shop);
  const used = shop.aisles.map(a => a.id).filter(id => items.some(i => i.aisle === id));
  return RULES[mode][age].firstOnly ? used.slice(0, 1) : used;
}

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

export function makeOrder(mode: Mode, age: Age, rng: () => number = Math.random, previous?: Order, shop: Shop = SUPER): Order {
  const rule = RULES[mode][age];
  const aisles = aislesFor(mode, age, shop);
  const chosen = CUSTOMERS.filter(c => shop.customers.includes(c.id));
  const guests = chosen.length ? chosen : [...CUSTOMERS];
  for (let tries = 0; ; tries++) {
    const pool = shownItems(shop).filter(i => aisles.includes(i.aisle));
    // 물건이 모자라면 있는 만큼만 시킵니다 (7세인데 물건이 한 가지뿐일 때).
    const kinds = Math.min(rule.kinds[Math.floor(rng() * rule.kinds.length)], pool.length);
    const lines: Line[] = [];
    for (let i = 0; i < kinds; i++) {
      const item = pool.splice(Math.floor(rng() * pool.length), 1)[0];
      lines.push({ item, count: 1 + Math.floor(rng() * rule.max) });
    }
    const others = guests.filter(c => c !== previous?.customer);
    const from = others.length ? others : guests;
    const customer = from[Math.floor(rng() * from.length)];
    const order = { customer, lines };
    if (!previous || tries >= 5 || orderText(order) !== orderText(previous)) return order;
  }
}

/** "우유 한 개 주세요." / "우유 한 개랑 포도 두 송이 주세요." */
export const orderText = (order: Order) => `${orderList(order, '랑 ')} 주세요.`;
export const orderList = (order: Order, sep = ', ') => order.lines.map(l => `${l.item.name} ${countWord(l.count)} ${unitOf(l.item)}`).join(sep);
const names = (order: Order) => order.lines.map(l => l.item.name).join('랑 ');

export type Verdict = { ok: boolean; say: string; kind: string };

/** 점원 놀이: 쟁반을 보고 손님이 할 말. 틀려도 혼내지 않고 고칠 점만 알려 줍니다. */
export function judge(order: Order, tray: Tray, items: readonly Item[] = ITEMS): Verdict {
  const total = Object.values(tray).reduce((a, b) => a + b, 0);
  if (total === 0) return { ok: false, kind: 'empty', say: '장바구니가 비어 있어요. 물건을 눌러서 담아 주세요.' };
  const extra = items.find(i => (tray[i.id] ?? 0) > 0 && !order.lines.some(l => l.item.id === i.id));
  if (extra) return { ok: false, kind: 'wrong-item', say: `${josa(extra.name, '은', '는')} 안 시켰어요. ${josa(names(order), '을', '를')} 찾아볼까요?` };
  for (const l of order.lines) {
    const have = tray[l.item.id] ?? 0;
    const subj = josa(l.item.name, '이', '가');
    const u = unitOf(l.item);
    if (have < l.count) return { ok: false, kind: 'too-few', say: `${have ? `${subj} ${countWord(have)} ${u} 있어요.` : `${subj} 없어요.`} ${countWord(l.count - have)} ${u} 더 주세요.` };
    if (have > l.count) return { ok: false, kind: 'too-many', say: `${subj} 조금 많아요. ${countWord(have - l.count)} ${u} 빼 볼까요?` };
  }
  return { ok: true, kind: 'ok', say: `고마워요! ${orderList(order)} 맞아요.` };
}

// ── 손님 놀이: 아이가 말한 문장 알아듣기 ──

const NUM: Record<string, number> = { 하나: 1, 한: 1, 둘: 2, 두: 2, 셋: 3, 세: 3, 석: 3, 넷: 4, 네: 4, 다섯: 5, 여섯: 6, 일곱: 7, 여덟: 8, 아홉: 9, 열: 10 };
const UNIT = `(?:${UNITS.join('|')})`;
// "한·두·세·네"는 단위가 붙어야 개수로 봅니다 ("사과네요"의 "네"를 4로 읽지 않게).
const WITH_UNIT = `(\\d+|한|두|세|석|네|다섯|여섯|일곱|여덟|아홉|열)${UNIT}`;
const ALONE = '(\\d+|하나|둘|셋|넷|다섯|여섯|일곱|여덟|아홉|열)';
// 물건 이름 뒤: "우유를 두 개", "우유도 하나", "우유 좀 두 개", "우유 2개", "사과 둘이요"
const NUM_AFTER = new RegExp(`^(?:을|를|은|는|이|가|도|만)?(?:좀)?(?:${WITH_UNIT}|${ALONE})`);
// 물건 이름 앞: "두 개 우유 주세요"
const NUM_BEFORE = new RegExp(`(?:${WITH_UNIT}|${ALONE})(?:의|짜리)?$`);
const CORRECTION = new RegExp(`아니(?:요|야)?(?:${WITH_UNIT}|${ALONE})`);
const toNum = (m: RegExpMatchArray | null) => { const w = m?.[1] ?? m?.[2]; return w == null ? null : (NUM[w] ?? Number(w)); };
const norm = (s: string) => s.replace(/[\s.,!?~"'“”]/g, '');

/** 말한 문장에서 물건과 개수를 찾습니다. 개수를 말하지 않았으면 null. */
export function parseSpoken(text: string, items: readonly Item[] = ITEMS): Map<string, number | null> {
  const said = norm(text);
  const hits: { id: string; start: number; end: number }[] = [];
  for (const item of items) {
    for (const word of [item.name, ...(item.aliases ?? [])].map(norm).filter(Boolean)) {
      for (let at = said.indexOf(word); at >= 0; at = said.indexOf(word, at + 1)) hits.push({ id: item.id, start: at, end: at + word.length });
    }
  }
  // 겹치면 긴 낱말을 남깁니다 ("곰인형" 안의 "인형").
  hits.sort((a, b) => a.start - b.start || b.end - a.end);
  const kept = hits.filter((h, i) => !hits.slice(0, i).some(k => k.start <= h.start && h.end <= k.end && k !== h));
  const found = new Map<string, number | null>();
  let lastUsedAfter = true; // 바로 앞 물건이 뒤쪽 개수를 가져갔는지
  kept.forEach((h, i) => {
    const seg = said.slice(h.end, kept[i + 1]?.start ?? said.length);
    let n = toNum(seg.match(NUM_AFTER));
    // 고쳐 말하기: "우유 세 개 아니 두 개" → 두 개
    const fixed = n != null ? seg.match(CORRECTION) : null;
    if (fixed) n = toNum(fixed);
    const usedAfter = n != null;
    // 뒤에 개수가 없으면 앞쪽을 봅니다. 앞 물건이 이미 가져간 개수는 쓰지 않습니다.
    if (n == null && !(i > 0 && lastUsedAfter)) n = toNum(said.slice(kept[i - 1]?.end ?? 0, h.start).match(NUM_BEFORE));
    lastUsedAfter = usedAfter;
    // 같은 물건을 되풀이해 말하면("우유 두 개, 우유 두 개") 더하지 않고 마지막에 말한 개수를 씁니다.
    if (n != null || !found.has(h.id)) found.set(h.id, n ?? found.get(h.id) ?? null);
  });
  return found;
}

/** 손님 놀이: 아이 말을 듣고 점원이 할 말. 정답 개수를 대신 말하지 않고 다시 세어 보게 합니다. */
export function judgeSpoken(order: Order, text: string, age: Age, items: readonly Item[] = ITEMS): Verdict {
  const said = parseSpoken(text, items);
  if (said.size === 0) return { ok: false, kind: 'nothing', say: '어떤 물건을 드릴까요? 그림을 보고 이름을 말해 봐요.' };
  const extra = [...said.keys()].find(id => !order.lines.some(l => l.item.id === id));
  if (extra) {
    const name = items.find(i => i.id === extra)?.name ?? '그 물건';
    return { ok: false, kind: 'wrong-item', say: `${josa(name, '은', '는')} 그림에 없어요. 그림을 다시 볼까요?` };
  }
  const missing = order.lines.find(l => !said.has(l.item.id));
  if (missing) return { ok: false, kind: 'missing', say: `${missing.item.name}도 말해 볼까요?` };
  for (const l of order.lines) {
    const n = said.get(l.item.id);
    if (n == null && l.count > 1) return { ok: false, kind: 'no-count', say: `${josa(l.item.name, '은', '는')} 몇 ${unitOf(l.item)}일까요? 그림을 세어 보고 말해 봐요.` };
    if (n != null && n !== l.count) return { ok: false, kind: 'wrong-count', say: `${josa(l.item.name, '을', '를')} 다시 세어 볼까요? 하나, 둘, 셋.` };
  }
  const polite = /주세요|줘요|주실래요|주시겠어요|부탁/.test(norm(text));
  const tip = !polite && age !== '3' ? ' 다음에는 끝에 "주세요"도 붙여 볼까요?' : '';
  return { ok: true, kind: 'ok', say: `네! ${orderList(order)} 드릴게요.${tip}` };
}
