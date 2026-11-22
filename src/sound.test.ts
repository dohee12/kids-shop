import { describe, expect, it } from 'vitest';
import { CUSTOMERS, ITEMS, judgeSpoken, parseSpoken, type Order } from './game';
import { judgeComplaint, SYMPTOMS } from './clinic';
import { nearest, sound, soundsLike } from './sound';

const item = (id: string) => ITEMS.find(x => x.id === id)!;
const order = (...lines: [string, number][]): Order => ({ customer: CUSTOMERS[0], lines: lines.map(([id, count]) => ({ item: item(id), count })) });
const ids = (o: Order) => o.lines.map(l => l.item.id);

describe('소리 묶음', () => {
  it('된소리·거센소리·ㅅㅈㅊ 를 같은 묶음으로 봅니다', () => {
    expect(sound('사과').tokens).toEqual(sound('다가').tokens);
    expect(sound('크레파스').tokens).toEqual(sound('그레빠쯔').tokens);
  });
  it('이어 읽기도 같게 봅니다 (곰인형 = 고민형)', () => expect(sound('곰인형').tokens).toEqual(sound('고민형').tokens));
});

describe('아이 발음 알아듣기', () => {
  it.each([
    ['다과 한 개 주세요', 'apple'],
    ['빠나나 두 개', 'banana'],
    ['아나나 두 개', 'banana'],
    ['그레빠쯔 주세요', 'crayon'],
    ['고미녕 주세요', 'bear'],
    ['두두 주세요', 'juice'],
    ['달갈 주세요', 'egg'],
  ])('"%s" → %s', (said, id) => {
    expect(nearest(said.replace(/\s/g, ''), item(id).name) ?? nearest(said.replace(/\s/g, ''), item(id).aliases?.[0] ?? '')).not.toBeNull();
  });
  it('한 글자 물건(공)은 소리로 찾지 않습니다 (다른 말에 섞여 잘못 걸리지 않게)', () => expect(nearest('고마워요', '공')).toBeNull());
  it('전혀 다른 말은 찾지 않습니다', () => {
    expect(nearest('안녕하세요', '바나나')).toBeNull();
    expect(nearest('네', '사과')).toBeNull();
  });

  it('정답 물건만 소리로 찾고, 개수도 읽습니다', () => {
    const o = order(['apple', 2]);
    expect(parseSpoken('다과 두 개 주세요', ITEMS, ids(o)).get('apple')).toBe(2);
    expect(judgeSpoken(o, '다과 두 개 주세요', '5').ok).toBe(true);
    // 정답이 아니면 소리로 찾지 않습니다
    expect(parseSpoken('다과 두 개 주세요', ITEMS, []).size).toBe(0);
  });
  it('"주세요"를 정답 "주스"로 잘못 듣지 않습니다', () => {
    const o = order(['apple', 1], ['juice', 1]);
    expect(judgeSpoken(o, '사과 한 개 주세요', '5')).toMatchObject({ ok: false, kind: 'missing' });
  });
  it('글자 그대로 들린 다른 물건은 여전히 알려 줍니다', () => {
    expect(judgeSpoken(order(['apple', 1]), '우유 주세요', '5')).toMatchObject({ ok: false, kind: 'wrong-item' });
  });
});

describe('너그럽게 보기 (처음 해요 · 두 번 막힌 뒤)', () => {
  it('처음 해요: 물건 이름만 말해도 맞아요', () => {
    expect(judgeSpoken(order(['apple', 1]), '다과', '1').ok).toBe(true);
    expect(judgeSpoken(order(['apple', 1]), '사과 세 개', '1').ok).toBe(true);
  });
  it('lenient 이면 개수를 잘못 들어도 넘어갑니다', () => {
    const o = order(['apple', 3]);
    expect(judgeSpoken(o, '사과 주세요', '5').kind).toBe('no-count');
    expect(judgeSpoken(o, '사과 주세요', '5', ITEMS, true).ok).toBe(true);
  });
  it('lenient 이면 정답을 다 말했을 때 잘못 들린 다른 낱말은 넘어갑니다', () => {
    expect(judgeSpoken(order(['apple', 1]), '사과랑 우유', '5', ITEMS, true).ok).toBe(true);
  });
  it('병원: 그림에 나온 아픈 곳은 발음이 조금 달라도 알아듣습니다', () => {
    const nose = SYMPTOMS.find(s => s.id === 'nose')!;
    const cough = SYMPTOMS.find(s => s.id === 'cough')!;
    const v = { customer: CUSTOMERS[0], symptoms: [cough] };
    expect(soundsLike('기딤이나요', '기침')).toBe(true);
    expect(judgeComplaint(v, '기딤이 나요', '5').ok).toBe(true);
    // 두 군데인데 하나만 말해도 처음 해요·lenient 면 맞아요
    const two = { customer: CUSTOMERS[0], symptoms: [cough, nose] };
    expect(judgeComplaint(two, '기침이 나요', '5').ok).toBe(false);
    expect(judgeComplaint(two, '기침이 나요', '5', true).ok).toBe(true);
  });
});
