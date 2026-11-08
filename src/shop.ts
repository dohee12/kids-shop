// 선생님이 고친 놀이 주제를 이 기기 브라우저(localStorage)에만 저장합니다.
// 서버로 보내지 않고, 아이 이름이나 기록은 다루지 않습니다.
import { isArt, isPhoto } from './Art';
import { CUSTOMERS, DEFAULT_GREETING, UNITS, shownItems, type Aisle, type Item, type Shop } from './game';
import { BUILTIN, PIC_BY_NAME } from './themes';

export const STORE_KEY = 'kids-shop:v1';
export const LIMITS = { items: 40, aisles: 3, name: 20, greeting: 80, aliases: 8, photo: 200_000 } as const;

/** micOn: 손님 놀이에서 마이크 쓰기 (선생님 설정) */
export type Store = { current: string; micOn: boolean; shops: Shop[] };

const copy = <T,>(v: T): T => JSON.parse(JSON.stringify(v));
export const defaultStore = (): Store => ({ current: 'super', micOn: true, shops: copy(BUILTIN) });

function storage(): Storage | null {
  try { return window.localStorage; } catch { return null; }
}

/** 저장된 것을 읽습니다. 없거나 망가졌으면 기본 주제로 시작합니다. */
export function loadStore(): Store {
  try {
    const raw = storage()?.getItem(STORE_KEY);
    if (!raw) return defaultStore();
    const data = JSON.parse(raw) as { current?: unknown; micOn?: unknown; shops?: unknown };
    const shops = (Array.isArray(data.shops) ? data.shops : []).map(sanitizeShop).filter((s): s is Shop => s !== null);
    // 나중에 기본 주제가 늘어나면 뒤에 붙여 줍니다.
    for (const b of BUILTIN) if (!shops.some(s => s.id === b.id)) shops.push(copy(b));
    const current = shops.some(s => s.id === data.current) ? (data.current as string) : shops[0].id;
    return { current, micOn: data.micOn !== false, shops };
  } catch {
    return defaultStore();
  }
}

/** 저장에 성공하면 true. 사생활 보호 창이나 공간 부족이면 false. */
export function saveStore(store: Store): boolean {
  try {
    const s = storage();
    if (!s) return false;
    s.setItem(STORE_KEY, JSON.stringify(store));
    return true;
  } catch {
    return false;
  }
}

// ── 들어온 값 다듬기 (저장된 것, 불러온 파일 모두 이 길을 거칩니다) ──

const text = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max) : '');
const isUnit = (u: string) => (UNITS as readonly string[]).includes(u);

export function cleanPic(v: unknown): string {
  if (typeof v !== 'string') return '';
  if (isArt(v)) return v;
  if (v.startsWith('data:')) return isPhoto(v) && v.length <= LIMITS.photo ? v : '';
  const t = v.trim();
  return [...t].length <= 8 ? t : ''; // 이모지나 짧은 글자만 (가족 이모지처럼 여러 글자로 된 것도 들어가게 8까지)
}

export function sanitizeShop(raw: unknown): Shop | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const id = text(r.id, 40);
  if (!id) return null;
  const aisles: Aisle[] = (Array.isArray(r.aisles) ? r.aisles : [])
    .map(a => ({ id: text((a as Aisle)?.id, 40), label: text((a as Aisle)?.label, LIMITS.name) || '진열대' }))
    .filter((a, i, list) => a.id && list.findIndex(b => b.id === a.id) === i)
    .slice(0, LIMITS.aisles);
  if (!aisles.length) aisles.push({ id: 'a1', label: '진열대' });
  const items: Item[] = (Array.isArray(r.items) ? r.items : []).slice(0, LIMITS.items).flatMap(x => {
    if (!x || typeof x !== 'object') return [];
    const o = x as Record<string, unknown>;
    const itemId = text(o.id, 40);
    if (!itemId) return [];
    const unit = text(o.unit, 4);
    const aisle = text(o.aisle, 40);
    return [{
      id: itemId,
      name: text(o.name, LIMITS.name),
      aisle: aisles.some(a => a.id === aisle) ? aisle : aisles[0].id,
      shelf: text(o.shelf, LIMITS.name) || '진열대',
      unit: isUnit(unit) ? unit : '개',
      aliases: (Array.isArray(o.aliases) ? o.aliases : []).map(a => text(a, LIMITS.name)).filter(Boolean).slice(0, LIMITS.aliases),
      pic: cleanPic(o.pic),
      ...(o.hidden === true ? { hidden: true } : {}),
    }];
  }).filter((it, i, list) => list.findIndex(b => b.id === it.id) === i);
  const customers = (Array.isArray(r.customers) ? r.customers : []).filter(c => CUSTOMERS.some(k => k.id === c)) as string[];
  const rounds = Math.round(Number(r.rounds));
  return {
    id,
    name: text(r.name, LIMITS.name) || '우리 가게',
    greeting: text(r.greeting, LIMITS.greeting) || DEFAULT_GREETING,
    aisles,
    items,
    customers: customers.length ? customers : CUSTOMERS.map(c => c.id),
    rounds: rounds >= 3 && rounds <= 10 ? rounds : 5,
  };
}

/** 저장하기 전에 고쳐야 할 점. 비어 있으면 저장할 수 있습니다. */
export function checkShop(shop: Shop): string[] {
  const out: string[] = [];
  const shown = shownItems(shop);
  if (!shop.name.trim()) out.push('가게 이름을 적어 주세요.');
  if (shop.items.some(i => !i.name.trim())) out.push('이름이 비어 있는 물건이 있어요. 이름을 적거나 지워 주세요.');
  const seen = new Set<string>();
  const dup = new Set<string>();
  for (const i of shop.items) for (const w of [i.name, ...(i.aliases ?? [])].map(s => s.replace(/\s/g, '')).filter(Boolean)) {
    if (seen.has(w)) dup.add(w);
    seen.add(w);
  }
  if (dup.size) out.push(`같은 이름이나 다르게 부르는 말이 두 번 있어요: ${[...dup].join(', ')}. 말로 주문할 때 헷갈려요.`);
  if (shown.length === 0) out.push('아이 화면에 보이는 물건이 하나도 없어요.');
  else if (shown.length < 2) out.push('7세 놀이는 두 가지를 시켜요. 보이는 물건을 두 개 넘게 두면 좋아요.');
  return out;
}
/** 저장을 막는 문제만 (7세 안내는 저장은 됩니다) */
export const blocking = (problems: string[]) => problems.filter(p => !p.startsWith('7세'));

// ── 새 id ──

let seq = 0;
export function newId(prefix: string, taken: Iterable<string>): string {
  const used = new Set(taken);
  for (;;) {
    const id = `${prefix}${Date.now().toString(36)}${(seq++).toString(36)}`;
    if (!used.has(id)) return id;
  }
}

// ── 표에서 붙여 넣기 ──

export const PASTE_HELP = '이름 · 진열 칸 · 세는 말 · 다르게 부르는 말';

/** 지금 물건 목록을 붙여넣기 칸 모양(탭 구분)으로 */
export const toPaste = (shop: Shop) =>
  shop.items.map(i => [i.name, i.shelf, i.unit || '개', (i.aliases ?? []).join('/')].join('\t')).join('\n');

/** 엑셀·한글 표에서 복사한 줄(탭 구분)이나 쉼표로 쓴 줄을 물건 목록으로 바꿉니다.
 *  이름이 같은 물건은 그림·통로를 그대로 두고, 새 물건은 그림을 이름으로 짐작합니다. */
export function fromPaste(input: string, shop: Shop): { items: Item[]; skipped: number } {
  const items: Item[] = [];
  let skipped = 0;
  const taken = new Set(shop.items.map(i => i.id));
  for (const row of input.split(/\r?\n/)) {
    if (!row.trim()) continue;
    const cells = (row.includes('\t') ? row.split('\t') : row.split(',')).map(c => c.trim());
    const [name, shelf, unit, aliases] = cells;
    if (!name || name === '이름') { if (name !== '이름') skipped++; continue; }
    if (items.length >= LIMITS.items || items.some(i => i.name === name)) { skipped++; continue; }
    const old = shop.items.find(i => i.name === name);
    const sameShelf = shop.items.find(i => i.shelf === shelf);
    const id = old?.id ?? newId('c', taken);
    taken.add(id);
    items.push({
      id,
      name: name.slice(0, LIMITS.name),
      aisle: old?.aisle ?? sameShelf?.aisle ?? shop.aisles[0].id,
      shelf: (shelf || old?.shelf || '진열대').slice(0, LIMITS.name),
      unit: unit && isUnit(unit) ? unit : old?.unit ?? '개',
      aliases: aliases != null && aliases !== ''
        ? aliases.split(/[/·;]/).map(a => a.trim()).filter(Boolean).slice(0, LIMITS.aliases)
        : old?.aliases ?? [],
      pic: old?.pic ?? PIC_BY_NAME[name] ?? '📦',
    });
  }
  return { items, skipped };
}

// ── 파일로 내보내기·불러오기 ──

export const exportText = (shop: Shop) => JSON.stringify({ app: 'kids-shop', version: 1, shop }, null, 2);

/** 내보낸 파일을 읽습니다. 다른 기기에서 온 주제는 새 id 로 들어옵니다. */
export function importText(raw: string, taken: string[]): Shop | null {
  try {
    const data = JSON.parse(raw) as { app?: string; shop?: unknown };
    if (data?.app !== 'kids-shop') return null;
    const shop = sanitizeShop(data.shop);
    if (!shop) return null;
    return { ...shop, id: newId('t', taken) };
  } catch {
    return null;
  }
}
