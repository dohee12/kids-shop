import { useEffect, useState } from 'react';
import { FRUITS, LEVELS, countWord, judge, makeOrder, orderText, type Level, type Order, type Tray, type Verdict } from './game';
import { hush, say } from './speech';

const ROUNDS = 5;

type Play = { round: number; order: Order; tray: Tray; verdict: Verdict | null };

export default function App({ rng = Math.random }: { rng?: () => number }) {
  const [level, setLevel] = useState<Level>('easy');
  const [play, setPlay] = useState<Play | null>(null);
  const [done, setDone] = useState(false);

  const start = () => {
    setDone(false);
    setPlay({ round: 1, order: makeOrder(level, rng), tray: {}, verdict: null });
  };

  // 새 손님이 오면 주문을 소리 내어 읽습니다.
  const orderLine = play ? orderText(play.order) : '';
  useEffect(() => {
    if (play && !play.verdict) say(`안녕하세요! ${orderLine}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [play?.round, play?.order]);
  useEffect(() => hush, []);

  if (done) return <Done level={level} onAgain={start} onHome={() => setDone(false)} />;
  if (!play) return <Start level={level} setLevel={setLevel} onStart={start} />;

  const { order, tray, verdict } = play;
  const solved = verdict?.ok === true;
  const total = Object.values(tray).reduce((a, b) => a + b, 0);

  const put = (id: string) => !solved && setPlay({ ...play, tray: { ...tray, [id]: (tray[id] ?? 0) + 1 }, verdict: null });
  const takeOut = (id: string) => {
    if (solved) return;
    const next = { ...tray, [id]: (tray[id] ?? 0) - 1 };
    if (next[id] <= 0) delete next[id];
    setPlay({ ...play, tray: next, verdict: null });
  };
  const give = () => {
    const v = judge(order, tray);
    setPlay({ ...play, verdict: v });
    say(v.say);
  };
  const next = () => {
    if (play.round >= ROUNDS) { hush(); setPlay(null); setDone(true); return; }
    setPlay({ round: play.round + 1, order: makeOrder(level, rng, order), tray: {}, verdict: null });
  };

  return (
    <main className="shop">
      <header className="shop-top">
        <button type="button" className="link" onClick={() => { hush(); setPlay(null); }}>처음으로</button>
        <p className="stars" aria-label={`손님 ${ROUNDS}명 중 ${play.round}번째`}>
          {Array.from({ length: ROUNDS }, (_, i) => <span key={i} className={i < play.round - (solved ? 0 : 1) ? 'on' : ''}>★</span>)}
        </p>
      </header>

      <section className="customer">
        <div className={`face ${solved ? 'happy' : ''}`} aria-hidden="true">{order.customer.emoji}</div>
        <div className="bubble" aria-live="polite">
          <p className="who">{order.customer.name} 손님</p>
          <p className="line">{verdict ? verdict.say : orderLine}</p>
          {verdict && !solved && <p className="again">주문: {orderLine}</p>}
          <button type="button" className="listen" onClick={() => say(verdict ? verdict.say : orderLine)}>🔊 다시 듣기</button>
        </div>
      </section>

      <section className="tray" aria-label="쟁반">
        {total === 0 ? <p className="tray-empty">과일을 눌러서 쟁반에 담아요</p> : (
          <ul>
            {FRUITS.filter(f => tray[f.id]).map(f => (
              <li key={f.id}>
                <span className="tray-count">{f.name} {countWord(tray[f.id])} 개</span>
                <span className="tray-items">
                  {Array.from({ length: tray[f.id] }, (_, i) => (
                    <button type="button" key={i} className="tray-item" aria-label={`${f.name} 하나 빼기`} onClick={() => takeOut(f.id)}>{f.emoji}</button>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {solved ? (
        <button type="button" className="big go" onClick={next}>{play.round >= ROUNDS ? '오늘 가게 놀이 끝!' : '다음 손님 오세요'}</button>
      ) : (
        <>
          <section className="shelf" aria-label="과일 진열대">
            {FRUITS.map(f => (
              <button type="button" key={f.id} className="fruit" aria-label={`${f.name} 담기`} onClick={() => put(f.id)}>
                <span className="fruit-emoji" aria-hidden="true">{f.emoji}</span>
                <span className="fruit-name">{f.name}</span>
              </button>
            ))}
          </section>
          <button type="button" className="big go" onClick={give} disabled={total === 0}>손님께 드리기</button>
        </>
      )}
    </main>
  );
}

function Start({ level, setLevel, onStart }: { level: Level; setLevel: (l: Level) => void; onStart: () => void }) {
  return (
    <main className="start">
      <div className="sign" aria-hidden="true">🍎🍌🍇🍓🍊</div>
      <h1>꼬마 과일가게</h1>
      <p className="lead">오늘은 내가 가게 점원이에요.<br />손님이 말하는 과일을 골라 주세요.</p>
      <button type="button" className="big go" onClick={onStart}>가게 문 열기</button>
      <fieldset className="teacher">
        <legend>선생님 설정</legend>
        {LEVELS.map(l => (
          <label key={l.id} className={level === l.id ? 'on' : ''}>
            <input type="radio" name="level" value={l.id} checked={level === l.id} onChange={() => setLevel(l.id)} />
            <b>{l.label}</b> <small>{l.detail}</small>
          </label>
        ))}
        <p className="note">손님 {ROUNDS}명, 한 판 3~5분. 마이크·카메라를 쓰지 않고 아무것도 저장하지 않아요.</p>
      </fieldset>
    </main>
  );
}

function Done({ level, onAgain, onHome }: { level: Level; onAgain: () => void; onHome: () => void }) {
  useEffect(() => { say(`오늘 손님 ${countWord(ROUNDS)} 명을 도와줬어요. 정말 잘했어요!`); }, []);
  return (
    <main className="start done">
      <div className="sign" aria-hidden="true">🐻🐰🐶🐱🐧</div>
      <h1>참 잘했어요!</h1>
      <p className="lead">오늘 손님 {countWord(ROUNDS)} 명을 도와줬어요.</p>
      <p className="stars big-stars" aria-hidden="true">★★★★★</p>
      <button type="button" className="big go" onClick={onAgain}>한 번 더 하기</button>
      <button type="button" className="link" onClick={onHome}>처음으로 ({LEVELS.find(l => l.id === level)!.label})</button>
    </main>
  );
}
