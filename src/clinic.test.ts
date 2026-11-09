import { describe, expect, it } from 'vitest';
import { complaintText, judgeCare, judgeComplaint, makeVisit, SYMPTOMS, symptomsFor, TOOL_USE, type Visit } from './clinic';
import { CUSTOMERS } from './game';
import { asksWhere, judgeWhere, kioskAsk, makeKioskOrder, type KioskOrder } from './kiosk';
import { checkShop } from './shop';
import { BUILTIN } from './themes';

const clinic = BUILTIN.find(s => s.id === 'clinic')!;
const kiosk = BUILTIN.find(s => s.id === 'kiosk')!;
const sym = (id: string) => SYMPTOMS.find(s => s.id === id)!;
const visit = (...ids: string[]): Visit => ({ customer: CUSTOMERS[1], symptoms: ids.map(sym) });

describe('병원 놀이 규칙', () => {
  it('아픈 곳마다 꼬마 병원에 맞는 도구가 있고, 도구마다 쓰임이 적혀 있습니다', () => {
    const ids = clinic.items.map(i => i.id);
    for (const s of SYMPTOMS) expect(ids).toContain(s.tool);
    for (const id of ids) expect(TOOL_USE[id]).toBeTruthy();
    expect(symptomsFor(clinic)).toHaveLength(SYMPTOMS.length);
  });

  it('나이에 따라 아픈 곳 수가 다릅니다 (만 3세 하나, 만 5세 둘)', () => {
    for (let i = 0; i < 20; i++) {
      expect(makeVisit('3', Math.random, undefined, clinic).symptoms).toHaveLength(1);
      const two = makeVisit('7', Math.random, undefined, clinic).symptoms;
      expect(two).toHaveLength(2);
      expect(two[0].id).not.toBe(two[1].id);
    }
  });

  it('숨긴 도구가 필요한 아픈 곳은 나오지 않습니다', () => {
    const shop = { ...clinic, items: clinic.items.map(i => (i.id === 'h-bandage' ? { ...i, hidden: true } : i)) };
    for (let i = 0; i < 30; i++) expect(makeVisit('7', Math.random, undefined, shop).symptoms.map(s => s.id)).not.toContain('scrape');
  });

  it('도구가 하나도 안 보이면 선생님 페이지에서 저장을 막습니다', () => {
    expect(checkShop(clinic)).toEqual([]);
    const shop = { ...clinic, items: [{ ...clinic.items[0], id: 'x', name: '장난감' }, { ...clinic.items[0], id: 'y', name: '인형' }] };
    expect(checkShop(shop).join()).toContain('진료 도구');
  });

  it('환자가 하는 말', () => {
    expect(complaintText(visit('fever', 'nose'))).toBe('선생님, 몸이 뜨겁고 열이 나요. 그리고 콧물이 줄줄 나요.');
  });

  it('의사 놀이: 다른 도구를 고르면 그 도구의 쓰임을 알려 주고 다시 생각하게 합니다', () => {
    const v = visit('scrape');
    expect(judgeCare(v, {}, clinic.items).kind).toBe('empty');
    expect(judgeCare(v, { 'h-thermo': 1 }, clinic.items).say).toBe('체온계는 몸이 얼마나 뜨거운지 잴 때 써요. 무릎에 상처가 났을 때는 무엇이 필요할까요?');
    const ok = judgeCare(v, { 'h-bandage': 1 }, clinic.items);
    expect(ok.ok).toBe(true);
    expect(ok.say).toContain('반창고를 붙이니');
  });

  it('의사 놀이: 두 군데가 아프면 하나만 골랐을 때 나머지를 묻습니다', () => {
    const v = visit('fever', 'bump');
    expect(judgeCare(v, { 'h-thermo': 1 }, clinic.items).say).toBe('체온계는 잘 골랐어요. 머리에 혹이 났을 때는 무엇이 필요할까요?');
    expect(judgeCare(v, { 'h-thermo': 1, 'h-ice': 1 }, clinic.items).ok).toBe(true);
  });

  it('환자 놀이: 어디가 아픈지 알아듣습니다', () => {
    const v = visit('cough');
    expect(judgeComplaint(v, '선생님 콜록콜록 기침이 나요', '5').ok).toBe(true);
    expect(judgeComplaint(v, '기침이 나요', '5').say).toContain('"선생님,"');
    expect(judgeComplaint(v, '기침', '3').say).not.toContain('선생님,');
    expect(judgeComplaint(v, '열이 나요', '5').kind).toBe('wrong-place');
    expect(judgeComplaint(v, '안녕하세요', '5').kind).toBe('nothing');
    expect(judgeComplaint(visit('cough', 'nose'), '기침이 나요', '7').kind).toBe('missing');
    expect(judgeComplaint(visit('cough', 'nose'), '기침이 나고 콧물이 나요', '7').ok).toBe(true);
  });
});

describe('키오스크 놀이 규칙', () => {
  it('만 3세는 먹는 곳을 묻지 않습니다', () => {
    expect(asksWhere('3')).toBe(false);
    for (let i = 0; i < 10; i++) expect(makeKioskOrder('clerk', '3', Math.random, undefined, kiosk).where).toBe('here');
  });

  it('친구 부탁과 먹는 곳 판정', () => {
    const o: KioskOrder = { customer: CUSTOMERS[2], where: 'togo', lines: [{ item: kiosk.items[0], count: 2 }] };
    expect(kioskAsk(o, '5')).toBe('햄버거 두 개 주문해 주세요. 집에 가져갈 거예요.');
    expect(kioskAsk(o, '3')).toBe('햄버거 두 개 주문해 주세요.');
    expect(judgeWhere(o, 'here').say).toBe('고양이는 "집에 가져갈 거예요."라고 했어요. 다시 골라 볼까요?');
    expect(judgeWhere(o, 'togo').ok).toBe(true);
  });
});
