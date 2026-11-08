import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act } from 'react';
import { describe, expect, it } from 'vitest';
import App from './App';
import type { ListenHandlers, Recognizer } from './speech';

// rng 0 → 5~6세에서 늘 "사과 한 개", 손님은 토끼
const zero = () => 0;

function fakeMic() {
  const mic = { handlers: null as ListenHandlers | null, starts: 0 };
  const recognizer: Recognizer = {
    available: true,
    start: h => { mic.handlers = h; mic.starts++; return { stop: () => { h.onFinal([]); h.onEnd(); } }; },
  };
  const speak = (...alts: string[]) => act(() => { mic.handlers!.onFinal(alts); mic.handlers!.onEnd(); });
  const fail = (code: string) => act(() => { mic.handlers!.onError(code); mic.handlers!.onEnd(); });
  return { mic, recognizer, speak, fail };
}

async function openCustomer(recognizer: Recognizer) {
  const user = userEvent.setup();
  render(<App rng={zero} recognizer={recognizer} />);
  await user.click(screen.getByRole('button', { name: /내가 손님이에요/ }));
  await user.click(screen.getByRole('button', { name: '가게 문 열기' }));
  return user;
}
const line = () => document.querySelector('.line')!.textContent;

describe('점원 놀이', () => {
  it('주문을 듣고 고르고, 틀리면 도와주고, 맞으면 다음 손님', async () => {
    const user = userEvent.setup();
    render(<App rng={zero} />);
    await user.click(screen.getByRole('button', { name: '가게 문 열기' }));
    expect(screen.getByText('안녕하세요! 사과 한 개 주세요.', { selector: '.line' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '손님께 드리기' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: '바나나 담기' }));
    await user.click(screen.getByRole('button', { name: '손님께 드리기' }));
    expect(screen.getByText('바나나는 안 시켰어요. 사과를 찾아볼까요?')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '바나나 하나 빼기' }));
    await user.click(screen.getByRole('button', { name: '사과 담기' }));
    await user.click(screen.getByRole('button', { name: '손님께 드리기' }));
    expect(screen.getByText('고마워요! 사과 한 개, 딱 맞아요.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '다음 손님 오세요' }));
    expect(screen.getByLabelText('손님 5명 중 2번째')).toBeInTheDocument();
  });

  it('2번 통로로 가서 장난감도 고를 수 있습니다', async () => {
    const user = userEvent.setup();
    render(<App rng={zero} />);
    await user.click(screen.getByRole('button', { name: '가게 문 열기' }));
    await user.click(screen.getByRole('button', { name: '2번 통로 · 장난감·생활' }));
    expect(screen.getByRole('button', { name: '곰인형 담기' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '사과 담기' })).toBeNull();
  });

  it('3~4세는 먹거리 통로만 보입니다', async () => {
    const user = userEvent.setup();
    render(<App rng={zero} />);
    await user.click(screen.getByRole('button', { name: /만 3세/ }));
    await user.click(screen.getByRole('button', { name: '가게 문 열기' }));
    expect(screen.queryByRole('button', { name: '2번 통로 · 장난감·생활' })).toBeNull();
  });
});

describe('손님 놀이 (말하기)', () => {
  it('처음엔 선생님 안내 → "마이크 켜기"를 누르면 바로 듣기 시작 → 알아듣고 칭찬', async () => {
    const { mic, recognizer, speak } = fakeMic();
    const user = await openCustomer(recognizer);
    expect(screen.getByText('이 물건을 주문해 보세요')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /눌러서 말하기/ }));
    expect(screen.getByRole('dialog', { name: '마이크 안내' })).toBeInTheDocument();
    expect(mic.starts).toBe(0);
    await user.click(screen.getByRole('button', { name: '알겠어요, 마이크 켜기' }));
    expect(mic.starts).toBe(1);
    expect(screen.getByRole('button', { name: /듣고 있어요/ })).toBeInTheDocument();

    act(() => mic.handlers!.onInterim('사과를'));
    expect(screen.getByText('사과를', { selector: 'q' })).toBeInTheDocument();
    speak('사과를 한 개 주세요');
    expect(line()).toBe('네! 사과 한 개 드릴게요.');
    expect(screen.getByText('사과를 한 개 주세요', { selector: 'q' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /눌러서 말하기/ })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: '다음 물건 사러 가요' }));
    expect(screen.getByLabelText('손님 5명 중 2번째')).toBeInTheDocument();
    // 두 번째부터는 안내 없이 바로 듣습니다
    await user.click(screen.getByRole('button', { name: /눌러서 말하기/ }));
    expect(mic.starts).toBe(2);
  });

  it('틀리면 고칠 점을 말하고, 두 번 막히면 점원이 먼저 본보기를 말해 줍니다', async () => {
    const { recognizer, speak } = fakeMic();
    const user = await openCustomer(recognizer);
    await user.click(screen.getByRole('button', { name: /눌러서 말하기/ }));
    await user.click(screen.getByRole('button', { name: '알겠어요, 마이크 켜기' }));
    speak('바나나 주세요');
    expect(line()).toBe('바나나는 그림에 없어요. 그림을 다시 볼까요?');

    await user.click(screen.getByRole('button', { name: /눌러서 말하기/ }));
    speak('음 이거요');
    expect(line()).toBe('어떤 물건을 드릴까요? 그림을 보고 이름을 말해 봐요. 제가 먼저 말해 볼게요. 잘 듣고 따라 해 봐요. 사과 한 개 주세요.');

    await user.click(screen.getByRole('button', { name: /눌러서 말하기/ }));
    speak('사과 한 개 주세요');
    expect(line()).toBe('네! 사과 한 개 드릴게요.');
  });

  it('여러 후보 중 맞는 문장을 고릅니다', async () => {
    const { recognizer, speak } = fakeMic();
    const user = await openCustomer(recognizer);
    await user.click(screen.getByRole('button', { name: /눌러서 말하기/ }));
    await user.click(screen.getByRole('button', { name: '알겠어요, 마이크 켜기' }));
    speak('사가 한 개 주세요', '사과 한 개 주세요');
    expect(line()).toBe('네! 사과 한 개 드릴게요.');
  });

  it('"다 말했어요"를 누르면 듣기를 멈춥니다', async () => {
    const { recognizer } = fakeMic();
    const user = await openCustomer(recognizer);
    await user.click(screen.getByRole('button', { name: /눌러서 말하기/ }));
    await user.click(screen.getByRole('button', { name: '알겠어요, 마이크 켜기' }));
    await user.click(screen.getByRole('button', { name: /듣고 있어요/ }));
    expect(screen.getByRole('button', { name: /눌러서 말하기/ })).toBeEnabled();
    expect(line()).toBe('잘 못 들었어요. 마이크 가까이에서 한 번 더 말해 볼까요?');
  });

  it('마이크 오류는 이유를 알려 주고, 틀린 횟수로 세지 않습니다', async () => {
    const { recognizer, fail, speak } = fakeMic();
    const user = await openCustomer(recognizer);
    await user.click(screen.getByRole('button', { name: /눌러서 말하기/ }));
    await user.click(screen.getByRole('button', { name: '알겠어요, 마이크 켜기' }));
    fail('not-allowed');
    expect(line()).toContain('마이크를 허용해 주세요');
    await user.click(screen.getByRole('button', { name: /눌러서 말하기/ }));
    fail('audio-capture');
    expect(line()).toContain('마이크가 연결되어 있는지');
    await user.click(screen.getByRole('button', { name: /눌러서 말하기/ }));
    speak('바나나 주세요');
    expect(line()).toBe('바나나는 그림에 없어요. 그림을 다시 볼까요?'); // 본보기가 아직 붙지 않음
  });

  it('마이크를 켜지 못하면 다시 누르라고 합니다', async () => {
    await openCustomer({ available: true, start: () => null }).then(async user => {
      await user.click(screen.getByRole('button', { name: /눌러서 말하기/ }));
      await user.click(screen.getByRole('button', { name: '알겠어요, 마이크 켜기' }));
    });
    expect(line()).toBe('마이크를 켜지 못했어요. 다시 눌러 볼까요?');
  });

  it('음성 인식이 없는 브라우저는 선생님 버튼으로 진행', async () => {
    const user = await openCustomer({ available: false, start: () => null });
    expect(screen.queryByRole('button', { name: /눌러서 말하기/ })).toBeNull();
    expect(screen.getByText(/Chrome이나 Edge로 열어 주세요/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '선생님: 잘 말했어요' }));
    expect(line()).toBe('네! 사과 한 개 드릴게요.');
  });
});

it('다섯 번 하면 끝 화면', async () => {
  const user = userEvent.setup();
  render(<App rng={zero} />);
  await user.click(screen.getByRole('button', { name: '가게 문 열기' }));
  for (let i = 0; i < 5; i++) {
    const want = screen.getByText(/주세요\.$/, { selector: '.line' }).textContent!;
    await user.click(screen.getByRole('button', { name: `${want.split(' ')[1]} 담기` }));
    await user.click(screen.getByRole('button', { name: '손님께 드리기' }));
    await user.click(screen.getByRole('button', { name: i < 4 ? '다음 손님 오세요' : '오늘 가게 놀이 끝!' }));
  }
  expect(screen.getByRole('heading', { name: '참 잘했어요!' })).toBeInTheDocument();
});

describe('유아 교육 관점 보완', () => {
  it('점원 놀이: 5~6세는 두 번 막히면 주문을 그림으로도 보여 줍니다', async () => {
    const user = userEvent.setup();
    render(<App rng={zero} />);
    await user.click(screen.getByRole('button', { name: '가게 문 열기' }));
    await user.click(screen.getByRole('button', { name: '바나나 담기' }));
    await user.click(screen.getByRole('button', { name: '손님께 드리기' }));
    expect(screen.queryByLabelText(/주문 그림/)).toBeNull();
    await user.click(screen.getByRole('button', { name: '손님께 드리기' }));
    expect(screen.getByLabelText('주문 그림: 사과 한 개 주세요.')).toHaveTextContent('사과 한 개');
  });

  it('점원 놀이: 3~4세는 한 번만 막혀도 그림을 보여 주고, 맞히면 그림이 사라집니다', async () => {
    const user = userEvent.setup();
    render(<App rng={zero} />);
    await user.click(screen.getByRole('button', { name: /만 3세/ }));
    await user.click(screen.getByRole('button', { name: '가게 문 열기' }));
    await user.click(screen.getByRole('button', { name: '바나나 담기' }));
    await user.click(screen.getByRole('button', { name: '손님께 드리기' }));
    expect(screen.getByLabelText(/주문 그림/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '바나나 하나 빼기' }));
    await user.click(screen.getByRole('button', { name: '사과 담기' }));
    await user.click(screen.getByRole('button', { name: '손님께 드리기' }));
    expect(screen.queryByLabelText(/주문 그림/)).toBeNull();
  });

  it('끝 화면은 한 일을 짚어 칭찬하고, 친구와 하는 진짜 놀이로 이어 줍니다', async () => {
    const user = userEvent.setup();
    render(<App rng={zero} />);
    await user.click(screen.getByRole('button', { name: '가게 문 열기' }));
    for (let i = 0; i < 5; i++) {
      await user.click(screen.getByRole('button', { name: '사과 담기' }));
      await user.click(screen.getByRole('button', { name: '손님께 드리기' }));
      if (!screen.queryByRole('button', { name: /다음 손님 오세요|오늘 가게 놀이 끝!/ })) break;
      await user.click(screen.getByRole('button', { name: /다음 손님 오세요|오늘 가게 놀이 끝!/ }));
    }
    expect(screen.getByText(/물건을 하나씩 세어서 담았어요/)).toBeInTheDocument();
    expect(screen.getByText(/친구랑 진짜 가게 놀이/)).toBeInTheDocument();
  });
});
