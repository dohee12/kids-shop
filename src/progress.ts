// 마을 지도 도장: 가게 놀이를 한 판 끝까지 하면 그 가게 도장을 받고, 다음 가게가 열립니다.
// 이 기기 브라우저(localStorage)에만 두고, 아이 이름이나 점수는 저장하지 않습니다 (어느 가게를 끝냈는지만).
// 선생님 페이지에서 "도장 모두 지우기"로 처음부터 다시 할 수 있습니다.
import type { Shop } from './game';

export const PROGRESS_KEY = 'kids-shop:progress:v1';
/** cleared: 도장을 받은 가게 id */
export type Progress = { cleared: string[] };

const storage = (): Storage | null => { try { return window.localStorage; } catch { return null; } };

export function loadProgress(): Progress {
  try {
    const data = JSON.parse(storage()?.getItem(PROGRESS_KEY) ?? 'null') as { cleared?: unknown } | null;
    const cleared = Array.isArray(data?.cleared) ? data.cleared.filter((x): x is string => typeof x === 'string').slice(0, 200) : [];
    return { cleared: [...new Set(cleared)] };
  } catch {
    return { cleared: [] };
  }
}

export function saveProgress(p: Progress): boolean {
  try { storage()?.setItem(PROGRESS_KEY, JSON.stringify(p)); return true; } catch { return false; }
}

export const hasStamp = (p: Progress, id: string) => p.cleared.includes(id);
export const withStamp = (p: Progress, id: string): Progress => (hasStamp(p, id) ? p : { cleared: [...p.cleared, id] });

/** 열린 가게: 첫 가게, 선생님이 고른 가게(always), 도장을 받은 가게, 바로 앞 가게 도장을 받은 가게. openAll 이면 모두. */
export function isOpen(shops: Shop[], p: Progress, i: number, openAll: boolean, always?: string): boolean {
  if (openAll || i <= 0 || shops[i].id === always) return true;
  return hasStamp(p, shops[i].id) || hasStamp(p, shops[i - 1].id);
}

/** 다음에 갈 가게: 열려 있고 아직 도장이 없는 첫 가게. 다 받았으면 null. */
export function nextShop(shops: Shop[], p: Progress, openAll: boolean, always?: string): Shop | null {
  return shops.find((s, i) => !hasStamp(p, s.id) && isOpen(shops, p, i, openAll, always)) ?? null;
}

/** 지금 마을에 있는 가게 중 도장을 받은 수 */
export const stampCount = (shops: Shop[], p: Progress) => shops.filter(s => hasStamp(p, s.id)).length;
