// 병원 놀이 규칙. 화면·소리와 떨어진 순수 함수만 둡니다.
//  - 의사 놀이: 환자(AI)가 어디가 아픈지 말하면 아이가 맞는 도구를 골라 씁니다 (듣기·까닭 생각하기).
//  - 환자 놀이: 그림을 보고 아이가 어디가 아픈지 말로 알립니다 (말하기).
// 약·주사는 넣지 않습니다. 약은 어른이 주실 때만 먹는다는 생활 안전 규칙과 겹치지 않게 하려는 것입니다.
import { CUSTOMERS, josa, joinAnd, norm, shownItems, type Age, type Customer, type Item, type Shop, type Tray, type Verdict } from './game';

export type Symptom = {
  id: string;
  /** 아픈 곳 그림 (이모지) */
  pic: string;
  /** 환자가 하는 말 */
  complaint: string;
  /** 그림 아래 짧은 말 */
  short: string;
  /** "~할 때는 무엇이 필요할까요?" 에 쓰는 말 */
  when: string;
  /** 맞는 도구 id */
  tool: string;
  /** 아이 말에서 찾을 낱말 */
  words: string[];
  /** 의사가 해 줄 말 (환자 놀이) */
  treat: string;
  /** 다 나은 환자가 할 말 (의사 놀이) */
  cure: string;
};

export const SYMPTOMS: Symptom[] = [
  { id: 'scrape', pic: '🦵', complaint: '넘어져서 무릎에 상처가 났어요.', short: '무릎에 상처가 났어요', when: '무릎에 상처가 났을 때', tool: 'h-bandage',
    words: ['상처', '피', '까졌', '까져', '넘어', '무릎', '다쳤'], treat: '반창고를 붙여 줄게요.', cure: '반창고를 붙이니 하나도 안 아파요.' },
  { id: 'fever', pic: '🤒', complaint: '몸이 뜨겁고 열이 나요.', short: '열이 나요', when: '열이 날 때', tool: 'h-thermo',
    words: ['열', '뜨거', '뜨겁'], treat: '체온계로 열을 재어 볼게요.', cure: '체온계로 재어 보니 열이 조금 있대요. 푹 쉴게요.' },
  { id: 'cough', pic: '😷', complaint: '콜록콜록 기침이 나요.', short: '기침이 나요', when: '기침이 날 때', tool: 'h-stetho',
    words: ['기침', '콜록'], treat: '청진기로 가슴 소리를 들어 볼게요.', cure: '청진기로 가슴 소리를 들어 주셔서 마음이 놓여요.' },
  { id: 'bump', pic: '🤕', complaint: '머리를 쿵 부딪혀서 혹이 났어요.', short: '머리에 혹이 났어요', when: '머리에 혹이 났을 때', tool: 'h-ice',
    words: ['혹', '부딪', '쿵', '머리'], treat: '얼음주머니를 대 줄게요.', cure: '얼음주머니를 대니 시원해요.' },
  { id: 'throat', pic: '😮', complaint: '목이 따끔따끔 아파요.', short: '목이 아파요', when: '목이 아플 때', tool: 'h-light',
    words: ['목', '따끔'], treat: '손전등으로 목 안을 봐 줄게요.', cure: '손전등으로 목 안을 봐 주셔서 고마워요.' },
  { id: 'nose', pic: '🤧', complaint: '콧물이 줄줄 나요.', short: '콧물이 나요', when: '콧물이 날 때', tool: 'h-tissue',
    words: ['콧물', '코', '훌쩍', '재채기', '에취'], treat: '휴지로 코를 닦아 줄게요.', cure: '휴지로 코를 닦으니 시원해요.' },
];

/** 도구를 어디에 쓰는지. 다른 도구를 골랐을 때 까닭을 알려 주는 데 씁니다. */
export const TOOL_USE: Record<string, string> = {
  'h-bandage': '상처를 덮어 줄 때',
  'h-thermo': '몸이 얼마나 뜨거운지 잴 때',
  'h-stetho': '가슴 소리를 들을 때',
  'h-ice': '부딪혀서 부은 곳을 차갑게 할 때',
  'h-light': '목 안을 비춰 볼 때',
  'h-tissue': '콧물을 닦을 때',
};

export type Visit = { customer: Customer; symptoms: Symptom[] };

/** 아이 화면에 보이는 도구로 고칠 수 있는 아픈 곳만 */
export const symptomsFor = (shop: Shop) => {
  const tools = new Set(shownItems(shop).map(i => i.id));
  return SYMPTOMS.filter(s => tools.has(s.tool));
};

/** 만 3세 한 군데, 만 4세 한두 군데, 만 5세 두 군데 */
const KINDS: Record<Age, number[]> = { '3': [1], '5': [1, 2], '7': [2] };

export function makeVisit(age: Age, rng: () => number = Math.random, previous?: Visit, shop?: Shop): Visit {
  const chosen = CUSTOMERS.filter(c => !shop || shop.customers.includes(c.id));
  const guests = chosen.length ? chosen : [...CUSTOMERS];
  const all = shop ? symptomsFor(shop) : SYMPTOMS;
  const base = all.length ? all : SYMPTOMS;
  const key = (v: Visit) => v.symptoms.map(s => s.id).join();
  for (let tries = 0; ; tries++) {
    const pool = [...base];
    const kinds = Math.min(KINDS[age][Math.floor(rng() * KINDS[age].length)], pool.length);
    const symptoms = Array.from({ length: kinds }, () => pool.splice(Math.floor(rng() * pool.length), 1)[0]);
    const others = guests.filter(c => c !== previous?.customer);
    const from = others.length ? others : guests;
    const visit = { customer: from[Math.floor(rng() * from.length)], symptoms };
    if (!previous || tries >= 5 || key(visit) !== key(previous)) return visit;
  }
}

/** "선생님, 콧물이 줄줄 나요. 그리고 목이 따끔따끔 아파요." */
export const complaintText = (v: Visit) => `선생님, ${v.symptoms.map(s => s.complaint).join(' 그리고 ')}`;

const nameOf = (items: readonly Item[], id: string) => items.find(i => i.id === id)?.name ?? '그 도구';

/** 의사 놀이: 진료 가방을 보고 환자가 할 말. 틀리면 그 도구를 어디에 쓰는지 알려 주고 다시 생각하게 합니다. */
export function judgeCare(visit: Visit, tray: Tray, items: readonly Item[]): Verdict {
  const picked = Object.keys(tray).filter(id => (tray[id] ?? 0) > 0);
  if (!picked.length) return { ok: false, kind: 'empty', say: '진료 가방이 비어 있어요. 필요한 도구를 눌러 주세요.' };
  const need = visit.symptoms.map(s => s.tool);
  const missing = visit.symptoms.find(s => !picked.includes(s.tool));
  const extra = picked.find(id => !need.includes(id));
  if (extra) {
    const use = TOOL_USE[extra];
    const why = use ? `${josa(nameOf(items, extra), '은', '는')} ${use} 써요.` : `${josa(nameOf(items, extra), '은', '는')} 지금 필요하지 않아요.`;
    const ask = (missing ?? visit.symptoms[0]).when;
    return { ok: false, kind: 'wrong-tool', say: `${why} ${ask}는 무엇이 필요할까요?` };
  }
  if (missing) {
    const good = visit.symptoms.filter(s => picked.includes(s.tool)).map(s => nameOf(items, s.tool));
    return { ok: false, kind: 'missing', say: `${josa(joinAnd(good), '은', '는')} 잘 골랐어요. ${missing.when}는 무엇이 필요할까요?` };
  }
  return { ok: true, kind: 'ok', say: `고마워요, 의사 선생님! ${visit.symptoms.map(s => s.cure).join(' ')}` };
}

/** 환자 놀이: 아이 말을 듣고 의사가 할 말. */
export function judgeComplaint(visit: Visit, text: string, age: Age): Verdict {
  const said = norm(text);
  const hit = (s: Symptom) => s.words.some(w => said.includes(w));
  const told = visit.symptoms.filter(hit);
  if (!told.length) {
    const other = SYMPTOMS.some(s => !visit.symptoms.includes(s) && hit(s));
    return other
      ? { ok: false, kind: 'wrong-place', say: '음, 그림을 다시 볼까요? 어디가 아픈지 말해 줘요.' }
      : { ok: false, kind: 'nothing', say: '어디가 아파서 왔어요? 그림을 보고 말해 봐요.' };
  }
  if (told.length < visit.symptoms.length) return { ok: false, kind: 'missing', say: '또 어디가 아파요? 그림을 다시 봐요.' };
  const tip = age !== '3' && !/선생님/.test(said) ? ' 다음에는 "선생님," 하고 불러서 말해 봐요.' : '';
  return { ok: true, kind: 'ok', say: `많이 아팠죠? ${visit.symptoms.map(s => s.treat).join(' ')} 금방 나을 거예요.${tip}` };
}
