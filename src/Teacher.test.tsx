import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { STORE_KEY } from './shop';

// rng 0 → 선생님 확인 문제는 6 더하기 5, 첫 주문은 첫 번째 물건 한 개
const zero = () => 0;

afterEach(() => vi.restoreAllMocks());

async function openTeacher() {
  const user = userEvent.setup();
  const view = render(<App rng={zero} />);
  await user.click(screen.getByRole('button', { name: '⚙ 선생님 설정' }));
  await user.type(screen.getByLabelText('6 더하기 5는 얼마인가요?'), '11');
  await user.click(screen.getByRole('button', { name: '들어가기' }));
  expect(screen.getByRole('heading', { name: '선생님 페이지' })).toBeInTheDocument();
  return { user, view };
}
const back = (user: ReturnType<typeof userEvent.setup>) => user.click(screen.getByRole('button', { name: '‹ 놀이 화면으로' }));

describe('선생님 페이지', () => {
  it('덧셈을 틀리면 들어가지 못합니다', async () => {
    const user = userEvent.setup();
    render(<App rng={zero} />);
    await user.click(screen.getByRole('button', { name: '⚙ 선생님 설정' }));
    await user.type(screen.getByLabelText('6 더하기 5는 얼마인가요?'), '10');
    await user.click(screen.getByRole('button', { name: '들어가기' }));
    expect(screen.getByRole('alert')).toHaveTextContent('다시 계산해 볼까요?');
    expect(screen.queryByRole('heading', { name: '선생님 페이지' })).toBeNull();
  });

  it('물건 이름을 바꾸고 저장하면 아이 화면에 나오고, 새로 열어도 남아 있습니다', async () => {
    const { user, view } = await openTeacher();
    const name = screen.getByLabelText('물건 1 이름');
    await user.clear(name);
    await user.type(name, '자두');
    await user.click(screen.getByRole('button', { name: '저장하기' }));
    expect(screen.getByRole('status')).toHaveTextContent('저장했어요');
    expect(screen.getByRole('button', { name: '저장됨' })).toBeDisabled();
    expect(JSON.parse(localStorage.getItem(STORE_KEY)!).shops[0].items[0].name).toBe('자두');

    await back(user);
    await user.click(screen.getByRole('button', { name: '가게 문 열기' }));
    expect(screen.getByText('자두 한 개 주세요.', { selector: '.line' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '자두 담기' })).toBeInTheDocument();

    view.unmount();
    render(<App rng={zero} />);
    await user.click(screen.getByRole('button', { name: '가게 문 열기' }));
    expect(screen.getByText('자두 한 개 주세요.', { selector: '.line' })).toBeInTheDocument();
  });

  it('주제를 바꾸면 제목·물건·세는 말이 바뀝니다', async () => {
    const { user } = await openTeacher();
    await user.click(screen.getByRole('button', { name: /꼬마 과일가게/ }));
    await user.click(screen.getByRole('button', { name: '저장하기' }));
    await back(user);
    expect(screen.getByRole('heading', { name: '꼬마 과일가게' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '가게 문 열기' }));
    expect(screen.getByText('꼬마 과일가게', { selector: '.top-title' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '딸기 담기' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '우유 담기' })).toBeNull();
  });

  it('숨긴 물건은 진열대에 나오지 않습니다', async () => {
    const { user } = await openTeacher();
    await user.click(screen.getByLabelText('물건 1 보이기'));
    await user.click(screen.getByRole('button', { name: '저장하기' }));
    await back(user);
    await user.click(screen.getByRole('button', { name: '가게 문 열기' }));
    expect(screen.queryByRole('button', { name: '사과 담기' })).toBeNull();
    expect(screen.getByText('바나나 한 개 주세요.', { selector: '.line' })).toBeInTheDocument();
  });

  it('물건을 추가하고 그림을 고를 수 있습니다', async () => {
    const { user } = await openTeacher();
    await user.click(screen.getByRole('button', { name: '+ 통로 1에 물건 추가' }));
    expect(screen.getByRole('alert')).toHaveTextContent('이름이 비어 있는 물건');
    expect(screen.getByRole('button', { name: '저장하기' })).toBeDisabled();
    await user.type(screen.getByLabelText('물건 17 이름'), '요구르트');
    await user.click(screen.getByRole('button', { name: '물건 17 그림 바꾸기' }));
    await user.click(screen.getByRole('button', { name: '그림: 우유' }));
    expect(screen.getByRole('button', { name: '그림: 우유' })).toHaveAttribute('aria-pressed', 'true');
    await user.type(screen.getByLabelText('물건 17 다르게 부르는 말'), '요플레, 야쿠르트');
    expect(screen.queryByRole('alert')).toBeNull();
    await user.click(screen.getByRole('button', { name: '저장하기' }));
    const saved = JSON.parse(localStorage.getItem(STORE_KEY)!).shops[0].items.at(-1);
    expect(saved).toMatchObject({ name: '요구르트', pic: 'milk', aliases: ['요플레', '야쿠르트'], aisle: 'food' });
  });

  it('붙여 넣은 표로 물건 목록을 한 번에 바꿉니다', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const { user } = await openTeacher();
    await user.click(screen.getByLabelText('붙여넣기 칸'));
    await user.paste('딸기\t과일\t개\n수박\t과일\t통');
    await user.click(screen.getByRole('button', { name: '목록에 반영하기' }));
    expect(screen.getByRole('status')).toHaveTextContent('물건 2개로 바꿨어요');
    expect(screen.getByLabelText('물건 1 이름')).toHaveValue('딸기');
    expect(screen.getByLabelText('물건 2 세는 말')).toHaveValue('통');
    expect(screen.queryByLabelText('물건 3 이름')).toBeNull();
  });

  it('저장하지 않고 나가려 하면 한 번 묻습니다', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const { user } = await openTeacher();
    await user.type(screen.getByLabelText('가게 이름 (아이 화면 제목)'), '!');
    await back(user);
    expect(confirm).toHaveBeenCalledOnce();
    expect(screen.getByRole('heading', { name: '선생님 페이지' })).toBeInTheDocument();
  });

  it('미리보기는 저장하지 않고 보여 주고, 돌아오면 고치던 내용이 남아 있습니다', async () => {
    const { user } = await openTeacher();
    const shopName = screen.getByLabelText('가게 이름 (아이 화면 제목)');
    await user.clear(shopName);
    await user.type(shopName, '해님반 가게');
    await user.click(screen.getByRole('button', { name: '아이 화면 미리보기' }));
    expect(screen.getByRole('heading', { name: '해님반 가게' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('미리보기 중');
    expect(localStorage.getItem(STORE_KEY)).toBeNull();
    await user.click(screen.getByRole('button', { name: '선생님 페이지로 돌아가기' }));
    expect(screen.getByLabelText('가게 이름 (아이 화면 제목)')).toHaveValue('해님반 가게');
    expect(screen.getByRole('button', { name: '저장하기' })).toBeEnabled();
  });

  it('손님 수와 찾아오는 손님을 바꿉니다 (마지막 한 명은 끌 수 없음)', async () => {
    const { user } = await openTeacher();
    await user.selectOptions(screen.getByLabelText('한 판에 오는 손님 수'), '3');
    const guests = within(screen.getByRole('group', { name: '찾아오는 손님' }));
    for (const g of ['토끼', '곰', '고양이', '강아지']) await user.click(guests.getByLabelText(g));
    expect(guests.getByLabelText('펭귄')).toBeDisabled();
    await user.click(screen.getByRole('button', { name: '저장하기' }));
    await back(user);
    await user.click(screen.getByRole('button', { name: '가게 문 열기' }));
    expect(screen.getByLabelText('손님 3명 중 1번째')).toBeInTheDocument();
    expect(screen.getByText('펭귄 손님')).toBeInTheDocument();
  });

  it('목소리 빠르기를 바꿔 저장합니다', async () => {
    const { user } = await openTeacher();
    fireEvent.change(screen.getByLabelText(/빠르기/), { target: { value: '0.7' } });
    expect(screen.getByText('천천히')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '저장하기' }));
    expect(JSON.parse(localStorage.getItem(STORE_KEY)!).voice).toMatchObject({ rate: 0.7, pitch: 1 });
  });

  it('첫 화면에는 선생님 설정 버튼만 있고, 마이크 끄기는 선생님 페이지에서 저장합니다', async () => {
    const user = userEvent.setup();
    const view = render(<App rng={zero} />);
    expect(screen.queryByRole('checkbox')).toBeNull();
    expect(screen.getByRole('button', { name: '⚙ 선생님 설정' })).toBeInTheDocument();
    view.unmount();

    await openTeacher();
    await user.click(screen.getByLabelText('손님 놀이에서 마이크 쓰기'));
    await user.click(screen.getByRole('button', { name: '저장하기' }));
    expect(JSON.parse(localStorage.getItem(STORE_KEY)!).micOn).toBe(false);
    await back(user);
    await user.click(screen.getByRole('button', { name: /내가 손님이에요/ }));
    await user.click(screen.getByRole('button', { name: '가게 문 열기' }));
    expect(screen.queryByRole('button', { name: /눌러서 말하기/ })).toBeNull();
    expect(screen.getByText(/선생님 설정에서 마이크가 꺼져 있어요/)).toBeInTheDocument();
  });
});
