// 물건과 동물 그림. 기기마다 모양이 바뀌는 이모지 대신 단순한 그림을 직접 그렸습니다.

const ITEM_ART: Record<string, React.ReactNode> = {
  apple: <><circle cx="32" cy="36" r="20" fill="#E5484D" /><path d="M32 16 q2 -8 8 -9" stroke="#6B4423" strokeWidth="3" fill="none" strokeLinecap="round" /><ellipse cx="41" cy="13" rx="7" ry="4" fill="#3FA34D" transform="rotate(-25 41 13)" /></>,
  banana: <><path d="M12 22 C14 46 40 56 54 40 C40 46 22 40 18 20 Z" fill="#F7C948" /><path d="M11 23 l4 -5 l4 3 Z" fill="#7A5C1E" /></>,
  carrot: <><path d="M23 24 L43 22 L30 58 Z" fill="#F08C2E" /><path d="M30 22 l-6 -12 M33 22 l1 -14 M36 22 l8 -11" stroke="#3FA34D" strokeWidth="4" strokeLinecap="round" fill="none" /></>,
  egg: <ellipse cx="32" cy="35" rx="16" ry="21" fill="#FFF4E0" stroke="#C9A06A" strokeWidth="3" />,
  milk: <><path d="M20 22 L32 10 L44 22 V56 H20 Z" fill="#FFFFFF" stroke="#2563EB" strokeWidth="3" strokeLinejoin="round" /><rect x="20" y="32" width="24" height="12" fill="#2563EB" /></>,
  bread: <><path d="M10 30 C10 16 54 16 54 30 C54 34 50 35 50 35 V54 H14 V35 C14 35 10 34 10 30 Z" fill="#E0A458" /><path d="M18 34 V50 H46 V34 Z" fill="#F6DDB0" /></>,
  cookie: <><circle cx="32" cy="32" r="22" fill="#D39A57" />{[[24, 25], [39, 24], [35, 38], [22, 40]].map(([x, y]) => <circle key={x} cx={x} cy={y} r="3.2" fill="#5B3A1E" />)}</>,
  juice: <><rect x="18" y="14" width="28" height="42" rx="4" fill="#F08C2E" /><rect x="18" y="26" width="28" height="16" fill="#FFF3D6" /><path d="M38 14 V6 H44" stroke="#2563EB" strokeWidth="3" fill="none" strokeLinecap="round" /><circle cx="32" cy="34" r="5" fill="#F08C2E" /></>,
  ball: <><circle cx="32" cy="32" r="22" fill="#2F80ED" /><path d="M10 32 H54" stroke="#FFFFFF" strokeWidth="5" /><path d="M32 10 C22 20 22 44 32 54" stroke="#F7C948" strokeWidth="5" fill="none" /></>,
  crayon: <g transform="rotate(-35 32 32)"><rect x="8" y="26" width="36" height="12" rx="2" fill="#E5484D" /><path d="M44 26 L56 32 L44 38 Z" fill="#F4B3B5" /><rect x="16" y="26" width="5" height="12" fill="#B3262B" /></g>,
  bear: <><circle cx="18" cy="18" r="8" fill="#B07A47" /><circle cx="46" cy="18" r="8" fill="#B07A47" /><circle cx="32" cy="34" r="20" fill="#C68B55" /><ellipse cx="32" cy="42" rx="9" ry="7" fill="#F1D3AE" /><circle cx="25" cy="30" r="2.5" fill="#2B1B10" /><circle cx="39" cy="30" r="2.5" fill="#2B1B10" /><circle cx="32" cy="40" r="2.5" fill="#2B1B10" /></>,
  block: <><rect x="14" y="28" width="36" height="22" rx="3" fill="#E5484D" /><rect x="18" y="20" width="10" height="9" rx="2" fill="#E5484D" /><rect x="36" y="20" width="10" height="9" rx="2" fill="#E5484D" /></>,
  toothbrush: <g transform="rotate(-35 32 32)"><rect x="6" y="29" width="40" height="7" rx="3.5" fill="#2F80ED" /><rect x="44" y="23" width="14" height="13" rx="2" fill="#E8F1FF" stroke="#2F80ED" strokeWidth="2" /></g>,
  soap: <><rect x="12" y="26" width="40" height="26" rx="10" fill="#9AD8C3" /><circle cx="20" cy="18" r="5" fill="none" stroke="#5DB8E8" strokeWidth="2.5" /><circle cx="31" cy="11" r="3.5" fill="none" stroke="#5DB8E8" strokeWidth="2.5" /></>,
  tissue: <><rect x="12" y="28" width="40" height="26" rx="4" fill="#7FB3F5" /><path d="M26 28 C26 14 38 14 38 28 Z" fill="#FFFFFF" stroke="#B9CBE6" strokeWidth="2" /></>,
  towel: <><rect x="16" y="12" width="32" height="42" rx="4" fill="#F7A8C4" /><rect x="16" y="40" width="32" height="5" fill="#FFFFFF" /><rect x="16" y="48" width="32" height="3" fill="#FFFFFF" /><rect x="12" y="10" width="40" height="5" rx="2.5" fill="#9AA8B6" /></>,
};

export function ItemArt({ id, size = 72 }: { id: string; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">{ITEM_ART[id]}</svg>;
}

/** 직접 그린 그림 이름들 (선생님 페이지에서 고를 수 있는 것) */
export const ART_IDS = Object.keys(ITEM_ART);
export const isArt = (pic: string) => Object.prototype.hasOwnProperty.call(ITEM_ART, pic);
export const isPhoto = (pic: string) => /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(pic);

/** 물건 그림: 직접 그린 그림 → 사진 → 이모지·글자 순서로 봅니다. */
export function Pic({ pic, size = 72 }: { pic?: string; size?: number }) {
  if (pic && isArt(pic)) return <ItemArt id={pic} size={size} />;
  if (pic && isPhoto(pic)) return <img className="pic-photo" src={pic} width={size} height={size} alt="" />;
  return <span className="pic-emoji" style={{ width: size, height: size, fontSize: Math.round(size * 0.74) }} aria-hidden="true">{pic || '📦'}</span>;
}

const FUR: Record<string, { fur: string; line: string; inner: string }> = {
  rabbit: { fur: '#F5F0FA', line: '#D9CFE6', inner: '#F7B6C8' },
  bear: { fur: '#C68B55', line: '#9C6A3D', inner: '#F1D3AE' },
  cat: { fur: '#F6C77E', line: '#D9A350', inner: '#F7B6C8' },
  dog: { fur: '#F3E1C7', line: '#C9A77A', inner: '#A9764A' },
  penguin: { fur: '#2E3A4A', line: '#1C2531', inner: '#FFFFFF' },
};

/** 손님·점원 동물 얼굴. happy 면 웃는 입 */
export function Animal({ id, size = 110, happy = false }: { id: string; size?: number; happy?: boolean }) {
  const c = FUR[id] ?? FUR.rabbit;
  const face = id === 'penguin' ? '#FFFFFF' : c.fur;
  return (
    <svg width={size} height={size * 1.13} viewBox="0 0 120 136" aria-hidden="true">
      {id === 'rabbit' && <><ellipse cx="42" cy="34" rx="12" ry="30" fill={c.fur} stroke={c.line} strokeWidth="3" /><ellipse cx="78" cy="34" rx="12" ry="30" fill={c.fur} stroke={c.line} strokeWidth="3" /><ellipse cx="42" cy="36" rx="5" ry="20" fill={c.inner} /><ellipse cx="78" cy="36" rx="5" ry="20" fill={c.inner} /></>}
      {id === 'bear' && <><circle cx="30" cy="56" r="16" fill={c.fur} stroke={c.line} strokeWidth="3" /><circle cx="90" cy="56" r="16" fill={c.fur} stroke={c.line} strokeWidth="3" /></>}
      {id === 'cat' && <><path d="M26 70 L32 30 L56 54 Z" fill={c.fur} stroke={c.line} strokeWidth="3" strokeLinejoin="round" /><path d="M94 70 L88 30 L64 54 Z" fill={c.fur} stroke={c.line} strokeWidth="3" strokeLinejoin="round" /></>}
      {id === 'dog' && <><ellipse cx="24" cy="80" rx="12" ry="26" fill={c.inner} transform="rotate(15 24 80)" /><ellipse cx="96" cy="80" rx="12" ry="26" fill={c.inner} transform="rotate(-15 96 80)" /></>}
      <circle cx="60" cy="88" r="40" fill={c.fur} stroke={c.line} strokeWidth="3" />
      {id === 'penguin' && <ellipse cx="60" cy="94" rx="30" ry="28" fill={face} />}
      <circle cx="46" cy="82" r="5" fill="#2B2235" />
      <circle cx="74" cy="82" r="5" fill="#2B2235" />
      {id !== 'penguin' && <><circle cx="36" cy="98" r="7" fill="#F7B6C8" opacity="0.8" /><circle cx="84" cy="98" r="7" fill="#F7B6C8" opacity="0.8" /></>}
      {id === 'penguin' ? <path d="M53 92 h14 l-7 8 Z" fill="#F2A33A" /> : <path d="M56 94 h8 l-4 5 Z" fill="#E86A92" />}
      {happy
        ? <path d="M48 104 Q60 118 72 104" stroke="#2B2235" strokeWidth="3.5" fill="none" strokeLinecap="round" />
        : <path d="M52 106 Q60 111 68 106" stroke="#2B2235" strokeWidth="3.5" fill="none" strokeLinecap="round" />}
    </svg>
  );
}
