type PieceFn = (args: { isDragging: boolean; squareWidth: number; square?: string }) => React.ReactElement;

const GLYPHS: Record<string, string> = { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };

/** Steampunk piece: brass gradient for White, dark iron for Black, on a gear ring. */
const makePiece =
  (color: 'w' | 'b', kind: 'k' | 'q' | 'r' | 'b' | 'n' | 'p'): PieceFn =>
  ({ squareWidth }) => {
    const gid = `sp-grad-${color}`;
    const fill = `url(#${gid})`;
    const ring = color === 'w' ? '#8a5a1f' : '#000000';
    const stroke = color === 'w' ? '#4a2f0d' : '#000000';
    return (
      <svg viewBox="0 0 100 100" width={squareWidth} height={squareWidth} style={{ filter: 'drop-shadow(0 3px 3px rgba(0,0,0,0.5))' }}>
        <defs>
          {color === 'w' ? (
            <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f7e2ae" />
              <stop offset="45%" stopColor="#d9a94e" />
              <stop offset="100%" stopColor="#8a5a1f" />
            </linearGradient>
          ) : (
            <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#70707a" />
              <stop offset="45%" stopColor="#3a3a41" />
              <stop offset="100%" stopColor="#141418" />
            </linearGradient>
          )}
        </defs>
        {/* gear ring */}
        <circle cx="50" cy="50" r="42" fill="none" stroke={ring} strokeWidth="7" strokeDasharray="6 4" opacity="0.85" />
        <circle cx="50" cy="50" r="34" fill="none" stroke={ring} strokeWidth="1.5" opacity="0.6" />
        <text
          x="50"
          y="54"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="52"
          fontFamily="'Segoe UI Symbol', 'Noto Sans Symbols 2', serif"
          fill={fill}
          stroke={stroke}
          strokeWidth="1.6"
          paintOrder="stroke"
        >
          {GLYPHS[kind]}
        </text>
      </svg>
    );
  };

type K = 'k' | 'q' | 'r' | 'b' | 'n' | 'p';

export const steampunkPieces = (Object.keys(GLYPHS) as K[]).reduce(
  (acc, kind) => ({
    ...acc,
    [`w${kind.toUpperCase()}`]: makePiece('w', kind),
    [`b${kind.toUpperCase()}`]: makePiece('b', kind),
  }),
  {} as Record<string, PieceFn>,
);
