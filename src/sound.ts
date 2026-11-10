// 아이 발음에 너그러운 낱말 찾기.
// 만 3~5세는 소리를 바꿔 말하는 일이 흔합니다 (사과→다과, 주스→두두, 크레파스→크레빠쯔, 바나나→빠나나, 곰인형→고민영).
// 음성 인식은 들린 그대로 글자로 바꾸므로, 낱말을 자모로 풀고 헷갈리기 쉬운 소리를 한 묶음으로 본 뒤
// 조금 달라도(긴 낱말일수록 더 너그럽게) 같은 낱말로 봅니다.
// 아무 낱말이나 맞다고 하지 않도록, 화면에 나온 정답 물건에만 씁니다 (game.ts 의 parseSpoken).

const CHO = ['g', 'g', 'n', 'd', 'd', 'n', 'm', 'b', 'b', 'd', 'd', '', 'd', 'd', 'd', 'g', 'd', 'b', ''];
// 초성 순서: ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ
//  - 된소리·거센소리는 예사소리와 한 묶음 (ㄱㄲㅋ, ㄷㄸㅌ, ㅂㅃㅍ)
//  - ㅅ·ㅆ·ㅈ·ㅉ·ㅊ 은 ㄷ 묶음: 아이들이 가장 흔하게 바꿔 내는 소리 (사과→다과, 주세요→두데요)
//  - ㄹ 은 ㄴ 묶음 (라면→나면), 초성 ㅇ·ㅎ 은 소리 없음으로 봅니다 (하나→아나)
const JUNG = ['a', 'e', 'ya', 'ye', 'eo', 'e', 'yeo', 'ye', 'o', 'a', 'e', 'e', 'yo', 'u', 'eo', 'e', 'i', 'yu', 'u', 'i', 'i'];
// 중성 순서: ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ
//  - ㅐ·ㅔ, ㅒ·ㅖ 는 어른도 구별하지 않습니다. ㅡ·ㅜ, ㅢ·ㅣ 도 한 묶음.
//  - ㅘ·ㅝ·ㅙ·ㅚ·ㅞ·ㅟ 는 'ㅗ/ㅜ' 소리를 빼고 봅니다 (사과→사가, 과자→가자)
const JONG = ['', 'g', 'g', 'g', 'n', 'n', 'n', 'd', 'n', 'g', 'm', 'n', 'n', 'n', 'b', 'n', 'm', 'b', 'b', 'd', 'd', 'q', 'd', 'd', 'g', 'd', 'b', ''];
// 종성(받침)은 소리 나는 대로: ㅅㅆㅈㅊㅌ→ㄷ, ㅇ 받침은 따로(q), ㅎ 받침은 소리 없음

export type Sound = { tokens: string[]; at: number[] };

/** 글자를 소리 조각으로 풉니다. at[k] 는 k번째 조각이 나온 글자 위치입니다.
 *  받침을 다음 글자 초성과 구별하지 않으므로 이어 읽기("곰인형"="고민형")도 같게 나옵니다. */
export function sound(text: string): Sound {
  const tokens: string[] = [];
  const at: number[] = [];
  const push = (t: string, i: number) => { if (t) { tokens.push(t); at.push(i); } };
  [...text].forEach((ch, i) => {
    const code = ch.charCodeAt(0) - 0xac00;
    if (code < 0 || code > 11171) { push(ch.toLowerCase(), i); return; }
    push(CHO[Math.floor(code / 588)], i);
    push(JUNG[Math.floor((code % 588) / 28)], i);
    push(JONG[code % 28], i);
  });
  return { tokens, at };
}

/** 낱말 길이(소리 조각 수)에 따라 봐줄 차이: 짧은 낱말은 묶음만 같으면, 긴 낱말은 한두 군데 달라도 */
export const allowance = (len: number) => (len >= 8 ? 2 : len >= 4 ? 1 : 0);

export type Near = { start: number; end: number; cost: number };

/** text 안에서 word 와 소리가 가장 비슷한 곳을 찾습니다 (글자 위치, 끝은 포함하지 않음).
 *  한 글자 낱말(공·귤·펜)은 다른 말에 섞여 잘못 걸리기 쉬워서 찾지 않습니다. */
export function nearest(text: string, word: string): Near | null {
  if ([...word].length < 2) return null;
  const p = sound(word).tokens;
  const t = sound(text);
  const k = allowance(p.length);
  const n = t.tokens.length;
  if (!p.length || !n) return null;
  // 어디서 시작해도 되는 편집 거리 (Sellers). start[j] 는 그 칸까지 온 길의 시작 조각.
  let prev = Array.from({ length: n + 1 }, () => 0);
  let prevStart = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= p.length; i++) {
    const cur = [i];
    const curStart = [0];
    for (let j = 1; j <= n; j++) {
      const sub = prev[j - 1] + (p[i - 1] === t.tokens[j - 1] ? 0 : 1);
      const del = prev[j] + 1; // 아이가 소리를 빼먹음
      const ins = cur[j - 1] + 1; // 소리를 더 넣음
      const best = Math.min(sub, del, ins);
      cur.push(best);
      curStart.push(best === sub ? prevStart[j - 1] : best === del ? prevStart[j] : curStart[j - 1]);
    }
    prev = cur;
    prevStart = curStart;
  }
  let bestJ = -1;
  for (let j = 1; j <= n; j++) if (prev[j] <= k && (bestJ < 0 || prev[j] < prev[bestJ])) bestJ = j;
  if (bestJ < 0) return null;
  const s = Math.min(prevStart[bestJ], bestJ - 1);
  return { start: t.at[s], end: t.at[bestJ - 1] + 1, cost: prev[bestJ] };
}

/** 소리가 비슷한 낱말이 들어 있나요? (병원 놀이 "콧물"→"꼰물") */
export const soundsLike = (text: string, word: string) => nearest(text, word) !== null;
