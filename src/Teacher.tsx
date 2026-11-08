// 선생님 페이지: 놀이 주제를 고르고, 가게 이름·손님·통로·물건을 고칩니다.
// 고친 것은 "저장하기"를 눌러야 아이 화면에 나오고, 이 기기 브라우저에만 저장됩니다.
import { useEffect, useRef, useState } from 'react';
import { ART_IDS, Animal, Pic } from './Art';
import { CUSTOMERS, ITEMS, UNITS, josa, ro, shownItems, type Item, type Shop } from './game';
import { DEFAULT_VOICE, koreanVoices, say, voiceLabel, voiceScore } from './speech';
import {
  LIMITS, PASTE_HELP, PITCH, RATE, blocking, checkShop, exportText, fromPaste, importText, newId, toPaste, type Store,
} from './shop';
import { BUILTIN, isBuiltin } from './themes';

/** draft: 미리보기에서 돌아올 때 고치던 내용 */
type Props = { store: Store; draft?: Store | null; onSave: (s: Store) => boolean; onClose: () => void; onPreview: (s: Store) => void };

const copy = <T,>(v: T): T => JSON.parse(JSON.stringify(v));
const ART_NAME: Record<string, string> = Object.fromEntries(ITEMS.map(i => [i.id, i.name]));
/** 이름에 따옴표를 두르고 받침에 맞는 조사를 붙입니다: ‘꼬마 빵집’을 / ‘바나나’를 */
const q = (name: string, a: string, b: string) => `‘${name}’${josa(name, a, b).slice(name.length)}`;
const qro = (name: string) => `‘${name}’${ro(name).slice(name.length)}`;
const ask = (question: string) => (typeof window.confirm === 'function' ? window.confirm(question) : true);

/** 사진을 160×160 으로 줄여 저장 공간을 아낍니다 (흰 바탕에 물건이 다 보이게). */
async function shrinkPhoto(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const s = 160;
    const c = document.createElement('canvas');
    c.width = c.height = s;
    const g = c.getContext('2d');
    if (!g) throw new Error('canvas');
    g.fillStyle = '#fff';
    g.fillRect(0, 0, s, s);
    const k = Math.min(s / img.width, s / img.height);
    g.drawImage(img, (s - img.width * k) / 2, (s - img.height * k) / 2, img.width * k, img.height * k);
    return c.toDataURL('image/jpeg', 0.82);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** 목소리 목록은 브라우저가 늦게 채워 주므로 바뀔 때마다 다시 읽습니다. */
function useVoices() {
  const [list, setList] = useState(koreanVoices);
  useEffect(() => {
    const synth = typeof window !== 'undefined' ? window.speechSynthesis : undefined;
    if (!synth) return;
    const update = () => setList(koreanVoices());
    synth.addEventListener?.('voiceschanged', update);
    update();
    return () => synth.removeEventListener?.('voiceschanged', update);
  }, []);
  return list;
}
const speedWord = (r: number) => (r < 0.8 ? '천천히' : r <= 1 ? '조금 천천히' : r <= 1.1 ? '보통' : '빠르게');
const pitchWord = (p: number) => (p < 0.9 ? '낮게' : p <= 1.1 ? '보통' : '높게');

/** 저장 직전 다듬기: 다르게 부르는 말의 빈칸·앞뒤 공백 */
const tidy = (shops: Shop[]): Shop[] => shops.map(s => ({
  ...s,
  name: s.name.trim(),
  items: s.items.map(i => ({ ...i, name: i.name.trim(), aliases: (i.aliases ?? []).map(a => a.trim()).filter(Boolean) })),
}));

export default function Teacher({ store, draft: start, onSave, onClose, onPreview }: Props) {
  const [shops, setShops] = useState<Shop[]>(() => copy((start ?? store).shops));
  const [current, setCurrent] = useState((start ?? store).current);
  const [micOn, setMicOn] = useState((start ?? store).micOn);
  const [voice, setVoiceDraft] = useState((start ?? store).voice);
  const voices = useVoices();
  const best = voices[0];
  const onlyRobot = voices.length > 0 && voiceScore(best) === 0;
  const [note, setNote] = useState('');
  const [picFor, setPicFor] = useState<string | null>(null);
  const [paste, setPaste] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const shop = shops.find(s => s.id === current) ?? shops[0];
  const draft = (): Store => ({ current: shop.id, micOn, voice, shops: tidy(shops) });
  const dirty = JSON.stringify(draft()) !== JSON.stringify(store);
  const problems = shops.flatMap(s => checkShop(s).map(p => (s.id === shop.id ? p : `‘${s.name}’ ${p}`)));
  const stop = blocking(problems);

  const update = (patch: Partial<Shop>) => { setShops(list => list.map(s => (s.id === shop.id ? { ...s, ...patch } : s))); setNote(''); };
  const setItem = (id: string, patch: Partial<Item>) => update({ items: shop.items.map(i => (i.id === id ? { ...i, ...patch } : i)) });
  const shelves = [...new Set(shop.items.map(i => i.shelf).filter(Boolean))];

  const save = () => {
    const ok = onSave(draft());
    setNote(ok ? '저장했어요. 아이 화면에 바로 나와요.' : '저장하지 못했어요. 시크릿(사생활 보호) 창이면 일반 창으로 열어 주세요. 사진이 많으면 몇 개를 지워 주세요.');
  };
  const close = () => { if (!dirty || ask('저장하지 않은 내용이 있어요. 저장하지 않고 나갈까요?')) onClose(); };

  // ── 주제 ──
  const addTheme = () => {
    const id = newId('t', shops.map(s => s.id));
    setShops([...shops, { ...copy(shop), id, name: `${shop.name} 2`.slice(0, LIMITS.name) }]);
    setCurrent(id);
    setNote(`${q(shop.name, '을', '를')} 복사했어요. 이름과 물건을 바꿔 보세요.`);
  };
  const resetTheme = () => {
    const base = BUILTIN.find(b => b.id === shop.id);
    if (!base || !ask(`${q(base.name, '을', '를')} 처음 상태로 되돌릴까요? 고친 물건과 사진이 없어져요.`)) return;
    update(copy(base));
    setNote('처음 상태로 되돌렸어요. 저장하기를 눌러야 반영돼요.');
  };
  const removeTheme = () => {
    if (!ask(`‘${shop.name}’ 주제를 지울까요?`)) return;
    const rest = shops.filter(s => s.id !== shop.id);
    setShops(rest);
    setCurrent(rest[0].id);
    setNote('주제를 지웠어요. 저장하기를 눌러야 반영돼요.');
  };

  // ── 통로 ──
  const addAisle = () => {
    const id = newId('a', shop.aisles.map(a => a.id));
    update({ aisles: [...shop.aisles, { id, label: `${shop.aisles.length + 1}번 통로` }] });
  };
  const removeAisle = (id: string) => {
    const rest = shop.aisles.filter(a => a.id !== id);
    const moving = shop.items.filter(i => i.aisle === id).length;
    if (moving && !ask(`이 통로의 물건 ${moving}개는 ${qro(rest[0].label)} 옮겨져요. 통로를 지울까요?`)) return;
    update({ aisles: rest, items: shop.items.map(i => (i.aisle === id ? { ...i, aisle: rest[0].id } : i)) });
  };

  // ── 물건 ──
  const addItem = (aisle: string) => {
    if (shop.items.length >= LIMITS.items) { setNote(`물건은 ${LIMITS.items}개까지 넣을 수 있어요.`); return; }
    const id = newId('c', shop.items.map(i => i.id));
    const shelf = shop.items.filter(i => i.aisle === aisle).at(-1)?.shelf ?? '진열대';
    update({ items: [...shop.items, { id, name: '', aisle, shelf, unit: '개', aliases: [], pic: '📦' }] });
    setPicFor(null);
  };
  const removeItem = (it: Item) => {
    if (it.name && !ask(`${q(it.name, '을', '를')} 지울까요?`)) return;
    update({ items: shop.items.filter(i => i.id !== it.id) });
  };
  const putPhoto = async (id: string, file?: File) => {
    if (!file) return;
    try {
      const pic = await shrinkPhoto(file);
      if (pic.length > LIMITS.photo) throw new Error('big');
      setItem(id, { pic });
    } catch {
      setNote('사진을 넣지 못했어요. 다른 사진(JPG·PNG)으로 해 볼까요?');
    }
  };

  // ── 한꺼번에 ──
  const applyPaste = () => {
    const { items, skipped } = fromPaste(paste, shop);
    if (!items.length) { setNote('붙여 넣은 줄에서 물건 이름을 찾지 못했어요. 한 줄에 물건 하나씩 적어 주세요.'); return; }
    if (!ask(`물건 목록이 붙여 넣은 ${items.length}개로 바뀌어요. 계속할까요?`)) return;
    update({ items });
    setNote(`물건 ${items.length}개로 바꿨어요.${skipped ? ` 이름이 겹치거나 비어서 ${skipped}줄은 뺐어요.` : ''} 그림은 물건마다 눌러 바꿀 수 있어요.`);
  };
  const download = () => {
    const blob = new Blob([exportText(shop)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${shop.name.replace(/[\\/:*?"<>|]/g, '')}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    setNote('파일을 내려받았어요. 다른 기기에서 "파일 불러오기"로 넣으면 돼요.');
  };
  const load = async (file?: File) => {
    if (!file) return;
    const got = importText(await file.text(), shops.map(s => s.id));
    if (!got) { setNote('이 앱에서 내보낸 파일이 아니에요. "파일로 내보내기"로 만든 .json 파일을 골라 주세요.'); return; }
    setShops([...shops, got]);
    setCurrent(got.id);
    setNote(`‘${got.name}’ 주제를 불러왔어요. 저장하기를 눌러야 반영돼요.`);
  };

  const n = (it: Item) => shop.items.indexOf(it) + 1;

  return (
    <main className="teacher-page sans">
      <header className="t-head">
        <div>
          <p className="t-kicker">꼬마 가게 놀이</p>
          <h1>선생님 페이지</h1>
        </div>
        <div className="t-head-btns">
          <button type="button" className="t-btn" onClick={close}>‹ 놀이 화면으로</button>
          <button type="button" className="t-btn" onClick={() => onPreview(draft())} disabled={stop.length > 0}>아이 화면 미리보기</button>
          <button type="button" className="t-btn primary" onClick={save} disabled={!dirty || stop.length > 0}>{dirty ? '저장하기' : '저장됨'}</button>
        </div>
      </header>
      {note && <p className="t-note" role="status">{note}</p>}
      {problems.length > 0 && (
        <div className="t-problems" role="alert">
          <b>{stop.length ? '저장하기 전에 고쳐 주세요' : '알아 두세요'}</b>
          <ul>{problems.map(p => <li key={p}>{p}</li>)}</ul>
        </div>
      )}

      <section className="t-card" aria-labelledby="t-play">
        <h2 id="t-play">놀이 설정 <small>모든 주제에 똑같이 쓰여요</small></h2>
        <label className="t-check big-check">
          <input type="checkbox" checked={micOn} onChange={e => { setMicOn(e.target.checked); setNote(''); }} />
          손님 놀이에서 마이크 쓰기
        </label>
        <div className="t-voice">
          <label className="t-field grow">목소리
            <select value={voice.name} onChange={e => setVoiceDraft({ ...voice, name: e.target.value })}>
              <option value="">자동{best ? ` (${voiceLabel(best)})` : ''}</option>
              {voices.map(v => <option key={v.name} value={v.name}>{voiceLabel(v)}</option>)}
            </select>
          </label>
          <label className="t-field"><span>빠르기 <span className="t-val">{speedWord(voice.rate)}</span></span>
            <input type="range" min={RATE.min} max={RATE.max} step={0.05} value={voice.rate}
              onChange={e => setVoiceDraft({ ...voice, rate: Number(e.target.value) })} />
          </label>
          <label className="t-field"><span>높낮이 <span className="t-val">{pitchWord(voice.pitch)}</span></span>
            <input type="range" min={PITCH.min} max={PITCH.max} step={0.05} value={voice.pitch}
              onChange={e => setVoiceDraft({ ...voice, pitch: Number(e.target.value) })} />
          </label>
          <button type="button" className="t-btn" onClick={() => say('어서 오세요! 사과 두 개랑 우유 한 개 주세요.', voice)}>🔊 들어 보기</button>
          <button type="button" className="t-link" onClick={() => setVoiceDraft({ ...DEFAULT_VOICE })}>처음 값으로</button>
        </div>
        {voices.length === 0 && <p className="t-help">이 브라우저에서 한국어 목소리를 찾지 못했어요. Microsoft Edge나 Chrome으로 열어 주세요.</p>}
        {onlyRobot && <p className="t-help"><b>더 자연스러운 목소리</b>는 Microsoft Edge(자연스러운 목소리)나 Chrome(Google 목소리)에 들어 있어요. 이 브라우저에는 기계음 목소리만 있어요.</p>}
        <p className="t-help">자연스러운 목소리와 Google 목소리는 인터넷으로 읽어 줘요. 이때 앱이 만든 문장(예: "사과 두 개 주세요")만 보내지고 아이 정보는 보내지 않아요.</p>
        <p className="t-help">마이크를 켜면 말소리를 글자로 바꾸려고 브라우저 회사 서버(Google·Microsoft)로 소리가 보내져요. 이 앱은 소리와 글자를 저장하지 않아요. 끄면 아이가 말하고 선생님이 듣고 "선생님: 잘 말했어요"를 눌러 진행해요. 카메라는 쓰지 않아요.</p>
      </section>

      <section className="t-card" aria-labelledby="t-themes">
        <h2 id="t-themes">놀이 주제 <small>누른 주제로 아이들이 놀아요</small></h2>
        <div className="t-themes">
          {shops.map(s => (
            <button type="button" key={s.id} className="t-theme" aria-pressed={s.id === shop.id} onClick={() => { setCurrent(s.id); setPicFor(null); setNote(''); }}>
              <span className="t-theme-pics" aria-hidden="true">{shownItems(s).slice(0, 3).map(i => <Pic key={i.id} pic={i.pic} size={30} />)}</span>
              <b>{s.name}</b>
              <small>물건 {shownItems(s).length}개 · 통로 {s.aisles.length}개</small>
            </button>
          ))}
          <button type="button" className="t-theme add" onClick={addTheme}>
            <b>+ 새 주제 만들기</b>
            <small>지금 주제를 복사해요</small>
          </button>
        </div>
        <div className="t-row">
          {isBuiltin(shop.id)
            ? <button type="button" className="t-link" onClick={resetTheme}>이 주제를 처음 상태로 되돌리기</button>
            : <button type="button" className="t-link danger" onClick={removeTheme}>이 주제 지우기</button>}
        </div>
      </section>

      <section className="t-card" aria-labelledby="t-info">
        <h2 id="t-info">1. 가게 정보</h2>
        <div className="t-grid">
          <label className="t-field">가게 이름 (아이 화면 제목)
            <input type="text" value={shop.name} maxLength={LIMITS.name} onChange={e => update({ name: e.target.value })} />
          </label>
          <label className="t-field">손님 놀이에서 점원의 첫인사
            <input type="text" value={shop.greeting} maxLength={LIMITS.greeting} onChange={e => update({ greeting: e.target.value })} />
          </label>
          <label className="t-field">한 판에 오는 손님 수
            <select value={shop.rounds} onChange={e => update({ rounds: Number(e.target.value) })}>
              {[3, 4, 5, 6, 7, 8, 10].map(r => <option key={r} value={r}>{r}명{r === 5 ? ' (3~5분)' : ''}</option>)}
            </select>
          </label>
        </div>
        <fieldset className="t-guests">
          <legend>찾아오는 손님</legend>
          {CUSTOMERS.map(c => {
            const on = shop.customers.includes(c.id);
            const last = on && shop.customers.length === 1;
            return (
              <label key={c.id} className="t-guest" title={last ? '손님은 한 명 이상 있어야 해요' : undefined}>
                <input type="checkbox" checked={on} disabled={last}
                  onChange={() => update({ customers: on ? shop.customers.filter(x => x !== c.id) : CUSTOMERS.map(k => k.id).filter(x => x === c.id || shop.customers.includes(x)) })} />
                <Animal id={c.id} size={40} />{c.name}
              </label>
            );
          })}
        </fieldset>
      </section>

      <section className="t-card" aria-labelledby="t-items">
        <h2 id="t-items">2. 통로와 물건 <small>{shop.items.length}/{LIMITS.items}개</small></h2>
        <p className="t-help">말로 주문하는 놀이에서는 <b>이름</b>과 <b>다르게 부르는 말</b>을 알아들어요. 아이들이 실제로 부르는 이름(예: 계란, 치솔)을 넣어 두면 더 잘 알아들어요.</p>
        {shop.aisles.map((aisle, ai) => {
          const list = shop.items.filter(i => i.aisle === aisle.id);
          return (
            <div key={aisle.id} className="t-aisle">
              <div className="t-aisle-head">
                <label className="t-field grow">통로 {ai + 1} 이름
                  <input type="text" value={aisle.label} maxLength={LIMITS.name}
                    onChange={e => update({ aisles: shop.aisles.map(a => (a.id === aisle.id ? { ...a, label: e.target.value } : a)) })} />
                </label>
                {shop.aisles.length > 1 && <button type="button" className="t-link danger" onClick={() => removeAisle(aisle.id)}>통로 {ai + 1} 지우기</button>}
              </div>
              {ai === 0 && <p className="t-help">3~4세 점원 놀이는 첫 번째 통로만 나와요.</p>}
              <ul className="t-items">
                {list.map(it => (
                  <li key={it.id} className={it.hidden ? 'off' : ''}>
                    <div className="t-item">
                      <button type="button" className="t-pic" aria-label={`물건 ${n(it)} 그림 바꾸기`} aria-expanded={picFor === it.id}
                        onClick={() => setPicFor(picFor === it.id ? null : it.id)}>
                        <Pic pic={it.pic} size={48} />
                      </button>
                      <label className="t-field">이름
                        <input type="text" aria-label={`물건 ${n(it)} 이름`} value={it.name} maxLength={LIMITS.name} placeholder="예: 딸기"
                          onChange={e => setItem(it.id, { name: e.target.value })} />
                      </label>
                      <label className="t-field">진열 칸
                        <input type="text" aria-label={`물건 ${n(it)} 진열 칸`} value={it.shelf} maxLength={LIMITS.name} list="t-shelves"
                          onChange={e => setItem(it.id, { shelf: e.target.value })} />
                      </label>
                      <label className="t-field small">세는 말
                        <select aria-label={`물건 ${n(it)} 세는 말`} value={it.unit || '개'} onChange={e => setItem(it.id, { unit: e.target.value })}>
                          {UNITS.map(u => <option key={u}>{u}</option>)}
                        </select>
                      </label>
                      <label className="t-field grow">다르게 부르는 말 (쉼표로 나눠요)
                        <input type="text" aria-label={`물건 ${n(it)} 다르게 부르는 말`} value={(it.aliases ?? []).join(', ')} placeholder="예: 계란, 닭알"
                          onChange={e => setItem(it.id, { aliases: e.target.value.split(',').map(a => a.trimStart()).slice(0, LIMITS.aliases) })} />
                      </label>
                      {shop.aisles.length > 1 && (
                        <label className="t-field small">통로
                          <select aria-label={`물건 ${n(it)} 통로`} value={it.aisle} onChange={e => setItem(it.id, { aisle: e.target.value })}>
                            {shop.aisles.map((a, k) => <option key={a.id} value={a.id}>{k + 1}번</option>)}
                          </select>
                        </label>
                      )}
                      <label className="t-check">
                        <input type="checkbox" aria-label={`물건 ${n(it)} 보이기`} checked={!it.hidden} onChange={e => setItem(it.id, { hidden: !e.target.checked })} />보이기
                      </label>
                      <button type="button" className="t-x" aria-label={`물건 ${n(it)} 지우기`} onClick={() => removeItem(it)}>✕</button>
                    </div>
                    {picFor === it.id && (
                      <div className="t-picker">
                        <p className="t-picker-title">그림 고르기</p>
                        <div className="t-arts">
                          {ART_IDS.map(id => (
                            <button type="button" key={id} aria-label={`그림: ${ART_NAME[id] ?? id}`} aria-pressed={it.pic === id} onClick={() => setItem(it.id, { pic: id })}>
                              <Pic pic={id} size={36} />
                            </button>
                          ))}
                        </div>
                        <div className="t-row">
                          <label className="t-field small">이모지나 글자
                            <input type="text" aria-label={`물건 ${n(it)} 이모지`} placeholder="예: 🍓" value={it.pic && it.pic.length <= 8 && !ART_IDS.includes(it.pic) ? it.pic : ''}
                              onChange={e => setItem(it.id, { pic: [...e.target.value.trim()].slice(0, 8).join('') })} />
                          </label>
                          <label className="t-btn file">📷 사진 넣기
                            <input type="file" accept="image/*" className="hide" onChange={e => { void putPhoto(it.id, e.target.files?.[0]); e.target.value = ''; }} />
                          </label>
                          <button type="button" className="t-link" onClick={() => setPicFor(null)}>닫기</button>
                        </div>
                        <p className="t-help">교실에 있는 진짜 물건을 찍어 넣으면 아이들이 반가워해요. <b>아이 얼굴이 나온 사진은 넣지 마세요.</b> 사진은 작게 줄여 이 기기에만 저장돼요.</p>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
              <button type="button" className="t-btn" onClick={() => addItem(aisle.id)}>+ 통로 {ai + 1}에 물건 추가</button>
            </div>
          );
        })}
        <datalist id="t-shelves">{shelves.map(s => <option key={s} value={s} />)}</datalist>
        {shop.aisles.length < LIMITS.aisles && <button type="button" className="t-link" onClick={addAisle}>+ 통로 추가</button>}
      </section>

      <section className="t-card" aria-labelledby="t-bulk">
        <h2 id="t-bulk">3. 한꺼번에 고치기</h2>
        <p className="t-help">엑셀이나 한글 표에서 복사해 붙여 넣으면 물건 목록이 한 번에 바뀌어요. 한 줄에 물건 하나씩, <b>{PASTE_HELP}</b> 순서예요. 다르게 부르는 말은 / 로 나눠요.</p>
        <textarea aria-label="붙여넣기 칸" rows={6} value={paste} placeholder={'사과\t빨간 과일\t개\n포도\t큰 과일\t송이\n딸기\t빨간 과일\t개\t딸기요'}
          onChange={e => setPaste(e.target.value)} />
        <div className="t-row">
          <button type="button" className="t-btn" onClick={() => setPaste(toPaste(shop))}>지금 목록 넣기</button>
          <button type="button" className="t-btn primary" onClick={applyPaste} disabled={!paste.trim()}>목록에 반영하기</button>
          <span className="t-sep" />
          <button type="button" className="t-btn" onClick={download}>파일로 내보내기</button>
          <button type="button" className="t-btn" onClick={() => fileRef.current?.click()}>파일 불러오기</button>
          <input ref={fileRef} type="file" accept=".json,application/json" className="hide" aria-label="불러올 파일"
            onChange={e => { void load(e.target.files?.[0]); e.target.value = ''; }} />
        </div>
        <p className="t-help">고친 내용은 <b>이 기기 브라우저에만</b> 저장돼요. 다른 교실 태블릿으로 옮길 때는 파일로 내보내서 불러오세요. 아이 이름이나 놀이 기록은 저장하지 않아요.</p>
      </section>
    </main>
  );
}
