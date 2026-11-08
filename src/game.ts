// 꼬마 과일가게: 손님(동물)이 주문하면 아이가 점원이 되어 과일 카드를 골라 건넵니다.
// 아이 목소리·얼굴은 받지 않고, 아무것도 저장하거나 서버로 보내지 않습니다.

export type Fruit = { id: string; name: string; emoji: string };

export const FRUITS: Fruit[] = [
  { id: 'apple', name: '사과', emoji: '🍎' },
  { id: 'banana', name: '바나나', emoji: '🍌' },
  { id: 'grape', name: '포도', emoji: '🍇' },
  { id: 'strawberry', name: '딸기', emoji: '🍓' },
  { id: 'tangerine', name: '귤', emoji: '🍊' },
];

export const CUSTOMERS = [
  { name: '곰돌이', emoji: '🐻' },
  { name: '토끼', emoji: '🐰' },
  { name: '강아지', emoji: '🐶' },
  { name: '고양이', emoji: '🐱' },
  { name: '펭귄', emoji: '🐧' },
];

export type Level = 'easy' | 'normal' | 'hard';
export const LEVELS: { id: Level; label: string; detail: string }[] = [
  { id: 'easy', label: '쉬움', detail: '과일 한 가지, 1~3개' },
  { id: 'normal', label: '보통', detail: '과일 한 가지, 1~5개' },
  { id: 'hard', label: '어려움', detail: '과일 두 가지, 1~3개씩' },
];

export type Line = { fruit: Fruit; count: number };
export type Order = { customer: (typeof CUSTOMERS)[number]; lines: Line[] };
/** 아이가 쟁반에 담은 것: 과일 id → 개수 */
export type Tray = Record<string, number>;

const COUNT = ['', '한', '두', '세', '네', '다섯', '여섯', '일곱', '여덟', '아홉', '열'];
export const countWord = (n: number) => COUNT[n] ?? String(n);

/** 받침이 있으면 a, 없으면 b ("귤은" / "사과는") */
const hasBatchim = (word: string) => {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  return code >= 0 && code <= 11171 && code % 28 !== 0;
};
export const josa = (word: string, a: string, b: string) => word + (hasBatchim(word) ? a : b);

const pick = <T,>(list: readonly T[], rng: () => number) => list[Math.floor(rng() * list.length)];

export function makeOrder(level: Level, rng: () => number = Math.random, previous?: Order): Order {
  const max = level === 'normal' ? 5 : 3;
  const kinds = level === 'hard' ? 2 : 1;
  // 바로 앞 손님과 같은 주문이 나오지 않게 몇 번 다시 뽑습니다.
  for (let tries = 0; ; tries++) {
    const pool = [...FRUITS];
    const lines: Line[] = [];
    for (let i = 0; i < kinds; i++) {
      const fruit = pool.splice(Math.floor(rng() * pool.length), 1)[0];
      lines.push({ fruit, count: 1 + Math.floor(rng() * max) });
    }
    const customer = pick(CUSTOMERS.filter(c => c !== previous?.customer), rng);
    const order = { customer, lines };
    if (!previous || tries >= 5 || orderText(order) !== orderText(previous)) return order;
  }
}

/** "사과 두 개 주세요." / "사과 한 개랑 귤 두 개 주세요." */
export function orderText(order: Order): string {
  const parts = order.lines.map(l => `${l.fruit.name} ${countWord(l.count)} 개`);
  return `${parts.join('랑 ')} 주세요.`;
}

export type Verdict =
  | { ok: true; say: string }
  | { ok: false; say: string; kind: 'empty' | 'wrong-fruit' | 'too-few' | 'too-many' };

/** 쟁반을 보고 손님이 할 말을 정합니다. 틀려도 혼내지 않고 무엇을 고치면 되는지만 알려 줍니다. */
export function judge(order: Order, tray: Tray): Verdict {
  const total = Object.values(tray).reduce((a, b) => a + b, 0);
  if (total === 0) return { ok: false, kind: 'empty', say: '쟁반이 비어 있어요. 과일을 눌러서 담아 주세요.' };

  const wanted = new Map(order.lines.map(l => [l.fruit.id, l]));
  const extra = FRUITS.find(f => (tray[f.id] ?? 0) > 0 && !wanted.has(f.id));
  if (extra) {
    const need = order.lines.map(l => l.fruit.name).join('랑 ');
    return { ok: false, kind: 'wrong-fruit', say: `${josa(extra.name, '은', '는')} 안 시켰어요. ${josa(need, '을', '를')} 찾아볼까요?` };
  }
  for (const l of order.lines) {
    const have = tray[l.fruit.id] ?? 0;
    if (have < l.count) {
      const now = have === 0 ? `${josa(l.fruit.name, '이', '가')} 없어요.` : `${josa(l.fruit.name, '이', '가')} ${countWord(have)} 개 있어요.`;
      return { ok: false, kind: 'too-few', say: `${now} ${countWord(l.count - have)} 개 더 주세요.` };
    }
    if (have > l.count) {
      return { ok: false, kind: 'too-many', say: `${josa(l.fruit.name, '이', '가')} 조금 많아요. ${countWord(have - l.count)} 개 빼 볼까요?` };
    }
  }
  return { ok: true, say: `고마워요! ${order.lines.map(l => `${l.fruit.name} ${countWord(l.count)} 개`).join(', ')} 맞아요.` };
}
