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
    start: h => { mic.handlers = h; mic.starts++; return { stop: () => h.onEnd() }; },
  };
  const speak = (...alts: string[]) => act(() => { mic.handlers!.onFinal(alts); mic.handlers!.onEnd(); });
  return { mic, recognizer, speak };
}

describe('점원 놀이', () => {
  it('주문을 듣고 고르고, 틀리면 도와주고, 맞으면 다음 손님', async () => {
    const user = userEvent.setup();
    render(<App rng={zero} />);
    await user.click(screen.getByRole('button', { name: '가게 문 열기' }));
    expect(screen.getByText('사과 한 개 주세요.', { selector: '.line' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '손님께 드리기' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: '바나나 담기' }));
    await user.click(screen.getByRole('button', { name: '손님께 드리기' }));
    expect(screen.getByText('바나나는 안 시켰어요. 사과를 찾아볼까요?')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '바나나 하나 빼기' }));
    await user.click(screen.getByRole('button', { name: '사과 담기' }));
    await user.click(screen.getByRole('button', { name: '손님께 드리기' }));
    expect(screen.getByText('고마워요! 사과 한 개 맞아요.')).toBeInTheDocument();
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
    await user.click(screen.getByRole('button', { name: /3~4세/ }));
    await user.click(screen.getByRole('button', { name: '가게 문 열기' }));
    expect(screen.queryByRole('button', { name: '2번 통로 · 장난감·생활' })).toBeNull();
  });
});

describe('손님 놀이 (말하기)', () => {
  it('처음 마이크를 누르면 선생님 안내 → 켜고 말하면 알아듣고 칭찬', async () => {
    const user = userEvent.setup();
    const { mic, recognizer, speak } = fakeMic();
    render(<App rng={zero} recognizer={recognizer} />);
    await user.click(screen.getByRole('button', { name: /내가 손님이에요/ }));
    await user.click(screen.getByRole('button', { name: '가게 문 열기' }));
    expect(screen.getByText('이 물건을 주문해 보세요')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /눌러서 말하기/ }));
    expect(screen.getByRole('dialog', { name: '마이크 안내' })).toBeInTheDocument();
    expect(mic.starts).toBe(0);
    await user.click(screen.getByRole('button', { name: '알겠어요, 마이크 켜기' }));

    await user.click(screen.getByRole('button', { name: /눌러서 말하기/ }));
    expect(mic.starts).toBe(1);
    expect(screen.getByRole('button', { name: /듣고 있어요/ })).toBeInTheDocument();
    speak('바나나 주세요');
    expect(screen.getByText('바나나는 그림에 없어요. 그림을 다시 볼까요?', { selector: '.line' })).toBeInTheDocument();
    expect(screen.getByText('바나나 주세요', { selector: 'q' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /눌러서 말하기/ }));
    speak('사과 한 개 주세요');
    expect(screen.getByText('네! 사과 한 개 드릴게요.', { selector: '.line' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '다음 물건 사러 가요' }));
    expect(screen.getByLabelText('손님 5명 중 2번째')).toBeInTheDocument();
    // 두 번째부터는 안내 없이 바로 듣습니다
    await user.click(screen.getByRole('button', { name: /눌러서 말하기/ }));
    expect(mic.starts).toBe(3);
  });

  it('여러 후보 중 맞는 문장을 고릅니다', async () => {
    const user = userEvent.setup();
    const { recognizer, speak } = fakeMic();
    render(<App rng={zero} recognizer={recognizer} />);
    await user.click(screen.getByRole('button', { name: /내가 손님이에요/ }));
    await user.click(screen.getByRole('button', { name: '가게 문 열기' }));
    await user.click(screen.getByRole('button', { name: /눌러서 말하기/ }));
    await user.click(screen.getByRole('button', { name: '알겠어요, 마이크 켜기' }));
    await user.click(screen.getByRole('button', { name: /눌러서 말하기/ }));
    speak('사가 한 개 주세요', '사과 한 개 주세요');
    expect(screen.getByText('네! 사과 한 개 드릴게요.', { selector: '.line' })).toBeInTheDocument();
  });

  it('못 알아들으면 다시 말하게 하고, 마이크가 없으면 선생님 버튼으로 진행', async () => {
    const user = userEvent.setup();
    const { recognizer, speak } = fakeMic();
    const { unmount } = render(<App rng={zero} recognizer={recognizer} />);
    await user.click(screen.getByRole('button', { name: /내가 손님이에요/ }));
    await user.click(screen.getByRole('button', { name: '가게 문 열기' }));
    await user.click(screen.getByRole('button', { name: /눌러서 말하기/ }));
    await user.click(screen.getByRole('button', { name: '알겠어요, 마이크 켜기' }));
    await user.click(screen.getByRole('button', { name: /눌러서 말하기/ }));
    speak();
    expect(screen.getByText('잘 못 들었어요. 한 번 더 크게 말해 볼까요?', { selector: '.line' })).toBeInTheDocument();
    unmount();

    render(<App rng={zero} recognizer={{ available: false, start: () => null }} />);
    await user.click(screen.getByRole('button', { name: /내가 손님이에요/ }));
    await user.click(screen.getByRole('button', { name: '가게 문 열기' }));
    expect(screen.queryByRole('button', { name: /눌러서 말하기/ })).toBeNull();
    expect(screen.getByText(/Chrome이나 Edge로 열어 주세요/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '선생님: 잘 말했어요' }));
    expect(screen.getByText('네! 사과 한 개 드릴게요.', { selector: '.line' })).toBeInTheDocument();
  });
});

it('다섯 번 하면 끝 화면', async () => {
  const user = userEvent.setup();
  render(<App rng={zero} />);
  await user.click(screen.getByRole('button', { name: '가게 문 열기' }));
  for (let i = 0; i < 5; i++) {
    const want = screen.getByText(/주세요\.$/, { selector: '.line' }).textContent!;
    await user.click(screen.getByRole('button', { name: `${want.split(' ')[0]} 담기` }));
    await user.click(screen.getByRole('button', { name: '손님께 드리기' }));
    await user.click(screen.getByRole('button', { name: i < 4 ? '다음 손님 오세요' : '오늘 가게 놀이 끝!' }));
  }
  expect(screen.getByRole('heading', { name: '참 잘했어요!' })).toBeInTheDocument();
});
