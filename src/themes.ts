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

const SNACK: Shop = {
  id: 'snack', name: '꼬마 분식집', greeting: '어서 오세요! 따끈한 음식이 있어요. 무엇을 드릴까요?', customers: all, rounds: 5,
  aisles: [{ id: 'k1', label: '차림표' }],
  items: [
    it('k-ramen', '라면', 'k1', '밥·국수', '🍜', '그릇', ['라멘']),
    it('k-curry', '카레', 'k1', '밥·국수', '🍛', '그릇', ['카레라이스']),
    it('k-riceball', '주먹밥', 'k1', '밥·국수', '🍙', '개', ['삼각김밥']),
    it('k-dumpling', '만두', 'k1', '간식', '🥟', '개', ['군만두', '물만두']),
    it('k-fishcake', '어묵', 'k1', '간식', '🍢', '개', ['오뎅', '어묵꼬치']),
    it('k-shrimp', '새우튀김', 'k1', '간식', '🍤', '개', ['튀김']),
    it('k-hotdog', '핫도그', 'k1', '간식', '🌭', '개'),
    it('k-drink', '음료수', 'k1', '마실 것', '🥤', '잔', ['음료', '콜라', '사이다']),
  ],
};

const FLOWER: Shop = {
  id: 'flower', name: '꼬마 꽃집', greeting: '어서 오세요! 예쁜 꽃이 많아요. 어떤 꽃을 드릴까요?', customers: all, rounds: 5,
  aisles: [{ id: 'p1', label: '꽃 진열대' }],
  items: [
    it('p-rose', '장미', 'p1', '꽃', '🌹', '송이', ['장미꽃']),
    it('p-tulip', '튤립', 'p1', '꽃', '🌷', '송이', ['튜울립', '튤립꽃']),
    it('p-sunflower', '해바라기', 'p1', '꽃', '🌻', '송이'),
    it('p-daisy', '데이지', 'p1', '꽃', '🌼', '송이', ['들국화']),
    it('p-bouquet', '꽃다발', 'p1', '선물', '💐', '다발'),
    it('p-pot', '화분', 'p1', '화분', '🪴', '개', ['나무']),
    it('p-cactus', '선인장', 'p1', '화분', '🌵', '개'),
  ],
};

const ICECREAM: Shop = {
  id: 'icecream', name: '꼬마 아이스크림 가게', greeting: '어서 오세요! 시원한 간식이 있어요. 무엇을 드릴까요?', customers: all, rounds: 5,
  aisles: [{ id: 'i1', label: '냉동 진열대' }],
  items: [
    it('i-cone', '소프트콘', 'i1', '아이스크림', '🍦', '개', ['아이스크림콘', '콘']),
    it('i-cup', '컵아이스크림', 'i1', '아이스크림', '🍨', '개'),
    it('i-bingsu', '팥빙수', 'i1', '아이스크림', '🍧', '그릇', ['빙수']),
    it('i-choco', '초콜릿', 'i1', '과자', '🍫', '개', ['초콜렛', '쪼꼬렛', '초코']),
    it('i-candy', '사탕', 'i1', '과자', '🍭', '개', ['막대사탕']),
    it('i-milk', '우유', 'i1', '마실 것', 'milk', '잔'),
  ],
};

const CLOTHES: Shop = {
  id: 'clothes', name: '꼬마 옷가게', greeting: '어서 오세요! 어떤 옷을 찾으세요?', customers: all, rounds: 5,
  aisles: [{ id: 'c1', label: '옷 진열대' }],
  items: [
    it('c-tshirt', '티셔츠', 'c1', '옷', '👕', '벌', ['티', '반팔']),
    it('c-pants', '바지', 'c1', '옷', '👖', '벌', ['청바지']),
    it('c-dress', '원피스', 'c1', '옷', '👗', '벌', ['치마']),
    it('c-socks', '양말', 'c1', '신발·양말', '🧦', '켤레'),
    it('c-shoes', '운동화', 'c1', '신발·양말', '👟', '켤레', ['신발']),
    it('c-gloves', '장갑', 'c1', '모자·장갑', '🧤', '켤레', ['벙어리장갑']),
    it('c-cap', '모자', 'c1', '모자·장갑', '🧢', '개'),
    it('c-scarf', '목도리', 'c1', '모자·장갑', '🧣', '개', ['스카프']),
  ],
};

const CLINIC: Shop = {
  id: 'clinic', kind: 'clinic', name: '꼬마 병원', greeting: '어서 오세요! 어디가 아파서 왔어요?', customers: all, rounds: 5,
  aisles: [{ id: 'h1', label: '진료 도구' }],
  items: [
    it('h-bandage', '반창고', 'h1', '붙이고 대는 것', '🩹', '개', ['밴드', '대일밴드']),
    it('h-ice', '얼음주머니', 'h1', '붙이고 대는 것', '🧊', '개', ['얼음', '얼음팩']),
    it('h-tissue', '휴지', 'h1', '붙이고 대는 것', 'tissue', '개', ['티슈', '화장지']),
    it('h-thermo', '체온계', 'h1', '재고 살피는 것', '🌡️', '개', ['온도계']),
    it('h-stetho', '청진기', 'h1', '재고 살피는 것', '🩺', '개'),
    it('h-light', '손전등', 'h1', '재고 살피는 것', '🔦', '개', ['후레쉬', '플래시']),
  ],
};

const KIOSK: Shop = {
  id: 'kiosk', kind: 'kiosk', name: '꼬마 키오스크', greeting: '어서 오세요! 말로 주문해 주세요.', customers: all, rounds: 5,
  aisles: [{ id: 'm1', label: '버거·치킨' }, { id: 'm2', label: '음료·디저트' }],
  items: [
    it('m-burger', '햄버거', 'm1', '버거·치킨', '🍔', '개', ['버거', '햄버거세트']),
    it('m-chicken', '치킨', 'm1', '버거·치킨', '🍗', '조각', ['닭다리', '통닭']),
    it('m-pizza', '피자', 'm1', '버거·치킨', '🍕', '조각'),
    it('m-fries', '감자튀김', 'm1', '버거·치킨', '🍟', '개', ['프렌치프라이', '감튀']),
    it('m-cola', '콜라', 'm2', '음료·디저트', '🥤', '잔', ['사이다', '음료수']),
    it('m-juice', '주스', 'm2', '음료·디저트', 'juice', '잔', ['쥬스', '오렌지주스']),
    it('m-icecream', '아이스크림', 'm2', '음료·디저트', '🍦', '개', ['소프트콘']),
    it('m-donut', '도넛', 'm2', '음료·디저트', '🍩', '개', ['도너츠', '도나츠']),
  ],
};

export const BUILTIN: Shop[] = [SUPER, FRUIT, BAKERY, STATIONERY, SNACK, FLOWER, ICECREAM, CLOTHES, CLINIC, KIOSK];
export const isBuiltin = (id: string) => BUILTIN.some(s => s.id === id);

/** 붙여 넣은 물건 이름으로 그림을 짐작할 때 씁니다 ("사과" → 사과 그림). */
export const PIC_BY_NAME: Record<string, string> = Object.fromEntries(
  BUILTIN.flatMap(s => s.items).flatMap(i => [i.name, ...(i.aliases ?? [])].map(n => [n, i.pic ?? ''])),
);
