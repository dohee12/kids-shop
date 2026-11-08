import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import App from './App';

// rng 0 → 쉬움 단계에서 늘 "사과 한 개"
const zero = () => 0;

describe('꼬마 과일가게 화면', () => {
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

  it('다섯 손님을 도우면 끝 화면', async () => {
    const user = userEvent.setup();
    render(<App rng={zero} />);
    await user.click(screen.getByRole('button', { name: '가게 문 열기' }));
    for (let i = 0; i < 5; i++) {
      const want = screen.getByText(/주세요\.$/, { selector: '.line' }).textContent!;
      const name = want.split(' ')[0];
      await user.click(screen.getByRole('button', { name: `${name} 담기` }));
      await user.click(screen.getByRole('button', { name: '손님께 드리기' }));
      await user.click(screen.getByRole('button', { name: i < 4 ? '다음 손님 오세요' : '오늘 가게 놀이 끝!' }));
    }
    expect(screen.getByRole('heading', { name: '참 잘했어요!' })).toBeInTheDocument();
  });
});
