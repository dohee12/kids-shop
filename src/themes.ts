// 처음부터 들어 있는 놀이 주제. 선생님은 이것을 고치거나 복사해서 새 주제를 만듭니다.
// 직접 그린 그림이 없는 물건은 이모지를 씁니다.
import { CUSTOMERS, DEFAULT_GREETING, SUPER, type Item, type Shop } from './game';

const all = CUSTOMERS.map(c => c.id);
const it = (id: string, name: string, aisle: string, shelf: string, pic: string, unit = '개', aliases?: string[]): Item =>
  ({ id, name, aisle, shelf, pic, unit, ...(aliases ? { aliases } : {}) });

const FRUIT: Shop = {
  id: 'fruit', name: '꼬마 과일가게', greeting: DEFAULT_GREETING, customers: all, rounds: 5,
  aisles: [{ id: 'a1', label: '과일 진열대' }],
  items: [
    it('f-apple', '사과', 'a1', '빨간 과일', 'apple'),
    it('f-strawberry', '딸기', 'a1', '빨간 과일', '🍓'),
    it('f-peach', '복숭아', 'a1', '빨간 과일', '🍑'),
    it('f-banana', '바나나', 'a1', '노란 과일', 'banana'),
    it('f-lemon', '레몬', 'a1', '노란 과일', '🍋'),
    it('f-tangerine', '귤', 'a1', '노란 과일', '🍊', '개', ['밀감']),
    it('f-watermelon', '수박', 'a1', '큰 과일', '🍉', '통'),
    it('f-grape', '포도', 'a1', '큰 과일', '🍇', '송이'),
  ],
};

const BAKERY: Shop = {
  id: 'bakery', name: '꼬마 빵집', greeting: '어서 오세요! 맛있는 빵이 있어요. 무엇을 드릴까요?', customers: all, rounds: 5,
  aisles: [{ id: 'b1', label: '빵 진열대' }],
  items: [
    it('b-bread', '식빵', 'b1', '빵', 'bread', '개', ['빵']),
    it('b-croissant', '크루아상', 'b1', '빵', '🥐', '개', ['크로와상', '크로아상', '크라상']),
    it('b-donut', '도넛', 'b1', '빵', '🍩', '개', ['도너츠', '도나쓰', '도너스', '도나츠']),
    it('b-cookie', '쿠키', 'b1', '과자·케이크', 'cookie', '개', ['과자']),
    it('b-cake', '케이크', 'b1', '과자·케이크', '🍰', '조각', ['케익', '케잌']),
    it('b-cupcake', '컵케이크', 'b1', '과자·케이크', '🧁', '개', ['컵케익']),
    it('b-milk', '우유', 'b1', '마실 것', 'milk'),
    it('b-juice', '주스', 'b1', '마실 것', 'juice', '병', ['쥬스']),
  ],
};

const STATIONERY: Shop = {
  id: 'stationery', name: '꼬마 문구점', greeting: '어서 오세요! 필요한 물건을 말해 주세요.', customers: all, rounds: 5,
  aisles: [{ id: 's1', label: '1번 통로 · 문구' }, { id: 's2', label: '2번 통로 · 장난감' }],
  items: [
    it('s-crayon', '크레파스', 's1', '그리기', 'crayon', '개', ['크레용', '크레파쓰', '그레파스']),
    it('s-pencil', '연필', 's1', '그리기', '✏️', '자루'),
    it('s-scissors', '가위', 's1', '만들기', '✂️'),
    it('s-notebook', '공책', 's1', '만들기', '📒', '권', ['노트']),
    it('s-book', '그림책', 's1', '만들기', '📕', '권', ['동화책', '책']),
    it('s-ball', '공', 's2', '장난감', 'ball'),
    it('s-block', '블록', 's2', '장난감', 'block', '개', ['블럭', '레고']),
    it('s-bear', '곰인형', 's2', '장난감', 'bear', '개', ['곰돌이인형', '곰돌이', '인형']),
    it('s-car', '자동차', 's2', '장난감', '🚗', '개', ['붕붕이', '자동차장난감']),
  ],
};

export const BUILTIN: Shop[] = [SUPER, FRUIT, BAKERY, STATIONERY];
export const isBuiltin = (id: string) => BUILTIN.some(s => s.id === id);

/** 붙여 넣은 물건 이름으로 그림을 짐작할 때 씁니다 ("사과" → 사과 그림). */
export const PIC_BY_NAME: Record<string, string> = Object.fromEntries(
  BUILTIN.flatMap(s => s.items).flatMap(i => [i.name, ...(i.aliases ?? [])].map(n => [n, i.pic ?? ''])),
);
