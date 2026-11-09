// 키오스크 놀이 규칙. 친구가 부탁한 대로 메뉴를 고르고 → 먹는 곳을 고르고 → 결제합니다.
// 돈 계산은 넣지 않습니다 (만 3~5세 수 세기 범위를 넘어서). 결제는 카드 넣기 흉내만 냅니다.
import { josa, makeOrder, orderList, type Age, type Mode, type Order, type Shop, type Verdict } from './game';

export type Where = 'here' | 'togo';
export type KioskOrder = Order & { where: Where };

export const WHERE: Record<Where, { label: string; pic: string; say: string }> = {
  here: { label: '먹고 가요', pic: '🍽️', say: '여기서 먹고 갈 거예요.' },
  togo: { label: '가져가요', pic: '🛍️', say: '집에 가져갈 거예요.' },
};

/** 만 3세는 메뉴 고르기와 결제만, 그 위는 먹는 곳 고르기도 합니다. */
export const asksWhere = (age: Age) => age !== '3';

export function makeKioskOrder(mode: Mode, age: Age, rng: () => number = Math.random, previous?: Order, shop?: Shop): KioskOrder {
  const order = makeOrder(mode, age, rng, previous, shop);
  return { ...order, where: asksWhere(age) && rng() < 0.5 ? 'togo' : 'here' };
}

/** 친구가 하는 부탁: "햄버거 한 개랑 주스 한 잔 주문해 주세요. 여기서 먹고 갈 거예요." */
export const kioskAsk = (o: KioskOrder, age: Age) => `${orderList(o)} 주문해 주세요.${asksWhere(age) ? ` ${WHERE[o.where].say}` : ''}`;

export function judgeWhere(o: KioskOrder, picked: Where): Verdict {
  if (picked === o.where) return { ok: true, kind: 'ok', say: `${WHERE[picked].label}. 맞아요! 이제 결제해요.` };
  return { ok: false, kind: 'wrong-where', say: `${josa(o.customer.name, '은', '는')} "${WHERE[o.where].say}"라고 했어요. 다시 골라 볼까요?` };
}

/** 주문 번호: 영수증처럼 두 자리 수 */
export const orderNumber = (rng: () => number = Math.random) => 10 + Math.floor(rng() * 90);
