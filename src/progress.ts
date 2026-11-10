// 마을 지도 보물: 가게 놀이를 한 판 끝까지 하면 열쇠를 받고, 그 열쇠로 그 가게 보물상자를 열어 보물(가게 물건 하나)을 찾습니다.
// 보물을 찾으면 다음 가게가 열립니다.
// 이 기기 브라우저(localStorage)에만 두고, 아이 이름이나 점수는 저장하지 않습니다 (어느 가게를 끝냈는지와 찾은 보물만).
// 선생님 페이지에서 "보물 모두 지우기"로 처음부터 다시 할 수 있습니다.
// (코드 안의 stamp 이름은 처음 만든 '도장' 보상에서 이어 온 것입니다. cleared = 보물을 찾은 가게.)
import type { Item, Shop } from './game';
import { shownItems } from './game';

export const PROGRESS_KEY = 'kids-shop:progress:v1';
/** cleared: 보물을 찾은 가게 id, treasures: 가게 id → 찾은 보물(물건 id) */
export type Progress = { cleared: string[]; treasures: Record<string, string> };
export const EMPTY: Progress = { cleared: [], treasures: {} };

const storage = (): Storage | null => { try { return window.localStorage; } catch { return null; } };

export function loadProgress(): Progress {
  try {
    const data = JSON.parse(storage()?.getItem(PROGRESS_KEY) ?? 'null') as { cleared?: unknown; treasures?: unknown } | null;
    const cleared = Array.isArray(data?.cleared) ? data.cleared.filter((x): x is string => typeof x === 'string').slice(0, 200) : [];
    const raw = data?.treasures && typeof data.treasures === 'object' && !Array.isArray(data.treasures) ? data.treasures as Record<string, unknown> : {};
    const treasures: Record<string, string> = {};
    for (const [k, v] of Object.entries(raw).slice(0, 200)) if (typeof v === 'string') treasures[k] = v;
    return { cleared: [...new Set(cleared)], treasures };
  } catch {
    return { cleared: [], treasures: {} };
  }
}

export function saveProgress(p: Progress): boolean {
  try { storage()?.setItem(PROGRESS_KEY, JSON.stringify(p)); return true; } catch { return false; }
}

export const hasStamp = (p: Progress, id: string) => p.cleared.includes(id);
/** 가게 하나를 끝냈다고 적습니다. treasure 는 그 가게에서 찾은 물건 id (처음 한 번만 적습니다). */
export const withStamp = (p: Progress, id: string, treasure?: string): Progress => (hasStamp(p, id) ? p
  : { cleared: [...p.cleared, id], treasures: treasure ? { ...p.treasures, [id]: treasure } : p.treasures });

/** 보물상자에서 나올 물건: 그 가게 물건 중 하나를 무작위로 (무엇이 나올지 모르는 깜짝 선물) */
export function pickTreasure(shop: Shop, rng: () => number = Math.random): Item | undefined {
  const items = shownItems(shop);
  return items[Math.min(items.length - 1, Math.floor(rng() * items.length))];
}

/** 그 가게에서 찾은 보물 물건. 기록이 없거나 선생님이 물건을 지웠으면 가게 첫 물건(간판)으로 보여 줍니다. */
export function treasureOf(shop: Shop, p: Progress): Item | undefined {
  const items = shownItems(shop);
  return items.find(i => i.id === p.treasures[shop.id]) ?? items[0];
}

/** 열린 가게: 첫 가게, 선생님이 고른 가게(always), 보물을 찾은 가게, 바로 앞 가게 보물을 찾은 가게. openAll 이면 모두. */
export function isOpen(shops: Shop[], p: Progress, i: number, openAll: boolean, always?: string): boolean {
  if (openAll || i <= 0 || shops[i].id === always) return true;
  return hasStamp(p, shops[i].id) || hasStamp(p, shops[i - 1].id);
}

/** 다음에 갈 가게: 열려 있고 아직 보물을 찾지 않은 첫 가게. 다 찾았으면 null. */
export function nextShop(shops: Shop[], p: Progress, openAll: boolean, always?: string): Shop | null {
  return shops.find((s, i) => !hasStamp(p, s.id) && isOpen(shops, p, i, openAll, always)) ?? null;
}

/** 지금 마을에 있는 가게 중 보물을 찾은 수 */
export const stampCount = (shops: Shop[], p: Progress) => shops.filter(s => hasStamp(p, s.id)).length;
