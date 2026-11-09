import { useEffect, useRef, useState } from 'react';
import { Animal, Pic } from './Art';
import { complaintText, judgeCare, judgeComplaint, makeVisit, type Visit } from './clinic';
import {
  AGES, aislesFor, countWord, judge, judgeSpoken, kindOf, makeOrder, orderList, orderText, shownItems, unitOf,
  type Age, type Item, type Kind, type Mode, type Order, type Shop, type Tray, type Verdict,
} from './game';
import { asksWhere, judgeWhere, kioskAsk, makeKioskOrder, orderNumber, WHERE, type KioskOrder, type Where } from './kiosk';
import { loadStore, saveStore, type Store } from './shop';
import { browserRecognizer, hush, say, sayIfQuiet, setVoice, type Listening, type Recognizer } from './speech';
import Teacher from './Teacher';

type Props = { rng?: () => number; recognizer?: Recognizer };
/** 나이 버튼을 누르면 읽어 줄 말 ("만 3세"를 또렷하게 읽도록) */
const AGE_SAY: Record<Age, string> = { '3': '만 세 살', '5': '만 네 살', '7': '만 다섯 살' };
type Screen = 'start' | 'play' | 'done' | 'gate' | 'teacher';

export default function App({ rng = Math.random, recognizer = browserRecognizer }: Props) {
  const [store, setStore] = useState<Store>(loadStore);
  // 선생님 페이지의 "아이 화면 미리보기": 저장하지 않은 내용으로 잠깐 놀아 봅니다.
  const [preview, setPreview] = useState<Store | null>(null);
  const active = preview ?? store;
  // 마을 지도에서 아이가 고른 가게. 저장하지 않고, 처음엔 선생님이 정한 가게입니다.
  const [picked, setPicked] = useState<string | null>(null);
  const shop = active.shops.find(s => s.id === (picked ?? active.current)) ?? active.shops[0];
  const rounds = shop.rounds;
  const micOn = active.micOn;
  setVoice(active.voice); // 다음 say() 부터 이 목소리로
  const [mode, setMode] = useState<Mode>('clerk');
  const [age, setAge] = useState<Age>('5');
  // 마이크 안내는 한 번 켜질 때까지 보여 줍니다. 저장하지 않으므로 새로 열면 다시 묻습니다.
  const [micAgreed, setMicAgreed] = useState(false);
  const [screen, setScreen] = useState<Screen>('start');
  const [round, setRound] = useState(1);
  const [order, setOrder] = useState<Order | null>(null);
  const [visit, setVisit] = useState<Visit | null>(null);
  const kind = kindOf(shop);

  useEffect(() => hush, []);

  const deal = (m: Mode) => {
    if (kind === 'clinic') setVisit(makeVisit(age, rng, visit ?? undefined, shop));
    else if (kind === 'kiosk') setOrder(makeKioskOrder(m, age, rng, order ?? undefined, shop));
    else setOrder(makeOrder(m, age, rng, order ?? undefined, shop));
  };
  const start = (m: Mode = mode) => {
    setMode(m);
    setRound(1);
    setOrder(null); setVisit(null);
    if (kind === 'clinic') setVisit(makeVisit(age, rng, undefined, shop));
    else if (kind === 'kiosk') setOrder(makeKioskOrder(m, age, rng, undefined, shop));
    else setOrder(makeOrder(m, age, rng, undefined, shop));
    setScreen('play');
  };
  const next = () => {
    if (round >= rounds) { hush(); setScreen('done'); return; }
    setRound(round + 1);
    deal(mode);
  };
  const home = () => { hush(); setScreen('start'); };
  const leaveTeacher = () => { setPreview(null); setPicked(null); setScreen('start'); };
  const saveShops = (s: Store) => {
    if (!saveStore(s)) return false;
    setStore(s);
    setPreview(null);
    setPicked(null);
    return true;
  };

  if (screen === 'gate') return <Gate rng={rng} onPass={() => setScreen('teacher')} onCancel={() => setScreen('start')} />;
  if (screen === 'teacher') {
    return <Teacher store={store} draft={preview} onSave={saveShops} onClose={leaveTeacher}
      onPreview={d => { setPreview(d); setPicked(null); setScreen('start'); }} />;
  }
  if (screen === 'done') return <Done kind={kind} mode={mode} rounds={rounds} customers={shop.customers} onAgain={() => start()} onHome={home} />;
  const guest = kind === 'clinic' ? visit?.customer : order?.customer;
  if (screen === 'play' && guest) {
    const top = <Top title={shop.name} round={round} rounds={rounds} customer={guest.id} onHome={home} />;
    const last = round >= rounds;
    const talk = { top, age, last, onNext: next, recognizer, micOn, micAgreed, onAgree: () => setMicAgreed(true) };
    if (kind === 'clinic' && visit) {
      return mode === 'clerk'
        ? <ClinicPlay key={round} top={top} shop={shop} visit={visit} age={age} last={last} onNext={next} />
        : <PatientPlay key={round} {...talk} shop={shop} visit={visit} />;
    }
    if (kind === 'kiosk' && order) {
      return mode === 'clerk'
        ? <KioskPlay key={round} top={top} shop={shop} order={order as KioskOrder} age={age} last={last} onNext={next} />
        : <CustomerPlay key={round} {...talk} shop={shop} order={order} kiosk />;
    }
    if (order) {
      return mode === 'clerk'
        ? <ClerkPlay key={round} top={top} shop={shop} order={order} age={age} last={last} onNext={next} />
        : <CustomerPlay key={round} {...talk} shop={shop} order={order} />;
    }
  }
  return (
    <>
      {preview && (
        <div className="preview-bar sans" role="status">
          미리보기 중이에요. 아직 저장하지 않았어요.
          <button type="button" className="t-btn primary" onClick={() => setScreen('teacher')}>선생님 페이지로 돌아가기</button>
        </div>
      )}
      <Start shops={active.shops} shop={shop} onPick={id => setPicked(id)} mode={mode} setMode={setMode} age={age} setAge={setAge}
        onStart={() => start()} onTeacher={() => setScreen(preview ? 'teacher' : 'gate')} />
    </>
  );
}

/** 아이가 실수로 선생님 페이지에 들어가지 않게 간단한 덧셈을 묻습니다. */
function Gate({ rng, onPass, onCancel }: { rng: () => number; onPass: () => void; onCancel: () => void }) {
  const [[a, b]] = useState(() => [6 + Math.floor(rng() * 4), 5 + Math.floor(rng() * 5)]);
  const [value, setValue] = useState('');
  const [wrong, setWrong] = useState(false);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (Number(value) === a + b) onPass();
    else { setWrong(true); setValue(''); }
  };
  return (
    <main className="start gate sans">
      <h1>선생님 확인</h1>
      <form onSubmit={submit} className="gate-form">
        <label htmlFor="gate-q">{a} 더하기 {b}는 얼마인가요?</label>
        <input id="gate-q" inputMode="numeric" autoComplete="off" value={value} onChange={e => { setValue(e.target.value); setWrong(false); }} autoFocus />
        {wrong && <p className="t-problems" role="alert">다시 계산해 볼까요?</p>}
        <div className="t-row center">
          <button type="button" className="t-btn" onClick={onCancel}>돌아가기</button>
          <button type="submit" className="t-btn primary">들어가기</button>
        </div>
      </form>
    </main>
  );
}

function Top({ title, round, rounds, customer, onHome }: { title: string; round: number; rounds: number; customer: string; onHome: () => void }) {
  return (
    <header className="top">
      <button type="button" className="link" onClick={onHome}>‹ 마을로</button>
      <p className="top-title">{title}</p>
      {/* 손님이 걸어오는 길: 지난 손님은 별, 지금 손님은 얼굴 */}
      <p className="road" aria-label={`손님 ${rounds}명 중 ${round}번째`}>
        {Array.from({ length: rounds }, (_, i) => (
          <span key={i} className="road-step">
            {i > 0 && <i className={i < round ? 'road-line on' : 'road-line'} aria-hidden="true" />}
            <span className={i < round - 1 ? 'road-dot on' : i === round - 1 ? 'road-dot now' : 'road-dot'} aria-hidden="true">
              {i < round - 1 ? '★' : i === round - 1 ? <Animal id={customer} size={28} /> : null}
            </span>
          </span>
        ))}
      </p>
    </header>
  );
}

/** 맞혔을 때 축하 화면. 점수·스티커 같은 보상은 주지 않고 한 일만 짚어 줍니다. */
function Celebrate({ animal, title, line, next, onNext }: { animal: string; title: string; line: string; next: string; onNext: () => void }) {
  return (
    <div className="celebrate" role="dialog" aria-label={title}>
      <div className="confetti" aria-hidden="true">{Array.from({ length: 14 }, (_, i) => <i key={i} />)}</div>
      <div className="celebrate-card">
        <Animal id={animal} size={110} happy />
        <h2>{title}</h2>
        <p>{line}</p>
        <button type="button" className="big go blue" onClick={onNext} autoFocus>{next}</button>
      </div>
    </div>
  );
}

/** 손님 기분: 맞는 물건을 맞는 만큼 담을수록 하트가 찹니다. */
function Mood({ value }: { value: number }) {
  return (
    <div className="mood" aria-label={`손님 기분 하트 3개 중 ${value}개`}>
      {[1, 2, 3].map(k => (
        <svg key={k} width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 21s-7.5-4.6-9.5-9.3C1 8 3.4 4.5 7 4.5c2.1 0 3.6 1.2 5 3 1.4-1.8 2.9-3 5-3 3.6 0 6 3.5 4.5 7.2C19.5 16.4 12 21 12 21z"
            fill={k <= value ? '#FF8FA3' : '#FFFFFF'} stroke="#E0607A" strokeWidth="1.6" strokeLinejoin="round" />
        </svg>
      ))}
    </div>
  );
}

function Bubble({ who, line, sub, onListen }: { who: string; line: string; sub?: string; onListen: () => void }) {
  return (
    <div className="bubble">
      <p className="who">{who}</p>
      <p className="line" aria-live="polite">{line}</p>
      {sub && <p className="sub">{sub}</p>}
      <button type="button" className="pill" onClick={onListen}>🔊 다시 듣기</button>
    </div>
  );
}

/** 진열대: 통로 탭과 칸별 물건 버튼. 가게·병원·키오스크가 함께 씁니다. */
function Shelf({ shop, aisles, aisle, setAisle, onPut, disabled, verb = '담기', label = '진열대', className = 'shelf-area' }: {
  shop: Shop; aisles: string[]; aisle: string; setAisle: (id: string) => void; onPut: (id: string) => void; disabled: boolean;
  verb?: string; label?: string; className?: string;
}) {
  const shown = shownItems(shop).filter(i => i.aisle === aisle);
  const shelves = [...new Set(shown.map(i => i.shelf))];
  return (
    <section className={className} aria-label={label}>
      {aisles.length > 1 && (
        <div className="tabs">
          {shop.aisles.filter(a => aisles.includes(a.id)).map(a => (
            <button type="button" key={a.id} className="tab" aria-pressed={aisle === a.id} onClick={() => setAisle(a.id)}>{a.label}</button>
          ))}
        </div>
      )}
      <div className="shelf">
        {shelves.map(s => (
          <div key={s} className="shelf-row">
            <p className="shelf-sign">{s}</p>
            <div className="shelf-items">
              {shown.filter(i => i.shelf === s).map(i => (
                <button type="button" key={i.id} className="item" aria-label={`${i.name} ${verb}`} onClick={() => onPut(i.id)} disabled={disabled}>
                  <Pic pic={i.pic} size={68} />
                  <span>{i.name}</span>
                </button>
              ))}
            </div>
            <div className="plank" aria-hidden="true" />
          </div>
        ))}
      </div>
    </section>
  );
}

/** 담은 물건 목록 (장바구니·진료 가방·주문 목록) */
function TrayList({ items, tray, age, onMinus, disabled, counts = true }: {
  items: Item[]; tray: Tray; age: Age; onMinus: (id: string) => void; disabled: boolean; counts?: boolean;
}) {
  return (
    <ul>
      {items.filter(i => tray[i.id]).map(i => (
        <li key={i.id}>
          <Pic pic={i.pic} size={36} />
          <span className="b-name">{i.name}</span>
          {counts && age !== '7' && <span className="dots" aria-hidden="true">{Array.from({ length: tray[i.id] }, (_, k) => <i key={k} />)}</span>}
          {counts && <span className="b-count">{countWord(tray[i.id])} {unitOf(i)}</span>}
          <button type="button" className="minus" aria-label={`${i.name} 하나 빼기`} onClick={() => onMinus(i.id)} disabled={disabled}>−</button>
        </li>
      ))}
    </ul>
  );
}

/** 쟁반에 하나 더하기 / 하나 빼기 */
const addOne = (tray: Tray, id: string, max = Infinity): Tray => ({ ...tray, [id]: Math.min(max, (tray[id] ?? 0) + 1) });
const takeOne = (tray: Tray, id: string): Tray => {
  const t = { ...tray, [id]: (tray[id] ?? 0) - 1 };
  if (t[id] <= 0) delete t[id];
  return t;
};

// ── 점원 놀이: 손님 말을 듣고 물건을 골라 건네기 ──

function ClerkPlay({ top, shop, order, age, last, onNext }: { top: React.ReactNode; shop: Shop; order: Order; age: Age; last: boolean; onNext: () => void }) {
  const aisles = aislesFor('clerk', age, shop);
  const items = shownItems(shop);
  const [aisle, setAisle] = useState(aisles[0]);
  const [tray, setTray] = useState<Tray>({});
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  // 잘 안 될 때 주문을 그림으로도 보여 줍니다 (만 3세는 한 번, 그 위는 두 번 막히면).
  const [misses, setMisses] = useState(0);
  const showPics = !verdict?.ok && misses >= (age === '3' ? 1 : 2);
  const line = orderText(order);
  // 손님은 인사하고 주문합니다. 들리는 말과 말풍선 글자를 똑같이 맞춥니다.
  const hello = `안녕하세요! ${line}`;
  const solved = verdict?.ok === true;
  const total = Object.values(tray).reduce((a, b) => a + b, 0);
  const want = order.lines.reduce((a, l) => a + l.count, 0);
  const right = order.lines.reduce((a, l) => a + Math.min(tray[l.item.id] ?? 0, l.count), 0);
  const wrong = total - right;
  const mood = solved ? 3 : right * 2 >= want && wrong === 0 ? 2 : 1;

  useEffect(() => { say(hello); }, [hello]);

  const put = (id: string) => {
    if (solved) return;
    setTray(addOne(tray, id)); setVerdict(null);
    // 누른 물건 이름을 들려줘 낱말과 그림을 잇습니다. 손님이 말하는 중이면 끊지 않습니다.
    const it = items.find(i => i.id === id);
    if (it) sayIfQuiet(it.name);
  };
  const takeOut = (id: string) => {
    if (solved) return;
    setTray(takeOne(tray, id)); setVerdict(null);
  };
  const give = () => {
    const v = judge(order, tray, items);
    const m = v.ok ? misses : misses + 1;
    setMisses(m); setVerdict(v);
    const hint = !v.ok && m === (age === '3' ? 1 : 2) ? ' 그림을 보고 같이 찾아봐요.' : '';
    say(v.say + hint);
  };
  return (
    <main className="play">
      {top}
      <div className="play-body">
        <Shelf shop={shop} aisles={aisles} aisle={aisle} setAisle={setAisle} onPut={put} disabled={solved} />

        <section className="side">
          <div className="person">
            <div className="who-col">
              <Animal id={order.customer.id} size={96} happy={solved} />
              <Mood value={mood} />
            </div>
            <Bubble who={`${order.customer.name} 손님`} line={verdict ? verdict.say : hello} sub={verdict && !solved ? `주문: ${line}` : undefined}
              onListen={() => say(verdict ? verdict.say : hello)} />
          </div>
          {showPics && (
            <div className="order-pics" aria-label={`주문 그림: ${line}`}>
              {order.lines.map(l => (
                <span key={l.item.id} className="order-pic">
                  {Array.from({ length: l.count }, (_, k) => <Pic key={k} pic={l.item.pic} size={l.count > 3 ? 36 : 48} />)}
                  <b>{l.item.name} {countWord(l.count)} {unitOf(l.item)}</b>
                </span>
              ))}
            </div>
          )}
          <div className="basket" aria-label="장바구니">
            <p className="basket-title">🧺 장바구니</p>
            {total === 0 ? <p className="basket-empty">진열대에서 물건을 눌러 담아요</p>
              : <TrayList items={items} tray={tray} age={age} onMinus={takeOut} disabled={solved} />}
          </div>
          {!solved && <button type="button" className="big go" onClick={give} disabled={total === 0}>손님께 드리기</button>}
        </section>
      </div>
      {solved && <Celebrate animal={order.customer.id} title="잘 골랐어요!" line={verdict!.say} next={last ? '오늘 가게 놀이 끝!' : '다음 손님 오세요'} onNext={onNext} />}
    </main>
  );
}

// ── 병원 놀이 (의사): 환자 말을 듣고 맞는 도구 고르기 ──

function ClinicPlay({ top, shop, visit, age, last, onNext }: { top: React.ReactNode; shop: Shop; visit: Visit; age: Age; last: boolean; onNext: () => void }) {
  const aisles = aislesFor('clerk', age, shop);
  const items = shownItems(shop);
  const [aisle, setAisle] = useState(aisles[0]);
  const [tray, setTray] = useState<Tray>({});
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [misses, setMisses] = useState(0);
  const solved = verdict?.ok === true;
  const hello = complaintText(visit);
  const showPics = !solved && misses >= (age === '3' ? 1 : 2);
  const picked = Object.keys(tray);
  const right = visit.symptoms.filter(s => picked.includes(s.tool)).length;
  const wrong = picked.length - right;
  const mood = solved ? 3 : right > 0 && wrong === 0 ? 2 : 1;

  useEffect(() => { say(hello); }, [hello]);

  // 도구는 한 번씩만 씁니다 (같은 도구를 두 번 눌러도 하나).
  const put = (id: string) => {
    if (solved) return;
    setTray(addOne(tray, id, 1)); setVerdict(null);
    const it = items.find(i => i.id === id);
    if (it) sayIfQuiet(it.name);
  };
  const takeOut = (id: string) => { if (!solved) { setTray(takeOne(tray, id)); setVerdict(null); } };
  const use = () => {
    const v = judgeCare(visit, tray, items);
    const m = v.ok ? misses : misses + 1;
    setMisses(m); setVerdict(v);
    const hint = !v.ok && m === (age === '3' ? 1 : 2) ? ' 아픈 곳 그림을 보고 같이 생각해 봐요.' : '';
    say(v.say + hint);
  };

  return (
    <main className="play clinic">
      {top}
      <div className="play-body">
        <Shelf shop={shop} aisles={aisles} aisle={aisle} setAisle={setAisle} onPut={put} disabled={solved} verb="고르기" label="진료 도구" />
        <section className="side">
          <div className="person">
            <div className="who-col">
              <Animal id={visit.customer.id} size={96} happy={solved} />
              <Mood value={mood} />
            </div>
            <Bubble who={`${visit.customer.name} 환자`} line={verdict ? verdict.say : hello} sub={verdict && !solved ? hello : undefined}
              onListen={() => say(verdict ? verdict.say : hello)} />
          </div>
          {showPics && (
            <div className="order-pics" aria-label="아픈 곳 그림">
              {visit.symptoms.map(s => (
                <span key={s.id} className="order-pic"><span className="symptom-pic small" aria-hidden="true">{s.pic}</span><b>{s.short}</b></span>
              ))}
            </div>
          )}
          <div className="basket" aria-label="진료 가방">
            <p className="basket-title">🧰 진료 가방</p>
            {picked.length === 0 ? <p className="basket-empty">필요한 도구를 눌러 넣어요</p>
              : <TrayList items={items} tray={tray} age={age} onMinus={takeOut} disabled={solved} counts={false} />}
          </div>
          {!solved && <button type="button" className="big go" onClick={use} disabled={picked.length === 0}>치료해 주기</button>}
        </section>
      </div>
      {solved && <Celebrate animal={visit.customer.id} title="다 나았어요!" line={verdict!.say} next={last ? '오늘 병원 놀이 끝!' : '다음 환자 오세요'} onNext={onNext} />}
    </main>
  );
}

// ── 키오스크 놀이: 친구 부탁대로 메뉴 고르기 → 먹는 곳 → 결제 ──

/** 키오스크 얼굴 (말로 주문하는 키오스크) */
function KioskFace() {
  return (
    <svg width="96" height="108" viewBox="0 0 96 108" aria-hidden="true">
      <rect x="14" y="4" width="68" height="84" rx="10" fill="#2B3A4A" />
      <rect x="21" y="12" width="54" height="56" rx="6" fill="#E7F5FF" />
      <circle cx="38" cy="36" r="4" fill="#2B2235" /><circle cx="58" cy="36" r="4" fill="#2B2235" />
      <path d="M38 48 Q48 56 58 48" stroke="#2B2235" strokeWidth="3" fill="none" strokeLinecap="round" />
      <rect x="36" y="74" width="24" height="5" rx="2.5" fill="#7FB7E6" />
      <rect x="40" y="88" width="16" height="12" fill="#2B3A4A" /><rect x="26" y="100" width="44" height="6" rx="3" fill="#2B3A4A" />
    </svg>
  );
}

type KioskStep = 'menu' | 'where' | 'pay' | 'paid';

function KioskPlay({ top, shop, order, age, last, onNext }: { top: React.ReactNode; shop: Shop; order: KioskOrder; age: Age; last: boolean; onNext: () => void }) {
  const aisles = aislesFor('clerk', age, shop);
  const items = shownItems(shop);
  const [aisle, setAisle] = useState(aisles[0]);
  const [tray, setTray] = useState<Tray>({});
  const [step, setStep] = useState<KioskStep>('menu');
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [misses, setMisses] = useState(0);
  const [num] = useState(() => orderNumber());
  const hello = kioskAsk(order, age);
  const name = order.customer.name;
  const total = Object.values(tray).reduce((a, b) => a + b, 0);
  const showPics = step === 'menu' && misses >= (age === '3' ? 1 : 2);
  const done = step === 'paid';
  const steps: { id: KioskStep; label: string }[] = [
    { id: 'menu', label: '메뉴 고르기' },
    ...(asksWhere(age) ? [{ id: 'where' as KioskStep, label: '먹는 곳' }] : []),
    { id: 'pay', label: '결제하기' },
  ];
  const at = done ? steps.length : steps.findIndex(s => s.id === step);

  useEffect(() => { say(hello); }, [hello]);

  const speak = (text: string) => { setVerdict({ ok: false, kind: 'info', say: text }); say(text); };
  const put = (id: string) => {
    if (step !== 'menu') return;
    setTray(addOne(tray, id)); setVerdict(null);
    const it = items.find(i => i.id === id);
    if (it) sayIfQuiet(it.name);
  };
  const takeOut = (id: string) => { if (step === 'menu') { setTray(takeOne(tray, id)); setVerdict(null); } };
  const submit = () => {
    const v = judge(order, tray, items, `${name} 친구`);
    if (!v.ok) {
      const m = misses + 1;
      setMisses(m); setVerdict(v);
      say(v.say + (m === (age === '3' ? 1 : 2) ? ' 그림을 보고 같이 찾아봐요.' : ''));
      return;
    }
    if (asksWhere(age)) { setStep('where'); speak('메뉴를 잘 골랐어요! 여기서 먹고 갈까요, 가져갈까요?'); }
    else { setStep('pay'); speak('메뉴를 잘 골랐어요! 이제 카드를 넣어 결제해요.'); }
  };
  const pickWhere = (w: Where) => {
    const v = judgeWhere(order, w);
    setVerdict(v); say(v.say);
    if (v.ok) setStep('pay');
  };
  const pay = () => {
    setStep('paid');
    const text = `띵동! 결제가 끝났어요. 주문 번호는 ${num}번이에요.`;
    setVerdict({ ok: true, kind: 'ok', say: text }); say(text);
  };

  return (
    <main className="play kiosk-play">
      {top}
      <div className="play-body">
        <section className="kiosk" aria-label="키오스크 화면">
          <div className="kiosk-head">
            <span className="kiosk-brand">🍔 {shop.name}</span>
            <ol className="kiosk-steps">
              {steps.map((s, i) => <li key={s.id} className={i < at ? 'done' : i === at ? 'now' : ''}>{i + 1}. {s.label}</li>)}
            </ol>
          </div>
          {step === 'menu' && (
            <>
              <Shelf shop={shop} aisles={aisles} aisle={aisle} setAisle={setAisle} onPut={put} disabled={false} label="메뉴" className="kiosk-menu" />
              <div className="kiosk-cart" aria-label="주문 목록">
                <p className="basket-title">🧾 주문 목록</p>
                {total === 0 ? <p className="basket-empty">메뉴를 눌러 담아요</p>
                  : <TrayList items={items} tray={tray} age={age} onMinus={takeOut} disabled={false} />}
                <button type="button" className="big go" onClick={submit} disabled={total === 0}>주문하기</button>
              </div>
            </>
          )}
          {step === 'where' && (
            <div className="kiosk-panel">
              <p className="kiosk-q">어디에서 드세요?</p>
              <div className="kiosk-choices">
                {(Object.keys(WHERE) as Where[]).map(w => (
                  <button type="button" key={w} className="kiosk-choice" onClick={() => pickWhere(w)}>
                    <span aria-hidden="true">{WHERE[w].pic}</span>{WHERE[w].label}
                  </button>
                ))}
              </div>
            </div>
          )}
          {(step === 'pay' || done) && (
            <div className="kiosk-panel">
              <p className="kiosk-q">{done ? `주문 번호 ${num}번` : '카드를 넣어 주세요'}</p>
              <button type="button" className={done ? 'kiosk-card paid' : 'kiosk-card'} onClick={pay} disabled={done} aria-label="카드 넣기">
                <span className="card-slot" aria-hidden="true" />
                <span className="card" aria-hidden="true">💳</span>
                {!done && <b>눌러서 카드 넣기</b>}
              </button>
            </div>
          )}
        </section>

        <section className="side">
          <div className="person">
            <div className="who-col"><Animal id={order.customer.id} size={96} happy={done} /></div>
            <Bubble who={`${name} 친구`} line={verdict ? verdict.say : hello} sub={verdict && !done ? `부탁: ${hello}` : undefined}
              onListen={() => say(verdict ? verdict.say : hello)} />
          </div>
          {showPics && (
            <div className="order-pics" aria-label={`주문 그림: ${hello}`}>
              {order.lines.map(l => (
                <span key={l.item.id} className="order-pic">
                  {Array.from({ length: l.count }, (_, k) => <Pic key={k} pic={l.item.pic} size={l.count > 3 ? 36 : 48} />)}
                  <b>{l.item.name} {countWord(l.count)} {unitOf(l.item)}</b>
                </span>
              ))}
            </div>
          )}
        </section>
      </div>
      {done && <Celebrate animal={order.customer.id} title="주문 완료!" line={`주문 번호 ${num}번이에요. ${orderList(order)}, 혼자서 주문했어요.`}
        next={last ? '오늘 키오스크 놀이 끝!' : '다음 친구 부탁 듣기'} onNext={onNext} />}
    </main>
  );
}

// ── 손님 놀이: 점원이 보여 주는 물건을 말로 주문하기 ──

type Hearing = 'idle' | 'notice' | 'listening';

type TalkBase = { top: React.ReactNode; age: Age; last: boolean; onNext: () => void; recognizer: Recognizer; micOn: boolean; micAgreed: boolean; onAgree: () => void };

function CustomerPlay({ shop, order, kiosk = false, ...base }: TalkBase & { shop: Shop; order: Order; kiosk?: boolean }) {
  const { age } = base;
  const items = shownItems(shop);
  const model = orderText(order);
  const want = (
    <section className={kiosk ? 'want kiosk-want' : 'want'} aria-label="주문할 물건">
      <p className="want-title">{kiosk ? '키오스크에 말로 주문해 보세요' : '이 물건을 주문해 보세요'}</p>
      <div className="want-lines">
        {order.lines.map(l => (
          <div key={l.item.id} className="want-line">
            <div className="want-items">
              {Array.from({ length: l.count }, (_, k) => <Pic key={k} pic={l.item.pic} size={l.count > 3 ? 72 : 96} />)}
            </div>
            <p className="want-name">{l.item.name}{age !== '3' && <> · <b>{countWord(l.count)} {unitOf(l.item)}</b></>}</p>
          </div>
        ))}
      </div>
      <button type="button" className="pill model" onClick={() => say(model)}>👂 어떻게 말하는지 듣기</button>
      {age !== '7' && <p className="model-text">"{model}"</p>}
    </section>
  );
  return (
    <TalkPlay {...base} face={kiosk ? null : order.customer.id} who={kiosk ? '말로 주문하는 키오스크' : `${order.customer.name} 점원`}
      ask={shop.greeting} model={model} want={want} check={t => judgeSpoken(order, t, age, items)}
      okSay={`네! ${orderList(order)} ${kiosk ? '주문했어요.' : '드릴게요.'}`}
      title="잘 말했어요!" nextLabel={kiosk ? '다음 주문 하러 가요' : '다음 물건 사러 가요'} />
  );
}

// ── 병원 놀이 (환자): 그림을 보고 어디가 아픈지 말하기 ──

function PatientPlay({ shop, visit, ...base }: TalkBase & { shop: Shop; visit: Visit }) {
  const { age } = base;
  const model = complaintText(visit);
  const want = (
    <section className="want clinic-want" aria-label="아픈 곳">
      <p className="want-title">나는 어디가 아플까요?</p>
      <div className="want-lines">
        {visit.symptoms.map(s => (
          <div key={s.id} className="want-line">
            <span className="symptom-pic" aria-hidden="true">{s.pic}</span>
            {age !== '7' && <p className="want-name">{s.short}</p>}
          </div>
        ))}
      </div>
      <button type="button" className="pill model" onClick={() => say(model)}>👂 어떻게 말하는지 듣기</button>
      {age === '3' && <p className="model-text">"{model}"</p>}
    </section>
  );
  return (
    <TalkPlay {...base} face="doctor" who="의사 선생님" ask={shop.greeting} model={model} want={want}
      check={t => judgeComplaint(visit, t, age)}
      okSay={`많이 아팠죠? ${visit.symptoms.map(s => s.treat).join(' ')} 금방 나을 거예요.`}
      title="잘 말했어요!" nextLabel="다음 환자 차례예요" />
  );
}

/** 말하기 놀이 화면: 아이가 말하면 상대(점원·의사·키오스크)가 대답합니다. */
function TalkPlay({ top, age, last, onNext, recognizer, micOn, micAgreed, onAgree, face, who, ask, model, want, check, okSay, title, nextLabel }: TalkBase & {
  face: string | null; who: string; ask: string; model: string; want: React.ReactNode; check: (text: string) => Verdict; okSay: string; title: string; nextLabel: string;
}) {
  const [line, setLine] = useState(ask);
  const [heard, setHeard] = useState('');
  const [hearing, setHearing] = useState<Hearing>('idle');
  const [solved, setSolved] = useState(false);
  const listening = useRef<Listening | null>(null);
  const canHear = micOn && recognizer.available;

  useEffect(() => { say(ask); return () => listening.current?.stop(); }, []);

  const misses = useRef(0);
  const answer = (v: Verdict, counts = true) => {
    // 두 번 막히면 점원이 먼저 말해 주고 따라 하게 합니다.
    if (!v.ok && counts) misses.current += 1;
    const text = !v.ok && counts && misses.current >= 2 ? `${v.say} 제가 먼저 말해 볼게요. 잘 듣고 따라 해 봐요. ${model}` : v.say;
    setLine(text); setSolved(v.ok); say(text);
  };
  const listen = (agreed = micAgreed) => {
    if (!agreed) { setHearing('notice'); return; }
    setHeard('');
    const l = recognizer.start({
      onInterim: t => setHeard(t),
      onFinal: alts => {
        if (!alts.length) { answer({ ok: false, kind: 'unheard', say: '잘 못 들었어요. 마이크 가까이에서 한 번 더 말해 볼까요?' }); return; }
        const verdicts = alts.map(a => ({ a, v: check(a) }));
        const best = verdicts.find(x => x.v.ok) ?? verdicts[0];
        setHeard(best.a);
        answer(best.v);
      },
      onError: code => {
        const say = code === 'not-allowed' || code === 'service-not-allowed' ? '마이크를 쓸 수 없어요. 선생님, 주소창 옆 자물쇠를 눌러 마이크를 허용해 주세요.'
          : code === 'audio-capture' ? '마이크를 찾을 수 없어요. 선생님, 마이크가 연결되어 있는지 봐 주세요.'
          : code === 'network' ? '인터넷이 끊겨서 말을 알아듣지 못했어요. 선생님이 듣고 "잘 말했어요"를 눌러 주세요.'
          : '말 알아듣기가 잠깐 멈췄어요. 다시 눌러 볼까요?';
        answer({ ok: false, kind: code, say }, false);
      },
      onEnd: () => { listening.current = null; setHearing('idle'); },
    });
    if (l) { listening.current = l; setHearing('listening'); }
    else answer({ ok: false, kind: 'start-failed', say: '마이크를 켜지 못했어요. 다시 눌러 볼까요?' }, false);
  };
  const stop = () => listening.current?.stop();
  const teacherOk = () => answer({ ok: true, kind: 'teacher', say: okSay });

  return (
    <main className="play">
      {top}
      <div className="play-body">
        {want}

        <section className="side">
          <div className="person">
            {face ? <Animal id={face} size={96} happy={solved} /> : <KioskFace />}
            <Bubble who={who} line={line} onListen={() => say(line)} />
          </div>

          {hearing === 'notice' ? (
            <div className="notice" role="dialog" aria-label="마이크 안내">
              <p><b>선생님 확인</b></p>
              <p>말소리를 글자로 바꾸려고 브라우저 회사 서버(Google·Microsoft)로 소리가 보내져요. 이 앱은 소리와 글자를 저장하지 않아요.</p>
              <div className="notice-btns">
                <button type="button" className="big go small-big" onClick={() => { onAgree(); setHearing('idle'); listen(true); }}>알겠어요, 마이크 켜기</button>
                <button type="button" className="link" onClick={() => setHearing('idle')}>취소</button>
              </div>
            </div>
          ) : (
            <div className="speak">
              {canHear ? (
                hearing === 'listening'
                  ? <button type="button" className="mic on" onClick={stop}><span className="mic-dot" aria-hidden="true" />듣고 있어요…<small>다 말했으면 눌러요</small></button>
                  : <button type="button" className="mic" onClick={() => listen()} disabled={solved}>🎤 눌러서 말하기</button>
              ) : (
                <p className="no-mic">{micOn ? '이 브라우저는 말을 알아듣지 못해요. Chrome이나 Edge로 열어 주세요.' : '선생님 설정에서 마이크가 꺼져 있어요.'} 아이가 말하면 선생님이 듣고 아래 버튼을 눌러 주세요.</p>
              )}
              {heard && <p className="heard">내가 한 말: <q>{heard}</q></p>}
            </div>
          )}

          {!solved && <button type="button" className="teacher-ok" onClick={teacherOk}>선생님: 잘 말했어요</button>}
        </section>
      </div>
      {solved && <Celebrate animal={face ?? 'rabbit'} title={title} line={line} next={last ? '오늘 놀이 끝!' : nextLabel} onNext={onNext} />}
    </main>
  );
}

// ── 첫 화면, 끝 화면 ──

/** 놀이 방식마다 첫 화면의 역할 이름 (clerk: 듣고 고르기, customer: 말하기) */
const ROLES: Record<Kind, Record<Mode, { title: string; sub: string }>> = {
  shop: { clerk: { title: '내가 점원이에요', sub: '손님 말을 듣고 물건을 골라요' }, customer: { title: '내가 손님이에요', sub: '그림을 보고 말로 주문해요' } },
  clinic: { clerk: { title: '내가 의사예요', sub: '아픈 곳을 듣고 도구를 골라요' }, customer: { title: '내가 환자예요', sub: '어디가 아픈지 말해요' } },
  kiosk: { clerk: { title: '눌러서 주문해요', sub: '친구 부탁대로 화면을 눌러요' }, customer: { title: '말로 주문해요', sub: '키오스크에 말로 주문해요' } },
};
const AGE_DETAIL: Partial<Record<Kind, Record<Age, string>>> = {
  clinic: { '3': '아픈 곳 한 군데', '5': '아픈 곳 한두 군데', '7': '아픈 곳 두 군데' },
  kiosk: { '3': '메뉴 · 결제', '5': '먹는 곳도 골라요', '7': '두 가지 · 먹는 곳' },
};

const ROOFS = ['#E2502E', '#2E8B57', '#B5651D', '#3D6FD8', '#8E44AD', '#D6457A', '#2F8F9D', '#E08A1E'];

function Start({ shops, shop, onPick, mode, setMode, age, setAge, onStart, onTeacher }: {
  shops: Shop[]; shop: Shop; onPick: (id: string) => void; mode: Mode; setMode: (m: Mode) => void; age: Age; setAge: (a: Age) => void;
  onStart: () => void; onTeacher: () => void;
}) {
  const roofOf = (i: number) => ROOFS[i % ROOFS.length];
  const cur = Math.max(0, shops.findIndex(s => s.id === shop.id));
  return (
    <main className="village">
      <header className="sky">
        <Animal id="rabbit" size={64} happy />
        <h1>꼬마 역할놀이 마을</h1>
        <svg className="hill" viewBox="0 0 1124 34" preserveAspectRatio="none" aria-hidden="true"><path d="M0 34 Q120 0 260 22 T560 18 T860 20 T1124 10 V34z" fill="#BFE3C9" /></svg>
      </header>
      <div className="village-body">
        <section className="map" aria-label="마을 지도">
          <div className="map-grid">
          {shops.map((s, i) => {
            const sign = shownItems(s)[0];
            return (
              <button type="button" key={s.id} className="building" aria-pressed={s.id === shop.id}
                onClick={() => { onPick(s.id); say(`${s.name}에 가 볼까요?`); }}>
                <span className="bld">
                  <svg width="132" height="116" viewBox="0 0 150 132" aria-hidden="true">
                    <rect x="14" y="40" width="122" height="88" rx="8" fill="#FFF4E3" stroke="#5B4636" strokeWidth="3" />
                    <path d="M6 44 L75 6 L144 44 Z" fill={roofOf(i)} stroke="#5B4636" strokeWidth="3" strokeLinejoin="round" />
                    <rect x="30" y="54" width="90" height="34" rx="6" fill="#FFFFFF" stroke="#5B4636" strokeWidth="2" />
                    <rect x="60" y="96" width="30" height="32" rx="4" fill="#7FB7E6" stroke="#5B4636" strokeWidth="2" />
                    <rect x="24" y="98" width="24" height="20" rx="3" fill="#E7F5FF" stroke="#5B4636" strokeWidth="2" />
                    <rect x="102" y="98" width="24" height="20" rx="3" fill="#E7F5FF" stroke="#5B4636" strokeWidth="2" />
                  </svg>
                  {sign && <span className="bld-sign"><Pic pic={sign.pic} size={28} /></span>}
                </span>
                <span className="bld-name">{s.name}</span>
              </button>
            );
          })}
          </div>
          {/* 마을 길과 나무 (꾸밈) */}
          <svg className="scenery" viewBox="0 0 760 120" aria-hidden="true">
            <rect x="0" y="62" width="760" height="40" rx="20" fill="#C9D3DC" />
            <path d="M20 82 H740" stroke="#FFFFFF" strokeWidth="4" strokeDasharray="22 16" />
            <g fill="#2E8B57"><circle cx="70" cy="34" r="22" /><circle cx="250" cy="30" r="26" /><circle cx="470" cy="34" r="22" /><circle cx="680" cy="30" r="26" /></g>
            <g fill="#8B5E3C"><rect x="66" y="50" width="8" height="14" /><rect x="246" y="50" width="8" height="14" /><rect x="466" y="50" width="8" height="14" /><rect x="676" y="50" width="8" height="14" /></g>
            <g fill="#FFC531"><circle cx="150" cy="54" r="5" /><circle cx="370" cy="52" r="5" /><circle cx="580" cy="54" r="5" /></g>
          </svg>
        </section>
        <aside className="pick" aria-label="놀이 고르기">
          <p className="pick-small">여기로 놀러 가요</p>
          <h2 style={{ color: roofOf(cur) }}>{shop.name}</h2>
          <p className="pick-q">누가 되어 볼까요?</p>
          <div className="roles">
            {(['clerk', 'customer'] as Mode[]).map(m => {
              const r = ROLES[kindOf(shop)][m];
              return (
                <button type="button" key={m} className="role" aria-pressed={mode === m} onClick={() => { setMode(m); say(`${r.title}. ${r.sub}.`); }}>
                  <b>{r.title}</b><small>{r.sub}</small>
                </button>
              );
            })}
          </div>
          <div className="ages" role="group" aria-label="나이">
            {AGES.map(a => (
              <button type="button" key={a.id} className="age" aria-pressed={age === a.id} onClick={() => { setAge(a.id); say(AGE_SAY[a.id]); }}>
                <b>{a.label}</b><small>{AGE_DETAIL[kindOf(shop)]?.[a.id] ?? a.detail}</small>
              </button>
            ))}
          </div>
          <button type="button" className="big go" onClick={onStart}>놀러 가기 →</button>
        </aside>
      </div>
      {/* 선생님 버튼: 아이 놀이 영역 밖, 오른쪽 맨 아래 구석에 작게 */}
      <button type="button" className="teacher-entry sans" onClick={onTeacher}>⚙ 선생님 설정</button>
    </main>
  );
}

function Done({ kind, mode, rounds, customers, onAgain, onHome }: { kind: Kind; mode: Mode; rounds: number; customers: string[]; onAgain: () => void; onHome: () => void }) {
  // 결과보다 한 일을 짚어 칭찬하고, 화면 밖 진짜 놀이로 이어 갑니다.
  const n = countWord(rounds);
  const TEXT: Record<Kind, Record<Mode, string>> = {
    shop: { clerk: `손님 ${n} 명의 말을 끝까지 듣고, 물건을 하나씩 세어서 담았어요.`, customer: `그림을 보고 ${n} 번이나 또박또박 주문했어요.` },
    clinic: { clerk: `아픈 친구 ${n} 명의 말을 잘 듣고, 꼭 맞는 도구를 골랐어요.`, customer: `어디가 아픈지 ${n} 번이나 또박또박 말했어요.` },
    kiosk: { clerk: `친구 부탁을 듣고 ${n} 번이나 혼자 주문했어요. 메뉴 고르기부터 결제까지 다 했어요.`, customer: `키오스크에 ${n} 번이나 또박또박 말로 주문했어요.` },
  };
  const NEXT: Record<Kind, string> = {
    shop: '이제 친구랑 진짜 가게 놀이를 해 볼까요? 한 명은 점원, 한 명은 손님이에요.',
    clinic: '이제 친구랑 진짜 병원 놀이를 해 볼까요? 한 명은 의사, 한 명은 환자예요.',
    kiosk: '다음에 어른과 가게에 가면 키오스크 화면을 같이 살펴볼까요?',
  };
  const text = TEXT[kind][mode];
  const next = NEXT[kind];
  useEffect(() => { say(`${text} ${next}`); }, [text]);
  return (
    <main className="start done">
      <p className="big-stars" aria-hidden="true">{'★'.repeat(Math.min(rounds, 5))}</p>
      <h1>참 잘했어요!</h1>
      <p className="lead">{text}</p>
      <p className="next-play">{next}</p>
      <div className="done-animals" aria-hidden="true">
        {customers.map(id => <Animal key={id} id={id} size={72} happy />)}
      </div>
      <button type="button" className="big go" onClick={onAgain}>한 번 더 하기</button>
      <button type="button" className="link" onClick={onHome}>처음으로</button>
    </main>
  );
}
