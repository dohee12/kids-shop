import { useEffect, useRef, useState } from 'react';
import { Animal, Pic } from './Art';
import {
  AGES, aislesFor, countWord, judge, judgeSpoken, makeOrder, orderList, orderText, shownItems, unitOf,
  type Age, type Mode, type Order, type Shop, type Tray, type Verdict,
} from './game';
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

  useEffect(() => hush, []);

  const start = (m: Mode = mode) => {
    setMode(m);
    setRound(1);
    setOrder(makeOrder(m, age, rng, undefined, shop));
    setScreen('play');
  };
  const next = () => {
    if (round >= rounds) { hush(); setScreen('done'); return; }
    setRound(round + 1);
    setOrder(makeOrder(mode, age, rng, order ?? undefined, shop));
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
  if (screen === 'done') return <Done mode={mode} rounds={rounds} customers={shop.customers} onAgain={() => start()} onHome={home} />;
  if (screen === 'play' && order) {
    const top = <Top title={shop.name} round={round} rounds={rounds} customer={order.customer.id} onHome={home} />;
    return mode === 'clerk'
      ? <ClerkPlay key={round} top={top} shop={shop} order={order} age={age} last={round >= rounds} onNext={next} />
      : <CustomerPlay key={round} top={top} shop={shop} order={order} age={age} last={round >= rounds} onNext={next}
          recognizer={recognizer} micOn={micOn} micAgreed={micAgreed} onAgree={() => setMicAgreed(true)} />;
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
    setTray({ ...tray, [id]: (tray[id] ?? 0) + 1 }); setVerdict(null);
    // 누른 물건 이름을 들려줘 낱말과 그림을 잇습니다. 손님이 말하는 중이면 끊지 않습니다.
    const it = items.find(i => i.id === id);
    if (it) sayIfQuiet(it.name);
  };
  const takeOut = (id: string) => {
    if (solved) return;
    const t = { ...tray, [id]: (tray[id] ?? 0) - 1 };
    if (t[id] <= 0) delete t[id];
    setTray(t); setVerdict(null);
  };
  const give = () => {
    const v = judge(order, tray, items);
    const m = v.ok ? misses : misses + 1;
    setMisses(m); setVerdict(v);
    const hint = !v.ok && m === (age === '3' ? 1 : 2) ? ' 그림을 보고 같이 찾아봐요.' : '';
    say(v.say + hint);
  };
  const shown = items.filter(i => i.aisle === aisle);
  const shelves = [...new Set(shown.map(i => i.shelf))];

  return (
    <main className="play">
      {top}
      <div className="play-body">
        <section className="shelf-area" aria-label="진열대">
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
                    <button type="button" key={i.id} className="item" aria-label={`${i.name} 담기`} onClick={() => put(i.id)} disabled={solved}>
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
            {total === 0 ? <p className="basket-empty">진열대에서 물건을 눌러 담아요</p> : (
              <ul>
                {items.filter(i => tray[i.id]).map(i => (
                  <li key={i.id}>
                    <Pic pic={i.pic} size={36} />
                    <span className="b-name">{i.name}</span>
                    {age !== '7' && <span className="dots" aria-hidden="true">{Array.from({ length: tray[i.id] }, (_, k) => <i key={k} />)}</span>}
                    <span className="b-count">{countWord(tray[i.id])} {unitOf(i)}</span>
                    <button type="button" className="minus" aria-label={`${i.name} 하나 빼기`} onClick={() => takeOut(i.id)} disabled={solved}>−</button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {!solved && <button type="button" className="big go" onClick={give} disabled={total === 0}>손님께 드리기</button>}
        </section>
      </div>
      {solved && <Celebrate animal={order.customer.id} title="잘 골랐어요!" line={verdict!.say} next={last ? '오늘 가게 놀이 끝!' : '다음 손님 오세요'} onNext={onNext} />}
    </main>
  );
}

// ── 손님 놀이: 점원이 보여 주는 물건을 말로 주문하기 ──

type Hearing = 'idle' | 'notice' | 'listening';

function CustomerPlay({ top, shop, order, age, last, onNext, recognizer, micOn, micAgreed, onAgree }: {
  top: React.ReactNode; shop: Shop; order: Order; age: Age; last: boolean; onNext: () => void;
  recognizer: Recognizer; micOn: boolean; micAgreed: boolean; onAgree: () => void;
}) {
  const ask = shop.greeting;
  const items = shownItems(shop);
  const model = orderText(order);
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
        const verdicts = alts.map(a => ({ a, v: judgeSpoken(order, a, age, items) }));
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
  const teacherOk = () => answer({ ok: true, kind: 'teacher', say: `네! ${orderList(order)} 드릴게요.` });

  return (
    <main className="play">
      {top}
      <div className="play-body">
        <section className="want" aria-label="주문할 물건">
          <p className="want-title">이 물건을 주문해 보세요</p>
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

        <section className="side">
          <div className="person">
            <Animal id={order.customer.id} size={96} happy={solved} />
            <Bubble who={`${order.customer.name} 점원`} line={line} onListen={() => say(line)} />
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
      {solved && <Celebrate animal={order.customer.id} title="잘 말했어요!" line={line} next={last ? '오늘 가게 놀이 끝!' : '다음 물건 사러 가요'} onNext={onNext} />}
    </main>
  );
}

// ── 첫 화면, 끝 화면 ──

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
            <button type="button" className="role" aria-pressed={mode === 'clerk'} onClick={() => { setMode('clerk'); say('내가 점원이에요. 손님 말을 듣고 물건을 골라요.'); }}>
              <b>내가 점원이에요</b><small>손님 말을 듣고 물건을 골라요</small>
            </button>
            <button type="button" className="role" aria-pressed={mode === 'customer'} onClick={() => { setMode('customer'); say('내가 손님이에요. 그림을 보고 말로 주문해요.'); }}>
              <b>내가 손님이에요</b><small>그림을 보고 말로 주문해요</small>
            </button>
          </div>
          <div className="ages" role="group" aria-label="나이">
            {AGES.map(a => (
              <button type="button" key={a.id} className="age" aria-pressed={age === a.id} onClick={() => { setAge(a.id); say(AGE_SAY[a.id]); }}>
                <b>{a.label}</b><small>{a.detail}</small>
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

function Done({ mode, rounds, customers, onAgain, onHome }: { mode: Mode; rounds: number; customers: string[]; onAgain: () => void; onHome: () => void }) {
  // 결과보다 한 일을 짚어 칭찬하고, 화면 밖 진짜 놀이로 이어 갑니다.
  const text = mode === 'clerk'
    ? `손님 ${countWord(rounds)} 명의 말을 끝까지 듣고, 물건을 하나씩 세어서 담았어요.`
    : `그림을 보고 ${countWord(rounds)} 번이나 또박또박 주문했어요.`;
  const next = '이제 친구랑 진짜 가게 놀이를 해 볼까요? 한 명은 점원, 한 명은 손님이에요.';
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
