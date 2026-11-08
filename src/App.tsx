import { useEffect, useRef, useState } from 'react';
import { Animal, ItemArt } from './Art';
import {
  AGES, AISLES, ITEMS, aislesFor, countWord, judge, judgeSpoken, makeOrder, orderText,
  type Age, type Mode, type Order, type Tray, type Verdict,
} from './game';
import { browserRecognizer, hush, say, type Listening, type Recognizer } from './speech';

const ROUNDS = 5;

type Props = { rng?: () => number; recognizer?: Recognizer };

export default function App({ rng = Math.random, recognizer = browserRecognizer }: Props) {
  const [mode, setMode] = useState<Mode>('clerk');
  const [age, setAge] = useState<Age>('5');
  const [micOn, setMicOn] = useState(true);
  // 마이크 안내는 한 번 켜질 때까지 보여 줍니다. 저장하지 않으므로 새로 열면 다시 묻습니다.
  const [micAgreed, setMicAgreed] = useState(false);
  const [screen, setScreen] = useState<'start' | 'play' | 'done'>('start');
  const [round, setRound] = useState(1);
  const [order, setOrder] = useState<Order | null>(null);

  useEffect(() => hush, []);

  const start = (m: Mode = mode) => {
    setMode(m);
    setRound(1);
    setOrder(makeOrder(m, age, rng));
    setScreen('play');
  };
  const next = () => {
    if (round >= ROUNDS) { hush(); setScreen('done'); return; }
    setRound(round + 1);
    setOrder(makeOrder(mode, age, rng, order ?? undefined));
  };
  const home = () => { hush(); setScreen('start'); };

  if (screen === 'done') return <Done mode={mode} onAgain={() => start()} onHome={home} />;
  if (screen === 'play' && order) {
    const top = <Top round={round} onHome={home} />;
    return mode === 'clerk'
      ? <ClerkPlay key={round} top={top} order={order} age={age} last={round >= ROUNDS} onNext={next} />
      : <CustomerPlay key={round} top={top} order={order} age={age} last={round >= ROUNDS} onNext={next}
          recognizer={recognizer} micOn={micOn} micAgreed={micAgreed} onAgree={() => setMicAgreed(true)} />;
  }
  return <Start mode={mode} setMode={setMode} age={age} setAge={setAge} micOn={micOn} setMicOn={setMicOn} onStart={() => start()} />;
}

function Top({ round, onHome }: { round: number; onHome: () => void }) {
  return (
    <header className="top">
      <button type="button" className="link" onClick={onHome}>‹ 처음으로</button>
      <p className="top-title">꼬마 슈퍼마켓</p>
      <p className="stars" aria-label={`손님 ${ROUNDS}명 중 ${round}번째`}>
        {Array.from({ length: ROUNDS }, (_, i) => <span key={i} className={i < round - 1 ? 'on' : i === round - 1 ? 'now' : ''}>★</span>)}
      </p>
    </header>
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

function ClerkPlay({ top, order, age, last, onNext }: { top: React.ReactNode; order: Order; age: Age; last: boolean; onNext: () => void }) {
  const aisles = aislesFor('clerk', age);
  const [aisle, setAisle] = useState(aisles[0]);
  const [tray, setTray] = useState<Tray>({});
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const line = orderText(order);
  const solved = verdict?.ok === true;
  const total = Object.values(tray).reduce((a, b) => a + b, 0);

  useEffect(() => { say(`안녕하세요! ${line}`); }, [line]);

  const put = (id: string) => { if (!solved) { setTray({ ...tray, [id]: (tray[id] ?? 0) + 1 }); setVerdict(null); } };
  const takeOut = (id: string) => {
    if (solved) return;
    const t = { ...tray, [id]: (tray[id] ?? 0) - 1 };
    if (t[id] <= 0) delete t[id];
    setTray(t); setVerdict(null);
  };
  const give = () => { const v = judge(order, tray); setVerdict(v); say(v.say); };
  const shown = ITEMS.filter(i => i.aisle === aisle);
  const shelves = [...new Set(shown.map(i => i.shelf))];

  return (
    <main className="play">
      {top}
      <div className="play-body">
        <section className="shelf-area" aria-label="진열대">
          {aisles.length > 1 && (
            <div className="tabs">
              {AISLES.filter(a => aisles.includes(a.id)).map(a => (
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
                      <ItemArt id={i.id} size={68} />
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
            <Animal id={order.customer.id} size={96} happy={solved} />
            <Bubble who={`${order.customer.name} 손님`} line={verdict ? verdict.say : line} sub={verdict && !solved ? `주문: ${line}` : undefined}
              onListen={() => say(verdict ? verdict.say : line)} />
          </div>
          <div className="basket" aria-label="장바구니">
            <p className="basket-title">🧺 장바구니</p>
            {total === 0 ? <p className="basket-empty">진열대에서 물건을 눌러 담아요</p> : (
              <ul>
                {ITEMS.filter(i => tray[i.id]).map(i => (
                  <li key={i.id}>
                    <ItemArt id={i.id} size={36} />
                    <span className="b-name">{i.name}</span>
                    {age !== '7' && <span className="dots" aria-hidden="true">{Array.from({ length: tray[i.id] }, (_, k) => <i key={k} />)}</span>}
                    <span className="b-count">{countWord(tray[i.id])} 개</span>
                    <button type="button" className="minus" aria-label={`${i.name} 하나 빼기`} onClick={() => takeOut(i.id)} disabled={solved}>−</button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {solved
            ? <button type="button" className="big go blue" onClick={onNext}>{last ? '오늘 가게 놀이 끝!' : '다음 손님 오세요'}</button>
            : <button type="button" className="big go" onClick={give} disabled={total === 0}>손님께 드리기</button>}
        </section>
      </div>
    </main>
  );
}

// ── 손님 놀이: 점원이 보여 주는 물건을 말로 주문하기 ──

type Hearing = 'idle' | 'notice' | 'listening';

function CustomerPlay({ top, order, age, last, onNext, recognizer, micOn, micAgreed, onAgree }: {
  top: React.ReactNode; order: Order; age: Age; last: boolean; onNext: () => void;
  recognizer: Recognizer; micOn: boolean; micAgreed: boolean; onAgree: () => void;
}) {
  const ask = '어서 오세요! 무엇을 드릴까요? 그림을 보고 말해 보세요.';
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
    // 두 번 넘게 막히면 점원이 먼저 말해 주고 따라 하게 합니다.
    if (!v.ok && counts) misses.current += 1;
    const text = !v.ok && counts && misses.current >= 2 ? `${v.say} 점원이 먼저 말해 볼게요. 따라 해 봐요. ${model}` : v.say;
    setLine(text); setSolved(v.ok); say(text);
  };
  const listen = (agreed = micAgreed) => {
    if (!agreed) { setHearing('notice'); return; }
    setHeard('');
    const l = recognizer.start({
      onInterim: t => setHeard(t),
      onFinal: alts => {
        if (!alts.length) { answer({ ok: false, kind: 'unheard', say: '잘 못 들었어요. 마이크 가까이에서 한 번 더 말해 볼까요?' }); return; }
        const verdicts = alts.map(a => ({ a, v: judgeSpoken(order, a, age) }));
        const best = verdicts.find(x => x.v.ok) ?? verdicts[0];
        setHeard(best.a);
        answer(best.v);
      },
      onError: code => {
        const say = code === 'not-allowed' || code === 'service-not-allowed' ? '마이크를 쓸 수 없어요. 선생님, 주소창 옆 자물쇠를 눌러 마이크를 허용해 주세요.'
          : code === 'audio-capture' ? '마이크를 찾을 수 없어요. 선생님, 마이크가 연결되어 있는지 봐 주세요.'
          : code === 'network' ? '인터넷이 연결되지 않아 말을 못 알아들었어요. 선생님이 듣고 눌러 주세요.'
          : '말 알아듣기가 잠깐 멈췄어요. 다시 눌러 볼까요?';
        answer({ ok: false, kind: code, say }, false);
      },
      onEnd: () => { listening.current = null; setHearing('idle'); },
    });
    if (l) { listening.current = l; setHearing('listening'); }
    else answer({ ok: false, kind: 'start-failed', say: '마이크를 켜지 못했어요. 다시 눌러 볼까요?' }, false);
  };
  const stop = () => listening.current?.stop();
  const teacherOk = () => answer({ ok: true, kind: 'teacher', say: `네! ${order.lines.map(l => `${l.item.name} ${countWord(l.count)} 개`).join(', ')} 드릴게요.` });

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
                  {Array.from({ length: l.count }, (_, k) => <ItemArt key={k} id={l.item.id} size={l.count > 3 ? 72 : 96} />)}
                </div>
                <p className="want-name">{l.item.name}{age !== '3' && <> · <b>{countWord(l.count)} 개</b></>}</p>
              </div>
            ))}
          </div>
          <button type="button" className="pill model" onClick={() => say(model)}>👂 따라 말하기 듣기</button>
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
                <p className="no-mic">{micOn ? '이 브라우저는 말을 알아듣지 못해요. Chrome이나 Edge로 열어 주세요.' : '마이크가 꺼져 있어요.'} 아이가 말하면 선생님이 듣고 아래 버튼을 눌러 주세요.</p>
              )}
              {heard && <p className="heard">내가 한 말: <q>{heard}</q></p>}
            </div>
          )}

          {solved
            ? <button type="button" className="big go blue" onClick={onNext}>{last ? '오늘 가게 놀이 끝!' : '다음 물건 사러 가요'}</button>
            : <button type="button" className="teacher-ok" onClick={teacherOk}>선생님: 잘 말했어요</button>}
        </section>
      </div>
    </main>
  );
}

// ── 첫 화면, 끝 화면 ──

function Start({ mode, setMode, age, setAge, micOn, setMicOn, onStart }: {
  mode: Mode; setMode: (m: Mode) => void; age: Age; setAge: (a: Age) => void; micOn: boolean; setMicOn: (v: boolean) => void; onStart: () => void;
}) {
  return (
    <main className="start">
      <div className="awning" aria-hidden="true" />
      <h1>꼬마 슈퍼마켓</h1>
      <p className="lead">오늘은 무엇을 해 볼까요?</p>
      <div className="modes">
        <button type="button" className="mode" aria-pressed={mode === 'clerk'} onClick={() => setMode('clerk')}>
          <span className="mode-art" aria-hidden="true"><ItemArt id="apple" size={56} /><ItemArt id="milk" size={56} /></span>
          <b>내가 점원이에요</b>
          <small>손님 말을 듣고 물건을 골라요</small>
        </button>
        <button type="button" className="mode" aria-pressed={mode === 'customer'} onClick={() => setMode('customer')}>
          <span className="mode-art" aria-hidden="true">🎤</span>
          <b>내가 손님이에요</b>
          <small>그림을 보고 말로 주문해요</small>
        </button>
      </div>
      <div className="ages" role="group" aria-label="나이">
        {AGES.map(a => (
          <button type="button" key={a.id} className="age" aria-pressed={age === a.id} onClick={() => setAge(a.id)}>
            <b>{a.label}</b><small>{a.detail}</small>
          </button>
        ))}
      </div>
      <button type="button" className="big go" onClick={onStart}>가게 문 열기</button>
      <fieldset className="teacher">
        <legend>선생님 설정</legend>
        <label><input type="checkbox" checked={micOn} onChange={e => setMicOn(e.target.checked)} /> 손님 놀이에서 마이크 쓰기</label>
        <p className="note">손님 {ROUNDS}명이면 한 판 3~5분. 카메라는 쓰지 않고, 아무것도 저장하지 않아요. 마이크를 켜면 말소리가 글자로 바뀌기 위해 브라우저 회사 서버로 보내져요.</p>
      </fieldset>
    </main>
  );
}

function Done({ mode, onAgain, onHome }: { mode: Mode; onAgain: () => void; onHome: () => void }) {
  const text = mode === 'clerk' ? `오늘 손님 ${countWord(ROUNDS)} 명을 도와줬어요.` : `오늘 물건을 ${countWord(ROUNDS)} 번 주문했어요.`;
  useEffect(() => { say(`${text} 정말 잘했어요!`); }, [text]);
  return (
    <main className="start done">
      <p className="big-stars" aria-hidden="true">★★★★★</p>
      <h1>참 잘했어요!</h1>
      <p className="lead">{text}</p>
      <div className="done-animals" aria-hidden="true">
        {['rabbit', 'bear', 'cat', 'dog', 'penguin'].map(id => <Animal key={id} id={id} size={72} happy />)}
      </div>
      <button type="button" className="big go" onClick={onAgain}>한 번 더 하기</button>
      <button type="button" className="link" onClick={onHome}>처음으로</button>
    </main>
  );
}
